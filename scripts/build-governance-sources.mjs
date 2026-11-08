// Builds public/data/governance-sources.json: the independent sources set beside the World Bank WGI (public/data/governance.json), per country and per governance dimension.
// The WGI figures rest on one publisher; this file adds Transparency International CPI, RSF press freedom and four V-Dem indices so a reader can see whether other publishers agree.
// Rules: only figures a source actually returned are stored (a gap stays a gap); a source that cannot be used is listed as unavailable with the reason; scores are kept as the publisher published them.
// Every item is { s: source id, v: score, y: year, r: rank (1 = best), n: countries ranked }. CPI and RSF ranks are the publishers' own; V-Dem publishes no ranks, so ranks here are ours (competition ranking on the latest year).
// Usage: node scripts/build-governance-sources.mjs            (GS_CACHE=<dir> keeps raw responses so a re-run does not hit the sources again)
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const valid = new Set(D("countries.json").map((c) => c.iso3));
const CACHE = process.env.GS_CACHE; if (CACHE) mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET with a disk cache and retries; returns bytes. */
async function get(url, tries = 3) {
  const key = CACHE ? path.join(CACHE, createHash("sha1").update(url).digest("hex")) : null;
  if (key && existsSync(key)) return new Uint8Array(readFileSync(key));
  let err;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90_000), redirect: "follow" }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const b = new Uint8Array(await r.arrayBuffer()); if (key) writeFileSync(key, b); return b; }
    catch (e) { err = e; await sleep(1500 * (i + 1)); }
  }
  throw err;
}

// ---- tiny .xlsx reader (strict-OOXML safe): the sheet named `sheet`, as rows of { column letter: text } ----
function xlsxRows(bytes, sheet) {
  const z = unzipSync(bytes); const txt = (n) => strFromU8(z[n]);
  const wb = txt("xl/workbook.xml"); const rel = txt("xl/_rels/workbook.xml.rels");
  const sh = [...wb.matchAll(/<sheet [^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"/g)].find((m) => m[1] === sheet); if (!sh) throw new Error(`sheet ${sheet} not found`);
  const target = [...rel.matchAll(/<Relationship [^>]*?>/g)].map((m) => m[0]).find((t) => t.includes(`Id="${sh[2]}"`)).match(/Target="([^"]*)"/)[1];
  const strings = [...txt("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
  const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const xml = txt(`xl/${target.replace(/^\/?(xl\/)?/, "")}`);
  return [...xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const o = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const v = c[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1]; if (v == null) continue; o[c[1]] = unesc(/t="s"/.test(c[2]) ? strings[+v] : v); }
    return o;
  });
}

const rankDesc = (items) => { // competition ranking, 1 = highest score
  const sorted = [...items].sort((a, b) => b.v - a.v); sorted.forEach((x, i) => { x.r = i > 0 && sorted[i - 1].v === x.v ? sorted[i - 1].r : i + 1; }); return sorted.length;
};
const parseCsv = (text, sep) => text.split(/\r?\n/).filter(Boolean).map((l) => l.split(sep));

const sources = {}; const unavailable = []; const byIso = {};
const put = (iso, dim, item) => { ((byIso[iso] ??= {})[dim] ??= []).push(item); };
const addSource = (s, rows, meta) => { sources[s] = { id: s, ...meta, rows }; };

// ---- Transparency International CPI (primary file) ----
const CPI_URL = "https://images.transparencycdn.org/images/CPI2025_Results.xlsx";
try {
  const rows = xlsxRows(await get(CPI_URL), "CPI2025"); const h = rows.find((r) => Object.values(r).includes("ISO3")); if (!h) throw new Error("header row not found");
  const col = (re) => Object.keys(h).find((k) => re.test(h[k])); const cIso = col(/^ISO3$/), cScore = col(/^CPI \d{4} score$/), cRank = col(/^Rank$/), year = +h[cScore].match(/\d{4}/)[0];
  const items = rows.filter((r) => r !== h && valid.has(r[cIso]) && r[cScore] != null && r[cRank] != null).map((r) => ({ iso: r[cIso], v: +r[cScore], r: +r[cRank] }));
  const n = rows.filter((r) => r !== h && /^[A-Z]{3}$/.test(r[cIso] ?? "") && r[cScore] != null).length; // countries Transparency International scored, whether or not in our list
  for (const x of items) put(x.iso, "cc", { s: "cpi", v: x.v, y: year, r: x.r, n });
  addSource("cpi", items.length, { name: "Transparency International Corruption Perceptions Index", publisher: "Transparency International", dim: "cc", unit: "score 0-100, higher is cleaner", scale: 100, url: "https://www.transparency.org/en/cpi/2025", file: CPI_URL, year, kind: "primary", licence: "CC BY-ND 4.0 (as stated by Transparency International for the CPI data; scores and ranks are stored exactly as published, with no adaptation)", basis: "Several expert assessments and business surveys of public-sector corruption (the number per country is published in the file), 100 = very clean", note: "Measures perceived public-sector corruption; scores carry a published standard error." });
} catch (e) { unavailable.push({ name: "Transparency International CPI", url: "https://www.transparency.org/en/cpi/2025", dim: "cc", reason: `The results file could not be read: ${e.message}.` }); }

// ---- RSF World Press Freedom Index (primary file) ----
const RSF_URL = "https://rsf.org/sites/default/files/import_classement/2026.csv";
try {
  const lines = parseCsv(new TextDecoder("windows-1252").decode(await get(RSF_URL)), ";"); const h = lines[0];
  const cIso = h.indexOf("ISO"), cRank = h.indexOf("Rank"), cScore = h.findIndex((x) => /^Score \d{4}$/.test(x)); if (cIso < 0 || cScore < 0 || cRank < 0) throw new Error("unexpected columns");
  const year = +h[cScore].match(/\d{4}/)[0]; const all = lines.slice(1).filter((l) => /^[A-Z]{3}$/.test(l[cIso]) && l[cScore]); let k = 0;
  for (const l of all) if (valid.has(l[cIso])) { put(l[cIso], "va", { s: "rsf", v: +l[cScore].replace(",", "."), y: year, r: +l[cRank], n: all.length }); k++; }
  addSource("rsf", k, { name: "Reporters Without Borders World Press Freedom Index", publisher: "Reporters Without Borders (RSF)", dim: "va", unit: "score 0-100, higher is freer", scale: 100, url: "https://rsf.org/en/index", file: RSF_URL, year, kind: "primary", licence: "No licence statement found; RSF publishes the index for free download. Scores and ranks are reused unmodified with attribution; no further reuse rights are claimed.", basis: "Annual survey of journalists and experts plus a count of abuses: political, economic, legal, social and safety indicators", note: "Measures press freedom only, a narrower thing than the WGI voice and accountability score." });
} catch (e) { unavailable.push({ name: "RSF World Press Freedom Index", url: "https://rsf.org/en/index", dim: "va", reason: `The index file could not be read: ${e.message}.` }); }

// ---- V-Dem v16, through Our World in Data's republication (V-Dem's own download is behind a form) ----
const OWID = (slug) => `https://ourworldindata.org/grapher/${slug}.csv?v=1&csvType=full&useColumnShortNames=true`;
const VDEM = [
  { s: "vdem_elec", slug: "electoral-democracy-index", dim: "va", name: "V-Dem Electoral Democracy Index", basis: "Expert-coded: clean elections, suffrage, freedom of association and expression, elected officials" },
  { s: "vdem_lib", slug: "liberal-democracy-index", dim: "va", name: "V-Dem Liberal Democracy Index", basis: "Electoral democracy plus rule of law, judicial and legislative constraints on the executive" },
  { s: "vdem_civ", slug: "human-rights-index-vdem", dim: "va", name: "V-Dem Civil Liberties Index (human rights index)", basis: "Expert-coded: freedom from torture, political killings and forced labour; freedom of movement, religion, expression and association" },
  { s: "vdem_rule", slug: "rule-of-law-index", dim: "rl", name: "V-Dem Rule of Law Index", basis: "Expert-coded: compliance with the law, judicial independence, impartial public administration" },
];
for (const m of VDEM) {
  try {
    const lines = parseCsv(new TextDecoder().decode(await get(OWID(m.slug))), ","); const h = lines[0]; if (h[1] !== "code" || h[2] !== "year") throw new Error("unexpected columns");
    const latest = {}; for (const l of lines.slice(1)) { if (l[3] === "" || !/^[A-Z]{3}$/.test(l[1])) continue; const y = +l[2]; if (!latest[l[1]] || y > latest[l[1]].y) latest[l[1]] = { iso: l[1], y, v: +l[3] }; }
    const top = Math.max(...Object.values(latest).map((x) => x.y)); const cur = Object.values(latest).filter((x) => x.y === top); const n = rankDesc(cur); let k = 0;
    for (const x of cur) if (valid.has(x.iso)) { put(x.iso, m.dim, { s: m.s, v: x.v, y: x.y, r: x.r, n }); k++; }
    addSource(m.s, k, { name: m.name, publisher: "V-Dem Institute (University of Gothenburg), republished by Our World in Data", dim: m.dim, unit: "index 0-1, higher is more democratic", scale: 1, url: `https://ourworldindata.org/grapher/${m.slug}`, file: OWID(m.slug), year: top, kind: "republisher", family: "vdem", licence: "V-Dem data are CC BY-SA 4.0 (this file is shared under the same licence). Cite: Coppedge et al. 2026, V-Dem Dataset v16, Varieties of Democracy Project, https://doi.org/10.23696/vdemds26. Fetched through Our World in Data's republication (CC BY 4.0).", basis: m.basis, note: "Model-based estimates from several thousand country experts; V-Dem publishes no ranks, so the rank shown is computed here on the latest year." });
  } catch (e) { unavailable.push({ name: m.name, url: `https://ourworldindata.org/grapher/${m.slug}`, dim: m.dim, reason: `The Our World in Data republication could not be read: ${e.message}.` }); }
}

// ---- the existing World Bank WGI figures, so every comparison reads one file ----
const wgi = D("governance.json"); const W = { cc: "cc", va: "va", rl: "rl" };
for (const [iso, g] of Object.entries(wgi.countries)) for (const [dim, k] of Object.entries(W)) if (valid.has(iso) && g[k] != null) (((byIso[iso] ??= {})[dim] ??= []).unshift({ s: "wgi", v: g[k], y: g.y ?? wgi.year, r: g[`${k}Rank`] ?? null, n: wgi.n[k] }));
sources.wgi = { id: "wgi", name: "World Bank Worldwide Governance Indicators", publisher: "World Bank", dim: "cc,va,rl", unit: "percentile rank 0-100, higher is better", scale: 100, url: wgi.source.url, file: "public/data/governance.json", year: wgi.year, kind: "primary", licence: wgi.source.licence, basis: "Aggregate of dozens of perception surveys and expert assessments", note: "The headline figure this file is set against.", rows: Object.keys(wgi.countries).length };

unavailable.push(
  { name: "Freedom House Freedom in the World", url: "https://freedomhouse.org/report/freedom-world", dim: "va,rl", reason: "Freedom House states its data are free for personal, academic and non-profit use and that commercial use needs prior formal permission; its current data file is also not at a stable open URL. Not stored here; the V-Dem indices cover the same ground." },
  { name: "V-Dem country-year dataset (direct download)", url: "https://v-dem.net/data/the-v-dem-dataset/country-year-v-dem-core-v16/", dim: "va,rl", reason: "The direct download is behind a form that asks for an email address and gender, which this build does not fill in. The same V-Dem v16 indices are taken from Our World in Data's republication instead, and are marked as republished." },
  { name: "World Justice Project Rule of Law Index", url: "https://worldjusticeproject.org/rule-of-law-index/downloads", dim: "rl", reason: "The downloads page refused an automated request (HTTP 403), so no figures were read." },
  { name: "Bertelsmann Transformation Index (BTI)", url: "https://bti-project.org/en/downloads", dim: "va,rl", reason: "Downloadable, but it covers only developing and transition countries (no UAE and no high-income country), so it cannot serve as a cross-check for the UAE-centred comparison." },
);

// guard: refuse to write a thinner file than a failure would leave
const need = ["cpi", "rsf", "vdem_elec", "vdem_lib", "vdem_civ", "vdem_rule"].filter((s) => (sources[s]?.rows ?? 0) < 150);
const countries = Object.fromEntries(Object.entries(byIso).sort(([a], [b]) => a.localeCompare(b)));
if (!sources.cpi || need.length >= 5 || Object.keys(countries).length < 170) { console.error(`REFUSING TO WRITE: thin or missing sources ${need.join(",")}`); process.exit(1); }
for (const s of need) console.warn(`warning: ${s} has only ${sources[s]?.rows ?? 0} rows`);
const out = { built: new Date().toISOString(), dims: { cc: { wgi: "GOV_WGI_CC.SC", label: "Control of corruption" }, va: { wgi: "GOV_WGI_VA.SC", label: "Voice and accountability" }, rl: { wgi: "GOV_WGI_RL.SC", label: "Rule of law" } }, sources, unavailable, countries };
writeFileSync(new URL("../public/data/governance-sources.json", import.meta.url), JSON.stringify(out));
console.log("countries", Object.keys(countries).length, Object.values(sources).map((s) => `${s.id}:${s.rows}@${s.year}`).join(" "), "| ARE", JSON.stringify(countries.ARE));
