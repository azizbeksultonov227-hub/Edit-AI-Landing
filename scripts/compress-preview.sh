#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: scripts/compress-preview.sh <input-video> <output-name.mp4>" >&2
  exit 1
fi

input="$1"
output_name="$2"
output_path="public/media/preview/${output_name}"

mkdir -p public/media/preview
ffmpeg -y -hide_banner -loglevel error \
  -i "$input" \
  -an \
  -vf "fps=24,scale=-2:720" \
  -c:v libx264 \
  -preset medium \
  -crf 31 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  "$output_path"

ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=nw=1 "$output_path"
