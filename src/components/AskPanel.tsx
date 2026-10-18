"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Send, Sparkles, X } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { useDashboard } from "@/lib/dashboard-store";
import { Markdown } from "./Markdown";
import { Skeleton } from "./ui";

type Res = { answer: string; scope: string; facts: { id: string; text: string; src: string; url?: string }[]; at: string; model: string; usage: { usd: number | null }; cached?: boolean };
const T = {
  en: { title: "Ask", ph: "Ask about a country, a relationship or the world today…", send: "Ask", intro: "Answers come only from the data in this app (headlines, events, agreements, missions, visits, flights, investment, cyber) and cite their sources. Each new question bills your Anthropic account (about 1–2 cents); repeats are cached.", sug: ["What happened in Iran this week?", "UAE and India: trade and relations", "Which countries had the most senior UAE contacts this month?", "Risks for the UAE in the coming days"], thinking: "Reading the data…", cost: "Cost", cachedL: "cached", sources: "Sources cited", left: "left this hour", note: "Information for an analyst, not an intelligence assessment. Check the cited sources before quoting." },
  ar: { title: "اسأل", ph: "اسأل عن دولة أو علاقة أو العالم اليوم…", send: "اسأل", intro: "تأتي الإجابات من بيانات التطبيق فقط (العناوين والأحداث والاتفاقيات والبعثات والزيارات والرحلات والاستثمار والأمن السيبراني) مع ذكر مصادرها. كل سؤال جديد يُحتسب على حساب Anthropic (نحو 1–2 سنت)؛ والمكرر مخزّن.", sug: ["ماذا حدث في إيران هذا الأسبوع؟", "الإمارات والهند: التجارة والعلاقات", "ما الدول الأكثر اتصالًا رفيعًا بالإمارات هذا الشهر؟", "المخاطر على الإمارات في الأيام المقبلة"], thinking: "جارٍ قراءة البيانات…", cost: "التكلفة", cachedL: "مخزّن", sources: "المصادر المستشهد بها", left: "متبقية هذه الساعة", note: "معلومات للمحلل وليست تقييمًا استخباريًا. تحقق من المصادر قبل الاقتباس." },
} as const;

/** Natural-language questions answered from the app's own data, with cited facts. Starts only on a click. */
export function AskPanel() {
  const { lang } = useT(); const u = T[lang]; const open = useDashboard((s) => s.askOpen); const setAsk = useDashboard((s) => s.setAsk); const preset = useDashboard((s) => s.askQ); const sel = useStore((s) => s.sel);
  const [q, setQ] = useState(""); const [res, setRes] = useState<Res | null>(null); const [phase, setPhase] = useState<"idle" | "busy" | "error">("idle"); const [err, setErr] = useState(""); const [left, setLeft] = useState<number | null>(null); const abort = useRef<AbortController | null>(null);
  useEffect(() => { const t = setTimeout(() => { if (open && preset) setQ(preset); }, 0); return () => clearTimeout(t); }, [open, preset]);
  useEffect(() => { if (!open) return; fetch("/api/ask").then((r) => r.json()).then((j) => setLeft(j.remainingThisHour ?? null)).catch(() => {}); const k = (e: KeyboardEvent) => e.key === "Escape" && setAsk(false); window.addEventListener("keydown", k); return () => { window.removeEventListener("keydown", k); abort.current?.abort(); }; }, [open, setAsk]);
  if (!open) return null;
  const run = async (text: string) => {
    const question = text.trim(); if (question.length < 6) return; abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("busy"); setErr(""); setRes(null);
    try { const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: question, iso3: sel ?? undefined }), signal: ac.signal }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`); setRes(j); setPhase("idle"); fetch("/api/ask").then((x) => x.json()).then((x) => setLeft(x.remainingThisHour ?? null)).catch(() => {}); }
    catch (e) { if ((e as Error).name !== "AbortError") { setErr((e as Error).message); setPhase("error"); } }
  };
  return (
    <aside role="dialog" aria-label={u.title} className="glass anim-rise absolute inset-x-2 bottom-[72px] top-[68px] z-40 flex flex-col overflow-hidden rounded-[16px] sm:inset-x-auto sm:bottom-16 sm:start-3 sm:top-[76px] sm:w-[440px]">
      <header className="flex items-center gap-2 px-4 pt-3"><Sparkles size={16} className="text-accent" /><h2 className="display flex-1 text-[15px] font-semibold">{u.title}</h2><button onClick={() => setAsk(false)} aria-label="Close" className="grid size-8 place-items-center rounded-md text-t1 hover:text-t0"><X size={16} /></button></header>
      <form onSubmit={(e) => { e.preventDefault(); void run(q); }} className="flex gap-2 px-3 pt-2"><input value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder={u.ph} aria-label={u.ph} className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-bg2 px-3 text-[13px] text-t0 outline-none focus:border-accent" /><button disabled={phase === "busy" || q.trim().length < 6} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><Send size={14} />{u.send}</button></form>
      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-3">
        {phase === "idle" && !res && <><p className="text-[12.5px] leading-relaxed text-t1">{u.intro}</p><div className="flex flex-col items-start gap-1.5">{u.sug.map((s) => <button key={s} onClick={() => { setQ(s); void run(s); }} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-start text-[12.5px] text-accent hover:bg-accent/20">{s}</button>)}</div>{left != null && <p className="num text-[11px] text-t2">{left} {u.left}</p>}</>}
        {phase === "busy" && <div role="status"><Skeleton h={14} className="mb-2 w-2/3" /><Skeleton h={12} className="mb-2" /><Skeleton h={12} className="w-5/6" /><p className="mt-3 text-[12.5px] text-t1">{u.thinking}</p></div>}
        {phase === "error" && <div role="alert" className="rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px]">{err}</div>}
        {res && <article className="space-y-3"><div className="text-[13px] leading-relaxed"><Markdown source={res.answer} /></div>
          {res.facts.length > 0 && <details className="rounded-[10px] border border-line bg-bg1/60 p-3 text-[12px]"><summary className="cursor-pointer text-t0">{u.sources} ({res.facts.length})</summary><ul className="mt-2 space-y-1.5">{res.facts.map((f) => <li key={f.id}><span className="num me-1 text-t2">{f.id}</span>{f.text.slice(0, 200)} <span className="text-t2">· {f.src}</span>{f.url && <a href={f.url} target="_blank" rel="noreferrer noopener" aria-label="Open source" className="ms-1 inline-flex align-middle text-accent"><ExternalLink size={11} /></a>}</li>)}</ul></details>}
          <p className="num text-[11px] text-t2">{res.model} · {u.cost} {res.usage.usd != null ? `$${res.usage.usd.toFixed(3)}` : "n/a"}{res.cached ? ` · ${u.cachedL}` : ""} · {res.scope}</p><p className="text-[11px] leading-snug text-t2">{u.note}</p></article>}
      </div>
    </aside>
  );
}
