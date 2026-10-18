#!/usr/bin/env bash
# Mixes a recorded voiceover over the music (music ducks under the voice).
# Usage: ./add_voice.sh path/to/voice.wav   ->  build/mandoobi_30s_voice.mp4
set -euo pipefail
cd "$(dirname "$0")"
VOICE="${1:?usage: ./add_voice.sh voice.wav}"
ffmpeg -y -loglevel error -i build/video_silent.mp4 -i build/music.wav -i "$VOICE" -filter_complex "\
[2:a]aresample=44100,aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,volume=1.6,asplit=2[v][sc];\
[1:a]volume=0.8[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[md];\
[md][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 30 build/mandoobi_30s_voice.mp4
echo "done: build/mandoobi_30s_voice.mp4"
