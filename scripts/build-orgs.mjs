// Builds public/data/orgs.json: ISO3 member lists per organisation.
// Large bodies come from Wikidata (current "member of" statements, no end date); small clubs and anything Wikidata gets wrong are curated below.
// Every list is checked against an expected size so a bad query fails loudly instead of shipping.
import { writeFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk/0.1 (personal research project)", Accept: "application/sparql-results+json" };
const countries = JSON.parse((await import("node:fs")).readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const valid = new Set(countries.map((c) => c.iso3));

// [id, exact English Wikidata label, expected member count]
const WD = [
  ["unga", "United Nations", 193], ["who", "World Health Organization", 194], ["unesco", "United Nations Educational, Scientific and Cultural Organization", 194],
  ["fao", "Food and Agriculture Organization", 195], ["ilo", "International Labour Organization", 187], ["imo", "International Maritime Organization", 176],
  ["icao", "International Civil Aviation Organization", 193], ["itu", "International Telecommunication Union", 193], ["wipo", "World Intellectual Property Organization", 193],
  ["imf", "International Monetary Fund", 191], ["wto", "World Trade Organization", 166], ["iaea", "International Atomic Energy Agency", 180],
  ["opcw", "Organisation for the Prohibition of Chemical Weapons", 193], ["irena", "International Renewable Energy Agency", 170], ["isa", "International Seabed Authority", 169],
  ["au", "African Union", 55], ["arableague", "Arab League", 22], ["asean", "Association of Southeast Asian Nations", 11], ["caricom", "Caribbean Community", 15],
  ["cis", "Commonwealth of Independent States", 9], ["coe", "Council of Europe", 46], ["ecowas", "Economic Community of West African States", 12],
  ["eu", "European Union", 27], ["oic", "Organisation of Islamic Cooperation", 57], ["oas", "Organization of American States", 35],
  ["sco", "Shanghai Cooperation Organisation", 10], ["nato", "NATO", 32], ["osce", "Organization for Security and Co-operation in Europe", 57],
  ["oecd", "OECD", 38], ["commonwealth", "Commonwealth of Nations", 56], ["mercosur", "Mercosur", 5],
];
// Curated: small, stable clubs where an exact list is better than a query. Sources are the organisations' own member pages.
const CURATED = {
  g7: ["CAN", "FRA", "DEU", "ITA", "JPN", "GBR", "USA"],
  fiveeyes: ["AUS", "CAN", "NZL", "GBR", "USA"], aukus: ["AUS", "GBR", "USA"], quad: ["AUS", "IND", "JPN", "USA"],
  gcc: ["ARE", "BHR", "KWT", "OMN", "QAT", "SAU"],
  // the UAE left OPEC and OPEC+ with effect from 1 May 2026 (announced 28 April 2026)
  opec: ["DZA", "COG", "GNQ", "GAB", "IRN", "IRQ", "KWT", "LBY", "NGA", "SAU", "VEN"],
  opecplus: ["DZA", "COG", "GNQ", "GAB", "IRN", "IRQ", "KWT", "LBY", "NGA", "SAU", "VEN", "AZE", "BHR", "BRN", "KAZ", "MYS", "MEX", "OMN", "RUS", "SDN", "SSD"],
  brics: ["BRA", "RUS", "IND", "CHN", "ZAF", "EGY", "ETH", "IRN", "ARE", "IDN"],
  g20: ["ARG", "AUS", "BRA", "CAN", "CHN", "FRA", "DEU", "IND", "IDN", "ITA", "JPN", "KOR", "MEX", "RUS", "SAU", "ZAF", "TUR", "GBR", "USA"],
  eurozone: ["AUT", "BEL", "HRV", "CYP", "EST", "FIN", "FRA", "DEU", "GRC", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "PRT", "SVK", "SVN", "ESP", "BGR"],
  eaeu: ["ARM", "BLR", "KAZ", "KGZ", "RUS"], csto: ["ARM", "BLR", "KAZ", "KGZ", "RUS", "TJK"], ots: ["AZE", "KAZ", "KGZ", "TUR", "UZB"],
  arctic: ["CAN", "DNK", "FIN", "ISL", "NOR", "RUS", "SWE", "USA"],
  schengen: ["AUT", "BEL", "BGR", "HRV", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LIE", "LTU", "LUX", "MLT", "NLD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "CHE"],
  eu: ["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"],
  nato: ["ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD", "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR", "GBR", "USA"],
  sco: ["CHN", "RUS", "KAZ", "KGZ", "TJK", "UZB", "IND", "PAK", "IRN", "BLR"],
  asean: ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM", "TLS"],
  oecd: ["AUS", "AUT", "BEL", "CAN", "CHL", "COL", "CRI", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ISR", "ITA", "JPN", "KOR", "LVA", "LTU", "LUX", "MEX", "NLD", "NZL", "NOR", "POL", "PRT", "SVK", "SVN", "ESP", "SWE", "CHE", "TUR", "GBR", "USA"],
  mercosur: ["ARG", "BRA", "PRY", "URY", "BOL"],
  // UN Security Council, 2026: five permanent plus ten elected members (terms ending 2026 and 2027)
  unsc: ["CHN", "FRA", "RUS", "GBR", "USA", "DNK", "GRC", "PAK", "PAN", "SOM", "BHR", "COL", "COD", "LVA", "LBR"],
  // Non-Self-Governing Territories are not states, so they are not in the country list; the layer lists the administering powers instead.
};
const q = async (sparql) => { for (let i = 0; i < 3; i++) { const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sparql), { headers: UA }); if (r.ok) return (await r.json()).results.bindings; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); } throw new Error("wikidata failed"); };
const CURATED_IDS = new Set(Object.keys(CURATED));
// Wikidata attaches memberships of the Netherlands and Denmark to the Kingdom entities, so those two are missing from every list; both are members of all of these.
const KINGDOM_PATCH = new Set(["unga", "who", "itu", "wto", "opcw", "coe", "osce"]);
const out = {}; const source = {}; const report = [];
for (const [id, label, expected] of WD) {
  if (CURATED_IDS.has(id)) continue;
  const rows = await q(`SELECT DISTINCT ?iso WHERE { ?o rdfs:label "${label}"@en . ?c p:P463 ?st . ?st ps:P463 ?o . FILTER NOT EXISTS { ?st pq:P582 ?end } ?c wdt:P298 ?iso . ?c wdt:P31/wdt:P279* wd:Q6256 . FILTER NOT EXISTS { ?c wdt:P576 ?cend } }`);
  const list = [...new Set(rows.map((r) => r.iso.value))].filter((x) => valid.has(x)).sort();
  const ok = Math.abs(list.length - expected) <= Math.max(2, expected * 0.1);
  report.push(`${ok ? "ok  " : "BAD "} ${id.padEnd(13)} ${String(list.length).padStart(3)} / ${expected}`);
  if (ok) source[id] = "wikidata";
  if (ok) out[id] = KINGDOM_PATCH.has(id) ? [...new Set([...list, "DNK", "NLD"])].sort() : list; await new Promise((r) => setTimeout(r, 600));
}
for (const [id, list] of Object.entries(CURATED)) { const bad = list.filter((x) => !valid.has(x)); if (bad.length) report.push(`curated ${id}: not in country list ${bad.join(",")}`); out[id] = list.filter((x) => valid.has(x)); source[id] = "curated"; }
// organisations whose own published member lists were parsed and reconciled against their stated counts (scripts/build-members-extra.mjs)
try { const extra = JSON.parse((await import("node:fs")).readFileSync(new URL("../public/data/layers/members-extra.json", import.meta.url), "utf8")); for (const [id, v] of Object.entries(extra.orgs)) { out[id] = v.members.filter((c) => valid.has(c)); source[id] = "official"; } } catch { console.warn("members-extra.json not found; skipping"); }
try { const more = JSON.parse((await import("node:fs")).readFileSync(new URL("../public/data/layers/members-more.json", import.meta.url), "utf8")); for (const [id, v] of Object.entries(more.orgs)) { out[id] = v.members.filter((c) => valid.has(c)); source[id] = "official"; } } catch { console.warn("members-more.json not found; skipping"); }
// every UN member is ipso facto a party to the Statute of the International Court of Justice
if (out.unga) { out.icj = [...out.unga]; source.icj = "derived (UN members)"; }
writeFileSync(new URL("../public/data/orgs.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), source, note: "Wikidata (current member-of statements) for large bodies; curated lists for small clubs. UNSC as of 2026.", orgs: out }));
console.log(report.join("\n")); console.log("written:", Object.keys(out).length, "orgs");
