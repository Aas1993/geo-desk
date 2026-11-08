// Tests for the Markets source registry: the label can never claim a check that is not in the data, and every candidate that was ruled out carries a reason and evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verificationState, type MarketSources } from "./sources";

const base = { built: "2026-10-30T00:00:00Z", primary: { id: "twelvedata", name: "Twelve Data", url: "https://twelvedata.com", role: "", basis: "", plan: { ADX: "Pro", DFM: "Ultra" }, note: "" } };
const chk = (status: "ok" | "unavailable") => ({ id: "x", name: "X", url: "https://x.test", status, checked: "2026-10-30", evidence: ["HTTP 200"], reason: "r" });
assert.equal(verificationState({ ...base, independentCheck: false, checks: [chk("unavailable")] }), "unchecked");
assert.equal(verificationState({ ...base, independentCheck: true, checks: [chk("unavailable")] }), "unchecked", "a flag with no working check behind it is not a check");
assert.equal(verificationState({ ...base, independentCheck: true, checks: [chk("ok")] }), "checked");
assert.equal(verificationState({ ...base, independentCheck: false, checks: [] }), "unchecked");

const m = JSON.parse(readFileSync(new URL("../../../public/data/markets-sources.json", import.meta.url), "utf8")) as MarketSources;
assert.ok(m.primary.name === "Twelve Data" && /^https:\/\//.test(m.primary.url), "the price source is named with a link");
assert.deepEqual(Object.keys(m.primary.plan).sort(), ["ADX", "DFM"]);
assert.ok(m.checks.length >= 4, "the candidates that were tried are listed");
for (const c of m.checks) { assert.ok(/^https:\/\//.test(c.url) && c.name && c.reason.length > 40, `${c.id}: needs a link and a reason`); assert.ok(c.evidence.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(c.checked), `${c.id}: needs dated evidence`); }
// the exchanges' own sites are the candidates the user asked about, so both must appear
for (const id of ["adx", "dfm-marketwatch"]) assert.ok(m.checks.some((c) => c.id === id), `${id} is not in the list`);
assert.equal(m.independentCheck, m.checks.some((c) => c.status === "ok"), "the flag follows the checks");
console.log(`markets sources: all assertions passed (${m.checks.length} candidates tried, independent check ${m.independentCheck ? "available" : "unavailable"})`);
