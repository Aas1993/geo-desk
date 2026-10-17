// Builds UN General Assembly voting data from Harvard Dataverse (Voeten et al.) and HS chapter names from UN Comtrade.
//  - public/data/un/ideal.json        { ISO3: [[year, idealPoint], ...] }  (1990+)
//  - public/data/un/agree/<ISO3>.json { ISO3: agreementShare }             (mean over last 5 sessions)
//  - public/data/hs2.json             { "27": "Mineral fuels, oils", ... }
import { writeFileSync } from "node:fs";
const DV = "https://dataverse.harvard.edu/api/access/datafile/";
const out = (p) => new URL("../public/data/" + p, import.meta.url);

// 1) ideal points (small)
const ideal = (await (await fetch(DV + "11824371")).text()).split("\n");
const h = ideal[0].split("\t"); const col = (n) => h.indexOf(n);
const byCc = new Map(); const series = {}; let maxYear = 0;
for (const line of ideal.slice(1)) {
  const f = line.split("\t"); if (f.length < h.length - 2) continue;
  const iso = f[col("iso3c")].replace(/"/g, ""); const year = Math.round(+f[col("year")]); const v = +f[col("idealpointall")];
  if (!iso || !isFinite(v) || v === 0) continue; // exact 0 = not estimated
  byCc.set(f[col("ccode")], iso); maxYear = Math.max(maxYear, year);
  if (year >= 1990) (series[iso] ??= []).push([year, +v.toFixed(3)]);
}
writeFileSync(out("un/ideal.json"), JSON.stringify(series));
console.log("ideal points:", Object.keys(series).length, "countries, up to", maxYear);

// 2) pairwise agreement (145 MB CSV) — streamed, never stored
const res = await fetch(DV + "11837234"); if (!res.ok) throw new Error("agreement " + res.status);
const dec = new TextDecoder(); let buf = ""; let first = true; let idx = {};
const sums = new Map(); let rows = 0, years = new Set();
const feed = (line) => {
  const f = line.split(",");
  if (first) { first = false; f.forEach((n, i) => (idx[n.replace(/"/g, "")] = i)); return; }
  const y = +f[idx.year]; if (!(y >= maxYear - 4)) return;
  const a = byCc.get(f[idx.ccode1]), b = byCc.get(f[idx.ccode2]), g = +f[idx.agree]; if (!a || !b || !isFinite(g)) return;
  years.add(y); rows++;
  for (const k of [a + "|" + b, b + "|" + a]) { const s = sums.get(k) ?? [0, 0]; s[0] += g; s[1]++; sums.set(k, s); }
};
for await (const chunk of res.body) {
  buf += dec.decode(chunk, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
  for (const l of lines) feed(l);
}
if (buf) feed(buf);
const per = {};
for (const [k, [s, n]] of sums) { const [a, b] = k.split("|"); (per[a] ??= {})[b] = +(s / n).toFixed(3); }
for (const [iso, m] of Object.entries(per)) writeFileSync(out(`un/agree/${iso}.json`), JSON.stringify(m));
console.log("agreement rows kept:", rows, "years:", [...years].sort().join(","), "countries:", Object.keys(per).length);

// 3) HS2 chapter names
const hs = (await (await fetch("https://comtradeapi.un.org/files/v1/app/reference/HS.json")).json()).results;
const names = {};
const OVERRIDE = { 27: "Mineral fuels & oils", 71: "Precious stones & metals", 84: "Machinery & mechanical appliances", 85: "Electrical machinery & electronics", 87: "Vehicles", 72: "Iron & steel", 76: "Aluminium", 39: "Plastics", 29: "Organic chemicals", 30: "Pharmaceuticals", 10: "Cereals", 26: "Ores, slag & ash", 31: "Fertilisers", 88: "Aircraft & spacecraft", 89: "Ships & boats", 90: "Optical & medical instruments", 93: "Arms & ammunition", 62: "Apparel (not knitted)", 61: "Apparel (knitted)", 24: "Tobacco", 33: "Perfumery & cosmetics", 74: "Copper", 7: "Vegetables", 8: "Fruit & nuts", 2: "Meat", 3: "Fish & seafood", 9: "Coffee, tea & spices", 17: "Sugars", 18: "Cocoa", 99: "Special classifications", 98: "Special classifications" };
for (const r of hs) if (r.aggrLevel === 2 && /^\d\d$/.test(r.id)) names[r.id] = OVERRIDE[+r.id] ?? (() => { const t = r.text.replace(/^\d+ - /, "").split(";")[0].trim(); return t.length > 56 ? t.slice(0, 54).replace(/[ ,]+\S*$/, "") + "…" : t; })();
writeFileSync(out("hs2.json"), JSON.stringify(names));
console.log("hs2 chapters:", Object.keys(names).length);
