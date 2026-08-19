/* Behaelt nur die latin-Zeichensaetze und loescht die uebrigen Schriftdateien. */
import { readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../assets/fonts/", import.meta.url).pathname;
const css = readFileSync(join(DIR, "local.css"), "utf8");

// Google kommentiert jeden Block mit dem Zeichensatz: /* latin */
const blocks = css.split("@font-face").slice(1);
const keep = [];
const kept = [];

for (const b of blocks) {
  const full = "@font-face" + b.split(/(?=\/\*)/)[0];
  const before = css.slice(0, css.indexOf(b));
  const subsetMatch = before.match(/\/\* ([a-z-]+) \*\/\s*$/);
  const subset = subsetMatch ? subsetMatch[1] : "?";
  const file = (b.match(/([A-Za-z0-9_-]+\.woff2)/) || [])[1];
  if (subset === "latin" || subset === "latin-ext") {
    keep.push(full.trim());
    if (file) kept.push(file);
  }
}

// Robuster: Bloecke anhand der Kommentare direkt aus dem Original schneiden
const parts = css.split(/\/\* ([a-z-]+) \*\//).slice(1);
const out = [];
const keepFiles = new Set();
for (let i = 0; i < parts.length; i += 2) {
  const subset = parts[i];
  const body = parts[i + 1] || "";
  if (subset === "latin" || subset === "latin-ext") {
    out.push(`/* ${subset} */` + body.trimEnd());
    for (const f of body.match(/[A-Za-z0-9_-]+\.woff2/g) || []) keepFiles.add(f);
  }
}

const header = `/* Lokale Schriften — ersetzt den blockierenden Aufruf an fonts.googleapis.com.
   Erzeugt von scripts/fetch-fonts.sh + scripts/trim-fonts.mjs.
   Nur latin/latin-ext, da die Seite auf Deutsch und Englisch laeuft. */\n\n`;

writeFileSync(join(DIR, "fonts.css"), header + out.join("\n\n") + "\n");

let removed = 0;
let freed = 0;
for (const f of readdirSync(DIR)) {
  if (f.endsWith(".woff2") && !keepFiles.has(f)) {
    freed += statSync(join(DIR, f)).size;
    unlinkSync(join(DIR, f));
    removed++;
  }
}

let total = 0;
for (const f of readdirSync(DIR)) {
  if (f.endsWith(".woff2")) total += statSync(join(DIR, f)).size;
}

console.log(`Behalten: ${keepFiles.size} Dateien (${Math.round(total / 1024)} KB)`);
console.log(`Geloescht: ${removed} Dateien (${Math.round(freed / 1024)} KB gespart)`);
