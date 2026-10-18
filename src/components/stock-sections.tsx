"use client";
import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { atr, bollinger, ema, lastOf, macd, maxDrawdown, periodReturn, rsi, sma, stochastic, technicalReadings, volatility, ytdReturn } from "@/lib/markets/indicators";
import { big, dateShort, dash, dir, frac, intl, price, ratio, signed } from "@/lib/markets/format";
import { useApi } from "@/lib/markets/client";
import type { Bar, Dividend, Earning, Filing, Profile, Quote, Statement, Stats } from "@/lib/markets/types";
import type { Lang } from "@/lib/format";
import { KV, Panel, Pending, Unavailable } from "./markets-ui";
import { RangeBar } from "./market-charts";
import { safeHttp } from "@/lib/url";

export function KeyStats({ q, stats, cur }: { q: Quote | null; stats: Stats | null; cur: string }) {
  const { t, lang } = useT();
  return (
    <Panel title={t("st_trading")}>
      <KV k={t("st_open")} v={price(q?.open, lang)} /><KV k={t("st_high")} v={price(q?.high, lang)} /><KV k={t("st_low")} v={price(q?.low, lang)} /><KV k={t("st_prev")} v={price(q?.prevClose, lang)} />
      <KV k={t("st_volume")} v={big(q?.volume, lang, 2)} /><KV k={t("st_avgVol")} v={big(q?.avgVolume, lang, 2)} />
      {stats && <><KV k={t("st_mcap")} v={`${cur} ${big(stats.marketCap, lang)}`} /><KV k={t("st_shares")} v={big(stats.sharesOutstanding, lang)} /><KV k={t("st_float")} v={big(stats.floatShares, lang)} /><KV k={t("st_beta")} v={ratio(stats.beta, lang)} /></>}
      {q?.wk52Low != null && q.wk52High != null && q.price != null && <div className="pt-3"><div className="label mb-2">{t("mk_range52")}</div><RangeBar low={q.wk52Low} high={q.wk52High} value={q.price} /></div>}
    </Panel>
  );
}

export function PerformancePanel({ bars }: { bars: Bar[] }) {
  const { t, lang } = useT();
  const rows: [string, number | null][] = [["1W", periodReturn(bars, 5)], ["1M", periodReturn(bars, 21)], ["3M", periodReturn(bars, 63)], ["6M", periodReturn(bars, 126)], [t("mk_ytd"), ytdReturn(bars)], ["1Y", periodReturn(bars, 250)], ["2Y", bars.length > 500 ? periodReturn(bars, 500) : null]];
  const dd = maxDrawdown(bars); const vol = volatility(bars, 60); const a = lastOf(atr(bars, 14));
  return (
    <Panel title={t("st_perf")}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{rows.map(([k, v]) => <div key={k} className="rounded-[6px] border border-line bg-bg2 px-2.5 py-2"><div className="label !text-[9.5px]">{k}</div><div className={`num mt-1 text-[14px] font-medium ${dir(v)}`}>{frac(v, lang, 1, true)}</div></div>)}</div>
      <div className="mt-3 grid gap-x-6 sm:grid-cols-3"><KV k={t("st_volatility")} v={frac(vol, lang, 1)} /><KV k={t("st_maxdd")} v={dd ? frac(dd.dd, lang, 1) : dash} tone="down" /><KV k={t("st_atr")} v={a != null ? price(a, lang) : dash} /></div>
    </Panel>
  );
}

const sig = { bullish: "up", bearish: "down", neutral: "text-t1" } as const;
export function ReadingsPanel({ bars, compact }: { bars: Bar[]; compact?: boolean }) {
  const { t } = useT(); const r = useMemo(() => technicalReadings(bars), [bars]); const tot = r.readings.length || 1;
  return (
    <Panel title={t("st_readings")}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}><div className="bg-up" style={{ width: `${(r.counts.bullish / tot) * 100}%` }} /><div className="bg-t2/50" style={{ width: `${(r.counts.neutral / tot) * 100}%` }} /><div className="bg-down" style={{ width: `${(r.counts.bearish / tot) * 100}%` }} /></div>
      <div className="mt-2 flex justify-between text-[11.5px]"><span className="up">{r.counts.bullish} {t("st_bullish")}</span><span className="text-t2">{r.counts.neutral} {t("st_neutral")}</span><span className="down">{r.counts.bearish} {t("st_bearish")}</span></div>
      {!compact && <ul className="mt-3">{r.readings.map((x) => <li key={x.name} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-[13px] last:border-0"><div><div className="font-medium">{x.name}</div><div className="text-[11.5px] text-t2">{x.note}</div></div><div className="text-end"><div className="num text-t1">{x.value}</div><div className={`text-[11px] font-medium uppercase tracking-wide ${sig[x.signal]}`}>{t(`st_${x.signal}` as "st_bullish")}</div></div></li>)}</ul>}
      <p className="mt-3 text-[11px] text-t2">{t("st_readingsNote")}</p>
    </Panel>
  );
}

export function TechnicalsTab({ bars }: { bars: Bar[] }) {
  const { t, lang } = useT(); const c = useMemo(() => bars.map((b) => b.c), [bars]); const last = c[c.length - 1];
  const mas = [5, 10, 20, 50, 100, 200].map((n) => ({ n, s: lastOf(sma(c, n)), e: lastOf(ema(c, n)) }));
  const st = stochastic(bars); const m = macd(c); const bb = bollinger(c); const hl = bars[bars.length - 1];
  const pv = (hl.h + hl.l + hl.c) / 3; const piv = [["R2", pv + (hl.h - hl.l)], ["R1", 2 * pv - hl.l], ["Pivot", pv], ["S1", 2 * pv - hl.h], ["S2", pv - (hl.h - hl.l)]] as const;
  const cell = (v: number | null) => (v == null ? <span className="text-t2">{dash}</span> : <span className={`num ${last > v ? "up" : "down"}`}>{price(v, lang)}</span>);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReadingsPanel bars={bars} />
      <div className="space-y-4">
        <Panel title={t("st_sma")}>
          <table className="w-full text-[13px]"><thead><tr className="text-start"><th className="label pb-2 text-start">{lang === "ar" ? "الفترة" : "Period"}</th><th className="label pb-2 text-end">SMA</th><th className="label pb-2 text-end">EMA</th></tr></thead>
            <tbody>{mas.map((x) => <tr key={x.n} className="border-t border-line/60"><td className="py-2 num text-t1">{x.n}</td><td className="py-2 text-end">{cell(x.s)}</td><td className="py-2 text-end">{cell(x.e)}</td></tr>)}</tbody></table>
        </Panel>
        <Panel title={t("st_osc")}>
          <KV k="RSI (14)" v={ratio(lastOf(rsi(c, 14)), lang, 1)} /><KV k="Stochastic %K / %D" v={`${ratio(lastOf(st.k), lang, 1)} / ${ratio(lastOf(st.d), lang, 1)}`} />
          <KV k="MACD / signal / hist" v={`${ratio(lastOf(m.line), lang, 3)} / ${ratio(lastOf(m.signal), lang, 3)} / ${ratio(lastOf(m.hist), lang, 3)}`} />
          <KV k="Bollinger (20, 2)" v={`${price(lastOf(bb.lo), lang)} – ${price(lastOf(bb.up), lang)}`} /><KV k={t("st_atr")} v={price(lastOf(atr(bars, 14)), lang)} />
        </Panel>
        <Panel title={lang === "ar" ? "نقاط المحور (الجلسة الأخيرة)" : "Pivot points (last session)"}>{piv.map(([k, v]) => <KV key={k} k={k} v={price(v, lang)} tone={k.startsWith("R") ? "down" : k.startsWith("S") ? "up" : ""} />)}</Panel>
      </div>
    </div>
  );
}

export function FundamentalsTab({ stats: s, cur }: { stats: Stats; cur: string }) {
  const { t, lang } = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Panel title={t("st_valuation")}><KV k={t("st_mcap")} v={`${cur} ${big(s.marketCap, lang)}`} /><KV k={t("st_ev")} v={`${cur} ${big(s.enterpriseValue, lang)}`} /><KV k={t("st_pe")} v={ratio(s.trailingPE, lang, 1, "×")} /><KV k={t("st_fpe")} v={ratio(s.forwardPE, lang, 1, "×")} /><KV k={t("st_peg")} v={ratio(s.peg, lang)} /><KV k={t("st_ps")} v={ratio(s.priceToSales, lang, 2, "×")} /><KV k={t("st_pb")} v={ratio(s.priceToBook, lang, 2, "×")} /><KV k={t("st_evrev")} v={ratio(s.evToRevenue, lang, 2, "×")} /><KV k={t("st_evebitda")} v={ratio(s.evToEbitda, lang, 1, "×")} /></Panel>
      <Panel title={t("st_profit")}><KV k={t("st_gm")} v={frac(s.grossMargin, lang)} /><KV k={t("st_om")} v={frac(s.operatingMargin, lang)} /><KV k={t("st_nm")} v={frac(s.profitMargin, lang)} /><KV k={t("st_roa")} v={frac(s.roa, lang)} /><KV k={t("st_roe")} v={frac(s.roe, lang)} /><KV k={t("st_eps")} v={price(s.epsTTM, lang)} /></Panel>
      <Panel title={t("st_health")}><KV k={t("st_cash")} v={`${cur} ${big(s.totalCash, lang)}`} /><KV k={t("st_debt")} v={`${cur} ${big(s.totalDebt, lang)}`} /><KV k={t("st_de")} v={ratio(s.debtToEquity, lang, 1, "%")} /><KV k={t("st_cr")} v={ratio(s.currentRatio, lang)} /><KV k={t("st_bvps")} v={price(s.bookValuePerShare, lang)} /></Panel>
      <Panel title={t("st_growth")}><KV k={t("st_rev")} v={`${cur} ${big(s.revenueTTM, lang)}`} /><KV k={t("st_ebitda")} v={`${cur} ${big(s.ebitda, lang)}`} /><KV k={t("st_ni")} v={`${cur} ${big(s.netIncomeTTM, lang)}`} /><KV k={t("st_revg")} v={frac(s.revenueGrowthQ, lang, 1, true)} tone={dir(s.revenueGrowthQ) as "up"} /><KV k={t("st_epsg")} v={frac(s.earningsGrowthQ, lang, 1, true)} tone={dir(s.earningsGrowthQ) as "up"} /><KV k={t("st_ocf")} v={`${cur} ${big(s.operatingCashFlow, lang)}`} /><KV k={t("st_fcf")} v={`${cur} ${big(s.freeCashFlow, lang)}`} /></Panel>
      <Panel title={t("st_income")}><KV k={t("st_divYield")} v={frac(s.dividendYield, lang, 2)} /><KV k={t("st_divRate")} v={price(s.dividendRate, lang)} /><KV k={t("st_payout")} v={frac(s.payoutRatio, lang, 0)} /><KV k={t("st_divFreq")} v={s.dividendFrequency ?? dash} /><KV k={t("st_exDiv")} v={dateShort(s.exDividendDate, lang)} /><KV k={t("st_avgYield")} v={ratio(s.fiveYearAvgYield, lang, 2, "%")} /></Panel>
      <Panel title={t("st_trading")}><KV k={t("st_beta")} v={ratio(s.beta, lang)} /><KV k={t("st_wk52chg")} v={ratio(s.wk52Change, lang, 1, "%")} /><KV k={t("st_shares")} v={big(s.sharesOutstanding, lang)} /><KV k={t("st_float")} v={big(s.floatShares, lang)} /></Panel>
    </div>
  );
}

const LABELS: Record<"income" | "balance" | "cashflow", [string, string, boolean?][]> = {
  income: [["sales", "Revenue"], ["cost_of_goods", "Cost of goods sold"], ["gross_profit", "Gross profit"], ["operating_income", "Operating income"], ["ebit", "EBIT"], ["ebitda", "EBITDA"], ["pretax_income", "Pre-tax income"], ["income_tax", "Income tax"], ["net_income", "Net income"], ["eps_diluted", "Diluted EPS", true]],
  balance: [["cash_and_cash_equivalents", "Cash & equivalents"], ["total_current_assets", "Current assets"], ["total_non_current_assets", "Non-current assets"], ["total_assets", "Total assets"], ["total_current_liabilities", "Current liabilities"], ["short_term_debt", "Short-term debt"], ["long_term_debt", "Long-term debt"], ["total_liabilities", "Total liabilities"], ["total_shareholders_equity", "Shareholders' equity"]],
  cashflow: [["net_income", "Net income"], ["depreciation", "Depreciation"], ["operating_cash_flow", "Operating cash flow"], ["capital_expenditures", "Capital expenditures"], ["investing_cash_flow", "Investing cash flow"], ["common_dividends", "Dividends paid"], ["common_stock_repurchase", "Share buybacks"], ["financing_cash_flow", "Financing cash flow"], ["free_cash_flow", "Free cash flow"], ["end_cash_position", "Ending cash"]],
};
const pretty = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function StatementTable({ title, kind, data, cur }: { title: string; kind: "income" | "balance" | "cashflow"; data: Statement[]; cur: string }) {
  const { lang } = useT(); const [all, setAll] = useState(false);
  if (!data.length) return null;
  const cols = data.slice(0, 6); const known = LABELS[kind]; const keys = new Set(known.map((k) => k[0]));
  const extra = all ? [...new Set(data.flatMap((d) => Object.keys(d.rows)))].filter((k) => !keys.has(k)).map((k): [string, string, boolean?] => [k, pretty(k)]) : [];
  const rows = [...known, ...extra].filter(([k]) => cols.some((c) => c.rows[k] != null));
  return (
    <Panel title={title} aside={<button onClick={() => setAll(!all)} className="text-[11.5px] text-accent hover:underline">{all ? (lang === "ar" ? "الأساسية فقط" : "Key lines only") : (lang === "ar" ? "كل البنود" : "All line items")}</button>}>
      <div className="scroll-thin -mx-1 overflow-x-auto px-1"><table className="w-full min-w-[520px] border-collapse text-[12.5px]"><thead><tr><th className="sticky start-0 bg-bg1 pb-2 text-start" /><th colSpan={cols.length} className="pb-1 text-end text-[10.5px] font-normal text-t2">{cur} · {lang === "ar" ? "بالأرقام المختصرة" : "compact"}</th></tr><tr className="border-b border-line"><th className="sticky start-0 bg-bg1" />{cols.map((c) => <th key={c.date} className="num pb-2 ps-4 text-end text-[11px] font-medium text-t1">{c.date.slice(0, 7)}</th>)}</tr></thead>
        <tbody>{rows.map(([k, label, raw]) => <tr key={k} className="border-b border-line/50 last:border-0"><th scope="row" className="sticky start-0 bg-bg1 py-2 pe-3 text-start font-normal text-t1">{label}</th>{cols.map((c) => { const v = c.rows[k]; return <td key={c.date} className={`num py-2 ps-4 text-end ${v != null && v < 0 ? "down" : ""}`}>{v == null ? dash : raw ? ratio(v, lang, 2) : big(v, lang)}</td>; })}</tr>)}</tbody></table></div>
    </Panel>
  );
}
function BarsChart({ series, labels, cur }: { series: { name: string; color: string; vals: (number | null)[] }[]; labels: string[]; cur: string }) {
  const { lang } = useT(); const W = 560, H = 150, n = labels.length; const all = series.flatMap((s) => s.vals).filter((v): v is number => v != null); if (!all.length) return null;
  const hi = Math.max(...all, 0), lo = Math.min(...all, 0); const y = (v: number) => 12 + (1 - (v - lo) / (hi - lo || 1)) * (H - 40); const gw = (W - 20) / n; const bw = Math.min(26, gw / (series.length + 1));
  return (
    <div style={{ direction: "ltr" }}><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue and net income">
      <line x1="10" x2={W - 10} y1={y(0)} y2={y(0)} stroke="var(--line2)" />
      {labels.map((lb, i) => <g key={lb}>{series.map((s, j) => { const v = s.vals[i]; if (v == null) return null; const x0 = 10 + gw * i + gw / 2 - (series.length * bw) / 2 + j * bw; return <g key={s.name}><rect x={x0} width={bw - 2} y={Math.min(y(v), y(0))} height={Math.max(1, Math.abs(y(v) - y(0)))} fill={s.color} rx="1.5" /><text x={x0 + (bw - 2) / 2} y={v >= 0 ? y(v) - 4 : y(v) + 11} fontSize="9" textAnchor="middle" fill="var(--t2)" className="num">{big(v, lang, 1)}</text></g>; })}<text x={10 + gw * i + gw / 2} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--t2)">{lb}</text></g>)}
    </svg><div className="mt-1 flex gap-4 text-[11px] text-t1">{series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><i className="inline-block size-2 rounded-sm" style={{ background: s.color }} />{s.name} ({cur})</span>)}</div></div>
  );
}
export function FinancialsTab({ income, balance, cashflow, cur, period }: { income: Statement[]; balance: Statement[]; cashflow: Statement[]; cur: string; period: "annual" | "quarterly" }) {
  const { t, lang } = useT(); const cols = income.slice(0, 6).reverse();
  return (
    <div className="space-y-4">
      {cols.length > 1 && <Panel title={lang === "ar" ? "الإيرادات · صافي الدخل" : "Revenue · Net income"}><BarsChart labels={cols.map((c) => (period === "annual" ? c.date.slice(0, 4) : c.date.slice(0, 7)))} cur={cur} series={[{ name: "Revenue", color: "var(--c2)", vals: cols.map((c) => c.rows.sales ?? null) }, { name: "Net income", color: "var(--accent)", vals: cols.map((c) => c.rows.net_income ?? null) }]} /></Panel>}
      <StatementTable title={t("st_incomeStmt")} kind="income" data={income} cur={cur} />
      <StatementTable title={t("st_balanceSheet")} kind="balance" data={balance} cur={cur} />
      <StatementTable title={t("st_cashFlow")} kind="cashflow" data={cashflow} cur={cur} />
    </div>
  );
}

export function IncomeTab({ dividends, earnings, stats, cur }: { dividends: Dividend[]; earnings: Earning[]; stats: Stats | null; cur: string }) {
  const { t, lang } = useT(); const sorted = [...dividends].sort((a, b) => b.exDate.localeCompare(a.exDate));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("st_divHistory")}>
        {stats && <div className="mb-3 grid grid-cols-3 gap-2"><div className="rounded-[6px] border border-line bg-bg2 px-3 py-2"><div className="label !text-[9.5px]">{t("st_divYield")}</div><div className="num mt-1 text-[16px] font-medium text-accent">{frac(stats.dividendYield, lang, 2)}</div></div><div className="rounded-[6px] border border-line bg-bg2 px-3 py-2"><div className="label !text-[9.5px]">{t("st_divRate")}</div><div className="num mt-1 text-[16px] font-medium">{price(stats.dividendRate, lang)}</div></div><div className="rounded-[6px] border border-line bg-bg2 px-3 py-2"><div className="label !text-[9.5px]">{t("st_payout")}</div><div className="num mt-1 text-[16px] font-medium">{frac(stats.payoutRatio, lang, 0)}</div></div></div>}
        {sorted.length === 0 ? <p className="text-[13px] text-t2">{t("noData")}</p> : <table className="w-full text-[13px]"><thead><tr><th className="label pb-2 text-start">Ex-date</th><th className="label pb-2 text-end">{cur}/share</th></tr></thead><tbody>{sorted.map((d) => <tr key={d.exDate} className="border-t border-line/60"><td className="py-2 num text-t1">{dateShort(d.exDate, lang)}</td><td className="py-2 num text-end font-medium">{price(d.amount, lang)}</td></tr>)}</tbody></table>}
      </Panel>
      <Panel title={t("st_earnHistory")}>
        {earnings.length === 0 ? <p className="text-[13px] text-t2">{t("noData")}</p> : <table className="w-full text-[13px]"><thead><tr><th className="label pb-2 text-start">Date</th><th className="label pb-2 text-end">{t("st_estimate")}</th><th className="label pb-2 text-end">{t("st_actual")}</th><th className="label pb-2 text-end">{t("st_surprise")}</th></tr></thead><tbody>{earnings.map((e) => <tr key={e.date} className="border-t border-line/60"><td className="py-2 num text-t1">{dateShort(e.date, lang)}</td><td className="py-2 num text-end text-t1">{ratio(e.estimate, lang, 3)}</td><td className="py-2 num text-end font-medium">{ratio(e.actual, lang, 3)}</td><td className={`py-2 num text-end ${dir(e.surprisePct)}`}>{signed(e.surprisePct, lang, 1, "%")}</td></tr>)}</tbody></table>}
      </Panel>
    </div>
  );
}

export function AboutPanel({ p }: { p: Profile }) {
  const { t } = useT();
  return (
    <Panel title={t("st_about")}>
      {p.description && <p className="mb-3 text-[13px] leading-relaxed text-t1">{p.description}</p>}
      {p.sector && <KV k={t("st_sector")} v={p.sector} />}{p.industry && <KV k={t("st_industry")} v={p.industry} />}{p.employees != null && <KV k={t("st_employees")} v={intl(p.employees, "en")} />}{p.ceo && <KV k="CEO" v={p.ceo} />}{(p.city || p.country) && <KV k={t("st_hq")} v={[p.city, p.country].filter(Boolean).join(", ")} />}
      {p.website && <KV k={t("st_website")} v={<a href={safeHttp(p.website)} target="_blank" rel="noreferrer" className="text-accent hover:underline">{p.website.replace(/^https?:\/\/(www\.)?/, "")}</a>} />}
    </Panel>
  );
}

type FilingsRes = { available: boolean; reason?: string; items: Filing[]; total: number; error?: string };
export function FilingsTab({ base, exchange }: { base: string; exchange: "ADX" | "DFM" }) {
  const { t, lang } = useT(); const [skip, setSkip] = useState(0); const [extra, setExtra] = useState<Filing[]>([]);
  const first = useApi<FilingsRes>(`${base}/filings?skip=0`); const more = useApi<FilingsRes>(skip > 0 ? `${base}/filings?skip=${skip}` : null);
  if (first.loading) return <Pending rows={6} />;
  const r = first.result; if (!r || !r.ok) return <Unavailable error="upstream" message={r && !r.ok ? r.message : undefined} onRetry={first.retry} />;
  if (!r.data.available) return <Panel><p className="text-[13px] text-t1">{r.data.reason === "adx_no_feed" || exchange === "ADX" ? t("mk_adxNote") : (lang === "ar" ? "لا يوجد ربط لهذا الرمز في تغذية دبي المالي." : "This ticker could not be matched to an issuer in DFM's disclosure feed.")}</p></Panel>;
  const moreItems = more.result?.ok && more.result.data.items ? more.result.data.items : [];
  const items = [...r.data.items, ...extra, ...moreItems.filter((m) => !r.data.items.some((i) => i.id === m.id) && !extra.some((i) => i.id === m.id))];
  const total = r.data.total;
  return (
    <Panel title={t("st_filingsTitle")} aside={<span className="num text-[11px] text-t2">{intl(items.length, lang)} / {intl(total, lang)}</span>}>
      {items.length === 0 ? <p className="text-[13px] text-t2">{t("st_noFilings")}</p> : <ol className="relative ms-2 border-s border-line">
        {items.map((f) => (
          <li key={f.id} className="relative pb-5 ps-5 last:pb-0"><i className="absolute -start-[5px] top-1.5 size-2.5 rounded-full border-2 border-bg1 bg-accent" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><time className="num text-[11.5px] text-t2">{dateShort(f.date, lang)}</time>{f.type && <span className="rounded border border-line2 px-1.5 text-[10px] uppercase tracking-wide text-t1">{f.type}</span>}{f.period && <span className="text-[11px] text-t2">{f.period}</span>}{f.dividendsPaymentDate && <span className="text-[11px] text-up">Dividend · {f.dividendsPaymentDate}</span>}</div>
            <div className="mt-1 text-[13.5px] leading-snug" dir="auto">{f.headline}</div>
            {f.docs.length > 0 && <div className="mt-1.5 flex flex-wrap gap-2">{f.docs.map((d) => <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="rounded-[5px] border border-line bg-bg2 px-2 py-1 text-[11.5px] text-accent hover:border-accent" title={d.description}>PDF{d.language ? ` · ${d.language.toUpperCase()}` : ""}</a>)}</div>}
          </li>))}
      </ol>}
      {items.length < total && <button onClick={() => { setExtra(items.slice(r.data.items.length)); setSkip(items.length); }} disabled={more.loading} className="mt-4 rounded-full border border-line2 px-4 py-1.5 text-[12.5px] text-accent hover:bg-bg2 disabled:opacity-50">{more.loading ? "…" : t("st_more")}</button>}
      <p className="mt-4 text-[11px] text-t2">{t("st_filingsSource")}</p>
    </Panel>
  );
}
export type { Lang };
