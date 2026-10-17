"use client";
import type { Series } from "@/lib/types";

export type Line = { label: string; color: string; data: Series; dashed?: boolean };
export function MultiLine({ lines, height = 120, fmt }: { lines: Line[]; height?: number; fmt?: (n: number) => string }) {
  const W = 320; const pts = lines.flatMap((l) => l.data); if (pts.length < 2) return null;
  const x0 = Math.min(...pts.map((p) => p.y)), x1 = Math.max(...pts.map((p) => p.y));
  let y0 = Math.min(...pts.map((p) => p.v)), y1 = Math.max(...pts.map((p) => p.v)); if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = (x: number) => 6 + ((x - x0) / Math.max(1, x1 - x0)) * (W - 12), py = (y: number) => height - 16 - ((y - y0) / (y1 - y0)) * (height - 26);
  const zero = y0 < 0 && y1 > 0;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={lines.map((l) => l.label).join(" vs ")} style={{ direction: "ltr" }}>
        {zero && <line x1="6" x2={W - 6} y1={py(0)} y2={py(0)} stroke="var(--line)" strokeDasharray="3 3" />}
        {lines.map((l) => l.data.length > 1 && <path key={l.label} d={l.data.map((p, i) => `${i ? "L" : "M"}${px(p.y).toFixed(1)},${py(p.v).toFixed(1)}`).join("")} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={l.dashed ? "5 4" : undefined} />)}
        {lines.map((l) => { const p = l.data[l.data.length - 1]; return p && <circle key={l.label} cx={px(p.y)} cy={py(p.v)} r="3" fill={l.color} />; })}
        <text x="6" y={height - 2} fontSize="9" fill="var(--t2)">{x0}</text><text x={W - 6} y={height - 2} fontSize="9" textAnchor="end" fill="var(--t2)">{x1}</text>
        {fmt && <><text x="6" y="9" fontSize="9" fill="var(--t2)">{fmt(y1)}</text></>}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-t1">{lines.map((l) => <span key={l.label} className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 rounded" style={{ background: l.color }} />{l.label}</span>)}</div>
    </div>
  );
}
export function Bar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-bg2" style={{ direction: "ltr" }}><div className="h-full rounded-full" style={{ width: `${Math.max(2, (value / (max || 1)) * 100)}%`, background: color }} /></div>;
}
