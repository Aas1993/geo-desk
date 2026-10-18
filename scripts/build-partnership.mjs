// Builds public/data/partnership.json: the UAE Partnership Index, a 0-100 score of how closely each country is tied to the UAE, from datasets already in the repo.
// Transparent by design: six components, fixed weights, every raw value kept so the app can show exactly why a country scores what it does. Scores are percentile ranks
// among all countries (a country with no data on a component scores 0 there), except UN alignment, which is scaled linearly between the least and most aligned country.
// This is an analytical convenience, not an official assessment: it measures activity and ties, not friendship, and says nothing about direction of influence.
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json").filter((c) => c.iso3 !== "ARE").map((c) => c.iso3);
const trade = D("trade.json"), visits = D("visits.json"), agr = D("agreements.json"), fl = D("flights.json"), inv = D("investment.json"), ms = D("missions.json"), un = D("un/agree/ARE.json");
const W = { trade: 25, engagement: 20, agreements: 15, connectivity: 15, investment: 15, alignment: 10 };
const cutoff = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10);

const raw = {}; for (const c of countries) raw[c] = {};
for (const c of countries) { const t = trade.countries[c]?.a?.at(-1); raw[c].trade = t && t[0] >= trade.lastYear - 1 ? t[1] + t[2] : 0; } // US$ m, exports + imports, latest year; a partner whose latest row is older than the year before last has no comparable figure and scores 0
const KIND_W = { message: 0.25, call: 0.6, meeting: 1, visit: 1, signing: 1 }; // a condolence or congratulation cable is not a meeting
for (const v of visits.items) if (v.d >= cutoff) for (const c of v.c) if (raw[c]) raw[c].engagement = (raw[c].engagement ?? 0) + v.l * (KIND_W[v.k] ?? 1); // senior- and kind-weighted engagements, last 12 months
for (const c of countries) {
  const a = agr.countries[c]; const n = a ? new Set([...a.mofa, ...a.moft].map((x) => x.t.toLowerCase())).size : 0; const cepa = a?.cepa?.status === "in-force" ? 12 : a?.cepa ? 6 : 0; raw[c].agreements = n + cepa;
  const f = fl.countries[c]; const emb = (ms.countries[c] ?? []).some((m) => m.type === "embassy"); raw[c].flights = f ? f.counts.active + f.counts.seasonal : 0; raw[c].embassy = emb ? 1 : 0;
  raw[c].investment = inv.countries[c]?.outward?.usd ?? 0; const u = un[c] ?? (c === "SRB" ? un.YUG : undefined); /* Voeten codes Serbia as YUG */ raw[c].alignment = typeof u === "number" ? u : null;
}
const pct = (key, get = (r) => r[key] ?? 0) => { const vals = countries.map((c) => get(raw[c])); const sorted = [...vals].sort((a, b) => a - b); const n = vals.length;
  return Object.fromEntries(countries.map((c, i) => { const v = vals[i]; if (!(v > 0)) return [c, 0]; const lower = sorted.filter((x) => x < v).length; return [c, Math.round((lower / (n - 1)) * 100)]; })); };
const sTrade = pct("trade"), sEng = pct("engagement"), sAgr = pct("agreements"), sInv = pct("investment"), sFl = pct("flights");
const al = countries.map((c) => raw[c].alignment).filter((x) => x != null); const lo = Math.min(...al), hi = Math.max(...al);
const out = {};
for (const c of countries) {
  const connectivity = Math.round(0.7 * sFl[c] + 0.3 * (raw[c].embassy ? 100 : 0)); const alignment = raw[c].alignment == null ? 0 : Math.round(((raw[c].alignment - lo) / (hi - lo || 1)) * 100);
  const comp = { trade: sTrade[c], engagement: sEng[c], agreements: sAgr[c], connectivity, investment: sInv[c], alignment };
  const score = Math.round(Object.entries(comp).reduce((s, [k, v]) => s + (W[k] * v) / 100, 0));
  out[c] = { score, c: comp, raw: { trade: raw[c].trade, engagement: Math.round((raw[c].engagement ?? 0) * 10) / 10, agreements: raw[c].agreements, flights: raw[c].flights, embassy: raw[c].embassy, investment: raw[c].investment, alignment: raw[c].alignment } };
}
const ranked = Object.entries(out).sort((a, b) => b[1].score - a[1].score || b[1].raw.trade - a[1].raw.trade); ranked.forEach(([k]) => { out[k].rank = 1 + ranked.filter(([, v]) => v.score > out[k].score).length; }); // equal scores share a rank
if (ranked[0][1].score < 40 || ranked.filter(([, v]) => v.score > 0).length < 100) { console.error("REFUSING TO WRITE: scores look wrong"); process.exit(1); }
writeFileSync(new URL("../public/data/partnership.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), weights: W, n: countries.length, alignmentRange: [lo, hi], note: "Percentile-based composite of trade, engagement, agreements, connectivity, investment and UN voting alignment. Measures ties and activity, not friendship.", inputs: { tradeYear: trade.lastYear, engagementSince: cutoff, flightsBuilt: fl.built.slice(0, 10), visitsBuilt: visits.built.slice(0, 10) }, countries: out }));
console.log("top 15:", ranked.slice(0, 15).map(([k, v]) => `${v.rank}.${k} ${v.score}`).join("  ")); console.log("bottom of scored:", ranked.filter(([, v]) => v.score > 0).slice(-5).map(([k, v]) => `${k} ${v.score}`).join(" "));
console.log("IND components:", JSON.stringify(out.IND.c), "| SAU:", JSON.stringify(out.SAU.c), "| IRN:", JSON.stringify(out.IRN.c));
