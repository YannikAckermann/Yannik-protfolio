/**
 * Lokaler Entwicklungsserver: liefert die statischen Dateien aus und führt
 * dieselbe Edge Function aus, die auf Vercel läuft — damit der Chat lokal
 * testbar ist.
 *
 *   1. .env anlegen (siehe .env.example) mit GEMINI_API_KEY
 *   2. node dev-server.mjs
 *   3. http://localhost:8124 öffnen
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8124;

/* ---------- .env laden (ohne Zusatzpaket) ---------- */
try {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  console.log(".env geladen");
} catch {
  console.warn("Keine .env gefunden — der Chat antwortet mit 'nicht eingerichtet'.");
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

/* ---------- Node-Request in Web-Request übersetzen ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleApi(req, res) {
  const { default: handler } = await import(`./api/chat.js?t=${Date.now()}`); // kein Cache im Dev
  const body = await readBody(req);

  const webReq = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: body.length ? body : undefined
  });

  const webRes = await handler(webReq);

  res.writeHead(webRes.status, Object.fromEntries(webRes.headers));
  if (!webRes.body) return res.end();

  const reader = webRes.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

/* ---------- Statische Dateien ---------- */
async function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") path = "/index.html";

  // Directory-Traversal verhindern
  const full = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const info = await stat(full);
    if (info.isDirectory()) throw new Error("directory");
    const data = await readFile(full);
    res.writeHead(200, {
      "content-type": TYPES[extname(full)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 — nicht gefunden");
  }
}

createServer(async (req, res) => {
  try {
    if (req.url.split("?")[0] === "/api/chat") {
      await handleApi(req, res);
    } else {
      await serveStatic(req, res);
    }
  } catch (err) {
    console.error("Serverfehler:", err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "dev_server_error", detail: String(err?.message || err) }));
  }
}).listen(PORT, () => {
  console.log(`Portfolio läuft auf http://localhost:${PORT}`);
  console.log(`Modell: ${process.env.GEMINI_MODEL || "(Standard aus api/chat.js)"}`);
  console.log(`API-Key: ${process.env.GEMINI_API_KEY ? "gesetzt" : "FEHLT — Chat antwortet mit Hinweis"}`);
});
