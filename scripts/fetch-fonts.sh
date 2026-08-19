#!/usr/bin/env bash
# Laedt die benoetigten Schriften als woff2 herunter und schreibt eine lokale
# @font-face-Datei. So entfaellt der Umweg ueber fonts.googleapis.com, der den
# ersten Seitenaufbau blockiert.
set -eu
cd "$(dirname "$0")/../assets/fonts"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
URL="https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=DM+Sans:ital,wght@0,300..700;1,400&family=EB+Garamond:ital,wght@0,400..500;1,400..500&display=swap"

curl -s -H "User-Agent: $UA" "$URL" -o remote.css

count=$(grep -c 'woff2' remote.css || true)
echo "woff2-Verweise gefunden: $count"
[ "$count" -eq 0 ] && { echo "FEHLER: Google liefert kein woff2"; exit 1; }

# Jede Schriftdatei holen und den Verweis auf den lokalen Pfad umbiegen
cp remote.css local.css
i=0
for url in $(grep -oE 'https://fonts\.gstatic\.com/[^)]+\.woff2' remote.css | sort -u); do
  name=$(basename "$url")
  curl -s "$url" -o "$name"
  # In der CSS-Datei absolute URL durch Dateinamen ersetzen
  sed -i "s|$url|$name|g" local.css
  i=$((i + 1))
done

echo "Dateien geladen: $i"
du -ch ./*.woff2 2>/dev/null | tail -1
