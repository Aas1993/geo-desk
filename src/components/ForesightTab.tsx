"use client";
import { useEffect, useState } from "react";
import { Telescope } from "lucide-react";
import { useT } from "@/lib/store";
import { Card, EmptyState, Skeleton } from "./ui";
import { DossierWorkspace } from "./DossierWorkspace";
import { Bars, ImpactGraph, PV } from "./fs-panels";
import { FsTracker } from "./FsTracker";
import { FS_FRONTS, frontLabel } from "@/lib/foresight";
import type { ForesightPayload, Signal, Tone } from "@/lib/foresight-data";
import type { Country } from "@/lib/types";

type Lang = "en" | "ar";
const T = {
  en: { cta: "Strategic foresight (researched, two products)", ctaText: "UAE-first foresight on this country, its region and the world as they reach it. The Ministerial Executive Brief is eight designed pages for a five-to-ten-minute read (about 21 cents); the Comprehensive Strategic Report is the full reference over horizons of 1, 3, 5, 10 and 20 years (about 47 cents). Both cover ten fronts, scenarios with weights, UAE impact, opportunities, options, risks and early-warning signposts, and are benchmarked to Global Trends, the Annual Threat Assessments, Intelligence Community Assessments and the President's Daily Brief. Optional: they run only when you open them, and bill your Anthropic account.", open: "Open foresight (brief or report)",
    board: "Baseline: what is already in motion", boardHint: "Read straight from the datasets with plain rules, no model call and no cost. It extends published numbers (IMF projections, recent trend of trade and deals, the election calendar): trend continuation, not a forecast of events. The researched dossier does the forecasting.",
    macro: "IMF path to 2031", growth: "Real GDP growth, %", debt: "Public debt, % of GDP", est: "estimate or projection", cal: "Dated political events (24 months)", noCal: "None dated in the datasets for the next 24 months. The calendar covers about 35 countries.", days: "days",
    blind: "Fronts the datasets cannot see", blindText: "These have little or no series here, so the baseline says nothing about them. The researched dossier covers them from sources:", rising: "rising", falling: "falling", flat: "flat", loadFail: "The baseline could not be loaded.", how: "Tone rules: green is comfortable, blue is neutral, amber needs watching, red is a stress level, using the rules of thumb written in each note. Arrows show the direction of the number, not whether that is good." },
  ar: { cta: "الاستشراف الاستراتيجي (مبني على البحث، منتجان)", ctaText: "استشراف يضع الإمارات أولًا عن هذه الدولة وإقليمها والعالم كما يصلها. موجز الوزير التنفيذي ثماني صفحات مصممة تُقرأ في خمس إلى عشر دقائق (نحو 21 سنتًا)؛ والتقرير الاستراتيجي الشامل هو المرجع الكامل على آفاق 1 و3 و5 و10 و20 سنة (نحو 47 سنتًا). كلاهما يغطي عشر جبهات وسيناريوهات بأوزانها وأثرًا على الإمارات وفرصًا وخيارات ومخاطر ومؤشرات إنذار مبكر، ومقيس على «الاتجاهات العالمية» و«تقييمات التهديدات السنوية» و«تقييمات مجتمع الاستخبارات» و«الموجز اليومي للرئيس». اختياري، ولا يبدأ إلا حين تفتحه، ويُحتسب على حساب Anthropic.", open: "فتح الاستشراف (موجز أو تقرير)",
    board: "خط الأساس: ما هو جارٍ بالفعل", boardHint: "مقروء مباشرة من البيانات بقواعد بسيطة، دون نموذج ودون تكلفة. يمدّ أرقامًا منشورة (توقعات صندوق النقد واتجاه التجارة والصفقات وتقويم الانتخابات): استمرار للاتجاه لا تنبؤ بالأحداث. أما التنبؤ فيتولاه الملف المبني على البحث.",
    macro: "مسار صندوق النقد حتى 2031", growth: "نمو الناتج الحقيقي، %", debt: "الدين العام، % من الناتج", est: "تقدير أو توقع", cal: "أحداث سياسية مؤرخة (24 شهرًا)", noCal: "لا شيء مؤرخ في البيانات للأشهر الـ24 القادمة. يغطي التقويم نحو 35 دولة.", days: "يومًا",
    blind: "جبهات لا تراها البيانات", blindText: "ليس لها سلاسل بيانات هنا أو سلاسلها ضئيلة، فلا يقول خط الأساس عنها شيئًا. ويغطيها الملف المبني على البحث من المصادر:", rising: "في ارتفاع", falling: "في انخفاض", flat: "ثابت", loadFail: "تعذّر تحميل خط الأساس.", how: "قواعد اللون: الأخضر مريح والأزرق محايد والكهرماني يحتاج مراقبة والأحمر مستوى ضغط، بحسب القواعد العملية المكتوبة في كل ملاحظة. الأسهم تبيّن اتجاه الرقم لا إن كان ذلك جيدًا." },
} as const;
const TONE: Record<Tone, string> = { good: "var(--ok)", info: "var(--c2)", watch: "var(--warn)", risk: "var(--risk)" };
const ARROW = { up: "▲", down: "▼", flat: "▬" } as const;

function Row({ s, u }: { s: Signal; u: Record<"rising" | "falling" | "flat", string> }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3"><span className="flex min-w-0 items-center gap-2 text-[12.5px] text-t0"><i aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: TONE[s.tone] }} /><span className="min-w-0 break-words">{s.label}</span></span>
        <span className="num shrink-0 text-end text-[12.5px] font-semibold text-t0" dir="auto">{s.value}{s.arrow && <span aria-label={u[s.arrow === "up" ? "rising" : s.arrow === "down" ? "falling" : "flat"]} className="ms-1.5 text-[10px] text-t1">{ARROW[s.arrow]}</span>}</span></div>
      <p className="mt-0.5 ps-4 text-[11px] leading-snug text-t2">{s.note} <span className="num">· {s.src}</span></p>
    </li>
  );
}

export function ForesightTab({ c }: { c: Country }) {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const [d, setD] = useState<ForesightPayload | null | "err">(null); const [n, setN] = useState(0); const [open, setOpen] = useState(false);
  useEffect(() => { let dead = false; fetch(`/api/foresight/${c.iso3}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j: ForesightPayload) => { if (!dead) setD(j); }).catch(() => { if (!dead) setD("err"); }); return () => { dead = true; }; }, [c.iso3, n]);
  const cta = (
    <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5"><h3 className="display text-[15px] font-semibold text-t0">{u.cta}</h3><p className="mt-1 text-[12.5px] leading-relaxed text-t1">{u.ctaText}</p>
      <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><Telescope size={15} />{u.open}</button></div>
  );
  const ws = open && <DossierWorkspace c={c} mode="foresight" onClose={() => setOpen(false)} />;
  if (d === "err") return <div className="space-y-3">{cta}<EmptyState title={u.loadFail} why="" onRetry={() => { setD(null); setN((x) => x + 1); }} />{ws}</div>;
  if (!d) return <div className="space-y-3"><Skeleton h={110} /><Skeleton h={160} /><Skeleton h={160} /></div>;
  const m = d.macro;
  return (
    <div className="space-y-3">
      {cta}
      <p className="px-0.5 text-[12px] leading-relaxed text-t1"><b className="text-t0">{u.board}.</b> {u.boardHint}</p>
      {m && (m.growth.length > 2 || m.debt.length > 2) && (
        <Card title={u.macro} icon="📈"><div className="grid gap-4 sm:grid-cols-2">
          <div><h4 className="label mb-1">{u.growth}</h4><Bars s={m.growth} first={m.firstEstimate} unit="%" label={u.growth} /></div>
          <div><h4 className="label mb-1">{u.debt}</h4><Bars s={m.debt} first={m.firstEstimate} unit="" label={u.debt} /></div>
        </div><p className="mt-1 text-[11px] text-t2">{u.est}: {m.firstEstimate}+ (lighter bars). IMF World Economic Outlook.</p></Card>
      )}
      {d.exposure.length > 0 && <Card title={PV[L].exp} icon="🕸"><ImpactGraph exposure={d.exposure} L={L} name={d.name} /></Card>}
      {FS_FRONTS.map((f) => { const ss = d.signals.filter((s) => s.front === f.key); if (!ss.length) return null; return <Card key={f.key} title={frontLabel(f.key, L)} icon="◆"><ul className="divide-y divide-line">{ss.map((s) => <Row key={s.id} s={s} u={u} />)}</ul></Card>; })}
      <Card title={u.cal} icon="🗓">{d.calendar.length ? <ul className="space-y-1.5">{d.calendar.map((e) => <li key={e.label + e.date} className="flex justify-between gap-3 text-[12.5px]"><span className="text-t0">{e.label}</span><span className="num shrink-0 text-t1">{e.date}{e.approx ? " ~" : ""} · {e.daysAway} {u.days}</span></li>)}</ul> : <p className="text-[12.5px] text-t1">{u.noCal}</p>}</Card>
      {!!d.blind.length && <Card title={u.blind} icon="🕳"><p className="text-[12.5px] leading-snug text-t1">{u.blindText}</p><div className="mt-2 flex flex-wrap gap-1.5">{d.blind.map((k) => <span key={k} className="rounded-full bg-bg3 px-2.5 py-1 text-[11.5px] text-t0">{frontLabel(k, L)}</span>)}</div></Card>}
      <FsTracker iso3={c.iso3} />
      <p className="px-0.5 text-[11px] leading-snug text-t2">{u.how}</p>
      {ws}
    </div>
  );
}
