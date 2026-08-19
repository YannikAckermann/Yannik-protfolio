#!/usr/bin/env bash
# Prueft, ob alle in HTML/CSS referenzierten lokalen Dateien existieren.
set -u
cd "$(dirname "$0")/.." || exit 1

missing=0
for src in index.html en.html style.css assets/fonts/fonts.css; do
  refs=$(grep -oE '(assets/[A-Za-z0-9._/-]+\.(webp|png|jpg|jpeg|pdf|ico|css|woff2))|([A-Za-z0-9_-]+\.woff2)' "$src" | sort -u)
  for r in $refs; do
    # woff2 ohne Pfad stammen aus fonts.css und liegen daneben
    case "$r" in
      *.woff2) [ -f "$r" ] || [ -f "assets/fonts/$r" ] || { echo "FEHLT ($src): $r"; missing=$((missing+1)); } ;;
      *) [ -f "$r" ] || { echo "FEHLT ($src): $r"; missing=$((missing+1)); } ;;
    esac
  done
done

if [ "$missing" -eq 0 ]; then
  echo "Alle referenzierten Dateien vorhanden."
else
  echo "$missing fehlende Datei(en)!"
  exit 1
fi
