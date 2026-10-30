import { DEPTS, DEPT_BY, FORMAT_BY, FORMATS, type Dept } from "./catalog";
import { DESK_BOUNDARY, TRADECRAFT } from "../desk/core";
import { repairJson } from "../desk/core";

// THE DESK AGENT'S PLAN: the user's request, read once by the router, becomes a short plan: which departments of the platform work on it (at most three), what each is asked, for which country, and in what format the answer comes back. The plan is checked here against the real catalogue, so the agent can only send work where there is a department, and nothing starts until the user clicks Run.
export type PlanStep = { dept: string; why: string; ask: string; mode: "question" | "directive" };
export type AgentPlan = { intent: "platform_help" | "question" | "task"; iso3: string | null; answer: string; steps: PlanStep[]; format: string; length: "short" | "standard" | "long"; notes: string; source: "router" | "fallback"; countries?: string[] };
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

// ---- COMPARE: a plan that fans out per country. The Compare tab sends two to four countries; the router picks one or two departments (a desk directive, the country brief or a council) to be run once for each country, so the answers can be set side by side; the free held-data table is always handed to the comparative writer as well. A fan-out is at most MAX_FAN_RUNS runs in all, every run keeps its own US$1.00 ceiling in its own route, and nothing starts before the user confirms the total in the page.
export const MAX_FAN_RUNS = 4; export const FAN_RUN_CAP_USD = 1; export const COMPARE_COMPOSE_EST = 0.15; export const COMPARE_COMPOSE_CAP = 0.25; export const MIN_FAN = 2;
/** Departments that can be run once per country: a desk directive, the country brief or a council. The free data and the platform guide are not runs. */
export const FAN_DEPTS = DEPTS.filter((d) => d.kind === "directive" || d.kind === "country" || d.kind === "council");
export type FanRun = { dept: string; iso: string };
/** How many departments may fan out over n countries so that the runs stay within MAX_FAN_RUNS. */
export const maxFanSteps = (n: number) => Math.max(0, Math.min(MAX_STEPS, Math.floor(MAX_FAN_RUNS / Math.max(1, n))));
/** The runs of a plan: every step for every country of the plan (or the one country of an ordinary plan), never more than MAX_FAN_RUNS. */
export function fanRuns(p: Pick<AgentPlan, "steps" | "countries" | "iso3">): FanRun[] { const isos = p.countries?.length ? p.countries : p.iso3 ? [p.iso3] : []; const out: FanRun[] = []; for (const s of p.steps) for (const iso of isos) out.push({ dept: s.dept, iso }); return out.slice(0, MAX_FAN_RUNS); }
const cents = (n: number) => Math.round(n * 100) / 100;
/** The expected cost of a compare plan: each run's estimate (a product already on file and fresh costs nothing) plus the comparative writer. */
export const fanEst = (p: Pick<AgentPlan, "steps" | "countries" | "iso3">, onFile: (r: FanRun) => boolean = () => false) => cents(fanRuns(p).reduce((a, r) => a + (onFile(r) ? 0 : DEPT_BY.get(r.dept)?.est ?? 0), 0) + COMPARE_COMPOSE_EST);
/** The worst case the user is asked to accept: every run that is not on file at its US$1.00 ceiling, plus the writer's cap. */
export const fanCeiling = (p: Pick<AgentPlan, "steps" | "countries" | "iso3">, onFile: (r: FanRun) => boolean = () => false) => cents(fanRuns(p).filter((r) => !onFile(r)).length * FAN_RUN_CAP_USD + COMPARE_COMPOSE_CAP);
/** The question one run is asked: the plan's ask for the step, with the country named and the instruction to keep to the same criteria as the other countries (the desk routes read at most 600 characters). */
export const fanAsk = (s: PlanStep, name: string, n: number) => `${s.ask.slice(0, 400)} (One of ${n} countries being compared: answer for ${name} only, on the same criteria as the others.)`.slice(0, 600);
/** Cuts at a word, not in the middle of one, and marks the cut. */
const cutWord = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, Math.max(t.lastIndexOf(" ", n - 1), Math.floor(n * 0.6)))}…`);
const isoList = (xs: unknown): string[] => [...new Set((Array.isArray(xs) ? xs : []).map((x) => String(x ?? "").toUpperCase()).filter((x) => /^[A-Z]{3}$/.test(x) && x !== "ARE"))].slice(0, MAX_FAN_RUNS);
export const cleanCountries = isoList;
/** The router's JSON for a comparison, validated: only departments that can be run per country, each once, no more than the fan-out limit allows, an ask short enough to carry the per-country suffix. An empty plan is valid (the answer is written from the held data alone). */
export function cleanComparePlan(raw: unknown, message: string, isos: string[]): AgentPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>; const list = isoList(isos); const room = maxFanSteps(list.length); const seen = new Set<string>(); const steps: PlanStep[] = [];
  for (const x of Array.isArray(r.steps) ? r.steps : []) { if (steps.length >= room) break; const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>; const id = str(o.dept, 16); const d = FAN_DEPTS.find((y) => y.id === id); if (!d || seen.has(id)) continue; seen.add(id); steps.push({ dept: id, why: cutWord(str(o.why, 600), 240) || d.bestFor.slice(0, 120), ask: cutWord(str(o.ask, 1200), 400) || cutWord(message, 400), mode: o.mode === "directive" ? "directive" : "question" }); }
  const format = FORMAT_BY.has(str(r.format, 12)) ? str(r.format, 12) : "answer"; const length = r.length === "short" ? "short" : r.length === "long" ? "long" : "standard";
  return { intent: r.intent === "task" ? "task" : "question", iso3: null, countries: list, answer: "", steps, format, length, notes: str(r.notes, 300), source: "router" };
}
export function parseComparePlanText(text: string, message: string, isos: string[]): AgentPlan | null {
  const a = text.indexOf("{"); if (a < 0) return null; const body = text.slice(a, text.lastIndexOf("}") + 1) || text.slice(a);
  for (const t of [body, repairJson(text.slice(a))]) { if (!t) continue; try { return cleanComparePlan(JSON.parse(t), message, isos); } catch { /* try the repaired text */ } } return null;
}
/** When the router cannot be reached: one run per country of the department the keywords point to (a desk directive unless the keywords name the country brief or a council), the head-of-state desk by default. */
export function fallbackComparePlan(message: string, isos: string[]): AgentPlan {
  const list = isoList(isos); const hit = KEYS.find(([, re]) => re.test(message))?.[0] ?? "king"; const d = FAN_DEPTS.find((x) => x.id === hit) ?? DEPT_BY.get("king")!;
  return { intent: "question", iso3: null, countries: list, answer: "", steps: list.length && maxFanSteps(list.length) ? [{ dept: d.id, why: d.bestFor.slice(0, 140), ask: message.slice(0, 400), mode: "question" }] : [], format: /\b(bullet|talking point)/i.test(message) ? "bullets" : /\b(memo|one.page)/i.test(message) ? "memo" : /\b(table|compare|side by side)/i.test(message) ? "table" : /\b(briefing|brief note|note)/i.test(message) ? "brief" : "answer", length: "standard", notes: "", source: "fallback" };
}
/** The comparison router's system prompt: the departments that can be run per country, the rules and the JSON shape. */
export function compareRouterSystem(countries: string): string {
  const depts = FAN_DEPTS.map((d: Dept) => `- ${d.id} (${d.kind}, about US$${d.est.toFixed(2)} per country): ${d.en}. Expertise: ${d.expertise.en}. Best for: ${d.bestFor}.`).join("\n"); const fmts = FORMATS.map((f) => `- ${f.id}: ${f.en}`).join("\n");
  return `You are the routing brain of the UAE Geo Desk, an analysis platform for the Ministry of Foreign Affairs, the head of state's office and the UAE's embassies. A user has selected two to four countries and written a comparative question or directive about them. The platform already holds the countries' data side by side (free); a comparative writer will write the final answer from that table and from what the departments you choose write. Decide which department(s) run once for EACH country, what each is asked, and the format of the final answer.
Departments that can run per country:
${depts}
Answer formats:
${fmts}
Rules:
- Choose at most ${MAX_STEPS} departments and only from the list; but the runs (departments times countries) may not exceed ${MAX_FAN_RUNS} in all, so with three or four countries choose one department, with two countries at most two. Prefer the cheapest that answers the question: a desk directive (king, mofa or embassy) for a narrow question, the country brief only when the user wants a broad picture of each country. The held comparison already covers fourteen angles (political and governance, diplomatic and friends, military at policy level, national security, economic, trade and investment, logistics and corridors, energy, technology and space, soft power, the influence ledger, legal, climate, information), six Case File lenses, a ranking by purpose and a one-line playbook per country: ask a department only for what these cannot say. Return no steps at all when the held data side by side already answers the question (for example a ranking on trade, flights or the partnership index): then the writer answers from the data alone.
- "ask" is one question or directive, in the user's language, written WITHOUT naming a country (the platform adds the country when it runs it): at most 350 characters, and it must be answerable for one country on its own and on the same criteria for each, so the answers can be compared. Read everything from the UAE's national-interest, geopolitical and statecraft angle: interests, leverage, instruments, the regional system, rivals, risks and proposals.
- mode is "directive" when the user asks for something to be produced or decided, "question" when they ask to understand.
- format and length from the user's words (for example "a table" is table, "a memo" is memo, "a briefing note" is brief; "five bullet points" is bullets, short); otherwise answer and standard. Put anything else they asked about the form in notes.
- Never route a request for covert action, coercion, targeting of private individuals or anything the boundary rules forbid; return no steps and put a one-sentence refusal in notes.
Selected countries (iso3 name): ${countries}
Reply with one JSON object and nothing else: {"intent":"question"|"task","steps":[{"dept":string,"why":string,"ask":string,"mode":"question"|"directive"}],"format":string,"length":"short"|"standard"|"long","notes":string}`;
}
/** The comparative writer's system prompt: it compares and contrasts from the held-data table and the departments' texts, labels proposals and adds no fact. */
export const COMPARE_COMPOSE_SYSTEM = `You are the Desk Agent's comparative writer at the UAE Geo Desk. The user asked a comparative question about two to four countries. You are given (1) the held data of the countries side by side, from the platform's datasets; (2) a rule-built pack: the one-line UAE statecraft playbook of each country, the ranking by purpose with the user's weights and what each criterion contributes, a rule-built sequence to engage the countries, what each of the fourteen angle scores is made of, and the UAE's position in each country; and (3) where departments were run, one text per department and country. Write the final answer in the format asked.

${TRADECRAFT}

${DESK_BOUNDARY}

Rules for this task:
- Use only what the held-data table and the departments' texts say. Add no fact, figure, date or name. A figure marked "not held" stays "not held"; never fill it. Call each figure by the name the table gives it (a count of agreements stays "agreements", never "instruments"). Keep fact ids [F12] where the texts have them.
- Answer the user's actual question first (which country, how, why), then compare and contrast: where the countries are alike, where they differ, who leads on what (use the table's own leaders), and how the departments' views of each country line up. If no department was run for a country, or one failed, say that country is read from the held data only. Where texts disagree, say so and say which side the evidence favours.
- Read it through UAE statecraft and geopolitics: interests, leverage and instruments, the regional system, rivals, risks and sequencing. Do not rank countries on a figure the table does not hold.
- Cover the angles the question touches out of the fourteen (political and governance; diplomatic standing, friends and blocs; military and hard power at policy level; national security; economic and financial; trade and investment; logistics, corridors and maritime; energy and resources; technology, digital and space; soft power and society; the influence ledger against rivals; legal and normative; climate; information and narrative). An angle marked GAP, or a figure "not held", is stated as a gap with what would close it; technology and space is thin, so say "not held" unless a department text found it. Never fill a gap.
- Include in every format (compactly when the format is short): (a) for each country the one-line UAE statecraft playbook (course, top instruments, corridor and trade play, friends and coalition move, first 90 days), taken from the pack and the department texts; (b) the ranking by the purpose in the pack, saying the weights are the user's and which criteria drive it; (c) a recommended sequence with an implementation plan: for each step an owner (a role), a date window, a measure and a gate, each step starting "Proposal:". Start from the pack's sequence and change its order only for a reason the evidence gives; use only the pack's windows and dates.
- Label every recommendation or move with the word "Proposal:" at the start of its line or bullet. Proposals are for a human decision; nothing is sent to anyone. Do not label analysis as a proposal.
- Follow the format rule exactly and the length asked (short about 250 to 400 words, standard about 600 to 1,000, long about 1,300 to 2,200, unless the format fixes its own). Write in the language asked.
- Finish with one line: "Prepared from: held data; <the departments and countries>" and name them.`;
