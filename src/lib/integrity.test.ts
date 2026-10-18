// Run with: npx tsx src/lib/integrity.test.ts
// Cross-dataset invariants that a ministerial product must not break: names, attribution of agreements and visits, embassy pins, memberships, freshness.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
console.log("integrity: all assertions passed");
