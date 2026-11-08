// Tests for the Deep Intelligence desk (FALCON EYE second feature set): research cards, economics, exposure, registers, consolidation, routing and the indicator dictionary.
// They map to the specification's acceptance tests (FE-AC01 to FE-AC20) where a test can be written without a live model call or a browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyFilters, asSourceForecast, buildTagger, coverage, familyOf, langOf, noFilters, type Pub } from "./deep/research-core";
import { REQUIRED_PERSPECTIVES, SOURCES, SOURCE_BY } from "./deep/sources";
import { METHODS, backtest, brier, compareSeries, hhi, hhiBand, interval, kindOf, maxDrawdown, nominalToReal, opportunityScreen, qualify, zOf, type Series, type TradeBook } from "./deep/econ-core";
import { prioritise, type ExpRow } from "./deep/exposure-core";
import { ATTR_LABEL, attributionShown, autoDisagreements, canResolve, followThrough, gapScore, infoValueQueue, issueRecord, methodOk, scoreRecords, type Decision } from "./deep/registers";
import { INDICATORS, dictionaryCoverage } from "./deep/indicators";
import { PEER_SETS } from "./deep/peers";
import { ROLES, groupsOf, selectRoles } from "./deep/routing";
import { DAGENTS, cleanDOptions, dComposeReport, dCouncilKey, dRoleText, planAgents } from "./deep/council";
import { approve, canPublish, compareRuns, consolidate, isStale, manifestHash, MODULES } from "./deep/consolidate";
import { buildSnapshot } from "./deep/snapshot";
import { deepFacts } from "./deep/facts";
import { ACCEPTANCE } from "./deep/acceptance";
import { routeAsk } from "./falcon/ask";

const mk = (id: string, src: string, title: string, about: string[], ts: number, extra: Partial<Pub> = {}): Pub => ({ id, src, title, url: `https://example.org/${id}`, ts, lang: "en", how: "feed", about, regions: [], topics: [], uae: about.includes("ARE"), family: "", ...extra });

async function main() {
  const countries = JSON.parse(readFileSync("public/data/countries.json", "utf8")) as { iso3: string; name: string; region: string }[];
  // ---- research cards: geography analysed is separate from the institution's domicile (FE-AC01) ----
  const tag = buildTagger(countries);
  assert.deepEqual(tag("Egypt's debt and the Gulf"), ["EGY"], "a country named in a title is tagged");
  assert.ok(tag("The UK and the US reach a deal").includes("GBR") && tag("The UK and the US reach a deal").includes("USA"), "short names are matched in capitals");
  assert.deepEqual(tag("an us versus them story"), [], "the lower-case word 'us' is not the United States");
  assert.ok(tag("Emirati investment in Dubai").includes("ARE"), "Emirati and Dubai tag the UAE");
  assert.equal(langOf("اقتصاد الإمارات"), "ar"); assert.equal(langOf("UAE economy"), "en");
  const now = Date.parse("2026-10-25T00:00:00Z"); const day = 86_400_000;
  const pubs = [mk("a", "trends", "UAE and Egypt sign an energy deal", ["ARE", "EGY"], now - 2 * day, { topics: ["energy"] }), mk("b", "iseas", "Indonesia nickel policy", ["IDN"], now - 3 * day), mk("c", "chatham", "Egypt's President on 2030", ["EGY"], now - 5 * day, { how: "search" }), mk("d", "ecssr", "Arabic title", [], now - 6 * day, { lang: "ar" })];
  const eg = applyFilters(pubs, { ...noFilters, iso3: "EGY" }, now); assert.deepEqual(eg.map((p) => p.id), ["a", "c"], "the country filter selects what a paper is ABOUT, whoever published it");
  assert.deepEqual(applyFilters(pubs, { ...noFilters, domicile: "uae" }, now).map((p) => p.id), ["a", "d"], "institution domicile is a separate filter");
  assert.deepEqual(applyFilters(pubs, { ...noFilters, lang: "ar" }, now).map((p) => p.id), ["d"], "language filter");
  assert.deepEqual(applyFilters(pubs, { ...noFilters, sinceDays: 4 }, now).map((p) => p.id), ["a", "b"], "date window");
  assert.ok(SOURCES.some((s) => s.id === "trends" && s.connector === "pending") && SOURCES.some((s) => s.id === "ecssr" && s.connector === "pending"), "TRENDS and ECSSR are 'source identified, ingestion validation pending', not claimed as live coverage");
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length, "source ids are unique"); for (const s of SOURCES) { assert.ok(SOURCE_BY.get(s.id) && s.entry.startsWith("https://") && s.remit.en && s.remit.ar && s.note.ar, `source ${s.id} is complete in both languages`); if (s.connector === "feed") assert.ok(s.feeds?.length, `${s.id} names its feed`); if (s.connector !== "feed") assert.ok(s.domain, `${s.id} names the site its search is restricted to`); }
  // ---- evidence families: repeated stories are one family, not several confirmations (FE-AC03) ----
  const fam = familyOf([mk("1", "lowy", "Why Egypt's economy is slowing down fast", ["EGY"], now - day), mk("2", "csis", "Why Egypt's economy is slowing down", ["EGY"], now - 2 * day), mk("3", "saiia", "Africa industrial policy and China", [], now - 3 * day)]);
  assert.equal(fam[0].family, fam[1].family, "two headlines of one story are one family"); assert.notEqual(fam[0].family, fam[2].family);
  const cv = coverage(fam, null); assert.equal(cv.total, 3); assert.equal(cv.families, 2, "families count independent stories"); assert.equal(cv.derivative, 1);
  const cvEg = coverage(eg, "Middle East, North Africa, Afghanistan & Pakistan"); assert.equal(cvEg.perspectives.length, REQUIRED_PERSPECTIVES.length); assert.ok(cvEg.perspectives.find((p) => p.id === "contrary")!.met === false, "a challenge to the dominant reading cannot be asserted from headlines: shown as a gap, never manufactured");
  assert.ok(cvEg.gaps >= 1, "missing coverage is displayed, not hidden"); assert.equal(coverage([], null).topShare, 0);
  // ---- a think-tank projection is stored as a dated source forecast, never an observation or a platform forecast (FE-AC02) ----
  const sf = asSourceForecast({ src: "trends", pub: "AI in the UAE", quote: "AI could add X", target: "GDP effect", value: "10%", horizon: "2030", publishedAt: "2025-02-01" }); assert.equal(sf.kind, "source-forecast"); assert.equal(sf.status, "dated"); assert.ok(/not an observation/.test(sf.note) && /not a Geo Desk forecast/.test(sf.note));

  // ---- economics: nominal versus real, vintages, baselines and backtests ----
  assert.equal(compareSeries("gdp", "growth").ok, false, "nominal GDP against real growth is blocked (FE-AC05)"); assert.ok(compareSeries("gdp", "growth").method?.en.includes("nominalToReal"), "and the documented conversion is named");
  assert.equal(compareSeries("growth", "inflation").ok, true); assert.equal(compareSeries("gdp", "debt").ok, false, "a currency level against a ratio is blocked");
  const gdp: Series = { 2023: 100, 2024: 110 }; const infl: Series = { 2024: 10 }; assert.ok(Math.abs(nominalToReal(gdp, infl, 2024)! - 0) < 1e-9, "10% nominal growth with 10% inflation is zero real growth"); assert.equal(nominalToReal(gdp, infl, 2025), null, "no value is invented when a year is missing");
  assert.equal(kindOf(2026, 2026), "projection"); assert.equal(kindOf(2025, 2026), "estimate"); assert.equal(kindOf(2023, 2026), "observation");
  assert.ok(Math.abs(hhi([50, 50], 10000)! - 5000) < 1e-9 && Math.abs(hhi([50, 50], 1)! - 0.5) < 1e-9, "HHI on both stated scales"); assert.equal(hhi([]), null); assert.equal(hhiBand(1000), "low"); assert.equal(hhiBand(3000), "high");
  assert.ok(Math.abs(maxDrawdown([100, 120, 90, 130, 104])! - (90 / 120 - 1)) < 1e-9, "maximum drawdown = min(price / running peak) - 1");
  assert.ok(Math.abs(brier([1, 0], [1, 0])!) < 1e-9 && Math.abs(brier([0.5, 0.5], [1, 0])! - 0.25) < 1e-9, "Brier score");
  const ser: Series = {}; for (let y = 2010; y <= 2025; y++) ser[y] = Math.sin(y) * 3 + 2; const bt = backtest(ser, 2025, 1); assert.ok(bt.n >= 8 && bt.best, "a backtest has cases and a best method");
  const leak: Series = { ...ser, 2025: 999 }; const btLeak = backtest(leak, 2024, 1); const btClean = backtest(ser, 2024, 1); assert.deepEqual(btLeak.mae, btClean.mae, "no look-ahead: data after the cutoff cannot change the score");
  assert.deepEqual(METHODS.naive.f([1, 2, 3]), 3); assert.equal(METHODS.drift.f([1, 2]), null, "a method returns nothing rather than a guess when history is short");
  const iv = interval(10, [1, 2, 3, 4, 5], 0.8)!; assert.ok(iv.lo < 10 && iv.hi > 10 && iv.n === 5); assert.equal(interval(10, [1, 2]), null, "no interval from too few errors");
  assert.equal(qualify(2, 1, 20).status, "baseline-retained", "a model that does not beat the baseline leaves the baseline in place (FE-AC10)"); assert.equal(qualify(1, 2, 20).status, "operational"); assert.equal(qualify(1, 2, 3).status, "unscored", "too few resolved cases to call a model operational"); assert.equal(qualify(null, 1, 20).status, "unscored");
  assert.ok(zOf({ 2020: 1, 2021: 2, 2022: 3, 2023: 2, 2024: 10 }, 2024)! > 2);
  // the opportunity screen: deterministic, published weights, stability shown
  const trade: TradeBook = { lastYear: 2025, world: { a: [[2022, 1, 1], [2025, 1, 1]] }, countries: {} }; const outlook: Record<string, Record<string, Series>> = {}; const gov: Record<string, { rq?: number }> = {};
  for (let i = 0; i < 12; i++) { const iso = `C${String(i).padStart(2, "0")}`; trade.countries[iso] = { a: [[2022, 300 + i * 10, 1], [2025, 500 + i * 40, 1]] }; outlook[iso] = { growth: { 2026: 2 + i * 0.3, 2027: 2 + i * 0.3, 2028: 2 + i * 0.3 }, gdp: { 2025: 100_000 + i * 20_000 } }; gov[iso] = { rq: 30 + i * 4 }; }
  const scr = opportunityScreen(trade, outlook, gov, 2025); assert.equal(scr.length, 12); assert.deepEqual(scr.map((r) => r.rank), [...scr.map((r) => r.rank)].sort((a, b) => a - b), "sorted by rank"); assert.ok(scr.every((r) => r.ranks.length === 3 && r.score >= 0 && r.score <= 100), "three weightings and a 0-100 score"); assert.deepEqual(opportunityScreen(trade, outlook, gov, 2025), scr, "deterministic");
  assert.equal(opportunityScreen(trade, outlook, gov, 2025, 1e9).length, 0, "the export threshold removes small markets");

  // ---- exposure: unknown is unknown, never zero ----
  const row = (id: string, m: number | null, conf: ExpRow["conf"], kind: ExpRow["kind"] = "dependency"): ExpRow => ({ id, dim: { en: id, ar: id }, kind, value: m == null ? null : { en: "x", ar: "x" }, magnitude: m, scale: { en: "s", ar: "s" }, conf, src: "t", asOf: null });
  const few = prioritise([row("a", 0.9, "high"), row("b", null, "unknown"), row("c", null, "unknown"), row("d", null, "unknown")]); assert.equal(few.band, "unrated", "too few measures are known to rate priority; this is not 'low'"); assert.equal(few.unknown, 3);
  const full = prioritise([row("a", 0.8, "high"), row("b", 0.6, "medium"), row("c", 0.1, "high", "risk")]); assert.ok(full.score! > 0 && full.band !== "unrated" && full.confidence > 0.8);
  const withUnknown = prioritise([row("a", 0.8, "high"), row("b", 0.6, "high"), row("z", null, "unknown")]); const without = prioritise([row("a", 0.8, "high"), row("b", 0.6, "high")]); assert.equal(withUnknown.score, without.score, "an unknown row does not change the score"); assert.ok(withUnknown.confidence < without.confidence, "it lowers the confidence");
  assert.equal(prioritise([row("p", 1, "high", "presence")]).known, 0, "presence rows are context, not priority");

  // ---- registers ----
  assert.equal(methodOk("we did it"), false); assert.equal(methodOk("Difference-in-differences against a matched comparison group with a pre-trend test"), true);
  const dec = (over: Partial<Decision>): Decision => ({ id: "D", created: "2026-01-01", updated: "2026-01-01", decision: "x", informedBy: [], expected: "", owner: "", review: "2026-02-01", milestones: [{ text: "m1", done: true }, { text: "m2", done: false }], observed: "Exports rose", attribution: "causal", method: "", status: "open", ...over });
  assert.equal(attributionShown(dec({})), "association", "a causal claim without a method is shown as association only (FE-AC18)"); assert.equal(attributionShown(dec({ method: "Difference-in-differences against a matched comparison group with a pre-trend test" })), "causal");
  assert.equal(attributionShown(dec({ observed: "", attribution: "causal" })), "association", "no observed result, no attribution"); assert.ok(ATTR_LABEL.association.ar);
  const ft = followThrough([dec({}), dec({ review: "2099-01-01", observed: "", attribution: "association" })], Date.parse("2026-10-25")); assert.equal(ft.total, 2); assert.equal(ft.due, 1); assert.equal(ft.overdue30, 1); assert.equal(ft.milestones, 4); assert.equal(ft.milestonesDone, 2); assert.equal(ft.downgraded, 1);
  const r1 = issueRecord({ target: "UAE growth 2026", unit: "%", geography: "ARE", horizon: "1", issuedAt: "x", cutoff: "2025", vintage: "v", model: "m", assumptions: "a", point: 3, lo: 1, hi: 5, probability: null, resolution: "r", resolveOn: "2027-01-31", owner: "o" }, new Date("2026-10-25T00:00:00Z"), 0); assert.equal(r1.id, "FR-2026-10-25-001"); assert.equal(r1.actual, null);
  const r2 = issueRecord({ ...r1, revises: r1.id }, new Date("2026-11-01T00:00:00Z"), 1); assert.equal(r2.revises, r1.id, "a revision is a new record pointing at the original"); assert.notEqual(r2.id, r1.id); assert.equal(r1.point, 3, "the original is untouched");
  assert.equal(canResolve(r1, Date.parse("2026-12-01")), false, "cannot resolve before the resolution date"); assert.equal(canResolve(r1, Date.parse("2027-02-01")), true);
  const sc = scoreRecords([{ ...r1, actual: 4 }, { ...r1, id: "b", actual: 7 }, { ...r1, id: "c", point: null, lo: null, hi: null, probability: 0.9, outcome: 1 }]); assert.equal(sc.nNum, 2); assert.ok(Math.abs(sc.mae! - 2.5) < 1e-9); assert.ok(Math.abs(sc.coverage! - 0.5) < 1e-9, "interval coverage"); assert.ok(Math.abs(sc.brier! - 0.01) < 1e-9);
  assert.equal(gapScore(5, 4, 2), 10); const q = infoValueQueue(null); assert.ok(q.length >= 6 && q.every((g, i) => i === 0 || q[i - 1].score >= g.score), "queue sorted by score"); assert.ok(q.every((g) => g.what.en && g.what.ar && g.route.ar && g.cost >= 1 && g.cost <= 5));

  // ---- the indicator dictionary: 36 indicators, each complete, thresholds never claimed approved ----
  assert.equal(INDICATORS.length, 36); assert.deepEqual(INDICATORS.map((i) => i.id), Array.from({ length: 36 }, (_, i) => `I${String(i + 1).padStart(2, "0")}`), "I01 to I36 in order");
  for (const i of INDICATORS) { assert.ok(i.en && i.ar && i.def.en && i.def.ar && i.unit && i.src && i.freq && i.lag && i.owner && i.decision.en && i.decision.ar && i.threshold.en && i.threshold.ar && i.uncertainty.en && i.uncertainty.ar, `${i.id} is complete in both languages`); if (i.status !== "live") assert.ok(i.missing, `${i.id} names what is missing`); if (i.status === "off") assert.ok(!i.key, `${i.id} has no reading key because nothing is connected`); }
  const dc = dictionaryCoverage(); assert.equal(dc.live + dc.partial + dc.off, 36); assert.ok(dc.off > 10, "the dictionary is honest about how much is not connected");
  assert.ok(INDICATORS.find((i) => i.id === "I21")!.threshold.en.includes("1,500"), "HHI bands are stated"); assert.ok(INDICATORS.find((i) => i.id === "I35")!.status === "off", "no warning-quality number without adjudicated alerts");

  // ---- peer sets are fixed and declared ----
  assert.equal(PEER_SETS.length, 4); for (const p of PEER_SETS) { assert.ok(p.members.length >= 4 && !p.members.includes("ARE") && p.basis.en && p.limits.ar && p.question.en, `${p.id} states basis, question and limit`); }
  const outlookData = JSON.parse(readFileSync("public/data/outlook.json", "utf8")) as { countries: Record<string, unknown> }; for (const p of PEER_SETS) for (const m of p.members) assert.ok(outlookData.countries[m], `${m} has an IMF outlook`);

  // ---- routing: a small default team, expanded only when warranted (spec section 10) ----
  assert.equal(ROLES.length, 13); const simple = selectRoles({ question: "What is the dirham peg?", iso3: null, horizonYears: 1, hasResearch: false, flags: { macro: false, financial: false, trade: false }, consequential: false });
  assert.ok(simple.roles.includes("policy") && simple.roles.includes("verifier"), "the policy analyst and the verifier are always in"); assert.ok(simple.roles.length <= 6 && ["natsec", "energysec", "foodsec"].every((r) => simple.roles.includes(r as never)), "a simple lookup runs only the policy analyst, the verifier and the three security analysts, never the whole bench"); assert.ok(!simple.roles.includes("challenger"), "a decision of no consequence may drop the challenger");
  const big = selectRoles({ question: "Should the UAE expand trade and investment with Egypt over the next decade given financing conditions and growth?", iso3: "EGY", horizonYears: 10, hasResearch: true, flags: { macro: true, financial: true, trade: true }, consequential: true }); for (const r of ["research", "country", "macro", "financial", "trade", "foresight", "policy", "challenger", "verifier"] as const) assert.ok(big.roles.includes(r), `${r} is selected for the broad question`); assert.ok(!big.roles.includes("equity"), "the equity analyst needs securities in scope"); assert.ok(Object.values(big.why).every((w) => w && w.en && w.ar), "every selected role says why");
  assert.ok(selectRoles({ question: "Should we buy DFM bank stocks?", iso3: null, horizonYears: 1, hasResearch: false, flags: { macro: false, financial: false, trade: false }, consequential: false }).roles.includes("equity"));
  assert.ok(groupsOf(big.roles).length === 3 && groupsOf(simple.roles).length <= 2, "at most three specialist calls");

  // ---- the analyst council: scoped, capped, and its prompts hold no backticks ----
  assert.deepEqual(planAgents(["research", "country", "verifier"], "research"), ["g-evidence", "verifier"], "the research run has two agents and no chair"); assert.ok(planAgents(big.roles).includes("chair") && planAgents(big.roles).includes("challenger") && planAgents(simple.roles).includes("verifier") && !planAgents(simple.roles).includes("challenger"));
  const o = cleanDOptions({ question: "x".repeat(900), horizonYears: 99, roles: ["macro", "nope"], lang: "ar" }, ["policy"]); assert.equal(o.question.length <= 500, true); assert.equal(o.horizonYears, 30); assert.deepEqual(o.roles.filter((r) => r === "macro" || r === "policy").sort(), ["macro", "policy"]); assert.ok(!o.roles.includes("nope" as never)); assert.equal(o.lang, "ar");
  const rs = cleanDOptions({ mode: "research" }, ["country"]); assert.equal(rs.mode, "research"); assert.ok(rs.roles.includes("research") && rs.roles.includes("verifier"));
  for (const a of DAGENTS) { const t = dRoleText(a, { prior: { "g-evidence": "E" }, roles: big.roles }); assert.ok(!t.includes("`"), `no backtick in ${a.id}`); assert.ok(t.length > 100); }
  assert.notEqual(dCouncilKey("EGY", o, "m1"), dCouncilKey("EGY", o, "m2"), "a different data manifest is a different cache key (FE-AC19 cache invalidation)"); assert.notEqual(dCouncilKey("EGY", o, "m1"), dCouncilKey("EGY", { ...o, mode: "research" }, "m1"));
  assert.ok(dComposeReport([{ id: "g-evidence", text: "## Analyst: Research" }], "research").includes("no chair")); assert.ok(dComposeReport([{ id: "chair", text: "# Decision" }, { id: "verifier", text: "## Claim Audit" }]).startsWith("# Decision"));

  // ---- the snapshot and the consolidation, on the real datasets ----
  const snap = await buildSnapshot("EGY", new Date("2026-10-25T10:00:00Z")); assert.deepEqual(snap.gaps, [], "all datasets present"); assert.ok(snap.macro.ARE.growth && snap.forecasts.ARE.length === 4, "UAE macro and four baseline blocks");
  for (const b of snap.forecasts.ARE) { assert.ok(b.status.status === "unscored", "no candidate model is called operational"); assert.ok(b.rows.every((r) => r.point == null || isFinite(r.point))); }
  assert.ok(snap.exposure && snap.exposure.rows.some((r) => r.id === "sector" && r.conf === "unknown" && r.magnitude == null), "commodity exposure is unknown, not zero"); assert.ok(snap.readings.some((r) => r.id === "I21") && snap.readings.every((r) => /^I\d\d$/.test(r.id)));
  for (const r of snap.readings) assert.ok(!/[A-Za-z]{3,}/.test(r.displayAr), `reading ${r.id} has complete Arabic wording: ${r.displayAr}`);
  assert.ok(snap.bench.declared === "2026-10-25" && snap.bench.sets.length === 4); assert.ok(snap.trade!.screenN > 20 && snap.trade!.screen.length <= 25); assert.ok(snap.trade!.xHhi.every((r) => r.coverage == null || r.coverage <= 1.05), "partner coverage is a share");
  assert.ok(snap.fin.rank.credit && snap.fin.rank.credit.pct != null);
  const research = { pubs: [mk("p1", "trends", "UAE and Egypt energy", ["ARE", "EGY"], Date.parse("2026-10-20"), { family: "F1" }), mk("p2", "chatham", "Egypt's politics", ["EGY"], Date.parse("2026-10-21"), { family: "F2", how: "search" })], status: [{ id: "trends", connector: "pending", ok: true, n: 1 }, { id: "chatham", connector: "search", ok: true, n: 1 }], fetchedAt: "2026-10-25T09:00:00Z" };
  const inp = { question: "Should the UAE expand trade with Egypt?", iso3: "EGY", horizonYears: 3, audience: "analyst" as const, lang: "en" as const, modules: "all" as const, snapshot: snap, research, now: new Date("2026-10-25T10:00:00Z") };
  const run = consolidate(inp); assert.equal(run.status, "awaiting_review", "an unreviewed run is working analysis, never complete (FE-AC12)"); assert.equal(run.costUsd, 0); assert.ok(run.judgments.length >= 5 && run.judgments.every((j) => j.evidence.length > 0 && j.en && j.ar), "every judgment names evidence and has both languages");
  assert.ok(run.manifest.hash === manifestHash(snap, research, "EGY") && run.manifest.builds.length === 8 && run.manifest.security && run.manifest.rights.length === 4, "a manifest freezes data versions, rights and security"); assert.ok(run.trees.length >= 1 && run.options.length >= 2 && run.triggers.length >= 5 && run.checks.length >= 2 && run.gates.some((g) => g.id === "review" && !g.pass));
  assert.deepEqual(consolidate(inp).idem, run.idem, "an identical request over unchanged data has the same idempotency key (FE-AC14)"); assert.notEqual(consolidate({ ...inp, question: "A different question entirely?" }).idem, run.idem);
  assert.equal(run.modules.find((m) => m.id === "FE06")!.state, "na", "an irrelevant module is marked not applicable with a reason"); assert.ok(run.modules.find((m) => m.id === "FE06")!.why);
  const nonCountry = consolidate({ ...inp, iso3: null, snapshot: await buildSnapshot(null, new Date("2026-10-25T10:00:00Z")) }); assert.equal(nonCountry.modules.find((m) => m.id === "FE03")!.state, "na"); assert.ok(nonCountry.modules.find((m) => m.id === "FE03")!.why);
  // one essential module fails: the run is partial and says so (FE-AC13)
  const part = consolidate({ ...inp, research: null, researchError: "HTTP 503" }); assert.equal(part.status, "partial"); assert.ok(part.modules.filter((m) => m.state === "failed").map((m) => m.id).join() === "FE01,FE02"); assert.ok(!part.gates.find((g) => g.id === "completeness")!.pass);
  const apprPart = approve(part, "A. Reviewer", "", new Date()); assert.equal(apprPart.status, "partial", "a partial run stays partial after review, never 'complete'"); assert.equal(canPublish(apprPart, part.manifest.hash).ok, false);
  const none = consolidate({ ...inp, snapshot: null, research: null, researchError: "x" }); assert.equal(none.status, "failed");
  // human review and staleness (FE-AC19, FE-AC20 spirit)
  assert.equal(canPublish(run, run.manifest.hash).ok, false, "no reviewer, no publication"); assert.equal(approve(run, "  ", "", new Date()).review, null, "a blank name is not a reviewer");
  const ok = approve(run, "A. Reviewer", "checked", new Date("2026-10-25T11:00:00Z")); assert.equal(ok.status, "complete"); assert.ok(ok.gates.find((g) => g.id === "review")!.pass); assert.equal(canPublish(ok, run.manifest.hash).ok, true);
  assert.equal(isStale(ok, "ffffffff"), true); assert.equal(canPublish(ok, "ffffffff").ok, false, "a run whose data changed cannot be published until it is re-run");
  const changed = consolidate({ ...inp, snapshot: { ...snap, builds: snap.builds.map((b) => (b.file === "trade.json" ? { ...b, built: "2026-10-26T00:00:00Z" } : b)) } }); assert.notEqual(changed.manifest.hash, run.manifest.hash, "a changed dataset build changes the manifest");
  const cmp = compareRuns(run, changed); assert.deepEqual(cmp.builds, ["trade.json"]); assert.equal(cmp.sameManifest, false); assert.equal(compareRuns(run, run).sameManifest, true);
  assert.equal(MODULES.length, 9);
  // the council's evidence block reads the same snapshot and tells analysts how to treat it
  const facts = deepFacts(snap, research.pubs, run); assert.ok(facts.facts.length > 40 && facts.facts.every((f, i) => f.id === `F${i + 1}` && f.text && f.src), "numbered, sourced facts"); assert.ok(facts.facts.some((f) => f.kind === "research" && /headline level only/.test(f.text)), "research cards are marked headline-level"); assert.ok(facts.gaps.some((g) => /not connected/.test(g)) && facts.gaps.some((g) => /no paper's argument has been read/.test(g)));
  assert.ok(autoDisagreements(snap).every((d) => d.origin === "auto" && d.parties.length === 2 && d.topic.includes("IMF")), "auto disagreements come from the desk's own numbers");
  // ---- Ask Falcon reaches the Deep desk for research, economy and indicator questions, and still sends scenarios to the lab ----
  const named = countries as unknown as Parameters<typeof routeAsk>[1];
  const a1 = routeAsk("What do think tanks say about Egypt?", named); assert.equal(a1.section, "deep"); assert.equal(a1.deepTab, "fe02"); assert.equal(a1.scope, "EGY");
  const a2 = routeAsk("How concentrated is UAE trade? Show the HHI", named); assert.equal(a2.section, "deep"); assert.equal(a2.deepTab, "fe07");
  const a3 = routeAsk("What if Egypt defaults on its debt?", named); assert.equal(a3.section, "lab", "a what-if question still goes to the scenario lab");
  assert.ok(routeAsk("Show the indicator benchmarks against peers", named).alternatives.includes("strategy"));
  // ---- the acceptance register is complete, bilingual and honest about what is not built ----
  assert.deepEqual(ACCEPTANCE.map((a) => a.id), Array.from({ length: 20 }, (_, i) => `FE-AC${String(i + 1).padStart(2, "0")}`)); for (const a of ACCEPTANCE) { assert.ok(a.test.en && a.test.ar && a.how.en && a.how.ar, `${a.id} is bilingual`); if (a.status === "partly" || a.status === "not") assert.ok(a.gap?.en && a.gap.ar, `${a.id} names its gap`); }
  assert.ok(ACCEPTANCE.filter((a) => a.status === "not").length >= 3 && ACCEPTANCE.find((a) => a.id === "FE-AC16")!.status === "not", "what is not built is said so");
  console.log("deep: all checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
