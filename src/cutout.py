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
    soft = np.clip((255.0 - mn) / (255.0 - 200.0), 0, 1)
    alpha = np.where(band, np.minimum(alpha, soft), alpha)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    alpha[bg & ~ndimage.binary_dilation(~bg, iterations=1)] = 0

    # Remove the white matte from semi-transparent edge pixels.
    a = np.clip(alpha, 1e-3, 1)[..., None]
    un = (rgb - (1 - a) * 255.0) / a
    un = np.clip(un, 0, 255)
    out = np.dstack([un, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def _head_rows(a):
    widths = a.sum(axis=1)
    strap = np.bincount(widths[widths > 0]).argmax()  # most common row width = strap
    rows = np.where(widths > strap * 1.2)[0]
    # keep the largest contiguous run (the case)
    runs = np.split(rows, np.where(np.diff(rows) > 3)[0] + 1)
    run = max(runs, key=len)
    return run[0], run[-1]


def find_head_mask(fg):
    """Bounding box of the watch head as a boolean mask (padded)."""
    y0, y1 = _head_rows(fg)
    pad = (y1 - y0) // 4
    m = np.zeros_like(fg)
    m[max(0, y0 - pad):y1 + pad, :] = True
    return m


def find_head(rgba):
    """Return (cx, cy, radius) of the watch head = widest band of opaque rows."""
    a = np.asarray(rgba)[..., 3] > 128
    y0, y1 = _head_rows(a)
    # strap rows are symmetric around the watch axis (the crown is not)
    widths = a.sum(axis=1)
    strap = np.bincount(widths[widths > 0]).argmax()
    centers = [np.where(a[y])[0].mean() for y in np.where(np.abs(widths - strap) <= 2)[0]]
    cx = float(np.median(centers))
    cy = (y0 + y1) / 2
    r = (y1 - y0) / 2
    return cx, float(cy), float(r)


if __name__ == "__main__":
    import sys
    im = cutout(sys.argv[1])
    im.save(sys.argv[2])
    print(im.size, find_head(im))
