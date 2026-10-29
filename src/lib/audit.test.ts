// The platform audit as a test: every paid agent's standing instructions must meet one bar, every module that produces a decision, strategy or plan must have an independent checker, and no module may brief its agents to a lower source standard than another. A new agent or prompt that falls below the bar fails here.
import assert from "node:assert/strict";
import { ARCH_AGENTS, ARCH_SYSTEM } from "./case/architect";
import { CASE_SYSTEM } from "./case/council";
import { SEATS as CASE_SEATS } from "./case/seats";
import { DCOUNCIL_SYSTEM, DAGENTS } from "./deep/council";
import { ROLES } from "./deep/routing";
import { AGENTS as FALCON } from "./falcon/council";
import { SYSTEM as DOSSIER_SYSTEM } from "./dossier/prompt";
import { SCOUNCIL_SYSTEM, SAGENTS } from "./machiavelli/council";
import { SEATS as MACH_SEATS } from "./machiavelli/seats";
import { KING_AGENTS, KING_SYSTEM } from "./desk/king";
import { EMB_AGENTS, EMB_SYSTEM } from "./desk/embassy";
import { MOFA_AGENTS, MOFA_SYSTEM } from "./desk/mofa";
import { EXPERT_STANDARD } from "./sources";
import { TRIAD } from "./desk/triad";
import { AGENTS as FALCON_AGENTS, COUNCIL_SYSTEM as FALCON_SYSTEM } from "./falcon/council";
import { SEATS as CASE_SEATS_ALL } from "./case/seats";
import { SEATS as MACH_SEATS_ALL } from "./machiavelli/seats";
import { ROLES as DEEP_ROLES } from "./deep/routing";
import { SOURCE_PLAN } from "./sources";
import { planFor } from "./desk/plan";

const BAR: Record<string, RegExp> = {
  "names the UAE's interest": /UAE/, "cites fact ids": /fact id|\[F\d|F12/i, "names think tanks": /Chatham House|Carnegie|CSIS|IISS|Crisis Group/, "names news and wire reporting": /Reuters|Bloomberg|Financial Times/, "official and primary sources first": /official|primary/i,
  "published intelligence-community assessments as public documents": /ODNI|National Intelligence Council|World Factbook/, "states the social-media limit": /no compliant access/i, "uses the UAE's own strategy and precedents": /Principles of the 50|precedent/i,
  "likelihood bands with separate confidence": /almost certain/i, "assumptions and alternatives": /assumption/i, "dissent preserved": /dissent|competing hypothes/i, "indicators with thresholds": /indicator|threshold|tripwire/i,
  "boundary: no covert action, proxies or coercion": /covert|proxy|coerc/i, "costs not invented": /not estimated|never invent|do not invent/i, "collection gaps stated": /gap|not found after searching|could not establish/i,
};
const PROMPTS: Record<string, string> = { "Strategic Council (Case File)": CASE_SYSTEM, "Statecraft Architect": ARCH_SYSTEM, "Strategy Council (Machiavellian)": SCOUNCIL_SYSTEM, "Deep analyst team": DCOUNCIL_SYSTEM, "Falcon Council and dossiers": DOSSIER_SYSTEM, "THE KING": KING_SYSTEM, "Embassy council": EMB_SYSTEM, "The Ministry's council": MOFA_SYSTEM, "Falcon Council": FALCON_SYSTEM };
for (const [name, text] of Object.entries(PROMPTS)) for (const [check, re] of Object.entries(BAR)) assert.ok(re.test(text), `${name} does not meet the bar: it ${check}`);
for (const [name, text] of Object.entries(PROMPTS)) assert.ok(text.includes(SOURCE_PLAN.slice(0, 120)), `${name} carries the shared source plan`);

// one roster, no repeated ids, every agent named in both languages
const rosters: Record<string, { id: string; en: string; ar: string }[]> = { Falcon: FALCON, "Case seats": CASE_SEATS as never, Architect: ARCH_AGENTS, "Machiavellian council": SAGENTS as never, "Machiavellian seats": MACH_SEATS as never, "Deep team": DAGENTS as never, "Deep roles": ROLES as never, KING: KING_AGENTS, Embassy: EMB_AGENTS, Ministry: MOFA_AGENTS as never };
for (const [n, r] of Object.entries(rosters)) { assert.ok(r.length >= 6, `${n} has a real roster`); assert.equal(new Set(r.map((x) => x.id)).size, r.length, `${n}: agent ids are unique`); assert.equal(new Set(r.map((x) => x.en)).size, r.length, `${n}: agent names are unique`); for (const a of r) assert.ok(a.en && a.ar, `${n}/${a.id} is named in English and Arabic`); }

// checks and balances: every module that produces a decision, a strategy or a plan has an independent checker (a verifier, a red team or an auditor) that is not its writer
const has = (r: { id: string; en: string }[], re: RegExp) => r.some((x) => re.test(`${x.id} ${x.en}`));
assert.ok(has(FALCON, /verifier/) && has(FALCON, /redteam|red team/), "Falcon Council: verifier and red team"); assert.ok(has(CASE_SEATS as never, /Red-Team/) , "Case Council: red team seat");
assert.ok(has(SAGENTS as never, /challenger/) && has(SAGENTS as never, /verifier/), "Machiavellian council: challenger and verifier"); assert.ok(has(DAGENTS as never, /challenger/) && has(DAGENTS as never, /verifier/), "Deep team: challenger and verifier");
assert.ok(has(ARCH_AGENTS, /revs/) && has(ARCH_AGENTS, /revr/), "Architect: the Statecraft Auditor and the Reality Auditor review the strategy before it is compiled");
for (const [name, r] of [["Falcon", FALCON], ["Case seats", CASE_SEATS as never], ["Machiavellian council", SAGENTS as never], ["Deep team", DAGENTS as never]] as [string, { id: string }[]][]) assert.ok(!r.some((x) => /^rev[sr]$/.test(x.id)), `${name}: the auditor ids are reserved for the pair, which is added by the route`);
assert.ok(has(KING_AGENTS, /redteam|Red Team/), "THE KING: a red-team specialist"); for (const p of ["king-council", "emb-intel", "emb-plan"] as const) { const calls = planFor(p, { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls; const last = calls.slice(-2); assert.deepEqual(last.map((c) => c.id), ["revs", "revr"], `${p}: the Statecraft Auditor and the Reality Auditor run last`); assert.ok(last.every((c) => c.stage === 2 && c.maxTokens >= 2500 && c.agents.length === 0), `${p}: both auditors are independent of every writer`); assert.ok(calls.slice(0, -2).every((c) => !/^rev/.test(c.id)), `${p}: no writer is an auditor`); }
// the reviewers' own instructions
assert.ok(/did not (take part|design|write)/.test(planFor("king-council", { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls[6].role({})) && /did not take part/.test(planFor("king-council", { focus: "", topic: "", mode: "question", urgency: "routine", agents: [], lang: "en", useContext: true }, "").calls[7].role({})), "both auditors are told they are independent");
// every agent is a PhD-level subject-matter expert who writes straight to the point, with backing, for the UAE's national interest: one standard, in every prompt
assert.ok(/PhD level/.test(EXPERT_STANDARD) && /national interest of the United Arab Emirates comes first/.test(EXPERT_STANDARD) && /Straight to the point/.test(EXPERT_STANDARD) && /fact id/.test(EXPERT_STANDARD) && /never invent/.test(EXPERT_STANDARD));
for (const [name, text] of Object.entries(PROMPTS)) assert.ok(text.includes(EXPERT_STANDARD), `${name} carries the expert standard`);
// a National Security, an Energy Security and a Food Security expert sit on every council
assert.equal(TRIAD.length, 3); for (const x of TRIAD) assert.ok(/PhD/.test(x.title.en) && x.mandate.length > 250 && x.questions.length === 4 && x.sources.length === 3 && /UAE/.test(x.mandate) && !/covert|proxy/.test(x.mandate.replace(/no covert|nothing operational/g, "")), `${x.id} is a briefed expert`);
const has3 = (ids: string[], names: [string, string, string]) => names.every((n) => ids.includes(n));
assert.ok(has3(KING_AGENTS.map((a) => a.id), ["natsec", "energysec", "foodsec"]), "THE KING has the triad"); assert.ok(has3(EMB_AGENTS.map((a) => a.id), ["natsec", "energysec", "foodsec"]), "the embassy has the triad"); assert.ok(has3(MOFA_AGENTS.map((a) => a.id), ["natsec", "energysec", "foodsec"]), "the Ministry has the triad");
assert.ok(has3(CASE_SEATS_ALL.map((s) => s.id), ["C21", "C22", "C23"]) && CASE_SEATS_ALL.filter((s) => ["C21", "C22", "C23"].includes(s.id)).every((s) => ["A1", "A2"].includes(s.group)), "the Strategic Council has the triad as seats"); assert.ok(has3(MACH_SEATS_ALL.map((s) => s.id), ["natsec", "energysec", "foodsec"]), "the Machiavellian council has the triad"); assert.ok(has3(DEEP_ROLES.map((r) => r.id), ["natsec", "energysec", "foodsec"]), "the Deep team has the triad"); assert.ok(has3(FALCON_AGENTS.map((a) => a.id), ["natsec", "energy", "food"]), "the Falcon Council has the triad");
// no duplicated mandate: energy, food and security each have one owner per council
assert.ok(!/food/i.test(KING_AGENTS.find((a) => a.id === "resources")!.mandate.replace("Energy and food have their own security experts (K12 and K13): do not repeat them.", "")) && !/food/i.test(EMB_AGENTS.find((a) => a.id === "resources")!.mandate.replace("Energy and food have their own security attachés (E20, E21): do not repeat them.", "")), "the old resources desks no longer own energy and food");
// the SME promotion attaché and the gaps the embassy must close
assert.ok(EMB_AGENTS.some((a) => a.id === "sme" && /small and medium/i.test(a.mandate)), "the embassy has an SME promotion attaché");
// every desk and specialist has a mandate, questions and sources, not just a name
for (const a of [...KING_AGENTS, ...EMB_AGENTS]) assert.ok(a.mandate.length > 80 && a.questions.length >= 4 && a.sources.length >= 2, `${a.id} has a mandate, questions and starting sources`);
console.log("audit: all checks passed");
