"""Cut the product out of a light/white studio background and locate the watch head.

Works for any product shot on a plain white background, so the source image
can be swapped in config.json without touching the code.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def cutout(path, white_thresh=236):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    mn = rgb.min(axis=2)
    whiteish = mn >= white_thresh

    # Background = white pixels connected to the image border.
    labels, _ = ndimage.label(whiteish)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])

    # Enclosed pure-white holes (strap holes) are background too, as long as
    # they are small blobs with a white-studio colour rather than metal highlights.
    head = find_head_mask(~bg)
    for lab in range(1, labels.max() + 1):
        if lab in border:
            continue
        blob = labels == lab
        if (blob & head).any():  # never touch the dial (logo, indices, date window)
            continue
        area = blob.sum()
        if area < 4000 and rgb[blob].mean() > 248:
            bg |= blob

    # Soft edge: in a thin band around the background, alpha follows "distance from white".
    band = ndimage.binary_dilation(bg, iterations=3) & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    soft = np.clip((255.0 - mn) / (255.0 - 120.0), 0, 1)
    alpha = np.where(band, np.minimum(alpha, soft), alpha)
    alpha = ndimage.minimum_filter(alpha, 3)  # choke 1px so no light studio fringe survives
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    alpha[bg & ~ndimage.binary_dilation(~bg, iterations=1)] = 0

    # Drop anything that is not part of the watch itself (hang tags, strings, price labels):
    # outside the case rows keep only a corridor around the strap axis.
    fg = alpha > 0.5
    axis, half, y0, y1 = _axis_and_head(fg)
    xs = np.arange(w)[None, :]
    corridor = np.abs(xs - axis) <= half * 1.18
    rows = np.zeros((h, 1), bool)
    rows[y0:y1 + 1] = True
    alpha = np.where(corridor | rows, alpha, 0)

    # Remove the white matte from semi-transparent edge pixels.
    a = np.clip(alpha, 1e-3, 1)[..., None]
    un = (rgb - (1 - a) * 255.0) / a
    un = np.clip(un, 0, 255)
    out = np.dstack([un, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def _axis_runs(a):
    """Per row, the width of the opaque run that crosses the watch axis (ignores tags beside it)."""
    cols = np.where(a.any(axis=0))[0]
    rows = np.where(a.any(axis=1))[0]
    axis = int(np.median([np.where(a[y])[0].mean() for y in rows]))
    run = np.zeros(a.shape[0], int)
    for y in rows:
        r = a[y]
        if not r[axis]:
            continue
        l = axis - np.argmin(r[axis::-1]) + 1 if not r[:axis + 1].all() else 0
        rr = axis + np.argmin(r[axis:]) if not r[axis:].all() else a.shape[1]
        run[y] = rr - l
    return axis, run


def _axis_and_head(a):
    """Return (axis x, strap half-width, case top row, case bottom row)."""
    axis, run = _axis_runs(a)
    strap0 = np.median(run[run > 0])
    big = np.where(run > strap0 * 1.2)[0]
    blocks = np.split(big, np.where(np.diff(big) > 3)[0] + 1)
    case = max(blocks, key=len)
    strap = np.median(run[(run > 0) & (run <= strap0 * 1.2)])
    return axis, strap / 2, int(case[0]), int(case[-1])


def find_head_mask(fg):
    """Bounding box of the watch head as a boolean mask (padded)."""
    _, _, y0, y1 = _axis_and_head(fg)
    pad = (y1 - y0) // 4
    m = np.zeros_like(fg)
    m[max(0, y0 - pad):y1 + pad, :] = True
    return m


def find_head(rgba):
    """Return (cx, cy, radius) of the watch head (case centre on the strap axis)."""
    a = np.asarray(rgba)[..., 3] > 128
    axis, _, y0, y1 = _axis_and_head(a)
    cy = (y0 + y1) / 2
    # A round case overlaps the lugs, so its height is under-measured; use the left half-width
    # at the widest row instead (the crown sits on the right and is excluded).
    widest = y0 + int(np.argmax(a[y0:y1 + 1].sum(axis=1)))
    r = axis - np.where(a[widest])[0][0]
    return float(axis), float(cy), float(r)


if __name__ == "__main__":
    import sys
    im = cutout(sys.argv[1])
    im.save(sys.argv[2])
    print(im.size, find_head(im))
