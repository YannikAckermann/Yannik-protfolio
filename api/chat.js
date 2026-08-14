import { SYSTEM_DE, SYSTEM_EN } from "./profile.js";

export const config = { runtime: "edge" };

const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY = 8;          // letzte N Nachrichten, hält den Prompt klein
const RATE_LIMIT = 15;          // Anfragen pro IP
const RATE_WINDOW_MS = 60_000;

// Best-effort-Bremse gegen Missbrauch. Edge-Instanzen sind kurzlebig und nicht
// geteilt, das hier ersetzt also kein echtes Rate-Limiting — es deckelt nur
// offensichtliches Hämmern aus einer einzelnen Session ab.
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

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

  let upstream;
  try {
    upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: lang === "en" ? SYSTEM_EN : SYSTEM_DE }] },
        generationConfig: { maxOutputTokens: 400, temperature: 0.6 },
        safetySettings: []
      })
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    return json({ error: "upstream_error", status: upstream.status }, 502);
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
