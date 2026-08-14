/**
 * Diagnose: zeigt, welche Gemini-Modelle der hinterlegte Key nutzen darf.
 * Aufruf:  node api/list-models.mjs
 */
import { readFileSync } from "node:fs";

// .env einlesen (ohne Zusatzpaket)
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // keine .env — dann muss der Key aus der Umgebung kommen
}

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY fehlt. Lege eine .env an (siehe .env.example).");
  process.exit(1);
}

const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "x-goog-api-key": key }
});

if (!res.ok) {
  console.error(`Fehler ${res.status} beim Abrufen der Modellliste:`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();
// Die API listet nur "generateContent" — der Streaming-Endpoint
// (:streamGenerateContent) steht für dieselben Modelle zur Verfügung.
const usable = (data.models || []).filter((m) =>
  (m.supportedGenerationMethods || []).includes("generateContent")
);

console.log(`\n${usable.length} nutzbare Modelle:\n`);
for (const m of usable) {
  console.log(`  ${m.name.replace("models/", "").padEnd(42)} ${m.displayName || ""}`);
}
console.log("\nTrage eines davon als GEMINI_MODEL in die .env ein (oder nutze den Standard).\n");
