"use client";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileText, Printer } from "lucide-react";
import { listSaved, type SavedItem } from "@/lib/falcon/library";
import type { CaseData } from "@/lib/case/load";
import { BLOCK_LIST, KIND_AR, KIND_EN, PRODUCTS, TEMPLATES, TEMPLATE_BY, annexBlocks, buildReport, classification, costToComplete, type Ctx, type Lang as RLang, type ProductId, type State, type TemplateId } from "@/lib/case/report";
import type { SavedProduct } from "@/lib/case/saved";
import { briefingHtml, printBriefing, saveBlob } from "@/lib/dossier/export";
import { downloadPdf } from "@/lib/pdf";
import { useNow } from "@/lib/use-now";
import { COST_KEY, type CostEntry } from "../deep/hooks";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Markdown } from "../Markdown";
import { Tbl, usd } from "../machiavelli/parts";
import { bt, useTr } from "./bits";

const STATE_C: Record<State, string> = { written: "var(--ok)", partial: "var(--warn)", missing: "var(--t2)" };
/** Every other finished product on this country in this browser, read back live. */
function useOthers(iso: string): SavedItem[] { const [s, set] = useState<SavedItem[]>([]); useEffect(() => { const read = () => set(listSaved().filter((x) => x.iso3 === iso && x.kind !== "case-council" && x.kind !== "architect")); const t0 = setTimeout(read, 0); window.addEventListener("storage", read); window.addEventListener("focus", read); return () => { clearTimeout(t0); window.removeEventListener("storage", read); window.removeEventListener("focus", read); }; }, [iso]); return s; }
function useSpent(iso: string): { usd: number; runs: number } { const [v, set] = useState({ usd: 0, runs: 0 }); useEffect(() => { const read = () => { try { const l = JSON.parse(localStorage.getItem(COST_KEY) ?? "[]") as CostEntry[]; const mine = l.filter((e) => !e.cached && e.scope.includes(iso)); set({ usd: mine.reduce((a, e) => a + e.usd, 0), runs: mine.length }); } catch { set({ usd: 0, runs: 0 }); } }; const t0 = setTimeout(read, 0); window.addEventListener("gd-deep-cost", read); window.addEventListener("storage", read); return () => { clearTimeout(t0); window.removeEventListener("gd-deep-cost", read); window.removeEventListener("storage", read); }; }, [iso]); return v; }

/** Reports: pick what the report is for, see which parts are written and which are missing (with the cost of writing them), preview it in English or Arabic, and print, save as PDF or Word, or copy. Nothing runs here: a report is assembled from what has already been written. */
export function Reports({ L, d, iso, council, arch, preset, onGo }: { L: Lang; d: CaseData; iso: string; council: SavedProduct | null; arch: SavedProduct | null; preset: { id: TemplateId; n: number }; onGo: (tab: ProductId) => void }) {
  const t = useTr(L); const now = useNow(60_000); const others = useOthers(iso); const spent = useSpent(iso);
  const [tpl, setTpl] = useState<TemplateId>(preset.id); const [lang, setLang] = useState<RLang>(L === "ar" ? "ar" : "en"); const [pick, setPick] = useState<Set<string> | null>(null); const [forWho, setForWho] = useState(""); const [rev, setRev] = useState(""); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState("");
  useEffect(() => { const t0 = setTimeout(() => { setTpl(preset.id); setPick(null); }, 0); return () => clearTimeout(t0); }, [preset]);
  const T = TEMPLATE_BY.get(tpl)!; const ctx: Ctx = useMemo(() => ({ d, council: council?.report ?? null, arch: arch?.report ?? null, others, lang, today: now || 0 }), [d, council, arch, others, lang, now]);
  const base = useMemo(() => (T.annexes ? [...T.blocks.slice(0, -1), ...others.map((o) => `annex:${o.key}`), T.blocks[T.blocks.length - 1]] : T.blocks), [T, others]);
  const ordered = useMemo(() => { const all = [...BLOCK_LIST.map((b) => b.id), ...others.map((o) => `annex:${o.key}`)]; const set = new Set(pick ?? base); return all.filter((id) => set.has(id)); }, [pick, base, others]);
  const catalog = useMemo(() => [...BLOCK_LIST, ...annexBlocks(others)].map((b) => ({ b, o: b.build(ctx) })), [ctx, others]);
  const title = L === "ar" || lang === "ar" ? T.ar : T.en; const rep = useMemo(() => buildReport(ordered, ctx, { title: lang === "ar" ? T.ar : T.en, preparedFor: forWho, reviewer: rev }), [ordered, ctx, T, lang, forWho, rev]);
  const toggle = (id: string) => setPick((p) => { const n = new Set(p ?? base); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const miss = rep.missing; const fname = `${d.iso3}-${tpl}-${lang}`;
  const html = (word = false) => briefingHtml(rep.md, { title: `${rep.title}: ${lang === "ar" && d.nameAr ? d.nameAr : d.name}`, rtl: lang === "ar", foot: `Geo Desk · ${d.asOf.slice(0, 10)}`, classification: classification(lang) }, word);
  const pdf = async () => { setBusy("0%"); try { await downloadPdf(html(), { filename: `${fname}.pdf`, onProgress: (a, b) => setBusy(`${Math.round((a / b) * 100)}%`) }); } finally { setBusy(""); } };
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-bg3 px-3 text-[12.5px] text-t1 hover:text-t0 disabled:opacity-50";
  return (
    <div className="space-y-4">
      <Block title={t("Reports", "التقارير")} hint={t("Choose what the report is for. It is assembled from what is already written in this Case File and the other modules, so nothing is paid for twice. A part that is not written yet is shown as missing with what it would cost; nothing runs until you click it.", "اختر غرض التقرير. يُجمَّع مما كُتب بالفعل في ملف الحالة والوحدات الأخرى، فلا يُدفع شيء مرتين. والجزء غير المكتوب يظهر ناقصًا مع كلفته؛ ولا يعمل شيء إلا بنقرتك.")}>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label={t("Report type", "نوع التقرير")}>{TEMPLATES.map((x) => <button key={x.id} type="button" role="radio" aria-checked={tpl === x.id} onClick={() => { setTpl(x.id); setPick(null); }} className={`rounded-[12px] border p-3 text-start ${tpl === x.id ? "border-accent bg-accent/10" : "border-line bg-bg2 hover:border-line2"}`}><span className="flex items-center gap-1.5 text-[13px] font-semibold text-t0"><FileText size={14} />{L === "ar" ? x.ar : x.en}</span><span className="mt-1 block text-[11.5px] leading-snug text-t1">{bt(L, x.blurb)}</span><span className="numt mt-1 block text-[10.5px] text-t2">{bt(L, x.pages)}</span></button>)}</div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div><span className="label mb-1 block">{t("Report language", "لغة التقرير")}</span><div className="flex gap-1" role="group">{(["en", "ar"] as const).map((x) => <button key={x} type="button" aria-pressed={lang === x} onClick={() => setLang(x)} className={`h-9 rounded-full px-4 text-[12.5px] ${lang === x ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{x === "en" ? "English" : "العربية"}</button>)}</div></div>
          <label className="min-w-40 flex-1"><span className="label mb-1 block">{t("Prepared for (optional)", "أُعدّ لـ (اختياري)")}</span><input value={forWho} maxLength={80} onChange={(e) => setForWho(e.target.value)} className="h-9 w-full rounded-[8px] border border-line bg-bg2 px-2.5 text-[13px] text-t0" /></label>
          <label className="min-w-40 flex-1"><span className="label mb-1 block">{t("Reviewed by (named person)", "راجعه (شخص مسمّى)")}</span><input value={rev} maxLength={80} onChange={(e) => setRev(e.target.value)} className="h-9 w-full rounded-[8px] border border-line bg-bg2 px-2.5 text-[13px] text-t0" /></label></div>
      </Block>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Block title={t("Parts of this report", "أجزاء هذا التقرير")} hint={t("Tick or untick any part. Green is written, amber is partly written, grey is missing.", "حدّد أو ألغِ أي جزء. الأخضر مكتوب والكهرماني جزئي والرمادي ناقص.")}>
          <ul className="space-y-1">{catalog.map(({ b, o }) => { const on = ordered.includes(b.id); return <li key={b.id}><label className={`flex cursor-pointer items-start gap-2 rounded-[8px] p-1.5 text-[12px] ${on ? "bg-bg2" : ""}`}><input type="checkbox" checked={on} onChange={() => toggle(b.id)} className="mt-0.5" /><span className="min-w-0 flex-1 leading-snug text-t0">{L === "ar" ? b.ar : b.en}</span><Pill c={STATE_C[o.state]}>{o.state === "written" ? t("written", "مكتوب") : o.state === "partial" ? t("partial", "جزئي") : t("missing", "ناقص")}</Pill></label></li>; })}</ul>
          {miss.length > 0 && <div className="mt-3 rounded-[10px] border border-warn/40 bg-warn/10 p-2.5 text-[12px] leading-snug text-t0"><b>{t("This report has gaps.", "في هذا التقرير فجوات.")}</b> {t(`Filling them costs about US$${costToComplete(miss).toFixed(2)}, once, and each starts only when you click it:`, `تعبئتها تكلف نحو ${costToComplete(miss).toFixed(2)} دولار مرة واحدة، ولا تبدأ إلا بنقرتك:`)}<div className="mt-2 flex flex-wrap gap-2">{miss.map((m) => <button key={m} type="button" onClick={() => onGo(m)} className="h-8 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0">{L === "ar" ? PRODUCTS[m].ar : PRODUCTS[m].en} · ${PRODUCTS[m].usd.toFixed(2)}</button>)}</div></div>}</Block>
        <section aria-label={t("Preview", "معاينة")} className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2"><span className="label">{t("Preview", "معاينة")}</span><span className="numt text-[11px] text-t2">{rep.words.toLocaleString("en-US")} {t("words", "كلمة")} · {rep.parts.length} {t("parts", "أجزاء")}</span>
            <span className="ms-auto flex flex-wrap gap-1.5"><button type="button" className={btn} onClick={() => printBriefing(html())}><Printer size={14} />{t("Print", "طباعة")}</button><button type="button" className={btn} disabled={!!busy} onClick={pdf}><Download size={14} />{busy ? `PDF ${busy}` : "PDF"}</button><button type="button" className={btn} onClick={() => saveBlob(`${fname}.doc`, "application/msword", html(true))}><Download size={14} />Word</button><button type="button" className={btn} onClick={() => saveBlob(`${fname}.md`, "text/markdown", rep.md)}><Download size={14} />.md</button><button type="button" className={btn} onClick={async () => { try { await navigator.clipboard.writeText(rep.md); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }}><Copy size={14} />{copied ? "✓" : t("Copy", "نسخ")}</button></span></div>
          <article dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-[14px] border border-line bg-bg1 p-5 sm:p-7" aria-label={title}><Markdown source={rep.md} /></article>
          {lang !== L && <p className="text-[11px] text-t2">{t("The report language differs from the page language: the preview follows the report language.", "لغة التقرير تختلف عن لغة الصفحة: تتبع المعاينة لغة التقرير.")}</p>}
        </section>
      </div>
      <Products L={L} iso={iso} council={council} arch={arch} others={others} spent={spent} onGo={onGo} />
    </div>
  );
}

/** What is on file for this country, what it cost, what overlaps what, and which one to run. Reads only; it never starts anything. */
function Products({ L, iso, council, arch, others, spent, onGo }: { L: Lang; iso: string; council: SavedProduct | null; arch: SavedProduct | null; others: SavedItem[]; spent: { usd: number; runs: number }; onGo: (tab: ProductId) => void }) {
  const t = useTr(L); void iso;
  const row = (id: ProductId, s: SavedProduct | null) => [<b key="n" className="text-t0">{L === "ar" ? PRODUCTS[id].ar : PRODUCTS[id].en}</b>, s ? <Pill key="s" c="var(--ok)">{t("on file", "محفوظ")} {s.at.slice(0, 10)}</Pill> : <Pill key="s" c="var(--t2)">{t("not run", "لم يُشغَّل")}</Pill>, s?.lang ? (s.lang === "ar" ? "العربية" : "English") : "—", s?.usd != null && !s.cached ? usd(s.usd) : s ? "—" : `≈ ${usd(PRODUCTS[id].usd)}`, <button key="b" type="button" onClick={() => onGo(id)} className="h-8 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0">{s ? t("Open", "افتح") : t("Run", "شغّل")}</button>];
  const byKind = (k: string) => others.find((o) => o.kind === k);
  const councils: [string, string, string, string, SavedItem | undefined][] = [
    [t("Strategic Council (Case File)", "المجلس الاستراتيجي (ملف الحالة)"), t("20 specialist seats in 8 agents. The decision-ready judgment, options, dissent and action plan for a minister. The recommended council for this file.", "20 مقعدًا متخصصًا في 8 وكلاء. الحكم والخيارات والخلاف وخطة العمل الجاهزة للقرار للوزير. المجلس الموصى به لهذا الملف."), t("$0.78 (measured)", "0.78 دولار (قياس)"), "", undefined],
    [t("Falcon Council", "مجلس الصقر"), t("10 agents on any country or scope (region, sector): geopolitics, economy, energy, technology, UAE interest, foresight, red team. Use for scope-level questions.", "10 وكلاء لأي دولة أو نطاق (إقليم، قطاع): الجيوسياسة والاقتصاد والطاقة والتقنية والمصلحة الإماراتية والاستشراف والفريق الأحمر. للأسئلة على مستوى النطاق."), t("cap $1.00", "السقف 1.00 دولار"), "", byKind("council")],
    [t("Strategy Council (Machiavellian)", "مجلس الاستراتيجية (الميكيافيلي)"), t("19 seats on the influence strategy for one country, with the independent challenger and the verifier. Use for the influence-instrument question.", "19 مقعدًا حول استراتيجية النفوذ لدولة واحدة مع المنافس المستقل والمتحقق. لسؤال أدوات النفوذ."), t("cap $1.00", "السقف 1.00 دولار"), "", byKind("scouncil")],
    [t("Deep Intelligence team", "فريق الاستخبارات المعمّقة"), t("The analyst roles the routing rule selects, on the economic and research evidence, then a chair. Use for the consolidated evidence file.", "الأدوار التي تختارها قاعدة التوجيه على الأدلة الاقتصادية والبحثية ثم رئيس. لملف الأدلة الموحّد."), t("$0.51 (measured)", "0.51 دولار (قياس)"), "", undefined]];
  return (
    <Block title={t("What is on file, what it cost, and what overlaps", "ما هو محفوظ وكلفته وما يتداخل")} hint={t("The Case File asks for two products. The three other councils stay available for narrower questions; their saved results can ride along in the Full dossier as annexes, so none is run twice for the same file.", "يطلب ملف الحالة منتجين. وتبقى المجالس الثلاثة الأخرى متاحة لأسئلة أضيق؛ وتنضم نتائجها المحفوظة إلى الملف الكامل كملاحق، فلا يُشغَّل أي منها مرتين للملف نفسه.")}>
      <Tbl head={[t("Product", "المنتج"), t("Status", "الحالة"), t("Language", "اللغة"), t("Cost", "الكلفة"), ""]} rows={[row("council", council), row("architect", arch)]} />
      <p className="mt-2 text-[12px] text-t1">{t(`Spent on this country in this browser: ${usd(spent.usd)} over ${spent.runs} paid run(s). Repeated requests are served from cache at no cost.`, `المصروف على هذه الدولة في هذا المتصفح: ${usd(spent.usd)} على ${spent.runs} تشغيل مدفوع. والطلبات المكررة تُخدَّم من الذاكرة بلا كلفة.`)}</p>
      <h4 className="label mb-1.5 mt-4">{t("Four councils: which one for what", "أربعة مجالس: أيها لماذا")}</h4>
      <Tbl head={[t("Council", "المجلس"), t("Use it for", "استخدمه لـ"), t("Cost", "الكلفة"), t("On file here", "المحفوظ هنا")]} w={["22%", "50%", "14%", "14%"]} rows={councils.map(([n, u, c, , sv], i) => [<b key="n" className="text-t0">{n}</b>, u, c, i === 0 ? (council ? <Pill key="p" c="var(--ok)">{council.at.slice(0, 10)}</Pill> : <Pill key="p" c="var(--t2)">—</Pill>) : sv ? <Pill key="p" c="var(--ok)">{sv.at.slice(0, 10)}</Pill> : <Pill key="p" c="var(--t2)">—</Pill>])} />
      {others.length > 0 && <><h4 className="label mb-1.5 mt-4">{t("Other saved products on this country", "منتجات محفوظة أخرى عن هذه الدولة")}</h4><Tbl head={[t("Product", "المنتج"), t("Saved", "الحفظ"), t("Words", "الكلمات"), t("Cost", "الكلفة")]} rows={others.map((o) => [L === "ar" ? KIND_AR[o.kind] : KIND_EN[o.kind], o.at.slice(0, 10), o.words.toLocaleString("en-US"), o.usd != null ? usd(o.usd) : "—"])} /></>}
    </Block>
  );
}
