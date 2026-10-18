// Builds public/data/layers/power.geojson: power plants >= 1000 MW plus every nuclear plant, from the WRI Global Power Plant Database.
// Source: https://github.com/wri/global-power-plant-database (v1.3.0, CC BY 4.0). WRI stopped maintaining it in early 2022,
// so recent plants (for example UAE's Barakah) may be missing; this builder never adds anything by hand.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const CSV = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv";
const PAGE = "https://datasets.wri.org/dataset/globalpowerplantdatabase";
const SRC = "WRI Global Power Plant Database v1.3.0, CC BY 4.0";
const OUT = new URL("../public/data/layers/power.geojson", import.meta.url);
const refuse = (m) => { console.error("REFUSING TO WRITE: " + m); process.exit(1); };

let res;
try { res = await fetch(CSV, { headers: UA, signal: AbortSignal.timeout(120_000) }); } catch (e) { refuse("WRI CSV unreachable: " + e.message); }
if (!res.ok) refuse(`WRI CSV returned HTTP ${res.status}`);
const text = await res.text();

function parseCsv(t) {
  const rows = []; let f = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { f.push(c); c = ""; }
    else if (ch === "\n") { f.push(c); rows.push(f); f = []; c = ""; }
    else if (ch !== "\r") c += ch;
  }
  if (c || f.length) { f.push(c); rows.push(f); }
  return rows;
}
const rows = parseCsv(text);
const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
for (const need of ["country", "country_long", "name", "gppd_idnr", "capacity_mw", "latitude", "longitude", "primary_fuel"]) if (!(need in col)) refuse(`CSV lacks column ${need}`);
if (rows.length < 30_000) refuse(`unexpected CSV size (${rows.length} rows)`);

const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const valid = new Set(countries.map((c) => c.iso3));
const TYPE = { Nuclear: "nuclear", Coal: "coal", Gas: "gas", Oil: "oil", Petcoke: "oil", Hydro: "hydro", Wind: "wind", Solar: "solar" };
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const features = [];
for (const r of rows.slice(1)) {
  if (r.length < 10) continue;
  const mw = parseFloat(r[col.capacity_mw]); const fuel = r[col.primary_fuel];
  const nuclear = fuel === "Nuclear";
  if (!nuclear && !(mw >= 1000)) continue;
  const lat = parseFloat(r[col.latitude]), lon = parseFloat(r[col.longitude]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mw)) continue;
  const type = TYPE[fuel] ?? "other";
  const sev = Math.max(nuclear ? 2 : 1, mw >= 5000 ? 3 : mw >= 2000 ? 2 : 1);
  const year = parseInt(r[col.commissioning_year]);
  const owner = clean(r[col.owner]).split(/\s{2,}| {2}/)[0];
  const facts = [`${Math.round(mw).toLocaleString("en-US")} MW ${type === "other" ? fuel.toLowerCase() : type}`, clean(r[col.country_long])];
  if (Number.isFinite(year)) facts.push(`commissioned ${year}`);
  if (owner && owner.length < 60) facts.push(owner);
  const props = { id: `power:${r[col.gppd_idnr]}`, layer: "power", type, title: clean(r[col.name]), sev, desc: facts.join(" · "), url: PAGE, src: SRC };
  if (valid.has(r[col.country])) props.iso3 = r[col.country];
  features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [+lon.toFixed(4), +lat.toFixed(4)] } });
}
features.sort((a, b) => b.properties.sev - a.properties.sev || a.properties.title.localeCompare(b.properties.title));

const nuc = features.filter((f) => f.properties.type === "nuclear").length;
if (new Set(features.map((f) => f.properties.id)).size !== features.length) refuse("duplicate ids");
if (features.length < 500) refuse(`only ${features.length} plants (floor 500)`);
if (nuc < 150) refuse(`only ${nuc} nuclear plants (floor 150)`);

const fc = { type: "FeatureCollection", meta: { built: new Date().toISOString(), source: CSV, licence: "CC BY 4.0 (World Resources Institute)", count: features.length }, features };
const json = JSON.stringify(fc);
if (json.length > 1.2e6) refuse(`output is ${json.length} bytes, over the 1.2 MB budget`);
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(OUT, json);
const byType = {}; for (const f of features) byType[f.properties.type] = (byType[f.properties.type] ?? 0) + 1;
console.log(`power: ${features.length}, ${json.length} bytes, without iso3: ${features.filter((f) => !f.properties.iso3).length}`, JSON.stringify(byType));
