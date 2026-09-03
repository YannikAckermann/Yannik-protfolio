#!/usr/bin/env python3
"""
Erzeugt ASCII-Art aus einem Bild und legt sie als Textdatei ab.

Der Text kommt danach in ein <pre> in die Seite — kein Bild, also gestochen
scharf bei jeder Zoomstufe und ein paar Kilobyte statt ein paar hundert.

    python3 scripts/build-ascii.py
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# Von dunkel nach hell. Bewusst schmal gehalten: zu viele Stufen wirken
# unruhig, sobald die Schrift klein wird.
RAMPE = "@%#*+=-:. "

# Zeichen sind etwa doppelt so hoch wie breit — sonst wird das Bild gestaucht.
ZEICHEN_VERHAELTNIS = 0.48


def zu_ascii(bild: Image.Image, breite: int) -> str:
    hoehe = max(1, round(bild.height * breite / bild.width * ZEICHEN_VERHAELTNIS))
    grau = ImageOps.autocontrast(bild.convert("L").resize((breite, hoehe), Image.LANCZOS))

    zeilen = []
    px = grau.load()
    for y in range(hoehe):
        zeile = []
        for x in range(breite):
            # 0 = schwarz -> dichtestes Zeichen
            zeile.append(RAMPE[px[x, y] * (len(RAMPE) - 1) // 255])
        zeilen.append("".join(zeile).rstrip())
    return "\n".join(zeilen)


def main() -> None:
    quelle = ASSETS / "Yannik-lookingup.webp"
    if not quelle.exists():
        raise SystemExit(f"Quelle fehlt: {quelle}")

    bild = Image.open(quelle)
    # Freigestelltes PNG/WebP: Transparenz auf Weiss legen, sonst wird der
    # ganze Hintergrund schwarz und die Figur verschwindet darin.
    if bild.mode in ("RGBA", "LA"):
        grund = Image.new("RGB", bild.size, (255, 255, 255))
        grund.paste(bild, mask=bild.split()[-1])
        bild = grund

    # Nur Kopf und Schultern. Der Oberkoerper ist gleichmaessig dunkel und
    # wuerde als massiver Block aus lauter "@" enden — kein Bild, nur Flaeche.
    b, h = bild.size
    bild = bild.crop((0, 0, b, round(h * 0.42)))
    # Nach dem Zuschnitt neu auf den Tonwertumfang ziehen, sonst bleibt der
    # weisse Hintergrund der Bezugspunkt und die Figur wird zu flau.
    bild = ImageOps.autocontrast(bild.convert("L"), cutoff=2)

    for breite, name in ((86, "ascii-portrait.txt"),):
        text = zu_ascii(bild, breite)
        ziel = ASSETS / name
        ziel.write_text(text + "\n", encoding="utf-8")
        zeilen = text.count("\n") + 1
        print(f"  {name}: {breite}x{zeilen} Zeichen, {len(text) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
