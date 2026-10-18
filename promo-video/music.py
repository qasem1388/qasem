"""Generates a very calm ambient track (soft pads + gentle piano + chimes).

Usage: python3 music.py build/music.wav [duration] [chime times, e.g. 6,10.4,13.1] [--pulse]
"""
import sys
import wave

import numpy as np

SR = 44100
args = [a for a in sys.argv[1:] if not a.startswith('--')]
DUR = float(args[1]) if len(args) > 1 else 20.0
CHIMES = [float(x) for x in args[2].split(',')] if len(args) > 2 else [6.0, 10.4, 13.1]
PULSE = '--pulse' in sys.argv
n = int(SR * DUR)
t = np.arange(n) / SR
rng = np.random.default_rng(3)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(start, length, attack, release):
    e = np.zeros(n)
    i0, i1 = int(start * SR), min(n, int((start + length) * SR))
    if i1 <= i0:
        return e
    tt = t[i0:i1] - start
    a = np.clip(tt / attack, 0, 1)
    r = np.clip((length - tt) / release, 0, 1)
    e[i0:i1] = np.sin(a * np.pi / 2) ** 2 * np.sin(r * np.pi / 2) ** 2
    return e


L = np.zeros(n)
R = np.zeros(n)

# Dmaj9 -> Bm7 -> Gmaj7 -> Asus2 -> Dmaj9, slow and warm
voicings = [
    [50, 57, 62, 66, 69, 76],
    [47, 54, 59, 62, 66, 69],
    [43, 50, 55, 59, 62, 66],
    [45, 52, 57, 59, 64, 69],
]
chords = [(s, voicings[i % 4]) for i, s in enumerate(np.arange(0, DUR - 0.01, 5.0))]
for start, notes in chords:
    last = start + 5 >= DUR
    e = env(max(0, start - 0.6), DUR - start + 0.6 if last else 6.4, 1.8, 1.8)
    for j, m in enumerate(notes):
        f = hz(m)
        amp = 0.05 if j else 0.07
        for det, pan in ((-0.0018, 0.7), (0.0018, 0.3)):
            ph = rng.uniform(0, 2 * np.pi)
            w = (np.sin(2 * np.pi * f * (1 + det) * t + ph)
                 + 0.25 * np.sin(4 * np.pi * f * (1 + det) * t + ph)
                 + 0.08 * np.sin(6 * np.pi * f * (1 + det) * t + ph))
            trem = 1 + 0.08 * np.sin(2 * np.pi * 0.17 * t + j)
            L += amp * pan * w * e * trem
            R += amp * (1 - pan) * w * e * trem


def piano(start, m, vel, pan):
    f = hz(m)
    i0 = int(start * SR)
    tt = t[i0:] - start
    a = np.clip(tt / 0.008, 0, 1)
    w = (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 2.2)
         + 0.3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt / 0.9)
         + 0.08 * np.sin(6 * np.pi * f * tt) * np.exp(-tt / 0.5))
    s = vel * a * w
    L[i0:] += s * (1 - pan)
    R[i0:] += s * pan


# sparse, gentle arpeggio (one note every 1.25 s)
arps = [[74, 78, 81, 78], [71, 74, 78, 74], [67, 71, 74, 79], [69, 71, 76, 73]]
for c, (start, _) in enumerate(chords):
    for k, m in enumerate(arps[c % 4]):
        if start + 0.4 + k * 1.25 < DUR - 1.5:
            piano(start + 0.4 + k * 1.25, m, 0.09, 0.35 + 0.3 * (k % 2))
piano(DUR - 1.0, 74, 0.07, 0.5)


def pulse(start, vel):
    """Soft, muffled low heartbeat to give motion graphics a gentle pace."""
    i0 = int(start * SR)
    tt = t[i0:] - start
    s = vel * np.sin(2 * np.pi * (55 + 40 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.18) * np.clip(tt / 0.003, 0, 1)
    L[i0:] += s
    R[i0:] += s


if PULSE:
    for b in np.arange(2.5, DUR - 2.5, 1.25):
        pulse(b, 0.10 if (b / 1.25) % 2 < 0.5 else 0.06)


def chime(start, base, vel):
    i0 = int(start * SR)
    tt = t[i0:] - start
    s = sum(a * np.sin(2 * np.pi * base * r * tt) * np.exp(-tt / d)
            for r, a, d in ((1, 1, 1.6), (2.76, 0.4, 0.8), (5.4, 0.2, 0.4)))
    s *= vel * np.clip(tt / 0.004, 0, 1)
    L[i0:] += s * 0.6
    R[i0:] += s * 0.4


# soft sparkle chimes on the watch, pen and misbaha moments
for start, base in zip(CHIMES, [hz(m) for m in (93, 90, 97, 93, 95, 98, 90)]):
    chime(start, base, 0.035)
    chime(start + 0.12, base * 1.5, 0.02)


# simple stereo reverb: convolve with decaying, darkened noise
def reverb(x, seed):
    m = int(SR * 2.8)
    ir = np.random.default_rng(seed).standard_normal(m) * np.exp(-np.arange(m) / SR / 0.9)
    ir = np.convolve(ir, np.ones(12) / 12, mode='same')
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + m)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return y


wetL, wetR = reverb(L, 11), reverb(R, 12)
L = 0.7 * L + 0.4 * wetL
R = 0.7 * R + 0.4 * wetR

fade = np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 2.5, 0, 1)
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.6, R / peak * 0.6  # leave headroom: very calm level

out = sys.argv[1] if len(sys.argv) > 1 else 'build/music.wav'
pcm = (np.stack([L, R], axis=1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out)
