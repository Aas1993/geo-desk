"use client";
import type { ReactNode } from "react";
import type { Series } from "@/lib/types";
import { useT } from "@/lib/store";

export function Skeleton({ h = 56, className = "" }: { h?: number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height: h }} aria-hidden />;
}
export function StatTile({ label, value, sub, className = "" }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[6px] border border-line bg-bg2 p-3 min-w-0 ${className}`}>
      <div className="label leading-tight">{label}</div>
      <div className="num mt-1 text-[19px] font-semibold leading-tight text-t0 break-words">{value}</div>
      {sub != null && <div className="num mt-0.5 text-[11px] text-t2 truncate">{sub}</div>}
    </div>
  );
}
export function Card({ title, icon, children }: { title?: string; icon?: string; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-line bg-bg1/60 p-3.5">
      {title && <h3 className="label mb-2.5 flex items-center gap-1.5">{icon && <span aria-hidden>{icon}</span>}{title}</h3>}
      {children}
    </section>
  );
}
export function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px] border-b border-line/60 last:border-0"><span className="text-t1">{k}</span><span className="text-t0 text-end font-medium">{v}</span></div>;
}
export function EmptyState({ title, why, onRetry }: { title: string; why: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <div className="rounded-[8px] border border-dashed border-line p-4 text-center">
      <div className="text-[13px] font-medium text-t1">{title}</div>
      <div className="mt-1 text-[12px] text-t2">{why}</div>
      {onRetry && <button onClick={onRetry} className="mt-3 rounded-full border border-line px-3 py-1 text-[12px] text-accent hover:bg-bg2">{t("retry")}</button>}
    </div>
  );
}
export function Source({ name, url, year }: { name: string; url?: string; year?: number | string }) {
  const { t } = useT();
  const inner = <>{t("source")}: {name}{year ? ` · ${year}` : ""}</>;
  return <p className="mt-2 text-[11px] text-t2">{url ? <a href={url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-t1">{inner}</a> : inner}</p>;
}
export function Sparkline({ data, width = 260, height = 56, color = "var(--accent)", pctAxis = false }: { data: Series; width?: number; height?: number; color?: string; pctAxis?: boolean }) {
  if (data.length < 2) return null;
  const xs = data.map((d) => d.y), ys = data.map((d) => d.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (pctAxis && y0 > 0) y0 = 0; if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = (x: number) => 4 + ((x - x0) / (x1 - x0)) * (width - 8), py = (y: number) => height - 6 - ((y - y0) / (y1 - y0)) * (height - 12);
  const d = data.map((p, i) => `${i ? "L" : "M"}${px(p.y).toFixed(1)},${py(p.v).toFixed(1)}`).join("");
  const lastP = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Trend ${x0}–${x1}`} style={{ direction: "ltr" }}>
      <path d={`${d}L${px(x1)},${height}L${px(x0)},${height}Z`} fill={color} opacity=".1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(lastP.y)} cy={py(lastP.v)} r="3" fill={color} />
      <text x="4" y={height - 0.5} fontSize="9" fill="var(--t2)">{x0}</text>
      <text x={width - 4} y={height - 0.5} fontSize="9" textAnchor="end" fill="var(--t2)">{x1}</text>
    </svg>
  );
}
export function ShareBar({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const tot = a + b || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-bg2" style={{ direction: "ltr" }}>
        <div style={{ width: `${(a / tot) * 100}%`, background: "var(--up)" }} /><div style={{ width: `${(b / tot) * 100}%`, background: "var(--c2)" }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-t2"><span className="flex items-center gap-1"><i className="inline-block size-2 rounded-full bg-ok" />{aLabel}</span><span className="flex items-center gap-1"><i className="inline-block size-2 rounded-full bg-c2" />{bLabel}</span></div>
    </div>
  );
}
export function IconBtn({ label, onClick, children, active, className = "" }: { label: string; onClick?: () => void; children: ReactNode; active?: boolean; className?: string }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} aria-pressed={active}
      className={`grid size-9 place-items-center rounded-[6px] text-t1 transition-colors hover:bg-bg2 hover:text-t0 ${active ? "bg-bg2 text-accent" : ""} ${className}`}>{children}</button>
  );
}
