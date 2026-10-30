import { councilDigest } from "../case/architect";
import { ambFactsBlock } from "../case/ambassador";
import type { CaseData } from "../case/load";
import { embSection } from "./embassy";
import { kingSection } from "./king";
import { mofaDigest } from "./mofa";
import { historyFact } from "./history";
import { playbookDigest, playbookFact } from "../case/playbook";
import { anglesFact } from "../case/angles";

// What each desk reads beside the shared evidence: the other products already on file, trimmed to their decision-relevant parts and labelled analysis, never evidence. The desks stay separate (their own page, their own roster, their own saved products); this is only what one may read of the other when the person leaves "read what is on file" ticked.
export type Filed = { clips?: string | null; council?: string | null; architect?: string | null; kingBrief?: string | null; embIntel?: string | null; embPlan?: string | null; mofa?: string | null };
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n)}…` : t);
const strip = (t: string) => t.replace(/<(king|mofa|mission1|mission2|ambassador|architect|directive|statecraft_review|reality_review|review)>[\s\S]*?(?:<\/\1>|$)/g, "").replace(/<\/?[a-zA-Z_][^>]*>/g, "");
/** For THE KING's council: the Strategic Council digest, the ambassador's brief and the mission strategy when they exist. */
export function kingContext(f: Filed): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 5200); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const eb = f.embIntel ? embSection(f.embIntel, "Ambassador's Brief") : ""; if (eb) parts.push(`## The ambassador's brief (embassy council)\n${cut(strip(eb), 3200)}`);
  const ms = f.embPlan ? embSection(f.embPlan, "Mission Strategy") : ""; if (ms) parts.push(`## The embassy's mission strategy\n${cut(strip(ms), 2600)}`);
  return parts.join("\n\n");
}
/** For the Ministry's council: the Strategic Council digest, the head of state's executive brief and the embassy's own brief and mission strategy when they exist. */
export function mofaContext(f: Filed, d?: CaseData | null): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 4500); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const kb = f.kingBrief ? kingSection(f.kingBrief, "Executive Brief") : ""; if (kb) parts.push(`## The head of state's council: Executive Brief\n${cut(strip(kb), 2800)}`);
  const eb = f.embIntel ? embSection(f.embIntel, "Ambassador's Brief") : ""; if (eb) parts.push(`## The ambassador's brief (embassy council)\n${cut(strip(eb), 3200)}`);
  const ms = f.embPlan ? embSection(f.embPlan, "Mission Strategy") : ""; if (ms) parts.push(`## The embassy's mission strategy\n${cut(strip(ms), 2400)}`);
  const prev = mofaDigest(f.mofa, 2600); if (prev) parts.push(`## The Ministry's earlier priorities for this country (to be reviewed, not repeated)\n${prev}`);
  if (d) parts.push(`## The UAE statecraft playbook: where the rules and the products on file stand (analysis; the baseline playbook is in the facts)\n${playbookDigest(d, f)}`);
  return parts.join("\n\n");
}
export const INTEL_MARK = "## The embassy's intelligence brief\n";
/** For the embassy council: the Strategic Council digest and the head of state's executive brief when they exist. The plan sitting also reads the intelligence sitting's brief, placed LAST so it can be lifted out whole (the brief has headings of its own); a directive also reads the mission strategy. */
export function embContext(f: Filed, product: "emb-intel" | "emb-plan" | "emb-directive", d?: CaseData | null): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 4500); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const mf = mofaDigest(f.mofa, 3400); if (mf) parts.push(`## The Ministry of Foreign Affairs: priorities, goals and the tasks set for the mission\n${mf}`);
  const kb = f.kingBrief ? kingSection(f.kingBrief, "Executive Brief") : ""; if (kb) parts.push(`## The head of state's council: Executive Brief\n${cut(strip(kb), 3000)}`);
  if (product === "emb-directive" && f.embPlan) { const ms = embSection(f.embPlan, "Mission Strategy"); if (ms) parts.push(`## The mission strategy\n${cut(strip(ms), 2600)}`); }
  if (d) parts.push(`## The UAE statecraft playbook: where the rules and the products on file stand (analysis; the baseline playbook is in the facts)\n${playbookDigest(d, f)}`);
  if (product !== "emb-intel" && f.embIntel) { const eb = embSection(f.embIntel, "Ambassador's Brief"); if (eb) parts.push(`${INTEL_MARK}${cut(strip(eb), 5200)}`); }
  return parts.join("\n\n");
}
/** The facts layer the desks add to the Case File evidence: the UAE's vehicles and advantage, the neighbours' relations (all computed from held data), the long view of the UAE in the country and the baseline UAE statecraft playbook (rule-built, free; the desks improve it). */
export const deskExtraFacts = (c: CaseData): { kind: string; text: string; src: string }[] => [...ambFactsBlock(c), historyFact(c), playbookFact(c), anglesFact(c)];
/** For the Country Brief: the Strategic Council digest, the Ministry's priorities (what the UAE wants), the ambassador's brief and the mission strategy when they exist. */
export function countryContext(f: Filed): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 4500); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const mf = mofaDigest(f.mofa, 3400); if (mf) parts.push(`## The Ministry of Foreign Affairs: priorities, goals and the tasks set for the mission (the UAE's stated position)\n${mf}`);
  const eb = f.embIntel ? embSection(f.embIntel, "Ambassador's Brief") : ""; if (eb) parts.push(`## The ambassador's brief (embassy council)\n${cut(strip(eb), 4200)}`);
  const ms = f.embPlan ? embSection(f.embPlan, "Mission Strategy") : ""; if (ms) parts.push(`## The embassy's mission strategy\n${cut(strip(ms), 2200)}`);
  if (f.clips) parts.push(`## ${cut(f.clips, 3600)}`);
  return parts.join("\n\n");
}
/** For the President's brief: the Country Brief (the whole country), the Strategic Council digest, the Ministry's priorities, the ambassador's brief, the mission strategy and THE KING's executive brief, whichever exist. */
export function presidentContext(f: Filed & { country?: string | null; playbook?: string | null }): string {
  const parts: string[] = []; const cb = f.country ? cut(strip(f.country.split("# Specialist Findings")[0]), 5200) : ""; if (cb) parts.push(`## The Country Brief (the whole country, written earlier)\n${cb}`);
  if (f.playbook) parts.push(`## The baseline UAE statecraft playbook for this country (rule-built from the Case File and the products on file; the UAE's stated position)\n${cut(f.playbook, 6000)}`);
  const c = councilDigest(f.council ?? null, 3500); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const kb = f.kingBrief ? kingSection(f.kingBrief, "Executive Brief") : ""; if (kb) parts.push(`## THE KING's council: Executive Brief\n${cut(strip(kb), 2600)}`);
  const mf = mofaDigest(f.mofa, 3000); if (mf) parts.push(`## The Ministry of Foreign Affairs: priorities, goals and mission tasks (the UAE's stated position)\n${mf}`);
  const eb = f.embIntel ? embSection(f.embIntel, "Ambassador's Brief") : ""; if (eb) parts.push(`## The ambassador's brief\n${cut(strip(eb), 3000)}`);
  const ms = f.embPlan ? embSection(f.embPlan, "Mission Strategy") : ""; if (ms) parts.push(`## The embassy's mission strategy\n${cut(strip(ms), 1800)}`);
  if (f.clips) parts.push(`## ${cut(f.clips, 3600)}`);
  return parts.join("\n\n");
}
