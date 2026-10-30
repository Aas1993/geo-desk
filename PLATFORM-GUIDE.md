# Geo Desk: the complete platform guide

End to end, every feature, as built on branch `feat/hud-layers` (PR #8), commit `500e156`, 25 October 2026.
This guide rewrites the README into one reading order. Where the README and the code disagreed, this guide follows the code (see section 12).

---

## Contents

1. What Geo Desk is
2. The platform at a glance
3. Run it: setup, settings, scheduled jobs, tests
4. The World atlas (`/`)
5. Gulf equities (`/markets`)
6. Country AI products
7. Falcon Eye (`/falcon`)
8. The Case File (`/case`): the President and Minister view
9. Deep Intelligence (`/deep`)
10. The Machiavellian module (`/machiavelli`) and the Influence Scorecard (`/influence`)
11. Cross-cutting rules: cost, honesty, guard, Arabic, rights, storage, deployment
12. Corrections to the older README
13. Not built, and known limits
14. Cost table (every paid product, measured)
15. Dataset inventory
16. The Country Updates Hub (`/hub`) and the Strategy Lab (`/lab`)

---

## 1. What Geo Desk is

A dark, full-screen world map with a dossier for every country, written for the UAE: a desk officer, a minister or a president can see how any country relates to the UAE, what it means for UAE interests, what could go wrong and what to do about it. It started as a DiploMaps-style atlas (own name, own code, own data pipeline) and grew into five connected products:

| Product | Page | Job |
|---|---|---|
| World atlas | `/` | The map, 59 live and reference layers, a panel for every country |
| Gulf equities | `/markets` | ADX, DFM and Qatar listings, stock pages, AI research notes |
| Falcon Eye | `/falcon` | The intelligence console: radar, early warnings, scenario lab, council, graph, monitor, library |
| Case File | `/case` | All countries on one board, then one country in one place: President, Minister, Detailed, Reports |
| Deep Intelligence | `/deep` | Research, economy, finance, trade and forecasts in one evidence workspace |
| Machiavellian module | `/machiavelli` | UAE strategic influence and long-term partnerships |
| Influence Scorecard | `/influence` | Six influence dimensions for every country |

Standing principles (they explain most design choices):

- **Legitimate sources only.** Open or attribution-licensed data. Where a source forbids automated access (ADX) or has no compliant route (Telegram, X), the app says so instead of scraping.
- **No faked data.** Every figure shows its year and source. Missing data shows an honest empty state. Unknown is "unknown", never zero.
- **AI is click-started and capped.** Nothing paid runs by itself. Every paid run has a hard ceiling of US$1.00. Repeated requests are served from cache for free.
- **Proposals are not policy.** Scores, thresholds, weights and strategies are labelled drafts or proposals until a named person approves them.
- **Nothing is removed.** New products link to old ones rather than replace them.

---

## 2. The platform at a glance

### Navigation (top bar on desktop, bottom bar on mobile)

World, **Case File**, **THE KING**, **The Ministry**, **The Ambassador**, Markets, Falcon Eye, Deep Intelligence, Machiavellian, Influence, **The Room**, **Archive**, **Bird's Eye**, **Desk agent**, **Compare** (the last tab). The Case File is second, right after the map, because it is the final President and Minister view; THE KING (the head of state's decision room) and The Ambassador (the embassy council) sit beside it as pages of their own.

### Routes

| Route | What it is |
|---|---|
| `/` | World map and country panel (`?sel=ARE&tab=economy#zoom/lat/lng`, `?cmp=ISO3` for compare) |
| `/markets`, `/markets/ADX/ADCB`, `/markets/DFM/EMAAR` | Equities board and stock pages |
| `/falcon` | Falcon Eye, ten sections (hash `#council`, `#library`, `#platform` ...) |
| `/case` | Case File (hash `#priorities`, `#president`, `#minister`, `#detailed/council`, `#detailed/log`, `#reports`, `#reports/king` ...; `#king` and `#ambassador` redirect) |
| `/king` | THE KING: the head of state's decision room (ten specialists and a Decision Chair, directives, UAE history) |
| `/mofa` | The Ministry: the Ministry of Foreign Affairs as a live org chart, thirteen role-agents and an Under-Secretary that set ranked priorities, goals, mission tasks and seven-domain plans per country, a progress tracker, directives |
| `/ambassador` | The Ambassador: the embassy council (Chief of Staff and twenty-one desks, mission strategy and plans, power map, partners, directives) |
| `/room` | The Room: every council as a round table (seats, auditors, per-country state) |
| `/archive` | The Archive: every PDF report, by country (kept in this browser) |
| `/compare` | Compare: two to four countries side by side from held data (free: radar, small multiples, sortable table, leaders), ask the agents a comparative question (a plan that runs once per country, at most four runs, confirmed in the page), a PDF of the comparison and the answer (`?c=QAT,SAU,EGY`) |
| `/bird` | Bird's Eye: every tab consolidated into one strategic view of a country, with "Complete the picture" to run the missing councils |
| `/deep` | Deep Intelligence (hash `#fe01` to `#fe10`) |
| `/machiavelli` | Machiavellian module (hash `#indicators:COD` ...) |
| `/influence` | Global Influence Scorecard |

### Shared behaviour

- **One country, everywhere.** The country picked in the Case File, Deep Intelligence and the Machiavellian module is shared.
- **Languages:** English and Arabic (right-to-left), light and dark themes, text size control.
- **Search:** `/` or Cmd+K. **Alerts bell:** one merged feed.
- **Browser storage:** saved briefs, registers, watchlists, forecasts, the decision log and review baselines live in your browser, not on a server.

---

## 3. Run it

### Setup

```bash
npm install
node scripts/build-countries.mjs   # one-off: public/data/countries.json (World Bank + Wikidata)
node scripts/build-un.mjs          # one-off: UN voting data + HS chapter names (~145 MB stream, ~35 s)
npm run dev                        # copies the MapLibre worker to /public, starts Next on :3000
```

The preview in this workspace runs on port 3020. Never run `npm run build` while the dev server is running.

### Settings (`.env.local`; see `.env.example`)

| Setting | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | AI credentials (or an `ant auth login` profile). Each run bills that account |
| `TWELVEDATA_API_KEY`, `TWELVEDATA_RPM` | Market prices and fundamentals (ADX and Qatar need Pro, DFM needs Ultra) |
| `GD_FIXTURES=1` | Dev only: clearly-labelled synthetic market data |
| `AISSTREAM_API_KEY`, `WINDY_WEBCAMS_API_KEY` | Free keys that switch on AIS vessels and webcams |
| `RESEARCH_MODEL`, `RESEARCH_EFFORT`, `RESEARCH_MAX_RUN_USD`, `RESEARCH_ENABLED` | Stock research notes |
| `BRIEF_MODEL`, `BRIEF_MAX_PER_HOUR`, `BRIEF_ENABLED` | Country brief (default 20 per hour) |
| `PREP_MODEL`, `PREP_MAX_PER_HOUR`, `PREP_ENABLED` | Minister prep pack |
| `DOSSIER_MODEL`, `DOSSIER_EFFORT`, `DOSSIER_MAX_RUN_USD` (default cap 1, never above 5), `DOSSIER_MAX_PER_HOUR` (default 4), `DOSSIER_ENABLED` | Long briefings, councils, Architect, Falcon products. The hourly cap and in-flight guard are shared across them |
| `MEDIA_MODEL`, `MEDIA_MAX_PER_HOUR`, `MEDIA_ENABLED` | Stance read |
| `ASK_MODEL`, `ASK_MAX_PER_HOUR`, `ASK_ENABLED` | Ask |
| `WORLD_BRIEF_MAX_PER_HOUR` | World brief |

Default model: Claude Sonnet 5.5 (`claude-sonnet-5-5`) at low or medium effort.

### Commands

| Command | Does |
|---|---|
| `npm run dev`, `npm run build`, `npm start` | Develop, build, serve |
| `npm test` | 21 chained test suites (indicators, research, layers, agreements, flights, investment, media, diplomacy, intel, dossier, integrity, falcon, services, machiavelli, deep, case, architect, case-report, case-log, case-king, desk and others) |
| `npm run typecheck`, `npm run lint`, `npm run check` | Types, lint, all three |
| `npm run parity` | Regenerates `docs/parity.md` |
| `node scripts/build-*.mjs` | Dataset builders (list in section 15) |
| `node scripts/verify-markets.mjs [--limit=16]` | Checks the market vendor plan and symbol coverage |

### Scheduled jobs (`.github/workflows/`)

- `refresh-data.yml` (daily): agreements, flights, investment, missions, visits, IMF trade and outlook, Partnership Index, leverage, scorecard, rivals, knowledge graph, trends, financial conditions, IMF vintage snapshot, monthly capture counts, monitor snapshot. Runs the tests, opens or updates one standing PR when something really changed.
- `refresh-media.yml` (daily): media tone and bilateral temperature from GDELT raw event files.
- `refresh-reference.yml` (monthly): ports, power, infrastructure supplements, heritage, bases, exchanges, think tanks, outlets, channels, aid, regions, extra memberships, organisations, governance, leaders, UAE aid. A failed build keeps the committed file.
- `ci.yml`: checks on pull requests.
- Rebuilt by hand, not scheduled: ransomware, sanctions, UN votes, NPT/IAEA/ECOSOC lists.

---

## 4. The World atlas (`/`)

### Map

MapLibre globe with Natural Earth boundaries, country select, hover and outline, capitals, deep links, projection and basemap choices, a day-night terminator, graticule, and a guided tour.

### Layers (layers drawer, URL-shareable)

Flights including military, natural hazards, outbreaks, weather and radar, NASA true-colour imagery (with a date picker), fires, satellites, launches, GDELT events, GPS interference, sanctions by country, UAE missions, UAE visits, UAE flights, UAE investment, the Partnership Index, ports, straits, pipelines, bases, and 59 membership layers (52 with a member list): UN, EU, NATO, GCC, OPEC (the UAE left OPEC and OPEC+ on 1 May 2026), BRICS and more. Every layer shows an honest status; sources and caveats are in `src/lib/layers/registry.ts`. Membership lists from Wikidata carry a "may miss a member or two" note.

### Country panel (tabs)

| Tab | Content |
|---|---|
| Overview | Capital, local time, weather, air quality, leaders, borders, region, memberships, the **UAE Partnership Index** |
| Economy | World Bank series, **IMF outlook** to 2028 with ranks, export-demand outlook |
| Trade | UN Comtrade top HS chapters both ways, 5-year trend, mirror-data fallback; **trade intelligence** (IMF customs, share, rank, momentum, **CEPA impact**) |
| Military | SIPRI through the World Bank |
| Society | World Bank social series |
| News | RSS headlines, self-refreshing every 5 minutes, with a separate list naming both the country and the UAE |
| UN votes | Ideal-point history vs the UAE, agreement share, most and least similar voters (through 2023) |
| Agreements | MOFA and Ministry of Foreign Trade treaties, MoUs, CEPAs with signed and in-force dates, tax and air treaties, joint committees, economic offices; direct flights and airlines (active vs suspended); IMF investment position |
| Diplomacy | The UAE's 124 embassies, consulates and permanent missions (plus 3 visa centres) with ambassadors and contacts; about 2,100 official visits, meetings, calls and signings since November 2024 (auto-classified, filter by seniority and direction) |
| Media | GDELT tone of the country's media toward the UAE, think-tank pieces naming the subject, and an opt-in AI stance read per headline |
| Intel | Free, deterministic indicators (see below) |
| Councils | The **Council Round Table** (section 8.1k): every council on file for the country side by side (course, headline, risks, auditors, readings of the fourteen angles against the rule-built baseline, consensus), and the paid challenge round (about US$0.7) |
| Brief, Minister, Desk, Foresight, Counterpart, Investments | AI products (section 6) |

### Partnership Index

A transparent 0 to 100 score per country from trade 25%, diplomatic engagement 20%, agreements and CEPA 15%, flights and embassy 15%, UAE investment 15% and UN voting alignment 10%, percentile-based, with every raw value shown.

### Intel tab (all free, no AI)

Leverage and exposure quadrant; bilateral temperature (GDELT, Goldstein scale, weekly line); governance and stability (World Bank, UAE marked); leadership clock (tenure, age, coming elections); UAE investment and company deals read from WAM headlines; UAE humanitarian funding (OCHA FTS); "since your last read"; editable triggers. A **country scorecard** (eleven aspects in three groups: the relationship 47%, the country 35%, weight in the world 18%) and **rivals** (the UAE's share of the country's goods trade against China, US, India, Türkiye, Saudi Arabia, Qatar, Russia, Germany, France, Italy, UK, Japan, South Korea).

### Compare view

Two countries side by side across 15 indicators, plus UN agreement and ideal points (`?cmp=ISO3`).

### Dashboard, Ask, alerts

- **Dashboard:** role presets, saved layouts, 20 widgets, watchlist, AI world brief, one-page printable country brief.
- **Ask:** answers only from this app's data, with cited facts.
- **Alerts bell:** hazards, WHO, GDELT and headlines in one feed with UAE radar, everywhere, flagged and security tabs.
- **Live ticker:** RSS headlines at the bottom.

---

## 5. Gulf equities (`/markets`)

- **Universe:** 83 ADX, 56 DFM and 55 Qatar (QSE) listings. DFM tickers are validated against DFM's own disclosure feed.
- **Board:** sortable, filterable table with price, change, volume, 52-week range, 1W/1M/3M/YTD/1Y returns, RSI, distance from SMA200, 60-day volatility, sparkline, movers, advancers and decliners, CSV export.
- **Stock page:** interactive chart (line or candles, SMA 20/50/200, EMA, Bollinger, volume, RSI, MACD, crosshair), performance and risk, technical readings, pivot points, valuation, profitability, health and growth ratios, income statement, balance sheet and cash flow, dividend history, earnings vs estimates, and the company's **DFM disclosure timeline with PDF links**.
- **Live tab and screener (no key needed):** TradingView display widgets: 12 UAE screener views, an economic calendar, technical gauge, fundamentals and company profile.
- **AI research tab:** an initiation-style note by an AI analyst briefed as a senior GCC banker (12 sections: stance, snapshot, developments, financials, trading and liquidity, valuation, technicals, catalysts, scenarios, risks, management questions, data gaps, numbered sources). Sonnet 5.5, at most 8 searches and 4 page reads, capped at US$1.00, 6-hour cache, saved in the browser. Measured: EMAAR, $0.73, 62 sources.
- **Data honesty:** ADX forbids automated retrieval, DFM's feed carries disclosures only, so prices come from a licensed vendor (Twelve Data). Without a key every stock is still listed and DFM filings still show; prices say "not connected". ADX filings are not shown. Qatar has no disclosure feed in the app (qe.com.qa asks robots not to read its documents).
- **Per-stock trade counts** are not published free; the analyst reports "not found" with labelled proxies.

---

## 6. Country AI products

All click-started, cached, capped per hour and capped at US$1.00 per run. They share one fact pack per country built from the datasets (IMF, World Bank, GDELT, agreements, trade, flights, investment, visits, headlines, scorecard, rivals). Every claim cites a fact id; uncited statements are marked as background. Where the app holds no approved UAE position, meeting minutes or mandates, the text says `DESK INPUT REQUIRED`.

| Product | Where | What |
|---|---|---|
| **Country brief** | Country panel, Brief | Where the country stands, economic indicators, current events, engagement with the UAE. No web tools. About 3 hours cache |
| **Minister brief (prep pack)** | Country panel, Minister | For a UAE minister about to meet or call: suggested opening, objectives, talking points, likely questions with answers, sensitivities, open items. Economy mode uses a smaller model |
| **Detailed ministerial briefing** | Minister, "Open the briefing workspace" | Three linked documents: executive brief, strategic country dossier, meeting talking points. Choose counterpart, meeting type, depth, focus, language, desk input. Exports: PDF, Word, PowerPoint |
| **Desk brief** | Desk tab | Long political and economic analytical brief for a MoFA desk officer: 27 topics, lens, horizon, length (about 1,500 to 14,000 words), style, language |
| **Leader's brief** | Minister form, audience "UAE Leader" | Two pages, President's-Daily-Brief style |
| **Counterpart profile** | Counterpart tab | The person being met: documented career, public record, priorities, incentives, how to move them. Public role only |
| **Investment dossier** | UAE investments tab | Researched register of UAE money there, five kinds kept apart, status words that never turn an announcement into a completed deal |
| **Foresight brief and report** | Foresight tab | Ministerial Executive Brief (8 designed pages) and Comprehensive Strategic Report (16 sections over 1, 3, 5, 10, 20 years), UAE-first |
| **Stance read** | Media tab | AI reads each headline's stance toward the UAE |
| **World brief** | Dashboard | A short worldwide brief |
| **Ask** | Dashboard | Q and A from the app's own data |

Shared frameworks:

- **Statecraft lens** (`src/lib/statecraft.ts`): seven instruments of influence (hard, economic, financial, logistic, soft, humanitarian, diplomatic) tag every proposed move; three courses of action with second-order effects; sequenced play; gives, gets and holds-back; red team with tripwires and concession ladder. Realism is a method, not licence: every move lawful, evidence-bound, labelled a proposal.
- **Three advisers** (`src/lib/advisers.ts`): National Security Adviser, Minister of Economy and Minister of Foreign Affairs read the same facts, then a mandatory reconciliation says which lens leads.
- **Intelligence tradecraft** (`src/lib/tradecraft.ts`): bottom line first, key judgments as "We judge ..." with a likelihood band and a separate confidence, know / assume / judge kept apart, key-assumptions check, competing hypotheses, indicators, gaps, source summary. Labelled an open-source analytical product, never an intelligence-agency report.
- **Illustrated view:** score ring, eleven-axis radar, group bars, leverage quadrant, rivals bars, weekly tone line, likelihood meters and numbered plays, drawn from the text with no extra model call.
- **Research reliability:** the search tool is driven by code the model writes; searches run one query per step with no retries; the route logs failed research steps and the brief must open with a research note if research failed. A cheap run with no links is a run whose research failed.

---

## 7. Falcon Eye (`/falcon`)

The intelligence console. One shared world model and one set of saved products feed ten sections:

| Section | What it does |
|---|---|
| **Command Center** | Counts; a live situation room from the merged alert feed (category, severity, UAE filters, answer state of each source); the early warnings with the biggest UAE stake; build date and freshness of all datasets (current, due, stale). **Ask Falcon**: a free word-list router that sends a plain question to the right section |
| **Radar** | Every country scored on opportunity and risk from transparent parts (each with source and slider); scatter of risk against opportunity sized by UAE stake; three ranked lists; full early-warning board whose indicators each have a written threshold, baseline, source, frequency and UAE impact |
| **Country Desk** | Scores, triggers, the briefing products, and the Foresight baseline, impact graph and tracker |
| **Foresight** | The two foresight products, also for the world, 5 regions, 17 sub-regions, 8 blocs and 8 sectors (a scope id is three letters never used by an ISO country) |
| **Scenario Lab** | Traces a shock or policy question through an outcome graph; compares mild, central and severe variants; scores options (baseline and waiting always included) on six criteria with re-weightable sliders and a robustness check over 400 random weight sets. Deep mode adds typed sourced causal links, tipping points, analogues, outside scenarios and regret analysis. Bands are never probabilities |
| **Opportunity** | Six-axis radar with live re-weighting and a route to the enhancement strategy |
| **Council** | Ten bounded agents in five stages from one cached evidence base: orchestrator, four specialists (geopolitics and security, macro and finance, energy and trade, technology and climate), UAE-interest and foresight analysts, red team and verifier, editor. Preserves disagreement. Agreement is not independent corroboration, and the product says so |
| **Graph** | Knowledge graph: 656 nodes, 8,462 typed, weighted, sourced links (verified or inferred; hypothetical links never stored) across countries, blocs, UAE entities, sectors, chokepoints, pipelines and office-holders. Search, neighbourhood, indirect routes to the UAE, ranking questions. A file, not a database server |
| **Monitor** | Daily snapshot of the world model (90 days kept), what changed, browser-stored watchlist rules, five-minute poll while open, optional browser notifications. Not a stream |
| **Library** | Every product generated on this browser (open, red-team, delete), now including the Case File's council and Architect, and a **forecast registry** of key judgments you mark true or false, reporting a Brier score and skill (coarse; warns below 20 resolved) |
| **Platform** | The GEO BRIEF register GB01 to GB20 with honest status, reference reports, method register, **source rights register**, and what is not built |

Also: **Red Team** (reviews any saved product independently: verdict, strongest competing explanation, competing hypotheses, omitted actors, checks against sources, premortem; the reviewed text is treated as data) and **Quality gates** (deterministic checks on every lab, foresight and council text; necessary, not sufficient).

---

## 8. The Case File (`/case`): the President and Minister view

The one place a President or Minister reads a country. Five views; nothing is shown in two places. **Priorities** is across all countries; the other four are for the chosen country: **President**, **Minister**, **Detailed**, **Reports**. **THE KING** (the decision room, section 8.1c) and **The Ambassador** (the embassy council, section 8.1d) are pages of their own in the main navigation; the old links `#king` and `#ambassador` redirect there.

### 8.1 Header

Country picker (shared), name, region, scorecard, rule-based posture, and two status chips: **Council on file / not run** and **Strategy on file / not written**. Five large view buttons: **Priorities, President, Minister, Detailed, Reports**, links to THE KING and The Ambassador, and a **what-changed chip** (section 8.1a). Status chips also show whether an embassy brief is on file. With no country chosen the page opens on Priorities. Older links (`#exec`, `#council`, `#architect` ...) still open the right place.

### 8.1a What changed (the chip under the header)

One answer to "has anything moved since this file was last reviewed?". Baseline: the later of the last **Mark as reviewed** and the Statecraft Architect's saved state; the first time a country is opened its baseline is set to that moment. The chip counts changes and opens the list; each line has a severity and an Open button. It lists: posture change; value, ability or risk moving 10 points; new alerts; new data builds; 90 days; dated gates reached; new sanctions-list entries; ransomware, deals and engagement counts moving; reported tone shifting by half a point; a Council or strategy older than the newest data build; decisions due within 14 days or overdue. It replaces six separate detectors (Intel "since your last read", Falcon Monitor, the Strategy Review Engine, Deep run comparison, the Machiavellian review, the Country Brief check) as the place to look; those still exist.

### 8.1b Priorities (all countries)

Every country on one board, grouped by the posture rule and sorted by one reading you choose (value, ability, risk, partnership, alerts, name). Three queues on top: **decisions to review**, **changed since the last review**, **high value with no Council yet**. Filters: posture, region, search, only with a file. Rows show value, ability and risk bars, Partnership rank, alerts, leverage, Council and strategy on file, and flags. Click a country to open its President page. There is deliberately no combined priority score. Same `buildCase` as each country's own file; free.

### 8.1c THE KING (`/king`: the head of state's decision room)

A page of its own, top-level in the navigation (Arabic label "القرار النهائي"). Ten specialists in four sittings and a **Decision Chair** analyse the country in every field, and the head of state can put any question or directive to them. Archetypes of PhD-level expertise with decades of practice (no real person is represented): **K1** Geopolitics and Regional Order; **K2** Domestic Politics, Leadership and Succession; **K3** Macroeconomy and Sovereign Finance; **K4** Trade, Investment and UAE Economic Statecraft; **K5** Energy, Food, Water and Critical Resources; **K6** Security, Defence Cooperation and Counter-Terrorism (policy level); **K7** Intelligence Assessment, Indications and the Red Team; **K8** International Law, Treaties, Sanctions and Compliance; **K9** Society, Media, Narrative and Soft Power; **K10** UAE Policy Memory: Precedent, Doctrine and Past Decisions. They use official sources, think tanks (Chatham House, Carnegie, CSIS, IISS, Crisis Group, ECSSR, TRENDS and the country's own), news and wire reporting, reports and indices and the UAE's own strategy and record; there is no compliant social-media access and none is claimed. Standards follow ICD 203 as a method only (bottom line first, likelihood band and separate confidence on every key judgment, assumptions, alternatives, indicators with thresholds, gaps); there is no signals or classified access and the product says so.

Convene the Council (click-started, about US$0.55 measured measured on Egypt, under a US$1.00 ceiling; the first sitting runs alone to warm the shared cache). The Chair returns: the **Decision** (deepen, staged, hedge or hold, with confidence, conditions and what happens if wrong), the **Executive Brief** (at most 650 words), the **Detailed Brief** (situation, the UAE's record and precedents, the fields, the four courses, recommendation and conditions, implementation gates, the red team's case, indicators and warnings, gaps) and validated structured data. Tabs: **Decision** (the Council's call above the free national-interest scorecard, readiness checklist, four courses, investment case, what the embassy advises, and **Take the decision** by a named person with conditions and a review date; recorded in the decision log and shown on the Priority board as "Decided"), **Executive brief**, **Detailed brief** (with the four courses, key judgments, risks, indicators and the UAE's precedents), **The Council** (each specialist: mandate, questions, sources, findings; "Ask this specialist"), **UAE history here**, **Ask or direct** and **Prompt library**. Every item opens to its detail and every fact id opens the fact and its source.

### 8.1d The Ambassador (`/ambassador`: the embassy council)

A page of its own, top-level in the navigation. The UAE ambassador's country team, organised as an embassy is, with a **Chief of Staff** (the Deputy Chief of Mission's role: briefs, keeps the updates, answers) and **twenty-one desks**: **E1** Political, **E2** Economic, **E3** FDI and Sovereign Investment Attaché, **E4** Commercial Attaché and Private Sector, **E5** Power and Stakeholder Mapping, **E6** Security and Defence Cooperation (policy level), **E7** Bilateral, Protocol and Treaty Affairs, **E8** Regional and Multilateral, **E9** Water, Resources and Logistics, **E10** Consular Attaché and the Community, **E11** Culture, Media and Public Diplomacy, **E12** Humanitarian and Development, **E13** Legal, Compliance and Mission Risk. Brief and structure follow the published country-team and Integrated Country Strategy model and ambassadorial briefing books.

Two click-started sittings, each under its own US$1.00 ceiling. **Sitting 1, the intelligence brief** (US$0.98 measured before the final budget trim, expected about 0.85 measured): the Ambassador's Brief, updates and standing instructions, the **power map** (government, security, economic, private-sector, community, research and media institutions and public roles at three levels, each with why they matter, how to engage openly and officially and a caution), **10 to 16 private-sector and state-linked companies to engage** with the UAE counterpart, the win-win logic, the structure and the due diligence first, ranked investment plays (enter, expand, protect, with the local counterpart, structure, protections and due diligence), neighbours, scenarios, risks, indicators, the next 90 days and what the host is likely to ask of the UAE. **Sitting 2, the mission strategy and plans** (US$0.89 measured before the plan prompt was shortened, expected about 0.85 measured): the end state, strategic logic, objectives and measures, the investment and engagement strategy, what the mission will not do, the **100-day, one-year and three-year plans** (each initiative with a proposed owner, actions, KPI with baseline and target, cost "not estimated" unless evidenced, risk, dependencies, due diligence first and a gate), the due-diligence register, decision gates and resources. The Chief of Staff gives an **update** on demand (US$0.20 measured) and answers any question or directive through **Ask or direct**. Tabs: Chief of Staff, Ambassador's brief, Mission strategy and plans, Power map, Private-sector partners, Investments (the free UAE investment advantage plus the desk's plays), The desks, Neighbours and region, UAE history here, Ask or direct, Prompt library. Boundary: influence is not control; public roles and organisations only; hard power at policy level; no social-media measurement exists and it says so.

### 8.1f The Ministry (`/mofa`: the Ministry of Foreign Affairs)

A page of its own, top-level in the navigation (Arabic label "الوزارة"). **Organisation** tab (free, no model): the Ministry's public functions as a live infographic (Minister, the Ministers of State including International Cooperation, the Minister's Office and Strategic Affairs, the Under-Secretary, eight sectors with their departments, the missions abroad; 22 roles, 11 marked as key roles). Click any role for its mandate, its key functions and, once the council has sat, its headline on the chosen country. For the chosen country each role that an agent thinks from carries a ring (not run, working, done) and a bar for progress against the goals whose proposed owner names that function (an approximation, printed as such). The map is built from what the Ministry and the government publish about their own structure; the published chart is an image that could not be machine-read, sector names and groupings change, and a role is a function, never a claim about a named person: verify any title against the Ministry's current published structure.

**Convene the Ministry's Council** (click-started, under a US$1.00 ceiling shared by every call including the two auditors): sixteen role-agents in five sittings, each a function of the Ministry with its own duties (**M1** Minister's Office: Intent, Interests and Red Lines; **M2** Minister of State: Engagement and Visits; **M3** Policy Planning, Goals and Measures; **M4** Political Affairs and the Regional Desk; **M5** International Organisations and Multilateral Affairs; **M6** Economic and Trade Affairs; **M7** International Cooperation: Development Finance and Aid; **M8** Finance, Logistics and Connectivity; **M9** Security and Defence Affairs (policy level); **M10** Consular Affairs, Protocol and the Community; **M11** Cultural, Education and Public Diplomacy; **M12** Legal Affairs and Treaties; **M13** Missions Liaison). They think strictly from the Ministry's point of view: the UAE's interests first, then the means, then the sequence. The **Under-Secretary** writes the Foreign Policy Brief; the **ranked priorities** (five to eight, each naming the UAE interest it serves, why it ranks where it does, its owner and its fact ids); the **goals** (measure, baseline "not established" when it is, target, date, owner, where the measure is read); the **mission tasks** for the ambassador and the embassy by priority; **plans for the embassy in seven domains** (political, security, social and cultural, economic, trade, logistics, finance: aim, two to four actions with owners, timing and measures, risks, dependencies); the reporting cadence between mission and Ministry; and the indicators that trigger an updated brief. Both independent auditors then review it (red flags first). Tabs: Organisation, Foreign policy brief (quality check and reviews above it), Priorities and goals, Mission and plans, **Progress**, The roles (the round table and the thirteen agents), Ask or direct, Prompt library.

**Progress** (free): mark every goal and task not started, on track, at risk or done with a short note; progress counts 100% done, 50% on track, 25% at risk, 0% not started. The statuses live in this browser (the Ministry's systems are the record). **Send this progress for an updated brief** opens Ask or direct in update mode with the progress report as the topic: the Under-Secretary searches the last 30 days, reads what you reported and says which goals to keep, change or drop (about US$0.20). The Ambassador's council reads the Ministry's priorities and tasks when they are on file, and the Ministry reads the embassy's brief and strategy.

### 8.1g The Room (`/room`: every council at its table)

Every multi-agent council on the platform as a round table (THE KING, the Ministry, the embassy intelligence and plan, the Strategic Council, the Architect, Falcon, Machiavellian, Deep): the chair at the head, the agents around it, the two auditors (diamonds) at the foot. The seats are drawn from the rosters the councils run on, so the picture cannot drift. On a council's own page the table is **live** while it sits: each seat's ring shows waiting, working (pulsing), done, failed or skipped as the run reports it. On the overview page, for a chosen country, the four desk councils fill in from the saved products in this browser; the others show their rosters. Nothing on the page starts a paid run.


### 8.1h Expert standard, security triad, SME attaché and embassy gaps (30 October 2026, second round): one expert standard, the security triad, the SME attaché and the embassy's gaps

- **One expert standard for every agent** (`EXPERT_STANDARD` in `src/lib/sources.ts`, inside the shared `SOURCE_PLAN`, so it reaches every system prompt): each agent is a PhD-level subject-matter expert with decades of practice; the UAE's national interest comes first (a finding with no consequence for the UAE is cut); straight to the point (the answer first, then evidence, then what would change it; no preamble, no generic commentary, numbers instead of adjectives, named sources instead of "recent reports"); every claim backed by a fact id or a dated named source, a gap marked "not established" and never filled with a guess; known, estimated and recommended kept apart, with bands and confidence. `audit.test.ts` fails if any system prompt lacks it. The Falcon Council's system prompt had been missing the shared source plan altogether; it now carries it.
- **The security triad on every council** (`src/lib/desk/triad.ts`, defined once): a **National Security** expert (threats from or through the country to UAE people, infrastructure and routes: terrorism and extremism, cyber and information threats, interference, illicit finance; policy level, public sources, nothing operational), an **Energy Security** expert (supply, routes, prices, the transition, critical minerals, where UAE energy companies can secure supply, invest or sell) and a **Food Security** expert (staples and agri-inputs the country can supply, routes and export-policy risk, UAE agri-food investment and offtake without land-rights or reputational harm). In THE KING they are K11 to K13 in a fifth sitting (K5 became Water, Critical Minerals and Resource Logistics and K6 Defence Cooperation and Strategic Security, so no topic has two owners); in the Ministry M14 to M16 (with desks on the org chart); in the embassy E19 to E21 (E9 became Water, Resources and Logistics); in the Case File Strategic Council seats C21 to C23 (core seats, always convened; C11 narrowed to resources and critical minerals); in the Machiavellian council three seats; in the Deep team three always-selected roles; in Falcon a National Security and a Food Security analyst beside the Energy Security analyst (the old energy analyst, refocused). To stay under the US$1.00 ceiling the sittings were trimmed and each desk now writes about 600 to 800 words.
- **Embassy: 21 desks.** Added E18 **SME Promotion Attaché** (SMEs both ways: sectors and clusters, public programmes and agencies, frictions, a twelve-month programme with measures) beside the E14 Chief of Strategy, E15 Chief Partnerships Officer, E16 Trade Attaché and E17 Education and Science Attaché; five intelligence sittings and four plan sittings; two independent auditors close both. The embassy and the King now draw a round table of every seat, live while a sitting runs.
- **Embassy: trade and investment gaps** (new tab, and the "Trade and Investment Gaps" section of the Ambassador's Brief; `gaps`, `sectorSupport`, `inbound` and `sme` in the structured data, checked by the quality gate): the trade and investment gaps between the UAE and the country with evidence, size only where evidenced and the first step; the UAE companies and vehicles that can expand into or enter the country (each naming the gap it fills, the counterpart, the structure and the due diligence first); the sectors the UAE can support, from an economic and an influence perspective, with instruments and risk; the companies from the country, public and documented, that could come to the UAE and set up, with the route (free zone, financial centre, mainland, venture programme) and due diligence; and the SME promotion programme.

### 8.1i PDF reports, the Archive and the Bird's Eye view (30 October 2026, third round)

every AI product now has a PDF report. A PDF is made **automatically** when any AI product finishes (a background sweeper in the shell turns each saved product into a PDF, a few at a time, free, from what is already saved) and from a **PDF button** on every council and desk (`src/components/PdfButton.tsx`, `src/lib/reportpdf.ts`): a cover block, the independent auditors' red flags first, the consolidated brief (the long role-by-role annex stays on the platform), the **structured annex** (for the embassy: the power map, companies to engage, UAE companies that can expand, gaps, sectors to support, inbound companies, SME programme, scenarios, risks and the 90-day calendar; for the mission strategy: objectives, initiatives by horizon, gates and the due-diligence register; for THE KING: the four courses, judgments, risks and indicators) and the sources. Arabic reports are right-to-left. Directive answers, Case File reports, dossiers, briefs and prep packs are covered too. **The Archive** (`/archive`, IndexedDB in this browser, `src/lib/archive.ts`) keeps every PDF by country with search and kind filters, Open, Download, Delete, a zip of everything and a request to the browser to keep it; it lives on this device only and says so. **Bird's Eye** (`/bird`, the last tab; `src/lib/bird/consolidate.ts`, free, no model) consolidates every tab on a country into one view: the course (the Case File posture, THE KING and the Ministry, and whether they agree), the auditors' red flags from every product, the top strategic insights, the ranked interests with progress, the next moves, opportunities and risks, the national, energy and food security readings, what to watch, the evidence base (age, grade, auditors, flags) and a decision-readiness score; every line names its source tab, and the whole view is a PDF. **Complete the picture** (`src/components/bird/Complete.tsx`, `src/lib/bird/runner.ts`) runs every AI council that has nothing on file for the country (Strategic Council, Architect, Falcon, Machiavellian, Deep, embassy intelligence, the Ministry, mission strategy, THE KING), in the order that lets each read the one before, after one explicit click that shows the list and the estimate (about US$5 to 8 for a blank country; each run keeps its own US$1.00 ceiling); the hourly cap pauses it and it resumes by itself while the page stays open; finished products are saved where their own pages keep them, and the bird's eye PDF is built and archived at the end. Optionally it refreshes products older than 30 days.

**The audit before publishing** (30 October 2026, fourth round; `src/lib/bird/audit.ts`, `auditClient.ts`, `src/app/api/bird/audit/route.ts`, `BirdAudit.tsx`): before the Bird's Eye brief is published as a PDF, three independent auditors read it and a digest of the products it was built from, with the evidence on file: the **Statecraft Auditor** (does it serve the UAE, is the course sound, others' moves, alternatives), the **Reality Auditor** (is every figure, date and name real, current and traceable) and a new **Consistency Auditor** (does every line say what its source tab says, is anything important missing, do the tabs agree, is anything stale or unsourced, is it safe to publish). They may red-flag it; the audit (verdicts, red flags and the corrections asked for) is kept with a fingerprint of the brief and goes into the PDF as an "Independent audit" section, or the PDF says "NOT AUDITED". The PDF button asks for confirmation when the brief is unaudited, changed since its audit, or not cleared (a rejection or a critical red flag). About US$0.45, click-started, under the US$1.00 ceiling; "Complete the picture" runs it automatically after the councils, before it builds the archived PDF. The first live audit on Egypt found a real defect in the brief itself (a UAE trade share multiplied by a hundred: "370%"), fact ids quoted across products that mean different things in each (they are now removed from the consolidated brief), and an "all tabs agree" claim that rested on two of three readings (it now says so).

#### Cost of the councils (fifth round)
**Cutting the cost of the councils without touching their output** (30 October 2026, fifth round). Where a streamed council's money goes (measured on Egypt: output tokens about 45 to 50%, the prompt-cache write 19 to 22%, uncached input 12 to 14%, cache reads 11 to 13%, web searches 5 to 9%) and what was done: (1) **Constant tool limits** (`SEARCH_CAP`, `FETCH_CAP` in `src/lib/dossier/run.ts`): the web-search tool definition is the first part of the cached prefix, and its limit used to differ from call to call and from turn to turn, so calls with different small budgets each wrote the whole evidence block to the cache again; the limit is now one constant per task. (2) **Batch mode** (`src/lib/dossier/batch.ts`): the same prompts, the same model, the same tools and effort, sent through the Message Batches API, which bills tokens at half price; web search, dynamic filtering and the effort setting were verified to work in a batch. A request that carries the header `x-geo-batch: 1` runs all its model calls this way (parallel sittings travel in one batch, a paused call goes in the next batch, the cached prefix lives an hour so later calls read it); the answer arrives whole instead of streaming, so a council takes longer. "Complete the picture" has it on by default (a checkbox turns it off): the councils that do not read each other run at the same time in four waves, the estimate is the streamed cost times 0.6 (to be confirmed by the measured run below), and the hourly and concurrency limits are higher for that explicit bundle (`DOSSIER_BATCH_MAX_PER_HOUR`, default 27 (three bundles of nine); `DOSSIER_BATCH_MAX_CONCURRENT`, default 6); every run keeps its own US$1.00 ceiling. Everything else (single council runs from its own page, directives, the audit) streams as before. **Correction after the paired live audit (same day):** (a) batch mode is slow by design (one call took 2.9 minutes, a whole council 15 to 40 minutes), so it is now an opt-in checkbox, off by default; the default is the streamed path. (b) The streamed councils measured 136 seconds (Case council, 16 seats, both auditors ran, US$0.81) and 154 to 159 seconds (embassy intelligence, five sittings, chief and both auditors ran, US$0.85 to 0.91) because the sittings now start together: `runModelTask` keeps a registry of evidence prefixes, and a sibling waits only until the first call has started answering (the cache entry exists from then), not until it has finished; the desk route gives the parallel sittings a shared live ledger of spend so the US$ ceiling holds without cutting any sitting to an equal slice (an equal slice cut the first sitting short in the first parallel run). (c) A stale module copy once left the batch price factor undefined, so batch runs were logged and gated at full price and a batch embassy run skipped its chief and both auditors; the factor now lives beside `runUsd` and a test prices a whole run through the batch transport. (d) In batch mode the cost planner counts tokens at half price, so stages it used to skip (the Case council debate) can run. (e) "Complete the picture" runs the independent councils together in both modes, each showing its own status line; every council keeps its reviewer pair before it is filed, and the three-auditor audit of the brief runs before the brief is published, in both modes. **The live desk and the dependency order (sixth step).** While Complete the picture runs, a Live desk (`src/components/bird/LiveDesk.tsx`, state in `src/lib/bird/live.ts`) shows every agent of every running council as waiting, working (pulsing, with its own clock), done (with how long it took), skipped or failed, stage by stage with the independent auditors last, plus a running clock and a queue line for councils waiting on others; it is drawn only from the events the councils already stream and estimates nothing. The scheduler is now a dependency graph (`DEPS` and `runDag` in `src/lib/bird/runner.ts`) in place of the four waves: a council starts the moment the councils it reads have finished, and the independent ones (Strategic Council, Falcon, Machiavellian, Deep Intelligence) start at once and never hold anyone up. This also repairs a quality gap of the waves: embassy intelligence ran beside the Strategic Council and so never saw its digest in a fresh run; it now waits for it, as it did when the councils ran one after another. The longest chain (Strategic Council, embassy intelligence, the Ministry, mission strategy, THE KING) is what sets the total time, about 14 minutes for the whole bundle, because each of those reads the one before. **The illustrated bird's eye report (seventh step).** The report on the Bird's eye view page and in its PDF is now drawn, not listed (`src/components/bird/BirdReport.tsx`, `visuals.tsx`, and `src/lib/bird/visual.ts` for the PDF), from the same consolidated brief and with the same lines and sources: a dashboard (a readiness ring, the course on a four-step scale with each reader placed where it stands, and the counts that matter: critical and serious flags, councils on file, freshest product), section chips that jump to each part, the red flags as cards, a council-by-council board (each council's headline, a freshness bar, its grade, both auditors' verdicts and its flag count, a dashed tile for a council not yet run), insights as numbered cards with a colour bar per source tab, the ranked interests with progress bars, next moves as a timeline grouped by time, opportunities grouped by kind, risks in high, medium and low impact bands with their mitigation, the security triad and what to watch as cards, and the readiness checks. A council's headline skips header lines such as "Prepared for … | As of …". The page and the PDF follow the language and the right-to-left layout. **The country brief, the President's brief and the Desk agent (eighth step).** (1) **Country brief** in the Bird's eye view (`src/lib/bird/profile.ts`, `src/components/bird/CountryProfile.tsx`): eight panels built free from held data (Case File, trade, investment, agreements and CEPA, missions, visits, flights, deals, headlines, the UAE history layer, the desk officer's 24-section brief) with the gaps stated (tourism arrivals are not a dataset), plus a **Country Brief agent** (`src/lib/desk/country.ts`, product `country-full`, the tenth council of Complete the picture): eight specialists in four sittings, a Chief Strategist writing thirteen sections (background and history, government, economy, society and tourism, the UAE relationship and political status, the UAE's economic and trade position, flights and people, what each side wants, where interests meet and collide, latest news, the geopolitical and statecraft assessment, gaps) and the two independent auditors; the writer and the auditors carry the search tool so they read the sittings' cached evidence (about US$0.84 per run, measured). (2) **The President's brief** (`src/lib/desk/president.ts`, `src/components/bird/PresidentBrief.tsx`, `PresidentPages.tsx`, `src/lib/bird/presidentHtml.ts`): a tab in the Bird's eye view; a box takes a question or directive before the brief is written and the agents write a part of it to answer it; three illustrated, interactive pages (the position on six fronts, what each side wants, the events with front filters, the UAE's presence, the history and visits, a corridor route drawn leg by leg, the decisions to take with options you can mark and a recommendation, the recommendations and what would change them) and a three-page PDF (about US$0.70 per run, measured). (3) **The Desk agent** (own tab `/agent`, and a question box inside the Bird's eye view; `src/lib/agent/*`, `src/app/api/agent/*`): you write a question, task or directive and the format you want; a small router (about US$0.003) plans which departments work on it (the three desks, the councils, the country brief, the free data, the platform guide), shows the plan and its cost, and runs it only when you click through the departments' own routes (so their ceilings, caches and auditors apply); a writer puts their answers in the format asked, from the statecraft and geopolitical angle, with a PDF. Also fixed: country news for names that are also people or places (Jordan, Georgia, Niger and others) is queried with the country's own place and demonym. **Research canon, technology and the playbook annex (ninth step).** (1) `src/lib/sources.ts` now gives every paid agent a research canon (the think tanks and report series to read by field, and how: search the newest edition, read its findings, set two independent sources against each other, read the economic and trade data itself, use the last 30 to 60 days of news), a statesman-scholar standard (PhD and fifty years: history, theory, comparative cases and base rates, institutional memory) and a playbook discipline (name the playbook, the precedent where it worked and failed, the adaptation and the failure mode), and a technology and companies lens (technology level, data-centre and cloud capacity, AI readiness, research and innovation, connectivity; where the UAE can help and where the country can help the UAE; export and import of technology; which UAE companies fit and their counterparts, verified or candidate). A desk plan call can now carry a page-reading budget (`fetches` in `src/lib/desk/plan.ts`): the economy sitting of the Country Brief and the corridor sitting of the President's brief may read one full report. A "Sources read" panel (`src/lib/sourcemix.ts`, `SourceMix.tsx`) shows what a run read by kind (institutions, think tanks, official, UAE, news). (2) A free technology and innovation dataset (`scripts/build-tech.mjs`, `public/data/tech.json`: World Bank broadband, mobile, secure servers, R&D spending, researchers, high-tech exports, patents, with percentiles) feeds a Technology and innovation panel (country against the UAE, and rule-derived leads for where the UAE can help and where the country can help the UAE, `src/lib/tech.ts`) and the Technology angle of the country score (percentile rules); data-centre capacity and AI-readiness indices are not held and the agents search for them. (3) The Country Brief has a ninth specialist and a section 8 on technology, AI and innovation (fourteen sections). (4) The President's brief has a technology front on its scorecard, a technology annex (level, data centres, AI, research, connectivity, where each side can help, export and import, company matches in both directions) and a playbook annex (the UAE playbook for the country pillar by pillar with delivery status, evidence, next step, owner, outcome, and the twelve-month and three-year outcomes) fed by the baseline playbook (`src/lib/case/playbook.ts`); the PDF adds the annex pages. Not yet verified live: the runs after these changes (the API credit balance ran out).

### 8.1j Compare (`/compare`, 30 October 2026, sixth round)

A page of its own to compare and contrast two to four countries and to ask the agents for specific analysis between them, ending in a report. **Pick** the countries with the searchable picker (kept in the URL as `?c=QAT,SAU,EGY` and in this browser). **The comparison is free**, built by rules (`src/lib/compare.ts`) from the same held data as the Bird's eye profile: at a glance, the relationship with the UAE (partnership index, UN voting, scorecard, CEPA, agreements, visits in 12 months), trade and investment with the UAE, direct flights, the instruments' footprint and headroom, the six strategic dimensions and the UAE against its rivals. It shows as an overview (who leads how many figures, a radar, where the countries differ most, the rivals' bars), small multiples and a table that sorts by any column; the leader of each figure is starred (it can be switched off), and groups or single figures can be switched off. A figure no chosen country holds is not offered and is listed; one a country lacks shows "not held"; a leader is named only where at least two countries hold the figure and differ.

**Fourteen angles, ranking, playbook** (second pass): the "Fourteen angles" view scores each country 0 to 100 on the fourteen angles of the reporting spec (political and governance; diplomatic standing and friends; military at policy level; national security; economic; trade and investment; logistics and corridors; energy; technology, digital and space; soft power; the influence ledger; legal; climate; information) as the mean of the held components (open a row to read them) and shows the six Case File lenses; angles with nothing to score are **gaps**, with the held figures beside them (technology and space has none). "Rank by purpose" ranks the countries for a corridor partner, investment destination, security partner, bloc-building or soft-power return with sliders that re-rank live, the contribution of each criterion and each country's coverage of the weight. "Playbook and sequence" shows each country's one-line UAE statecraft playbook (from `src/lib/case/playbook.ts`) and a recommended sequence (first move, proposed owner, window and date, measure, gate). Presets: neighbours, same region, the UAE's largest trade partners, best connected by air, already briefed.

**Data sections** (third pass): the "Data sections" view has seven tabs: political (governance percentiles, UN votes with the UAE, the US, China and Russia, shared blocs, leaders and tenure), economic (size, growth, inflation, debt, reserves, current account, unemployment, FDI, remittances, ten-year trends), security (hard-power channel, military spending, security agreements, sanctions-list entries, ransomware, the dispute register), logistics and connectivity (routes, airlines, missions, ambassador, connectivity, corridor criticality), investment and trade (trade, investment stock, deals, UAE humanitarian funding, CEPA, agreements by type, rivals) , technology and innovation (World Bank indicators and where the UAE can help and where the country can help the UAE) and the UAE's position (partnership, leverage, instruments, embassy, visits, joint committee, playbook course and the fourteen-angle country score with its radar). Each is a sortable, filterable table with the leader starred and gaps marked "not held"; what no dataset holds (elections and succession, conflict and terrorism series, alerts by country, ports and corridor assets, data-centre and AI indices) is listed under the section.

**Ask the agents** (`CompareAsk.tsx`): write a comparative question or directive and the format; the router plans which department runs once for each country (a desk directive, the country brief or a council; none when the held data answers it), at most four runs in all, two at a time, each capped at US$1.00 by its own route. The plan lists every run with its cost (a fresh country brief on file is free) and the page asks for confirmation in an in-page panel (total and worst case) before anything is paid. The comparative writer reads the held-data table and each run's text, answers the question first, compares and contrasts from the UAE's statecraft and geopolitical angle, labels every move "Proposal:" and adds no fact. **PDF**: the question and the answer, then the leader tally, the radar, a table per group with bars and starred leaders, the rivals' bars and what is not held (the Archive keeps it as "Country comparison"). Costs: router about US$0.003; a table-only answer about US$0.01; a desk directive about US$0.3 per country. Not held, by design: tourism and visa regimes (the Country Brief agent searches for them) and anything no dataset covers.

### 8.1k The Council Round Table and the challenge between the councils (30 October 2026, eighth round)

**What it is.** Every council of the platform seated around one table for one country: the Strategic Council, the Architect, the Falcon Council, the Machiavellian council, the Deep Intelligence team, the Ministry's Council, the embassy's intelligence and plan, the Country brief, the President's brief and THE KING's Council, with the free rule-built Case File data as the baseline. It answers two questions: *what does each council say about the UAE's position in this country and about the country itself, and where do they differ?* (free), and *when they differ, which of them is right for the UAE?* (the paid challenge round). Code: `src/components/roundtable/*` (screen), `src/lib/roundtable/*` (seats and lenses `model.ts`, reading a saved product `read.ts`, the arithmetic of agreement `consensus.ts`, the page's view `view.ts`, PDF blocks `html.ts`, markdown `markdown.ts`, the PDF hooks `pdf.ts`, the digests and the run `challenge.ts`) and the desk product `src/lib/desk/challenge.ts`.

**Where it appears, each in its own domain.**

| Place | Lens | What it reads |
|---|---|---|
| Bird's eye view `/bird` (below the country score) | the complete picture | every council, all fourteen angles |
| Map country panel, *Councils* tab, and Case File *Detailed*, *Council opinions and challenge* | the country | every council, all fourteen angles |
| The Ministry `/mofa`, *Councils: opinions and challenge* | foreign policy, diplomacy, law and the multilateral track | political, diplomatic, security, military, influence, legal, soft power and narrative angles; the Ministry, THE KING, the Strategic Council and the Architect first |
| The Ambassador `/ambassador`, *Councils: opinions and challenge* | the mission: trade, investment, consular and engagement | economic, trade, logistics, energy, technology, soft power, diplomatic and influence angles; the embassy, the Ministry and the Country brief first |
| Desk-officer brief (Case File, *Desk brief*) | the full matrix | all councils, all angles, every challenge, for the analytical sections |

Only the councils that matter most on a page are shown first (the rest are one button away) and only the challenges that touch the page's angles are shown (the rest one button away).

**Part A, free.** Per council: its course for the UAE (deepen, staged, hedge, hold) from its structured data (`parseKing`, `parseMofa`, the President's scorecard) or, failing that, read from its own text by counting each course's words in its opening and conclusion (labelled "read from its text"; a council with no clear course is not placed on the scale), its confidence, headline, top risks and recommendations, its quality grade (`src/lib/quality/gate.ts`, for the four gated products) and both auditors' verdicts and red flags (`parseReviews`). Figures: the round-table diagram (seat colour is the course; a hollow seat is a council not run), the posture scale, the consensus meter (the spread of the courses on the hold, hedge, staged, deepen scale: 100 when all agree, 0 at the two ends; one voice is "thin") and the agreement and dissent matrix. In the matrix, each cell is how the council's own text reads that angle (cue words in the sentences that mention it, shrunk when few), 0 to 100: **a tone reading, never a score the council gave**. Fewer than three sentences is "thin", none is "silent". The President's scorecard and a challenge round's own scores are explicit scores and are marked. Colour is the distance from the rule-built baseline (`src/lib/bird/score.ts`) after taking out the council's own overall tone, so a council that writes cautiously throughout is not flagged on every angle; "≠" marks an angle the councils split on. Reads: `gd-case-council`, `gd-case-architect`, `gd-council` (Falcon), `gd-scouncil`, `gd-deep-council:<ISO>:full`, `gd-desk:king-council|mofa-council|emb-intel|emb-plan|country-full|president-brief`. The flights, visits and agreements the baseline reads load on the Bird's eye view, which leaves them in `gd-rt-extras:<ISO>` so the other pages build the same baseline.

**Part B, the challenge** (product `council-challenge`, about US$0.7 estimated, capped at US$1.00; one live run for Jordan with 11 councils on file and a directive measured US$0.525 in about five minutes: Cross-Examiner 0.226, Evidence Judge and Arbiter 0.091, Chair 0.109, each auditor 0.05; all five calls finished, the JSON block closed at 18.5 thousand characters, 13 challenges). A directive box steers what the councils debate; the button asks for an in-page confirmation first. The digests (free) are the context; two sittings (the Cross-Examiner; the Evidence Judge with the Arbiter of the UAE's interest, with web search) and a Chair of the Round Table, closed by the two independent auditors. The Chair and both auditors carry the search tool with a budget of one so they read the sittings' cached evidence. The result (`parseChallenge`): per council its best argument, weakest point, score of the UAE's position and of the country and its readings of the angles it addressed; up to twelve challenges, each "X challenges Y", with the rebuttal, the angles, the evidence and the side the evidence favours; the points of agreement; the dissent kept; and the arbiter's consolidated recommendation in the UAE's interest with its conditions, what would change it, the downside and its own scores. Per-section limits keep the writer from being cut off. Drawn as the debate view (cards, scoreboard, scores table, the arbiter's verdict). *Complete the picture* offers it as an optional last step. Everything is a proposal for a human decision; a council that is not on file is never given a position.

**PDFs.** The Round Table is in the PDF of every product that has a council behind it (for the lens of its own page), in the Bird's eye PDF, in the challenge's own PDF and in the Case File's written reports (the desk-officer, minister, ambassador and dossier templates), in English and in Arabic with right-to-left layout.

### 8.1e Ask or direct, UAE history and how the desks run

**Ask or direct** (both pages): a question, a directive or a request for an update on any topic. It is routed to the specialists whose field it touches (or the ones you choose); they answer in one sitting; the Chair or Chief of Staff writes the answer (band and confidence), the recommendation, options, the way forward (ordered steps with proposed owners, due diligence first), risks, what only the ministry can supply and three clickable follow-up questions. About US$0.27 measured each; its own hourly cap (12); answers are kept in this browser; on THE KING an answer can be recorded in the decision log. **UAE history here** (free, no model): the UAE's long record in the country from held data (trade, investment positions, all FDI into the country, UN voting distance since 1990, remittances, deals in the feed with sources, era averages) and what it cannot show; it is also passed to the agents as a fact. **How they run**: one run plan per product (first call alone to warm the cache, the rest in parallel, then the writer), fact ids checked against the evidence pack, cited facts saved with the result, a tolerant JSON reader that keeps what a cut-off answer completed and says so, a ceiling per run with a reserve for the writer, and the shared hourly cap of four full sittings. Leaving the page cancels a run; switching tabs inside the page does not.

### 8.2 President (one page, no tables)

- **The Answer** in large type: stance (Deepen, Selective and staged, Hedge, or Hold and watch), one-line meaning, why, biggest risk, confidence.
- **Three readings** as gauges: value to the UAE, UAE ability to act, risk (lower is better). Each shows number, plain level (high, medium, low) and a one-line meaning. A sentence says whether the stance holds if any reading moves 10 points.
- **Decisions for your consideration:** the Architect's list, else the Council's, else the one trigger the data gives (and it says so and offers the Architect for its measured cost).
- **What could go wrong** and **Next decision gates** (dated).
- **Four key numbers** with ten-year line.
- **Add these to the decision log** (a review date 30 days ahead) with the counts of what is open, due and overdue.
- A button to print or save the brief. This page renders the same building blocks as the one-page report, so what is read here is what prints.

### 8.3 Minister (the reasons)

The Answer plus decisions; the Council's executive judgment when one exists (marked if written in the other language); **six lenses on the UAE** in their own scales (relationship, scorecard, strategic value, exposure, market opportunity, counterpart condition) with a divergence sentence when two differ by more than 40 points; four key numbers with ten-year line and regional median; **strategy by horizon** (short 0 to 24 months, medium years 3 to 5, long years 5 to 15 and beyond) with the integrated timeline and next gates; **one risk panel** (country risk matrix, then the strategy's own risks); **one watch list** (data triggers and early-warning indicators together); evidence coverage tiles.

### 8.4 Detailed (the evidence)

Eight sections:

1. **Ten-year trends:** 60 metrics in 11 domains (Macro, Finance, Trade with the UAE, Investment, Institutions, Diplomatic alignment, Security, Society, Resources, Leadership, Connectivity), each with sparkline (dashed = IMF projection), latest, five-year change, z-score, regional median and the UAE; hatched where not built or not published. Exposure register (known and unknown; unknown is never zero), monthly captured signals, and where each number comes from.
2. **UAE value and position:** eight value pillars (political, economic, capital, geography and corridors, security and hard power, soft power, durability, standing against rivals) with parts and confidence; the **posture rule** on three separate readings (value, ability, risk) with a ±10 sensitivity test (proposed thresholds: deepen needs value 65 or more, ability 60 or more, risk 40 or less); measured position toward UAE policy; a position map of eight priority issues filled by the council; power balance; instrument matrix (hard power at policy level only); ring 1 (bordering) and ring 2 (strategic) neighbours; rivals; decision-makers.
3. **Strategic Council:** THE FALCON EYE council of **twenty seats** (C1 Grand Strategist to C20 Execution Director) in eight stages and eight agents: four independent group calls (the first alone to warm the shared cache), then debate on named pairs, evidence audit and red team, execution roadmap in parallel, then the Chair writes the Ministerial Executive Brief and Comprehensive Report. Convene all twenty seats or an activated subset. Seats preserve disagreement, never vote a false consensus; historical thinkers are lenses, never impersonations; no invented quotations. Prompt library shows the universal constitution and every role.
4. **Statecraft Architect:** the "UAE Statecraft and National Influence Architect" master prompt as a pipeline. Free first: twelve national-interest dimensions rated for relevance from held data, six-pillar baselines (what is and is not measured), official-versus-proposed note, and a map of what the earlier design already built. Then one click-started run: five analysts (doctrine, baseline and gap analysis alone first; then pillars, three horizons, and options with stress test in parallel; then implementation and measurement) and an editor writing six deliverables: Ministerial Strategic Brief; Comprehensive Country Statecraft Strategy (Parts I to XII); Integrated Roadmap 0 to 15 years; Soft/Hard/Economic matrix; Council Debate and Red-Team Memorandum; **Executive Decision Dashboard** as validated JSON (initiatives by horizon and pillar, timeline, funding "not estimated" unless evidenced, dependencies, gates, risks, indicators). Also an ICD 203-style tradecraft check (twelve structure checks, not a claim about any agency), a **Strategy Review Engine** (compares the Case File now with the state when the strategy was written: posture change, 10-point moves, new alerts or builds, 90 days, a dated gate reached) and the full master prompt.
5. **Strategy:** nine-criterion national-interest scorecard (weights 20/15/15/15/10/10/5/5/5, editable, proposals), four postures scored from drafts computed from the pillars, security and legal as decision gates that no total offsets (a score of 1 or less trips them), strategy canvas from the Chair's sections, the Architect's three horizons, and a button recording the posture as a decision for review.
6. **Decision log:** one log for every country (the Deep Intelligence register, shared). Entries come from the Strategy tab, the Architect's dated gates (record one or all), the decisions on the President and Minister pages, or typing. Each has due state, review date, owner, observed result and how far it may be credited to the decision (association only unless a method is written). Below: follow-through on past foresight calls (came true or did not, Brier score and skill, flagged below 20 resolved) and the Machiavellian roadmap gate counts.
7. **Desk brief:** 24 sections composed from the Case File; sections needing judgment come from the Council and show "not yet written" until then; the Architect's parts are woven into the matching sections (scenarios, options, action plan, risk register, assumptions, annexes), each labelled. English and Arabic.
8. **Readiness:** the 57-criteria audit (14 met, 22 partly, 21 missing at audit), the 60 trend and 66 strategy metrics by status, and the benchmark against public descriptions of agency standards and commercial products. English only.

### 8.5 Reports (assembled, never rewritten)

Seven types:

| Report | For | Length |
|---|---|---|
| President's one-page brief | The answer, three readings, decisions, what could go wrong, next gates, four numbers | 1 page |
| THE KING: decision memo | The question, the Council's call and Executive Brief, four courses with scores and gates, recommendation, readiness, objection, what would change the call, investment case, gates, decision log | 2 to 4 pages |
| Ambassador's plan pack | Brief, mission strategy and the 100-day, one-year and three-year plans, investment plays and advantage, who holds power, private-sector partners, neighbours, scenarios | 8 to 14 pages |
| Ministerial brief | Answer, Council judgment, six lenses, strategy by horizon, decisions, decision log and follow-through, risks, gates, indicators, options, position toward UAE policy | 4 to 6 pages |
| Strategy and roadmap pack | Three-horizon strategy, 0-to-15-year roadmap, power matrix, scenarios, red-team memorandum, indicators | 6 to 10 pages |
| Desk-officer brief | The 24-section master document with every trend table | 20+ pages |
| Full dossier | Everything, plus every other saved product on that country as annexes | 40+ pages |

How it works: pick a type, choose English or Arabic, optionally name who it is for and the **named reviewer**. Every part is a building block marked **written, partial or missing**; tick or untick any part. A missing part states what running it adds and its measured cost (Council about US$0.78, Architect about US$0.79); the report shows the total to fill all gaps; nothing runs until clicked. A product written in the other language is marked, not silently mixed. Live preview; print, PDF, Word, Markdown or copy. Below: what is on file and what it cost in this browser, and a table of the **four councils** and which to use for what.

### 8.6 The four councils (kept, cross-linked)

| Council | Seats or agents | Use it for | Cost |
|---|---|---|---|
| Strategic Council (Case File) | 20 seats in 8 agents | The decision-ready judgment, options, dissent and action plan for a minister. **Recommended for the ministerial file** | $0.78 measured |
| Falcon Council | 10 agents | Any country or scope (region, sector) | cap $1.00 |
| Strategy Council (Machiavellian) | 19 seats | The influence-strategy question | cap $1.00 (about $0.54 measured) |
| Deep Intelligence team | roles chosen by a routing rule | The consolidated evidence file | $0.51 measured |

The other three show one line saying whether the Case File council exists for the same country, and their saved results join the Full dossier as annexes.

---

## 9. Deep Intelligence (`/deep`)

The FALCON EYE second feature set. Ten tabs on shared filters (country, region, topic, sector, horizon, language, as-of date, access) and one shared snapshot.

| Tab | Content |
|---|---|
| FE01 UAE think tanks, FE02 Global think tanks | Register of 15 institutions (TRENDS and ECSSR shown as "source identified; ingestion validation pending"). Cards are the publisher's own title, date, author and description with a link; no full text stored. "The publication argues" is kept apart from "FALCON assesses". Headline families, coverage and blind spots, source forecasts. Click-started **research synthesis** (US$0.15 to 0.20) |
| FE03 Country and regional | Reuses Country Desk, Falcon and Machiavellian datasets |
| FE04 Economic Intelligence | IMF WEO (every year typed observation, estimate or projection; a guard blocks comparing nominal GDP with real growth) |
| FE05 Financial Conditions | World Bank WDI series; policy rates, yields, real effective exchange rate and external debt are listed as gaps |
| FE06 Markets and Companies | A bridge to `/markets`; states which of the eight subviews exist |
| FE07 Trade and Investment | Partner concentration (HHI), a transparent opportunity screen ranked under three weightings, investment positions with announced deals kept apart |
| FE08 Forecasts and Scenarios | Baselines (last observation, three-year mean, linear drift) with rolling-origin backtests at one to three years, MASE, empirical 80% ranges with sample sizes, beside the IMF; a forecast register; dated IMF snapshots for revisions. A model is operational only if it beats baseline (none yet) |
| FE09 Indicators and Benchmarks | 36-indicator dictionary (5 live, 17 partly connected, 14 not connected), readings and triggers, four peer sets written down before computing, four scorecards, cost dashboard, FE-AC01 to FE-AC20 acceptance register |
| FE10 Deep Intelligence | Ten sub-tabs (Decision Summary, Evidence, Perspectives, Economic and Market Signals, UAE Exposure, Outcome Trees, Options, Forecasts, Dissent, Follow-through) and **Full Consolidated Intelligence** |

**Full Consolidated Intelligence** (deterministic, US$0.00): reads every relevant module (irrelevant ones marked not applicable with a reason), freezes a manifest (data builds, rights, security label), merges findings into judgments that name their evidence, adds cross-module checks, outcome trees, options and triggers. An identical request over unchanged data returns the same run; a failed module makes the run partial, and it stays partial after review; a run whose builds changed is stale and cannot be approved; approval needs a named reviewer, checked on the server. Registers in the browser: UAE exposure, disagreements (never voted away), decisions and outcomes (association only unless a counterfactual method is written), information-value queue.

**Analyst team** (click-started, shared US$1 ceiling): roles chosen by a routing rule, at most three specialist runs, then challenger and verifier, then the chair. Measured $0.51 for six agents.

---

## 10. The Machiavellian module (`/machiavelli`) and the Influence Scorecard (`/influence`)

UAE strategic influence and long-term partnerships, aimed at durable influence through legitimate cooperation. It never plans takeover, covert infiltration, proxy subversion, identity-based manipulation or coercive control. Machiavelli is a critical historical lens, not an instruction manual. Persistent filters (country or region, issue, horizon, evidence cutoff, approved objective, security domain) feed every product.

### Cost design

Whatever can be arithmetic is arithmetic: six scorecard dimensions, six opportunity-radar axes, tier hints, concentration, regional roll-ups, change check, escalation flag and brief cadence are computed from the datasets with an evidence string for every score and no model call. A **scope guard** (`src/lib/machiavelli/guard.ts`) refuses takeover, infiltration, proxy support, identity targeting and coercion in the browser and on the server before any model is called.

### Sections

Global Position; Regional Strategy; Country Strategy (profile with radar, dossier or enhancement strategy, Council, Country Brief, worked examples); Power Instruments (ten instruments, twelve hard and soft tactics, option-appraisal calculator); History and Benchmarks (critical lens, great-power benchmarks, case cards, analogy rubric); Scenarios (scenario builder); External Influence (explanatory and defensive, evidence-versus-inference, relationship map marking links documented, alleged or uncertain); Strategy and Delivery (roadmap with gate approvals, rejected alternatives kept, governance checklist, versioned dossiers); Indicators and Review (24 indicators in six groups, never combined; change-triggered review).

### Strategy Council (19 seats)

Chair, Realist, Machiavellian, Counterpart Perspective, Geopolitical, Statecraft, Economic, Investment, Military and Strategic-Security, Finance, Social, Political, Influence, Logistics, Historian, Scenario, Independent Challenger, Evidence Verifier, Country Brief. Four specialist runs write fifteen seat reports from one cached base; the Challenger and Verifier test them; the Chair writes the Final Council Strategy naming the seats behind each action. The Challenger's dissent is always visible. No seat writes a quotation attributed to a real person.

### Country Brief

A recurring dated brief per country. Tier sets cadence (anchor markets monthly, growth frontiers quarterly, others twice a year); change check and escalation rule come from the datasets.

### Influence Scorecard (`/influence`)

Six dimensions as separate columns for every country, evidence on hover, regional roll-up, multilateral, financial and humanitarian channels, the Brand Finance benchmark and eight consolidated recommendations.

Extended on 29 October 2026: eleven pillars (adding Bilateral trade, Investment and capital, Political alignment, Governance and stability, Market size and growth), a **final score** (mean of ten pillars, economic depth shown but not averaged), the **average across all countries** (also weighted by trade with the UAE, and by pillar), an **index validation** panel (rank correlations against independent references; 8 of 9 held, the final score is 0.97 correlated with the Partnership Index and that redundancy is reported) and a **Non-friendly states** tab (criteria-based watch list: bilateral events, UN voting divergence, sanctions exposure, trade without engagement must agree; distance is not hostility; documented tensions in `public/data/tension-register.json` with sources; an analytic prompt, never a designation).

### Audit and quality bar (29 October 2026)

See `docs/platform-audit-2026-10-29.md`: the smoke test, the inventory and duplication findings (seven overlapping decision councils, six overlapping indices), the single prompt bar (`src/lib/audit.test.ts`), the independent reviewers (Decision Auditor, Plan Inspector, Strategy Auditor), the free Quality check on THE KING and the embassy products, and the audit of this session's own work.

### Reference check

The specification's key facts were checked on 25 October 2026. Confirmed: UAE 10th in the 2026 soft-power index, 38 CEPAs, third-largest humanitarian donor in 2025, Ras El-Hekma. **Contradicted or out of date:** the UAE left OPEC and OPEC+ on 1 May 2026; the UAE is 8th on diplomatic influence; NIIF's September 2026 close was a first close of about US$2bn anchored by the Government of India; the Fujairah terminals are an agreement in principle; ADIA ranks 5th. Not found: the AED107.5bn India H1 2026 figure.

---

## 11. Cross-cutting rules

### Cost and click-start

- Nothing paid runs unless clicked.
- Every paid run has a hard ceiling of US$1.00 (`*_MAX_RUN_USD`). Agents that would not fit under the ceiling are skipped, not squeezed in; the Chair or editor is always reserved for.
- Agents in a council share one system prompt and one cached evidence block, so the evidence is paid for once; the first agent runs alone to warm the cache.
- Repeated requests are served from cache (3 to 6 hours) at no cost.
- Hourly caps (default 4 for long products, shared across them), at most two long runs at once.
- Costs are measured, shown before running, and logged in the browser's cost ledger.

### Honesty rules

- Unknown is "unknown, not zero"; it lowers confidence and never appears as a low score.
- Projections are typed observation, estimate or projection.
- No single composite score across different scales; lenses stay separate.
- Thresholds, weights and strategies are proposals; funding is "not estimated" unless evidenced; lead institutions are proposed ownership, not approved responsibility.
- No invented quotations, commitments, approvals, intelligence access or financial estimates.
- Web content is data, never instructions.

### Scope guard and boundary

Takeover, infiltration, proxy support, identity targeting and coercion are refused before any model call. Hard power is covered at policy level, lawful, defensive and consent-based. Other actors' proxy use is analysed; the platform never designs proxy operations, covert action or armed non-state group use for the UAE. A Ministry of Foreign Affairs "2027 to 2029 strategy" could not be confirmed in public sources (the published strategy is 2023 to 2026), so it is not cited as adopted; the Principles of the 50 are.

### Arabic and right-to-left

- English and Arabic across the interface and AI outputs; AI products follow the language chosen when they were run (a product written in the other language is marked).
- Layout uses logical spacing and alignment throughout; checked at desktop and 375 px with no horizontal overflow.
- Arabic names for regions, subregions, deal sectors, the 60 trend metrics, their domains and sources (`src/lib/regions.ts`, `src/lib/case/ar.ts`); the 24-section desk brief and all reports in Arabic.
- Numbers: `.num` keeps pure numbers and chart axes left to right; `.numt` lets a sentence mixing Arabic words and numbers read right to left while every number keeps its own order.
- Not translated: the Readiness audit, prompt libraries, the Platform and Rights pages, and evidence strings generated in English by the Falcon radar, the Machiavellian profile and parts of Deep Intelligence.

### Source rights

`src/lib/falcon/rights.ts` (shown on the Platform page) records, per provider, the terms found on 25 October 2026 and how the data is used. Worth acting on: UN Comtrade is for internal use only; the free ransomware.live tier is non-commercial; WAM and MOFA restrict reproduction; UN sanctions-list, OCHA and Google News terms were not found. A working record, not legal advice.

### Where things are stored

| Where | What |
|---|---|
| Your browser | Saved briefs and reports, registers (exposure, disagreements, decisions, forecasts), watchlists, Monitor rules, scorecard edits, cost ledger, country and view preferences |
| Server memory (one process) | Hourly caps, caches, in-flight guards, consolidation runs |
| `public/data/*.json` | Datasets built by scripts (section 15) |

### Deployment note

The AI routes accept only same-origin JSON and have **no sign-in**. Caps and caches live in one server process; on several instances each has its own, so put a shared store in front. Do not expose them to an untrusted network without authentication.

---

## 12. Corrections to the older README

- It said the Case File had eight tabs and an Executive tab; it now has four views and the Executive tab is the **Minister** view.
- Its Statecraft Architect bullet said the Architect links to "the Executive tab"; it links to the Minister view, the Desk brief and the Strategy tab.
- It said "Arabic mode translates the UI and country names; region, language and capital names stay English"; region names are now translated (languages and capitals are still source data).
- It said "Leader, Minister, Desk officer and Analyst switch"; that switch was replaced by the four views.
- The Council and Architect bullets sat under the wrong headings; section 8 puts them in order.

---

## 13. Not built, and known limits

**No compliant source:** Telegram and X feeds, US carrier groups, submarine cables, ACLED and UCDP, WFP, UNICEF, UNHCR, UNDP, UNEP, IRENA, non-self-governing territories.

**Needs a key:** AIS vessels, webcams, market prices and fundamentals.

**Platform:** no multi-user accounts, approvals or entitlements; no `/v1/strategies` API; approvals, versions and decisions are records in your browser; consolidation runs live in server memory; no ingestion pipeline with licensing controls; no claim-level evidence database; the knowledge graph is a file; Monitor is a daily snapshot, not a stream.

**Data:** no ADX or DFM market data inside Deep Intelligence; no corporate-action-adjusted returns; no product-level trade; no FCSC or CBUAE ingestion; no UCDP conflict history; no technology dataset (the Architect reads technology from public sources only); investment stock for several countries is unknown and stays unknown.

**Products:** no global, regional or sector reports with no country for every product (only Falcon scopes cover them); no Leader one-page derivation separate from the Chair's brief; position-map issue stances come only from the council's reading of public statements; a 100-page report would need a multi-stage run costing more than the ceiling.

**Quality:** AI research is the weak point; check each product's research note and cited links. Thresholds, scorecard drafts and posture rules are proposals. The Falcon radar and Machiavellian profile evidence strings are English only.

---

## 14. Cost table (measured, US dollars, each capped at 1.00)

| Product | Measured cost |
|---|---|
| Stance read | about 0.02 |
| Ask | about 0.02 |
| AI world brief (dashboard) | about 0.01 |
| Country brief | about 0.03 to 0.05 |
| Minister prep pack | about 0.06 (economy mode about 0.02) |
| Leader's brief | about 0.11 |
| Counterpart profile | about 0.22 |
| Investment dossier | about 0.24 |
| Ministerial briefing, standard / comprehensive | about 0.32 / 0.47 |
| Desk brief, short / detailed / all-27-topics | about 0.19 / 0.40 / 0.30 to 0.38 |
| Foresight brief / report | about 0.21 / 0.47 |
| Scenario lab, standard / deep | about 0.36 / 0.52 |
| Red team | about 0.16 |
| Falcon world or scope brief | about 0.21 |
| Falcon Council | about 0.75 |
| Machiavellian: strategy dossier / enhancement / scenario / external influence / country brief / Strategy Council | 0.37 / 0.26 / 0.18 / 0.15 / 0.15 / 0.54 |
| Deep: research synthesis / analyst team | 0.15 to 0.20 / 0.51 |
| **Case File Strategic Council (20 seats)** | **0.78** |
| **Statecraft Architect** | **0.79** |
| **Council challenge** (two sittings, the Chair, two auditors; the estimate shown on the button is 0.7) | **0.53** (Jordan, 11 councils, with a directive, 30 October 2026; one run) |
| **THE KING: Council (10 specialists + Chair)** | **about US$0.55 measured** |
| **THE KING: directive, question or update** | **US$0.27 measured** |
| **Embassy council: intelligence sitting (21 desks + Chief of Staff + two auditors)** | **US$0.94 measured on Egypt (24 seats; the Chief of Staff and both auditors completed)** |
| **Embassy council: plan sitting** | **US$0.89 measured before the plan prompt was shortened, expected about 0.85** |
| **Embassy council: directive or question / update** | **0.27 / 0.20** |
| Stock research note (EMAAR) | 0.73 |
| Case File views and Reports, Full Consolidated Intelligence, all dashboards | 0.00 |
| **The Ministry's council (13 roles + Under-Secretary + two auditors)** | **US$0.80 measured on Egypt** (13 roles in four sittings: first US$0.14, the three parallel US$0.09 to 0.12, the Under-Secretary US$0.25, the two auditors US$0.05 each) |

The scorecard and decision form on THE KING, the UAE history panels, the Priority board, the decision log, the what-changed chip and the investment advantage cost nothing. A complete ministerial file for one country (Council plus Architect) costs about US$1.57 once; THE KING's Council and the two embassy sittings are separate products on their own pages; reports then assemble from whatever is on file for free. Writing them again in Arabic costs the same again.

---

## 15. Dataset inventory (`public/data/`)

| Dataset | Content | Refresh |
|---|---|---|
| `countries.json`, `regions.json`, `fips.json` | Country basics (World Bank, Wikidata), UN regions and subregions | One-off, monthly reference |
| `agreements.json`, `flights.json`, `investment.json`, `missions.json`, `visits.json`, `partnership.json`, `leverage.json`, `deals.json` | UAE relationship data (MOFA, MOFT, IMF, WAM) | Daily |
| `trade.json`, `outlook.json` | IMF trade by partner, IMF WEO | Daily |
| `trends.json` | 23 ten-year series: WGI (6), WDI (16), UN voting distance to the UAE | Daily |
| `finconditions.json` | World Bank financial conditions | Daily |
| `vintages/weo.json`, `vintages/capture.json` | Dated IMF snapshots; monthly counts of sanctions entries, flight destinations, deals, engagements, ransomware postings | Daily (series grow from October 2026) |
| `media-tone.json`, `temperature.json` | GDELT tone and bilateral temperature | Daily (own workflow) |
| `governance.json`, `leaders.json`, `uae-aid.json` | World Bank governance, leaders and elections, OCHA FTS | Monthly |
| `scorecard.json`, `rivals.json` | Country scorecard and rival trade shares | With the data refresh |
| `graph.json` | Falcon knowledge graph | On build |
| `monitor/history.json` | Falcon daily snapshots (90 days) | Daily from main |
| `markets.json`, `hs2.json` | ADX, DFM, QSE listings; HS chapter names | On build |
| `orgs.json` and `layers/` | Membership lists and map layers | Monthly reference |
| `sanctions.json`, `ransomware.json`, `un/` | Sanctions, ransomware postings, UN votes | By hand |

Each dataset keeps its own observation date; they are not one simultaneous measurement.


---

## 16. The Country Updates Hub (`/hub`) and the Strategy Lab (`/lab`)

*Added 30 October 2026. Design and study: `docs/hub-and-lab-design.md`. Both are free; two optional model calls (the hub summary and the scenario write-up) are click-started and capped at US$0.25 each.*

**The Country Updates Hub.** Click a country on the world map and open its **Updates hub** tab, or go to `/hub/<ISO3>` for the full board. It lists the country's current updates from every angle on one page: the seven news angles and the UAE-linked coverage, dated visits and engagements, UAE deal headlines, alerts that name the country (matched on the name in the title; the alert feed has no country field), macro movers and the agreements and flights on file. Filter by angle, by a 7, 30 or 90-day window, by outlet and by mark. The marks (risk, opportunity, neutral) are keyword rules on the headline, shown with the words found, and are not an assessment. The news feeds reach 7 days (14 for UAE-linked); annual and year-dated items sit in an "on file" group with no day date. A freshness strip shows which sources answered and how old the newest item is. Items that are new since your last visit are marked (the last visit time is kept per country in this browser). **Add to report** puts an item in the clip tray (`gd-clips:<ISO>`) where it can be reordered, annotated, removed, copied or exported.

**Where the clips go.** The Bird's eye report (a labelled *Field updates* block, also in its PDF), the President's brief (a labelled block), the Country Brief panel, the agents' context for the Country Brief and the President's brief, and the Desk agent's data text. They are labelled as chosen by the desk and not verified by the platform. *Summarise the hub* sends the visible items (at most 40) to the Desk agent's writer for a short summary that cites item numbers.

**The Strategy Lab (`/lab`).** A focal country and five tools. *Scenario sandbox*: six shocks (oil price, sanctions, leadership change, port or Red Sea closure, donor cut, currency fall), each a stated rule on a held input with a proposed coefficient; the base case against the shocked case through the Case File's own posture rule, with the rule shown; labelled illustrative. *Coalition and vote map*: UN agreement with the UAE, the US, China and Russia for about 190 countries, who votes with whom, winnable countries and friends the UAE could add with what each would need, on a world map and in a table. *Influence ledger*: instruments' footprint and headroom, the UAE against rivals, and the UAE's own series over time, with a table of what is not held over time. *Decision log*: decisions with owners, dates, status and follow-ups, pulled from the President's brief on request, with CSV, JSON and calendar (.ics) export. *Briefing pack*: choose and order products on file, field updates and kept Lab views; one illustrated PDF with a cover, contents, the playbook and a closing page of dates and gaps. Each Lab tool can keep a snapshot for the pack and save a PDF to the Archive.

**Limits.** No equity feed outside the UAE and Qatar; agreements and routes have no day dates; UN data is agreement shares, not resolution-level votes; rivals' series over time and instruments history are not held; scenario coefficients are proposed defaults awaiting approval.

---

*End of guide. For the audit that led to the Case File, see `docs/audit-case-file-benchmark.md`; for the statecraft, Case File and Architect design with acceptance tests, `docs/uae-statecraft-case-file-design.md`; for the original plan and the DiploMaps parity list, `docs/design-plan.md` and `docs/parity.md`.*
