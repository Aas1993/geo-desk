import { councilDigest } from "../case/architect";
import { ambFactsBlock } from "../case/ambassador";
import type { CaseData } from "../case/load";
import { embSection } from "./embassy";
import { kingSection } from "./king";
import { historyFact } from "./history";

// What each desk reads beside the shared evidence: the other products already on file, trimmed to their decision-relevant parts and labelled analysis, never evidence. The desks stay separate (their own page, their own roster, their own saved products); this is only what one may read of the other when the person leaves "read what is on file" ticked.
export type Filed = { council?: string | null; architect?: string | null; kingBrief?: string | null; embIntel?: string | null; embPlan?: string | null };
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n)}…` : t);
const strip = (t: string) => t.replace(/<(king|mission1|mission2|ambassador|architect|directive)>[\s\S]*?<\/\1>/g, "").replace(/<\/?[a-zA-Z_][^>]*>/g, "");
/** For THE KING's council: the Strategic Council digest, the ambassador's brief and the mission strategy when they exist. */
export function kingContext(f: Filed): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 5200); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const eb = f.embIntel ? embSection(f.embIntel, "Ambassador's Brief") : ""; if (eb) parts.push(`## The ambassador's brief (embassy council)\n${cut(strip(eb), 3200)}`);
  const ms = f.embPlan ? embSection(f.embPlan, "Mission Strategy") : ""; if (ms) parts.push(`## The embassy's mission strategy\n${cut(strip(ms), 2600)}`);
  return parts.join("\n\n");
}
export const INTEL_MARK = "## The embassy's intelligence brief\n";
/** For the embassy council: the Strategic Council digest and the head of state's executive brief when they exist. The plan sitting also reads the intelligence sitting's brief, placed LAST so it can be lifted out whole (the brief has headings of its own); a directive also reads the mission strategy. */
export function embContext(f: Filed, product: "emb-intel" | "emb-plan" | "emb-directive"): string {
  const parts: string[] = []; const c = councilDigest(f.council ?? null, 4500); if (c) parts.push(`## Strategic Council (Case File)\n${c}`);
  const kb = f.kingBrief ? kingSection(f.kingBrief, "Executive Brief") : ""; if (kb) parts.push(`## The head of state's council: Executive Brief\n${cut(strip(kb), 3000)}`);
  if (product === "emb-directive" && f.embPlan) { const ms = embSection(f.embPlan, "Mission Strategy"); if (ms) parts.push(`## The mission strategy\n${cut(strip(ms), 2600)}`); }
  if (product !== "emb-intel" && f.embIntel) { const eb = embSection(f.embIntel, "Ambassador's Brief"); if (eb) parts.push(`${INTEL_MARK}${cut(strip(eb), 5200)}`); }
  return parts.join("\n\n");
}
/** The facts layer both desks add to the Case File evidence: the UAE's vehicles and advantage, the neighbours' relations (all computed from held data) and the long view of the UAE in the country. */
export const deskExtraFacts = (c: CaseData): { kind: string; text: string; src: string }[] => [...ambFactsBlock(c), historyFact(c)];
