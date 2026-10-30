// Builds public/data/crosscheck.json: the UAE's goods trade and direct-investment position, each read from every independent public source we can reach, side by side.
// The app's headline figures come from one IMF dataset each (IMTS for trade, DIP for investment). This file is how a reader sees whether other publishers agree.
// Rules: only figures a source actually returned are stored; a source that cannot be reached is listed as unavailable with the reason, never filled in; every value is US$ millions.
// Mirror data (what the partner reports about the UAE) and UAE-reported data differ for known reasons: CIF/FOB valuation, re-exports and country of origin, timing, and coverage of partner reporting.
// Usage: node scripts/build-crosscheck.mjs            (CC_CACHE=<dir> keeps raw responses so a re-run does not hit the sources again)
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json"); const valid = new Set(countries.map((c) => c.iso3));
const CACHE = process.env.CC_CACHE; if (CACHE) mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const YEAR = 2024; // the latest year every mirror source has published; the UAE-reported series run a year further and are kept for context in trade.json

/** GET with a disk cache, retries and the 429 back-off UN Comtrade's public preview needs. */
async function get(url, { headers = {}, text = false, tries = 4, timeout = 180_000, post } = {}) {
  const key = CACHE ? path.join(CACHE, createHash("sha1").update(url + (post ?? "")).digest("hex")) : null;
  if (key && existsSync(key)) { const s = readFileSync(key, "utf8"); return text ? s : JSON.parse(s); }
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(timeout), ...(post ? { method: "POST", body: post } : {}) });
    const body = await r.text();
    if (r.status === 429 || /Rate limit/i.test(body.slice(0, 200))) { await sleep(4000 * (i + 1)); continue; }
    if (r.status >= 500 && i < tries - 1) { await sleep(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`${url.slice(0, 120)} ${r.status}`);
    if (key && !/"count":\s*0\b/.test(body.slice(0, 120))) writeFileSync(key, body);
    return text ? body : JSON.parse(body);
  }
  throw new Error(`${url.slice(0, 120)} rate limited`);
}
const round = (v) => Math.round(v * 10) / 10;
/** US dollars per unit of a currency, from the ECB reference rates: "A" the annual average (for flows), "E" the last rate of the year (for positions). */
async function ecb(kind, cur, year) {
  const one = async (c) => { if (c === "EUR") return 1; const u = kind === "A" ? `https://data-api.ecb.europa.eu/service/data/EXR/A.${c}.EUR.SP00.A?startPeriod=${year}&endPeriod=${year}&format=csvdata` : `https://data-api.ecb.europa.eu/service/data/EXR/D.${c}.EUR.SP00.A?startPeriod=${year}-12-20&endPeriod=${year}-12-31&format=csvdata`;
    const lines = (await get(u, { text: true })).trim().split("\n"); const h = lines[0].split(","); const col = h.indexOf("OBS_VALUE"); return Number(lines[lines.length - 1].split(",")[col]); };
  return (await one("USD")) / (await one(cur));
}

// UN Comtrade codes are mostly ISO numeric; these differ.
const NUM = new Map(countries.map((c) => [c.num, c.iso3])); for (const [k, v] of Object.entries({ 699: "IND", 842: "USA", 251: "FRA", 381: "ITA", 579: "NOR", 757: "CHE", 490: "TWN", 412: "XKX" })) NUM.set(k.padStart(3, "0"), v);
const isoOfNum = (n) => NUM.get(String(n).padStart(3, "0"));

const sources = {}; const unavailable = [];
const src = (id, o) => (sources[id] = { id, status: "ok", rows: 0, ...o });
const trade = { world: [], countries: {} }, invest = { world: [], countries: {} };
const addT = (iso, s, y, x, m) => { if (!valid.has(iso) || iso === "ARE") return; if (x == null && m == null) return; (trade.countries[iso] ??= []).push({ s, y, ...(x != null ? { x: round(x) } : {}), ...(m != null ? { m: round(m) } : {}) }); sources[s].rows++; };
const addI = (iso, s, y, out, inn) => { if (!valid.has(iso) || iso === "ARE") return; if (out == null && inn == null) return; (invest.countries[iso] ??= []).push({ s, y, ...(out != null ? { out: round(out) } : {}), ...(inn != null ? { in: round(inn) } : {}) }); sources[s].rows++; };
const attempt = async (id, fn) => { try { await fn(); } catch (e) { console.error(`[${id}] ${e.message}`); if (sources[id]) { sources[id].status = "failed"; sources[id].note = (sources[id].note ? sources[id].note + " " : "") + `This run could not read it: ${e.message.slice(0, 80)}.`; } } };
const xmlSeries = (x) => [...x.matchAll(/<Series ([^>]*?)>(.*?)<\/Series>/gs)].map(([, a, b]) => ({ at: Object.fromEntries([...a.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]])), obs: [...b.matchAll(/TIME_PERIOD="([^"]*)" OBS_VALUE="([^"]*)"/g)].map((m) => [m[1], Number(m[2])]) }));

// ───────────────────────────── trade ─────────────────────────────
// T1 IMF IMTS, UAE as reporter: the series the app already uses.
src("imts_uae", { measure: "trade", name: "IMF International Trade in Goods by partner (IMTS)", publisher: "IMF", basis: "UAE-reported", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:IMTS", note: "UAE customs data as sent to the IMF. Exports FOB and include re-exports; imports CIF." });
{ const t = D("trade.json"); for (const [iso, v] of Object.entries(t.countries)) { const r = v.a.find((a) => a[0] === YEAR); if (r) addT(iso, "imts_uae", YEAR, r[1], r[2]); } const w = t.world.a.find((a) => a[0] === YEAR); if (w) trade.world.push({ s: "imts_uae", y: YEAR, x: w[1], m: w[2] }); }

// T2/T4 UN Comtrade public preview: UAE as reporter (T2) and every partner that reports the UAE (T4).
src("comtrade_uae", { measure: "trade", name: "UN Comtrade, UAE-reported", publisher: "UN Statistics Division", basis: "UAE-reported", kind: "primary", url: "https://comtradeapi.un.org", note: "UAE customs data as filed with the UN. Totals across all commodities (HS)." });
src("comtrade_mirror", { measure: "trade", name: "UN Comtrade, partner-reported", publisher: "UN Statistics Division", basis: "partner-reported", kind: "primary", url: "https://comtradeapi.un.org", note: "What each partner's customs reports of its trade with the UAE; imports are CIF, exports FOB. Covers only the partners that file, and the UAE often appears as a transit or origin country differently." });
await attempt("comtrade_uae", async () => {
  const base = "https://comtradeapi.un.org/public/v1/preview/C/A/HS?cmdCode=TOTAL&flowCode=X,M";
  let yU = YEAR, u = await get(`${base}&reporterCode=784&period=${yU}`); if (!(u.data ?? []).length) { await sleep(5000); yU = YEAR - 1; u = await get(`${base}&reporterCode=784&period=${yU}`); sources.comtrade_uae.note += ` The UAE had not filed ${YEAR} with the UN at the time of the build, so ${yU} is used.`; } const byP = {};
  for (const r of u.data ?? []) { if (r.partner2Code && r.partner2Code !== 0) continue; const iso = r.partnerCode === 0 ? "WLD" : isoOfNum(r.partnerCode); if (!iso) continue; (byP[iso] ??= {})[r.flowCode] = r.primaryValue / 1e6; }
  for (const [iso, v] of Object.entries(byP)) { if (iso === "WLD") trade.world.push({ s: "comtrade_uae", y: yU, x: round(v.X), m: round(v.M) }); else addT(iso, "comtrade_uae", yU, v.X, v.M); }
  await sleep(5000);
  const m = await get(`${base}&partnerCode=784&period=${YEAR}`); const byR = {};
  for (const r of m.data ?? []) { if (r.partner2Code && r.partner2Code !== 0) continue; const iso = isoOfNum(r.reporterCode); if (iso) (byR[iso] ??= {})[r.flowCode] = r.primaryValue / 1e6; }
  // the partner's imports from the UAE are the UAE's exports to it, and the partner's exports to the UAE are the UAE's imports
  for (const [iso, v] of Object.entries(byR)) addT(iso, "comtrade_mirror", YEAR, v.M, v.X);
});

// T3 IMF IMTS, partners reporting their trade with the UAE.
src("imts_mirror", { measure: "trade", name: "IMF IMTS, partner-reported", publisher: "IMF", basis: "partner-reported", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:IMTS", note: "Each partner's own report of its exports to and imports from the UAE, as the IMF holds it." });
await attempt("imts_mirror", async () => {
  const x = await get(`https://api.imf.org/external/sdmx/2.1/data/IMF.STA,IMTS/*.XG_FOB_USD+MG_CIF_USD.ARE.A?startPeriod=${YEAR}&endPeriod=${YEAR}`, { text: true });
  const by = {}; for (const s of xmlSeries(x)) { const o = s.obs.find((a) => +a[0] === YEAR); if (o && Number.isFinite(o[1])) (by[s.at.COUNTRY] ??= {})[s.at.INDICATOR] = o[1] / 1e6; }
  // partner exports to the UAE = UAE imports; partner imports from the UAE = UAE exports
  for (const [iso, v] of Object.entries(by)) addT(iso, "imts_mirror", YEAR, v.MG_CIF_USD, v.XG_FOB_USD);
});

// T5 Eurostat (Comext): the EU27 bloc against the sum of what each member reports in UAE-reported data is not available, so the bloc total is compared with the UAE's partner row for the EU.
src("eurostat_trade", { measure: "trade", name: "Eurostat extra-EU trade by partner", publisher: "Eurostat", basis: "partner-reported (EU27 as a bloc)", kind: "primary", url: "https://ec.europa.eu/eurostat/databrowser/view/ext_lt_maineu", note: "EU27 customs data (Comext). Bloc total only, so it is compared with the sum of the UAE's 27 member rows." });
await attempt("eurostat_trade", async () => {
  const j = await get(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ext_lt_maineu?format=JSON&lang=en&partner=AE&geo=EU27_2020&sitc06=TOTAL&time=${YEAR}`);
  const ids = j.id, size = j.size; const dim = Object.fromEntries(ids.map((k) => [k, Object.keys(j.dimension[k].category.index)])); const got = {};
  for (const [pos, v] of Object.entries(j.value)) { let n = +pos; const idx = {}; for (let i = ids.length - 1; i >= 0; i--) { idx[ids[i]] = dim[ids[i]][n % size[i]]; n = Math.floor(n / size[i]); } got[idx.indic_et] = v; }
  const eur = await ecb("A", "EUR", YEAR); // EU exports to the UAE are the UAE's imports, and EU imports from the UAE are the UAE's exports
  if (got.MIO_EXP_VAL != null && got.MIO_IMP_VAL != null) { trade.bloc = { eu27: { s: "eurostat_trade", y: YEAR, x: round(got.MIO_IMP_VAL * eur), m: round(got.MIO_EXP_VAL * eur), eur: { x: got.MIO_IMP_VAL, m: got.MIO_EXP_VAL }, rate: eur } }; sources.eurostat_trade.rows = 1; }
});

// UNCTADstat bulk files are 7z archives; bsdtar (macOS, most Linux) reads them.
async function unctad(report) {
  const dir = path.join(CACHE ?? tmpdir(), "unctad-" + report); mkdirSync(dir, { recursive: true }); const f = path.join(dir, `US_${report}.csv`);
  if (!existsSync(f)) { const buf = Buffer.from(await (await fetch(`https://unctadstat-api.unctad.org/bulkdownload/US.${report}/US_${report}`, { headers: UA, signal: AbortSignal.timeout(180_000) })).arrayBuffer()); writeFileSync(path.join(dir, "a.7z"), buf); execFileSync("bsdtar", ["-xf", path.join(dir, "a.7z"), "-C", dir]); }
  const text = readFileSync(f, "utf8").replace(/^﻿/, ""); const rows = []; let i = 0, cur = [], q = false, cell = "";
  for (; i < text.length; i++) { const ch = text[i]; if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; } else if (ch === '"') q = true; else if (ch === ",") { cur.push(cell); cell = ""; } else if (ch === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; } else if (ch !== "\r") cell += ch; }
  const head = rows.shift(); return rows.map((r) => Object.fromEntries(head.map((h, j) => [h, r[j]])));
}
src("unctad_trade", { measure: "trade", name: "UNCTADstat merchandise trade, total", publisher: "UNCTAD", basis: "UAE total (all partners)", kind: "republisher", url: "https://unctadstat.unctad.org/datacentre/dataviewer/US.TradeMerchTotal", note: "Total merchandise trade of the UAE, with UNCTAD's own estimates where the UAE has not filed. World total only." });
await attempt("unctad_trade", async () => {
  const rows = (await unctad("TradeMerchTotal")).filter((r) => r.Economy === "784" && r.Year === String(YEAR)); const v = (lab) => Number(rows.find((r) => r["Flow Label"] === lab)?.["Millions of US$ at current prices"]);
  if (Number.isFinite(v("Exports")) || Number.isFinite(v("Imports"))) { trade.world.push({ s: "unctad_trade", y: YEAR, x: round(v("Exports")), m: round(v("Imports")) }); sources.unctad_trade.rows = 1; }
});

// IMF balance of payments (goods, credit and debit) with the World Bank's republication of it.
src("imf_bop", { measure: "trade", name: "IMF Balance of Payments, goods", publisher: "IMF", basis: "UAE total, balance-of-payments basis", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:BOP", note: "Goods credits and debits on a balance-of-payments basis: change of ownership, FOB both ways, so re-exports and some goods in transit are treated differently from customs data. The World Bank's WDI (BX.GSR.MRCH.CD, BM.GSR.MRCH.CD) republishes the same figures." });
await attempt("imf_bop", async () => {
  const s = xmlSeries(await get("https://api.imf.org/external/sdmx/2.1/data/IMF.STA,BOP/ARE?startPeriod=2022&endPeriod=2025", { text: true })).filter((x) => x.at.UNIT === "USD" && x.at.FREQUENCY === "A");
  const val = (ent) => s.find((x) => x.at.INDICATOR === "G" && x.at.BOP_ACCOUNTING_ENTRY === ent)?.obs.find((o) => +o[0] === YEAR)?.[1];
  const x = val("CD_T"), net = val("NETCD_T"); const m = x != null && net != null ? x - net : null; // goods credit, and goods debit as credit minus the net balance
  if (x != null || m != null) { trade.world.push({ s: "imf_bop", y: YEAR, x: x != null ? round(x / 1e6) : null, m: m != null ? round(m / 1e6) : null }); sources.imf_bop.rows = 1; }
});


// UK Office for National Statistics (HMRC customs data), the UK as a single partner. Monthly pounds sterling, summed for the year and converted at the ECB's annual average.
src("ons_trade", { measure: "trade", name: "UK ONS trade in goods by country", publisher: "UK Office for National Statistics (HMRC)", basis: "partner-reported (UK only)", kind: "primary", url: "https://www.ons.gov.uk/businessindustryandtrade/internationaltrade/datasets/uktradecountrybycommodity", note: "UK customs data, twelve months summed and converted from sterling at the ECB annual average." });
await attempt("ons_trade", async () => {
  const meta = await get("https://api.beta.ons.gov.uk/v1/datasets/trade"); const V = meta.links.latest_version.href; const yy = String(YEAR).slice(2); const gbp = await ecb("A", "GBP", YEAR); const sum = {};
  for (const dir of ["EX", "IM"]) {
    const j = await get(`${V}/observations?time=*&geography=K02000001&standardindustrialtradeclassification=T&countriesandterritories=AE&direction=${dir}`);
    const months = (j.observations ?? []).filter((o) => String(o.dimensions?.Time?.id ?? o.dimensions?.time?.id ?? "").endsWith("-" + yy)); if (months.length !== 12) throw new Error(`${dir}: ${months.length} months for ${YEAR}`);
    sum[dir] = months.reduce((a, o) => a + Number(o.observation), 0) * gbp;
  }
  addT("GBR", "ons_trade", YEAR, sum.IM, sum.EX); // UK imports from the UAE are the UAE's exports, and UK exports to the UAE are its imports
});

// ───────────────────────────── investment ─────────────────────────────
// I1 IMF Direct Investment Positions, the series the app already uses: positions the partners report with the UAE as counterpart.
src("imf_dip", { measure: "invest", name: "IMF Direct Investment Positions (formerly CDIS)", publisher: "IMF", basis: "partner-reported (mirror)", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:DIP", note: "Positions the partner countries report with the UAE as counterpart, so coverage and year differ by country and a partner that does not report shows as zero or absent." });
{ const inv = D("investment.json"); for (const [iso, v] of Object.entries(inv.countries)) { const o = v.outward, n = v.inward; const y = o?.year ?? n?.year; addI(iso, "imf_dip", y, o ? o.usd / 1e6 : null, n ? n.usd / 1e6 : null); }
  invest.world.push({ s: "imf_dip", y: inv.world.year, kind: "stock", out: round(inv.world.usd / 1e6) }); }

// I2 OECD: the OECD members' direct-investment positions with the UAE.
src("oecd_fdi", { measure: "invest", name: "OECD FDI positions by counterpart area", publisher: "OECD", basis: "partner-reported (OECD members)", kind: "primary", url: "https://data-explorer.oecd.org/?lc=en&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_FDI%40DF_FDI_CTRY_IND_SUMM&df[ag]=OECD.DAF.INV", note: "The 38 OECD members' own direct-investment positions with the UAE (BMD4), US$ millions, immediate counterpart." });
await attempt("oecd_fdi", async () => {
  const j = await get(`https://sdmx.oecd.org/public/rest/data/OECD.DAF.INV,DSD_FDI@DF_FDI_CTRY_IND_SUMM,1.0/........ARE....?lastNObservations=1&dimensionAtObservation=AllDimensions`, { headers: { Accept: "application/vnd.sdmx.data+json;version=2.0.0" }, timeout: 240_000 });
  const dims = j.data.structures[0].dimensions.observation; const ix = Object.fromEntries(dims.map((d, i) => [d.id, i])); const val = dims.map((d) => d.values.map((v) => v.id)); const best = {};
  for (const [k, v] of Object.entries(j.data.dataSets[0].observations)) { const a = k.split(":").map(Number); const g = (n) => val[ix[n]][a[ix[n]]];
    if (g("MEASURE") !== "LE_FA_F" || g("UNIT_MEASURE") !== "USD_EXC" || g("ACTIVITY") !== "_T") continue; const iso = g("REF_AREA"), pr = g("MEASURE_PRINCIPLE"), y = +g("TIME_PERIOD"); if (v[0] == null) continue;
    const kk = iso + pr; if (!best[kk] || y > best[kk].y) best[kk] = { iso, pr, y, v: v[0] }; }
  const by = {}; for (const b of Object.values(best)) (by[b.iso] ??= { y: b.y })[b.pr] = b.v; for (const [iso, b] of Object.entries(by)) addI(iso, "oecd_fdi", b.y, b.DI ?? null, b.DO ?? null); // DI: the reporter's inward position from the UAE, DO: its outward position in the UAE
});

// I3 Eurostat balance-of-payments direct-investment positions: EU members and a few others, by immediate counterpart.
src("eurostat_fdi", { measure: "invest", name: "Eurostat FDI positions, immediate counterpart", publisher: "Eurostat", basis: "partner-reported (EU members and others)", kind: "primary", url: "https://ec.europa.eu/eurostat/databrowser/view/bop_fdi6_pos", note: "Euro figures converted at the ECB year-end rate. Immediate counterpart: the first country the money came from." });
await attempt("eurostat_fdi", async () => {
  const j = await get(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/bop_fdi6_pos?format=JSON&lang=en&partner=AE&nace_r2=FDI&entity=TOTAL&fdi_item=DI__D__F&fdi_item=DO__D__F&stk_flow=ASS&stk_flow=LIAB&time=${YEAR}`);
  const ids = j.id, size = j.size; const dim = Object.fromEntries(ids.map((k) => [k, Object.keys(j.dimension[k].category.index)])); const fx = await ecb("E", "EUR", YEAR); const by = {};
  for (const [pos, v] of Object.entries(j.value)) { let n = +pos; const idx = {}; for (let i = ids.length - 1; i >= 0; i--) { idx[ids[i]] = dim[ids[i]][n % size[i]]; n = Math.floor(n / size[i]); } (by[idx.geo + "|" + idx.counterp] ??= {})[idx.fdi_item + "|" + idx.stk_flow] = v * fx; }
  const ISO2 = new Map(countries.map((c) => [c.iso2, c.iso3])); ISO2.set("EL", "GRC"); ISO2.set("UK", "GBR");
  for (const [k, v] of Object.entries(by)) { const [geo, cp] = k.split("|"); if (cp === "ULT") continue; const s = "eurostat_fdi"; // the ultimate-investor series holds flows only, so it cannot be set against positions // the geo's liabilities on direct investment in the reporting economy are the UAE's position in it; its assets abroad in the UAE are the UAE's inward position
    if (geo === "EU27_2020") { invest.bloc = { ...(invest.bloc ?? {}), [cp]: { s, y: YEAR, out: round(v["DI__D__F|LIAB"] ?? null), in: round(v["DO__D__F|ASS"] ?? null) } }; continue; } if (geo === "EU28") continue; const iso = ISO2.get(geo); if (iso) addI(iso, s, YEAR, v["DI__D__F|LIAB"] ?? null, v["DO__D__F|ASS"] ?? null); }
});

// I4 UNCTADstat: the UAE's total inward and outward FDI stock and flows. A world total, not by partner.
src("unctad_fdi", { measure: "invest", name: "UNCTADstat FDI stock and flows", publisher: "UNCTAD", basis: "UAE total (all partners)", kind: "republisher", url: "https://unctadstat.unctad.org/datacentre/dataviewer/US.FdiFlowsStock", note: "UNCTAD's own series for the UAE's total FDI, built from the UAE's central bank and its estimates. World total only." });
await attempt("unctad_fdi", async () => {
  const rows = (await unctad("FdiFlowsStock")).filter((r) => r.Economy === "784" && r.Year === String(YEAR)); const v = (flow, dir) => Number(rows.find((r) => r["Flow Label"] === flow && r["Direction Label"] === dir)?.["Millions of US$ at current prices"]);
  const st = { out: v("Stock", "Outward"), in: v("Stock", "Inward") }, fl = { out: v("Flow", "Outward"), in: v("Flow", "Inward") };
  if (Number.isFinite(st.out)) { invest.world.push({ s: "unctad_fdi", y: YEAR, kind: "stock", out: round(st.out), in: round(st.in) }); invest.world.push({ s: "unctad_fdi", y: YEAR, kind: "flow", out: round(fl.out), in: round(fl.in) }); sources.unctad_fdi.rows = 2; }
});

// I5 IMF balance of payments, direct-investment flows (the World Bank's WDI republishes them as BM.KLT.DINV.CD.WD and BX.KLT.DINV.CD.WD).
src("imf_bop_fdi", { measure: "invest", name: "IMF Balance of Payments, direct investment", publisher: "IMF", basis: "UAE-reported flows", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:BOP", note: "Net acquisition of direct-investment assets (outward) and net incurrence of liabilities (inward) in the year: a flow, not a position. The UAE does not report an international investment position (IIP) series to the IMF." });
await attempt("imf_bop_fdi", async () => {
  const s = xmlSeries(await get("https://api.imf.org/external/sdmx/2.1/data/IMF.STA,BOP/ARE?startPeriod=2022&endPeriod=2025", { text: true })).filter((x) => x.at.UNIT === "USD" && x.at.FREQUENCY === "A" && x.at.INDICATOR === "D_F");
  const val = (ent) => s.find((x) => x.at.BOP_ACCOUNTING_ENTRY === ent)?.obs.find((o) => +o[0] === YEAR)?.[1];
  const out = val("A_NFA_T"), inn = val("L_NIL_T"); if (out != null || inn != null) { invest.world.push({ s: "imf_bop_fdi", y: YEAR, kind: "flow", out: out != null ? round(out / 1e6) : null, in: inn != null ? round(inn / 1e6) : null }); sources.imf_bop_fdi.rows = 1; }
});

// Australia's Bureau of Statistics, merchandise trade with the UAE (monthly, thousands of Australian dollars, summed for the year and converted at the ECB annual average).
src("abs_trade", { measure: "trade", name: "ABS international merchandise trade by country", publisher: "Australian Bureau of Statistics", basis: "partner-reported (Australia only)", kind: "primary", url: "https://www.abs.gov.au/statistics/economy/international-trade/international-trade-goods", note: "Australian customs data, twelve months summed and converted from Australian dollars at the ECB annual average." });
await attempt("abs_trade", async () => {
  const aud = await ecb("A", "AUD", YEAR); const tot = {};
  for (const [flow, key] of [["MERCH_EXP", "TOT.UAEM.TOT.M"], ["MERCH_IMP", "TOT.UAEM.TOT.M"]]) {
    const j = await get(`https://data.api.abs.gov.au/rest/data/ABS,${flow}/${key}?startPeriod=${YEAR}-01&endPeriod=${YEAR}-12&format=jsondata`);
    const obs = Object.values(j.data.dataSets[0].series)[0].observations; const n = Object.keys(obs).length; if (n !== 12) throw new Error(`${flow}: ${n} months`);
    tot[flow] = Object.values(obs).reduce((a, o) => a + o[0], 0) * 1000 * aud / 1e6; // thousands of A$ to US$ millions
  }
  addT("AUS", "abs_trade", YEAR, tot.MERCH_EXP, tot.MERCH_IMP); // Australian exports to the UAE are the UAE's imports and Australian imports from the UAE are its exports
  const t = trade.countries.AUS.find((i) => i.s === "abs_trade"); [t.x, t.m] = [round(tot.MERCH_IMP), round(tot.MERCH_EXP)];
});

// World Bank WDI: balance-of-payments goods and direct-investment flows. The World Bank republishes the IMF's balance of payments, so these agree with imf_bop by construction.
src("wdi_trade", { measure: "trade", name: "World Bank WDI, merchandise exports and imports (BoP)", publisher: "World Bank", basis: "UAE total, balance-of-payments basis", kind: "republisher", url: "https://data.worldbank.org/indicator/BX.GSR.MRCH.CD?locations=AE", note: "A republication of the IMF balance of payments (BX.GSR.MRCH.CD, BM.GSR.MRCH.CD): it shows that the IMF figure is carried unchanged into the World Bank's database, not a second measurement." });
src("wdi_fdi", { measure: "invest", name: "World Bank WDI, FDI net inflows and outflows (BoP)", publisher: "World Bank", basis: "UAE-reported flows", kind: "republisher", url: "https://data.worldbank.org/indicator/BX.KLT.DINV.CD.WD?locations=AE", note: "A republication of the IMF balance of payments (BX.KLT.DINV.CD.WD inflows, BM.KLT.DINV.CD.WD outflows): a flow in the year, not a position." });
await attempt("wdi_trade", async () => {
  const wb = async (code) => (await get(`https://api.worldbank.org/v2/country/ARE/indicator/${code}?format=json&date=${YEAR}`))[1]?.[0]?.value;
  const [x, m] = [await wb("BX.GSR.MRCH.CD"), await wb("BM.GSR.MRCH.CD")]; if (x != null && m != null) { trade.world.push({ s: "wdi_trade", y: YEAR, x: round(x / 1e6), m: round(m / 1e6) }); sources.wdi_trade.rows = 1; }
  const [fi, fo] = [await wb("BX.KLT.DINV.CD.WD"), await wb("BM.KLT.DINV.CD.WD")]; if (fi != null && fo != null) { invest.world.push({ s: "wdi_fdi", y: YEAR, kind: "flow", out: round(fo / 1e6), in: round(fi / 1e6) }); sources.wdi_fdi.rows = 1; }
});

// Statistics Norway, table 08803: Norway's goods trade with the UAE (NOK millions, the December year-to-date value, converted at the ECB annual average).
src("ssb_trade", { measure: "trade", name: "Statistics Norway external trade in goods by country", publisher: "Statistics Norway", basis: "partner-reported (Norway only)", kind: "primary", url: "https://www.ssb.no/en/statbank/table/08803", note: "Norwegian customs data, the full-year value converted from kroner at the ECB annual average." });
await attempt("ssb_trade", async () => {
  const q = { query: [{ code: "HovedVareStrommer", selection: { filter: "item", values: ["Itot", "Etot"] } }, { code: "Land", selection: { filter: "item", values: ["AE"] } }, { code: "ContentsCode", selection: { filter: "item", values: ["VerdiHittiliAar"] } }, { code: "Tid", selection: { filter: "item", values: [`${YEAR}M12`] } }], response: { format: "json-stat2" } };
  const j = await get("https://data.ssb.no/api/v0/en/table/08803", { post: JSON.stringify(q), headers: { "Content-Type": "application/json" } }); const nok = await ecb("A", "NOK", YEAR);
  const flows = Object.keys(j.dimension.HovedVareStrommer.category.index); const v = Object.fromEntries(flows.map((f, i) => [f, j.value[i]]));
  if (v.Itot != null && v.Etot != null) addT("NOR", "ssb_trade", YEAR, v.Itot * nok, v.Etot * nok); // Norwegian imports from the UAE are the UAE's exports and Norwegian exports to the UAE are its imports
});

// Statistics Canada, table 36-10-0008: Canadian direct investment abroad and foreign direct investment in Canada, by country (book value, Canadian dollar millions, year-end).
src("statcan_fdi", { measure: "invest", name: "Statistics Canada international investment position by country", publisher: "Statistics Canada", basis: "partner-reported (Canada only)", kind: "primary", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610000801", note: "Book value in Canadian dollars, converted at the ECB year-end rate." });
await attempt("statcan_fdi", async () => {
  const j = await get("https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods", { post: JSON.stringify([{ productId: 36100008, coordinate: "1.1.175.0.0.0.0.0.0.0", latestN: 3 }, { productId: 36100008, coordinate: "1.2.175.0.0.0.0.0.0.0", latestN: 3 }]), headers: { "Content-Type": "application/json" } });
  const cad = await ecb("E", "CAD", YEAR); const val = (o) => { const p = o.object.vectorDataPoint.find((d) => d.refPer.startsWith(String(YEAR))); return p ? p.value * cad : null; };
  // coordinate member 1: Canadian direct investment abroad in the UAE (the UAE's inward position from Canada); member 2: foreign direct investment in Canada from the UAE
  const inn = val(j[0]), out = val(j[1]); if (out != null || inn != null) addI("CAN", "statcan_fdi", YEAR, out, inn);
});

// ───────────────────────────── sources that could not be used ─────────────────────────────
unavailable.push(
  { name: "UAE Federal Competitiveness and Statistics Centre (FCSC)", url: "https://fcsc.gov.ae", measure: "both", reason: "its site returns HTTP 403 to scripted requests, so its foreign-trade and FDI tables are not read here" },
  { name: "UAE national open-data portal (Bayanat)", url: "https://bayanat.ae", measure: "both", reason: "no machine-readable bilateral trade or investment dataset found at the time of the build" },
  { name: "US Census Bureau international trade API", url: "https://api.census.gov/data/timeseries/intltrade", measure: "trade", reason: "requires a registered API key, which is not configured" },
  { name: "US Bureau of Economic Analysis direct investment by country", url: "https://apps.bea.gov/api", measure: "invest", reason: "requires a registered API key, which is not configured" },
  { name: "IMF International Investment Position (UAE)", url: "https://data.imf.org/en/datasets/IMF.STA:IIP", measure: "invest", reason: "the IMF holds no IIP series for the UAE (the UAE does not report one)" },
  { name: "World Bank WITS", url: "https://wits.worldbank.org", measure: "trade", reason: "republishes UN Comtrade, so it would repeat a source already counted rather than add one" },
);

// ───────────────────────────── write ─────────────────────────────
const nT = Object.keys(trade.countries).length, nI = Object.keys(invest.countries).length;
if (nT < 100 || nI < 30 || trade.world.length < 3 || invest.world.length < 2) { console.error(`REFUSING TO WRITE: ${nT} trade countries, ${nI} investment countries, ${trade.world.length} trade world rows, ${invest.world.length} investment world rows`); process.exit(1); }
for (const v of Object.values(sources)) delete v.raw;
const out = { built: new Date().toISOString(), year: YEAR, sources, unavailable, trade, invest };
const target = new URL("../public/data/crosscheck.json", import.meta.url); writeFileSync(new URL("../public/data/crosscheck.json.tmp", import.meta.url), JSON.stringify(out)); (await import("node:fs")).renameSync(new URL("../public/data/crosscheck.json.tmp", import.meta.url), target);
console.log("crosscheck:", Object.values(sources).map((s) => `${s.id}${s.status === "ok" ? "" : "(" + s.status + ")"}:${s.rows}`).join(" "), "| trade countries", nT, "| invest countries", nI);
