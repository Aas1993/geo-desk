// Builds public/data/scorecard.json: one country scorecard per partner across eleven aspects, in three groups:
//   the relationship (political friends, business friends, strategic value, UAE leverage),
//   the country (political, economic, financial, social, security and risk),
//   weight in the world (UN influence, global influence).
// Every part is a 0-100 percentile among all countries that have data (or a plain 0/100 flag where it is a yes/no fact), so nothing is scored against an invented standard. Higher is always better for the UAE.
// A dimension is the mean of the parts that exist; the overall score is the weighted mean of the dimensions that exist, and coverage says how much of the weight had data.
// Usage: node scripts/build-scorecard.mjs   (run after the other builders: it only reads the files they write)
import { readFileSync, writeFileSync } from "node:fs";
const D = (f) => { try { return JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8")); } catch { return null; } };
const cs = D("countries.json"); const countries = cs.filter((c) => c.iso3 !== "ARE").map((c) => c.iso3); const byIso = Object.fromEntries(cs.map((c) => [c.iso3, c]));
const outlook = D("outlook.json"), gov = D("governance.json"), part = D("partnership.json"), lev = D("leverage.json"), tmp = D("temperature.json"), tone = D("media-tone.json"), aid = D("uae-aid.json"), deals = D("deals.json"), sanc = D("sanctions.json"), rw = D("ransomware.json"), ag = D("agreements.json"), orgs = D("orgs.json"), rv = D("rivals.json");
for (const [k, v] of Object.entries({ outlook, gov, part, lev, sanc, ag, orgs })) if (!v) { console.error(`REFUSING TO WRITE: ${k} data missing`); process.exit(1); }
const thisYear = new Date().getFullYear(); const O = orgs.orgs;

/** Percentile of each value among all values given (0 = lowest, 100 = highest); ties share the mean rank. */
const percentiles = (raw) => {
  const e = Object.entries(raw).filter(([, v]) => v != null && Number.isFinite(v)).sort((a, b) => a[1] - b[1]); const n = e.length; const m = {}; if (n < 20) return m; // too few to rank honestly
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && e[j + 1][1] === e[i][1]) j++; const p = Math.round(((i + j) / 2 / (n - 1)) * 100); for (let k = i; k <= j; k++) m[e[k][0]] = p; i = j + 1; }
  return m;
};
const pick = (f) => Object.fromEntries(countries.map((c) => [c, f(c)]));
const ol = (c, k, y) => outlook.countries[c]?.[k]?.[y] ?? null;
const gdpOf = (c) => ol(c, "gdp", thisYear - 1) ?? ol(c, "gdp", thisYear - 2);
const aidYear = aid ? aid.years[aid.years.length >= 2 ? aid.years.length - 2 : 0] : null;
const dealN = Object.fromEntries(countries.map((c) => [c, 0])), logiN = { ...dealN }; for (const d of deals?.items ?? []) for (const c of d.c ?? []) if (c in dealN) { dealN[c]++; if (/port|logist|shipping|aviation|transport/i.test(d.sector ?? "")) logiN[c]++; }
const mem = (c) => Object.keys(O).filter((k) => O[k].includes(c));
// UN-system bodies almost every state belongs to say nothing about friendship; the clubs the UAE belongs to do
const SYSTEM = new Set(["unga", "who", "itu", "wto", "opcw", "icj", "icc", "unesco", "fao", "ilo", "imo", "icao", "wipo", "imf", "isa", "itlos", "wbg", "npt", "iaea", "ecosoc"]);
const uaeClubs = Object.keys(O).filter((k) => !SYSTEM.has(k) && O[k].includes("ARE"));
const BLOCS = ["g7", "g20", "brics", "nato", "eu", "sco", "oic", "au", "arableague", "asean", "opec", "opecplus", "gcc", "oecd", "commonwealth", "eaeu"]; // forums that carry votes or markets
const P5 = new Set(["CHN", "FRA", "RUS", "GBR", "USA"]); const GULFSIDE = new Set(["SAU", "OMN", "QAT", "KWT", "BHR", "IRN", "IRQ", "YEM"]);
const cepa = { "in-force": 100, signed: 75, concluded: 60 };
const raw = {
  pv: pick((c) => gov.countries[c]?.pv ?? null), ge: pick((c) => gov.countries[c]?.ge ?? null), rl: pick((c) => gov.countries[c]?.rl ?? null), rq: pick((c) => gov.countries[c]?.rq ?? null), cc: pick((c) => gov.countries[c]?.cc ?? null), va: pick((c) => gov.countries[c]?.va ?? null),
  growth: pick((c) => ol(c, "growth", thisYear)), infl: pick((c) => { const v = ol(c, "inflation", thisYear); return v == null ? null : -Math.min(v, 100); }), gdp: pick((c) => { const v = gdpOf(c); return v && v > 0 ? Math.log(v) : null; }),
  gdppc: pick((c) => { const v = gdpOf(c), p = byIso[c]?.population?.v; return v && p ? Math.log((v * 1e6) / p) : null; }), pop: pick((c) => { const p = byIso[c]?.population?.v; return p ? Math.log(p) : null; }),
  debt: pick((c) => { const v = ol(c, "debt", thisYear); return v == null ? null : -v; }), ca: pick((c) => ol(c, "ca", thisYear)),
  trade: pick((c) => part.countries[c]?.c.trade ?? null), invest: pick((c) => (part.countries[c]?.raw.investment > 0 ? part.countries[c].c.investment : null)), deals: pick((c) => dealN[c]), cepa: pick((c) => cepa[ag.countries[c]?.cepa?.status] ?? 0),
  theirinv: pick((c) => (lev.countries[c]?.raw?.theirInvPctUaeGdp > 0 ? lev.countries[c].raw.theirInvPctUaeGdp : null)),
  connect: pick((c) => part.countries[c]?.c.connectivity ?? null), aid: pick((c) => (aid?.countries[c]?.[aidYear] > 0 ? aid.countries[c][aidYear] : null)),
  temp: pick((c) => tmp?.countries[c]?.g ?? null), tone: pick((c) => tone?.countries[c]?.avg ?? null), align: pick((c) => part.countries[c]?.c.alignment ?? null), engage: pick((c) => part.countries[c]?.c.engagement ?? null), agree: pick((c) => part.countries[c]?.c.agreements ?? null),
  shared: pick((c) => mem(c).filter((k) => uaeClubs.includes(k)).length),
  // exposure is counted per US$ billion of GDP: big economies host more listed entities and more incidents simply by being big
  sanc: pick((c) => { const g = gdpOf(c); return g ? -Math.log1p(((sanc.countries[c]?.ofac ?? 0) + (sanc.countries[c]?.un ?? 0)) / (g / 1000)) : null; }), cyber: pick((c) => { const g = gdpOf(c); return rw?.countries && g ? -Math.log1p((rw.countries[c]?.n90 ?? 0) / (g / 1000)) : null; }),
  lev: pick((c) => { const l = lev.countries[c]; return l?.theirs != null && l?.ours != null ? l.theirs - l.ours : null; }),
  // strategic value
  share: pick((c) => lev.countries[c]?.raw?.shareUaeTrade ?? null), logi: pick((c) => logiN[c]), near: pick((c) => ((byIso[c]?.borders ?? []).some((b) => GULFSIDE.has(b)) || GULFSIDE.has(c) ? 100 : 0)), energy: pick((c) => (O.opec.includes(c) || O.opecplus.includes(c) ? 100 : 0)),
  // UN and global influence
  unsc: pick((c) => (P5.has(c) ? 100 : O.unsc.includes(c) ? 65 : 0)), orgs: pick((c) => mem(c).length), blocs: pick((c) => mem(c).filter((k) => BLOCS.includes(k)).length), tradetot: pick((c) => (rv?.countries[c]?.total > 0 ? Math.log(rv.countries[c].total) : null)),
  forum: pick((c) => Math.min(100, 34 * ["g7", "g20", "brics", "nato", "eu", "sco"].filter((k) => O[k].includes(c)).length)),
};
const direct = new Set(["pv", "ge", "rl", "rq", "cc", "va", "trade", "connect", "align", "engage", "agree", "invest", "cepa", "near", "energy", "unsc", "forum"]); // already 0-100 scores (earlier percentiles or yes/no flags)
const P = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, direct.has(k) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x != null).map(([c, x]) => [c, Math.round(x)])) : percentiles(v)]));
// the leverage part is a difference of two percentiles, mapped to 0-100 around the middle
const levScore = (c) => (raw.lev[c] == null ? null : Math.round(Math.max(0, Math.min(100, (raw.lev[c] + 100) / 2))));
const DIMS = [
  { key: "polfriends", group: "relationship", w: 14, parts: ["temp", "tone", "align", "engage", "agree", "shared"] },
  { key: "bizfriends", group: "relationship", w: 12, parts: ["trade", "invest", "deals", "cepa", "theirinv"] },
  { key: "strategic", group: "relationship", w: 9, parts: ["share", "logi", "near", "energy"] },
  { key: "leverage", group: "relationship", w: 12, parts: ["lev"] },
  { key: "political", group: "country", w: 8, parts: ["pv", "ge", "rl"] },
  { key: "economic", group: "country", w: 8, parts: ["growth", "infl", "gdp", "gdppc"] },
  { key: "financial", group: "country", w: 7, parts: ["debt", "ca", "rq", "cc"] },
  { key: "social", group: "country", w: 5, parts: ["connect", "aid", "va"] },
  { key: "security", group: "country", w: 7, parts: ["sanc", "cyber"] },
  { key: "uninfluence", group: "world", w: 8, parts: ["unsc", "orgs", "blocs"] },
  { key: "global", group: "world", w: 10, parts: ["gdp", "pop", "tradetot", "forum"] },
];
if (DIMS.reduce((s, d) => s + d.w, 0) !== 100) throw new Error("weights must sum to 100");
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
writeFileSync(new URL("../public/data/scorecard.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), n, weights: Object.fromEntries(DIMS.map((d) => [d.key, d.w])), groups: Object.fromEntries(DIMS.map((d) => [d.key, d.group])), parts: Object.fromEntries(DIMS.map((d) => [d.key, d.parts])), uaeClubs, note: "Every part is a 0-100 percentile among countries with data, or a 0/100 yes-no flag (higher is better for the UAE); the scorecard is an analytical aid, not an official assessment.", countries: out }));
const top = Object.entries(out).sort((a, b) => b[1].overall - a[1].overall).slice(0, 8).map(([c, v]) => `${c} ${v.overall}`); const avgCov = Math.round(Object.values(out).reduce((s, v) => s + v.coverage, 0) / n);
const dd = (c) => out[c] && JSON.stringify({ o: out[c].overall, c: out[c].coverage, d: Object.fromEntries(Object.entries(out[c].dims).map(([k, v]) => [k, v.score])) });
console.log(`scorecard: ${n} countries, mean coverage ${avgCov}%, UAE clubs ${uaeClubs.join(",")} | top: ${top.join(", ")}`); for (const c of ["EGY", "SAU", "CHN", "SYR", "PAK"]) console.log(c, dd(c));
