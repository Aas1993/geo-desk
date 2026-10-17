// Builds public/data/agreements.json: every agreement the UAE has with each country, from three official sources.
//   1. MOFA "Agreements" page (mofa.gov.ae): treaties and MoUs by country (tax, air services, legal, defence, labour...).
//   2. MoFT "Economic Cooperation Map" (trade.gov.ae): economic MoUs, joint economic committees (with meeting dates), UAE economic offices abroad.
//   3. MoFT CEPA pages (trade.gov.ae): signed / in-force dates per Comprehensive Economic Partnership Agreement, discovered from the index page.
// Polite by design: one request per page, a 1.2 s gap, a descriptive User-Agent, run once a day by CI. Nothing is republished beyond titles and dates, and every row links back.
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; geo-desk research; +https://github.com/Aas1993/geo-desk)" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z]/g, "");
const byName = new Map(countries.map((c) => [norm(c.name), c.iso3])); const byIso2 = new Map(countries.map((c) => [c.iso2.toLowerCase(), c.iso3]));
const ALIAS = { antiguaandbarabuda: "ATG", bahamas: "BHS", brunei: "BRN", capeverde: "CPV", czechrepublic: "CZE", dominican: "DOM", gambia: "GMB", kyrgyzstan: "KGZ", laos: "LAO", macedonia: "MKD", northkorea: "PRK", palestine: "PSE", russia: "RUS", saintkittsandnevis: "KNA", saintlucia: "LCA", saotimeandprincipe: "STP", slovakia: "SVK", southkorea: "KOR", turkey: "TUR", venezuela: "VEN", syria: "SYR", myanmar: "MMR", hongkong: "HKG", costarica: "CRI", equatorialguinea: "GNQ", guineaconakry: "GIN", mauritania: "MRT", peru: "PER", grenadines: "VCT", vanuata: "VUT", vanuatu: "VUT", somalia: "SOM", nauru: "NRU", kosovo: "XKX", turkiye: "TUR", drcongo: "COD", democraticrepublicofthecongo: "COD", democraticrepublicofthecongokinshasa: "COD", congo: "COG", republicofthecongo: "COG", ivorycoast: "CIV", coted: "CIV", swaziland: "SWZ", eswatini: "SWZ", unitedstates: "USA", unitedkingdom: "GBR", uk: "UK" };
const iso = (name) => { const n = norm(name); return ALIAS[n] ?? byName.get(n) ?? null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45_000), redirect: "follow" }); if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.text(); };
const text = (h) => h.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/[ \t\r]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

/** What an agreement is about, from its title. Order matters: the first match wins. */
const TYPES = [
  ["cepa", /comprehensive economic partnership|\bcepa\b/i], ["fta", /free trade/i], ["air", /air (transport|services?|navigation)|aviation|air traffic|civil aviation|air arabia|emirates airline|airways|\bairlines?\b|\broutes\b|baggage|\bflights?\b/i],
  ["tax", /double taxation|tax evasion|avoid(ance)? of double|fiscal evasion|exchange of information.*tax/i], ["investment", /invest/i],
  ["legal", /extradition|mutual legal|sentenced persons|judicial|legal (assistance|cooperation)|criminal matters|civil and commercial/i],
  ["security", /defen[cs]e|military|security|narcotic|terroris|police|money laundering|cyber|armed forces|troops|force from|intelligence|emergency|civil protection|customs (cooperation|assistance)/i],
  ["visa", /visa|diplomatic (and special )?passport|travel documents|mutual exemption|consular/i], ["labour", /labou?r|manpower|employment|workers|domestic worker|recruitment/i],
  ["environment", /environment|climate|biolog|wildlife|water|sustainab|plant protection|co2|carbon/i], ["energy", /energy|\boil\b|\bgas\b|petroleum|nuclear|renewable|electricity|power|field contract|sonatrach|masdar|borealis/i], ["finance", /central bank|fund for development|loan|financ|banking|capital market|securities/i],
  ["transport", /maritime|shipping|road transport|railway|transport|ports?\b|logistics/i], ["health", /health|medical|pharma|veterinary|food safety|agricultur/i],
  ["education", /educat|science|research|scientific|universit|youth|sports?\b|culture|cultural|media|heritage|tourism|information|news agency|library|archives|museum/i],
  ["tech", /technolog|digital|space|communication|telecom|artificial intelligence|innovation|e-commerce|e-government/i],
  ["trade", /trade|economic|commerce|commercial|customs|industry|industrial|joint (economic )?committee|standards|chamber|business council|free zone/i],
  ["political", /political|consultation|joint (ministerial )?committee|diplomats?|strategic partnership|cooperation|diplomatic|foreign (ministries|affairs)|joint (ministerial )?commission|framework|general/i],
];
const typeOf = (t) => (TYPES.find(([, re]) => re.test(t)) ?? ["other"])[0];
const kindOf = (t) => (/^\s*(memorand|mou\b|m\.o\.u|joint declaration|declaration|programme|program of|executive program|plan of action|protocol of cooperation)/i.test(t) || /memorandum of understanding|\bmou\b/i.test(t) ? "mou" : "agreement");
const out = {}; const rec = (iso3, name) => (out[iso3] ??= { name, mofa: [], moft: [], committees: [], offices: [], cepa: null });
const miss = { mofa: [], moft: [] }; const sources = {};

// ── 1. MOFA ──────────────────────────────────────────────────────────────────
const MOFA_URL = "https://www.mofa.gov.ae/en/the-UAE/UAE-the-achiever/Agreements";
{
  const html = await get(MOFA_URL); let items = 0, n = 0;
  for (const m of html.matchAll(/data-country-id="\{[0-9A-F-]+\}">([\s\S]*?)(?=data-country-id="\{|<footer|$)/g)) {
    const body = m[1]; const flag = body.match(/Customized-Flags\/([^"/]+)\.png/)?.[1]?.replace(/%20/g, " "); const h2 = text(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "");
    const code = (flag && iso(flag.replace(/-+/g, " "))) || iso(h2) || iso(h2.replace(/^(the )?(republic|kingdom|state|federal republic|commonwealth|federation|islamic republic|democratic republic|peoples republic) of (the )?/i, ""));
    if (!code) { miss.mofa.push(flag ?? h2); continue; }
    const titles = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => text(x[1])).filter((t) => t.length > 6);
    const c = rec(code, countries.find((x) => x.iso3 === code)?.name ?? h2); n++;
    for (const t of new Set(titles)) { c.mofa.push({ t, type: typeOf(t), kind: kindOf(t) }); items++; }
  }
  sources.mofa = { name: "UAE Ministry of Foreign Affairs · Agreements", url: MOFA_URL, countries: n, items, note: "Published by MOFA. Does not list CEPAs and can lag recent signings." };
}
await sleep(1200);

// ── 2. MoFT economic cooperation map ─────────────────────────────────────────
const MAP_URL = "https://www.trade.gov.ae/web/guest/economic-cooperation-map";
{
  const html = await get(MAP_URL); let items = 0, n = 0;
  const str = String.raw`'((?:[^'\\]|\\.)*)'`; const un = (s) => text(s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\//g, "/"));
  const marks = [...html.matchAll(new RegExp(String.raw`code:\s*'([a-z]{2})',\s*cCountryName:\s*${str}`, "g"))];
  for (let i = 0; i < marks.length; i++) {
    const [, code2, rawName] = marks[i]; const name = un(rawName); if (/[؀-ۿ]/.test(name)) continue; // the page ships an Arabic copy of the same data
    const slice = html.slice(marks[i].index, marks[i + 1]?.index ?? marks[i].index + 60_000);
    const code = byIso2.get(code2) ?? iso(name); if (!code) { miss.moft.push(name); continue; }
    const c = rec(code, countries.find((x) => x.iso3 === code)?.name ?? name); n++;
    for (const t of slice.matchAll(new RegExp(String.raw`cMouTitle:\s*${str}\s*,\s*cMouYear:\s*${str}`, "g"))) {
      const title = un(t[1]); const year = un(t[2]).replace(/^-$/, ""); if (!title) continue;
      if (/^Joint Economic Committee/i.test(title)) {
        const since = title.match(/force since (\d{4})/i)?.[1] ?? null; const meetings = title.match(/No of Meetings:\s*(\d+)/i)?.[1] ?? null; const last = title.match(/most recent meeting:\s*([^\n]+)/i)?.[1]?.trim() ?? null;
        c.committees.push({ since: since && +since, meetings: meetings && +meetings, last, raw: title.replace(/\n/g, " · ") });
      } else if (/^Office in/i.test(title)) { const email = title.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? null; const phone = title.match(/Phone:\s*([^\n]+)/i)?.[1]?.trim() ?? null; c.offices.push({ label: title.split("\n")[0].replace(/:$/, ""), email, phone }); }
      else { c.moft.push({ t: title, type: typeOf(title), kind: kindOf(title), year: year || null }); items++; }
    }
  }
  sources.moft = { name: "UAE Ministry of Foreign Trade · Economic Cooperation Map", url: MAP_URL, countries: n, items, note: "Economic, trade and technical cooperation agreements, MoUs and joint economic committees." };
}
await sleep(1200);

// ── 3. CEPAs: discovered from the Ministry's CEPA index, dates read from each official page ──
const CEPA_INDEX = "https://www.trade.gov.ae/web/guest/comprehensive-economic-partnership-agreements";
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const toIso = (s) => { const m = s.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${MONTHS})\\s*,?\\s*(20\\d\\d)|(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(20\\d\\d)`)); if (!m) return null; const d = m[1] ?? m[5], mo = m[2] ?? m[4], y = m[3] ?? m[6]; return new Date(Date.UTC(+y, MONTHS.split("|").indexOf(mo), +d)).toISOString().slice(0, 10); };
// Signing dates that the Ministry states on its CEPA index page rather than on the agreement's own page.
const OFFICIAL_SIGNED = { IND: "2022-02-18" };
const cepas = [];
{
  const idx = await get(CEPA_INDEX); const links = [...new Set([...idx.matchAll(/href="(\/web\/guest\/[^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*Read More/g)].map((m) => m[1]))];
  for (const href of links) {
    await sleep(1200); const url = "https://www.trade.gov.ae" + href;
    try {
      const html = await get(url); const body = text(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ""));
      const title = text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/\s*-\s*Ministry Of Foreign Trade.*/i, "");
      const partner = (title.match(/(?:UAE|United Arab Emirates)\s*[-–—&]*\s*(?:the\s+)?(?:Republic of\s+)?([A-Za-zÀ-ÿ' .]+?)\s+(?:CEPA|Comprehensive)/i)?.[1] ?? href.match(/uae-([a-z-]+?)-(?:comprehensive|cepa)/)?.[1]?.replace(/-/g, " ") ?? "").trim();
      const code = iso(partner.replace(/^türkiye$/i, "turkey")) ?? iso(partner);
      const para = body.split("\n").find((l) => /\b(signed|entered into force|came into force|came into effect|enter into force|effective from)\b/i.test(l) && /20\d\d/.test(l)) ?? "";
      const signed = toIso(para.match(/signed (?:on |in )?([^;]*?20\d\d)/i)?.[1] ?? ""); const force = toIso(para.match(/(?:into force|into effect|effective from|effective on)(?: on)?\s+([^;]*?20\d\d)/i)?.[1] ?? "");
      if (!code) { miss.cepa = [...(miss.cepa ?? []), partner || href]; continue; }
      // "will enter into force on <date>" is common wording on older pages: a date that has passed means it is in force
      const today = new Date().toISOString().slice(0, 10); const live = force && force <= today;
      cepas.push({ iso3: code, partner: partner || code, signed: signed ?? OFFICIAL_SIGNED[code] ?? null, inForce: live ? force : null, due: force && !live ? force : null, status: live ? "in-force" : signed || force ? "signed" : "unknown", url, source: "UAE Ministry of Foreign Trade" });
    } catch (e) { miss.cepa = [...(miss.cepa ?? []), `${href}: ${e.message}`]; }
  }
  // Recently signed, announced by the Ministry in news items before a CEPA page exists. Each row links to the Ministry's own item; only what that item states is recorded.
  const NEWS = "https://www.trade.gov.ae/web/guest/w/";
  const SUPPLEMENT = [
    { iso3: "SLE", partner: "Sierra Leone", signed: "2026-02-02", status: "signed", url: NEWS + "uae-sierra-leone-enhance-economic-relations-through-comprehensive-economic-partnership-agreement" },
    { iso3: "COD", partner: "Democratic Republic of the Congo", signed: "2026-02-02", status: "signed", url: NEWS + "uae-democratic-republic-of-congo-strengthen-economic-ties-with-comprehensive-economic-partnership-agreement" },
    { iso3: "GAB", partner: "Gabon", signed: null, status: "signed", url: NEWS + "uae-and-gabon-sign-comprehensive-economic-partnership-agreement-to-deliver-a-new-era-of-bilateral-ties" },
    { iso3: "JPN", partner: "Japan", signed: null, status: "concluded", url: NEWS + "uae-japan-successfully-conclude-cepa-negotiations-to-strengthen-economic-ties" },
  ];
  for (const x of SUPPLEMENT) if (!cepas.some((c) => c.iso3 === x.iso3)) cepas.push({ ...x, inForce: null, due: null, source: "UAE Ministry of Foreign Trade (news item)" });
  for (const c of cepas) rec(c.iso3, c.partner).cepa = c;
  sources.cepa = { name: "UAE Ministry of Foreign Trade · CEPA pages", url: CEPA_INDEX, countries: cepas.length, items: cepas.length, note: "CEPAs with an official page, plus recent signings the Ministry announced. The Ministry reports more concluded than are individually documented (see summary)." };
}
// Official statements of the overall position (WAM / Ministry), shown as context beside the per-country list.
const SUMMARY = { signed: 37, inForce: 18, negotiating: 20, asOf: "2026-07-21", source: "UAE Minister of Foreign Trade, reported by WAM and The National", url: "https://www.thenationalnews.com/business/economy/2026/07/21/uae-set-to-conclude-up-to-seven-cepas-by-year-end-dr-thani-al-zeyoudi-says/" };

// ── guard: a site redesign must fail the run loudly, never overwrite good data with a thin scrape ──
const floors = [["MOFA countries", sources.mofa.countries, 150], ["MOFA items", sources.mofa.items, 1800], ["MoFT countries", sources.moft.countries, 120], ["CEPA pages", cepas.length, 15]];
const bad = floors.filter(([, n, min]) => n < min); if (bad.length) { console.error("REFUSING TO WRITE, below floor:", bad.map(([k, n, min]) => `${k} ${n} < ${min}`).join("; ")); process.exit(1); }

// ── write + sanity report ────────────────────────────────────────────────────
const byType = {}; for (const c of Object.values(out)) for (const a of [...c.mofa, ...c.moft]) byType[a.type] = (byType[a.type] ?? 0) + 1;
writeFileSync(new URL("../public/data/agreements.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), sources, cepaSummary: SUMMARY, countries: out }));
console.log("countries with data:", Object.keys(out).length); console.log("sources:", JSON.stringify(Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, `${v.countries} countries / ${v.items} items`]))));
console.log("types:", JSON.stringify(byType)); console.log("unmatched:", JSON.stringify(miss)); console.log("cepas:", cepas.map((c) => `${c.iso3} ${c.status} s:${c.signed} f:${c.inForce}`).join(" | "));
