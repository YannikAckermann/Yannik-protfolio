/* Findet einen --muted-Wert, der auf beiden Hintergruenden 4.5:1 erreicht. */
const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (rgb) =>
  rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (fg, bg) => {
  const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const PAPER = hex("#F3F0EA");
const PAPER_SOFT = hex("#EDE9E1");

console.log("Aktuell #6E6A62:");
console.log("  auf Papier      :", ratio(hex("#6E6A62"), PAPER).toFixed(2));
console.log("  auf Papier-soft :", ratio(hex("#6E6A62"), PAPER_SOFT).toFixed(2), "<- Problem");

// Denselben Farbton schrittweise abdunkeln, bis beide Werte passen
const base = hex("#6E6A62");
for (let step = 0; step <= 40; step++) {
  const c = base.map((v) => Math.max(0, v - step));
  const rP = ratio(c, PAPER);
  const rS = ratio(c, PAPER_SOFT);
  if (rS >= 4.5) {
    const hexOut =
      "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    console.log(`\nVorschlag ${hexOut} (${step} dunkler):`);
    console.log("  auf Papier      :", rP.toFixed(2));
    console.log("  auf Papier-soft :", rS.toFixed(2));
    break;
  }
}
