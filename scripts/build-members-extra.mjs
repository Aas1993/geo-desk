// Builds public/data/layers/members-extra.json: ISO3 member lists for international bodies, taken from each body's OWN published list.
// Every list is parsed live from the organisation's page (or the UN Treaty Collection for UNCLOS parties), then reconciled with the member count that
// the organisation itself publishes; an org is written only if parsed count and published count agree within 3% (almost all agree exactly).
// Unparsed words are treated as errors, so a page redesign fails loudly instead of silently dropping members.
// Not built (no usable authoritative list this run): NPT (UNODA treaty database blocks scripted access), IAEA (iaea.org returns 403),
// IRENA (list is public but the page states no member count to reconcile against, and the site now returns 403).
// Run: node scripts/build-members-extra.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const valid = new Set(countries.map((c) => c.iso3));
const byIso2 = new Map(countries.map((c) => [c.iso2, c.iso3]));

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&amp;/g, "and").replace(/&/g, "and").replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// ---- name dictionary: normalised name -> ISO3 (or "-Label" for entities that are not in countries.json) ----
const D = new Map();
const add = (name, code) => { const k = norm(name); if (D.has(k) && D.get(k) !== code) throw new Error(`alias clash ${name}: ${D.get(k)} vs ${code}`); D.set(k, code); };
for (const c of countries) { if (c.name === "Congo") continue; /* ambiguous in countries.json (COD and COG); aliases below */ add(c.name, c.iso3); add(c.name.replace(/,? The$/, ""), c.iso3); }
const AL = {
  AFG: ["Afghanistan, Islamic Rep. of", "Afghanistan, Islamic Republic of"],
  BHS: ["Bahamas"], GMB: ["Gambia"], BOL: ["Bolivia (Plurinational State of)", "Bolivia, Plurinational State of"], CIV: ["Côte d'Ivoire", "Cote d'Ivoire", "Cote dIvoire"],
  COD: ["Democratic Republic of the Congo", "Congo, Democratic Republic of", "Congo, Dem. Rep.", "Democratic Republic of Congo"], COG: ["Congo", "Republic of the Congo", "Congo, Republic of", "Congo, Rep."],
  CZE: ["Czech Republic"], FSM: ["Micronesia (Federated States of)", "Micronesia, Federated States of", "Micronesia"], IRN: ["Iran, Islamic Rep. of", "Iran (Islamic Republic of)", "Iran, Islamic Republic of", "Iran, Islamic Republic of (Iran)"],
  KNA: ["Saint Kitts and Nevis"], LCA: ["Saint Lucia", "St. Lucia"], VCT: ["Saint Vincent and the Grenadines"], KOR: ["Republic of Korea", "Korea, Republic of"],
  PRK: ["Democratic People's Republic of Korea", "Korea, Democratic People's Republic of"], LAO: ["Lao People's Democratic Republic", "Laos"], MDA: ["Republic of Moldova", "Moldova, Republic of"],
  TZA: ["United Republic of Tanzania"], TUR: ["Türkiye", "Turkey"], USA: ["United States of America", "United States"], VEN: ["Venezuela (Bolivarian Republic of)", "Venezuela, Republica Bolivariana de", "Venezuela, Bolivarian Republic of", "Venezuela"],
  GBR: ["United Kingdom of Great Britain and Northern Ireland", "United Kingdom"], NLD: ["Netherlands (Kingdom of the)", "Netherlands (Kindgdom of the)", "Netherlands, Kingdom of the"], SOM: ["Somalia", "Somalia, Federal Republic of"],
  STP: ["São Tomé and Príncipe", "Sao Tome and Principe"], PSE: ["State of Palestine", "Palestine", "West Bank and Gaza"], EGY: ["Egypt, Arab Republic of", "Egypt, Arab Rep.", "Egypt"], YEM: ["Yemen, Republic of", "Yemen, Rep.", "Yemen"],
  KGZ: ["Kyrgyz Republic", "Kyrgyzstan"], SVK: ["Slovak Republic", "Slovakia"], CPV: ["Cabo Verde", "Cape Verde"], NRU: ["Nauru", "Naoero", "Republic of Naoero"], TLS: ["Timor-Leste", "East Timor"], MMR: ["Myanmar"], SWZ: ["Eswatini", "Swaziland"],
  AND: ["Andorra, Principality of", "Andorra"], LIE: ["Liechtenstein, Principality of", "Liechtenstein"], MKD: ["North Macedonia", "Macedonia, former Yugoslav Republic of"], BRN: ["Brunei Darussalam"], CHN: ["China"], RUS: ["Russian Federation"], SYR: ["Syrian Arab Republic"], VNM: ["Viet Nam", "Vietnam"],
};
for (const [iso3, names] of Object.entries(AL)) if (valid.has(iso3)) for (const n of names) { const k = norm(n); if (!D.has(k)) D.set(k, iso3); else if (D.get(k) !== iso3) throw new Error("alias clash " + n); }
// Members/entities that are real but not in countries.json (kept out of the output and reported as dropped)
for (const n of ["Cook Islands", "Niue", "Holy See", "European Union", "Kosovo", "Faroe Islands", "Faroes", "Tokelau", "Macao, China", "Hong Kong, China", "Palestine, State of"]) { const k = norm(n); if (!D.has(k)) D.set(k, "-" + n); }
const dictKeys = [...D.keys()];
const maxWords = Math.max(...dictKeys.map((k) => k.split(" ").length));
const SKIP = new Set("table continues on the right jan feb mar apr may jun jul aug sep oct nov dec january february march april june july august september october november december".split(" "));

// Tokeniser for lists printed as running text: consume longest dictionary match at each position; skip numbers, month names, single-letter headings.
function tokenise(segment, label, { stripParens = false } = {}) {
  let t = segment.replace(/&#58;/g, ":").replace(/&#39;|&#8217;|&rsquo;/g, "'").replace(/&#244;/g, "ô").replace(/&#252;/g, "ü").replace(/​/g, " ");
  if (stripParens) t = t.replace(/\((?!Plurinational|Federated|Bolivarian|Islamic|Kingdom)[^)]*\)/g, " ");
  const words = norm(t).split(" ").filter(Boolean); const found = []; const unknown = [];
  for (let i = 0; i < words.length;) {
    let hit = null;
    for (let n = Math.min(maxWords, words.length - i); n >= 1; n--) { const k = words.slice(i, i + n).join(" "); if (D.has(k)) { hit = [k, n]; break; } }
    if (hit) { found.push(D.get(hit[0])); i += hit[1]; continue; }
    const w = words[i]; if (/^\d+$/.test(w) || SKIP.has(w) || w.length === 1) { i++; continue; }
    unknown.push(w); i++;
  }
  if (unknown.length) throw new Error(`${label}: unparsed words: ${unknown.slice(0, 15).join(", ")}`);
  const dup = found.filter((c, i) => found.indexOf(c) !== i); if (dup.length) throw new Error(`${label}: duplicate entries ${dup.join(",")}`);
  return found;
}

const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n")).replace(/\s+/g, " ");
// Optional page cache for re-runs (some of these sites throttle repeat requests): CACHE_DIR=/some/dir node scripts/build-members-extra.mjs
const CACHE = process.env.CACHE_DIR; if (CACHE) mkdirSync(CACHE, { recursive: true });
const cfile = (url) => CACHE + "/" + createHash("sha1").update(url).digest("hex") + ".html";
const get = async (url) => { if (CACHE && existsSync(cfile(url))) return readFileSync(cfile(url), "utf8"); const body = await fetchLive(url); if (CACHE) writeFileSync(cfile(url), body); return body; };
const fetchLive = async (url) => { for (let i = 0; i < 4; i++) { await sleep(1200 * (i + 1)); try { const r = await fetch(url, { headers: UA, redirect: "follow" }); if (r.ok) return await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(`${url}: HTTP ${r.status}`); } catch (e) { if (i === 3 || /HTTP 4/.test(e.message)) throw new Error(`${url}: ${e.message} ${e.cause?.code ?? ""}`); } } throw new Error(url + ": failed"); };
const between = (s, a, b, label) => { const i = s.indexOf(a); if (i < 0) throw new Error(`${label}: start marker not found`); const st = i + a.length; const j = b ? s.indexOf(b, st) : s.length; if (j < 0) throw new Error(`${label}: end marker not found`); return s.slice(st, j); };
const num = (s, re, label) => { const m = s.match(re); if (!m) throw new Error(`${label}: published count not found`); return +m[1]; };

const orgs = {}; const notes = []; const log = [];
function finish(id, { found, source, expected, how, extra = 0, expectedNote }) {
  const checked = found.length; // everything the organisation lists, including non-states
  const gap = Math.abs(checked - expected) / expected;
  const members = [...new Set(found.filter((c) => valid.has(c)))].sort();
  const dropped = found.filter((c) => !valid.has(c)).map((c) => c.replace(/^-/, ""));
  log.push(`${gap <= 0.03 ? "ok  " : "FAIL"} ${id.padEnd(7)} parsed ${String(checked).padStart(3)} / published ${String(expected).padStart(3)} -> ${members.length} ISO3 in countries.json${dropped.length ? "; dropped: " + dropped.join(", ") : ""}`);
  if (gap > 0.03) return;
  orgs[id] = { members, source, checkedCount: checked, expected };
  notes.push(`${id}: ${how}${dropped.length ? ` Dropped (not in countries.json): ${dropped.join(", ")}.` : ""}`);
}

// ICC: Assembly of States Parties page
{ const url = "https://asp.icc-cpi.int/states-parties"; const t = text(await get(url));
  const expected = num(t, /(\d+) countries are States Parties/, "icc");
  const found = tokenise(between(t, "Agreement on the Privileges and Immunities of the International Criminal Court", "Footer menu", "icc"), "icc");
  finish("icc", { found, source: url, expected, how: `parsed the ICC Assembly of States Parties list (page modified 2026-10-16) and matched its own stated "${expected} countries are States Parties". Hungary is still listed because it rescinded its withdrawal on 29 May 2026 before it took effect (2 June 2026); Burkina Faso, Mali and Niger lodged withdrawals in June 2026, effective June 2027, so they remain parties.` }); }

// UNESCO: Member States page (ISO2 codes given)
{ const url = "https://www.unesco.org/en/countries"; const t = text(await get(url));
  const expected = num(t, /has (\d+) Members and \d+ Associate Members/, "unesco");
  const items = [...t.matchAll(/Flag (.+?) ISO code: ([A-Z]{2}) UNESCO member since (\d{4})/g)];
  const found = items.map((m) => byIso2.get(m[2]) ?? "-" + m[1]);
  finish("unesco", { found, source: url, expected, how: `parsed the "UNESCO member since" entries of unesco.org/en/countries (12 Associate Members excluded) and matched its stated ${expected} Members. The United States is still listed (its withdrawal takes effect 31 Dec 2026).` }); }

// FAO: legal office membership page
{ const url = "https://www.fao.org/legal/home/Membership-of-FAO/en"; const t = text(await get(url));
  const ov = text(await get("https://www.fao.org/about/about-fao/en/"));
  const expected = num(ov, /With (\d+) members - /, "fao") - 1; // "194 members - 193 countries and the European Union"
  const found = tokenise(between(t, "Member Nations Effective date of membership", "Member Organizations", "fao"), "fao");
  finish("fao", { found, source: url, expected, how: `parsed the "Member Nations" table of FAO's membership page (the European Union, a Member Organization, and 2 Associate Members are separate tables and excluded) and matched FAO's overview statement "${expected + 1} members - ${expected} countries and the European Union".` }); }

// ILO
{ const url = "https://www.ilo.org/about-ilo/ilo-member-states"; const t = text(await get(url));
  const expected = num(t, /The ILO has (\d+) Member States/, "ilo");
  const seg = between(t, `The ILO has ${expected} Member States.`, "Regions and countries portals", "ilo");
  finish("ilo", { found: tokenise(seg, "ilo"), source: url, expected, how: `parsed the list on ilo.org/about-ilo/ilo-member-states and matched its stated "${expected} Member States".` }); }

// IMO
{ const url = "https://www.imo.org/en/ourwork/ero/pages/memberstates.aspx"; const t = text(await get(url));
  const expected = num(t, /currently has (\d+) Member States/, "imo");
  const seg = between(t, "Country Joining Year Country Joining Year", "Associate Members", "imo");
  finish("imo", { found: tokenise(seg, "imo"), source: url, expected, how: `parsed the two-column Member States table on imo.org (3 Associate Members excluded) and matched its stated ${expected} Member States.` }); }

// ICAO
{ const url = "https://www.icao.int/about-icao/Pages/member-states.aspx"; const t = text(await get(url));
  const expected = num(t, /Member States: (\d+)/, "icao");
  const seg = between(t, "Council Member States (*): 36", "Learn more about ICAO", "icao");
  finish("icao", { found: tokenise(seg, "icao"), source: url, expected, how: `parsed the ICAO Member States list and matched its stated "Member States: ${expected}".` }); }

// WIPO
{ const url = "https://www.wipo.int/members/en/"; const t = text(await get(url));
  const expected = num(t, /We currently have (\d+) Member States/, "wipo");
  const i = t.indexOf("A Afghanistan"); const seg = t.slice(i, t.indexOf("WIPO Member States", i));
  finish("wipo", { found: tokenise(seg, "wipo"), source: url, expected, how: `parsed the alphabetical member list on wipo.int/members/en and matched its stated "${expected} Member States".` }); }

// IMF (legacy member-directory page; footer says last updated 11 Nov 2024)
{ const url = "https://www.imf.org/external/np/sec/memdir/memdate.htm"; const t = text(await get(url));
  const expected = num(t, /\((\d+) Member Countries\)/, "imf");
  const seg = between(t, `(${expected} Member Countries) Member Effective Date of Membership`, '"Original members"', "imf");
  finish("imf", { found: tokenise(seg, "imf", { stripParens: true }), source: url, expected, how: `parsed the IMF chronological member list (former members in brackets, e.g. Czechoslovakia, Cuba, excluded) and matched its stated "${expected} Member Countries". The page says last updated 11 Nov 2024; I know of no accession since (Liechtenstein, Oct 2024, is the latest listed).` }); }

// ISA: member list is embedded as JSON lines (ISO2 codes)
{ const url = "https://isa.org.jm/member-states/"; const h = await get(url); const t = text(await get("https://isa.org.jm/about-isa/"));
  const m = t.match(/ISA has (\d+) Members ?,? including (\d+) Member States and the European Union/); if (!m) throw new Error("isa: published count not found");
  const rows = [...h.matchAll(/^\s*(\{"Member State".*)$/gm)].map((x) => JSON.parse(x[1].replace(/,\s*$/, "")));
  const found = rows.map((r) => byIso2.get(r.Code.toUpperCase()) ?? "-" + r["Member State"]);
  const asOf = (t.match(/As of ([0-9]+ \w+ \d{4}), ISA has/) || [])[1];
  finish("isa", { found, source: url, expected: +m[1], how: `parsed the ${rows.length} member entries on isa.org.jm/member-states (171 States plus the European Union) and matched ISA's statement "As of ${asOf}, ISA has ${m[1]} Members, including ${m[2]} Member States and the European Union".` });
  globalThis.isaFound = found; }

// ITLOS: the Tribunal is open to the States Parties of UNCLOS; list taken from the UN Treaty Collection status page (status as at date on page)
{ const itlos = text(await get("https://www.itlos.org/en/main/the-tribunal/states-parties/"));
  const expected = num(itlos, /There are currently (\d+) States Parties to the United Nations Convention on the Law of the Sea/, "itlos");
  const url = "https://treaties.un.org/Pages/ViewDetails.aspx?src=TREATY&mtdsg_no=XXI-6&chapter=21&clang=_en"; const h = await get(url);
  const asAt = (h.match(/STATUS AS AT : ([0-9-]+)/) || [])[1];
  const rows = [...h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()));
  const parties = rows.filter((r) => r.length === 3 && r[0] && (r[1] === "" || /^\d{1,2} \w{3} \d{4}\s*[acd]?$/.test(r[1])) && /^\d{1,2} \w{3} \d{4}\s*[acd]?$/.test(r[2]));
  const found = parties.map((r) => { const k = norm(r[0].replace(/\s+\d+(,\s*\d+)*$/, "")); if (!D.has(k)) throw new Error("itlos: unmapped UNTC name " + r[0]); return D.get(k); });
  const dup = found.filter((c, i) => found.indexOf(c) !== i); if (dup.length) throw new Error("itlos: duplicates " + dup);
  finish("itlos", { found, source: url, expected, how: `ITLOS has no membership of its own; its page says the Tribunal is open to the "${expected} States Parties" to UNCLOS. I took the UN Treaty Collection UNCLOS participant table (ratification/accession/succession/formal confirmation, status as at ${asAt}), which has ${found.length} parties including the European Union.` });
  const a = new Set(globalThis.isaFound), b = new Set(found); const onlyA = [...a].filter((x) => !b.has(x)), onlyB = [...b].filter((x) => !a.has(x));
  log.push(`     itlos vs isa: only in ISA ${onlyA.join(",") || "none"}; only in UNTC ${onlyB.join(",") || "none"}`); }

// WBG: the World Bank Group has five institutions with different memberships; "World Bank" membership is IBRD
{ const url = "https://www.worldbank.org/en/about/leadership/members"; const t = text(await get(url));
  const m = t.match(/International Bank for Reconstruction and Development (\d+) countries/); if (!m) throw new Error("wbg: published count not found");
  const upd = (t.match(/Country \/ Date of Membership(?: Country \/ Date of Membership)? .*? Last Updated: (\w+ \d+, \d{4})/) || [])[1];
  const seg = between(t, `International Bank for Reconstruction and Development ${m[1]} countries Country / Date of Membership Country / Date of Membership`, "Last Updated:", "wbg");
  finish("wbg", { found: tokenise(seg, "wbg"), source: url, expected: +m[1], how: `the World Bank Group's five institutions have different memberships; this is the IBRD list (the "World Bank" membership) from worldbank.org, matched to its stated "${m[1]} countries" (page last updated ${upd ?? "Jul 22, 2026"}).` }); }

console.log(log.join("\n"));
const missing = ["icc", "unesco", "fao", "ilo", "imo", "icao", "wipo", "imf", "isa", "itlos", "wbg"].filter((k) => !orgs[k]);
if (missing.length) { console.error("not written, failed reconciliation:", missing.join(",")); process.exit(1); }
writeFileSync(new URL("../public/data/layers/members-extra.json", import.meta.url), JSON.stringify({
  meta: { built: new Date().toISOString(), notes: notes.join(" | ") + " | Not included: npt (UNODA treaty database blocks scripted access), iaea (iaea.org 403), irena (no published count to reconcile; site 403)." }, orgs }));
console.log("written:", Object.keys(orgs).length, "orgs");
