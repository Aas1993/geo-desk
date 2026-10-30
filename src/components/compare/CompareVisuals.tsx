"use client";
import { Star } from "lucide-react";
import { COUNTRY_COLORS, SERIES, fmtValue, leaders, nameOf, norm, radarGeometry, rivalRows, type Axis, type CompareCountry, type Lang, type Metric } from "@/lib/compare";

export const colorOf = (cs: CompareCountry[], iso: string) => COUNTRY_COLORS[Math.max(0, cs.findIndex((c) => c.iso === iso)) % COUNTRY_COLORS.length];
const dim = (hi: string | null, iso: string) => (hi && hi !== iso ? 0.28 : 1);

/** The legend and highlight control: hovering or focusing a country brings it forward on every chart. */
export function Legend({ cs, L, setHi }: { cs: CompareCountry[]; L: Lang; setHi: (iso: string | null) => void }) {
  return <ul className="flex flex-wrap gap-1.5" aria-label={L === "ar" ? "الدول" : "Countries"}>{cs.map((c) => <li key={c.iso}><button type="button" onMouseEnter={() => setHi(c.iso)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(c.iso)} onBlur={() => setHi(null)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-bg2 px-2.5 text-[12px] text-t0 hover:border-accent"><i className="inline-block size-2.5 rounded-full" style={{ background: colorOf(cs, c.iso) }} />{c.flag} {nameOf(c, L)}</button></li>)}</ul>;
}

/** Who leads on how many figures (only figures that name a leader). */
export function LeaderTally({ cs, rows, L, hi }: { cs: CompareCountry[]; rows: { iso: string; leads: number; of: number }[]; L: Lang; hi: string | null }) {
  const of = rows[0]?.of ?? 0;
  return <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cs.length, 4)}, minmax(0, 1fr))` }}>{cs.map((c) => { const r = rows.find((x) => x.iso === c.iso); const col = colorOf(cs, c.iso); return (
    <div key={c.iso} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${col}`, opacity: dim(hi, c.iso) }}><div className="truncate text-[12px] font-semibold text-t0">{c.flag} {nameOf(c, L)}</div><div className="num display mt-1 text-[28px] font-semibold leading-none" style={{ color: col }}>{r?.leads ?? 0}</div><div className="mt-0.5 text-[11px] text-t2">{L === "ar" ? `ريادة من ${of}` : `leads out of ${of}`}</div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg3"><i className="block h-full" style={{ width: `${of ? ((r?.leads ?? 0) / of) * 100 : 0}%`, background: col }} /></div></div>); })}</div>;
}

/** The radar: one polygon per country over the axes. The axis values are 0 to 100 (see radarAxes); a country with no value on an axis is at the centre there and the legend says so. */
export function Radar({ cs, axes, L, hi }: { cs: CompareCountry[]; axes: Axis[]; L: Lang; hi: string | null }) {
  const g = radarGeometry(axes, cs.map((c) => c.iso), 340); if (!g) return <p className="rounded-[10px] border border-dashed border-line p-3 text-[12px] text-t2">{L === "ar" ? "لا يكفي ثلاثة محاور من البيانات المحفوظة لرسم الرادار. اختر مقاييس أكثر." : "Fewer than three of the chosen figures are held, so there is no radar. Turn on more figures."}</p>;
  return (
    <figure className="flex flex-wrap items-center gap-4"><svg viewBox="0 0 340 340" className="h-auto w-full max-w-[380px]" role="img" aria-label={L === "ar" ? "رادار المقارنة" : "Comparison radar"}>
      {g.rings.map((r) => <polygon key={r.pct} points={r.points} fill="none" stroke="var(--line)" strokeWidth="1" />)}
      {g.spokes.map((s) => <g key={s.id}><line x1={g.cx} y1={g.cy} x2={s.x} y2={s.y} stroke="var(--line)" /><text x={s.lx} y={s.ly} textAnchor={s.anchor} dominantBaseline="middle" fontSize="10.5" fill="var(--t1)">{s.label}</text></g>)}
      {g.shapes.map((sh) => { const col = colorOf(cs, sh.iso); const o = dim(hi, sh.iso); return <g key={sh.iso} opacity={o}><polygon points={sh.points} fill={col} fillOpacity="0.14" stroke={col} strokeWidth={hi === sh.iso ? 3 : 2} />{sh.dots.map((d) => d.held && <circle key={d.id} cx={d.x} cy={d.y} r="3" fill={col}><title>{`${nameOf(cs.find((c) => c.iso === sh.iso)!, L)}: ${axes.find((a) => a.id === d.id)?.label} ${Math.round(axes.find((a) => a.id === d.id)?.vals[sh.iso] ?? 0)}/100`}</title></circle>)}</g>; })}
    </svg>
      <figcaption className="min-w-48 flex-1 space-y-1.5 text-[11.5px] text-t1"><p className="text-t2">{L === "ar" ? "كل محور من 0 إلى 100: رقم على مقياسه، أو للأعداد والمبالغ نسبة إلى الأعلى بين الدول المختارة." : "Each axis is 0 to 100: a figure on its own scale, or for counts and money relative to the highest of the chosen countries."}</p>{cs.map((c) => { const miss = axes.filter((a) => a.vals[c.iso] == null).map((a) => a.label); return <p key={c.iso}><i className="me-1.5 inline-block size-2.5 rounded-full" style={{ background: colorOf(cs, c.iso) }} /><b className="text-t0">{nameOf(c, L)}</b>{miss.length > 0 && <span className="text-t2"> · {L === "ar" ? "غير محفوظ" : "not held"}: {miss.join(", ")}</span>}</p>; })}</figcaption>
    </figure>
  );
}

/** One small multiple: a figure with one bar per country, the leader starred. Bars are 0 to 100 of the figure's own scale or of the highest country; the number beside each bar is the real value. */
export function MetricCard({ m, cs, L, hi, showLeader }: { m: Metric; cs: CompareCountry[]; L: Lang; hi: string | null; showLeader: boolean }) {
  const lead = showLeader ? leaders(m, cs) : [];
  return (
    <li className="rounded-[12px] border border-line bg-bg2 p-3"><p className="text-[12px] font-semibold leading-snug text-t0">{L === "ar" ? m.ar : m.en}{m.dir === "low" && <span className="ms-1 font-normal text-t2">({L === "ar" ? "الأدنى أفضل" : "lower is better"})</span>}</p>
      <div className="mt-2 space-y-1.5">{cs.map((c) => { const v = c.v[m.id]; const n = norm(m, v, cs); const isLead = lead.includes(c.iso); const col = colorOf(cs, c.iso); return (
        <div key={c.iso} className="flex items-center gap-2" style={{ opacity: dim(hi, c.iso) }}><span className="w-16 shrink-0 truncate text-[11px] text-t1">{c.flag} {nameOf(c, L)}</span><span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-bg3">{n != null && <i className="block h-full rounded-full" style={{ width: `${Math.max(2, n)}%`, background: col }} />}</span><span className={`numt flex w-24 shrink-0 items-center justify-end gap-1 text-[11.5px] ${v == null ? "text-t2" : isLead ? "font-semibold text-ok" : "text-t0"}`} dir="ltr">{isLead && <Star size={11} aria-label={L === "ar" ? "الأفضل" : "leader"} fill="currentColor" />}{fmtValue(m, v, L)}</span></div>); })}</div></li>
  );
}

/** The UAE against the rivals in each country's trade: the UAE and the five largest rivals, as bars of share. */
export function RivalBars({ cs, L, hi, names }: { cs: CompareCountry[]; L: Lang; hi: string | null; names: (iso: string) => string }) {
  return <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{cs.map((c) => { const rows = rivalRows(c); const top = Math.max(1, ...rows.map((r) => r.share)); const col = colorOf(cs, c.iso); return (
    <div key={c.iso} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${col}`, opacity: dim(hi, c.iso) }}><p className="mb-1.5 truncate text-[12px] font-semibold text-t0">{c.flag} {nameOf(c, L)}</p>{rows.length ? <ul className="space-y-1">{rows.map((r) => <li key={r.iso} className="flex items-center gap-2 text-[11px]"><span className={`w-20 shrink-0 truncate ${r.uae ? "font-semibold text-t0" : "text-t1"}`}>{r.uae ? (L === "ar" ? "الإمارات" : "UAE") : names(r.iso)}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-bg3"><i className="block h-full rounded-full" style={{ width: `${(r.share / top) * 100}%`, background: r.uae ? "var(--ok)" : "var(--t2)" }} /></span><span className="numt w-10 shrink-0 text-end text-t0" dir="ltr">{r.share}%</span></li>)}</ul> : <p className="text-[11.5px] text-t2">{L === "ar" ? "غير محفوظ" : "not held"}</p>}</div>); })}</div>;
}

/** A time series as small bars, one panel per country (same scale across the panels so they can be read against each other). Series with negative years hang below the line. A country with fewer than two observed years shows "not held". */
export function TrendCards({ cs, L, hi, kind }: { cs: CompareCountry[]; L: Lang; hi: string | null; kind: string }) {
  const sd = SERIES.find((x) => x.id === kind); const all = cs.flatMap((c) => (c.series[kind] ?? []).map(([, v]) => v)); const hiV = Math.max(0, ...all), loV = Math.min(0, ...all); const span = hiV - loV || 1; const W = 150, H = 46; const zero = (hiV / span) * H; const fmt = (v: number) => fmtValue({ fmt: sd?.fmt ?? "n" } as Metric, v, L);
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{cs.map((c) => { const s = c.series[kind] ?? []; const col = colorOf(cs, c.iso); const bw = s.length ? W / s.length : W; return (
      <figure key={c.iso} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ opacity: dim(hi, c.iso) }}><figcaption className="mb-1 truncate text-[12px] font-semibold text-t0">{c.flag} {nameOf(c, L)}</figcaption>
        {s.length < 2 ? <p className="text-[11.5px] text-t2">{L === "ar" ? "غير محفوظ" : "not held"}</p> : <><svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" role="img" aria-label={`${nameOf(c, L)} ${sd ? (L === "ar" ? sd.ar : sd.en) : kind}`}><line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--line)" />{s.map(([y, v], i) => { const h = Math.max(1, (Math.abs(v) / span) * H); return <rect key={y} x={i * bw + 1} y={v >= 0 ? zero - h : zero} width={Math.max(1, bw - 2)} height={h} rx="1" fill={col}><title>{`${y}: ${fmt(v)}`}</title></rect>; })}</svg>
          <p className="numt mt-1 flex justify-between text-[10.5px] text-t2" dir="ltr"><span>{s[0][0]}</span><span className="text-t0">{fmt(s[s.length - 1][1])} ({s[s.length - 1][0]})</span></p></>}</figure>); })}</div>
  );
}
