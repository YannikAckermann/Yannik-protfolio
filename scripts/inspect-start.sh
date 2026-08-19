#!/usr/bin/env bash
# Schaut sich den dunklen Anfang des Videos an.
set -eu
cd "$(dirname "$0")/.." || exit 1
SRC=$(ls assets/copy_*.MOV assets/copy_*.mov 2>/dev/null | head -1)

ffmpeg -y -v error -ss 5 -i "$SRC" -vframes 1 -vf "scale=300:-1,eq=brightness=0.45" start_5_aufgehellt.jpg
ffmpeg -y -v error -ss 9.5 -i "$SRC" -vframes 1 -vf "scale=300:-1" start_95.jpg
ffmpeg -y -v error -ss 11 -i "$SRC" -vframes 1 -vf "crop=1080:1400:0:430,scale=300:-1" start_11.jpg
ls -la start_*.jpg
