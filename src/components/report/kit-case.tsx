"use client";
import { type ReactNode } from "react";
import { SCORE_C } from "../bird/visuals";

// Small pieces of the report kit that the Strategic Council and the Statecraft Architect need and the shared kit does not have. Like the kit they draw only what a saved product holds.
/** A ring that fills to `value` (0-100) and shows `text` inside (a count such as "9/12", or a score), with a caption. The shared Gauge always prints a percentage; a pass count or a /100 score needs its own words. */
export function RingGauge({ value, text, label, sub, size = 112, color }: { value: number; text: string; label: string; sub?: string; size?: number; color?: string }) {
  const r = 42; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value)); const col = color ?? SCORE_C(v);
  return (
    <figure className="m-0 flex flex-col items-center" aria-label={`${label}: ${text}`}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg3)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray .6s ease" }} />
        <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--t0)" className="numt">{text}</text>
        {sub && <text x="50" y="68" textAnchor="middle" fontSize="8.5" fill="var(--t2)">{sub}</text>}
      </svg>
      <figcaption className="mt-1 max-w-[150px] text-center text-[11px] leading-tight text-t1">{label}</figcaption>
    </figure>
  );
}
/** A responsive grid of tiles. */
export const TileGrid = ({ children, cols = "md:grid-cols-2 xl:grid-cols-3" }: { children: ReactNode; cols?: string }) => <div className={`grid gap-2.5 ${cols}`}>{children}</div>;
/** A small coloured chip with a dot, for a level or a verdict. */
export const Chip = ({ c, children, title }: { c: string; children: ReactNode; title?: string }) => <span title={title} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${c} 20%, transparent)`, color: c }}>{children}</span>;
