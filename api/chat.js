import { SYSTEM_DE, SYSTEM_EN } from "./profile.js";

export const config = { runtime: "edge" };

// Modelle per Env überschreibbar — welche der Key kann, zeigt api/list-models.mjs.
// Gemini liefert bei Lastspitzen 503; dann wird der Reihe nach das nächste
// Modell probiert, statt dem Besucher einen Fehler zu zeigen.
const MODELS = [
  ...new Set([process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-3-flash-preview"])
];

const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

// Status, bei denen sich ein weiterer Versuch lohnt (Überlastung, Rate-Limit, Serverfehler)
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

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

  const body = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: lang === "en" ? SYSTEM_EN : SYSTEM_DE }] },
    // thinkingBudget 0: neuere Flash-Modelle verbrauchen sonst einen Teil des
    // Token-Budgets fürs interne Denken und die Antwort bricht mittendrin ab.
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.6,
      thinkingConfig: { thinkingBudget: 0 }
    },
    safetySettings: []
  });

  let upstream = null;
  let lastStatus = 0;
  let lastDetail = "";
  let usedModel = MODELS[0];

  for (const model of MODELS) {
    let res;
    try {
      res = await fetch(endpointFor(model), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body
      });
    } catch (err) {
      lastStatus = 0;
      lastDetail = String(err?.message || err);
      continue;
    }

    if (res.ok && res.body) {
      upstream = res;
      usedModel = model;
      break;
    }

    lastStatus = res.status;
    try {
      lastDetail = (await res.text()).slice(0, 300);
    } catch {
      lastDetail = "";
    }
    console.error(`Gemini-Fehler ${res.status} (Modell: ${model}): ${lastDetail}`);

    // Bei dauerhaften Fehlern (z. B. 403 ungültiger Key) bringt ein anderes
    // Modell nichts — dann sofort abbrechen.
    if (!RETRYABLE.has(res.status) && res.status !== 404) break;
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
