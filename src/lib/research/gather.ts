// Collects the machine-verified facts that go to the research analyst before it browses the web.
// Everything here comes from sources we already use legitimately: DFM's disclosure feed, Google News RSS headlines,
// and (if connected) the licensed price vendor. Nothing synthetic is ever included — fixtures are skipped.
import { filings } from "@/lib/markets/dfm-filings";
import { fixturesOn, getDaily, getFundamentals, getQuote, keyConfigured } from "@/lib/markets/source";
import { atr, lastOf, maxDrawdown, periodReturn, technicalReadings, volatility, ytdReturn } from "@/lib/markets/indicators";
import { parseRss } from "@/lib/rss";
import type { Filing, Listing } from "@/lib/markets/types";
import { oneLine } from "@/lib/guard";

export type Facts = {
  asOf: string; listing: Listing;
  filings: { total: number; items: Filing[]; priority: Filing[] } | null;
  news: { title: string; outlet: string; link: string; date: string }[];
  market: Record<string, unknown> | null;
  notes: string[];
};

const KEY_FILING = /financial (statement|result|report)|annual report|interim|quarter|results|earnings|dividend|press release|credit rating|rating|board|general assembly|capital|bond|sukuk|acquisition|merger|related part|auditor|substantial|ownership|buyback|guidance|outlook/i;

export async function gather(l: Listing): Promise<Facts> {
  const f: Facts = { asOf: new Date().toISOString(), listing: l, filings: null, news: [], market: null, notes: [] };

  // 1. DFM disclosures (public feed). ADX has no compliant feed.
  if (l.exchange === "DFM" && l.feedSymbol) {
    try {
      const [a, b] = await Promise.all([filings(l.feedSymbol, 0), filings(l.feedSymbol, 20)]);
      const items = [...a.items, ...b.items];
      f.filings = { total: a.total, items, priority: items.filter((x) => KEY_FILING.test(x.headline) || x.docs.some((d) => /financial|report/i.test(`${d.type} ${d.category}`))).slice(0, 14) };
    } catch (e) { f.notes.push(`DFM disclosure feed unavailable: ${(e as Error).message}`); }
  } else if (l.exchange === "ADX") f.notes.push("ADX publishes no machine-readable disclosure feed and forbids automated retrieval, so ADX filings were not pre-loaded; rely on the issuer's investor-relations site, results releases in the press, and other public sources.");
  else f.notes.push("No DFM disclosure-feed match for this ticker.");

  // 2. Recent headlines (title/outlet/link only).
  try {
    const q = encodeURIComponent(`"${l.name.replace(/\s+(PJSC|P\.J\.S\.C\.?|PSC|KSCP|PLC)\b.*$/i, "")}" when:60d`);
    const r = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en&gl=AE&ceid=AE:en`, { headers: { "User-Agent": "geo-desk/0.1" }, signal: AbortSignal.timeout(15_000) });
    if (r.ok) f.news = parseRss(await r.text(), "", 15).map((h) => { const i = h.title.lastIndexOf(" - "); return { title: i > 0 ? h.title.slice(0, i) : h.title, outlet: i > 0 ? h.title.slice(i + 3) : "", link: h.link, date: new Date(h.ts).toISOString().slice(0, 10) }; });
  } catch { f.notes.push("News headline lookup failed."); }

  // 3. Licensed price/fundamental data, if connected.
  if (keyConfigured() && !fixturesOn()) {
    try {
      const [q, bars, fund] = await Promise.all([getQuote(l), getDaily(l), getFundamentals(l, "annual", ["stats", "profile"])]);
      const r = technicalReadings(bars);
      f.market = {
        source: "Twelve Data (licensed vendor)", currency: l.currency, quote: q, statistics: fund.stats, profile: fund.profile,
        computed: {
          returns: { "1W": periodReturn(bars, 5), "1M": periodReturn(bars, 21), "3M": periodReturn(bars, 63), "6M": periodReturn(bars, 126), YTD: ytdReturn(bars), "1Y": periodReturn(bars, 250) },
          volatility60dAnnualised: volatility(bars, 60), maxDrawdown2y: maxDrawdown(bars), atr14: lastOf(atr(bars, 14)),
          avgDailyVolume60d: bars.length >= 60 ? Math.round(bars.slice(-60).reduce((a, x) => a + x.v, 0) / 60) : null,
          avgDailyValueTraded60d: bars.length >= 60 ? Math.round(bars.slice(-60).reduce((a, x) => a + x.v * x.c, 0) / 60) : null,
          technicalReadings: r.readings.map((x) => `${x.name}: ${x.value} → ${x.signal} (${x.note})`),
        },
        note: "Volume and value are share counts and price×volume from daily bars. The vendor does not supply the NUMBER OF TRADES (transactions) — find that from exchange trading reports if published.",
      };
    } catch (e) { f.notes.push(`Licensed price data unavailable: ${(e as Error).message}`); }
  } else f.notes.push("No licensed price feed is connected, so there is no verified live price, multiples or volume in the facts. Find the latest price and trading data from reputable public sources and state their timestamps.");
  return f;
}

/** Renders facts as tagged text. Third-party strings (headlines, filing titles) are data, never instructions. */
export function renderFacts(f: Facts): string {
  const L = f.listing; const out: string[] = [];
  out.push(`<company>\nName: ${L.name}${L.nameAr ? ` (${L.nameAr})` : ""}\nExchange: ${L.exchange === "ADX" ? "Abu Dhabi Securities Exchange (ADX)" : "Dubai Financial Market (DFM)"}\nTicker: ${L.symbol}${L.feedSymbol && L.feedSymbol !== L.symbol ? ` (DFM feed ticker ${L.feedSymbol})` : ""}\nCurrency: ${L.currency}\nInstrument type: ${L.type}\n</company>`);
  if (f.filings) {
    out.push(`<dfm_disclosures total_on_record="${f.filings.total}">\nMost recent filings (newest first). docs are fetchable PDFs on DFM's document server:\n` +
      f.filings.items.slice(0, 20).map((x) => `- ${x.date.slice(0, 10)} | ${x.type ?? ""} | ${oneLine(x.headline, 300)}${x.period ? ` | period ${x.period}` : ""}${x.dividendsPaymentDate ? ` | dividend payment ${x.dividendsPaymentDate}` : ""}${x.docs.length ? ` | docs: ${x.docs.map((d) => d.url).join(" ")}` : ""}`).join("\n") + `\n</dfm_disclosures>`);
    if (f.filings.priority.length) out.push(`<priority_documents>\nFetch and read these first — they are most likely the latest results / dividend / rating / governance filings:\n${f.filings.priority.map((x) => `- ${x.date.slice(0, 10)} ${oneLine(x.headline, 300)}\n  ${x.docs.map((d) => d.url).join("\n  ") || "(no document attached)"}`).join("\n")}\n</priority_documents>`);
  }
  if (f.news.length) out.push(`<recent_headlines source="Google News RSS, last 60 days; titles only — open the links to read them">\n${f.news.map((n) => `- ${n.date} | ${oneLine(n.outlet, 80)} | ${oneLine(n.title, 300)} | ${n.link}`).join("\n")}\n</recent_headlines>`);
  if (f.market) out.push(`<licensed_market_data>\n${JSON.stringify(f.market, null, 1)}\n</licensed_market_data>`);
  if (f.notes.length) out.push(`<collection_notes>\n${f.notes.map((n) => `- ${n}`).join("\n")}\n</collection_notes>`);
  return out.join("\n\n");
}
