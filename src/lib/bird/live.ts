import type { Ev } from "./runner";

// The live desk of Complete the picture: what every agent of every running council is doing, built only from the events the councils already stream (a roster, then one start/done/skipped/error per agent). Nothing here estimates or invents progress.
export type LiveAgent = { id: string; name: string; stage: number; status: "wait" | "run" | "done" | "skipped" | "error"; t0?: number; t1?: number };
export type LiveProd = { agents: LiveAgent[]; t0: number; t1?: number };
export type Live = Partial<Record<string, LiveProd>>;
const MAP: Record<string, LiveAgent["status"]> = { start: "run", done: "done", skipped: "skipped", error: "error" };

export const liveStart = (l: Live, id: string, now: number): Live => ({ ...l, [id]: { agents: [], t0: now } });
export const liveEnd = (l: Live, id: string, now: number): Live => { const p = l[id]; return p ? { ...l, [id]: { ...p, t1: now, agents: p.agents.map((a) => (a.status === "run" ? { ...a, status: "done" as const, t1: now } : a)) } } : l; };
export function liveEvent(l: Live, id: string, e: Ev, now: number): Live {
  const p = l[id]; if (!p) return l;
  if (e.type === "roster" && Array.isArray(e.agents)) { const have = new Map(p.agents.map((a) => [a.id, a])); return { ...l, [id]: { ...p, agents: (e.agents as { id: string; name?: string; stage?: number }[]).map((a) => have.get(a.id) ?? { id: String(a.id), name: String(a.name ?? a.id), stage: Number(a.stage ?? 0), status: "wait" as const }) } }; }
  if (e.type === "agent" && typeof e.id === "string" && typeof e.status === "string" && MAP[e.status]) {
    const st = MAP[e.status]; const known = p.agents.some((a) => a.id === e.id); const base = known ? p.agents : [...p.agents, { id: e.id, name: e.id, stage: 0, status: "wait" as const }];
    return { ...l, [id]: { ...p, agents: base.map((a) => (a.id !== e.id ? a : { ...a, status: st, t0: st === "run" ? now : a.t0 ?? (st === "wait" ? undefined : now), t1: st === "run" ? undefined : now })) } };
  }
  return l;
}
export const liveCounts = (l: Live) => { let working = 0, done = 0, total = 0; for (const p of Object.values(l)) for (const a of p?.agents ?? []) { total++; if (a.status === "run") working++; else if (a.status === "done" || a.status === "skipped" || a.status === "error") done++; } return { working, done, total }; };
/** The agents of a product grouped by stage, in stage order (the auditors, stage 9, last). */
export const liveStages = (p: LiveProd): LiveAgent[][] => { const m = new Map<number, LiveAgent[]>(); for (const a of p.agents) m.set(a.stage, [...(m.get(a.stage) ?? []), a]); return [...m.entries()].sort((x, y) => x[0] - y[0]).map(([, v]) => v); };
