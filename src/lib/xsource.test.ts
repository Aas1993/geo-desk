// Tests for deal corroboration and the tension-register evidence: the matching and counting rules, and both built data files.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mentions, specifics, matchDeal, isSyndicated, corroboration, inWindow, type DealRef, type DealsX } from "./corroboration";
import { tally, evidenceKey, type TensionEvidence } from "./tension-evidence";

const deal: DealRef = { u: "x1", d: "2026-10-26", t: "EDGE completes acquisition of CMD to build European propulsion hub in Italy", c: ["ITA"], by: ["EDGE"] };
const art = (title: string, date: string, summary = "") => ({ title, date, summary });

// naming a company
assert.equal(mentions("EDGE Group buys CMD", "EDGE"), true);
assert.equal(mentions("the cutting edge of design", "EDGE"), false, "a short all-capital name must match in capitals");
assert.equal(mentions("Abu Dhabi's AD Ports Group signs", "AD Ports"), true); assert.equal(mentions("Nothing here", "Masdar"), false);
assert.equal(mentions("DP World Tour title", "DP World"), true);

// what makes a deal specific: not the investor, not the country, not deal-speak
assert.deepEqual(specifics(deal, ["Italy"]).sort(), ["cmd", "european", "hub", "propulsion"]);

// matching an article to a deal
assert.equal(matchDeal(deal, art("EDGE closes CMD purchase, creating propulsion hub in Italy", "2026-10-27"), ["Italy"]).ok, true);
assert.equal(matchDeal(deal, art("EDGE unveils new drone at Dubai show", "2026-10-27"), ["Italy"]).ok, false, "naming the investor alone is not enough");
assert.equal(matchDeal(deal, art("Italy propulsion hub plan praised", "2026-10-27"), ["Italy"]).ok, false, "the investor must be named");
assert.equal(matchDeal(deal, art("EDGE closes CMD purchase, propulsion hub", "2026-11-20"), ["Italy"]).ok, false, "too long after the WAM item");
assert.equal(matchDeal(deal, art("EDGE closes CMD purchase, propulsion hub", "2026-10-20"), ["Italy"]).ok, false, "before the WAM item");
assert.equal(matchDeal(deal, art("EDGE buys CMD", "2026-10-26", "Deal gives it a propulsion hub"), ["Italy"]).ok, true, "the summary counts as text");
assert.equal(matchDeal(deal, art("EDGE buys a hub in Italy", "2026-10-26"), ["Italy"]).ok, true, "one shared specific plus the partner country is enough");
assert.equal(matchDeal(deal, art("EDGE buys a hub", "2026-10-26"), ["Italy"]).ok, false, "one shared specific without the country is not");

// a copy of the wire is not a second publisher
assert.equal(isSyndicated(deal.t, "EDGE completes acquisition of CMD to build European propulsion hub in Italy"), true);
assert.equal(isSyndicated(deal.t, "EDGE closes CMD purchase, creating propulsion hub in Italy"), false);
assert.equal(isSyndicated("Short title", "Short title"), false, "titles too short to judge are not called copies");

// counting publishers
assert.equal(corroboration(undefined).count, 1); assert.equal(corroboration(undefined).level, "single", "WAM alone is one publisher");
const h = (p: string, d: string, extra = {}) => ({ p, name: p, kind: "news" as const, url: `https://x/${p}`, title: "t", d, ...extra });
assert.equal(corroboration({ checked: ["a"], hits: [h("thenational", "2026-10-27")] }).level, "corroborated");
assert.equal(corroboration({ checked: [], hits: [h("thenational", "2026-10-27"), h("thenational", "2026-10-28")] }).count, 2, "one publisher counts once however many articles");
const sy = corroboration({ checked: [], hits: [h("web:copy.com", "2026-10-27", { syndicated: true })] }); assert.equal(sy.level, "single", "a syndicated copy does not corroborate"); assert.equal(sy.syndicated.length, 1);
assert.equal(corroboration({ checked: [], hits: [h("dfm:DEWA", "2026-10-27", { kind: "filing" }), h("arabnews", "2026-10-27")] }).count, 3, "a company filing counts as a publisher");

// which deals a feed could answer for
assert.equal(inWindow("2026-10-28", "2026-10-26", "2026-10-30"), true);
assert.equal(inWindow("2026-10-20", "2026-10-26", "2026-10-30"), false, "older than the feed's oldest item stays a gap");
assert.equal(inWindow("2026-10-26", "2026-10-26", "2026-10-30"), false, "the day before the item is needed too");
assert.equal(inWindow("2026-10-28", null, null), false);

// the built deals file
const deals = (JSON.parse(readFileSync(new URL("../../public/data/deals.json", import.meta.url), "utf8")) as { items: DealRef[] }).items; const ids = new Set(deals.map((x) => x.u));
const dx = JSON.parse(readFileSync(new URL("../../public/data/deals-xcheck.json", import.meta.url), "utf8")) as DealsX;
for (const s of Object.values(dx.sources)) { assert.ok(/^https:\/\//.test(s.url), `${s.id}: needs an https link`); assert.ok(s.name && s.publisher && s.basis, `${s.id}: unlabelled`); if (s.status === "ok") assert.ok(s.rows > 0, `${s.id}: ok but no rows`); }
for (const u of dx.unavailable) assert.ok(u.name && u.reason && /^https:\/\//.test(u.url), `unavailable source ${u.name} needs a reason and link`);
assert.ok(dx.unavailable.some((u) => /ADX/.test(u.name)), "ADX is listed as unavailable with the reason");
let hits = 0;
for (const [u, e] of Object.entries(dx.items)) {
  assert.ok(ids.has(u), `evidence for ${u}, which is not in deals.json`);
  for (const c of e.checked) assert.ok(dx.sources[c], `${u}: checked by unknown source ${c}`);
  for (const k of e.hits) { hits++; assert.ok(/^https:\/\//.test(k.url), `${u}: hit needs an https link`); assert.ok(k.title && k.name && /^\d{4}-\d{2}-\d{2}$/.test(k.d), `${u}: incomplete hit`); const lag = (Date.parse(k.d) - Date.parse(deals.find((x) => x.u === u)!.d)) / 86400e3; assert.ok(lag >= -1 && lag <= 7, `${u}: ${k.p} is ${lag} days from the deal`); }
  if (corroboration(e).level === "corroborated") assert.ok(e.hits.some((k) => !k.syndicated), `${u}: corroborated by copies only`);
}
assert.ok(Object.values(dx.items).filter((e) => e.checked.length).length >= 20, "some deals must have been checked by another source");
const corrob = deals.filter((d) => corroboration(dx.items[d.u]).level === "corroborated").length;

// the tension evidence
const te = JSON.parse(readFileSync(new URL("../../public/data/tension-evidence.json", import.meta.url), "utf8")) as TensionEvidence;
const reg = (JSON.parse(readFileSync(new URL("../../public/data/tension-register.json", import.meta.url), "utf8")) as { entries: { iso3: string; kind: string; sources: { url: string; label: string }[]; verified: boolean; asOf: string }[] }).entries;
const iso = new Set((JSON.parse(readFileSync(new URL("../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((c) => c.iso3));
for (const e of reg) {
  assert.ok(iso.has(e.iso3) && e.iso3 !== "ARE", `register: unknown country ${e.iso3}`); assert.ok(e.sources.length >= 1, `${e.iso3}: an entry needs at least one source`);
  for (const s of e.sources) assert.ok(/^https:\/\/[^/]+\/.+/.test(s.url) || /^https:\/\/www\.mofa\.gov\.ae\/en$/.test(s.url), `${e.iso3}: source ${s.label} needs a specific https link`);
  const ev = te.entries[evidenceKey(e.iso3, e.kind)]; assert.ok(ev, `${e.iso3}-${e.kind}: no evidence read`); assert.equal(ev.checks.length, e.sources.length, `${e.iso3}: every source is checked`);
  const t = tally(ev); assert.equal(t.found + t.missing + t.unread, t.total); assert.equal(t.missing, 0, `${e.iso3}: a source answered without the text the entry relies on`);
  assert.equal(e.verified, false, `${e.iso3}: only a named person may set verified, and none is recorded`);
}
assert.ok(reg.some((e) => e.iso3 === "DZA") && reg.some((e) => e.iso3 === "SDN") && reg.some((e) => e.iso3 === "IRN"));
assert.equal(tally(undefined).level, "unread"); assert.equal(tally({ checks: [{ label: "a", url: "u", status: 200, found: true, how: "page", at: "x" }, { label: "b", url: "v", status: 403, found: null, how: "page", at: "x" }] }).level, "partial");
for (const c of te.icj.cases) { assert.ok(/^https:\/\/www\.icj-cij\.org\/case\/\d+$/.test(c.url), `ICJ link ${c.url}`); assert.equal(c.status, 200); assert.ok(c.latest, `ICJ case ${c.id} has no dated development`); }
assert.ok(te.icj.cases.some((c) => c.id === "197" && c.outcome === "removed from the General List"), "the Sudan docket is read");
for (const [k, e] of Object.entries(te.entries)) for (const r of e.undl?.records ?? []) assert.ok(/^https:\/\/digitallibrary\.un\.org\/record\/\d+$/.test(r.url), `${k}: UN record link ${r.url}`);
assert.equal(te.tone.single, true); assert.ok(te.tone.unavailable.length >= 3 && te.tone.unavailable.every((u) => u.reason && /^https:\/\//.test(u.url)), "unreachable tone sources are listed with the reason");
console.log(`xsource: all assertions passed (${hits} deal hits, ${corrob} of ${deals.length} deals corroborated; ${reg.length} register entries read, ${te.icj.cases.length} ICJ dockets)`);
