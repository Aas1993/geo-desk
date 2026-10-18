// Builds public/data/layers/exchanges.geojson: stock exchanges (Wikidata P31 = Q11691) with coordinates and either an ISO 10383
// Market Identifier Code (Wikidata property P7534, "MIC market code"; the brief's P2283 is actually "uses") or at least 3 sitelinks.
// Source: Wikidata Query Service (CC0). Coordinates: own P625, else headquarters (P159) coordinate, else location (P131) coordinate.
// Dissolved entities (P576) are excluded. A "http://" official website is upgraded to "https://" (the layer contract is https only).
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
const https = (u) => { if (!u) return undefined; try { const x = new URL(u.replace(/^http:\/\//i, "https://")); return x.protocol === "https:" ? x.href : undefined; } catch { return undefined; } };

const rows = await sparql(`
SELECT ?item ?itemLabel ?sl (SAMPLE(?c1) AS ?own) (SAMPLE(?hx) AS ?hq) (COUNT(DISTINCT ?h) AS ?nh) (SAMPLE(?c3) AS ?loc) (SAMPLE(?mic) AS ?m) (SAMPLE(?site) AS ?w) (SAMPLE(?ctry) AS ?cq) WHERE {
  ?item wdt:P31 wd:Q11691 . ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item wdt:P625 ?c1 } OPTIONAL { ?item wdt:P159 ?h . ?h wdt:P625 ?c2 . OPTIONAL { ?h rdfs:label ?hl FILTER(lang(?hl)='en') } BIND(CONCAT(COALESCE(?hl, ""), "~", STR(?c2)) AS ?hx) } OPTIONAL { ?item wdt:P131/wdt:P625 ?c3 }
  OPTIONAL { ?item wdt:P7534 ?mic } OPTIONAL { ?item wdt:P856 ?site } OPTIONAL { ?item wdt:P17 ?ctry }
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='en')
} GROUP BY ?item ?itemLabel ?sl`);

const features = []; const seen = new Set(); let dropped = 0;
for (const b of rows) {
  const qid = v(b, "item").split("/").pop(); const title = v(b, "itemLabel").replace(/\s+/g, " ").trim(); const sl = +v(b, "sl"); const mic = v(b, "m");
  const hq = v(b, "hq"); const p = point(v(b, "own")) ?? point(hq) ?? point(v(b, "loc"));
  if (!p || (p[0] === 0 && p[1] === 0) || !title || /^Q\d+$/.test(title) || /\bbuilding$/i.test(title) || !(mic || sl >= 3) || seen.has(qid)) { dropped++; continue; }
  seen.add(qid);
  const c = byQid.get(v(b, "cq")?.split("/").pop()); const city = (point(v(b, "own")) ? +v(b, "nh") === 1 : !!point(hq)) ? hq?.split("~")[0] || undefined : undefined; // city label only when it belongs to the coordinates used
  const desc = [[city, c?.name].filter(Boolean).join(", ") || null, mic ? `MIC ${mic}` : null].filter(Boolean).join(" · ") || "Stock exchange";
  const url = https(v(b, "w"));
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(p[0]), r4(p[1])] },
    properties: { id: `exchange:${qid}`, layer: "exchanges", type: "exchange", title, sev: sl >= 30 ? 3 : sl >= 10 ? 2 : sl >= 3 ? 1 : 0, desc, ...(url ? { url } : {}), src: "Wikidata (CC0)", ...(c ? { iso3: c.iso3 } : {}) } });
}
const find = (q) => features.find((f) => f.properties.id === `exchange:${q}`);
const must = { Q4119825: "ARE", Q1973019: "ARE", Q13677: "USA", Q171240: "GBR" };
const missing = Object.entries(must).filter(([q, iso]) => find(q)?.properties.iso3 !== iso);
const sev1 = features.filter((f) => f.properties.sev >= 1).length;
if (features.length < 600 || sev1 < 150 || missing.length) { console.error(`REFUSING TO WRITE: ${features.length} features (${sev1} with sev>=1); missing/wrong ${JSON.stringify(missing)}`); process.exit(1); }
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/exchanges.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "Wikidata Query Service (stock exchanges, Q11691)", licence: "CC0 1.0", count: features.length }, features }));
const tiers = [0, 1, 2, 3].map((s) => features.filter((f) => f.properties.sev === s).length);
console.log(`features ${features.length}, dropped ${dropped}, sev tiers 0..3 ${tiers}, with url ${features.filter((f) => f.properties.url).length}, no iso3 ${features.filter((f) => !f.properties.iso3).length}`);
for (const q of Object.keys(must)) console.log(JSON.stringify(find(q).properties));
