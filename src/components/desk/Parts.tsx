"use client";
import { useState, type ReactNode } from "react";
import { Copy, Printer, Trash2 } from "lucide-react";
import { PdfButton } from "../PdfButton";
import { headlineOf, type Agent } from "@/lib/desk/core";
import { briefingHtml, printBriefing } from "@/lib/dossier/export";
import { classification } from "@/lib/case/report";
import { Block, type Lang } from "../falcon/bits";
import { Markdown } from "../Markdown";
import { Progress, Refusal, RunBar } from "../machiavelli/forms";
import { usd } from "../machiavelli/parts";
import { useRun, type AgentLive, type Saved } from "../machiavelli/useRun";
import { Hatch, statusWord, useTr } from "../case/bits";
import { Drill, Row, Bullets } from "./shared";

/** The click-started run of one council product: its focus, what it reads, the cost, and live progress by sitting. */
export function RunPanel({ L, title, hint, focus, setFocus, placeholder, run, start, label, cost, refusal, useContext, setUseContext, ctxFound, disabled, extra }: { L: Lang; title: string; hint: string; focus: string; setFocus: (v: string) => void; placeholder: string; run: ReturnType<typeof useRun>; start: () => void; label: string; cost: string; refusal: string; useContext: boolean; setUseContext: (v: boolean) => void; ctxFound: string[]; disabled?: boolean; extra?: ReactNode }) {
  const t = useTr(L);
  return (
    <Block title={title} hint={hint}>
      <label className="block"><span className="label mb-1 block">{t("Focus (optional)", "التركيز (اختياري)")}</span><textarea rows={2} maxLength={400} value={focus} placeholder={placeholder} onChange={(e) => setFocus(e.target.value)} className="w-full rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0" /></label>
      <Refusal text={refusal} />
      <label className="mt-2 flex items-start gap-2 text-[12px] text-t1"><input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} className="mt-0.5" /><span>{t("Read what is on file", "اقرأ المحفوظ")}: {ctxFound.length ? <span className="text-ok">{ctxFound.join(" · ")}</span> : <span className="text-warn">{t("nothing yet", "لا شيء بعد")}</span>}</span></label>
      {extra}
      <RunBar phase={run.phase} onRun={start} onCancel={run.cancel} disabled={!!refusal || disabled} L={L} label={label} cost={cost} />
      {run.phase === "running" && <p className="mt-2 text-[11.5px] leading-snug text-warn">{t("Stay on this page while the sitting runs: leaving it cancels the run and what was spent is lost. Switching tabs inside the page is fine.", "ابقَ في هذه الصفحة أثناء الجلسة: مغادرتها تلغي التشغيل وتضيع كلفته. والتنقل بين التبويبات داخل الصفحة لا بأس به.")}</p>}
      {run.phase === "running" && run.agents.length > 0 && <Sittings L={L} agents={run.agents} />}
      <Progress phase={run.phase} status={run.status} tail={run.agents.filter((a) => a.status === "run").length > 1 ? "" : run.tail} searches={run.searches} sources={run.sources} err={run.err} L={L} />
    </Block>
  );
}
export function Sittings({ L, agents }: { L: Lang; agents: AgentLive[] }) {
  return <ul className="mt-3 grid gap-1.5 sm:grid-cols-2" aria-label="Sittings">{agents.map((a) => <li key={a.id} className="flex items-center gap-2 rounded-[10px] bg-bg2 p-2 text-[12px]" style={{ borderInlineStart: `3px solid ${a.status === "done" ? "var(--ok)" : a.status === "run" ? "var(--accent)" : a.status === "error" ? "var(--risk)" : a.status === "skipped" ? "var(--warn)" : "var(--line)"}` }}><span className="min-w-0 flex-1 text-t0" dir="auto">{a.name}</span><span className="numt shrink-0 text-[10.5px] text-t2">{statusWord(L, a.status)}{a.usd != null ? ` · ${usd(a.usd)}` : ""}</span></li>)}</ul>;
}
/** What was run, what it cost, and copy, print and clear. */
export function SavedBar({ L, s, name, title, strip, onClear, partial, pdfKey }: { L: Lang; s: Saved; name: string; title: string; strip: RegExp; onClear: () => void; rtl: boolean; partial?: boolean; pdfKey?: string }) {
  const t = useTr(L); const [copied, setCopied] = useState(false); const clean = () => s.report.replace(strip, "").trim(); const runLang: Lang = (s.options as { lang?: string } | undefined)?.lang === "ar" ? "ar" : "en";
  return (
    <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="numt text-[11.5px] text-t1">{name} · {s.at.slice(0, 16).replace("T", " ")} UTC · {s.cached ? t("from cache (no cost)", "من الذاكرة (بلا كلفة)") : `${t("cost", "الكلفة")} ${usd(s.usage.usd)}`} · {s.usage.searches} {t("searches", "بحثًا")} · {s.sources.length} {t("sources", "مصدرًا")}</span>
      <span className="ms-auto flex gap-1.5"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(clean()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Copy size={13} />{copied ? "✓" : t("Copy", "نسخ")}</button>
        {pdfKey && <PdfButton L={L} storeKey={pdfKey} />}
        <button type="button" onClick={() => printBriefing(briefingHtml(clean(), { title: `${title}: ${name}`, rtl: runLang === "ar", foot: `${s.model} · ${s.at}`, classification: classification(runLang) }))} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Printer size={13} />{t("Print", "طباعة")}</button>
        <button type="button" onClick={() => { if (window.confirm(t("Remove this saved result from this browser?", "إزالة هذه النتيجة المحفوظة من هذا المتصفح؟"))) onClear(); }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] text-t2 hover:text-risk"><Trash2 size={13} />{t("Remove", "إزالة")}</button></span></div>
      {partial && <PartialNote L={L} />}
      <p className="rounded-[10px] border border-warn/40 bg-warn/10 p-2.5 text-[12px] text-t0" role="note">{t("Working analysis of proposals, not reviewed and not adopted UAE policy. Owners are proposed; funding is \"not estimated\" unless evidenced; people are public roles and organisations only; the specialists are archetypes of expertise, not real persons.", "تحليل عمل لمقترحات، غير مُراجَع وليس سياسة إماراتية معتمدة. المسؤولون مقترحون؛ والتمويل «غير مقدّر» ما لم يثبت؛ والأشخاص أدوار عامة وجهات فقط؛ والمختصون نماذج خبرة لا أشخاص حقيقيون.")}</p>
    </div>
  );
}
export const PartialNote = ({ L }: { L: Lang }) => <p role="alert" className="rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{L === "ar" ? "قُطع الجزء المنظم من هذه الإجابة عند حد المخرجات: يُعرض المكتمل منه وينقص الباقي. اكتبه من جديد للحصول على المجموعة كاملة." : "The structured part of this answer was cut off at the model's output limit: what was complete is shown and the rest is missing. Write it again for the full set."}</p>;
export const Need = ({ L, what }: { L: Lang; what: string }) => <Hatch>{L === "ar" ? `شغّل ${what} لكتابة هذا` : `Run ${what} to write this`}</Hatch>;

/** The specialists: who each is, what each is asked, what each starts from, and what each found; any of them can be asked directly. */
export function AgentCards({ L, agents, sectionOf, onAsk, tag }: { L: Lang; agents: Agent[]; sectionOf: (a: Agent) => string; onAsk: (text: string, agents: string[]) => void; tag: (a: Agent) => string }) {
  const t = useTr(L);
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">{agents.map((a) => { const sec = sectionOf(a); const hl = sec ? headlineOf(sec) : ""; return (
      <Drill key={a.id} L={L} head={<><span className="num me-1.5 rounded bg-bg3 px-1.5 py-0.5 text-[10.5px] text-t1">{tag(a)}</span>{L === "ar" ? a.ar : a.en}</>} sub={hl || (L === "ar" ? a.field.ar : a.field.en)} accent={sec ? "var(--ok)" : undefined}>
        <Row label={t("Who", "من")}>{L === "ar" ? a.title.ar : a.title.en}</Row>
        <Row label={t("Mandate", "المهمة")}>{a.mandate}</Row>
        <Bullets label={t("The questions this specialist answers", "الأسئلة التي يجيب عنها هذا المختص")} items={a.questions} />
        <Row label={t("Starts from", "ينطلق من")}>{a.sources.join("; ")}</Row>
        {sec ? <div className="rounded-[10px] bg-bg2 p-3"><div className="label mb-1">{t("What this specialist found", "ما وجده هذا المختص")}</div><article><Markdown source={sec} /></article></div> : <p className="text-t2">{t("Not yet heard: run the council to hear this specialist, or ask directly.", "لم يُسمع بعد: شغّل المجلس لسماع هذا المختص أو اسأله مباشرة.")}</p>}
        <button type="button" onClick={() => onAsk("", [a.id])} className="inline-flex h-8 items-center rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-[var(--accent-ink)]">{t("Ask this specialist", "اسأل هذا المختص")}</button>
      </Drill>); })}</div>
  );
}
