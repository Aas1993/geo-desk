// Builds public/data/trends.json: ten-year country series for the Case File trend spine.
// Sources: World Bank Worldwide Governance Indicators (source 3) and World Development Indicators (source 2), both CC BY 4.0 via the World Bank API, plus the UN General Assembly ideal-point distance to the UAE computed from the held ideal-point series.
// A country with no value for a series simply has no entry for it; nothing is filled in. Series with sparse coverage (for example the Gini coefficient) are kept as they are and shown as sparse.
// Usage: node scripts/build-trends.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const FROM = 2015;
const SERIES = {
  cc: ["GOV_WGI_CC.SC", 3, "Control of corruption", "score 0-100"], ge: ["GOV_WGI_GE.SC", 3, "Government effectiveness", "score 0-100"], pv: ["GOV_WGI_PV.SC", 3, "Political stability", "score 0-100"], rl: ["GOV_WGI_RL.SC", 3, "Rule of law", "score 0-100"], rq: ["GOV_WGI_RQ.SC", 3, "Regulatory quality", "score 0-100"], va: ["GOV_WGI_VA.SC", 3, "Voice and accountability", "score 0-100"],
  pop: ["SP.POP.TOTL", 2, "Population", "people"], gdppc: ["NY.GDP.PCAP.CD", 2, "GDP per capita", "US$"], open: ["NE.TRD.GNFS.ZS", 2, "Trade openness", "% of GDP"], fdi: ["BX.KLT.DINV.CD.WD", 2, "FDI net inflows", "US$"], remit: ["BX.TRF.PWKR.CD.DT", 2, "Remittances received", "US$"],
  mil: ["MS.MIL.XPND.GD.ZS", 2, "Military spending", "% of GDP"], urban: ["SP.URB.TOTL.IN.ZS", 2, "Urban population", "% of population"], net: ["IT.NET.USER.ZS", 2, "Internet users", "% of population"], health: ["SH.XPD.CHEX.GD.ZS", 2, "Health spending", "% of GDP"], gini: ["SI.POV.GINI", 2, "Gini coefficient", "index 0-100"],
  rent: ["NY.GDP.PETR.RT.ZS", 2, "Oil and gas rents", "% of GDP"], water: ["ER.H2O.FWTL.ZS", 2, "Freshwater withdrawal", "% of resources"], foodimp: ["TM.VAL.FOOD.ZS.UN", 2, "Food imports", "% of merchandise imports"], foodprod: ["AG.PRD.FOOD.XD", 2, "Food production index", "2014-16 = 100"], renew: ["EG.ELC.RNEW.ZS", 2, "Renewable electricity", "% of output"], co2: ["EN.GHG.CO2.PC.CE.AR5", 2, "CO2 per capita", "t CO2e"],
};
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const out = {}; const cover = {}; let year = 0; const end = new Date().getUTCFullYear();
for (const [k, [id, src]] of Object.entries(SERIES)) {
  const page = async (n) => { for (let t = 0; t < 4; t++) { try { const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=3000&page=${n}&date=${FROM}:${end}&source=${src}`, { signal: AbortSignal.timeout(90_000) }); if (r.ok) return await r.json(); } catch { /* retry */ } } throw new Error(`${id} page ${n} failed`); };
  const first = await page(1); let all = first[1] ?? []; for (let n = 2; n <= (first[0]?.pages ?? 1); n++) all = all.concat((await page(n))[1] ?? []);
  const by = {}; for (const x of all) { if (!valid.has(x.countryiso3code) || x.value == null) continue; const s = (by[x.countryiso3code] ??= {}); const y = +x.date; if (!(y in s)) s[y] = x.value; }
  cover[k] = Object.keys(by).length;
  for (const [iso, s] of Object.entries(by)) { const ys = Object.keys(s).map(Number).sort((a, b) => a - b); const dp = Math.abs(s[ys[ys.length - 1]]) >= 1000 ? 0 : 2; (out[iso] ??= {})[k] = ys.map((y) => [y, Math.round(s[y] * 10 ** dp) / 10 ** dp]); year = Math.max(year, ys[ys.length - 1]); }
}
// UN General Assembly ideal-point distance to the UAE, by year (the held series ends in 2023)
const ideal = JSON.parse(readFileSync(new URL("../public/data/un/ideal.json", import.meta.url), "utf8")); const uae = Object.fromEntries((ideal.ARE ?? []).map(([y, v]) => [y, v])); let un = 0;
for (const [iso, rows] of Object.entries(ideal)) { if (iso === "ARE" || !valid.has(iso)) continue; const s = rows.filter(([y]) => y >= 2013 && y in uae).map(([y, v]) => [y, Math.round(Math.abs(v - uae[y]) * 1000) / 1000]); if (s.length >= 5) { (out[iso] ??= {}).unDist = s; un++; } }
cover.unDist = un;
const n = Object.keys(out).length; const prev = prevOf("trends.json", (j) => Object.keys(j.countries).length);
if (n < 150 || thin(n, prev, 0.95) || year < 2023) { console.error(`REFUSING TO WRITE: ${n} countries, latest year ${year}`); process.exit(1); }
const meta = Object.fromEntries([...Object.entries(SERIES).map(([k, [id, src, name, unit]]) => [k, { id, name, unit, source: src === 3 ? "World Bank WGI" : "World Bank WDI" }]), ["unDist", { id: "UN ideal points", name: "UN voting distance to the UAE", unit: "ideal-point distance (lower is closer)", source: "Held UN ideal points (Voeten)" }]]);
writeFileSync(new URL("../public/data/trends.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), from: FROM, year, n, coverage: cover, series: meta, countries: out }));
console.log("countries", n, "latest", year, "| coverage", JSON.stringify(cover), "| EGY keys", Object.keys(out.EGY ?? {}).join(","));
