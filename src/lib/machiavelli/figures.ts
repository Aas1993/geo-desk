import type { PathNode } from "./strategy-parse";
// The illustrative figures of the specification (sections 11 and 38), as data for the outcome-tree drawing. They are illustrations: no measured country outcome, assigned probability or validated causal coefficient.
const n = (id: string, stage: PathNode["stage"], outcome: string, parents: string[], branch: PathNode["branch"], horizon = "", stop = ""): PathNode => ({ id, stage, outcome, parents, branch, horizon, evidence: "", confidence: null, stop });
export const FIG_PARTNERSHIP: PathNode[] = [
  n("A", "action", "Jointly agreed productive investment", [], "neutral"), n("B", "mechanism", "Delivery and service performance", ["A"], "neutral"),
  n("C", "intermediate", "Benefits broadly realised", ["B"], "favourable"), n("D", "intermediate", "Benefits weak or uneven", ["B"], "adverse"),
  n("E", "intermediate", "Higher commercial value and institutional trust", ["C"], "favourable"), n("F", "ultimate", "Potential durable cooperation", ["E"], "favourable"), n("J", "ultimate", "Review of benefits, autonomy and continuation", ["F"], "neutral"),
  n("H", "intermediate", "Complaints, cost overruns or reputational loss", ["D"], "adverse"), n("I", "ultimate", "Audit, redesign or orderly exit", ["H"], "adverse"),
];
export const FIG_GATES: string[] = ["Baseline and authority", "Joint design", "Pilot delivery", "Independent evaluation", "Scale, adapt or exit", "Five to ten year renewal"];
export const FIG_EXAMPLE: PathNode[] = [
  n("A", "action", "Anchor co-investment committed (Year 1)", [], "baseline", "Year 1"), n("B", "mechanism", "Infrastructure delivery and local capacity-building", ["A"], "baseline", "Years 1 to 3"),
  n("C", "intermediate", "No leadership transition: institutional dialogue continues", ["B"], "favourable", "Year 3", "Dialogue lapses"), n("D", "intermediate", "A transition occurs and the new government reviews prior commitments", ["B"], "shock", "Year 3"),
  n("E", "intermediate", "Honours the agreement", ["D"], "favourable", "Year 3 to 4"), n("F", "intermediate", "Seeks renegotiation", ["D"], "adverse", "Year 3 to 4", "Terms breach the exit clause"),
  n("G", "mechanism", "Apply the exit-clause terms; renegotiate from the governance-seat position", ["F"], "adverse", "Year 4"), n("H", "ultimate", "Durability confirmed: proceed to Horizon 3 scaling", ["E"], "favourable", "Year 5"),
  n("I", "ultimate", "Five-year review: realised return and counterpart benefit against the baseline", ["C", "H", "G"], "neutral", "Year 5"),
];
export const FIG_EXAMPLE_TABLE = { request: "A US$5 to 10bn anchor co-investment in a Tier 2 African growth-frontier market over a five-year horizon, testing a leadership-transition shock.", row: { input: "US$5 to 10bn anchor co-investment (an ADQ or Mubadala-type vehicle)", mechanism: "Governance-seat-bearing infrastructure stake (section 25.2)", intermediate: "Operating asset with measurable local output by Year 3", favourable: "Durable partnership surviving the Year 3 transition; Horizon 3 scaling", adverse: "Renegotiation demand after the transition; exposure managed only if an exit clause was built in at signing", signpost: "MI05 (realised against announced investment), MI19 (durability under scenario stress)" } };
export const SCENARIO_FLOW: string[] = ["The user specifies country or region, instrument mix, horizon and an optional shock", "Retrieve the evidence baseline: trade, investment, aid and diplomatic data for that country", "Apply the roots template and the opportunity scoring", "Construct the branches: baseline, favourable, adverse, shock-triggered", "Assign confidence and evidence gaps per branch: no invented probabilities", "Generate the outcome tree and the indicator-shifts table", "Red-team pass: inflated expectation, competitor response, exit cost", "Return the package: inputs recap, outcome tree, indicator table, instrument sequencing"];
export const SCENARIO_PRESETS: [string, string][] = [["Leadership transition", "A leadership transition in the partner country in year 3"], ["Regional conflict spillover", "A regional conflict spills over into the partner country's borders and trade routes"], ["Competitor enters the market", "A competing state enters the same sectors with concessional finance"], ["Commodity price shock", "A sharp commodity-price shock cuts the partner country's fiscal space"], ["No shock (baseline)", ""]];

/** Figure 1: how the module relates to the rest of GeoDesk. */
export const FIG_PRODUCT: string[] = ["GeoDesk", "FALCON EYE and Machiavellian Strategic Influence (siblings)", "Shared evidence and analytical services", "Country strategy and historical comparison", "Scenarios, options and outcome trees", "Independent review and human approval", "Decision and outcome monitoring"];
/** Section 24.4: the hard-power decision tree (policy level, illustrative). */
export const FIG_HARD: PathNode[] = [
  n("A", "action", "Capability gap identified", [], "neutral"), n("B", "mechanism", "Can it be closed through an existing partner or domestic industry?", ["A"], "neutral"),
  n("C", "intermediate", "Yes, domestic: fund domestic development (Horizons 2 to 3)", ["B"], "favourable"), n("D", "intermediate", "Yes, partner: negotiate co-production or procurement", ["B"], "favourable"), n("E", "intermediate", "No viable path: accept the risk and monitor, or scope the requirement down", ["B"], "neutral"),
  n("F", "mechanism", "Does the agreement include an exit clause and IP terms?", ["D"], "neutral"), n("G", "intermediate", "No: return to negotiation, do not sign", ["F"], "adverse"), n("H", "intermediate", "Yes: proceed to certification and interoperability", ["F"], "favourable"),
  n("I", "mechanism", "Interoperability certified within 24 months?", ["H"], "neutral"), n("J", "intermediate", "No: escalate to the steering committee, renegotiate scope or timeline", ["I"], "adverse"), n("K", "ultimate", "Yes: institutionalise with a multi-year posture review cycle", ["I", "C"], "favourable"),
  n("L", "ultimate", "Quarterly re-assessment: re-enter at the start if conditions change", ["E"], "neutral"),
];
/** Section 25.6: combined hard-power and influence sequencing across the three horizons. */
export const FIG_SEQUENCE: PathNode[] = [
  n("A1", "action", "H1: capability audit", [], "neutral", "0 to 18 months"), n("A2", "action", "H1: secondment pipeline", [], "neutral", "0 to 18 months"), n("A3", "action", "H1: convening forum launched", [], "neutral", "0 to 18 months"),
  n("B1", "mechanism", "H2: co-production agreements", ["A1"], "neutral", "18 months to 5 years"), n("B3", "mechanism", "H2: minilateral coalitions", ["A2"], "neutral", "18 months to 5 years"), n("B2", "mechanism", "H2: anchor co-investment", ["A3"], "neutral", "18 months to 5 years"),
  n("C1", "intermediate", "H3: indigenous capability", ["B1"], "neutral", "5 to 10 years"), n("C2", "intermediate", "H3: multilateral leadership secured", ["B3"], "neutral", "5 to 10 years"), n("C3", "intermediate", "H3: regional security architecture role", ["B2"], "neutral", "5 to 10 years"),
  n("D", "mechanism", "10-year review: durable under leadership change?", ["C1", "C2", "C3"], "neutral"), n("E", "ultimate", "Yes: renew and selectively expand", ["D"], "favourable"), n("F", "ultimate", "No: audit, redesign or orderly exit", ["D"], "adverse"),
];
/** Section 29.3: the corridor decision graph. */
export const FIG_CORRIDOR: PathNode[] = [
  n("A", "action", "Trade-corridor opportunity identified", [], "neutral"), n("B", "mechanism", "Does it reduce or increase UAE chokepoint concentration?", ["A"], "neutral"),
  n("C", "intermediate", "Increases: deprioritise unless paired with a redundancy investment elsewhere", ["B"], "adverse"), n("D", "mechanism", "Reduces: is the UAE already a core node through DP World or a CEPA?", ["B"], "favourable"),
  n("E", "intermediate", "Yes: deepen, converting port and trade presence into a corridor governance role", ["D"], "favourable"), n("F", "mechanism", "No: is a competitor already dominant on this route?", ["D"], "neutral"),
  n("G", "intermediate", "Yes, entrenched: seek a complementary niche (financing, trade law)", ["F"], "neutral"), n("H", "intermediate", "No, open field: first-mover infrastructure with a CEPA in parallel", ["F"], "favourable"),
  n("I", "mechanism", "Annual review: realised volume against announced capacity", ["E", "G", "H"], "neutral"), n("J", "mechanism", "Is the corridor delivering measurable trade or transit growth?", ["I"], "neutral"),
  n("K", "ultimate", "Yes: scale and seek a governance seat", ["J"], "favourable"), n("L", "ultimate", "No: reassess the investment and protect exit terms", ["J"], "adverse"),
];
/** Section 31.4: the illustrative Egypt scenario tree, one to ten years. */
export const FIG_EGYPT: PathNode[] = [
  n("A", "action", "Baseline: fiscal stress, GERD unresolved, Sudan spillover", [], "baseline"), n("B", "mechanism", "Reform programme sustained and Ras El-Hekma delivers on schedule?", ["A"], "neutral"),
  n("C", "intermediate", "Economic stabilisation; the UAE relationship deepens", ["B"], "favourable"), n("D", "intermediate", "Renewed fiscal crisis; subsidy-cut unrest risk", ["B"], "adverse"),
  n("E", "mechanism", "GERD dispute reaches a negotiated framework?", ["C"], "neutral"), n("F", "intermediate", "UAE exposure review: protect investment terms, avoid new exposure", ["D"], "adverse"),
  n("G", "intermediate", "Yes, with credible convening: a regional stability dividend; UAE convening credibility rises", ["E"], "favourable"), n("H", "intermediate", "No: chronic resource tension persists; the UAE stays out of direct mediation risk", ["E"], "neutral"),
  n("I", "ultimate", "10-year outcome: a selective, well-structured UAE presence survives the shock", ["F", "H"], "neutral"), n("J", "ultimate", "10-year outcome: the UAE recognised as a trusted regional convenor", ["G"], "favourable"),
];
/** Section 40.6: the illustrative outcome tree for enhancing the India opportunity. */
export const FIG_INDIA: PathNode[] = [
  n("A", "action", "Baseline 2026: cumulative investment, H1 trade, a fresh pledge and seven pacts (figures as stated by the specification; see the register)", [], "baseline"), n("B", "mechanism", "Short term: pledge actually deployed within 12 months?", ["A"], "neutral"),
  n("C", "intermediate", "Yes: credibility reinforced; proceed to scale-up discussions", ["B"], "favourable"), n("D", "intermediate", "No or partial: reassess the pipeline; protect the relationship with smaller wins", ["B"], "adverse"),
  n("E", "mechanism", "Medium term: governance-seat stakes and defence co-production achieved?", ["C"], "neutral"), n("F", "intermediate", "Yes: the UAE moves up the investor ranking in targeted sectors", ["E"], "favourable"), n("G", "intermediate", "No: remains a large but generic capital source among many competitors", ["E"], "adverse"),
  n("H", "mechanism", "Long term: survives a leadership transition in either country?", ["F"], "neutral"), n("I", "intermediate", "Yes: a durable strategic partnership; IMEC co-leadership becomes realistic", ["H"], "favourable"), n("J", "intermediate", "No: the relationship resets to a transactional baseline; protect the core CEPA gains", ["H"], "adverse"),
  n("K", "ultimate", "10-year outcome: steady but unremarkable partnership; the radar rank may slip", ["D", "G", "J"], "adverse"), n("L", "ultimate", "10-year outcome: India becomes the clearest anchor relationship, validated by the scorecard", ["I"], "favourable"),
];
/** Sections 29.2 and 29.4: the corridor strategy by horizon and the country shortlist, each flagged where the reference check bears on it. */
export const CORRIDOR_STRATEGY: { horizon: string; items: { text: string; ref?: string }[] }[] = [
  { horizon: "Short term (0 to 18 months)", items: [{ text: "Complete and commission the Fujairah terminals as a credible, operating Hormuz-bypass capacity, not an announced one. The check found an agreement in principle and a 24 to 36 month build, so 18 months is not realistic.", ref: "fujairah" }, { text: "Formalise the UAE-India Virtual Trade Corridor digital customs and documentation platform as the operating template for IMEC's eastern leg, the segment that is actually advancing." }, { text: "Keep the dual-track hedge (IMEC and the Iraq Development Road) rather than committing exclusively to either." }] },
  { horizon: "Medium term (18 months to 5 years)", items: [{ text: "Convert DP World's African capital expenditure into integrated corridor nodes: link port investment to inland rail and road and to the CEPAs already in force with the same countries." }, { text: "Pursue CEPAs explicitly with IMEC's prospective European landing states (Greece and Cyprus) to pre-position the legal infrastructure." }, { text: "Build contingency routing (Oman-adjacent capacity as well as Fujairah) so a Hormuz disruption does not strand UAE-origin cargo." }] },
  { horizon: "Long term (5 to 10 years)", items: [{ text: "Target multi-corridor redundancy, not dominance of any single corridor: UAE-controlled or UAE-anchored capacity across the Hormuz-bypass route, the IMEC eastern leg and at least one African or Red Sea-adjacent route." }, { text: "Use the CEPA network as a standing negotiating asset: a new corridor partner is offered a ready-made preferential-trade relationship.", ref: "cepa-count" }, { text: "Institutionalise UAE co-leadership, not only capital participation, in whichever IMEC governance structure forms." }] },
];
export const CORRIDOR_SHORTLIST: { who: string; why: string; action: string }[] = [
  { who: "India", why: "The single largest realised trade partner and the commercial engine of IMEC's eastern leg", action: "Convert the trade relationship into joint corridor infrastructure financing, not only cargo volume" },
  { who: "Saudi Arabia", why: "Co-anchor of IMEC's central corridor; UAE-Saudi divergence on the route is documented", action: "Use diplomatic-track coordination (coalition-building) to prevent corridor fragmentation, which damages both states" },
  { who: "Oman", why: "Geographically the lowest-risk Hormuz-bypass alternative identified", action: "Explore complementary, not competing, logistics investment to reduce Fujairah-only exposure" },
  { who: "Nigeria, Kenya, DRC", why: "The fastest-growing African CEPA and investment relationships; an early-mover advantage may remain", action: "Pair new CEPAs with DP World infrastructure to lock in first-mover corridor position before competitors scale" },
  { who: "Greece, Cyprus", why: "Declared interest in joining IMEC; the corridor's possible European landing points", action: "Begin CEPA-style legal groundwork now, ahead of physical corridor completion" },
];
