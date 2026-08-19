#!/usr/bin/env bash
# Testet Ausschnitte des Vorstellungsvideos an mehreren Stellen,
# damit auch die laengsten eingebrannten Untertitel vollstaendig passen.
set -eu
cd "$(dirname "$0")/.." || exit 1
V=$(ls assets/copy_*.MOV assets/copy_*.mov 2>/dev/null | head -1)
[ -n "$V" ] || { echo "Kein Video gefunden"; exit 1; }

# Ausgangsbild 1080x1920. crop=BREITE:HOEHE:X:Y
for t in 8 25 40 52; do
  ffmpeg -y -v error -ss "$t" -i "$V" -vframes 1 \
    -vf "crop=1080:1400:0:430,scale=340:-1" "crop_t${t}.jpg"
done
echo "Ausschnitt 1080x1400 ab y=430 an vier Stellen (8s, 25s, 40s, 52s):"
ls -la crop_t*.jpg
