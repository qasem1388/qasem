#!/usr/bin/env bash
# Usage: ./render.sh input.mp4 output.mp4 [voice]
# Builds a Saudi-dialect voiceover from script_saudi.tsv with edge-tts and puts it on the video.
# Needs network access to speech.platform.bing.com (edge-tts).
# Voices: ar-SA-HamedNeural (male, default) or ar-SA-ZariyahNeural (female).
set -euo pipefail
IN=$1; OUT=$2; VOICE=${3:-ar-SA-HamedNeural}
DIR=$(cd "$(dirname "$0")" && pwd); TMP=$(mktemp -d)
pip install -q edge-tts >/dev/null 2>&1 || true

inputs=(); filters=""; i=0
while IFS=$'\t' read -r start text; do
  [[ -z "$start" || "$start" == \#* ]] && continue
  edge-tts --voice "$VOICE" --rate=+8% --text "$text" --write-media "$TMP/$i.mp3"
  ms=$(awk "BEGIN{printf \"%d\", $start*1000}")
  inputs+=(-i "$TMP/$i.mp3")
  filters+="[$((i+1)):a]adelay=${ms}|${ms}[v$i];"
  i=$((i+1))
done < "$DIR/script_saudi.tsv"

mix=""; for ((k=0;k<i;k++)); do mix+="[v$k]"; done
# Original track contains the old voice mixed with music, so it is replaced entirely.
# To keep background music, pass a music-only file as MUSIC=path.mp3.
if [[ -n "${MUSIC:-}" ]]; then
  inputs+=(-i "$MUSIC"); m=$((i+1))
  filters+="${mix}amix=inputs=$i:normalize=0[vo];[$m:a]volume=0.15[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[a]"
else
  filters+="${mix}amix=inputs=$i:normalize=0[a]"
fi
ffmpeg -y -i "$IN" "${inputs[@]}" -filter_complex "$filters" -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k -t "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")" "$OUT"
rm -rf "$TMP"
