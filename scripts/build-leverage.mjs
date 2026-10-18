// Builds public/data/leverage.json: how much the UAE and each partner depend on one another, from data the app already holds plus the partner's own total trade (World Bank).
// Two axes, each a 0-100 percentile among all partners: "they lean on the UAE" (UAE share of their trade, UAE investment stock as a share of their GDP) and "the UAE leans on them"
// (their share of UAE trade, their share of UAE investment abroad, their investment stock in the UAE as a share of the UAE's GDP). Percentiles describe position, not power.
// Usage: node scripts/build-leverage.mjs   (run after build-trade, build-investment and build-outlook)
import { readFileSync, writeFileSync } from "node:fs";
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json").filter((c) => c.iso3 !== "ARE").map((c) => c.iso3); const trade = D("trade.json"), inv = D("investment.json"), outlook = D("outlook.json");
const wb = async (code) => { const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=400&mrnev=1`, { signal: AbortSignal.timeout(40_000) }); if (!r.ok) throw new Error(code + " " + r.status); const m = {}; for (const x of (await r.json())[1] ?? []) if (x.countryiso3code && x.value != null && +x.date >= 2021) m[x.countryiso3code] = { v: x.value, y: +x.date }; return m; };
const [mx, mm] = await Promise.all([wb("TX.VAL.MRCH.CD.WT"), wb("TM.VAL.MRCH.CD.WT")]);
const ly = trade.lastYear; const worldRow = trade.world.a.find((r) => r[0] === ly); const worldTrade = worldRow ? worldRow[1] + worldRow[2] : null;
const uaeGdp = outlook.countries.ARE?.gdp?.[ly] ?? outlook.countries.ARE?.gdp?.[ly - 1]; // US$ m
const raw = {};
for (const c of countries) {
  const row = trade.countries[c]?.a.find((r) => r[0] === ly) ?? trade.countries[c]?.a.at(-1); const bil = row && row[0] >= ly - 1 ? row[1] + row[2] : null; // US$ m, UAE customs data, includes re-exports
  const pt = mx[c] && mm[c] ? (mx[c].v + mm[c].v) / 1e6 : null; const out = inv.countries[c]?.outward?.usd ?? null; const inn = inv.countries[c]?.inward?.usd ?? null; const gdp = outlook.countries[c]?.gdp?.[ly] ?? outlook.countries[c]?.gdp?.[ly - 1] ?? null;
  const r = { bilateral: bil, partnerTrade: pt, uaeSharePartnerTrade: bil != null && pt ? (bil / pt) * 100 : null, uaeInvPctGdp: out != null && gdp ? (out / (gdp * 1e6)) * 100 : null,
    shareUaeTrade: bil != null && worldTrade ? (bil / worldTrade) * 100 : null, shareUaeInvAbroad: out != null && inv.world?.usd ? (out / inv.world.usd) * 100 : null, theirInvPctUaeGdp: inn != null && uaeGdp ? (inn / (uaeGdp * 1e6)) * 100 : null };
  if (Object.values(r).some((v) => v != null)) raw[c] = r;
}
const pct = (key) => { const vals = Object.entries(raw).filter(([, r]) => r[key] != null && r[key] > 0).map(([c, r]) => [c, r[key]]).sort((a, b) => a[1] - b[1]); const n = vals.length; const m = {}; vals.forEach(([c], i) => { m[c] = n > 1 ? Math.round((i / (n - 1)) * 100) : 50; }); return m; };
const P = { a: pct("uaeSharePartnerTrade"), b: pct("uaeInvPctGdp"), c: pct("shareUaeTrade"), d: pct("shareUaeInvAbroad"), e: pct("theirInvPctUaeGdp") };
const mean = (xs) => { const v = xs.filter((x) => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
const out = {}; const HI = 60;
for (const [c, r] of Object.entries(raw)) {
  const theirs = mean([P.a[c], P.b[c]]), ours = mean([P.c[c], P.d[c], P.e[c]]); if (theirs == null && ours == null) continue;
  const quadrant = theirs == null || ours == null ? "partial" : theirs >= HI && ours >= HI ? "mutual" : theirs >= HI ? "uae-leverage" : ours >= HI ? "uae-exposed" : "light";
  out[c] = { theirs, ours, quadrant, raw: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? null : Math.round(v * 1000) / 1000])) };
}
const n = Object.keys(out).length; if (n < 100) { console.error("REFUSING TO WRITE: only", n, "countries"); process.exit(1); }
writeFileSync(new URL("../public/data/leverage.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), year: ly, threshold: HI, source: { name: "Geo Desk composite: UAE customs trade (IMF IMTS), IMF investment positions (mirror data), IMF outlook GDP, World Bank merchandise trade", note: "Percentiles among all partners with data. Bilateral trade is UAE-reported and includes re-exports, while the partner's total trade is the World Bank's merchandise figure, so the UAE share of a partner's trade is approximate and can exceed what the partner itself reports. Investment positions are mirror data. A high percentile means more dependence than most partners, not more power." }, countries: out }));
const cnt = {}; for (const v of Object.values(out)) cnt[v.quadrant] = (cnt[v.quadrant] ?? 0) + 1; console.log("countries", n, JSON.stringify(cnt));
for (const k of ["IND", "SAU", "EGY", "PAK", "CHN", "GBR"]) console.log(k, JSON.stringify(out[k]));
