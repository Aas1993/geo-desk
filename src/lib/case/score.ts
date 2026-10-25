import { CRITERIA } from "./seats";
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
