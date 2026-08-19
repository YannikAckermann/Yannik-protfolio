#!/usr/bin/env bash
# Entfernt Dateien aus assets/, die in keiner Quelldatei mehr referenziert werden.
set -eu
cd "$(dirname "$0")/.." || exit 1

removed=0
freed=0
for f in assets/*; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  if ! grep -qF -- "$name" index.html en.html style.css chat.js script.js assets/fonts/fonts.css 2>/dev/null; then
    size=$(stat -c%s "$f")
    git rm -q --ignore-unmatch "$f" 2>/dev/null || rm -f "$f"
    [ -f "$f" ] && rm -f "$f"
    removed=$((removed + 1))
    freed=$((freed + size))
    echo "  entfernt: $name"
  fi
done

echo "Dateien entfernt: $removed ($((freed / 1024 / 1024)) MB)"
du -sh assets/
