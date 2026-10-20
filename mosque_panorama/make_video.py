"""Turn one still photo into a 21s "three camera" panoramic video.

Camera 1 (front): slow push-in with a gentle tilt up toward the minarets.
Camera 2 (right): virtual camera on the right, sweeping from a steep angle to the facade.
Camera 3 (left):  mirror of camera 2 from the left side.
Each camera runs 7 seconds. Perspective is simulated with a rotation homography.
"""
import math
import subprocess
import sys

import cv2
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else "source.jpg"
OUT = sys.argv[2] if len(sys.argv) > 2 else "mosque_3cam_panorama.mp4"
OW, OH, FPS, SECONDS = 1080, 1920, 30, 7
N = FPS * SECONDS
FADE = 12  # frames of cross-fade at each camera change

img = cv2.imread(SRC)
H0, W0 = img.shape[:2]
f = 1.1 * W0  # virtual focal length in source pixels


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def homography(yaw, pitch, zoom, dx, dy):
    """Map canvas pixels -> source pixels for a camera rotated by yaw/pitch."""
    ks = np.array([[f, 0, W0 / 2], [0, f, H0 / 2], [0, 0, 1]])
    s = OW / W0 * zoom
    ko = np.array([[f * s, 0, OW / 2 + dx], [0, f * s, OH / 2 + dy], [0, 0, 1]])
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    src_to_out = ko @ rx @ ry @ np.linalg.inv(ks)
    return np.linalg.inv(src_to_out)


def covers(hm):
    pts = np.array([[0, 0], [OW, 0], [0, OH], [OW, OH], [OW / 2, 0], [OW / 2, OH],
                    [0, OH / 2], [OW, OH / 2]], np.float64).reshape(-1, 1, 2)
    p = cv2.perspectiveTransform(pts, hm).reshape(-1, 2)
    return (p[:, 0] >= 0).all() and (p[:, 0] <= W0 - 1).all() and \
        (p[:, 1] >= 0).all() and (p[:, 1] <= H0 - 1).all()


def fit_zoom(yaw, pitch, zoom, dx, dy):
    """Raise zoom until the warped photo fully covers the frame (no black edges)."""
    lo, hi = zoom, zoom * 3
    if covers(homography(yaw, pitch, lo, dx, dy)):
        return lo
    for _ in range(25):
        mid = (lo + hi) / 2
        if covers(homography(yaw, pitch, mid, dx, dy)):
            hi = mid
        else:
            lo = mid
    return hi


def camera_params(cam, t):
    e = ease(t)
    if cam == 0:   # front: push in, tilt up toward minarets
        return 0.0, math.radians(-2 + 5 * e), 1.0 + 0.22 * e, 0.0, 80 * e
    yaw = math.radians(15 - 11 * e)  # sweep from oblique toward the facade
    dx = -90 * (1 - e)
    if cam == 2:   # left camera mirrors the right one
        yaw, dx = -yaw, -dx
    return yaw, math.radians(1.5 * math.sin(math.pi * t)), 1.05, dx, 0.0


def grade(frame):
    """Light cinematic grade: lift contrast, warm highlights, soft vignette."""
    x = frame.astype(np.float32) / 255
    x = np.clip((x - 0.5) * 1.12 + 0.52, 0, 1)
    x[..., 2] *= 1.04
    x[..., 0] *= 0.97
    x *= VIG
    return np.clip(x * 255, 0, 255).astype(np.uint8)


yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
r = np.sqrt(((xx - OW / 2) / (OW / 2)) ** 2 + ((yy - OH / 2) / (OH / 2)) ** 2)
VIG = (1 - 0.28 * np.clip(r - 0.45, 0, 1) ** 1.5)[..., None]

LABELS = ["CAM 1  FRONT", "CAM 2  RIGHT", "CAM 3  LEFT"]


def render(cam, i):
    yaw, pitch, zoom, dx, dy = camera_params(cam, i / (N - 1))
    zoom = fit_zoom(yaw, pitch, zoom, dx, dy)
    hm = homography(yaw, pitch, zoom, dx, dy)
    fr = cv2.warpPerspective(img, hm, (OW, OH), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                             borderMode=cv2.BORDER_REPLICATE)
    fr = grade(fr)
    cv2.circle(fr, (70, 82), 11, (40, 40, 230), -1)
    cv2.putText(fr, LABELS[cam], (95, 95), cv2.FONT_HERSHEY_DUPLEX, 1.2, (255, 255, 255), 2, cv2.LINE_AA)
    return fr


ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
                       "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                       "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                       "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
for cam in range(3):
    for i in range(N):
        fr = render(cam, i)
        if cam < 2 and i >= N - FADE:  # dissolve into the next camera's first frames
            a = (i - (N - FADE) + 1) / (FADE + 1)
            fr = cv2.addWeighted(fr, 1 - a, render(cam + 1, 0), a, 0)
        ff.stdin.write(fr.tobytes())
ff.stdin.close()
ff.wait()
print("wrote", OUT)
