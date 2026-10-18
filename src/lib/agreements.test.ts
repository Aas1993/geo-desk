// Run with: npx tsx src/lib/agreements.test.ts
// Guards the committed agreements snapshot: a broken scrape or a bad merge must not ship thin or malformed data.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AgData } from "./agreements-client";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const d = read("../../public/data/agreements.json") as AgData; const countries = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));
const entries = Object.entries(d.countries);
assert.ok(entries.length >= 170, `only ${entries.length} countries`);
for (const [k, c] of entries) {
  assert.ok(countries.has(k) || k === "XKX", `unknown country ${k}` /* Kosovo has agreements but no shape in the country list */);
  for (const a of [...c.mofa, ...c.moft]) { assert.ok(a.t.length > 6 && a.type, `${k}: empty agreement`); assert.ok(["agreement", "mou"].includes(a.kind)); }
  if (c.cepa) { assert.match(c.cepa.url, /^https:\/\/www\.trade\.gov\.ae\//, `${k}: CEPA source must be the Ministry`); for (const f of [c.cepa.signed, c.cepa.inForce, c.cepa.due]) if (f) assert.match(f, /^20\d\d-\d\d-\d\d$/); assert.ok(!c.cepa.inForce || c.cepa.inForce >= (c.cepa.signed ?? "0"), `${k}: in force before signed`); }
}
const cepas = entries.filter(([, c]) => c.cepa); assert.ok(cepas.length >= 18, "fewer CEPAs than the Ministry documents");
assert.equal(d.countries.IND.cepa?.inForce, "2022-05-01"); assert.equal(d.countries.IND.cepa?.signed, "2022-02-18");
assert.ok(entries.filter(([, c]) => c.mofa.some((a) => a.type === "air")).length >= 120, "air agreements missing");
assert.ok(entries.filter(([, c]) => c.mofa.some((a) => a.type === "tax")).length >= 100, "tax treaties missing");
assert.ok(!d.countries.ARE, "the UAE has no agreements with itself");
assert.ok(d.cepaSummary.signed >= d.cepaSummary.inForce);
console.log("agreements: all assertions passed");
