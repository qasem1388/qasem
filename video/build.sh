#!/usr/bin/env bash
# Renders the full 30s vertical video (1080x1920, 30fps) with music.
# Requires: node + playwright (chromium), ffmpeg, python3 + numpy.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
python3 music.py
node capture.js build/video_silent.mp4 30
ffmpeg -y -loglevel error -i build/video_silent.mp4 -i build/music.wav -c:v copy -c:a aac -b:a 192k -shortest build/mandoobi_30s.mp4
echo "done: build/mandoobi_30s.mp4"
