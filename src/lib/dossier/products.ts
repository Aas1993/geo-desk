import { dossierFacts, foresightDossierFacts, investDossierFacts } from "./facts";
import { BUDGET, budgetFor, cleanOptions, optionsKey } from "./options";
import { DESK_BUDGET, DESK_SYSTEM, cleanDeskOptions, deskKey, deskMessage } from "./desk";
import { LEADER_SYSTEM, MINISTER_SYSTEM, userMessage } from "./prompt";
import { CP_BUDGET, CP_SYSTEM, cpKey, cpMessage } from "./counterpart";
import { INV_BUDGET, INV_SYSTEM, invKey, invMessage } from "./investments";
import { FS_BUDGET, cleanFsOptions, fsKey, fsMessage, fsSystem } from "./foresight";
import { isScope, scopeLine } from "../falcon/scopes";
import { BRIEF_BUDGET, BRIEF_SYSTEM, briefKey, briefMessage, cleanBriefOptions, INTERF_BUDGET, SCEN_BUDGET, STRAT_BUDGET, INTERF_SYSTEM, SCEN_SYSTEM, cleanInterfOptions, cleanScenOptions, cleanStratOptions, interfKey, interfMessage, scenKey, scenMessage, stratKey, stratMessage, stratSystem } from "./strategy";
import { strategyDossierFacts, strategyScopeFacts } from "../machiavelli/facts";
import { askLike, refusalFor, REFUSAL_TEXT } from "../machiavelli/guard";
import { scopeFacts } from "../falcon/scope-facts";
import { LAB_BUDGET, LAB_SYSTEM, RT_BUDGET, RT_SYSTEM, cleanLabOptions, cleanRedTeamOptions, labKey, labMessage, rtKey, rtMessage } from "./lab";

// One resolver for every AI product the dossier route can write. Each product says how its request is cleaned, cached, researched and prompted, so the route holds no per-product branches
// and a new product is one entry here.
export const PRODUCT_KINDS = ["minister", "desk", "counterpart", "investments", "foresight", "lab", "redteam", "strategy", "stratscenario", "interference", "countrybrief"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];
export type Gathered = NonNullable<Awaited<ReturnType<typeof dossierFacts>>>;
export type Budget = { maxTokens: number; searches: number; fetches: number; fetchTokens: number };
export type Resolved = {
  kind: ProductKind; key: string; budget: Budget; system: string;
  /** a long run gets more reasoning effort; short ones are kept cheap */
  long: boolean;
  gather: (iso3: string) => Promise<Gathered | null>;
  message: (m: { facts: string; asOf: string; country: string }) => string;
  /** what the finished document reports about how it was made */
  options: unknown;
  /** a product whose input is required beyond the country (the red team needs a product to review) */
  invalid?: string;
};

/** Scopes (the world, a region, a bloc, a sector) are served by the products that make sense without a single counterpart government. */
const SCOPE_KINDS: ProductKind[] = ["foresight", "lab", "redteam", "strategy", "stratscenario", "interference", "countrybrief"];
const STRATEGY_KINDS: ProductKind[] = ["strategy", "stratscenario", "interference", "countrybrief"];
/** The scope guard of the Machiavellian module: a request for takeover, infiltration, proxy support, identity targeting or coercion is refused before any model is called. */
const refused = (texts: string[], lang: "en" | "ar") => { for (const t of texts) { const r = refusalFor(t); if (r) return REFUSAL_TEXT[lang](r); } return undefined; };
export function resolveProduct(body: Record<string, unknown>, iso3: string): Resolved {
  const r = resolveInner(body, iso3);
  if (!isScope(iso3)) return r;
  if (!SCOPE_KINDS.includes(r.kind)) return { ...r, invalid: "This product needs a single country. For the world, a region, a bloc or a sector, use foresight, the scenario lab, the red team or the strategy products." };
  return { ...r, gather: (i) => (STRATEGY_KINDS.includes(r.kind) ? strategyScopeFacts(i) : scopeFacts(i)), message: (m) => r.message(m).replace(/\nCountry: [^\n]*/, (line) => `${line}\n${scopeLine(iso3)}`) };
}
function resolveInner(body: Record<string, unknown>, iso3: string): Resolved {
  const kind = (PRODUCT_KINDS as readonly string[]).includes(String(body.kind)) ? (body.kind as ProductKind) : "minister";
  if (kind === "desk") {
    const o = cleanDeskOptions(body);
    return { kind, key: deskKey(iso3, o), budget: DESK_BUDGET[o.length], system: DESK_SYSTEM, long: o.length === "detailed" || o.length === "exhaustive", gather: dossierFacts, message: (m) => deskMessage({ ...m, options: o }), options: { ...o, kind } };
  }
  if (kind === "foresight") {
    const o = cleanFsOptions(body);
    return { kind, key: fsKey(iso3, o), budget: FS_BUDGET[o.product], system: fsSystem(o.product), long: o.product === "report", gather: foresightDossierFacts, message: (m) => fsMessage({ ...m, options: o }), options: { ...o, kind } };
  }
  if (kind === "lab") {
    const o = cleanLabOptions(body);
    return { kind, key: labKey(iso3, o), budget: LAB_BUDGET[o.depth], system: LAB_SYSTEM, long: o.depth === "deep", gather: foresightDossierFacts, message: (m) => labMessage({ ...m, options: o }), options: { ...o, kind } };
  }
  if (kind === "redteam") {
    const o = cleanRedTeamOptions(body);
    return { kind, key: rtKey(iso3, o), budget: RT_BUDGET, system: RT_SYSTEM, long: false, gather: foresightDossierFacts, message: (m) => rtMessage({ ...m, options: o }), options: { ...o, target: undefined, kind }, invalid: o.target.length < 400 ? "A product to review is required (at least 400 characters)." : undefined };
  }
  if (kind === "strategy") {
    const o = cleanStratOptions(body);
    return { kind, key: stratKey(iso3, o), budget: STRAT_BUDGET[o.mode], system: stratSystem(o.mode), long: o.mode === "dossier", gather: strategyDossierFacts, message: (m) => stratMessage({ ...m, options: o }), options: { ...o, kind }, invalid: refused([o.question, o.notes.positions, o.notes.previous, o.notes.objectives], o.lang) };
  }
  if (kind === "stratscenario") {
    const o = cleanScenOptions(body);
    return { kind, key: scenKey(iso3, o), budget: SCEN_BUDGET, system: SCEN_SYSTEM, long: false, gather: strategyDossierFacts, message: (m) => scenMessage({ ...m, options: o }), options: { ...o, kind }, invalid: refused([o.question, o.shock, o.notes.positions, o.notes.previous, o.notes.objectives], o.lang) };
  }
  if (kind === "countrybrief") {
    const o = cleanBriefOptions(body); const day = new Date().toISOString().slice(0, 10);
    return { kind, key: briefKey(iso3, o, day), budget: BRIEF_BUDGET, system: BRIEF_SYSTEM, long: false, gather: strategyDossierFacts, message: (m) => briefMessage({ ...m, options: o }), options: { ...o, kind }, invalid: refused([o.change, o.notes.positions, o.notes.previous, o.notes.objectives], o.lang) };
  }
  if (kind === "interference") {
    const o = cleanInterfOptions(body);
    return { kind, key: interfKey(iso3, o), budget: INTERF_BUDGET, system: INTERF_SYSTEM, long: false, gather: strategyDossierFacts, message: (m) => interfMessage({ ...m, options: o }), options: { ...o, kind }, invalid: refused([o.title, askLike(o.text) ? o.text : "", o.notes.positions, o.notes.previous, o.notes.objectives], o.lang) };
  }
  const o = cleanOptions(body);
  if (kind === "counterpart") return { kind, key: cpKey(iso3, o), budget: CP_BUDGET, system: CP_SYSTEM, long: false, gather: dossierFacts, message: (m) => cpMessage({ ...m, options: o }), options: { ...o, kind } };
  if (kind === "investments") return { kind, key: invKey(iso3, o), budget: INV_BUDGET, system: INV_SYSTEM, long: false, gather: investDossierFacts, message: (m) => invMessage({ ...m, options: o }), options: { ...o, kind } };
  return { kind: "minister", key: optionsKey(iso3, o), budget: budgetFor(o), system: o.audience === "leader" ? LEADER_SYSTEM : MINISTER_SYSTEM, long: o.audience !== "leader" && o.depth === "comprehensive", gather: dossierFacts, message: (m) => userMessage({ ...m, options: o }), options: o };
}
export { BUDGET };
