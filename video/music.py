"""Synthesizes the 30s soundtrack (beat + SFX) synced to index.html timeline -> build/music.wav"""
import numpy as np, wave

SR = 44100
DUR = 30.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)
BPM = 120
BEAT = 60 / BPM

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    e = np.minimum(t / a, 1) * np.exp(-t / d)
    return e

def kick():
    n = int(.4 * SR); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 1.0

def snare():
    n = int(.25 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = np.convolve(noise, [1, -0.9], 'same')
    return (noise * .5 + np.sin(2 * np.pi * 190 * t) * .5) * np.exp(-t * 18) * .55

def hat(open_=False):
    n = int((.18 if open_ else .05) * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(4) / 4, 'same')
    return noise * np.exp(-t * (14 if open_ else 70)) * .22

def bass(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * .35 + np.sin(2 * np.pi * freq * t) * .6
    s = np.convolve(s, np.ones(25) / 25, 'same')
    return s * env(n, .005, dur * .8) * .5

def pluck(freq, dur=.25):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * freq * k * t) / k for k in range(1, 6))
    return s * env(n, .002, .09) * .16

def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .3 * t)) for f in freqs) / len(freqs)
    e = np.minimum(t / .3, 1) * np.minimum((dur - t) / .4, 1)
    return s * e * .12

def whoosh(dur=.5, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n); y = 0
    cut = np.linspace(.02, .5, n) if up else np.linspace(.5, .02, n)
    for i in range(n):
        y += cut[i] * (noise[i] - y); out[i] = y
    e = np.sin(np.pi * t / dur) ** 2
    return out * e * .9

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * (8 ** (t / dur))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .15 + whoosh(dur)[:n] * .6
    return s * (t / dur) ** 2

def impact():
    n = int(1.2 * SR); t = np.arange(n) / SR
    f = 35 + 80 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3)
    crack = rng.standard_normal(n) * np.exp(-t * 25) * .5
    return (boom + crack) * .9

def pop_sfx(freq=900):
    n = int(.12 * SR); t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * .35

def ding():
    n = int(1.0 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1568 * t) + .5 * np.sin(2 * np.pi * 2093 * t) + .3 * np.sin(2 * np.pi * 3136 * t)
    return s * env(n, .002, .25) * .3

def click():
    n = int(.03 * SR); t = np.arange(n) / SR
    return rng.standard_normal(n) * np.exp(-t * 200) * .3

def buzz():  # "wrong" buzzer for the cross stamp
    n = int(.35 * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 116 * t))
    return s * np.exp(-t * 6) * .18

# chord progression (Am F C G), one chord per bar (2s)
A2, F2, C3, G2 = 110.0, 87.31, 130.81, 98.0
prog = [(A2, [220, 261.6, 329.6]), (F2, [174.6, 220, 261.6]), (C3, [261.6, 329.6, 392]), (G2, [196, 246.9, 293.7])]
arp_notes = {A2: [440, 523.3, 659.3, 880], F2: [349.2, 440, 523.3, 698.5], C3: [523.3, 659.3, 784, 1046.5], G2: [392, 493.9, 587.3, 784]}

# --- HOOK (0 - 3.2) ---
add(impact(), 0.0, 1.0)
add(snare(), 0.05, .8)
add(buzz(), 0.92, 1.0)
add(impact(), 0.95, .5)
add(riser(.7), 0.95, .9)
add(impact(), 1.65, .8)
add(ding(), 1.75, 1.0)
for k in range(8):  # coin sparkles
    add(pop_sfx(1400 + 200 * k), 2.15 + k * .05, .5, pan=(-1) ** k * .5)
add(pop_sfx(700), 2.25, 1.0)
for b in range(3):  # quick beat under payoff
    tt = 1.65 + b * BEAT
    add(kick(), tt, .9); add(hat(), tt + BEAT / 2, 1.0)
add(whoosh(.5), 2.85, .9)

# --- MAIN GROOVE (3.2 - 30) ---
start = 3.2
bar = 0
t0 = start
while t0 < 29.5:
    root, chord = prog[bar % 4]
    add(pad(chord, 2.0), t0, 1.0)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= 29.6: break
        add(kick(), tt, .85)
        if b in (1, 3): add(snare(), tt, .7)
        add(hat(), tt + BEAT / 2, 1.0, pan=.3)
        add(hat(), tt + BEAT / 4, .5, pan=-.3)
        add(bass(root, BEAT * .45), tt, 1.0)
        add(bass(root, BEAT * .3), tt + BEAT * .75, .7)
        if bar >= 1:
            for s in range(2):
                add(pluck(arp_notes[root][(b * 2 + s) % 4], .2), tt + s * BEAT / 2, 1.0, pan=.4 if s else -.4)
    t0 += 4 * BEAT; bar += 1

# feature transitions
for tt in [6.2, 10.2, 14.2, 18.2, 21.8, 25.4]:
    add(whoosh(.45), tt - .3, .8)
    add(pop_sfx(600), tt + .05, .9)
add(impact(), 25.4, .6)
# UI pops
for tt in [6.55, 6.75, 6.9, 7.05, 7.55, 10.5, 10.7, 10.9, 14.5, 18.4, 18.55, 22.05, 22.17, 22.29, 22.41, 22.53, 26.1, 27.6, 27.72, 27.84, 27.96, 28.3]:
    add(pop_sfx(900), tt, .45)
for k in range(5):  # toggles
    add(click(), 21.8 + 1.05 + k * .38, 1.0)
for k in range(21):  # typing link
    add(click(), 26.4 + k * 1.2 / 21, .5)
add(ding(), 28.4, .8)
# outro sustain chord
add(pad([220, 261.6, 329.6, 440], 1.6), 28.4, 1.4)

mix = np.stack([L, R], 1)
fade = np.ones(N); fn = int(.6 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade[:, None]
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / .9
with wave.open('build/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok')
