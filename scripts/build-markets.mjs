// Builds public/data/markets.json — the ADX + DFM + QSE (Qatar Stock Exchange, Boursa Qatar) listing universe.
//  - Symbols/names: Twelve Data reference lists (open, no key).
//  - DFM tickers are validated against DFM's own disclosure feed (efsah_count); vendor aliases such as
//    AIRA (vs the official AIRARABIA) return 0 filings and are dropped when a sibling with the same name validates.
//  - ADX has no compliant public automated source, so ADX entries come from the vendor list only.
//  - QSE comes from the vendor list (exchange code QE, MIC DSMD). Vendor placeholders such as "AHCS@S" are dropped. No exchange disclosure feed is used (qe.com.qa asks robots not to read its documents).
import { writeFileSync } from "node:fs";
const TD = "https://api.twelvedata.com/stocks?country=United%20Arab%20Emirates&exchange=";
const DFM = "https://api2.dfm.ae/efsah/v1";
const j = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const dfmJson = async (u) => { for (let i = 0; i < 4; i++) { try { const t = (await (await fetch(u)).text()).replace(/^﻿/, ""); return JSON.parse(t); } catch { await new Promise((r) => setTimeout(r, 500 * (i + 1))); } } throw new Error("dfm " + u); };
const norm = (s) => s.toLowerCase().replace(/\b(pjsc|psc|p\.j\.s\.c|ksc[cp]?|co|company|the|public|joint|stock|\(.*?\))\b/g, "").replace(/[^a-z0-9]/g, "");

const [adx, dfm, qse] = await Promise.all([j(TD + "ADX"), j(TD + "DFM"), j("https://api.twelvedata.com/stocks?country=Qatar")]);
const rows = [];
for (const s of adx.data) rows.push({ exchange: "ADX", symbol: s.symbol, name: s.name, currency: s.currency, type: s.type, mic: s.mic_code });

// validate DFM symbols
// Vendor ticker -> DFM feed ticker where they differ (checked by hand against efsah_count).
const FEED_ALIAS = { ENBD: "EMIRATESNBD" };
const dfmRows = [];
for (const s of dfm.data) {
  const fs = FEED_ALIAS[s.symbol] ?? s.symbol;
  const c = (await dfmJson(`${DFM}/efsah_count?lang=en&symbol=${encodeURIComponent(fs)}`)).root?.[0]?.count ?? 0;
  let nameAr = null;
  if (c > 0) { const p = await dfmJson(`${DFM}/prototype_efsah?lang=en&symbol=${encodeURIComponent(fs)}&take=1&skip=0`); const rec = p.root?.[0]; if (rec && rec.issuer_symbol === fs) nameAr = rec.issuer_ar?.replace(/^[A-Z0-9]+ - /, "") ?? null; }
  dfmRows.push({ exchange: "DFM", symbol: s.symbol, name: s.name, nameAr, currency: s.currency, type: s.type, mic: s.mic_code, filings: c, feedSymbol: c > 0 ? fs : null });
}
const validNames = new Set(dfmRows.filter((r) => r.filings > 0).map((r) => norm(r.name)));
let dropped = []; const aliasOf = {};
for (const r of dfmRows) if (r.filings === 0 && validNames.has(norm(r.name))) { const keep = dfmRows.find((k) => k.filings > 0 && norm(k.name) === norm(r.name)); (aliasOf[keep.symbol] ??= []).push(r.symbol); }
for (const r of dfmRows) {
  if (r.filings === 0 && validNames.has(norm(r.name))) { dropped.push(r.symbol); continue; }
  const { filings, ...rest } = r; rows.push({ ...rest, dfmFeed: filings > 0, ...(aliasOf[r.symbol] ? { aliases: aliasOf[r.symbol] } : {}) });
}
const seenQ = new Set();
for (const s of qse.data ?? []) { if (!/^[A-Z0-9]{3,6}$/.test(s.symbol) || s.name === s.symbol || s.mic_code !== "DSMD" || s.currency !== "QAR" || seenQ.has(s.symbol)) continue; seenQ.add(s.symbol); rows.push({ exchange: "QSE", symbol: s.symbol, name: s.name, currency: s.currency, type: s.type, mic: s.mic_code }); }
if (rows.filter((r) => r.exchange === "QSE").length < 40) { console.error("REFUSING TO WRITE: only", rows.filter((r) => r.exchange === "QSE").length, "Qatar listings"); process.exit(1); }
rows.sort((a, b) => a.exchange.localeCompare(b.exchange) || a.symbol.localeCompare(b.symbol));
writeFileSync(new URL("../public/data/markets.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), rows }));
const by = (e) => rows.filter((r) => r.exchange === e);
console.log("QSE", by("QSE").length, "|", "ADX", by("ADX").length, "| DFM", by("DFM").length, "(feed-validated:", by("DFM").filter((r) => r.dfmFeed).length + ")", "| dropped aliases:", dropped.join(","));
console.log("DFM without a feed match:", by("DFM").filter((r) => !r.dfmFeed).map((r) => r.symbol + "=" + r.name).join(" ; "));
