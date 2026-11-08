"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileDown, Send, Sparkles } from "lucide-react";
import { useCountryList } from "../falcon/hooks";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Markdown } from "../Markdown";
import { LiveDesk } from "../bird/LiveDesk";
import { liveEnd, liveEvent, liveStart, type Live } from "@/lib/bird/live";
import { DEPTS, DEPT_BY, FORMATS } from "@/lib/agent/catalog";
import { COMPOSE_EST, needsCountry, planEst, type AgentPlan } from "@/lib/agent/plan";
import { composeAnswer, runPlan, type StepOut } from "@/lib/agent/client";
import { profileTextFor } from "@/lib/agent/data";
import { briefingHtml } from "@/lib/dossier/export";
import { classification } from "@/lib/case/report";
import { downloadHtmlReport } from "@/lib/reportpdf";

export type Saved = { message: string; iso: string; country: string; text: string; at: string; usd: number; depts: string[]; format: string; outs: { dept: string; name: string; ok: boolean; text: string; error?: string }[] };
const SUGGEST: { en: string; ar: string }[] = [{ en: "What should the UAE do about its position in this country over the next 12 months? Give me a one-page memo.", ar: "ماذا ينبغي أن تفعل الإمارات بشأن موقعها في هذه الدولة خلال 12 شهرًا؟ أريد مذكرة من صفحة." }, { en: "Who are the UAE's rivals here and where do we have leverage? Five bullet points.", ar: "من منافسو الإمارات هنا وأين نملك النفوذ؟ خمس نقاط." }, { en: "Draft talking points for the minister's call with the counterpart.", ar: "اكتب نقاط حوار لاتصال الوزير بنظيره." }, { en: "How much trade do we have with this country and how many direct flights?", ar: "كم حجم التجارة مع هذه الدولة وكم رحلة مباشرة؟" }, { en: "Where in the platform can I see the UAE's agreements with a country?", ar: "أين أرى اتفاقيات الإمارات مع دولة في المنصة؟" }];

/** ASK THE DESK AGENT: write a question, a task or a directive in your own words. The agent reads it, plans which departments of the platform should work on it (the three desks, the councils, the country brief, the free data) and what each is asked, shows you the plan and its cost, and only then runs it when you click. The departments work through their own routes, with their own ceilings and auditors; the writer then puts their answers in the format you asked for, from the statecraft and geopolitical angle. Used on its own tab (any country) and inside the Bird's eye view (that country, with its products as context). */
export function AskPanel({ L, fixedIso, fixedName, storageKey, onSaved }: { L: Lang; fixedIso?: string | null; fixedName?: string; storageKey: string; onSaved?: (s: Saved | null) => void }) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const { list, by } = useCountryList(); const [msg, setMsg] = useState(""); const [pickIso, setPickIso] = useState<string | null>(null); const [format, setFormat] = useState("auto");
  const [phase, setPhase] = useState<"idle" | "planning" | "planned" | "running" | "done">("idle"); const [plan, setPlan] = useState<AgentPlan | null>(null); const [off, setOff] = useState<Set<string>>(new Set()); const [err, setErr] = useState(""); const [live, setLive] = useState<Live>({}); const [startedAt, setStartedAt] = useState(0); const [saved, setSaved] = useState<Saved | null>(null); const [note, setNote] = useState(""); const ac = useRef<AbortController | null>(null);
  const iso = fixedIso ?? pickIso ?? plan?.iso3 ?? null; const cname = fixedName ?? (iso ? by.get(iso)?.name ?? iso : "");
  const load = useCallback(() => { try { const j = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Saved | null; return j && typeof j.text === "string" ? j : null; } catch { return null; } }, [storageKey]);
  useEffect(() => { const k = setTimeout(() => { const s = load(); setSaved(s); if (s) setPhase("done"); else setPhase("idle"); setPlan(null); setErr(""); onSaved?.(s); }, 0); return () => clearTimeout(k); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const makePlan = async () => {
    const m = msg.trim(); if (m.length < 4) { setErr(t("Write your question or task first.", "اكتب سؤالك أو مهمتك أولًا.")); return; } setErr(""); setPhase("planning");
    try { const r = await fetch("/api/agent/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: m, iso3: fixedIso ?? pickIso, lang }) }); const j = (await r.json().catch(() => ({}))) as { plan?: AgentPlan; message?: string }; if (!r.ok || !j.plan) { setErr(j.message ?? t("The agent could not plan this.", "تعذّر على الوكيل التخطيط لهذا.")); setPhase(saved ? "done" : "idle"); return; } const p = { ...j.plan, iso3: fixedIso ?? j.plan.iso3 ?? pickIso, format: format !== "auto" ? format : j.plan.format }; setPlan(p); setOff(new Set()); setPhase("planned"); } catch (e) { setErr((e as Error).message); setPhase(saved ? "done" : "idle"); }
  };
  const steps = plan ? plan.steps.filter((s) => !off.has(s.dept)) : []; const est = plan ? planEst({ ...plan, steps }) : 0; const missingCountry = plan ? needsCountry({ ...plan, steps }) && !iso : false;
  const run = async () => {
    if (!plan || !steps.length || !iso) return; const p = { ...plan, steps }; const a = new AbortController(); ac.current = a; setPhase("running"); setErr(""); setNote(""); setStartedAt(nowMs()); let l: Live = {}; for (const s of p.steps) l = liveStart(l, s.dept, nowMs()); setLive(l);
    const outs: StepOut[] = await runPlan(p, { iso, lang, signal: a.signal, data: () => profileTextFor(iso, lang), onEvent: (dept, e) => { if (e.type === "status") setNote(String(e.text ?? "")); else setLive((x) => liveEvent(x, dept, e, nowMs())); } });
    for (const s of p.steps) setLive((x) => liveEnd(x, s.dept, nowMs())); if (a.signal.aborted) { setPhase("planned"); return; }
    setNote(t("Writing the answer in the format you asked for…", "جارٍ كتابة الإجابة بالصيغة المطلوبة…")); const r = await composeAnswer({ message: msg.trim(), plan: p, country: cname, outs, lang, signal: a.signal });
    if (!r.ok) { setErr(r.message); setPhase("planned"); return; }
    const usd = outs.reduce((x, o) => x + (o.usd ?? 0), 0) + (r.a.usd ?? 0); const s: Saved = { message: msg.trim(), iso, country: cname, text: r.a.text, at: new Date().toISOString(), usd, depts: outs.filter((o) => o.ok).map((o) => o.name), format: p.format, outs: outs.map((o) => ({ dept: o.dept, name: o.name, ok: o.ok, text: o.text, error: o.error })) };
    try { localStorage.setItem(storageKey, JSON.stringify(s)); } catch { /* storage full: the answer is still shown */ } setSaved(s); onSaved?.(s); setPhase("done"); setNote("");
  };
  const pdf = async () => { if (!saved) return; try { const at = new Date().toISOString(); const title = `${t("Desk agent answer", "إجابة وكيل المكتب")}: ${saved.country}`; const md = `# ${title}\n\n**${t("Request", "الطلب")}:** ${saved.message}\n\n${saved.text}\n\n*${t("Prepared from", "أُعدّ من")}: ${saved.depts.join(", ")}. US$${saved.usd.toFixed(2)}.*`; await downloadHtmlReport(briefingHtml(md, { title, rtl: lang === "ar", foot: `Geo Desk · ${at.slice(0, 10)}`, classification: classification(lang) }), { id: `agent:${saved.iso}:${at}`, iso: saved.iso, country: saved.country, kind: "agent-answer", title, lang, at, usd: saved.usd }, `agent-${saved.iso}-${at.slice(0, 10)}.pdf`); } catch { setErr(t("Could not make the PDF.", "تعذّر إعداد PDF.")); } };
  const names = Object.fromEntries(DEPTS.map((d) => [d.id, L === "ar" ? d.ar : d.en]));
  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line bg-bg1 p-3.5">
        <label className="label mb-1 block" htmlFor="agent-msg">{t("Your question, task or directive", "سؤالك أو مهمتك أو توجيهك")}</label>
        <textarea id="agent-msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={1200} placeholder={t("Write it in your own words: a question, a task, a directive, and the format you want (a memo, bullet points, a table, talking points…).", "اكتبه بكلماتك: سؤال أو مهمة أو توجيه والصيغة التي تريدها (مذكرة أو نقاط أو جدول أو نقاط حوار…).")} className="w-full resize-y rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0 outline-none focus:border-accent" dir="auto" />
        <div className="mt-1.5 flex flex-wrap gap-1.5">{SUGGEST.map((s, i) => <button key={i} type="button" onClick={() => setMsg(t(s.en, s.ar))} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11px] text-t1 hover:border-accent hover:text-accent">{cut(t(s.en, s.ar), 58)}</button>)}</div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {!fixedIso && <div className="min-w-56 flex-1"><span className="label mb-1 block">{t("Country (optional: the agent can read it from your request)", "الدولة (اختياري: يستخلصها الوكيل من طلبك)")}</span><CountryPicker list={list} value={pickIso} onPick={(i) => setPickIso(i)} L={L} /></div>}
          <div><span className="label mb-1 block">{t("Format", "الصيغة")}</span><select value={format} onChange={(e) => setFormat(e.target.value)} className="h-9 rounded-[10px] border border-line bg-bg2 px-2 text-[12.5px] text-t0"><option value="auto">{t("Let the agent choose", "يختار الوكيل")}</option>{FORMATS.map((f) => <option key={f.id} value={f.id}>{L === "ar" ? f.ar : f.en}</option>)}</select></div>
          <button type="button" onClick={() => void makePlan()} disabled={phase === "planning" || phase === "running"} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"><Sparkles size={15} aria-hidden />{phase === "planning" ? t("Planning…", "جارٍ التخطيط…") : t("Plan it (about US$0.01)", "خطّط (نحو 0.01 دولار)")}</button>
        </div>
        {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
      </div>

      {plan && phase !== "done" && phase !== "idle" && plan.intent === "platform_help" && !plan.steps.length && <div className="rounded-[14px] border border-line bg-bg1 p-3.5"><p className="label">{t("From the platform guide (free)", "من دليل المنصة (مجاني)")}</p><div className="mt-1 text-[13px] text-t0" dir="auto"><Markdown source={plan.answer || t("I could not find that in the platform.", "لم أجد ذلك في المنصة.")} /></div></div>}

      {plan && (phase === "planned" || phase === "running") && plan.steps.length > 0 && <div className="rounded-[14px] border border-accent/40 bg-bg1 p-3.5" aria-label={t("The plan", "الخطة")}>
        <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold text-t0">{t("The plan", "الخطة")}</p><Pill c="var(--accent)">{iso ? cname : t("no country yet", "لا دولة بعد")}</Pill><Pill c="var(--c2)">{FORMATS.find((f) => f.id === plan.format)?.[L === "ar" ? "ar" : "en"] ?? plan.format}</Pill><Pill c="var(--t2)">{plan.source === "router" ? t("planned by the agent", "خطّط الوكيل") : t("keyword routing", "توجيه بالكلمات")}</Pill></div>
        {missingCountry && !fixedIso && <div className="mt-2"><p className="mb-1 text-[12px] text-warn">{t("Pick the country this is about:", "اختر الدولة المقصودة:")}</p><CountryPicker list={list} value={pickIso} onPick={(i) => setPickIso(i)} L={L} /></div>}
        <ul className="mt-2 space-y-2">{plan.steps.map((s) => { const d = DEPT_BY.get(s.dept)!; const on = !off.has(s.dept); return (
          <li key={s.dept} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ opacity: on ? 1 : 0.5 }}><div className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={on} disabled={phase === "running"} aria-label={names[s.dept]} onChange={() => setOff((o) => { const n = new Set(o); if (n.has(s.dept)) n.delete(s.dept); else n.add(s.dept); return n; })} /><b className="text-[13px] text-t0">{names[s.dept]}</b><span className="numt text-[11px] text-t2">{d.est ? `~US$${d.est.toFixed(2)}` : t("free", "مجاني")}</span><Link href={d.href} className="ms-auto text-[11px] text-accent hover:underline">{t("open its tab", "افتح تبويبه")}</Link></div><p className="mt-1 text-[12px] leading-snug text-t1" dir="auto">{s.why}</p><p className="mt-1 rounded-[8px] bg-bg3 p-2 text-[12px] leading-snug text-t0" dir="auto"><span className="text-t2">{t("Asked:", "السؤال:")} </span>{s.ask}</p></li>); })}</ul>
        {plan.notes && <p className="mt-2 text-[11.5px] text-t2" dir="auto">{t("Form notes:", "ملاحظات الصيغة:")} {plan.notes}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">{phase === "planned" ? <button type="button" onClick={() => void run()} disabled={!steps.length || !iso} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><Send size={15} aria-hidden />{t(`Run the plan (about US$${est.toFixed(2)})`, `شغّل الخطة (نحو ${est.toFixed(2)} دولار)`)}</button> : <button type="button" onClick={() => ac.current?.abort()} className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] text-t0">{t("Stop", "إيقاف")}</button>}<span className="text-[11.5px] text-t2">{t(`Each department is capped at US$1.00; the writer about US$${COMPOSE_EST.toFixed(2)}. Nothing runs until you click.`, `كل إدارة بسقف 1.00 دولار؛ والكاتب نحو ${COMPOSE_EST.toFixed(2)}. لا يبدأ شيء قبل نقرك.`)}</span></div>
      </div>}

      {(phase === "running" || (phase === "planned" && Object.keys(live).length > 0)) && <><LiveDesk L={L} live={live} running={phase === "running"} startedAt={startedAt} names={names} />{note && <p className="text-[11.5px] text-t2">{note}</p>}</>}

      {saved && phase === "done" && <div className="rounded-[14px] border border-line bg-bg1 p-3.5">
        <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold text-t0">{t("The answer", "الإجابة")}</p><Pill c="var(--accent)">{saved.country}</Pill><Pill c="var(--t2)">US${saved.usd.toFixed(2)}</Pill><span className="text-[11px] text-t2">{saved.at.slice(0, 16).replace("T", " ")}</span><button type="button" onClick={() => void pdf()} className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[12px] text-t0 hover:border-accent"><FileDown size={13} aria-hidden />PDF</button><button type="button" onClick={() => void navigator.clipboard?.writeText(saved.text)} className="inline-flex h-8 items-center rounded-[10px] border border-line px-3 text-[12px] text-t0 hover:border-accent">{t("Copy", "نسخ")}</button></div>
        <p className="mt-1.5 rounded-[8px] bg-bg2 p-2 text-[12px] text-t1" dir="auto"><span className="text-t2">{t("Your request:", "طلبك:")} </span>{saved.message}</p>
        <div className="mt-3 text-[13px]" dir="auto"><Markdown source={saved.text} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-t2">{t("Worked on by:", "عمل عليها:")}{saved.outs.map((o) => <Link key={o.dept} href={DEPT_BY.get(o.dept)?.href ?? "/"} className="rounded-full px-2 py-0.5 hover:text-accent" style={{ background: "var(--bg3)", border: `1px solid ${o.ok ? "var(--ok)" : "var(--risk)"}` }}>{o.name}{o.ok ? "" : " ×"}</Link>)}</div>
        <details className="mt-2 rounded-[10px] border border-line bg-bg2"><summary className="cursor-pointer list-none p-2.5 text-[12px] font-semibold text-t0">{t("What each department said", "ما قالته كل إدارة")}</summary><div className="space-y-3 border-t border-line p-3 text-[12.5px]">{saved.outs.map((o) => <div key={o.dept}><p className="mb-1 font-semibold text-t0">{o.name}</p>{o.ok ? <Markdown source={o.text} /> : <p className="text-risk">{o.error}</p>}</div>)}</div></details>
        <button type="button" onClick={() => { setPhase("idle"); setPlan(null); setSaved(null); try { localStorage.removeItem(storageKey); } catch { /* ignore */ } onSaved?.(null); }} className="mt-2 text-[12px] text-accent hover:underline">{t("Ask something else", "اسأل شيئًا آخر")}</button>
      </div>}
    </div>
  );
}
const nowMs = () => Date.now();
const cut = (x: string, n: number) => (x.length > n ? `${x.slice(0, n - 1)}…` : x);
