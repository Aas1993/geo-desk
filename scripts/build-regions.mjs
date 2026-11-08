// Builds public/data/regions.json: UN M49 geographic region, sub-region and intermediate region for every ISO3 in public/data/countries.json.
// Source: lukes/ISO-3166-Countries-with-Regional-Codes all.csv (UN Statistics Division M49 data merged with ISO 3166-1 codes; UN data retrieved June 2024).
// Countries that are not in the table are listed in the console and in meta.missing, never guessed. Blank fields are written as null.
// Run: node scripts/build-regions.mjs
import { readFileSync, writeFileSync } from "node:fs";

const URL_CSV = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));

const res = await fetch(URL_CSV, { headers: UA });
if (!res.ok) throw new Error("download failed " + res.status);
const text = await res.text();

// minimal RFC 4180 parser (the file quotes names containing commas)
const rows = []; { let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else f += c; }
  if (f || row.length) { row.push(f); rows.push(row); } }
const head = rows.shift(); const ix = Object.fromEntries(head.map((h, i) => [h, i]));
for (const k of ["alpha-3", "region", "sub-region", "intermediate-region"]) if (!(k in ix)) throw new Error("column missing: " + k);
const table = new Map(rows.map((r) => [r[ix["alpha-3"]], { region: r[ix["region"]] || null, subregion: r[ix["sub-region"]] || null, intermediate: r[ix["intermediate-region"]] || null }]));

const out = {}; const missing = []; const noRegion = [];
for (const c of countries) { const r = table.get(c.iso3); if (!r) { missing.push(`${c.iso3} ${c.name}`); continue; } if (!r.region) noRegion.push(c.iso3); out[c.iso3] = r; }

const counts = {}; for (const r of Object.values(out)) counts[r.subregion ?? "(none)"] = (counts[r.subregion ?? "(none)"] || 0) + 1;
console.log("table rows:", table.size, "| countries.json:", countries.length, "| matched:", Object.keys(out).length);
console.log("missing from table:", missing.length ? missing.join("; ") : "none");
console.log("matched but without a region:", noRegion.join(",") || "none");
console.log("sub-regions:"); for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log("  " + String(v).padStart(3) + "  " + k);
const regionCounts = {}; for (const r of Object.values(out)) regionCounts[r.region ?? "(none)"] = (regionCounts[r.region ?? "(none)"] || 0) + 1; console.log("regions:", JSON.stringify(regionCounts));
const inter = {}; for (const r of Object.values(out)) if (r.intermediate) inter[r.intermediate] = (inter[r.intermediate] || 0) + 1; console.log("intermediate regions:", JSON.stringify(inter));

writeFileSync(new URL("../public/data/regions.json", import.meta.url), JSON.stringify({
  meta: { built: new Date().toISOString(), source: "UN Statistics Division M49 standard, via github.com/lukes/ISO-3166-Countries-with-Regional-Codes all.csv (UN data retrieved 19 June 2024)", licence: "CC BY-SA 4.0 (lukes/ISO-3166-Countries-with-Regional-Codes); underlying UN M49 data from unstats.un.org/unsd/methodology/m49", missing },
  countries: out }));
console.log("written:", Object.keys(out).length, "countries");
