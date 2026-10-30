// Builds public/data/trade.json: the UAE's goods trade with every partner, as reported by UAE customs to the IMF (International Trade in Goods by partner, IMTS).
// Annual series 2012 onward plus trailing-twelve-month totals from the latest quarters. Values in US$ millions. Exports are FOB and include re-exports; imports are CIF.
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/json" };
const valid = new Set(JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).map((c) => c.iso3));
const r = await fetch("https://api.imf.org/external/sdmx/2.1/data/IMF.STA,IMTS/ARE?startPeriod=2012&format=jsondata", { headers: UA, signal: AbortSignal.timeout(180_000) }); if (!r.ok) throw new Error(`IMF IMTS ${r.status}`);
const j = await r.json(); const dims = j.structure.dimensions.series; const di = (id) => dims.findIndex((d) => d.id === id);
const ind = dims[di("INDICATOR")].values.map((v) => v.id), cp = dims[di("COUNTERPART_COUNTRY")].values.map((v) => ({ id: v.id, name: v.name ?? v.names?.en })), fr = dims[di("FREQUENCY")].values.map((v) => v.id);
const periods = j.structure.dimensions.observation[0].values.map((v) => v.id); const KEY = { XG_FOB_USD: "x", MG_CIF_USD: "m" };
const rows = {}; // iso3 -> { A: {year:{x,m}}, Q: {"2025-Q3":{x,m}} }
const worldCodes = cp.filter((c) => /^world$/i.test(c.name ?? "") || c.id === "G001" || c.id === "W00" || c.id === "001"); let world = null;
for (const [k, s] of Object.entries(j.dataSets[0].series)) {
  const a = k.split(":").map(Number); const key = KEY[ind[a[di("INDICATOR")]]]; if (!key) continue; const f = fr[a[di("FREQUENCY")]]; if (f !== "A" && f !== "Q") continue; const code = cp[a[di("COUNTERPART_COUNTRY")]].id;
  const isWorld = worldCodes.some((w) => w.id === code); if (!isWorld && !valid.has(code)) continue; const bag = isWorld ? (world ??= { A: {}, Q: {} }) : (rows[code] ??= { A: {}, Q: {} });
  for (const [t, o] of Object.entries(s.observations)) { const p = periods[+t]; const v = Number(o[0]); if (!Number.isFinite(v)) continue; const slot = (f === "A" ? bag.A : bag.Q); (slot[p] ??= {})[key] = Math.round(v / 1e6); }
}
const latestQ = (bag) => Object.keys(bag.Q).filter((p) => /^\d{4}-Q[1-4]$/.test(p) && bag.Q[p].x != null && bag.Q[p].m != null).sort(); 
const qIndex = (p) => +p.slice(0, 4) * 4 + (+p.slice(6) - 1);
const ttm = (bag, endIdx) => { let x = 0, m = 0; for (let i = 0; i < 4; i++) { const idx = endIdx - i; const p = `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`; const q = bag.Q[p]; if (!q || q.x == null || q.m == null) return null; x += q.x; m += q.m; } return { x, m }; };
const years = Object.keys(world?.A ?? {}).map(Number).sort((a, b) => a - b); const lastYear = years[years.length - 1]; const wq = world ? latestQ(world) : []; const endIdx = wq.length ? qIndex(wq[wq.length - 1]) : null;
const out = {};
for (const [code, bag] of Object.entries(rows)) {
  const a = Object.keys(bag.A).map(Number).sort((x, y) => x - y).filter((y) => bag.A[y].x != null && bag.A[y].m != null).map((y) => [y, bag.A[y].x, bag.A[y].m]); if (!a.length) continue;
  const rec = { a }; if (endIdx != null) { const t = ttm(bag, endIdx), p = ttm(bag, endIdx - 4); if (t) rec.ttm = t; if (p) rec.prev = p; } out[code] = rec;
}
const sumYear = (y) => Object.values(rows).reduce((s, b) => s + (b.A[y] ? (b.A[y].x ?? 0) + (b.A[y].m ?? 0) : 0), 0);
const worldRec = { a: years.map((y) => [y, world?.A[y]?.x ?? 0, world?.A[y]?.m ?? 0]) }; if (endIdx != null && world) { const t = ttm(world, endIdx), p = ttm(world, endIdx - 4); if (t) worldRec.ttm = t; if (p) worldRec.prev = p; }
if (Object.keys(out).length < 120 || !worldRec.a.length) { console.error(`REFUSING TO WRITE: ${Object.keys(out).length} partners, world ${worldRec.a.length} years`); process.exit(1); }
const partnerShare = sumYear(lastYear) / ((worldRec.a.at(-1)[1] + worldRec.a.at(-1)[2]) || 1);
writeFileSync(new URL("../public/data/trade.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), source: { name: "IMF International Trade in Goods by partner (IMTS), UAE as reporter", url: "https://data.imf.org/en/datasets/IMF.STA:IMTS", note: "Goods only, US$ millions. Exports are FOB and include re-exports; imports are CIF. Partner-reported totals can differ from UAE-reported ones." }, lastYear, asOfQuarter: wq.at(-1) ?? null, world: worldRec, countries: out }));
console.log("partners", Object.keys(out).length, "| last year", lastYear, "| latest quarter", wq.at(-1), "| world", JSON.stringify(worldRec.a.at(-1)), "| listed partners cover", (partnerShare * 100).toFixed(1) + "% of world total");
console.log("IND:", JSON.stringify(out.IND?.a.at(-1)), JSON.stringify(out.IND?.ttm), JSON.stringify(out.IND?.prev)); const top = Object.entries(out).map(([k, v]) => [k, v.a.at(-1)[1] + v.a.at(-1)[2]]).sort((a, b) => b[1] - a[1]).slice(0, 8); console.log("top partners:", top.map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}bn`).join(" "));
