// Builds public/data/layers/straits.geojson: curated maritime chokepoints, straits, canals and capes.
// Coordinates are curated by hand but every one is checked against Wikidata P625 and the build FAILS if any lies more than 60 km away.
// Widths/lengths appear in `desc` only where the Wikipedia article (or Wikidata P2043 for canal length) states them unambiguously;
// where Wikipedia and Wikidata disagree, or the article gives two competing figures, the number is left out
// (Hormuz: 39 vs ~50 vs Wikidata 55 km; Bab el-Mandeb: 26 vs 16.5 km; Danish Straits, Korea Strait, Sicily: no narrowest figure).
// Run: node scripts/build-straits.mjs
import { writeFileSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const MAX_KM = 60;

// [slug, qid, type, title, lat, lon, sev, desc, iso3?]
// desc = bordering countries + (verified width/length) + why it matters. Width figures were read from the English Wikipedia article text.
const S = [
  ["hormuz", "Q79883", "strait", "Strait of Hormuz", 26.57, 56.35, 3, "Iran and Oman. Sole sea exit of the Persian/Arabian Gulf, carrying most Gulf oil and LNG exports."],
  ["bab-el-mandeb", "Q83318", "strait", "Bab el-Mandeb", 12.583, 43.333, 3, "Yemen, Djibouti and Eritrea. Southern gate of the Red Sea and the Suez route; exposed to Houthi attacks on shipping."],
  ["suez", "Q899", "canal", "Suez Canal", 30.6, 32.34, 3, "Egypt. 193 km long. Shortest sea link between Europe and Asia; closure forces ships round the Cape of Good Hope.", "EGY"],
  ["malacca", "Q48359", "strait", "Strait of Malacca", 2.7, 101.2, 3, "Indonesia, Malaysia and Singapore. Narrows to 2.8 km at the Phillip Channel. Main oil route from the Gulf to East Asia."],
  ["bosphorus", "Q35958", "strait", "Bosphorus", 41.12, 29.08, 3, "Turkey. Narrowest 0.7 km. Only outlet of the Black Sea to the Mediterranean, governed by the 1936 Montreux Convention.", "TUR"],
  ["dardanelles", "Q6514", "strait", "Dardanelles", 40.2, 26.4, 3, "Turkey. Narrowest 1.2 km. Southern half of the Turkish Straits linking the Black Sea to the Aegean.", "TUR"],
  ["gibraltar", "Q36124", "strait", "Strait of Gibraltar", 35.974, -5.516, 3, "Spain, Morocco and Gibraltar (UK). Narrowest 14 km. Only link between the Atlantic and the Mediterranean."],
  ["taiwan", "Q127031", "strait", "Taiwan Strait", 24.6, 119.8, 3, "China and Taiwan. Narrowest 126 km. Heavily trafficked, and the focus of cross-strait military tension."],
  ["lombok", "Q745025", "strait", "Lombok Strait", -8.5, 115.833, 2, "Indonesia. Narrowest 20 km. Deep-water alternative to Malacca for large tankers and bulk carriers.", "IDN"],
  ["sunda", "Q192790", "strait", "Sunda Strait", -5.97, 105.77, 1, "Indonesia. Narrowest 24 km. Links the Java Sea to the Indian Ocean between Java and Sumatra.", "IDN"],
  ["panama", "Q7350", "canal", "Panama Canal", 9.12, -79.75, 3, "Panama. 82 km long. Links the Atlantic and Pacific; handles a large share of US east-coast to Asia trade.", "PAN"],
  ["good-hope", "Q4092", "cape", "Cape of Good Hope", -34.358, 18.472, 2, "South Africa. Main alternative to Suez and Bab el-Mandeb when the Red Sea route is closed or unsafe.", "ZAF"],
  ["danish", "Q816210", "strait", "Danish Straits", 55.5, 11.0, 2, "Denmark and Sweden (Great Belt, Little Belt, Oresund). Only sea exit of the Baltic to the North Sea."],
  ["dover", "Q159898", "strait", "Strait of Dover (English Channel)", 51.0, 1.45, 2, "United Kingdom and France. Narrowest 33 km. One of the world's busiest shipping lanes; also the Channel Tunnel route."],
  ["kerch", "Q187890", "strait", "Kerch Strait", 45.35, 36.65, 2, "Russia and Russian-occupied Crimea (Ukraine). Narrowest 3.1 km. Only link between the Sea of Azov and the Black Sea."],
  ["mozambique", "Q165100", "strait", "Mozambique Channel", -18.0, 41.0, 1, "Mozambique and Madagascar. Narrowest 419 km. Carries traffic on the Cape route around southern Africa."],
  ["korea", "Q52052", "strait", "Korea Strait (Tsushima)", 34.599, 129.797, 2, "Japan and South Korea. Links the East China Sea to the Sea of Japan and serves major Korean and Japanese ports."],
  ["drake", "Q143650", "strait", "Drake Passage", -58.58, -62.909, 1, "Chile and Argentina. About 800 km wide. Open-ocean route between the Atlantic and Pacific and gateway to Antarctica."],
  ["cape-horn", "Q4078", "cape", "Cape Horn", -55.98, -67.289, 1, "Chile. Southern tip of South America; the sea route for ships too large for the Panama Canal.", "CHL"],
  ["tiran", "Q208157", "strait", "Straits of Tiran", 28.004, 34.465, 2, "Egypt and Saudi Arabia. 5-6 km wide. Gate to the Gulf of Aqaba and the ports of Eilat and Aqaba; its 1967 closure preceded the Six-Day War."],
  ["bering", "Q11769", "strait", "Bering Strait", 65.75, -168.977, 2, "Russia and the United States. Narrowest 82 km. Gateway between the Pacific and the Arctic, and a growing Arctic route."],
  ["sicily", "Q206975", "strait", "Strait of Sicily", 37.2, 11.2, 1, "Italy, Tunisia and Malta. Divides the eastern and western Mediterranean; a route for migration and energy trade."],
];

const hav = (a, b, c, d) => { const r = (x) => (x * Math.PI) / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const ids = S.map((s) => s[1]);
const wd = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40);
  const r = await fetch("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks|labels&sitefilter=enwiki&languages=en&ids=" + b.join("|"), { headers: UA }).then((r) => r.json());
  Object.assign(wd, r.entities);
  await new Promise((r) => setTimeout(r, 400));
}

const features = []; const report = []; let bad = 0;
for (const [slug, qid, type, title, lat, lon, sev, desc, iso3] of S) {
  const e = wd[qid]; const c = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value; const wiki = e?.sitelinks?.enwiki?.title;
  if (!c || !wiki) { report.push(`FAIL ${slug}: no P625/enwiki on ${qid}`); bad++; continue; }
  const km = hav(lat, lon, c.latitude, c.longitude);
  if (km > MAX_KM) { report.push(`FAIL ${slug}: ${km.toFixed(0)} km from Wikidata (${c.latitude}, ${c.longitude})`); bad++; continue; }
  report.push(`ok   ${slug.padEnd(14)} ${qid.padEnd(9)} ${km.toFixed(0).padStart(3)} km  [${e.labels.en.value}]`);
  const properties = { id: `strait-${slug}`, layer: "straits", type, title, sev, desc, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(wiki.replaceAll(" ", "_")), src: `Wikipedia; Wikidata ${qid} (coordinates checked, ${km.toFixed(0)} km)` };
  if (iso3) properties.iso3 = iso3;
  features.push({ type: "Feature", properties, geometry: { type: "Point", coordinates: [lon, lat] } });
}
console.log(report.join("\n"));
if (bad) { console.error(bad + " feature(s) failed verification; nothing written"); process.exit(1); }
const ids2 = new Set(features.map((f) => f.properties.id)); if (ids2.size !== features.length) throw new Error("duplicate ids");
writeFileSync(new URL("../public/data/layers/straits.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "Curated; coordinates verified against Wikidata P625 (60 km); widths from English Wikipedia", licence: "Hand-curated selection; coordinates and areas from Wikidata (CC0); descriptive facts from English Wikipedia (CC BY-SA 4.0)", count: features.length }, features }));
console.log("written:", features.length, "straits");
