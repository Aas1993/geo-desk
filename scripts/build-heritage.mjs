// Builds public/data/layers/heritage.geojson: UNESCO World Heritage properties.
// Source: UNESCO open data portal (data.unesco.org), dataset "whc001" (World Heritage List), Opendatasoft v2.1 records API, no key.
// Licence on the dataset: CC BY-SA 4.0. Serial properties have no single coordinate in the dataset, so they are placed at their
// first listed component (lowest component ref), which is a real component location, not an average.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const API = "https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/records";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const iso2to3 = new Map(countries.map((c) => [c.iso2, c.iso3]));
const get = async (u) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(45_000) }); if (r.ok) return r.json(); } catch { /* retry */ } await sleep(2_000 * (i + 1)); } throw new Error("failed " + u); };

const select = "id_no,name_en,category,date_inscribed,danger,danger_list,states_names,iso_codes,coordinates,transboundary,components_list,components_count";
const rows = []; let total = Infinity;
for (let off = 0; off < total; off += 100) {
  const j = await get(`${API}?select=${select}&order_by=id_no&limit=100&offset=${off}`);
  total = j.total_count; rows.push(...j.results); await sleep(400);
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const ok = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const firstComponent = (s) => {
  const comps = [...(s ?? "").matchAll(/ref: ([^,}]+), latitude: (-?[\d.]+), longitude: (-?[\d.]+)/g)].map((m) => ({ ref: m[1], lat: +m[2], lon: +m[3] })).filter((c) => ok(c.lat, c.lon));
  comps.sort((a, b) => a.ref.localeCompare(b.ref, "en", { numeric: true })); return comps[0];
};

const features = []; const seen = new Set(); let fromComponent = 0, dropped = 0, noIso = 0;
for (const r of rows) {
  const title = (r.name_en ?? "").replace(/\s+/g, " ").trim(); const id = `heritage:${r.id_no}`;
  let lat = r.coordinates?.lat, lon = r.coordinates?.lon;
  if (!ok(lat, lon)) { const c = firstComponent(r.components_list); if (c) { lat = c.lat; lon = c.lon; fromComponent++; } }
  if (!title || !r.id_no || !ok(lat, lon) || seen.has(id)) { dropped++; continue; }
  seen.add(id);
  const type = String(r.category).toLowerCase(); if (!["cultural", "natural", "mixed"].includes(type)) { dropped++; continue; }
  const inDanger = r.danger === "True"; const since = (r.danger_list ?? "").match(/\d{4}/g)?.slice(-1)[0];
  const codes = (r.iso_codes ?? "").split(/,\s*/).filter(Boolean); const iso3 = codes.length === 1 ? iso2to3.get(codes[0]) : undefined; if (!iso3) noIso++;
  const states = Array.isArray(r.states_names) ? r.states_names : []; const where = states.length > 3 ? `${states.slice(0, 3).join(", ")} +${states.length - 3}` : states.join(", ");
  const desc = [type[0].toUpperCase() + type.slice(1), r.date_inscribed ? `inscribed ${r.date_inscribed}` : null, inDanger ? `in danger${since ? ` since ${since}` : ""}` : null, where || null, r.transboundary === "True" ? "transboundary" : null].filter(Boolean).join(" · ");
  const sev = inDanger ? 3 : type === "mixed" || r.transboundary === "True" ? 2 : 1;
  features.push({ type: "Feature", geometry: { type: "Point", coordinates: [r4(lon), r4(lat)] },
    properties: { id, layer: "heritage", type, title, sev, desc, url: `https://whc.unesco.org/en/list/${r.id_no}`, src: "UNESCO World Heritage Centre (CC BY-SA 4.0)", ...(iso3 ? { iso3 } : {}) } });
}

const byType = {}; for (const f of features) byType[f.properties.type] = (byType[f.properties.type] ?? 0) + 1;
const danger = features.filter((f) => f.properties.sev === 3).length;
const petra = features.find((f) => f.properties.id === "heritage:326");
if (features.length < 1000 || !byType.cultural || byType.cultural < 800 || byType.natural < 200 || danger < 30 || petra?.properties.iso3 !== "JOR") {
  console.error(`REFUSING TO WRITE: ${features.length} features ${JSON.stringify(byType)}, in danger ${danger}, petra ${petra?.properties.iso3}`); process.exit(1);
}
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
const out = { type: "FeatureCollection", meta: { built: new Date().toISOString(), source: "UNESCO World Heritage Centre via data.unesco.org (dataset whc001)", licence: "CC BY-SA 4.0", count: features.length }, features };
writeFileSync(new URL("../public/data/layers/heritage.geojson", import.meta.url), JSON.stringify(out));
console.log(`features ${features.length} (api total ${total}), by type ${JSON.stringify(byType)}, in danger ${danger}, placed at first component ${fromComponent}, dropped ${dropped}, no single iso3 ${noIso}`);
console.log("Petra:", JSON.stringify(petra.properties), petra.geometry.coordinates);
