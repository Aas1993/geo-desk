// Builds public/data/media-tone.json: how each country's own media report on the UAE, from GDELT's raw event files (GDELT 2.0 Events, one file every 15 minutes).
// Method: take every event in which a UAE actor (Actor1/Actor2 country code ARE) appears, read its AvgTone (the average tone of the articles about the event) and attribute it to the
// country of the outlet named in SOURCEURL, using (1) the ~1,000 outlets, agencies and channels in public/data/layers and (2) country-code domains (.in, .uk, .ru ...).
// This replaces an earlier plan to query GDELT's DOC API per country, which answers 429 to most calls; the raw files are static downloads with no rate limit.
// What it measures: tone of event coverage, not stance. War and crime news reads negative whatever the attitude. Outlets on generic domains (.com) that are not in the
// outlet list cannot be attributed to a country and are left out of the per-country figures (they still count towards the world baseline).
// Usage: node scripts/build-media-tone.mjs [--days=45]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { unzipSync } from "fflate";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const DAYS = +(process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? 45);
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const byIso2 = new Map(countries.map((c) => [c.iso2.toLowerCase(), c.iso3]));
const host = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// domain -> country from the outlet datasets
const known = new Map();
for (const f of ["outlets", "channels", "thinktanks"]) { const j = JSON.parse(readFileSync(new URL(`../public/data/layers/${f}.geojson`, import.meta.url), "utf8")); for (const x of j.features) { const h = host(x.properties.url ?? ""); if (h && x.properties.iso3 && !known.has(h)) known.set(h, x.properties.iso3); } }
// country-code TLDs that are really generic or commercial, so they say nothing about the outlet's country
const GENERIC = new Set(["tv", "io", "co", "me", "fm", "ai", "to", "ws", "cc", "nu", "la", "ly", "gg", "im", "sh", "ac", "vc", "ms", "tk", "ml", "ga", "cf", "gq", "is", "gl", "su", "eu", "ag", "bz", "ps"]);
const countryOf = (h) => { if (known.has(h)) return known.get(h); const parts = h.split("."); for (let i = 1; i < parts.length - 1; i++) { const k = parts.slice(i).join("."); if (known.has(k)) return known.get(k); } const tld = parts.at(-1); if (tld.length === 2 && !GENERIC.has(tld)) return byIso2.get(tld === "uk" ? "gb" : tld) ?? null; return null; };

const head = await (await fetch("https://data.gdeltproject.org/gdeltv2/lastupdate.txt", { headers: UA, signal: AbortSignal.timeout(30_000) })).text();
const latest = head.match(/(\d{14})\.export/)?.[1]; if (!latest) { console.error("REFUSING TO WRITE: no GDELT index"); process.exit(1); }
const stamp = (t) => new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 14); const t0 = Date.UTC(+latest.slice(0, 4), +latest.slice(4, 6) - 1, +latest.slice(6, 8), +latest.slice(8, 10), +latest.slice(10, 12));
const names = Array.from({ length: DAYS * 96 }, (_, i) => stamp(t0 - i * 15 * 60_000));
const acc = new Map(); let all = { n: 0, s: 0 }, files = 0, missing = 0, events = 0, attributed = 0; const perDay = new Map(); // iso3 -> { n, s, days: Map<day,{n,s}> }
async function one(name) {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(`https://data.gdeltproject.org/gdeltv2/${name}.export.CSV.zip`, { headers: UA, signal: AbortSignal.timeout(40_000) }); if (r.status === 404) { missing++; return; } if (!r.ok) throw new Error(String(r.status));
      const first = Object.values(unzipSync(new Uint8Array(await r.arrayBuffer())))[0]; files++;
      for (const line of new TextDecoder().decode(first).split("\n")) { const c = line.split("\t"); if (c.length < 61 || (c[7] !== "ARE" && c[17] !== "ARE")) continue; const tone = +c[34]; if (!Number.isFinite(tone) || !c[60]) continue; events++; all.n++; all.s += tone;
        const iso = countryOf(host(c[60]) ?? ""); if (!iso || iso === "ARE") continue; attributed++; const e = acc.get(iso) ?? { n: 0, s: 0, d: new Map() }; e.n++; e.s += tone; const day = c[59].slice(0, 8); const d = e.d.get(day) ?? { n: 0, s: 0 }; d.n++; d.s += tone; e.d.set(day, d); acc.set(iso, e); }
      return; } catch { await sleep(600 * (a + 1)); }
  }
  missing++;
}
const t = Date.now(); let next = 0; await Promise.all(Array.from({ length: 8 }, async () => { while (next < names.length) { const i = next++; await one(names[i]); if (i % 300 === 0) console.log(`  ${i}/${names.length} files, ${events} UAE events so far`); } }));
console.log(`files ${files} (missing ${missing}) in ${Math.round((Date.now() - t) / 1000)}s | UAE events ${events} | attributed to a country ${attributed} (${((attributed / events) * 100).toFixed(0)}%)`);
if (files < names.length * 0.8 || events < 2000) { console.error(`REFUSING TO WRITE: ${files}/${names.length} files, ${events} events`); process.exit(1); }
const MIN = 20; const out = {};
for (const [iso, e] of acc) { if (e.n < MIN) { out[iso] = { avg: null, points: e.n }; continue; } const days = [...e.d.keys()].sort(); const third = Math.max(1, Math.floor(days.length / 3)); const mean = (ds) => { let n = 0, s = 0; for (const d of ds) { n += e.d.get(d).n; s += e.d.get(d).s; } return n ? s / n : 0; };
  out[iso] = { avg: +(e.s / e.n).toFixed(2), points: e.n, trend: days.length >= 6 ? +(mean(days.slice(-third)) - mean(days.slice(0, third))).toFixed(2) : undefined, at: new Date().toISOString().slice(0, 10) }; }
const measured = Object.values(out).filter((v) => v.avg != null).length; if (measured < 25) { console.error(`REFUSING TO WRITE: only ${measured} countries reach ${MIN} events`); process.exit(1); }
const prevFile = new URL("../public/data/media-tone.json", import.meta.url); const prevTone = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, "utf8")) : null; const world = all.s / all.n;
if (prevTone?.global?.avg != null && Math.abs(world - prevTone.global.avg) > 3) { console.error(`REFUSING TO WRITE: world tone moved from ${prevTone.global.avg} to ${world.toFixed(2)}`); process.exit(1); }
writeFileSync(prevFile, JSON.stringify({ built: new Date().toISOString(), days: DAYS, minEvents: MIN, source: { name: "GDELT 2.0 Events: tone of events involving UAE actors, attributed to the reporting outlet's country", url: "https://www.gdeltproject.org/", note: "Tone of event coverage, not stance. Attribution is by known outlet or country-code domain, so outlets on generic domains are not attributed. Countries with fewer than 20 events are left empty." }, coverage: { measured, total: countries.length - 1 }, global: { avg: +(all.s / all.n).toFixed(2), points: all.n }, countries: out }));
const ranked = Object.entries(out).filter(([, v]) => v.avg != null).sort((a, b) => a[1].avg - b[1].avg); console.log(`measured ${measured} countries | world avg ${(all.s / all.n).toFixed(2)}`);
console.log("coolest:", ranked.slice(0, 8).map(([k, v]) => `${k} ${v.avg} (n${v.points})`).join(" ")); console.log("warmest:", ranked.slice(-8).map(([k, v]) => `${k} ${v.avg} (n${v.points})`).join(" ")); console.log("most events:", Object.entries(out).sort((a, b) => b[1].points - a[1].points).slice(0, 8).map(([k, v]) => `${k} n${v.points}`).join(" "));
