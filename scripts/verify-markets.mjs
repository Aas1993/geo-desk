// Verifies a Twelve Data key against the real ADX/DFM universe and fixes vendor-ticker mismatches.
//   node scripts/verify-markets.mjs                 # probe plan + endpoints, then check every listing
//   node scripts/verify-markets.mjs --only=DFM      # one exchange
//   node scripts/verify-markets.mjs --limit=16      # first N listings per exchange (quick smoke test)
//   node scripts/verify-markets.mjs --skip-fundamentals --no-write
// Writes public/data/vendor-map.json (alias fixes / "no data" flags, read by the server) and public/data/vendor-report.json.
// The key is read from .env.local and never printed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const flag = (n) => process.argv.includes(`--${n}`);
const env = {};
if (existsSync(new URL("../.env.local", import.meta.url))) for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const KEY = process.env.TWELVEDATA_API_KEY || env.TWELVEDATA_API_KEY;
if (!KEY || KEY === "demo") { console.error("No TWELVEDATA_API_KEY in .env.local (the public 'demo' key only covers US symbols).\nAdd it, then re-run:  node scripts/verify-markets.mjs"); process.exit(1); }

const BASE = process.env.TD_BASE ?? "https://api.twelvedata.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let RPM = Number(env.TWELVEDATA_RPM || process.env.TWELVEDATA_RPM) || 8; // credits per minute
const spent = []; // [timestamp, credits]
async function spend(n) { // sliding 60 s window
  for (;;) { const now = Date.now(); while (spent.length && now - spent[0][0] > 60000) spent.shift(); const used = spent.reduce((a, s) => a + s[1], 0); if (used + n <= RPM) break; await sleep(Math.max(500, 60000 - (now - spent[0][0]) + 200)); }
  spent.push([Date.now(), n]);
}
async function td(path, params, cost = 1) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await spend(Math.min(cost, RPM));
    const q = new URLSearchParams({ ...params, apikey: KEY }); const r = await fetch(`${BASE}/${path}?${q}`); const j = await r.json().catch(() => ({ code: r.status, message: "non-JSON response", status: "error" }));
    if (j.code === 429) { console.log("  …rate-limited, waiting 30 s"); await sleep(30000); continue; }
    return j;
  }
  return { code: 429, message: "rate limit persisted", status: "error" };
}
const err = (j) => (j && (j.status === "error" || typeof j.code === "number") ? `${j.code ?? ""} ${String(j.message ?? "").slice(0, 140)}`.trim() : null);
const rows = JSON.parse(readFileSync(new URL("../public/data/markets.json", import.meta.url), "utf8")).rows;
const only = arg("only"); const limit = Number(arg("limit")) || Infinity;
const list = ["ADX", "DFM"].filter((e) => !only || e === only.toUpperCase()).flatMap((e) => rows.filter((r) => r.exchange === e).slice(0, limit));
const MIC = { ADX: "XADS", DFM: "XDFM" };

console.log("== 1. Plan and credits");
const usage = await fetch(`${BASE}/api_usage?apikey=${KEY}`).then((r) => r.json()).catch(() => null);
if (usage && !err(usage)) {
  console.log(`   plan: ${usage.plan_category ?? usage.plan ?? "?"} | credits/min limit: ${usage.plan_limit ?? "?"} | used this minute: ${usage.current_usage ?? "?"} | daily limit: ${usage.daily_limit ?? "?"} | used today: ${usage.daily_usage ?? "?"}`);
  if (!env.TWELVEDATA_RPM && Number(usage.plan_limit) > 0) { RPM = Number(usage.plan_limit); console.log(`   pacing at ${RPM} credits/min from your plan (set TWELVEDATA_RPM in .env.local to match)`); }
} else console.log("   could not read /api_usage:", err(usage) ?? "no response", "— pacing at", RPM, "credits/min");
console.log(`   ${list.length} listings to check ≈ ${Math.ceil(list.length / RPM)} min at ${RPM} credits/min`);

console.log("\n== 2. Is each exchange covered, and which datasets does your plan include?");
const probes = [{ ex: "ADX", sym: "ADCB" }, { ex: "DFM", sym: "EMAAR" }].filter((p) => list.some((l) => l.exchange === p.ex));
const endpoints = [["quote", {}], ["time_series", { interval: "1day", outputsize: 5 }], ...(flag("skip-fundamentals") ? [] : [["statistics", {}], ["profile", {}], ["income_statement", { period: "annual" }], ["balance_sheet", { period: "annual" }], ["cash_flow", { period: "annual" }], ["dividends", { range: "5y" }], ["earnings", { outputsize: 4 }]])];
const coverage = {};
for (const p of probes) for (const [ep, extra] of endpoints) {
  const cost = ["statistics", "income_statement", "balance_sheet", "cash_flow"].includes(ep) ? 1 : 1;
  const j = await td(ep, { symbol: p.sym, mic_code: MIC[p.ex], ...extra }, cost); const e = err(j);
  coverage[`${p.ex}:${ep}`] = e ? `FAIL  ${e}` : "ok"; console.log(`   ${p.ex} ${p.sym.padEnd(7)} ${ep.padEnd(17)} ${e ? "✗ " + e : "✓"}`);
}
const covFail = Object.values(coverage).filter((v) => v !== "ok").length;

console.log("\n== 3. Quote check for every listing (alias retry on failure)");
const found = {}; const bad = []; const stale = []; const today = Date.now();
const check = (l, sym, q) => { const price = Number(q.close); if (!(price > 0)) return "no price"; const age = (today - Date.parse(q.datetime)) / 864e5; if (age > 10) stale.push(`${l.exchange}:${sym} (${q.datetime})`); if (q.currency && q.currency !== "AED") return `currency ${q.currency}`; return null; };
for (const ex of ["ADX", "DFM"]) {
  const ls = list.filter((l) => l.exchange === ex); const failed = [];
  for (let i = 0; i < ls.length; i += RPM) {
    const chunk = ls.slice(i, i + RPM);
    const j = await td("quote", { symbol: chunk.map((l) => l.symbol).join(","), mic_code: MIC[ex] }, chunk.length);
    const map = chunk.length === 1 || j.symbol ? { [chunk[0].symbol]: j } : j;
    for (const l of chunk) { const q = map[l.symbol]; const e = !q ? "missing in batch response" : err(q) ?? check(l, l.symbol, q); if (e) failed.push([l, e]); else found[`${ex}:${l.symbol}`] = { symbol: l.symbol, price: Number(q.close), asOf: q.datetime }; }
    process.stdout.write(`\r   ${ex}: ${Math.min(i + RPM, ls.length)}/${ls.length}   `);
  }
  console.log();
  for (const [l, e] of failed) {
    let fixed = null;
    for (const a of l.aliases ?? []) { const q = await td("quote", { symbol: a, mic_code: MIC[ex] }); if (!err(q) && !check(l, a, q)) { fixed = a; found[`${ex}:${l.symbol}`] = { symbol: a, price: Number(q.close), asOf: q.datetime }; break; } }
    if (fixed) console.log(`   ✓ ${ex}:${l.symbol} had no data (${e}) — alias ${fixed} works → will map`);
    else { bad.push({ key: `${ex}:${l.symbol}`, name: l.name, reason: e, triedAliases: l.aliases ?? [] }); console.log(`   ✗ ${ex}:${l.symbol} ${l.name} — ${e}${l.aliases ? ` (also tried ${l.aliases.join(", ")})` : ""}`); }
  }
}
const okN = Object.keys(found).length; const aliasFixes = Object.entries(found).filter(([k, v]) => v.symbol !== k.split(":")[1]);

console.log(`\n== Summary\n   quotable: ${okN}/${list.length}   alias fixes: ${aliasFixes.length}   no vendor data: ${bad.length}   stale (>10 days): ${stale.length}   dataset failures on probe symbols: ${covFail}`);
if (stale.length) console.log("   stale:", stale.slice(0, 10).join(", "), stale.length > 10 ? "…" : "");
if (!flag("no-write")) {
  const mapPath = new URL("../public/data/vendor-map.json", import.meta.url); const map = {};
  for (const [k, v] of aliasFixes) map[k] = { vendorSymbol: v.symbol };
  for (const b of bad) map[b.key] = { noVendorData: true };
  writeFileSync(mapPath, JSON.stringify(map, null, 1));
  writeFileSync(new URL("../public/data/vendor-report.json", import.meta.url), JSON.stringify({ at: new Date().toISOString(), rpm: RPM, coverage, found, bad, stale }, null, 1));
  console.log("   wrote public/data/vendor-map.json and vendor-report.json (restart `npm run dev` to pick up the map)");
}
if (covFail) console.log("\n   Some datasets failed on the probe symbols. Messages mentioning a plan/upgrade mean that dataset isn't in your Twelve Data plan — the app will show 'not included in the current plan' for it, everything else keeps working.");
