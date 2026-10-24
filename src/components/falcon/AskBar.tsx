"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { SCOPE_BY } from "@/lib/falcon/scopes";
import { routeAsk, type AskRoute, type AskSection } from "@/lib/falcon/ask";
import type { Country } from "@/lib/types";
import { Pill, type Lang } from "./bits";

const NAME: Record<AskSection, { en: string; ar: string; why: { en: string; ar: string } }> = {
  foresight: { en: "Foresight", ar: "الاستشراف", why: { en: "a brief or report looking ahead, with scenarios and UAE opportunities", ar: "موجز أو تقرير يستشرف المستقبل مع سيناريوهات وفرص للإمارات" } },
  lab: { en: "Scenario Lab", ar: "مختبر السيناريوهات", why: { en: "an outcome graph, benchmarks and policy options for a shock or a decision", ar: "رسم نتائج ومقارنات معيارية وخيارات سياسة لصدمة أو قرار" } },
  council: { en: "Council", ar: "المجلس", why: { en: "ten bounded agents with a red team and a verifier, disagreements kept", ar: "عشرة وكلاء مقيَّدين مع فريق أحمر ومدقق، والخلافات محفوظة" } },
  graph: { en: "Knowledge graph", ar: "الرسم المعرفي", why: { en: "a ranking computed from sourced links, no AI cost", ar: "ترتيب محسوب من روابط موثَّقة بلا كلفة ذكاء اصطناعي" } },
  monitor: { en: "Monitor", ar: "الرصد", why: { en: "what is triggered and what changed, from observed data", ar: "ما تفعَّل وما تغيّر من بيانات مرصودة" } },
  radar: { en: "Radar", ar: "الرادار", why: { en: "risk and opportunity scores across all countries", ar: "درجات المخاطر والفرص لكل الدول" } },
  countries: { en: "Country Desk", ar: "مكتب الدولة", why: { en: "the dossier, scorecard and briefing products for one country", ar: "الملف وبطاقة الدرجات ومنتجات الإحاطة لدولة واحدة" } },
};
const AI: AskSection[] = ["foresight", "lab", "council"];
const T = {
  en: { title: "Ask Falcon", ph: "Ask in plain words, for example: What if Egypt defaults? Which African countries show the most UAE logistics activity?", go: "Route", read: "I read this as", free: "Routing is free: it only picks where to go. Nothing is sent to an AI until you start a product there.", ai: "starts a paid AI run only when you click", none: "no cost", instead: "Or open it in", scope: "about", open: "Open",
    ex: ["What if Egypt defaults on its debt?", "Foresight for the Middle East over ten years", "Which African countries show the most UAE logistics activity?", "Convene the council on Pakistan", "What changed today?"] },
  ar: { title: "اسأل الصقر", ph: "اسأل بكلمات عادية، مثلًا: ماذا لو تعثرت مصر؟ أي دول أفريقية تظهر أكثر نشاط لوجستي إماراتي؟", go: "وجّه", read: "فهمتُ هذا على أنه", free: "التوجيه مجاني: يختار وجهتك فقط. ولا يُرسل شيء إلى الذكاء الاصطناعي حتى تبدأ منتجًا هناك.", ai: "لا يبدأ تشغيلًا مدفوعًا إلا عند نقرك", none: "بلا كلفة", instead: "أو افتحه في", scope: "عن", open: "افتح",
    ex: ["ماذا لو تعثرت مصر في ديونها؟", "استشراف الشرق الأوسط على عشر سنوات", "أي دول أفريقية تظهر أكثر نشاط لوجستي إماراتي؟", "اعقد المجلس بشأن باكستان", "ما الذي تغيّر اليوم؟"] },
} as const;

/** A free question box that routes a plain question to the right section with the right subject, and says what it understood so the reader can change it. */
export function AskBar({ list, L, onGo }: { list: Country[]; L: Lang; onGo: (r: AskRoute, question: string) => void }) {
  const u = T[L]; const [q, setQ] = useState(""); const [done, setDone] = useState<string>("");
  const route = useMemo(() => (done ? routeAsk(done, list) : null), [done, list]);
  const subject = (r: AskRoute) => (r.scopeKind === "country" ? (() => { const c = list.find((x) => x.iso3 === r.scope); return c ? `${c.flag} ${L === "ar" && c.nameAr ? c.nameAr : c.name}` : r.scope; })() : r.scope ? (() => { const s = SCOPE_BY.get(r.scope); return s ? `${s.flag} ${L === "ar" ? s.ar : s.en}` : r.scope; })() : null);
  const alt = (s: AskSection): AskRoute => ({ ...route!, section: s, rank: s === "graph" ? route!.rank : undefined });
  return (
    <section className="rounded-[14px] border border-accent/30 bg-bg1 p-4" aria-label={u.title}>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2) setDone(q.trim()); }} className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-72"><Sparkles size={15} className="pointer-events-none absolute start-3 top-3 text-accent" /><input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={u.ph} aria-label={u.title} className="h-10 w-full rounded-[10px] border border-line bg-bg2 ps-9 pe-3 text-[13px] text-t0" /></div>
        <button type="submit" disabled={q.trim().length < 2} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50">{u.go}<ArrowRight size={14} className="rtl:rotate-180" /></button>
      </form>
      {!route && <div className="mt-2 flex flex-wrap items-center gap-1.5">{u.ex.map((x) => <button key={x} type="button" onClick={() => { setQ(x); setDone(x); }} className="h-7 max-w-full truncate rounded-full border border-line bg-bg2 px-2.5 text-[11px] text-t1 hover:text-t0" title={x}>{x}</button>)}</div>}
      {route && (
        <div className="mt-3 rounded-[12px] bg-bg2 p-3" role="status">
          <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="text-t2">{u.read}:</span><b className="text-t0">{NAME[route.section][L]}</b>{subject(route) && <><span className="text-t2">{u.scope}</span><b className="text-t0">{subject(route)}</b></>}<Pill c={AI.includes(route.section) ? "var(--warn)" : "var(--ok)"}>{AI.includes(route.section) ? u.ai : u.none}</Pill>
            <button type="button" onClick={() => onGo(route, done)} className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)]">{u.open} {NAME[route.section][L]}<ArrowRight size={13} className="rtl:rotate-180" /></button></div>
          <p className="mt-1 text-[11.5px] leading-snug text-t1">{NAME[route.section].why[L]} · <span className="text-t2">{route.why.join(" · ")}</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-t2">{u.instead}:</span>{route.alternatives.map((s) => <button key={s} type="button" onClick={() => onGo(alt(s), done)} className="h-7 rounded-full border border-line bg-bg1 px-2.5 text-[11.5px] text-t1 hover:text-t0">{NAME[s][L]}</button>)}</div>
        </div>
      )}
      <p className="mt-2 text-[10.5px] leading-snug text-t2">{u.free}</p>
    </section>
  );
}
