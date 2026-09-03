#!/usr/bin/env python3
"""
Bereitet die Projekt-Screenshots fuer die Website auf: auf Web-Groesse
bringen und als WebP speichern. Die Originale bleiben unangetastet.

Hinweis: die PNG-Originale liegen nicht mehr im Repo — sie waren nur
Zwischenschritt und haben 1.5 MB belegt. Wer die WebP neu bauen will,
legt das PNG wieder unter assets/ ab; fehlende Dateien werden hier
uebersprungen. Aus der Git-Historie zurueckholen:
    git checkout cc53843 -- assets/<datei>.png
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BREITE = 1500

SHOTS = [
    ("simultanüberstzung_home.png", "shot-simultan.webp"),
    ("MCP-Gateway-home.png",        "shot-mcp-home.webp"),
    ("MCP-Gateway-gateway_config.png", "shot-mcp-config.webp"),
    ("MCP-Gateay-add-MCP-to-Gateway.png", "shot-mcp-add.webp"),
    ("Country-pred-Group-results.png",     "shot-cp-gruppen.webp"),
    ("Country-pred-RO32.png",              "shot-cp-ro32.webp"),
    ("Country-pred-Finals+Semi.png",       "shot-cp-finale.webp"),
    ("Country-pred-Switzerand-vs-Argentina.png", "shot-cp-schweiz.webp"),
]

for quelle, ziel in SHOTS:
    src = ASSETS / quelle
    if not src.exists():
        print(f"  fehlt: {quelle}")
        continue
    img = Image.open(src).convert("RGB")
    if img.width > BREITE:
        img = img.resize((BREITE, round(img.height * BREITE / img.width)), Image.LANCZOS)
    out = ASSETS / ziel
    img.save(out, "WEBP", quality=82, method=6)
    print(f"  {quelle[:34]:36} -> {ziel:24} {img.size[0]}x{img.size[1]}  "
          f"{src.stat().st_size // 1024:4} KB -> {out.stat().st_size // 1024:3} KB")
