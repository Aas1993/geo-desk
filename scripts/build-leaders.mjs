// Builds public/data/leaders.json: the current head of state and head of government of each country (with start date and birth date) and the next national elections.
// Source: Wikidata (CC0), current office-holders only (statements with no end date). Coverage and dates can lag or be missing: the app says so where a field is absent.
// Usage: node scripts/build-leaders.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const q = async (sparql) => { for (let i = 0; i < 4; i++) { try { const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sparql), { headers: UA, signal: AbortSignal.timeout(90_000) }); if (r.ok) return (await r.json()).results.bindings; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 2500 * (i + 1))); } throw new Error("wikidata query failed"); };
const day = (v) => (v ? v.slice(0, 10) : null);

const heads = await q(`SELECT ?iso ?role ?p ?pLabel ?start ?birth WHERE {
  { ?c p:P35 ?st . ?st ps:P35 ?p . BIND("state" AS ?role) } UNION { ?c p:P6 ?st . ?st ps:P6 ?p . BIND("government" AS ?role) }
  ?c wdt:P298 ?iso . FILTER NOT EXISTS { ?c wdt:P576 ?e } FILTER NOT EXISTS { ?st pq:P582 ?end }
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?p wdt:P569 ?birth }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } }`);
const out = {};
for (const b of heads) {
  const iso = b.iso.value; if (!valid.has(iso)) continue; const key = b.role.value === "state" ? "state" : "gov"; const cur = (out[iso] ??= {});
  const rec = { name: b.pLabel.value, qid: b.p.value.split("/").pop(), start: day(b.start?.value), birth: day(b.birth?.value) }; if (/^Q\d+$/.test(rec.name)) continue;
  // several current statements (co-heads, or an old one never closed): keep the latest start
  if (!cur[key] || (rec.start ?? "") > (cur[key].start ?? "")) cur[key] = rec;
}
// Upcoming national elections: Wikipedia's "<year> national electoral calendar" pages (CC BY-SA). A Wikidata query for this times out, and the calendar lists the major offices clearly.
const norm = (x) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z]/g, "");
const byName = new Map(countries.map((c) => [norm(c.name), c.iso3])); const ALIAS = { czechrepublic: "CZE", ivorycoast: "CIV", turkey: "TUR", capeverde: "CPV", democraticrepublicofthecongo: "COD", republicofthecongo: "COG", unitedstates: "USA", burma: "MMR", swaziland: "SWZ", eswatini: "SWZ", thegambia: "GMB", gambia: "GMB", thebahamas: "BHS", easttimor: "TLS", macedonia: "MKD", southkorea: "KOR", northkorea: "PRK", russia: "RUS", palestine: "PSE", vietnam: "VNM", laos: "LAO", syria: "SYR", iran: "IRN", brunei: "BRN", micronesia: "FSM", slovakia: "SVK", kyrgyzstan: "KGZ" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const today = new Date().toISOString().slice(0, 10); const elections = {}; let unmatched = new Set(); const thisYear = new Date().getFullYear();
for (const year of [thisYear, thisYear + 1, thisYear + 2]) {
  let html = ""; try { const r = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${year}_national_electoral_calendar&prop=text&format=json&formatversion=2&redirects=1`, { headers: UA, signal: AbortSignal.timeout(40_000) }); html = (await r.json()).parse?.text ?? ""; } catch { /* page missing or unreachable: skip the year */ }
  let month = 0, lastDate = null;
  for (const m of html.matchAll(/<h[23][^>]*id="([A-Za-z]+)"|<li>([\s\S]*?)<\/li>/g)) {
    if (m[1]) { const k = MONTHS.indexOf(m[1]); if (k >= 0) { month = k + 1; lastDate = null; } continue; }
    if (!month) continue; const t = m[2].replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&#\d+;|&\w+;/g, " ").replace(/\s+/g, " ").trim();
    let rest = t; const d = /^(?:(\d{1,2})(?:\s*[–-]\s*\d{1,2})?\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)?\s*:\s*(.+)$/.exec(t);
    let date = lastDate; if (d) { rest = d[3]; const mm = d[2] ? MONTHS.indexOf(d[2]) + 1 : month; date = `${year}-${String(mm).padStart(2, "0")}-${d[1] ? String(d[1]).padStart(2, "0") : "00"}`; lastDate = date; }
    if (!date) continue; const parts = rest.split(/,\s*/); const country = parts.shift()?.trim() ?? ""; const office = parts.join(", ").trim(); if (!country || !office) continue;
    const iso = byName.get(norm(country)) ?? ALIAS[norm(country)]; if (!iso) { unmatched.add(country); continue; }
    if (date.slice(0, 7) < today.slice(0, 7)) continue; if (/referendum/i.test(office) && !/president|parliament|assembly/i.test(office)) continue;
    (elections[iso] ??= []).push({ label: `${office} (${year})`.slice(0, 120), date, approx: date.endsWith("-00") }); 
  }
}
for (const v of Object.values(elections)) { v.sort((a, b) => a.date.localeCompare(b.date)); const seen = new Set(); for (let i = v.length - 1; i >= 0; i--) { const k = v[i].label + v[i].date; if (seen.has(k)) v.splice(i, 1); else seen.add(k); } v.splice(4); }
console.log("calendar entries matched to", Object.keys(elections).length, "countries; unmatched names:", [...unmatched].slice(0, 12).join(", "));
const n = Object.keys(out).length; const prev = prevOf("leaders.json", (j) => Object.keys(j.countries).length);
if (n < 150 || thin(n, prev, 0.9)) { console.error(`REFUSING TO WRITE: ${n} countries with a current head of state or government`); process.exit(1); }
for (const [iso, v] of Object.entries(elections)) if (out[iso]) out[iso].elections = v; else out[iso] = { elections: v };
writeFileSync(new URL("../public/data/leaders.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), source: { name: "Wikidata (office-holders) and Wikipedia national electoral calendars (elections)", url: "https://www.wikidata.org/", licence: "CC0 (Wikidata), CC BY-SA 4.0 (Wikipedia)", note: "Current office-holders as recorded in Wikidata, and scheduled national elections from Wikipedia's electoral calendars. Start and birth dates can be missing, election dates can move and months without a day are marked approximate: check an official source before relying on a date." }, countries: out }));
const withState = Object.values(out).filter((x) => x.state).length, withGov = Object.values(out).filter((x) => x.gov).length, withStart = Object.values(out).filter((x) => x.state?.start).length;
console.log("countries", n, "| with head of state", withState, "| head of government", withGov, "| state start dates", withStart, "| countries with a coming election", Object.keys(elections).length);
console.log("EGY", JSON.stringify(out.EGY)); console.log("IND", JSON.stringify(out.IND)); console.log("elections sample", JSON.stringify(Object.entries(elections).slice(0, 4)));
