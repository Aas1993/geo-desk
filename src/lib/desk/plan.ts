import type { B } from "../case/core";
import { PRODUCTS, routeTopic, worstOf, type DeskOptions, type Product } from "./core";
import { MOFA_AGENTS, MOFA_BY, MOFA_CHIEF, MOFA_GROUPS, MOFA_SYSTEM, composeMofa, mofaChiefRole, mofaDirectiveChiefRole, mofaDirectiveGroupRole, mofaGroupRole, mofaUpdateRole } from "./mofa";
import { INTEL_MARK } from "./context";
import { AUDITORS, SUBJECTS, auditorRole } from "../review/pair";
import { EMB_AGENTS, EMB_BY, EMB_CHIEF, EMB_INTEL_GROUPS, EMB_PLAN_CHIEF, EMB_PLAN_GROUPS, EMB_SYSTEM, composeIntel, composePlan, embDirectiveChiefRole, embDirectiveGroupRole, embIntelChiefRole, embIntelGroupRole, embPlanChiefRole, embPlanGroupRole, embUpdateRole } from "./embassy";
import { PRESIDENT_BY, PRESIDENT_CHIEF, PRESIDENT_GROUPS, PRESIDENT_SYSTEM, composePresident, presidentChiefRole, presidentGroupRole } from "./president";
import { CHALLENGE_BY, CHALLENGE_CHIEF, CHALLENGE_GROUPS, CHALLENGE_SYSTEM, challengeChiefRole, challengeGroupRole, composeChallenge, idsIn } from "./challenge";
import { COUNTRY_BY, COUNTRY_CHIEF, COUNTRY_GROUPS, COUNTRY_SYSTEM, composeCountry, countryChiefRole, countryGroupRole } from "./country";
import { ANGLE_SCORES_RULE, ANGLE_SCORE_PRODUCTS } from "../roundtable/model";
import { KING_AGENTS, KING_BY, KING_CHAIR, KING_GROUPS, KING_SYSTEM, composeKing, kingChairRole, kingDirectiveChairRole, kingDirectiveGroupRole, kingGroupRole } from "./king";

// One description of every paid desk run, shared by the route that executes it and the screens that show what it costs and what it does. A run is a list of calls: the first call of stage 0 goes alone so the shared evidence is cached before the others read it, the rest of stage 0 go in parallel, and the final call (the Decision Chair or the Chief of Staff) writes the product from what they produced.
export type Call = { id: string; agents: string[]; name: B; role: (prior: Record<string, string>) => string; searches: number; /** pages the call may read in full (a report, a filing): 0 unless a product asks for it */ fetches?: number; maxTokens: number; stage: 0 | 1 | 2 };
export type DeskPlan = { product: Product; system: string; calls: Call[]; compose: (parts: { id: string; text: string }[]) => string; contextLabel: string; worst: number; /** the share of the final writer's worst case that the earlier calls must leave (default 1.15 for a writer that pays for a cold cache) */ finalReserve?: number };
const b = (en: string, ar: string): B => ({ en, ar });
const names = (ids: string[], by: Map<string, { en: string; ar: string }>): B => ({ en: ids.map((i) => by.get(i)?.en ?? i).join(" · "), ar: ids.map((i) => by.get(i)?.ar ?? i).join(" · ") });
const worst = (calls: Call[]) => Math.round(calls.reduce((a, c) => a + worstOf(c.maxTokens, c.searches), 0) * 1000) / 1000;
/** The two independent auditors that close a product: both read the writer's text, neither writes any of it. */
const auditCalls = (subject: string, from: string): Call[] => AUDITORS.map((a) => ({ id: a.id, agents: [], name: b(a.en, a.ar), role: (p) => auditorRole(a.lens, SUBJECTS[subject], p[from] ?? ""), searches: a.searches, maxTokens: a.maxTokens, stage: 2 }));
const KING_FALLBACK = ["geo", "polity", "invest", "precedent"]; const EMB_FALLBACK = ["pol", "econ", "invest", "bilateral"]; const MOFA_FALLBACK = ["planning", "political", "econ", "chiefs"];
/** The specialists a question or directive goes to: the ones the person chose, else the ones whose field the topic touches. */
export function routed(product: Product, o: DeskOptions): { id: string; why: string }[] {
  const roster = product === "king-directive" ? KING_AGENTS : product === "mofa-directive" ? MOFA_AGENTS : EMB_AGENTS; const chosen = o.agents.filter((id) => roster.some((a) => a.id === id));
  if (chosen.length) return chosen.slice(0, 4).map((id) => ({ id, why: "chosen" }));
  return routeTopic(o.topic, roster, product === "king-directive" ? KING_FALLBACK : product === "mofa-directive" ? MOFA_FALLBACK : EMB_FALLBACK).map((r) => ({ id: r.agent.id, why: r.why }));
}
export function planFor(product: Product, o: DeskOptions, context: string): DeskPlan {
  const ctxLabel = product === "council-challenge" ? "The digests of the councils on file (course, headline, risks, recommendations, auditors' verdicts and the readings of the country), with the rule-built baseline" : product === "president-brief" ? "The Country Brief, the Strategic Council, the Ministry's priorities, the ambassador's brief and THE KING's brief on file" : product === "country-full" ? "The desk officer's brief, the Strategic Council, the Ministry's priorities, the ambassador's brief and other products on file" : product.startsWith("king") ? "Strategic Council, the ambassador's work and other products on file" : product.startsWith("mofa") ? "Strategic Council, the head of state's council, the ambassador's work and other products on file" : "Strategic Council, the Ministry's priorities, the head of state's council and other products on file";
  let calls: Call[]; let system: string; let compose: DeskPlan["compose"];
  if (product === "council-challenge") {
    system = CHALLENGE_SYSTEM; compose = composeChallenge; const ids = idsIn(context);
    calls = [...CHALLENGE_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, CHALLENGE_BY), role: () => challengeGroupRole(g, o.topic), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(CHALLENGE_CHIEF.en, CHALLENGE_CHIEF.ar), role: (p) => challengeChiefRole(p, { topic: o.topic, ids }), searches: 1, maxTokens: CHALLENGE_CHIEF.maxTokens, stage: 1 }, ...auditCalls("council-challenge", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))]; // the writer and both auditors carry the search tool (the writer is told not to use it) so they read the sittings' cached evidence instead of one of them paying to write it again
  } else if (product === "president-brief") {
    system = PRESIDENT_SYSTEM; compose = composePresident;
    calls = [...PRESIDENT_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, PRESIDENT_BY), role: () => presidentGroupRole(g, o.topic), searches: g.searches, fetches: g.id === "P1" ? 1 : 0, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(PRESIDENT_CHIEF.en, PRESIDENT_CHIEF.ar), role: (p) => presidentChiefRole(p, { topic: o.topic }), searches: 1, maxTokens: PRESIDENT_CHIEF.maxTokens, stage: 1 }, ...auditCalls("president-brief", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))];
  } else if (product === "country-full") {
    system = COUNTRY_SYSTEM; compose = composeCountry;
    calls = [...COUNTRY_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, COUNTRY_BY), role: () => countryGroupRole(g), searches: g.searches, fetches: g.id === "C2" ? 1 : 0, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(COUNTRY_CHIEF.en, COUNTRY_CHIEF.ar), role: (p) => countryChiefRole(p), searches: 1, maxTokens: COUNTRY_CHIEF.maxTokens, stage: 1 }, ...auditCalls("country-full", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))]; // the writer and both auditors carry the search tool (the writer is told not to use it, and the auditors keep their own budgets), so all of them read the sittings' cached evidence instead of one of them paying to write it again
  } else if (product === "king-council") {
    system = KING_SYSTEM; compose = composeKing;
    calls = [...KING_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, KING_BY), role: () => kingGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chair", agents: [], name: b(KING_CHAIR.en, KING_CHAIR.ar), role: (p) => kingChairRole(p, { topic: o.topic }), searches: 0, maxTokens: KING_CHAIR.maxTokens, stage: 1 }, ...auditCalls("king-council", "chair")];
  } else if (product === "emb-intel") {
    system = EMB_SYSTEM; compose = composeIntel;
    calls = [...EMB_INTEL_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, EMB_BY), role: () => embIntelGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(EMB_CHIEF.en, EMB_CHIEF.ar), role: (p) => embIntelChiefRole(p, { topic: o.topic }), searches: 1, maxTokens: EMB_CHIEF.maxTokens, stage: 1 }, ...auditCalls("emb-intel", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))]; // the chief and both auditors carry the search tool (the chief is told not to use it) so they read the sittings' cached evidence instead of paying to write it again
  } else if (product === "emb-plan") {
    system = EMB_SYSTEM; compose = composePlan; const at = context.indexOf(INTEL_MARK); const intel = at >= 0 ? context.slice(at + INTEL_MARK.length) : "";
    calls = [...EMB_PLAN_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, EMB_BY), role: () => embPlanGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(EMB_PLAN_CHIEF.en, EMB_PLAN_CHIEF.ar), role: (p) => embPlanChiefRole(p, intel, { topic: o.topic }), searches: 1, maxTokens: EMB_PLAN_CHIEF.maxTokens, stage: 1 }, ...auditCalls("emb-plan", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))];
  } else if (product === "mofa-council") {
    system = MOFA_SYSTEM; compose = composeMofa;
    calls = [...MOFA_GROUPS.map((g): Call => ({ id: g.id, agents: g.agents, name: names(g.agents, MOFA_BY), role: () => mofaGroupRole(g), searches: g.searches, maxTokens: g.maxTokens, stage: 0 })),
      { id: "chief", agents: [], name: b(MOFA_CHIEF.en, MOFA_CHIEF.ar), role: (p) => mofaChiefRole(p, { topic: o.topic }), searches: 1, maxTokens: MOFA_CHIEF.maxTokens, stage: 1 }, ...auditCalls("mofa", "chief").map((c) => ({ ...c, searches: Math.max(c.searches, 1) }))];
  } else {
    const king = product === "king-directive"; const mofa = product === "mofa-directive"; const by = king ? KING_BY : mofa ? MOFA_BY : EMB_BY; const chief = king ? KING_CHAIR : mofa ? MOFA_CHIEF : EMB_CHIEF; system = king ? KING_SYSTEM : mofa ? MOFA_SYSTEM : EMB_SYSTEM; const who = king ? "head of state" : mofa ? "Minister" : "ambassador";
    if (o.mode === "update") {
      compose = (parts) => parts.find((p) => p.id === chief.id)?.text.trim() ?? ""; const ask = o.topic || (king ? "What has changed in the last 30 days that bears on the UAE's decision?" : mofa ? "What has changed in the last 30 days that the Ministry must know?" : "What has changed in the last 30 days that the ambassador must know?");
      calls = [{ id: chief.id, agents: [], name: b(chief.en, chief.ar), role: () => (king ? `ROLE: the Decision Chair giving the head of state an UPDATE. Use your search budget on the last 30 days: what has happened in the country and in the UAE's relations with it (politics, economy and finance, security, investment and deals, agreements and visits, the neighbourhood, coverage), dated and sourced. Write: "# Update" (the bottom line in two sentences; what has changed, in order of importance, each with date, source and what it means for the UAE's decision; what did NOT change that was expected; whether the recommended course still stands), "# Indicators" (where the watched indicators stand against their thresholds) and "# What we could not establish". At most 900 words outside the JSON. Special attention: ${ask}. After the markdown write exactly one block of JSON between the tags <directive> and </directive>: {"answer": two to four sentences, "recommendation": whether to hold, change or act now, "confidence": "high", "moderate" or "low", "options": [], "steps": [{"action","owner" (proposed),"when","detail"}], "risks": [{"name","mitigation"}], "needs": [], "follow": []}. Strict JSON.` : mofa ? mofaUpdateRole(ask) : embUpdateRole(ask)), searches: 3, maxTokens: 7000, stage: 0 }];
    } else {
      const ids = routed(product, o).map((r) => r.id); const topic = o.topic || `Advise the ${who} on this country.`;
      compose = (parts) => { const fin = parts.find((p) => p.id === chief.id)?.text.trim() ?? "# Answer\n\n> Not written: the final step did not finish (a cost ceiling or an error stopped the run).\n"; const g = parts.find((p) => p.id === "D")?.text.trim() ?? ""; return `${fin}${g ? `\n\n# ${king ? "Specialist Findings" : mofa ? "Role Findings" : "Desk Findings"}\n\n${g}` : ""}`; };
      calls = [{ id: "D", agents: ids, name: names(ids, by), role: () => (king ? kingDirectiveGroupRole(ids, topic) : mofa ? mofaDirectiveGroupRole(ids, topic) : embDirectiveGroupRole(ids, topic)), searches: 2, maxTokens: 7500, stage: 0 },
        { id: chief.id, agents: [], name: b(chief.en, chief.ar), role: (p) => (king ? kingDirectiveChairRole(p, { topic, mode: o.mode, urgency: o.urgency }) : mofa ? mofaDirectiveChiefRole(p, { topic, mode: o.mode, urgency: o.urgency }) : embDirectiveChiefRole(p, { topic, mode: o.mode, urgency: o.urgency })), searches: 0, maxTokens: 6500, stage: 1 }];
    }
  }
  // the council states its own score of each angle it addressed, so the Round Table can compare real numbers instead of reading the tone of the text (src/lib/roundtable/read.ts reads it back)
  if (ANGLE_SCORE_PRODUCTS.has(product)) calls = calls.map((c) => (c.stage === 1 ? { ...c, role: (p: Record<string, string>) => `${c.role(p)}${ANGLE_SCORES_RULE}` } : c));
  // Arabic needs roughly a third more output tokens for the same text, and a cut-off answer loses its structured data
  if (o.lang === "ar") calls = calls.map((c) => ({ ...c, maxTokens: Math.round(c.maxTokens * 1.3) }));
  return { product, system, calls, compose, contextLabel: ctxLabel, worst: worst(calls), ...(product === "country-full" ? { finalReserve: 0.7 } : product === "president-brief" || product === "council-challenge" ? { finalReserve: 0.85 } : product === "emb-intel" || product === "emb-plan" || product === "mofa-council" ? { finalReserve: 0.8 } : {}) };
}
/** Costs in US dollars of a full run at the ceiling, from the budgets above; the measured costs are far lower and are printed beside them once a run has been made. */
export const WORST = Object.fromEntries(PRODUCTS.map((p) => [p, worst(planFor(p, { focus: "", topic: p.endsWith("directive") ? "x" : "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls)])) as Record<Product, number>;
