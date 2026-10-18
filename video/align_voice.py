"""Places the ElevenLabs voiceover phrase-by-phrase onto the video timeline -> build/voice.wav

The source file is cut only inside its natural pauses (measured with silencedetect), then each
phrase is shifted so it lands on its scene. No time-stretching — the voice stays untouched.
Cue times in index.html (const VO) are these same phrases after the shift.
Usage: python3 align_voice.py path/to/elevenlabs.mp3 [out.wav]
"""
import subprocess, sys, wave
import numpy as np

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "build/voice.wav"
SR = 44100
DUR = 30.0

# (cut start, cut end, shift) in source seconds; cuts sit in the middle of measured pauses
SEGMENTS = [
    (0.00, 2.74, 0.00),   # تعبت من العمولات؟ خلّ أرباحك كلها لك — مندوبي
    (2.74, 5.29, 0.00),   # هو تطبيقك الخاص لتوصيل الطلبات
    (5.29, 6.74, 0.25),   # صفحة خاصة لكل مندوب
    (6.74, 10.05, 0.46),  # اشتراك شهري ثابت، بدون عمولة على عدد الطلبات
    (10.05, 12.05, 0.64), # أنت تحدد تسعيرة التوصيل
    (12.05, 16.48, 0.69), # متوافق مع جميع الأجهزة — آيفون، أندرويد، تابلت، كمبيوتر
    (16.48, 21.24, 0.80), # ضع طرق الدفع الخاصة بك — مدى، أبل باي، STC باي، تحويل بنكي، كاش
    (21.24, 24.97, 0.89), # انشر رابط صفحتك، وخلّ عملاءك يطلبون منك مباشرة
    (24.97, 27.04, 0.94), # انستقرام، تيك توك، سناب، واتساب
    (27.04, 99.00, 0.99), # حمّل التطبيق الحين
]

pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", SRC, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
out = np.zeros(int(DUR * SR), np.float32)
fade = int(.01 * SR)
for a, b, shift in SEGMENTS:
    seg = x[int(a * SR): int(min(b, len(x) / SR) * SR)].copy()
    seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
    s = int((a + shift) * SR)
    seg = seg[: len(out) - s]
    out[s:s + len(seg)] += seg
    print(f"{a:6.2f}-{min(b, len(x)/SR):6.2f}s -> {a+shift:6.2f}s")

out /= np.max(np.abs(out)) / 0.89
with wave.open(OUT, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print(f"done: {OUT}")
