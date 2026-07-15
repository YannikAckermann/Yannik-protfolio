# Portfolio — Yannik Ackermann

Eine statische Portfolio-Website (HTML, CSS, JavaScript) — kein Build-Schritt nötig.

## Struktur

- `index.html` — Startseite (Deutsch)
- `en.html` — Englische Version
- `style.css` — Styles
- `script.js` — JavaScript
- `assets/` — Bilder, Icons, Favicon

## Projekt lokal laufen lassen

### Option 1: Direkt im Browser öffnen
Die Datei `index.html` einfach per Doppelklick öffnen.

### Option 2: Lokaler Webserver (empfohlen)
Ein lokaler Server sorgt dafür, dass alle Pfade korrekt funktionieren.

**Mit Python:**
```bash
python3 -m http.server 8123
```
Dann im Browser öffnen: http://localhost:8123

**Mit Node.js:**
```bash
npx serve
```