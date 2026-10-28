import type { B } from "../case/core";
import type { Mofa } from "../desk/mofa";
import type { OrgNode } from "./org";

// PROGRESS TRACKING: the desk marks each goal and mission task as not started, on track, at risk or done, with a short note and a date. Statuses live in this browser (the Ministry's own systems are the record; this is the working tracker) and feed three things: the progress bars on the priorities and the org chart, and the "progress reported" text that goes into an updated brief so the Ministry's agents see what moved.
export type TrackStatus = "todo" | "on" | "risk" | "done";
export type TrackEntry = { status: TrackStatus; note: string; at: string };
export type Track = Record<string, TrackEntry>;
export const STATUSES: { id: TrackStatus; en: string; ar: string; color: string; weight: number }[] = [
  { id: "todo", en: "Not started", ar: "لم يبدأ", color: "var(--t2)", weight: 0 },
  { id: "on", en: "On track", ar: "على المسار", color: "var(--accent)", weight: 0.5 },
  { id: "risk", en: "At risk", ar: "في خطر", color: "var(--warn)", weight: 0.25 },
  { id: "done", en: "Done", ar: "أُنجز", color: "var(--ok)", weight: 1 },
];
export const STATUS_BY = new Map(STATUSES.map((s) => [s.id, s]));
export const PROGRESS_RULE: B = { en: "Progress counts a goal as 100% when done, 50% when on track, 25% when at risk and 0% when not started.", ar: "يُحتسب التقدّم 100% عند الإنجاز و50% عند السير على المسار و25% عند الخطر و0% قبل البدء." };
export const trackKey = (iso: string) => `gd-mofa-track:${iso}`;
const statusOf = (t: Track, id: string): TrackStatus => t[id]?.status ?? "todo";
/** Share of the goals (and tasks) under a priority, or all of them, weighted by status. Null when there is nothing to measure. */
export function progressOf(m: Mofa, t: Track, priority?: string): number | null {
  const items = [...m.goals.filter((g) => !priority || g.priority === priority), ...m.mission.filter((x) => !priority || x.priority === priority)]; if (!items.length) return null;
  return items.reduce((a, x) => a + (STATUS_BY.get(statusOf(t, x.id))?.weight ?? 0), 0) / items.length;
}
export const counts = (m: Mofa, t: Track) => { const ids = [...m.goals.map((g) => g.id), ...m.mission.map((x) => x.id)]; const c: Record<TrackStatus, number> = { todo: 0, on: 0, risk: 0, done: 0 }; for (const id of ids) c[statusOf(t, id)]++; return { ...c, total: ids.length }; };
const NOISE = new Set(["affairs", "sector", "department", "ministry", "minister", "state", "office", "services", "support", "strategic", "international", "diplomacy"]);
/** Goals and tasks whose proposed owner names this function: an approximation by the words of its title, shown as such. */
export function nodeProgress(m: Mofa | null, t: Track, n: OrgNode): { progress: number | null; goals: number } {
  if (!m) return { progress: null, goals: 0 }; const words = n.en.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4 && !NOISE.has(w)); if (!words.length) return { progress: null, goals: 0 };
  const items = [...m.goals.map((g) => ({ id: g.id, o: g.owner.toLowerCase() })), ...m.mission.map((x) => ({ id: x.id, o: x.who.toLowerCase() }))].filter((x) => words.some((w) => x.o.includes(w))); if (!items.length) return { progress: null, goals: 0 };
  return { progress: items.reduce((a, x) => a + (STATUS_BY.get(statusOf(t, x.id))?.weight ?? 0), 0) / items.length, goals: items.length };
}
/** The progress report as plain lines, ready to go into an updated brief (at most about 1,200 characters). */
export function progressText(m: Mofa, t: Track): string {
  const c = counts(m, t); const lines: string[] = []; const label: Record<TrackStatus, string> = { todo: "not started", on: "on track", risk: "at risk", done: "done" };
  for (const x of [...m.goals.map((g) => ({ id: g.id, text: g.goal })), ...m.mission.map((k) => ({ id: k.id, text: k.task }))]) { const e = t[x.id]; if (e && e.status !== "todo") lines.push(`${x.id} ${label[e.status]}${e.note ? ` (${e.note.slice(0, 80)})` : ""}: ${x.text.slice(0, 70)}`); }
  const head = `Progress reported by the desk: ${c.done} done, ${c.on} on track, ${c.risk} at risk, ${c.todo} not started of ${c.total}.`; const out = [head, ...lines].join("; "); return out.length > 1200 ? `${out.slice(0, 1200)}…` : out;
}
export function readTrack(iso: string): Track { try { const j = JSON.parse(localStorage.getItem(trackKey(iso)) ?? "{}") as Track; return j && typeof j === "object" ? j : {}; } catch { return {}; } }
