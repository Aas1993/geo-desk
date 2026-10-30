// Tests for the Country Updates Hub model: tone marks, merging the angle reads, dated and on-file items, filters and counts, what changed since the last visit.
import assert from "node:assert/strict";
import { DEFAULT_FILTER, alertItems, angleCounts, buildItems, dealItems, filterItems, groupByDay, itemClip, macroItems, newsItems, newSince, onFileItems, outletCounts, snapshotSeen, summaryText, toneOf, undated, visitItems, type HubItem } from "./hub/model";
import { readFileSync } from "node:fs";
import { outlineFor } from "./hub/outline";
import type { CaseData } from "./case/load";
import type { Alert } from "./alerts";

const NOW = Date.parse("2026-10-30T12:00:00Z"); const d = (n: number) => NOW - n * 86_400_000;
// tone marks: risk words, opportunity words, both = neutral, none = neutral
assert.equal(toneOf("Jordan and UAE sign investment agreement").tone, "opportunity"); assert.deepEqual(toneOf("Jordan and UAE sign investment agreement").why.sort(), ["agreement", "investment", "sign"].sort());
assert.equal(toneOf("Border clash kills three").tone, "risk"); assert.equal(toneOf("Deal signed despite protests").tone, "neutral", "mixed signals are neutral, not scored"); assert.deepEqual(toneOf("Cabinet meets on Tuesday"), { tone: "neutral", why: [] });
// news: one item per headline, carrying every angle that returned it
const n = newsItems([{ angle: "economy", items: [{ outlet: "Reuters", title: "Jordan raises budget deficit target", link: "https://r.com/1", ts: d(1) }, { outlet: "AP", title: "Bad row", link: "x", ts: 0 }] }, { angle: "political", items: [{ outlet: "Reuters", title: "Jordan raises budget deficit target!", link: "https://r.com/1", ts: d(1) }] }, { angle: "uae", items: [{ outlet: "WAM", title: "UAE and Jordan sign MoU", link: "javascript:1", ts: d(2) }] }]);
assert.equal(n.length, 2); assert.deepEqual(n[0].angles, ["economy", "political"]); assert.equal(n[1].url, undefined, "a non-http link is dropped"); assert.equal(n[0].tone, "risk");
// visits and deals are dated; alerts match by country name in the title only
const visits = visitItems([{ u: "abc", d: "2026-10-28", t: "Crown Prince receives Jordan's King", c: ["JOR"], k: "meeting", l: 3, dir: "in" }, { u: "zzz", d: "2026-10-27", t: "Other", c: ["EGY"], k: "call", l: 1, dir: null }], "JOR"); assert.equal(visits.length, 1); assert.equal(visits[0].url, "https://www.wam.ae/en/article/abc"); assert.equal(visits[0].level, 3); assert.ok(visits[0].meta!.includes("incoming"));
const deals = dealItems([{ d: "2026-10-20", t: "Masdar to build solar plant in Jordan", by: ["Masdar"], sector: "energy", u: "q1" }]); assert.equal(deals[0].meta, "energy · Masdar"); assert.deepEqual(deals[0].angles, ["deals", "economy"]);
const al = (id: string, title: string, sev: 0 | 1 | 2 | 3): Alert => ({ id, cat: "security", kind: "news", t: d(1), title, sev, src: "Wire", uae: false, security: true });
const alerts = alertItems([al("1", "Jordan border crossing closed after clashes", 2), al("2", "Jordanian dinar steady", 1), al("3", "Hungary protests continue", 2), al("4", "Strike near Amman", 3)], ["Jordan", "الأردن"]); assert.equal(alerts.length, 1, "name match is on whole words: 'Jordanian' is not 'Jordan', and a title that does not name the country is not matched"); assert.ok(alerts.every((x) => x.angles.includes("alerts") && x.angles.includes("security")));
assert.equal(alertItems([al("5", "الأردن تعلن حالة التأهب", 2)], ["Jordan", "الأردن"]).length, 1, "the Arabic name matches too");
assert.deepEqual(alertItems([al("1", "anything", 1)], []), []);
// macro movers: only metrics far from their own history; direction map marks, unknown direction is neutral; annual data is undated
const row = (name: string, y: number, v: number, z: number | null, ch: number | null) => ({ met: { domain: "Macro", name, cls: "H", years: "", src: "IMF WEO (held)", note: "" }, has: true, series: [], proj: null, spine: { latest: { y, v }, change5: ch, z, n: 9 }, region: null, uae: null });
const cd = { deals: [{ d: "2026-10-12", t: "Masdar signs solar deal", by: ["Masdar"], sector: "energy", u: "k9" }], spine: [row("Inflation, consumer prices", 2025, 12.4, 2.1, 5), row("Real GDP growth", 2025, 4.2, 1.6, 1), row("Government gross debt, % of GDP", 2025, 90, 0.4, 3), row("Population", 2025, 11e6, 3.2, 1e6), row("Reserves, months of imports", 2025, 3, -2, -1)] } as unknown as CaseData;
const macro = macroItems(cd); assert.deepEqual(macro.map((x) => x.id.split(":")[1]), ["Inflation, consumer prices", "Reserves, months of imports", "Real GDP growth"]);
assert.equal(macro.find((x) => x.title.startsWith("Inflation"))!.tone, "risk"); assert.equal(macro.find((x) => x.title.startsWith("Real GDP"))!.tone, "opportunity"); assert.equal(macro.find((x) => x.title.startsWith("Reserves"))!.tone, "risk"); assert.equal(macro.find((x) => x.title.startsWith("Population")), undefined, "a steadily growing total is not a mover"); assert.equal(macroItems({ spine: [row("Military spending, % of GDP", 2025, 5, 2.4, 2)] } as unknown as CaseData)[0].tone, "neutral", "a mover with no plain direction is neutral"); assert.ok(macro.every((x) => x.ts === null && x.asOf === "2025"));
// on file: agreements dated by year (this and last), flights that are a change; nothing else
const ag = { name: "J", committees: [], offices: [], cepa: null, moft: [], mofa: [{ t: "Air services agreement", type: "air", kind: "agreement", year: "2026" }, { t: "Old extradition treaty", type: "legal", kind: "agreement", year: "2009" }, { t: "No year", type: "legal", kind: "mou" }] } as never;
const fl = { destinations: [{ iata: "AMM", name: "Queen Alia", lat: 0, lon: 0, status: "active", from: ["AUH"], airlines: [] }, { iata: "AQJ", name: "Aqaba", lat: 0, lon: 0, status: "future", from: ["DXB"], airlines: [] }, { iata: "XXX", name: "Gone", lat: 0, lon: 0, status: "suspended", from: ["SHJ"], airlines: [] }], airlines: [], counts: {} } as never;
const of = onFileItems(ag, fl, 2026); assert.equal(of.length, 3); assert.deepEqual(of[0].angles, ["onfile", "logistics"]); assert.deepEqual(of.filter((x) => x.kind === "flight").map((x) => x.tone), ["opportunity", "risk"]);
// build + filters
const items = buildItems({ news: [{ angle: "economy", items: [{ outlet: "Reuters", title: "Jordan agrees IMF deal", link: "https://r.com/2", ts: d(3) }, { outlet: "Reuters", title: "Old story about trade", link: "https://r.com/3", ts: d(40) }] }], visits: [{ u: "abc", d: "2026-10-05", t: "Visit", c: ["JOR"], k: "visit", l: 2, dir: null }], d: cd, alerts: [], names: ["Jordan"], ag, fl, iso: "JOR", year: 2026 });
assert.ok(items.length >= 8); assert.deepEqual(items.slice(0, 2).map((x) => x.kind), ["news", "deal"], "newest dated first");
const f7 = filterItems(items, { ...DEFAULT_FILTER, days: 7 }, NOW); assert.ok(f7.some((x) => x.id.startsWith("news:")) && !f7.some((x) => x.kind === "visit"), "the 7-day window drops older dated items"); assert.ok(f7.some((x) => x.ts == null), "on-file items are not subject to the window");
assert.ok(filterItems(items, { ...DEFAULT_FILTER, days: 90 }, NOW).length > f7.length); assert.equal(filterItems(items, { ...DEFAULT_FILTER, days: 90, angles: ["diplomacy"] }, NOW).length, 1);
assert.equal(filterItems(items, { ...DEFAULT_FILTER, days: 90, tone: "risk" }, NOW).every((x) => x.tone === "risk"), true); assert.equal(filterItems(items, { ...DEFAULT_FILTER, days: 90, q: "agrees imf" }, NOW).length, 1); assert.equal(filterItems(items, { ...DEFAULT_FILTER, days: 90, outlets: ["WAM"] }, NOW).length, 2);
const cnt = angleCounts(items, { ...DEFAULT_FILTER, days: 90, angles: ["security"] }, NOW); assert.ok(cnt.economy >= 2, "a chip's count ignores the angle selection itself"); assert.equal(outletCounts(items)[0].name, "Reuters");
const groups = groupByDay(items.filter((x) => x.ts != null)); assert.ok(groups[0].day >= groups[groups.length - 1].day); assert.equal(undated(items).length + groups.reduce((a, g) => a + g.items.length, 0), items.length);
// what changed since the last visit
assert.equal(newSince(items, null).size, 0, "no earlier visit, nothing to compare");
const seen = snapshotSeen(items.filter((x) => x.id !== of[1].id), d(2)); const fresh = newSince(items, seen);
assert.ok(fresh.has(items.find((x) => x.id.startsWith("news:"))!.id) === false, "a 3-day-old headline is older than the last visit 2 days ago"); assert.ok(fresh.has(of[1].id), "an on-file item not seen before is new"); assert.ok(!fresh.has(of[0].id));
assert.equal(filterItems(items, { ...DEFAULT_FILTER, days: 90, onlyNew: true }, NOW, fresh).every((x) => fresh.has(x.id)), true);
// clips and summary
const c = itemClip(items[0], "JOR"); assert.equal(c.id, items[0].id); assert.equal(c.iso, "JOR"); assert.equal(c.angle, items[0].angles[0]);
const s = summaryText(items, 3); assert.equal(s.n, 3); assert.ok(s.text.startsWith("[1] ") && s.text.split("\n").length === 3);
const empty: HubItem[] = []; assert.equal(summaryText(empty).n, 0);
// the silhouette: a path for a country, fitted to its box, with the capital pinned inside it; null for an unknown code
const topo = JSON.parse(readFileSync("public/data/countries-50m.json", "utf8")); const jo = outlineFor(topo, "400", 300, 190, 10, [35.93, 31.95]);
assert.ok(jo && jo.d.startsWith("M") && jo.d.length > 200 && jo.pin && jo.pin[0] > 0 && jo.pin[0] < 300 && jo.pin[1] > 0 && jo.pin[1] < 190, "Jordan is drawn with Amman inside the box"); assert.equal(outlineFor(topo, "9999"), null);
const us = outlineFor(topo, "840", 300, 190, 10, [-77.0, 38.9]); assert.ok(us && us.d.length > 500 && us.pin, "a country with distant islands is fitted to its main body");
console.log("hub.test.ts: all assertions passed");
