"""Frame renderer for the Louis Martin 30s vertical ad.

Usage:  python3 src/render.py --out build/video_noaudio.mp4 [--preview 0,3.5,12] [--guides]

Everything editable (image, brand, store name, texts) lives in config.json;
all timing lives in src/timeline.py.
"""
import argparse
import json
import math
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

sys.path.insert(0, os.path.dirname(__file__))
from timeline import *  # noqa: E402,F403
from cutout import cutout, find_head  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
FONTS = os.path.join(ROOT, "assets", "fonts")
GOLD = tuple(CFG["colors"]["gold"])
GOLD_L = tuple(CFG["colors"]["gold_light"])
GOLD_D = tuple(CFG["colors"]["gold_dark"])
BLACK = tuple(CFG["colors"]["black"])
WHITE = tuple(CFG["colors"]["white"])
T = CFG["texts"]

# ----------------------------------------------------------------------------- easing

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, t0, dur):
    return clamp((t - t0) / dur)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out_back(x, s=1.4):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def lerp(a, b, x):
    return a + (b - a) * x

# ----------------------------------------------------------------------------- product

PRODUCT = None  # (rgba PIL image at 2x, head cx, cy, r) — loaded once per process
UPS = 2.0
REF_R = 142.0  # head radius (source px) the scene layouts were designed for; any photo is normalised to it


def load_product():
    global PRODUCT
    if PRODUCT is None:
        src = os.path.join(ROOT, CFG["product_image"])
        name = os.path.splitext(os.path.basename(src))[0]
        cache = os.path.join(ROOT, "build", f"cutout_{name}.png")
        if not os.path.exists(cache) or os.path.getmtime(cache) < max(
                os.path.getmtime(src), os.path.getmtime(os.path.join(ROOT, "src", "cutout.py"))):
            os.makedirs(os.path.dirname(cache), exist_ok=True)
            cutout(src).save(cache)
        im = Image.open(cache).convert("RGBA")
        cx, cy, r = find_head(im)
        # Pre-upscale once with Lanczos + light sharpening; the per-frame warps then
        # start from a cleaner source than plain bicubic on the original pixels.
        # resample so the watch head always has the same on-screen size, whatever the photo framing
        k = UPS * REF_R / r
        big = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
        rgb = big.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        big = Image.merge("RGBA", (*rgb.split(), big.getchannel("A")))
        PRODUCT = (big, cx * k, cy * k, r * k)
    return PRODUCT


def homography(src_pts, dst_pts):
    """Coefficients for PIL PERSPECTIVE mapping dst -> src."""
    A, b = [], []
    for (x, y), (u, v) in zip(dst_pts, src_pts):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(A, float), np.array(b, float))


def place_product(canvas, x, y, scale, rot_z=0.0, rot_y=0.0, rot_x=0.0, alpha=1.0,
                  sweep=None, glow=0.0, fade_strap=None, sweep_k=1.0):
    """Draw the watch so that its head centre lands at (x, y) with head radius = scale*r_orig.

    rot_y / rot_x tilt the flat product photo in 3D (perspective projection) to
    simulate depth without changing its design. sweep = position (-1..1) of a
    specular light band. Returns the bounding box used.
    """
    img, hcx, hcy, hr = load_product()
    s = scale / UPS
    f = 2200.0
    rz, ry, rx = map(math.radians, (rot_z, rot_y, rot_x))
    corners = [(0, 0), (img.width, 0), (img.width, img.height), (0, img.height)]
    dst = []
    for (u, v) in corners:
        px, py = (u - hcx) * s, (v - hcy) * s
        px, py = px * math.cos(rz) - py * math.sin(rz), px * math.sin(rz) + py * math.cos(rz)
        pz = 0.0
        px, pz = px * math.cos(ry), px * math.sin(ry)
        py, pz = py * math.cos(rx) - pz * math.sin(rx), py * math.sin(rx) + pz * math.cos(rx)
        k = f / (f + pz)
        dst.append((x + px * k, y + py * k))
    xs, ys = [p[0] for p in dst], [p[1] for p in dst]
    bx0, by0 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2)
    bx1, by1 = min(W, int(max(xs)) + 2), min(H, int(max(ys)) + 2)
    if bx1 <= bx0 or by1 <= by0:
        return None
    local = [(px - bx0, py - by0) for px, py in dst]
    coeffs = homography(corners, local)
    layer = img.transform((bx1 - bx0, by1 - by0), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    arr = np.asarray(layer).astype(np.float32)
    a = arr[..., 3:4] / 255.0

    if fade_strap is not None:
        # fade the strap into darkness above/below the head (luxury "floating" look)
        top, bot = fade_strap
        yy = np.arange(by0, by1, dtype=np.float32)[:, None, None]
        m = np.clip((yy - (y - top[0])) / top[1], 0, 1) * np.clip(((y + bot[0]) - yy) / bot[1], 0, 1)
        a = a * m

    if sweep is not None:
        hh, ww = arr.shape[:2]
        rpx = hr / UPS * scale
        gx = (np.arange(ww, dtype=np.float32)[None, :] + bx0 - x) / rpx
        gy = (np.arange(hh, dtype=np.float32)[:, None] + by0 - y) / rpx
        d = (gx * 0.7 + gy * 0.7) - sweep * 3.0
        band = np.exp(-(d / 0.18) ** 2) * 0.85 + np.exp(-(d / 0.6) ** 2) * 0.15
        lum = arr[..., :3].mean(axis=2) / 255.0
        spec = (band * (0.35 + lum ** 1.5) * sweep_k)[..., None]
        arr[..., :3] = arr[..., :3] + spec * np.array([255, 245, 220], np.float32)

    if glow > 0:
        sm = Image.fromarray((a[..., 0] * 255).astype(np.uint8)).resize(
            (max(1, (bx1 - bx0) // 6), max(1, (by1 - by0) // 6)), Image.BILINEAR)
        sm = sm.filter(ImageFilter.GaussianBlur(9)).resize((bx1 - bx0, by1 - by0), Image.BILINEAR)
        g = np.asarray(sm).astype(np.float32)[..., None] / 255.0 * glow * alpha
        region = canvas[by0:by1, bx0:bx1]
        region[:] = region + g * np.array(GOLD, np.float32) * 0.9

    a = a * alpha
    region = canvas[by0:by1, bx0:bx1]
    region[:] = region * (1 - a) + np.clip(arr[..., :3], 0, 255) * a
    return (bx0, by0, bx1, by1)

# ----------------------------------------------------------------------------- text

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size, layout_engine=ImageFont.Layout.RAQM)


@lru_cache(maxsize=64)
def text_layer(text, fname, size, style="gold", latin=False, tracking=0):
    """Render text to an RGBA PIL image. style: gold | white | dark."""
    f = font(fname, size)
    kw = {} if latin else {"direction": "rtl", "language": "ar"}
    if tracking and latin:
        text = (" " * 0).join(text)  # spacing is done below per glyph
    bbox = f.getbbox(text, **kw)
    pad = int(size * 0.5)
    w, h = bbox[2] - bbox[0] + pad * 2, bbox[3] - bbox[1] + pad * 2
    if tracking and latin:
        w += tracking * len(text)
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    if tracking and latin:
        cx = pad - bbox[0]
        for ch in text:
            d.text((cx, pad - bbox[1]), ch, font=f, fill=255)
            cx += f.getlength(ch) + tracking
        w = int(cx + pad)
        mask = mask.crop((0, 0, w, h))
    else:
        d.text((pad - bbox[0], pad - bbox[1]), text, font=f, fill=255, **kw)
    if style == "gold":
        g = np.linspace(0, 1, h)[:, None, None]
        cols = np.where(g < 0.5,
                        np.array(GOLD_L) * (1 - g * 2) + np.array(GOLD) * (g * 2),
                        np.array(GOLD) * (2 - g * 2) + np.array(GOLD_D) * (g * 2 - 1))
        fill = np.repeat(cols, w, axis=1).astype(np.uint8)
    else:
        c = WHITE if style == "white" else BLACK
        fill = np.zeros((h, w, 3), np.uint8) + np.array(c, np.uint8)
    out = np.dstack([fill, np.asarray(mask)])
    return Image.fromarray(out, "RGBA")


@lru_cache(maxsize=64)
def fit_size(text, fname, size, style, latin, tracking, max_w=W - 2 * SAFE_SIDE):
    """Shrink the font until the line fits inside the side safe margins (edited texts stay on screen)."""
    while size > 20:
        ink = text_layer(text, fname, size, style, latin, tracking).width - 2 * int(size * 0.5)
        if ink <= max_w:
            break
        size = int(size * max(0.8, max_w / ink * 0.99))
    return size


def draw_text(canvas, text, fname, size, cx, cy, t_in, t, style="gold", latin=False,
              tracking=0, rise=40, dur=0.6, shimmer=None, wipe=True, shadow=True, alpha=1.0):
    """Animated text: RTL soft wipe (right to left) + rise + fade, optional shimmer band."""
    p = prog(t, t_in, dur)
    if p <= 0 or alpha <= 0:
        return
    size = fit_size(text, fname, size, style, latin, tracking)
    lay = text_layer(text, fname, size, style, latin, tracking)
    arr = np.asarray(lay).astype(np.float32)
    h, w = arr.shape[:2]
    a = arr[..., 3] / 255.0
    e = ease_out(p)
    if wipe and p < 1:
        xs = np.arange(w, dtype=np.float32) / w
        edge = 0.15
        if latin:
            m = np.clip((e * (1 + edge) - xs) / edge, 0, 1)
        else:
            m = np.clip((e * (1 + edge) - (1 - xs)) / edge, 0, 1)
        a = a * m[None, :]
    a = a * clamp(p * 1.6) * alpha
    rgb = arr[..., :3]
    if shimmer is not None:
        sp = (t - shimmer[0]) / shimmer[1]
        if 0 <= sp <= 1:
            xs = np.arange(w, dtype=np.float32)[None, :] / w
            ys = np.arange(h, dtype=np.float32)[:, None] / h
            band = np.exp(-(((1 - xs) + ys * 0.3 - lerp(-0.3, 1.5, sp)) / 0.07) ** 2)
            rgb = rgb + band[..., None] * 160
    x0 = int(cx - w / 2)
    y0 = int(cy - h / 2 + (1 - e) * rise)
    _blend(canvas, rgb, a, x0, y0, shadow)


def _blend(canvas, rgb, a, x0, y0, shadow=True):
    h, w = a.shape
    cx0, cy0 = max(0, x0), max(0, y0)
    cx1, cy1 = min(W, x0 + w), min(H, y0 + h)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    sl = (slice(cy0 - y0, cy1 - y0), slice(cx0 - x0, cx1 - x0))
    region = canvas[cy0:cy1, cx0:cx1]
    aa = a[sl][..., None]
    if shadow:
        sh = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
        sa = np.asarray(sh).astype(np.float32)[sl][..., None] / 255.0 * 0.75
        region[:] = region * (1 - sa)
    region[:] = region * (1 - aa) + np.clip(rgb[sl], 0, 255) * aa


def text_width(text, fname, size):
    return font(fname, size).getlength(text, direction="rtl", language="ar")

# ----------------------------------------------------------------------------- backgrounds & fx

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


@lru_cache(maxsize=8)
def radial(cx, cy, rad, color):
    d = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) / rad
    return (np.exp(-d ** 2)[..., None] * np.array(color, np.float32)).astype(np.float32)


@lru_cache(maxsize=1)
def vignette():
    d = np.sqrt(((XX - W / 2) / (W * 0.75)) ** 2 + ((YY - H / 2) / (H * 0.62)) ** 2)
    return np.clip(1.15 - d ** 2 * 0.75, 0.25, 1)[..., None].astype(np.float32)


def base_bg(t, glow_xy=(540, 960), glow_r=700, strength=1.0):
    c = np.empty((H, W, 3), np.float32)
    c[:] = BLACK
    pulse = 0.85 + 0.15 * math.sin(t * 1.3)
    c += radial(glow_xy[0], glow_xy[1], glow_r, tuple(int(v * 0.22) for v in GOLD)) * pulse * strength
    return c


RNG = np.random.default_rng(7)
PARTICLES = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(1.2, 4.5), RNG.uniform(8, 35),
              RNG.uniform(0, 6.28), RNG.uniform(-12, 12)) for _ in range(80)]


@lru_cache(maxsize=16)
def dot_sprite(rad, blur):
    s = int(rad * 2 + blur * 4 + 4)
    im = Image.new("L", (s, s), 0)
    ImageDraw.Draw(im).ellipse((s / 2 - rad, s / 2 - rad, s / 2 + rad, s / 2 + rad), fill=255)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255.0


def add_sprite(canvas, spr, x, y, color, k):
    h, w = spr.shape
    x0, y0 = int(x - w / 2), int(y - h / 2)
    cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    s = spr[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0][..., None]
    canvas[cy0:cy1, cx0:cx1] += s * np.array(color, np.float32) * k


def gold_dust(canvas, t, amount=1.0):
    for (x, y, r, sp, ph, drift) in PARTICLES:
        yy = (y - t * sp) % H
        xx = (x + math.sin(t * 0.4 + ph) * 20 + drift * t) % W
        tw = 0.5 + 0.5 * math.sin(t * 2.2 + ph)
        add_sprite(canvas, dot_sprite(round(r), 2 if r > 3 else 1), xx, yy, GOLD_L, 0.55 * tw * amount)


def bokeh(canvas, t, seed=3, n=26, warm=True):
    rng = np.random.default_rng(seed)
    for _ in range(n):
        x, y = rng.uniform(-50, W + 50), rng.uniform(0, H)
        r = rng.uniform(25, 90)
        ph = rng.uniform(0, 6.28)
        xx = x + math.sin(t * 0.35 + ph) * 30
        col = GOLD_L if warm and rng.random() < 0.7 else (255, 235, 200)
        add_sprite(canvas, dot_sprite(int(r), int(r * 0.25)), xx, y - t * 10, col,
                   0.10 + 0.06 * math.sin(t * 1.5 + ph))


def city_lines(canvas, t):
    """Abstract night-architecture lines (office / business mood)."""
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    vx, vy = W / 2, H * 0.42
    off = (t * 60) % 120
    for i in range(-9, 10):
        x = vx + i * 140
        d.line([(vx + i * 6, vy), (x * 3 - vx * 2, H + 200)], fill=50, width=2)
    k = 1.0
    for j in range(14):
        yy = vy + ((j * 120 + off) ** 1.35) * 0.18
        if yy > H:
            break
        d.line([(0, yy), (W, yy)], fill=int(25 + j * 3), width=1)
    for i in range(30):
        rng = np.random.default_rng(i)
        x, y = rng.uniform(80, W - 80), rng.uniform(vy - 380, vy + 120)
        w = rng.uniform(4, 10)
        lit = 0.5 + 0.5 * math.sin(t * rng.uniform(0.5, 2) + i)
        d.rectangle((x, y, x + w, y + w * 1.6), fill=int(40 + 70 * lit))
    a = np.asarray(im.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255.0
    canvas += a * np.array(GOLD, np.float32) * k


def light_streak(canvas, y, strength, width=W):
    """Anamorphic horizontal lens streak."""
    if strength <= 0:
        return
    yy = np.arange(H, dtype=np.float32)[:, None]
    xs = np.arange(W, dtype=np.float32)[None, :]
    v = np.exp(-((yy - y) / 6) ** 2) * np.exp(-((xs - W / 2) / (width * 0.45)) ** 2)
    v2 = np.exp(-((yy - y) / 60) ** 2) * 0.25
    canvas += ((v + v2) * strength)[..., None] * np.array([255, 225, 160], np.float32)


def top_shade(canvas, h=700, k=0.85):
    g = np.clip(1 - np.arange(H, dtype=np.float32) / h, 0, 1)[:, None, None] ** 1.4
    canvas *= 1 - g * k


def gold_rule(canvas, cx, cy, width, p):
    """Thin gold line that grows from the centre."""
    if p <= 0:
        return
    w = int(width * ease_out(p))
    if w < 2:
        return
    xs = np.arange(-w // 2, w // 2, dtype=np.float32)
    fade = np.clip(1 - np.abs(xs) / (w / 2), 0, 1) ** 0.6
    x0 = int(cx - w // 2)
    canvas[int(cy):int(cy) + 2, max(0, x0):x0 + len(xs)] = (
        canvas[int(cy):int(cy) + 2, max(0, x0):x0 + len(xs)] * (1 - fade[None, :len(xs), None])
        + np.array(GOLD, np.float32) * fade[None, :len(xs), None])

# ----------------------------------------------------------------------------- water

def droplet(canvas, x, y, r, k=1.0):
    """Lens-like water droplet: magnified + flipped refraction, dark rim, specular highlight."""
    r = int(r)
    if r < 3 or k <= 0:
        return
    x0, y0, x1, y1 = int(x - r), int(y - r), int(x + r), int(y + r)
    if x0 < 0 or y0 < 0 or x1 >= W or y1 >= H:
        return
    patch = canvas[y0 - r // 2:y1 + r // 2, x0 - r // 2:x1 + r // 2] if y0 - r // 2 >= 0 and x0 - r // 2 >= 0 else canvas[y0:y1, x0:x1]
    pim = Image.fromarray(np.clip(patch, 0, 255).astype(np.uint8)).resize((2 * r, 2 * r), Image.BILINEAR)
    ref = np.asarray(pim.transpose(Image.ROTATE_180)).astype(np.float32) * 1.05 + 12
    yy, xx = np.mgrid[-r:r, -r:r].astype(np.float32) / r
    d = np.sqrt(xx ** 2 + yy ** 2)
    m = np.clip((1 - d) * r / 1.5, 0, 1)[..., None] * k
    rim = np.clip(1 - np.abs(d - 0.88) / 0.12, 0, 1)[..., None]
    hl = np.exp(-(((xx + 0.35) ** 2 + (yy + 0.4) ** 2) / 0.03))[..., None]
    hl2 = np.exp(-(((xx - 0.3) ** 2 + (yy - 0.45) ** 2) / 0.05))[..., None] * 0.35
    col = ref * (1 - rim * 0.55) + (hl + hl2) * 255
    region = canvas[y0:y1, x0:x1]
    # contact shadow
    sh = np.clip(1 - np.sqrt((xx - 0.12) ** 2 + (yy - 0.18) ** 2), 0, 1)[..., None] ** 2 * 0.35 * k
    region[:] = region * (1 - sh)
    region[:] = region * (1 - m) + col * m


def rain(canvas, t, k=1.0, seed=11):
    rng = np.random.default_rng(seed)
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for _ in range(70):
        x = rng.uniform(0, W)
        sp = rng.uniform(900, 1500)
        y = (rng.uniform(0, H) + t * sp) % (H + 200) - 100
        ln = rng.uniform(25, 70)
        d.line([(x, y), (x - ln * 0.08, y + ln)], fill=int(rng.uniform(40, 120)), width=2)
    a = np.asarray(im.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)[..., None] / 255.0
    canvas[:] = canvas + a * np.array([200, 215, 235], np.float32) * k

# ----------------------------------------------------------------------------- shield

@lru_cache(maxsize=2)
def shield_face(size=360):
    w, h = size, int(size * 1.18)
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    pts = []
    # top edge (slight dip in the middle), right flank down to the point, left flank back up
    for i in range(41):
        a = i / 40
        pts.append((lerp(0.06, 0.94, a) * w, (0.09 - 0.035 * math.sin(a * math.pi)) * h))
    for i in range(41):
        ang = i / 40 * math.pi / 2
        pts.append((w / 2 + 0.44 * w * math.cos(ang), 0.42 * h + 0.54 * h * math.sin(ang) ** 1.2))
    for i in range(40, -1, -1):
        ang = i / 40 * math.pi / 2
        pts.append((w / 2 - 0.44 * w * math.cos(ang), 0.42 * h + 0.54 * h * math.sin(ang) ** 1.2))
    d.polygon(pts, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1))
    inner = m.filter(ImageFilter.MinFilter(17))
    g = np.linspace(0, 1, h)[:, None, None]
    face = (np.array(GOLD_L) * (1 - g) + np.array(GOLD_D) * g) * np.ones((1, w, 1))
    inner_col = (np.array([30, 24, 12]) * (1 - g) + np.array([8, 7, 6]) * g) * np.ones((1, w, 1))
    ia = np.asarray(inner).astype(np.float32)[..., None] / 255.0
    col = face * (1 - ia) + inner_col * ia
    # number
    num = Image.new("L", (w, h), 0)
    f = font("Cairo-Black.ttf", int(size * 0.62))
    txt = T["s3_shield_number"]
    bb = f.getbbox(txt)
    ImageDraw.Draw(num).text(((w - (bb[2] - bb[0])) / 2 - bb[0], h * 0.47 - (bb[3] + bb[1]) / 2), txt, font=f, fill=255)
    na = np.asarray(num).astype(np.float32)[..., None] / 255.0
    col = col * (1 - na) + face * na
    return np.dstack([col, np.asarray(m)]).astype(np.float32)


def draw_shield(canvas, cx, cy, t, t_in):
    p = prog(t, t_in, 0.9)
    if p <= 0:
        return
    face = shield_face()
    h, w = face.shape[:2]
    ang = lerp(85, 0, ease_out_back(p, 1.6)) + (math.sin((t - t_in) * 1.8) * 14 if p >= 1 else 0)
    sc = lerp(0.6, 1.0, ease_out(p))
    cosv, sinv = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    nw = max(2, int(w * abs(cosv) * sc))
    nh = int(h * sc)
    im = Image.fromarray(face.astype(np.uint8), "RGBA").resize((nw, nh), Image.BICUBIC)
    arr = np.asarray(im).astype(np.float32)
    alpha = arr[..., 3] / 255.0 * clamp(p * 2)
    depth = int(26 * sc * sinv)
    # extrusion: darker gold copies stepped along the depth direction
    for i in range(abs(depth), 0, -2):
        off = i if depth > 0 else -i
        shade = np.array(GOLD_D, np.float32) * (0.45 + 0.35 * (1 - i / max(1, abs(depth))))
        _blend(canvas, np.ones_like(arr[..., :3]) * shade, alpha, int(cx - nw / 2 + off), int(cy - nh / 2), False)
    rgb = arr[..., :3] * (0.8 + 0.2 * abs(cosv))
    # moving highlight
    xs = np.arange(nw, dtype=np.float32)[None, :] / max(nw, 1)
    ys = np.arange(nh, dtype=np.float32)[:, None] / nh
    band = np.exp(-((xs + ys * 0.5 - ((t - t_in) * 0.6 % 2.2 - 0.3)) / 0.08) ** 2)
    rgb = rgb + band[..., None] * 120 * alpha[..., None]
    # glow behind
    add_sprite(canvas, dot_sprite(int(nh * 0.38), int(nh * 0.2)), cx, cy, GOLD, 0.35 * clamp(p * 2))
    _blend(canvas, rgb, alpha, int(cx - nw / 2), int(cy - nh / 2), True)

# ----------------------------------------------------------------------------- CTA

def draw_cta(canvas, cx, cy, t, t_in):
    p = prog(t, t_in, 0.6)
    if p <= 0:
        return
    s = ease_out_back(p, 1.8)
    pulse = 1 + 0.035 * math.sin((t - t_in) * 2 * math.pi / 1.1) if p >= 1 else 1
    bw, bh = int(560 * s * pulse), int(132 * s * pulse)
    if bw < 10 or bh < 10:
        return
    im = Image.new("L", (bw, bh), 0)
    ImageDraw.Draw(im).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=bh // 2, fill=255)
    m = np.asarray(im).astype(np.float32) / 255.0
    g = np.linspace(0, 1, bh)[:, None, None]
    col = (np.array(GOLD_L) * (1 - g) + np.array(GOLD_D) * g) * np.ones((1, bw, 1))
    # periodic shine
    ph = ((t - t_in) % 1.6) / 1.6
    xs = np.arange(bw, dtype=np.float32)[None, :] / bw
    ys = np.arange(bh, dtype=np.float32)[:, None] / bh
    band = np.exp(-(((1 - xs) + ys * 0.4 - lerp(-0.4, 1.6, ph)) / 0.06) ** 2)
    col = col + band[..., None] * 140
    # outer glow
    add_sprite(canvas, dot_sprite(int(bw * 0.35), int(bw * 0.18)), cx, cy, GOLD, 0.30 * clamp(p * 2))
    _blend(canvas, col, m * clamp(p * 2), int(cx - bw / 2), int(cy - bh / 2), True)
    # label (dark on gold) + animated chevrons pointing forward (left in RTL)
    lay = text_layer(CFG["cta"], "Cairo-Black.ttf", int(64 * s * pulse) or 1, "dark")
    la = np.asarray(lay).astype(np.float32)
    tx = int(cx - la.shape[1] / 2 + 28 * s)
    _blend(canvas, la[..., :3], la[..., 3] / 255.0 * clamp(p * 2), tx, int(cy - la.shape[0] / 2 - 4), False)
    cs = max(4, int(26 * s * pulse))
    cm = Image.new("L", (cs * 3, cs * 2 + 8), 0)
    cd = ImageDraw.Draw(cm)
    for k in range(2):  # two chevrons pointing left = "forward" in Arabic reading direction
        x0 = 4 + k * int(cs * 0.9)
        cd.line([(x0 + cs, 4), (x0, cs + 4), (x0 + cs, cs * 2 + 4)], fill=255, width=max(2, cs // 4), joint="curve")
    ca = np.asarray(cm).astype(np.float32) / 255.0
    nudge = -8 * (0.5 + 0.5 * math.sin((t - t_in) * 6))
    _blend(canvas, np.zeros(ca.shape + (3,), np.float32) + np.array(BLACK, np.float32), ca * clamp(p * 2),
           int(cx - bw / 2 + 46 + nudge), int(cy - ca.shape[0] / 2), False)

# ----------------------------------------------------------------------------- scenes

BG_VIDEO = None


def bg_frame(t):
    """Optional real footage for scene 4 (e.g. a Saudi man's wrist), from config scene4_background."""
    path = CFG.get("scene4_background")
    if not path:
        return None
    path = os.path.join(ROOT, path)
    lt = t - S4_BEATS[0]
    if path.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
        im = Image.open(path).convert("RGB")
    else:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-ss", f"{lt:.3f}", "-i", path, "-frames:v", "1",
                              "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        if len(raw) != W * H * 3:
            return None
        return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32)
    im = im.resize((W, int(im.height * W / im.width))) if im.width / im.height < W / H else im.resize((int(im.width * H / im.height), H))
    x0, y0 = (im.width - W) // 2, (im.height - H) // 2
    return np.asarray(im.crop((x0, y0, x0 + W, y0 + H))).astype(np.float32)


def scene1(t):
    c = np.zeros((H, W, 3), np.float32)
    c[:] = BLACK
    if t >= FLASH_AT - 0.05:
        lt = t - FLASH_AT
        c = base_bg(t, (540, 1000), 650, clamp(lt * 2))
        gold_dust(c, t, clamp(lt))
        sc = lerp(2.75, 2.45, ease_out(prog(t, FLASH_AT, 2.8)))
        place_product(c, 540, 1010, sc, rot_y=lerp(-18, 0, ease_out(prog(t, FLASH_AT, 1.6))),
                      alpha=clamp(lt * 6), sweep=lerp(-1, 1.2, prog(t, FLASH_AT + 0.1, 1.2)), glow=0.6)
        top_shade(c, 760, 0.92)
        # flash: white burst decaying + streak
        fl = math.exp(-max(0, lt) * 7) if lt >= 0 else 0
        light_streak(c, 1010, 1.2 * math.exp(-max(0, lt) * 2.5))
        c = c * (1 - fl * 0.2) + fl * 255
    else:
        # heartbeat glow before the reveal
        k = math.exp(-((t - 0.05) / 0.06) ** 2)
        c += radial(540, 1010, 260, GOLD) * 0.35 * k
    draw_text(c, T["s1_line1"], "Cairo-Black.ttf", 96, 540, 380, S1_LINE1_AT, t, "white", dur=0.5)
    draw_text(c, T["s1_line2"], "Cairo-Black.ttf", 104, 540, 510, S1_LINE2_AT, t, "gold", dur=0.55,
              shimmer=(S1_LINE2_AT + 0.6, 0.9))
    return c


def scene2(t):
    c = base_bg(t, (540, 1080), 800)
    if t < S2_SHOT_B:
        # shot A: medium close-up on the dial, slow push-in, brand reveal
        p = prog(t, 3.0, 3.0)
        sc = lerp(3.0, 3.35, ease_in_out(p))
        place_product(c, 540, lerp(1120, 1090, p), sc,
                      rot_z=lerp(-4, 0, ease_out(p)), sweep=lerp(-1.2, 1.2, prog(t, 3.3, 2.2)), glow=0.25)
        top_shade(c, 700, 0.9)
        draw_text(c, CFG["brand_latin"].upper(), "Cinzel-SemiBold.ttf", 100, 540, 360, S2_BRAND_AT, t, "gold",
                  latin=True, tracking=10, dur=0.9, shimmer=(S2_BRAND_AT + 0.9, 1.0))
        gold_rule(c, 540, 445, 520, prog(t, S2_BRAND_AT + 0.4, 0.8))
        draw_text(c, CFG["brand_arabic"], "Tajawal-Medium.ttf", 54, 540, 505, S2_BRAND_AT + 0.6, t, "white", dur=0.6)
    else:
        # shot B: macro pan across the real dial details (indices, hands, sub-dial, date)
        p = prog(t, S2_SHOT_B, 3.0)
        sc = lerp(4.6, 5.0, p)
        _, _, _, r = load_product()
        rr = r / UPS * sc
        ox = lerp(-0.25, 0.30, ease_in_out(p)) * rr
        oy = lerp(-0.05, -0.20, ease_in_out(p)) * rr
        place_product(c, 540 - ox, 1150 - oy, sc, rot_z=lerp(3, -2, p), sweep=lerp(-1.0, 1.0, prog(t, S2_SHOT_B + 0.2, 2.2)))
        top_shade(c, 760, 0.95)
        draw_text(c, T["s2_tagline"], "Cairo-Bold.ttf", 66, 540, 400, S2_TAGLINE_AT, t, "white", dur=0.7)
        gold_rule(c, 540, 480, 420, prog(t, S2_TAGLINE_AT + 0.4, 0.8))
    gold_dust(c, t, 0.5)
    return c


def scene3(t):
    c = base_bg(t, (540, 1100), 700)
    c *= np.array([0.85, 0.95, 1.1], np.float32)  # cooler, "water" tint while staying black/gold
    rain(c, t, 0.35 * clamp((t - 9.0) * 2) * (1 - 0.6 * prog(t, S3_SHIELD_AT, 1)))
    # watch shrinks & moves down when the shield arrives
    p = ease_in_out(prog(t, S3_SHIELD_AT - 0.3, 0.9))
    sc = lerp(2.3, 1.75, p)
    wx, wy = 540, lerp(1060, 1220, p)
    place_product(c, wx, wy, sc, rot_z=math.sin(t * 0.6) * 2, rot_y=math.sin(t * 0.8) * 6,
                  sweep=lerp(-1, 1.2, prog(t, 13.2, 1.6)), glow=0.2)
    # droplets that land on the crystal and stay; positions relative to head radius
    _, _, _, r = load_product()
    rr = r / UPS * sc
    # kept on the outer ring so the logo, date window and sub-dial stay readable
    beads = [(-0.60, -0.30, 0.075), (0.58, -0.42, 0.065), (-0.66, 0.22, 0.06), (0.62, 0.48, 0.07),
             (-0.40, 0.66, 0.055), (0.34, 0.72, 0.06), (-0.42, -0.64, 0.05), (0.22, -0.78, 0.045)]
    for (bx, by, br), tl in zip(beads, S3_DROPS):
        br *= 1.6
        if t < tl - 0.25:
            continue
        if t < tl:  # falling
            fp = (t - tl + 0.25) / 0.25
            droplet(c, wx + bx * rr, wy + by * rr - (1 - fp) * 500, br * rr * 0.7, 1.0)
            continue
        land = prog(t, tl, 0.18)
        slide = max(0, t - tl - 0.4) * 6 * (br / 0.1)
        droplet(c, wx + bx * rr, wy + by * rr + slide, br * rr * lerp(1.25, 1.0, ease_out(land)), 1.0)
        if land < 1:  # splash ring
            add_sprite(c, dot_sprite(int(br * rr * (1 + land * 1.5)), 3), wx + bx * rr, wy + by * rr,
                       (230, 240, 255), 0.25 * (1 - land))
    top_shade(c, 700, 0.85)
    # badge: first half (water) then second half (warranty) completes with the shield hit
    txt = T["s3_badge"]
    size = 68
    full = text_width(txt, "Cairo-Black.ttf", size)
    first = txt.split("|")[0] + "|"
    frac = text_width(first, "Cairo-Black.ttf", size) / full
    lay = text_layer(txt, "Cairo-Black.ttf", size, "gold")
    arr = np.asarray(lay).astype(np.float32)
    h, w = arr.shape[:2]
    pad = (w - full) / 2
    xs = (np.arange(w, dtype=np.float32) - pad) / full
    p1, p2 = ease_out(prog(t, S3_TEXT_AT, 0.6)), ease_out(prog(t, S3_SHIELD_AT, 0.5))
    reveal = np.where(1 - xs <= frac + 0.02, np.clip((p1 * frac * 1.15 - (1 - xs)) / 0.05, 0, 1),
                      np.clip((frac + p2 * (1 - frac) * 1.15 - (1 - xs)) / 0.05, 0, 1))
    _blend(c, arr[..., :3], arr[..., 3] / 255.0 * reveal[None, :], int(540 - w / 2), int(360 - h / 2), True)
    draw_shield(c, 540, 680, t, S3_SHIELD_AT)
    if 0 <= t - S3_SHIELD_AT < 0.4:
        light_streak(c, 680, 0.8 * (1 - (t - S3_SHIELD_AT) / 0.4))
    return c


def scene4(t):
    real = bg_frame(t)
    beat = 0 if t < S4_BEATS[1] else (1 if t < S4_BEATS[2] else 2)
    lt = t - S4_BEATS[beat]
    if real is not None:
        c = real * 0.75
        top_shade(c, 800, 0.85)
    else:
        c = base_bg(t, (540, 1100), 750)
        if beat == 0:
            city_lines(c, t)
            place_product(c, lerp(470, 560, prog(t, 16, 2.4)), 1080, 2.05, rot_z=-14, rot_y=lerp(-30, -12, ease_out(prog(t, 16, 2.4))),
                          sweep=lerp(-1, 1.2, prog(t, 16.4, 1.6)), glow=0.3, fade_strap=((520, 220), (520, 220)))
        elif beat == 1:
            bokeh(c, t)
            place_product(c, lerp(610, 520, prog(t, 18.4, 2.2)), 1080, 2.05, rot_z=12, rot_y=lerp(30, 12, ease_out(prog(t, 18.4, 2.2))),
                          sweep=lerp(1.2, -1, prog(t, 18.7, 1.6)), glow=0.4, fade_strap=((520, 220), (520, 220)))
        else:
            for i in range(3):  # gold rings expanding
                rp = ((t - S4_BEATS[2]) * 0.5 + i / 3) % 1
                im = Image.new("L", (W, H), 0)
                rad = 300 + rp * 500
                ImageDraw.Draw(im).ellipse((540 - rad, 1080 - rad, 540 + rad, 1080 + rad), outline=255, width=3)
                a = np.asarray(im).astype(np.float32)[..., None] / 255.0
                c += a * np.array(GOLD, np.float32) * (1 - rp) * 0.6
            place_product(c, 540, 1080, lerp(2.1, 2.3, prog(t, 20.6, 2.4)), rot_y=math.sin(t) * 8,
                          sweep=lerp(-1, 1.2, prog(t, 20.8, 1.6)), glow=0.6, fade_strap=((520, 220), (520, 220)))
        top_shade(c, 700, 0.85)
    gold_dust(c, t, 0.6)
    keys = ["s4_a", "s4_b", "s4_c"]
    for i, k in enumerate(keys):
        t_in = S4_BEATS[i] + 0.3
        t_out = S4_BEATS[i + 1] if i < 2 else 99
        fade = 1 - prog(t, t_out - 0.25, 0.25)
        style = "gold" if i == 2 else "white"
        size = 96 if i == 2 else 100
        draw_text(c, T[k], "Cairo-Black.ttf", size, 540, 420, t_in, t, style, dur=0.55, alpha=fade,
                  shimmer=(t_in + 0.6, 0.9) if i == 2 else None)
    return c


def scene5(t):
    c = base_bg(t, (540, 820), 650, 1.2)
    p = prog(t, 23.0, 1.4)
    ry = lerp(40, 0, ease_out(p)) + (math.sin((t - 24.4) * 0.9) * 5 * prog(t, 24.4, 1) if t < 28 else 0)
    sc = lerp(1.15, 1.38, ease_out(p))
    sweep_t = (t - 23.4) % 2.4 / 2.4 if t < 28 else 1.0
    place_product(c, 540, lerp(820, 760, ease_out(p)), sc, rot_y=ry, alpha=clamp(p * 3),
                  sweep=lerp(-1.2, 1.4, sweep_t), sweep_k=0.6, glow=0.6, fade_strap=((330, 120), (330, 120)))
    gold_dust(c, t, 0.7)
    top_shade(c, 600, 0.75)
    draw_text(c, CFG["brand_latin"].upper(), "Cinzel-SemiBold.ttf", 96, 540, 330, S5_BRAND_AT, t, "gold",
              latin=True, tracking=10, dur=0.9, shimmer=(S5_BRAND_AT + 0.9, 1.0))
    gold_rule(c, 540, 410, 480, prog(t, S5_BRAND_AT + 0.4, 0.8))
    draw_text(c, T["s5_tagline"], "Tajawal-Medium.ttf", 58, 540, 465, S5_TAGLINE_AT, t, "white", dur=0.6)
    draw_text(c, CFG["store_name"], "Cairo-Black.ttf", 92, 540, 1075, S5_STORE_AT, t, "white", dur=0.6,
              shimmer=(S5_STORE_AT + 0.7, 0.9))
    draw_cta(c, 540, 1205, t, S5_CTA_AT)
    return c


SCENE_FN = [scene1, scene2, scene3, scene4, scene5]


def frame(t, guides=False):
    idx = next(i for i, (_, a, b) in enumerate(SCENES) if a <= t < b or i == len(SCENES) - 1)
    c = SCENE_FN[idx](t)
    # gold light-dip around scene boundaries (not before scene 1)
    for _, a, _ in SCENES[1:]:
        d = abs(t - a)
        if d < TRANSITION / 2:
            k = (1 - d / (TRANSITION / 2)) ** 2
            c = c * (1 - 0.3 * k) + radial(540, 960, 900, GOLD_L) * 0.45 * k
            light_streak(c, 960, 0.6 * k)
    c *= vignette()
    # film grain
    rng = np.random.default_rng(int(t * FPS))
    c += rng.normal(0, 3.2, (H // 2, W // 2, 1)).astype(np.float32).repeat(2, 0).repeat(2, 1)
    # gentle fade-out of the very last frames' audio is handled in audio; picture holds
    out = np.clip(c, 0, 255).astype(np.uint8)
    if guides:
        im = Image.fromarray(out)
        d = ImageDraw.Draw(im)
        d.rectangle((SAFE_SIDE, SAFE_TOP, W - SAFE_SIDE, SAFE_BOTTOM), outline=(255, 0, 0), width=3)
        out = np.asarray(im)
    return out


def _render_chunk(args):
    i0, i1, guides = args
    load_product()
    return [frame(i / FPS, guides).tobytes() for i in range(i0, i1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "build", "video_noaudio.mp4"))
    ap.add_argument("--preview", help="comma separated seconds; writes PNG stills instead of video")
    ap.add_argument("--guides", action="store_true", help="draw the text safe-area")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    a = ap.parse_args()
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    load_product()
    if a.preview:
        for s in a.preview.split(","):
            p = os.path.join(ROOT, "build", f"preview_{float(s):05.2f}.png")
            Image.fromarray(frame(float(s), a.guides)).save(p)
            print(p)
        return
    n = int(DURATION * FPS)
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                           "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out],
                          stdin=subprocess.PIPE)
    step = 15
    chunks = [(i, min(n, i + step), a.guides) for i in range(0, n, step)]
    with Pool(a.jobs) as pool:
        for k, frames in enumerate(pool.imap(_render_chunk, chunks)):
            for fb in frames:
                ff.stdin.write(fb)
            print(f"\rrendered {min(n, (k + 1) * step)}/{n}", end="", flush=True)
    ff.stdin.close()
    ff.wait()
    print("\n->", a.out)


if __name__ == "__main__":
    main()
