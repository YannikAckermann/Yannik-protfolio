#!/usr/bin/env bash
# Sucht ein helles, gut belichtetes Einzelbild als Video-Vorschau.
set -eu
cd "$(dirname "$0")/.." || exit 1
SRC=$(ls assets/copy_*.MOV assets/copy_*.mov 2>/dev/null | head -1)

echo "Sekunde  mittlere Helligkeit (0-255)"
for t in 2 5 8 11 14 17 20 25 30 35; do
  b=$(ffmpeg -v error -ss "$t" -i "$SRC" -vframes 1 \
        -vf "crop=1080:1400:0:430,scale=80:-1,format=gray" -f rawvideo - 2>/dev/null \
      | python3 -c "import sys; d=sys.stdin.buffer.read(); print(round(sum(d)/len(d)) if d else 0)")
  printf '%5s    %s\n' "$t" "$b"
done
