"use client";
import { useMemo } from "react";
import { STATE_COLOR, STATE_LABEL, seatCounts, type Seat } from "@/lib/room/seats";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";

// The council as a table: the chair at the head, the agents around it, the two auditors at the foot. A seat's ring shows what it is doing (grey not run, pulsing blue working, green done, red failed, amber skipped). It is drawn from the same rosters the council runs on and is read-only: clicking a seat only selects it.
const W = 640; const H = 380; const CX = W / 2; const CY = H / 2 - 4; const RX = 250; const RY = 128;
type Pos = { x: number; y: number };
export function layout(seats: Seat[]): Record<string, Pos> {
  const pos: Record<string, Pos> = {}; const at = (deg: number): Pos => { const a = (deg * Math.PI) / 180; return { x: Math.round((CX + Math.cos(a) * RX) * 10) / 10, y: Math.round((CY + Math.sin(a) * RY) * 10) / 10 }; }; // rounded so the server and the browser draw the same pixels
  const chair = seats.find((s) => s.kind === "chair"); const agents = seats.filter((s) => s.kind === "agent"); const aud = seats.filter((s) => s.kind === "auditor"); const n = agents.length;
  if (chair) pos[chair.id] = at(-90);
  agents.forEach((s, i) => { pos[s.id] = at(chair ? -90 + (360 * (i + 1)) / (n + 1) : -90 + (360 * i) / n); });
  aud.forEach((s, i) => { pos[s.id] = { x: CX + (i - (aud.length - 1) / 2) * 64, y: CY + RY + 38 }; });
  return pos;
}
export function RoundTable({ L, title, seats, selected, onSelect, line, compact }: { L: Lang; title: string; seats: Seat[]; selected?: string | null; onSelect?: (s: Seat) => void; line?: string; compact?: boolean }) {
  const t = useTr(L); const pos = useMemo(() => layout(seats), [seats]); const n = seatCounts(seats);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${n.done} ${t("of", "من")} ${n.total} ${t("seats done", "مقعدًا أنجز")}`} className={`mx-auto block w-full ${compact ? "max-w-[420px]" : "max-w-[720px]"}`}>
        <ellipse cx={CX} cy={CY} rx={RX - 46} ry={RY - 40} fill="var(--bg2)" stroke="var(--line2)" strokeWidth="1.5" />
        <ellipse cx={CX} cy={CY} rx={RX - 58} ry={RY - 52} fill="none" stroke="var(--line)" strokeDasharray="3 5" />
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={compact ? 14 : 15} fontWeight="600" fill="var(--t0)">{title.length > 34 ? `${title.slice(0, 33)}…` : title}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="12" fill="var(--t1)">{n.run > 0 ? `${n.run} ${t("working", "يعمل")} · ` : ""}{n.done}/{n.total} {t("done", "أنجز")}{n.error ? ` · ${n.error} ${t("failed", "تعذّر")}` : ""}</text>
        {line && <text x={CX} y={CY + 30} textAnchor="middle" fontSize="10.5" fill="var(--t2)">{line.length > 52 ? `${line.slice(0, 51)}…` : line}</text>}
        {seats.map((s) => {
          const p = pos[s.id]; if (!p) return null; const c = STATE_COLOR[s.state]; const r = s.kind === "chair" ? 25 : 21; const sel = selected === s.id; const name = L === "ar" ? s.ar : s.en;
          return (
            <g key={s.id} transform={`translate(${p.x} ${p.y})`} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={`${name}: ${L === "ar" ? STATE_LABEL[s.state].ar : STATE_LABEL[s.state].en}`} aria-pressed={onSelect ? sel : undefined} onClick={onSelect ? () => onSelect(s) : undefined} onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s); } } : undefined} className={onSelect ? "cursor-pointer outline-none" : undefined}>
              <title>{`${s.code} · ${name} — ${L === "ar" ? STATE_LABEL[s.state].ar : STATE_LABEL[s.state].en}`}</title>
              {s.state === "run" && <circle r={r + 6} fill="none" stroke={c} strokeWidth="2" className="motion-safe:animate-pulse" />}
              {sel && <circle r={r + 5} fill="none" stroke="var(--t0)" strokeWidth="1.5" />}
              {s.kind === "auditor" ? <rect x={-r + 2} y={-r + 2} width={2 * r - 4} height={2 * r - 4} rx="5" transform="rotate(45)" fill={s.state === "done" ? c : "var(--bg1)"} stroke={c} strokeWidth="2.5" /> : <circle r={r} fill={s.state === "done" ? c : "var(--bg1)"} stroke={c} strokeWidth={s.kind === "chair" ? 3.5 : 2.5} />}
              <text textAnchor="middle" dy="0.35em" fontSize={s.kind === "chair" ? 15 : 11.5} fontWeight="600" fill={s.state === "done" ? "var(--bg0)" : "var(--t0)"} style={{ pointerEvents: "none" }}>{s.code}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10.5px] text-t2">{(["idle", "wait", "run", "done", "error", "skipped"] as const).map((k) => <span key={k} className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-full border-2" style={{ borderColor: STATE_COLOR[k], background: k === "done" ? STATE_COLOR[k] : "transparent" }} />{L === "ar" ? STATE_LABEL[k].ar : STATE_LABEL[k].en}</span>)}<span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rotate-45 border-2" style={{ borderColor: "var(--t1)" }} />{t("independent auditor", "مدقق مستقل")}</span></figcaption>
    </figure>
  );
}
