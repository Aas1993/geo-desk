// Tests for THE KING's council, the Embassy council, the directive routing, the structured parsers, the UAE history layer and the run plans.
import assert from "node:assert/strict";
import { buildCase } from "./case/load";
import { sectionOfGroup } from "./desk/core";
import { matchCountry } from "./case/report";
import { parseReview } from "./desk/core";
import { assess, assessKing, assessPlan, assessIntel, boundaryHits, sourceMix } from "./quality/gate";
import { DESK_COMMON, DESK_BOUNDARY, PRODUCTS, PRODUCT_USD, checkRefs, citedIds, cleanDeskOptions, deskBase, deskKey, groupRole, headlineOf, jsonBlock, parseDirective, repairJson, routeTopic, worstOf } from "./desk/core";
import { deskExtraFacts, embContext, kingContext } from "./desk/context";
import { EMB_AGENTS, EMB_CHIEF, EMB_INTEL_GROUPS, EMB_PLAN_GROUPS, EMB_PLAN_CHIEF, EMB_SYSTEM, composeIntel, composePlan, deskByCode, embDesk, embDigest, embDirectiveChiefRole, embIntelChiefRole, embPlanChiefRole, embPlanGroupRole, embSection, parseMission1, parseMission2 } from "./desk/embassy";
import { fmtV, uaeHistory } from "./desk/history";
import { KING_AGENTS, KING_BY, KING_CHAIR, KING_GROUPS, KING_SYSTEM, composeKing, kingAnnex, kingChairRole, kingDirectiveDecision, kingGroupRole, kingSection, parseKing } from "./desk/king";
import { WORST, planFor, routed } from "./desk/plan";
import { BLOCK_BY, PRODUCTS as CASE_PRODUCTS, TEMPLATE_BY, buildReport, type Ctx } from "./case/report";

const O = (x: Partial<Parameters<typeof cleanDeskOptions>[0]> = {}) => cleanDeskOptions(x, "default focus");
const unique = (xs: string[]) => new Set(xs).size === xs.length;

async function main() {
  // ---- the rosters: ten for the head of state, thirteen and a Chief of Staff for the embassy
  assert.equal(KING_AGENTS.length, 10); assert.equal(EMB_AGENTS.length, 13); assert.ok(unique(KING_AGENTS.map((a) => a.id)) && unique(EMB_AGENTS.map((a) => a.id)));
  assert.deepEqual(KING_AGENTS.map((a) => a.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); assert.deepEqual(EMB_AGENTS.map((a) => a.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  for (const a of [...KING_AGENTS, ...EMB_AGENTS]) { assert.ok(a.en && a.ar && a.title.en && a.title.ar && a.field.en && a.field.ar, `${a.id} has English and Arabic names`); assert.ok(a.mandate.length > 80 && a.questions.length >= 4 && a.sources.length >= 2, `${a.id} is briefed`); assert.ok(/archetype|نموذج/.test(a.title.en + a.title.ar), `${a.id} is marked an archetype, not a real person`); }
  assert.ok(KING_AGENTS.some((a) => a.id === "redteam") && KING_AGENTS.some((a) => a.id === "precedent") && KING_AGENTS.some((a) => a.id === "law"), "the red team, the precedent keeper and the law desk sit on the Council");
  for (const need of ["pol", "econ", "invest", "private", "power", "security", "bilateral", "region", "resources", "consular", "culture", "humanitarian", "legal"]) assert.ok(EMB_AGENTS.some((a) => a.id === need), `the embassy has a ${need} desk`);
  // every specialist is in exactly one sitting of each product
  const inGroups = (gs: { agents: string[] }[]) => gs.flatMap((g) => g.agents);
  assert.deepEqual([...inGroups(KING_GROUPS)].sort(), KING_AGENTS.map((a) => a.id).sort(), "each of the ten sits exactly once");
  assert.deepEqual([...inGroups(EMB_INTEL_GROUPS)].sort(), EMB_AGENTS.map((a) => a.id).sort(), "each of the thirteen sits exactly once in the intelligence sitting");
  assert.deepEqual([...inGroups(EMB_PLAN_GROUPS)].sort(), EMB_AGENTS.map((a) => a.id).sort(), "each of the thirteen designs a line of effort in the plan sitting");
  assert.equal(deskByCode("E3")?.id, "invest"); assert.equal(deskByCode("e13")?.id, "legal"); assert.equal(deskByCode("E99"), null);

  // ---- the constitution: tradecraft, sources, boundary
  for (const t of [DESK_COMMON, KING_SYSTEM, EMB_SYSTEM]) { assert.ok(/ICD 203/.test(t) && /Chatham House/.test(t) && /Carnegie/.test(t) && /Reuters/.test(t) && /no compliant access/.test(t), "sources and the social-media limit are stated"); assert.ok(/Influence is not control/.test(t) && /No covert action/.test(t) && /not-estimated|"not estimated"|not estimated/.test(t)); }
  assert.ok(/Principles of the 50/.test(DESK_COMMON) && /precedents/.test(DESK_COMMON), "the UAE's strategy and past decisions are named as sources");
  assert.ok(/public roles and organisations only/i.test(DESK_BOUNDARY) && /never a quotation/i.test(DESK_BOUNDARY) && /No operational, targeting/.test(DESK_BOUNDARY));
  assert.ok(/ministry country desks|country team/i.test(EMB_SYSTEM) && /bottom line first/i.test(EMB_SYSTEM) && /investment focus/i.test(EMB_SYSTEM) && /not present/.test(EMB_SYSTEM), "the embassy standard is stated");
  assert.ok(/PhD/.test(EMB_SYSTEM) && /archetype/.test(DESK_BOUNDARY));

  // ---- role prompts
  const g1 = kingGroupRole(KING_GROUPS[0]); for (const id of KING_GROUPS[0].agents) assert.ok(g1.includes(`### ${KING_BY.get(id)!.en}`), `${id} has its own section instruction`); assert.ok(g1.includes("**Headline.**") && /does not see each other|do not see each other/.test(g1));
  assert.ok(kingGroupRole(KING_GROUPS[2]).includes("Red Team") && kingGroupRole(KING_GROUPS[2]).includes("argue from the facts"));
  const chair = kingChairRole({ G1: "ONE", G2: "TWO" }, { topic: "Port deal" }); assert.ok(chair.includes("# Executive Brief") && chair.includes("# Detailed Brief") && chair.includes("<king>") && chair.includes("ONE") && chair.includes("Port deal") && /650 words/.test(chair) && /four courses/.test(chair));
  const intelChief = embIntelChiefRole({ I1: "AAA" }, {}); assert.ok(intelChief.includes("# Ambassador's Brief") && intelChief.includes("## Bottom line") && intelChief.includes("## Who to see first") && intelChief.includes("## What not to do") && intelChief.includes("<mission1>") && intelChief.includes("partners") && intelChief.includes("AAA"));
  const planChief = embPlanChiefRole({ P1: "BBB" }, "BRIEF TEXT", {}); assert.ok(planChief.includes("# Mission Strategy") && planChief.includes("## 100-Day Plan") && planChief.includes("## Three-Year Plan") && planChief.includes("# Due Diligence Register") && planChief.includes("<mission2>") && planChief.includes("BRIEF TEXT") && planChief.includes("dueDiligence"));
  assert.ok(embPlanGroupRole(EMB_PLAN_GROUPS[0]).includes("ACTION <desk code>") && /due diligence/i.test(embPlanGroupRole(EMB_PLAN_GROUPS[0])) && /proposed owner/.test(embPlanGroupRole(EMB_PLAN_GROUPS[0])) && /not estimated/.test(embPlanGroupRole(EMB_PLAN_GROUPS[0])), "plan roles ask for owners, KPIs, costs and due diligence");
  assert.ok(embDirectiveChiefRole({ D: "x" }, { topic: "T", mode: "directive", urgency: "urgent" }).includes("URGENT") && embDirectiveChiefRole({}, { topic: "T", mode: "question", urgency: "routine" }).includes("QUESTION"));
  assert.ok(groupRole([KING_BY.get("geo")!], KING_GROUPS[0], { word: "" }).includes("1 specialist"), "a lone specialist is singular");

  // ---- costs: every product stays under the US$1.00 ceiling at its worst case
  for (const p of PRODUCTS) { assert.ok(WORST[p] > 0 && WORST[p] * 0.6 < 1 && WORST[p] < 1.25, `${p} worst case ${WORST[p]}: the expected cost (60% of it) is under the ceiling, and the runtime guard stops anything past it`); assert.ok(PRODUCT_USD[p] > 0 && PRODUCT_USD[p] <= WORST[p] + 0.2, `${p} typical cost is sensible`); }
  assert.equal(Math.round(worstOf(10_000, 2) * 1000) / 1000, 0.2); assert.ok(WORST["king-directive"] < WORST["king-council"] && WORST["emb-directive"] < WORST["emb-intel"], "a directive costs much less than a sitting");

  // ---- options, keys, refusal-free cleaning
  const o = O({ focus: "x".repeat(900), topic: "  Should the UAE\nconvert the deposit?  ", mode: "directive", urgency: "urgent", agents: ["geo", "BAD ID!", "macro", "a", "b", "c", "d"], lang: "ar", useContext: false });
  assert.equal(o.focus.length, 400); assert.ok(!o.topic.includes("\n") && o.topic.startsWith("Should")); assert.equal(o.mode, "directive"); assert.equal(o.urgency, "urgent"); assert.equal(o.lang, "ar"); assert.equal(o.useContext, false); assert.ok(o.agents.length <= 4 && !o.agents.includes("BAD ID!"));
  assert.equal(O({ mode: "weird", urgency: "weird", lang: "fr" }).mode, "question"); assert.equal(O({}).focus, "default focus"); assert.equal(O({}).useContext, true);
  const k1 = deskKey("king-council", "EGY", O(), "m1", ""); assert.equal(k1, deskKey("king-council", "EGY", O(), "m1", "")); assert.notEqual(k1, deskKey("king-council", "EGY", O({ topic: "port" }), "m1", "")); assert.notEqual(k1, deskKey("emb-intel", "EGY", O(), "m1", "")); assert.notEqual(k1, deskKey("king-council", "EGY", O(), "m1", "context changed")); assert.notEqual(k1, deskKey("king-council", "EGY", O({ lang: "ar" }), "m1", ""));
  const base = deskBase({ facts: "F1 fact", asOf: "2026-10-26", country: "Egypt", options: O({ lang: "ar" }), context: "", contextLabel: "Strategic Council" }); assert.ok(base.includes("<facts") && base.includes("do not invent one") && base.includes("Arabic"));
  assert.ok(deskBase({ facts: "x", asOf: "d", country: "Egypt", options: O(), context: "CTX", contextLabel: "Strategic Council" }).includes("CTX"));
  const known = new Set(["F1", "F2"]); assert.equal(checkRefs("A [F1] B [F2, F1] C [F9] D [F1–F9]", known), "A [F1] B [F2, F1] C [unverified reference F9] D [unverified reference F1–F9]"); assert.deepEqual(citedIds("x [F3] y [F1, F2] z [F3]").sort(), ["F1", "F2", "F3"]);

  // ---- routing a question or a directive to the specialists it touches
  const r1 = routeTopic("Should the UAE convert its deposit into equity in a port concession?", KING_AGENTS, ["geo"]); assert.ok(r1.length >= 1 && r1.length <= 4 && r1[0].agent.id === "invest", "an investment question goes to the investment specialist first");
  assert.ok(routeTopic("What sanctions and treaty risks does the deal carry?", KING_AGENTS, ["geo"]).some((r) => r.agent.id === "law"));
  assert.ok(routeTopic("What happens if the president steps down and the army takes over?", KING_AGENTS, ["geo"]).some((r) => r.agent.id === "polity"));
  assert.deepEqual(routeTopic("zzz qqq", KING_AGENTS, ["geo", "macro"]).map((r) => r.agent.id), ["geo", "macro"], "no match falls back to the generalists");
  assert.ok(routeTopic("Which private companies and chambers should we meet before the visit?", EMB_AGENTS, ["pol"]).some((r) => r.agent.id === "private"));
  assert.ok(routeTopic("How many Emirati students need consular help and visas?", EMB_AGENTS, ["pol"])[0].agent.id === "consular");
  assert.deepEqual(routed("king-directive", O({ agents: ["law", "nope", "macro"] })).map((r) => r.id), ["law", "macro"], "chosen specialists win and unknown ids are dropped");
  assert.ok(routed("emb-directive", O({ topic: "defence training cooperation and maritime safety" })).some((r) => r.id === "security"));

  // ---- the directive answer, parsed and validated
  const dir = { answer: "Yes, in stages.", recommendation: "Stage it.", confidence: "high", options: [{ name: "Stage", pros: ["a"], cons: ["b"], cost: "" , risk: "r" }, { name: "" }], steps: [{ action: "Audit", owner: "MoF", when: "30 days", detail: "d" }, { action: "" }], risks: [{ name: "FX", mitigation: "hedge" }], needs: ["Treaty text"], follow: ["a", "b", "c", "d"] };
  const pd = parseDirective(`# Answer\nx\n<directive>${JSON.stringify(dir)}</directive>`)!; assert.equal(pd.confidence, "high"); assert.equal(pd.options.length, 1); assert.equal(pd.options[0].cost, "not estimated", "missing cost is not estimated"); assert.equal(pd.steps.length, 1); assert.equal(pd.follow.length, 3);
  assert.equal(parseDirective("no block"), null); assert.equal(parseDirective("<directive>{bad</directive>"), null); assert.equal(parseDirective("<directive>{}</directive>"), null); assert.equal(parseDirective(`<directive>${JSON.stringify({ ...dir, confidence: "certain" })}</directive>`)!.confidence, "moderate");
  assert.ok(!/<|>/.test(parseDirective(`<directive>${JSON.stringify({ answer: "a <b>bold</b> move" })}</directive>`)!.answer), "markup is stripped from model text");
  assert.equal(headlineOf("## X\n**Headline.** We judge it is likely (moderate confidence).\nmore"), "We judge it is likely (moderate confidence)."); assert.equal(headlineOf("plain first line\nsecond"), "plain first line");

  // ---- THE KING: the structured decision
  const KJ = { decision: { course: "staged", confidence: "moderate", headline: "Commit in stages", rationale: "Because", conditions: ["Audit first", "Gate at day 90"], ifWrong: "Exit at gate" },
    options: [{ course: "deepen", summary: "s", for: ["a"], against: ["b"], requires: ["c"], reversibility: "hard", firstMove: "m" }, { course: "staged", summary: "s", for: [], against: [], requires: [], reversibility: "weird", firstMove: "m" }, { course: "hedge" }, { course: "hold", summary: "h" }],
    judgments: [{ id: "J1", field: "macro", text: "Reserves are thin.", band: "likely", confidence: "high", basis: "IMF", evidence: ["F12", "bad", "F3"], indicator: "Reserves < 3 months" }, { id: "J2", field: "nonsense", text: "x", band: "b", confidence: "weird", basis: "", evidence: [], indicator: "" }, { text: "" }],
    risks: [{ name: "FX", likelihood: "likely", impact: "huge", trigger: "t", mitigation: "m", owner: "MoF" }, { name: "" }], watch: [{ indicator: "Reserves", signal: "s", threshold: "3 months", source: "IMF" }, { indicator: "" }], decisionsAsked: ["Approve the audit"], assumptions: ["A1"], changeMind: ["C1"], gaps: ["G1"], precedents: [{ year: "2019", what: "Deposit", outcome: "Rolled over", lesson: "Conditions matter" }, { what: "" }] };
  const KR = `# Executive Brief\n\nBottom line.\n\n# Detailed Brief\n\n## Situation\ntext [F1]\n\n# Structured data\n\nNote.\n<king>\n${JSON.stringify(KJ)}\n</king>`;
  const pk = parseKing(KR)!; assert.equal(pk.decision.course, "staged"); assert.equal(pk.options.length, 4); assert.equal(pk.options[1].reversibility, "moderate", "an unknown reversibility becomes moderate"); assert.equal(pk.judgments.length, 2); assert.deepEqual(pk.judgments[0].evidence, ["F12", "F3"], "only well-formed fact ids survive"); assert.equal(pk.judgments[1].field, "geo", "an unknown field falls back"); assert.equal(pk.judgments[1].confidence, "moderate");
  assert.equal(pk.risks.length, 1); assert.equal(pk.risks[0].impact, "medium"); assert.equal(pk.watch.length, 1); assert.equal(pk.precedents.length, 1); assert.deepEqual(pk.decisionsAsked, ["Approve the audit"]);
  assert.equal(parseKing("no block"), null); assert.equal(parseKing("<king>{bad</king>"), null); assert.equal(parseKing(`<king>${JSON.stringify({ decision: { course: "conquer" } })}</king>`), null, "an unknown course is not a decision");
  // composing: the Executive Brief first, then the Detailed Brief, the annex by specialist, the data last
  const parts = [{ id: "G1", text: "## Geopolitics and Regional Order\n**Headline.** We judge A.\nbody\n\n## Domestic Politics, Leadership and Succession\n**Headline.** We judge B." }, { id: "G2", text: "## Macroeconomy and Sovereign Finance\n**Headline.** We judge C." }, { id: "chair", text: KR }];
  const rep = composeKing(parts); const order = ["# Executive Brief", "# Detailed Brief", "# Specialist Annex", "# Structured data"].map((h) => rep.indexOf(h)); assert.ok(order.every((x) => x >= 0) && order.every((x, i) => i === 0 || x > order[i - 1]), "the reading order");
  assert.ok(kingSection(rep, "Executive Brief").includes("Bottom line") && kingSection(rep, "Detailed Brief").includes("## Situation") && !kingSection(rep, "Executive Brief").includes("Situation"));
  assert.ok(kingAnnex(rep, KING_BY.get("macro")!).includes("We judge C.") && kingAnnex(rep, KING_BY.get("geo")!).includes("body") && !kingAnnex(rep, KING_BY.get("geo")!).includes("We judge B."), "each specialist's annex is its own section"); assert.equal(kingAnnex(rep, KING_BY.get("law")!), "");
  assert.ok(composeKing([{ id: "G1", text: "" }]).includes("Not written"), "a Chair that did not finish says so");

  // ---- the embassy: both structured parts
  const M1 = { power: [{ who: "Ministry of Investment", group: "government", level: "decisive", mandate: "Investment policy", why: "Gatekeeper", approach: "Official channel", caution: "c", source: "F4" }, { who: "Federation of Industries", group: "weird", level: "weird", mandate: "m", why: "w", approach: "a", caution: "c", source: "" }, { who: "" }],
    partners: [{ name: "Acme Holding", sector: "Agriculture", kind: "private", why: "Largest grower", uaeCounterpart: "ADQ", winwin: "Offtake and capital", structure: "JV", firstStep: "Intro", dueDiligence: ["Ownership", "Sanctions screen"], risk: "FX", source: "annual report" }, { name: "" }],
    plays: [{ vehicle: "AD Ports Group", kind: "expand", sector: "ports", why: "w", partner: "Port authority", structure: "concession", protections: "treaty", firstStep: "f", risk: "r", window: "0-100 days", dueDiligence: ["Concession terms"] }, { vehicle: "" }], neighbours: [{ country: "Libya", relation: "tension", note: "n", uaeImplication: "i" }, { country: "" }],
    scenarios: [{ name: "Baseline", trigger: "t", effects: [{ desk: "E2", text: "growth" }, { desk: "", text: "x" }], response: "r", indicator: "i" }], risks: [{ name: "FX", likelihood: "likely", impact: "high", trigger: "t", mitigation: "m", owner: "E2" }], watch: [{ indicator: "Reserves", signal: "s", threshold: "t", source: "IMF" }], calendar: [{ when: "Nov", what: "Joint committee", why: "w", lead: "E7" }], askedOfUs: [{ ask: "A deposit", from: "Central bank", "our position": "Conditional", cost: "" }] };
  const IR = `# Ambassador's Brief\n\n## Bottom line\nStage it.\n\n## Who to see first\n- Minister\n\n# Updates and Standing Instructions\n\nWeekly.\n\n# Structured data\n\nNote.\n<mission1>\n${JSON.stringify(M1)}\n</mission1>`;
  const m1 = parseMission1(IR)!; assert.equal(m1.power.length, 2); assert.equal(m1.power[0].level, "decisive"); assert.equal(m1.power[1].group, "government", "an unknown group falls back"); assert.equal(m1.power[1].level, "influential"); assert.equal(m1.partners.length, 1); assert.deepEqual(m1.partners[0].dueDiligence, ["Ownership", "Sanctions screen"]); assert.equal(m1.plays.length, 1); assert.equal(m1.neighbours.length, 1); assert.equal(m1.scenarios[0].effects.length, 1); assert.equal(m1.calendar[0].lead, "E7"); assert.equal(m1.askedOfUs[0].position, "Conditional"); assert.equal(m1.askedOfUs[0].cost, "not estimated");
  assert.equal(parseMission1("none"), null); assert.equal(parseMission1("<mission1>{bad</mission1>"), null); assert.equal(parseMission1("<mission1>{}</mission1>"), null);
  const M2 = { strategy: { endState: "A strong partner", logic: "Because", objectives: [{ id: "O1", title: "Investment", why: "w", measures: ["m1", "m2"] }, { title: "" }], assumptions: ["a"], notDoing: ["n"], enablers: ["e"] },
    plans: { d100: [{ id: "D1", title: "Audit", objective: "O1", desk: "E3", owner: "Embassy", actions: ["a1", "a2"], kpi: "k", baseline: "", target: "t", cost: "", risk: "r", gate: "g", dependsOn: ["D2"], dueDiligence: ["Ownership"] }, { title: "" }], y1: [{ id: "Y1", title: "CEPA study" }], y3: [] },
    dueDiligence: [{ subject: "Acme Holding", kind: "weird", checks: ["Ownership"], source: "registry", ownerDesk: "E4", when: "Day 30" }], gates: [{ id: "G1", when: "Day 90", question: "Proceed?", evidence: "e", ifNo: "Pause" }], risks: [{ name: "FX", impact: "low" }], resources: [{ item: "A second commercial officer", why: "w", cost: "" }] };
  const PR = `# Mission Strategy\n\nEnd state.\n\n# Plans\n\n## 100-Day Plan\nEarly wins.\n\n# Due Diligence Register\n\nStandard.\n\n# Structured data\n\n<mission2>\n${JSON.stringify(M2)}\n</mission2>`;
  const m2 = parseMission2(PR)!; assert.equal(m2.plans.d100.length, 1); assert.equal(m2.plans.d100[0].baseline, ""); assert.equal(m2.plans.d100[0].cost, "not estimated"); assert.deepEqual(m2.plans.d100[0].dependsOn, ["D2"]); assert.equal(m2.plans.y1[0].id, "Y1"); assert.equal(m2.strategy.objectives.length, 1); assert.equal(m2.dueDiligence[0].kind, "partner", "an unknown kind falls back"); assert.equal(m2.gates[0].ifNo, "Pause"); assert.equal(m2.resources[0].cost, "not estimated");
  assert.equal(parseMission2("none"), null); assert.equal(parseMission2("<mission2>{}</mission2>"), null);
  // composing both sittings
  const ci = composeIntel([{ id: "I1", text: "## Political Section\n**Headline.** P.\n\n## Power and Stakeholder Mapping\n**Headline.** Q.\n\n## Regional and Multilateral Affairs\n**Headline.** R." }, { id: "I2", text: "## Investment and Sovereign Capital Desk\n**Headline.** S." }, { id: "chief", text: IR }]);
  const oi = ["# Ambassador's Brief", "# Updates and Standing Instructions", "# Country Team Reports", "# Structured data"].map((h) => ci.indexOf(h)); assert.ok(oi.every((x) => x >= 0) && oi.every((x, i) => i === 0 || x > oi[i - 1]), "intelligence reading order");
  assert.ok(embSection(ci, "Ambassador's Brief").includes("Bottom line") && embDesk(ci, EMB_AGENTS.find((a) => a.id === "invest")!).includes("S.") && embDesk(ci, EMB_AGENTS.find((a) => a.id === "power")!).includes("Q.") && !embDesk(ci, EMB_AGENTS.find((a) => a.id === "power")!).includes("P."));
  const cp = composePlan([{ id: "chief", text: PR }]); assert.ok(cp.includes("# Mission Strategy") && cp.includes("# Plans") && cp.includes("# Due Diligence Register") && cp.includes("<mission2>") && cp.includes("# Desk Lines of Effort") && cp.indexOf("# Mission Strategy") < cp.indexOf("# Plans"));
  assert.ok(composePlan([{ id: "chief", text: "" }]).includes("Not written"));
  const dg = embDigest(IR, PR)!; assert.deepEqual(dg.d100, ["D1 Audit"]); assert.equal(dg.plays[0].vehicle, "AD Ports Group"); assert.deepEqual(dg.contacts, ["Ministry of Investment"]); assert.deepEqual(dg.partners, ["Acme Holding"]); assert.equal(embDigest(null, null), null); assert.ok(embDigest(IR, null)!.d100.length === 0);


  // ---- a long answer cut off at the output limit is recovered, not lost
  assert.equal(repairJson('{"a":[{"x":1},{"y":2},{"z":'), '{"a":[{"x":1},{"y":2}]}'); assert.equal(repairJson('{"a":[1,2,"th'), null, "with no complete array or object there is nothing to keep"); assert.equal(repairJson("no brackets"), null); assert.equal(repairJson('{"s":"a ] } [ { in a string","n":'), null, "brackets inside strings do not count");
  const cut = jsonBlock('<king>{"decision":{"course":"hold","confidence":"low","headline":"h"},"risks":[{"name":"A","impact":"low"},{"name":"B","imp', "king")!; assert.equal(cut.partial, true); assert.equal((cut.data.risks as unknown[]).length, 1, "the complete risk survives, the cut one does not"); assert.equal(jsonBlock('<king>{"a":1}</king>', "king")!.partial, false); assert.equal(jsonBlock('<king>{"a":1}', "king")!.partial, true, "an unclosed tag is partial"); assert.equal(jsonBlock("nothing", "king"), null); assert.equal(jsonBlock('<king>[1,2]</king>', "king"), null, "an array is not an object"); assert.equal(jsonBlock('<king>```json\n{"a":2}\n```</king>', "king")!.data.a, 2, "a fenced block is read");
  const truncated = parseMission2(PR.replace("</mission2>", "").replace(/"gates":[\s\S]*$/, '"gates":[{"id":"G1","when":"Day 9')); assert.ok(truncated && truncated.partial && truncated.plans.d100.length === 1 && truncated.strategy.objectives.length === 1, "a cut plan keeps what was complete and says so"); assert.equal(parseMission2(PR)!.partial, false);
  assert.equal(parseKing(KR.replace("</king>", "").replace(/"watch":[\s\S]*$/, '"watch":[{"indicator":"Reser'))!.partial, true); assert.equal(parseKing(KR)!.partial, false); assert.equal(parseMission1(IR)!.partial, false);

  // ---- fixes from the independent review
  assert.equal(jsonBlock('Note: put it between <king> and </king>.\n<king>{"a":1}</king>', "king")!.data.a, 1, "a note that names the tags does not hide the real block");
  assert.deepEqual(citedIds('{"evidence":["F12","F14"]} [F3] a jet, F35').sort(), ["F12", "F14", "F3"], "ids in the JSON evidence lists are collected, bare F35 prose is not");
  assert.ok(!routeTopic("software toward", KING_AGENTS, ["law"]).some((r) => r.why !== "general cover"), "war inside toward and software is not a match");
  const names = KING_AGENTS.map((a) => a.en); const grp = "## Geopolitics and Regional Order\n**Headline.** A.\n## Evidence\nmore geo\n\n## Domestic Politics, Leadership and Succession\n**Headline.** B.";
  assert.ok(sectionOfGroup(grp, names[0], names).includes("more geo") && sectionOfGroup(grp, names[0], names).includes("### Evidence") && !sectionOfGroup(grp, names[0], names).includes("B."), "an inner heading does not end a specialist's section");
  const cs = [{ country: "Niger" }, { country: "Sudan" }, { country: "Libya" }]; assert.equal(matchCountry("Nigeria", cs, ["Nigeria", "Niger"]), undefined); assert.equal(matchCountry("Sudan", cs, ["Sudan", "South Sudan"])!.country, "Sudan"); assert.equal(matchCountry("South Sudan", cs, ["Sudan", "South Sudan"]), undefined, "Sudan is not South Sudan"); assert.equal(matchCountry("libya", cs, ["Libya"])!.country, "Libya");
  assert.ok(deskBase({ facts: "x", asOf: "d", country: "Egypt", options: O({ lang: "ar" }), context: "", contextLabel: "c" }).includes("level-1 and level-2 heading"), "Arabic runs keep the headings the software reads");
  assert.ok(embPlanGroupRole(EMB_PLAN_GROUPS[0]).includes("E3 Investment and Sovereign Capital Desk") && embPlanChiefRole({}, "", {}).includes("E13 Legal"), "the plan prompts print the desk codes");

  // ---- the independent review
  const RV = { verdict: "revise", summary: "Sound but two initiatives lack owners.", strengths: ["Evidence cited"], issues: [{ where: "D3", severity: "high", problem: "No owner", fix: "Name one" }, { where: "", severity: "weird", problem: "", fix: "" }, { where: "J2", severity: "weird", problem: "No fact id", fix: "Cite" }], unsupported: ["The deposit size"], boundary: [], conflicts: ["Brief says staged; data says hold"], missing: ["Treaty text"] };
  const rv = parseReview(`# Independent Review\nText\n<review>${JSON.stringify(RV)}</review>`)!; assert.equal(rv.verdict, "revise"); assert.equal(rv.issues.length, 2, "an issue with no problem is dropped"); assert.equal(rv.issues[1].severity, "medium", "an unknown severity becomes medium"); assert.deepEqual(rv.conflicts, ["Brief says staged; data says hold"]); assert.equal(rv.partial, false);
  assert.equal(parseReview("none"), null); assert.equal(parseReview(`<review>${JSON.stringify({ ...RV, verdict: "maybe" })}</review>`), null, "an unknown verdict is not a review"); assert.equal(parseReview(`<review>${JSON.stringify(RV)}`)!.partial, true);
  const withRev = composeKing([...parts, { id: "review", text: `# Independent Review\nOK.\n<review>${JSON.stringify(RV)}</review>` }]); assert.ok(withRev.indexOf("# Structured data") < withRev.indexOf("# Independent Review"), "the review comes last"); assert.ok(parseKing(withRev) !== null && parseReview(withRev)!.verdict === "revise", "decision and review are both readable from the compiled product");
  assert.ok(composePlan([{ id: "chief", text: PR }, { id: "review", text: `# Independent Review\nOK.\n<review>${JSON.stringify(RV)}</review>` }]).includes("# Independent Review"));

  // ---- the quality gate
  const SRC = [{ url: "https://www.imf.org/en/Publications" }, { url: "https://www.chathamhouse.org/2026/x" }, { url: "https://www.reuters.com/world/x" }, { url: "https://example.com/y" }, { url: "not a url" }];
  const sm = sourceMix(SRC); assert.deepEqual([sm.official, sm.thinktank, sm.news, sm.other, sm.total], [1, 1, 1, 1, 4], "sources are classed and a bad URL is ignored");
  assert.equal(boundaryHits("The UAE must never bribe officials and rules out covert action; we analyse the proxies Iran uses.").length, 0, "negated or analytic mentions do not count"); assert.ok(boundaryHits("We recommend the embassy should covertly fund the militia and bribe the minister.").length >= 1, "advice to do what the boundary forbids is caught");
  const gk = assessKing(KR, SRC, "en"); assert.equal(gk.kind, "king-council"); assert.ok(gk.score >= 0 && gk.score <= 100 && ["A", "B", "C", "D"].includes(gk.grade)); assert.ok(gk.checks.some((c) => c.id === "mix" && c.ok) && gk.checks.some((c) => c.id === "parse" && c.ok) && gk.checks.some((c) => c.id === "review" && !c.ok), "no review on file fails the review check"); assert.ok(gk.checks.some((c) => c.id === "judgments" && !c.ok), "a two-judgment decision fails the judgments check");
  const gkr = assessKing(`${KR}\n# Independent Review\n<review>${JSON.stringify(RV)}</review>`, SRC, "en"); assert.ok(gkr.review !== null && gkr.checks.find((c) => c.id === "review")!.ok === false, "a high-severity issue fails the review check"); assert.ok(assessKing(KR, [], "ar").checks.find((c) => c.id === "lang")!.ok === false, "English text fails an Arabic request");
  const gp = assessPlan(PR, SRC, "en"); assert.ok(gp.checks.find((c) => c.id === "owners")!.ok === false && gp.checks.find((c) => c.id === "horizons")!.ok === false, "a thin plan fails the integrity checks"); assert.ok(gp.checks.find((c) => c.id === "ids")!.ok === false, "a dangling dependency is caught (D1 depends on D2)");
  const gi = assessIntel(IR, SRC, "en"); assert.ok(gi.checks.find((c) => c.id === "partners")!.ok === false && gi.checks.find((c) => c.id === "parse")!.ok === true); assert.equal(assess("emb-plan", PR, SRC, "en").kind, "emb-plan");
  assert.ok(assessKing("# Executive Brief\nx", [], null).checks.find((c) => c.id === "parse")!.ok === false && assessKing("", [], null).score <= 40, "an empty product scores low");
  // ---- the run plans
  const kp = planFor("king-council", O(), ""); assert.equal(kp.calls.length, 6); assert.equal(kp.calls.filter((c) => c.stage === 0).length, 4); assert.equal(kp.calls[5].id, "review"); assert.equal(kp.calls[5].stage, 2); assert.ok(kp.calls[5].role({ chair: "THE CHAIR TEXT" }).includes("THE CHAIR TEXT") && /<review>/.test(kp.calls[5].role({})) && /Decision Auditor/.test(kp.calls[5].role({})), "the auditor reads the Chair's product"); assert.equal(kp.calls[4].id, "chair"); assert.equal(kp.calls[4].searches, 0); assert.ok(kp.calls.slice(0, 4).every((c) => c.searches >= 2), "the specialists search; the chair does not"); assert.ok(kp.calls[4].role({ G1: "SEAT TEXT" }).includes("SEAT TEXT")); assert.ok(kp.system === KING_SYSTEM);
  const ip = planFor("emb-intel", O(), ""); assert.equal(ip.calls.length, 5); assert.equal(ip.calls[4].id, "chief"); const pctx = embContext({ kingBrief: KR, embIntel: IR }, "emb-plan"); const pp = planFor("emb-plan", O(), pctx); assert.equal(pp.calls.length, 5); assert.equal(pp.calls[4].id, "review"); assert.ok(pp.calls[4].role({ chief: "THE PLAN TEXT" }).includes("THE PLAN TEXT") && /Plan Inspector/.test(pp.calls[4].role({})), "the inspector reads the Chief's plan"); assert.ok(pp.calls[3].role({}).includes("Stage it.") && pp.calls[3].role({}).includes("Who to see first") && pp.calls[3].role({}).includes("Minister"), "the plan sitting reads the whole intelligence brief, headings and all, not just the text up to its first heading"); assert.ok(!pp.calls[3].role({}).includes("Bottom line.\n\n# Detailed"), "and not the head of state's brief"); assert.ok(pp.calls[0].role({}).includes("PLAN sitting"));
  const kd = planFor("king-directive", O({ topic: "port concession and sanctions", mode: "directive" }), ""); assert.equal(kd.calls.length, 2); assert.ok(kd.calls[0].agents.includes("invest") || kd.calls[0].agents.includes("law")); assert.ok(kd.calls[0].role({}).includes("port concession")); assert.ok(kd.calls[1].role({ D: "ANS" }).includes("ANS") && kd.calls[1].role({ D: "x" }).includes("DIRECTIVE"));
  const ku = planFor("king-directive", O({ mode: "update" }), ""); assert.equal(ku.calls.length, 1); assert.equal(ku.calls[0].searches, 3); assert.ok(ku.calls[0].role({}).includes("UPDATE") && ku.calls[0].role({}).includes("<directive>"));
  const eu = planFor("emb-directive", O({ mode: "update" }), ""); assert.equal(eu.calls.length, 1); assert.ok(eu.calls[0].role({}).includes("UPDATE") && eu.calls[0].id === EMB_CHIEF.id);
  const ed = planFor("emb-directive", O({ topic: "Who should we meet before the minister's visit?" }), ""); assert.equal(ed.calls.length, 2); assert.equal(ed.calls[1].id, "chief");
  const comp = ed.compose([{ id: "D", text: "## Political Section\nfound" }, { id: "chief", text: "# Answer\nDo X\n<directive>{}</directive>" }]); assert.ok(comp.startsWith("# Answer") && comp.includes("# Desk Findings") && comp.includes("found")); assert.ok(kd.compose([{ id: "chair", text: "# Answer\nA" }]).includes("# Answer") && !kd.compose([{ id: "chair", text: "# Answer\nA" }]).includes("Specialist Findings"), "no findings, no findings heading");
  assert.ok(kp.contextLabel.length > 10 && planFor("emb-intel", O(), "").contextLabel.includes("head of state"));
  assert.ok(KING_CHAIR.maxTokens > 10_000 && EMB_CHIEF.maxTokens >= 12_000 && EMB_PLAN_CHIEF.maxTokens >= EMB_CHIEF.maxTokens, "the writers have room for the structured data");

  const arPlan = planFor("king-council", O({ lang: "ar" }), ""); assert.ok(arPlan.calls.every((c, i) => c.maxTokens > kp.calls[i].maxTokens) && arPlan.worst > kp.worst, "Arabic runs get more output room"); assert.ok(arPlan.worst < 1.7, "and are still guarded by the runtime ceiling");

  // ---- context: what each desk reads of the other, trimmed and de-tagged
  const kctx = kingContext({ council: null, embIntel: IR, embPlan: PR }); assert.ok(kctx.includes("Stage it.") && kctx.includes("End state.") && !kctx.includes("<mission") && !kctx.includes("Ownership"), "structured data is not passed as context");
  assert.equal(kingContext({}), ""); const ectx = embContext({ kingBrief: KR, embIntel: IR }, "emb-plan"); assert.ok(ectx.includes("Bottom line.") && ectx.includes("Stage it.") && !ectx.includes("<king>")); assert.ok(!embContext({ kingBrief: KR, embIntel: IR }, "emb-intel").includes("Stage it."), "the intelligence sitting does not read its own earlier brief"); assert.ok(embContext({ embIntel: IR, embPlan: PR }, "emb-directive").includes("End state."));

  // ---- the UAE in the country, on real held data
  const egy = (await buildCase("EGY", new Date("2026-10-26T10:00:00Z")))!; assert.ok(egy, "Egypt case builds");
  const h = uaeHistory(egy); assert.ok(h.series.length >= 3, "several long series are held for Egypt"); assert.ok(h.series.every((s) => s.pts.length >= 2 && s.pts.every((p, i, a) => i === 0 || a[i - 1][0] <= p[0]) && s.peak![1] >= s.last![1] && s.trough![1] <= s.last![1]), "series sorted, peak and trough bound the latest");
  assert.ok(h.summary.length >= 4 && h.summary.every((x) => x.en.length > 20 && /[؀-ۿ]/.test(x.ar)), "every summary line has English and Arabic"); assert.ok(h.limits.length === 4);
  const tr = h.series.find((s) => s.id === "trade"); assert.ok(tr && tr.first && tr.last && tr.last[0] > tr.first[0]); assert.ok(tr!.last![1] > 1e9 && tr!.last![1] < 1e12, "trade is scaled from US$ millions to dollars (Egypt is billions, not thousands)"); assert.ok(/US\$\d+(\.\d)?bn/.test(h.summary[0].en), "and printed in billions"); assert.ok(h.summary[0].en.includes("Egypt") && h.summary[0].en.includes("trade")); assert.ok(h.eras.find((e) => e.id === "trade")!.eras.length === 3);
  assert.ok(h.deals.length === egy.deals.length && h.deals.every((x, i, a) => i === 0 || a[i - 1].d >= x.d), "deals are listed newest first"); assert.equal(h.dealYears.reduce((a, y) => a + y.n, 0), h.deals.length);
  assert.equal(fmtV({ ...tr!, kind: "usd" }, 2.5e9), "US$2.5bn"); assert.equal(fmtV({ ...tr!, kind: "pct" }, 4.25), "4.3%");
  const hf = deskExtraFacts(egy); assert.deepEqual(hf.map((x) => x.kind), ["uae-vehicles", "uae-advantage", "neighbour-relations", "uae-history"], "four computed fact entries join the Case File evidence"); assert.ok(hf[3].text.includes("Egypt") && hf[3].text.includes("Limits"));
  // a country with no deals and no long series still produces an honest panel
  const sparse = { ...egy, deals: [], spine: egy.spine.map((s) => ({ ...s, has: false, series: [] })), capture: null } as typeof egy; const hs = uaeHistory(sparse); assert.equal(hs.series.length, 0); assert.ok(hs.summary.some((x) => /unknown, not zero/.test(x.en)) && hs.summary.some((x) => /No UAE deal headline/.test(x.en)));


  // ---- the Case File reports read the new products
  const rc = (o: Partial<Ctx> = {}): Ctx => ({ d: egy, council: null, arch: null, others: [], lang: "en", today: Date.parse("2026-10-26T10:00:00Z"), ...o });
  const full = rc({ embIntel: IR, embPlan: PR, kingCouncil: KR }); const out = (id: string, c: Ctx) => BLOCK_BY.get(id)!.build(c);
  assert.ok(out("ambBrief", full).md.includes("Bottom line") && out("ambBrief", full).state === "written");
  assert.ok(out("ambPlans", full).md.includes("Audit") && out("ambPlans", full).md.includes("Proceed?") && out("ambPlans", full).md.includes("Due diligence first"), "the plan block carries initiatives with due diligence and the gates");
  assert.ok(out("ambPlays", full).md.includes("AD Ports Group") && out("ambPlays", full).md.includes("Concession terms"));
  assert.ok(out("ambContacts", full).md.includes("Ministry of Investment") && out("ambContacts", full).md.includes("decisive") && /Public roles and organisations only/.test(out("ambContacts", full).md));
  assert.ok(out("ambPartners", full).md.includes("Acme Holding") && out("ambPartners", full).md.includes("Sanctions screen") && /approval or a commitment/.test(out("ambPartners", full).md));
  assert.ok(out("ambScenarios", full).md.includes("Baseline") && out("ambScenarios", full).md.includes("Effect by desk"));
  assert.ok(out("ambNeighbours", full).md.includes("For the UAE: i") && out("ambNeighbours", full).state === "written", "the desk's reading of Libya sits beside the held facts");
  assert.ok(out("kingCouncil", full).md.includes("Commit in stages") && out("kingCouncil", full).md.includes("Audit first") && out("kingCouncil", full).md.includes("Bottom line."), "the memo carries the Council's call and its Executive Brief");
  assert.equal(out("ambPlans", rc()).state, "missing"); assert.equal(out("ambPlans", rc()).need, "embassyPlan"); assert.equal(out("ambContacts", rc()).need, "ambassador"); assert.equal(out("ambPartners", rc()).state, "missing"); assert.equal(out("kingCouncil", rc()).need, "kingCouncil");
  assert.equal(out("ambPlays", rc({ embIntel: IR.replace(/<mission1>[\s\S]*<\/mission1>/, "") })).state, "written", "an intelligence brief without structured data still reports what it has");
  for (const id of ["ambassador", "embassyPlan", "kingCouncil"] as const) assert.ok(CASE_PRODUCTS[id].usd > 0 && CASE_PRODUCTS[id].en && CASE_PRODUCTS[id].ar && CASE_PRODUCTS[id].adds.en);
  assert.ok(TEMPLATE_BY.get("king")!.blocks.includes("kingCouncil") && TEMPLATE_BY.get("ambassador")!.blocks.includes("ambPartners"));
  const ar = buildReport(TEMPLATE_BY.get("ambassador")!.blocks, rc({ lang: "ar", embIntel: IR, embPlan: PR }), { title: "t", preparedFor: "", reviewer: "" }); assert.ok(ar.md.includes("شركات القطاع الخاص المستهدفة") && ar.md.includes("من يملك القوة") && ar.md.includes("بوابات القرار"), "the pack is written in Arabic headings"); assert.equal(ar.missing.length, 0);
  // ---- recording a directive as a decision
  const dd = kingDirectiveDecision("EGY", "Egypt", { topic: "Convert the deposit?", mode: "directive", ref: "abc" }, pd, "A. Decider", new Date("2026-10-26T10:00:00Z"), 3); assert.equal(dd.source, "king"); assert.equal(dd.iso3, "EGY"); assert.equal(dd.owner, "A. Decider"); assert.equal(dd.review, "2026-11-25", "a directive is reviewed in 30 days"); assert.ok(dd.decision.startsWith("THE KING · Egypt · directive") && dd.decision.length <= 300); assert.equal(dd.milestones.length, 1); assert.equal(dd.ref, "king-dir:EGY:abc"); assert.equal(dd.status, "open");
  console.log("desk: all checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
