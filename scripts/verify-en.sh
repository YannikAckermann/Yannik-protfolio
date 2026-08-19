#!/usr/bin/env bash
# Prueft, ob die englische Fassung live mit der deutschen uebereinstimmt.
set -u
BASE="https://www.yannikackermann.ch"
DE=$(mktemp)
EN=$(mktemp)
curl -s --max-time 25 "$BASE/" -o "$DE"
curl -s --max-time 25 "$BASE/en.html" -o "$EN"

echo "                         DE   EN"
printf 'Kennzahlen-Block:        %-4s %s\n' "$(grep -c 'manifest-facts' "$DE")" "$(grep -c 'manifest-facts' "$EN")"
printf 'Kubernetes im Marquee:   %-4s %s\n' "$(grep -c 'Kubernetes' "$DE")" "$(grep -c 'Kubernetes' "$EN")"
printf 'Lokale Schriften:        %-4s %s\n' "$(grep -c 'assets/fonts/fonts.css' "$DE")" "$(grep -c 'assets/fonts/fonts.css' "$EN")"
printf 'Hero mit srcset:         %-4s %s\n' "$(grep -c 'Yannik-lookingup-700' "$DE")" "$(grep -c 'Yannik-lookingup-700' "$EN")"
printf 'Projekt-Panels:          %-4s %s\n' "$(grep -c 'panel-title' "$DE")" "$(grep -c 'panel-title' "$EN")"
printf 'Lebenslauf-Knopf:        %-4s %s\n' "$(grep -c 'contact-cv' "$DE")" "$(grep -c 'contact-cv' "$EN")"

echo
echo "Hero DE: $(grep -A2 'hero-left-text' "$DE" | tail -2 | tr '\n' ' ' | sed 's/  */ /g')"
echo "Hero EN: $(grep -A2 'hero-left-text' "$EN" | tail -2 | tr '\n' ' ' | sed 's/  */ /g')"

rm -f "$DE" "$EN"
