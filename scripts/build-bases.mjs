// Builds public/data/layers/bases.geojson: military bases from Wikidata (CC0).
// Items whose P31 is a military-base class (a curated list, not the whole Q245016 subclass tree, which drags in barracks,
// cantonment towns and shipyards), with coordinates (P625), at least 2 Wikipedia sitelinks, and no end date (P576 / P3999).
// Country = P17, operator = P137 label (when present).
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const byQid = new Map(countries.map((c) => [c.qid, c]));
async function sparql(query) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch("https://query.wikidata.org/sparql", { method: "POST", headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ query }), signal: AbortSignal.timeout(130_000) });
      if (r.ok) return (await r.json()).results.bindings;
      const wait = r.status === 429 ? (+r.headers.get("retry-after") || 30) * 1000 : 5_000 * (i + 1); console.warn("SPARQL", r.status, "retrying in", wait / 1000, "s"); await sleep(wait);
    } catch (e) { console.warn("SPARQL error", e.message); await sleep(5_000 * (i + 1)); }
  }
  throw new Error("SPARQL failed");
}
const v = (b, k) => b[k]?.value;
const point = (s) => { const m = /Point\((-?[\d.]+(?:e-?\d+)?) (-?[\d.]+(?:e-?\d+)?)\)/i.exec(s ?? ""); return m ? [+m[1], +m[2]] : null; };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
// class QID -> label used in desc, in priority order (first match wins when an item has several).
const CLASSES = { Q245016: "Military base", Q1324633: "Naval base", Q331367: "Submarine base", Q6981985: "Naval air base", Q695850: "Air base", Q2886620: "Canadian Forces base", Q2604714: "Forward operating base", Q136644356: "PLA base", Q21193688: "Missile base", Q131520524: "Space force base", Q55624858: "Naval station", Q1198413: "Military camp", Q85881832: "US base in Okinawa", Q2345593: "Sovereign base area", Q133288241: "Military radar station", Q6646468: "Listening station" };

const rows = await sparql(`
SELECT ?item ?itemLabel ?sl (SAMPLE(?c) AS ?coord) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?ctry), "entity/"); separator=",") AS ?cqs) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cls), "entity/"); separator=",") AS ?classes) (GROUP_CONCAT(DISTINCT ?opL; separator=" / ") AS ?ops) WHERE {
  VALUES ?cls { ${Object.keys(CLASSES).map((q) => "wd:" + q).join(" ")} }
  ?item wdt:P31 ?cls . ?item wikibase:sitelinks ?sl . FILTER(?sl >= 2) ?item wdt:P625 ?c .
  FILTER NOT EXISTS { ?item wdt:P576 [] } FILTER NOT EXISTS { ?item wdt:P3999 [] }
  OPTIONAL { ?item wdt:P17 ?ctry } OPTIONAL { ?item wdt:P137 ?op . ?op rdfs:label ?opL FILTER(lang(?opL)='en') }
  ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='en')
} GROUP BY ?item ?itemLabel ?sl`);

const features = []; const seen = new Set(); let dropped = 0;
for (const b of rows) {
  const qid = v(b, "item").split("/").pop(); const title = v(b, "itemLabel").replace(/\s+/g, " ").trim(); const sl = +v(b, "sl"); const p = point(v(b, "coord"));
  if (!p || (p[0] === 0 && p[1] === 0) || Math.abs(p[1]) > 90 || !title || /^Q\d+$/.test(title) || seen.has(qid)) { dropped++; continue; }
  seen.add(qid);
  const have = (v(b, "classes") ?? "").split(","); const kind = Object.keys(CLASSES).find((q) => have.includes(q)); const c = (v(b, "cqs") ?? "").split(",").map((q) => byQid.get(q)).find(Boolean);
  const ops = (v(b, "ops") ?? "").split(" / ").filter(Boolean).slice(0, 2).join(" / ");
  const desc = [CLASSES[kind], c?.name, ops ? `operated by ${ops}` : null].filter(Boolean).join(" · ");
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(p[0]), r4(p[1])] },
    properties: { id: `base:${qid}`, layer: "bases", type: "base", title, sev: sl >= 25 ? 3 : sl >= 12 ? 2 : sl >= 5 ? 1 : 0, desc, src: "Wikidata (CC0)", ...(c ? { iso3: c.iso3 } : {}) } });
}
const nIso = new Set(features.map((f) => f.properties.iso3).filter(Boolean)).size;
const ram = features.find((f) => f.properties.title === "Ramstein Air Base");
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
const body = JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "Wikidata Query Service (military base classes, >=2 sitelinks)", licence: "CC0 1.0", count: features.length }, features });
if (features.length < 800 || features.length > 3500 || nIso < 50 || ram?.properties.iso3 !== "DEU" || body.length > 1_200_000) {
  console.error(`REFUSING TO WRITE: ${features.length} features, ${nIso} countries, Ramstein ${ram?.properties.iso3}, ${body.length} bytes`); process.exit(1);
}
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/bases.geojson", import.meta.url), body);
console.log(`features ${features.length}, dropped ${dropped}, countries ${nIso}, bytes ${body.length}, sev tiers ${[0, 1, 2, 3].map((s) => features.filter((f) => f.properties.sev === s).length)}, with operator ${features.filter((f) => /operated by/.test(f.properties.desc)).length}, no iso3 ${features.filter((f) => !f.properties.iso3).length}`);
for (const t of ["Ramstein Air Base", "Al Dhafra Air Base", "Camp Lemonnier", "Naval Station Norfolk"]) console.log(t, JSON.stringify(features.find((f) => f.properties.title === t)?.properties ?? null));
