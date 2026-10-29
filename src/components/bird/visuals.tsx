"use client";
import type { Posture } from "@/lib/case/core";

// Small, dependency-free visual pieces for the bird's eye report. Each is drawn from numbers and words the consolidated brief already holds; none of them estimates anything.
export const SCORE_C = (n: number) => (n >= 75 ? "var(--ok)" : n >= 40 ? "var(--warn)" : "var(--risk)");
export const POS_ORDER: Posture[] = ["hold", "hedge", "staged", "deepen"];
export const POS_COLOR: Record<string, string> = { deepen: "var(--ok)", staged: "var(--accent)", hedge: "var(--warn)", hold: "var(--t2)" };
const SRC_COLORS = ["var(--accent)", "var(--c2)", "var(--ok)", "var(--warn)", "#f472b6", "#fb923c", "#38bdf8", "#a3e635", "#c084fc"];
/** One stable colour per source tab, so a line can be traced to its tab by colour as well as by name. */
export const srcColor = (tab: string) => { let h = 0; for (const ch of tab) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return SRC_COLORS[h % SRC_COLORS.length]; };

/** A ring that fills to a percentage, with the number inside. */
export function Gauge({ value, size = 112, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const r = 42; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value)); const col = SCORE_C(v);
  return (
    <figure className="m-0 flex flex-col items-center" aria-label={`${label}: ${v}%`}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg3)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray .6s ease" }} />
        <text x="50" y="52" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--t0)" className="numt">{v}%</text>
        {sub && <text x="50" y="68" textAnchor="middle" fontSize="8.5" fill="var(--t2)">{sub}</text>}
      </svg>
      <figcaption className="mt-1 text-center text-[11px] text-t1">{label}</figcaption>
    </figure>
  );
}

/** The four courses on one scale, with each reader placed where it stands: when the readers sit on the same step the tabs agree, when they are apart they do not. */
export function PostureScale({ readers, words, L }: { readers: { id: string; short: string; name: string; value: Posture | null }[]; words: Record<string, string>; L: "en" | "ar" }) {
  const placed = readers.filter((r) => r.value); const none = readers.filter((r) => !r.value);
  return (
    <div role="group" aria-label={L === "ar" ? "المسار على المقياس" : "The course on the scale"}>
      <div className="grid grid-cols-4 gap-1.5">{POS_ORDER.map((p, i) => { const here = placed.filter((r) => r.value === p); const on = here.length > 0;
        return (
          <div key={p} className="text-center">
            <div className="flex min-h-[26px] flex-wrap items-end justify-center gap-1">{here.map((r) => <span key={r.id} title={`${r.name}: ${words[p]}`} className="grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[10.5px] font-bold" style={{ background: POS_COLOR[p], color: "var(--bg0, #04101a)" }}>{r.short}</span>)}</div>
            <div className="mt-1 h-2 rounded-full" style={{ background: on ? POS_COLOR[p] : "var(--bg3)", opacity: on ? 1 : 0.7, borderStartStartRadius: i === 0 ? 999 : 3, borderEndStartRadius: i === 0 ? 999 : 3, borderStartEndRadius: i === 3 ? 999 : 3, borderEndEndRadius: i === 3 ? 999 : 3 }} />
            <p className="mt-1 text-[11.5px] font-medium capitalize" style={{ color: on ? POS_COLOR[p] : "var(--t2)" }}>{words[p]}</p>
          </div>); })}</div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-t2">{readers.map((r) => <span key={r.id}><b className="text-t1">{r.short}</b> {r.name}{!r.value && none.includes(r) ? (L === "ar" ? " (غير محفوظ)" : " (not on file)") : ""}</span>)}</p>
    </div>
  );
}

/** A thin horizontal bar for a 0-1 share. */
export function Bar({ share, color = "var(--ok)", label, text }: { share: number; color?: string; label?: string; text?: string }) {
  const w = Math.round(Math.max(0, Math.min(1, share)) * 100);
  return <span className="flex items-center gap-2" role="img" aria-label={label ?? `${w}%`}><span className="block h-2 flex-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full" style={{ width: `${w}%`, background: color }} /></span><span className="numt min-w-9 text-end text-[11px] text-t1">{text ?? `${w}%`}</span></span>;
}

/** Freshness: a bar that is full when the product was made today and empty at the stale limit. */
export function Freshness({ days, limit = 30 }: { days: number; limit?: number }) {
  const share = 1 - Math.min(days, limit) / limit; const col = days <= 14 ? "var(--ok)" : days <= limit ? "var(--warn)" : "var(--risk)";
  return <Bar share={share} color={col} label={`${days} d`} text={`${days} d`} />;
}
