"""Generates the Arabic male voiceover with an offline neural TTS (sherpa-onnx + piper ar_JO-kareem)
and fits each line into its scene slot -> build/voice.wav

Setup:
  pip install sherpa-onnx numpy
  curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ar_JO-kareem-medium.tar.bz2
  tar xjf vits-piper-ar_JO-kareem-medium.tar.bz2
Usage: python3 voice.py path/to/vits-piper-ar_JO-kareem-medium
"""
import sys, os, subprocess, wave, tempfile
import numpy as np
import sherpa_onnx

MODEL_DIR = sys.argv[1]
SR_OUT = 44100
DUR = 30.0

# (start sec, max length sec, text) — synced to the scene timeline in index.html
LINES = [
    (0.05, 1.55, "تِعِبْت مِن العُمولات؟"),
    (1.70, 1.45, "خَلّ أرباحَك كُلّها لَك!"),
    (3.35, 2.75, "مَع تَطبيق مَندوبي، شُغلَك صار بِاسمَك."),
    (6.40, 3.70, "لَك صَفحة خاصّة فيك، وعُملاءَك يِطلبون مِنّك على طول."),
    (10.40, 3.70, "اشتِراك شَهري ثابِت، ولا ريال عُمولة على طَلَباتَك."),
    (14.40, 3.60, "وانتَ اللي تحَدّد سِعر التوصيل، على كَيفَك."),
    (18.40, 3.30, "يِشتَغِل على كُل الأجهِزة: جَوّال، تابلِت، وكمبيوتر."),
    (22.00, 3.30, "وحُط طُرُق الدَّفع اللي تناسبَك."),
    (25.55, 4.30, "انشُر رابِط صَفحتَك، وخَلّ الطَّلَبات تجيك! حَمّل التطبيق الحين."),
]

cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=os.path.join(MODEL_DIR, "ar_JO-kareem-medium.onnx"),
            tokens=os.path.join(MODEL_DIR, "tokens.txt"),
            data_dir=os.path.join(MODEL_DIR, "espeak-ng-data"),
            noise_scale=0.6, length_scale=0.95),
        num_threads=4),
)
tts = sherpa_onnx.OfflineTts(cfg)

def write_wav(path, samples, sr, ch=1):
    with wave.open(path, "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())

def read_wav(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32767

def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(idx[0] - 400, 0): idx[-1] + 2000] if len(idx) else x

out = np.zeros(int(DUR * SR_OUT), np.float32)
tmp = tempfile.mkdtemp()
for i, (start, maxlen, text) in enumerate(LINES):
    a = tts.generate(text, sid=0, speed=1.12)
    raw = os.path.join(tmp, f"l{i}.wav"); fit = os.path.join(tmp, f"f{i}.wav")
    x = trim(np.array(a.samples, np.float32)); write_wav(raw, x, a.sample_rate)
    natural = len(x) / a.sample_rate
    tempo = max(1.0, natural / maxlen)
    if tempo > 1.45:
        print(f"warning: line {i} needs tempo {tempo:.2f}, capped"); tempo = 1.45
    # speed up if needed, a touch of low-end warmth + presence for a broadcast feel
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    f"atempo={tempo:.3f},aresample={SR_OUT},equalizer=f=140:t=q:w=1:g=3,equalizer=f=3500:t=q:w=1:g=2",
                    "-ac", "1", fit], check=True)
    y = read_wav(fit)
    s = int(start * SR_OUT); y = y[: len(out) - s]
    out[s:s + len(y)] += y
    print(f"line {i}: {natural:.2f}s -> {len(y)/SR_OUT:.2f}s (tempo {tempo:.2f})")

out /= np.max(np.abs(out)) / 0.89
os.makedirs("build", exist_ok=True)
write_wav("build/voice.wav", out, SR_OUT)
print("done: build/voice.wav")
