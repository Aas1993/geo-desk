"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, FileText, Globe, Printer, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/store";
import { Markdown } from "./Markdown";
import { BUDGET, COUNTERPARTS, DEPTHS, FOCUSES, MEETINGS, type Counterpart, type Depth, type Focus, type Meeting } from "@/lib/dossier/options";
import { briefingHtml, printBriefing, saveBlob } from "@/lib/dossier/export";
import type { Country } from "@/lib/types";

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Tile = { label: string; value: string; sub?: string };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
type Saved = { report: string; sources: Source[]; tiles: Tile[]; usage: Usage; at: string; model: string; truncated?: boolean; cached?: boolean };
type Step = { id: number; kind: "search" | "fetch" | "analyse" | "status"; text: string };
type Status = { enabled: boolean; model: string; remainingThisHour: number };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

const T = {
  en: { title: "Detailed ministerial briefing", sub: "Strategic country briefing for a UAE Minister of State: executive brief, intelligence dossier and meeting talking points.",
    country: "Country", counterpart: "Counterpart", name: "Counterpart's name (optional)", namePh: "Leave blank to identify the current office-holder", meeting: "Meeting type", date: "Meeting date (optional)", depth: "Briefing depth", focus: "Focus areas", lang: "Language",
    notes: "Desk input (optional, strongly recommended)", notesHint: "The app holds no approved UAE positions, meeting minutes or consular data. Anything you paste here is used as given and cited as [Desk]; where it is missing, the briefing says DESK INPUT REQUIRED instead of guessing.",
    positions: "Approved UAE positions and guidance", previous: "Previous meetings, outcomes and commitments", objectives: "Objectives for this meeting",
    go: "Generate briefing", regen: "Regenerate", again: "New briefing", close: "Close", running: "Researching and writing…", facts: "UAE-side record collected", p1: "Executive brief", p2: "Intelligence dossier", p3: "Talking points", all: "Whole document",
    cost: "Each run reads the web and bills your Anthropic account: the cap per run is set by the depth, and a typical run costs about", costTail: "(model tokens plus about 1 cent per web search; the actual cost is shown afterwards). Results are cached for 6 hours.", left: "new briefings left this hour",
    copy: "Copy", copied: "Copied", pdf: "PDF", word: "Word", pptx: "PowerPoint export is not built yet", sources: "Sources", cited: "cited", other: "also found", usage: "Usage", searches: "Web searches", pages: "Pages read", tokens: "Tokens in / out", costL: "Estimated cost",
    classification: "DRAFT FOR MINISTERIAL REVIEW · AI-GENERATED FROM PUBLIC SOURCES AND THE APP'S DATASETS", foot: "AI-generated from public sources and the app's own datasets; every figure should be verified before use. Items marked DESK INPUT REQUIRED need approved UAE positions, internal records or mandates that this application does not hold. Not legal, sanctions-compliance, investment or travel advice, and not an intelligence assessment.",
    disabled: "Detailed briefings are switched off on this server.", errCred: "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`.", errCredits: "Your Anthropic credit balance is too low.", errGeneric: "The briefing failed:", trunc: "The briefing hit its length ceiling and may be cut off. Regenerate at a deeper setting or with a narrower focus.", stale: "Written more than 6 hours ago. Regenerate before the meeting to pick up the latest developments.", est: { executive: "$0.45 (measured)", standard: "$0.80 (measured)", comprehensive: "$1.80 (measured)" } },
  ar: { title: "موجز الوزير التفصيلي", sub: "موجز استراتيجي عن الدولة لوزير دولة إماراتي: موجز تنفيذي وملف استخباري ونقاط حديث للقاء.",
    country: "الدولة", counterpart: "الطرف المقابل", name: "اسم الطرف المقابل (اختياري)", namePh: "اتركه فارغًا لتحديد شاغل المنصب الحالي", meeting: "نوع اللقاء", date: "تاريخ اللقاء (اختياري)", depth: "عمق الموجز", focus: "مجالات التركيز", lang: "اللغة",
    notes: "مدخلات المكتب (اختيارية، ويوصى بها بشدة)", notesHint: "لا يملك التطبيق مواقف إماراتية معتمدة ولا محاضر اجتماعات ولا بيانات قنصلية. ما تلصقه هنا يُستخدم كما هو ويُستشهد به بوسم [Desk]؛ وإن غاب، يكتب الموجز «مطلوب مدخل من المكتب» بدل التخمين.",
    positions: "المواقف والتوجيهات الإماراتية المعتمدة", previous: "اللقاءات السابقة ونتائجها والالتزامات", objectives: "أهداف هذا اللقاء",
    go: "إنشاء الموجز", regen: "إعادة الإنشاء", again: "موجز جديد", close: "إغلاق", running: "جارٍ البحث والكتابة…", facts: "تم جمع السجل الإماراتي", p1: "الموجز التنفيذي", p2: "الملف الاستخباري", p3: "نقاط الحديث", all: "المستند كاملًا",
    cost: "كل تشغيل يقرأ الويب ويُحتسب على حساب Anthropic: سقف التشغيل يحدده العمق، وتبلغ تكلفة التشغيل المعتاد نحو", costTail: "(رموز النموذج مع نحو سنت لكل بحث ويب؛ وتظهر التكلفة الفعلية بعد ذلك). النتائج مخزّنة 6 ساعات.", left: "موجزات جديدة متبقية هذه الساعة",
    copy: "نسخ", copied: "تم النسخ", pdf: "PDF", word: "Word", pptx: "التصدير إلى PowerPoint غير متاح بعد", sources: "المصادر", cited: "مستشهد بها", other: "عُثر عليها أيضًا", usage: "الاستخدام", searches: "عمليات بحث", pages: "صفحات مقروءة", tokens: "الرموز دخل / خرج", costL: "التكلفة التقديرية",
    classification: "مسودة للمراجعة الوزارية · مُولَّدة بالذكاء الاصطناعي من مصادر عامة وبيانات التطبيق", foot: "مُولَّد بالذكاء الاصطناعي من مصادر عامة وبيانات التطبيق؛ يجب التحقق من كل رقم قبل استخدامه. البنود الموسومة «مطلوب مدخل من المكتب» تحتاج إلى مواقف إماراتية معتمدة أو سجلات داخلية أو تفويضات لا يملكها التطبيق. ليس نصيحة قانونية أو امتثالًا للعقوبات أو استثمارية أو سفر، وليس تقييمًا استخباريًا.",
    disabled: "الموجزات التفصيلية متوقفة على هذا الخادم.", errCred: "بيانات اعتماد Anthropic مفقودة أو منتهية.", errCredits: "رصيدك في Anthropic منخفض جدًا.", errGeneric: "تعذّر إنشاء الموجز:", trunc: "بلغ الموجز سقف الطول وقد يكون مقطوعًا. أعد الإنشاء بعمق أكبر أو بتركيز أضيق.", stale: "كُتب قبل أكثر من 6 ساعات. أعد الإنشاء قبل اللقاء لإدراج آخر التطورات.", est: { executive: "0.45 دولار (مقيس)", standard: "0.8 دولار (مقيس)", comprehensive: "1.8 دولار (مقيس)" } },
} as const;
const COUNTERPART_AR: Record<string, string> = { "head-of-state": "رئيس الدولة", "head-of-government": "رئيس الوزراء / الحكومة", "foreign-minister": "وزير الخارجية", "economy-minister": "وزير الاقتصاد / الاستثمار / التجارة", "finance-minister": "وزير المالية", "energy-minister": "وزير الطاقة", "defence-security": "مسؤول الدفاع / الأمن الوطني", other: "مسؤول آخر" };
const MEETING_AR: Record<string, string> = { bilateral: "لقاء ثنائي", "state-visit": "زيارة دولة", summit: "قمة متعددة الأطراف (على الهامش)", courtesy: "زيارة مجاملة", "economic-mission": "بعثة اقتصادية" };
const DEPTH_AR: Record<string, string> = { executive: "تنفيذي (نحو 3 صفحات)", standard: "قياسي (نحو 10 صفحات)", comprehensive: "شامل (نحو 20 إلى 30 صفحة)" };
const FOCUS_AR: Record<string, string> = { comprehensive: "شامل", political: "سياسي", economic: "اقتصادي", investment: "استثمار", security: "أمن", multilateral: "متعدد الأطراف" };
const sel = "h-9 w-full rounded-[8px] border border-line bg-bg2 px-2.5 text-[13px] text-t0";
const lab = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-t2";

/** Full-screen workspace for the detailed ministerial briefing: options, live research progress, then three deliverables with exports. */
export function DossierWorkspace({ c, onClose }: { c: Country; onClose: () => void }) {
  const { lang: appLang } = useT(); const [lang, setLang] = useState<"en" | "ar">(appLang); const u = T[lang]; const rtl = lang === "ar";
  const storeKey = `gd-dossier:${c.iso3}`;
  const [counterpart, setCounterpart] = useState<Counterpart>("foreign-minister"); const [cname, setCname] = useState(""); const [meeting, setMeeting] = useState<Meeting>("bilateral"); const [date, setDate] = useState(""); const [depth, setDepth] = useState<Depth>("standard"); const [focus, setFocus] = useState<Focus[]>(["comprehensive"]);
  const [notes, setNotes] = useState({ positions: "", previous: "", objectives: "" });
  const [phase, setPhase] = useState<"form" | "running" | "done" | "error">("form"); const [text, setText] = useState(""); const [steps, setSteps] = useState<Step[]>([]); const [sources, setSources] = useState<Source[]>([]); const [tiles, setTiles] = useState<Tile[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null); const [err, setErr] = useState<{ error: string; message?: string } | null>(null); const [status, setStatus] = useState<Status | null>(null); const [part, setPart] = useState(0); const [copied, setCopied] = useState(false); const [now, setNow] = useState(0);
  const abort = useRef<AbortController | null>(null); const stepId = useRef(0); const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => { setMounted(true); setNow(Date.now()); try { const s = localStorage.getItem(storeKey); if (s) { const v = JSON.parse(s) as Saved; setSaved(v); setText(v.report); setSources(v.sources); setTiles(v.tiles ?? []); setPhase("done"); } } catch { /* none saved */ } }, 0);
    fetch("/api/dossier/" + c.iso3).then((r) => r.json()).then(setStatus).catch(() => {});
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", esc); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { clearTimeout(t0); abort.current?.abort(); document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [c.iso3, storeKey, onClose]);

  const push = (kind: Step["kind"], t: string) => setSteps((s) => { const last = s[s.length - 1]; if (kind === "analyse" && last?.kind === "analyse") return [...s.slice(0, -1), { ...last, text: String((Number(last.text) || 1) + 1) }]; return [...s.slice(-40), { id: ++stepId.current, kind, text: kind === "analyse" ? "1" : t }]; });
  async function run(refresh: boolean) {
    abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("running"); setText(""); setSteps([]); setSources([]); setTiles([]); setErr(null); setSaved(null); setPart(0);
    try {
      const r = await fetch("/api/dossier/" + c.iso3, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ counterpart, counterpartName: cname, meeting, meetingDate: date, depth, focus, lang, notes, refresh }), signal: ac.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); setErr({ error: j.error ?? "upstream", message: j.message }); setPhase("error"); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let idx: number; while ((idx = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2); if (!line.startsWith("data:")) continue; const ev = JSON.parse(line.slice(5)) as Record<string, unknown> & { type: string };
          if (ev.type === "text") setText((x) => x + (ev.delta as string));
          else if (ev.type === "status") push("status", ev.text as string);
          else if (ev.type === "facts") { setTiles((ev.tiles as Tile[]) ?? []); push("status", `${u.facts} (${ev.count})`); }
          else if (ev.type === "tool") push(ev.name as Step["kind"], ev.detail as string);
          else if (ev.type === "source") { const n = ev as unknown as Source; setSources((s) => (s.some((x) => x.url === n.url) ? s.map((x) => (x.url === n.url ? { ...x, kind: n.kind } : x)) : [...s, n])); }
          else if (ev.type === "error") { setErr({ error: ev.error as string, message: ev.message as string }); setPhase("error"); }
          else if (ev.type === "done") { const d = ev as unknown as Saved; setText(d.report); setSources(d.sources); setTiles(d.tiles ?? []); setSaved(d); setPhase("done"); setNow(Date.now()); try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch { /* storage full */ } fetch("/api/dossier/" + c.iso3).then((x) => x.json()).then(setStatus).catch(() => {}); }
        }
      }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr({ error: "upstream", message: (e as Error).message }); setPhase("error"); } }
  }
  const parts = useMemo(() => { const m = [...text.matchAll(/^# (?=\d\.\s)(.*)$/gm)]; const pre = m.length ? text.slice(0, m[0].index) : text; const ps = m.map((x, i) => text.slice(x.index, i + 1 < m.length ? m[i + 1].index : undefined)); return { pre, ps }; }, [text]);
  const all: string[] = ([u.p1, u.p2, u.p3] as string[]).slice(0, Math.max(1, parts.ps.length)).concat(parts.ps.length > 1 ? [u.all] : []); const last = all.length - 1; const wholeTab = parts.ps.length > 1 && part === last; const pi = Math.min(part, Math.max(0, parts.ps.length - 1));
  const body = !parts.ps.length || wholeTab ? text : (pi === 0 ? parts.pre : "") + parts.ps[pi];
  const cited = phase === "done" ? sources.filter((s) => text.includes(s.url) || text.includes(decodeURI(s.url))) : []; const rest = sources.filter((s) => !cited.includes(s));
  const name = rtl && c.nameAr ? c.nameAr : c.name; const fileBase = `${c.iso3}-ministerial-briefing`;
  const pdfHtml = () => briefingHtml(text, { title: `${u.title}: ${name}`, rtl, foot: `${u.foot} ${saved?.model ?? ""} · ${saved?.at ?? ""}`, classification: u.classification });
  const toggleFocus = (f: Focus) => setFocus((cur) => { if (f === "comprehensive") return ["comprehensive"]; const n = cur.filter((x) => x !== "comprehensive"); const next = n.includes(f) ? n.filter((x) => x !== f) : [...n, f]; return next.length ? next : ["comprehensive"]; });
  const errText = !err ? "" : err.error === "no_credits" ? u.errCredits : err.error === "no_credentials" ? u.errCred : err.error === "disabled" ? u.disabled : err.message ? err.message : `${u.errGeneric} ${err.error}`;
  const stale = phase === "done" && saved && now > 0 && now - Date.parse(saved.at) > 6 * 3600_000;
  const L = (en: string, ar: Record<string, string>, k: string) => (rtl ? ar[k] ?? en : en);
  if (!mounted) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={u.title} dir={rtl ? "rtl" : "ltr"} className="fixed inset-0 z-[100] flex flex-col bg-bg0 text-t0">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-bg1 px-4 py-3">
        <div className="min-w-0 flex-1"><div className="display truncate text-[17px] font-semibold">{c.flag} {name} · {u.title}</div><p className="hidden truncate text-[12px] text-t2 sm:block">{u.sub}</p></div>
        <button onClick={onClose} aria-label={u.close} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={16} /></button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1280px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {(phase === "form" || phase === "error") && (
              <section className="rounded-[12px] border border-line bg-bg1 p-4">
                {status && !status.enabled ? <p className="text-[13px] text-t1">{u.disabled}</p> : (<>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className={lab}>{u.counterpart}</span><select className={sel} value={counterpart} onChange={(e) => setCounterpart(e.target.value as Counterpart)}>{COUNTERPARTS.map(([k, en]) => <option key={k} value={k}>{L(en, COUNTERPART_AR, k)}</option>)}</select></label>
                    <label><span className={lab}>{u.name}</span><input className={sel} value={cname} maxLength={120} placeholder={u.namePh} onChange={(e) => setCname(e.target.value)} /></label>
                    <label><span className={lab}>{u.meeting}</span><select className={sel} value={meeting} onChange={(e) => setMeeting(e.target.value as Meeting)}>{MEETINGS.map(([k, en]) => <option key={k} value={k}>{L(en, MEETING_AR, k)}</option>)}</select></label>
                    <label><span className={lab}>{u.date}</span><input type="date" className={sel} value={date} onChange={(e) => setDate(e.target.value)} /></label>
                    <label><span className={lab}>{u.depth}</span><select className={sel} value={depth} onChange={(e) => setDepth(e.target.value as Depth)}>{DEPTHS.map(([k, en]) => <option key={k} value={k}>{L(en, DEPTH_AR, k)}</option>)}</select></label>
                    <label><span className={lab}>{u.lang}</span><select className={sel} value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}><option value="en">English</option><option value="ar">العربية</option></select></label>
                  </div>
                  <div className="mt-3"><span className={lab}>{u.focus}</span><div className="flex flex-wrap gap-1.5">{FOCUSES.map(([k, en]) => <button key={k} type="button" aria-pressed={focus.includes(k)} onClick={() => toggleFocus(k)} className={`h-8 rounded-full border px-3 text-[12px] ${focus.includes(k) ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:text-t0"}`}>{L(en, FOCUS_AR, k)}</button>)}</div></div>
                  <details className="mt-3 rounded-[10px] border border-line bg-bg2/60 p-3" open><summary className="cursor-pointer text-[13px] font-semibold">{u.notes}</summary>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-t1">{u.notesHint}</p>
                    {(["positions", "previous", "objectives"] as const).map((k) => <label key={k} className="mt-2 block"><span className={lab}>{u[k]}</span><textarea rows={3} maxLength={k === "objectives" ? 2000 : 4000} value={notes[k]} onChange={(e) => setNotes((n) => ({ ...n, [k]: e.target.value }))} className="w-full rounded-[8px] border border-line bg-bg1 p-2 text-[13px] text-t0" /></label>)}
                  </details>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => run(false)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><Sparkles size={15} />{u.go}</button>
                    {saved && <button onClick={() => setPhase("done")} className="h-10 rounded-[10px] bg-bg3 px-4 text-[13px] text-t1 hover:text-t0">{u.p1} ←</button>}
                    {status && <span className="num text-[11px] text-t2">{status.model} · {status.remainingThisHour} {u.left}</span>}
                  </div>
                  <p className="mt-3 rounded-[8px] border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-t2">{u.cost} {u.est[depth]} {u.costTail} <span className="num">({BUDGET[depth].searches} / {BUDGET[depth].fetches})</span></p>
                  {phase === "error" && <div role="alert" className="mt-3 rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px]">{errText}</div>}
                </>)}
              </section>
            )}
            {phase === "running" && (
              <section className="rounded-[12px] border border-line bg-bg1 p-4" role="status">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><i className="size-1.5 animate-pulse rounded-full bg-accent" />{u.running}</div>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-[12.5px]">{steps.map((s) => <li key={s.id} className="flex items-start gap-2 text-t1">{s.kind === "search" ? <Search size={13} className="mt-0.5 shrink-0 text-accent" /> : s.kind === "fetch" ? <FileText size={13} className="mt-0.5 shrink-0 text-c2" /> : s.kind === "analyse" ? <Sparkles size={13} className="mt-0.5 shrink-0 text-t2" /> : <Globe size={13} className="mt-0.5 shrink-0 text-t2" />}<span className="min-w-0 break-words" dir="auto">{s.kind === "search" ? `“${s.text}”` : s.kind === "fetch" ? host(s.text) : s.kind === "analyse" ? `…${Number(s.text) > 1 ? ` ×${s.text}` : ""}` : s.text}</span></li>)}</ul>
              </section>
            )}
            {!!tiles.length && (phase === "running" || phase === "done") && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tiles.map((t) => <div key={t.label} className="rounded-[10px] border border-line bg-bg1 p-2.5"><div className="text-[10.5px] font-semibold uppercase tracking-wide text-t2">{t.label}</div><div className="num mt-0.5 text-[17px] font-semibold text-t0">{t.value}</div>{t.sub && <div className="num text-[11px] text-t2" dir="auto">{t.sub}</div>}</div>)}</div>
            )}
            {text && (phase === "running" || phase === "done") && (
              <section className="rounded-[12px] border border-line bg-bg1 p-4 sm:p-5">
                {phase === "done" && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
                    <div role="tablist" className="flex flex-wrap gap-1">{all.map((t, i) => <button key={i} role="tab" aria-selected={part === i} onClick={() => setPart(i)} className={`h-8 rounded-full px-3 text-[12.5px] ${part === i ? "bg-accent text-[var(--accent-ink)] font-semibold" : "bg-bg2 text-t1 hover:text-t0"}`}>{t}</button>)}</div>
                    <div className="ms-auto flex flex-wrap gap-1.5">
                      <button onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Copy size={13} />{copied ? u.copied : u.copy}</button>
                      <button onClick={() => saveBlob(`${fileBase}.md`, "text/markdown", text)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />.md</button>
                      <button onClick={() => printBriefing(pdfHtml())} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Printer size={13} />{u.pdf}</button>
                      <button onClick={() => saveBlob(`${fileBase}.doc`, "application/msword", briefingHtml(text, { title: `${u.title}: ${name}`, rtl, foot: `${u.foot} ${saved?.model ?? ""} · ${saved?.at ?? ""}`, classification: u.classification }, true))} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><FileText size={13} />{u.word}</button>
                      <button onClick={() => setPhase("form")} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-accent hover:text-t0"><RefreshCw size={13} />{u.again}</button>
                    </div>
                  </div>)}
                {stale && <p role="status" className="mb-3 rounded-[8px] border border-warn/40 bg-warn/10 p-2 text-[12px]">{u.stale}</p>}
                <article dir={rtl ? "rtl" : "ltr"}><Markdown source={phase === "done" ? body : text} />{phase === "running" && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}</article>
                {saved?.truncated && <p className="mt-4 text-[12px] text-warn">{u.trunc}</p>}
                <p className="mt-5 border-t border-line pt-3 text-[11px] leading-relaxed text-t2">{u.foot}</p>
              </section>
            )}
          </div>
          <aside className="space-y-4">
            <section className="rounded-[12px] border border-line bg-bg1 p-3.5"><h3 className="label mb-2">{u.sources} ({cited.length ? `${cited.length} ${u.cited} · ${rest.length} ${u.other}` : sources.length})</h3>
              {!sources.length ? <p className="text-[12.5px] text-t2">—</p> : <ol className="scroll-thin max-h-[480px] space-y-2 overflow-y-auto text-[12.5px]">{[...cited, ...rest].map((s, i) => <li key={s.url} className="flex gap-2"><span className="num w-5 shrink-0 text-end text-t2">{i + 1}</span><a href={s.url} target="_blank" rel="noreferrer noopener" className="min-w-0 break-words text-t1 hover:text-accent"><span className="block truncate text-t0" title={s.title} dir="auto">{s.title}</span><span className="num text-[11px] text-t2">{host(s.url)}</span></a></li>)}</ol>}
            </section>
            {saved && <section className="rounded-[12px] border border-line bg-bg1 p-3.5"><h3 className="label mb-2">{u.usage}</h3><dl className="num grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]"><dt className="text-t2">{u.searches}</dt><dd className="text-end">{saved.usage.searches}</dd><dt className="text-t2">{u.pages}</dt><dd className="text-end">{saved.usage.fetches}</dd><dt className="text-t2">{u.tokens}</dt><dd className="text-end">{Math.round((saved.usage.input + saved.usage.cacheRead + saved.usage.cacheWrite) / 1000)}k / {Math.round(saved.usage.output / 1000)}k</dd><dt className="text-t2">{u.costL}</dt><dd className="text-end">{saved.usage.usd != null ? `$${saved.usage.usd.toFixed(2)}` : "n/a"}</dd></dl><p className="mt-2 text-[11px] text-t2">{saved.model} · {saved.at.slice(0, 16).replace("T", " ")} UTC{saved.cached ? " · cached" : ""}</p><p className="mt-1 text-[11px] text-t2">{u.pptx}</p></section>}
          </aside>
        </div>
      </div>
    </div>, document.body);
}
