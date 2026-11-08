// Fills known gaps in two committed datasets with Wikidata (CC0), adding an item only when nothing is already within a few km:
//  - ports.geojson comes from NGA's World Port Index, which has no Jebel Ali or other major Gulf container ports in its current edition;
//  - power.geojson comes from WRI's database, frozen in 2022, so it lacks newer nuclear plants such as Barakah.
// Idempotent: items it added earlier are replaced, never duplicated.
import { readFileSync, writeFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/sparql-results+json" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const iso3ByQid = new Map(countries.filter((c) => c.qid).map((c) => [c.qid, c.iso3]));
const sparql = async (q) => { for (let i = 0; i < 3; i++) { const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: UA, signal: AbortSignal.timeout(60_000) }); if (r.ok) return (await r.json()).results.bindings; await new Promise((r) => setTimeout(r, 3000 * (i + 1))); } throw new Error("Wikidata failed"); };
const km = ([a, b], [c, d]) => { const r = Math.PI / 180, x = Math.sin(((d - b) * r) / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin(((c - a) * r) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const pt = (w) => { const m = w?.match(/Point\(([-\d.]+) ([-\d.]+)\)/); return m ? [+(+m[1]).toFixed(4), +(+m[2]).toFixed(4)] : null; };
const file = (n) => new URL(`../public/data/layers/${n}.geojson`, import.meta.url);

async function supplement(name, rows, within, mk) {
  const fc = JSON.parse(readFileSync(file(name), "utf8")); fc.features = fc.features.filter((f) => !String(f.properties.id).startsWith("wd:")); let added = 0; const addedTitles = [];
  for (const r of rows) {
    const c = pt(r.coord?.value); if (!c) continue; const qid = r.item.value.split("/").pop();
    if (fc.features.some((f) => km(f.geometry.coordinates, c) < within && (name !== "power" || f.properties.type === "nuclear" || mk(r).type !== "nuclear"))) continue; // something is already here
    fc.features.push({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: mk(r, qid, c) }); added++; addedTitles.push(r.label.value);
  }
  fc.meta = { ...fc.meta, count: fc.features.length, supplemented: "Wikidata (CC0) for items missing from the base source" }; writeFileSync(file(name), JSON.stringify(fc)); return { added, addedTitles };
}

// Only plants that entered service from 2018 (after the WRI cut-off and with a service date), so closed or merely proposed plants are never shown as operating.
// UAE (Q878) and other Gulf/major ports: the Gulf states are where the base list is thinnest for a UAE atlas
const GULF = "wd:Q878 wd:Q817 wd:Q846 wd:Q851 wd:Q842 wd:Q805 wd:Q796 wd:Q794";
const ports = await sparql(`SELECT ?item ?label ?coord ?c ?sl WHERE { VALUES ?c { ${GULF} } ?item wdt:P31/wdt:P279* wd:Q44782 ; wdt:P17 ?c ; wdt:P625 ?coord ; wikibase:sitelinks ?sl . FILTER(?sl >= 3) ?item rdfs:label ?label FILTER(lang(?label)="en") }`);
const rp = await supplement("ports", ports, 15, (r, qid) => ({ id: `wd:${qid}`, layer: "ports", type: +r.sl.value >= 8 ? "large" : "medium", title: r.label.value, sev: +r.sl.value >= 8 ? 3 : 2, desc: "Added from Wikidata: missing from NGA's World Port Index edition", url: `https://www.wikidata.org/wiki/${qid}`, src: "Wikidata (CC0)", iso3: iso3ByQid.get(r.c.value.split("/").pop()) }));
console.log("ports added:", rp.added, rp.addedTitles.slice(0, 12).join(", "));

const nuclear = await sparql(`SELECT ?item ?label ?coord ?c ?mw ?sl WHERE { ?item wdt:P31/wdt:P279* wd:Q134447 ; wdt:P625 ?coord ; wdt:P17 ?c ; wikibase:sitelinks ?sl ; wdt:P729 ?start . FILTER(?sl >= 3 && !CONTAINS(?label, "Ōma") && ?start >= "2018-01-01T00:00:00Z"^^xsd:dateTime && ?start <= NOW()) OPTIONAL { ?item wdt:P2109 ?mw } FILTER NOT EXISTS { ?item wdt:P576 ?end } ?item rdfs:label ?label FILTER(lang(?label)="en") }`);
const rn = await supplement("power", nuclear, 12, (r, qid) => ({ id: `wd:${qid}`, layer: "power", type: "nuclear", title: r.label.value, sev: r.mw && +r.mw.value >= 3000 ? 3 : 2, desc: `Nuclear${r.mw ? ` · ${Math.round(+r.mw.value)} MW` : ""} · added from Wikidata (missing from the WRI database, which stopped updating in 2022)`, url: `https://www.wikidata.org/wiki/${qid}`, src: "Wikidata (CC0)", iso3: iso3ByQid.get(r.c.value.split("/").pop()) }));
console.log("nuclear added:", rn.added, rn.addedTitles.slice(0, 15).join(", "));
const has = (name, re) => JSON.parse(readFileSync(file(name), "utf8")).features.some((f) => re.test(f.properties.title)); console.log("Jebel Ali present:", has("ports", /jebel ali|jabal ali/i), "| Barakah present:", has("power", /barakah|baraka/i));
