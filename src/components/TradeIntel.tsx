"use client";
import { useMemo } from "react";
import { useStore, useT } from "@/lib/store";
import { cepaEffect, pct, tradeSummary, useTrade, usdM, type TradeData } from "@/lib/intel-client";
import { useAgreements } from "@/lib/agreements-client";
import { Card, Skeleton, StatTile } from "./ui";
import { useCountries } from "./SearchBox";
import type { Country } from "@/lib/types";

const T = {
  en: { title: "UAE goods trade with", total: "Total trade", exports: "UAE exports", imports: "UAE imports", balance: "Balance", share: "of UAE trade", rank: "partner", of: "of", yoy: "vs previous year", ttm: "last 12 months", ttmv: "vs the 12 before", cepa: "CEPA entered into force", since: "Trade since the CEPA", base: "avg before", vsWorld: "UAE overall", ahead: "ahead of the UAE overall", behind: "behind the UAE overall", covid: "The baseline includes 2020-21, when trade was depressed by the pandemic, so the growth figures look larger than a normal year; the gap to the UAE overall is the fairer read.", early: "Too early to judge: the CEPA took effect less than a full year ago.", caveat: "Correlation, not proof: re-exports, the Gulf war, prices and other deals all move these numbers.", note: "UAE customs data via the IMF (goods only). Exports are FOB and include re-exports; imports are CIF.", none: "No UAE-reported goods trade with this country.", asOf: "to", built: "Data built", pp: "pp" },
  ar: { title: "تجارة السلع الإماراتية مع", total: "إجمالي التجارة", exports: "صادرات الإمارات", imports: "واردات الإمارات", balance: "الميزان", share: "من تجارة الإمارات", rank: "شريك", of: "من", yoy: "مقابل العام السابق", ttm: "آخر 12 شهرًا", ttmv: "مقابل الـ12 قبلها", cepa: "بدء سريان اتفاقية الشراكة", since: "التجارة منذ الاتفاقية", base: "المتوسط قبل", vsWorld: "إجمالي الإمارات", ahead: "متقدمة على إجمالي الإمارات", behind: "متأخرة عن إجمالي الإمارات", covid: "تشمل المقارنة 2020-21 حين كانت التجارة متراجعة بسبب الجائحة، فتبدو نسب النمو أكبر من عام عادي؛ والفارق عن إجمالي الإمارات هو القراءة الأعدل.", early: "مبكر للحكم: بدأ سريان الاتفاقية قبل أقل من عام كامل.", caveat: "ارتباط لا إثبات: إعادة التصدير والحرب في الخليج والأسعار واتفاقيات أخرى كلها تحرك هذه الأرقام.", note: "بيانات الجمارك الإماراتية عبر صندوق النقد (السلع فقط). الصادرات FOB وتشمل إعادة التصدير؛ الواردات CIF.", none: "لا توجد تجارة سلع مُبلَّغ عنها من الإمارات مع هذه الدولة.", asOf: "حتى", built: "تاريخ البناء", pp: "نقطة" },
} as const;

function Bars({ series, cepaYear }: { series: { y: number; x: number; m: number }[]; cepaYear?: number }) {
  const w = 320, h = 120, pad = 16; const max = Math.max(...series.flatMap((s) => [s.x, s.m]), 1); const bw = (w - pad) / series.length; const y = (v: number) => h - 14 - (v / max) * (h - 26);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" role="img" aria-label="Exports and imports by year">
      {series.map((s, i) => { const x0 = pad / 2 + i * bw; return <g key={s.y}><rect x={x0 + bw * 0.1} y={y(s.x)} width={bw * 0.38} height={h - 14 - y(s.x)} rx="1.5" fill="var(--accent)" /><rect x={x0 + bw * 0.52} y={y(s.m)} width={bw * 0.38} height={h - 14 - y(s.m)} rx="1.5" fill="var(--c2)" opacity="0.85" />{i % 2 === (series.length - 1) % 2 && <text x={x0 + bw / 2} y={h - 2} textAnchor="middle" fontSize="8.5" fill="var(--t2)">{String(s.y).slice(2)}</text>}</g>; })}
      {cepaYear != null && (() => { const i = series.findIndex((s) => s.y === cepaYear); if (i < 0) return null; const x0 = pad / 2 + i * bw; return <g><line x1={x0} x2={x0} y1="4" y2={h - 14} stroke="#ffc247" strokeDasharray="3 3" /><text x={x0 + 3} y="11" fontSize="9" fill="#ffc247">CEPA</text></g>; })()}
    </svg>
  );
}

/** UAE goods trade with one country: totals, share, rank, momentum, a yearly chart and, for a CEPA partner, what happened to trade since it took effect. */
export function UaeTradeCard({ c }: { c: Country }) {
  const { lang } = useT(); const u = T[lang]; const t = useTrade(); const ag = useAgreements(); const s = useMemo(() => (t ? tradeSummary(t, c.iso3) : null), [t, c.iso3]); const cepa = ag?.countries[c.iso3]?.cepa; const eff = t ? cepaEffect(t, c.iso3, cepa?.inForce ?? null) : null;
  if (!t) return <Skeleton h={160} />; const name = c.name.replace(/,.*$/, "");
  return (
    <Card title={`${u.title} ${name}`} icon="📦">
      {!s ? <p className="text-[12.5px] text-t1">{u.none}</p> : (
        <>
          <div className="grid grid-cols-2 gap-2"><StatTile label={`${u.total} ${s.year}`} value={usdM(s.total / 1)} sub={s.yoy != null ? `${pct(s.yoy, 1)} ${u.yoy}` : undefined} /><StatTile label={u.share} value={`${s.share.toFixed(1)}%`} sub={`#${s.rank} ${u.rank} ${u.of} ${s.of}`} />
            <StatTile label={u.exports} value={usdM(s.x)} /><StatTile label={u.imports} value={usdM(s.m)} sub={`${u.balance} ${usdM(s.balance)}`} /></div>
          {s.ttm && <p className="num mt-2 text-[12.5px] text-t1">{u.ttm}{t.asOfQuarter ? ` (${u.asOf} ${t.asOfQuarter})` : ""}: <b className="text-t0">{usdM(s.ttm.total)}</b> <span className={s.ttm.growth >= 0 ? "text-up" : "text-down"}>{pct(s.ttm.growth, 1)}</span> {u.ttmv}</p>}
          <Bars series={s.series} cepaYear={eff?.inForceYear ?? (cepa?.inForce ? +cepa.inForce.slice(0, 4) : undefined)} />
          <div className="num mt-1 flex gap-3 text-[10.5px] text-t2"><span><i className="me-1 inline-block size-2 rounded-sm bg-accent" />{u.exports}</span><span><i className="me-1 inline-block size-2 rounded-sm bg-c2" />{u.imports}</span></div>
          {cepa?.inForce && (
            <div className="mt-3 rounded-[10px] border border-line bg-bg2 p-2.5 text-[12.5px]">
              <div className="label">{u.since} · {u.cepa} {cepa.inForce.slice(0, 7)}</div>
              {eff ? <><p className="num mt-1 text-t0">{u.base} {eff.baseYears.map((y) => String(y)).join("–")}: {usdM(eff.base)} → {eff.latestYear}: <b>{usdM(eff.latest)}</b> <span className={eff.partnerGrowth >= 0 ? "text-up" : "text-down"}>{pct(eff.partnerGrowth)}</span></p>
                <p className="num mt-0.5 text-t1">{u.vsWorld}: {pct(eff.worldGrowth)} · <span className={eff.effect >= 0 ? "text-up" : "text-down"}>{eff.effect >= 0 ? "+" : ""}{eff.effect.toFixed(0)} {u.pp}</span> {eff.effect >= 0 ? u.ahead : u.behind}</p><p className="mt-1 text-[11px] leading-snug text-t2">{eff.baseYears.some((y) => y === 2020 || y === 2021) ? `${u.covid} ` : ""}{u.caveat}</p></> : <p className="mt-1 text-t1">{u.early}</p>}
            </div>
          )}
        </>
      )}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.note} <a className="underline hover:text-accent" href={t.source.url} target="_blank" rel="noreferrer noopener">IMF</a> · {u.built} {t.built.slice(0, 10)}.</p>
    </Card>
  );
}

/** The UAE's own page: every CEPA in force, ranked by how trade with that partner has moved against the UAE's overall trade. */
export function CepaImpactTable() {
  const { lang } = useT(); const u = T[lang]; const t = useTrade() as TradeData | null; const ag = useAgreements(); const cs = useCountries(); const select = useStore((s) => s.select);
  const rows = useMemo(() => (t && ag ? Object.entries(ag.countries).filter(([, c]) => c.cepa?.inForce).map(([k, c]) => ({ iso: k, inForce: c.cepa!.inForce!, eff: cepaEffect(t, k, c.cepa!.inForce) })).sort((a, b) => (b.eff?.effect ?? -999) - (a.eff?.effect ?? -999)) : []), [t, ag]);
  if (!t || !ag) return <Skeleton h={160} />;
  return (
    <Card title={`${u.since}: CEPA impact`} icon="📈">
      <ul className="divide-y divide-line/60">{rows.map((r) => { const c = cs?.byIso.get(r.iso); return (
        <li key={r.iso} className="flex items-baseline justify-between gap-2 py-1.5 text-[12.5px]"><button onClick={() => select(r.iso, "trade")} className="min-w-0 flex-1 truncate text-start hover:text-accent"><span aria-hidden>{c?.flag}</span> {c?.name ?? r.iso} <span className="num text-t2">{r.inForce.slice(0, 7)}</span></button>
          {r.eff ? <span className="num shrink-0 text-end"><span className={r.eff.partnerGrowth >= 0 ? "text-up" : "text-down"}>{pct(r.eff.partnerGrowth)}</span> <span className="text-t2">· </span><span className={r.eff.effect >= 0 ? "text-up" : "text-down"}>{r.eff.effect >= 0 ? "+" : ""}{r.eff.effect.toFixed(0)}{u.pp}</span></span> : <span className="text-[11px] text-t2">{+r.inForce.slice(0, 4) > t.lastYear - 1 ? (lang === "ar" ? "مبكر" : "too early") : (lang === "ar" ? "لا بيانات كافية" : "not enough data")}</span>}</li>); })}</ul>
      <p className="mt-2 text-[11px] leading-snug text-t2">{lang === "ar" ? "النسبة الأولى: نمو التجارة مع الشريك من متوسط السنتين قبل السريان إلى آخر سنة كاملة. الثانية: الفرق عن نمو إجمالي تجارة الإمارات في المدة نفسها." : `First figure: growth in trade with the partner from the average of the two years before entry into force to ${t.lastYear}. Second: the gap to the UAE's total trade growth over the same span.`} {u.caveat} {u.note}</p>
    </Card>
  );
}
