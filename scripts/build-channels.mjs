// Builds public/data/layers/channels.geojson: TV news channels from Wikidata (CC0).
// What actually works in Wikidata (checked): the brief's genre QID Q1002697 is "periodical", and P136 (genre) is almost never set on channels.
// Major news channels (CNN, BBC News, Al Arabiya, France 24...) are P31 "specialty channel" (Q561068) or "television station" (Q1616075); a few are
// "television channel" (Q2001305). So: candidates = P31 of those three classes with >= MIN_SITELINKS sitelinks and not dissolved; "news" is then decided
// from the item's own metadata: English description, label, P31 class labels or P136 genre labels containing "news" (excludes e.g. news divisions without a channel).
// Coordinates: own P625, else headquarters P159, else P131. At >=10 sitelinks only ~60 news channels exist (~150 at >=4), so the cut is lowered to MIN_SITELINKS (2).
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const MIN_SITELINKS = 2;
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

// Stage 1: candidates, one class at a time, in sitelink bands (the big station class would time out in one go).
const cand = new Map();
for (const cls of ["Q2001305", "Q561068", "Q1616075"]) for (const [lo, hi] of [[MIN_SITELINKS, 4], [4, 7], [7, 10], [10, 100000]]) {
  const rows = await sparql(`SELECT ?item ?sl WHERE { ?item wdt:P31 wd:${cls} . ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${lo} && ?sl < ${hi}) }`);
  for (const b of rows) cand.set(v(b, "item").split("/").pop(), +v(b, "sl")); console.log(`stage 1 ${cls} ${lo}-${hi}: ${rows.length}`);
}
// Stage 2: details in batches.
const ids = [...cand.keys()]; const det = new Map();
for (let i = 0; i < ids.length; i += 80) {
  const rows = await sparql(`
SELECT ?item ?itemLabel ?desc (GROUP_CONCAT(DISTINCT ?clsL; separator="|") AS ?classes) (GROUP_CONCAT(DISTINCT ?gL; separator="|") AS ?genres) (SAMPLE(?c1) AS ?own) (SAMPLE(?hx) AS ?hq) (COUNT(DISTINCT ?h) AS ?nh) (SAMPLE(?c3) AS ?loc) (SAMPLE(?w) AS ?site) (MIN(?yr) AS ?founded) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?ctry), "entity/"); separator=",") AS ?cqs)  WHERE {
  VALUES ?item { ${ids.slice(i, i + 80).map((q) => "wd:" + q).join(" ")} }
  ?item rdfs:label ?itemLabel FILTER(lang(?itemLabel)='en')
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  OPTIONAL { ?item schema:description ?desc FILTER(lang(?desc)='en') }
  OPTIONAL { ?item wdt:P31 ?cls . ?cls rdfs:label ?clsL FILTER(lang(?clsL)='en') } OPTIONAL { ?item wdt:P136 ?g . ?g rdfs:label ?gL FILTER(lang(?gL)='en') }
  OPTIONAL { ?item wdt:P625 ?c1 } OPTIONAL { ?item wdt:P159 ?h . ?h wdt:P625 ?c2 . OPTIONAL { ?h rdfs:label ?hl FILTER(lang(?hl)='en') } BIND(CONCAT(COALESCE(?hl, ""), "~", STR(?c2)) AS ?hx) } OPTIONAL { ?item wdt:P131/wdt:P625 ?c3 }
  OPTIONAL { ?item wdt:P856 ?w } OPTIONAL { ?item wdt:P571 ?inc . BIND(YEAR(?inc) AS ?yr) }
  OPTIONAL { { ?item wdt:P17 ?ctry } UNION { ?item wdt:P495 ?ctry } UNION { ?item wdt:P159/wdt:P17 ?ctry } UNION { ?item wdt:P449/wdt:P17 ?ctry } }
} GROUP BY ?item ?itemLabel ?desc`);
  for (const b of rows) det.set(v(b, "item").split("/").pop(), b);
}
console.log(`stage 2: candidates ${ids.length}, details ${det.size}`);

const features = []; let notNews = 0, noLoc = 0;
for (const [qid, sl] of cand) {
  const b = det.get(qid); if (!b) continue; const title = v(b, "itemLabel").replace(/\s+/g, " ").trim();
  const text = [title, v(b, "desc"), v(b, "classes"), v(b, "genres")].join(" ").toLowerCase();
  if (!/\bnews|\bnewscast|\bnews channel/.test(text)) { notNews++; continue; }
  const hq = v(b, "hq"); const p = point(v(b, "own")) ?? point(hq) ?? point(v(b, "loc"));
  if (!p || (p[0] === 0 && p[1] === 0) || !title || /^Q\d+$/.test(title)) { noLoc++; continue; }
  const c = (v(b, "cqs") ?? "").split(",").map((q) => byQid.get(q)).find(Boolean); const city = (point(v(b, "own")) ? +v(b, "nh") === 1 : !!point(hq)) ? hq?.split("~")[0] || undefined : undefined; // city label only when it belongs to the coordinates used const yr = v(b, "founded"); const url = https(v(b, "site"));
  const desc = [[city, c?.name].filter((x, i, a) => x && a.indexOf(x) === i).join(", ") || null, yr && +yr > 0 ? `launched ${yr}` : null].filter(Boolean).join(" · ") || "News channel";
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(p[0]), r4(p[1])] },
    properties: { id: `channel:${qid}`, layer: "channels", type: "channel", title, sev: sl >= 30 ? 3 : sl >= 15 ? 2 : sl >= 8 ? 1 : 0, desc, ...(url ? { url } : {}), src: "Wikidata (CC0)", ...(c ? { iso3: c.iso3 } : {}) } });
}
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id, "en", { numeric: true }));
const body = JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: `Wikidata Query Service (TV channels/stations with news metadata, >=${MIN_SITELINKS} sitelinks)`, licence: "CC0 1.0", count: features.length }, features });
const nCtry = new Set(features.map((f) => f.properties.iso3).filter(Boolean)).size; const titles = new Set(features.map((f) => f.properties.title));
const must = ["CNN", "France 24", "Al Arabiya", "Sky News"].filter((t) => !titles.has(t));
if (features.length < 150 || features.length > 1000 || nCtry < 40 || body.length > 1_200_000 || must.length) { console.error(`REFUSING TO WRITE: ${features.length} features, ${nCtry} countries, missing ${JSON.stringify(must)}`); process.exit(1); }
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/layers/channels.geojson", import.meta.url), body);
console.log(`features ${features.length}, not news ${notNews}, news but no coordinates ${noLoc}, countries ${nCtry}, bytes ${body.length}, sev tiers ${[0, 1, 2, 3].map((s) => features.filter((f) => f.properties.sev === s).length)}, with url ${features.filter((f) => f.properties.url).length}, no iso3 ${features.filter((f) => !f.properties.iso3).length}`);
for (const t of ["Al Arabiya", "Al Jazeera", "Al Jazeera English", "Sky News Arabia", "BBC News", "BBC World News", "CNN International", "CNN", "France 24"]) console.log(t, JSON.stringify(features.filter((f) => f.properties.title === t).map((f) => [f.properties.id, f.properties.desc])));
