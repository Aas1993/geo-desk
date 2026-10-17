"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { loadProvider, useApi } from "@/lib/markets/client";
import { dash, dateShort, dir, price, sessionState, signed } from "@/lib/markets/format";
import type { Bar, Fundamentals, Listing, Quote } from "@/lib/markets/types";
import { Panel, Pending, ProviderBanner, Unavailable } from "./markets-ui";
import { PriceChart } from "./market-charts";
import { ResearchTab } from "./ResearchTab";
import { TvNote, TvWidget, tvSymbol } from "./TradingView";
import { AboutPanel, FilingsTab, FinancialsTab, FundamentalsTab, IncomeTab, KeyStats, PerformancePanel, ReadingsPanel, TechnicalsTab } from "./stock-sections";

const TABS = ["research", "live", "overview", "technicals", "fundamentals", "financials", "income", "filings"] as const; type Tab = (typeof TABS)[number];
const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "2Y", "5Y", "MAX"] as const; type Range = (typeof RANGES)[number];
const SEPARATE: Range[] = ["1D", "5D", "5Y", "MAX"]; const COUNT: Partial<Record<Range, number>> = { "1M": 23, "3M": 66, "6M": 130, "1Y": 260 };
const EMPTY: Bar[] = [];
async function loadUniverse(): Promise<Listing[]> { return (await (await fetch("/data/markets.json")).json()).rows; }
type FundRes = { data: Fundamentals; period: string };

export function StockView({ exchange, symbol }: { exchange: string; symbol: string }) {
  const { t, lang } = useT();
  const uni = useKeyed("u", loadUniverse).value;
  const listing = uni?.find((l) => l.exchange === exchange && l.symbol === symbol);
  const base = `/api/markets/${exchange}/${encodeURIComponent(symbol)}`; const live = !!listing;
  const prov = useKeyed("p", loadProvider).value;
  const [tab, setTab] = useState<Tab>("overview"); const [tabSet, setTabSet] = useState(false); const [range, setRange] = useState<Range>("6M"); const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  useEffect(() => { const t0 = setTimeout(() => { const h = location.hash.slice(1) as Tab; if (TABS.includes(h)) { setTab(h); setTabSet(true); } }, 0); return () => clearTimeout(t0); }, []);
  // with no price vendor connected, open on the TradingView tab (the only live content) unless the URL says otherwise
  const shownTab: Tab = !tabSet && prov && !prov.keyConfigured && !prov.fixtures ? "live" : tab;
  const pick = (x: Tab) => { setTabSet(true); setTab(x); history.replaceState(null, "", `#${x}`); };

  const quote = useApi<{ quote: Quote }>(live ? `${base}/quote` : null);
  const daily = useApi<{ bars: Bar[]; interval: string }>(live ? `${base}/bars?range=2Y` : null);
  const alt = useApi<{ bars: Bar[]; interval: string }>(live && SEPARATE.includes(range) ? `${base}/bars?range=${range}` : null);
  const head = useApi<FundRes>(live ? `${base}/fundamentals?sections=stats,profile` : null);
  const stmts = useApi<FundRes>(live && shownTab === "financials" ? `${base}/fundamentals?sections=income,balance,cashflow&period=${period}` : null);
  const divs = useApi<FundRes>(live && shownTab === "income" ? `${base}/fundamentals?sections=dividends,earnings,stats` : null);

  const full = useMemo(() => (daily.result?.ok ? daily.result.data.bars : EMPTY), [daily.result]);
  const q = quote.result?.ok ? quote.result.data.quote : null;
  const stats = head.result?.ok ? head.result.data.data.stats : null; const profile = head.result?.ok ? head.result.data.data.profile : null;
  const synthetic = [quote, daily, head].some((x) => x.result?.ok && x.result.synthetic);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const t0 = setTimeout(() => setNow(new Date()), 0); return () => clearTimeout(t0); }, []);
  const open = q?.marketOpen ?? (now ? sessionState(now).open : null);

  const chart = useMemo(() => {
    if (SEPARATE.includes(range)) { const a = alt.result?.ok ? alt.result.data : null; return a ? { full: a.bars, from: 0, interval: a.interval } : null; }
    if (!full.length) return null; let from = Math.max(0, full.length - (COUNT[range] ?? full.length));
    if (range === "YTD") { const y = full[full.length - 1].t.slice(0, 4); from = Math.max(0, full.findIndex((b) => b.t.startsWith(y)) - 1); }
    return { full, from, interval: "1day" };
  }, [range, alt.result, full]);

  if (uni && !listing) return <div className="space-y-4"><Link href="/markets" className="inline-flex items-center gap-2 text-[13px] text-accent"><ArrowLeft size={14} className="rtl:rotate-180" />{t("st_back")}</Link><Panel><p className="text-[14px]">{t("st_notFound")}</p></Panel></div>;
  const cur = listing?.currency ?? "AED"; const name = listing ? (lang === "ar" && listing.nameAr ? listing.nameAr : listing.name) : "";
  const err = quote.result && !quote.result.ok ? quote.result : null;

  return (
    <div className="space-y-5">
      <Link href="/markets" className="inline-flex items-center gap-2 text-[12.5px] text-t1 hover:text-accent"><ArrowLeft size={14} className="rtl:rotate-180" />{t("st_back")}</Link>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="num rounded bg-accent px-2 py-0.5 text-[12px] font-semibold text-[var(--accent-ink)]">{symbol}</span><span className="rounded border border-line2 px-2 py-0.5 text-[11px] font-medium text-t1">{exchange}</span>{listing?.type && listing.type !== "Common Stock" && <span className="rounded border border-line2 px-2 py-0.5 text-[11px] text-t1">{listing.type}</span>}{profile?.sector && <span className="rounded border border-line2 px-2 py-0.5 text-[11px] text-t1">{profile.sector}</span>}<span className="text-[11px] text-t2">{cur}</span></div>
          <h1 className="display mt-2 text-[30px] leading-tight font-semibold sm:text-[38px]" dir="auto">{name || "…"}</h1>
          {listing && (lang === "ar" ? listing.name : listing.nameAr) && <div className="mt-0.5 text-[13px] text-t2" dir="auto">{lang === "ar" ? listing.name : listing.nameAr}</div>}
        </div>
        <div className="text-end">
          {q ? <><div className="flex items-baseline justify-end gap-3"><span className="display num text-[44px] leading-none font-medium sm:text-[54px]">{price(q.price, lang)}</span><span className="text-[13px] text-t2">{cur}</span></div>
            <div className={`num mt-1.5 text-[16px] font-medium ${dir(q.change)}`}>{signed(q.change, lang, (q.price ?? 1) < 1 ? 3 : 2)} <span className="ms-1">({signed(q.changePct, lang, 2, "%")})</span></div>
            <div className="mt-1 flex items-center justify-end gap-2 text-[11.5px] text-t2">{open != null && <><i className={`size-1.5 rounded-full ${open ? "bg-up" : "bg-t2"}`} />{open ? t("mk_open") : t("mk_closed")} ·</>} {t("st_asof")} {dateShort(q.asOf, lang)}</div></>
            : quote.loading ? <div className="skeleton h-[72px] w-[220px]" /> : null}
        </div>
      </header>
      <ProviderBanner synthetic={synthetic} />
      {err && err.error !== "no_key" && <Unavailable error={err.error} message={err.message} onRetry={quote.retry} />}

      <nav role="tablist" aria-label="Sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.map((x) => <button key={x} role="tab" aria-selected={shownTab === x} onClick={() => pick(x)} className={`relative shrink-0 px-3.5 py-3 text-[13px] font-medium transition-colors ${tab === x ? "text-accent" : "text-t1 hover:text-t0"}`}>{t(`st_${x}` as "st_overview")}{shownTab === x && <i className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />}</button>)}
      </nav>

      {shownTab === "research" && listing && <ResearchTab listing={listing} lang={lang} />}
      {shownTab === "live" && listing && (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[640px] text-[13px] text-t1">{t("tv_blocked")}</p>
              <a href={`https://www.tradingview.com/symbols/${listing.exchange}-${encodeURIComponent(listing.feedSymbol ?? listing.symbol)}/`} target="_blank" rel="noreferrer" className="shrink-0 rounded-[6px] bg-accent px-4 py-2 text-[13px] font-semibold text-[var(--accent-ink)] hover:opacity-90">{t("tv_open")} ↗</a>
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Panel title={t("tv_tech")}><TvWidget kind="technical-analysis" title={symbol} height={400} config={{ symbol: tvSymbol(listing), interval: "1D", width: "100%", showIntervalTabs: true }} /></Panel>
            <Panel title={t("tv_fund")}><TvWidget kind="financials" title={symbol} height={520} config={{ symbol: tvSymbol(listing), displayMode: "regular", width: "100%" }} /></Panel>
          </div>
          <Panel title={t("tv_profile")}><TvWidget kind="symbol-profile" title={symbol} height={420} config={{ symbol: tvSymbol(listing), width: "100%" }} /></Panel>
          <TvNote />
        </div>
      )}
      {shownTab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-4">
            <Panel title={undefined}>
              <div className="mb-3 flex flex-wrap gap-1">{RANGES.map((r) => <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={`num rounded-[5px] px-2.5 py-1 text-[12px] font-medium ${range === r ? "bg-accent text-[var(--accent-ink)]" : "text-t1 hover:bg-bg2"}`}>{r}</button>)}</div>
              {chart ? <PriceChart full={chart.full} from={chart.from} interval={chart.interval} lang={lang} />
                : (daily.loading || (SEPARATE.includes(range) && alt.loading)) ? <div className="skeleton h-[360px]" /> : <Unavailable error={(daily.result && !daily.result.ok ? daily.result.error : alt.result && !alt.result.ok ? alt.result.error : "upstream")} message={daily.result && !daily.result.ok ? daily.result.message : undefined} onRetry={() => { daily.retry(); alt.retry(); }} />}
            </Panel>
            {full.length > 30 && <PerformancePanel bars={full} />}
            {full.length > 30 && <ReadingsPanel bars={full} compact />}
            {profile && <AboutPanel p={profile} />}
          </div>
          <div className="space-y-4">{(q || stats) && <KeyStats q={q} stats={stats} cur={cur} />}{head.loading && <Pending />}</div>
        </div>
      )}
      {shownTab === "technicals" && (full.length > 30 ? <TechnicalsTab bars={full} /> : daily.loading ? <Pending rows={8} /> : <Unavailable error={daily.result && !daily.result.ok ? daily.result.error : "upstream"} onRetry={daily.retry} />)}
      {shownTab === "fundamentals" && (stats ? <FundamentalsTab stats={stats} cur={cur} /> : head.loading ? <Pending rows={8} /> : <Unavailable error={head.result && !head.result.ok ? head.result.error : "upstream"} message={head.result?.ok ? head.result.data.data.errors.stats : undefined} onRetry={head.retry} />)}
      {shownTab === "financials" && (
        <div className="space-y-3">
          <div className="flex rounded-[6px] bg-bg2 p-0.5 w-fit">{(["annual", "quarterly"] as const).map((p) => <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className={`rounded-[5px] px-3.5 py-1.5 text-[12.5px] font-medium ${period === p ? "bg-bg1 text-accent" : "text-t1"}`}>{t(p === "annual" ? "st_annual" : "st_quarterly")}</button>)}</div>
          {stmts.loading ? <Pending rows={10} /> : stmts.result?.ok ? (stmts.result.data.data.income.length + stmts.result.data.data.balance.length + stmts.result.data.data.cashflow.length === 0 ? <Unavailable error={stmts.result.data.data.errors.income ?? "not_found"} /> : <FinancialsTab income={stmts.result.data.data.income} balance={stmts.result.data.data.balance} cashflow={stmts.result.data.data.cashflow} cur={cur} period={period} />) : <Unavailable error={stmts.result?.error ?? "upstream"} onRetry={stmts.retry} />}
        </div>
      )}
      {shownTab === "income" && (divs.loading ? <Pending rows={8} /> : divs.result?.ok ? <IncomeTab dividends={divs.result.data.data.dividends} earnings={divs.result.data.data.earnings} stats={divs.result.data.data.stats} cur={cur} /> : <Unavailable error={divs.result?.error ?? "upstream"} onRetry={divs.retry} />)}
      {shownTab === "filings" && listing && <FilingsTab base={base} exchange={listing.exchange} />}
      <p className="pt-2 text-[11px] text-t2">{t("st_dataNote")} {dash}</p>
    </div>
  );
}
