// Builds public/data/rivals.json: for every country, how large the UAE's goods trade is next to that of the other powers competing for influence there
// (China, the US, India, Türkiye, Saudi Arabia, Qatar, Russia, Germany, France, Italy, the UK, Japan, South Korea).
// Each rival's own customs data comes from the IMF (International Trade in Goods by partner, IMTS: the rival's exports to the country and imports from it), and the country's own totals
// from the World Bank (merchandise exports and imports, US$). Share = (rival exports to X + rival imports from X) / (X's merchandise exports + imports). The UAE row uses the same measure
// from trade.json. Mirror data: valuation (FOB/CIF), re-exports and reporting gaps make it approximate, so it shows order of magnitude and rank, not exact market share.
// Usage: node scripts/build-rivals.mjs   (run after build-trade)
import { readFileSync, writeFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/json" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const valid = new Set(D("countries.json").map((c) => c.iso3)); const trade = D("trade.json");
const RIVALS = ["CHN", "USA", "IND", "TUR", "SAU", "QAT", "RUS", "DEU", "FRA", "ITA", "GBR", "JPN", "KOR"];
const get = async (url, ms = 120_000) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) }); if (r.ok) return await r.json(); } catch { /* retry */ } await new Promise((s) => setTimeout(s, 2000 * (i + 1))); } throw new Error(`failed: ${url}`); };

// each rival's annual exports (XG_FOB_USD) and imports (MG_CIF_USD) by counterpart country, US$
const rival = {}; // R -> year -> country -> { x, m }
for (const R of RIVALS) {
  const j = await get(`https://api.imf.org/external/sdmx/2.1/data/IMF.STA,IMTS/${R}?startPeriod=2022&format=jsondata`); const dims = j.structure.dimensions.series; const di = (id) => dims.findIndex((d) => d.id === id);
  const ind = dims[di("INDICATOR")].values.map((v) => v.id), cp = dims[di("COUNTERPART_COUNTRY")].values.map((v) => v.id), fr = dims[di("FREQUENCY")].values.map((v) => v.id); const periods = j.structure.dimensions.observation[0].values.map((v) => v.id);
  const key = { XG_FOB_USD: "x", MG_CIF_USD: "m" }; const by = (rival[R] = {});
  for (const [k, s] of Object.entries(j.dataSets[0].series)) {
    const a = k.split(":").map(Number); const f = fr[a[di("FREQUENCY")]]; const m = key[ind[a[di("INDICATOR")]]]; const c = cp[a[di("COUNTERPART_COUNTRY")]]; if (f !== "A" || !m || !valid.has(c) || c === R) continue;
    for (const [t, o] of Object.entries(s.observations)) { const v = Number(o[0]); if (!Number.isFinite(v) || !/^\d{4}$/.test(periods[+t])) continue; ((by[periods[+t]] ??= {})[c] ??= {})[m] = v; }
  }
  console.log(R, Object.keys(by).map((y) => `${y}:${Object.keys(by[y]).length}`).join(" "));
}
// the year to compare: the latest one most rivals have reported
const yearCount = {}; for (const R of RIVALS) for (const y of Object.keys(rival[R])) if (Object.keys(rival[R][y]).length > 100) yearCount[y] = (yearCount[y] ?? 0) + 1;
const Y = Object.keys(yearCount).filter((y) => yearCount[y] >= Math.ceil(RIVALS.length * 0.75)).sort().at(-1); if (!Y) { console.error("REFUSING TO WRITE: no year with enough rival data"); process.exit(1); }
// a rival that has not yet reported the comparison year (Qatar publishes late) is shown at its latest full year and flagged
const rivalYear = Object.fromEntries(RIVALS.map((R) => [R, Object.keys(rival[R]).filter((y) => y <= Y && Object.keys(rival[R][y]).length > 100).sort().at(-1) ?? null]));
const wb = async (code) => { const j = await get(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=400&date=${Y}`, 40_000); const m = {}; for (const x of j[1] ?? []) if (valid.has(x.countryiso3code) && x.value != null) m[x.countryiso3code] = x.value; return m; };
const [wx, wm] = await Promise.all([wb("TX.VAL.MRCH.CD.WT"), wb("TM.VAL.MRCH.CD.WT")]);
const out = {}; const uaeRows = (c) => trade.countries[c]?.a.find((r) => r[0] === +Y);
for (const c of Object.keys(wx)) {
  if (c === "ARE" || !wm[c]) continue; const total = wx[c] + wm[c]; if (total < 5e8) continue; // below US$0.5bn of trade shares are too noisy to compare
  const row = []; const u = uaeRows(c); if (u) row.push({ c: "ARE", v: (u[1] + u[2]) * 1e6 });
  for (const R of RIVALS) { const ry = rivalYear[R]; const o = ry ? rival[R][ry]?.[c] : null; if (o && (o.x != null || o.m != null)) row.push({ c: R, v: (o.x ?? 0) + (o.m ?? 0), y: ry !== Y ? +ry : undefined }); }
  if (row.length < 5 || !row.some((r) => r.c === "ARE")) continue; const list = row.map((r) => ({ c: r.c, share: Math.round(Math.min(100, (r.v / total) * 100) * 10) / 10, ...(r.y ? { y: r.y } : {}) })).sort((a, b) => b.share - a.share);
  out[c] = { total: Math.round(total / 1e6), uae: { share: list.find((r) => r.c === "ARE").share, rank: list.findIndex((r) => r.c === "ARE") + 1 }, of: list.length, list };
}
const n = Object.keys(out).length; if (n < 100) { console.error(`REFUSING TO WRITE: only ${n} countries`); process.exit(1); }
writeFileSync(new URL("../public/data/rivals.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), year: +Y, rivals: RIVALS, source: { name: "IMF International Trade in Goods by partner (rivals as reporters) and World Bank merchandise totals", note: "Share of the country's merchandise trade; mirror data, approximate; UAE figures include re-exports" }, countries: out }));
const show = (c) => out[c] && `${c}: ${out[c].list.slice(0, 6).map((r) => `${r.c} ${r.share}%`).join(", ")} | UAE rank ${out[c].uae.rank}/${out[c].of}`;
console.log(`rivals: ${n} countries, year ${Y}`); for (const c of ["EGY", "PAK", "SDN", "ETH", "KEN"]) console.log(show(c));
