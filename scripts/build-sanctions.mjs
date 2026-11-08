// Builds public/data/sanctions.json: how many OFAC SDN and UN-listed persons/entities have an address (or nationality) in each country.
// Sources: US Treasury OFAC SDN address file (public domain) and the UN Security Council consolidated list.
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk/0.1 (personal research project)" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const byName = new Map(countries.map((c) => [norm(c.name), c.iso3]));
const ALIAS = { "israel": "ISR", "saint vincent and the grenadines": "VCT", "united republic of tanzania": "TZA", "region iran": "IRN", "the gambia": "GMB", "united states of america": "USA", "united kingdom of great britain and northern ireland": "GBR", "north macedonia the republic of": "MKD", "region gaza": "PSE", "region west bank": "PSE", "saint kitts and nevis": "KNA", "st kitts and nevis": "KNA", "hong kong sar china": "HKG", "macao": "MAC", "russia": "RUS", "iran": "IRN", "syria": "SYR", "burma": "MMR", "north korea": "PRK", "korea north": "PRK", "south korea": "KOR", "korea south": "KOR", "cote d ivoire": "CIV", "ivory coast": "CIV", "congo democratic republic of the": "COD", "democratic republic of the congo": "COD", "congo republic of the": "COG", "republic of the congo": "COG", "hong kong": "HKG", "macau": "MAC", "venezuela": "VEN", "cuba": "CUB", "vietnam": "VNM", "laos": "LAO", "turkey": "TUR", "turkiye": "TUR", "united states": "USA", "united kingdom": "GBR", "uae": "ARE", "united arab emirates": "ARE", "bolivia": "BOL", "tanzania": "TZA", "moldova": "MDA", "palestinian": "PSE", "west bank": "PSE", "gaza": "PSE", "yemen": "YEM", "egypt": "EGY", "gambia": "GMB", "bahamas": "BHS", "czech republic": "CZE", "czechia": "CZE", "slovakia": "SVK", "kyrgyzstan": "KGZ", "kosovo": "XKX", "brunei": "BRN", "taiwan": "TWN", "swaziland": "SWZ", "eswatini": "SWZ", "cape verde": "CPV", "macedonia": "MKD", "north macedonia": "MKD", "libya": "LBY", "sudan": "SDN", "south sudan": "SSD", "lebanon": "LBN", "iraq": "IRQ", "afghanistan": "AFG", "belarus": "BLR", "ukraine": "UKR", "china": "CHN", "germany": "DEU", "france": "FRA", "somalia": "SOM", "mali": "MLI", "nicaragua": "NIC", "zimbabwe": "ZWE", "cyprus": "CYP", "singapore": "SGP", "switzerland": "CHE", "netherlands": "NLD", "luxembourg": "LUX", "panama": "PAN", "mexico": "MEX", "colombia": "COL", "lebanon ": "LBN", "russian federation": "RUS", "syrian arab republic": "SYR", "islamic republic of iran": "IRN", "democratic people s republic of korea": "PRK", "republic of korea": "KOR", "viet nam": "VNM", "lao people s democratic republic": "LAO" };
const iso = (name) => { const n = norm(name); return ALIAS[n] ?? byName.get(n) ?? null; };
const ofac = {}, un = {}, miss = {};
const add = (m, code, id) => { (m[code] ??= new Set()).add(id); };

// OFAC: ADD.CSV = ent_num, add_num, address, city/state/postal, country, remarks (quoted CSV)
const csv = (line) => { const o = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { o.push(cur); cur = ""; } else cur += ch; } o.push(cur); return o; };
const addTxt = await (await fetch("https://www.treasury.gov/ofac/downloads/add.csv", { headers: UA })).text();
let oRows = 0;
for (const line of addTxt.split("\n")) { if (!line.trim()) continue; const c = csv(line); const country = (c[4] ?? "").trim(); if (!country || country === "-0-") continue; oRows++; const code = iso(country); if (code) add(ofac, code, c[0]); else miss[country] = (miss[country] ?? 0) + 1; }

// UN consolidated list (XML): address country, else nationality
const xml = await (await fetch("https://scsanctions.un.org/resources/xml/en/consolidated.xml", { headers: UA })).text();
let uN = 0;
for (const m of xml.matchAll(/<(INDIVIDUAL|ENTITY)>([\s\S]*?)<\/\1>/g)) {
  const body = m[2]; const id = body.match(/<DATAID>(\d+)<\/DATAID>/)?.[1] ?? String(uN); uN++;
  const names = [...body.matchAll(/<(?:INDIVIDUAL|ENTITY)_ADDRESS>[\s\S]*?<COUNTRY>([^<]+)<\/COUNTRY>/g)].map((x) => x[1]);
  const nat = [...body.matchAll(/<NATIONALITY>\s*<VALUE>([^<]+)<\/VALUE>/g)].map((x) => x[1]);
  for (const nm of (names.length ? names : nat)) { const code = iso(nm.replace(/\s*\(.*\)$/, "")); if (code) add(un, code, id); else miss[nm] = (miss[nm] ?? 0) + 1; }
}
const out = {}; for (const k of new Set([...Object.keys(ofac), ...Object.keys(un)])) out[k] = { ofac: ofac[k]?.size ?? 0, un: un[k]?.size ?? 0 };
writeFileSync(new URL("../public/data/sanctions.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), sources: { ofac: "US Treasury OFAC SDN (add.csv)", un: "UN Security Council consolidated list" }, countries: out }));
const top = Object.entries(out).sort((a, b) => b[1].ofac + b[1].un - (a[1].ofac + a[1].un)).slice(0, 8).map(([k, v]) => `${k} ofac:${v.ofac} un:${v.un}`);
console.log(`OFAC address rows ${oRows}, UN entries ${uN}, countries ${Object.keys(out).length}`); console.log("top:", top.join(" | "));
console.log("unmatched (top):", Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}=${v}`).join("; "));
