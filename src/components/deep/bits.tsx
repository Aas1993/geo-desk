"use client";
import { MultiLine, type Line } from "../charts";
import { years, type Series } from "@/lib/deep/econ-core";

/** An IMF-style annual series as two lines: observations and estimates solid, projections dashed from the last estimate on, so a projection never reads as a measurement. */
export function seriesLines(s: Series | undefined, y0: number, color: string, label: string, from = 2015): Line[] {
  if (!s) return []; const ys = years(s).filter((y) => y >= from); const obs = ys.filter((y) => y < y0).map((y) => ({ y, v: s[y] })); const proj = ys.filter((y) => y >= y0 - 1).map((y) => ({ y, v: s[y] }));
  return [{ label: `${label}`, color, data: obs }, ...(proj.length > 1 ? [{ label: `${label} (projection)`, color, data: proj, dashed: true }] : [])];
}
export function SeriesChart({ lines, fmt, height = 130 }: { lines: Line[]; fmt?: (n: number) => string; height?: number }) { return lines.some((l) => l.data.length > 1) ? <MultiLine lines={lines} height={height} fmt={fmt} /> : <p className="text-[12px] text-t2">—</p>; }
export const Note = ({ children, tone = "var(--line)" }: { children: React.ReactNode; tone?: string }) => <p className="rounded-[10px] border bg-bg2 p-2.5 text-[12px] leading-snug text-t1" style={{ borderColor: tone }}>{children}</p>;
export const Loading = ({ L, err }: { L: "en" | "ar"; err?: string }) => err ? <p role="alert" className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{L === "ar" ? "تعذرت قراءة البيانات: " : "The data could not be read: "}{err}</p> : <p className="text-[12px] text-t2">{L === "ar" ? "جارٍ تحميل البيانات…" : "Loading the data…"}</p>;
export const sparkOf = (pts: [number, number][]) => pts.map(([y, v]) => ({ y, v }));
