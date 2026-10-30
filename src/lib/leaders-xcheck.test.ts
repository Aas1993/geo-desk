// Tests for the leaders and elections second-source checks: the comparison rules, and the built data file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { officeOf, compareElections, electionChecks, personInText, officeCheck, type LeadersX } from "./leaders-xcheck";

// what an election is for
assert.equal(officeOf("President (2027)"), "presidential"); assert.equal(officeOf("Bulgarian Presidency"), "presidential");
assert.equal(officeOf("House of Representatives and Senate (2026)"), "legislative"); assert.equal(officeOf("Fijian Parliament"), "legislative");
assert.equal(officeOf("Federal Council (2026)"), "other", "an executive chosen by parliament is not a parliamentary election"); assert.equal(officeOf("Council of States and National Council (2027)"), "legislative");
assert.equal(officeOf("Guamanian Governor"), "other"); assert.equal(officeOf("Mayor of Paris"), "other");

// date agreement: same month agrees, within three months is close, further is a difference; one source cannot be checked
const T = "2026-10-30";
const r = (s: "wiki" | "ipu" | "ifes", date: string) => ({ s, date, label: "x" });
assert.equal(compareElections([], "legislative", T).verdict, "none");
assert.equal(compareElections([r("ipu", "2027-10-31")], "legislative", T).verdict, "single");
assert.equal(compareElections([r("ipu", "2027-10-31"), r("wiki", "2027-10-12")], "legislative", T).verdict, "agree", "the IPU stores a month as its last day, so only the month is compared");
assert.equal(compareElections([r("ipu", "2027-10-31"), r("wiki", "2027-12-12")], "legislative", T).verdict, "close");
const d = compareElections([r("ipu", "2027-10-31"), r("wiki", "2028-06-12")], "legislative", T); assert.equal(d.verdict, "differ"); assert.equal(d.spreadMonths, 8);
const st = compareElections([r("ipu", "2026-04-30"), r("wiki", "2027-01-30")], "legislative", T); assert.equal(st.verdict, "single", "an expected date that has passed is not compared"); assert.equal(st.stale.length, 1);
assert.equal(compareElections([r("ipu", "2027-03-31"), r("ipu", "2029-03-31"), r("wiki", "2027-03-02")], "legislative", T).readings.filter((x) => x.s === "ipu").length, 1, "one reading per source");

// per country: legislative against legislative, presidential against presidential, never across
const x = { ipu: [{ ch: "LC01", next: "2027-10-31", last: "2023-10-07", term: 4, url: "https://data.ipu.org/parliament/XX/" }, { ch: "UC01", next: "2029-01-31", last: "2025-01-01", term: 6, url: "u" }], ifes: [{ label: "Xland Presidency", date: "2027-04-18", mark: "t" as const, url: "https://www.electionguide.org/elections/id/1/" }] };
const ch = electionChecks(x, [{ label: "President (2027)", date: "2027-04-18", approx: false }, { label: "Parliament (2027)", date: "2027-10-00", approx: true }], T);
assert.equal(ch.length, 2); const leg = ch.find((c) => c.office === "legislative")!, pres = ch.find((c) => c.office === "presidential")!;
assert.equal(leg.verdict, "agree"); assert.equal(leg.readings.length, 2, "the upper chamber is left out where a lower chamber exists");
assert.equal(pres.verdict, "agree"); assert.ok(pres.readings.some((q) => q.tentative), "an unconfirmed IFES date is marked");
assert.deepEqual(electionChecks(undefined, [{ label: "Governor", date: "2027-01-01", approx: false }], T), [], "offices that are not compared produce no check");

// who holds office
assert.equal(personInText("Frank-Walter Steinmeier", "President Frank-Walter STEINMEIER (since 19 March 2017)"), true);
assert.equal(personInText("Mohamed bin Zayed Al Nahyan", "President MUHAMMAD BIN ZAYID Al Nuhayyan (since 14 May 2022)"), true, "a transliteration slip is tolerated");
assert.equal(personInText("Friedrich Merz", "Chancellor Olaf SCHOLZ (since 8 December 2021)"), false, "a different person is a difference");
assert.equal(personInText("Jo Li", "President Jo LI"), false, "names with no part of four letters cannot be matched, and are not reported as a match");
assert.equal(officeCheck(undefined, "President X"), "none"); assert.equal(officeCheck("Anna Berg", undefined), "none"); assert.equal(officeCheck("Anna Berg", "President Anna BERG"), "match"); assert.equal(officeCheck("Anna Berg", "President Carl OTTO"), "differ");

// the built file
const f = JSON.parse(readFileSync(new URL("../../public/data/leaders-xcheck.json", import.meta.url), "utf8")) as LeadersX;
const leaders = JSON.parse(readFileSync(new URL("../../public/data/leaders.json", import.meta.url), "utf8")) as { countries: Record<string, { state?: { name: string }; gov?: { name: string }; elections?: { label: string; date: string; approx: boolean }[] }> };
const iso = new Set((JSON.parse(readFileSync(new URL("../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((c) => c.iso3));
for (const s of Object.values(f.sources)) { assert.ok(/^https:\/\//.test(s.url), `${s.id}: needs an https link`); assert.ok(s.name && s.publisher && s.basis, `${s.id}: unlabelled`); if (s.status === "ok") assert.ok(s.rows > 0, `${s.id}: ok but no rows`); }
for (const u of f.unavailable) assert.ok(u.name && u.reason && /^https:\/\//.test(u.url), `unavailable source ${u.name} needs a reason and link`);
assert.ok(f.unavailable.length >= 3, "unreachable and keyed sources are listed with the reason");
for (const [k, v] of Object.entries(f.countries)) {
  assert.ok(iso.has(k), `unknown country ${k}`);
  for (const i of v.ipu ?? []) { assert.match(i.next, /^\d{4}-\d{2}-\d{2}$/); assert.ok(+i.next.slice(0, 4) >= 2000 && +i.next.slice(0, 4) <= 2060, `${k}: IPU date ${i.next}`); assert.ok(/^https:\/\//.test(i.url)); }
  for (const i of v.ifes ?? []) { assert.match(i.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(/^https:\/\/www\.electionguide\.org\/elections\/id\/\d+\/$/.test(i.url), `${k}: IFES link ${i.url}`); assert.ok(i.mark === "d" || i.mark === "t"); }
  for (const t of Object.values(v.cia ?? {})) assert.ok(!/&[a-z]+;/i.test(t), `${k}: HTML entity left in the Factbook text`);
}
assert.ok(Object.values(f.countries).filter((c) => c.ipu).length >= 150, "IPU should cover at least 150 countries");
assert.ok(f.sources.cia?.snapshot, "the frozen Factbook snapshot carries its date");
// a country with a figure in the headline file and in the second source is comparable; count the disagreements so a bad parse shows up as an extreme rate
let compared = 0, differ = 0; const today = new Date().toISOString().slice(0, 10);
for (const [k, v] of Object.entries(f.countries)) for (const c of electionChecks(v, leaders.countries[k]?.elections, today)) if (c.verdict !== "none" && c.verdict !== "single") { compared++; if (c.verdict === "differ") differ++; }
assert.ok(compared >= 20, `only ${compared} elections could be cross-checked`); assert.ok(differ / compared < 0.5, `${differ} of ${compared} election dates differ: the matching is probably broken`);
let named = 0, miss = 0;
for (const [k, l] of Object.entries(leaders.countries)) for (const [role, text] of [["state", f.countries[k]?.cia?.state], ["gov", f.countries[k]?.cia?.gov]] as const) { const v = officeCheck(l[role]?.name, text); if (v !== "none") { named++; if (v === "differ") miss++; } }
assert.ok(named >= 250, `only ${named} office-holders could be cross-checked`); assert.ok(miss / named < 0.4, `${miss} of ${named} office-holders differ: the name matching is probably broken`);
console.log(`leaders-xcheck: all assertions passed (${compared} election dates compared, ${differ} differ; ${named} office-holders compared, ${miss} differ)`);
