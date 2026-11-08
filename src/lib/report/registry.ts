import type { Conf, Lang, ReportHead } from "./model";
import { illustrateKing } from "./products/king";
import { illustrateDirective } from "./products/directive";
import { illustrateIntel, illustratePlan } from "./products/mission";
import { illustrateMofa } from "./products/mofa";
import { illustrateCase, illustrateArchitect } from "./products/case";
import { illustrateFalcon } from "./products/falcon";
import { illustrateMachCouncil, illustrateMachStrategy, illustrateMachScenario, illustrateMachInterference } from "./products/mach";
import { illustrateDeepCouncil, illustrateDeepResearch } from "./products/deep";
import { illustrateChallenge } from "../roundtable/illustrate";

// THE REGISTRY OF ILLUSTRATED PDFS: for each kind of saved product (the keys of KINDS in reportpdf.ts) a function that turns the product's parsed data into the visual blocks of its PDF. reportpdf.ts's pdfHtml() assembles the document: cover and chips, red flags, `front` blocks, the consolidated brief (markdown), `annex` blocks (or the old structured tables when a product has none), the sources. A kind with no entry here still gets the generic cover, chips and flag cards.
export type IllustrateCtx = { kind: string; report: string; L: Lang; head: ReportHead; country: string; iso: string; sources: { url: string; title?: string }[] };
export type Illustration = {
  /** Small caps line above the call (the product's name by default). */
  kicker?: string;
  /** The call in big type: the recommended course, the posture, the verdict of the strategy. */
  title?: string; titleColor?: string;
  /** The bottom line, in one or two sentences. */
  bottomLine?: string; confidence?: Conf | null;
  /** A ready gauge (see gauge() in html.ts), put beside the call. Defaults to the quality score when the product has one. */
  gaugeHtml?: string;
  /** Extra HTML inside the cover block, under the chips (for example a posture scale). */
  heroExtra?: string;
  /** Blocks placed straight after the cover and the red flags (the dashboard: stat row, bars, matrices). */
  front?: string[];
  /** Blocks placed after the consolidated brief, in place of the old structured tables. Every field of the parsed data must appear in them or in the brief. */
  annex?: string[];
  /** Keep the old structured-annex tables after the visual annex (default: the visual annex replaces them). */
  keepTables?: boolean;
  /** Standard parts this illustrator already draws itself (so pdfHtml does not draw them a second time): any of "angles", "scenarios", "milestones", "coalition", "ledger". */
  skipStandard?: string[];
};
export type Illustrator = (c: IllustrateCtx) => Illustration | null;
export const ILLUSTRATORS: Record<string, Illustrator> = {
  "king-council": illustrateKing, directive: illustrateDirective,
  "emb-intel": illustrateIntel, "emb-plan": illustratePlan, "mofa-council": illustrateMofa,
  "case-council": illustrateCase, architect: illustrateArchitect, "falcon-council": illustrateFalcon,
  "mach-council": illustrateMachCouncil, "mach-strategy": illustrateMachStrategy, "mach-scenario": illustrateMachScenario, "mach-interference": illustrateMachInterference,
  "council-challenge": illustrateChallenge,
  "deep-council": illustrateDeepCouncil, "deep-research": illustrateDeepResearch,
};
