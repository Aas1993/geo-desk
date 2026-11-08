import type { Decision } from "../deep/registers";
import type { Dashboard } from "./architect";
import type { B } from "./core";

// THE DECISION LOG: one list of what was decided, when it is due for review, and what happened. It is the Deep Intelligence decision register (one store, `gd-deep-decisions`), now read by the Case File, so a decision recorded anywhere shows up everywhere.
// A decision enters the log from four places: the Strategy tab's "record as decision", the Architect's dated decision gates, the decisions asked of the reader on the President and Minister views, and a person typing one. Follow-through is the review date, the observed result and how that result may be attributed (association only unless a method is written down; see registers.ts).
export const DECISIONS_KEY = "gd-deep-decisions";
const DAY = 86_400_000;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
/** The country a decision is about: stored on it, or read from what informed it (case:EGY, architect:EGY:S1, council:EGY). */
export const isoOf = (d: Pick<Decision, "iso3" | "informedBy">): string | null => d.iso3 ?? d.informedBy.map((x) => /(?:case|architect|council):([A-Z]{3})/.exec(x)?.[1]).find((x) => !!x) ?? null;
export type DueState = "overdue" | "due" | "later" | "none";
/** Overdue: the review date has passed. Due: within the window. Closed decisions and decisions without a date are none. */
export function dueState(d: Pick<Decision, "status" | "review">, today: number, windowDays = 14): DueState {
  if (d.status !== "open" || !d.review) return "none"; const t = Date.parse(d.review); if (!isFinite(t)) return "none"; if (t < today) return "overdue"; return t - today <= windowDays * DAY ? "due" : "later";
}
export type LogCounts = { open: number; due: number; overdue: number; reviewed: number; withOutcome: number; milestones: number; milestonesDone: number };
export function logCounts(ds: Decision[], iso: string | null, today: number): LogCounts {
  const mine = iso ? ds.filter((d) => isoOf(d) === iso) : ds; const st = mine.map((d) => dueState(d, today)); const ms = mine.flatMap((d) => d.milestones);
  return { open: mine.filter((d) => d.status === "open").length, due: st.filter((x) => x === "due").length, overdue: st.filter((x) => x === "overdue").length, reviewed: mine.filter((d) => d.status === "reviewed").length, withOutcome: mine.filter((d) => d.observed.trim()).length, milestones: ms.length, milestonesDone: ms.filter((m) => m.done).length };
}
/** Decisions per country in one pass, for the Priority board. */
export function logByCountry(ds: Decision[], today: number): Record<string, LogCounts> { const out: Record<string, LogCounts> = {}; for (const iso of new Set(ds.map((d) => isoOf(d)).filter((x): x is string => !!x))) out[iso] = logCounts(ds, iso, today); return out; }

// ---- the Architect's dated decision gates ----
export type GateItem = { ref: string; iso3: string; id: string; name: string; gate: string; outcome: string; month: string; reviewOn: string; state: "overdue" | "due" | "later"; recorded: boolean };
const endOfMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
/** Gates in the Architect's dashboard that have a date, with whether each has already been recorded as a decision. A gate is a scheduled decision, not a decision taken. A gate has a month: it is overdue once that month has ended, due once the month starts within 30 days, later otherwise. */
export function gateItems(iso3: string, dash: Dashboard | null, ds: Decision[], today: number): GateItem[] {
  if (!dash) return []; const have = new Set(ds.map((d) => d.ref).filter(Boolean));
  return dash.initiatives.filter((i) => i.gateDate).map((i) => { const reviewOn = endOfMonth(i.gateDate!); const t = Date.parse(reviewOn); const ref = `gate:${iso3}:${i.id}`;
    return { ref, iso3, id: i.id, name: i.name, gate: i.gate, outcome: i.outcome, month: i.gateDate!, reviewOn, state: t < today ? "overdue" as const : Date.parse(`${i.gateDate}-01`) - today <= 30 * DAY ? "due" as const : "later" as const, recorded: have.has(ref) }; }).sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}
const stamp = (now: Date, n: number) => `DEC-${now.getTime().toString(36)}${n}`;
export const decisionFromGate = (g: GateItem, now: Date, n: number): Decision => ({ id: stamp(now, n), created: now.toISOString(), updated: now.toISOString(), decision: `${g.id} ${g.name}: ${g.gate}`, informedBy: [`architect:${g.iso3}:${g.id}`], expected: g.outcome, owner: "", review: g.reviewOn, milestones: [], observed: "", attribution: "association", method: "", status: "open", iso3: g.iso3, source: "gate", ref: g.ref });
export const textRef = (iso3: string, text: string) => `ask:${iso3}:${hash(text.trim().toLowerCase())}`;
/** A decision the reader was asked to take (from the Architect's or the Council's list), logged with a review date a set number of days ahead. Logging the same sentence twice does nothing. */
export const decisionFromText = (iso3: string, text: string, from: "architect" | "council", now: Date, n: number, reviewInDays = 30): Decision => ({ id: stamp(now, n), created: now.toISOString(), updated: now.toISOString(), decision: text.trim().slice(0, 300), informedBy: [`${from}:${iso3}`], expected: "", owner: "", review: new Date(now.getTime() + reviewInDays * DAY).toISOString().slice(0, 10), milestones: [], observed: "", attribution: "association", method: "", status: "open", iso3, source: from, ref: textRef(iso3, text) });
export function addMissing(ds: Decision[], add: Decision[]): Decision[] { const have = new Set(ds.map((d) => d.ref).filter(Boolean)); return [...ds, ...add.filter((d) => !d.ref || !have.has(d.ref))]; }

// ---- the Machiavellian roadmap gates, read as they are kept ----
export function stratGateCounts(ap: Record<string, { status?: string }> | null | undefined): { approved: number; hold: number; rejected: number; draft: number; total: number } {
  const v = Object.values(ap ?? {}); const c = (s: string) => v.filter((x) => (x.status ?? "draft") === s).length; return { approved: c("approved"), hold: c("hold"), rejected: c("rejected"), draft: c("draft"), total: v.length };
}
export const DUE_LABEL: Record<DueState, B> = { overdue: { en: "overdue", ar: "متأخر" }, due: { en: "due soon", ar: "مستحق قريبًا" }, later: { en: "later", ar: "لاحقًا" }, none: { en: "no date", ar: "بلا موعد" } };
/** A decision typed in by a person. */
export const newDecision = (iso3: string | null, f: { decision: string; expected: string; owner: string; review: string }, now: Date, n: number): Decision => ({ id: stamp(now, n), created: now.toISOString(), updated: now.toISOString(), decision: f.decision.trim().slice(0, 300), informedBy: iso3 ? [`case:${iso3}`] : [], expected: f.expected.trim().slice(0, 400), owner: f.owner.trim().slice(0, 80), review: f.review, milestones: [], observed: "", attribution: "association", method: "", status: "open", ...(iso3 ? { iso3 } : {}), source: "manual" });
