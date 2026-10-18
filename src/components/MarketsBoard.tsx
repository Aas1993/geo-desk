"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { useT } from "@/lib/store";
import { useApi } from "@/lib/markets/client";
import { useKeyed } from "@/lib/useKeyed";
import { big, dash, dir, frac, intl, price, ratio, sessionState, signed } from "@/lib/markets/format";
import type { Listing, Quote } from "@/lib/markets/types";
import { Panel, ProviderBanner, Unavailable } from "./markets-ui";
import { MiniSpark, RangeBar } from "./market-charts";
import { ScreenersView } from "./ScreenersView";

type QMap = Record<string, Quote | { error: string }>;
type Metrics = { r1w: number | null; r1m: number | null; r3m: number | null; ytd: number | null; r1y: number | null; rsi: number | null; vs200: number | null; vol: number | null; spark: number[] };
const isQuote = (q: Quote | { error: string } | undefined): q is Quote => !!q && !("error" in q);

type Row = { l: Listing; q: Quote | null; m: Metrics | null };
type Col = { id: string; label: string; get: (r: Row) => number | string | null; cell: (r: Row, lang: "en" | "ar") => React.ReactNode; align?: "end"; csv?: (r: Row) => string | number | null; w?: string };

async function loadUniverse(): Promise<Listing[]> { return (await (await fetch("/data/markets.json")).json()).rows; }

export function MarketsBoard() {
  const { t, lang } = useT();
  const uni = useKeyed("u", loadUniverse).value;
  const [ex, setEx] = useState<"ALL" | "ADX" | "DFM" | "QSE">("ALL");
  const [view, setView] = useState<"table" | "screener">("table");
  const [q, setQ] = useState(""); const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: "symbol", desc: false });
  const qa = useApi<{ quotes: QMap }>("/api/markets/board/ADX"), qd = useApi<{ quotes: QMap }>("/api/markets/board/DFM"), qq = useApi<{ quotes: QMap }>("/api/markets/board/QSE");
  const haveQuotes = !!(qa.result?.ok || qd.result?.ok || qq.result?.ok);
  const ma = useApi<{ metrics: Record<string, Metrics> }>(qa.result?.ok ? "/api/markets/board/ADX?enrich=1" : null);
  const md = useApi<{ metrics: Record<string, Metrics> }>(qd.result?.ok ? "/api/markets/board/DFM?enrich=1" : null);
  const mq = useApi<{ metrics: Record<string, Metrics> }>(qq.result?.ok ? "/api/markets/board/QSE?enrich=1" : null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); const t0 = setTimeout(tick, 0); const i = setInterval(tick, 30000); return () => { clearTimeout(t0); clearInterval(i); }; }, []);
  const session = now ? sessionState(now, ex === "QSE" ? "QSE" : "UAE") : null;

  // keyed by exchange and symbol: GFH is listed on ADX and DFM and ORDS on ADX and QSE, so a bare symbol would mix their prices
  const pre = <T,>(x: Record<string, T> | undefined, e: string) => Object.fromEntries(Object.entries(x ?? {}).map(([k, v]) => [`${e}:${k}`, v]));
  const quotes: QMap = useMemo(() => ({ ...pre(qa.result?.ok ? qa.result.data.quotes : undefined, "ADX"), ...pre(qd.result?.ok ? qd.result.data.quotes : undefined, "DFM"), ...pre(qq.result?.ok ? qq.result.data.quotes : undefined, "QSE") }), [qa.result, qd.result, qq.result]);
  const metrics = useMemo(() => ({ ...pre(ma.result?.ok ? ma.result.data.metrics : undefined, "ADX"), ...pre(md.result?.ok ? md.result.data.metrics : undefined, "DFM"), ...pre(mq.result?.ok ? mq.result.data.metrics : undefined, "QSE") }), [ma.result, md.result, mq.result]);
  const synthetic = !!((qa.result?.ok && qa.result.synthetic) || (qd.result?.ok && qd.result.synthetic) || (qq.result?.ok && qq.result.synthetic));
  const failed = !haveQuotes && !qa.loading && !qd.loading && !qq.loading ? (qa.result && !qa.result.ok ? qa.result : qd.result && !qd.result.ok ? qd.result : qq.result && !qq.result.ok ? qq.result : null) : null;

  const rows: Row[] = useMemo(() => (uni ?? []).map((l) => ({ l, q: isQuote(quotes[`${l.exchange}:${l.symbol}`]) ? (quotes[`${l.exchange}:${l.symbol}`] as Quote) : null, m: metrics[`${l.exchange}:${l.symbol}`] ?? null })), [uni, quotes, metrics]);
  const pctCell = (v: number | null | undefined) => <span className={`num ${dir(v)}`}>{frac(v, lang, 1, true)}</span>;
  const cols: Col[] = [
    { id: "symbol", label: t("mk_symbol"), get: (r) => r.l.symbol, w: "min-w-[210px]", csv: (r) => r.l.symbol, cell: (r) => (
      <Link href={`/markets/${r.l.exchange}/${encodeURIComponent(r.l.symbol)}`} className="group block">
        <div className="flex items-center gap-2"><span className="num font-semibold text-t0 group-hover:text-accent">{r.l.symbol}</span><span className="rounded border border-line2 px-1 text-[9.5px] font-medium tracking-wide text-t2">{r.l.exchange}</span></div>
        <div className="max-w-[230px] truncate text-[11.5px] text-t2">{lang === "ar" && r.l.nameAr ? r.l.nameAr : r.l.name}</div>
      </Link>) },
    { id: "last", label: t("mk_last"), align: "end", get: (r) => r.q?.price ?? null, cell: (r) => <span className="num">{price(r.q?.price, lang)}</span> },
    { id: "chg", label: t("mk_chg"), align: "end", get: (r) => r.q?.change ?? null, cell: (r) => <span className={`num ${dir(r.q?.change)}`}>{signed(r.q?.change, lang, r.q && (r.q.price ?? 1) < 1 ? 3 : 2)}</span> },
    { id: "chgPct", label: t("mk_chgPct"), align: "end", get: (r) => r.q?.changePct ?? null, cell: (r) => <span className={`num font-medium ${dir(r.q?.changePct)}`}>{signed(r.q?.changePct, lang, 2, "%")}</span> },
    { id: "vol", label: t("mk_vol"), align: "end", get: (r) => r.q?.volume ?? null, cell: (r) => <span className="num text-t1">{big(r.q?.volume, lang, 1)}</span> },
    { id: "range52", label: t("mk_range52"), get: (r) => (r.q?.wk52High && r.q.wk52Low && r.q.price ? (r.q.price - r.q.wk52Low) / (r.q.wk52High - r.q.wk52Low) : null), cell: (r) => (r.q?.wk52Low != null && r.q.wk52High != null && r.q.price != null ? <RangeBar low={r.q.wk52Low} high={r.q.wk52High} value={r.q.price} compact /> : <span className="text-t2">{dash}</span>) },
    { id: "r1w", label: t("mk_1w"), align: "end", get: (r) => r.m?.r1w ?? null, cell: (r) => pctCell(r.m?.r1w) },
    { id: "r1m", label: t("mk_1m"), align: "end", get: (r) => r.m?.r1m ?? null, cell: (r) => pctCell(r.m?.r1m) },
    { id: "r3m", label: t("mk_3m"), align: "end", get: (r) => r.m?.r3m ?? null, cell: (r) => pctCell(r.m?.r3m) },
    { id: "ytd", label: t("mk_ytd"), align: "end", get: (r) => r.m?.ytd ?? null, cell: (r) => pctCell(r.m?.ytd) },
    { id: "r1y", label: t("mk_1y"), align: "end", get: (r) => r.m?.r1y ?? null, cell: (r) => pctCell(r.m?.r1y) },
    { id: "rsi", label: t("mk_rsi"), align: "end", get: (r) => r.m?.rsi ?? null, cell: (r) => <span className={`num ${r.m?.rsi != null && r.m.rsi > 70 ? "down" : r.m?.rsi != null && r.m.rsi < 30 ? "up" : ""}`}>{ratio(r.m?.rsi, lang, 1)}</span> },
    { id: "vs200", label: t("mk_vs200"), align: "end", get: (r) => r.m?.vs200 ?? null, cell: (r) => pctCell(r.m?.vs200) },
    { id: "vol60", label: t("mk_volat"), align: "end", get: (r) => r.m?.vol ?? null, cell: (r) => <span className="num text-t1">{frac(r.m?.vol, lang, 0)}</span> },
    { id: "trend", label: t("mk_trend"), get: () => null, cell: (r) => (r.m?.spark ? <MiniSpark data={r.m.spark} /> : <span className="text-t2">{dash}</span>), csv: () => null },
  ];
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase(); const col = cols.find((c) => c.id === sort.id) ?? cols[0];
    const list = rows.filter((r) => (ex === "ALL" || r.l.exchange === ex) && (!n || r.l.symbol.toLowerCase().includes(n) || r.l.name.toLowerCase().includes(n) || (r.l.nameAr ?? "").includes(n)));
    return list.sort((a, b) => { const x = col.get(a), y = col.get(b); if (x == null && y == null) return a.l.symbol.localeCompare(b.l.symbol); if (x == null) return 1; if (y == null) return -1; const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number); return sort.desc ? -c : c; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ex, q, sort, lang]);

  const withQ = rows.filter((r) => r.q && (ex === "ALL" || r.l.exchange === ex));
  const adv = withQ.filter((r) => (r.q!.changePct ?? 0) > 0).length, dec = withQ.filter((r) => (r.q!.changePct ?? 0) < 0).length;
  const top = (k: "gain" | "lose" | "act") => [...withQ].sort((a, b) => k === "gain" ? (b.q!.changePct ?? -99) - (a.q!.changePct ?? -99) : k === "lose" ? (a.q!.changePct ?? 99) - (b.q!.changePct ?? 99) : ((b.q!.volume ?? 0) * (b.q!.price ?? 0)) - ((a.q!.volume ?? 0) * (a.q!.price ?? 0))).slice(0, 5);
  const csv = () => {
    const head = ["exchange", ...cols.filter((c) => c.csv !== undefined || c.id !== "trend").map((c) => c.id)];
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [head.join(","), ...shown.map((r) => [r.l.exchange, ...cols.filter((c) => c.id !== "trend").map((c) => (c.csv ? c.csv(r) : c.get(r)))].map(esc).join(","))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `uae-equities-${ex.toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const enriching = haveQuotes && (ma.loading || md.loading);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[720px]"><div className="rule-gold mb-3" /><h1 className="display text-[34px] leading-[1.05] font-semibold sm:text-[42px]">{t("mk_title")}</h1><p className="mt-2 text-[14px] text-t1">{t("mk_sub")}</p></div>
        {session && <div className="flex items-center gap-3 rounded-[8px] border border-line bg-bg1 px-4 py-2.5"><i className={`size-2.5 rounded-full ${session.open ? "bg-up" : "bg-t2"}`} /><div><div className="text-[13px] font-medium">{session.open ? t("mk_open") : t("mk_closed")}</div><div className="num text-[11px] text-t2">{ex === "QSE" ? (lang === "ar" ? "الأحد–الخميس 09:30–13:15 بتوقيت قطر (تداول مستمر حتى 13:00 ثم مزاد الإغلاق)" : "Sun–Thu 09:30–13:15 AST (continuous to 13:00, then the closing auction)") : t("mk_hours")}</div></div></div>}
      </header>
      <ProviderBanner synthetic={synthetic} />
      <div role="tablist" aria-label="View" className="flex w-fit rounded-[6px] bg-bg2 p-0.5">{(["table", "screener"] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-[5px] px-4 py-1.5 text-[12.5px] font-medium ${view === v ? "bg-bg1 text-accent shadow-sm" : "text-t1 hover:text-t0"}`}>{v === "table" ? t("mk_table") : t("mk_screener")}</button>)}</div>
      {view === "screener" && <ScreenersView />}
      {failed && !failed.ok && failed.error !== "no_key" && <Unavailable error={failed.error} message={failed.message} onRetry={() => { qa.retry(); qd.retry(); }} />}

      {view === "table" && haveQuotes && (
        <div className="grid gap-3 lg:grid-cols-4">
          <Panel title={t("mk_advDec")}><div className="num text-[28px] font-medium"><span className="up">{adv}</span><span className="px-2 text-t2">/</span><span className="down">{dec}</span></div><div className="mt-1 text-[11.5px] text-t2">{withQ.length} {t("mk_listed").toLowerCase()}</div></Panel>
          {([["gain", t("mk_gainers")], ["lose", t("mk_losers")], ["act", t("mk_active")]] as const).map(([k, title]) => (
            <Panel key={k} title={title}><ul className="space-y-1.5">{top(k).map((r) => (
              <li key={r.l.exchange + r.l.symbol}><Link href={`/markets/${r.l.exchange}/${encodeURIComponent(r.l.symbol)}`} className="flex items-baseline justify-between gap-2 text-[13px] hover:text-accent"><span className="num font-semibold">{r.l.symbol}</span>
                <span className={`num ${k === "act" ? "text-t1" : dir(r.q!.changePct)}`}>{k === "act" ? big((r.q!.volume ?? 0) * (r.q!.price ?? 0), lang, 1) : signed(r.q!.changePct, lang, 2, "%")}</span></Link></li>))}</ul></Panel>
          ))}
        </div>
      )}

      {view === "table" && <section className="rounded-[8px] border border-line bg-bg1">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <div role="tablist" aria-label="Exchange" className="flex rounded-[6px] bg-bg2 p-0.5">
            {(["ALL", "ADX", "DFM", "QSE"] as const).map((e) => <button key={e} role="tab" aria-selected={ex === e} onClick={() => setEx(e)} className={`rounded-[5px] px-3.5 py-1.5 text-[12.5px] font-medium ${ex === e ? "bg-bg1 text-accent shadow-sm" : "text-t1 hover:text-t0"}`}>{e === "ALL" ? t("mk_all") : e}{uni && <span className="num ms-1.5 text-[10.5px] text-t2">{e === "ALL" ? uni.length : uni.filter((l) => l.exchange === e).length}</span>}</button>)}
          </div>
          <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-[6px] border border-line bg-bg2 px-3 focus-within:border-accent sm:max-w-[320px]"><Search size={15} className="text-t2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("mk_search")} className="w-full bg-transparent text-[13px] outline-none placeholder:text-t2" /></label>
          {enriching && <span className="text-[11.5px] text-t2">{t("mk_enriching")}</span>}
          <button onClick={csv} className="ms-auto flex h-9 items-center gap-2 rounded-[6px] border border-line2 px-3 text-[12.5px] text-t1 hover:bg-bg2 hover:text-t0"><Download size={14} />{t("mk_csv")}</button>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr className="border-b border-line">
              {cols.map((c, i) => (
                <th key={c.id} scope="col" aria-sort={sort.id === c.id ? (sort.desc ? "descending" : "ascending") : "none"} className={`whitespace-nowrap bg-bg1 px-3 py-2.5 ${c.align === "end" ? "text-end" : "text-start"} ${i === 0 ? "sticky start-0 z-10" : ""}`}>
                  {c.id === "trend" ? <span className="label">{c.label}</span> : <button onClick={() => setSort((s) => ({ id: c.id, desc: s.id === c.id ? !s.desc : c.id !== "symbol" }))} className="label inline-flex items-center gap-1 hover:text-t0">{c.label}{sort.id === c.id && (sort.desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}</button>}
                </th>))}
            </tr></thead>
            <tbody>
              {!uni ? <tr><td colSpan={cols.length} className="p-6 text-center text-t2">…</td></tr> : shown.length === 0 ? <tr><td colSpan={cols.length} className="p-8 text-center text-t2">{t("mk_noRows")}</td></tr> :
                shown.map((r) => (
                  <tr key={r.l.exchange + r.l.symbol} className="border-b border-line/60 transition-colors last:border-0 hover:bg-bg2/60">
                    {cols.map((c, i) => <td key={c.id} className={`px-3 py-2.5 align-middle ${c.align === "end" ? "text-end" : ""} ${i === 0 ? "sticky start-0 z-[1] bg-bg1" : ""} ${c.w ?? ""}`}>{c.cell(r, lang)}</td>)}
                  </tr>))}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-line px-4 py-2.5 text-[11px] text-t2">{t("st_dataNote")} {ex !== "DFM" && t("mk_adxNote")} <span className="num">{intl(shown.length, lang)}/{intl(uni?.length, lang)}</span></footer>
      </section>}
    </div>
  );
}
