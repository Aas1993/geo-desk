"use client";
import { useMemo, useState } from "react";
import { layoutTree, type PathNode } from "@/lib/machiavelli/strategy-parse";
import { safeHttp } from "@/lib/url";
import { Pill, mixc, type Lang } from "../falcon/bits";

export const BRANCH: Record<string, { c: string; en: string; ar: string }> = { favourable: { c: "var(--ok)", en: "Favourable", ar: "مؤاتٍ" }, adverse: { c: "var(--risk)", en: "Adverse", ar: "سلبي" }, neutral: { c: "var(--t2)", en: "Neutral", ar: "محايد" }, baseline: { c: "var(--c2)", en: "Baseline", ar: "خط الأساس" }, shock: { c: "var(--warn)", en: "Shock", ar: "صدمة" } };
export const STAGE: Record<string, { en: string; ar: string }> = { action: { en: "Action", ar: "إجراء" }, mechanism: { en: "Mechanism", ar: "آلية" }, intermediate: { en: "Intermediate", ar: "وسيط" }, ultimate: { en: "Ultimate", ar: "نهائي" } };
export const CONF: Record<string, { c: string; en: string; ar: string }> = { high: { c: "var(--ok)", en: "High", ar: "مرتفع" }, moderate: { c: "var(--warn)", en: "Moderate", ar: "متوسط" }, low: { c: "var(--risk)", en: "Low", ar: "منخفض" } };
const TOKEN = /(\[[^\]]+\]\(https?:[^)\s]+\)|\*\*[^*]+\*\*|\[(?:F\d+(?:\s*[,–-]\s*F?\d+)*)\])/g;
/** A table cell or sentence with its markdown links, bold and fact references shown as the reader expects, and nothing else interpreted. */
export function Inline({ text }: { text: string }) {
  const parts = useMemo(() => (text || "").split(TOKEN).filter((x) => x !== ""), [text]);
  return <>{parts.map((p, i) => { const a = /^\[([^\]]+)\]\((https?:[^)\s]+)\)$/.exec(p); if (a) return <a key={i} href={safeHttp(a[2])} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{a[1]}</a>; if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={i} className="text-t0">{p.slice(2, -2)}</b>; if (/^\[F\d/.test(p)) return <span key={i} className="num rounded-[4px] bg-bg3 px-1 text-[10px] text-t2">{p.slice(1, -1)}</span>; return <span key={i}>{p}</span>; })}</>;
}
/** A scrollable table whose cells are rendered inline. */
export function Tbl({ head, rows, w, empty }: { head: string[]; rows: (string | React.ReactNode)[][]; w?: string[]; empty?: string }) {
  if (!rows.length) return empty ? <p className="text-[12px] text-t2">{empty}</p> : null;
  return <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-[12px] leading-snug"><thead><tr>{head.map((h, i) => <th key={h + i} className="px-2 py-1.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-t2" style={w?.[i] ? { width: w[i] } : undefined}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line align-top">{r.map((c, j) => <td key={j} className="px-2 py-1.5 text-t1">{typeof c === "string" ? <Inline text={c} /> : c}</td>)}</tr>)}</tbody></table></div>;
}
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; n?: number }[]; value: T; onChange: (t: T) => void; label?: string }) {
  return <div role="tablist" aria-label={label} className="scroll-thin flex gap-1 overflow-x-auto pb-1">{tabs.map((t) => <button key={t.id} role="tab" type="button" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] ${value === t.id ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{t.label}{t.n != null && <span className="num ms-1.5 text-[10.5px] opacity-70">{t.n}</span>}</button>)}</div>;
}

const wrap2 = (t: string, n: number): [string, string] => { if (t.length <= n) return [t, ""]; const sp = t.lastIndexOf(" ", n); const cut = sp > 12 ? sp : n; const rest = t.slice(cut).trim(); return [t.slice(0, cut).trim(), rest.length > n ? `${rest.slice(0, n - 1)}…` : rest]; };
/** The outcome tree of a strategy, scenario or interference pathway: a directed graph with parents, laid out by depth, coloured by branch. Converging paths share a node; a node that has several parents is drawn once. */
export function TreeSvg({ nodes, L, title }: { nodes: PathNode[]; L: Lang; title: string }) {
  const [sel, setSel] = useState<string | null>(null); const pos = useMemo(() => new Map(layoutTree(nodes).map((p) => [p.id, p])), [nodes]);
  if (!nodes.length) return null;
  const W = 188, H = 64, GX = 46, GY = 14; const cols = Math.max(...[...pos.values()].map((p) => p.depth)) + 1; const rows = Math.max(...[...pos.values()].map((p) => p.row)) + 1; const vw = cols * (W + GX) + 10, vh = rows * (H + GY) + 10;
  const xy = (id: string) => { const p = pos.get(id)!; return { x: 5 + p.depth * (W + GX), y: 5 + p.row * (H + GY) }; }; const cur = nodes.find((n) => n.id === sel);
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return (
    <div>
      <div className="scroll-thin overflow-x-auto" dir="ltr"><svg width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} role="img" aria-label={title} className="max-w-none">
        {nodes.flatMap((n) => n.parents.filter((p) => pos.has(p) && p !== n.id).map((p) => { const a = xy(p), b = xy(n.id); const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2; const c = BRANCH[n.branch ?? "neutral"]?.c ?? "var(--t2)"; const on = sel === n.id || sel === p; return <path key={`${p}>${n.id}`} d={`M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2},${y2}`} fill="none" stroke={c} strokeWidth={on ? 2.4 : 1.4} strokeOpacity={sel && !on ? 0.2 : 0.75} />; }))}
        {nodes.map((n) => { const { x, y } = xy(n.id); const c = BRANCH[n.branch ?? "neutral"]?.c ?? "var(--t2)"; const on = sel === n.id; return (
          <g key={n.id} tabIndex={0} role="button" aria-label={`${n.id}: ${n.outcome}`} aria-pressed={on} onClick={() => setSel(on ? null : n.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(on ? null : n.id); } }} className="cursor-pointer outline-none">
            <rect x={x} y={y} width={W} height={H} rx={9} fill="var(--bg-2)" stroke={on ? c : "var(--line)"} strokeWidth={on ? 2 : 1} /><rect x={x} y={y} width={4} height={H} rx={2} fill={c} />
            <text x={x + 12} y={y + 15} fontSize={10} fontWeight={700} fill={c}>{n.id}<tspan fill="var(--t2)" fontWeight={500}> {n.stage ? STAGE[n.stage][L] : ""}{n.horizon ? ` · ${clip(n.horizon, 12)}` : ""}</tspan></text>
            <text x={x + 12} y={y + 31} fontSize={10.5} fill="var(--t0)">{wrap2(n.outcome, 31)[0]}</text><text x={x + 12} y={y + 45} fontSize={10.5} fill="var(--t0)">{wrap2(n.outcome, 31)[1]}</text>
            {n.confidence && <text x={x + W - 8} y={y + H - 7} fontSize={9} textAnchor="end" fill={CONF[n.confidence].c}>{CONF[n.confidence][L]}</text>}<title>{n.outcome}</title></g>); })}
      </svg></div>
      <div className="mt-1 flex flex-wrap gap-2 text-[10.5px] text-t1">{Object.entries(BRANCH).filter(([k]) => nodes.some((n) => n.branch === k)).map(([k, v]) => <span key={k} className="flex items-center gap-1"><i className="size-2 rounded-full" style={{ background: v.c }} />{v[L]}</span>)}</div>
      {cur && <div className="mt-2 rounded-[10px] bg-bg2 p-3 text-[12px] leading-snug" role="status"><div className="flex flex-wrap items-center gap-2"><b className="text-t0">{cur.id}</b>{cur.branch && <Pill c={BRANCH[cur.branch].c}>{BRANCH[cur.branch][L]}</Pill>}{cur.stage && <span className="text-t2">{STAGE[cur.stage][L]}</span>}{cur.horizon && <span className="text-t2">{cur.horizon}</span>}</div><p className="mt-1 text-t0">{cur.outcome}</p>{cur.evidence && <p className="mt-1 text-t1"><b className="text-t0">{L === "ar" ? "الدليل" : "Evidence"}: </b><Inline text={cur.evidence} /></p>}{cur.stop && <p className="mt-0.5 text-t1"><b className="text-t0">{L === "ar" ? "شرط التوقف" : "Stop condition"}: </b>{cur.stop}</p>}{cur.parents.length > 0 && <p className="mt-0.5 text-[11px] text-t2">{L === "ar" ? "يعتمد على" : "Follows from"}: {cur.parents.join(", ")}</p>}</div>}
    </div>
  );
}

/** A polygon radar of up to a few series on a 0 to 5 scale, with the axis names around it and the values listed beside, for the six scorecard dimensions or the six opportunity axes. */
export function Radar6({ labels, series, size = 280 }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; size?: number }) {
  const c = size / 2, R = size / 2 - 52; const n = labels.length; const pt = (i: number, v: number) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(a) * R * (v / 5), c + Math.sin(a) * R * (v / 5)] as const; };
  return (
    <div dir="ltr"><svg viewBox={`-90 0 ${size + 180} ${size}`} width="100%" style={{ maxWidth: size + 180 }} role="img" aria-label={labels.map((l, i) => `${l}: ${series.map((s) => `${s.name} ${s.values[i]}`).join(", ")}`).join("; ")}>
      {[1, 2, 3, 4, 5].map((r) => <polygon key={r} points={labels.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={r === 5 ? 1.2 : 0.7} />)}
      {labels.map((l, i) => { const [x, y] = pt(i, 5); const [lx, ly] = pt(i, 5.9); return <g key={l}><line x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" strokeWidth={0.7} /><text x={lx} y={ly + 3} fontSize={9.5} fill="var(--t1)" textAnchor={Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end"}>{l.length > 26 ? `${l.slice(0, 25)}…` : l}</text></g>; })}
      {series.map((s) => <g key={s.name}><polygon points={s.values.map((v, i) => pt(i, v).join(",")).join(" ")} fill={mixc(s.color, 24)} fillOpacity={0.8} stroke={s.color} strokeWidth={1.8} />{s.values.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r={2.4} fill={s.color} />; })}</g>)}
    </svg></div>
  );
}
export const sc = (v: number) => (v >= 4 ? "var(--ok)" : v >= 2.5 ? "var(--c2)" : v >= 1.5 ? "var(--warn)" : "var(--risk)");
/** A 0 to 5 score as a labelled bar with its evidence in the tooltip and the text below, so no score appears without its source. */
export function ScoreRow({ label, value, ev, hint }: { label: string; value: number; ev: string; hint?: string }) {
  return <div className="rounded-[10px] bg-bg2 p-2.5" title={ev}><div className="flex items-baseline justify-between gap-2"><span className="text-[12px] font-medium text-t0">{label}</span><span className="num text-[13px] font-semibold" style={{ color: sc(value) }}>{value.toFixed(1)}<span className="text-[10px] font-normal text-t2"> / 5</span></span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg3" role="img" aria-label={`${label} ${value} of 5`}><div className="h-full rounded-full" style={{ width: `${(value / 5) * 100}%`, background: sc(value) }} /></div>{hint && <p className="mt-1 text-[10px] leading-snug text-t2">{hint}</p>}<p className="mt-1 text-[11px] leading-snug text-t1">{ev}</p></div>;
}
export const usd = (v: number | null | undefined) => (v == null ? "n/a" : `$${v.toFixed(2)}`);
export function Bar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) { return <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-bg3" role="img" aria-label={`${Math.round((value / (max || 1)) * 100)}%`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%`, background: color }} /></div>; }
