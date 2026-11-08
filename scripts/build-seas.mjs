// Builds public/data/layers/seas.geojson: oceans, seas and gulfs relevant to diplomacy and shipping.
// Each feature is a single representative point. Points are curated but checked against Wikidata P625; the build FAILS if any lies further
// than max(150 km, 0.25 * sqrt(area)) from Wikidata's own point (seas are large, so the tolerance scales with size).
// Area (km2) is written into `desc` only when Wikidata P2046 holds exactly one value in km2; where Wikidata has none, or several that
// disagree (Indian Ocean, Red Sea, Adriatic, East China Sea, Sea of Japan), no area is shown.
// Run: node scripts/build-seas.mjs
import { writeFileSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };

// [slug, qid, type, title, lat, lon, sev, desc, iso3?]
const S = [
  ["pacific", "Q98", "ocean", "Pacific Ocean", 0, -160, 2, "Borders the Americas, Asia and Oceania. Carries the main trans-Pacific trade lanes."],
  ["atlantic", "Q97", "ocean", "Atlantic Ocean", 0, -30, 2, "Between the Americas, Europe and Africa. Main transatlantic trade and security corridor."],
  ["indian", "Q1239", "ocean", "Indian Ocean", -20, 80, 3, "Africa, Asia and Australia. Carries Gulf energy exports to Asia and the Suez-Asia trade."],
  ["arctic", "Q788", "ocean", "Arctic Ocean", 85, 0, 2, "Ringed by Russia, Canada, the US, Norway and Denmark (Greenland). Opening sea routes and contested resource claims."],
  ["southern", "Q7354", "ocean", "Southern Ocean", -62, 90, 1, "Surrounds Antarctica. Governed under the Antarctic Treaty system; fisheries interest."],
  ["persian-gulf", "Q34675", "gulf", "Persian / Arabian Gulf", 26.5, 52, 3, "Iran, Iraq, Kuwait, Saudi Arabia, Bahrain, Qatar, UAE (Oman at Musandam). Core of Gulf oil and gas exports; the UAE's home waters."],
  ["gulf-of-oman", "Q79948", "gulf", "Gulf of Oman", 24.8, 58.4, 3, "Iran, Oman, UAE and Pakistan. Open-sea side of Hormuz and home of Fujairah, the UAE's Indian Ocean outlet."],
  ["arabian-sea", "Q58705", "sea", "Arabian Sea", 16, 64, 3, "India, Pakistan, Iran, Oman, Yemen and Somalia. Main route for Gulf energy to South and East Asia; naval patrol area."],
  ["red-sea", "Q23406", "sea", "Red Sea", 21, 38.2, 3, "Egypt, Sudan, Eritrea, Saudi Arabia and Yemen. Links Suez to the Indian Ocean; Houthi attacks since 2023 diverted shipping."],
  ["gulf-of-aden", "Q41837", "gulf", "Gulf of Aden", 12, 48, 3, "Yemen, Somalia and Djibouti. Approach to Bab el-Mandeb; piracy and naval escort zone."],
  ["gulf-of-aqaba", "Q81611", "gulf", "Gulf of Aqaba", 28.75, 34.75, 2, "Egypt, Israel, Jordan and Saudi Arabia. Sea outlet for Eilat and Aqaba, reached through the Straits of Tiran."],
  ["gulf-of-suez", "Q168277", "gulf", "Gulf of Suez", 28.75, 33, 2, "Egypt. Southern approach to the Suez Canal, with offshore oil fields."],
  ["mediterranean", "Q4918", "sea", "Mediterranean Sea", 35, 18, 3, "Southern Europe, North Africa and the Levant. Crossroads of Europe-Asia trade, energy and migration routes."],
  ["black-sea", "Q166", "sea", "Black Sea", 43.41, 34.26, 3, "Turkey, Bulgaria, Romania, Ukraine, Russia and Georgia. Grain and energy exports; the Russia-Ukraine war has disrupted shipping since 2022."],
  ["caspian", "Q5484", "sea", "Caspian Sea", 42, 50.5, 2, "Russia, Kazakhstan, Turkmenistan, Iran and Azerbaijan. Landlocked; legal status set by the 2018 Convention; oil, gas and pipelines."],
  ["sea-of-azov", "Q35000", "sea", "Sea of Azov", 46, 37, 1, "Russia and Ukraine. Shallow sea reached only through the Kerch Strait; Russian-occupied coast since 2022."],
  ["aegean", "Q34575", "sea", "Aegean Sea", 38.5, 25.3, 1, "Greece and Turkey. Site of maritime and airspace boundary disputes between them."],
  ["adriatic", "Q13924", "sea", "Adriatic Sea", 42.776, 15.426, 1, "Italy, Slovenia, Croatia, Bosnia, Montenegro and Albania. Links Balkan ports to Italy and the EU."],
  ["baltic", "Q545", "sea", "Baltic Sea", 58, 20, 2, "Sweden, Finland, Russia, Estonia, Latvia, Lithuania, Poland, Germany and Denmark. All coastal states except Russia are NATO members; undersea cable and pipeline security."],
  ["north-sea", "Q1693", "sea", "North Sea", 56.459, 3.683, 2, "UK, Norway, Denmark, Germany, Netherlands, Belgium and France. Offshore oil, gas and wind; busy shipping lanes."],
  ["barents", "Q45823", "sea", "Barents Sea", 75, 40, 2, "Norway and Russia. Home waters of Russia's Northern Fleet and Arctic energy; 2010 Norway-Russia boundary treaty."],
  ["norwegian-sea", "Q47545", "sea", "Norwegian Sea", 69, 0, 1, "Norway, Iceland and Greenland. Route for Russian naval access to the Atlantic."],
  ["caribbean", "Q1247", "sea", "Caribbean Sea", 15, -75, 2, "Central America, northern South America and island states. US security sphere; migration and trafficking routes."],
  ["gulf-of-mexico", "Q12630", "gulf", "Gulf of Mexico", 25, -90, 2, "US, Mexico and Cuba. Major oil and gas production and Gulf Coast ports."],
  ["south-china-sea", "Q37660", "sea", "South China Sea", 12, 113, 3, "China, Vietnam, Philippines, Malaysia, Brunei, Taiwan and Indonesia. Contested island and maritime claims on a major global trade route."],
  ["east-china-sea", "Q45341", "sea", "East China Sea", 30, 125, 2, "China, Japan, South Korea and Taiwan. Disputed Senkaku/Diaoyu islands and overlapping zones."],
  ["yellow-sea", "Q37960", "sea", "Yellow Sea", 35, 123, 1, "China, North Korea and South Korea. Overlapping maritime zones and fishing disputes."],
  ["sea-of-japan", "Q27092", "sea", "Sea of Japan (East Sea)", 40, 135, 2, "Japan, Russia, North Korea and South Korea. Missile tests and Korean Peninsula tension."],
  ["philippine-sea", "Q159183", "sea", "Philippine Sea", 18, 134, 2, "Philippines, Japan, Taiwan and Pacific islands. Deployment area for US and allied navies."],
  ["bay-of-bengal", "Q38684", "gulf", "Bay of Bengal", 15, 88, 2, "India, Bangladesh, Sri Lanka and Myanmar. Arena of Indian Ocean naval competition and trade to Southeast Asia."],
  ["andaman-sea", "Q47632", "sea", "Andaman Sea", 10, 96, 2, "Myanmar, Thailand, Malaysia, Indonesia and India. Western approach to the Strait of Malacca."],
  ["sea-of-okhotsk", "Q41602", "sea", "Sea of Okhotsk", 55, 150, 1, "Russia and Japan. Largely a Russian sea; Kuril Islands dispute."],
  ["bering-sea", "Q44725", "sea", "Bering Sea", 58, -178, 1, "Russia and the United States. Gateway to the Arctic; fisheries and northern sea routes."],
  ["gulf-of-guinea", "Q41430", "gulf", "Gulf of Guinea", 1, 4, 2, "West and Central African coastal states. Oil production and a piracy hotspot."],
  ["marmara", "Q35367", "sea", "Sea of Marmara", 40.75, 28, 2, "Turkey. Lies wholly within Turkey and links the Bosphorus to the Dardanelles.", "TUR"],
  ["gulf-of-thailand", "Q131217", "gulf", "Gulf of Thailand", 9.5, 102, 1, "Thailand, Cambodia, Vietnam and Malaysia. Overlapping Thai-Cambodian claims and offshore gas."],
];

// Wikidata P2046 for the Gulf of Aqaba says 239 km2 (imported from another-language Wikipedia), which cannot be right for a gulf ~160 km long and up to 24 km wide.
const AREA_SKIP = new Set(["gulf-of-aqaba"]);
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
for (const [slug, qid, type, title, lat, lon, sev, desc0, iso3] of S) {
  const e = wd[qid]; const c = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value; const wiki = e?.sitelinks?.enwiki?.title;
  if (!c || !wiki) { report.push(`FAIL ${slug}: no P625/enwiki on ${qid}`); bad++; continue; }
  const areas = (e.claims.P2046 || []).map((s) => s.mainsnak.datavalue?.value).filter(Boolean);
  const maxArea = Math.max(0, ...areas.map((a) => Math.abs(+a.amount)));
  const tol = Math.max(150, 0.25 * Math.sqrt(maxArea || 160000));
  const km = hav(lat, lon, c.latitude, c.longitude);
  if (km > tol) { report.push(`FAIL ${slug}: ${km.toFixed(0)} km from Wikidata (${c.latitude}, ${c.longitude}), tolerance ${tol.toFixed(0)}`); bad++; continue; }
  const km2 = !AREA_SKIP.has(slug) && areas.length === 1 && areas[0].unit.endsWith("/Q712226") ? Math.round(+areas[0].amount) : null;
  report.push(`ok   ${slug.padEnd(16)} ${qid.padEnd(9)} ${km.toFixed(0).padStart(5)} km (tol ${tol.toFixed(0).padStart(4)})  area ${km2 ?? (AREA_SKIP.has(slug) ? "implausible value, omitted" : areas.length > 1 ? "conflicting values, omitted" : "none on Wikidata")}`);
  const desc = km2 ? `${desc0} Area ${km2.toLocaleString("en-US")} km2.` : desc0;
  const properties = { id: `sea-${slug}`, layer: "seas", type, title, sev, desc, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(wiki.replaceAll(" ", "_")), src: `Wikipedia; Wikidata ${qid}${km2 ? " (P2046 area)" : ""}; point checked against P625` };
  if (iso3) properties.iso3 = iso3;
  features.push({ type: "Feature", properties, geometry: { type: "Point", coordinates: [lon, lat] } });
}
console.log(report.join("\n"));
if (bad) { console.error(bad + " feature(s) failed verification; nothing written"); process.exit(1); }
if (new Set(features.map((f) => f.properties.id)).size !== features.length) throw new Error("duplicate ids");
writeFileSync(new URL("../public/data/layers/seas.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "Curated; points verified against Wikidata P625; areas from Wikidata P2046 where unambiguous", licence: "Hand-curated selection; coordinates and areas from Wikidata (CC0); descriptive facts from English Wikipedia (CC BY-SA 4.0)", count: features.length }, features }));
console.log("written:", features.length, "seas");
