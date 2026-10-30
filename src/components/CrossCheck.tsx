"use client";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { Card, Skeleton } from "./ui";
import { safeHttp } from "@/lib/url";
import { loadCrosscheck, latestPer, reconcile, fresh, distinctPublishers, type Crosscheck, type Reading, type Verdict, type Src } from "@/lib/crosscheck";

type Lang = "en" | "ar";
const T = {
  en: {
    tradeTitle: "Cross-check: UAE goods trade", investTitle: "Cross-check: UAE investment position", intro: "The headline figure comes from one IMF dataset. Here every other public source we could read is set beside it, so you can see whether they agree.",
    trade: ["UAE exports to them", "UAE imports from them"], invest: ["UAE investment position there", "Their position in the UAE"], mid: "middle of the sources", range: "range", src: "sources", of: "compared",
    v: { none: "No source", single: "One source only", agree: "Sources agree", close: "Close", differ: "Sources differ" } as Record<Verdict, string>,
    cols: ["Source", "Basis", "Year"], notCompared: "different year, not compared", reportsNone: "reports none", older: "older than the others, not compared",
    howTrade: "UAE-reported figures are what UAE customs filed; partner-reported ones are what the other country's customs say. They differ legitimately: partners value imports CIF and exports FOB, the UAE's re-exports are credited to different origins, and shipments are dated differently. A gap is a reason to look, not proof of an error.",
    howInvest: "A position is a stock at year-end. Partner-reported figures can only exist for countries that report to the IMF, OECD or Eurostat; a zero from a source that normally reports usually means the partner does not report the UAE, not that there is no investment. Countries differ on whether they count the first or the ultimate investor.",
    world: "UAE totals across all partners", worldHint: "Whole-economy figures, which show how far the sources sit from each other before any country is chosen.", exp: "Exports", imp: "Imports", out: "Outward", inn: "Inward", stock: "stock", flow: "flow (in the year)",
    unused: "Sources consulted but not used", pubs: "publishers", republisher: "republishes another source", primary: "compiles its own figures", bloc: "EU27 as a whole", noRows: "No source holds a figure for this country, so there is nothing to cross-check.", fail: "The cross-check data could not be loaded.", built: "Built",
  },
  ar: {
    tradeTitle: "مطابقة المصادر: تجارة الإمارات السلعية", investTitle: "مطابقة المصادر: المركز الاستثماري الإماراتي", intro: "الرقم الرئيسي مصدره مجموعة بيانات واحدة لدى صندوق النقد الدولي. هنا نضع بجانبه كل مصدر عام آخر استطعنا قراءته لترى هل يتفقون.",
    trade: ["صادرات الإمارات إليهم", "واردات الإمارات منهم"], invest: ["المركز الاستثماري الإماراتي هناك", "مركزهم في الإمارات"], mid: "وسط المصادر", range: "المدى", src: "مصادر", of: "مقارنة",
    v: { none: "لا مصدر", single: "مصدر واحد فقط", agree: "المصادر متفقة", close: "متقاربة", differ: "المصادر مختلفة" } as Record<Verdict, string>,
    cols: ["المصدر", "الأساس", "السنة"], notCompared: "سنة مختلفة، غير مقارَنة", reportsNone: "لا تسجّل شيئًا", older: "أقدم من الباقي، غير مقارَن",
    howTrade: "الأرقام التي تعلنها الإمارات هي ما قدمته جماركها، وأرقام الشريك هي ما تقوله جمارك الدولة الأخرى. والفروق مشروعة: يقيّم الشركاء الواردات بتكلفة وتأمين وشحن والصادرات فوب، وتُنسب إعادة التصدير الإماراتية إلى منشأ مختلف، وتختلف تواريخ الشحنات. الفجوة سبب للتدقيق وليست دليلاً على خطأ.",
    howInvest: "المركز رصيد في نهاية السنة. لا توجد أرقام الشريك إلا للدول التي تبلّغ صندوق النقد أو منظمة التعاون الاقتصادي أو يوروستات؛ والصفر من مصدر يبلّغ عادة يعني غالباً أن الشريك لا يسجّل الإمارات، وليس انعدام الاستثمار. وتختلف الدول في احتساب المستثمر المباشر أو النهائي.",
    world: "إجماليات الإمارات مع كل الشركاء", worldHint: "أرقام الاقتصاد ككل، تُظهر مدى تباعد المصادر قبل اختيار أي دولة.", exp: "الصادرات", imp: "الواردات", out: "الخارج", inn: "الداخل", stock: "رصيد", flow: "تدفق (خلال السنة)",
    unused: "مصادر جرت مراجعتها ولم تُستخدم", pubs: "جهات نشر", republisher: "تعيد نشر مصدر آخر", primary: "تُعدّ أرقامها بنفسها", bloc: "الاتحاد الأوروبي (27) ككل", noRows: "لا يوجد مصدر يملك رقماً لهذه الدولة، فلا شيء للمطابقة.", fail: "تعذّر تحميل بيانات المطابقة.", built: "أُنشئ",
  },
} as const;

const fmt = (m: number | null | undefined) => (m == null ? "—" : Math.abs(m) >= 1000 ? `$${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)}bn` : `$${Math.round(m)}m`);
const TONE: Record<Verdict, string> = { none: "var(--t2)", single: "var(--t2)", agree: "var(--ok)", close: "var(--warn)", differ: "var(--risk)" };
const Chip = ({ v, label }: { v: Verdict; label: string }) => <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${TONE[v]} 18%, transparent)`, color: TONE[v] }}>{label}</span>;
const Link = ({ s }: { s: Src }) => <a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" title={`${s.publisher}: ${s.note ?? ""}`} className="text-accent hover:underline">{s.name}</a>;

type Row = { s: Src; y: number; a?: number; b?: number; kind?: string };
function Tiles({ labels, reads, u, year }: { labels: readonly string[]; reads: Reading[]; u: (typeof T)["en"] | (typeof T)["ar"]; year: number }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {reads.map((r, i) => (
        <div key={i} className="rounded-[12px] bg-bg2 p-3">
          <div className="flex items-start justify-between gap-2"><span className="text-[11.5px] text-t1">{labels[i]}</span><Chip v={r.verdict} label={u.v[r.verdict]} /></div>
          <div className="num display mt-1 text-[22px] font-semibold text-t0">{fmt(r.median)}</div>
          <div className="num text-[11px] text-t2">{r.median != null && r.used.length > 1 ? `${u.mid} · ${u.range} ${fmt(r.min)} – ${fmt(r.max)} · ` : ""}{r.used.length} {u.src} {u.of} · {year}</div>
        </div>
      ))}
    </div>
  );
}

export function CrossCheck({ iso, kind }: { iso: string; kind: "trade" | "invest" }) {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed<Crosscheck>("cc", loadCrosscheck);
  const title = kind === "trade" ? u.tradeTitle : u.investTitle;
  if (q.loading) return <Card title={title} icon="🔎"><Skeleton h={90} /></Card>;
  const c = q.value; if (q.error || !c) return <Card title={title} icon="🔎"><p className="text-[12.5px] text-t1">{u.fail}</p></Card>;
  const items = latestPer(kind === "trade" ? c.trade.countries[iso] : c.invest.countries[iso]); const year = c.year;
  const rows: Row[] = items.map((i) => ({ s: c.sources[i.s], y: i.y, a: kind === "trade" ? (i as { x?: number }).x : (i as { out?: number }).out, b: kind === "trade" ? (i as { m?: number }).m : (i as { in?: number }).in })).filter((r) => r.s);
  // trade is compared in the same year only; a position is compared when the partner's figure is no more than a year older
  const comparable = (r: Row) => (kind === "trade" ? r.y === year : fresh([r], year - 1).length === 1);
  const reads = [0, 1].map((k) => reconcile(rows.filter(comparable).map((r) => ({ s: r.s.id, y: r.y, v: k === 0 ? r.a : r.b }))));
  const order = (r: Row) => (r.s.basis.startsWith("UAE") ? 0 : 1);
  rows.sort((p, q2) => order(p) - order(q2) || p.s.name.localeCompare(q2.s.name));
  const zeroOf = (r: Row, k: 0 | 1) => reads[k].zero.some((z) => z.s === r.s.id);
  const worldRows = (kind === "trade" ? c.trade.world : c.invest.world); const labels = kind === "trade" ? u.trade : u.invest;
  const eu = kind === "trade" ? c.trade.bloc?.eu27 : undefined;
  const unused = c.unavailable.filter((x) => x.measure === kind || x.measure === "both");
  const cell = (r: Row, v: number | undefined, k: 0 | 1) => (v == null ? "—" : <span className={zeroOf(r, k) ? "text-t2" : "text-t0"}>{fmt(v)}{zeroOf(r, k) && <span className="ms-1 text-[10px]">({u.reportsNone})</span>}</span>);
  return (
    <Card title={`${title} · ${distinctPublishers(c).length} ${u.pubs}`} icon="🔎">
      <p className="mb-2.5 text-[12px] leading-snug text-t1">{u.intro}</p>
      {!rows.length ? <p className="rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.noRows}</p> : (<>
        <Tiles labels={labels} reads={reads} u={u} year={year} />
        <div className="mt-3 divide-y divide-line/60 text-[12px]">
          <div className="grid grid-cols-[1fr_4.2rem_4.2rem] gap-x-2 pb-1 text-t2"><span>{u.cols[0]} · {u.cols[1]} · {u.cols[2]}</span><span className="text-end">{labels[0].split(" ").slice(0, 2).join(" ")}</span><span className="text-end">{labels[1].split(" ").slice(0, 2).join(" ")}</span></div>
          {rows.map((r) => (
            <div key={r.s.id} className="grid grid-cols-[1fr_4.2rem_4.2rem] items-start gap-x-2 py-1.5">
              <div className="min-w-0"><Link s={r.s} /><div className="text-[10.5px] leading-snug text-t2">{r.s.basis} · {r.y}{!comparable(r) && ` · ${kind === "trade" ? u.notCompared : u.older}`}</div></div>
              <span className="num text-end">{cell(r, r.a, 0)}</span><span className="num text-end">{cell(r, r.b, 1)}</span>
            </div>))}
        </div>
      </>)}
      <p className="mt-2.5 text-[11px] leading-snug text-t2">{kind === "trade" ? u.howTrade : u.howInvest}</p>
      <details className="mt-2.5 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.world}</summary>
        <p className="mt-1.5 text-[11px] leading-snug text-t2">{u.worldHint}</p>
        <div className="mt-2 divide-y divide-line/60 text-[12px]">
          <div className="grid grid-cols-[1fr_4.2rem_4.2rem] gap-x-2 pb-1 text-t2"><span>{u.cols[0]} · {u.cols[1]} · {u.cols[2]}</span><span className="text-end">{kind === "trade" ? u.exp : u.out}</span><span className="text-end">{kind === "trade" ? u.imp : u.inn}</span></div>
          {worldRows.map((w, i) => { const s = c.sources[w.s]; if (!s) return null; const a = kind === "trade" ? (w as { x?: number }).x : (w as { out?: number }).out, b = kind === "trade" ? (w as { m?: number }).m : (w as { in?: number }).in;
            return <div key={i} className="grid grid-cols-[1fr_4.2rem_4.2rem] items-start gap-x-2 py-1.5"><div className="min-w-0"><Link s={s} /><div className="text-[10.5px] leading-snug text-t2">{s.basis}{"kind" in w && w.kind ? ` · ${w.kind === "stock" ? u.stock : u.flow}` : ""} · {w.y}{s.kind === "republisher" ? ` · ${u.republisher}` : ""}</div></div><span className="num text-end text-t0">{fmt(a)}</span><span className="num text-end text-t0">{fmt(b)}</span></div>; })}
          {eu && <div className="grid grid-cols-[1fr_4.2rem_4.2rem] items-start gap-x-2 py-1.5"><div className="min-w-0"><Link s={c.sources.eurostat_trade} /><div className="text-[10.5px] leading-snug text-t2">{u.bloc} · {eu.y}</div></div><span className="num text-end text-t0">{fmt(eu.x)}</span><span className="num text-end text-t0">{fmt(eu.m)}</span></div>}
        </div>
      </details>
      <details className="mt-2 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.unused} · {unused.length}</summary>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-t1">{unused.map((x) => <li key={x.name}>· <a href={safeHttp(x.url)} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{x.name}</a>: {x.reason}</li>)}</ul>
        <p className="mt-2 text-[10.5px] text-t2">{u.built} {c.built.slice(0, 10)}</p></details>
    </Card>
  );
}
