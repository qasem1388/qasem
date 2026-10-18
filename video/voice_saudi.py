"""Saudi male voiceover via Microsoft neural TTS (ar-SA-HamedNeural), fitted to the scene timeline -> build/voice.wav
Needs network access to speech.platform.bing.com.  Usage: pip install edge-tts numpy && python3 voice_saudi.py"""
import asyncio, os, subprocess, tempfile, wave
import numpy as np
import edge_tts

VOICE = "ar-SA-HamedNeural"
SR = 44100
DUR = 30.0
PROXY = os.environ.get("HTTPS_PROXY")

# (start sec, max length sec, text) — synced to index.html
LINES = [
    (0.05, 1.55, "تعبت من العمولات؟!"),
    (1.70, 1.45, "خلّ أرباحك كلها لك!"),
    (3.35, 2.75, "مع تطبيق مندوبي، شغلك صار باسمك."),
    (6.40, 3.70, "لك صفحة خاصة فيك، وعملاءك يطلبون منك على طول."),
    (10.40, 3.70, "اشتراك شهري ثابت، ولا ريال عمولة على طلباتك."),
    (14.40, 3.60, "وانت اللي تحدد سعر التوصيل، على كيفك."),
    (18.40, 3.30, "يشتغل على كل الأجهزة: جوال، تابلت، وكمبيوتر."),
    (22.00, 3.30, "وحط طرق الدفع اللي تناسبك."),
    (25.55, 4.30, "انشر رابط صفحتك، وخلّ الطلبات تجيك! حمّل التطبيق الحين."),
]

async def synth(text, path):
    # faster rate + slightly lower pitch + louder = energetic, strong delivery
    kw = {"proxy": PROXY} if PROXY else {}
    await edge_tts.Communicate(text, VOICE, rate="+12%", pitch="-4Hz", volume="+10%", **kw).save(path)

def read_wav(path):
    with wave.open(path) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32767

def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout)

out = np.zeros(int(DUR * SR), np.float32)
tmp = tempfile.mkdtemp()
for i, (start, maxlen, text) in enumerate(LINES):
    mp3, trimmed, fit = (os.path.join(tmp, f"{n}{i}.{e}") for n, e in (("l", "mp3"), ("t", "wav"), ("f", "wav")))
    asyncio.run(synth(text, mp3))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
                    trimmed], check=True)
    natural = duration(trimmed)
    tempo = min(max(1.0, natural / maxlen), 1.35)
    # broadcast chain: warmth + presence + compression for a strong, punchy voice
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", trimmed, "-af",
                    f"atempo={tempo:.3f},aresample={SR},equalizer=f=120:t=q:w=1:g=4,equalizer=f=3000:t=q:w=1:g=3,"
                    "acompressor=threshold=-20dB:ratio=4:attack=3:release=60:makeup=4",
                    "-ac", "1", fit], check=True)
    y = read_wav(fit); s = int(start * SR); y = y[: len(out) - s]
    out[s:s + len(y)] += y
    print(f"line {i}: {natural:.2f}s -> {len(y)/SR:.2f}s (tempo {tempo:.2f})")

out /= np.max(np.abs(out)) / 0.89
os.makedirs("build", exist_ok=True)
with wave.open("build/voice.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("done: build/voice.wav  ->  now run ./add_voice.sh build/voice.wav")
