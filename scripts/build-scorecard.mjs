// Builds public/data/scorecard.json: one country scorecard per partner across seven aspects (political, economic, financial, social, friendliness, security, leverage),
// every part a 0-100 percentile among all countries that have data, so nothing is scored against an invented standard. Higher is always better for the UAE.
// A dimension is the mean of the parts that exist; the overall score is the weighted mean of the dimensions that exist, and coverage says how much of the weight had data.
// Usage: node scripts/build-scorecard.mjs   (run after the other builders: it only reads the files they write)
import { readFileSync, writeFileSync } from "node:fs";
const D = (f) => { try { return JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8")); } catch { return null; } };
const countries = D("countries.json").filter((c) => c.iso3 !== "ARE").map((c) => c.iso3);
const outlook = D("outlook.json"), gov = D("governance.json"), part = D("partnership.json"), lev = D("leverage.json"), tmp = D("temperature.json"), tone = D("media-tone.json"), aid = D("uae-aid.json"), deals = D("deals.json"), sanc = D("sanctions.json"), rw = D("ransomware.json"), inv = D("investment.json");
for (const [k, v] of Object.entries({ outlook, gov, part, lev, sanc })) if (!v) { console.error(`REFUSING TO WRITE: ${k} data missing`); process.exit(1); }
const thisYear = new Date().getFullYear();

/** Percentile of each value among all values given (0 = lowest, 100 = highest); ties share the mean rank. */
const percentiles = (raw) => {
  const e = Object.entries(raw).filter(([, v]) => v != null && Number.isFinite(v)).sort((a, b) => a[1] - b[1]); const n = e.length; const m = {}; if (n < 20) return m; // too few to rank honestly
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && e[j + 1][1] === e[i][1]) j++; const p = Math.round(((i + j) / 2 / (n - 1)) * 100); for (let k = i; k <= j; k++) m[e[k][0]] = p; i = j + 1; }
  return m;
};
const pick = (f) => Object.fromEntries(countries.map((c) => [c, f(c)]));
const ol = (c, k, y) => outlook.countries[c]?.[k]?.[y] ?? null;
const aidYear = aid ? aid.years[aid.years.length >= 2 ? aid.years.length - 2 : 0] : null;
const dealN = Object.fromEntries(countries.map((c) => [c, 0])); for (const d of deals?.items ?? []) for (const c of d.c ?? []) if (c in dealN) dealN[c]++;
const raw = {
  pv: pick((c) => gov.countries[c]?.pv ?? null), ge: pick((c) => gov.countries[c]?.ge ?? null), rl: pick((c) => gov.countries[c]?.rl ?? null), rq: pick((c) => gov.countries[c]?.rq ?? null), va: pick((c) => gov.countries[c]?.va ?? null),
  growth: pick((c) => ol(c, "growth", thisYear)), infl: pick((c) => { const v = ol(c, "inflation", thisYear); return v == null ? null : -Math.min(v, 100); }), gdp: pick((c) => { const v = ol(c, "gdp", thisYear - 1) ?? ol(c, "gdp", thisYear - 2); return v && v > 0 ? Math.log(v) : null; }),
  debt: pick((c) => { const v = ol(c, "debt", thisYear); return v == null ? null : -v; }), ca: pick((c) => ol(c, "ca", thisYear)),
  trade: pick((c) => part.countries[c]?.c.trade ?? null), invest: pick((c) => (part.countries[c]?.raw.investment > 0 ? part.countries[c].c.investment : null)), deals: pick((c) => dealN[c]),
  connect: pick((c) => part.countries[c]?.c.connectivity ?? null), aid: pick((c) => (aid?.countries[c]?.[aidYear] > 0 ? aid.countries[c][aidYear] : null)),
  temp: pick((c) => tmp?.countries[c]?.g ?? null), tone: pick((c) => tone?.countries[c]?.avg ?? null), align: pick((c) => part.countries[c]?.c.alignment ?? null), engage: pick((c) => part.countries[c]?.c.engagement ?? null), agree: pick((c) => part.countries[c]?.c.agreements ?? null),
  sanc: pick((c) => -Math.log1p((sanc.countries[c]?.ofac ?? 0) + (sanc.countries[c]?.un ?? 0))), cyber: pick((c) => (rw?.countries ? -Math.log1p(rw.countries[c]?.n90 ?? 0) : null)),
  lev: pick((c) => { const l = lev.countries[c]; return l?.theirs != null && l?.ours != null ? l.theirs - l.ours : null; }),
};
const direct = new Set(["pv", "ge", "rl", "rq", "va", "trade", "connect", "align", "engage", "agree", "invest"]); // already 0-100 percentile-like scores from earlier datasets
const P = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, direct.has(k) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x != null).map(([c, x]) => [c, Math.round(x)])) : percentiles(v)]));
// the leverage part is a difference of two percentiles, mapped to 0-100 around the middle
const levScore = (c) => (raw.lev[c] == null ? null : Math.round(Math.max(0, Math.min(100, (raw.lev[c] + 100) / 2))));
const DIMS = [
  { key: "friendliness", w: 25, parts: ["temp", "tone", "align", "engage", "agree"] },
  { key: "political", w: 15, parts: ["pv", "ge", "rl"] },
  { key: "economic", w: 15, parts: ["growth", "infl", "gdp", "trade"] },
  { key: "financial", w: 10, parts: ["debt", "ca", "rq", "invest", "deals"] },
  { key: "social", w: 10, parts: ["connect", "aid", "va"] },
  { key: "security", w: 10, parts: ["sanc", "cyber"] },
  { key: "leverage", w: 15, parts: ["lev"] },
];
const mean = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const tier = (s) => (s >= 75 ? "strategic" : s >= 60 ? "strong" : s >= 45 ? "mixed" : s >= 30 ? "weak" : "thin");
const out = {};
for (const c of countries) {
  const dims = {}; let wSum = 0, wAll = 0, acc = 0;
  for (const d of DIMS) {
    const parts = d.parts.map((k) => ({ k, v: raw[k][c], s: k === "lev" ? levScore(c) : P[k]?.[c] ?? null })).filter((p) => p.s != null);
    const score = mean(parts.map((p) => p.s)); wAll += d.w; if (score != null) { wSum += d.w; acc += score * d.w; }
    dims[d.key] = { score, n: parts.length, of: d.parts.length, parts: parts.map((p) => ({ k: p.k, s: p.s, v: p.v == null ? null : Math.round(p.v * 100) / 100 })) };
  }
  if (!wSum) continue; const coverage = Math.round((wSum / wAll) * 100); const overall = Math.round(acc / wSum);
  out[c] = { overall, tier: tier(overall), coverage, dims };
}
const n = Object.keys(out).length; if (n < 120) { console.error(`REFUSING TO WRITE: only ${n} countries scored`); process.exit(1); }
writeFileSync(new URL("../public/data/scorecard.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), n, weights: Object.fromEntries(DIMS.map((d) => [d.key, d.w])), parts: Object.fromEntries(DIMS.map((d) => [d.key, d.parts])), note: "Every part is a 0-100 percentile among countries with data (higher is better for the UAE); the scorecard is an analytical aid, not an official assessment.", countries: out }));
const top = Object.entries(out).sort((a, b) => b[1].overall - a[1].overall).slice(0, 8).map(([c, v]) => `${c} ${v.overall}`); const avgCov = Math.round(Object.values(out).reduce((s, v) => s + v.coverage, 0) / n);
console.log(`scorecard: ${n} countries, mean coverage ${avgCov}% | top: ${top.join(", ")} | EGY ${JSON.stringify(out.EGY && { o: out.EGY.overall, c: out.EGY.coverage, d: Object.fromEntries(Object.entries(out.EGY.dims).map(([k, v]) => [k, v.score])) })}`);
