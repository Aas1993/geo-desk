"use client";
import { useState } from "react";
import { useStore, useT } from "@/lib/store";
import { usdM, usePartnership, type PartnerRec } from "@/lib/intel-client";
import { usd } from "@/lib/investment-client";
import { Card, Skeleton } from "./ui";
import { useCountries } from "./SearchBox";

const T = {
  en: { title: "UAE Partnership Index", of: "of", closest: "Closest partners", how: "How it is calculated", comps: { trade: "Trade", engagement: "Diplomatic engagement", agreements: "Agreements & CEPA", connectivity: "Flights & embassy", investment: "UAE investment", alignment: "UN voting alignment" }, w: "weight",
    note: "A percentile-based composite of six signals already in this app. It measures how dense and active the ties are, not friendship or influence, and a country with no data on a signal scores 0 there.", noData: "no data", engagements: "senior-weighted engagements (12 months)", agreementsN: "agreements (+ CEPA bonus)", flights: "destinations", embassy: "embassy", votes: "of UN votes shared with the UAE", built: "Data built", tradeY: "goods trade" },
  ar: { title: "مؤشر الشراكة مع الإمارات", of: "من", closest: "أقرب الشركاء", how: "كيف يُحسب", comps: { trade: "التجارة", engagement: "التفاعل الدبلوماسي", agreements: "الاتفاقيات والشراكة الشاملة", connectivity: "الرحلات والسفارة", investment: "الاستثمار الإماراتي", alignment: "التوافق في تصويت الأمم المتحدة" }, w: "الوزن",
    note: "مركّب قائم على النسب المئوية لست إشارات موجودة في هذا التطبيق. يقيس كثافة الروابط ونشاطها لا الصداقة أو النفوذ، ومن لا بيانات لها في إشارة تحصل على صفر فيها.", noData: "لا بيانات", engagements: "تفاعلات مرجّحة بالمستوى (12 شهرًا)", agreementsN: "اتفاقيات (+ مكافأة الشراكة الشاملة)", flights: "وجهات", embassy: "سفارة", votes: "من تصويت الأمم المتحدة مشترك مع الإمارات", built: "تاريخ البناء", tradeY: "تجارة السلع" },
} as const;
const tone = (s: number) => (s >= 75 ? "#2de39a" : s >= 50 ? "#3ddcff" : s >= 25 ? "#ffb547" : "#9db0cf");
const detail = (k: keyof PartnerRec["c"], r: PartnerRec["raw"], lang: "en" | "ar", u: (typeof T)["en"] | (typeof T)["ar"], year: number) => {
  switch (k) {
    case "trade": return r.trade ? `${usdM(r.trade)} · ${u.tradeY} ${year}` : u.noData;
    case "engagement": return r.engagement ? `${r.engagement} ${u.engagements}` : u.noData;
    case "agreements": return r.agreements ? `${r.agreements} ${u.agreementsN}` : u.noData;
    case "connectivity": return r.flights || r.embassy ? `${r.flights} ${u.flights}${r.embassy ? ` · ${u.embassy}` : ""}` : u.noData;
    case "investment": return r.investment ? usd(r.investment) : u.noData;
    case "alignment": return r.alignment != null ? `${Math.round(r.alignment * 100)}% ${u.votes}` : u.noData;
  }
};

/** Score and breakdown of the UAE Partnership Index for one country, with every raw value behind each bar. */
export function PartnershipCard({ iso3 }: { iso3: string }) {
  const { lang } = useT(); const u = T[lang]; const d = usePartnership(); const [open, setOpen] = useState(false);
  if (!d) return <Skeleton h={150} />; const r = d.countries[iso3]; if (!r) return null; const keys = Object.keys(d.weights) as (keyof PartnerRec["c"])[];
  return (
    <Card title={u.title} icon="🧭">
      <div className="flex items-center gap-4">
        <div className="relative grid size-[76px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${tone(r.score)} ${r.score * 3.6}deg, var(--bg3) 0)` }}><div className="grid size-[62px] place-items-center rounded-full bg-bg1"><span className="num text-[24px] font-semibold leading-none">{r.score}</span></div></div>
        <div className="min-w-0"><div className="text-[13px] text-t0"><b className="num text-[17px]">#{r.rank}</b> {u.of} {d.n}</div><p className="mt-0.5 text-[11.5px] leading-snug text-t2">{u.note}</p></div>
      </div>
      <ul className="mt-3 space-y-2">{keys.map((k) => (
        <li key={k}><div className="flex items-baseline justify-between gap-2 text-[12.5px]"><span className="text-t0">{u.comps[k]} <span className="num text-[10.5px] text-t2">{d.weights[k]}%</span></span><span className="num text-t1">{r.c[k]}</span></div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bg3" role="img" aria-label={`${u.comps[k]} ${r.c[k]}`}><i className="block h-full rounded-full" style={{ width: `${r.c[k]}%`, background: tone(r.c[k]) }} /></div>
          <div className="num mt-0.5 text-[10.5px] text-t2">{detail(k, r.raw, lang, u, d.inputs.tradeYear)}</div></li>))}</ul>
      <button onClick={() => setOpen(!open)} className="mt-2 text-[12px] text-accent hover:underline">{u.how}</button>
      {open && <p className="mt-1 text-[11px] leading-relaxed text-t2">{lang === "ar" ? "كل مكوّن يُحوَّل إلى ترتيب مئوي بين جميع الدول (الصفر لمن لا بيانات لها)، عدا التوافق في التصويت فيُقاس خطيًا بين الأقل والأكثر توافقًا. المجموع = مجموع (الوزن × الدرجة). المصادر: صندوق النقد (التجارة والاستثمار)، وام (التفاعل)، وزارة الخارجية وزارة التجارة الخارجية (الاتفاقيات)، ويكيبيديا (الرحلات)، الأمم المتحدة (التصويت)." : "Each component becomes a percentile rank among all countries (0 where there is no data), except UN alignment, which is scaled linearly between the least and most aligned country. Total = sum of weight × score. Sources: IMF (trade, investment), WAM (engagement), MOFA and the Ministry of Foreign Trade (agreements), Wikipedia (flights), UN voting records."} {u.built} {d.built.slice(0, 10)}.</p>}
    </Card>
  );
}

/** The ranking itself: the countries closest to the UAE, for the UAE's own page and the dashboard. */
export function ClosestPartners({ limit = 15, compact = false }: { limit?: number; compact?: boolean }) {
  const { lang } = useT(); const u = T[lang]; const d = usePartnership(); const cs = useCountries(); const select = useStore((s) => s.select);
  if (!d) return <Skeleton h={compact ? 100 : 200} />; const rows = Object.entries(d.countries).sort((a, b) => a[1].rank - b[1].rank).slice(0, limit);
  const body = <ol className="space-y-1.5">{rows.map(([iso, r]) => { const c = cs?.byIso.get(iso); return (
    <li key={iso} className="flex items-center gap-2 text-[13px]"><span className="num w-5 text-t2">{r.rank}</span><button onClick={() => select(iso, "overview")} className="min-w-0 flex-1 truncate text-start hover:text-accent"><span aria-hidden>{c?.flag}</span> {c ? (lang === "ar" && c.nameAr ? c.nameAr : c.name) : iso}</button>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-bg3"><i className="block h-full rounded-full" style={{ width: `${r.score}%`, background: tone(r.score) }} /></span><span className="num w-7 text-end text-t1">{r.score}</span></li>); })}</ol>;
  return compact ? body : <Card title={`${u.title}: ${u.closest}`} icon="🧭">{body}<p className="mt-2 text-[11px] leading-snug text-t2">{u.note} {u.built} {d.built.slice(0, 10)}.</p></Card>;
}
