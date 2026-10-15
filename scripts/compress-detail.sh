#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: scripts/compress-detail.sh <input-video> <output-name.mp4>" >&2
  exit 1
fi

input="$1"
output_name="$2"
output_path="public/media/detail/${output_name}"

mkdir -p public/media/detail
ffmpeg -y -hide_banner -loglevel error \
  -i "$input" \
  -vf "fps=25,scale=-2:1080" \
  -c:v libx264 \
  -preset medium \
  -crf 28 \
  -c:a aac \
  -b:a 96k \
  -movflags +faststart \
  -pix_fmt yuv420p \
  "$output_path"

ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=nw=1 "$output_path"
