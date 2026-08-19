#!/usr/bin/env bash
# Listet Dateien in assets/, die in keiner Quelldatei referenziert werden.
set -u
cd "$(dirname "$0")/.." || exit 1

echo "Ungenutzte Dateien in assets/:"
found=0
for f in assets/*; do
  name=$(basename "$f")
  if ! grep -qF -- "$name" index.html en.html style.css chat.js script.js 2>/dev/null; then
    size=$(stat -c%s "$f")
    printf '  %8d B  %s\n' "$size" "$name"
    found=$((found + 1))
  fi
done
[ "$found" -eq 0 ] && echo "  (keine)"
