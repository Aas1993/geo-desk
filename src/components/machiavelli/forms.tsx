"use client";
import { Loader2, Play, Square } from "lucide-react";
import { INSTRUMENTS, tx } from "@/lib/machiavelli/content";
import { REFUSAL_TEXT, refusalFor } from "@/lib/machiavelli/guard";
import type { Lang } from "../falcon/bits";
import type { Phase } from "./useRun";

/** The scope guard in the browser: a prohibited request is explained here before anything is sent, and the same check runs on the server. */
export const refusalText = (texts: string[], L: Lang) => { for (const t of texts) { const r = refusalFor(t); if (r) return REFUSAL_TEXT[L](r); } return ""; };
export function Refusal({ text }: { text: string }) { return text ? <div role="alert" className="mt-2 rounded-[10px] border border-warn/50 bg-warn/10 p-3 text-[12.5px] leading-snug text-t0">{text}</div> : null; }
export function Question({ value, onChange, presets, label, rows = 3 }: { value: string; onChange: (v: string) => void; presets?: [string, string][]; label: string; rows?: number }) {
  return (
    <label className="block"><span className="label mb-1 block">{label}</span><textarea rows={rows} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0" />
      {presets && <span className="mt-1.5 flex flex-wrap gap-1.5">{presets.map(([k, v]) => <button key={k} type="button" onClick={(e) => { e.preventDefault(); onChange(v); }} title={v} className="h-7 rounded-full border border-line bg-bg2 px-2.5 text-[11px] text-t1 hover:text-t0">{k}</button>)}</span>}
    </label>
  );
}
export function InstrumentChips({ value, onChange, L, max = 6 }: { value: string[]; onChange: (v: string[]) => void; L: Lang; max?: number }) {
  return <div className="flex flex-wrap gap-1.5" role="group" aria-label={L === "ar" ? "الأدوات" : "Instruments"}>{INSTRUMENTS.map((i) => { const on = value.includes(i.id); return <button key={i.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== i.id) : value.length < max ? [...value, i.id] : value)} className={`h-7 rounded-full px-2.5 text-[11.5px] ${on ? "bg-accent font-semibold text-[var(--accent-ink)]" : "border border-line bg-bg2 text-t1 hover:text-t0"}`}>{tx(i.name, L)}</button>; })}</div>;
}
/** The start button with its measured cost and ceiling; paid runs only ever start from a click. */
export function RunBar({ phase, onRun, onCancel, disabled, label, cost, L, extra }: { phase: Phase; onRun: () => void; onCancel: () => void; disabled?: boolean; label: string; cost: string; L: Lang; extra?: React.ReactNode }) {
  const running = phase === "running";
  return (
    <div className="mt-3"><div className="flex flex-wrap items-center gap-3">
      {running ? <button type="button" onClick={onCancel} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-bg3 px-4 text-[13px] text-t0"><Square size={14} />{L === "ar" ? "إيقاف" : "Stop"}</button> : <button type="button" disabled={disabled} onClick={onRun} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)] disabled:opacity-50"><Play size={15} />{label}</button>}
      {running && <span className="inline-flex items-center gap-2 text-[12px] text-t1"><Loader2 size={14} className="animate-spin" />{L === "ar" ? "جارٍ العمل…" : "Working…"}</span>}{extra}
    </div><p className="mt-1.5 text-[11px] leading-snug text-t2">{cost}</p></div>
  );
}
export function Progress({ phase, status, tail, searches, sources, err, L }: { phase: Phase; status: string; tail: string; searches: number; sources: number; err: string; L: Lang }) {
  if (phase === "error") return <div role="alert" className="mt-3 rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px] text-t0">{L === "ar" ? "فشل التشغيل: " : "The run failed: "}{err}</div>;
  if (phase !== "running") return null;
  return <div role="status" className="mt-3 rounded-[10px] bg-bg2 p-3 text-[12px] text-t1"><div className="flex flex-wrap items-center gap-3"><i className="size-1.5 animate-pulse rounded-full bg-accent" /><span>{status || (L === "ar" ? "جمع الأدلة…" : "Collecting the evidence…")}</span><span className="num text-[11px] text-t2">{searches} {L === "ar" ? "بحث" : "searches"} · {sources} {L === "ar" ? "مصدر" : "sources"}</span></div>{tail && <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-t2" dir="auto">{tail}</p>}</div>;
}
