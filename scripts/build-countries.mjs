// Builds public/data/countries.json from World Bank (basics) + Wikidata (numeric id, Arabic name, currency, languages, borders).
import { writeFileSync, readFileSync, renameSync, existsSync } from "node:fs";
const UA = { "User-Agent": "geo-desk/0.1 (local dev build script)" };
const j = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h } }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };

const wb = (await j("https://api.worldbank.org/v2/country?format=json&per_page=400"))[1]
  .filter((c) => c.region.id !== "NA" && c.capitalCity !== "" || ["PSE", "ISR", "HKG", "MAC"].includes(c.id)); // World Bank leaves the capital blank for these, so they need an explicit include
const CAPITAL = { ISR: "Jerusalem", PSE: "Ramallah", HKG: "Hong Kong", MAC: "Macao" }; // politically sensitive: change if the desk prefers another convention
const COORD = { PSE: [31.9, 35.2] }; // World Bank has no point for Palestine
// Display names: the World Bank labels ("Korea", "Congo", "West Bank and Gaza", "Venezuela, RB") are wrong or ambiguous for a ministry desk, and two countries must never share a name.
const NAME = { PSE: "Palestine", COD: "DR Congo", COG: "Republic of the Congo", KOR: "South Korea", PRK: "North Korea", VEN: "Venezuela", BHS: "Bahamas", GMB: "Gambia", SOM: "Somalia", LAO: "Laos", RUS: "Russia", SYR: "Syria", KGZ: "Kyrgyzstan", SVK: "Slovakia", FSM: "Micronesia", BRN: "Brunei", VNM: "Vietnam", YEM: "Yemen", IRN: "Iran", EGY: "Egypt" };
const ind = async (code) => {
  const rows = (await j(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&mrnev=1`))[1] ?? [];
  const m = {}; for (const r of rows) if (r.value != null) m[r.countryiso3code] = { v: r.value, y: +r.date }; return m;
};
const [pop, area] = await Promise.all([ind("SP.POP.TOTL"), ind("AG.LND.TOTL.K2")]);

const q = `SELECT ?c ?iso3 ?num ?ar ?cur ?curCode ?lang ?nb WHERE {
  ?c wdt:P298 ?iso3 . ?c wdt:P31/wdt:P279* wd:Q6256 .
  OPTIONAL { ?c wdt:P299 ?num } OPTIONAL { ?c rdfs:label ?ar FILTER(lang(?ar)="ar") }
  OPTIONAL { ?c wdt:P38 ?cu . ?cu rdfs:label ?cur FILTER(lang(?cur)="en") OPTIONAL { ?cu wdt:P498 ?curCode } }
  OPTIONAL { ?c wdt:P37 ?l . ?l rdfs:label ?lang FILTER(lang(?lang)="en") }
  OPTIONAL { ?c wdt:P47 ?n . ?n wdt:P298 ?nb }
  FILTER NOT EXISTS { ?c wdt:P576 ?end } }`;
const u = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q);
const wd = (await j(u, { Accept: "application/sparql-results+json" })).results.bindings;
const meta = {};
for (const b of wd) {
  const k = b.iso3.value; const m = (meta[k] ??= { qid: null, num: null, ar: null, currency: new Set(), languages: new Set(), borders: new Set() });
  m.qid = b.c.value.split("/").pop();
  if (b.num) m.num = b.num.value; if (b.ar) m.ar = b.ar.value;
  if (b.cur) m.currency.add(b.cur.value + (b.curCode ? ` (${b.curCode.value})` : ""));
  if (b.lang) m.languages.add(b.lang.value); if (b.nb) m.borders.add(b.nb.value);
}
const flag = (iso2) => [...iso2.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
// Hong Kong and Macao are not "countries" in Wikidata (no numeric code on the item), but the atlas has their shapes and the UAE has agreements and a consulate with each, so they are added by hand.
const SPECIAL = { HKG: { num: "344", qid: "Q8646", name: "Hong Kong", nameAr: "هونغ كونغ", languages: ["Chinese", "English"], currencies: ["Hong Kong dollar (HKD)"], borders: ["CHN"] }, MAC: { num: "446", qid: "Q14773", name: "Macao", nameAr: "ماكاو", languages: ["Chinese", "Portuguese"], currencies: ["Macanese pataca (MOP)"], borders: ["CHN"] } };
const out = wb.map((c) => {
  const m = meta[c.id] ?? {};
  return {
    iso3: c.id, iso2: c.iso2Code, qid: m.qid ?? null, num: m.num ?? null, name: NAME[c.id] ?? c.name.replace(/, (Rep\.|Dem\. Rep\.|Islamic Rep\.|Arab Rep\.)$/, ""),
    nameAr: m.ar ?? null, capital: c.capitalCity || CAPITAL[c.id] || null,
    lat: c.latitude ? +c.latitude : COORD[c.id]?.[0] ?? null, lng: c.longitude ? +c.longitude : COORD[c.id]?.[1] ?? null,
    region: c.region.value.trim(), flag: flag(c.iso2Code),
    population: pop[c.id] ?? null, areaKm2: area[c.id]?.v ?? null,
    currencies: [...(m.currency ?? [])].slice(0, 2), languages: [...(m.languages ?? [])].slice(0, 4),
    borders: [...(m.borders ?? [])],
    ...(SPECIAL[c.id] ?? {}),
  };
}).filter((c) => c.num);
// Three entities the search must offer that the World Bank + Wikidata join drops: the Holy See (a UN observer state) and Taiwan are not on the World Bank list, and Kosovo has no ISO numeric code (412 is the UN Comtrade reporter code, and its map shape has no id, so countries.ts matches it by name). Figures are from Wikidata (population latest dated value, area) and are refreshed by hand.
const EXTRA = [
  { iso3: "VAT", iso2: "VA", qid: "Q237", num: "336", name: "Vatican City", nameAr: "الفاتيكان", capital: "Vatican City", lat: 41.904, lng: 12.453, region: "Europe & Central Asia", population: { v: 882, y: 2024 }, areaKm2: 0.49, currencies: ["Euro (EUR)"], languages: ["Italian", "Latin"], borders: ["ITA"] },
  { iso3: "TWN", iso2: "TW", qid: "Q865", num: "158", name: "Taiwan", nameAr: "تايوان", capital: "Taipei", lat: 25.0375, lng: 121.5625, region: "East Asia & Pacific", population: { v: 23317031, y: 2025 }, areaKm2: 36193, currencies: ["New Taiwan dollar (TWD)"], languages: ["Mandarin Chinese"], borders: [] },
  { iso3: "XKX", iso2: "XK", qid: "Q1246", num: "412", name: "Kosovo", nameAr: "كوسوفو", capital: "Pristina", lat: 42.6667, lng: 21.1667, region: "Europe & Central Asia", population: { v: 1586659, y: 2024 }, areaKm2: 10909, currencies: ["Euro (EUR)"], languages: ["Albanian", "Serbian"], borders: ["ALB", "MKD", "MNE", "SRB"] },
];
for (const e of EXTRA) if (!out.some((c) => c.iso3 === e.iso3)) out.push({ ...e, flag: flag(e.iso2) });
// Refuse to overwrite a good file with a thin one: a partial Wikidata answer leaves most countries without a numeric code and they would all be filtered out above.
const target = new URL("../public/data/countries.json", import.meta.url); const prev = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")).length : 0;
if (out.length < 190 || (prev && out.length < prev * 0.95)) { console.error(`REFUSING TO WRITE: ${out.length} countries (existing file has ${prev})`); process.exit(1); }
writeFileSync(new URL("../public/data/countries.json.tmp", import.meta.url), JSON.stringify(out)); renameSync(new URL("../public/data/countries.json.tmp", import.meta.url), target);
console.log("countries:", out.length, "of wb", wb.length, "| with ar:", out.filter((c) => c.nameAr).length, "| with borders:", out.filter((c) => c.borders.length).length);
