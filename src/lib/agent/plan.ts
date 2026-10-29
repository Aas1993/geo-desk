import { DEPTS, DEPT_BY, FORMAT_BY, FORMATS, type Dept } from "./catalog";
import { DESK_BOUNDARY, TRADECRAFT } from "../desk/core";
import { repairJson } from "../desk/core";

// THE DESK AGENT'S PLAN: the user's request, read once by the router, becomes a short plan: which departments of the platform work on it (at most three), what each is asked, for which country, and in what format the answer comes back. The plan is checked here against the real catalogue, so the agent can only send work where there is a department, and nothing starts until the user clicks Run.
export type PlanStep = { dept: string; why: string; ask: string; mode: "question" | "directive" };
export type AgentPlan = { intent: "platform_help" | "question" | "task"; iso3: string | null; answer: string; steps: PlanStep[]; format: string; length: "short" | "standard" | "long"; notes: string; source: "router" | "fallback" };
export const COMPOSE_EST = 0.08; export const ROUTER_EST = 0.01; export const MAX_STEPS = 3;
export const planEst = (p: AgentPlan) => Math.round((p.steps.reduce((a, s) => a + (DEPT_BY.get(s.dept)?.est ?? 0), 0) + (p.steps.length ? COMPOSE_EST : 0)) * 100) / 100;
const str = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
/** Does a step need a country? Everything but the platform guide does. */
export const needsCountry = (p: AgentPlan) => p.steps.some((s) => DEPT_BY.get(s.dept)?.kind !== "platform");

/** The router's JSON, validated against the catalogue. Anything unknown is dropped; nothing here can add a department. */
export function cleanPlan(raw: unknown, message: string, iso: string | null): AgentPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>; const seen = new Set<string>(); const steps: PlanStep[] = [];
  for (const x of Array.isArray(r.steps) ? r.steps : []) {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>; const id = str(o.dept, 16); const d = DEPT_BY.get(id); if (!d || d.kind === "platform" || seen.has(id)) continue; seen.add(id);
    steps.push({ dept: id, why: str(o.why, 240) || d.bestFor.slice(0, 120), ask: str(o.ask, 600) || message.slice(0, 600), mode: o.mode === "directive" ? "directive" : "question" }); if (steps.length >= MAX_STEPS) break;
  }
  const iso3 = /^[A-Z]{3}$/.test(str(r.iso3, 3).toUpperCase()) && str(r.iso3, 3).toUpperCase() !== "ARE" ? str(r.iso3, 3).toUpperCase() : iso;
  const intent = r.intent === "platform_help" ? "platform_help" : r.intent === "task" ? "task" : "question"; const format = FORMAT_BY.has(str(r.format, 12)) ? str(r.format, 12) : "answer"; const length = r.length === "short" ? "short" : r.length === "long" ? "long" : "standard";
  return { intent: intent === "platform_help" && steps.length ? "question" : intent, iso3, answer: str(r.answer, 1800), steps, format, length, notes: str(r.notes, 300), source: "router" };
}
export function parsePlanText(text: string, message: string, iso: string | null): AgentPlan | null {
  const a = text.indexOf("{"); if (a < 0) return null; const body = text.slice(a, text.lastIndexOf("}") + 1) || text.slice(a);
  for (const t of [body, repairJson(text.slice(a))]) { if (!t) continue; try { return cleanPlan(JSON.parse(t), message, iso); } catch { /* try the repaired text */ } } return null;
}
const KEYS: [string, RegExp][] = [["falcon", /\b(security|defen[cs]e|military|war|conflict|threat|army|missile|terror|armed|border)\b/i], ["mach", /\b(influence|leverage|rival|soft power|china|russia|türkiye|turkey|qatar|saudi|proxy|mediat)/i], ["deep", /\b(invest|financ|debt|market|exposure|sovereign|currency|capital|fund|loan)\w*/i], ["embassy", /\b(embassy|ambassador|mission|consular|trade gap|company|companies|sector|90.day|calendar)/i], ["mofa", /\b(ministry|foreign policy|treaty|agreement|visit|protocol|talking points|diplomatic|summit|un |united nations)/i], ["country", /\b(country brief|background|history|overview|profile|tell me about|everything about)/i]];
/** When the router cannot be reached or returns nothing usable, the keywords of the request pick the department; the head-of-state desk is the default. */
export function fallbackPlan(message: string, iso: string | null): AgentPlan {
  const hit = KEYS.find(([, re]) => re.test(message))?.[0] ?? "king"; const d = DEPT_BY.get(hit)!; const dept = d.kind === "council" || d.kind === "country" ? d : DEPT_BY.get("king")!;
  return { intent: "question", iso3: iso, answer: "", steps: [{ dept: dept.id, why: dept.bestFor.slice(0, 140), ask: message.slice(0, 600), mode: "question" }], format: /\b(bullet|talking point)/i.test(message) ? "bullets" : /\b(memo|one.page)/i.test(message) ? "memo" : /\b(table|compare)/i.test(message) ? "table" : /\b(email|cable|letter)/i.test(message) ? "email" : /\b(timeline|chronolog)/i.test(message) ? "timeline" : "answer", length: "standard", notes: "", source: "fallback" };
}
/** The router's system prompt: the catalogue, the rules and the JSON shape. */
export function routerSystem(countries: string): string {
  const depts = DEPTS.map((d: Dept) => `- ${d.id} (${d.kind}${d.est ? `, about US$${d.est.toFixed(2)}` : ", free"}): ${d.en}. Expertise: ${d.expertise.en}. Best for: ${d.bestFor}.`).join("\n"); const fmts = FORMATS.map((f) => `- ${f.id}: ${f.en}`).join("\n");
  return `You are the routing brain of the UAE Geo Desk, an analysis platform for the Ministry of Foreign Affairs, the head of state's office and the UAE's embassies. A user writes a request. Decide which departments of the platform should work on it, ask each the right question, and pick the format of the answer. You do not answer the request yourself, except a how-to question about the platform (intent platform_help), which you answer in at most 120 words from the catalogue.
Departments:
${depts}
Answer formats:
${fmts}
Rules:
- Choose the fewest departments that cover the request, at most three, and only from the list. A narrow question goes to one of the three desks (king, mofa, embassy), chosen by whose view it needs; a broad or multi-angle question may add the country brief or a council; a factual number goes to "data" only if nothing else is needed (then give no other step).
- Everything is read from the UAE's national-interest, geopolitical and statecraft angle: interests, leverage, the regional system, the great-power contest, risks and proposals. Rewrite the user's request for each department as "ask": a precise question or directive that department can act on, in the user's language.
- mode is "directive" when the user asks for something to be produced or decided (draft, plan, recommend, prepare), "question" when they ask to understand.
- iso3: the country the request is about (ISO 3166 alpha-3 from the list below), or null if none is clear. Never ARE.
- format and length from the user's words (for example "five bullet points" is bullets, short; "a full note" is brief, long); otherwise answer and standard. Put anything else they asked about the form in notes.
- Never route a request for covert action, coercion, targeting of private individuals or anything the boundary rules forbid; answer with intent "platform_help" and a one-sentence refusal in answer.
Countries (iso3 name): ${countries}
Reply with one JSON object and nothing else: {"intent":"platform_help"|"question"|"task","iso3":string|null,"answer":string,"steps":[{"dept":string,"why":string,"ask":string,"mode":"question"|"directive"}],"format":string,"length":"short"|"standard"|"long","notes":string}`;
}
/** The composer's system prompt: it writes the final answer from the departments' texts, in the requested format, without adding facts. */
export const COMPOSE_SYSTEM = `You are the Desk Agent's writer at the UAE Geo Desk. Several departments of the platform have worked on the user's request and their texts are given to you. Write the final answer for the user in the format asked.

${TRADECRAFT}

${DESK_BOUNDARY}

Rules for this task:
- Use only what the departments' texts and the evidence digest say. Add no fact, figure, date or name. Keep fact ids [F12] where the texts have them. Where the departments disagree, say so and say which side the evidence favours; where something is not established, say "not found" rather than fill it.
- Read it through statecraft and geopolitics: the UAE's interests and leverage, the regional system, rivals, risks, and what to do. Moves are proposals for a human decision; nothing is sent to anyone.
- Follow the format rule exactly and the length asked (short about 150 to 250 words, standard about 400 to 700, long about 900 to 1,400, unless the format fixes its own). Write in the language asked.
- Finish with one line: "Prepared from: <departments>" and name them.`;
