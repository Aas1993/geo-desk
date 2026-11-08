// Builds public/data/layers/thinktanks.geojson: think tanks from Wikidata (CC0).
// NOTE: the brief's Q1058914 is "software company"; the think tank class is Q155271 (checked: Brookings, Chatham House, RAND are P31 Q155271).
// Items that are P31 Q155271 or a direct subclass (P279), not dissolved, with coordinates (own P625, else headquarters P159's P625, else P131's P625)
// and at least 2 sitelinks. Fewer than 300 reach the brief's >=5 sitelinks and the whole class holds only ~620 located items even at >=1,
// so the "top ~800" fallback is not available; >=2 sitelinks is the practical cut.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const MIN_SITELINKS = 2;
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
SELECT ?item ?itemLabel ?sl (SAMPLE(?c1) AS ?own) (SAMPLE(?c2) AS ?hq) (SAMPLE(?c3) AS ?loc) (SAMPLE(?w) AS ?site) (MIN(?yr) AS ?founded) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?ctry), "entity/"); separator=",") AS ?cqs) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?hctry), "entity/"); separator=",") AS ?hcqs) WHERE {
  { ?item wdt:P31 wd:Q155271 } UNION { ?item wdt:P31 ?sub . ?sub wdt:P279 wd:Q155271 }
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
  OPTIONAL { ?item wdt:P625 ?c1 } OPTIONAL { ?item wdt:P159 ?h . ?h wdt:P625 ?c2 . OPTIONAL { ?h wdt:P17 ?hctry } } OPTIONAL { ?item wdt:P131/wdt:P625 ?c3 }
  OPTIONAL { ?item wdt:P856 ?w } OPTIONAL { ?item wdt:P571 ?inc . BIND(YEAR(?inc) AS ?yr) } OPTIONAL { ?item wdt:P17 ?ctry }
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='en')
} GROUP BY ?item ?itemLabel ?sl`);

const features = []; const seen = new Set(); let noLoc = 0;
for (const b of rows) {
  const qid = v(b, "item").split("/").pop(); const title = v(b, "itemLabel").replace(/\s+/g, " ").trim(); const sl = +v(b, "sl");
  const p = point(v(b, "own")) ?? point(v(b, "hq")) ?? point(v(b, "loc"));
  if (!p || (p[0] === 0 && p[1] === 0) || !title || /^Q\d+$/.test(title) || seen.has(qid)) { noLoc++; continue; }
  seen.add(qid);
  const c = [...(v(b, "cqs") ?? "").split(","), ...(v(b, "hcqs") ?? "").split(",")].map((q) => byQid.get(q)).find(Boolean);
  const yr = v(b, "founded"); const url = https(v(b, "site"));
  const desc = [c?.name, yr && +yr > 0 ? `founded ${yr}` : null].filter(Boolean).join(" · ") || "Think tank";
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(p[0]), r4(p[1])] },
    properties: { id: `thinktank:${qid}`, layer: "thinktanks", type: "thinktank", title, sev: sl >= 15 ? 3 : sl >= 8 ? 2 : sl >= 4 ? 1 : 0, desc, ...(url ? { url } : {}), src: "Wikidata (CC0)", ...(c ? { iso3: c.iso3 } : {}) } });
}
const must = { "Brookings Institution": "USA", "Chatham House": "GBR" };
const missing = Object.entries(must).filter(([t, iso]) => features.find((f) => f.properties.title === t)?.properties.iso3 !== iso);
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
if (features.length < 250 || missing.length) { console.error(`REFUSING TO WRITE: ${features.length} features; missing/wrong ${JSON.stringify(missing)}`); process.exit(1); }
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/thinktanks.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: `Wikidata Query Service (think tanks, Q155271 + direct subclasses, >=${MIN_SITELINKS} sitelinks)`, licence: "CC0 1.0", count: features.length }, features }));
console.log(`features ${features.length}, no coordinates (dropped) ${noLoc}, sev tiers ${[0, 1, 2, 3].map((s) => features.filter((f) => f.properties.sev === s).length)}, with url ${features.filter((f) => f.properties.url).length}, no iso3 ${features.filter((f) => !f.properties.iso3).length}`);
for (const t of ["Brookings Institution", "Chatham House", "Carnegie Endowment for International Peace", "Gulf Research Center", "Emirates Policy Center"]) console.log(t, JSON.stringify(features.find((f) => f.properties.title === t)?.properties ?? null));
