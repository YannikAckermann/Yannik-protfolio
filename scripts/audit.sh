#!/usr/bin/env bash
# Misst Gewicht und Anzahl der Ressourcen der Live-Seite.
set -u
BASE="https://www.yannikackermann.ch"
DIR=/tmp/psi
rm -rf "$DIR"; mkdir -p "$DIR"; cd "$DIR" || exit 1

curl -s --max-time 20 "$BASE/" -o index.html

# Alle lokalen Ressourcen aus dem HTML sammeln
grep -oE '(assets/[A-Za-z0-9._()-]+\.(webp|png|jpg|jpeg|pdf|ico))|(style\.css)|(script\.js)|(chat\.js)' index.html \
  | sort -u > files.txt

while read -r f; do
  [ -z "$f" ] && continue
  out="$(echo "$f" | tr '/' '_')"
  curl -s --max-time 30 "$BASE/$f" -o "$out"
done < files.txt

echo "=== Ressourcen (Bytes) ==="
total=0
for f in *; do
  case "$f" in files.txt) continue;; esac
  size=$(stat -c%s "$f")
  total=$((total + size))
  printf '%9d  %s\n' "$size" "$f"
done | sort -rn

echo
echo "=== Summe lokal: $((total / 1024)) KB ==="
echo "Externe Skripte (CDN):"
grep -oE 'https://cdn[^"]+' index.html | sed 's/^/  /'
