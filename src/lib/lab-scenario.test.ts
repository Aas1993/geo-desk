// Tests for the Scenario sandbox: each shock's rule, the base case reproducing the Case File posture, the shocked posture through the same rule, categories stepping up (never from unknown), and gaps with no effect. Pure: a hand-built country, plus the held files for a few real ones.
import assert from "node:assert/strict";
import { rule } from "./case/core";
import { buildCase } from "./case/load";
import { NO_SHOCK, SHOCKS, alternativesOf, computeScenario, ruleFor, scenarioBlocks, scenarioText, shockText, stepUp, type ScenarioInput, type Shocks } from "./lab/scenario";

type Over = Partial<ScenarioInput>;
const sp = (name: string, v: number, y = 2024) => ({ met: { name }, has: true, series: [], proj: null, spine: { latest: { y, v }, change5: null, z: null, n: 1 }, region: null, uae: null });
const instr = (id: string, fp: number | null) => ({ id, kind: "soft" as const, name: { en: id, ar: id }, footprint: fp, headroom: fp == null ? null : Math.round((5 - fp) * 10) / 10, basis: { en: "", ar: "" }, intensity: { en: "", ar: "" } });
const mk = (o: Over = {}): ScenarioInput => ({
  name: "Testland", nameAr: null, posture: { posture: "deepen", value: 70, ability: 65, risk: 30, stable: true, alternatives: [], reasons: [], thresholds: { deepenValue: 65, deepenAbility: 60, deepenRisk: 40, stagedValue: 50, stagedAbility: 50, holdRisk: 60 } },
  instruments: [instr("diplomacy", 1), instr("trade", 4.5), instr("finance", null), instr("development", 1.5)],
  spine: [sp("Oil and gas rents, % of GDP", 25), sp("Reserves, months of imports", 2), sp("Government gross debt, % of GDP", 90), sp("Inflation, consumer prices", 7), sp("Political stability", 50)] as unknown as ScenarioInput["spine"],
  axes: [{ id: "corridor", en: "", ar: "", v: 4, ev: "" }], leaders: { head: { name: "X", tenure: 25, age: 70 } },
  deep: { exposure: { rows: [{ id: "sanctions", magnitude: 0.5, value: { en: "OFAC 3, UN 0", ar: "" } }], priority: {} } } as unknown as ScenarioInput["deep"], ...o,
});
const set = (o: Partial<Shocks>): Shocks => ({ ...NO_SHOCK, ...o });
let n = 0; const ok = (c: unknown, m: string) => { assert.ok(c, m); n++; }; const eq = <T,>(a: T, b: T, m: string) => { assert.equal(a, b, m); n++; };

async function main() {
  // ---- no shock: the shocked case IS the base case
  const d = mk(); const r0 = computeScenario(d, NO_SHOCK);
  ok(r0.placed, "placed"); eq(r0.shocked!.posture, "deepen", "no shock, same posture"); eq(r0.delta.risk, 0, "no shift"); ok(r0.instruments.every((i) => !i.changed), "no instrument changes"); ok(r0.cats.every((c) => c.base === c.shocked), "no category moves");
  eq(r0.base!.value, 70, "base value is the Case File's"); eq(r0.base!.ability, 65, "base ability"); eq(r0.base!.risk, 30, "base risk"); ok(r0.baseRuleAgrees, "the rule on the rounded readings agrees");
  ok(r0.line.en.includes("No shock"), "the line says no shock");
  // ---- oil: exporter, price down raises risk; importer, price up raises risk
  const o1 = ruleFor(d, "oil", -40); eq(o1.shift.risk, 7.5, "exporter: -0.75 × 2.5 × -4 = +7.5"); eq(o1.held, true, "held"); ok(o1.input[0].display.includes("exporter"), "exporter named");
  eq(ruleFor(d, "oil", 40).shift.risk, -7.5, "a higher price is relief for an exporter"); ok(ruleFor(d, "oil", 40).cats.length === 0, "relief steps no category down");
  const imp = mk({ spine: [sp("Oil and gas rents, % of GDP", 1)] as unknown as ScenarioInput["spine"] }); eq(ruleFor(imp, "oil", 40).shift.risk, 3.2, "importer: +1.0 × 4 × (1 − 0.2)");
  eq(ruleFor(mk({ spine: [sp("Oil and gas rents, % of GDP", 80)] as unknown as ScenarioInput["spine"] }), "oil", -40).shift.risk, 12, "rents are capped at 40 before the formula");
  // ---- sanctions, leadership, closure, donor, currency
  const s2 = ruleFor(d, "sanctions", 2); eq(s2.shift.risk, 15, "5 × 2 × 1.5"); eq(s2.shift.ability, -12, "−6 × 2"); ok(s2.cats.some((c) => c.id === "security" && c.steps === 2), "security up two"); ok(s2.cats.some((c) => c.id === "financial"), "financial up");
  const l1 = ruleFor(d, "leadership", 2); eq(l1.shift.risk, 12, "4 × 2 × 1.5 (25 years)"); eq(l1.shift.value, -6, "−2 × 2 × 1.5"); eq(ruleFor(mk({ leaders: { head: { name: "X", tenure: 5, age: 50 } } }), "leadership", 1).shift.risk, 2.4, "short tenure weight 0.6");
  const c3 = ruleFor(d, "closure", 3); eq(c3.shift.risk, 7.2, "3 × 3 × 0.8"); eq(c3.shift.ability, -9.6, "−4 × 3 × 0.8"); ok(c3.cats.some((c) => c.id === "operational"), "operational up");
  const dn = ruleFor(d, "donor", 100); eq(dn.shift.risk, 8, "12 × 1 × (4/6)"); eq(ruleFor(mk({ spine: [sp("Reserves, months of imports", 8)] as unknown as ScenarioInput["spine"] }), "donor", 100).shift.risk, 0, "ample reserves absorb a cut");
  const cu = ruleFor(d, "currency", 30); eq(cu.shift.risk, 4.2, "0.1 × 30 × (0.5 + 0.9)");
  // ---- gaps: not held means no effect, said so
  const bare = mk({ spine: [], axes: [], leaders: null, deep: null });
  for (const s of SHOCKS) { const x = ruleFor(bare, s.id, s.max); eq(x.held, false, `${s.id} not held`); ok(x.shift.risk === 0 && x.shift.ability === 0 && x.shift.value === 0, `${s.id} has no effect`); ok(x.note.en.startsWith("No effect applied"), `${s.id} says so`); ok(x.note.ar.length > 10, "and in Arabic"); }
  eq(computeScenario(bare, set({ oil: -40, currency: 50 })).delta.risk, 0, "no inputs, no movement");
  // ---- the shocked posture goes through the Case File rule
  const r1 = computeScenario(d, set({ oil: -40, currency: 30 })); // +7.5 + 4.2 = 11.7 on risk
  eq(r1.shocked!.risk, 42, "30 + 11.7 rounds to 42"); eq(r1.shocked!.posture, rule(70, 65, 42), "through the shared rule"); eq(r1.shocked!.posture, "staged", "risk above 40 drops Deepen to staged");
  ok(r1.course.changed, "course changed"); ok(r1.crossed.some((c) => c.cond.id === "deepenRisk" && c.was && !c.now), "the risk ceiling was crossed");
  ok(r1.needs.some((x) => x.en.includes("risk would have to fall by 2")), "what would have to be true: risk back down by 2"); ok(r1.needs.every((x) => x.ar.length > 10), "Arabic needs");
  ok(r1.instruments.find((i) => i.id === "diplomacy")!.changed, "an instrument with headroom changes from Raise to a staged step"); eq(r1.instruments.find((i) => i.id === "trade")!.changed, false, "a saturated instrument does not");
  ok(r1.line.en.includes("Deepen") && r1.line.en.includes("Selective and staged"), "the playbook line names both courses");
  const econ = r1.cats.find((c) => c.id === "economic")!; ok(econ.steps >= 1 && econ.base !== "none" && econ.shocked !== econ.base, "economic stepped up"); ok(econ.by.includes("oil"), "and credits the shock");
  const pol = r1.cats.find((c) => c.id === "operational")!; eq(pol.base, "none", "operational is unknown in the Case File"); eq(pol.shocked, "none", "unknown is never turned into low");
  eq(stepUp("none", 2), "none", "none stays none"); eq(stepUp("low", 1), "medium", "low to medium"); eq(stepUp("high", 2), "high", "high is the ceiling");
  // ---- clamping, instability, hold
  const hi = mk({ posture: { ...mk().posture, posture: "hold", value: 40, ability: 40, risk: 95, stable: false, alternatives: ["staged"] } });
  const rh = computeScenario(hi, set({ sanctions: 3, leadership: 2 })); eq(rh.shocked!.risk, 100, "risk is clamped at 100"); ok(rh.shocked!.ability >= 0, "ability floor 0");
  const lo = mk({ posture: { ...mk().posture, value: 51, ability: 10, risk: 50 } }); eq(computeScenario(lo, set({ sanctions: 3 })).shocked!.ability, 0, "ability clamps at 0");
  eq(alternativesOf(70, 65, 30).length > 0, true, "a reading near the thresholds is not stable"); eq(alternativesOf(95, 95, 5).length, 0, "a far-inside reading is stable");
  eq(computeScenario(d, set({ oil: -40 })).shocked!.stable, alternativesOf(70, 65, 38).length === 0, "stability is re-tested on the shocked reading");
  // ---- a country the Case File does not place
  const un = mk({ posture: { ...mk().posture, posture: null, value: null, ability: 70, risk: 30, stable: false, alternatives: [] } }); const ru = computeScenario(un, set({ oil: -40 })); eq(ru.placed, false, "unplaced"); ok(ru.line.en.includes("does not place"), "says so");
  // ---- rounding disagreement is flagged, and the no-shock case still equals the Case File
  const edge = mk({ posture: { ...mk().posture, posture: "staged", value: 65, ability: 65, risk: 40 } }); const re = computeScenario(edge, NO_SHOCK); eq(re.baseRuleAgrees, false, "rounded readings give deepen where the Case File's raw readings gave staged"); eq(re.shocked!.posture, "staged", "no shock keeps the Case File's posture");
  // ---- text and blocks
  const t = scenarioText(r1, "Testland", set({ oil: -40, currency: 30 })); ok(t.includes("Illustrative rule output") && t.includes("Base case") && t.includes("Thresholds crossed"), "text carries the label and sections"); ok(!/NaN|undefined/.test(t), "no NaN or undefined in the text");
  for (const lang of ["en", "ar"] as const) { const bl = scenarioBlocks(r1, "Testland", set({ oil: -40, currency: 30 }), lang, "A short write-up.\n\nSecond paragraph."); ok(bl.length >= 8, "blocks built"); ok(bl.every((x) => !/NaN|undefined/.test(x)), `no NaN in ${lang} blocks`); }
  ok(scenarioBlocks(ru, "X", NO_SHOCK, "en").length >= 2, "unplaced blocks still render");
  eq(shockText("closure", 2, "en"), "2 months", "closure text"); eq(shockText("oil", -20, "en"), "-20%", "oil text"); ok(shockText("leadership", 2, "ar").length > 2, "arabic text");
  // ---- real held data: the base case reproduces the Case File for countries that are placed
  let placed = 0;
  for (const iso of ["JOR", "KEN", "PAK", "BRA", "ETH", "EGY", "SAU", "IND"]) {
    const c = await buildCase(iso, new Date("2026-10-30T00:00:00Z")); if (!c) continue; const r = computeScenario(c, NO_SHOCK);
    if (c.posture.posture) { placed++; eq(r.base!.posture, c.posture.posture, `${iso} base posture`); eq(r.shocked!.posture, c.posture.posture, `${iso} no shock keeps posture`); eq(r.base!.value, c.posture.value, `${iso} value`); eq(r.base!.ability, c.posture.ability, `${iso} ability`); eq(r.base!.risk, c.posture.risk, `${iso} risk`); ok(r.instruments.every((i, k) => i.base.en === c.instruments[k].intensity.en), `${iso} instrument intensity reproduces the Case File`); eq(r.base!.stable, c.posture.stable, `${iso} stability`);
      const all = computeScenario(c, set({ oil: -40, sanctions: 2, leadership: 1, closure: 2, donor: 50, currency: 30 })); ok(all.shocked!.risk >= all.base!.risk - 12 && all.shocked!.risk <= 100, `${iso} shocked risk is bounded`); ok(!/NaN|undefined/.test(scenarioText(all, iso, NO_SHOCK)), `${iso} text clean`); }
    else eq(r.placed, false, `${iso} unplaced`);
  }
  ok(placed >= 3, `real countries were placed (${placed})`);
  console.log(`lab-scenario: ${n} assertions passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
