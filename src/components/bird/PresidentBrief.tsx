"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileDown, Lock, PenLine } from "lucide-react";
import { parsePresident, type PBrief } from "@/lib/desk/president";
import { parseReviews } from "@/lib/desk/core";
import { stripReviewJson } from "@/lib/review/pair";
import { liveEnd, liveEvent, liveStart, type Live } from "@/lib/bird/live";
import { PRESIDENT_EST, presidentKey, runPresident } from "@/lib/bird/president";
import { presidentHtml } from "@/lib/bird/presidentHtml";
import { classification } from "@/lib/case/report";
import { downloadHtmlReport } from "@/lib/reportpdf";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Markdown } from "../Markdown";
import { LiveDesk } from "./LiveDesk";
import { PresidentPages } from "./PresidentPages";
import { FieldUpdates } from "../hub/FieldUpdates";
import type { CaseData } from "@/lib/case/load";
import { buildPlaybook, playbookMarkdown } from "@/lib/case/playbook";
import { INFO, readHeld } from "@/lib/bird/runner";
import { SourceMix } from "./SourceMix";

type Held = { report: string; at: string; usd: number | null; topic: string; sources: { url: string }[] };
const nowMs = () => Date.now();
const SUGGEST: { en: string; ar: string }[] = [{ en: "Should the UAE build a logistics corridor with this country, on what terms, and what should I decide first?", ar: "هل ينبغي أن تبني الإمارات ممرًا لوجستيًا مع هذه الدولة، وبأي شروط، وما الذي أقرره أولًا؟" }, { en: "What is the biggest threat to the UAE's position here in the next 12 months and what do I do about it?", ar: "ما أكبر خطر على موقف الإمارات هنا خلال 12 شهرًا وماذا أفعل حياله؟" }, { en: "What does the other leader want from my next meeting, and what should I offer or refuse?", ar: "ماذا يريد القائد الآخر من لقائي القادم وماذا أعرض أو أرفض؟" }];
/** THE PRESIDENT'S BRIEF TAB: three illustrated pages on the country for the head of state's own eyes. Before it is written, a box takes a question or a directive from the President's office; the agents write a part of the brief to answer it. One click runs it (about US$0.70, under the US$1.00 ceiling); the pages are interactive and the PDF is three pages. */
export function PresidentBrief({ L, iso, name, d }: { L: Lang; iso: string; name: string; d: CaseData | null }) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const [held, setHeld] = useState<Held | null>(null); const [topic, setTopic] = useState(""); const [asking, setAsking] = useState(false); const [running, setRunning] = useState(false); const [live, setLive] = useState<Live>({}); const [startedAt, setStartedAt] = useState(0); const [note, setNote] = useState(""); const [err, setErr] = useState(""); const [choice, setChoice] = useState<Record<number, number>>({}); const [busy, setBusy] = useState(""); const ac = useRef<AbortController | null>(null);
  const read = useCallback(() => { try { const j = JSON.parse(localStorage.getItem(presidentKey(iso)) ?? "null") as { report?: string; at?: string; usage?: { usd?: number }; topic?: string; sources?: { url: string }[] } | null; return j && typeof j.report === "string" && j.at ? { report: j.report, at: j.at, usd: typeof j.usage?.usd === "number" ? j.usage.usd : null, topic: j.topic ?? "", sources: Array.isArray(j.sources) ? j.sources : [] } : null; } catch { return null; } }, [iso]);
  useEffect(() => { const k = setTimeout(() => { const h = read(); setHeld(h); setTopic(h?.topic ?? ""); try { setChoice(JSON.parse(localStorage.getItem(`gd-president-choice:${iso}`) ?? "{}") as Record<number, number>); } catch { setChoice({}); } }, 0); return () => clearTimeout(k); }, [iso, read]);
  const pick = (c: Record<number, number>) => { setChoice(c); try { localStorage.setItem(`gd-president-choice:${iso}`, JSON.stringify(c)); } catch { /* the choice is still shown */ } };
  const run = async () => {
    if (running) return; setAsking(false); setErr(""); setNote(""); setRunning(true); setLive(liveStart({}, "president", nowMs())); setStartedAt(nowMs()); const a = new AbortController(); ac.current = a;
    const rep = (id: keyof typeof INFO) => readHeld(INFO[id].key(iso))?.report ?? null; const playbook = d ? playbookMarkdown(buildPlaybook(d, { council: rep("council"), architect: rep("architect"), kingBrief: rep("king"), embIntel: rep("intel"), embPlan: rep("plan"), mofa: rep("mofa") }, lang), { level: 2, noTitle: true }) : undefined;
    const out = await runPresident({ iso, lang, topic: topic.trim(), refresh: true, playbook, signal: a.signal, onEvent: (e) => { if (e.type === "status") setNote(String(e.text ?? "")); else setLive((l) => liveEvent(l, "president", e, nowMs())); } });
    setLive((l) => liveEnd(l, "president", nowMs())); setRunning(false); if (out.ok) { setHeld(read()); pick({}); } else if (out.error !== "aborted") setErr(out.message);
  };
  const brief: PBrief | null = held ? parsePresident(held.report) : null; const reviews = held ? parseReviews(held.report) : [];
  const pdf = async () => { if (!held || !brief) return; setBusy("0%"); try { const at = new Date().toISOString(); const title = `${t("The President's brief", "موجز الرئيس")}: ${name}`; await downloadHtmlReport(presidentHtml(brief, lang, { title, country: name, foot: `Geo Desk · ${at.slice(0, 10)}`, classification: classification(lang), date: at.slice(0, 10), choice, directive: held.topic }), { id: `president:${iso}:${at}`, iso, country: name, kind: "president-brief", title, lang, at, usd: held.usd }, `president-${iso}-${at.slice(0, 10)}.pdf`, (d, n) => setBusy(`${Math.round((d / n) * 100)}%`)); } catch { setErr(t("Could not make the PDF.", "تعذّر إعداد PDF.")); } finally { setBusy(""); } };
  const clean = held ? stripReviewJson(held.report) : ""; const cover = clean.split(/^# Structured data/m)[0].trim();
  return (
    <div className="space-y-4">
      <Block title={t(`The President's brief: ${name}`, `موجز الرئيس: ${name}`)} hint={t("Three illustrated pages for the head of state's own eyes: where we stand, what the UAE has here and could build (a corridor), and the decisions to take with a recommendation. Proposals for decision, never adopted policy.", "ثلاث صفحات مصوّرة لعيني رئيس الدولة وحده: أين نقف وما تملكه الإمارات هنا وما يمكن أن تبنيه (ممر) والقرارات المطلوبة مع توصية. مقترحات للقرار لا سياسة معتمدة.")} right={<Pill c="var(--risk)"><Lock size={10} className="me-1 inline" aria-hidden />{t("eyes only", "للرئيس وحده")}</Pill>}>
        <label className="label mb-1 block" htmlFor="pres-topic">{t("Before the brief is written: a question or a directive from the President's office (optional)", "قبل كتابة الموجز: سؤال أو توجيه من ديوان الرئيس (اختياري)")}</label>
        <textarea id="pres-topic" value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} maxLength={600} disabled={running} placeholder={t("For example: should we build a corridor with this country, and what do I decide first? The agents write a part of the brief to answer it.", "مثال: هل نبني ممرًا مع هذه الدولة وما الذي أقرره أولًا؟ يكتب الوكلاء جزءًا من الموجز للإجابة عنه.")} className="w-full resize-y rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0 outline-none focus:border-accent" dir="auto" />
        <div className="mt-1.5 flex flex-wrap gap-1.5">{SUGGEST.map((s, i) => <button key={i} type="button" disabled={running} onClick={() => setTopic(t(s.en, s.ar))} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11px] text-t1 hover:border-accent hover:text-accent">{t(s.en, s.ar).slice(0, 64)}…</button>)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">{!running ? <button type="button" onClick={() => setAsking((v) => !v)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)]"><PenLine size={15} aria-hidden />{held ? t("Write it again with this directive", "اكتبه مجددًا بهذا التوجيه") : t(`Write the President's brief (about US$${PRESIDENT_EST.toFixed(2)})`, `اكتب موجز الرئيس (نحو ${PRESIDENT_EST.toFixed(2)} دولار)`)}</button> : <button type="button" onClick={() => ac.current?.abort()} className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] text-t0">{t("Stop", "إيقاف")}</button>}
          {held && brief && !running && <button type="button" onClick={() => void pdf()} disabled={!!busy} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line px-4 text-[13px] text-t0 hover:border-accent"><FileDown size={15} aria-hidden />{busy ? `${t("Making PDF", "جارٍ إعداد PDF")} ${busy}` : t("PDF (three pages)", "PDF (ثلاث صفحات)")}</button>}
          {held && <span className="text-[11.5px] text-t2">{t("written", "كُتب")} {held.at.slice(0, 16).replace("T", " ")}{held.usd != null ? ` · US$${held.usd.toFixed(2)}` : ""}</span>}{reviews.map((r) => <Pill key={r.lens} c={r.verdict === "approve" ? "var(--ok)" : r.verdict === "reject" ? "var(--risk)" : "var(--warn)"}>{r.lens}: {r.verdict}</Pill>)}</div>
        {asking && !running && <div role="alertdialog" aria-label={t("Confirm the run", "تأكيد التشغيل")} className="mt-2 rounded-[10px] border border-accent/50 bg-bg3 p-3"><p className="text-[12.5px] leading-snug text-t0">{t(`Write the President's brief for ${name}? Four specialists (the corridor, recent events and the UAE's presence, the other side's wants and the history, and the UAE playbook with where its implementation stands), a Chief of Staff and the two independent auditors, using web search for the latest events and the corridor. ${topic.trim() ? "Your directive is carried to every agent and answered in its own part of the brief. " : ""}Estimated cost about US$${PRESIDENT_EST.toFixed(2)}, capped at US$1.00; about three minutes.`, `كتابة موجز الرئيس عن ${name}؟ أربعة مختصين (الممر والمستجدات وحضور الإمارات وما يريده الطرف الآخر والتاريخ ودليل الإمارات وحالة تنفيذه) ورئيس ديوان والمدققان المستقلان، مع البحث في الويب عن آخر الأحداث والممر. ${topic.trim() ? "يصل توجيهكم إلى كل وكيل ويُجاب عنه في جزء مخصص من الموجز. " : ""}الكلفة التقديرية نحو ${PRESIDENT_EST.toFixed(2)} دولار بسقف 1.00 دولار؛ نحو ثلاث دقائق.`)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void run()} className="inline-flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]">{t("Confirm and write", "أكّد واكتب")}</button><button type="button" onClick={() => setAsking(false)} className="inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] text-t1">{t("Cancel", "إلغاء")}</button></div></div>}
        {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
        {(running || Object.keys(live).length > 0) && <LiveDesk L={L} live={live} running={running} startedAt={startedAt} names={{ president: t("The President's brief", "موجز الرئيس") }} />}{running && note && <p className="mt-1 text-[11.5px] text-t2">{note}</p>}
      </Block>
      {held && <SourceMix sources={held.sources} L={L} />}
      <FieldUpdates L={L} iso={iso} name={name} />
      {held && brief && <PresidentPages b={brief} L={L} iso={iso} country={name} choice={choice} onChoice={pick} />}
      {held && !brief && <Block title={t("The brief (the structured pages could not be read, so here is the text)", "الموجز (تعذّرت قراءة الصفحات المنظمة فهذا هو النص)")}><div className="text-[13px]"><Markdown source={cover || clean} /></div></Block>}
      {!held && !running && <p className="rounded-[14px] border border-dashed border-line p-4 text-[12.5px] leading-snug text-t1">{t("No President's brief has been written for this country yet. Add a question or a directive above if you want a part of the brief to answer it, then write it.", "لم يُكتب موجز للرئيس عن هذه الدولة بعد. أضف سؤالًا أو توجيهًا أعلاه إن أردت جزءًا من الموجز يجيب عنه ثم اكتبه.")}</p>}
    </div>
  );
}
