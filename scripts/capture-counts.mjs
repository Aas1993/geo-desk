// Takes a monthly snapshot of counts that have no history in their sources, so a ten-year view can accumulate from today: sanctions-list entries, active UAE flight destinations, announced deals and engagements in the last 12 months, ransomware postings in 90 days.
// Appends to public/data/vintages/capture.json under the month key (YYYY-MM) and rewrites that month if run again; keeps 120 months. Usage: node scripts/capture-counts.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const rd = (n) => JSON.parse(readFileSync(new URL(`../public/data/${n}`, import.meta.url), "utf8"));
const sanc = rd("sanctions.json").countries, fl = rd("flights.json").countries, deals = rd("deals.json").items, vis = rd("visits.json").items, rw = rd("ransomware.json").countries;
const cutoff = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10); const snap = {};
const bump = (iso, k, n = 1) => { (snap[iso] ??= {})[k] = (snap[iso][k] ?? 0) + n; };
for (const [iso, v] of Object.entries(sanc)) { bump(iso, "ofac", v.ofac ?? 0); bump(iso, "un", v.un ?? 0); }
for (const [iso, v] of Object.entries(fl)) bump(iso, "dest", (v.destinations ?? []).filter((d) => d.status === "active" || d.status === "seasonal").length);
for (const d of deals) if (d.d >= cutoff) for (const c of d.c ?? []) bump(c, "deals12");
for (const v of vis) if (v.d >= cutoff) for (const c of v.c ?? []) bump(c, "visits12");
for (const [iso, v] of Object.entries(rw)) bump(iso, "ransom90", v.n90 ?? 0);
const file = new URL("../public/data/vintages/capture.json", import.meta.url);
const store = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { note: "Monthly snapshots of counts whose sources keep no history. Keys: ofac and un (sanctions-list entries), dest (active or seasonal UAE flight destinations), deals12 and visits12 (headlines in the last 12 months), ransom90 (leak-site postings in 90 days).", months: {} };
store.months[new Date().toISOString().slice(0, 7)] = snap; const keys = Object.keys(store.months).sort().slice(-120); store.months = Object.fromEntries(keys.map((k) => [k, store.months[k]]));
writeFileSync(file, JSON.stringify(store)); console.log("months", keys.length, "countries", Object.keys(snap).length);
