import { SYSTEM_DE, SYSTEM_EN } from "./profile.js";

export const config = { runtime: "edge" };

// Modelle per Env überschreibbar — welche der Key kann, zeigt api/list-models.mjs.
// Gemini liefert bei Lastspitzen 503; dann wird der Reihe nach das nächste
// Modell probiert, statt dem Besucher einen Fehler zu zeigen.
//
// Wichtig fürs Kontingent: das Gratis-Limit ist
//   GenerateRequestsPerDayPerProjectPerModel-FreeTier = 20
// also 20 Anfragen pro Tag *und Modell*. Mit zwei Modellen war die Seite nach
// rund 40 Anfragen für den Rest des Tages tot. Jeder weitere Name in dieser
// Liste bringt eigene 20 dazu — deshalb mehrere Generationen statt nur der
// neuesten. Bewusst ausgeschrieben und ohne "-latest"-Aliasse: die zeigen auf
// eines der Modelle unten und teilen sich dann dasselbe Kontingent.
const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const MODELS = [
  ...new Set([process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))
];

/* ---------- Kurzzeit-Sperre fuer lahme Modelle ----------
   Ein haengendes Modell kostet pro Anfrage den vollen Timeout. Ohne Gedaechtnis
   zahlt das jeder Besucher erneut — gemessen 14-16s, weil gleich zwei Modelle
   nacheinander ins Leere liefen. Wer erschoepft (429) oder haengt, wird deshalb
   kurz uebersprungen. Bewusst nur im Arbeitsspeicher der Edge-Instanz: das
   reicht, weil eine Instanz mehrere Anfragen hintereinander bedient, und es
   kostet keinen KV-Aufruf. Die Sperre ist kurz, damit ein erholtes Modell
   schnell wieder drankommt. */
const SPERRE_MS = Number(process.env.CHAT_MODEL_COOLDOWN_MS || 90_000);
const gesperrt = new Map();

const istGesperrt = (model) => (gesperrt.get(model) || 0) > Date.now();
const sperren = (model) => gesperrt.set(model, Date.now() + SPERRE_MS);

// Reihenfolge fuer diesen Aufruf: erst die freien Modelle, gesperrte hinten
// dran — nie ganz weglassen, sonst steht die Seite, wenn alle gesperrt sind.
function modellReihenfolge() {
  const frei = MODELS.filter((m) => !istGesperrt(m));
  const rest = MODELS.filter((m) => istGesperrt(m));
  return [...frei, ...rest];
}

// Ein überlastetes/hängendes Modell soll nicht die ganze Anfrage blockieren:
// nach diesem Timeout wird der Versuch abgebrochen und das nächste Modell probiert.
const MODEL_TIMEOUT_MS = Number(process.env.CHAT_MODEL_TIMEOUT_MS || 6000);

const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

// Status, bei denen sich ein weiterer Versuch lohnt (Überlastung, Rate-Limit, Serverfehler).
// 400 gehoert dazu, obwohl es sonst ein dauerhafter Fehler waere: die Generationen
// unterstuetzen unterschiedliche Felder im Request (gemini-3.6-flash lehnt z. B.
// thinkingConfig mit "invalid argument" ab). Ohne diese Ausnahme legt ein einziges
// inkompatibles Modell die ganze Fallback-Kette lahm.
const RETRYABLE = new Set([400, 429, 500, 502, 503, 504]);

const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY = 8;          // letzte N Nachrichten, hält den Prompt klein

// Limits (per Env anpassbar, ohne Code-Änderung)
const PER_IP_PER_MIN = Number(process.env.CHAT_PER_IP_PER_MIN || 8);
const PER_IP_PER_DAY = Number(process.env.CHAT_PER_IP_PER_DAY || 40);
const GLOBAL_PER_DAY = Number(process.env.CHAT_GLOBAL_PER_DAY || 500);

// Nur Anfragen von der eigenen Seite zulassen. Kommagetrennt erweiterbar;
// Vercel-Preview-Domains werden automatisch mit akzeptiert.
const ALLOWED_HOSTS = (process.env.CHAT_ALLOWED_HOSTS || "yannikackermann.ch")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function originAllowed(req) {
  const raw = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!raw) return false;                     // direkte Skript-Aufrufe abweisen
  let host;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
}

/* ---------- Zähler ----------
   Mit Vercel KV / Upstash (KV_REST_API_URL + KV_REST_API_TOKEN) sind die Zähler
   dauerhaft und instanzübergreifend — das ist der wirksame Schutz. Ohne KV bleibt
   nur ein Zähler im Arbeitsspeicher: Edge-Instanzen sind kurzlebig und werden
   nicht geteilt, das bremst also lediglich offensichtliches Hämmern. */
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const memory = new Map();

function memoryCount(bucket, windowMs) {
  const now = Date.now();
  const entry = memory.get(bucket);
  if (!entry || now - entry.start > windowMs) {
    memory.set(bucket, { start: now, count: 1 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// Zählt hoch und gibt den neuen Stand zurück (KV: INCR + EXPIRE beim ersten Mal)
async function bump(bucket, windowSec) {
  if (!kvEnabled) return memoryCount(bucket, windowSec * 1000);
  try {
    const res = await fetch(`${KV_URL}/incr/${encodeURIComponent(bucket)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const data = await res.json();
    const count = Number(data?.result ?? 0);
    if (count === 1) {
      await fetch(`${KV_URL}/expire/${encodeURIComponent(bucket)}/${windowSec}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
    }
    return count;
  } catch {
    // KV nicht erreichbar: lieber durchlassen als den Chat lahmlegen
    return memoryCount(bucket, windowSec * 1000);
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// Gibt den Grund zurück, falls abgelehnt werden soll — sonst null
async function overLimit(ip) {
  const day = today();
  const [perMin, perDay, global] = await Promise.all([
    bump(`chat:min:${day}:${new Date().getUTCHours()}:${new Date().getUTCMinutes()}:${ip}`, 60),
    bump(`chat:day:${day}:${ip}`, 86_400),
    bump(`chat:global:${day}`, 86_400)
  ]);
  if (global > GLOBAL_PER_DAY) return "global";
  if (perDay > PER_IP_PER_DAY) return "day";
  if (perMin > PER_IP_PER_MIN) return "minute";
  return null;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extraHeaders || {}) }
  });
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  // Fremde Skripte draussen halten — der Chat ist nur für die eigene Seite da
  if (!originAllowed(req)) return json({ error: "forbidden_origin" }, 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await overLimit(ip);
  if (limit) {
    // Retry-After hilft dem Client, sinnvoll zu warten
    const retry = limit === "minute" ? "60" : "3600";
    return json({ error: "rate_limited", scope: limit }, 429, { "retry-after": retry });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const message = String(payload?.message ?? "").trim();
  if (!message) return json({ error: "empty_message" }, 400);
  if (message.length > MAX_MESSAGE_LEN) return json({ error: "message_too_long" }, 413);

  const lang = payload?.lang === "en" ? "en" : "de";

  // Verlauf aus dem Client übernehmen, aber strikt validieren und kürzen
  const history = Array.isArray(payload?.history) ? payload.history : [];
  const contents = history
    .filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, parts: [{ text: m.text.slice(0, MAX_MESSAGE_LEN) }] }));

  contents.push({ role: "user", parts: [{ text: message }] });

  const basis = {
    contents,
    systemInstruction: { parts: [{ text: lang === "en" ? SYSTEM_EN : SYSTEM_DE }] },
    generationConfig: { maxOutputTokens: 600, temperature: 0.6 },
    safetySettings: []
  };

  // thinkingBudget 0: neuere Flash-Modelle verbrauchen sonst einen Teil des
  // Token-Budgets fürs interne Denken und die Antwort bricht mittendrin ab.
  const body = JSON.stringify({
    ...basis,
    generationConfig: { ...basis.generationConfig, thinkingConfig: { thinkingBudget: 0 } }
  });

  // Nicht jede Generation kennt thinkingConfig — gemini-3.6-flash lehnt den
  // Request damit mit 400 ab. Fuer diesen Fall dieselbe Anfrage ohne das Feld.
  const bodyOhneThinking = JSON.stringify(basis);

  let upstream = null;
  let lastStatus = 0;
  let lastDetail = "";
  let usedModel = MODELS[0];

  // Gesamtbudget: bei sieben Modellen koennte die Schleife sonst im
  // schlimmsten Fall 7 x Timeout dauern und der Besucher wartet ewig.
  // Ausgeschoepfte Modelle antworten mit 429 in Sekundenbruchteilen, teuer
  // sind nur haengende — die deckelt dieses Budget.
  const budgetEnde = Date.now() + MODEL_TIMEOUT_MS * 3;

  for (const model of modellReihenfolge()) {
    if (upstream === null && Date.now() > budgetEnde) {
      lastDetail = lastDetail || "Zeitbudget fuer Modellwechsel aufgebraucht";
      break;
    }
    // Erst mit thinkingConfig; lehnt das Modell den Request mit 400 ab,
    // dasselbe Modell noch einmal ohne dieses Feld probieren.
    for (const versuchsBody of [body, bodyOhneThinking]) {
      let res;
      // Bricht den Versuch ab, wenn bis zum Timeout kein Antwort-Header (also kein
      // Stream-Start) kommt — dann fällt die Schleife auf das nächste Modell zurück.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
      try {
        res = await fetch(endpointFor(model), {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: versuchsBody,
          signal: controller.signal
        });
      } catch (err) {
        lastStatus = 0;
        lastDetail = controller.signal.aborted ? `timeout nach ${MODEL_TIMEOUT_MS}ms` : String(err?.message || err);
        // Timeouts blieben bisher stumm — im Log war dann nicht zu sehen, welches
        // Modell haengt und wie viel Zeit dabei verloren geht.
        console.error(`Gemini-Abbruch (Modell: ${model}): ${lastDetail}`);
        sperren(model);
        break;
      } finally {
        clearTimeout(timer);
      }

      if (res.ok && res.body) {
        upstream = res;
        usedModel = model;
        break;
      }

      lastStatus = res.status;
      try {
        // 300 Zeichen schnitten die Meldung genau vor der Angabe ab, *welches*
        // Kontingent erschoepft ist — damit war ein 429 nicht zu deuten.
        lastDetail = (await res.text()).slice(0, 900);
      } catch {
        lastDetail = "";
      }
      console.error(`Gemini-Fehler ${res.status} (Modell: ${model}): ${lastDetail}`);

      // Erschoepft (429), ueberlastet (503) oder ganz weg (404): fuer die
      // naechsten Anfragen hinten anstellen, statt jedes Mal neu anzuklopfen.
      if (res.status === 429 || res.status === 503 || res.status === 404) sperren(model);

      // Nur ein 400 rechtfertigt den zweiten Anlauf ohne thinkingConfig.
      if (res.status !== 400 || versuchsBody === bodyOhneThinking) break;
    }

    if (upstream) break;

    // Bei dauerhaften Fehlern (z. B. 403 ungültiger Key) bringt ein anderes
    // Modell nichts — dann sofort abbrechen.
    if (lastStatus && !RETRYABLE.has(lastStatus) && lastStatus !== 404) break;
  }

  if (!upstream) {
    if (lastStatus === 0) return json({ error: "upstream_unreachable", detail: lastDetail }, 502);
    // Googles Meldung durchreichen — sonst ist ein 404 (Modell weg) nicht von
    // einem 403 (Key ungültig) zu unterscheiden. Enthält keine Secrets.
    return json(
      { error: "upstream_error", status: lastStatus, models: MODELS, detail: lastDetail },
      lastStatus === 503 ? 503 : 502
    );
  }

  // Geminis SSE-Stream in reinen Text umwandeln, damit der Client nur noch
  // Zeichen anhängen muss.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";       // letzte, evtl. unvollständige Zeile behalten

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // unvollständiges JSON-Fragment überspringen
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
