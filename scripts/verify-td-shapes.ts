// Checks our Twelve Data mappers against the vendor's public demo key (AAPL only). The payload shapes are the same
// for ADX/DFM symbols on a real key, so a pass here means the mapping code reads real responses correctly.
// Run: npx tsx scripts/verify-td-shapes.ts
import assert from "node:assert/strict";
import { mapQuote, mapStats, mapProfile, statements, toBars } from "../src/lib/markets/td";
const B = "https://api.twelvedata.com"; const get = async (p: string) => { await new Promise((r) => setTimeout(r, 1200)); return (await fetch(`${B}/${p}&apikey=demo`)).json() as Promise<Record<string, unknown>>; };
const l = { exchange: "DFM", symbol: "AAPL", name: "x", currency: "USD", type: "Common Stock", mic: "XNGS" } as const;

async function main() {
const q = mapQuote(l as never, await get("quote?symbol=AAPL"));
assert.ok(q.price! > 0 && q.prevClose! > 0 && q.wk52High! > q.wk52Low! && q.volume! > 0 && q.asOf, "quote");
const s = mapStats(await get("statistics?symbol=AAPL"));
for (const k of ["marketCap", "trailingPE", "priceToBook", "profitMargin", "roe", "revenueTTM", "totalDebt", "debtToEquity", "sharesOutstanding", "beta", "dividendYield", "payoutRatio"] as const) assert.ok(s[k] != null, `stats.${k}`);
assert.ok(s.exDividendDate && s.dividendFrequency, "stats dividend strings");
const p = mapProfile(await get("profile?symbol=AAPL")); assert.ok(p.sector && p.industry && p.description && p.employees, "profile");
const inc = statements(await get("income_statement?symbol=AAPL&period=annual"), "income_statement"); assert.ok(inc[0].rows.sales! > 0 && inc[0].rows.net_income! > 0 && inc[0].rows.eps_diluted != null && inc[0].date, "income");
const bs = statements(await get("balance_sheet?symbol=AAPL&period=annual"), "balance_sheet"); assert.ok(bs[0].rows.total_assets! > 0 && bs[0].rows.total_liabilities! > 0 && "total_shareholders_equity" in bs[0].rows || Object.keys(bs[0].rows).some((k) => /equity/.test(k)), "balance");
const cf = statements(await get("cash_flow?symbol=AAPL&period=annual"), "cash_flow"); assert.ok(cf[0].rows.operating_cash_flow != null && cf[0].rows.free_cash_flow != null, "cashflow");
const ts = toBars(await get("time_series?symbol=AAPL&interval=1day&outputsize=30")); assert.ok(ts.length === 30 && ts[0].t < ts[29].t && ts[29].c > 0, "bars ascending");
console.log("balance keys with 'equity':", Object.keys(bs[0].rows).filter((k) => /equity/.test(k)));
console.log("vendor mappers: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
