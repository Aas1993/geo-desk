"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, MessageSquarePlus, X } from "lucide-react";
import { CiteContext } from "../Markdown";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";

export type Fact = { id: string; kind: string; text: string; src: string; url?: string };
type Facts = { map: Map<string, Fact>; show: (id: string) => void };
const FactCtx = createContext<Facts>({ map: new Map(), show: () => {} });
/** Makes every fact id in the text below it a button that opens the fact, its source and its link: "everything you state is clickable, with its detail". */
export function FactsProvider({ facts, L, children }: { facts: Fact[]; L: Lang; children: ReactNode }) {
  const t = useTr(L); const map = useMemo(() => new Map(facts.map((f) => [f.id, f])), [facts]); const [open, setOpen] = useState<string | null>(null); const show = useCallback((id: string) => setOpen(id), []);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  const cite = useCallback((ids: string[], key: string) => <span key={key} className="num">{ids.map((id, i) => <CiteChip key={id + i} id={id} />)}</span>, []); const f = open ? map.get(open) : null;
  return (
    <FactCtx.Provider value={{ map, show }}><CiteContext.Provider value={cite}>{children}
      {open && <div role="dialog" aria-modal="false" aria-label={t("Evidence", "الدليل")} className="fixed inset-x-3 bottom-3 z-50 max-h-[55vh] overflow-y-auto rounded-[14px] border border-accent/60 bg-bg1 p-4 shadow-2xl sm:inset-x-auto sm:end-4 sm:w-[460px]">
        <div className="flex items-start gap-2"><span className="num rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-ink)]">{open}</span>{f && <span className="label">{f.kind}</span>}<button type="button" onClick={() => setOpen(null)} aria-label={t("Close", "إغلاق")} className="ms-auto grid size-7 place-items-center rounded-[8px] bg-bg3 text-t1"><X size={14} /></button></div>
        {f ? <><p className="mt-2 text-[12.5px] leading-snug text-t0" dir="auto">{f.text}</p><p className="mt-2 text-[11px] text-t2">{t("Source", "المصدر")}: {f.url && /^https?:\/\//.test(f.url) ? <a href={f.url} target="_blank" rel="noreferrer noopener" className="text-accent underline">{f.src}</a> : f.src}</p></> : <p className="mt-2 text-[12.5px] text-t1">{t("This fact id is not in the evidence pack of the saved run (it was not cited when the run was saved).", "معرّف الحقيقة هذا ليس في حزمة أدلة التشغيل المحفوظ (لم يُستشهد به عند الحفظ).")}</p>}
      </div>}
    </CiteContext.Provider></FactCtx.Provider>
  );
}
export function CiteChip({ id }: { id: string }) {
  const { map, show } = useContext(FactCtx); const known = map.has(id);
  return <button type="button" onClick={() => show(id)} title={known ? map.get(id)!.text.slice(0, 140) : id} className={`mx-px inline-block rounded-[5px] px-1 align-baseline text-[0.72em] font-semibold leading-snug ${known ? "bg-accent/15 text-accent hover:bg-accent/30" : "bg-bg3 text-t2"}`}>{id}</button>;
}
/** Fact ids named in an array, as chips. */
export const Cites = ({ ids }: { ids: string[] }) => (ids.length ? <span className="ms-1 whitespace-nowrap">{ids.map((i) => <CiteChip key={i} id={i} />)}</span> : null);
/** Text with its [F12] ids as chips, for fields that are plain strings rather than Markdown. */
export function Rich({ text }: { text: string }) {
  const { map } = useContext(FactCtx); const parts = text.split(/(\[F\d+(?:\s*[,–-]\s*F?\d+)*\]|\bF\d+\b)/g); return <>{parts.map((p, i) => (/^\[F\d/.test(p) || (/^F\d+$/.test(p) && map.has(p)) ? <span key={i} className="num">{(p.match(/\d+/g) ?? []).map((n) => <CiteChip key={n} id={`F${n}`} />)}</span> : <span key={i}>{p}</span>))}</>;
}

/** A card that opens in place to its detail. Every item a desk states is one of these. */
export function Drill({ head, sub, tags, children, defaultOpen, onAsk, askText, L, accent, id }: { id?: string; head: ReactNode; sub?: ReactNode; tags?: ReactNode; children: ReactNode; defaultOpen?: boolean; onAsk?: (text: string) => void; askText?: string; L: Lang; accent?: string }) {
  const t = useTr(L);
  return (
    <details id={id} open={defaultOpen} className="group scroll-mt-20 rounded-[12px] border border-line bg-bg1 open:border-accent/50" style={accent ? { borderInlineStart: `3px solid ${accent}` } : undefined}>
      <summary className="flex cursor-pointer list-none items-start gap-2.5 p-3 [&::-webkit-details-marker]:hidden"><ChevronDown size={15} className="mt-0.5 shrink-0 text-t2 transition-transform group-open:rotate-180" />
        <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="min-w-0 text-[13.5px] font-semibold leading-snug text-t0">{head}</span>{tags}</span>{sub && <span className="mt-0.5 block text-[12px] leading-snug text-t1">{sub}</span>}</span></summary>
      <div className="space-y-2 border-t border-line px-3 pb-3 pt-2.5 text-[12.5px] leading-snug">{children}{onAsk && askText && <button type="button" onClick={() => onAsk(askText)} className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0 hover:bg-bg2"><MessageSquarePlus size={13} />{t("Ask the council about this", "اسأل المجلس عن هذا")}</button>}</div>
    </details>
  );
}
/** A labelled line of a Drill; renders nothing for an empty value. */
export function Row({ label, children, tone }: { label: string; children?: ReactNode; tone?: "ok" | "warn" | "risk" }) {
  if (children == null || children === "" || (Array.isArray(children) && !children.length)) return null;
  return <p className="text-t1"><b className={tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "risk" ? "text-risk" : "text-t0"}>{label}</b> <span className="text-t0/90" dir="auto">{typeof children === "string" ? <Rich text={children} /> : children}</span></p>;
}
export function Bullets({ label, items, tone }: { label: string; items: string[]; tone?: "ok" | "warn" | "risk" }) {
  if (!items.length) return null; return <div><b className={tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "risk" ? "text-risk" : "text-t0"}>{label}</b><ul className="mt-0.5 list-disc space-y-0.5 ps-5 text-t0/90">{items.map((x, i) => <li key={i} dir="auto"><Rich text={x} /></li>)}</ul></div>;
}
export const BAND_C: Record<string, string> = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)" };
export const CONF_C: Record<string, string> = { high: "var(--ok)", moderate: "var(--warn)", low: "var(--risk)" };
export const word = (L: Lang, s: string) => (L === "ar" ? ({ high: "مرتفع", medium: "متوسط", moderate: "معتدل", low: "منخفض", easy: "سهل", hard: "صعب", decisive: "حاسم", influential: "مؤثر", useful: "مفيد", enter: "دخول", expand: "توسّع", protect: "حماية", ally: "حليف", partner: "شريك", neutral: "محايد", tension: "توتر", rival: "منافس", deepen: "التعميق", staged: "انتقائي ومتدرج", hedge: "التحوط", hold: "الإمساك والمراقبة", government: "الحكومة", security: "الأمن", economy: "الاقتصاد", private: "القطاع الخاص", community: "المجتمع", research: "الأبحاث", media: "الإعلام", "state-linked": "مرتبطة بالدولة", association: "جمعية" } as Record<string, string>)[s] ?? s : s);
/** Opens the Drill with this id (a card that folds) and scrolls to it: how a dot on a matrix or a bar on a chart leads to its detail. */
export const openDrill = (id: string) => { const el = document.getElementById(id) as HTMLDetailsElement | null; if (!el) return; el.open = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); };
