// Run with: npx tsx src/lib/layers/registry.test.ts
// Keeps the layer catalogue honest: ids are unique, and every membership layer marked live has a member list built from real data.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAYERS, MEMBER_DATA } from "./registry";
const ids = LAYERS.map((l) => l.id); assert.equal(new Set(ids).size, ids.length, "duplicate layer ids");
const orgs = JSON.parse(readFileSync(new URL("../../../public/data/orgs.json", import.meta.url), "utf8")) as { orgs: Record<string, string[]> };
const countries = new Set((JSON.parse(readFileSync(new URL("../../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((c) => c.iso3));
assert.deepEqual([...MEMBER_DATA].sort(), Object.keys(orgs.orgs).sort(), "MEMBER_DATA must match public/data/orgs.json (rerun scripts/build-orgs.mjs)");
for (const l of LAYERS.filter((x) => x.kind === "members")) {
  assert.equal(l.status === "live", !!l.members && !!orgs.orgs[l.members], `${l.id}: status must follow member-list availability`);
  for (const code of orgs.orgs[l.members ?? ""] ?? []) assert.ok(countries.has(code), `${l.id}: unknown country ${code}`);
}
// spot-check lists a diplomat would notice being wrong
assert.equal(orgs.orgs.eu.length, 27); assert.equal(orgs.orgs.nato.length, 32); assert.equal(orgs.orgs.gcc.length, 6); assert.equal(orgs.orgs.unsc.length, 15); assert.equal(orgs.orgs.unga.length, 193);
assert.ok(orgs.orgs.gcc.includes("ARE") && orgs.orgs.opec.includes("ARE") && orgs.orgs.brics.includes("ARE") && !orgs.orgs.nato.includes("ARE"));
console.log("registry: all assertions passed");
