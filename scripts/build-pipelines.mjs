// Builds public/data/layers/pipelines.geojson: strategic oil and gas pipelines as SCHEMATIC polylines.
// Every line is a hand-written list of named nodes (endpoints and places the pipeline's English Wikipedia article names as being on the route:
// infobox start/through/finish, pumping or compressor stations, landfalls, border crossings). Nothing is interpolated or guessed.
// Each node is checked three ways and the build FAILS if any check fails:
//   1. the node's Wikidata item has a P625 coordinate within 60 km of an independent approximate position written below (catches wrong QIDs);
//   2. the node's name appears in the raw wikitext of the pipeline's Wikipedia article (or the article named in the 6th field);
//   3. the coordinate written into the file is Wikidata's own P625, rounded to 3 decimals (no hand-typed coordinates).
// Capacity and status appear in `desc` only where the Wikipedia article states them. Straight segments between nodes are NOT the true path.
// Left out because no verifiable route nodes could be assembled: Nord Stream 1 and 2 (the only verifiable nodes are the Russian and German ends plus
// the 2022 leak site off Bornholm; straight segments between them cross Estonia), Caspian Pipeline Consortium (article names only the two ends).
// Run: node scripts/build-pipelines.mjs
import { readFileSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const MAX_KM = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const valid = new Set(JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).map((c) => c.iso3));

// node: [label, qid, approxLat, approxLon, mentionRegexSource, articleOverride?]
const N = (label, qid, lat, lon, mention, art) => ({ label, qid, lat, lon, mention, art });
const HASSI = N("Hassi R'Mel", "Q2755610", 32.93, 3.27, "Hassi R.Mel");
const FUJ = N("Fujairah", "Q4045", 25.12, 56.33, "Fujairah");
const CEYHAN = N("Ceyhan", "Q185346", 37.03, 35.81, "Ceyhan");
const ERZ = N("Erzurum", "Q122803", 39.9, 41.27, "Erzurum");
const KIPOI = N("Kipoi", "Q6414658", 40.95, 26.31, "Kipoi");
const ALM = N("Almetyevsk", "Q103483", 54.9, 52.3, "Almetyevsk");
const UNECHA = N("Unecha", "Q196827", 52.85, 32.68, "Unecha");
const MAZYR = N("Mazyr", "Q386487", 52.05, 29.23, "Mazyr");

// [slug, wikipediaTitle, wikidataQid, type, title, sev, iso3|null, desc, nodes]
const P = [
  ["adcop", "Habshan–Fujairah oil pipeline", "Q2011636", "oil", "Habshan–Fujairah oil pipeline (ADCOP)", 3, "ARE",
    "SCHEMATIC. UAE. 406 km, 1.5 million bbl/d; lets Abu Dhabi crude reach the Gulf of Oman without transiting Hormuz. Operating since 2012.",
    [N("Habshan", "Q5636978", 23.83, 53.62, "Habshan"), N("Sweihan", "Q4118478", 24.46, 55.34, "Sweihan"), FUJ]],
  ["dolphin", "Dolphin Gas Project", "Q5289627", "gas", "Dolphin Gas Pipeline", 3, null,
    "SCHEMATIC. Qatar to UAE: Ras Laffan to Taweelah offshore, then Taweelah to Fujairah (244 km). Qatar's gas export link to the UAE and Oman.",
    [N("Ras Laffan", "Q2131826", 25.93, 51.53, "Ras Laffan"), N("Taweelah", "Q11957209", 24.77, 54.69, "Taweelah"), FUJ]],
  ["east-west", "East–West Crude Oil Pipeline", "Q30688302", "oil", "East–West (Petroline) crude pipeline", 3, "SAU",
    "SCHEMATIC. Saudi Arabia, ~1,200 km, Abqaiq to Yanbu on the Red Sea; bypasses Hormuz. Stated capacity 7 million bbl/d. Hit by drone attacks in 2026; restarted 22 Sep 2026 at reduced volume.",
    [N("Abqaiq", "Q27177", 25.93, 49.67, "Abqaiq"), N("Afif", "Q97291157", 23.9, 42.93, "Afif"), N("Yanbu", "Q466027", 24.09, 38.06, "Yanbu")]],
  ["kirkuk-ceyhan", "Kirkuk–Ceyhan Oil Pipeline", "Q2668754", "oil", "Kirkuk–Ceyhan oil pipeline (Iraq–Turkey)", 2, null,
    "SCHEMATIC. Iraq to Turkey, ~970 km, design capacity 1.5 million bbl/d. Halted March 2023, resumed Sept 2025; one-year Iraq-Turkey extension signed Aug 2026.",
    [N("Kirkuk", "Q173310", 35.47, 44.39, "Kirkuk"), N("Baiji", "Q803712", 34.93, 43.49, "Baiji"), N("Fishkhabur (Ibrahim Khalil crossing)", "Q5984616", 37.1, 42.5, "(Pesh|Fish|Fesh) ?Khabu?r"), CEYHAN]],
  ["btc", "Baku–Tbilisi–Ceyhan pipeline", "Q339546", "oil", "Baku–Tbilisi–Ceyhan (BTC) pipeline", 2, null,
    "SCHEMATIC. Azerbaijan, Georgia, Turkey. 1,768 km, about 1 million bbl/d; routes Caspian oil past Russia and Armenia. Operating since 2006.",
    [N("Sangachal Terminal", "Q192248", 40.19, 49.46, "Sangachal"), N("Tbilisi", "Q994", 41.72, 44.79, "Tbilisi"), N("Borjomi", "Q208352", 41.84, 43.38, "Borjomi"), ERZ, N("Sarız", "Q2364235", 38.48, 36.5, "Sar[ıi]z"), CEYHAN]],
  ["turkstream", "TurkStream", "Q18810087", "gas", "TurkStream", 2, null,
    "SCHEMATIC. Russia to Turkey under the Black Sea, ~930 km offshore, 31.5 bcm/yr on two lines; onward to Bulgaria. Operating since Jan 2020.",
    [N("Anapa (Russkaya compressor station)", "Q15758", 44.89, 37.32, "Anapa"), N("Kıyıköy", "Q1797525", 41.63, 28.1, "K[ıi]y[ıi]k[öo]y"), N("Malkoçlar", "Q6586691", 41.95, 27.0, "Malko[cç]lar")]],
  ["power-of-siberia", "Power of Siberia", "Q2898164", "gas", "Power of Siberia", 3, null,
    "SCHEMATIC. Russia to China via Blagoveshchensk, phase 1 ~2,156 km. Stated full capacity 61 bcm/yr, of which 38 bcm/yr to China. Deliveries since Dec 2019.",
    [N("Chayanda field", "Q4507913", 60.4, 112.4, "Chayanda"), N("Lensk", "Q157493", 60.72, 114.9, "Lensk"), N("Olyokminsk", "Q176348", 60.37, 120.43, "Olyokminsk"), N("Aldan", "Q103273", 58.6, 125.4, "Aldan"), N("Neryungri", "Q172470", 56.66, 124.72, "Neryungri"), N("Skovorodino", "Q194648", 54.0, 123.9, "Skovorodino"), N("Svobodny", "Q193636", 51.4, 128.1, "Svobodny"), N("Blagoveshchensk", "Q6934", 50.28, 127.54, "Blagoveshchensk")]],
  ["druzhba-south", "Druzhba pipeline", "Q315654", "oil", "Druzhba pipeline, southern branch", 2, null,
    "SCHEMATIC. Russia, Belarus, Ukraine, Slovakia, Hungary. Southern branch of a ~4,000 km system (1.2-1.4 million bbl/d). Halted by attacks in Jan 2026; flows back to normal by May 2026.",
    [ALM, UNECHA, MAZYR, N("Brody", "Q465104", 50.08, 25.15, "Brody"), N("Uzhhorod", "Q156711", 48.62, 22.29, "Uzhhorod"), N("Százhalombatta", "Q773203", 47.32, 18.91, "Sz[aá]zhalombatta")]],
  ["druzhba-north", "Druzhba pipeline", "Q315654", "oil", "Druzhba pipeline, northern branch", 1, null,
    "SCHEMATIC. Russia, Belarus, Poland, Germany: Mazyr to the Płock and Schwedt refineries. Russian supply to Germany ended Jan 2023 and to Poland Feb 2023.",
    [ALM, UNECHA, MAZYR, N("Płock", "Q104725", 52.55, 19.7, "P[lł]ock"), N("Schwedt", "Q16008", 53.06, 14.28, "Schwedt")]],
  ["tap", "Trans Adriatic Pipeline", "Q505615", "gas", "Trans Adriatic Pipeline (TAP)", 2, null,
    "SCHEMATIC. Greece, Albania, Italy; 878 km, 10 bcm/yr initial capacity. Final leg of the Southern Gas Corridor; operating since Nov 2020.",
    [KIPOI, N("Fier", "Q190897", 40.72, 19.55, "Fier"), N("Melendugno", "Q52157", 40.27, 18.33, "Melendugno")]],
  ["gme", "Maghreb–Europe Gas Pipeline", "Q734096", "gas", "Maghreb–Europe Gas Pipeline (GME)", 1, null,
    "SCHEMATIC. Algeria, Morocco, Spain; 1,620 km, 12 bcm/yr when running. Not in operation since Algeria let the contract lapse on 31 Oct 2021; a section was reversed in June 2022 to export gas to Morocco.",
    [HASSI, N("Strait of Gibraltar crossing", "Q36124", 35.97, -5.52, "Strait of Gibraltar"), N("Córdoba", "Q5818", 37.89, -4.78, "C[oó]rdoba")]],
  ["transmed", "Trans-Mediterranean Pipeline", "Q1933027", "gas", "Trans-Mediterranean (TransMed) pipeline", 1, null,
    "SCHEMATIC. Algeria, Tunisia, Italy: Algerian gas via Cap Bon, Sicily and the Strait of Messina to Minerbio; a branch serves Slovenia.",
    [HASSI, N("El Haouaria (Cap Bon)", "Q1324235", 37.05, 11.01, "El Haouaria"), N("Mazara del Vallo", "Q481730", 37.65, 12.59, "Mazara del Vallo"), N("Strait of Messina", "Q134705", 38.25, 15.63, "Strait of Messina"), N("Minerbio", "Q94948", 44.62, 11.47, "Minerbio")]],
  ["medgaz", "Medgaz", "Q286680", "gas", "Medgaz", 1, null,
    "SCHEMATIC. Algeria to Spain, 757 km; capacity expanded from 8 to 10.5 bcm/yr. Operating since 2011; Algeria's direct route to Spain.",
    [HASSI, N("Beni Saf", "Q80408", 35.3, -1.38, "Beni Saf"), N("Almería", "Q10400", 36.84, -2.46, "Almer[ií]a")]],
  ["keystone", "Keystone Pipeline", "Q1631056", "oil", "Keystone Pipeline (Phases I-III)", 2, null,
    "SCHEMATIC. Canada and US: Hardisty (Alberta) to Nederland (Texas); Phase III 700,000 bbl/d. Operating. Keystone XL (Phase IV) was cancelled in 2021 and is not shown.",
    [N("Hardisty", "Q2798556", 52.67, -111.3, "Hardisty"), N("Steele City", "Q3287803", 40.04, -97.02, "Steele City"), N("Cushing", "Q1007904", 35.98, -96.77, "Cushing"), N("Nederland", "Q615136", 29.97, -94.0, "Nederland")]],
  ["taps", "Trans-Alaska Pipeline System", "Q937088", "oil", "Trans-Alaska Pipeline System (TAPS)", 1, "USA",
    "SCHEMATIC. Alaska, ~800 miles (1,300 km) from Prudhoe Bay to the Valdez Marine Terminal, with 12 pump stations. Operating.",
    [N("Prudhoe Bay", "Q1013046", 70.25, -148.4, "Prudhoe Bay"), N("Atigun Pass", "Q630824", 68.13, -149.47, "Atigun Pass"), N("Livengood", "Q1836544", 65.49, -148.55, "Livengood"), N("Valdez", "Q80037", 61.13, -146.35, "Valdez")]],
  ["tapi", "Turkmenistan–Afghanistan–Pakistan–India Pipeline", "Q1759549", "gas", "TAPI pipeline (Turkmenistan–Afghanistan–Pakistan–India)", 1, null,
    "SCHEMATIC. ~1,814 km planned, 33 bcm/yr. Under construction, not operating: Turkmen section completed 2024, Afghan work under way, Herat targeted by end-2026.",
    [N("Galkynysh gas field", "Q730460", 37.3, 62.36, "Galkynysh"), N("Herat", "Q45313", 34.34, 62.2, "Herat"), N("Kandahar", "Q45604", 31.62, 65.72, "Kandahar"), N("Quetta", "Q185458", 30.2, 67.02, "Quetta"), N("Multan", "Q185453", 30.2, 71.47, "Multan"), N("Fazilka", "Q1525269", 30.4, 74.03, "Fazilka")]],
  ["tanap", "Trans-Anatolian gas pipeline", "Q2645428", "gas", "Trans-Anatolian gas pipeline (TANAP), Turkish section", 2, null,
    "SCHEMATIC. Azerbaijani gas across Turkey, drawn from Erzurum to the Greek border at Kipoi where it joins TAP; initial capacity 16 bcm/yr. Inaugurated June 2018.",
    [ERZ, N("Eskişehir", "Q168866", 39.78, 30.52, "Eski[şs]ehir"), N(KIPOI.label, KIPOI.qid, KIPOI.lat, KIPOI.lon, "Kipoi", "Trans Adriatic Pipeline")]],
];

const hav = (a, b, c, d) => { const r = (x) => (x * Math.PI) / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Wikidata: all node and pipeline items in batches of 40
const qids = [...new Set(P.flatMap((p) => [p[2], ...p[8].map((n) => n.qid)]))];
const wd = {};
for (let i = 0; i < qids.length; i += 40) {
  const r = await fetch("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks|labels&sitefilter=enwiki&languages=en&ids=" + qids.slice(i, i + 40).join("|"), { headers: UA }).then((r) => r.json());
  Object.assign(wd, r.entities); await sleep(400);
}
// Wikipedia wikitext of each article, one request at a time
const wikitext = {};
const getText = async (title) => { if (wikitext[title] === undefined) { const r = await fetch("https://en.wikipedia.org/w/index.php?action=raw&title=" + encodeURIComponent(title.replaceAll(" ", "_")), { headers: UA }); if (!r.ok) throw new Error("wikipedia " + r.status + " " + title); wikitext[title] = norm(await r.text()); await sleep(400); } return wikitext[title]; };

const features = []; const report = []; let bad = 0;
for (const [slug, wiki, pq, type, title, sev, iso3, desc, nodes] of P) {
  const art = await getText(wiki);
  const pe = wd[pq]; const pwiki = pe?.sitelinks?.enwiki?.title;
  if (!pwiki) { report.push(`FAIL ${slug}: no enwiki sitelink on ${pq}`); bad++; continue; }
  const coords = [];
  report.push(`${slug}  (${pq} -> "${pwiki}")`);
  for (const n of nodes) {
    const e = wd[n.qid]; const c = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    const text = n.art ? await getText(n.art) : art;
    const mentioned = new RegExp("\\b(" + norm(n.mention) + ")", "i").test(text);
    const km = c ? hav(n.lat, n.lon, c.latitude, c.longitude) : Infinity;
    const ok = c && km <= MAX_KM && mentioned;
    report.push(`   ${ok ? "ok  " : "FAIL"} ${n.label.padEnd(38)} ${n.qid.padEnd(10)} wd="${e?.labels?.en?.value}" ${isFinite(km) ? km.toFixed(0) : "-"} km  in article: ${mentioned}${n.art ? " (" + n.art + ")" : ""}`);
    if (!ok) { bad++; continue; }
    coords.push([+c.longitude.toFixed(3), +c.latitude.toFixed(3)]);
  }
  if (coords.length < 3 || coords.length > 10) { report.push(`FAIL ${slug}: ${coords.length} nodes`); bad++; continue; }
  if (iso3 && !valid.has(iso3)) { report.push(`FAIL ${slug}: iso3 ${iso3} not in countries.json`); bad++; continue; }
  const properties = { id: `pipe-${slug}`, layer: "pipelines", type, title, sev, desc, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(pwiki.replaceAll(" ", "_")), src: `Wikipedia "${wiki}" (route nodes, status); Wikidata P625 (node coordinates)` };
  if (iso3) properties.iso3 = iso3;
  features.push({ type: "Feature", properties, geometry: { type: "LineString", coordinates: coords } });
}
console.log(report.join("\n"));
if (bad) { console.error(bad + " check(s) failed; nothing written"); process.exit(1); }
if (new Set(features.map((f) => f.properties.id)).size !== features.length) throw new Error("duplicate ids");
writeFileSync(new URL("../public/data/layers/pipelines.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "Curated route nodes from English Wikipedia articles; node coordinates are Wikidata P625; schematic straight segments", licence: "Hand-curated selection; coordinates and areas from Wikidata (CC0); descriptive facts from English Wikipedia (CC BY-SA 4.0)", count: features.length }, features }));
console.log("written:", features.length, "pipelines");
