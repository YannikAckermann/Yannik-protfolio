#!/usr/bin/env bash
# Komprimiert das Vorstellungsvideo fuer die Website.
# Quelle: 1080x1920 HEVC, 82 MB. Ziel: ~4 MB, Gesicht und eingebrannte
# Untertitel vollstaendig im Bild, ohne die leere Deckenflaeche darueber.
set -eu
cd "$(dirname "$0")/.." || exit 1

SRC=$(ls assets/copy_*.MOV assets/copy_*.mov 2>/dev/null | head -1)
[ -n "$SRC" ] || { echo "Quellvideo nicht gefunden"; exit 1; }

CROP="crop=1080:1400:0:430"      # Gesicht + Untertitel, Decke weg
SCALE="scale=720:-2"             # 720x933, reicht fuer die Darstellungsgroesse
START=10.2                       # Titelkarte am Anfang ueberspringen
                                 # (auf 0 setzen, um sie zu behalten)

echo "Quelle: $SRC ($(du -h "$SRC" | cut -f1)), Start bei ${START}s"

echo "-> MP4 (H.264, universell)"
ffmpeg -y -v error -ss "$START" -i "$SRC" \
  -vf "${CROP},${SCALE}" \
  -c:v libx264 -profile:v high -crf 27 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 96k -ac 1 \
  -movflags +faststart \
  assets/intro.mp4

echo "-> Standbild (Vorschau, Graustufen wie die uebrigen Bilder)"
ffmpeg -y -v error -ss 12 -i "$SRC" -vframes 1 \
  -vf "${CROP},${SCALE},format=gray" \
  -q:v 4 /tmp/poster.jpg
python3 -c "
from PIL import Image
im = Image.open('/tmp/poster.jpg').convert('RGB')
im.save('assets/intro-poster.webp', 'WEBP', quality=80, method=6)
print('  intro-poster.webp', im.size)
"

echo
echo "=== Ergebnis ==="
ls -la assets/intro.* | awk '{printf "  %8.1f KB  %s\n", $5/1024, $9}'
