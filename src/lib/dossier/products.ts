import { dossierFacts, foresightDossierFacts, investDossierFacts } from "./facts";
import { BUDGET, budgetFor, cleanOptions, optionsKey } from "./options";
import { DESK_BUDGET, DESK_SYSTEM, cleanDeskOptions, deskKey, deskMessage } from "./desk";
import { LEADER_SYSTEM, MINISTER_SYSTEM, userMessage } from "./prompt";
import { CP_BUDGET, CP_SYSTEM, cpKey, cpMessage } from "./counterpart";
import { INV_BUDGET, INV_SYSTEM, invKey, invMessage } from "./investments";
import { FS_BUDGET, cleanFsOptions, fsKey, fsMessage, fsSystem } from "./foresight";
import { isScope, scopeLine } from "../falcon/scopes";
import { scopeFacts } from "../falcon/scope-facts";
import { LAB_BUDGET, LAB_SYSTEM, RT_BUDGET, RT_SYSTEM, cleanLabOptions, cleanRedTeamOptions, labKey, labMessage, rtKey, rtMessage } from "./lab";

// One resolver for every AI product the dossier route can write. Each product says how its request is cleaned, cached, researched and prompted, so the route holds no per-product branches
// and a new product is one entry here.
export const PRODUCT_KINDS = ["minister", "desk", "counterpart", "investments", "foresight", "lab", "redteam"] as const;
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
const SCOPE_KINDS: ProductKind[] = ["foresight", "lab", "redteam"];
export function resolveProduct(body: Record<string, unknown>, iso3: string): Resolved {
  const r = resolveInner(body, iso3);
  if (!isScope(iso3)) return r;
  if (!SCOPE_KINDS.includes(r.kind)) return { ...r, invalid: "This product needs a single country. For the world, a region, a bloc or a sector, use foresight, the scenario lab or the red team." };
  return { ...r, gather: (i) => scopeFacts(i), message: (m) => r.message(m).replace(/\nCountry: [^\n]*/, (line) => `${line}\n${scopeLine(iso3)}`) };
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
  const o = cleanOptions(body);
  if (kind === "counterpart") return { kind, key: cpKey(iso3, o), budget: CP_BUDGET, system: CP_SYSTEM, long: false, gather: dossierFacts, message: (m) => cpMessage({ ...m, options: o }), options: { ...o, kind } };
  if (kind === "investments") return { kind, key: invKey(iso3, o), budget: INV_BUDGET, system: INV_SYSTEM, long: false, gather: investDossierFacts, message: (m) => invMessage({ ...m, options: o }), options: { ...o, kind } };
  return { kind: "minister", key: optionsKey(iso3, o), budget: budgetFor(o), system: o.audience === "leader" ? LEADER_SYSTEM : MINISTER_SYSTEM, long: o.audience !== "leader" && o.depth === "comprehensive", gather: dossierFacts, message: (m) => userMessage({ ...m, options: o }), options: o };
}
export { BUDGET };
