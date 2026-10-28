import type { B } from "../case/core";
import { routeTopic, worstOf, type DeskOptions, type Product } from "./core";
import { INTEL_MARK } from "./context";
import { EMB_AGENTS, EMB_BY, EMB_CHIEF, EMB_INTEL_GROUPS, EMB_PLAN_CHIEF, EMB_PLAN_GROUPS, EMB_SYSTEM, composeIntel, composePlan, embDirectiveChiefRole, embDirectiveGroupRole, embIntelChiefRole, embIntelGroupRole, embPlanChiefRole, embPlanGroupRole, embUpdateRole } from "./embassy";
import { KING_AGENTS, KING_BY, KING_CHAIR, KING_GROUPS, KING_SYSTEM, composeKing, kingChairRole, kingDirectiveChairRole, kingDirectiveGroupRole, kingGroupRole } from "./king";

// One description of every paid desk run, shared by the route that executes it and the screens that show what it costs and what it does. A run is a list of calls: the first call of stage 0 goes alone so the shared evidence is cached before the others read it, the rest of stage 0 go in parallel, and the final call (the Decision Chair or the Chief of Staff) writes the product from what they produced.
export type Call = { id: string; agents: string[]; name: B; role: (prior: Record<string, string>) => string; searches: number; maxTokens: number; stage: 0 | 1 };
export type DeskPlan = { product: Product; system: string; calls: Call[]; compose: (parts: { id: string; text: string }[]) => string; contextLabel: string; worst: number };
const b = (en: string, ar: string): B => ({ en, ar });
const names = (ids: string[], by: Map<string, { en: string; ar: string }>): B => ({ en: ids.map((i) => by.get(i)?.en ?? i).join(" · "), ar: ids.map((i) => by.get(i)?.ar ?? i).join(" · ") });
const worst = (calls: Call[]) => Math.round(calls.reduce((a, c) => a + worstOf(c.maxTokens, c.searches), 0) * 1000) / 1000;
const KING_FALLBACK = ["geo", "polity", "invest", "precedent"]; const EMB_FALLBACK = ["pol", "econ", "invest", "bilateral"];
/** The specialists a question or directive goes to: the ones the person chose, else the ones whose field the topic touches. */
export function routed(product: Product, o: DeskOptions): { id: string; why: string }[] {
  const king = product === "king-directive"; const roster = king ? KING_AGENTS : EMB_AGENTS; const chosen = o.agents.filter((id) => roster.some((a) => a.id === id));
  if (chosen.length) return chosen.slice(0, 4).map((id) => ({ id, why: "chosen" }));
  return routeTopic(o.topic, roster, king ? KING_FALLBACK : EMB_FALLBACK).map((r) => ({ id: r.agent.id, why: r.why }));
}
export function planFor(product: Product, o: DeskOptions, context: string): DeskPlan {
  const ctxLabel = product.startsWith("king") ? "Strategic Council, the ambassador's work and other products on file" : "Strategic Council, the head of state's council and other products on file";
  let calls: Call[]; let system: string; let compose: DeskPlan["compose"];
  if (product === "king-council") {
    system = KING_SYSTEM; compose = composeKing;
    calls = [...KING_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, KING_BY), role: () => kingGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chair", agents: [], name: b(KING_CHAIR.en, KING_CHAIR.ar), role: (p) => kingChairRole(p, { topic: o.topic }), searches: 0, maxTokens: KING_CHAIR.maxTokens, stage: 1 }];
  } else if (product === "emb-intel") {
    system = EMB_SYSTEM; compose = composeIntel;
    calls = [...EMB_INTEL_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, EMB_BY), role: () => embIntelGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(EMB_CHIEF.en, EMB_CHIEF.ar), role: (p) => embIntelChiefRole(p, { topic: o.topic }), searches: 0, maxTokens: EMB_CHIEF.maxTokens, stage: 1 }];
  } else if (product === "emb-plan") {
    system = EMB_SYSTEM; compose = composePlan; const at = context.indexOf(INTEL_MARK); const intel = at >= 0 ? context.slice(at + INTEL_MARK.length) : "";
    calls = [...EMB_PLAN_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, EMB_BY), role: () => embPlanGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(EMB_PLAN_CHIEF.en, EMB_PLAN_CHIEF.ar), role: (p) => embPlanChiefRole(p, intel, { topic: o.topic }), searches: 0, maxTokens: EMB_PLAN_CHIEF.maxTokens, stage: 1 }];
  } else {
    const king = product === "king-directive"; const by = king ? KING_BY : EMB_BY; const chief = king ? KING_CHAIR : EMB_CHIEF; system = king ? KING_SYSTEM : EMB_SYSTEM;
    if (o.mode === "update") {
      compose = (parts) => parts.find((p) => p.id === chief.id)?.text.trim() ?? ""; const ask = o.topic || (king ? "What has changed in the last 30 days that bears on the UAE's decision?" : "What has changed in the last 30 days that the ambassador must know?");
      calls = [{ id: chief.id, agents: [], name: b(chief.en, chief.ar), role: () => (king ? `ROLE: the Decision Chair giving the head of state an UPDATE. Use your search budget on the last 30 days: what has happened in the country and in the UAE's relations with it (politics, economy and finance, security, investment and deals, agreements and visits, the neighbourhood, coverage), dated and sourced. Write: "# Update" (the bottom line in two sentences; what has changed, in order of importance, each with date, source and what it means for the UAE's decision; what did NOT change that was expected; whether the recommended course still stands), "# Indicators" (where the watched indicators stand against their thresholds) and "# What we could not establish". At most 900 words outside the JSON. Special attention: ${ask}. After the markdown write exactly one block of JSON between the tags <directive> and </directive>: {"answer": two to four sentences, "recommendation": whether to hold, change or act now, "confidence": "high", "moderate" or "low", "options": [], "steps": [{"action","owner" (proposed),"when","detail"}], "risks": [{"name","mitigation"}], "needs": [], "follow": []}. Strict JSON.` : embUpdateRole(ask)), searches: 3, maxTokens: 7000, stage: 0 }];
    } else {
      const ids = routed(product, o).map((r) => r.id); const topic = o.topic || (king ? "Advise the head of state on this country." : "Advise the ambassador on this country.");
      compose = (parts) => { const fin = parts.find((p) => p.id === chief.id)?.text.trim() ?? "# Answer\n\n> Not written: the final step did not finish (a cost ceiling or an error stopped the run).\n"; const g = parts.find((p) => p.id === "D")?.text.trim() ?? ""; return `${fin}${g ? `\n\n# ${king ? "Specialist Findings" : "Desk Findings"}\n\n${g}` : ""}`; };
      calls = [{ id: "D", agents: ids, name: names(ids, by), role: () => (king ? kingDirectiveGroupRole(ids, topic) : embDirectiveGroupRole(ids, topic)), searches: 2, maxTokens: 7500, stage: 0 },
        { id: chief.id, agents: [], name: b(chief.en, chief.ar), role: (p) => (king ? kingDirectiveChairRole(p, { topic, mode: o.mode, urgency: o.urgency }) : embDirectiveChiefRole(p, { topic, mode: o.mode, urgency: o.urgency })), searches: 0, maxTokens: 6500, stage: 1 }];
    }
  }
  // Arabic needs roughly a third more output tokens for the same text, and a cut-off answer loses its structured data
  if (o.lang === "ar") calls = calls.map((c) => ({ ...c, maxTokens: Math.round(c.maxTokens * 1.3) }));
  return { product, system, calls, compose, contextLabel: ctxLabel, worst: worst(calls) };
}
/** Costs in US dollars of a full run at the ceiling, from the budgets above; the measured costs are far lower and are printed beside them once a run has been made. */
export const WORST: Record<Product, number> = { "king-council": worst(planFor("king-council", { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls), "king-directive": worst(planFor("king-directive", { focus: "", topic: "x", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls), "emb-intel": worst(planFor("emb-intel", { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls), "emb-plan": worst(planFor("emb-plan", { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls), "emb-directive": worst(planFor("emb-directive", { focus: "", topic: "x", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls) };
