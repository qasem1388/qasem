"""Generates the Arabic male voiceover with an offline neural TTS (sherpa-onnx + piper)
and fits each line into its scene slot -> build/voice.wav

Default voice: ar_JO-SA_miro_V2-high (male, trained on Saudi Arabic). Note: CC BY-NC-SA 4.0 (non-commercial).
Setup:
  pip install sherpa-onnx numpy
  curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ar_JO-SA_miro_V2-high.tar.bz2
  tar xjf vits-piper-ar_JO-SA_miro_V2-high.tar.bz2
Usage: python3 voice.py path/to/model_dir [out.wav]
"""
import sys, os, glob, subprocess, wave, tempfile
import numpy as np
import sherpa_onnx

MODEL_DIR = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "build/voice.wav"
SR_OUT = 44100
DUR = 30.0

# (start sec, max length sec, text) — synced to the scene timeline in index.html.
# Fully diacritized Saudi dialect so the model pronounces it naturally.
LINES = [
    (0.05, 1.55, "تِعِبْتْ مِنَ الْعُمُولَاتْ؟"),
    (1.70, 1.45, "خَلّْ أَرْبَاحَكْ كِلَّهَا لَكْ!"),
    (3.35, 2.75, "مَعْ تَطْبِيقْ مَنْدُوبِي، شُغْلَكْ صَارْ بِاسْمَكْ."),
    (6.40, 3.70, "لَكْ صَفْحَةْ خَاصَّةْ فِيكْ، وِعُمَلَاءَكْ يِطْلُبُونْ مِنَّكْ عَلَى طُولْ."),
    (10.40, 3.70, "اشْتِرَاكْ شَهْرِي ثَابِتْ، وَلَا رِيَالْ عُمُولَةْ عَلَى طَلَبَاتَكْ."),
    (14.40, 3.60, "وِانْتَ اللِّي تِحَدِّدْ سِعْرْ التَّوْصِيلْ، عَلَى كَيْفَكْ."),
    (18.40, 3.30, "يِشْتَغِلْ عَلَى كِلّْ الْأَجْهِزَةْ: جَوَّالْ، تَابْلِتْ، وِكُمْبْيُوتَرْ."),
    (22.00, 3.30, "وِحُطّْ طُرُقْ الدَّفْعْ اللِّي تِنَاسْبَكْ."),
    (25.55, 4.30, "انْشُرْ رَابِطْ صَفْحَتَكْ، وِخَلّْ الطَّلَبَاتْ تِجِيكْ! حَمِّلْ التَّطْبِيقْ الْحِينْ."),
]

onnx = [f for f in glob.glob(os.path.join(MODEL_DIR, "*.onnx"))][0]
cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=onnx,
            tokens=os.path.join(MODEL_DIR, "tokens.txt"),
            data_dir=os.path.join(MODEL_DIR, "espeak-ng-data"),
            noise_scale=0.667, noise_scale_w=0.8),
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

def synth(text, speed):
    a = tts.generate(text, sid=0, speed=speed)
    return trim(np.array(a.samples, np.float32)), a.sample_rate

out = np.zeros(int(DUR * SR_OUT), np.float32)
tmp = tempfile.mkdtemp()
for i, (start, maxlen, text) in enumerate(LINES):
    # energetic base pace; speed up natively (not by time-stretching) only as much as the slot needs
    speed = 1.08
    x, sr = synth(text, speed)
    if len(x) / sr > maxlen:
        speed = min(speed * (len(x) / sr) / maxlen * 1.02, 1.4)
        x, sr = synth(text, speed)
    raw = os.path.join(tmp, f"l{i}.wav"); fit = os.path.join(tmp, f"f{i}.wav")
    write_wav(raw, x, sr)
    # broadcast chain: warmth + presence + compression for a strong, punchy voice
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    f"aresample={SR_OUT},equalizer=f=120:t=q:w=1:g=4,equalizer=f=3000:t=q:w=1:g=3,"
                    "acompressor=threshold=-20dB:ratio=4:attack=3:release=60:makeup=4",
                    "-ac", "1", fit], check=True)
    y = read_wav(fit)[: int(maxlen * SR_OUT) + 2000]
    s = int(start * SR_OUT); y = y[: len(out) - s]
    out[s:s + len(y)] += y
    print(f"line {i}: {len(y)/SR_OUT:.2f}s / slot {maxlen:.2f}s (speed {speed:.2f})")

out /= np.max(np.abs(out)) / 0.89
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
write_wav(OUT, out, SR_OUT)
print(f"done: {OUT}")
