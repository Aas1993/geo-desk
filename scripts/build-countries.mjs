// Builds public/data/countries.json from World Bank (basics) + Wikidata (numeric id, Arabic name, currency, languages, borders).
import { writeFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk/0.1 (local dev build script)" };
const j = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h } }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };

const wb = (await j("https://api.worldbank.org/v2/country?format=json&per_page=400"))[1]
  .filter((c) => c.region.id !== "NA" && c.capitalCity !== "" || ["PSE"].includes(c.id));
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
const out = wb.map((c) => {
  const m = meta[c.id] ?? {};
  return {
    iso3: c.id, iso2: c.iso2Code, qid: m.qid ?? null, num: m.num ?? null, name: c.name.replace(/, (Rep\.|Dem\. Rep\.|Islamic Rep\.|Arab Rep\.)$/, ""),
    nameAr: m.ar ?? null, capital: c.capitalCity || null,
    lat: c.latitude ? +c.latitude : null, lng: c.longitude ? +c.longitude : null,
    region: c.region.value, flag: flag(c.iso2Code),
    population: pop[c.id] ?? null, areaKm2: area[c.id]?.v ?? null,
    currencies: [...(m.currency ?? [])].slice(0, 2), languages: [...(m.languages ?? [])].slice(0, 4),
    borders: [...(m.borders ?? [])],
  };
}).filter((c) => c.num);
writeFileSync(new URL("../public/data/countries.json", import.meta.url), JSON.stringify(out));
console.log("countries:", out.length, "of wb", wb.length, "| with ar:", out.filter((c) => c.nameAr).length, "| with borders:", out.filter((c) => c.borders.length).length);
