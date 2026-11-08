"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardCopy, Download, Paperclip, Trash2 } from "lucide-react";
import { clipsMarkdown, type Clip } from "@/lib/clips";
import { saveBlob } from "@/lib/dossier/export";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import type { useClips } from "./useClips";

const TONE: Record<string, string> = { opportunity: "var(--ok)", risk: "var(--risk)", neutral: "var(--t2)" };
/** The clip tray: reorder, annotate, remove, copy and export. Clips flow from here into the Bird's eye report, the Country Brief, the President's brief and the Desk agent. */
export function ClipTray({ L, iso, name, tray, compact }: { L: Lang; iso: string; name: string; tray: ReturnType<typeof useClips>; compact?: boolean }) {
  const t = useTr(L); const { clips } = tray; const [asking, setAsking] = useState(false); const [msg, setMsg] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(clipsMarkdown(clips, L === "ar" ? "ar" : "en", name)); setMsg(t("Copied as Markdown.", "نُسخت بصيغة Markdown.")); } catch { setMsg(t("The browser would not copy.", "تعذّر النسخ في المتصفح.")); } };
  const exp = () => { saveBlob(`field-updates-${iso}-${new Date().toISOString().slice(0, 10)}.md`, "text/markdown;charset=utf-8", clipsMarkdown(clips, L === "ar" ? "ar" : "en", name)); };
  return (
    <section aria-label={t("Clip tray", "صينية المقتطفات")} className="rounded-[14px] border border-line bg-bg1 p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="display flex items-center gap-1.5 text-[14px] font-semibold text-t0"><Paperclip size={14} aria-hidden />{t("Clip tray", "صينية المقتطفات")} <span className="num rounded-full bg-bg3 px-1.5 text-[11px] text-t1">{clips.length}</span></h3>
        <div className="flex gap-1">{clips.length > 0 && <><button type="button" onClick={() => void copy()} aria-label={t("Copy as Markdown", "نسخ بصيغة Markdown")} title={t("Copy as Markdown", "نسخ بصيغة Markdown")} className="grid size-8 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-accent"><ClipboardCopy size={14} /></button><button type="button" onClick={exp} aria-label={t("Download Markdown", "تنزيل Markdown")} title={t("Download Markdown", "تنزيل Markdown")} className="grid size-8 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-accent"><Download size={14} /></button><button type="button" onClick={() => setAsking(true)} aria-label={t("Clear the tray", "إفراغ الصينية")} title={t("Clear the tray", "إفراغ الصينية")} className="grid size-8 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-risk"><Trash2 size={14} /></button></>}</div></div>
      <p className="mt-0.5 text-[11px] leading-snug text-t2">{t("What you clip goes into the Bird's eye report and its PDF, is read by the Country Brief, the President's brief and the Desk agent, and is labelled field updates (not verified by the platform).", "ما تنتقيه يدخل تقرير نظرة الطائر وملف PDF الخاص به، ويقرؤه موجز الدولة وموجز الرئيس ووكيل المكتب، ويُعنون مستجدات ميدانية (لم تتحقق منها المنصة).")}</p>
      {asking && <div role="alertdialog" aria-label={t("Confirm clearing the tray", "تأكيد إفراغ الصينية")} className="mt-2 rounded-[10px] border border-warn/50 bg-bg3 p-2.5"><p className="text-[12.5px] text-t0">{t(`Remove all ${clips.length} clips for ${name}? Their notes go too.`, `إزالة كل المقتطفات (${clips.length}) لـ ${name}؟ تُزال ملاحظاتها أيضًا.`)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => { tray.clear(); setAsking(false); setMsg(""); }} className="inline-flex h-8 items-center rounded-[8px] bg-risk px-3 text-[12px] font-semibold text-white">{t("Remove all", "إزالة الكل")}</button><button type="button" onClick={() => setAsking(false)} className="inline-flex h-8 items-center rounded-[8px] border border-line px-3 text-[12px] text-t1">{t("Keep them", "إبقاؤها")}</button></div></div>}
      {msg && <p role="status" className="mt-1 text-[11.5px] text-t1">{msg}</p>}
      {!clips.length ? <p className="mt-2 rounded-[10px] border border-dashed border-line p-3 text-[12px] leading-snug text-t1">{t("Empty. Press Add to report on an update to keep it here.", "فارغة. اضغط أضف إلى التقرير على أي مستجد لحفظه هنا.")}</p>
        : <ol className={`mt-2 space-y-1.5 ${compact ? "" : "max-h-[60vh] overflow-y-auto pe-1"} scroll-thin`}>{clips.map((c, i) => <Row key={c.id} c={c} i={i} n={clips.length} L={L} tray={tray} />)}</ol>}
    </section>
  );
}
function Row({ c, i, n, L, tray }: { c: Clip; i: number; n: number; L: Lang; tray: ReturnType<typeof useClips> }) {
  const t = useTr(L); const [note, setNote] = useState(c.note); const [open, setOpen] = useState(!!c.note);
  return (
    <li className="rounded-[10px] border border-line bg-bg2 p-2" style={{ borderInlineStart: `4px solid ${TONE[c.tone ?? "neutral"]}` }}>
      <div className="flex items-start gap-1.5"><span className="num mt-0.5 text-[11px] text-t2">{i + 1}</span><div className="min-w-0 flex-1"><p className="text-[11px] text-t2">{c.date || t("undated", "بلا تاريخ")} · {c.angle} · {c.source}</p><p className="text-[12.5px] font-medium leading-snug text-t0" dir="auto">{c.text}</p></div>
        <div className="flex shrink-0 flex-col gap-0.5"><button type="button" disabled={i === 0} onClick={() => tray.move(c.id, -1)} aria-label={t("Move up", "تحريك لأعلى")} className="grid size-6 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-accent disabled:opacity-30"><ArrowUp size={12} /></button><button type="button" disabled={i === n - 1} onClick={() => tray.move(c.id, 1)} aria-label={t("Move down", "تحريك لأسفل")} className="grid size-6 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-accent disabled:opacity-30"><ArrowDown size={12} /></button></div>
        <button type="button" onClick={() => tray.remove(c.id)} aria-label={t("Remove this clip", "إزالة هذا المقتطف")} className="grid size-6 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-risk"><Trash2 size={12} /></button></div>
      {open ? <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => tray.note(c.id, note)} rows={2} maxLength={500} aria-label={t("Your note on this clip", "ملاحظتك على هذا المقتطف")} placeholder={t("Your note: why it matters, what to ask", "ملاحظتك: لماذا يهم وماذا نسأل")} className="mt-1.5 w-full resize-y rounded-[8px] border border-line bg-bg1 p-1.5 text-[12px] text-t0" /> : <button type="button" onClick={() => setOpen(true)} className="mt-1 text-[11.5px] text-accent hover:underline">{t("Add a note", "أضف ملاحظة")}</button>}
    </li>
  );
}
