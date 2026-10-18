// Builds public/data/media-tone.json: how each country's own media cover the UAE, as GDELT's average article tone over the last 30 days.
// IMPORTANT: this is the TONE of coverage that mentions the UAE, not a measure of stance toward it. Conflict-heavy news reads negative whatever the attitude.
// Use it to compare media ecosystems against the world average; the AI stance read in the app is what judges attitude.
//
// GDELT's DOC API is rate-limited and flaky (roughly half of requests get a 429, each taking ~10 s), so this is INCREMENTAL by design:
// it works through countries stalest-first within a time budget (MAX_MINUTES, default 100), keeps every earlier measurement it could not refresh,
// and writes after each success. Each scheduled run therefore improves the dataset instead of being all-or-nothing.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/json" };
const OUT = new URL("../public/data/media-tone.json", import.meta.url);
const MAX_MS = (+process.env.MAX_MINUTES || 100) * 60_000; const started = Date.now(); const left = () => MAX_MS - (Date.now() - started);
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).filter((c) => c.iso3 !== "ARE");
const fips = JSON.parse(readFileSync(new URL("../public/data/fips.json", import.meta.url), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${String(Math.round((Date.now() - started) / 1000)).padStart(5)}s]`, ...a);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/** One timeline lookup with a few patient retries. Returns an array of daily tone values, or null if GDELT would not answer. */
async function timeline(query) {
  const url = "https://api.gdeltproject.org/api/v2/doc/doc?" + new URLSearchParams({ query, mode: "timelinetone", format: "json", timespan: "30d" });
  for (let attempt = 1; attempt <= 4 && left() > 30_000; attempt++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45_000) }); const t = await r.text(); if (r.ok && t.startsWith("{")) return (JSON.parse(t).timeline?.[0]?.data ?? []).map((p) => p.value).filter(Number.isFinite); } catch { /* retry */ }
    await sleep(9_000 + attempt * 3_000);
  }
  return null;
}
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { countries: {}, global: null };
const state = { countries: { ...(prev.countries ?? {}) }, global: prev.global };
const save = () => { const measured = Object.values(state.countries).filter((v) => v.avg != null).length; writeFileSync(OUT, JSON.stringify({ built: new Date().toISOString(), source: { name: "GDELT DOC 2.0, average tone of articles mentioning the UAE, by source country, 30 days", url: "https://www.gdeltproject.org/", note: "Tone of coverage, not stance. Compared with the world average; countries with fewer than 6 data points are left out. Built incrementally: each run refreshes the stalest countries first." }, coverage: { measured, total: countries.length }, global: state.global, countries: state.countries })); return measured; };

// the world baseline is essential, so it gets many more patient attempts than a single country does
let base = null; for (let i = 0; i < 8 && !base?.length && left() > 60_000; i++) { base = await timeline('"United Arab Emirates"'); if (!base?.length) await sleep(15_000); }
if (base?.length) state.global = { avg: +mean(base).toFixed(2), points: base.length, at: new Date().toISOString().slice(0, 10) }; else if (!state.global) { console.error("REFUSING TO WRITE: no global baseline yet"); process.exit(1); }
log("global baseline", state.global.avg);
// stalest first; never-measured countries lead
const queue = countries.filter((c) => fips[c.iso3]).sort((a, b) => (state.countries[a.iso3]?.at ?? "") .localeCompare(state.countries[b.iso3]?.at ?? ""));
let ok = 0, thin = 0, retry = [];
const one = async (c) => {
  await sleep(6_000); const v = await timeline(`"United Arab Emirates" sourcecountry:${fips[c.iso3]}`); if (v === null) return false;
  const at = new Date().toISOString().slice(0, 10);
  if (v.length < 4) { state.countries[c.iso3] = { avg: null, points: v.length, at }; thin++; log(c.iso3, "thin", v.length); return true; }
  const third = Math.max(1, Math.floor(v.length / 3)); state.countries[c.iso3] = { avg: +mean(v).toFixed(2), points: v.length, trend: +(mean(v.slice(-third)) - mean(v.slice(0, third))).toFixed(2), at }; ok++; log(c.iso3, state.countries[c.iso3].avg, `(${v.length} pts)`); return true;
};
for (const c of queue) { if (left() < 60_000) break; if (!(await one(c))) retry.push(c); else save(); }
for (const c of retry) { if (left() < 60_000) break; log("retry", c.iso3); if (await one(c)) save(); }
const measured = save(); const ranked = Object.entries(state.countries).filter(([, v]) => v.avg != null && v.points >= 6).sort((a, b) => a[1].avg - b[1].avg);
log(`done: ${ok} refreshed, ${thin} thin, ${measured} measured in total of ${countries.length}; global ${state.global.avg}`);
if (measured < 30) { console.error("Too few countries measured to be useful yet; the file was written but the layer will look sparse."); }
console.log("coolest:", ranked.slice(0, 6).map(([k, v]) => `${k} ${v.avg}`).join(" ")); console.log("warmest:", ranked.slice(-6).map(([k, v]) => `${k} ${v.avg}`).join(" "));
