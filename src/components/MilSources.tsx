"use client";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { Card, Skeleton } from "./ui";
import { safeHttp } from "@/lib/url";
import type { Verdict } from "@/lib/crosscheck";
import { loadMilSources, compareMeasure, wbItems, independentPublishers, type MItem, type MilSources, type MReading, type MSrc, type Why } from "@/lib/milsources";
import type { Series } from "@/lib/types";

type Lang = "en" | "ar";
const T = {
  en: {
    title: "Corroboration: military spending", intro: "The figure above comes from the World Bank, which republishes SIPRI. Here the other open sources we could read are set beside it, so you can see whether they agree.",
    tiles: ["Military spending, US$", "Share of GDP"], mid: "middle of the sources", range: "range", src: "independent sources compared:",
    v: { none: "No source", single: "One source only", agree: "Sources agree", close: "Close", differ: "Sources differ" } as Record<Verdict, string>,
    cols: ["Source · basis · year", "US$", "% of GDP"], why: { republisher: "republishes SIPRI, not counted again", same: "same figure as the IMF row (the IMF takes EU members from Eurostat), counted once", "other-year": "a different year, not compared" } as Record<Why, string>,
    est: "SIPRI estimate", unc: "SIPRI: highly uncertain", how: "These sources do not measure exactly the same thing. SIPRI follows the NATO definition and adds paramilitary forces and military pensions where it can; the IMF and Eurostat report the government's spending on the UN defence function; the US figure is federal outlays for a fiscal year (October to September). A gap is a reason to look, not proof of an error.",
    gap: "No figure from SIPRI", gapNone: "SIPRI publishes no figure for this country in recent years.", unused: "Sources consulted but not used", pubs: "independent publishers", built: "Built", fail: "The corroboration data could not be loaded.", none: "No source holds a figure for this country, so there is nothing to compare.", fy: "fiscal year",
  },
  ar: {
    title: "مطابقة المصادر: الإنفاق العسكري", intro: "الرقم أعلاه من البنك الدولي الذي يعيد نشر أرقام معهد ستوكهولم (سيبري). هنا نضع بجانبه المصادر المفتوحة الأخرى التي استطعنا قراءتها لترى هل تتفق.",
    tiles: ["الإنفاق العسكري، بالدولار", "النسبة من الناتج"], mid: "وسط المصادر", range: "المدى", src: "مصادر مستقلة مقارنة:",
    v: { none: "لا مصدر", single: "مصدر واحد فقط", agree: "المصادر متفقة", close: "متقاربة", differ: "المصادر مختلفة" } as Record<Verdict, string>,
    cols: ["المصدر · الأساس · السنة", "دولار", "% من الناتج"], why: { republisher: "يعيد نشر أرقام سيبري، فلا يُحتسب مرة أخرى", same: "الرقم نفسه في صف صندوق النقد (يأخذ أرقام دول الاتحاد الأوروبي من يوروستات)، يُحتسب مرة واحدة", "other-year": "سنة مختلفة، غير مقارَن" } as Record<Why, string>,
    est: "تقدير سيبري", unc: "سيبري: غير مؤكد بدرجة عالية", how: "لا تقيس هذه المصادر الشيء نفسه تماماً. يتبع سيبري تعريف الناتو ويضيف القوات شبه العسكرية والمعاشات العسكرية متى أمكن؛ ويورد صندوق النقد ويوروستات إنفاق الحكومة على وظيفة الدفاع في تصنيف الأمم المتحدة؛ أما الرقم الأمريكي فهو نفقات اتحادية لسنة مالية (أكتوبر إلى سبتمبر). الفجوة سبب للتدقيق وليست دليلاً على خطأ.",
    gap: "لا رقم من سيبري", gapNone: "لا ينشر سيبري رقماً لهذه الدولة في السنوات الأخيرة.", unused: "مصادر جرت مراجعتها ولم تُستخدم", pubs: "جهات نشر مستقلة", built: "أُنشئ", fail: "تعذّر تحميل بيانات المطابقة.", none: "لا يوجد مصدر يملك رقماً لهذه الدولة، فلا شيء للمقارنة.", fy: "سنة مالية",
  },
} as const;
const TONE: Record<Verdict, string> = { none: "var(--t2)", single: "var(--t2)", agree: "var(--ok)", close: "var(--warn)", differ: "var(--risk)" };
const money = (m: number | null | undefined) => (m == null ? "—" : Math.abs(m) >= 1000 ? `$${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)}bn` : `$${Math.round(m)}m`);
const share = (p: number | null | undefined) => (p == null ? "—" : `${p.toFixed(p < 10 ? 2 : 1)}%`);
const Chip = ({ v, label }: { v: Verdict; label: string }) => <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${TONE[v]} 18%, transparent)`, color: TONE[v] }}>{label}</span>;
const Link = ({ s }: { s: MSrc }) => <a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" title={`${s.publisher}: ${s.note ?? ""}`} className="text-accent hover:underline">{s.name}</a>;
const asSeries = (s?: Series) => (s ?? []).map((p) => ({ y: p.y, v: p.v }));

export function MilSources({ iso, usdSeries, gdpSeries }: { iso: string; usdSeries?: Series; gdpSeries?: Series }) {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed<MilSources>("ms", loadMilSources);
  if (q.loading) return <Card title={u.title} icon="🔎"><Skeleton h={90} /></Card>;
  const m = q.value; if (q.error || !m) return <Card title={u.title} icon="🔎"><p className="text-[12.5px] text-t1">{u.fail}</p></Card>;
  const items: MItem[] = [...(m.countries[iso] ?? []), ...wbItems(asSeries(usdSeries), asSeries(gdpSeries))];
  const reads: MReading[] = [compareMeasure(items, m.sources, "usd"), compareMeasure(items, m.sources, "gdp")];
  const ids = [...new Set(reads.flatMap((r) => r.rows.map((x) => x.src.id)))];
  const latestRow = (id: string) => { const a = reads[0].rows.find((x) => x.src.id === id)?.item, b = reads[1].rows.find((x) => x.src.id === id)?.item; return { usd: a, gdp: b }; };
  const srcOf = (id: string) => reads.flatMap((r) => r.rows).find((x) => x.src.id === id)!;
  const order = ids.sort((a, b) => Number(srcOf(b).counted) - Number(srcOf(a).counted) || srcOf(a).src.name.localeCompare(srcOf(b).src.name));
  const gap = m.gaps[iso]; const sipriGap = !m.countries[iso]?.some((i) => i.s === "sipri");
  return (
    <Card title={`${u.title} · ${independentPublishers(m).length} ${u.pubs}`} icon="🔎">
      <p className="mb-2.5 text-[12px] leading-snug text-t1">{u.intro}</p>
      {!ids.length ? <p className="rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.none}</p> : (<>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {reads.map((r, i) => (
            <div key={i} className="rounded-[12px] bg-bg2 p-3">
              <div className="flex items-start justify-between gap-2"><span className="text-[11.5px] text-t1">{u.tiles[i]}</span><Chip v={r.reading.verdict} label={u.v[r.reading.verdict]} /></div>
              <div className="num display mt-1 text-[22px] font-semibold text-t0">{i === 0 ? money(r.reading.median) : share(r.reading.median)}</div>
              <div className="num text-[11px] text-t2">{r.reading.median != null && r.reading.used.length > 1 ? `${u.mid} · ${u.range} ${i === 0 ? money(r.reading.min) : share(r.reading.min)} – ${i === 0 ? money(r.reading.max) : share(r.reading.max)} · ` : ""}{u.src} {r.reading.used.length}{r.year ? ` · ${r.year}` : ""}</div>
            </div>))}
        </div>
        <div className="mt-3 divide-y divide-line/60 text-[12px]">
          <div className="grid grid-cols-[1fr_4.2rem_4.2rem] gap-x-2 pb-1 text-t2"><span>{u.cols[0]}</span><span className="text-end">{u.cols[1]}</span><span className="text-end">{u.cols[2]}</span></div>
          {order.map((id) => { const x = srcOf(id), s = x.src, L = latestRow(id), why = reads.map((r) => r.rows.find((y) => y.src.id === id)).find((y) => y && !y.counted)?.why;
            const yr = [...new Set([L.usd?.y, L.gdp?.y].filter((y): y is number => y != null))].join(" / "); const flag = L.usd?.f ?? L.gdp?.f;
            return (
              <div key={id} className="grid grid-cols-[1fr_4.2rem_4.2rem] items-start gap-x-2 py-1.5">
                <div className="min-w-0"><Link s={s} /><div className="text-[10.5px] leading-snug text-t2">{s.basis} · {yr}{id === "ust_mts" ? ` (${u.fy})` : ""}{flag && ` · ${flag === "e" ? u.est : u.unc}`}{why && ` · ${u.why[why]}`}</div></div>
                <span className={`num text-end ${why ? "text-t2" : "text-t0"}`}>{money(L.usd?.usd)}</span><span className={`num text-end ${why ? "text-t2" : "text-t0"}`}>{share(L.gdp?.gdp)}</span>
              </div>); })}
          {sipriGap && <div className="py-1.5 text-[11.5px] leading-snug text-t1"><b className="text-t0">{u.gap}.</b> {gap?.note ?? gap?.sipri ?? u.gapNone}</div>}
        </div>
      </>)}
      <p className="mt-2.5 text-[11px] leading-snug text-t2">{u.how}</p>
      <details className="mt-2.5 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.unused} · {m.unavailable.length}</summary>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-t1">{m.unavailable.map((x) => <li key={x.name}>· <a href={safeHttp(x.url)} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{x.name}</a>: {x.reason}</li>)}</ul>
        <p className="mt-2 text-[10.5px] text-t2">{u.built} {m.built.slice(0, 10)}</p></details>
    </Card>
  );
}
