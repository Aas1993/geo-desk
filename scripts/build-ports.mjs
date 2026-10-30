// Builds public/data/layers/ports.geojson: Large and Medium harbours from the NGA World Port Index (Pub. 150).
// Source: https://msi.nga.mil/api/publications/world-port-index?output=json (US Government work, public domain).
// One request; refuses to write if the result falls below sane floors.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const API = "https://msi.nga.mil/api/publications/world-port-index?output=json";
const PAGE = "https://msi.nga.mil/publications/world-port-index";
const SRC = "NGA World Port Index (Pub. 150), public domain";
const OUT = new URL("../public/data/layers/ports.geojson", import.meta.url);
const refuse = (m) => { console.error("REFUSING TO WRITE: " + m); process.exit(1); };

const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const iso3Of = Object.fromEntries(countries.map((c) => [c.iso2, c.iso3]));
// Territories the WPI lists separately that countries.json does not carry (ISO 3166-1 alpha-3).
Object.assign(iso3Of, { GU: "GUM", TW: "TWN", PR: "PRI", GI: "GIB", CX: "CXR", MQ: "MTQ", SH: "SHN", HK: "HKG", BM: "BMU", MO: "MAC", GP: "GLP", FK: "FLK" });

let res;
try { res = await fetch(API, { headers: UA, signal: AbortSignal.timeout(90_000) }); } catch (e) { refuse("NGA API unreachable: " + e.message); }
if (!res.ok) refuse(`NGA API returned HTTP ${res.status}`);
const body = await res.json().catch(() => null);
const ports = body?.ports;
if (!Array.isArray(ports) || ports.length < 2000) refuse(`unexpected WPI payload (${ports?.length ?? "no"} ports)`);

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
const features = [];
for (const p of ports) {
  const size = p.harborSize === "L" ? "large" : p.harborSize === "M" ? "medium" : null;
  if (!size) continue;
  const lat = Number(p.ycoord), lon = Number(p.xcoord);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
  const depth = parseFloat(p.chDepth);
  const sev = size === "large" ? (depth >= 14 ? 3 : 2) : 1;
  const facts = [`${size[0].toUpperCase() + size.slice(1)} harbour`, p.countryName ? titleCase(p.countryName) : p.countryCode];
  if (Number.isFinite(depth)) facts.push(`channel depth ${depth} m`);
  if (p.unloCode) facts.push(`UN/LOCODE ${String(p.unloCode).replace(/\s+/g, "")}`);
  const props = { id: `port:${p.portNumber}`, layer: "ports", type: size, title: p.portName, sev, desc: facts.join(" · "), url: PAGE, src: SRC };
  const iso3 = iso3Of[p.countryCode]; if (iso3) props.iso3 = iso3;
  features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [+lon.toFixed(4), +lat.toFixed(4)] } });
}
features.sort((a, b) => b.properties.sev - a.properties.sev || a.properties.title.localeCompare(b.properties.title));

const large = features.filter((f) => f.properties.type === "large").length;
const ids = new Set(features.map((f) => f.properties.id));
if (ids.size !== features.length) refuse("duplicate ids");
if (features.length < 400) refuse(`only ${features.length} Large+Medium ports (floor 400)`);
if (large < 100) refuse(`only ${large} Large ports (floor 100)`);
if (!features.some((f) => /^rotterdam$/i.test(f.properties.title) && f.properties.type === "large")) refuse("Rotterdam is not a Large port in this payload");

const fc = { type: "FeatureCollection", meta: { built: new Date().toISOString(), source: API, licence: "Public domain (US Government work, NGA)", count: features.length }, features };
const json = JSON.stringify(fc);
if (json.length > 1.2e6) refuse(`output is ${json.length} bytes, over the 1.2 MB budget`);
mkdirSync(new URL("../public/data/layers/", import.meta.url), { recursive: true });
writeFileSync(OUT, json);
const noIso = features.filter((f) => !f.properties.iso3).length;
console.log(`ports: ${features.length} (large ${large}, medium ${features.length - large}), ${json.length} bytes, without iso3: ${noIso}`);
