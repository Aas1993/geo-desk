// Builds public/data/layers/outlets.geojson: newspapers (Wikidata Q11032 + subclasses) and news agencies (Q192283 + subclasses) from Wikidata (CC0).
// Threshold: the brief suggested >=15 sitelinks, which yields only ~500 located items (~640 at >=10), so the cut is lowered to MIN_SITELINKS (7) to land in the 800-2,000 range.
// Two stages, one request at a time: (1) id + sitelinks per class (banded to stay within the query timeout), (2) details in VALUES batches.
// Coordinates: own P625, else headquarters P159, else place of publication P291, else P131. Defunct items (P576 end date) are excluded.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const MIN_SITELINKS = 7;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const byQid = new Map(countries.map((c) => [c.qid, c]));
async function sparql(query) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch("https://query.wikidata.org/sparql", { method: "POST", headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ query }), signal: AbortSignal.timeout(130_000) });
      if (r.ok) { const j = (await r.json()).results.bindings; await sleep(3_000); return j; }
      const wait = r.status === 429 ? (+r.headers.get("retry-after") || 30) * 1000 : 10_000 * (i + 1); console.warn("SPARQL", r.status, "retrying in", wait / 1000, "s"); await sleep(wait);
    } catch (e) { console.warn("SPARQL error", e.message); await sleep(10_000 * (i + 1)); }
  }
  throw new Error("SPARQL failed");
}
const v = (b, k) => b[k]?.value;
const point = (s) => { const m = /Point\((-?[\d.]+(?:e-?\d+)?) (-?[\d.]+(?:e-?\d+)?)\)/i.exec(s ?? ""); return m ? [+m[1], +m[2]] : null; };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const https = (u) => { if (!u) return undefined; try { const x = new URL(u.replace(/^http:\/\//i, "https://")); return x.protocol === "https:" ? x.href : undefined; } catch { return undefined; } };

// Stage 1: candidates (qid -> { sl, kind })
const cand = new Map();
const bands = [["Q11032", "newspaper", MIN_SITELINKS, 10], ["Q11032", "newspaper", 10, 15], ["Q11032", "newspaper", 15, 100000], ["Q192283", "agency", MIN_SITELINKS, 100000]];
for (const [cls, kind, lo, hi] of bands) {
  const rows = await sparql(`SELECT ?item ?sl WHERE { ?item wdt:P31/wdt:P279* wd:${cls} . ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${lo} && ?sl < ${hi}) }`);
  for (const b of rows) { const q = v(b, "item").split("/").pop(); if (!cand.has(q) || kind === "agency") cand.set(q, { sl: +v(b, "sl"), kind }); }
  console.log(`stage 1 ${cls} ${lo}-${hi}: ${rows.length}`);
}
// Stage 2: details
const ids = [...cand.keys()]; const det = new Map();
for (let i = 0; i < ids.length; i += 80) {
  const rows = await sparql(`
SELECT ?item ?itemLabel (SAMPLE(?c1) AS ?own) (SAMPLE(?hx) AS ?hq) (COUNT(DISTINCT ?h) AS ?nh) (SAMPLE(?px) AS ?pub) (COUNT(DISTINCT ?pl) AS ?np) (SAMPLE(?c4) AS ?loc) (SAMPLE(?w) AS ?site) (MIN(?yr) AS ?founded) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?ctry), "entity/"); separator=",") AS ?cqs)  WHERE {
  VALUES ?item { ${ids.slice(i, i + 80).map((q) => "wd:" + q).join(" ")} }
  ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='en')
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  OPTIONAL { ?item wdt:P625 ?c1 } OPTIONAL { ?item wdt:P159 ?h . ?h wdt:P625 ?c2 . OPTIONAL { ?h rdfs:label ?hl FILTER(lang(?hl)='en') } BIND(CONCAT(COALESCE(?hl, ""), "~", STR(?c2)) AS ?hx) } OPTIONAL { ?item wdt:P291 ?pl . ?pl wdt:P625 ?c3 . OPTIONAL { ?pl rdfs:label ?pll FILTER(lang(?pll)='en') } BIND(CONCAT(COALESCE(?pll, ""), "~", STR(?c3)) AS ?px) } OPTIONAL { ?item wdt:P131/wdt:P625 ?c4 }
  OPTIONAL { ?item wdt:P856 ?w } OPTIONAL { ?item wdt:P571 ?inc . BIND(YEAR(?inc) AS ?yr) }
  OPTIONAL { { ?item wdt:P17 ?ctry } UNION { ?item wdt:P495 ?ctry } UNION { ?item wdt:P159/wdt:P17 ?ctry } UNION { ?item wdt:P291/wdt:P17 ?ctry } }
} GROUP BY ?item ?itemLabel`);
  for (const b of rows) det.set(v(b, "item").split("/").pop(), b);
}
console.log(`stage 2: candidates ${ids.length}, details ${det.size}`);

const features = []; let noLoc = 0;
for (const [qid, { sl, kind }] of cand) {
  const b = det.get(qid); if (!b) continue; const title = v(b, "itemLabel").replace(/\s+/g, " ").trim();
  const hq = v(b, "hq"), pub = v(b, "pub"); const p = point(v(b, "own")) ?? point(hq) ?? point(pub) ?? point(v(b, "loc"));
  if (!p || (p[0] === 0 && p[1] === 0) || !title || /^Q\d+$/.test(title)) { noLoc++; continue; }
  const c = (v(b, "cqs") ?? "").split(",").map((q) => byQid.get(q)).find(Boolean); /* city label only when it belongs to the coordinates used */ const own = point(v(b, "own")); const place = own ? (+v(b, "nh") === 1 ? hq : +v(b, "np") === 1 ? pub : null) : point(hq) ? hq : point(pub) ? pub : null; const city = place?.split("~")[0] || undefined; const yr = v(b, "founded"); const url = https(v(b, "site"));
  const desc = [[city, c?.name].filter((x, i, a) => x && a.indexOf(x) === i).join(", ") || null, yr && +yr > 0 ? `founded ${yr}` : null].filter(Boolean).join(" · ") || (kind === "agency" ? "News agency" : "Newspaper");
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(p[0]), r4(p[1])] },
    properties: { id: `outlet:${qid}`, layer: "outlets", type: kind, title, sev: sl >= 40 ? 3 : sl >= 25 ? 2 : sl >= 15 ? 1 : 0, desc, ...(url ? { url } : {}), src: "Wikidata (CC0)", ...(c ? { iso3: c.iso3 } : {}) } });
}
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
const body = JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: `Wikidata Query Service (newspapers Q11032, news agencies Q192283, >=${MIN_SITELINKS} sitelinks)`, licence: "CC0 1.0", count: features.length }, features });
const nCtry = new Set(features.map((f) => f.properties.iso3).filter(Boolean)).size; const nAg = features.filter((f) => f.properties.type === "agency").length;
const has = (t, k) => features.some((f) => f.properties.title === t && f.properties.type === k);
if (features.length < 700 || features.length > 2200 || nAg < 40 || nCtry < 60 || body.length > 1_200_000 || !has("The New York Times", "newspaper") || !has("Reuters", "agency")) {
  console.error(`REFUSING TO WRITE: ${features.length} features, ${nAg} agencies, ${nCtry} countries, ${body.length} bytes`); process.exit(1);
}
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/outlets.geojson", import.meta.url), body);
console.log(`features ${features.length} (${nAg} agencies), no coordinates dropped ${noLoc}, countries ${nCtry}, bytes ${body.length}, sev tiers ${[0, 1, 2, 3].map((s) => features.filter((f) => f.properties.sev === s).length)}, with url ${features.filter((f) => f.properties.url).length}, no iso3 ${features.filter((f) => !f.properties.iso3).length}`);
for (const t of ["The New York Times", "Reuters", "Emirates News Agency", "Gulf News", "The National", "Khaleej Times", "Al-Ahram", "Xinhua News Agency"]) console.log(t, JSON.stringify(features.find((f) => f.properties.title === t)?.properties ?? null));
