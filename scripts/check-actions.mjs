/**
 * Prueft, dass die Handlungs-Kennungen des Chatbots ueberall dieselben sind.
 *
 * Die Kennungen stehen an drei Stellen: in der Registry in chat.js (dort haengen
 * Beschriftung und Ziel dran), im deutschen und im englischen Systemprompt in
 * api/profile.js. Laufen die auseinander, schlaegt der Bot entweder Knoepfe vor,
 * die verworfen werden, oder er kennt vorhandene Knoepfe nicht.
 *
 *   node scripts/check-actions.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Registry aus chat.js: der Block zwischen "var ACTIONS = {" und der Zeile "};" */
const chatSrc = readFileSync(join(root, "chat.js"), "utf8");
const registryBlock = chatSrc.match(/var ACTIONS = \{([\s\S]*?)\n  \};/);
if (!registryBlock) {
  console.error("FEHLER: ACTIONS-Registry in chat.js nicht gefunden.");
  process.exit(1);
}
const registry = [...registryBlock[1].matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]);

/* Kennungen aus den beiden Systemprompts: eingerueckte "kennung — Beschreibung" */
const profileSrc = readFileSync(join(root, "api", "profile.js"), "utf8");

function idsAusPrompt(startMarker) {
  const ab = profileSrc.indexOf(startMarker);
  if (ab === -1) return null;
  const bis = profileSrc.indexOf("\n- Erwähne", ab) + 1 || profileSrc.indexOf("\n- Never mention", ab) + 1;
  const block = profileSrc.slice(ab, bis > 0 ? bis : undefined);
  return [...block.matchAll(/^\s{2}([a-z_]+)\s+—/gm)].map((m) => m[1]);
}

const promptDE = idsAusPrompt("HANDLUNGEN:");
const promptEN = idsAusPrompt("ACTIONS:\nThe website");

let fehler = 0;

function vergleiche(name, ids) {
  if (!ids || !ids.length) {
    console.error(`FEHLER: keine Kennungen in ${name} gefunden.`);
    fehler++;
    return;
  }
  const fehlt = registry.filter((id) => !ids.includes(id));
  const zuviel = ids.filter((id) => !registry.includes(id));
  if (fehlt.length) {
    console.error(`FEHLER: ${name} kennt diese Knoepfe nicht: ${fehlt.join(", ")}`);
    fehler++;
  }
  if (zuviel.length) {
    console.error(`FEHLER: ${name} nennt Kennungen ohne Knopf: ${zuviel.join(", ")}`);
    fehler++;
  }
  if (!fehlt.length && !zuviel.length) console.log(`OK: ${name} — ${ids.length} Kennungen`);
}

console.log(`Registry (chat.js): ${registry.length} Kennungen — ${registry.join(", ")}`);
vergleiche("Systemprompt DE", promptDE);
vergleiche("Systemprompt EN", promptEN);

/* Jede Handlung braucht beide Beschriftungen, sonst steht der Knopf leer da. */
for (const id of registry) {
  const block = registryBlock[1].match(new RegExp(`\\n    ${id}:\\s*\\{[\\s\\S]*?\\n    \\}|\\n    ${id}:.*`));
  const text = block ? block[0] : "";
  if (!/\bde:/.test(text) || !/\ben:/.test(text)) {
    console.error(`FEHLER: ${id} fehlt eine Beschriftung (de/en).`);
    fehler++;
  }
}

if (fehler) {
  console.error(`\n${fehler} Problem(e).`);
  process.exit(1);
}
console.log("\nAlle Handlungen stimmen ueberein.");
