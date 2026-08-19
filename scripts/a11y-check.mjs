/* Sucht Links ohne zugaenglichen Namen und prueft Kontrastwerte. */
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

/* ---------- Links ohne Namen ---------- */
console.log("=== Links ohne zugaenglichen Namen ===");
const links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
let bad = 0;
for (const a of links) {
  const hasAria = /aria-label=/.test(a);
  const inner = a.replace(/<a\b[^>]*>/, "").replace(/<\/a>$/, "");
  // Sichtbarer Text = alles ohne Tags; SVGs zaehlen nicht als Name
  const text = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  const hasTitle = /<title>/.test(inner);
  if (!hasAria && !text && !hasTitle) {
    bad++;
    console.log("  " + a.slice(0, 130).replace(/\s+/g, " "));
  }
}
if (!bad) console.log("  (keine gefunden)");

/* ---------- Kontrast ---------- */
const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (rgb) =>
  rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [l1, l2] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Werte aus style.css lesen, damit die Pruefung nicht veraltet
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const cssVar = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`--${name} nicht in style.css gefunden`);
  return m[1];
};

const PAPER = cssVar("paper");
const PAPER_SOFT = cssVar("paper-soft");
const INK = cssVar("ink");
const MUTED = cssVar("muted");
const ACCENT = cssVar("accent");

console.log(`\n(gelesen aus style.css: muted=${MUTED}, paper=${PAPER}, paper-soft=${PAPER_SOFT})`);

console.log("\n=== Kontrastwerte (Soll: 4.5 fuer Text, 3.0 fuer grossen Text) ===");
const pairs = [
  ["Ink auf Papier (Fliesstext)", INK, PAPER],
  ["Muted auf Papier (Bildunterschriften)", MUTED, PAPER],
  ["Muted auf Papier-soft (Projekt-Bereich)", MUTED, PAPER_SOFT],
  ["Ink auf Akzent-Gelb (Meta-Badges)", INK, ACCENT],
  ["Papier auf Ink (dunkler Block)", PAPER, INK]
];
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5 ? "OK " : r >= 3 ? "nur gross" : "ZU WENIG";
  console.log(`  ${r.toFixed(2).padStart(6)} : 1  ${ok.padEnd(10)} ${name}`);
}
