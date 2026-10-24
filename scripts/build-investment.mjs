// Builds public/data/investment.json: UAE direct-investment positions by counterpart country, from the IMF's Direct Investment Positions dataset (formerly CDIS).
// The UAE rows are "derived using counterparty information" (mirror data: what partner countries report about the UAE), so coverage and years differ by country.
// There is no public count of UAE companies per country; investment position is the best open measure of business presence, and the app says so.
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/json" };
const valid = new Set(JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).map((c) => c.iso3));
const URL_ = "https://api.imf.org/external/sdmx/2.1/data/IMF.STA,DIP/ARE?lastNObservations=10&format=jsondata";
const r = await fetch(URL_, { headers: UA, signal: AbortSignal.timeout(90_000) }); if (!r.ok) throw new Error(`IMF DIP ${r.status}`);
const j = await r.json(); const dims = j.structure.dimensions.series; const iDim = dims.findIndex((d) => d.id === "INDICATOR"), cDim = dims.findIndex((d) => d.id === "COUNTERPART_COUNTRY");
const ind = dims[iDim].values.map((v) => v.id), cp = dims[cDim].values.map((v) => v.id), years = j.structure.dimensions.observation[0].values.map((v) => v.id);
const WANT = { OTWD_D_NETAL_FALL_ALL: "outward", INWD_D_NETLA_FALL_ALL: "inward" }; // net position, all instruments, all entities
const out = {}; let world = null;
for (const [k, s] of Object.entries(j.dataSets[0].series)) {
  const a = k.split(":").map(Number); const side = WANT[ind[a[iDim]]]; if (!side) continue; const c = cp[a[cDim]];
  let best = null; const series = []; for (const [t, o] of Object.entries(s.observations)) { const y = +years[+t], v = Number(o[0]); if (Number.isFinite(v)) { series.push([y, Math.round(v)]); if (!best || y > best.year) best = { usd: Math.round(v), year: y }; } }
  if (!best) continue; series.sort((a, b) => a[0] - b[0]); best.series = series.slice(-8); if (c === "G001") { if (side === "outward") world = best; continue; } // the "world" aggregate
  if (valid.has(c)) (out[c] ??= {})[side] = best;
}
const ranked = Object.entries(out).filter(([, v]) => v.outward && v.outward.usd > 0).sort((a, b) => b[1].outward.usd - a[1].outward.usd);
ranked.forEach(([k], i) => { out[k].outward.rank = i + 1; });
if (ranked.length < 60 || !world) { console.error(`REFUSING TO WRITE: ${ranked.length} countries with outward positions, world ${world ? "ok" : "missing"}`); process.exit(1); }
writeFileSync(new URL("../public/data/investment.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), world, source: { name: "IMF Direct Investment Positions (formerly CDIS), UAE as reporter, derived from counterparty data", url: "https://data.imf.org/en/datasets/IMF.STA:DIP", note: "Net direct-investment position (assets less liabilities for outward, liabilities less assets for inward), all instruments, US dollars. Mirror data; latest year differs by country." }, countries: out }));
console.log("countries:", Object.keys(out).length, "| outward ranked:", ranked.length, "| world:", JSON.stringify(world)); console.log("top:", ranked.slice(0, 10).map(([k, v]) => `${k} $${(v.outward.usd / 1e9).toFixed(1)}bn (${v.outward.year})`).join(" "));
