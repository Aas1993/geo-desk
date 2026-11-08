// Builds public/data/ransomware.json: how many organisations per country were posted on ransomware leak sites, from ransomware.live's open feed.
// Deliberately NOT stored: the victim organisations' names. Leak-site posts are extortion; repeating names would amplify the harm to victims. Counts, sectors and
// group names are enough for a country-risk picture, and every view links to ransomware.live for anyone with a need to know more.
import { writeFileSync, readFileSync } from "node:fs";
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const iso3 = new Map(countries.map((c) => [c.iso2, c.iso3]));
const r = await fetch("https://data.ransomware.live/victims.json", { headers: { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" }, signal: AbortSignal.timeout(180_000) }); if (!r.ok) throw new Error(`ransomware.live ${r.status}`);
const all = await r.json(); if (!Array.isArray(all) || all.length < 5000) { console.error(`REFUSING TO WRITE: only ${all.length} records`); process.exit(1); }
const day = (n) => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10); const c30 = day(30), c7 = day(7), c90 = day(90);
const out = {}; let world30 = 0, unknown30 = 0; const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ name: k, n: v }));
for (const x of all) {
  const d = (x.discovered ?? "").slice(0, 10); if (d < c90) continue; const code = iso3.get((x.country ?? "").toUpperCase());
  if (d >= c30) { world30++; if (!code) unknown30++; } if (!code) continue; const c = (out[code] ??= { n7: 0, n30: 0, n90: 0, sectors: new Map(), groups: new Map(), last: "" });
  c.n90++; if (d >= c30) { c.n30++; c.sectors.set(x.activity || "Unknown", (c.sectors.get(x.activity || "Unknown") ?? 0) + 1); c.groups.set(x.group_name || "unknown", (c.groups.get(x.group_name || "unknown") ?? 0) + 1); } if (d >= c7) c.n7++; if (d > c.last) c.last = d;
}
const res = Object.fromEntries(Object.entries(out).map(([k, c]) => [k, { n7: c.n7, n30: c.n30, n90: c.n90, last: c.last, sectors: top(c.sectors, 4), groups: top(c.groups, 3) }]));
if (Object.keys(res).length < 50) { console.error("REFUSING TO WRITE: too few countries"); process.exit(1); }
writeFileSync(new URL("../public/data/ransomware.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), source: { name: "ransomware.live open victims feed", url: "https://www.ransomware.live", note: "Counts of organisations named on ransomware leak sites, by discovery date and country. Victim names are not stored." }, world30, unknown30, countries: res }));
console.log("countries", Object.keys(res).length, "world 30d", world30, "unknown country", unknown30); console.log("UAE:", JSON.stringify(res.ARE)); console.log("top 30d:", Object.entries(res).sort((a, b) => b[1].n30 - a[1].n30).slice(0, 6).map(([k, v]) => `${k}:${v.n30}`).join(" "));
