#!/usr/bin/env bash
# Resize and compress a photo for the site.
# The long edge becomes 1600px at most. Smaller originals stay as they are.
# Metadata is stripped, including camera location.
#
# Usage:
#   ./scripts/process-photo.sh original.jpg src/images/projects/kitchen-before.jpg
#
# Then point the project in data/projects.json at images/projects/kitchen-before.jpg
# and rewrite the alt text so it describes the real photo.
#
# Requires ffmpeg.
# Output extension: .jpg, .jpeg, or .webp.

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 INPUT OUTPUT.jpg" >&2
  exit 1
fi

input=$1
output=$2

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. On Debian/Ubuntu: sudo apt-get install ffmpeg" >&2
  exit 1
fi

if [[ ! -f "$input" ]]; then
  echo "Input not found: $input" >&2
  exit 1
fi

mkdir -p "$(dirname "$output")"

ext=$(printf '%s' "${output##*.}" | tr '[:upper:]' '[:lower:]')
scale="scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))'"

case "$ext" in
  jpg|jpeg)
    ffmpeg -y -hide_banner -loglevel error -i "$input" -vf "$scale" -q:v 4 -map_metadata -1 "$output"
    ;;
  webp)
    ffmpeg -y -hide_banner -loglevel error -i "$input" -vf "$scale" -c:v libwebp -quality 78 -map_metadata -1 "$output"
    ;;
  *)
    echo "Output must end in .jpg, .jpeg, or .webp" >&2
    exit 1
    ;;
esac

echo "Wrote $output"
