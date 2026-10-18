"""Procedural music + sound effects (fully synthesized here, so there is no third-party licence to clear).

Writes build/music.wav, build/sfx.wav and, when voice-over recordings exist, build/vo.wav.
Cue times come from src/timeline.py.
"""
import json
import os
import sys
import wave

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
from timeline import DURATION, SFX, SCENES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
N = int(DURATION * SR)
RNG = np.random.default_rng(1)

# ----------------------------------------------------------------------------- helpers

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env(dur, a=0.005, d=0.3, curve=4.0):
    t = t_axis(dur)
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d * curve / 4)
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low")
    return signal.lfilter(b, a, x, axis=0)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x, axis=0)


def bp(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], "band")
    return signal.lfilter(b, a, x, axis=0)


def note(n):
    """MIDI note -> Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, x, t0, gain=1.0, pan=0.0):
    """Mix mono/stereo x into stereo buf at time t0 with constant-power pan (-1..1)."""
    i0 = int(t0 * SR)
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * 1.414
    if i0 < 0:
        x, i0 = x[-i0:], 0
    n = min(len(x), len(buf) - i0)
    if n > 0:
        buf[i0:i0 + n] += x[:n] * gain


def reverb(x, secs=2.2, wet=0.25, bright=6000):
    t = t_axis(secs)
    ir = RNG.standard_normal((len(t), 2)) * np.exp(-t * 6.9 / secs)[:, None]
    ir = lp(ir, bright)
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 2.0


def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x

# ----------------------------------------------------------------------------- instruments

def kick(g=1.0):
    t = t_axis(0.5)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7) + 0.3 * RNG.standard_normal(len(t)) * np.exp(-t * 300)
    return np.tanh(x * 1.5) * g


def tick(g=1.0):
    """Clock tick - a nod to the watch."""
    t = t_axis(0.06)
    x = hp(RNG.standard_normal(len(t)), 3500) * np.exp(-t * 120)
    x += np.sin(2 * np.pi * 5200 * t) * np.exp(-t * 90) * 0.4
    return x * g


def clap(g=1.0):
    t = t_axis(0.35)
    n = bp(RNG.standard_normal(len(t)), 900, 5000)
    e = np.exp(-t * 18) + 0.6 * np.exp(-np.abs(t - 0.012) * 400) + 0.5 * np.exp(-np.abs(t - 0.024) * 400)
    return n * e * g


def pad_chord(notes, dur, g=1.0):
    t = t_axis(dur)
    x = np.zeros((len(t), 2))
    for n in notes:
        for det, pan in ((-0.09, -0.6), (0.0, 0.0), (0.08, 0.6)):
            f = note(n + det)
            v = sum(np.sin(2 * np.pi * f * h * t + RNG.uniform(0, 6.28)) / h ** 1.3 for h in range(1, 7))
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            x[:, 0] += v * l
            x[:, 1] += v * r
    a = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5).clip(0)
    x = lp(x, 2200) * a[:, None]
    return x / len(notes) * 0.12 * g


def bass(n, dur, g=1.0):
    t = t_axis(dur)
    f = note(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.03).clip(0)
    return np.tanh(x * e * 1.4) * 0.5 * g


def pluck(n, g=1.0):
    t = t_axis(0.9)
    f = note(n)
    x = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (4 + h * 3)) / h for h in range(1, 6))
    return x * np.minimum(1, t / 0.003) * 0.25 * g


def riser(dur, g=1.0):
    t = t_axis(dur)
    p = t / dur
    n = RNG.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 2048
    for i in range(0, len(t), seg):  # sweeping band-pass, block by block
        fc = 300 + 7000 * p[min(i, len(p) - 1)] ** 2
        out[i:i + seg] = bp(n[i:i + seg + 0], fc * 0.7, fc * 1.3)[:len(out[i:i + seg])]
    tone = np.sin(2 * np.pi * np.cumsum(200 + 600 * p ** 2) / SR) * 0.3
    return (out + tone) * p ** 2 * g

# ----------------------------------------------------------------------------- sound effects

def sfx_pulse():
    t = t_axis(0.9)
    x = np.zeros(len(t))
    for d, a in ((0.0, 1.0), (0.16, 0.7)):  # heartbeat "lub-dub"
        tt = np.maximum(0, t - d)
        f = 40 + 50 * np.exp(-tt * 30)
        x += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * (t >= d) * a
    return np.tanh(x * 2) * 0.9


def sfx_impact():
    t = t_axis(2.5)
    f = 28 + 70 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crack = lp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 14) * 0.8
    boom = lp(RNG.standard_normal(len(t)), 250) * np.exp(-t * 2.5) * 1.5
    x = np.tanh((sub * 1.2 + crack + boom) * 1.3)
    st = np.stack([x, x], 1)
    return reverb(st, 2.8, 0.35, 4000)


def sfx_whoosh():
    dur = 0.6
    t = t_axis(dur)
    n = RNG.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 1024
    for i in range(0, len(t), seg):
        p = i / len(t)
        fc = 400 + 3000 * np.sin(np.pi * p) ** 2
        out[i:i + seg] = bp(n[i:i + seg], fc * 0.6, fc * 1.5)[:len(out[i:i + seg])]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * np.where(t < dur * 0.42, 1, 1)
    x = out * e * 2.2
    pan = np.linspace(-0.8, 0.8, len(t))
    st = np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
    return st


def sfx_shimmer():
    t = t_axis(1.8)
    st = np.zeros((len(t), 2))
    for _ in range(14):
        f = RNG.uniform(2500, 9500)
        d = RNG.uniform(0, 0.25)
        tt = np.maximum(0, t - d)
        v = np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) * np.exp(-tt * RNG.uniform(2, 5)) * (t >= d)
        v *= np.minimum(1, tt / 0.01)
        pan = RNG.uniform(-0.9, 0.9)
        st[:, 0] += v * np.cos((pan + 1) * np.pi / 4)
        st[:, 1] += v * np.sin((pan + 1) * np.pi / 4)
    return reverb(st * 0.09, 2.0, 0.4)


def sfx_drop():
    t = t_axis(0.25)
    f0 = RNG.uniform(700, 1100)
    f = f0 + f0 * 1.4 * (1 - np.exp(-t * 60))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * np.minimum(1, t / 0.002)
    x += hp(RNG.standard_normal(len(t)), 4000) * np.exp(-t * 90) * 0.15
    st = np.stack([x, x], 1) * 0.6
    return reverb(st, 0.9, 0.3)


def sfx_bass_hit():
    t = t_axis(1.6)
    f = 48 + 70 * np.exp(-t * 18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    x += lp(RNG.standard_normal(len(t)), 1500) * np.exp(-t * 30) * 0.4
    x = np.tanh(x * 2.0) * 0.9
    return reverb(np.stack([x, x], 1), 1.5, 0.2, 2500)


SFX_FN = {"pulse": sfx_pulse, "impact": sfx_impact, "whoosh": sfx_whoosh, "shimmer": sfx_shimmer,
          "drop": sfx_drop, "bass_hit": sfx_bass_hit}

# ----------------------------------------------------------------------------- music

def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    start = 0.22  # music enters with the reveal impact
    # D minor: Dm - Bb - Gm - A
    chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]]
    roots = [38, 34, 31, 33]
    arp = [[62, 65, 69, 74], [58, 62, 65, 70], [55, 58, 62, 67], [57, 61, 64, 69]]

    def section(t):
        for name, a, b in SCENES:
            if a <= t < b:
                return name
        return SCENES[-1][0]

    # drone under everything
    t = t_axis(DURATION - start)
    drone = (np.sin(2 * np.pi * note(26) * t) * 0.5 + np.sin(2 * np.pi * note(38) * t) * 0.25)
    drone *= np.minimum(1, t / 1.5) * 0.18
    place(buf, drone, start)

    nbars = int((DURATION - start) / bar) + 1
    for b in range(nbars):
        t0 = start + b * bar
        if t0 >= DURATION:
            break
        ci = b % 4
        sec = section(t0)
        place(buf, pad_chord(chords[ci], bar + 0.4, 1.0 if sec != "s1_hook" else 0.6), t0)
        for k in range(16):  # 16th steps
            ts = t0 + k * beat / 4
            if ts >= DURATION - 0.3:
                break
            s = section(ts)
            # break: no drums just before the hero impact so it lands
            if 22.6 <= ts < 23.0:
                continue
            if s != "s1_hook" and k % 2 == 0:  # clock ticks on 8th notes
                place(buf, tick(0.07 if k % 4 == 0 else 0.04), ts, pan=0.3 if k % 4 == 2 else -0.2)
            if s in ("s3_water", "s4_lifestyle", "s5_hero") and k in (0, 6, 8):
                place(buf, bass(roots[ci] if k != 6 else roots[ci] + 12, beat * 0.9), ts)
            if s in ("s2_details", "s3_water", "s4_lifestyle", "s5_hero") and k in (0, 8):
                place(buf, kick(0.55 if s == "s2_details" else 0.75), ts)
            if s in ("s4_lifestyle", "s5_hero") and k in (4, 12):
                place(buf, clap(0.25), ts)
            if s in ("s3_water", "s4_lifestyle") and k % 2 == 0:
                place(buf, pluck(arp[ci][(k // 2) % 4], 0.6), ts, pan=0.5 if (k // 2) % 2 else -0.5)

    place(buf, np.stack([riser(1.0), riser(1.0)], 1) * 0.35, 22.0)
    music = reverb(buf, 2.4, 0.22)
    # end: long fade on the last ~1.2 s so the ad closes cleanly
    fade = np.ones(N)
    fl = int(1.2 * SR)
    fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
    music *= fade[:, None]
    return norm(music, 0.8)


def sfx_track():
    buf = np.zeros((N, 2))
    for t0, kind, g in SFX:
        place(buf, SFX_FN[kind](), t0, g)
    return norm(buf, 0.9)

# ----------------------------------------------------------------------------- voice-over

def read_wav(path):
    """Read any audio via ffmpeg into float stereo at SR."""
    import subprocess
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def vo_track(cfg):
    """Return the assembled voice-over or None when no recordings are present."""
    full = cfg.get("voiceover_full_track")
    if full and os.path.exists(os.path.join(ROOT, full)):
        x = read_wav(os.path.join(ROOT, full))
        buf = np.zeros((N, 2))
        buf[:min(N, len(x))] = x[:N]
        return buf
    lines = cfg.get("voiceover", [])
    have = [ln for ln in lines if os.path.exists(os.path.join(ROOT, ln["file"]))]
    if not have:
        return None
    buf = np.zeros((N, 2))
    for i, ln in enumerate(lines):
        p = os.path.join(ROOT, ln["file"])
        if not os.path.exists(p):
            print(f"  ! missing voice-over line {i + 1}: {ln['file']}")
            continue
        x = read_wav(p)
        end = lines[i + 1]["start"] if i + 1 < len(lines) else DURATION
        if ln["start"] + len(x) / SR > end:
            print(f"  ! line {i + 1} is {len(x) / SR:.2f}s and overruns its slot "
                  f"({ln['start']:.2f}-{end:.2f}s); it will overlap the next line")
        place(buf, x, ln["start"])
    return buf


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def main():
    cfg = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
    out = os.path.join(ROOT, "build")
    os.makedirs(out, exist_ok=True)
    write_wav(os.path.join(out, "music.wav"), music())
    write_wav(os.path.join(out, "sfx.wav"), sfx_track())
    vo = vo_track(cfg)
    vo_path = os.path.join(out, "vo.wav")
    if vo is not None:
        write_wav(vo_path, norm(vo, 0.95))
        print("voice-over assembled ->", vo_path)
    elif os.path.exists(vo_path):
        os.remove(vo_path)
    print("music.wav + sfx.wav written")


if __name__ == "__main__":
    main()
