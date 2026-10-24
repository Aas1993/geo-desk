"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Copy, Download, ExternalLink } from "lucide-react";
import { useT } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { Country } from "@/lib/types";
import { safeHttp } from "@/lib/url";
import { instrumentLabel } from "@/lib/statecraft";
import { VisualBrief } from "./VisualBrief";
import { EconomySwitch, useEconomy } from "./EconomySwitch";
import { bandOf, confidenceOf } from "@/lib/visual";

type Fact = { id: string; kind: string; text: string; src: string; url?: string };
type Brief = { headline: string; confidence: "low" | "medium" | "high"; sections: { key: string; bullets: { text: string; basis: string[]; tags?: string[] }[] }[] };
type Saved = { brief: Brief; facts: Fact[]; gaps: string[]; at: string; model: string; usage: { input: number; output: number; usd: number | null }; cached?: boolean };
type Status = { enabled: boolean; model: string; ttlHours: number; remainingThisHour: number };

const LABEL: Record<string, { en: string; ar: string }> = {
  status: { en: "Status", ar: "الوضع" }, scorecard: { en: "Scorecard", ar: "بطاقة الأداء" }, leverage: { en: "The UAE's hand", ar: "أوراق الإمارات" }, moves: { en: "Recommended moves", ar: "التحركات المقترحة" }, indicators: { en: "Indicators", ar: "المؤشرات" }, events: { en: "Current events", ar: "الأحداث الجارية" }, uae: { en: "Relationship with the UAE", ar: "العلاقة مع الإمارات" }, outlook: { en: "Outlook", ar: "التوقعات" }, watch: { en: "Indicators to watch", ar: "مؤشرات المتابعة" },
};
const UI = {
  en: { run: "Generate brief", rerun: "Regenerate", running: "Writing the brief…", gathering: "Collecting facts and drafting. This takes about 10–20 seconds.",
    intro: "One-page country brief: where the country stands, its key economic indicators, what is happening there now, and its engagement and relationship with the UAE. Written by AI from the latest headlines, GDELT events, hazards, outbreaks, sanctions, IMF and World Bank figures, and the UAE agreements, trade, flights, investment and visits data. For talking points use the Minister brief tab. It starts only when you click, and each new run bills your Anthropic account.",
    cost: "Cost", cached: "cached", background: "background, not from today's sources", based: "Facts used", gaps: "Not covered", copy: "Copy", copied: "Copied", download: "Download .md",
    disclaimer: "AI-generated from public sources for information only. Verify before relying on it; cited facts are listed below. Not an intelligence assessment or advice.", conf: "Confidence", left: "new briefs left this hour", disabled: "AI briefs are switched off on this server." },
  ar: { run: "إنشاء الموجز", rerun: "إعادة الإنشاء", running: "جارٍ كتابة الموجز…", gathering: "جمع الوقائع وكتابة المسودة. يستغرق نحو 10–20 ثانية.",
    intro: "موجز من صفحة واحدة: وضع الدولة ومؤشراتها الاقتصادية وما يجري فيها الآن وعلاقتها وتفاعلها مع الإمارات. يكتبه الذكاء الاصطناعي من أحدث العناوين وأحداث GDELT والكوارث والأوبئة والعقوبات وأرقام صندوق النقد والبنك الدولي وبيانات الاتفاقيات والتجارة والرحلات والاستثمار والزيارات مع الإمارات. لنقاط الحديث استخدم تبويب موجز الوزير. لا يبدأ إلا بضغطتك، وكل تشغيل جديد يُحتسب على حساب Anthropic الخاص بك.",
    cost: "التكلفة", cached: "مخزّن", background: "خلفية عامة، ليست من مصادر اليوم", based: "الوقائع المستخدمة", gaps: "غير مغطّى", copy: "نسخ", copied: "تم النسخ", download: "تنزيل .md",
    disclaimer: "مُولَّد بالذكاء الاصطناعي من مصادر عامة للاطلاع فقط. تحقق قبل الاعتماد عليه؛ الوقائع المستشهد بها مدرجة أدناه. ليس تقييمًا استخباريًا ولا نصيحة.", conf: "الثقة", left: "موجزات جديدة متبقية هذه الساعة", disabled: "موجزات الذكاء الاصطناعي متوقفة على هذا الخادم." },
} as const;

const stripPrefix = (t: string) => t.replace(/^(Proposal|Assessment|Watch|Signpost)[:.]?\s*/i, "");
const briefVisual = (b: Brief) => { const sec = (k: string) => b.sections.find((x) => x.key === k)?.bullets ?? []; return { bluf: b.headline, judgments: sec("outlook").map((x) => ({ text: stripPrefix(x.text), band: bandOf(x.text), confidence: confidenceOf(/confidence (?:is |of )?(\w+)/i.exec(x.text)?.[1] ?? ""), so: "" })), moves: sec("moves").map((x) => ({ text: stripPrefix(x.text), tags: x.tags ?? [] })), signals: sec("watch").map((x) => stripPrefix(x.text)) }; };
const toMarkdown = (c: Country, s: Saved, lang: "en" | "ar") => {
  const L = (k: string) => LABEL[k]?.[lang] ?? k; const f = new Map(s.facts.map((x) => [x.id, x]));
  const body = s.brief.sections.filter((x) => x.bullets.length).map((x) => `## ${L(x.key)}\n${x.bullets.map((b) => `- ${b.tags?.length ? `[${b.tags.map((t) => instrumentLabel(t, lang)).join(" / ")}] ` : ""}${b.text}${b.basis.length ? ` [${b.basis.join(", ")}]` : ""}`).join("\n")}`).join("\n\n");
  const src = [...new Set(s.brief.sections.flatMap((x) => x.bullets.flatMap((b) => b.basis)))].map((id) => f.get(id)).filter(Boolean).map((x) => `- [${x!.id}] ${x!.text} (${x!.src})${x!.url ? ` ${x!.url}` : ""}`).join("\n");
  return `# ${c.name}: country brief\n_${s.brief.headline}_\n\nGenerated ${s.at} by ${s.model}. Confidence: ${s.brief.confidence}. AI-generated from public sources; verify before relying on it.\n\n${body}\n\n## Facts cited\n${src}\n`;
};

/** AI country brief. Never starts on its own: a click runs one cheap model call (no web tools) over a fact pack built from the app's own feeds. */
export function BriefTab({ c }: { c: Country }) {
  const { lang } = useT(); const [eco, setEco] = useEconomy(); const [view, setView] = useState<"read" | "visual">("read"); const now = useNow(60_000); const u = UI[lang]; const storeKey = `gd-brief2:${c.iso3}:${lang}`;
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle"); const [saved, setSaved] = useState<Saved | null>(null);
  const [err, setErr] = useState(""); const [status, setStatus] = useState<Status | null>(null); const [copied, setCopied] = useState(false); const abort = useRef<AbortController | null>(null);

  useEffect(() => { // restore the last brief for this country/language from this browser, and probe the server's guardrails
    const t0 = setTimeout(() => { try { const s = localStorage.getItem(storeKey); if (s) { setSaved(JSON.parse(s) as Saved); setPhase("done"); } else { setSaved(null); setPhase("idle"); } } catch { setSaved(null); setPhase("idle"); } setErr(""); }, 0);
    fetch("/api/brief/" + c.iso3).then((r) => r.json()).then((j: Status) => setStatus(j)).catch(() => {});
    return () => { clearTimeout(t0); }; // a run that is already paid for is not cancelled by switching tab or country: it finishes and is saved
  }, [storeKey, c.iso3]);

  const keyRef = useRef(storeKey); useEffect(() => { keyRef.current = storeKey; });
  const run = async (refresh: boolean) => {
    const k = storeKey; abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("running"); setErr("");
    try {
      const r = await fetch("/api/brief/" + c.iso3, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, refresh, economy: eco }), signal: ac.signal });
      const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
      try { localStorage.setItem(k, JSON.stringify(j)); } catch {} if (keyRef.current !== k) return; setSaved(j as Saved); setPhase("done");
      fetch("/api/brief/" + c.iso3).then((x) => x.json()).then(setStatus).catch(() => {});
    } catch (e) { if ((e as Error).name !== "AbortError" && keyRef.current === k) { setErr((e as Error).message); setPhase("error"); } }
  };
  const md = saved ? toMarkdown(c, saved, lang) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = `${c.iso3}-brief.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const facts = new Map((saved?.facts ?? []).map((f) => [f.id, f]));
  const L = (k: string) => LABEL[k]?.[lang] ?? k;

  if (status && !status.enabled) return <p className="text-[13px] text-t1">{u.disabled}</p>;
  return (
    <div className="space-y-3">
      {phase !== "done" && phase !== "running" && (
        <div className="rounded-[10px] border border-line bg-bg2 p-3.5">
          <p className="text-[13px] leading-relaxed text-t1">{u.intro}</p>
          <button onClick={() => run(false)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><Sparkles size={15} />{u.run}</button><EconomySwitch eco={eco} onChange={setEco} />
          {status && <p className="num mt-2 text-[11px] text-t2">{status.model} · {status.remainingThisHour} {u.left}</p>}
        </div>
      )}
      {phase === "running" && <div role="status" className="rounded-[10px] border border-line bg-bg2 p-4"><div className="skeleton mb-3 h-4 w-2/3" /><div className="skeleton mb-2 h-3 w-full" /><div className="skeleton mb-2 h-3 w-5/6" /><div className="skeleton h-3 w-4/6" /><p className="mt-3 text-[12.5px] text-t1">{u.running} {u.gathering}</p></div>}
      {phase === "error" && <div role="alert" className="rounded-[10px] border border-down/40 bg-down/10 p-3 text-[13px] text-t0">{err}<button onClick={() => run(false)} className="ms-3 underline">{u.run}</button></div>}
      {phase === "done" && saved && (
        <article className="space-y-3">
          <div className="rounded-[10px] border border-line bg-bg2 p-3.5">
            <p className="display text-[15px] font-semibold leading-snug text-t0">{saved.brief.headline}</p>
            <p className="num mt-1.5 text-[11px] text-t2">{u.conf}: <span className={saved.brief.confidence === "high" ? "text-up" : saved.brief.confidence === "low" ? "text-warn" : "text-t1"}>{saved.brief.confidence}</span></p>
          </div>
          <div role="tablist" className="flex gap-1">{(["read", "visual"] as const).map((k) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`h-8 rounded-full px-3 text-[12.5px] ${view === k ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{k === "read" ? (lang === "ar" ? "نص" : "Read") : `🎨 ${lang === "ar" ? "مصوّر" : "Illustrated"}`}</button>)}</div>
          {view === "visual" && <VisualBrief iso3={c.iso3} name={c.name} parsed={briefVisual(saved.brief)} />}
          {view === "read" && saved.brief.sections.filter((s) => s.bullets.length).map((s) => (
            <section key={s.key}>
              <h3 className="label mb-1.5">{L(s.key)}</h3>
              <ul className="space-y-2">{s.bullets.map((b, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-t0">{b.tags?.length ? b.tags.map((t) => <span key={t} className="me-1 inline-block rounded bg-accent/15 px-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent">{instrumentLabel(t, lang)}</span>) : null}{b.text}{" "}
                  {b.basis.length ? b.basis.map((id) => { const f = facts.get(id); const chip = <span key={id} title={f ? `${f.text} (${f.src})` : id} className="num mx-0.5 inline-block rounded bg-bg3 px-1 text-[10.5px] text-t1">{id}</span>; return f?.url ? <a key={id} href={safeHttp(f.url)} target="_blank" rel="noreferrer noopener" className="hover:text-accent">{chip}</a> : chip; })
                    : !["outlook", "moves", "leverage", "watch"].includes(s.key) && <span className="text-[11px] italic text-t2">({u.background})</span>}</li>))}</ul>
            </section>))}
          {!!saved.gaps.length && <p className="text-[12px] text-t2"><b>{u.gaps}:</b> {saved.gaps.join(" ")}</p>}
          <details className="rounded-[10px] border border-line bg-bg1/60 p-3 text-[12px] text-t1"><summary className="cursor-pointer text-t0">{u.based} ({saved.facts.length})</summary>
            <ul className="mt-2 space-y-1.5">{saved.facts.map((f) => <li key={f.id}><span className="num me-1 text-t2">{f.id}</span>{f.text.slice(0, 220)} <span className="text-t2">· {f.src}</span>{f.url && <a href={safeHttp(f.url)} target="_blank" rel="noreferrer noopener" className="ms-1 inline-flex align-middle text-accent" aria-label="Open source"><ExternalLink size={11} /></a>}</li>)}</ul></details>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button onClick={copy} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Copy size={13} />{copied ? u.copied : u.copy}</button>
            <button onClick={download} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />{u.download}</button>
            <button onClick={() => run(true)} className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><RefreshCw size={13} />{u.rerun}</button>
          </div>
          <p className="num text-[11px] text-t2">{saved.model} · {u.cost} {saved.usage.usd != null ? `$${saved.usage.usd.toFixed(saved.usage.usd < 0.1 ? 3 : 2)}` : "n/a"}{saved.cached ? ` · ${u.cached}` : ""} · {saved.at.slice(0, 16).replace("T", " ")} UTC</p>
          {now > 0 && now - Date.parse(saved.at) > 3 * 3600_000 && <p role="status" className="rounded-[8px] border border-warn/40 bg-warn/10 p-2 text-[12px] text-t0">{lang === "ar" ? `كُتب هذا الموجز قبل ${Math.round((now - Date.parse(saved.at)) / 3600_000)} ساعة؛ أعد الإنشاء لإدراج آخر الأخبار.` : `This brief was written ${Math.round((now - Date.parse(saved.at)) / 3600_000)} h ago. Regenerate to include the latest news.`}</p>}
          <p className="text-[11px] leading-snug text-t2">{u.disclaimer}</p>
        </article>)}
    </div>
  );
}
