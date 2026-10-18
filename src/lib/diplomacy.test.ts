// Run with: npx tsx src/lib/diplomacy.test.ts
// Guards the UAE missions directory and the visits history, and that every live static map layer has valid data behind it.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { LAYERS } from "./layers/registry";
import { STATIC_LAYERS } from "./layers/sources/static";
import type { MissionsData, VisitsData } from "./diplomacy-client";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const iso = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));

const m = read("../../public/data/missions.json") as MissionsData; const mc = Object.entries(m.countries);
assert.ok(mc.length >= 90, `only ${mc.length} countries with missions`); assert.ok(Object.values(m.totals).reduce((a, b) => a + b, 0) >= 110, "too few missions");
for (const [k, list] of mc) { assert.ok(iso.has(k), `unknown country ${k}`); assert.ok(list.some((x) => x.type === "embassy") || k === "CHE" || list.length, `${k}: no mission`);
  for (const x of list) { assert.ok(x.name && x.type, `${k}: nameless mission`); if (x.email) assert.match(x.email, /^[\w.+-]+@[\w.-]+\.\w+$/); if (x.head) { assert.ok(!/^(H\.E\.?|HE)\s/i.test(x.head.name), `${k}: title left in name "${x.head.name}"`); assert.ok(x.head.name !== x.head.name.toUpperCase(), `${k}: all-caps name`); } if (x.lat != null) assert.ok(Math.abs(x.lat) <= 90 && Math.abs(x.lon!) <= 180); } }
assert.equal(m.countries.IND?.filter((x) => x.type === "embassy").length, 1); assert.ok((m.countries.IND?.length ?? 0) >= 3, "India should have an embassy and consulates");
assert.ok(m.countries.USA?.some((x) => x.type === "permanent-mission"), "UN permanent mission in the USA");

const v = read("../../public/data/visits.json") as VisitsData; assert.ok(v.items.length >= 1000, `only ${v.items.length} visits`);
const seen = new Set<string>(); for (const x of v.items) { assert.ok(!seen.has(x.u), `duplicate ${x.u}`); seen.add(x.u); assert.match(x.d, /^20\d\d-\d\d-\d\d$/); assert.ok(x.c.length && x.c.every((c) => iso.has(c)), `${x.u}: bad country`); assert.ok([1, 2, 3].includes(x.l)); assert.ok(!x.c.includes("ARE")); }
assert.ok(v.items.filter((x) => x.l === 3).length >= 200, "senior engagements missing"); assert.ok(new Set(v.items.flatMap((x) => x.c)).size >= 100, "visits cover too few countries");
const latest = v.items[0].d; assert.ok(Date.now() - Date.parse(latest) < 120 * 86400e3, `visits are stale (latest ${latest})`);

// every live layer served from a static file must have that file, in the shape the app expects
for (const l of LAYERS.filter((x) => x.status === "live" && x.api && (STATIC_LAYERS as readonly string[]).includes(x.api))) {
  const f = new URL(`../../public/data/layers/${l.api}.geojson`, import.meta.url); assert.ok(existsSync(f), `${l.id}: live but ${l.api}.geojson is missing`);
  const j = JSON.parse(readFileSync(f, "utf8")) as GeoJSON.FeatureCollection; assert.ok(j.features.length >= 8, `${l.id}: too few features`); const ids = new Set<string>(); const types = new Set((l.sub ?? []).map((s) => s.key));
  for (const x of j.features) { const p = x.properties as { id: string; type: string; title: string }; assert.ok(p.id && p.title && x.geometry, `${l.id}: malformed feature`); assert.ok(!ids.has(p.id), `${l.id}: duplicate id ${p.id}`); ids.add(p.id); if (types.size) assert.ok(types.has(p.type), `${l.id}: feature type "${p.type}" has no legend entry`); }
}
console.log("diplomacy: all assertions passed");
