"use client";
import { useKeyed } from "@/lib/useKeyed";
import { safeHttp } from "@/lib/url";
import type { Verdict } from "@/lib/crosscheck";
import { loadFinSources, buildRows, WB_FIN, type FinSources as Data, type FSrc, type WbDict, type Row } from "@/lib/finsources";
import { Block, Pill } from "../falcon/bits";
import { Tbl } from "../machiavelli/parts";
import { Loading, Note } from "./bits";
import { fmtN } from "./types";

type Lang = "en" | "ar";
const T = {
  en: {
    title: "Newer and independent sources", sub: "The table above is the World Bank's annual series, which for the UAE's banks stops at 2024. These are the IMF's and the BIS's own figures, with the period on every one, set beside it so you can see whether they agree.",
    cols: ["Indicator", "Source · figure · period", "Check"], v: { none: "No source", single: "No like-for-like pair", agree: "Agree", close: "Close", differ: "Differ" } as Record<Verdict, string>,
    one: "One source only", derived: "derived by Geo Desk from IMF items", notComp: "different period, shown but not compared", limits: "Agree means within 0.5 percentage points (ratios and rates), 0.5% (exchange rates) or 1.5 points of year-on-year change (effective-rate indices); close is within 2 points, 5% or 4 points. The World Bank's bank indicators are the IMF's FSI data republished later, so agreement there is expected and a gap is mostly timing or restatement.",
    other: "for", unused: "Looked for and not available", built: "Built", fail: "The corroboration data could not be loaded.", none: "Neither the IMF nor the BIS holds a figure for this country, so there is nothing to add.", formula: "How the bank ratios are derived",
  },
  ar: {
    title: "مصادر أحدث ومستقلة", sub: "الجدول أعلاه هو السلسلة السنوية للبنك الدولي، وهي تتوقف عند 2024 بالنسبة لمصارف الإمارات. وهنا أرقام صندوق النقد وبنك التسويات الدولية مع الفترة على كل رقم، لترى هل تتفق.",
    cols: ["المؤشر", "المصدر · الرقم · الفترة", "المطابقة"], v: { none: "لا مصدر", single: "لا زوج قابل للمقارنة", agree: "متفقة", close: "متقاربة", differ: "مختلفة" } as Record<Verdict, string>,
    one: "مصدر واحد فقط", derived: "محسوب من بنود صندوق النقد", notComp: "فترة مختلفة، معروضة وغير مقارَنة", limits: "التطابق يعني ضمن 0.5 نقطة مئوية (النسب والأسعار) أو 0.5% (أسعار الصرف) أو 1.5 نقطة من التغير السنوي (مؤشرات أسعار الصرف الفعلية)؛ والتقارب ضمن نقطتين أو 5% أو 4 نقاط. مؤشرات البنك الدولي المصرفية هي بيانات صندوق النقد نفسها معاد نشرها لاحقاً، فالاتفاق متوقع والفجوة غالباً توقيت أو إعادة تقدير.",
    other: "لـ", unused: "جرى البحث عنها وغير متاحة", built: "أُنشئ", fail: "تعذّر تحميل بيانات المطابقة.", none: "لا يملك صندوق النقد ولا بنك التسويات رقماً لهذه الدولة، فلا شيء يُضاف.", formula: "كيف تُحسب النسب المصرفية",
  },
} as const;
const TONE: Record<Verdict, string> = { none: "var(--t2)", single: "var(--t2)", agree: "var(--ok)", close: "var(--warn)", differ: "var(--risk)" };
const show = (r: Row, v: number) => (r.unit === "%" ? `${fmtN(v, 2)}%` : r.id === "fx" ? fmtN(v, 4) : fmtN(v, 2));

function Rows({ L, label, wb, f, data, u }: { L: Lang; label: string | null; wb: WbDict; f: Data["countries"][string] | undefined; data: Data; u: (typeof T)["en"] | (typeof T)["ar"] }) {
  const rows = buildRows(wb, f); const src = (id: string): FSrc => (id === "wb" ? WB_FIN : data.sources[id]);
  if (!rows.length) return <Note>{u.none}</Note>;
  return (<div>
    {label && <h4 className="label mb-1.5">{u.other} {label}</h4>}
    <Tbl head={[...u.cols]} w={["28%", "56%", "16%"]} rows={rows.map((r) => [
      <span key="a"><b className="text-t0">{r.label[L]}</b>{r.compareNote && <span className="block text-[11px] text-t2">{r.compareNote}</span>}</span>,
      <ul key="b" className="space-y-1">{r.cells.map((c, i) => { const s = src(c.s); return (
        <li key={i}><a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" title={`${s.publisher}: ${s.note ?? s.basis}`} className="text-accent hover:underline">{s.name}</a> <span className="num font-semibold text-t0">{show(r, c.v)}</span> <span className="num text-t2">({c.when})</span>
          <span className="block text-[10.5px] text-t2">{[c.derived ? u.derived : "", !c.compared && r.cells.length > 1 && r.cells.some((x) => x.compared) ? u.notComp : ""].filter(Boolean).join(" · ")}</span></li>); })}</ul>,
      <Pill key="c" c={TONE[r.verdict]}>{r.verdict === "single" && new Set(r.cells.map((c) => c.s)).size < 2 ? u.one : u.v[r.verdict]}</Pill>])} />
  </div>);
}

export function FinSources({ L, aWb, bWb, iso, name }: { L: Lang; aWb: WbDict; bWb: WbDict; iso: string | null; name: string | null }) {
  const u = T[L]; const q = useKeyed<Data>("fs", loadFinSources);
  if (q.loading) return <Loading L={L} />;
  const d = q.value; if (q.error || !d) return <Loading L={L} err={u.fail} />;
  const f = d.sources.imf_fsi.formula ?? {}; const unavailable = d.unavailable;
  return (
    <Block title={u.title} hint={u.sub}>
      <div className="space-y-4">
        <Rows L={L} label={null} wb={aWb} f={d.countries.ARE} data={d} u={u} />
        {iso && name && <Rows L={L} label={name} wb={bWb} f={d.countries[iso]} data={d} u={u} />}
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-t2">{u.limits}</p>
      <details className="mt-2.5 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.formula}</summary>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-t1">{Object.entries(f).map(([k, v]) => <li key={k}>· <b className="text-t0">{k}</b>: {v}</li>)}</ul></details>
      <details className="mt-2 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.unused} · {unavailable.length}</summary>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-t1">{unavailable.map((x) => <li key={x.name}>· <a href={safeHttp(x.url)} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{x.name}</a>: {x.reason}</li>)}</ul>
        <p className="mt-2 text-[10.5px] text-t2">{u.built} {d.built.slice(0, 10)}</p></details>
    </Block>
  );
}
