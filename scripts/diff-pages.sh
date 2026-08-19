#!/usr/bin/env bash
# Vergleicht die Struktur von index.html und en.html (Tags ohne Textinhalt),
# damit inhaltliche Abweichungen zwischen den Sprachfassungen auffallen.
set -u
cd "$(dirname "$0")/.." || exit 1

skel() {
  # Nur Tags mit Klassen/IDs behalten — das ist die Struktur
  grep -oE '<(section|div|article|figure|p|h[1-6]|ul|li|a|img|span|button|form|input)[^>]*class="[^"]*"' "$1" \
    | sed -E 's/.*class="([^"]*)".*/\1/' \
    | sed -E 's/ data-[a-z]+//g'
}

diff <(skel index.html) <(skel en.html) > /tmp/skel.diff && echo "Struktur identisch." || {
  echo "=== Strukturunterschiede (< nur DE, > nur EN) ==="
  cat /tmp/skel.diff
}

echo
echo "=== Marquee-Eintraege ==="
echo "DE: $(grep -A2 'marquee-track' index.html | grep -oE '<span>[^<]+' | head -12 | tr '\n' ' ')"
echo "EN: $(grep -A2 'marquee-track' en.html | grep -oE '<span>[^<]+' | head -12 | tr '\n' ' ')"

echo
echo "=== alt-Texte Hero ==="
grep -oE 'alt="[^"]*"' index.html | head -3 | sed 's/^/DE: /'
grep -oE 'alt="[^"]*"' en.html | head -3 | sed 's/^/EN: /'
