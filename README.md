# Portfolio — Yannik Ackermann

Statische Portfolio-Website (HTML, CSS, JavaScript) mit einem AI-Chatbot.
Kein Build-Schritt nötig — gehostet auf Vercel.

## Struktur

- `index.html` — Startseite (Deutsch)
- `en.html` — Englische Version
- `style.css` — Styles
- `script.js` — Animationen (GSAP, ScrollTrigger, Lenis)
- `chat.js` — Chat-Widget im Frontend
- `assets/` — Bilder, Icons, Favicon
- `api/chat.js` — Vercel Edge Function, spricht mit der Gemini-API
- `api/profile.js` — Wissensbasis des Chatbots (hier Inhalte pflegen)
- `dev-server.mjs` — lokaler Server inkl. API, damit der Chat lokal testbar ist

## Lokal laufen lassen

### Mit Chat (empfohlen)

Der Chat braucht einen Gemini-API-Key. Der lokale Server führt dieselbe
Function aus, die auf Vercel läuft.

1. Key holen auf https://aistudio.google.com/apikey
2. `.env` anlegen (Vorlage: `.env.example`):
   ```
   GEMINI_API_KEY=dein-key
   ```
3. Server starten:
   ```bash
   node dev-server.mjs
   ```
4. Öffnen: http://localhost:8124

`.env` steht in `.gitignore` und landet nie im Repo.

### Ohne Chat

Reicht, wenn nur Layout und Animationen interessieren:

```bash
python3 -m http.server 8123
```

## Chatbot

Fragen der Besucher gehen an `/api/chat`. Die Function hängt das Profil aus
`api/profile.js` als System-Prompt an und streamt Geminis Antwort zurück.
Der API-Key bleibt serverseitig.

**Inhalte ändern:** nur `api/profile.js` anpassen — dort stehen alle Fakten,
die der Bot kennt, plus die System-Prompts für Deutsch und Englisch.

**Modell wechseln:** `GEMINI_MODEL` in der `.env` bzw. in den Vercel-Umgebungs-
variablen setzen. Welche Modelle der Key unterstützt, zeigt:

```bash
node api/list-models.mjs
```

Fällt das primäre Modell wegen Überlastung aus, probiert die Function
automatisch ein zweites.

**Tests:**

```bash
node api/chat.test.mjs
```

## Deployment

Vercel deployt automatisch bei jedem Push. In den Projekteinstellungen muss
`GEMINI_API_KEY` als Environment Variable hinterlegt sein — für *Production*
und *Preview*, sonst funktioniert der Chat in Branch-Previews nicht.
