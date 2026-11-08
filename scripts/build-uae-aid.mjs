// Builds public/data/uae-aid.json: humanitarian funding from the UAE to each country, by year, as reported to the UN OCHA Financial Tracking Service (FTS).
// Source: OCHA FTS public API (api.hpc.tools), open data. It covers humanitarian flows that donors and agencies report to FTS, NOT all UAE foreign aid (development finance, loans, deposits and
// unreported bilateral aid are missing), so the app labels it "reported to FTS". Years run from 2019; the current year is partial.
// Usage: node scripts/build-uae-aid.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const API = "https://api.hpc.tools/v1/public";
const get = async (u) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { signal: AbortSignal.timeout(60_000) }); if (r.ok) return r.json(); } catch { /* retry */ } await new Promise((r) => setTimeout(r, 2000 * (i + 1))); } throw new Error("FTS request failed: " + u); };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const locs = (await get(`${API}/location`)).data; const iso = new Map(locs.filter((l) => l.iso3).map((l) => [l.id, l.iso3])); const uae = locs.find((l) => l.iso3 === "ARE")?.id; if (!uae) throw new Error("UAE location not found");
const thisYear = new Date().getFullYear(); const years = []; for (let y = 2019; y <= thisYear; y++) years.push(y);
const out = {}; const totals = {}; let unmatched = 0;
for (const y of years) {
  const j = await get(`${API}/fts/flow?year=${y}&filterby=sourceLocationID:${uae}&groupby=Location`); const r2 = j.data?.report2?.fundingTotals; if (!r2) continue; totals[y] = Math.round(j.data.report1?.fundingTotals?.total ?? r2.total ?? 0);
  for (const o of r2.objects ?? []) for (const d of o.singleFundingObjects ?? []) { if (d.direction !== "destination") continue; const code = iso.get(d.id) ?? (d.name === "Occupied Palestinian Territory" ? "PSE" : null); if (!code || !valid.has(code)) { unmatched += d.totalFunding ?? 0; continue; } (out[code] ??= {})[y] = Math.round(d.totalFunding ?? 0); }
  await new Promise((r) => setTimeout(r, 700));
}
const n = Object.keys(out).length; const prev = prevOf("uae-aid.json", (j) => Object.keys(j.countries).length); const last = years.at(-2) ?? years.at(-1);
if (n < 40 || (totals[last] ?? 0) < 1e8 || thin(n, prev, 0.8)) { console.error(`REFUSING TO WRITE: ${n} recipients, ${last} total ${totals[last]}`); process.exit(1); }
writeFileSync(new URL("../public/data/uae-aid.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), years, totals, source: { name: "UN OCHA Financial Tracking Service", url: "https://fts.unocha.org/", note: "Humanitarian funding flows from the UAE as reported to FTS (US$). Not all UAE foreign aid: development finance, loans, deposits and unreported bilateral aid are not included. The current year is partial and reports can be revised." }, countries: out }));
const top = Object.entries(out).map(([k, v]) => [k, v[last] ?? 0]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} $${(v / 1e6).toFixed(0)}m`).join(" ");
console.log("recipients", n, "| totals", JSON.stringify(totals), "| top", last, top, "| unmatched $", Math.round(unmatched / 1e6) + "m");
