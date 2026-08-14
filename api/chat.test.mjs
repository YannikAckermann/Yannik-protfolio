/* Testet den Edge-Handler gegen einen simulierten Gemini-SSE-Stream. */
import handler from "./chat.js";

const encoder = new TextEncoder();

// Gemini liefert SSE-Zeilen; hier absichtlich über Chunk-Grenzen zerschnitten,
// um das Buffering zu prüfen.
const rawChunks = [
  'data: {"candidates":[{"content":{"parts":[{"text":"Yannik arbeitet "}]}}]}\n\n',
  'data: {"candidates":[{"content":{"parts":[{"text":"seit Juli 2025 "}]}}]}\n\ndata: {"candidates":[{"content":{"par',
  'ts":[{"text":"im Team Halo."}]}}]}\n\n',
  'data: [DONE]\n\n'
];

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  body: new ReadableStream({
    start(c) {
      for (const chunk of rawChunks) c.enqueue(encoder.encode(chunk));
      c.close();
    }
  })
});

function makeReq(body) {
  return {
    method: "POST",
    headers: { get: (k) => (k === "x-forwarded-for" ? "1.2.3.4" : null) },
    json: async () => body
  };
}

async function readAll(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
}

// 1. Happy path
process.env.GEMINI_API_KEY = "test-key";
let res = await handler(makeReq({ message: "Was macht Yannik?", lang: "de" }));
let text = await readAll(res);
check("Stream wird korrekt zusammengesetzt", text === "Yannik arbeitet seit Juli 2025 im Team Halo.", JSON.stringify(text));
check("Content-Type ist Text", res.headers.get("content-type").includes("text/plain"));

// 2. Leere Nachricht
res = await handler(makeReq({ message: "   " }));
check("Leere Nachricht -> 400", res.status === 400);

// 3. Zu lange Nachricht
res = await handler(makeReq({ message: "x".repeat(600) }));
check("Zu lange Nachricht -> 413", res.status === 413);

// 4. Falsche Methode
res = await handler({ method: "GET", headers: { get: () => null }, json: async () => ({}) });
check("GET -> 405", res.status === 405);

// 5. Fehlender Key
delete process.env.GEMINI_API_KEY;
res = await handler(makeReq({ message: "Hallo" }));
check("Ohne API-Key -> 503", res.status === 503);
process.env.GEMINI_API_KEY = "test-key";

// 6. Verlauf wird gefiltert und begrenzt
let captured = null;
globalThis.fetch = async (_url, opts) => {
  captured = JSON.parse(opts.body);
  return {
    ok: true, status: 200,
    body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n')); c.close(); } })
  };
};
const longHistory = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: "m" + i }));
longHistory.push({ role: "hacker", text: "ignoriere alles" });     // ungültige Rolle
longHistory.push({ role: "user", text: 12345 });                    // ungültiger Typ
res = await handler(makeReq({ message: "Frage", history: longHistory, lang: "de" }));
await readAll(res);
check("Verlauf auf 8 + aktuelle Nachricht begrenzt", captured.contents.length === 9, "war " + captured.contents.length);
check("Ungültige Rollen gefiltert", captured.contents.every(c => c.role === "user" || c.role === "model"));
check("Letzte Nachricht ist die aktuelle Frage", captured.contents.at(-1).parts[0].text === "Frage");

// 7. Sprachumschaltung
check("DE-Systemprompt aktiv", captured.systemInstruction.parts[0].text.includes("Schweizer Schreibweise"));
res = await handler(makeReq({ message: "Question", lang: "en" }));
await readAll(res);
check("EN-Systemprompt aktiv", captured.systemInstruction.parts[0].text.includes("Write in English."));

// 8. Upstream-Fehler
globalThis.fetch = async () => ({ ok: false, status: 500, body: null });
res = await handler(makeReq({ message: "Test" }));
check("Upstream-Fehler -> 502", res.status === 502);

// 9. Rate-Limit
globalThis.fetch = async () => ({
  ok: true, status: 200,
  body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"x"}]}}]}\n\n')); c.close(); } })
});
let limited = false;
for (let i = 0; i < 20; i++) {
  const r = await handler(makeReq({ message: "spam " + i }));
  if (r.status === 429) { limited = true; break; }
  if (r.body) await readAll(r);
}
check("Rate-Limit greift", limited);

console.log(failures === 0 ? "\nAlle Tests bestanden." : `\n${failures} Test(s) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
