// Builds public/data/military-sources.json: military spending read from every independent public source we can reach, side by side.
// The Military tab's own series is the World Bank's MS.MIL.* indicators, which republish SIPRI. This file adds SIPRI's own database, the IMF's government-finance statistics (defence function), Eurostat's government expenditure by function and the US Treasury's budget outlays.
// Rules: only figures a source returned are stored; a gap stays a gap (SIPRI publishes no UAE or Qatar figure, and that is recorded, not filled in); a source that cannot be reached is listed as unavailable with the reason.
// The sources measure different things (SIPRI uses the NATO definition and includes paramilitary forces and military pensions; the IMF and Eurostat use the UN's "defence" function of general government; the US figure is federal national-defense outlays by fiscal year). A gap between them is a reason to look, not proof of an error.
// Usage: node scripts/build-military-sources.mjs            (MS_CACHE=<dir> keeps raw responses so a re-run does not hit the sources again)
import { writeFileSync, readFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json"); const valid = new Set(countries.map((c) => c.iso3));
const CACHE = process.env.MS_CACHE; if (CACHE) mkdirSync(CACHE, { recursive: true });
const FROM = 2020; // five or six years per source: enough to compare in a shared year
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { text = false, tries = 4, timeout = 180_000, bin = false } = {}) {
  const key = CACHE ? path.join(CACHE, createHash("sha1").update(url).digest("hex")) : null;
  if (key && existsSync(key)) { const b = readFileSync(key); return bin ? b : text ? b.toString("utf8") : JSON.parse(b.toString("utf8")); }
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout), redirect: "follow" });
    if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep(4000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`${url.slice(0, 110)} ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer()); if (key) writeFileSync(key, buf);
    return bin ? buf : text ? buf.toString("utf8") : JSON.parse(buf.toString("utf8"));
  }
  throw new Error(`${url.slice(0, 110)} unreachable`);
}
/** A footnote cut at the last full sentence within 420 characters. */
const trim = (t) => { if (!t) return undefined; if (t.length <= 420) return t; const c = t.slice(0, 420); const i = c.lastIndexOf(". "); return i > 120 ? c.slice(0, i + 1) : c.trimEnd() + "…"; };
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const sources = {}; const unavailable = []; const rows = {}; const gaps = {};
const src = (id, o) => (sources[id] = { id, status: "ok", rows: 0, ...o });
const add = (iso, s, y, o) => { if (!valid.has(iso)) return false; const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && Number.isFinite(v) || typeof v === "string")); if (!("usd" in clean) && !("gdp" in clean) && !("share" in clean)) return false; (rows[iso] ??= []).push({ s, y, ...clean }); sources[s].rows++; return true; };
const attempt = async (id, fn) => { try { await fn(); } catch (e) { console.error(`[${id}] ${e.message}`); if (sources[id]) { sources[id].status = "failed"; sources[id].note = (sources[id].note ? sources[id].note + " " : "") + `This run could not read it: ${e.message.slice(0, 90)}.`; } } };
const series = (x) => [...x.matchAll(/<Series ([^>]*?)>(.*?)<\/Series>/gs)].map(([, a, b]) => ({ at: Object.fromEntries([...a.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]])), obs: [...b.matchAll(/<Obs TIME_PERIOD="([^"]*)"([^>]*)\/>/g)].map((m) => [m[1], m[2].match(/OBS_VALUE="([^"]*)"/)?.[1]]).filter((o) => o[1] != null).map(([t, v]) => [t, Number(v)]) }));

// ───────────── SIPRI Military Expenditure Database (the Excel file SIPRI publishes for download) ─────────────
src("sipri", { name: "SIPRI Military Expenditure Database", publisher: "SIPRI", basis: "NATO-definition military spending, as compiled by SIPRI", kind: "primary", url: "https://www.sipri.org/databases/milex", note: "SIPRI's own download. Includes paramilitary forces and military pensions where SIPRI could identify them; US$ at current prices and exchange rates. SIPRI marks some figures as its own estimates or as highly uncertain." });
const ALIAS = { "Korea, South": "KOR", "Korea, North": "PRK", Türkiye: "TUR", Russia: "RUS", "Congo, DR": "COD", "Congo, Republic": "COG", "Cote d'Ivoire": "CIV", "Côte d'Ivoire": "CIV", Czechia: "CZE", Eswatini: "SWZ", Gambia: "GMB", "Gambia, The": "GMB", Laos: "LAO", Syria: "SYR", Iran: "IRN", Venezuela: "VEN", Bolivia: "BOL", Brunei: "BRN", "Cabo Verde": "CPV", "Cape Verde": "CPV", Moldova: "MDA", "North Macedonia": "MKD", Macedonia: "MKD", Myanmar: "MMR", Vietnam: "VNM", Tanzania: "TZA", "Timor Leste": "TLS", "Timor-Leste": "TLS", "United Kingdom": "GBR", "United States of America": "USA", "Viet Nam": "VNM", Kyrgyzstan: "KGZ", "Kyrgyz Republic": "KGZ", Slovakia: "SVK", Egypt: "EGY", Yemen: "YEM", Taiwan: "TWN", Kosovo: "XKX", "Hong Kong": "HKG", China: "CHN", Palestine: "PSE", Micronesia: "FSM", "Bahamas, The": "BHS", Bahamas: "BHS", Turkey: "TUR", Burma: "MMR", "Trinidad & Tobago": "TTO", "Trinidad and Tobago": "TTO", "Saint Lucia": "LCA", "Antigua and Barbuda": "ATG", "Papua New Guinea": "PNG", "Bosnia and Herzegovina": "BIH", "Dominican Republic": "DOM", "El Salvador": "SLV", "Sao Tome and Principe": "STP", "Sri Lanka": "LKA", "New Zealand": "NZL", "South Africa": "ZAF", "Saudi Arabia": "SAU", "United Arab Emirates": "ARE", "Costa Rica": "CRI", "Equatorial Guinea": "GNQ", "Guinea-Bissau": "GNB", "Burkina Faso": "BFA", "Central African Republic": "CAF", "South Sudan": "SSD", "Sierra Leone": "SLE", "Solomon Islands": "SLB", "Marshall Islands": "MHL", "Seychelles": "SYC" };
const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
const BYNAME = new Map(countries.map((c) => [norm(c.name), c.iso3])); const isoOfName = (n) => ALIAS[n] ?? BYNAME.get(norm(n));
const xlsxUrl = async () => { const page = await get("https://www.sipri.org/databases/milex", { text: true }); const m = page.match(/href="((?:https:)?\/\/www\.sipri\.org\/sites\/default\/files\/SIPRI-Milex-data[^"]*\.xlsx)"/); if (!m) throw new Error("SIPRI download link not found on the database page"); return m[1].startsWith("//") ? "https:" + m[1] : m[1]; };
const readXlsx = (file) => {
  const dir = mkdtempSync(path.join(tmpdir(), "sipri-")); try {
    execFileSync("unzip", ["-q", "-o", file, "-d", dir]); const rd = (p) => readFileSync(path.join(dir, p), "utf8");
    const ss = [...rd("xl/sharedStrings.xml").matchAll(/<si>(.*?)<\/si>/gs)].map((m) => [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((x) => x[1]).join("").replace(/&amp;/g, "&").replace(/&apos;/g, "'"));
    const rels = Object.fromEntries([...rd("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"|<Relationship [^>]*?Target="([^"]+)"[^>]*?Id="([^"]+)"/g)].map((m) => [m[1] ?? m[4], m[2] ?? m[3]]));
    const names = Object.fromEntries([...rd("xl/workbook.xml").matchAll(/<sheet name="([^"]*)"[^>]*r:id="([^"]+)"/g)].map((m) => [m[1].replace(/&amp;/g, "&"), "xl/" + rels[m[2]].replace(/^\/?(xl\/)?/, "")]));
    // font colours carry SIPRI's flags: blue = SIPRI estimate, red = highly uncertain
    const styles = rd("xl/styles.xml"); const fonts = [...styles.match(/<fonts[^>]*>(.*?)<\/fonts>/s)[1].matchAll(/<font(?:\s[^>]*)?>(.*?)<\/font>|<font\/>/gs)].map((m) => { const c = m[1]?.match(/<color ([^>]*)\/>/)?.[1] ?? ""; return /indexed="12"|rgb="FF0000FF"|rgb="FF0070C0"/.test(c) ? "e" : /indexed="10"|rgb="FFFF0000"/.test(c) ? "u" : ""; });
    const xfs = [...styles.match(/<cellXfs[^>]*>(.*?)<\/cellXfs>/s)[1].matchAll(/<xf [^>]*?fontId="(\d+)"/g)].map((m) => fonts[+m[1]] ?? "");
    const sheet = (name) => { const x = rd(names[name]); const out = new Map(); let hdr = null; for (const [, r, body] of x.matchAll(/<row [^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) { const cells = {}; for (const [, col, at, inner] of body.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) { const v = inner?.match(/<v>([^<]*)<\/v>/)?.[1]; if (v == null) continue; const st = at.match(/ s="(\d+)"/)?.[1]; cells[col] = { v: /t="s"/.test(at) ? ss[+v] : v, f: st ? xfs[+st] : "" }; } if (cells.A?.v === "Country") hdr = Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, c.v])); else if (hdr && cells.A) out.set(cells.A.v, { note: cells.B?.v ?? "", years: Object.fromEntries(Object.entries(cells).filter(([k]) => /^\d{4}$/.test(hdr[k] ?? "")).map(([k, c]) => [hdr[k], c]))}); } return out; };
    const foot = new Map(); { const x = rd(names["Footnotes"]); for (const [, , body] of x.matchAll(/<row [^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) { const g = (col) => { const m = body.match(new RegExp(`<c r="${col}\\d+"([^>]*?)>(?:<v>([^<]*)</v>)?`)); return m ? (/t="s"/.test(m[1]) ? ss[+m[2]] : m[2]) : undefined; }; const n = g("A"), t = g("C"); if (n && t && /^\d+$/.test(n)) foot.set(n, t); } }
    return { usd: sheet("Current US$"), gdp: sheet("Share of GDP"), gov: sheet("Share of Govt. spending"), foot };
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
await attempt("sipri", async () => {
  const url = await xlsxUrl(); const buf = await get(url, { bin: true }); const tmp = path.join(mkdtempSync(path.join(tmpdir(), "sipri-dl-")), "milex.xlsx"); writeFileSync(tmp, buf);
  const { usd, gdp, gov, foot } = readXlsx(tmp); sources.sipri.file = url.split("/").pop(); sources.sipri.note += ` File: ${sources.sipri.file}.`;
  let matched = 0; const unmatched = [];
  for (const [name, u] of usd) {
    if (!Object.keys(u.years).length) continue; const iso = isoOfName(name); if (!iso) { if (Object.entries(u.years).some(([y, c]) => +y >= FROM && c.v !== "" && Number.isFinite(Number(c.v)))) unmatched.push(name); continue; } matched++;
    const g = gdp.get(name), s = gov.get(name); let any = false;
    for (let y = FROM; y <= 2100; y++) { const cu = u.years[y]; if (!cu) continue; const num = (c) => (c && c.v !== "" && Number.isFinite(Number(c.v)) ? Number(c.v) : null);
      const usdv = num(cu), gv = num(g?.years[y]), sv = num(s?.years[y]); if (usdv == null && gv == null && sv == null) continue;
      any = add(iso, "sipri", y, { usd: usdv != null ? round(usdv) : null, gdp: gv != null ? round(gv * 100, 2) : null, share: sv != null ? round(sv * 100, 2) : null, ...(cu.f ? { f: cu.f } : {}) }) || any; }
    if (!any) { const n = u.note.replace(/\D/g, ""); const ly = Object.keys(u.years).map(Number).filter((y) => Number.isFinite(Number(u.years[y].v)) && u.years[y].v !== "").sort((a, b) => b - a)[0];
      gaps[iso] = { ...(gaps[iso] ?? {}), sipri: trim(foot.get(n)) ?? "SIPRI publishes no figure for this country in the years compared.", ...(ly ? { last: { y: ly, usd: round(Number(u.years[ly].v)), ...(Number.isFinite(Number(g?.years[ly]?.v)) && g?.years[ly]?.v !== "" ? { gdp: round(Number(g.years[ly].v) * 100, 2) } : {}) } } : {}) }; }
  }
  console.log(`[sipri] ${matched} countries matched, no figure for ${Object.entries(gaps).filter(([, g]) => g.sipri).length}; unmatched names with data: ${unmatched.join(", ") || "none"}`);
  if (unmatched.length > 6) throw new Error(`too many SIPRI names unmatched: ${unmatched.join(", ")}`);
});

// National-currency units per US$, annual average: the IMF's own series, and the ECB's euro rate for the euro-area members the IMF's exchange-rate table leaves out.
const fx = {}; let eurPerUsd = {};
const EURO = new Set("AUT BEL HRV CYP EST FIN FRA DEU GRC IRL ITA LVA LTU LUX MLT NLD PRT SVK SVN ESP".split(" "));
try {
  for (const s of series(await get(`https://api.imf.org/external/sdmx/2.1/data/IMF.STA,ER/*.XDC_USD.PA_RT.A?startPeriod=${FROM}`, { text: true }))) for (const [t, v] of s.obs) (fx[s.at.COUNTRY] ??= {})[t] = v;
  const lines = (await get(`https://data-api.ecb.europa.eu/service/data/EXR/A.USD.EUR.SP00.A?startPeriod=${FROM}&format=csvdata`, { text: true })).trim().split("\n"); const h = lines[0].split(","); const ti = h.indexOf("TIME_PERIOD"), vi = h.indexOf("OBS_VALUE");
  for (const l of lines.slice(1)) { const c = l.split(","); eurPerUsd[c[ti]] = 1 / Number(c[vi]); }
} catch (e) { console.error(`[fx] ${e.message}: US$ conversions will be missing`); }
// The IMF and Eurostat restate Croatia (euro from 2023) in euro for every year, and Eurostat does the same for Bulgaria (euro from 2026), so those are converted at the ECB euro rate, not at the old currency's rate.
const rate = (iso, t, eurostat = false) => (EURO.has(iso) || (eurostat && iso === "BGR") ? eurPerUsd[t] : fx[iso]?.[t]);

// ───────────── IMF Government Finance Statistics, expenditure by function: defence (GF02), general government ─────────────
src("imf_gfs", { name: "IMF Government Finance Statistics: defence (COFOG GF02)", publisher: "IMF", basis: "general-government spending on the defence function", kind: "primary", url: "https://data.imf.org/en/datasets/IMF.STA:GFS_COFOG", note: "Country-reported government finance statistics. Narrower than SIPRI's definition (no paramilitary forces or military pensions in most countries). US$ figures convert the national-currency amount at the IMF's period-average exchange rate for the year." });
await attempt("imf_gfs", async () => {
  const g = await get(`https://api.imf.org/external/sdmx/2.1/data/IMF.STA,GFS_COFOG/*.S13.G2MF.GF02_T.XDC+POGDP_PT.A?startPeriod=${FROM}`, { text: true });
  const by = {}; for (const s of series(g)) for (const [t, v] of s.obs) ((by[s.at.COUNTRY] ??= {})[t] ??= {})[s.at.TYPE_OF_TRANSFORMATION] = v;
  for (const [iso, ys] of Object.entries(by)) for (const [t, o] of Object.entries(ys)) { const r = rate(iso, t); add(iso, "imf_gfs", +t, { usd: o.XDC != null && r > 0 ? round(o.XDC / r / 1e6) : null, gdp: o.POGDP_PT != null ? round(o.POGDP_PT, 2) : null }); }
});

// ───────────── Eurostat: general-government expenditure by function (COFOG), defence ─────────────
src("eurostat_cofog", { name: "Eurostat government expenditure by function: defence (COFOG GF02)", publisher: "Eurostat", basis: "general-government spending on the defence function, from national accounts", kind: "primary", url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table", note: "Compiled by Eurostat from each member state's national accounts (EU members and a few others). US$ figures convert the national-currency amount at the IMF's period-average exchange rate (the ECB's for euro-area members)." });
await attempt("eurostat_cofog", async () => {
  const q = (unit) => get(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?format=JSON&lang=EN&sector=S13&cofog99=GF02&na_item=TE&unit=${unit}&sinceTimePeriod=${FROM}`);
  const parse = (j) => { const dim = j.id, size = j.size, ix = Object.fromEntries(dim.map((d) => [d, j.dimension[d].category.index])); const out = {}; const geoI = dim.indexOf("geo"), tI = dim.indexOf("time"); const geoBy = Object.fromEntries(Object.entries(ix.geo).map(([k, v]) => [v, k])), tBy = Object.fromEntries(Object.entries(ix.time).map(([k, v]) => [v, k]));
    for (const [pos, v] of Object.entries(j.value)) { let p = +pos; const idx = []; for (let i = dim.length - 1; i >= 0; i--) { idx[i] = p % size[i]; p = Math.floor(p / size[i]); } (out[geoBy[idx[geoI]]] ??= {})[tBy[idx[tI]]] = v; } return out; };
  const [gdp, nac] = (await Promise.all([q("PC_GDP"), q("MIO_NAC")])).map(parse);
  const iso3 = (g) => (g === "EL" ? "GRC" : countries.find((c) => c.iso2 === g)?.iso3);
  for (const g of new Set([...Object.keys(gdp), ...Object.keys(nac)])) { const iso = iso3(g); if (!iso || /^(EU|EA)/.test(g)) continue; for (const t of new Set([...Object.keys(gdp[g] ?? {}), ...Object.keys(nac[g] ?? {})])) { const r = rate(iso, t, true); add(iso, "eurostat_cofog", +t, { usd: nac[g]?.[t] != null && r > 0 ? round(nac[g][t] / r) : null, gdp: gdp[g]?.[t] != null ? round(gdp[g][t], 2) : null }); } }
});

// ───────────── US Treasury Monthly Treasury Statement, Table 9: outlays by budget function, National Defense ─────────────
src("ust_mts", { name: "US Treasury Monthly Treasury Statement: National Defense outlays", publisher: "US Treasury (Bureau of the Fiscal Service)", basis: "federal national-defense outlays, US fiscal year (October to September)", kind: "primary", url: "https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/outlays-of-the-u-s-government", note: "Budget function 050, federal government only (no state spending), year-to-date at the end of September. Includes Department of Energy nuclear weapons work and other defence-related outlays." });
await attempt("ust_mts", async () => {
  const j = await get(`https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_9?filter=classification_desc:eq:National%20Defense,record_calendar_month:eq:09,record_fiscal_year:gte:${FROM}&sort=-record_date&page%5Bsize%5D=20`);
  for (const r of j.data ?? []) add("USA", "ust_mts", +r.record_fiscal_year, { usd: round(Number(r.current_fytd_rcpt_outly_amt) / 1e6) });
});

// ───────────── sources tried and not usable ─────────────
unavailable.push(
  { name: "NATO defence expenditure of NATO countries", url: "https://www.nato.int/cps/en/natohq/topics_49198.htm", reason: "Published as PDF reports only (def-exp-2025-en.pdf and earlier), with no machine-readable table or API, so it is not read here." },
  { name: "IISS Military Balance+", url: "https://www.iiss.org/military-balance/", reason: "A paid subscription database; there is no open download." },
  { name: "National defence budgets of the UAE, Saudi Arabia, India and China", url: "https://mof.gov.ae/budget/", reason: "Not attempted country by country: these governments publish budgets as PDF statements, and none of them was found to offer a keyless machine-readable feed. The IMF's government-finance series above is the closest open, comparable record." },
);
if (gaps.ARE) gaps.ARE.note = `SIPRI has published no UAE figure since ${gaps.ARE.last?.y ?? "2014"}${gaps.ARE.last ? ` (US$${gaps.ARE.last.usd}m)` : ""}, so the World Bank series, which republishes SIPRI, stops there too. For recent years the IMF figure is the only reading.`;

// A figure that sits more than three times above or below SIPRI's for the same year is far more likely a unit or currency error than a difference of definition: report it so the build can be checked.
for (const [iso, list] of Object.entries(rows)) for (const r of list) { const p = list.find((x) => x.s === "sipri" && x.y === r.y); if (r.s !== "sipri" && p?.usd && r.usd && (r.usd / p.usd > 3 || r.usd / p.usd < 1 / 3)) console.warn(`[check] ${iso} ${r.y} ${r.s} US$${r.usd}m against SIPRI US$${p.usd}m`); }
for (const [iso, list] of Object.entries(rows)) list.sort((a, b) => a.s.localeCompare(b.s) || a.y - b.y);
const ok = Object.values(sources).filter((s) => s.status === "ok" && s.rows > 0).length; const n = Object.keys(rows).length;
if (sources.sipri.status !== "ok" || sources.imf_gfs.status !== "ok" || ok < 3 || n < 120) { console.error(`REFUSING TO WRITE: ${ok} sources with data, ${n} countries`); process.exit(1); }
const year = Math.max(...Object.values(rows).flat().filter((r) => r.s === "sipri").map((r) => r.y));
writeFileSync(new URL("../public/data/military-sources.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), year, sources, unavailable, gaps, countries: rows }));
console.log("countries", n, "| sources", Object.values(sources).map((s) => `${s.id} ${s.status} ${s.rows}`).join(", "), "| ARE", JSON.stringify(rows.ARE));
