// The option-appraisal rubric of the specification (section 12): six weighted criteria and three pass-or-fail gates.
// The weights are proposals, not a national policy preference, and the reader moves them. A failed gate removes an option from the ranking whatever its weighted score: authority, transparency and conduct are constraints, not criteria.
export const APPRAISAL_CRITERIA = [
  { id: "uae", en: "UAE benefit", ar: "منفعة الإمارات", weight: 20 },
  { id: "counterpart", en: "Counterpart benefit and durability", ar: "منفعة الطرف المقابل ومتانتها", weight: 20 },
  { id: "feasibility", en: "Feasibility", ar: "الجدوى التنفيذية", weight: 15 },
  { id: "commercial", en: "Commercial and resource value", ar: "القيمة التجارية والموارد", weight: 15 },
  { id: "risk", en: "Risk and resilience (high = low risk)", ar: "المخاطر والمرونة (الأعلى = مخاطر أقل)", weight: 15 },
  { id: "reversibility", en: "Reversibility and learning", ar: "قابلية العكس والتعلّم", weight: 15 },
] as const;
export type CriterionId = (typeof APPRAISAL_CRITERIA)[number]["id"];
export const GATES = [{ id: "authority", en: "Authority", ar: "الصلاحية" }, { id: "transparency", en: "Transparency", ar: "الشفافية" }, { id: "conduct", en: "Conduct", ar: "السلوك" }] as const;
export type GateId = (typeof GATES)[number]["id"];
export type Weights = Record<CriterionId, number>;
export const DEFAULT_WEIGHTS: Weights = Object.fromEntries(APPRAISAL_CRITERIA.map((c) => [c.id, c.weight])) as Weights;
export type AppraisedOption = { id: string; name: string; scores: (number | null)[]; gates: Record<GateId, boolean | null> };
/** Weighted mean of the scores that exist, re-normalised over their weights; null when none exist. */
export function weightedScore(scores: (number | null)[], w: Weights = DEFAULT_WEIGHTS): number | null {
  let num = 0, den = 0; APPRAISAL_CRITERIA.forEach((c, i) => { const s = scores[i]; const x = Math.max(0, w[c.id]); if (s != null && x > 0) { num += s * x; den += x; } });
  return den ? Math.round((num / den) * 100) / 100 : null;
}
export const gatesPassed = (g: Record<GateId, boolean | null>) => GATES.every((x) => g[x.id] === true);
export const gateFailed = (g: Record<GateId, boolean | null>) => GATES.some((x) => g[x.id] === false);
/** Options ranked by weighted score; an option that fails any gate or has an unrated gate is shown after the others, never ranked above them. */
export function rankAppraisal(opts: AppraisedOption[], w: Weights = DEFAULT_WEIGHTS) {
  return opts.map((o, i) => ({ i, id: o.id, name: o.name, total: weightedScore(o.scores, w), blocked: !gatesPassed(o.gates), failed: gateFailed(o.gates) })).sort((a, b) => Number(a.blocked) - Number(b.blocked) || (b.total ?? -1) - (a.total ?? -1) || a.i - b.i);
}
/** Share of random weight sets (each weight scaled by a factor between 0.5 and 1.5) in which each eligible option ranks first. A sensitivity check, not a probability. Deterministic. */
export function topShare(opts: AppraisedOption[], w: Weights = DEFAULT_WEIGHTS, draws = 400): number[] {
  const wins = opts.map(() => 0); let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let d = 0; d < draws; d++) { const ww = { ...w }; for (const c of APPRAISAL_CRITERIA) ww[c.id] = w[c.id] * (0.5 + rnd()); const best = rankAppraisal(opts, ww).find((r) => !r.blocked && r.total != null); if (best) wins[best.i]++; }
  return wins.map((n) => Math.round((n / draws) * 100));
}
