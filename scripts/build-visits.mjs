// Builds public/data/visits.json: UAE official visits, high-level meetings, calls and signings, from the headlines of WAM (Emirates News Agency).
// WAM publishes a monthly news sitemap (title + publication time of every English article; robots.txt allows crawling). Headlines are classified by rules, so
// treat the result as "what WAM reported", not a complete diplomatic diary. The file grows: each run refreshes the latest months and keeps everything earlier.
// Usage: node scripts/build-visits.mjs [--months=24]
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; geo-desk research; +https://github.com/Aas1993/geo-desk)" };
const OUT = new URL("../public/data/visits.json", import.meta.url);
const MONTHS = +(process.argv.find((a) => a.startsWith("--months="))?.split("=")[1] ?? 24);
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).filter((c) => c.iso3 !== "ARE");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60_000) }); if (r.ok) return r.text(); if (r.status === 404) return ""; } catch { /* retry */ } await sleep(2_500 * (i + 1)); } throw new Error("failed " + u); };
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();

// ── who is named in a headline: country names, demonyms (Wikidata), a few aliases ──
const demonyms = await (async () => {
  try {
    const q = 'SELECT ?iso3 ?d WHERE { ?c wdt:P298 ?iso3 . ?c wdt:P1549 ?d FILTER(lang(?d)="en") ?c wdt:P31/wdt:P279* wd:Q6256 . FILTER NOT EXISTS { ?c wdt:P576 ?e } }';
    const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: { ...UA, Accept: "application/sparql-results+json" } });
    const m = {}; for (const b of (await r.json()).results.bindings) (m[b.iso3.value] ??= new Set()).add(b.d.value); return m;
  } catch { return {}; }
})();
const ALIAS = { USA: ["US", "U.S.", "America", "American"], GBR: ["UK", "U.K.", "Britain", "British"], KOR: ["South Korea", "Korean"], PRK: ["North Korea"], RUS: ["Russia", "Russian"], CHN: ["China", "Chinese"], TUR: ["Türkiye", "Turkiye", "Turkey", "Turkish"], SAU: ["Saudi"], IRN: ["Iran", "Iranian"], EGY: ["Egypt", "Egyptian"], COD: ["DRC", "Democratic Republic of the Congo", "DR Congo"], COG: ["Republic of the Congo"], CZE: ["Czech", "Czechia"], MMR: ["Myanmar"], PSE: ["Palestine", "Palestinian"], ISR: ["Israel", "Israeli"], IND: ["India", "Indian"], PAK: ["Pakistan", "Pakistani"], FRA: ["France", "French"], DEU: ["Germany", "German"], VAT: ["Holy See", "Vatican"], HKG: ["Hong Kong", "Hongkong"], MAC: ["Macao", "Macau"] };
const CAPITALS = { USA: "Washington", GBR: "London", RUS: "Moscow|Kremlin", CHN: "Beijing", KOR: "Seoul", SAU: "Riyadh", IRN: "Tehran", EGY: "Cairo", TUR: "Ankara", IND: "New Delhi", PAK: "Islamabad", FRA: "Paris", DEU: "Berlin" }; // a capital names where something happened, not who it was with: used only when no country is named
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Names that overlap need exact rules: "Korea" is both, "Congo" is both, "Guinea" is inside three other names, "Sudan" inside "South Sudan", "Dominica" next to "Dominican Republic".
const OVERRIDE = {
  KOR: "(?<![\\w-])(?<!North )(South Korea|Republic of Korea|South Korean|Korea|Korean)(?![\\w])", PRK: "(?<![\\w-])(North Korea|North Korean|DPRK|Democratic People's Republic of Korea|Pyongyang)(?![\\w])",
  COD: "(?<![\\w-])(DR Congo|DRC|Democratic Republic of (the )?Congo|Congo-Kinshasa|Kinshasa)(?![\\w])", COG: "(?<![\\w-])(?<!Democratic )(Republic of (the )?Congo|Congo-Brazzaville|Brazzaville)(?![\\w])",
  GIN: "(?<![\\w-])(?<!Papua New )(?<!Equatorial )Guinea(?![\\w]|-Bissau| Bissau)|(?<![\\w-])Guinean(?![\\w])", GNB: "(?<![\\w-])(Guinea-Bissau|Guinea Bissau)(?![\\w])", PNG: "(?<![\\w-])(Papua New Guinea)(?![\\w])", GNQ: "(?<![\\w-])(Equatorial Guinea)(?![\\w])",
  SDN: "(?<![\\w-])(?<!South )(Sudan|Sudanese)(?![\\w])", SSD: "(?<![\\w-])(South Sudan|South Sudanese)(?![\\w])",
  DMA: "(?<![\\w-])(Dominica|Commonwealth of Dominica)(?![\\w])", DOM: "(?<![\\w-])(Dominican Republic|Dominican)(?![\\w])",
  PSE: "(?<![\\w-])(Palestine|Palestinian|State of Palestine|Gaza|West Bank)(?![\\w])",
};
const terms = countries.map((c) => { if (OVERRIDE[c.iso3]) return { iso3: c.iso3, re: new RegExp(OVERRIDE[c.iso3], "i") }; const base = c.name.replace(/,.*$/, "").trim(); const set = new Set([base, ...(ALIAS[c.iso3] ?? []), ...(demonyms[c.iso3] ?? [])].filter((t) => t.length >= 3 || /^(US|UK)$/.test(t))); return { iso3: c.iso3, re: new RegExp(`(?<![\\w-])(${[...set].map(esc).join("|")})(?![\\w])`, c.iso3 === "USA" || c.iso3 === "GBR" ? "" : "i") }; });
const capTerms = Object.entries(CAPITALS).map(([iso3, c]) => ({ iso3, re: new RegExp(`(?<![\\w-])(${c})(?![\\w])`) }));
const named = (title) => { const hit = terms.filter((t) => t.re.test(title)).map((t) => t.iso3); return hit.length ? hit : capTerms.filter((t) => t.re.test(title)).map((t) => t.iso3); };

// ── what kind of engagement, how senior, which direction ──
const NOISE = /\b(pavilion|invitation|invites?|exhibition|expo|tourist|visitors?|visa|visit abu dhabi|visit dubai|hospital|patients?|football|cricket|tennis|golf|match|league|championship|rally|stock|shares?|index|weather|traffic|fuel prices?)\b/i;
const KIND = [["message", /\b(written|oral|verbal) message|letter (from|to)|message from|cables?\b|condolences|congratulates|congratulations/i], ["call", /\b(phone|telephone|video) calls?\b|receives (a )?call|in a call|\bcalls? (with|from|to)\b|\bcalls (the|on|up)\b/i], ["signing", /\b(signs?|signed|signing|sign(s)? (an )?(agreement|mou|memorand))\b|witnesses (the )?signing/i], ["visit", /\bvisit(s|ed|ing)?\b|arrives? (in|at)|on (an )?(official|state|working) visit|tour of|travels? to/i], ["meeting", /\b(receives?|received|meets?|met|meeting|holds? talks|talks with|discuss(es)?|welcomes?|hosts?|co-?chairs?|sessions?|consultations?)\b/i]];
const HEAD = /\b(UAE President|Ras Al Khaimah Ruler|[A-Z][a-z]+ Ruler\b|Mohamed bin Zayed|President (Sheikh )?Mohamed|Vice[- ]President|Mohammed bin Rashid|Mansour bin Zayed|Crown Prince|Prime Minister|Chancellor|President of|King of|King\b|Emperor|Sultan of|Emir of|Amir of|Ruler of|Head of State)\b/i;
const MIN = /\b(Abdullah bin Zayed|Foreign Minister|Minister|Secretary[- ]General|Speaker|Chairman|Governor|Envoy|Secretary of State|Secretary)\b/i;
const OFFICIAL = /\b(delegation|ambassador|credentials|official|commander|chief of)\b/i;
// Who is the UAE side? Direction comes from who does the receiving/hosting: the UAE receives => inbound; a foreign leader receives a UAE figure => outbound.
const UAE_ACTOR = /\b(Saud bin Saqr|Humaid bin Rashid|Hamad bin Mohammed|Saud bin Rashid|Sultan bin Muhammad|Sultan bin Mohammed|Hazza bin Zayed|Theyab bin Mohamed|Zayed bin Hamdan|Nahyan bin Mubarak|Ruler of (Dubai|Sharjah|Ajman|Fujairah|Umm Al Quwain|Ras Al Khaimah)|Crown Prince of (Abu Dhabi|Dubai|Sharjah|Ajman|Fujairah|Ras Al Khaimah)|UAE|Emirati?s?|Emirates|Abu Dhabi|Dubai|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain|Mohamed bin Zayed|Mohammed bin Rashid|Mansour bin Zayed|Abdullah bin Zayed|Tahnoon bin Zayed|Hamdan bin Mohammed|Hamdan bin Zayed|Khaled bin Mohamed|Saif bin Zayed|Sultan Al Jaber|Al Zeyoudi|Reem Al Hashimy|Khalifa Shaheen|MoFA|Sheikh (Abdullah|Mohamed|Mohammed|Mansour|Tahnoon|Hamdan|Saud|Saeed|Saif|Khaled|Theyab|Hazza|Nahyan|Ammar|Humaid))\b/i;
const HOST_VERB = /\b(receives?|hosts?|welcomes?|greets?)\b/i;
function direction(title) {
  if (/\b(phone|telephone|video) call|\bcalls?\b/i.test(title)) return null;
  if (/\bvisit(s|ed|ing)?\s+(to\s+)?(the\s+)?(UAE|Abu Dhabi|Dubai|Emirates)\b|\barrives? (in|at) (the )?(UAE|Abu Dhabi|Dubai)|\bstate visit to (the )?UAE|\bupon arrival in (Abu Dhabi|Dubai|the UAE)/i.test(title)) return "in";
  if (/\bAmbassador (of [^,]+ )?to (the )?(UAE|United Arab Emirates)\b/i.test(title)) return "in";
  const m = title.match(HOST_VERB); if (m) { const before = title.slice(0, m.index), after = title.slice(m.index + m[0].length); const uBefore = UAE_ACTOR.test(before), uAfter = UAE_ACTOR.test(after); if (uBefore && !uAfter) return "in"; if (!uBefore && uAfter) return "out"; }
  if (/\b(in|to) (Abu Dhabi|Dubai|the UAE)\b/i.test(title)) return "in";
  if (UAE_ACTOR.test(title.split(/\b(visits?|arrives?|travels?|participates|attends)\b/i)[0] ?? "") && /\b(visits?|arrives?|travels?|participates|attends)\b/i.test(title)) return "out";
  return null;
}
// corporate and academic names are not diplomatic counterparts unless a senior UAE office-holder is named
const CORP = /\b(Bank|Corporation|Corp\b|Group|Airlines?|Airways|Company|Holdings?|Capital|Fund|Ltd|Inc\b|PLC|Chambers?|Foundation|University|Institute|Council of|Association|Federation|Authority)\b/i;
const UAE_SENIOR = /\b(UAE President|Mohamed bin Zayed|Vice[- ]President|Crown Prince|Abdullah bin Zayed|Foreign Minister|Minister of State|Mansour bin Zayed|Tahnoon bin Zayed|Mohammed bin Rashid)\b/i;
// the UAE must be a party: "Emir of Qatar, UK PM discuss..." says nothing about UAE engagement, and a condemnation of an attack is a statement, not a contact
const UAE_PARTY = /\b(UAE|Emirati|Emirates|Abu Dhabi|Dubai|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al (Quwain|Qaiwain)|MoFA|FNC|Federal National Council|Mohamed bin Zayed|Mohammed bin Rashid|Abdullah bin Zayed|Mansour bin Zayed|Tahnoon bin Zayed|Shakhboot|Gargash|Nusseibeh|Al Gergawi|Bin Touq|Al Zeyoudi|Sultan Al Jaber|Hamdan bin)\b/i;
const HOSTILE = /\b(terrorist attacks?|condemn(s|ed)?|denounces?|strongly condemns?)\b/i;
function classify(title) {
  if (NOISE.test(title)) return null; if (!UAE_PARTY.test(title) && !UAE_ACTOR.test(title)) return null; if (HOSTILE.test(title) && !/\b(phone|telephone|video) calls?\b|\b(receives?|meets?|hosts?|discuss)\b/i.test(title)) return null; // a statement of condemnation is not a contact; a call or meeting that mentions an attack is
  if (CORP.test(title) && !UAE_SENIOR.test(title)) return null; const kind = KIND.find(([, re]) => re.test(title))?.[0]; if (!kind) return null;
  const cs = named(title); if (!cs.length) return null; // no partner country named: not useful on the map
  if (!HEAD.test(title) && !MIN.test(title) && !OFFICIAL.test(title) && kind !== "signing") return null; // keep engagements involving officials
  const level = HEAD.test(title) ? 3 : MIN.test(title) ? 2 : 1; const dir = direction(title);
  return { c: cs.slice(0, 4), k: kind, l: level, dir };
}

// ── read the monthly sitemaps ──
const index = await get("https://www.wam.ae/sitemap.xml");
const months = [...new Set([...index.matchAll(/sitemap\/news\/en\/(\d{4})\/(\d{1,2})\/english\.xml/g)].map((m) => `${m[1]}/${m[2]}`))].sort((a, b) => { const [ay, am] = a.split("/").map(Number), [by, bm] = b.split("/").map(Number); return ay - by || am - bm; }).slice(-MONTHS);
if (!months.length) { console.error("REFUSING TO WRITE: no monthly sitemaps found"); process.exit(1); }
const VERSION = 3; // bump when classify() or the country terms change: older months are only re-read when the stored version differs
const prevFile = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { items: [] }; const prev = prevFile.v === VERSION ? prevFile : { items: [] }; const byId = new Map((prev.items ?? []).map((x) => [x.u, x]));
const hot = new Set(months.slice(-2)); const have = new Set((prev.items ?? []).map((x) => x.d.slice(0, 7).replace("-0", "/").replace("-", "/"))); let scanned = 0, kept = 0;
for (const m of months) {
  const [y, mo] = m.split("/"); if (!hot.has(m) && (prev.items ?? []).some((x) => x.d.startsWith(`${y}-${String(mo).padStart(2, "0")}`))) continue; // earlier months already done
  await sleep(1_500); const xml = await get(`https://www.wam.ae/sitemap/news/en/${m}/english.xml`); let n = 0, k = 0;
  for (const u of xml.split("<url>").slice(1)) {
    const loc = u.match(/<loc>([^<]+)<\/loc>/)?.[1]; const date = u.match(/<news:publication_date>([^<]+)</)?.[1]; const title = unesc(u.match(/<news:title>([\s\S]*?)<\/news:title>/)?.[1] ?? ""); if (!loc || !date || !title) continue; n++;
    const id = loc.replace(/^.*\/en\/article\//, ""); const c = classify(title); if (!c) continue; k++; byId.set(id, { u: id, d: date.slice(0, 10), t: title.slice(0, 200), ...c });
  }
  scanned += n; kept += k; console.log(m, "articles", n, "kept", k);
}
const items = [...byId.values()].sort((a, b) => b.d.localeCompare(a.d) || a.u.localeCompare(b.u));
const cs = new Set(items.flatMap((x) => x.c)); const pcs = prevOf("visits.json", (j) => new Set(j.items.flatMap((x) => x.c)).size); if (items.length < 300 || cs.size < 60 || thin(cs.size, pcs, 0.8)) { console.error(`REFUSING TO WRITE: ${items.length} items, ${cs.size} countries`); process.exit(1); }
writeFileSync(OUT, JSON.stringify({ v: VERSION, built: new Date().toISOString(), source: { name: "WAM (Emirates News Agency) headlines, classified by rules", url: "https://www.wam.ae/en", note: "What WAM reported, auto-classified from headlines; not a complete diplomatic diary. Links open the WAM article." }, from: items[items.length - 1].d, items }));
const byKind = {}, byLevel = {}; for (const x of items) { byKind[x.k] = (byKind[x.k] ?? 0) + 1; byLevel[x.l] = (byLevel[x.l] ?? 0) + 1; }
console.log(`items ${items.length} from ${items[items.length - 1].d}; countries ${cs.size}; scanned ${scanned}; kinds ${JSON.stringify(byKind)}; levels ${JSON.stringify(byLevel)}`);
for (const x of items.slice(0, 6)) console.log(" ", x.d, x.c.join("/"), x.k, "L" + x.l, x.dir ?? "-", "|", x.t.slice(0, 95));
