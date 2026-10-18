// Run with: npx tsx src/lib/media.test.ts
// Guards the media data files, and the prompt/schema contract that the stance read depends on.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SCHEMA } from "./media/stance-prompt";
import { STANCES } from "./media/types";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const iso = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));

// FIPS codes are what GDELT's sourcecountry filter needs
const fips = read("../../public/data/fips.json") as Record<string, string>;
for (const k of iso) if (k !== "XKX") assert.match(fips[k] ?? "", /^[A-Z]{2}$/, `${k}: missing FIPS code`);
assert.equal(fips.GBR, "UK"); assert.equal(fips.DEU, "GM"); assert.equal(fips.ARE, "AE"); assert.equal(fips.NLD, "NL");
assert.equal(new Set(Object.values(fips)).size, Object.keys(fips).length, "FIPS codes must be unique");

// the stance scale in the schema and in the types must agree
const stanceEnum = (SCHEMA.properties.items.items.properties.stance as { enum: readonly string[] }).enum; assert.deepEqual([...stanceEnum], [...STANCES]);

// the world tone map, once built
const f = new URL("../../public/data/media-tone.json", import.meta.url);
if (existsSync(f)) {
  const d = read("../../public/data/media-tone.json") as { global: { avg: number }; countries: Record<string, { avg: number | null; points: number }> };
  const e = Object.entries(d.countries); assert.ok(e.length >= 30, `only ${e.length} countries`);
  assert.ok(d.global.avg > -8 && d.global.avg < 8, "global tone out of range");
  for (const [k, v] of e) { assert.ok(iso.has(k), `unknown country ${k}`); if (v.avg != null) assert.ok(v.avg > -15 && v.avg < 15, `${k}: tone ${v.avg} out of range`); }
  assert.ok(e.filter(([, v]) => v.avg != null).length >= 30, "too few countries measured");
}
console.log("media: all assertions passed");
