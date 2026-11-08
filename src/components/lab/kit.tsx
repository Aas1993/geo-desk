"use client";
import { useState, type ReactNode } from "react";
import { FileDown, Pin } from "lucide-react";
import type { CaseData } from "@/lib/case/load";
import type { Country } from "@/lib/types";
import { downloadHtmlReport } from "@/lib/reportpdf";
import { LAB_KIND, TOOL_NAME, writeSnap, type LabTool } from "@/lib/lab/snap";
import { snapDoc } from "@/lib/lab/doc";
import { useTr } from "../case/bits";
import type { Lang } from "../falcon/bits";

/** What every Lab tool receives: the language, the focal country (null when none is chosen), its Case File when loaded, and its display name. */
export type ToolProps = { L: Lang; iso: string | null; d: CaseData | null; name: string; cc: Country | undefined };

/** A labelled range input with its value shown: the rule behind a slider is stated by the tool beside it. */
export function Slider({ id, label, value, min, max, step = 1, onChange, text, hint, disabled }: { id: string; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; text: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-bg2 p-2.5">
      <div className="flex items-baseline justify-between gap-2"><label htmlFor={id} className="text-[12.5px] font-medium text-t0">{label}</label><b className="num text-[12.5px] text-accent" dir="ltr">{text}</b></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(+e.target.value)} className="mt-1.5 w-full accent-[var(--accent)]" aria-valuetext={text} />
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-t2">{hint}</p>}
    </div>
  );
}
/** A short list of what is not held, drawn as hatched chips with what would close each gap. */
export function Gaps({ L, items }: { L: Lang; items: { what: string; why: string }[] }) {
  const t = useTr(L); if (!items.length) return null;
  return <div className="rounded-[10px] border border-dashed border-line p-3"><p className="label mb-1.5">{t("Not held", "غير متوافر")}</p><ul className="space-y-1">{items.map((g, i) => <li key={i} className="text-[12px] leading-snug text-t1"><b className="text-t0">{g.what}</b> <span className="text-t2">{g.why}</span></li>)}</ul></div>;
}
/** Keep this view for the briefing pack and/or save it as a PDF in the Archive. Nothing is sent anywhere; the PDF is made in the browser. */
export function SaveBar({ L, tool, iso, country, build, disabled }: { L: Lang; tool: LabTool; iso: string; country: string; build: () => { title: string; blocks: string[]; text: string }; disabled?: boolean }) {
  const t = useTr(L); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");
  const snap = () => { const b = build(); return { tool, iso, country, at: new Date().toISOString(), title: b.title, lang: (L === "ar" ? "ar" : "en") as "en" | "ar", blocks: b.blocks, text: b.text }; };
  const keep = () => { const ok = writeSnap(snap()); setMsg(ok ? t("Kept for the briefing pack (Lab, Briefing pack).", "حُفظ لحزمة الإحاطة (المختبر، حزمة الإحاطة).") : t("This browser would not store it (storage is blocked or full).", "تعذّر الحفظ في هذا المتصفح (التخزين محظور أو ممتلئ).")); };
  const pdf = async () => {
    if (busy) return; const s = snap(); setBusy("0%"); setMsg("");
    try { writeSnap(s); await downloadHtmlReport(snapDoc(s), { id: `${LAB_KIND[tool]}:${iso}:${s.at}`, iso, country, kind: LAB_KIND[tool], title: `${s.title}: ${country}`, lang: s.lang, at: s.at, usd: null }, `${LAB_KIND[tool]}-${iso}-${s.at.slice(0, 10)}.pdf`, (d, n) => setBusy(`${Math.round((d / Math.max(1, n)) * 100)}%`)); setMsg(t("PDF saved to the Archive and downloaded.", "حُفظ ملف PDF في الأرشيف ونُزّل.")); }
    catch (e) { setMsg(`${t("The PDF could not be made", "تعذّر إعداد PDF")}: ${e instanceof Error ? e.message : ""}`); } finally { setBusy(""); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t(`Save: ${TOOL_NAME[tool].en}`, `حفظ: ${TOOL_NAME[tool].ar}`)}>
      <button type="button" onClick={keep} disabled={disabled} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[12.5px] text-t0 hover:border-accent disabled:opacity-50"><Pin size={14} aria-hidden />{t("Keep for the briefing pack", "احفظ لحزمة الإحاطة")}</button>
      <button type="button" onClick={() => void pdf()} disabled={disabled || !!busy} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"><FileDown size={14} aria-hidden />{busy ? `${t("Making PDF", "جارٍ إعداد PDF")} ${busy}` : t("PDF to the Archive", "PDF إلى الأرشيف")}</button>
      {msg && <span role="status" className="text-[11.5px] text-t1">{msg}</span>}
    </div>
  );
}
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`rounded-[12px] border border-line bg-bg1 p-3 ${className}`}>{children}</div>;
