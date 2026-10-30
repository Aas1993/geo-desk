// Builds public/data/fin-sources.json: financial conditions read from the IMF and the BIS, beside the World Bank figures the Deep view's Financial Conditions tab already shows.
// The World Bank series is annual and a year or more behind (the UAE's bank ratios stop at 2024). The IMF holds the UAE's banking balance sheet to the first quarter of 2026, and the BIS holds a monthly real effective exchange rate that neither the World Bank nor the IMF publishes for the UAE.
// Rules: only figures a source returned are stored; ratios are derived from the IMF's reported balance-sheet items with the IMF's own FSI definitions (stated in `formula`) and nothing is estimated; what a source does not hold for a country stays a gap and is listed under `unavailable`.
// Usage: node scripts/build-fin-sources.mjs            (FS_CACHE=<dir> keeps raw responses so a re-run does not hit the sources again)
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json"); const valid = new Set(countries.map((c) => c.iso3)); const ISO2 = new Map(countries.map((c) => [c.iso2, c.iso3]));
const CACHE = process.env.FS_CACHE; if (CACHE) mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, { tries = 4, timeout = 240_000 } = {}) {
  const key = CACHE ? path.join(CACHE, createHash("sha1").update(url).digest("hex")) : null; if (key && existsSync(key)) return readFileSync(key, "utf8");
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) });
    if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep(4000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`${url.slice(0, 110)} ${r.status}`); const t = await r.text(); if (key) writeFileSync(key, t); return t;
  }
  throw new Error(`${url.slice(0, 110)} unreachable`);
}
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const sources = {}; const out = {}; const src = (id, o) => (sources[id] = { id, status: "ok", rows: 0, ...o });
const put = (iso, k, v) => { if (!valid.has(iso)) return false; (out[iso] ??= {})[k] = v; return true; };
const attempt = async (id, fn) => { try { await fn(); } catch (e) { console.error(`[${id}] ${e.message}`); if (sources[id]) { sources[id].status = "failed"; sources[id].note = (sources[id].note ? sources[id].note + " " : "") + `This run could not read it: ${e.message.slice(0, 90)}.`; } } };
const series = (x) => [...x.matchAll(/<Series ([^>]*?)>(.*?)<\/Series>/gs)].map(([, a, b]) => ({ at: Object.fromEntries([...a.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]])), obs: [...b.matchAll(/<Obs TIME_PERIOD="([^"]*)"([^>]*)\/>/g)].map((m) => [m[1], m[2].match(/OBS_VALUE="([^"]*)"/)?.[1]]).filter((o) => o[1] != null).map(([t, v]) => [t, Number(v)]) }));
const csv = (t) => { const [h, ...ls] = t.trim().split("\n"); const cols = h.split(","); return ls.map((l) => { const c = l.split(","); return Object.fromEntries(cols.map((k, i) => [k, c[i]])); }); };
const IMF = "https://api.imf.org/external/sdmx/2.1/data/IMF.STA";
/** Year-on-year change of the latest monthly value against the same month a year earlier. */
const latestYoy = (obs) => { const m = new Map(obs); const ps = [...m.keys()].sort(); const p = ps[ps.length - 1]; if (!p) return null; const prev = p.replace(/^(\d{4})/, (y) => String(+y - 1)); return { p, v: round(m.get(p)), ...(m.get(prev) ? { yoy: round((m.get(p) / m.get(prev) - 1) * 100, 1) } : {}) }; };

// ───────── IMF Financial Soundness Indicators: bank balance sheet, income statement and memorandum items (FSIBSIS) ─────────
src("imf_fsi", { name: "IMF Financial Soundness Indicators (balance sheet and income items)", publisher: "IMF", basis: "deposit-taking sector, country-reported", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:FSIBSIS", note: "The IMF publishes the underlying balance-sheet and income items; the ratios here are Geo Desk's division of them using the IMF's FSI definitions. The World Bank's bank indicators come from this same IMF dataset, a year or more later.", formula: { capAssets: "capital and reserves ÷ total assets", regCap: "total regulatory capital ÷ risk-weighted assets", t1: "Tier 1 capital less deductions ÷ risk-weighted assets", roa: "annualised net income before tax ÷ average total assets", liq: "liquid assets ÷ total assets", npl: "non-performing loans ÷ loans after specific provisions (a little above the official ratio, whose denominator is gross loans: the gross amount is not published)" } });
const IND = ["KR", "TA_A", "TREGK", "RWA", "T1KXCSD", "ANIBT", "ATA", "LIQA", "NPF4", "F4ASP_A"];
const RATIO = { capAssets: ["KR", "TA_A"], regCap: ["TREGK", "RWA"], t1: ["T1KXCSD", "RWA"], roa: ["ANIBT", "ATA"], liq: ["LIQA", "TA_A"], npl: ["NPF4", "F4ASP_A"] };
await attempt("imf_fsi", async () => {
  const key = (f, from) => `${IMF},FSIBSIS/*.S12CFSI.${IND.map((i) => i + "_XDC").join("+")}.${f}?startPeriod=${from}`;
  const by = {}; for (const [f, from] of [["A", "2021"], ["Q", "2024-Q1"]]) for (const s of series(await get(key(f, from)))) for (const [t, v] of s.obs) (((by[s.at.COUNTRY] ??= {})[f] ??= {})[t] ??= {})[s.at.INDICATOR.replace(/_XDC$/, "")] = v;
  for (const [iso, fr] of Object.entries(by)) { const o = {};
    for (const [k, [n, d]] of Object.entries(RATIO)) for (const f of ["A", "Q"]) { const pts = Object.entries(fr[f] ?? {}).filter(([, x]) => x[n] != null && x[d] > 0).map(([t, x]) => [f === "A" ? +t : t, round((x[n] / x[d]) * 100, 2)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)).filter(([, v]) => Math.abs(v) <= (k === "npl" || k === "roa" ? 60 : 100));
      if (pts.length) ((o[k] ??= {})[f === "A" ? "a" : "q"] = pts); }
    const nplA = Object.entries(fr.A ?? {}).filter(([, x]) => x.NPF4 != null).map(([t, x]) => [+t, x.NPF4]).sort((a, b) => a[0] - b[0]); if (nplA.length) o.nplLevel = nplA.map(([t, v]) => [t, v]);
    if (Object.keys(o).length && put(iso, "fsi", o)) sources.imf_fsi.rows++; }
});

// ───────── IMF consumer prices (headline, annual change) ─────────
src("imf_cpi", { name: "IMF Consumer Price Index (headline, annual % change)", publisher: "IMF", basis: "national statistical office data, as sent to the IMF", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:CPI", note: "The World Bank's inflation series is also compiled from IMF and national sources, so this is a check on dating and rounding, not a wholly separate measurement." });
await attempt("imf_cpi", async () => { for (const s of series(await get(`${IMF},CPI/*.CPI._T.POP_PCH_PA_PT.A?startPeriod=2022`))) { const last = s.obs[s.obs.length - 1]; if (last && put(s.at.COUNTRY, "cpi", { y: +last[0], v: round(last[1]) })) sources.imf_cpi.rows++; } });

// ───────── IMF exchange rates (national currency per US$, annual average) ─────────
src("imf_er", { name: "IMF Exchange Rates (national currency per US$, period average)", publisher: "IMF", basis: "annual average official rate", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:ER", note: "The World Bank's official exchange rate is also an IMF-based series, so agreement here is expected." });
await attempt("imf_er", async () => { for (const s of series(await get(`${IMF},ER/*.XDC_USD.PA_RT.A?startPeriod=2022`))) { const last = s.obs[s.obs.length - 1]; if (last && put(s.at.COUNTRY, "fx", { y: +last[0], v: round(last[1], 4) })) sources.imf_er.rows++; } });

// ───────── IMF nominal effective exchange rate ─────────
src("imf_eer", { name: "IMF Effective Exchange Rates (index, 2010 = 100)", publisher: "IMF", basis: "trade-weighted index against all partners: nominal, and real (consumer-price-adjusted) where published", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:EER", note: "For the UAE the IMF publishes the nominal index only; it holds no real index for it." });
await attempt("imf_eer", async () => { for (const s of series(await get(`${IMF},EER/*.NEER_IX_RY2010_ACW+REER_IX_RY2010_ACW_RCPI.M?startPeriod=2025-M01`))) { const o = latestYoy(s.obs); if (o && put(s.at.COUNTRY, s.at.INDICATOR.startsWith("REER") ? "reerImf" : "neerImf", o)) sources.imf_eer.rows++; } });

// ───────── BIS effective exchange rates and policy rates ─────────
const BIS = "https://stats.bis.org/api/v2/data/dataflow/BIS";
src("bis_eer", { name: "BIS Effective Exchange Rates (broad basket of 64 economies, 2020 = 100)", publisher: "BIS", basis: "nominal and real (consumer-price-adjusted) trade-weighted indices", kind: "primary", url: "https://data.bis.org/topics/EER", note: "The BIS computes its own weights and price deflators, so its nominal index can differ from the IMF's; the real index is the one neither the World Bank nor the IMF holds for the UAE." });
await attempt("bis_eer", async () => { const rows = csv(await get(`${BIS}/WS_EER/1.0/M.*.B.*?lastNObservations=14&format=csv`)); const by = {}; for (const r of rows) { const iso = ISO2.get(r.REF_AREA); if (!iso || !r.OBS_VALUE) continue; ((by[iso] ??= {})[r.EER_TYPE] ??= []).push([r.TIME_PERIOD, Number(r.OBS_VALUE)]); }
  for (const [iso, t] of Object.entries(by)) { const n = t.N && latestYoy(t.N), r = t.R && latestYoy(t.R); if (n) put(iso, "neerBis", n); if (r) put(iso, "reerBis", r); if (n || r) sources.bis_eer.rows++; } });
src("bis_cbpol", { name: "BIS Central bank policy rates", publisher: "BIS", basis: "official policy rate, end of month, as reported by each central bank", kind: "primary", url: "https://data.bis.org/topics/CBPOL", note: "Covers about forty central banks; the Central Bank of the UAE is not among them." });
await attempt("bis_cbpol", async () => { const rows = csv(await get(`${BIS}/WS_CBPOL/1.0/M.*?lastNObservations=2&format=csv`)); const by = {}; for (const r of rows) { const iso = ISO2.get(r.REF_AREA); if (iso && r.OBS_VALUE) (by[iso] ??= []).push([r.TIME_PERIOD, Number(r.OBS_VALUE)]); }
  for (const [iso, t] of Object.entries(by)) { t.sort((a, b) => (a[0] < b[0] ? -1 : 1)); const l = t[t.length - 1]; if (put(iso, "policyBis", { p: l[0], v: round(l[1]) })) sources.bis_cbpol.rows++; } });

// ───────── looked for and not usable ─────────
const unavailable = [
  { name: "IMF International Reserves and Foreign Currency Liquidity (IRFCL)", url: "https://data.imf.org/en/datasets/IMF.STA:IRFCL", measure: "reserves", reason: "The IMF holds no series for the UAE (the UAE does not publish the template), so reserves stay with the World Bank's figure alone." },
  { name: "IMF Monetary and Financial Statistics: interest rates (MFS_IR)", url: "https://data.imf.org/en/datasets/IMF.STA:MFS_IR", measure: "rates", reason: "The query for the UAE returned no series, so lending, deposit and policy rates are not connected." },
  { name: "BIS central bank policy rates and credit to the private non-financial sector", url: "https://data.bis.org/topics/CBPOL", measure: "rates", reason: "The BIS holds no UAE series for either: its policy-rate table covers about forty central banks and its credit table about forty-five economies, and the UAE is in neither." },
  { name: "IMF real effective exchange rate", url: "https://data.imf.org/en/datasets/IMF.STA:EER", measure: "reer", reason: "The IMF publishes a real index for most countries but only a nominal one for the UAE. The BIS real index above is the only real effective rate we found for the UAE." },
  { name: "IMF Financial Soundness Indicators, published ratios (core set)", url: "https://data.imf.org/en/datasets/IMF.STA:FSIBSIS", measure: "banks", reason: "The IMF's open API exposes the balance-sheet items but not the finished ratios, so the ratios shown are derived by dividing those items; the non-performing-loan ratio uses a net denominator and runs slightly above the official one." },
  { name: "Central Bank of the UAE statistical bulletin", url: "https://www.centralbank.ae/en/our-operations/statistics-and-research/", measure: "banks", reason: "Not attempted: published as PDF and Excel bulletins with no open API, so it is not read by script." },
];
const n = Object.keys(out).length, uae = out.ARE ?? {};
if (sources.imf_fsi.status !== "ok" || sources.bis_eer.status !== "ok" || n < 100 || !uae.fsi || !uae.reerBis) { console.error(`REFUSING TO WRITE: ${n} countries, UAE ${Object.keys(uae).join(",")}`); process.exit(1); }
writeFileSync(new URL("../public/data/fin-sources.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), sources, unavailable, countries: out }));
console.log("countries", n, "| sources", Object.values(sources).map((s) => `${s.id} ${s.status} ${s.rows}`).join(", "), "| ARE", JSON.stringify({ ...uae, fsi: Object.fromEntries(Object.entries(uae.fsi ?? {}).map(([k, v]) => [k, v.a?.slice(-1)[0] ?? v[v.length - 1]])) }).slice(0, 900));
