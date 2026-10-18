// Builds public/data/governance.json: the World Bank's Worldwide Governance Indicators (six scores, 0-100, higher is better) per country.
// Source: World Bank WGI (Kaufmann and Kraay), open licence CC BY 4.0, via the World Bank API (source 3). Perception-based estimates, published with a lag of about a year.
// Usage: node scripts/build-governance.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const IND = { cc: "GOV_WGI_CC.SC", ge: "GOV_WGI_GE.SC", pv: "GOV_WGI_PV.SC", rl: "GOV_WGI_RL.SC", rq: "GOV_WGI_RQ.SC", va: "GOV_WGI_VA.SC" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const out = {}; let year = 0;
for (const [k, id] of Object.entries(IND)) {
  const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=400&mrnev=1&source=3`, { signal: AbortSignal.timeout(40_000) }); if (!r.ok) throw new Error(`${id} ${r.status}`);
  const rows = (await r.json())[1] ?? [];
  for (const x of rows) { const iso = x.countryiso3code; if (!valid.has(iso) || x.value == null) continue; (out[iso] ??= {})[k] = Math.round(x.value * 10) / 10; out[iso].y = Math.max(out[iso].y ?? 0, +x.date); year = Math.max(year, +x.date); }
}
const n = Object.keys(out).length; const prev = prevOf("governance.json", (j) => Object.keys(j.countries).length);
if (n < 170 || thin(n, prev, 0.95) || year < 2023) { console.error(`REFUSING TO WRITE: ${n} countries, latest year ${year}`); process.exit(1); }
// where each country stands among all countries on each score (1 = best)
for (const k of Object.keys(IND)) { const vals = Object.entries(out).filter(([, v]) => v[k] != null).sort((a, b) => b[1][k] - a[1][k]); vals.forEach(([iso], i) => { out[iso][`${k}Rank`] = i + 1; }); out.__n ??= {}; out.__n[k] = vals.length; }
const meta = out.__n; delete out.__n;
writeFileSync(new URL("../public/data/governance.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), year, n: meta, source: { name: "World Bank Worldwide Governance Indicators", url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators", licence: "CC BY 4.0", note: "Scores 0-100 (higher is better), built from perception surveys and expert assessments; estimates carry margins of error and trail events by about a year. Dimensions: control of corruption, government effectiveness, political stability and absence of violence, rule of law, regulatory quality, voice and accountability." }, countries: out }));
console.log("countries", n, "year", year, "| EGY", JSON.stringify(out.EGY), "| ARE", JSON.stringify(out.ARE));
