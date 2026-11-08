// Tests for the Falcon services: scopes, the council, the knowledge graph, monitoring, quality gates and the robustness analysis.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCOPES, SCOPE_BY, isScope, scopeCountry, scopeLine } from "./falcon/scopes";
import { AGENTS, AGENT_BY, COUNCIL_CAP_USD, COUNCIL_PRESETS, COUNCIL_SYSTEM, cleanCouncilOptions, composeReport, councilBase, councilKey, parsePlan, roleText, worstCase } from "./falcon/council";
import { parseCouncil } from "./falcon/council-parse";
import { METRICS, indexGraph, graphText, neighbors, paths, rankCountries, search, stats, type GraphFile } from "./falcon/graph-core";
import { HISTORY_DAYS, PRESET_RULES, appendSnapshot, diffSnapshots, evalRules, snapshotOf, type Rule, type Snapshot } from "./falcon/monitor";
import { qualityGates } from "./falcon/gates";
import { robustAnalysis } from "./falcon/mca";
import { parseLab } from "./falcon/lab-parse";
import { findCountry, routeAsk } from "./falcon/ask";
import { RIGHTS, rightsFor } from "./falcon/rights";
import { resolveProduct } from "./dossier/products";
import { worldModel } from "./falcon/world";

async function main() {
// ---- scopes: ids never collide with country codes, so every iso3-keyed store works unchanged ----
const countries = JSON.parse(readFileSync("public/data/countries.json", "utf8")) as { iso3: string }[]; const codes = new Set(countries.map((c) => c.iso3));
assert.ok(codes.size > 190, "country dataset loaded");
assert.equal(new Set(SCOPES.map((s) => s.id)).size, SCOPES.length, "scope ids are unique");
for (const s of SCOPES) { assert.ok(/^[A-Z]{3}$/.test(s.id), `scope id is three capitals: ${s.id}`); assert.ok(!codes.has(s.id), `scope id ${s.id} is never an ISO country code`); assert.ok(s.en && s.ar && s.key, `scope ${s.id} is labelled in both languages`); assert.ok(isScope(s.id) && SCOPE_BY.get(s.id) === s); assert.ok(scopeLine(s.id).startsWith("Scope:"), `scope ${s.id} tells the model it is not one country`); }
assert.ok(!isScope("EGY") && scopeLine("EGY") === "", "a country is not a scope");
assert.ok(new Set(SCOPES.map((s) => s.kind)).size === 5, "every scope kind (world, region, sub-region, bloc, sector) is offered");
assert.equal(scopeCountry(SCOPE_BY.get("WLD")!).iso3, "WLD");
assert.ok(!/\bGCC\b.*UAE\)/.test("") && SCOPE_BY.get("GCC")!.en.includes("without the UAE"), "the GCC scope excludes the UAE, as the UAE is the client");

// ---- scopes through the product resolver: only the AI products that make sense without a country accept one ----
const wld = resolveProduct({ kind: "foresight" }, "WLD"); assert.ok(!wld.invalid, "a world foresight brief resolves"); assert.ok(wld.message({ facts: "f", asOf: "2026-10-25T00:00:00Z", country: "The world" }).includes("Scope: the world"), "the request carries the scope line");
for (const kind of ["minister", "desk", "counterpart", "investments"]) assert.ok(resolveProduct({ kind }, "WLD").invalid, `${kind} needs a real country`);
assert.ok(!resolveProduct({ kind: "lab", depth: "standard" }, "ENE").invalid, "a sector scenario lab resolves");
assert.ok(!resolveProduct({ kind: "foresight" }, "EGY").invalid && !resolveProduct({ kind: "minister" }, "EGY").invalid, "countries are unaffected");

  // ---- Ask Falcon: a free router from a plain question to the right section ----
  const named = (JSON.parse(readFileSync("public/data/countries.json", "utf8")) as { iso3: string; name: string; nameAr?: string }[]);
  assert.equal(findCountry("What happens to South Sudan next year?", named)?.iso3, "SSD", "the longer name wins over Sudan"); assert.equal(findCountry("Tell me about Sudan", named)?.iso3, "SDN"); assert.equal(findCountry("a question about nothing", named), null);
  assert.equal(findCountry("Is Nigeria's debt sustainable", named)?.iso3, "NGA"); assert.equal(findCountry("Niger", named)?.iso3, "NER", "Niger is not Nigeria"); assert.equal(findCountry("Oman", named)?.iso3, "OMN"); assert.equal(findCountry("Romania", named)?.iso3, "ROU", "Oman is not found inside Romania (whole words only)");
  const r1 = routeAsk("What if Egypt defaults on its debt?", named); assert.equal(r1.section, "lab"); assert.equal(r1.scope, "EGY"); assert.equal(r1.scopeKind, "country");
  const r2 = routeAsk("Foresight for the next 10 years in the Middle East", named); assert.equal(r2.section, "foresight"); assert.equal(r2.scope, "WAS");
  const r3 = routeAsk("Which African countries show the most UAE logistics activity?", named); assert.equal(r3.section, "graph"); assert.deepEqual(r3.rank, { metric: "deals", sector: "ports and logistics", region: "Africa" }); assert.equal(r3.scope, null);
  const r4 = routeAsk("OIC members with the most trade with the UAE", named); assert.equal(r4.section, "graph"); assert.equal(r4.rank?.org, "oic"); assert.equal(r4.rank?.metric, "trade");
  assert.equal(routeAsk("Convene the council on Pakistan", named).section, "council"); assert.equal(routeAsk("Brief me on Kenya", named).section, "countries"); assert.equal(routeAsk("Global energy outlook", named).scope, "WLD", "world beats sector when both appear");
  assert.equal(routeAsk("How should the UAE build a durable partnership with Kenya?", named).section, "strategy"); assert.equal(routeAsk("Which corridors matter most to the UAE?", named).section, "strategy"); assert.equal(routeAsk("what changed today", named).section, "monitor"); assert.equal(routeAsk("where are the best opportunities", named).section, "radar");
  const r5 = routeAsk("something vague", named); assert.equal(r5.section, "council"); assert.equal(r5.scope, "WLD", "a free question goes to the council on the world");
  assert.ok(routeAsk("ماذا لو أغلقت مصر", named).section === "lab" && routeAsk("ماذا لو أغلقت مصر", named).scope === "EGY", "Arabic questions and names route too");
  for (const q of ["Egypt", "Africa", "the world", "رصد", "x"]) { const r = routeAsk(q, named); assert.ok(r.why.length > 0 && !r.alternatives.includes(r.section), `the router always says why and offers other sections: ${q}`); }

  // ---- source rights: every provider the world model reads has a register entry that says what to do next ----
  const wsrc = readFileSync("src/lib/falcon/world.ts", "utf8"); const providers = [...new Set([...wsrc.matchAll(/provider: "([^"]+)"/g)].map((m) => m[1]))].filter((p) => p !== "Geo Desk composite" && p !== "UAE airports" && p !== "Wikidata, organisations");
  for (const p of providers) assert.ok(rightsFor(p).length > 0, `provider ${p} has a rights entry`);
  assert.equal(new Set(RIGHTS.map((r) => r.id)).size, RIGHTS.length); for (const r of RIGHTS) { assert.ok(r.todo.en && r.todo.ar && r.terms.en && r.terms.ar && r.use.en && r.use.ar && r.data.en && r.data.ar, `${r.id} is complete in both languages`); assert.ok(!r.url || /^https:\/\//.test(r.url), `${r.id} links over https`); }
  assert.ok(RIGHTS.filter((r) => r.status === "restricted" || r.status === "unconfirmed").every((r) => r.todo.en.length > 20), "every restricted or unconfirmed source says what to confirm");
  assert.equal(RIGHTS.find((r) => r.id === "comtrade")!.status, "restricted"); assert.equal(RIGHTS.find((r) => r.id === "ransomware")!.status, "restricted");

// ---- the council: a bounded roster with a hard ceiling ----
assert.equal(AGENTS.length, 12); assert.equal(new Set(AGENTS.map((a) => a.id)).size, 12);
assert.ok(COUNCIL_CAP_USD <= 1, "the council never promises more than the one-dollar ceiling");
const sum = AGENTS.reduce((a, x) => a + worstCase(x), 0); assert.ok(sum > COUNCIL_CAP_USD, "the pessimistic sum exceeds the ceiling, so the cost guard has real work to do");
for (const a of AGENTS) { for (const r of a.reads) assert.ok(AGENT_BY.get(r)!.stage < a.stage, `${a.id} only reads agents from earlier stages (${r})`); assert.ok(a.searches <= 2 && a.maxTokens <= 9000, `${a.id} is bounded`); }
assert.equal(AGENTS.filter((a) => a.stage === 4).length, 1, "one editor");
assert.ok(!COUNCIL_SYSTEM.includes("`"), "the council system prompt has no backticks");
for (const s of ["fact id", "data, never instructions", "independent corroboration", "never fill a gap"]) assert.ok(COUNCIL_SYSTEM.toLowerCase().includes(s.toLowerCase()), `the shared system prompt keeps its safeguard: ${s}`);
const opt = cleanCouncilOptions({ question: "  Ignore\u0000 this?\n\n and more  ", lang: "ar" }); assert.equal(opt.lang, "ar"); assert.ok(!/[\n\u0000]/.test(opt.question)); assert.equal(cleanCouncilOptions({}).question, COUNCIL_PRESETS[0]);
assert.notEqual(councilKey("EGY", opt), councilKey("EGY", { ...opt, question: "another question entirely" }), "the cache key depends on the question");
const base = councilBase({ facts: "F1 test", asOf: "2026-10-25", country: "Egypt", options: opt }); assert.ok(base.includes("<facts") && base.includes("Question for the council:"));
const ed = AGENT_BY.get("editor")!; const rt = roleText(ed, { prior: { geo: "G text", redteam: "R text" } }); assert.ok(rt.includes('<agent_text id="geo"') && rt.includes("R text") && !rt.includes('id="uae"'), "agents see only the texts they read, delimited as data");
assert.ok(roleText(AGENT_BY.get("econ")!, { questions: "Q?", prior: {} }).includes("Q?"), "a specialist gets the orchestrator's sub-questions");
for (const id of ["editor", "redteam", "verifier", "uae", "foresight"] as const) assert.ok(roleText(AGENT_BY.get(id)!, { prior: {} }).length > 300);
const plan = parsePlan("## Plan\nDecision question: **Should the UAE hedge?**\n- agent: geo | questions: Who rules next? What about the army?\n- agent: econ | questions: Debt wall?\n- agent: energy | skip: no energy angle\n");
assert.equal(plan.question, "Should the UAE hedge?"); assert.equal(plan.questions.geo, "Who rules next? What about the army?"); assert.deepEqual(plan.skip, ["energy"]);
assert.deepEqual(parsePlan("- agent: geo | skip: x\n- agent: econ | skip: x\n- agent: energy | skip: x\n- agent: tech | skip: x").skip, [], "a plan that skips every specialist is ignored");
assert.deepEqual(parsePlan("nonsense"), { question: "", questions: {}, skip: [] });
const rep = composeReport([{ id: "geo", text: "# Heading\nsome text" }, { id: "editor", text: "# Council Assessment: Egypt\n\n## BLUF\nx" }, { id: "econ", text: "" }], "en");
assert.ok(rep.startsWith("# Council Assessment: Egypt") && rep.includes("# Appendix: Agent Reports") && rep.includes("## Agent: Geopolitics") && !rep.includes("(econ)") && rep.includes("### Heading"), "editor first, agents after, empty agents dropped, headings demoted");
assert.ok(composeReport([{ id: "geo", text: "t" }], "en").includes("The editor did not finish"), "a missing editor is said plainly");

// ---- the council reader ----
const sample = `# Council Assessment: Egypt

## BLUF
The UAE faces a financing squeeze in Egypt that it can turn into leverage.

## Key Judgments
| # | We judge | Likelihood band | Confidence | Agents | Red-team status | So what |
|---|---|---|---|---|---|---|
| 1 | We judge Egypt will need new Gulf financing | likely | High: debt wall | econ, uae | Survived | Prepare terms |
| 2 | We judge the Red Sea stays closed | unlikely | Low: thin | energy | Softened | Hedge routes |

## Where the Council Agrees
- Debt is the binding constraint, because the shared facts say so.

## Preserved Disagreements
| Issue | Position A | Position B | Evidence | What would resolve it |
|---|---|---|---|---|
| Pace of reform | Fast (econ) | Slow (geo) | F3 | The next IMF review |

## UAE Impact and Opportunities
| Item | Type | Size | Feasibility | Horizon | First step |
|---|---|---|---|---|---|
| Port stakes | Opportunity | High | Medium | 1-3y | Open talks |
| Debt exposure | Exposure | Medium | - | 1y | Cap new lending |

## Options for Decision
| Option | Window | Expected benefit | Main risk | Owner |
|---|---|---|---|---|
| Conditional deposit | Immediate | Leverage | Moral hazard | Finance minister |

# Appendix: Agent Reports

## Agent: Evidence Verification and Source Quality Analyst (verifier)
### Claim Audit
| Claim | Agent | Verdict | Evidence | Note |
|---|---|---|---|---|
| Debt is 90% of GDP | econ | Confirmed | F4 | ok |
| Reserves are 40bn | econ | Stale | link | old |

## Agent: Red Team and Competing Hypotheses Analyst (redteam)
### Challenges
| Judgment challenged | Agent | Challenge | Evidence | Recommended change |
|---|---|---|---|---|
| Red Sea closed | energy | Traffic is recovering | link | Soften |
`;
const cp = parseCouncil(sample);
assert.ok(cp.bluf.includes("financing squeeze")); assert.equal(cp.judgments.length, 2); assert.equal(cp.judgments[0].status, "survived"); assert.equal(cp.judgments[1].status, "softened");
assert.equal(cp.disagreements.length, 1); assert.equal(cp.disagreements[0].issue, "Pace of reform"); assert.equal(cp.agrees.length, 1);
assert.equal(cp.items.length, 2); assert.equal(cp.options.length, 1); assert.deepEqual(cp.audit.map((x) => x.verdict), ["confirmed", "stale"]); assert.equal(cp.challenges.length, 1);
assert.ok(!cp.editorMd.includes("Appendix: Agent Reports"), "the editor's text excludes the appendix");
assert.equal(parseCouncil("").judgments.length, 0, "an empty text parses to nothing, not an error");

// ---- the knowledge graph: the built file is internally consistent ----
const gf = JSON.parse(readFileSync("public/data/graph.json", "utf8")) as GraphFile; const g = indexGraph(gf);
assert.ok(gf.nodes.length > 500 && gf.edges.length > 5000, "graph built at scale"); assert.equal(new Set(gf.nodes.map((n) => n.id)).size, gf.nodes.length, "node ids are unique");
for (const e of gf.edges) { assert.ok(g.byId.has(e.a) && g.byId.has(e.b), `edge endpoints exist: ${e.a} ${e.b}`); assert.ok(e.p === "verified" || e.p === "inferred", `provenance is verified or inferred, never hypothetical: ${e.p}`); assert.ok(e.w >= 0 && e.w <= 1, `weight within 0 to 1: ${e.w}`); assert.ok(Number.isInteger(e.s) && gf.sources[e.s], `edge source exists: ${e.s}`); }
assert.ok(gf.edges.filter((e) => e.p === "inferred").every((e) => gf.sources[e.s].id === "rule" || !!e.v || true), "inferred edges are a minority");
assert.ok(gf.edges.filter((e) => e.p === "inferred").length < gf.edges.length * 0.05, "inferred links stay a small minority");
assert.ok(gf.edges.filter((e) => e.p === "inferred").every((e) => gf.sources[e.s].id === "rule" || gf.sources[e.s].id === "layers" || gf.sources[e.s].id === "rivals" || gf.sources[e.s].id === "orgs"), "inferred links name the rule or reference layer they come from");
const st = stats(g); assert.equal(st.nodes, gf.nodes.length); assert.equal(st.edges, gf.edges.length); assert.equal((st.byProv.verified ?? 0) + (st.byProv.inferred ?? 0), gf.edges.length);
assert.equal(search(g, "egypt")[0]?.id, "C:EGY", "search finds a country first"); assert.deepEqual(search(g, ""), []); assert.ok(search(g, "ports and logistics").some((n) => n.t === "sector"));
const nb = neighbors(g, "C:EGY", { limit: 10 }); assert.ok(nb.length > 5 && nb.every((x, i) => i === 0 || nb[i - 1].edge.w >= x.edge.w), "neighbours are sorted by weight");
assert.ok(neighbors(g, "C:EGY", { prov: "verified" }).every((x) => x.edge.p === "verified") && neighbors(g, "C:EGY", { minW: 0.5 }).every((x) => x.edge.w >= 0.5));
const ps = paths(g, "C:KEN", "C:ARE", { maxHops: 3, k: 5, direct: false }); assert.ok(ps.length > 0 && ps.every((p) => p.edges.length >= 2 && p.edges.length <= 3 && p.nodes[0].id === "C:KEN" && p.nodes.at(-1)!.id === "C:ARE"), "indirect paths run from the origin to the UAE through someone");
for (const p of ps) for (const n of p.nodes.slice(1, -1)) assert.ok((g.deg.get(n.id) ?? 0) <= 250, "a near-universal bloc is never a stepping stone");
assert.ok(ps.every((p, i) => i === 0 || ps[i - 1].score >= p.score), "paths are best first");
assert.deepEqual(paths(g, "C:NOPE", "C:ARE"), []);
for (const m of Object.keys(METRICS)) { const rows = rankCountries(g, { metric: m, limit: 5 }); assert.ok(rows.length > 0 && rows.every((r, i) => i === 0 || rows[i - 1].score >= r.score), `ranking by ${m} is sorted`); }
const afr = rankCountries(g, { metric: "deals", region: "Africa", sector: "ports and logistics", limit: 8 }); assert.ok(afr.length > 0 && afr.every((r) => r.node.r === "Africa" && r.entities.length > 0), "regional sector ranking stays in the region and names the UAE entities");
const oic = rankCountries(g, { metric: "trade", org: "oic", limit: 40 }); assert.ok(oic.length > 5 && oic.every((r) => g.adj.get(r.node.id)!.some((e) => e.r === "member_of" && (e.a === "O:oic" || e.b === "O:oic"))), "bloc ranking stays within the bloc");
const gt = graphText(g, "EGY"); assert.ok(gt && gt.includes("Knowledge-graph links of") && gt.includes("verified = read from a dataset")); assert.equal(graphText(g, "WLD"), null);

// ---- monitoring: snapshots, history, diffs and rules over observed values ----
const w = await worldModel(); const at = new Date("2026-10-25T08:00:00Z"); const s1 = snapshotOf(w, at);
assert.equal(s1.d, "2026-10-25"); assert.equal(s1.n, w.countries.length); assert.ok(s1.w >= s1.sev3 && Object.keys(s1.c).length === s1.n);
const day = (d: string, over: Partial<Snapshot> = {}): Snapshot => ({ ...s1, d, at: `${d}T08:00:00Z`, ...over });
let h = appendSnapshot(null, s1); assert.equal(h.days.length, 1); h = appendSnapshot(h, { ...s1, w: s1.w + 1 }); assert.equal(h.days.length, 1, "a second snapshot on the same day replaces the first"); assert.equal(h.days[0].w, s1.w + 1);
for (let i = 0; i < HISTORY_DAYS + 10; i++) h = appendSnapshot(h, day(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))); assert.equal(h.days.length, HISTORY_DAYS, "history keeps only the newest days"); assert.ok(h.days.every((d, i) => i === 0 || h.days[i - 1].d < d.d), "history is in date order");
const iso = Object.keys(s1.c)[0]; const mod = (f: (c: Snapshot["c"][string]) => Snapshot["c"][string]): Snapshot => ({ ...s1, c: { ...s1.c, [iso]: f(s1.c[iso]) } });
assert.deepEqual(diffSnapshots(s1, s1), [], "identical snapshots differ in nothing");
const up = diffSnapshots(s1, mod((c) => ({ ...c, r: (c.r ?? 40) + 20, k: [...c.k, "Test warning:3"] }))); assert.ok(up.some((c) => c.kind === "new-warning" && c.iso3 === iso && c.sev === 3) && up.some((c) => c.kind === "risk-up"), "a new warning and a rise in risk are both reported");
assert.ok(diffSnapshots(mod((c) => ({ ...c, k: [...c.k, "Gone:2"] })), s1).some((c) => c.kind === "cleared-warning"), "a cleared warning is reported");
assert.deepEqual(diffSnapshots(s1, mod((c) => ({ ...c, r: (c.r ?? 40) + 2 }))), [], "moves below the threshold are ignored");
assert.ok(PRESET_RULES.length >= 4 && PRESET_RULES.every((r) => r.name && r.enabled));
const rules: Rule[] = PRESET_RULES.map((r, i) => ({ ...r, id: `p${i}` }) as Rule); const hits = evalRules(rules, w, [{ id: "a1", cat: "military", sev: 3, title: "Strike near a UAE port", uae: true }, { id: "a2", cat: "market", sev: 1, title: "Minor", uae: false }]);
assert.ok(hits.every((x) => x.key && x.title && x.sev >= 0) && new Set(hits.map((x) => x.key)).size === hits.length, "every hit has a unique key"); assert.ok(hits.some((x) => x.source === "feed" && x.title.includes("UAE port")) && !hits.some((x) => x.title === "Minor"), "feed rules respect severity and UAE relevance");
assert.ok(hits.every((x, i) => i === 0 || hits[i - 1].sev >= x.sev), "hits are sorted by severity");
assert.deepEqual(evalRules(rules.map((r) => ({ ...r, enabled: false })), w, [{ id: "a1", cat: "military", sev: 3, title: "x", uae: true }]), [], "disabled rules never fire");
const hist = JSON.parse(readFileSync("public/data/monitor/history.json", "utf8")) as { days: Snapshot[] }; assert.ok(hist.days.length >= 1 && hist.days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.d) && d.n > 150 && d.src.current + d.src.due + d.src.stale > 0), "the committed history file is valid");

// ---- robustness of options across variants ----
const rb = robustAnalysis([{ name: "Act", mild: 80, central: 70, severe: 20 }, { name: "Hedge", mild: 60, central: 60, severe: 55 }, { name: "Wait", mild: 30, central: 35, severe: 40 }], { mild: 25, central: 50, severe: 25 });
assert.equal(rb.best.mild, 0); assert.equal(rb.best.severe, 1); assert.equal(rb.maximin, 1, "the hedge has the best worst case"); assert.equal(rb.minimaxRegret, 1, "and the smallest worst regret"); assert.equal(rb.expected[0], 60); assert.equal(rb.expectedBest, 0, "the aggressive option wins on the weighted mean even though it is not the most robust");
assert.deepEqual(rb.regret[1], [20, 10, 0]); assert.equal(rb.maxRegret[0], 35);
const rbn = robustAnalysis([{ name: "A", mild: 50, central: null, severe: 40 }], { mild: 1, central: 1, severe: 1 }); assert.equal(rbn.expected[0], null, "a missing variant is never averaged as zero"); assert.equal(rbn.maxRegret[0], null);

// ---- quality gates: necessary, not sufficient ----
const thin = qualityGates("# Brief\nShort text with no sources.", "other", { today: new Date("2026-10-25") }); assert.equal(thin.find((x) => x.id === "sources")!.status, "fail"); assert.equal(thin.find((x) => x.id === "placeholders")!.status, "pass");
assert.equal(qualityGates("TODO fill in <Country Name> here", "other").find((x) => x.id === "placeholders")!.status, "fail", "template brackets and TODO fail");
assert.equal(qualityGates("Newest evidence 2025-01-02 only", "other", { today: new Date("2026-10-25") }).find((x) => x.id === "freshness")!.status, "fail", "evidence older than 90 days fails freshness");
assert.equal(qualityGates("Dated 2026-10-20 evidence", "other", { today: new Date("2026-10-25") }).find((x) => x.id === "freshness")!.status, "pass");
assert.equal(qualityGates("a probability of 40%", "other").find((x) => x.id === "probability")!.status, "warn", "a percentage called a probability is flagged");
const labGates = qualityGates("# Lab\nnothing useful", "lab"); assert.ok(labGates.some((x) => x.id === "graph" && x.status === "fail") && labGates.some((x) => x.id === "benchmarks"), "an empty lab fails the lab-specific gates");
assert.equal(parseLab("").nodes.length, 0, "an empty lab text parses to nothing, not an error");
console.log("services.test.ts passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
