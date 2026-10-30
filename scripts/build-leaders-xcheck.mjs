// Builds public/data/leaders-xcheck.json: second, independent readings for "who holds office" and "when is the next election", set beside the Wikidata / Wikipedia figures in leaders.json.
// The app's leaders and elections come from one community-edited source family. This file holds what other publishers say, so a reader can see where they disagree.
// Sources read: IPU Parline (legislative elections, open JSON API), IFES ElectionGuide (public "upcoming" and "anticipated" listing pages; its bulk data API needs credentials and is not used),
// and the CIA World Factbook as republished by the factbook.json project (chiefs of state and heads of government; the Factbook was discontinued, so this is a frozen, dated snapshot).
// Rules: only what a source returned is stored; a source that cannot be reached is listed as unavailable with the reason, never filled in. Verdicts are computed at read time in src/lib/leaders-xcheck.ts.
// Usage: node scripts/build-leaders-xcheck.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const countries = D("countries.json"); const byIso2 = new Map(countries.map((c) => [c.iso2, c.iso3])); const fips = D("fips.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, { text = false, tries = 4, timeout = 90_000 } = {}) => {
  let last = "";
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) }); if (r.ok) return text ? await r.text() : await r.json(); last = `HTTP ${r.status}`; if (r.status < 500 && r.status !== 429) break; } catch (e) { last = e.message; }
    await sleep(1500 * (i + 1));
  }
  throw new Error(`${url}: ${last}`);
};
const norm = (x) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z]/g, "");
const byName = new Map(countries.map((c) => [norm(c.name), c.iso3]));
const ALIAS = { czechrepublic: "CZE", ivorycoast: "CIV", turkey: "TUR", capeverde: "CPV", democraticrepublicofthecongo: "COD", republicofthecongo: "COG", unitedstatesofamerica: "USA", unitedstates: "USA", burma: "MMR", swaziland: "SWZ", eswatini: "SWZ", thegambia: "GMB", gambia: "GMB", thebahamas: "BHS", easttimor: "TLS", macedonia: "MKD", northmacedonia: "MKD", southkorea: "KOR", northkorea: "PRK", russia: "RUS", palestine: "PSE", vietnam: "VNM", laos: "LAO", syria: "SYR", iran: "IRN", brunei: "BRN", micronesia: "FSM", slovakia: "SVK", kyrgyzstan: "KGZ", virginislandsus: "VIR", koreaofrepublic: "KOR", korearepublicof: "KOR", bolivia: "BOL", venezuela: "VEN", tanzania: "TZA", moldova: "MDA", sttkittsandnevis: "KNA", saintkittsandnevis: "KNA", saintluciaisland: "LCA", timorleste: "TLS", turkiye: "TUR", cotedivoire: "CIV", guineabissau: "GNB", gambiathe: "GMB", micronesiafederatedstatesof: "FSM" };
const valid = new Set(countries.map((c) => c.iso3));
const iso3Of = (name) => { const i = byName.get(norm(name)) ?? ALIAS[norm(name)]; return i && valid.has(i) ? i : undefined; };
const today = new Date().toISOString().slice(0, 10);
const out = {}; const rec = (iso) => (out[iso] ??= {});
const sources = {}; const unavailable = [];
const src = (id, o) => (sources[id] = { id, status: "failed", rows: 0, ...o });

// 1. IPU Parline: the next expected election of each chamber is a field on the chamber's latest election record.
src("ipu", { name: "IPU Parline: expected date of next elections", publisher: "Inter-Parliamentary Union", basis: "Parliaments' own data, compiled by the IPU from national parliaments; legislative chambers only", url: "https://data.ipu.org/", licence: "CC BY-NC-SA 4.0", note: "Dates are usually a month, stored by the IPU as the last day of it. Covers legislative elections, not presidential ones. The expected date is whatever the parliament reported and is not always refreshed after an election is called early." });
try {
  const all = async (ep) => { const rows = []; for (let p = 1; p < 80; p++) { const j = await get(`https://api.data.ipu.org/v1/${ep}?page%5Bnumber%5D=${p}&page%5Bsize%5D=100`); rows.push(...j.data); if (j.data.length < 100) break; await sleep(300); } return rows; };
  const [chambers, elections] = await Promise.all([all("chambers"), all("elections")]);
  const latest = new Map();
  for (const e of elections) { const ch = e.attributes.chamber?.value; const d = e.attributes.election_date?.value?.from?.slice(0, 10); if (!ch || !d) continue; if (!latest.has(ch) || d > latest.get(ch).d) latest.set(ch, { d, e }); }
  const termOf = new Map(chambers.map((c) => { const t = c.attributes.parliamentary_term; const last = Array.isArray(t) ? t.filter((x) => typeof x.value === "number").at(-1)?.value : null; return [c.id, last ?? null]; }));
  const lastOf = new Map(chambers.map((c) => [c.id, c.attributes.last_election?.value?.from?.slice(0, 10) ?? null]));
  for (const [ch, { d, e }] of latest) {
    const iso = byIso2.get(ch.split("-")[0]); if (!iso) continue; const exp = e.attributes.expect_date_next_election?.value?.slice(0, 10) ?? null;
    const last = lastOf.get(ch) ?? d; if (!exp) continue; // a chamber with no expected date is a gap, not an entry
    (rec(iso).ipu ??= []).push({ ch: ch.split("-")[1], next: exp, last, term: termOf.get(ch) ?? null, url: `https://data.ipu.org/parliament/${ch.split("-")[0]}/` });
  }
  sources.ipu.rows = Object.values(out).filter((x) => x.ipu).length; sources.ipu.status = sources.ipu.rows ? "ok" : "failed";
  console.log("IPU: chambers", chambers.length, "elections", elections.length, "countries with an expected date", sources.ipu.rows);
} catch (e) { console.error("IPU failed:", e.message); unavailable.push({ name: "IPU Parline", url: "https://data.ipu.org/", reason: `The API could not be read: ${e.message}` }); }
unavailable.push({ name: "IPU Parline website exports (data.ipu.org downloads)", url: "https://data.ipu.org/", reason: "The website refuses non-browser requests (HTTP 403); the open JSON API at api.data.ipu.org is used instead." });

// 2. IFES ElectionGuide: public listing pages, two requests in all. Its bulk data access needs credentials, so it is not used.
src("ifes", { name: "IFES ElectionGuide: upcoming and anticipated elections", publisher: "IFES (International Foundation for Electoral Systems)", basis: "IFES staff research on national electoral management bodies; each date is marked confirmed or not confirmed", url: "https://www.electionguide.org/elections/", licence: "Public pages, read for reference with attribution; IFES' data service needs credentials", note: "Only the two public listing pages are read (no training use, no bulk crawl). Covers presidential and legislative elections." });
try {
  const unmatched = new Set(); let rows = 0;
  for (const page of ["upcoming", "anticipated"]) {
    const html = await get(`https://www.electionguide.org/elections/type/${page}/`, { text: true });
    for (const m of html.matchAll(/<strong>([^<]+)<\/strong>\s*(?:<small>\(([^)]*)\)<\/small>)?\s*<br>\s*<a href="(\/elections\/id\/\d+\/)">([^<]+)<\/a><br>\s*<a href="\/countries\/id\/\d+\/">([^<]+)<\/a>/g)) {
      const dt = new Date(m[1] + " UTC"); if (Number.isNaN(+dt)) continue; const date = dt.toISOString().slice(0, 10); if (date < today) continue;
      const iso = iso3Of(m[5].trim()); if (!iso) { unmatched.add(m[5].trim()); continue; }
      const list = (rec(iso).ifes ??= []); const url = `https://www.electionguide.org${m[3]}`; if (list.some((x) => x.url === url)) continue;
      list.push({ label: m[4].trim(), date, mark: m[2] === "t" ? "t" : "d", url }); rows++;
    }
    await sleep(1500);
  }
  for (const v of Object.values(out)) v.ifes?.sort((a, b) => a.date.localeCompare(b.date));
  sources.ifes.rows = rows; sources.ifes.status = rows ? "ok" : "failed"; console.log("IFES: elections", rows, "unmatched country names:", [...unmatched].join(", ") || "none");
} catch (e) { console.error("IFES failed:", e.message); unavailable.push({ name: "IFES ElectionGuide", url: "https://www.electionguide.org/elections/", reason: `The listing pages could not be read: ${e.message}` }); }
unavailable.push({ name: "IFES ElectionGuide data service", url: "https://www.electionguide.org/", reason: "Bulk and API access needs credentials requested from IFES; not held, so not used." });

// 3. CIA World Factbook via factbook.json: chief of state and head of government text per country. The Factbook was discontinued, so this is frozen at the date the project last refreshed it.
src("cia", { name: "CIA World Factbook: chief of state and head of government (frozen snapshot)", publisher: "CIA World Factbook, republished by the factbook.json project", basis: "Compiled by the CIA from public sources; no longer updated", url: "https://github.com/factbook/factbook.json", licence: "Public domain (US Government work)", kind: "republisher", note: "The CIA has retired the Factbook, so this reading stops at its snapshot date: an office-holder who changed since then shows as a difference that is a change of office, not an error. Names are matched on surname text, so a different transliteration also shows as a difference." });
try {
  const tree = await get("https://api.github.com/repos/factbook/factbook.json/git/trees/master?recursive=1");
  const files = tree.tree.filter((t) => /^[a-z-]+\/[a-z]{2}\.json$/.test(t.path)); const byGec = new Map(files.map((f) => [f.path.split("/")[1].replace(".json", "").toUpperCase(), f.path]));
  const commits = await get("https://api.github.com/repos/factbook/factbook.json/commits?path=europe/gm.json&per_page=1"); const snapshot = commits[0]?.commit?.committer?.date?.slice(0, 10) ?? null; sources.cia.snapshot = snapshot;
  const todo = countries.filter((c) => fips[c.iso3] && byGec.has(fips[c.iso3])); let n = 0;
  const ENT = { eacute: "é", egrave: "è", ecirc: "ê", aacute: "á", agrave: "à", acirc: "â", iacute: "í", oacute: "ó", ocirc: "ô", uacute: "ú", ntilde: "ñ", ccedil: "ç", uuml: "ü", ouml: "ö", auml: "ä", amp: "&", apos: "'", quot: '"', nbsp: " ", Eacute: "É", Iacute: "Í", Ntilde: "Ñ", Oacute: "Ó", Aacute: "Á", Uacute: "Ú", rsquo: "’", lsquo: "‘", ndash: "–" };
  const clip = (s) => (s ? String(s).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&([a-z]+);/gi, (m, e) => ENT[e] ?? m).replace(/\s+/g, " ").slice(0, 420) : null);
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(async (c) => {
      try {
        const j = await get(`https://raw.githubusercontent.com/factbook/factbook.json/master/${byGec.get(fips[c.iso3])}`, { tries: 3 }); const ex = j.Government?.["Executive branch"]; if (!ex) return;
        const state = clip(ex["chief of state"]?.text), gov = clip(ex["head of government"]?.text); if (!state && !gov) return; rec(c.iso3).cia = { ...(state ? { state } : {}), ...(gov ? { gov } : {}) }; n++;
      } catch { /* one country missing is a gap, not a failure */ }
    }));
  }
  sources.cia.rows = n; sources.cia.status = n ? "ok" : "failed"; console.log("Factbook: countries read", n, "of", todo.length, "snapshot", snapshot);
} catch (e) { console.error("Factbook failed:", e.message); unavailable.push({ name: "CIA World Factbook (factbook.json)", url: "https://github.com/factbook/factbook.json", reason: `Could not be read: ${e.message}` }); }
unavailable.push({ name: "CIA World Factbook, live site", url: "https://www.cia.gov/the-world-factbook/", reason: "The CIA retired the Factbook; the live pages now redirect to a farewell notice, so only the frozen republished snapshot exists." });
unavailable.push({ name: "National electoral commission websites", url: "https://www.electionguide.org/countries/", reason: "About 190 separate sites in different formats and languages with no common machine-readable feed; not read. IFES' listing is the one place that summarises them." });
unavailable.push({ name: "UN Protocol list of heads of state, heads of government and foreign ministers", url: "https://www.un.org/dgacm/en/content/protocol", reason: "Published only as a periodically updated PDF; no stable machine-readable link was found, so it was not read." });

const have = Object.keys(out).length; const prev = prevOf("leaders-xcheck.json", (j) => Object.keys(j.countries).length);
if (!Object.values(sources).some((s) => s.status === "ok") || thin(have, prev, 0.7)) { console.error(`REFUSING TO WRITE: ${have} countries (previously ${prev})`); process.exit(1); }
writeFileSync(new URL("../public/data/leaders-xcheck.json", import.meta.url), JSON.stringify({ v: 1, built: new Date().toISOString(), sources, unavailable, countries: out }));
console.log("countries", have, "| with IPU", Object.values(out).filter((x) => x.ipu).length, "| IFES", Object.values(out).filter((x) => x.ifes).length, "| Factbook", Object.values(out).filter((x) => x.cia).length);
