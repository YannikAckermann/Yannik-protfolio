#!/usr/bin/env bash
# Statische Pruefung von Barrierefreiheit und SEO auf der Live-Seite.
set -u
F=/tmp/psi/index.html
[ -f "$F" ] || curl -s --max-time 20 https://www.yannikackermann.ch/ -o "$F"

echo "=== Barrierefreiheit ==="
echo "Bilder gesamt:        $(grep -oE '<img[^>]*>' "$F" | wc -l)"
echo "davon ohne alt:       $(grep -oE '<img[^>]*>' "$F" | grep -vc 'alt=')"
echo "Buttons gesamt:       $(grep -oE '<button[^>]*>' "$F" | wc -l)"
echo "davon ohne aria-label:$(grep -oE '<button[^>]*>' "$F" | grep -vc 'aria-label')"
echo "html lang:            $(grep -oE '<html lang="[a-z]+"' "$F")"
echo "Ueberschriften:"
grep -oE '<h[1-6]' "$F" | sort | uniq -c | sed 's/^/  /'
echo "Eingabefelder ohne Label/aria: $(grep -oE '<input[^>]*>' "$F" | grep -vc -e 'aria-label' -e 'id=')"

echo
echo "=== SEO ==="
grep -oE '<title>[^<]*' "$F" | sed 's/<title>/title:       /'
echo "description: $(grep -c 'name="description"' "$F")"
echo "canonical:   $(grep -c 'rel="canonical"' "$F")"
echo "hreflang:    $(grep -c 'hreflang' "$F")"
echo "og:image:    $(grep -c 'og:image' "$F")"
echo "viewport:    $(grep -c 'name="viewport"' "$F")"
