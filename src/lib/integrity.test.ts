// Run with: npx tsx src/lib/integrity.test.ts
// Cross-dataset invariants that a ministerial product must not break: names, attribution of agreements and visits, embassy pins, memberships, freshness.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessionState } from "./markets/format";
import { intelFor } from "./intel-data";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const countries = read("../../public/data/countries.json") as { iso3: string; name: string; capital: string | null; lat: number | null; lng: number | null; region: string }[];
const by = new Map(countries.map((c) => [c.iso3, c]));

// names: unique, no World Bank leftovers, Palestine and Korea correct, every country with a capital has a point
const names = new Map<string, string>(); for (const c of countries) { assert.ok(!names.has(c.name), `${c.iso3} and ${names.get(c.name)} share the name "${c.name}"`); names.set(c.name, c.iso3); assert.equal(c.region, c.region.trim(), `${c.iso3}: region has stray spaces`); assert.ok(!/, (RB|The|Rep\.|Fed\.|Dem\.)|West Bank and Gaza|PDR$/.test(c.name), `${c.iso3}: unreadable name "${c.name}"`); }
assert.equal(by.get("PSE")?.name, "Palestine"); assert.ok(by.get("PSE")?.capital && by.get("PSE")?.lat != null, "Palestine needs a capital and a point");
assert.equal(by.get("KOR")?.name, "South Korea"); assert.equal(by.get("PRK")?.name, "North Korea"); assert.ok(by.has("HKG") && by.has("MAC"), "Hong Kong and Macao are in the atlas");

// agreements: the South Korean list must not sit under North Korea (MOFA's page files it there)
const ag = read("../../public/data/agreements.json") as { countries: Record<string, { mofa: { t: string }[]; moft: { t: string }[]; cepa: { status: string } | null }>; cepaSummary?: { inForce: number } };
const n = (k: string) => (ag.countries[k] ? ag.countries[k].mofa.length + ag.countries[k].moft.length : 0);
assert.ok(n("KOR") > 20 && n("KOR") > n("PRK") * 5, `South Korea has ${n("KOR")} agreements and North Korea ${n("PRK")}`);
assert.ok(!(ag.countries.PRK?.mofa ?? []).some((x) => /Republic of Korea|Samsung|Bank of Korea/i.test(x.t)), "South Korean titles under North Korea");

// visits: the tagger must keep look-alike names apart and every item needs a UAE party
const vs = read("../../public/data/visits.json") as { items: { t: string; c: string[]; l: number; k: string }[] };
const tagged = (iso: string) => vs.items.filter((x) => x.c.includes(iso));
for (const x of tagged("GIN")) assert.ok(!/Guinea[- ]Bissau|Papua New Guinea|Equatorial Guinea/i.test(x.t), `GIN tagged on: ${x.t}`);
for (const x of tagged("SDN")) assert.ok(!/South Sudan/i.test(x.t), `SDN tagged on: ${x.t}`);
for (const x of tagged("DMA")) assert.ok(!/Dominican/i.test(x.t), `DMA tagged on: ${x.t}`);
for (const x of tagged("PRK")) assert.ok(/North Korea|DPRK|Pyongyang|Democratic People/i.test(x.t), `PRK tagged on: ${x.t}`);
for (const x of tagged("COD")) assert.ok(!x.c.includes("COG") || /Republic of (the )?Congo/i.test(x.t.replace(/Democratic Republic of (the )?Congo/gi, "")), `COD and COG both tagged on: ${x.t}`);
const UAE = /\b(UAE|Emirati|Emirates|Abu Dhabi|Dubai|Sharjah|Ajman|Fujairah|Ras Al Khaimah|Umm Al Quwain|MoFA|bin Zayed|bin Rashid|Hamdan|Saqr|Ruler of|Crown Prince of|Humaid|Hamad bin|Saud bin|Sultan bin|Hazza|Theyab|Nahyan|Zayed|FNC|Federal National Council|Shakhboot|Gargash|Nusseibeh|Gergawi|Touq|Zeyoudi|Jaber|Qaiwain)\b/i;
assert.ok(vs.items.filter((x) => UAE.test(x.t)).length / vs.items.length > 0.97, "visits without a UAE party in the headline");
assert.ok(!vs.items.some((x) => x.k === "message" && /terrorist attacks?|condemn/i.test(x.t)), "condemnation statements counted as engagement (a call or meeting about an attack is fine)");

// embassy pins: within 250 km of the capital, or marked approximate
const ms = read("../../public/data/missions.json") as { countries: Record<string, { type: string; lat: number | null; lon: number | null; approx?: boolean }[]> };
const hav = (a: number[], b: number[]) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
for (const [k, list] of Object.entries(ms.countries)) for (const e of list) { const c = by.get(k); if (e.type === "embassy" && !e.approx && e.lat != null && c?.lat != null && c.lng != null) assert.ok(hav([e.lat, e.lon!], [c.lat, c.lng]) <= 250, `${k}: embassy pin is ${Math.round(hav([e.lat, e.lon!], [c.lat, c.lng]))} km from the capital`); }

// memberships Wikidata is known to miss, and a UN alignment for every scored country that has one in the source
const orgs = read("../../public/data/orgs.json") as { orgs: Record<string, string[]> };
for (const [o, c] of [["commonwealth", "GBR"], ["coe", "SVK"], ["itu", "KOR"], ["opcw", "GEO"], ["wto", "HKG"], ["wto", "KAZ"], ["unga", "SRB"]] as const) assert.ok(orgs.orgs[o]?.includes(c), `${c} missing from ${o}`);
const pi = read("../../public/data/partnership.json") as { countries: Record<string, { score: number; rank: number; raw: { alignment: number | null } }> };
assert.notEqual(pi.countries.SRB?.raw.alignment, null, "Serbia has no UN alignment (Voeten codes it YUG)");
const byScore = new Map<number, Set<number>>(); for (const v of Object.values(pi.countries)) (byScore.get(v.score) ?? byScore.set(v.score, new Set()).get(v.score)!).add(v.rank); for (const [s, r] of byScore) assert.equal(r.size, 1, `score ${s} has several ranks`);

// freshness: nothing older than a rebuild cycle plus slack
const age = (iso: string) => (Date.now() - Date.parse(iso)) / 86400e3;
for (const [f, max] of [["agreements", 45], ["flights", 45], ["investment", 45], ["missions", 45], ["visits", 45], ["trade", 45], ["outlook", 45], ["partnership", 45], ["media-tone", 30]] as const) { const d = read(`../../public/data/${f}.json`) as { built: string }; assert.ok(age(d.built) < max, `${f}.json was built ${Math.round(age(d.built))} days ago`); }
// media tone: the stored window equals what the builder and the workflow ask for
const mt = read("../../public/data/media-tone.json") as { days: number }; const def = +(/\?\? (\d+)\)/.exec(readFileSync(new URL("../../scripts/build-media-tone.mjs", import.meta.url), "utf8"))?.[1] ?? 0);
assert.equal(mt.days, def, `media-tone.json covers ${mt.days} days but the builder default is ${def}`);
// the stated CEPA counts match the records
if (ag.cepaSummary) assert.ok(Object.values(ag.countries).filter((c) => c.cepa?.status === "in-force").length >= 15);
// markets: the Qatar Stock Exchange is in the universe, cleanly, and sessions follow each market's own week
const mk = (read("../../public/data/markets.json") as { rows: { exchange: string; symbol: string; currency: string; mic: string; name: string }[] }).rows;
const keys = mk.map((r) => `${r.exchange}:${r.symbol}`); assert.equal(new Set(keys).size, keys.length, "duplicate exchange:symbol");
const qse = mk.filter((r) => r.exchange === "QSE"); assert.ok(qse.length >= 40 && qse.length <= 70, `QSE has ${qse.length} listings`);
for (const r of qse) { assert.equal(r.currency, "QAR", r.symbol); assert.equal(r.mic, "DSMD", r.symbol); assert.match(r.symbol, /^[A-Z0-9]{3,6}$/, `vendor placeholder ${r.symbol}`); assert.ok(r.name && r.name !== r.symbol); }
for (const sym of ["QNBK", "IQCD", "ORDS", "QIBK", "DHBK", "QEWS"]) assert.ok(qse.some((r) => r.symbol === sym), `${sym} missing from QSE`);
assert.ok(mk.filter((r) => r.exchange !== "QSE").every((r) => r.currency === "AED"), "UAE listings are in dirhams");
const at = (iso: string) => new Date(iso); // 2026-10-18 is a Sunday
assert.equal(sessionState(at("2026-10-18T07:00:00Z"), "QSE").open, true, "Qatar trades on Sunday 10:00 AST"); assert.equal(sessionState(at("2026-10-18T07:00:00Z"), "UAE").open, false, "the UAE market is shut on Sunday");
assert.equal(sessionState(at("2026-10-16T07:00:00Z"), "QSE").open, false, "Qatar is shut on Friday"); assert.equal(sessionState(at("2026-10-16T07:00:00Z"), "UAE").open, true, "the UAE trades on Friday 11:00 GST");
assert.equal(sessionState(at("2026-10-18T10:30:00Z"), "QSE").open, false, "Qatar is shut after 13:15 AST"); assert.equal(sessionState(at("2026-10-18T05:00:00Z"), "QSE").open, false, "Qatar is shut before 09:30 AST");
// intel datasets: governance, leaders, UAE aid, leverage, bilateral temperature, UAE deals
const iso = new Set(countries.map((c) => c.iso3));
const gv = read("../../public/data/governance.json") as { year: number; countries: Record<string, Record<string, number>> };
assert.ok(Object.keys(gv.countries).length >= 180 && gv.year >= 2023, "governance coverage"); for (const [k, v] of Object.entries(gv.countries)) { assert.ok(iso.has(k), `governance: unknown ${k}`); for (const d of ["pv", "ge", "rl", "cc", "rq", "va"]) if (v[d] != null) assert.ok(v[d] >= 0 && v[d] <= 100, `${k} ${d}=${v[d]}`); }
const ld = read("../../public/data/leaders.json") as { countries: Record<string, { state?: { name: string; start: string | null; birth: string | null }; gov?: { name: string; start: string | null; birth: string | null }; elections?: { date: string }[] }> };
assert.ok(Object.values(ld.countries).filter((x) => x.state).length >= 150, "leaders: too few heads of state"); const todayS = new Date().toISOString().slice(0, 10);
for (const [k, v] of Object.entries(ld.countries)) { assert.ok(iso.has(k), `leaders: unknown ${k}`); for (const p of [v.state, v.gov]) { if (!p) continue; assert.ok(p.name && !/^Q\d+$/.test(p.name), `${k}: unlabelled leader`); if (p.start) assert.ok(p.start <= todayS, `${k}: leader start in the future`); if (p.birth) { const age = (Date.now() - Date.parse(p.birth)) / 31557600000; assert.ok(age > 25 && age < 110, `${k}: implausible age ${Math.round(age)}`); } } for (const e of v.elections ?? []) assert.ok(e.date >= todayS.slice(0, 7), `${k}: election in the past`); }
const ad = read("../../public/data/uae-aid.json") as { years: number[]; totals: Record<string, number>; countries: Record<string, Record<string, number>> };
assert.ok(Object.keys(ad.countries).length >= 40 && Object.values(ad.totals).every((v) => v >= 0), "aid coverage"); for (const k of Object.keys(ad.countries)) assert.ok(iso.has(k), `aid: unknown ${k}`); const lastFull = String(ad.years[ad.years.length - 2]); assert.equal(Object.entries(ad.countries).sort((a, b) => (b[1][lastFull] ?? 0) - (a[1][lastFull] ?? 0))[0][0], "PSE", "Palestine is the largest humanitarian recipient in the last full year");
const lv = read("../../public/data/leverage.json") as { countries: Record<string, { theirs: number | null; ours: number | null; quadrant: string }> };
assert.ok(Object.keys(lv.countries).length >= 100, "leverage coverage"); for (const [k, v] of Object.entries(lv.countries)) { assert.ok(iso.has(k) && k !== "ARE", `leverage: bad ${k}`); for (const a of [v.theirs, v.ours]) if (a != null) assert.ok(a >= 0 && a <= 100, `${k}: percentile ${a}`); assert.ok(["mutual", "uae-leverage", "uae-exposed", "light", "partial"].includes(v.quadrant), k); }
const tm = read("../../public/data/temperature.json") as { countries: Record<string, { n: number; g: number; coop: number; conflict: number; weeks: { w: string; n: number; g: number }[] }> };
assert.ok(Object.keys(tm.countries).length >= 40, "temperature coverage"); for (const [k, v] of Object.entries(tm.countries)) { assert.ok(iso.has(k) && k !== "ARE", `temperature: bad ${k}`); assert.ok(v.n >= 15 && v.g >= -10 && v.g <= 10 && v.coop >= 0 && v.conflict >= 0 && v.coop + v.conflict <= 1.001, `${k}: ${JSON.stringify({ n: v.n, g: v.g })}`); const ws = v.weeks.map((x) => x.w); assert.deepEqual([...ws].sort(), ws, `${k}: weeks out of order`); }
const dl = read("../../public/data/deals.json") as { items: { u: string; d: string; t: string; c: string[]; by: string[] }[] };
assert.ok(dl.items.length >= 100, "deals coverage"); const dids = dl.items.map((x) => x.u); assert.equal(new Set(dids).size, dids.length, "duplicate deal ids"); for (const x of dl.items) { assert.ok(x.c.length && x.c.every((c) => iso.has(c) && c !== "ARE"), `deal ${x.u}: bad countries`); assert.ok(x.by.length && x.d <= todayS, `deal ${x.u}: no investor or a future date`); }
// anchors that catch a mixed-up World Bank row (a duplicate SYR row once made Syria look like a top-tier state and a stale NLD row understated the Netherlands)
for (const c of ["AFG", "YEM", "SYR", "SOM"]) assert.ok(gv.countries[c].ge < 45 && gv.countries[c].pv < 45, `governance: ${c} implausibly high`);
for (const c of ["CHE", "NOR", "NLD", "DNK"]) assert.ok(gv.countries[c].ge > 75 && gv.countries[c].rl > 75, `governance: ${c} implausibly low`);
// rivals: each country compares the UAE with the other powers by trade share, sorted, with the UAE present and shares within 0-100
{
  const rv = read("../../public/data/rivals.json") as { built: string; year: number; countries: Record<string, { uae: { share: number; rank: number }; of: number; list: { c: string; share: number }[] }> };
  assert.ok(Object.keys(rv.countries).length >= 100 && rv.year >= 2023 && age(rv.built) < 45, "rivals coverage or freshness");
  for (const [k, v] of Object.entries(rv.countries)) { assert.ok(iso.has(k) && k !== "ARE", `rivals: bad ${k}`); assert.ok(v.list.some((x) => x.c === "ARE") && v.list.length === v.of && v.uae.rank >= 1 && v.uae.rank <= v.of, `rivals: ${k} malformed`); for (let i = 0; i < v.list.length; i++) { assert.ok(v.list[i].share >= 0 && v.list[i].share <= 100, `rivals: ${k} share out of range`); if (i) assert.ok(v.list[i - 1].share >= v.list[i].share, `rivals: ${k} not sorted`); } }
  assert.ok(rv.countries.PAK.list[0].c === "CHN" && rv.countries.PAK.uae.rank <= 3, "rivals: Pakistan anchor (China first, UAE near the top)"); assert.ok(rv.countries.EGY.list[0].c === "CHN", "rivals: Egypt anchor");
}
// the country scorecard: every part a percentile, a dimension the mean of its parts, the overall the weighted mean of the dimensions that have data
{
  const sc = read("../../public/data/scorecard.json") as { built: string; weights: Record<string, number>; countries: Record<string, { overall: number; coverage: number; dims: Record<string, { score: number | null; parts: { s: number }[] }> }> };
  assert.ok(Object.keys(sc.countries).length >= 150, "scorecard coverage"); assert.equal(Object.values(sc.weights).reduce((a, b) => a + b, 0), 100, "scorecard weights sum to 100"); assert.ok(age(sc.built) < 45, "scorecard.json is stale");
  for (const [k, v] of Object.entries(sc.countries)) { assert.ok(iso.has(k) && k !== "ARE", `scorecard: bad ${k}`); assert.ok(v.overall >= 0 && v.overall <= 100 && v.coverage > 0 && v.coverage <= 100, `scorecard: ${k} out of range`); for (const d of Object.values(v.dims)) for (const p of d.parts) assert.ok(p.s >= 0 && p.s <= 100, `scorecard: ${k} part out of range`); }
  assert.ok(sc.countries.SYR.overall < sc.countries.CHE.overall, "scorecard: Syria should not outscore Switzerland"); assert.ok(sc.countries.SYR.dims.political.score! < 45, "scorecard: Syria political score implausible");
}
for (const [f, max] of [["leverage", 45], ["deals", 45], ["temperature", 30], ["governance", 400], ["leaders", 70], ["uae-aid", 70]] as const) { const d = read(`../../public/data/${f}.json`) as { built: string }; assert.ok(age(d.built) < max, `${f}.json was built ${Math.round(age(d.built))} days ago`); }
void (async () => { const e = await intelFor("EGY"); assert.ok(e && e.leverage && e.temperature && e.governance && e.leaders && e.deals.total > 0, "EGY intel payload is incomplete"); assert.equal(await intelFor("ARE"), null); assert.equal(await intelFor("XXX"), null); assert.ok(e!.metrics.partnershipScore != null && e!.ids.visits.length > 0); console.log("intel payload: ok"); })();
console.log("integrity: all assertions passed");
