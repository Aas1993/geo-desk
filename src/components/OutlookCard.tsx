"use client";
import { useStore, useT } from "@/lib/store";
import { exportDemand, IND_LABEL, outlookRank, pct, useOutlook, useTrade, type OutlookRec } from "@/lib/intel-client";
import { Card, Skeleton } from "./ui";
import { useCountries } from "./SearchBox";

const KEYS = ["growth", "inflation", "ca", "debt", "unemployment"] as const; const YEARS = [2024, 2025, 2026, 2027, 2028] as const;
const T = { en: { title: "IMF outlook", f: "forecast", rankNote: (y: number, n: number) => `Ranks are for ${y} among ${n} countries, 1 being the highest value.`, of: "of", vs: "UAE", note: "IMF World Economic Outlook, live database (revised between quarterly vintages). Years from the current one onward are projections.", built: "Data built", demand: "Export demand outlook", demandNote: "GDP growth of the UAE's goods-export customers, weighted by each partner's share of UAE exports. A read on where UAE demand is headed, not a forecast of UAE exports.", coverage: "of exports covered", weighted: "Partner-weighted growth", top: "Largest export markets" },
  ar: { title: "توقعات صندوق النقد", f: "توقع", rankNote: (y: number, n: number) => `الترتيب لعام ${y} بين ${n} دولة، والأول هو الأعلى قيمة.`, of: "من", vs: "الإمارات", note: "آفاق الاقتصاد العالمي من صندوق النقد، القاعدة الحية (تُراجَع بين الإصدارات الفصلية). السنوات من الحالية فصاعدًا توقعات.", built: "تاريخ البناء", demand: "توقعات الطلب على الصادرات", demandNote: "نمو الناتج لدى عملاء صادرات الإمارات من السلع، مرجّحًا بحصة كل شريك من الصادرات. مؤشر على اتجاه الطلب لا توقع لصادرات الإمارات.", coverage: "من الصادرات مغطاة", weighted: "النمو المرجّح بالشركاء", top: "أكبر أسواق التصدير" } } as const;
const fmt = (k: keyof OutlookRec, v: number | undefined) => (v == null ? "—" : k === "gdp" ? `$${Math.round(v / 1000)}bn` : `${v.toFixed(1)}`);

/** IMF projections for one country: five indicators across 2024-2028, with the country's rank on the current-year figure and the UAE alongside. */
export function OutlookCard({ iso3 }: { iso3: string }) {
  const { lang } = useT(); const u = T[lang]; const o = useOutlook(); const cur = new Date().getFullYear();
  if (!o) return <Skeleton h={190} />; const r = o.countries[iso3]; if (!r) return null; const uae = o.countries.ARE;
  return (
    <Card title={`${u.title} · ${o.vintage}`} icon="🔭">
      <div className="overflow-x-auto"><table className="num w-full min-w-[330px] text-[12px]"><thead><tr className="text-t2"><th className="pb-1 text-start font-normal" />{YEARS.map((y) => <th key={y} className={`pb-1 text-end font-normal ${y >= cur ? "text-accent" : ""}`}>{y}{y >= cur ? "F" : ""}</th>)}</tr></thead>
        <tbody>{KEYS.map((k) => { const l = IND_LABEL[k]; const rk = outlookRank(o, iso3, k, cur); return (
          <tr key={k} className="border-t border-line/60"><td className="py-1.5 pe-2 text-start font-sans text-t1">{lang === "ar" ? l.ar : l.en}<div className="text-[10px] text-t2">{l.unit}{rk ? ` · #${rk.rank}/${rk.of}` : ""}</div></td>
            {YEARS.map((y) => { const v = r[k]?.[y]; const uv = uae?.[k]?.[y]; return <td key={y} className={`py-1.5 text-end ${y >= cur ? "text-t0" : "text-t1"}`}>{fmt(k, v)}{iso3 !== "ARE" && uv != null && <div className="text-[9.5px] text-t2">{u.vs} {fmt(k, uv)}</div>}</td>; })}</tr>); })}</tbody></table></div>
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.rankNote(cur, Object.keys(o.countries).length)} {u.note} <a className="underline hover:text-accent" href={o.source.url} target="_blank" rel="noreferrer noopener">IMF</a> · {u.built} {o.built.slice(0, 10)}.</p>
    </Card>
  );
}

/** For the UAE's own page: where the demand from its export customers is expected to go. */
export function ExportDemand() {
  const { lang } = useT(); const u = T[lang]; const o = useOutlook(); const t = useTrade(); const cs = useCountries(); const select = useStore((s) => s.select); const cur = new Date().getFullYear(); const years = [cur, cur + 1, cur + 2];
  if (!o || !t) return <Skeleton h={160} />; const d = exportDemand(t, o, years);
  return (
    <Card title={u.demand} icon="🌐">
      <div className="grid grid-cols-3 gap-2">{years.map((y) => <div key={y} className="rounded-[8px] border border-line bg-bg2 p-2"><div className="label">{y}F</div><div className={`num mt-0.5 text-[19px] font-semibold ${(d.weighted[y] ?? 0) >= 3 ? "text-up" : "text-t0"}`}>{d.weighted[y] != null ? pct(d.weighted[y]!, 1) : "—"}</div></div>)}</div>
      <div className="mb-1 mt-3 flex items-center justify-between"><span className="label">{u.top}</span><span className="num flex gap-0 text-[10px] text-t2">{years.map((y) => <span key={y} className="w-12 text-end">{y}F</span>)}</span></div>
      <ul className="space-y-1 text-[12.5px]">{d.top.map((r) => { const c = cs?.byIso.get(r.iso3); return <li key={r.iso3} className="flex items-center justify-between gap-2"><button onClick={() => select(r.iso3, "economy")} className="min-w-0 flex-1 truncate text-start hover:text-accent"><span aria-hidden>{c?.flag}</span> {c?.name ?? r.iso3}</button>{years.map((y) => <span key={y} className="num w-12 text-end text-t1">{r.g[y] != null ? (r.g[y] as number).toFixed(1) : "—"}</span>)}</li>; })}</ul>
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.demandNote} {Math.round(d.coverage * 100)}% {u.coverage}. {o.vintage}.</p>
    </Card>
  );
}
