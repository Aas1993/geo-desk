// The options analyzer: multi-criteria scoring with visible weights and a robustness check, so a reader can see whether the preferred option changes when the weights or assumptions change.
// Pure and deterministic: the same scores and weights always give the same ranking and the same robustness figure.
export const CRITERIA = ["benefit", "cost", "diplomatic", "security", "feasibility", "risk"] as const;
export type Criterion = (typeof CRITERIA)[number];
export const CRITERION_LABEL: Record<Criterion, { en: string; ar: string }> = {
  benefit: { en: "Strategic benefit", ar: "الفائدة الاستراتيجية" }, cost: { en: "Economic cost (5 = cheap)", ar: "الكلفة الاقتصادية (5 = رخيص)" }, diplomatic: { en: "Diplomatic fit", ar: "الملاءمة الدبلوماسية" },
  security: { en: "Security gain", ar: "المكسب الأمني" }, feasibility: { en: "Feasibility", ar: "الجدوى" }, risk: { en: "Downside risk (5 = low)", ar: "مخاطر الجانب السلبي (5 = منخفضة)" },
};
export type Weights = Record<Criterion, number>;
export const EQUAL_WEIGHTS: Weights = { benefit: 20, cost: 15, diplomatic: 15, security: 15, feasibility: 20, risk: 15 };
export type Scored = { name: string; scores: Partial<Record<Criterion, number>> };
/** Weighted mean score (1 to 5) over the criteria the option has, weights re-normalised; null when none. */
export function totalScore(s: Scored, w: Weights): number | null {
  let num = 0, den = 0; for (const c of CRITERIA) { const v = s.scores[c]; if (typeof v === "number" && v >= 1 && v <= 5 && w[c] > 0) { num += v * w[c]; den += w[c]; } }
  return den > 0 ? Math.round((num / den) * 100) / 100 : null;
}
export function rank(opts: Scored[], w: Weights) { return opts.map((o, i) => ({ i, name: o.name, total: totalScore(o, w) })).sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.i - b.i); }
/** Share of random weight sets in which each option ranks first. Each weight is multiplied by a factor between 1-spread and 1+spread, 400 draws, a fixed seed. */
export function robustness(opts: Scored[], w: Weights, spread = 0.5, draws = 400): number[] {
  let seed = 123456789; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const wins = opts.map(() => 0);
  for (let d = 0; d < draws; d++) { const ww = { ...w }; for (const c of CRITERIA) ww[c] = w[c] * (1 - spread + 2 * spread * rnd()); const r = rank(opts, ww)[0]; if (r && r.total != null) wins[r.i]++; }
  return wins.map((x) => x / draws);
}
