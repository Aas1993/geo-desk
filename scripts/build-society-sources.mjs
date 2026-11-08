// Builds public/data/society-sources.json: life expectancy, adult literacy and internet use for each country as read from every openly downloadable source we can reach, beside the World Bank figure the Society tab shows.
// The Society tab rests on World Bank WDI alone. This file adds UNDP's Human Development Report series, the UN Population Division (WPP 2024), UNESCO's Institute for Statistics and the CIA World Factbook.
// Rules: only figures a source actually returned are stored (a gap stays a gap); a source that cannot be used is listed as unavailable with the reason; values are kept as published.
// Independence is stated, not assumed: several of these series share an upstream (UN WPP for life expectancy, UNESCO UIS for literacy, ITU for internet use), and each source says so in `upstream`.
// Every item is { s: source id, v: value, y: year }. Metrics: le (years), lit (% of adults), net (% of population), eys (expected years of schooling), hdi (index 0-1).
// Usage: node scripts/build-society-sources.mjs            (SS_CACHE=<dir> keeps raw responses so a re-run does not hit the sources again)
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const valid = new Set(D("countries.json").map((c) => c.iso3)); const fips = D("fips.json");
const CACHE = process.env.SS_CACHE; if (CACHE) mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  const key = CACHE ? path.join(CACHE, createHash("sha1").update(url).digest("hex")) : null;
  if (key && existsSync(key)) return new Uint8Array(readFileSync(key));
  let err;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120_000), redirect: "follow" }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const b = new Uint8Array(await r.arrayBuffer()); if (key) writeFileSync(key, b); return b; }
    catch (e) { err = e; await sleep(1500 * (i + 1)); }
  }
  throw err;
}
const text = (b, enc = "utf-8") => new TextDecoder(enc).decode(b);
const csvLine = (l) => { const o = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { o.push(cur); cur = ""; } else cur += ch; } o.push(cur); return o; };

const sources = {}; const unavailable = []; const byIso = {};
const put = (iso, metric, item) => { if (!valid.has(iso) || !Number.isFinite(item.v)) return; ((byIso[iso] ??= {})[metric] ??= []).push(item); };
const count = (s) => Object.values(byIso).filter((c) => Object.values(c).some((a) => a.some((i) => i.s === s))).length;
const addSource = (id, meta) => { sources[id] = { id, ...meta }; };

// ---- World Bank WDI: the figures the Society tab already shows (stored as the baseline every other source is read against) ----
const WB = { le: "SP.DYN.LE00.IN", lit: "SE.ADT.LITR.ZS", net: "IT.NET.USER.ZS" };
try {
  for (const [metric, id] of Object.entries(WB)) {
    const rows = JSON.parse(text(await get(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=400&mrnev=1`)))[1] ?? [];
    const best = {}; for (const x of rows) if (valid.has(x.countryiso3code) && x.value != null && (!best[x.countryiso3code] || +x.date > +best[x.countryiso3code].date)) best[x.countryiso3code] = x;
    for (const [iso, x] of Object.entries(best)) put(iso, metric, { s: "wb", v: Math.round(x.value * 100) / 100, y: +x.date });
  }
  addSource("wb", { name: "World Bank World Development Indicators", publisher: "World Bank", url: "https://data.worldbank.org/", year: Math.max(...Object.values(byIso).flatMap((c) => Object.values(c).flat().filter((i) => i.s === "wb").map((i) => i.y))), kind: "primary", licence: "CC BY 4.0", metrics: "le,lit,net", upstream: "Life expectancy: UN Population Division and national statistics offices. Literacy: UNESCO Institute for Statistics. Internet use: ITU.", basis: "Compiles other agencies' series", note: "The figure the Society tab shows; stored here as the baseline." });
} catch (e) { console.error(`World Bank baseline failed: ${e.message}`); process.exit(1); }

// ---- UNDP Human Development Report composite indices (primary file) ----
const HDR_URL = "https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv";
try {
  const lines = text(await get(HDR_URL), "windows-1252").split(/\r?\n/).filter(Boolean).map(csvLine); const h = lines[0];
  const yearOf = (p) => Math.max(...h.filter((c) => c.startsWith(`${p}_`) && /^\d{4}$/.test(c.slice(p.length + 1))).map((c) => +c.slice(p.length + 1)));
  const cols = { le: ["le", "le"], eys: ["eys", "eys"], hdi: ["hdi", "hdi"] }; const year = yearOf("le");
  for (const l of lines.slice(1)) for (const [metric, [p]] of Object.entries(cols)) { const y = yearOf(p); const i = h.indexOf(`${p}_${y}`); if (l[i] !== "" && l[i] != null) put(l[0], metric, { s: "undp", v: Math.round(+l[i] * 1000) / 1000, y }); }
  addSource("undp", { name: "UNDP Human Development Report: composite indices time series", publisher: "United Nations Development Programme", url: "https://hdr.undp.org/data-center/documentation-and-downloads", file: HDR_URL, year, kind: "primary", licence: "CC BY 3.0 IGO", metrics: "le,eys,hdi", upstream: "Life expectancy: UN Population Division (WPP), the same upstream the World Bank draws on. Schooling: UNESCO UIS and national surveys.", basis: "Human Development Index and its components", note: "For life expectancy this mostly repeats WPP, so agreement shows the republication is consistent, not that two measurements agree." });
} catch (e) { unavailable.push({ name: "UNDP Human Development Report data", url: "https://hdr.undp.org/data-center", metrics: "le,eys,hdi", reason: `The composite-indices file could not be read: ${e.message}.` }); }

// ---- UN Population Division, World Population Prospects 2024 (primary bulk file; the last estimate year, not projections) ----
const WPP_URL = "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz";
try {
  const lines = text(gunzipSync(await get(WPP_URL))).split(/\r?\n/); const h = csvLine(lines[0]).map((x) => x.replace(/^﻿/, "")); const cI = h.indexOf("ISO3_code"), cT = h.indexOf("Time"), cL = h.indexOf("LEx"); if (cI < 0 || cT < 0 || cL < 0) throw new Error("unexpected columns");
  const YEAR = 2023; // WPP 2024 treats 1950-2023 as estimates and 2024 onward as projections
  for (const l of lines.slice(1)) { if (!l.includes(`,${YEAR},`)) continue; const c = csvLine(l); if (+c[cT] === YEAR && c[cL] !== "") put(c[cI], "le", { s: "wpp", v: Math.round(+c[cL] * 100) / 100, y: YEAR }); }
  addSource("wpp", { name: "UN World Population Prospects 2024: life expectancy at birth", publisher: "UN Department of Economic and Social Affairs, Population Division", url: "https://population.un.org/wpp/", file: WPP_URL, year: YEAR, kind: "primary", licence: "CC BY 3.0 IGO", metrics: "le", upstream: "Census, vital registration and survey data compiled and modelled by the Population Division; the upstream of the World Bank's and UNDP's life-expectancy series.", basis: "Modelled estimates, both sexes", note: "Not an independent measurement of the World Bank figure: it is where that figure comes from for most countries." });
} catch (e) { unavailable.push({ name: "UN World Population Prospects 2024", url: "https://population.un.org/wpp/", metrics: "le", reason: `The bulk file could not be read: ${e.message}.` }); }

// ---- UNESCO Institute for Statistics: adult literacy (primary API) ----
const UIS_URL = "https://api.uis.unesco.org/api/public/data/indicators?indicator=LR.AG15T99&start=2000&end=2026";
try {
  const rec = JSON.parse(text(await get(UIS_URL))).records ?? []; const best = {};
  for (const x of rec) if (x.value != null && (!best[x.geoUnit] || x.year > best[x.geoUnit].year)) best[x.geoUnit] = x;
  for (const [iso, x] of Object.entries(best)) put(iso, "lit", { s: "uis", v: Math.round(x.value * 100) / 100, y: x.year });
  if (!count("uis")) throw new Error("no rows");
  addSource("uis", { name: "UNESCO Institute for Statistics: adult literacy rate (SDG 4.6.2)", publisher: "UNESCO Institute for Statistics", url: "https://data.uis.unesco.org/", file: UIS_URL, year: Math.max(...Object.values(best).map((x) => x.year)), kind: "primary", licence: "CC BY-SA 3.0 IGO (UNESCO open data licence)", metrics: "lit", upstream: "National censuses and household surveys; UIS estimates where there is none. This is the series the World Bank republishes as SE.ADT.LITR.ZS.", basis: "Share of people aged 15 and over who can read and write", note: "Agreement with the World Bank is by construction: it is the same series at the source, so a difference can only come from release timing." });
} catch (e) { unavailable.push({ name: "UNESCO Institute for Statistics literacy", url: "https://data.uis.unesco.org/", metrics: "lit", reason: `The UIS API could not be read: ${e.message}.` }); }

// ---- CIA World Factbook, through the factbook.json mirror of its country pages (public domain) ----
const FB_RAW = "https://raw.githubusercontent.com/factbook/factbook.json/master";
try {
  const tree = JSON.parse(text(await get("https://api.github.com/repos/factbook/factbook.json/git/trees/master?recursive=1"))).tree;
  const pathOf = Object.fromEntries(tree.filter((t) => /^[a-z0-9-]+\/[a-z]{2}\.json$/.test(t.path)).map((t) => [t.path.split("/")[1].slice(0, 2).toUpperCase(), t.path]));
  const parse = (node, re) => { const t = node?.text; if (typeof t !== "string") return null; const m = t.match(re); return m ? { v: +m[1], y: m[2] ? +m[2] : null } : null; };
  const isos = Object.entries(fips).filter(([iso, f]) => valid.has(iso) && pathOf[f]); let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++; if (i >= isos.length) return; const [iso, f] = isos[i];
      try {
        const j = JSON.parse(text(await get(`${FB_RAW}/${pathOf[f]}`))); const ps = j["People and Society"] ?? {}, cm = j["Communications"] ?? {};
        const le = parse(ps["Life expectancy at birth"]?.["total population"], /([\d.]+)\s*years(?:\s*\((\d{4}))?/), lit = parse(ps["Literacy"]?.["total population"], /([\d.]+)%(?:\s*\((\d{4}))?/), net = parse(cm["Internet users"]?.["percent of population"], /([\d.]+)%(?:\s*\((\d{4}))?/);
        for (const [m, x] of [["le", le], ["lit", lit], ["net", net]]) if (x?.y) { put(iso, m, { s: "factbook", v: x.v, y: x.y }); }
      } catch (e) { console.warn(`factbook ${iso}: ${e.message}`); }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker)); if (!count("factbook")) throw new Error("no rows");
  const fy = Math.max(...Object.values(byIso).flatMap((c) => Object.values(c).flat().filter((i) => i.s === "factbook").map((i) => i.y)));
  addSource("factbook", { name: "CIA World Factbook", publisher: "US Central Intelligence Agency, via the factbook.json mirror", url: "https://www.cia.gov/the-world-factbook/", file: `${FB_RAW}/`, year: fy, kind: "republisher", licence: "Public domain (work of the US government); the JSON mirror is by the factbook.json project", metrics: "le,lit,net", upstream: "Compiled by the CIA from national statistics offices, the UN and ITU; the estimate year is given per figure.", basis: "Editorial compilation; each figure carries its own estimate year", note: "The most independent compiler in this set, but a compilation of the same national and UN data; years differ by country." });
} catch (e) { unavailable.push({ name: "CIA World Factbook", url: "https://www.cia.gov/the-world-factbook/", metrics: "le,lit,net", reason: `The factbook.json mirror could not be read: ${e.message}.` }); }

unavailable.push(
  { name: "WHO Global Health Observatory: life expectancy at birth", url: "https://www.who.int/data/gho", metrics: "le", reason: "The GHO OData API (ghoapi.azureedge.net) answered every request with HTTP 500 during the build, so no figures were read. WHO data are also licensed CC BY-NC-SA 3.0 IGO, which restricts commercial use." },
  { name: "ITU DataHub: individuals using the Internet", url: "https://datahub.itu.int/", metrics: "net", reason: "The DataHub refused an automated request (HTTP 403) and offers no open bulk file. ITU is the upstream of the World Bank internet series, so it would not be independent of it in any case." },
);

const countries = Object.fromEntries(Object.entries(byIso).sort(([a], [b]) => a.localeCompare(b)));
for (const s of Object.values(sources)) s.rows = count(s.id);
if (Object.keys(sources).length < 4 || Object.keys(countries).length < 170) { console.error(`REFUSING TO WRITE: ${Object.keys(sources).join(",")} / ${Object.keys(countries).length} countries`); process.exit(1); }
writeFileSync(new URL("../public/data/society-sources.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), metrics: { le: { label: "Life expectancy", unit: "years" }, lit: { label: "Adult literacy", unit: "%" }, net: { label: "Internet users", unit: "%" }, eys: { label: "Expected years of schooling", unit: "years" }, hdi: { label: "Human Development Index", unit: "index 0-1" } }, sources, unavailable, countries }));
console.log("countries", Object.keys(countries).length, Object.values(sources).map((s) => `${s.id}:${s.rows}@${s.year}`).join(" "), "| ARE", JSON.stringify(countries.ARE));
