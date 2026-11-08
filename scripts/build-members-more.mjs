// Builds public/data/layers/members-more.json: ISO3 member lists for NPT, IAEA and ECOSOC (the bodies whose own sites block scripted access or have no
// machine-readable list, so members-extra.json could not cover them). Same rules as build-members-extra.mjs: parse an authoritative public list,
// reconcile with a count that an authoritative page states for the same date, fail loudly on any mismatch, and keep only ISO3 codes in countries.json.
//
// Sources (nothing here evades a block; every request is a plain GET with an honest User-Agent, one at a time):
//   NPT    English Wikipedia "List of parties to the Treaty on the Non-Proliferation of Nuclear Weapons" (its table is compiled from the UNODA treaty database,
//          which sits behind an AWS WAF challenge and is NOT fetched). Expected count = the infobox of the main NPT article ("191 (according to the United Nations)",
//          citing UNODA). Cross-checked exactly against UN membership (orgs.json "unga"): 193 UN members - India, Israel, Pakistan, South Sudan + Holy See + Palestine.
//   IAEA   English Wikipedia "Member states of the International Atomic Energy Agency" (iaea.org returns 403). Expected count = the page's dated lead ("As of September 2026,
//          the IAEA has 182 member states"), which must agree with the infobox of the main IAEA article. Cross-checked exactly against UN membership (orgs.json "unga"):
//          members + the 12 UN states with no IAEA relationship + North Korea (withdrew 1994) = UN members + Holy See + Cook Islands.
//   ECOSOC The UN Dag Hammarskjold Library research guide "ECOSOC Membership by Year" (un.org itself is 403 for scripts; the guide is a public UN page and is
//          reachable normally): the row for 2026, whose count must equal the 54 seats of UN Charter Art. 61 as the page states. Cross-checked exactly against the
//          "Current members" table of English Wikipedia (annotated mid-term swaps applied: e.g. Italy (2025) and Liechtenstein (2024-2025) left, US and Germany joined for 2026).
//   IRENA  NOT BUILT: irena.org returns 403, English Wikipedia has no member list (only "169 states and the EU (2025)" and "168 states and the EU, July 2022"), and Wikidata
//          holds only a handful of membership statements. No list exists that can be reconciled to a count for the same date, so it is omitted rather than guessed.
// Wikipedia text is CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); the output links the exact revisions used.
// Run: node scripts/build-members-more.mjs
import { readFileSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const valid = new Set(countries.map((c) => c.iso3));
const unga = new Set(JSON.parse(readFileSync(new URL("../public/data/orgs.json", import.meta.url), "utf8")).orgs.unga); // read-only cross-check: the 193 UN members

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&amp;/g, "and").replace(/&/g, "and").replace(/['’`]/g, "").replace(/\s*\(country\)\s*/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

// ---- name dictionary: normalised name -> ISO3 (or "-Label" for entities that are not in countries.json) ----
const D = new Map();
const add = (name, code) => { const k = norm(name); if (D.has(k) && D.get(k) !== code) throw new Error(`alias clash ${name}: ${D.get(k)} vs ${code}`); D.set(k, code); };
for (const c of countries) { if (c.name === "Congo") continue; /* ambiguous in countries.json (COD and COG); aliases below */ add(c.name, c.iso3); add(c.name.replace(/,? The$/, ""), c.iso3); }
const AL = {
  AFG: ["Afghanistan, Islamic Rep. of"], BHS: ["Bahamas", "The Bahamas"], GMB: ["Gambia", "The Gambia"], BOL: ["Bolivia (Plurinational State of)", "Bolivia, Plurinational State of"], CIV: ["Côte d'Ivoire", "Cote d'Ivoire", "Cote dIvoire", "Ivory Coast"],
  COD: ["Democratic Republic of the Congo", "Congo, Democratic Republic of", "Democratic Republic of Congo"], COG: ["Congo", "Republic of the Congo", "Congo, Republic of"],
  CZE: ["Czech Republic", "Czechia"], FSM: ["Micronesia (Federated States of)", "Federated States of Micronesia", "Micronesia"], IRN: ["Iran (Islamic Republic of)", "Iran, Islamic Republic of"],
  KNA: ["Saint Kitts and Nevis"], LCA: ["Saint Lucia"], VCT: ["Saint Vincent and the Grenadines"], KOR: ["Republic of Korea", "South Korea"],
  PRK: ["Democratic People's Republic of Korea", "North Korea"], LAO: ["Lao People's Democratic Republic", "Laos"], MDA: ["Republic of Moldova", "Moldova"],
  TZA: ["United Republic of Tanzania", "Tanzania"], TUR: ["Türkiye", "Turkey"], USA: ["United States of America", "United States"], VEN: ["Venezuela (Bolivarian Republic of)", "Venezuela"],
  GBR: ["United Kingdom of Great Britain and Northern Ireland", "United Kingdom"], NLD: ["Netherlands (Kingdom of the)", "Netherlands"], SOM: ["Somalia"],
  STP: ["São Tomé and Príncipe", "Sao Tome and Principe"], PSE: ["State of Palestine", "Palestine"], EGY: ["Egypt"], YEM: ["Yemen"],
  KGZ: ["Kyrgyz Republic", "Kyrgyzstan"], SVK: ["Slovak Republic", "Slovakia"], CPV: ["Cabo Verde", "Cape Verde"], NRU: ["Nauru"], TLS: ["Timor-Leste", "East Timor"], MMR: ["Myanmar", "Burma"], SWZ: ["Eswatini", "Swaziland"],
  MKD: ["North Macedonia"], BRN: ["Brunei Darussalam", "Brunei"], CHN: ["China"], RUS: ["Russian Federation", "Russia"], SYR: ["Syrian Arab Republic", "Syria"], VNM: ["Viet Nam", "Vietnam"],
  GEO: ["Georgia"],
};
for (const [iso3, names] of Object.entries(AL)) if (valid.has(iso3)) for (const n of names) { const k = norm(n); if (!D.has(k)) D.set(k, iso3); else if (D.get(k) !== iso3) throw new Error("alias clash " + n); }
// Real members/parties that are not in countries.json (kept out of the output and reported as dropped)
for (const n of ["Cook Islands", "Niue", "Holy See", "European Union", "Kosovo"]) { const k = norm(n); if (!D.has(k)) D.set(k, "-" + n); }
const lookup = (name, label) => { const k = norm(name); if (!D.has(k)) throw new Error(`${label}: unmapped name "${name}"`); return D.get(k); };
const noDup = (arr, label) => { const dup = arr.filter((c, i) => arr.indexOf(c) !== i); if (dup.length) throw new Error(`${label}: duplicate entries ${dup.join(",")}`); return arr; };

// ---- fetching ----
const getJson = async (url) => { await sleep(1500); const r = await fetch(url, { headers: UA, redirect: "follow" }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };
async function wikipedia(title) { // wikitext + exact revision id/timestamp, via the MediaWiki API
  const u = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ action: "query", prop: "revisions", rvprop: "ids|timestamp|content", rvslots: "main", titles: title, redirects: "1", format: "json", formatversion: "2" });
  const j = await getJson(u); const p = j.query?.pages?.[0]; const rev = p?.revisions?.[0];
  if (!rev) throw new Error(`wikipedia: no revision for ${title}`);
  return { title: p.title, revid: rev.revid, ts: rev.timestamp, wt: rev.slots.main.content, url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(p.title.replace(/ /g, "_"))}&oldid=${rev.revid}` };
}
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/&([a-z])(?:uml|circ|acute|grave|tilde|cedil);/gi, (_, c) => ({ u: "ü", o: "ô", e: "é", a: "á", i: "í", c: "ç", n: "ñ" }[c.toLowerCase()] ?? c)).replace(/&rsquo;|&#39;/g, "'");
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n")).replace(/\s+/g, " ");
const flagName = (cell) => { const m = cell.match(/\{\{\s*flag(?:country|icon)?\s*\|\s*([^}|]+)/i); return m ? m[1].trim() : null; };
// First cell of every row of the wikitable that starts at/after `from` and ends at `until`
function tableRows(wt, from, until, label) {
  const a = wt.indexOf("{|", from); const b = wt.indexOf(until, a); if (a < 0 || b < 0) throw new Error(`${label}: table markers not found`);
  const names = [];
  for (const row of wt.slice(a, b).split(/\n\|-/).slice(1)) { const first = row.split("\n").map((l) => l.trim()).find((l) => l.startsWith("|") && !l.startsWith("|}")); const n = first && flagName(first); if (n) names.push(n); }
  return names;
}

const orgs = {}; const notes = []; const log = []; const fail = [];
const sameSet = (a, b) => ({ onlyA: [...a].filter((x) => !b.has(x)).sort(), onlyB: [...b].filter((x) => !a.has(x)).sort() });
function finish(id, { found, source, expected, asOf, how, crossOk, crossNote }) {
  const checked = found.length; const members = [...new Set(found.filter((c) => valid.has(c)))].sort(); const dropped = found.filter((c) => !valid.has(c)).map((c) => c.replace(/^-/, ""));
  const ok = checked === expected && crossOk;
  log.push(`${ok ? "ok  " : "FAIL"} ${id.padEnd(6)} parsed ${checked} / expected ${expected} -> ${members.length} ISO3 in countries.json${dropped.length ? "; dropped: " + dropped.join(", ") : ""}; cross-check: ${crossNote}`);
  if (!ok) { fail.push(id); return; }
  orgs[id] = { members, source, checkedCount: checked, expected, asOf, dropped };
  notes.push(`${id}: ${how}${dropped.length ? ` Dropped (not in countries.json): ${dropped.join(", ")}.` : ""}`);
}

// ---------------- NPT ----------------
{
  const list = await wikipedia("List of parties to the Treaty on the Non-Proliferation of Nuclear Weapons");
  const main = await wikipedia("Treaty on the Non-Proliferation of Nuclear Weapons");
  const expected = +(main.wt.match(/\|\s*parties\s*=\s*(\d+) \(according to the \[\[United Nations\]\]/) ?? [])[1]; if (!expected) throw new Error("npt: published count not found in infobox");
  const lede = list.wt.match(/(\d+) \[\[UN member states\]\] as well as two \[\[[^\]]*\]\]s?, namely the \[\[Holy See\]\] and the \[\[State of Palestine\]\]/); if (!lede) throw new Error("npt: list lede (UN members + Holy See + Palestine) not found");
  const table = tableRows(list.wt, list.wt.indexOf("==Ratified or acceded states=="), "\n==Partially recognized", "npt").map((n) => lookup(n, "npt"));
  // North Korea is not in the main table: it sits in the separate "Withdrawn state" table, but the UN count of 191 still includes it (see notes)
  const wd = tableRows(list.wt, list.wt.indexOf("==Withdrawn state=="), "\n==Other states==", "npt-withdrawn").map((n) => lookup(n, "npt"));
  if (wd.length !== 1 || wd[0] !== "PRK") throw new Error("npt: withdrawn-state table is no longer just North Korea: " + wd);
  const found = noDup([...table, ...wd], "npt");
  // independent check: every UN member except the four that never signed, plus the two observers that are parties
  const never = new Set(["IND", "ISR", "PAK", "SSD"]); const derived = new Set([...unga].filter((c) => !never.has(c))); derived.add("-Holy See"); derived.add("PSE");
  const d = sameSet(new Set(found), derived); const ok = d.onlyA.length === 0 && d.onlyB.length === 0 && +lede[1] === expected - 2;
  finish("npt", { found, expected, crossOk: ok, crossNote: `list vs (193 UN members - IND, ISR, PAK, SSD + Holy See + Palestine): only in list [${d.onlyA}], only in UN-derived [${d.onlyB}]; lede says ${lede[1]} UN members + 2 observers`,
    source: `${list.url} ; ${main.url}`, asOf: `status per English Wikipedia revisions of ${list.ts.slice(0, 10)} (list) and ${main.ts.slice(0, 10)} (infobox, citing the UNODA treaty database, accessed 2025-11-01); built ${new Date().toISOString().slice(0, 10)}`,
    how: `parsed the main table of the English Wikipedia "List of parties to the NPT" (rev ${list.revid}, ${list.ts.slice(0, 10)}; compiled from the UNODA/depositary records; ${table.length} states) plus North Korea from its separate "Withdrawn state" table (${found.length} in all), and matched the "${expected} (according to the United Nations)" in the infobox of the main NPT article (rev ${main.revid}); the list is exactly the 193 UN members minus India, Israel, Pakistan and South Sudan (never signed) plus the observers Holy See and Palestine. North Korea is INCLUDED because the UN/UNODA count of ${expected} still counts it (it announced withdrawal in 2003; whether that was valid is disputed, the de facto count is ${expected - 1}); drop PRK if you prefer the de facto view. Taiwan (ROC ratified 1970, now abides) is outside the ${expected} and not in countries.json. Cook Islands and Niue are not parties (they consider themselves bound through New Zealand). No Article X withdrawal notice by any other state (Iran has only threatened, 2025-2026) is recorded on the list as of its latest revision. NPT source licence: CC BY-SA 4.0 (English Wikipedia).` });
}

// ---------------- IAEA ----------------
{
  const page = await wikipedia("Member states of the International Atomic Energy Agency");
  const main = await wikipedia("International Atomic Energy Agency");
  const lead = page.wt.match(/As of (\w+ \d{4}), the IAEA has (\d+) member states/); if (!lead) throw new Error("iaea: dated count not found in list lead");
  const expected = +lead[2]; const infobox = +(main.wt.match(/num_members\s*=\s*\[\[Member states of the International Atomic Energy Agency\|(\d+) member states\]\]/) ?? [])[1];
  if (infobox !== expected) throw new Error(`iaea: lead says ${expected} but main article infobox says ${infobox}`);
  const base = page.wt.indexOf("==List of member states=="); const non = page.wt.indexOf("==Non-member states==");
  const rows = []; { const a = page.wt.indexOf("{|", base); const b = page.wt.indexOf("|}", a); for (const row of page.wt.slice(a, b).split(/\n\|-/).slice(1)) { const ls = row.split("\n").map((l) => l.trim()).filter(Boolean); const n = flagName(ls[0] ?? ""); if (n) rows.push({ n, date: (ls[1] ?? "").match(/\|\s*\{\{dts\|[^|]*\|(\d{4})\|(\w+)\|(\d+)/) }); } }
  const found = noDup(rows.map((r) => lookup(r.n, "iaea")), "iaea");
  const otherSeg = page.wt.slice(page.wt.indexOf("===Other states==="));
  const otherNames = [...otherSeg.slice(0, otherSeg.indexOf(";Notes")).matchAll(/^\* \{\{flag\|([^}|]+)/gm)].map((m) => lookup(m[1], "iaea-other"));
  const formerSeg = page.wt.slice(page.wt.indexOf("===Former member state==="), page.wt.indexOf("===Observer state==="));
  const former = [lookup("North Korea", "iaea")]; if (!/\{\{flag\|North Korea\}\}/.test(formerSeg)) throw new Error("iaea: North Korea no longer in the former-member table, re-check");
  // independent check: members + 12 states without relationship + North Korea (withdrew 1994) = UN members + Holy See + Cook Islands
  const universe = new Set([...unga, "-Holy See", "-Cook Islands"]); const accounted = new Set([...found, ...otherNames, ...former]);
  const d = sameSet(accounted, universe); const ok = d.onlyA.length === 0 && d.onlyB.length === 0 && otherNames.length === 12;
  const recent = rows.filter((r) => r.date && +r.date[1] >= 2024).map((r) => `${r.n} (${r.date[3]} ${r.date[2]} ${r.date[1]})`);
  finish("iaea", { found, expected, crossOk: ok, crossNote: `members + ${otherNames.length} no-relationship states + PRK vs (193 UN + Holy See + Cook Islands): only in list-side [${d.onlyA}], only in UN-derived [${d.onlyB}]`,
    source: `${page.url} ; ${main.url}`, asOf: `${lead[1]} (English Wikipedia revision ${page.ts.slice(0, 10)}); includes Timor-Leste, whose instrument was deposited 21 Sep 2026`,
    how: `parsed the member table of the English Wikipedia "Member states of the IAEA" (rev ${page.revid}, ${page.ts.slice(0, 10)}) and matched its dated lead "As of ${lead[1]}, the IAEA has ${expected} member states" (same ${infobox} in the infobox of the main IAEA article); iaea.org is 403 to scripts so the organisation's own page was not read. The ${expected} include the Holy See and the Cook Islands (both full IAEA members; neither is in countries.json); the observer State of Palestine is not counted. Accounting is exact: the ${found.length} members + the ${otherNames.length} UN members with no IAEA relationship + North Korea (withdrew 1994) = the 193 UN members + Holy See + Cook Islands. Recent accessions on the list: ${recent.join(", ") || "none since 2024"}. Caveat: the ${expected}nd member (Timor-Leste, deposit 21 Sep 2026) rests on the US State Department depositary notification 2026-040 (30 Sep 2026) cited by Wikipedia; the IAEA's own member list had not yet been updated for it, and I could not fetch either document (403), so without it the figure would be ${expected - 1}. IAEA source licence: CC BY-SA 4.0 (English Wikipedia).` });
}

// ---------------- ECOSOC ----------------
{
  const url = "https://research.un.org/en/unmembers/ecosocmembers"; await sleep(1500);
  const r = await fetch(url, { headers: UA, redirect: "follow" }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = text(await r.text());
  const expected = +(t.match(/The Economic and Social Council has (\d+) members/) ?? [])[1]; if (!expected) throw new Error("ecosoc: published count not found");
  const upd = (t.match(/Last Updated (\w+ \d+, \d{4})/) ?? [])[1];
  const sec = t.slice(t.indexOf("Members of the Economic and Social Council by year"));
  const row = sec.match(/ 2026 ([A-Z][^]*?) A\/\d+\/PV\.\d+/); if (!row) throw new Error("ecosoc: row for 2026 not found");
  const found = noDup(row[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean).map((n) => lookup(n, "ecosoc")), "ecosoc");
  // independent check: Wikipedia "Current members" table, with annotated terms applied for 2026 (e.g. "Italy (2025)" has left, "United States (2026-2027)" is in)
  const wp = await wikipedia("United Nations Economic and Social Council");
  const tb = wp.wt.slice(wp.wt.indexOf("=== Current members ==="), wp.wt.indexOf("=== Observer Inter-Governmental"));
  const cells = tb.split("\n").filter((l) => l.startsWith("| {{flag")); const wpNames = [];
  for (const cell of cells) for (const part of cell.split(/<br\s*\/?>/i)) { const n = flagName(part); if (!n) continue; const yrs = part.match(/<small>\((\d{4})(?:[–-](\d{4}))?\)<\/small>/); if (yrs) { const from = +yrs[1], to = +(yrs[2] ?? yrs[1]); if (!(from <= 2026 && 2026 <= to)) continue; } wpNames.push(lookup(n, "ecosoc-wp")); }
  const d = sameSet(new Set(found), new Set(wpNames)); const ok = d.onlyA.length === 0 && d.onlyB.length === 0 && wpNames.length === expected && /consists of 54 Member States/.test(wp.wt);
  finish("ecosoc", { found, expected, crossOk: ok, crossNote: `UN row vs Wikipedia current-members table (${wpNames.length} after term annotations): only in UN [${d.onlyA}], only in Wikipedia [${d.onlyB}]`,
    source: `${url} ; ${wp.url}`, asOf: `2026 membership year (UN Dag Hammarskjold Library guide last updated ${upd}; cross-checked with English Wikipedia revision ${wp.ts.slice(0, 10)})`,
    how: `parsed the 2026 row of the UN Dag Hammarskjold Library research guide "ECOSOC Membership by Year" (last updated ${upd}), whose page states the Council "has ${expected} members" (UN Charter Art. 61); un.org/ecosoc is 403 to scripts. It matches exactly the Wikipedia "Current members" table (rev ${wp.revid}) once the annotated mid-term swaps are applied: Italy (2025) and Liechtenstein (2024-2025) are gone, the United States (2026-2027) and Germany (2026) are in. Members elected in June 2026 for terms from 1 Jan 2027 are not current and not included. Wikipedia cross-check licence: CC BY-SA 4.0.` });
}

console.log(log.join("\n"));
if (fail.length) { console.error("not written, failed reconciliation:", fail.join(",")); process.exit(1); }
writeFileSync(new URL("../public/data/layers/members-more.json", import.meta.url), JSON.stringify({
  meta: { built: new Date().toISOString(), notes: notes.join(" | ") + " | Not included: irena (irena.org is 403 to scripts; English Wikipedia has no member list and states only \"169 states and the EU (2025)\" / \"168 states and the EU as of July 2022\"; Wikidata has about 7 membership statements, so no list exists that reconciles to a count for the same date; the US announced withdrawal in January 2026, effective date unconfirmed). | Attribution: lists for npt and iaea are taken from English Wikipedia (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/; contributors listed in each page history at the linked revisions); ecosoc is taken from the UN Dag Hammarskjold Library guide and cross-checked with English Wikipedia." }, orgs }));
console.log("written:", Object.keys(orgs).length, "orgs");
