"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, FileText, Globe, Printer, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/store";
import { Markdown } from "./Markdown";
import { VisualBrief } from "./VisualBrief";
import { AUDIENCES, LEADER_BUDGET, type Audience, BUDGET, COUNTERPARTS, DEPTHS, FOCUSES, MEETINGS, type Counterpart, type Depth, type Focus, type Meeting } from "@/lib/dossier/options";
import { briefingHtml, printBriefing, saveBlob } from "@/lib/dossier/export";
import { downloadPdf } from "@/lib/pdf";
import { CP_BUDGET } from "@/lib/dossier/counterpart";
import { DESK_BUDGET, DESK_HORIZONS, DESK_LENGTHS, DESK_LENSES, DESK_STYLES, DESK_TOPICS, PRESETS, type DeskHorizon, type DeskLength, type DeskLens, type DeskStyle } from "@/lib/dossier/desk";
import type { Country } from "@/lib/types";
import { safeHttp } from "@/lib/url";

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Tile = { label: string; value: string; sub?: string };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
type Saved = { options?: { counterpart: string; meeting: string; depth: string; lang: string; meetingDate?: string }; report: string; sources: Source[]; tiles: Tile[]; usage: Usage; at: string; model: string; truncated?: boolean; cached?: boolean };
type Step = { id: number; kind: "search" | "fetch" | "analyse" | "status"; text: string };
type Status = { enabled: boolean; model: string; remainingThisHour: number };
const safeDecode = (u: string) => { try { return decodeURI(u); } catch { return u; } };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

const T = {
  en: { title: "Detailed ministerial briefing", sub: "Strategic country briefing for a UAE Minister of State: executive brief, intelligence dossier and meeting talking points.",
    country: "Country", counterpart: "Counterpart", name: "Counterpart's name (optional)", namePh: "Leave blank to identify the current office-holder", meeting: "Meeting type", date: "Meeting date (optional)", depth: "Briefing depth", focus: "Focus areas", lang: "Language",
    notes: "Desk input (optional, strongly recommended)", notesHint: "The app holds no approved UAE positions, meeting minutes or consular data. Anything you paste here is used as given and cited as [Desk]; where it is missing, the briefing says DESK INPUT REQUIRED instead of guessing.",
    positions: "Approved UAE positions and guidance", previous: "Previous meetings, outcomes and commitments", objectives: "Objectives for this meeting",
    go: "Generate briefing", regen: "Regenerate", again: "New briefing", close: "Close", running: "Researching and writing…", facts: "UAE-side record collected", p1: "Executive brief", p2: "Intelligence dossier", p3: "Talking points", all: "Whole document",
    cost: "Each run reads the web and bills your Anthropic account: the cap per run is set by the depth, and a typical run costs", costTail: "(model tokens plus about 1 cent per web search; the actual cost is shown afterwards). Every run is hard-capped at $1.00: at the cap it stops and says the briefing is incomplete. Results are cached for 6 hours.", left: "new briefings left this hour",
    copy: "Copy", copied: "Copied", pdf: "PDF", print: "Print", pdfFail: "The PDF could not be built:", popup: "The browser blocked the print window. Use the PDF button to download a file instead.", word: "Word", ppt: "PowerPoint", pptx: "The deck has one slide per section; check layout before presenting.", deckFail: "The deck could not be built:", statusDoc: "Status of this document", confirmClose: "A briefing is still being written. Closing now stops it and discards the result, and the cost so far is still charged. Close anyway?", sources: "Sources", cited: "cited", other: "also found", usage: "Usage", searches: "Web searches", pages: "Pages read", tokens: "Tokens in / out", costL: "Estimated cost",
    classification: "DRAFT FOR MINISTERIAL REVIEW · AI-GENERATED FROM PUBLIC SOURCES AND THE APP'S DATASETS", foot: "AI-generated from public sources and the app's own datasets; every figure should be verified before use. Items marked DESK INPUT REQUIRED need approved UAE positions, internal records or mandates that this application does not hold. Not legal, sanctions-compliance, investment or travel advice, and not an intelligence assessment.",
    disabled: "Detailed briefings are switched off on this server.", errCred: "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`.", errCredits: "Your Anthropic credit balance is too low.", errGeneric: "The briefing failed:", trunc: "The briefing stopped early, at its length or cost limit, and may be incomplete. Choose a shorter length or fewer topics.", stale: "Written more than 6 hours ago. Regenerate before the meeting to pick up the latest developments.", est: { executive: "about $0.20 (estimate)", standard: "about $0.30 (measured)", comprehensive: "about $0.47 (earlier measure)" } },
  ar: { title: "موجز الوزير التفصيلي", sub: "موجز استراتيجي عن الدولة لوزير دولة إماراتي: موجز تنفيذي وملف استخباري ونقاط حديث للقاء.",
    country: "الدولة", counterpart: "الطرف المقابل", name: "اسم الطرف المقابل (اختياري)", namePh: "اتركه فارغًا لتحديد شاغل المنصب الحالي", meeting: "نوع اللقاء", date: "تاريخ اللقاء (اختياري)", depth: "عمق الموجز", focus: "مجالات التركيز", lang: "اللغة",
    notes: "مدخلات المكتب (اختيارية، ويوصى بها بشدة)", notesHint: "لا يملك التطبيق مواقف إماراتية معتمدة ولا محاضر اجتماعات ولا بيانات قنصلية. ما تلصقه هنا يُستخدم كما هو ويُستشهد به بوسم [Desk]؛ وإن غاب، يكتب الموجز «مطلوب مدخل من المكتب» بدل التخمين.",
    positions: "المواقف والتوجيهات الإماراتية المعتمدة", previous: "اللقاءات السابقة ونتائجها والالتزامات", objectives: "أهداف هذا اللقاء",
    go: "إنشاء الموجز", regen: "إعادة الإنشاء", again: "موجز جديد", close: "إغلاق", running: "جارٍ البحث والكتابة…", facts: "تم جمع السجل الإماراتي", p1: "الموجز التنفيذي", p2: "الملف الاستخباري", p3: "نقاط الحديث", all: "المستند كاملًا",
    cost: "كل تشغيل يقرأ الويب ويُحتسب على حساب Anthropic: سقف التشغيل يحدده العمق، وتبلغ تكلفة التشغيل المعتاد", costTail: "(رموز النموذج مع نحو سنت لكل بحث ويب؛ وتظهر التكلفة الفعلية بعد ذلك). كل تشغيل بحدّ أقصى 1.00 دولار: عند بلوغه يتوقف ويذكر أن الموجز غير مكتمل. النتائج مخزّنة 6 ساعات.", left: "موجزات جديدة متبقية هذه الساعة",
    copy: "نسخ", copied: "تم النسخ", pdf: "PDF", print: "طباعة", pdfFail: "تعذّر إنشاء ملف PDF:", popup: "منع المتصفح نافذة الطباعة. استخدم زر PDF لتنزيل ملف.", word: "Word", ppt: "PowerPoint", pptx: "العرض شريحة لكل قسم؛ راجع التنسيق قبل التقديم.", deckFail: "تعذّر إنشاء العرض:", statusDoc: "حالة هذا المستند", confirmClose: "ما زال الموجز قيد الكتابة. الإغلاق الآن يوقفه ويتجاهل النتيجة، وتبقى التكلفة المتكبدة محتسبة. هل تغلق على أي حال؟", sources: "المصادر", cited: "مستشهد بها", other: "عُثر عليها أيضًا", usage: "الاستخدام", searches: "عمليات بحث", pages: "صفحات مقروءة", tokens: "الرموز دخل / خرج", costL: "التكلفة التقديرية",
    classification: "مسودة للمراجعة الوزارية · مُولَّدة بالذكاء الاصطناعي من مصادر عامة وبيانات التطبيق", foot: "مُولَّد بالذكاء الاصطناعي من مصادر عامة وبيانات التطبيق؛ يجب التحقق من كل رقم قبل استخدامه. البنود الموسومة «مطلوب مدخل من المكتب» تحتاج إلى مواقف إماراتية معتمدة أو سجلات داخلية أو تفويضات لا يملكها التطبيق. ليس نصيحة قانونية أو امتثالًا للعقوبات أو استثمارية أو سفر، وليس تقييمًا استخباريًا.",
    disabled: "الموجزات التفصيلية متوقفة على هذا الخادم.", errCred: "بيانات اعتماد Anthropic مفقودة أو منتهية.", errCredits: "رصيدك في Anthropic منخفض جدًا.", errGeneric: "تعذّر إنشاء الموجز:", trunc: "توقف الموجز مبكرًا عند حدّ الطول أو التكلفة وقد يكون غير مكتمل. اختر طولًا أقصر أو مواضيع أقل.", stale: "كُتب قبل أكثر من 6 ساعات. أعد الإنشاء قبل اللقاء لإدراج آخر التطورات.", est: { executive: "نحو 0.2 دولار (تقدير)", standard: "نحو 0.30 دولار (مقيس)", comprehensive: "نحو 0.47 دولار (قياس سابق)" } },
} as const;
const D = {
  en: { title: "Desk brief", sub: "Political and economic desk brief: choose the topics, the length and the level of detail.", p1: "Desk summary", p2: "Analysis by topic", p3: "Annexes", go: "Generate desk brief",
    presets: "Start from", topics: "Topics", all: "All", none: "None", custom: "Extra subjects (optional)", customPh: "e.g. port concessions, a named company, a pending election", lens: "Lens", horizon: "Time horizon", length: "Length", style: "Detail and style", context: "Desk context (optional)", contextHint: "Paste anything the brief should take as given: approved positions, instructions, recent reporting from the embassy. It is cited as [Desk]; nothing is guessed where it is missing.",
    picked: "topics chosen", est: { short: "about $0.17 (measured)", standard: "about $0.30 (estimate)", detailed: "about $0.38 (estimate)", exhaustive: "about $0.45 to $0.55 (estimate)" }, intro: "A desk brief is analysis for a desk officer, not talking points: key judgments, an indicator dashboard, one section per topic you choose, and annexes (chronology, data tables, source assessment, gaps, watchlist). Each run reads the web and bills your Anthropic account." },
  ar: { title: "موجز المكتب", sub: "موجز لمكتب الشؤون السياسية والاقتصادية: اختر المواضيع والطول ومستوى التفصيل.", p1: "ملخص المكتب", p2: "التحليل حسب الموضوع", p3: "الملاحق", go: "إنشاء موجز المكتب",
    presets: "ابدأ من", topics: "المواضيع", all: "الكل", none: "لا شيء", custom: "مواضيع إضافية (اختياري)", customPh: "مثال: امتيازات الموانئ أو شركة محددة أو انتخابات قادمة", lens: "زاوية التركيز", horizon: "الأفق الزمني", length: "الطول", style: "التفصيل والأسلوب", context: "سياق المكتب (اختياري)", contextHint: "الصق ما يجب أن يعتبره الموجز معطًى: مواقف معتمدة أو توجيهات أو تقارير حديثة من السفارة. يُستشهد به بوسم [Desk]؛ ولا يُخمَّن شيء حيث يغيب.",
    picked: "مواضيع مختارة", est: { short: "نحو 0.17 دولار (مقيس)", standard: "نحو 0.30 دولار (تقدير)", detailed: "نحو 0.38 دولار (تقدير)", exhaustive: "نحو 0.45 إلى 0.55 دولار (تقدير)" }, intro: "موجز المكتب تحليل لضابط المكتب لا نقاط حديث: أحكام رئيسية ولوحة مؤشرات وقسم لكل موضوع تختاره وملاحق (التسلسل الزمني وجداول البيانات وتقييم المصادر والفجوات وقائمة المتابعة). كل تشغيل يقرأ الويب ويُحتسب على حساب Anthropic." },
} as const;
const COUNTERPART_AR: Record<string, string> = { "head-of-state": "رئيس الدولة", "head-of-government": "رئيس الوزراء / الحكومة", "foreign-minister": "وزير الخارجية", "economy-minister": "وزير الاقتصاد / الاستثمار / التجارة", "finance-minister": "وزير المالية", "energy-minister": "وزير الطاقة", "defence-security": "مسؤول الدفاع / الأمن الوطني", other: "مسؤول آخر" };
const MEETING_AR: Record<string, string> = { bilateral: "لقاء ثنائي", "state-visit": "زيارة دولة", summit: "قمة متعددة الأطراف (على الهامش)", courtesy: "زيارة مجاملة", "economic-mission": "بعثة اقتصادية" };
const DEPTH_AR: Record<string, string> = { executive: "تنفيذي (نحو 3 صفحات)", standard: "قياسي (نحو 10 صفحات)", comprehensive: "شامل (نحو 20 صفحة)" };
const FOCUS_AR: Record<string, string> = { comprehensive: "شامل", political: "سياسي", economic: "اقتصادي", investment: "استثمار", security: "أمن", multilateral: "متعدد الأطراف" };
const sel = "h-9 w-full rounded-[8px] border border-line bg-bg2 px-2.5 text-[13px] text-t0";
const lab = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-t2";

/** Full-screen workspace for the detailed ministerial briefing: options, live research progress, then three deliverables with exports. */
const C = {
  en: { title: "Counterpart profile", sub: "A profile of the person being met: who they are, what they want, how they negotiate and how to move them.", p1: "Profile and priorities", p2: "Handling the meeting", p3: "", go: "Generate counterpart profile", est: { executive: "about $0.19 (measured)", standard: "about $0.19 (measured)", comprehensive: "about $0.19 (measured)" }, intro: "A profile of the official the minister is about to meet: documented career, public record on the UAE, stated priorities, incentives, track record in negotiation, how to move them and what to avoid. Public role only, from documented sources; it says what it cannot establish. Each run reads the web and bills your Anthropic account." },
  ar: { title: "ملف الطرف المقابل", sub: "ملف عن الشخص الذي سيُلتقى به: من هو وماذا يريد وكيف يفاوض وكيف يُقنَع.", p1: "الملف والأولويات", p2: "إدارة اللقاء", p3: "", go: "إنشاء ملف الطرف المقابل", est: { executive: "نحو 0.19 دولار (مقيس)", standard: "نحو 0.19 دولار (مقيس)", comprehensive: "نحو 0.19 دولار (مقيس)" }, intro: "ملف عن المسؤول الذي سيلتقيه الوزير: مسيرته الموثقة وسجله العلني تجاه الإمارات وأولوياته المعلنة ودوافعه وسجله في التفاوض وكيف يُقنَع وما يجب تجنبه. الدور العام فقط ومن مصادر موثقة، ويذكر ما لا يمكن إثباته. كل تشغيل يقرأ الويب ويُحتسب على حساب Anthropic." },
} as const;
const AUD_AR: Record<string, string> = { minister: "وزير الدولة (موجز كامل)", leader: "قائد الدولة (موجز من صفحتين)" };
const LEADER = { en: { title: "Leader's brief", est: "about $0.11 (measured)", label: "Audience" }, ar: { title: "موجز القائد", est: "نحو 0.11 دولار (مقيس)", label: "الجمهور" } } as const;
export function DossierWorkspace({ c, onClose, mode = "minister" }: { c: Country; onClose: () => void; mode?: "minister" | "desk" | "counterpart" }) {
  const { lang: appLang } = useT(); const [lang, setLang] = useState<"en" | "ar">(appLang); const desk = mode === "desk"; const cp = mode === "counterpart"; const [audience, setAudience] = useState<Audience>("minister"); const leader = !desk && !cp && audience === "leader"; const u = (desk ? { ...T[lang], ...D[lang] } : cp ? { ...T[lang], ...C[lang] } : leader ? { ...T[lang], title: LEADER[lang].title, est: { executive: LEADER[lang].est, standard: LEADER[lang].est, comprehensive: LEADER[lang].est } } : T[lang]) as unknown as Record<string, string> & { est: Record<string, string> }; const rtl = lang === "ar";
  const storeKey = desk ? `gd-desk:${c.iso3}` : cp ? `gd-cp:${c.iso3}` : `gd-dossier:${c.iso3}`;
  const [topics, setTopics] = useState<string[]>(PRESETS[2].topics); const [custom, setCustom] = useState(""); const [dLength, setDLength] = useState<DeskLength>("standard"); const [dStyle, setDStyle] = useState<DeskStyle>("analysis"); const [dHorizon, setDHorizon] = useState<DeskHorizon>("12m"); const [dLens, setDLens] = useState<DeskLens>("joint"); const [context, setContext] = useState("");
  const [counterpart, setCounterpart] = useState<Counterpart>("foreign-minister"); const [cname, setCname] = useState(""); const [meeting, setMeeting] = useState<Meeting>("bilateral"); const [date, setDate] = useState(""); const [depth, setDepth] = useState<Depth>("standard"); const [focus, setFocus] = useState<Focus[]>(["comprehensive"]);
  const [notes, setNotes] = useState({ positions: "", previous: "", objectives: "" });
  const [phase, setPhase] = useState<"form" | "running" | "done" | "error">("form"); const [text, setText] = useState(""); const [steps, setSteps] = useState<Step[]>([]); const [sources, setSources] = useState<Source[]>([]); const [tiles, setTiles] = useState<Tile[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null); const [err, setErr] = useState<{ error: string; message?: string } | null>(null); const [status, setStatus] = useState<Status | null>(null); const [part, setPart] = useState(0); const [copied, setCopied] = useState(false); const [now, setNow] = useState(0); const [deckBusy, setDeckBusy] = useState(false); const [deckErr, setDeckErr] = useState(""); const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null); const stepId = useRef(0); const [mounted, setMounted] = useState(false); const phaseRef = useRef(phase); const closeRef = useRef(onClose);
  useEffect(() => { phaseRef.current = phase; closeRef.current = onClose; });
  /** Closing mid-run stops the model call and discards the result, but the money already spent is gone: ask first. */
  const requestClose = () => { if (phaseRef.current === "running" && !window.confirm(T[lang].confirmClose)) return; closeRef.current(); };
  const closeFn = useRef(requestClose); useEffect(() => { closeFn.current = requestClose; });

  useEffect(() => {
    const t0 = setTimeout(() => { setMounted(true); setNow(Date.now()); try { const s = localStorage.getItem(storeKey); if (s) { const v = JSON.parse(s) as Saved; setSaved(v); setText(v.report); setSources(v.sources); setTiles(v.tiles ?? []); setPhase("done"); } } catch { /* none saved */ } }, 0);
    fetch("/api/dossier/" + c.iso3).then((r) => r.json()).then(setStatus).catch(() => {});
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") closeFn.current(); }; document.addEventListener("keydown", esc); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { clearTimeout(t0); abort.current?.abort(); document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [c.iso3, storeKey]);

  const push = (kind: Step["kind"], t: string) => setSteps((s) => { const last = s[s.length - 1]; if (kind === "analyse" && last?.kind === "analyse") return [...s.slice(0, -1), { ...last, text: String((Number(last.text) || 1) + 1) }]; return [...s.slice(-40), { id: ++stepId.current, kind, text: kind === "analyse" ? "1" : t }]; });
  async function run(refresh: boolean) {
    abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("running"); setText(""); setSteps([]); setSources([]); setTiles([]); setErr(null); setSaved(null); setPart(0);
    try {
      const r = await fetch("/api/dossier/" + c.iso3, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(desk ? { kind: "desk", topics, custom, length: dLength, style: dStyle, horizon: dHorizon, lens: dLens, lang, context, refresh } : { kind: cp ? "counterpart" : "minister", audience, counterpart, counterpartName: cname, meeting, meetingDate: date, depth, focus, lang, notes, refresh }), signal: ac.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); setErr({ error: j.error ?? "upstream", message: j.message }); setPhase("error"); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ""; let ended = false;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let idx: number; while ((idx = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2); if (!line.startsWith("data:")) continue; const ev = JSON.parse(line.slice(5)) as Record<string, unknown> & { type: string };
          if (ev.type === "text") setText((x) => x + (ev.delta as string));
          else if (ev.type === "status") push("status", ev.text as string);
          else if (ev.type === "facts") { setTiles((ev.tiles as Tile[]) ?? []); push("status", `${u.facts} (${ev.count})`); }
          else if (ev.type === "tool") push(ev.name as Step["kind"], ev.detail as string);
          else if (ev.type === "source") { const n = ev as unknown as Source; setSources((s) => (s.some((x) => x.url === n.url) ? s.map((x) => (x.url === n.url ? { ...x, kind: n.kind } : x)) : [...s, n])); }
          else if (ev.type === "error") { ended = true; setErr({ error: ev.error as string, message: ev.message as string }); setPhase("error"); }
          else if (ev.type === "done") { ended = true; const d = ev as unknown as Saved; setText(d.report); setSources(d.sources); setTiles(d.tiles ?? []); setSaved(d); setPhase("done"); setNow(Date.now()); try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch { /* storage full */ } fetch("/api/dossier/" + c.iso3).then((x) => x.json()).then(setStatus).catch(() => {}); }
        }
      }
      if (!ended) { setErr({ error: "upstream", message: "The connection ended before the briefing was finished. The partial text above is incomplete; run it again." }); setPhase("error"); }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr({ error: "upstream", message: (e as Error).message }); setPhase("error"); } }
  }
  const parts = useMemo(() => { const m = [...text.matchAll(/^# (?=\d\.\s)(.*)$/gm)]; const pre = m.length ? text.slice(0, m[0].index) : text; const ps = m.map((x, i) => text.slice(x.index, i + 1 < m.length ? m[i + 1].index : undefined)); return { pre, ps }; }, [text]);
  const all: string[] = ([u.p1, u.p2, u.p3] as string[]).slice(0, Math.max(1, parts.ps.length)).concat(parts.ps.length > 1 ? [u.all] : []); const last = all.length - 1; const wholeTab = parts.ps.length > 1 && part === last; const pi = Math.min(part, Math.max(0, parts.ps.length - 1));
  const visual = phase === "done" && part === all.length; const body = !parts.ps.length || wholeTab ? text : (pi === 0 ? parts.pre : "") + parts.ps[pi];
  const cited = phase === "done" ? sources.filter((s) => text.includes(s.url) || text.includes(safeDecode(s.url))) : []; const rest = sources.filter((s) => !cited.includes(s));
  const name = rtl && c.nameAr ? c.nameAr : c.name; const fileBase = desk ? `${c.iso3}-desk-brief` : cp ? `${c.iso3}-counterpart-profile` : leader ? `${c.iso3}-leaders-brief` : `${c.iso3}-ministerial-briefing`;
  const pdfHtml = () => briefingHtml(text, { title: `${u.title}: ${name}`, rtl, foot: `${u.foot} ${saved?.model ?? ""} · ${saved?.at ?? ""}`, classification: u.classification });
  const makePdf = async () => {
    setPdfBusy("0%"); setDeckErr("");
    try { await downloadPdf(pdfHtml(), { filename: `${fileBase}.pdf`, onProgress: (d, t) => setPdfBusy(`${Math.round((d / t) * 100)}%`) }); }
    catch (e) { setDeckErr(`${u.pdfFail} ${(e as Error).message}`); } finally { setPdfBusy(null); }
  };
  const makeDeck = async () => {
    setDeckBusy(true); setDeckErr("");
    try { const { buildDeck } = await import("@/lib/dossier/deck"); const blob = await buildDeck(text, { labels: { sources: u.sources, status: u.statusDoc }, title: `${u.title}: ${name}`, subtitle: `${name} · ${(saved?.at ?? "").slice(0, 10)}`, rtl, classification: u.classification, foot: `${u.foot} ${saved?.model ?? ""} · ${saved?.at ?? ""}`, sources: (cited.length ? cited : sources).slice(0, 42).map((x) => ({ url: x.url, title: x.title })) });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${fileBase}.pptx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { setDeckErr(`${u.deckFail} ${(e as Error).message}`); } finally { setDeckBusy(false); }
  };
  const toggleFocus = (f: Focus) => setFocus((cur) => { if (f === "comprehensive") return ["comprehensive"]; const n = cur.filter((x) => x !== "comprehensive"); const next = n.includes(f) ? n.filter((x) => x !== f) : [...n, f]; return next.length ? next : ["comprehensive"]; });
  const errText = !err ? "" : err.error === "no_credits" ? u.errCredits : err.error === "no_credentials" ? u.errCred : err.error === "disabled" ? u.disabled : err.message ? err.message : `${u.errGeneric} ${err.error}`;
  const stale = phase === "done" && saved && now > 0 && now - Date.parse(saved.at) > 6 * 3600_000;
  const L = (en: string, ar: Record<string, string>, k: string) => (rtl ? ar[k] ?? en : en);
  if (!mounted) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={u.title} dir={rtl ? "rtl" : "ltr"} className="fixed inset-0 z-[100] flex flex-col bg-bg0 text-t0">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-bg1 px-4 py-3">
        <div className="min-w-0 flex-1"><div className="display truncate text-[17px] font-semibold">{c.flag} {name} · {u.title}</div><p className="hidden truncate text-[12px] text-t2 sm:block">{u.sub}</p></div>
        <button onClick={requestClose} aria-label={u.close} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={16} /></button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {(phase === "form" || phase === "error") && desk && (
              <section className="rounded-[12px] border border-line bg-bg1 p-4">
                {status && !status.enabled ? <p className="text-[13px] text-t1">{u.disabled}</p> : (<>
                  <p className="text-[12.5px] leading-relaxed text-t1">{u.intro} {rtl ? "ويُخزَّن الناتج 6 ساعات." : "Results are cached for 6 hours."}</p>
                  <div className="mt-3"><span className={lab}>{u.presets}</span><div className="flex flex-wrap gap-1.5">{PRESETS.map((p) => <button key={p.id} type="button" onClick={() => setTopics(p.topics)} className="h-8 rounded-full border border-line bg-bg2 px-3 text-[12px] text-t1 hover:text-t0">{rtl ? p.ar : p.en}</button>)}</div></div>
                  <div className="mt-3 space-y-3"><div className="flex items-center justify-between"><span className={lab}>{u.topics} · {topics.length} {u.picked}</span></div>
                    {DESK_TOPICS.map((g) => { const keys = g.items.map((i) => i.key); const allOn = keys.every((k) => topics.includes(k)); return (
                      <fieldset key={g.id} className="rounded-[10px] border border-line bg-bg2/50 p-3"><legend className="px-1 text-[12px] font-semibold text-t0">{rtl ? g.ar : g.en}</legend>
                        <div className="mb-1.5 flex gap-2 text-[11.5px]"><button type="button" onClick={() => setTopics((cur) => [...new Set([...cur, ...keys])])} className="text-accent hover:underline">{u.all}</button><button type="button" onClick={() => setTopics((cur) => cur.filter((k) => !keys.includes(k)))} className="text-t2 hover:underline">{u.none}</button>{allOn ? null : null}</div>
                        <div className="grid gap-1.5 sm:grid-cols-2">{g.items.map((i) => <label key={i.key} className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-snug text-t1"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" checked={topics.includes(i.key)} onChange={() => setTopics((cur) => (cur.includes(i.key) ? cur.filter((k) => k !== i.key) : [...cur, i.key]))} /><span>{rtl ? i.ar : i.en}</span></label>)}</div>
                      </fieldset>); })}
                  </div>
                  <label className="mt-3 block"><span className={lab}>{u.custom}</span><input className={sel} value={custom} maxLength={600} placeholder={u.customPh} onChange={(e) => setCustom(e.target.value)} /></label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label><span className={lab}>{u.lens}</span><select className={sel} value={dLens} onChange={(e) => setDLens(e.target.value as DeskLens)}>{DESK_LENSES.map(([k, en, ar]) => <option key={k} value={k}>{rtl ? ar : en}</option>)}</select></label>
                    <label><span className={lab}>{u.horizon}</span><select className={sel} value={dHorizon} onChange={(e) => setDHorizon(e.target.value as DeskHorizon)}>{DESK_HORIZONS.map(([k, en, ar]) => <option key={k} value={k}>{rtl ? ar : en}</option>)}</select></label>
                    <label><span className={lab}>{u.length}</span><select className={sel} value={dLength} onChange={(e) => setDLength(e.target.value as DeskLength)}>{DESK_LENGTHS.map(([k, en, ar]) => <option key={k} value={k}>{rtl ? ar : en}</option>)}</select></label>
                    <label><span className={lab}>{u.style}</span><select className={sel} value={dStyle} onChange={(e) => setDStyle(e.target.value as DeskStyle)}>{DESK_STYLES.map(([k, en, ar]) => <option key={k} value={k}>{rtl ? ar : en}</option>)}</select></label>
                    <label><span className={lab}>{u.lang}</span><select className={sel} value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}><option value="en">English</option><option value="ar">العربية</option></select></label>
                  </div>
                  <details className="mt-3 rounded-[10px] border border-line bg-bg2/60 p-3"><summary className="cursor-pointer text-[13px] font-semibold">{u.context}</summary>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-t1">{u.contextHint}</p>
                    <textarea rows={4} maxLength={4000} value={context} onChange={(e) => setContext(e.target.value)} className="mt-2 w-full rounded-[8px] border border-line bg-bg1 p-2 text-[13px] text-t0" />
                  </details>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => run(false)} disabled={!topics.length && !custom.trim()} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)] disabled:opacity-50"><Sparkles size={15} />{u.go}</button>
                    {saved && <button onClick={() => setPhase("done")} className="h-10 rounded-[10px] bg-bg3 px-4 text-[13px] text-t1 hover:text-t0">{u.p1} ←</button>}
                    {status && <span className="num text-[11px] text-t2">{status.model} · {status.remainingThisHour} {u.left}</span>}
                  </div>
                  <p className="mt-3 rounded-[8px] border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-t2">{rtl ? "التكلفة التقديرية لهذا الطول:" : "Estimated cost at this length:"} {u.est[dLength]} {u.costTail} <span className="num">({DESK_BUDGET[dLength].searches} / {DESK_BUDGET[dLength].fetches})</span></p>
                  {phase === "error" && <div role="alert" className="mt-3 rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px]">{errText}</div>}
                </>)}
              </section>
            )}
            {(phase === "form" || phase === "error") && !desk && (
              <section className="rounded-[12px] border border-line bg-bg1 p-4">
                {status && !status.enabled ? <p className="text-[13px] text-t1">{u.disabled}</p> : (<>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!cp && <label><span className={lab}>{LEADER[lang].label}</span><select className={sel} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>{AUDIENCES.map(([k, en]) => <option key={k} value={k}>{lang === "ar" ? AUD_AR[k] : en}</option>)}</select></label>}
                    <label><span className={lab}>{u.counterpart}</span><select className={sel} value={counterpart} onChange={(e) => setCounterpart(e.target.value as Counterpart)}>{COUNTERPARTS.map(([k, en]) => <option key={k} value={k}>{L(en, COUNTERPART_AR, k)}</option>)}</select></label>
                    <label><span className={lab}>{u.name}</span><input className={sel} value={cname} maxLength={120} placeholder={u.namePh} onChange={(e) => setCname(e.target.value)} /></label>
                    <label><span className={lab}>{u.meeting}</span><select className={sel} value={meeting} onChange={(e) => setMeeting(e.target.value as Meeting)}>{MEETINGS.map(([k, en]) => <option key={k} value={k}>{L(en, MEETING_AR, k)}</option>)}</select></label>
                    <label><span className={lab}>{u.date}</span><input type="date" className={sel} value={date} onChange={(e) => setDate(e.target.value)} /></label>
                    {!cp && !leader && <label><span className={lab}>{u.depth}</span><select className={sel} value={depth} onChange={(e) => setDepth(e.target.value as Depth)}>{DEPTHS.map(([k, en]) => <option key={k} value={k}>{L(en, DEPTH_AR, k)}</option>)}</select></label>}
                    <label><span className={lab}>{u.lang}</span><select className={sel} value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}><option value="en">English</option><option value="ar">العربية</option></select></label>
                  </div>
                  {!cp && !leader && <div className="mt-3"><span className={lab}>{u.focus}</span><div className="flex flex-wrap gap-1.5">{FOCUSES.map(([k, en]) => <button key={k} type="button" aria-pressed={focus.includes(k)} onClick={() => toggleFocus(k)} className={`h-8 rounded-full border px-3 text-[12px] ${focus.includes(k) ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:text-t0"}`}>{L(en, FOCUS_AR, k)}</button>)}</div></div>}
                  <details className="mt-3 rounded-[10px] border border-line bg-bg2/60 p-3" open><summary className="cursor-pointer text-[13px] font-semibold">{u.notes}</summary>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-t1">{u.notesHint}</p>
                    {(["positions", "previous", "objectives"] as const).map((k) => <label key={k} className="mt-2 block"><span className={lab}>{u[k]}</span><textarea rows={3} maxLength={k === "objectives" ? 2000 : 4000} value={notes[k]} onChange={(e) => setNotes((n) => ({ ...n, [k]: e.target.value }))} className="w-full rounded-[8px] border border-line bg-bg1 p-2 text-[13px] text-t0" /></label>)}
                  </details>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => run(false)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><Sparkles size={15} />{u.go}</button>
                    {saved && <button onClick={() => setPhase("done")} className="h-10 rounded-[10px] bg-bg3 px-4 text-[13px] text-t1 hover:text-t0">{u.p1} ←</button>}
                    {status && <span className="num text-[11px] text-t2">{status.model} · {status.remainingThisHour} {u.left}</span>}
                  </div>
                  <p className="mt-3 rounded-[8px] border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-t2">{u.cost} {u.est[depth]} {u.costTail} <span className="num">({(cp ? CP_BUDGET : leader ? LEADER_BUDGET : BUDGET[depth]).searches} / {(cp ? CP_BUDGET : leader ? LEADER_BUDGET : BUDGET[depth]).fetches})</span></p>
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
                    <div role="tablist" className="flex flex-wrap gap-1">{all.map((t, i) => <button key={i} role="tab" aria-selected={part === i} onClick={() => setPart(i)} className={`h-8 rounded-full px-3 text-[12.5px] ${part === i ? "bg-accent text-[var(--accent-ink)] font-semibold" : "bg-bg2 text-t1 hover:text-t0"}`}>{t}</button>)}<button role="tab" aria-selected={visual} onClick={() => setPart(all.length)} className={`h-8 rounded-full border px-3 text-[12.5px] ${visual ? "border-accent bg-accent text-[var(--accent-ink)] font-semibold" : "border-accent/50 bg-bg2 text-accent hover:text-t0"}`}>🎨 {lang === "ar" ? "مصوّر" : "Illustrated"}</button></div>
                    <div className="ms-auto flex flex-wrap gap-1.5">
                      <button onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Copy size={13} />{copied ? u.copied : u.copy}</button>
                      <button onClick={() => saveBlob(`${fileBase}.md`, "text/markdown", text)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />.md</button>
                      <button onClick={makePdf} disabled={!!pdfBusy} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0 disabled:opacity-60"><Download size={13} />{pdfBusy ? `${u.pdf} ${pdfBusy}` : `${u.pdf}`}</button>
                      <button onClick={() => { if (!printBriefing(pdfHtml())) setDeckErr(u.popup); }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Printer size={13} />{u.print}</button>
                      <button onClick={() => saveBlob(`${fileBase}.doc`, "application/msword", briefingHtml(text, { title: `${u.title}: ${name}`, rtl, foot: `${u.foot} ${saved?.model ?? ""} · ${saved?.at ?? ""}`, classification: u.classification }, true))} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><FileText size={13} />{u.word}</button>
                      <button onClick={makeDeck} disabled={deckBusy} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0 disabled:opacity-50"><FileText size={13} />{deckBusy ? "…" : u.ppt}</button>
                      <button onClick={() => setPhase("form")} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-accent hover:text-t0"><RefreshCw size={13} />{u.again}</button>
                    </div>
                  </div>)}
                {phase === "done" && saved?.options && desk && <p className="mb-2 text-[11.5px] text-t2">{String((saved.options as Record<string, unknown>).lens)} · {String((saved.options as Record<string, unknown>).horizon)} · {String((saved.options as Record<string, unknown>).length)} · {String((saved.options as Record<string, unknown> & { topics?: string[] }).topics?.length ?? 0)} {u.picked}</p>}
                {phase === "done" && saved?.options && !desk && <p className="mb-2 text-[11.5px] text-t2">{(COUNTERPARTS.find(([k]) => k === saved.options!.counterpart)?.[1] ?? saved.options.counterpart)} · {(MEETINGS.find(([k]) => k === saved.options!.meeting)?.[1] ?? saved.options.meeting)} · {saved.options.depth}{saved.options.meetingDate ? ` · ${saved.options.meetingDate}` : ""} · {saved.options.lang.toUpperCase()}</p>}
                {deckErr && <p role="alert" className="mb-3 rounded-[8px] border border-down/40 bg-down/10 p-2 text-[12px]">{deckErr}</p>}
                {stale && <p role="status" className="mb-3 rounded-[8px] border border-warn/40 bg-warn/10 p-2 text-[12px]">{u.stale}</p>}
                <article dir={rtl ? "rtl" : "ltr"}>{visual ? <VisualBrief iso3={c.iso3} name={name} markdown={text} /> : <Markdown source={phase === "done" ? body : text} />}{phase === "running" && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}</article>
                {saved?.truncated && <p className="mt-4 text-[12px] text-warn">{u.trunc}</p>}
                <p className="mt-5 border-t border-line pt-3 text-[11px] leading-relaxed text-t2">{u.foot}</p>
              </section>
            )}
          </div>
          <aside className="min-w-0 space-y-4">
            <section className="rounded-[12px] border border-line bg-bg1 p-3.5"><h3 className="label mb-2">{u.sources} ({cited.length ? `${cited.length} ${u.cited} · ${rest.length} ${u.other}` : sources.length})</h3>
              {!sources.length ? <p className="text-[12.5px] text-t2">—</p> : <ol className="scroll-thin max-h-[480px] space-y-2 overflow-y-auto text-[12.5px]">{[...cited, ...rest].map((s, i) => <li key={s.url} className="flex gap-2"><span className="num w-5 shrink-0 text-end text-t2">{i + 1}</span><a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" className="min-w-0 break-words text-t1 hover:text-accent"><span className="block truncate text-t0" title={s.title} dir="auto">{s.title}</span><span className="num text-[11px] text-t2">{host(s.url)}</span></a></li>)}</ol>}
            </section>
            {saved && <section className="rounded-[12px] border border-line bg-bg1 p-3.5"><h3 className="label mb-2">{u.usage}</h3><dl className="num grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]"><dt className="text-t2">{u.searches}</dt><dd className="text-end">{saved.usage.searches}</dd><dt className="text-t2">{u.pages}</dt><dd className="text-end">{saved.usage.fetches}</dd><dt className="text-t2">{u.tokens}</dt><dd className="text-end">{Math.round((saved.usage.input + saved.usage.cacheRead + saved.usage.cacheWrite) / 1000)}k / {Math.round(saved.usage.output / 1000)}k</dd><dt className="text-t2">{u.costL}</dt><dd className="text-end">{saved.usage.usd != null ? `$${saved.usage.usd.toFixed(2)}` : "n/a"}</dd></dl><p className="mt-2 text-[11px] text-t2">{saved.model} · {saved.at.slice(0, 16).replace("T", " ")} UTC{saved.cached ? " · cached" : ""}</p><p className="mt-1 text-[11px] text-t2">{u.pptx}</p></section>}
          </aside>
        </div>
      </div>
    </div>, document.body);
}
