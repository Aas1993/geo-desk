// Builds public/data/tech.json: the World Bank's technology, connectivity and innovation indicators per country (latest value and its year), with each country's rank among those that report it.
// Source: World Bank World Development Indicators (ITU, UNESCO UIS, WIPO, OECD as the underlying publishers), open licence CC BY 4.0, via the World Bank API. Coverage is uneven: research spending and researchers are often several years old; an indicator a country does not report is absent, not zero.
// Usage: node scripts/build-tech.mjs
import { readFileSync, writeFileSync } from "node:fs";
const IND = { net: "IT.NET.USER.ZS", bb: "IT.NET.BBND.P2", mob: "IT.CEL.SETS.P2", srv: "IT.NET.SECR.P6", rd: "GB.XPD.RSDV.GD.ZS", res: "SP.POP.SCIE.RD.P6", hte: "TX.VAL.TECH.MF.ZS", pat: "IP.PAT.RESD" };
const NAME = { net: "Internet users, % of population", bb: "Fixed broadband subscriptions per 100 people", mob: "Mobile subscriptions per 100 people", srv: "Secure internet servers per million people", rd: "Research and development spending, % of GDP", res: "Researchers in R&D per million people", hte: "High-technology exports, % of manufactured exports", pat: "Patent applications by residents" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const out = {};
for (const [k, id] of Object.entries(IND)) {
  const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=400&mrnev=1`, { signal: AbortSignal.timeout(40_000) }); if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const rows = ((await r.json())[1] ?? []).filter((x) => valid.has(x.countryiso3code) && x.value != null);
  const by = {}; for (const x of rows) { const cur = by[x.countryiso3code]; if (!cur || +x.date > +cur.date) by[x.countryiso3code] = x; }
  const vals = Object.values(by).map((x) => x.value).sort((a, b) => a - b);
  for (const [iso, x] of Object.entries(by)) { const below = vals.filter((v) => v < x.value).length; (out[iso] ??= {})[k] = { v: Math.round(x.value * 100) / 100, y: +x.date, pct: Math.round((below / Math.max(1, vals.length - 1)) * 100) }; }
  console.log(`${k}: ${Object.keys(by).length} countries`);
}
const n = Object.keys(out).length; if (n < 150) { console.error(`REFUSING TO WRITE: ${n} countries`); process.exit(1); }
writeFileSync(new URL("../public/data/tech.json", import.meta.url), JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: { name: "World Bank World Development Indicators (ITU, UNESCO UIS, WIPO)", url: "https://data.worldbank.org", note: "Latest value per country and its year; pct is the share of reporting countries below it. Uneven coverage: an indicator not reported is absent, not zero. Data-centre capacity and AI-readiness indices are not in this file." }, indicators: Object.fromEntries(Object.entries(NAME).map(([k, v]) => [k, v])), countries: out }));
console.log(`wrote tech.json: ${n} countries`);
