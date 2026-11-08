// Builds public/data/layers/aid.json: net official development assistance (ODA) received, current US$, per country.
// Source: World Bank WDI API, indicator DT.ODA.ODAT.CD (Net official development assistance received, from OECD DAC / WB data). Licence CC BY 4.0.
// For each country in public/data/countries.json, the latest non-empty value within the last 5 calendar years; aggregates are skipped.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const INDICATOR = "DT.ODA.ODAT.CD";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const valid = new Set(JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).map((c) => c.iso3));
const thisYear = new Date().getFullYear();
const url = `https://api.worldbank.org/v2/country/all/indicator/${INDICATOR}?format=json&per_page=20000&date=${thisYear - 5}:${thisYear}`;
let j; for (let i = 0; i < 4 && !j; i++) { try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) }); if (r.ok) j = await r.json(); } catch { /* retry */ } if (!j) await sleep(3_000 * (i + 1)); }
if (!Array.isArray(j) || !Array.isArray(j[1])) { console.error("REFUSING TO WRITE: World Bank API returned no data"); process.exit(1); }
const latest = {}; let skippedAgg = 0;
for (const r of j[1]) {
  const iso3 = r.countryiso3code; if (!valid.has(iso3)) { skippedAgg++; continue; }
  const y = +r.date; if (r.value == null || !Number.isFinite(+r.value) || !Number.isFinite(y)) continue;
  if (!latest[iso3] || y > latest[iso3].year) latest[iso3] = { usd: Math.round(+r.value), year: y };
}
const n = Object.keys(latest).length; const yrs = {}; for (const c of Object.values(latest)) yrs[c.year] = (yrs[c.year] ?? 0) + 1;
if (n < 100 || !latest.UKR || !latest.AFG || latest.UKR.usd <= 0 || (latest.EGY && latest.EGY.usd < 1e8)) { console.error(`REFUSING TO WRITE: only ${n} countries with ODA data (UKR ${latest.UKR?.usd})`); process.exit(1); }
const countries = Object.fromEntries(Object.entries(latest).sort(([a], [b]) => a.localeCompare(b)));
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/aid.json", import.meta.url), JSON.stringify({ meta: { built: new Date().toISOString(), source: "World Bank WDI API (api.worldbank.org/v2)", licence: "CC BY 4.0", indicator: `${INDICATOR} Net official development assistance received (current US$)` }, countries }));
console.log(`countries with data ${n}, aggregates/unknown skipped ${skippedAgg}, by year ${JSON.stringify(yrs)}`);
for (const k of ["UKR", "AFG", "EGY", "JOR", "YEM", "SYR"]) console.log(k, JSON.stringify(latest[k] ?? null));
