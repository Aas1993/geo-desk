// Keeps a dated store of the IMF outlook so a forecast can be compared with what the same source said earlier.
// public/data/outlook.json is the live IMF database, which is revised between quarterly vintages. This appends a compact snapshot (growth, inflation, current account, debt; the current year and the next five)
// to public/data/vintages/weo.json, only when something has changed, and keeps the last 24. A comparison is only possible between snapshots this store has actually taken, and the desk says so.
// Usage: node scripts/snapshot-vintage.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const KEYS = ["growth", "inflation", "ca", "debt"]; const YEARS = 6; const KEEP = 24;
const src = JSON.parse(readFileSync(new URL("../public/data/outlook.json", import.meta.url), "utf8"));
const y0 = new Date().getUTCFullYear(); const snap = {};
for (const [iso, v] of Object.entries(src.countries)) { const row = {}; for (const k of KEYS) { const s = v[k]; if (!s) continue; const a = []; for (let y = y0; y < y0 + YEARS; y++) a.push(s[y] ?? null); if (a.some((x) => x != null)) row[k] = a; } if (Object.keys(row).length) snap[iso] = row; }
const file = new URL("../public/data/vintages/weo.json", import.meta.url);
const store = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { note: "Snapshots of the IMF live outlook taken by this desk. Each holds, per country, growth, inflation, current account and debt for the year it was taken and the next five.", keys: KEYS, snapshots: [] };
const last = store.snapshots[store.snapshots.length - 1];
if (last && last.y0 === y0 && JSON.stringify(last.data) === JSON.stringify(snap)) { console.log("unchanged since", last.taken); process.exit(0); }
store.snapshots.push({ taken: new Date().toISOString().slice(0, 10), basis: src.built, y0, data: snap }); store.snapshots = store.snapshots.slice(-KEEP);
writeFileSync(file, JSON.stringify(store)); console.log("snapshots", store.snapshots.length, "countries", Object.keys(snap).length);
