import type { Decision } from "../deep/registers";
import { reviewStrategy, type Dashboard, type StateAt } from "./architect";
import type { B } from "./core";
import { dueState } from "./log";

// WHAT CHANGED: one answer to "has anything moved since this file was last reviewed?". It replaces six separate change detectors with one list: the movements the Strategy Review Engine already tracked (posture, value, ability and risk moving 10 points, new alerts, new data builds, 90 days, dated gates reached), plus new sanctions entries, a shift in reported tone, a Council or strategy older than the data builds, and decisions due or overdue.
// The baseline is the state of the country when someone last said "reviewed" (or, if later, when the Architect last wrote the strategy). Nothing is rewritten by itself: a person reads the list and decides.
export type Baseline = { at: string; state: StateAt };
export const baselineKey = (iso: string) => `gd-case-baseline:${iso}`;
export type Sev = "high" | "medium" | "info";
export type Target = { view: "detailed" | "reports" | "minister"; sub?: "council" | "architect" | "log" | "trends" | "value" };
export type Change = { id: string; sev: Sev; text: B; go?: Target };
const b = (en: string, ar: string): B => ({ en, ar });
const SEV: [RegExp, Sev][] = [[/moved from/, "high"], [/New indicators/, "high"], [/Decision gates reached/, "high"], [/moved .* \(10 points/, "medium"], [/90-day/, "medium"], [/Data builds/, "info"]];
/** The most recent of the stored baseline and the Architect's saved state; the Architect's state counts only if it carries a date. */
export function pickBaseline(stored: Baseline | null, archAt: string | null, archState: StateAt | undefined): Baseline | null {
  const fromArch = archState && archAt ? { at: archAt, state: archState } : null; if (!stored) return fromArch; if (!fromArch) return stored; return Date.parse(fromArch.at) > Date.parse(stored.at) ? fromArch : stored;
}
export function whatChanged(then: Baseline | null, now: StateAt, x: { dash: Dashboard | null; decisions: Decision[]; councilAt: string | null; archAt: string | null; today: number }): { baseAt: string | null; days: number; changes: Change[] } {
  const changes: Change[] = []; if (!then) return { baseAt: null, days: 0, changes };
  const r = reviewStrategy(then.state, now, x.dash, x.today);
  for (const [i, reason] of r.reasons.entries()) { const sev = SEV.find(([re]) => re.test(reason.en))?.[1] ?? "info"; changes.push({ id: `r${i}`, sev, text: reason, go: /gates reached/.test(reason.en) ? { view: "detailed", sub: "log" } : { view: "detailed", sub: "value" } }); }
  const c0 = then.state.counts; const c1 = now.counts;
  if (c0 && c1) {
    const up = (k: string) => (c1[k] ?? 0) - (c0[k] ?? 0);
    const sanc = up("ofac") + up("un"); if (sanc > 0) changes.push({ id: "sanc", sev: "high", text: b(`${sanc} new sanctions-list ${sanc === 1 ? "entry" : "entries"} naming the country since the last review.`, `${sanc} إدراجًا جديدًا في قوائم العقوبات يسمّي الدولة منذ آخر مراجعة.`), go: { view: "detailed", sub: "trends" } });
    if (up("ransom90") >= 3) changes.push({ id: "ransom", sev: "medium", text: b(`Ransomware postings naming organisations there rose by ${up("ransom90")}.`, `ارتفعت منشورات برامج الفدية التي تسمّي مؤسسات هناك بمقدار ${up("ransom90")}.`), go: { view: "detailed", sub: "trends" } });
    if (Math.abs(up("deals12")) >= 3) changes.push({ id: "deals", sev: "info", text: b(`Announced UAE deals in 12 months moved by ${up("deals12") > 0 ? "+" : ""}${up("deals12")}.`, `تحركت الصفقات الإماراتية المعلنة في 12 شهرًا بمقدار ${up("deals12") > 0 ? "+" : ""}${up("deals12")}.`), go: { view: "detailed", sub: "trends" } });
    if (Math.abs(up("visits12")) >= 3) changes.push({ id: "visits", sev: "info", text: b(`Engagements in 12 months moved by ${up("visits12") > 0 ? "+" : ""}${up("visits12")}.`, `تحركت اللقاءات في 12 شهرًا بمقدار ${up("visits12") > 0 ? "+" : ""}${up("visits12")}.`), go: { view: "detailed", sub: "trends" } });
  }
  if (then.state.tone != null && now.tone != null && Math.abs(now.tone - then.state.tone) >= 0.5) changes.push({ id: "tone", sev: "medium", text: b(`Reported tone moved from ${then.state.tone.toFixed(2)} to ${now.tone.toFixed(2)} (machine-coded).`, `تحركت نبرة الأحداث من ${then.state.tone.toFixed(2)} إلى ${now.tone.toFixed(2)} (ترميز آلي).`), go: { view: "detailed", sub: "value" } });
  const newest = Object.values(now.builds).sort().slice(-1)[0];
  for (const [en, ar, at, sub] of [["Strategic Council", "المجلس الاستراتيجي", x.councilAt, "council"], ["Statecraft strategy", "استراتيجية فن الحكم", x.archAt, "architect"]] as const) if (at && newest && at.slice(0, 10) < newest) changes.push({ id: `old-${sub}`, sev: "info", text: b(`The ${en} was written before the newest data build (${newest}).`, `كُتب ${ar} قبل أحدث إصدار بيانات (${newest}).`), go: { view: "detailed", sub } });
  const od = x.decisions.filter((d) => dueState(d, x.today) === "overdue").length; const du = x.decisions.filter((d) => dueState(d, x.today) === "due").length;
  if (od) changes.push({ id: "overdue", sev: "high", text: b(`${od} ${od === 1 ? "decision is" : "decisions are"} overdue for review.`, `${od} من القرارات متأخرة عن موعد المراجعة.`), go: { view: "detailed", sub: "log" } });
  if (du) changes.push({ id: "due", sev: "medium", text: b(`${du} ${du === 1 ? "decision is" : "decisions are"} due for review within 14 days.`, `${du} من القرارات مستحقة للمراجعة خلال 14 يومًا.`), go: { view: "detailed", sub: "log" } });
  const rank: Record<Sev, number> = { high: 0, medium: 1, info: 2 }; changes.sort((a, z) => rank[a.sev] - rank[z.sev]);
  return { baseAt: then.at, days: Math.max(0, Math.floor((x.today - Date.parse(then.at)) / 86_400_000)), changes };
}
/** A cheap version for the Priority board, which has only the headline numbers of each country: did the posture move, or a reading move 10 points? */
export function quickChange(then: StateAt | null | undefined, row: { posture: string | null; value: number | null; ability: number | null; risk: number | null }): string[] {
  if (!then) return []; const out: string[] = []; if (then.posture !== row.posture) out.push("posture");
  for (const k of ["value", "ability", "risk"] as const) { const a = then[k]; const z = row[k]; if (a != null && z != null && Math.abs(a - z) >= 10) out.push(k); }
  return out;
}
