import { CRITERIA, gateTripped, weightedScore } from "./seats";
import type { Posture } from "./core";
import type { CaseData } from "./load";

// Draft scores for the national-interest scorecard, computed from the value pillars and the posture rule. They are suggestions for a person to edit, never verdicts.
export const OPTS: Posture[] = ["deepen", "staged", "hedge", "hold"];
const clamp = (x: number) => Math.max(0, Math.min(5, Math.round(x)));
export function suggest(d: CaseData): Record<Posture, Record<string, number>> {
  const p = (id: string) => (d.pillars.find((x) => x.id === id)?.score ?? 50) / 20; const risk = (d.posture.risk ?? 50) / 20; const val = (d.posture.value ?? 50) / 20;
  const base = { security: (p("security") + p("durability")) / 2, economy: p("economic"), autonomy: 3, diplomacy: p("political"), resilience: (p("geography") + p("durability")) / 2, investment: (p("capital") + p("economic")) / 2, technology: 3, stability: p("durability"), legal: 3.5 - risk / 4 };
  const eff: Record<Posture, Record<string, number>> = {
    deepen: { economy: 1, diplomacy: 1, investment: 1, autonomy: -1, resilience: -risk / 4, security: -risk / 5, legal: -0.5, stability: 0 },
    staged: { economy: 0.5, diplomacy: 0.5, investment: 0.5, autonomy: 0, resilience: 0.5, security: 0, legal: 0.5 },
    hedge: { economy: -0.5, diplomacy: -0.5, investment: -0.5, autonomy: 1, resilience: 0.5, security: 0, legal: 0.3 },
    hold: { economy: -1, diplomacy: -1, investment: -1, autonomy: 1, resilience: 0, security: val < 3 ? 0 : -0.3, legal: 0.5, stability: 0 },
  };
  return Object.fromEntries(OPTS.map((o) => [o, Object.fromEntries(CRITERIA.map((c) => [c.id, clamp((base as Record<string, number>)[c.id] + (eff[o][c.id] ?? 0))]))])) as Record<Posture, Record<string, number>>;
}

export type Edits = Record<string, Record<string, number>>;
export const defaultWeights = (): Record<string, number> => Object.fromEntries(CRITERIA.map((c) => [c.id, c.w]));
export type ScoreRow = { o: Posture; s: Record<string, number>; total: number; gates: string[] };
/** The four postures scored on the nine criteria: the draft from the pillars, any edits a person made, the weighted total and the gates tripped (a score of 1 or less on a gating criterion). The best is the highest total among those that trip no gate. One computation for the Strategy tab and THE KING. */
export function scoreboard(d: CaseData, edit: Edits = {}, w: Record<string, number> = defaultWeights()): { rows: ScoreRow[]; best: ScoreRow | null } {
  const draft = suggest(d); const sc = (o: Posture) => ({ ...draft[o], ...(edit[o] ?? {}) });
  const rows = OPTS.map((o) => ({ o, s: sc(o), total: weightedScore(sc(o), w), gates: gateTripped(sc(o)) }));
  return { rows, best: [...rows].filter((r) => r.gates.length === 0).sort((a, z) => z.total - a.total)[0] ?? null };
}
