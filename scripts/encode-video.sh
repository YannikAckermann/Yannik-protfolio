#!/usr/bin/env bash
# Bereitet ein Video fuer die Website auf: auf 1280px Breite bringen, Tonspur
# entfernen und als MP4 (H.264) speichern, dazu ein Standbild als Poster.
# Das Original bleibt unangetastet.
#
# WebM (VP9) wurde getestet und wieder verworfen: bei diesem Material war die
# WebM-Datei mit 756 KB groesser als das MP4 mit 520 KB, und H.264 laeuft
# ohnehin ueberall. Eine zweite Quelle waere also nur Ballast.
#
# Ton fliegt raus, weil das Video auf der Seite stumm in einer Schleife laeuft —
# Browser spielen nicht-stummes Video ohnehin nicht von selbst ab.
#
#   bash scripts/encode-video.sh <quelle.mp4> <zielname-ohne-endung>
#
# Beispiel:
#   bash scripts/encode-video.sh brag-raw.mp4 swissscam-demo
#   -> assets/swissscam-demo.mp4 und -poster.webp
set -euo pipefail

cd "$(dirname "$0")/.."

QUELLE=${1:?Quelle fehlt}
NAME=${2:?Zielname fehlt}
BREITE=${BREITE:-1280}
POSTER_SEK=${POSTER_SEK:-1}

[ -f "$QUELLE" ] || { echo "Quelle nicht gefunden: $QUELLE" >&2; exit 1; }

skaliere="scale=${BREITE}:-2:flags=lanczos"

echo "MP4 (H.264)…"
ffmpeg -v error -y -i "$QUELLE" -an \
  -vf "$skaliere" -c:v libx264 -profile:v high -crf 30 -preset slow \
  -movflags +faststart -pix_fmt yuv420p \
  "assets/${NAME}.mp4"


echo "Poster…"
ffmpeg -v error -y -ss "$POSTER_SEK" -i "$QUELLE" -frames:v 1 \
  -vf "$skaliere" -q:v 80 "assets/${NAME}-poster.webp"

echo
for f in "assets/${NAME}.mp4" "assets/${NAME}-poster.webp"; do
  printf '  %7.0f KB  %s\n' "$(du -k "$f" | cut -f1)" "$f"
done
