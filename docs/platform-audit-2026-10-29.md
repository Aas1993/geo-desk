# Platform audit, 29 October 2026

Scope: every page and free API route, every paid agent and prompt, every score and index, every report template, duplication of features and of agents, and an audit of the auditor (this session's own work). Method and results below; what could not be verified is stated at the end and is not rounded up.

## 1 Smoke test (live dev server)

58 requests: 11 pages, 29 GET routes, 15 POST routes with an empty body, 3 guard probes.
- **Pages**: 11 of 11 return 200; no console error on the World map, Case File, Falcon, Deep, Machiavellian, THE KING, The Ambassador or Influence. Markets shows five 503s because `TWELVEDATA_API_KEY` is not set (known; prices need a key).
- **Case File**: all five views and every Detailed sub-tab render; all seven report templates render with no `NaN`, `undefined` or `[object` and the right headings.
- **Free routes**: all answer; slowest `/api/case/board` (about 2.6 s for 200 countries, then cached) and `/api/deep/research` (about 2.2 s).
- **Failures that are not bugs**: wrong parameters used by the probe (`/api/media/EGY` needs `part`, `/api/trade/EGY` a number, two invented layer ids), markets without a key.
- **Guards**: cross-site POST 403, non-JSON POST 415, a request for covert action and a militia refused with 400 at no cost, bad bodies 400 on the desk, council and architect routes.
- **Incident, disclosed**: the probe posted an empty body to every AI route. `/api/prep`, `/api/world-brief`, `/api/media/.../stance` accepted it and ran their small no-tool briefs (9 to 27 s each), and `/api/dossier` started a run that I cancelled by closing the stream. That is an unintended spend, I estimate under US$1 in all (not measured), and it is my error: a probe must never post to a paid route. The routes themselves behave as designed (click-started, same-origin, capped).

## 2 Inventory and duplication

Paid products that answer "what should the UAE do about this country": **seven**. Role families repeat across them.

| Module | Agents | Role |
|---|---|---|
| Strategic Council (Case File) | 20 seats in 8 calls | Evidence-first judgment; the canonical start |
| Statecraft Architect | 6 + auditor | Master strategy and roadmap |
| THE KING | 10 + Chair + auditor | The head of state's decision |
| Embassy council | 13 desks + Chief + inspector | Execution for the ambassador |
| Falcon Council | 10 | Country or scope analysis |
| Strategy Council (Machiavellian) | 19 seats in 7 calls | Influence-instrument strategy |
| Deep analyst team | 6 | Economic and research evidence consolidation |

Repeated role families (count of role or seat definitions across the products): red team or challenger 8, verifier 6, geopolitics 6, economy and finance 9, security 7, foresight 8. Four of the seven end in an independent verifier or red team by design.

**Findings**
1. *Functional duplication*: the Strategic Council, the Falcon Council, the Machiavellian council and THE KING all answer a country-level decision question with overlapping specialists. A user running all four would pay about US$2.7 for four overlapping answers.
2. *Index duplication*: six indices measure parts of the same relationship (Partnership Index, Country Scorecard, Influence Scorecard and its new final score, the Case File posture rule, the Falcon radar score, the Deep exposure score). Measured rank agreement: final score vs Partnership Index 0.97, final vs Country Scorecard 0.94, Partnership vs Country Scorecard 0.92.
3. *Two recommendations on one page*: THE KING shows the Council's call and the national-interest scorecard's recommendation. They can differ; the page says so, which is honest but is one decision shown twice.

**Decisions taken (non-destructive; no feature removed)**
- One decision path is now stated in the product: Strategic Council, then the Architect (strategy), then THE KING (decision), then the Embassy (execution). The Reports page lists it with costs. The Falcon and Machiavellian councils and the Deep team remain for scope-level and influence-instrument questions and as annexes.
- THE KING and the Embassy read each other's saved work and the Strategic Council's digest instead of repeating it.
- The Influence final score is documented as a multi-pillar summary that mostly tracks the Partnership Index (rho 0.97): both remain, with the finding recorded rather than hidden; the benchmark panel reports it as redundancy.

**Recommended, needs the owner's decision** (not done, because the standing rule is to remove no feature unasked): fold the Falcon Council's country mode into the Strategic Council; fold the Machiavellian council's instrument analysis into the Architect as a lens; retire the separate Partnership Index display in favour of one relationship index.

## 3 The bar for agents and prompts

One bar, tested in `src/lib/audit.test.ts` (it runs in `npm test`): every system prompt must name the UAE's interest, require fact ids, name think tanks, wire and news sources, put official and primary sources first, name published intelligence-community assessments as public documents only (ODNI Annual Threat Assessment, the National Intelligence Council's Global Trends, the CIA World Factbook, UN panels), state that social media has no compliant access, use the UAE's own strategy and precedents, require likelihood bands with a separate confidence, assumptions, alternatives and dissent, indicators with thresholds, the boundary (no covert action, proxies or coercion), "not estimated" for unevidenced costs, and stated collection gaps.
- **Before**: five of seven prompts failed three items (think tanks, intelligence-community assessments as public documents, the social-media limit). **After**: all seven pass; one shared source plan (`src/lib/sources.ts`) is appended to each, so no agent is briefed to a lower standard.
- Every roster has unique, bilingual names; every THE KING specialist and every embassy desk has a mandate, at least four questions it must answer and starting sources.
- Honest limit: the CIA and NSA publish few products; the platform has no classified or signals access and says so. "Like CIA and NSA" means the published tradecraft (ICD 203 as a method), not their sources.

## 4 Checks and balances before a product is compiled

| Product | Independent checker |
|---|---|
| Strategic Council | evidence audit and red team call, council debate |
| Statecraft Architect | **new**: Strategy Auditor (Deliverable 7) |
| THE KING | red-team specialist K7; **new**: Decision Auditor |
| Embassy plan | **new**: Plan Inspector |
| Embassy intelligence | no reviewer (cost: the sitting already runs near US$0.9); the quality gate and the compliance desk E13 stand in |
| Falcon, Machiavellian, Deep | verifier and challenger |

The new reviewers read the writer's finished product, do not search, do not rewrite, run last and return a verdict (approve, revise, reject), ranked issues with a fix, unsupported claims, boundary flags, contradictions and what is still missing. The **Quality check** (free, `src/lib/quality/gate.ts`) runs 15 to 20 rule checks on THE KING, the embassy intelligence and the plan: completeness of the structured data (cut-off output is detected and flagged), fact-id density, unverified references, the mix of official, think-tank and news sources, plan integrity (unique ids, resolvable dependencies, owners, KPIs, due diligence for any company, deal or agreement, uncited costs), the boundary, and language. It scores 0 to 100 and shows failures first.

## 5 Scores and indexes benchmarked

The Influence page gained a validation panel (`src/lib/machiavelli/benchmarks.ts`): eight rank-correlation checks and one anchor check, with bounds written before the results. Result: **8 of 9 held**. The one that did not: the final score against the Partnership Index (rho 0.97, above the 0.95 redundancy bound): a finding, not tuned away. One bound was revised after the first run (bilateral-trade pillar against trade volume, from 0.8 to 0.7) because three of its five criteria deliberately do not track size; the revision is stated on the panel. The anchor check (the UAE's 15 largest trading partners in the top 30 of 200) passes with 13 of 15; the two outside are Thailand (34) and Hong Kong (61), likely because their trade with the UAE runs through re-exports and finance (not tested). External composite indices (Brand Finance, Lowy, Soft Power 30, Nation Brands) are licensed and not held; the six Brand Finance ranks already on file remain the only external ranks. Ingesting any of them needs its licence checked first.

## 6 New: non-friendly states

A tab on the Influence page (`src/lib/machiavelli/hostility.ts`, `/api/machiavelli/hostility`, `public/data/tension-register.json`). Four core signals must agree (bilateral events with the UAE, UN voting divergence, sanctions exposure per GDP, trade without engagement); bilateral tone and conflict count as one signal because they share their source; a worsening trend is shown and not counted; one signal is never listed; countries with no relationship data are excluded because distance is not hostility. A short analyst-maintained register of documented disputes (two entries, both flagged "source to verify") can raise a state to adversarial only when a measured signal agrees. Today: 1 adversarial (Iran), 1 documented tension (Sudan, no measured signal), 3 on watch (Australia, Algeria, Yemen). It is a prompt for analysts and for protective planning, never a designation, and carries the boundary.

## 7 Scorecard changes this week

Bilateral trade pillar and four more pillars (investment and capital, political alignment, governance and stability, market size and growth) with evidence; a final score per country (mean of ten pillars) and the average over all 200 countries (1.77), the trade-weighted average (2.85) and the average by pillar; the Case File country scorecard gained a twelfth aspect (bilateral trade) and criteria (unemployment, reserves, non-performing loans). Data rebuilt on 28 October from live sources.

## 8 Audit of the auditor (this session's own work)

Bar applied to my own deliverables: does it run, is it tested, is it honest about limits, does it cost what it says, does it repeat something that exists.
- An independent review of the desk engine found 25 defects; the high and medium ones were fixed and covered by tests (commit dfa0397).
- Things I got wrong and corrected: a million-fold unit error in the UAE history panel and the investment-stock text; plan prompt and output limit (the Chief's JSON was cut off); the smoke-test spend above; a first hostility model that flagged micro-states and Australia (rebuilt around independent signals).
- Open: the reviewers, the shared source plan and the trimmed budgets have not been run live since they were written (the account's spend limit was hit during the earlier review, and I did not start more paid runs); their cost is estimated, not measured. Arabic runs have not been run end to end. The tension register's two entries are unverified. Markets prices need a key. The embassy intelligence sitting has no independent reviewer.

## 9 Addendum, 30 October 2026: the reviewer pair, the Ministry, the Ambassador's attachés and The Room

Requested: two extra agents that review every multi-agent product from a geopolitical and statecraft auditor's background and red-flag whatever is not real or does not serve the UAE; a dynamic round-table dashboard; a separate tab for the Ministry of Foreign Affairs' organisation with role agents that think from the Ministry's perspective for each country; attaché agents for the ambassador.

**Reviewer pair** (`src/lib/review/`): the single reviewers (Decision Auditor, Plan Inspector, Strategy Auditor) were replaced by the same two independent auditors everywhere. The Statecraft Auditor tests the product against the UAE's interests, master strategy, others' likely moves, leverage and realism, alternatives, exposure and the boundary, with a product-specific checklist; the Reality Auditor tests every consequential fact, figure, name and date for traceability, currency, invention, consistency, calibration, source quality and honest gaps, and may use two searches to verify what the facts do not settle. Both return a verdict, a standing, ranked issues and red flags (shown first; a critical one caps the quality grade at D). Coverage: THE KING, embassy intelligence (it had none), embassy plan, Architect, Strategic Council, Falcon, Machiavellian council, Deep team and the Ministry's council. Not audited, on purpose: directives, questions and updates (a third of the cost, not compiled products). The pair is written once (`pair.ts`) and run by one server step (`run.ts`) for the four older council routes, and as stage-2 calls in the desk engine; each pair reserves money first and skips honestly if the ceiling would not allow it.

**The Ministry** (`/mofa`): thirteen role-agents, an Under-Secretary and the pair; ranked priorities, goals with measures, mission tasks, seven-domain plans, a progress tracker and updated briefs; a live org chart of 22 public functions. Limits stated on the page: the published chart is an image that could not be read, titles may differ, no named person is represented, goal bars match owners to roles by words (an approximation), statuses live in this browser.

**The Ambassador**: 13 desks became 17 (Chief of Strategy, Chief Partnerships Officer, Trade Attaché, Education and Science Attaché added; FDI, Commercial and Consular desks named as the attaché roles they are; education taken out of the culture desk so it sits in one place). The embassy council now reads the Ministry's priorities when they are on file. Sections are shorter per desk because the token budget did not grow (the worst-case test caps a sitting under US$1.25).

**The Room** (`/room` and the live table on each council page): seats drawn from the councils' own rosters; live while a run sits, per-country from saved products elsewhere.

**Audit of the audit:** tests added (`src/lib/mofa.test.ts`; the desk, audit and architect suites extended: pair prompts for every product and both lenses, red-flag parsing, the grade cap, the roster of 17 desks with one owner for education, the MOFA parser, composer, digest and gate, the org map's integrity, the tracker, the seats and their layout, and the pair's no-spend paths). Found and fixed on the way: a duplicate Under-Secretary card, a hydration mismatch from floating-point seat positions, an org node with no agent, routing that sent education questions to the culture desk. **Found live and fixed:** the first Ministry run (US$0.77) wrote only the first role of each parallel sitting. Cause: a parallel sitting's share of the money was about US$0.13, and `outputRoom` subtracts a fixed US$0.15 reserve, so the output room fell to the 1,500-token floor and each sitting was cut off after one section. The reserve is now a per-call option (`reserveUsd`: 0.03 for sittings, 0.05 for the final writer, 0.01 for the auditors), the Ministry's sittings were resized to what they can really spend, and the second live run (US$0.80) wrote all thirteen roles, closed both auditors' JSON and scored grade C (the Reality Auditor red-flagged a premise resting on one unverified headline; no think-tank source was found, so the source-mix check failed, which is the honest result). The same reserve applied to THE KING and the embassy sittings, which now also get their full share, but they have not been re-run live since. The auditors also asserted once that "no web research was run"; their prompts now say they cannot see the sittings' searches. Open: Arabic end to end is still untested; the tension register entries are still unverified; the King, embassy and Architect runs with the pair have not been run live.
