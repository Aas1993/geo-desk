// Builds public/data/deals-xcheck.json: for each UAE deal in deals.json (WAM headlines), who else carries it.
// Second publishers: RSS feeds of The National, Arab News, Al Jazeera and Economy Middle East (each feed only holds its latest few days), and GDELT's open article search (publishers worldwide, about the last 90 days).
// Company and exchange filings: the DFM disclosure ("efsah") feed, for deals whose investor is a DFM-listed company. ADX and the SCA have no compliant automated path and are listed as unavailable.
// Rules: only what a source returned is stored; evidence accumulates between runs (a deal that scrolled out of a feed keeps the hit it already had); `checked` records which sources actually looked at a deal, so a deal no source could reach stays a gap rather than reading as "not corroborated".
// The matching rules live in src/lib/corroboration.ts (tested). Usage: node scripts/build-deals-xcheck.mjs   (XC_NO_GDELT=1 skips the slow GDELT step)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { matchDeal, isSyndicated, inWindow, fold } from "../src/lib/corroboration.ts";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const D = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deals = D("deals.json").items; const countries = D("countries.json"); const nameOf = new Map(countries.map((c) => [c.iso3, [c.name, ...(c.aka ?? [])]]));
const OUT = new URL("../public/data/deals-xcheck.json", import.meta.url);
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { items: {} };
const items = structuredClone(prev.items ?? {}); const todayIso = new Date().toISOString().slice(0, 10);
const sources = {}; const unavailable = [];
const src = (id, o) => (sources[id] = { id, status: "failed", rows: 0, ...o });
const ent = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e]);
const text = (s) => ent(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const names = (deal) => deal.c.flatMap((c) => nameOf.get(c) ?? []);
const record = (deal, hit) => {
  const e = (items[deal.u] ??= { hits: [], checked: [] }); if (e.hits.some((h) => h.p === hit.p && h.url === hit.url)) return false;
  e.hits.push({ ...hit, syndicated: isSyndicated(deal.t, hit.title) || undefined }); return true;
};
const checked = (deal, id) => { const e = (items[deal.u] ??= { hits: [], checked: [] }); if (!e.checked.includes(id)) e.checked.push(id); };

// 1. RSS feeds of other publishers
const FEEDS = [
  { id: "thenational", name: "The National", publisher: "The National (Abu Dhabi)", urls: ["https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml", "https://www.thenationalnews.com/arc/outboundfeeds/rss/category/business/?outputType=xml"], site: "https://www.thenationalnews.com/" },
  { id: "arabnews", name: "Arab News", publisher: "Arab News (Saudi Research and Media Group)", urls: ["https://www.arabnews.com/rss.xml"], site: "https://www.arabnews.com/" },
  { id: "aljazeera", name: "Al Jazeera", publisher: "Al Jazeera Media Network (Qatar)", urls: ["https://www.aljazeera.com/xml/rss/all.xml"], site: "https://www.aljazeera.com/" },
  { id: "economymiddleeast", name: "Economy Middle East", publisher: "Economy Middle East", urls: ["https://economymiddleeast.com/feed/"], site: "https://economymiddleeast.com/" },
];
for (const f of FEEDS) {
  src(f.id, { name: f.name, publisher: f.publisher, kind: "news", url: f.site, basis: "Publisher's own RSS feed: only the latest items it holds, so only recent deals can be checked", note: "A feed holds a few days at most. A deal older than the feed's oldest item is marked as not checkable against it." });
  const arts = [];
  for (const u of f.urls) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40_000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const xml = await r.text();
      for (const m of xml.matchAll(/<item[ >]([\s\S]*?)<\/item>/g)) {
        const g = (t) => m[1].match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1]; const title = g("title"), link = g("link"), pub = g("pubDate"); if (!title || !link || !pub || Number.isNaN(Date.parse(pub))) continue;
        arts.push({ title: text(title), url: text(link), summary: text(g("description") ?? "").slice(0, 600), date: new Date(pub).toISOString().slice(0, 10) });
      }
    } catch (e) { console.error(f.id, "feed failed:", e.message); }
    await sleep(500);
  }
  if (!arts.length) { unavailable.push({ name: f.name, url: f.site, reason: "The RSS feed could not be read at build time." }); continue; }
  const dates = arts.map((a) => a.date).sort(); const from = dates[0], to = dates[dates.length - 1]; Object.assign(sources[f.id], { status: "ok", rows: arts.length, from, to });
  let n = 0; for (const deal of deals) {
    if (!inWindow(deal.d, from, to)) continue; checked(deal, f.id);
    for (const a of arts) { if (!/^https:\/\//.test(a.url)) continue; const m = matchDeal(deal, a, names(deal)); if (m.ok && record(deal, { p: f.id, name: f.name, kind: "news", url: a.url, title: a.title, d: a.date })) n++; }
  }
  console.log(f.id, "items", arts.length, from, "to", to, "| new hits", n);
}

// 2. DFM disclosures, for deals whose investor is a DFM-listed company
src("dfm", { name: "DFM disclosures (efsah)", publisher: "Dubai Financial Market: disclosures filed by listed companies", kind: "filing", url: "https://www.dfm.ae/", basis: "Company filings to the exchange, read from DFM's open disclosure feed", note: "Only deals whose investor is a DFM-listed company can be checked here; most UAE state investors are unlisted or listed on ADX." });
const dfmJson = async (u) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) }); if (r.ok) return JSON.parse((await r.text()).replace(/^﻿/, "")); } catch { /* retry */ } await sleep(600 * (i + 1)); } throw new Error("dfm " + u); };
const dfmDate = (s) => { const m = s.trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/); if (!m) return null; const mo = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].toLowerCase()); return mo < 0 ? null : `${m[3]}-${String(mo + 1).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`; };
try {
  const rows = D("markets.json").rows.filter((r) => r.exchange === "DFM" && r.dfmFeed); const strip = (s) => fold(s).replace(/\b(pjsc|psc|plc|pj s c|p j s c|co|company|bank)\b/g, "").replace(/\s+/g, " ").trim();
  const issuerOf = (by) => rows.find((r) => fold(r.symbol) === fold(by) || (strip(by).length >= 5 && strip(r.name) === strip(by)));
  const wanted = new Map(); for (const d of deals) for (const b of d.by) { const r = issuerOf(b); if (r) (wanted.get(r.feedSymbol ?? r.symbol) ?? wanted.set(r.feedSymbol ?? r.symbol, { row: r, deals: [] }).get(r.feedSymbol ?? r.symbol)).deals.push(d); }
  let n = 0, read = 0;
  for (const [sym, { row, deals: ds }] of wanted) {
    const oldest = ds.map((d) => d.d).sort()[0]; const filings = [];
    for (let skip = 0; skip < 200; skip += 20) {
      const p = await dfmJson(`https://api2.dfm.ae/efsah/v1/prototype_efsah?lang=en&symbol=${encodeURIComponent(sym)}&take=20&skip=${skip}`); const root = (p.root ?? []).filter((r) => r.issuer_symbol === sym); if (!root.length) break;
      for (const r of root) { const date = dfmDate(r.publication_date); if (date) filings.push({ id: r.id, title: r.headline, date }); }
      if (root.length < 20 || (filings.at(-1)?.date ?? "9") < oldest) break; await sleep(300);
    }
    read += filings.length;
    for (const deal of ds) {
      checked(deal, "dfm");
      for (const f of filings) { const m = matchDeal(deal, { title: `${row.name} ${row.symbol} ${f.title}`, date: f.date }, names(deal)); if (m.ok && record(deal, { p: `dfm:${sym}`, name: `${row.name} (DFM disclosure)`, kind: "filing", url: `https://www.dfm.ae/the-exchange/news-disclosures/disclosures`, title: f.title, d: f.date })) n++; }
    }
    console.log("DFM", sym, "deals", ds.length, "filings read", filings.length);
  }
  Object.assign(sources.dfm, { status: wanted.size ? "ok" : "failed", rows: read }); console.log("DFM listed investors with deals:", wanted.size, "| new hits", n);
  if (!wanted.size) unavailable.push({ name: "DFM disclosures", url: "https://www.dfm.ae/", reason: "No deal in deals.json names a DFM-listed investor." });
} catch (e) { console.error("DFM failed:", e.message); unavailable.push({ name: "DFM disclosures (efsah)", url: "https://www.dfm.ae/", reason: `The feed could not be read: ${e.message}` }); }
unavailable.push({ name: "ADX announcements", url: "https://www.adx.ae/", reason: "ADX's terms of use prohibit systematic retrieval and it blocks non-browser clients; there is no compliant automated path without a commercial agreement. ADX-listed investors (AD Ports, ADNOC units, Alpha Dhabi, Space42, TAQA and others) cannot be checked against filings." });
unavailable.push({ name: "SCA (Securities and Commodities Authority) disclosures", url: "https://www.sca.gov.ae/", reason: "The regulator publishes news and circulars, not a feed of issuers' disclosures, so there is nothing machine-readable to match deals against." });
unavailable.push({ name: "Non-listed investors' own filings (ADQ, Mubadala, MGX, EDGE, Masdar, DP World and similar)", url: "https://www.wam.ae/en", reason: "Unlisted or state-owned investors file no public exchange disclosures; their own press releases are what WAM carries, so they are not independent of the WAM item." });

// 3. GDELT article search: publishers worldwide over roughly the last 90 days, one query per deal (GDELT asks for one request every five seconds)
if (!process.env.XC_NO_GDELT) {
  src("gdelt", { name: "GDELT article search", publisher: "GDELT Project: news articles from publishers worldwide, matched by company and deal wording", kind: "news", url: "https://www.gdeltproject.org/", basis: "Open index of online news; each hit is credited to the publisher's own domain", note: "Covers about the last 90 days only and mostly English-language outlets. A deal is checked once; a failed query is retried on the next run." });
  const cut = new Date(Date.now() - 88 * 86400e3).toISOString().slice(0, 10); let asked = 0, ok = 0, n = 0, rate = 0;
  const stamp = (iso, end) => iso.replace(/-/g, "") + (end ? "235959" : "000000");
  for (const deal of deals.filter((d) => d.d >= cut && !(items[d.u]?.checked ?? []).includes("gdelt"))) {
    const investor = [...deal.by].sort((a, b) => b.length - a.length)[0]; const end = new Date(Math.min(Date.now(), Date.parse(deal.d) + 8 * 86400e3)).toISOString().slice(0, 10); const start = new Date(Date.parse(deal.d) - 86400e3).toISOString().slice(0, 10);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${investor}"`)}&mode=artlist&format=json&maxrecords=75&startdatetime=${stamp(start)}&enddatetime=${stamp(end, true)}&sort=datedesc`;
    asked++; let j = null;
    for (let t = 0; t < 3 && !j; t++) { try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) }); const body = await r.text(); if (r.ok) j = body.trim().startsWith("{") ? JSON.parse(body) : null; else if (r.status === 429) { rate++; await sleep(15_000); } } catch { /* retry */ } await sleep(5500); }
    console.log("GDELT", deal.d, investor, j ? `${(j.articles ?? []).length} articles` : "no answer"); if (!j) continue; ok++; checked(deal, "gdelt");
    for (const a of j.articles ?? []) {
      const domain = String(a.domain ?? "").replace(/^www\./, ""); if (!domain || /(^|\.)wam\.ae$/.test(domain) || !/^https?:\/\//.test(a.url ?? "")) continue; const d = `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`;
      const m = matchDeal(deal, { title: a.title ?? "", date: d }, names(deal)); if (m.ok && record(deal, { p: `web:${domain}`, name: domain, kind: "news", url: a.url.replace(/^http:/, "https:"), title: a.title, d })) n++;
    }
  }
  Object.assign(sources.gdelt, { status: ok ? "ok" : "failed", rows: ok, from: cut, to: todayIso }); console.log("GDELT queries", asked, "answered", ok, "rate-limited", rate, "| new hits", n);
  if (!ok) unavailable.push({ name: "GDELT article search", url: "https://www.gdeltproject.org/", reason: `No query was answered this run (${rate} rate-limited); the open API allows one request every five seconds and is sometimes throttled.` });
}
unavailable.push({ name: "Reuters, Bloomberg and Financial Times", url: "https://www.reuters.com/", reason: "Paywalled or licence-only; no open feed, so they cannot be read." });
unavailable.push({ name: "Gulf News, Khaleej Times, Zawya, Arabian Business, AGBI", url: "https://gulfnews.com/", reason: "No open RSS feed was found (404 or blocked for non-browser clients); a search by the wire text alone is not permitted." });

for (const [u, e] of Object.entries(items)) if (!deals.some((d) => d.u === u)) delete items[u]; // a deal that left deals.json takes its evidence with it
const ok = Object.values(sources).filter((s) => s.status === "ok").length; const nChecked = Object.values(items).filter((e) => e.checked.length).length;
if (!ok) { console.error("REFUSING TO WRITE: no source answered"); process.exit(1); }
const priorSources = prev.sources ?? {}; for (const [id, s] of Object.entries(sources)) if (s.status !== "ok" && priorSources[id]?.status === "ok") sources[id] = { ...priorSources[id], note: `${priorSources[id].note ?? ""} (Could not be refreshed this run; earlier evidence kept.)`.trim() };
writeFileSync(OUT, JSON.stringify({ v: 1, built: new Date().toISOString(), sources, unavailable, items }));
const withHits = Object.values(items).filter((e) => e.hits.some((h) => !h.syndicated)).length; console.log("deals", deals.length, "| checked by at least one source", nChecked, "| with an independent hit", withHits, "| sources ok", ok);
