#!/usr/bin/env python3
"""
Erzeugt das Platzhalter-PDF für den Lebenslauf-Knopf (assets/lebenslauf.pdf).
Bewusst ohne Zusatzpaket — ein PDF ist am Ende nur Text mit korrekten Offsets.
Ersetze die Datei einfach, sobald der echte Lebenslauf fertig ist.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "lebenslauf.pdf"

# (Schrift, Groesse, y-Position, Text)
LINES = [
    ("F1", 26, 780, "Lebenslauf"),
    ("F2", 12, 756, "Yannik Ackermann - Applikationsentwickler"),
    ("F3", 11, 730, "Platzhalter-Ausgabe. Der echte Lebenslauf folgt."),

    ("F1", 14, 686, "Status dieses Dokuments"),
    ("F2", 11, 664, "Dieses PDF ist ein Test. Es enthaelt exakt so viele echte"),
    ("F2", 11, 648, "Angaben wie ein frisch initialisiertes Git-Repository:"),
    ("F2", 11, 632, "naemlich keine."),

    ("F1", 14, 594, "Berufserfahrung"),
    ("F2", 11, 572, "2026 - heute   Hat es geschafft, dieses PDF zu erzeugen,"),
    ("F2", 11, 556, "               ohne eine einzige Bibliothek zu installieren."),
    ("F2", 11, 540, "               Referenzen auf Anfrage."),

    ("F1", 14, 502, "Sprachkenntnisse"),
    ("F2", 11, 480, "Deutsch     Muttersprache"),
    ("F2", 11, 464, "Englisch    Gut"),
    ("F2", 11, 448, "Go          Ruft zurueck. Immer. Auch nachts um drei."),
    ("F2", 11, 432, "CSS         Es ist kompliziert."),

    ("F1", 14, 394, "Bekannte Fehler"),
    ("F2", 11, 372, "- Der Inhalt fehlt (offen, Prioritaet: hoch)"),
    ("F2", 11, 356, "- Wurde trotzdem deployed (wontfix)"),

    ("F3", 10, 300, "Die echten Angaben stehen auf yannikackermann.ch -"),
    ("F3", 10, 286, "oder frag einfach den Chatbot dort, der weiss mehr als"),
    ("F3", 10, 272, "dieses Dokument."),

    ("F3", 9, 90, "Erzeugt von scripts/make-cv-placeholder.py"),
]


def esc(s: str) -> bytes:
    """PDF-Stringliteral: Klammern und Backslash maskieren, WinAnsi kodieren."""
    out = s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    return out.encode("cp1252", errors="replace")


content = b"BT\n"
for font, size, y, text in LINES:
    content += b"/%s %d Tf\n" % (font.encode(), size)
    # Hilfstext etwas heller setzen
    content += b"0.45 0.44 0.42 rg\n" if font == "F3" else b"0.09 0.08 0.07 rg\n"
    content += b"1 0 0 1 60 %d Tm\n" % y
    content += b"(" + esc(text) + b") Tj\n"
content += b"ET\n"

# Gelbe Linie unter dem Titel — Akzentfarbe der Website
content = (b"0.941 0.753 0.125 rg\n60 745 m 300 745 l 300 748 l 60 748 l f\n") + content

objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
    b"/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
    b"<< /Length %d >>\nstream\n" % len(content) + content + b"endstream",
]

pdf = b"%PDF-1.4\n"
offsets = []
for i, body in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf += b"%d 0 obj\n" % i + body + b"\nendobj\n"

xref_pos = len(pdf)
pdf += b"xref\n0 %d\n" % (len(objects) + 1)
pdf += b"0000000000 65535 f \n"
for off in offsets:
    pdf += b"%010d 00000 n \n" % off
pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
    len(objects) + 1,
    xref_pos,
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(pdf)
print(f"{OUT} geschrieben ({len(pdf)} Bytes)")
