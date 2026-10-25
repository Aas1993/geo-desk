"use client";
import type { Pt } from "@/lib/case/core";
import type { Lang } from "../falcon/bits";

export type CaseT = (en: string, ar: string) => string;
export const useTr = (L: Lang): CaseT => (en, ar) => (L === "ar" ? ar : en);
export const bt = (L: Lang, x: { en: string; ar: string } | undefined) => (x ? (L === "ar" ? x.ar : x.en) : "");
/** A small trend line: observations solid, projections dashed. Pure SVG, no library. */
export function Spark({ obs, proj, w = 120, h = 28, color = "#378ADD" }: { obs: Pt[]; proj?: Pt[] | null; w?: number; h?: number; color?: string }) {
  const all = [...obs, ...(proj ?? [])]; if (obs.length < 2 && !(proj && proj.length)) return <span className="text-[10.5px] text-t2">—</span>;
  const ys = all.map((p) => p[0]); const vs = all.map((p) => p[1]); const x0 = Math.min(...ys), x1 = Math.max(...ys); let lo = Math.min(...vs), hi = Math.max(...vs); if (lo === hi) { lo -= 1; hi += 1; }
  const px = (y: number) => 2 + ((y - x0) / Math.max(1, x1 - x0)) * (w - 4); const py = (v: number) => h - 3 - ((v - lo) / (hi - lo)) * (h - 6); const path = (a: Pt[]) => a.map((p, i) => `${i ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join("");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ direction: "ltr" }}>{obs.length > 1 && <path d={path(obs)} fill="none" stroke={color} strokeWidth="1.5" />}{proj && proj.length > 1 && <path d={path(proj)} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />}</svg>;
}
/** A number kept in its own left-to-right run inside an Arabic or English sentence. */
export const N = ({ children }: { children: React.ReactNode }) => <bdi dir="ltr" className="num">{children}</bdi>;
export const Hatch = ({ children }: { children: React.ReactNode }) => <span className="inline-block rounded-[6px] px-1.5 py-0.5 text-[10.5px] text-t2" style={{ background: "repeating-linear-gradient(45deg,var(--bg-2),var(--bg-2) 4px,var(--line) 4px,var(--line) 5px)" }}>{children}</span>;
export const Meter = ({ v, max = 100, c = "var(--accent)" }: { v: number | null; max?: number; c?: string }) => v == null ? <Hatch>n/a</Hatch> : <div className="h-1.5 min-w-8 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}><div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (v / max) * 100))}%`, background: c }} /></div>;
export const LEVEL_C = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)", none: "var(--t2)" } as const;
export const fmt = (v: number | null | undefined, d = 1) => (v == null || !isFinite(v) ? "n/a" : Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}bn` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}m` : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(d));
const STATUS_AR: Record<string, string> = { done: "تم", run: "يعمل", wait: "ينتظر", skipped: "تخطّى", error: "خطأ", high: "مرتفع", medium: "متوسط", low: "منخفض", unknown: "غير معروف" };
/** A run or level status word in the page language. */
export const statusWord = (L: Lang, s: string) => (L === "ar" ? STATUS_AR[s] ?? s : s);
