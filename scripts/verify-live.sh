#!/usr/bin/env bash
# Prueft, ob die letzten Aenderungen auf der Live-Seite angekommen sind.
set -u
BASE="https://www.yannikackermann.ch"
TMP=$(mktemp)
curl -s --max-time 25 "$BASE/" -o "$TMP"

echo "Google Fonts entfernt (soll 0): $(grep -c 'fonts.googleapis.com' "$TMP")"
echo "Lokale Schriften  (soll 1):     $(grep -c 'assets/fonts/fonts.css' "$TMP")"
echo "Hero mit srcset   (soll 1):     $(grep -c 'Yannik-lookingup-700.webp' "$TMP")"
echo "Skripte mit defer:              $(grep -oE '<script defer' "$TMP" | wc -l)"
echo "Kontrastwert #68645C in CSS:    $(curl -s --max-time 20 "$BASE/style.css" | grep -c '68645C')"
echo
echo "fonts.css:        $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/assets/fonts/fonts.css")"
echo "Hero klein:       $(curl -s -o /dev/null -w '%{http_code}, %{size_download} B' --max-time 20 "$BASE/assets/Yannik-lookingup-700.webp")"
echo "Geloeschtes Bild (soll 404): $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/assets/skyline.jpg")"
rm -f "$TMP"
