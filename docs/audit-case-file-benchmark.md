# Geo Desk audit: Case File, 10-year trends and benchmark against intelligence products

Audit date 25 October 2026. Scope: ministerial and Leader briefs, desk-officer briefs, Falcon Eye, the intelligence layer (Intel, Machiavellian, Deep Intelligence) and the three agent councils. Method: code and dataset inspection, live country scores for five countries, and web checks of public descriptions of agency standards and commercial products. Nothing here is a claim about internal agency practice or about vendor data beyond what their own public pages state.

## 1 Headline findings

- 57 criteria across five groups: 14 met, 22 partly met, 21 missing.
- The platform is strongest on process (evidence ids, challenger and verifier roles, cost ceiling, rights register, acceptance tests) and weakest on consolidation, historical depth and a risk framework.
- Five to six country scores exist on different scales with no reconciliation (Egypt: partnership 78, scorecard 55, strategic tier T4, exposure 32, trade screen rank 28).
- Four separate fact packs feed the products; ids are positional, so the same number can carry different ids in different products.
- A 10-year country trend layer needs 60 metrics. 24 are held now, 26 can be built from open sources already checked or known, 7 can only be captured going forward, 3 have no compliant source found.
- Several agency and vendor norms are absent: a published estimative-language lexicon, a rating framework with short and long-term sub-indices, operational risk, climate and resource indices, and a shared assumptions register.

## 2 Criteria scorecard (57)

### A. Analytic tradecraft (US ICD 203, UK probability yardstick): 5 met, 7 partly, 1 missing

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| A01 | Quality and credibility of sources is described | Partly | Every fact has an id and a named source, and a rights register exists; no per-source reliability grade (ICD 203 standard 1). |
| A02 | Uncertainty is expressed and explained on key judgments | Partly | Confidence words appear in councils, Deep and the foresight products; not in one form across all products (standard 2). |
| A03 | A published estimative-language lexicon with probability ranges | Missing | Prompts say 'no invented probabilities' but there is no published word-to-range lexicon; the UK yardstick uses seven ranges and the US lexicon has its own. |
| A04 | Information is distinguished from assumptions and judgments | Partly | Reported/verified labels in prompts; Deep keeps 'argues', 'data show' and 'assesses' apart; the briefs do not use one marking. |
| A05 | Alternative explanations and competing hypotheses | Met | Independent challenger and red team in councils, scenario branches in the lab and Machiavelli (standard 4). |
| A06 | Dissent is preserved and visible | Met | Dissent panel in the Strategy Council, disagreement register in Deep. |
| A07 | Relevance to the customer (UAE interests, options, next steps) | Met | UAE mandate and 'UAE Play' in prompts; Deep options carry owner, window, validation step. |
| A08 | Key judgments and bottom line up front, consistently | Partly | BLUF in minister and desk briefs and Deep's Decision Summary; no common block across all products. |
| A09 | Change from the previous assessment is flagged | Partly | Profile change check and Country Brief do it; minister, desk and foresight briefs do not compare with their last run. |
| A10 | Accuracy checking by an independent role | Met | Verifier agents, claim audit tables, quality gates, scope guard. |
| A11 | Visuals that carry the argument | Partly | Visual views for minister, foresight, strategy and lab; none for the Deep consolidation, outcome trees or options. |
| A12 | Timeliness: as-of dates and data vintages on every product | Met | As-of, evidence cutoff and manifest dates; dataset build dates shown. |
| A13 | Past judgments are scored against outcomes | Partly | Forecast register and decision register exist but live in one browser and cover only Deep and the library registry. |

### B. Product structure against agency and vendor norms: 0 met, 5 partly, 7 missing

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| B01 | Reference profile covering the Factbook-style domains (geography, people, government, economy, energy, communications, transport, military, transnational issues) | Partly | Economy, trade, governance, agreements and missions covered; energy, communications, transport and military series are not held. |
| B02 | A rating framework with named sub-categories (EIU: sovereign, currency, banking, political, structure; Fitch BMI: six components) | Missing | Six lenses exist but they are separate scores on different scales, not a risk framework. |
| B03 | Short-term and long-term risk are separated | Missing | No short and long-term split of political or economic risk. |
| B04 | Operational risk (labour, trade and investment, logistics, crime and security) | Missing | Pieces exist (ports layer, sanctions, ransomware counts) but are not combined or trended. |
| B05 | Forecast horizons of 2, 5 and 10 years with stated uncertainty | Partly | IMF to 2031 for six series; baselines to 3 years with ranges; foresight 1 to 20 years qualitative. |
| B06 | Climate, environment and resource indices | Missing | No climate, water, food or energy-intensity series held (World Bank has them). |
| B07 | Human-rights and social-risk indices | Missing | None. |
| B08 | Sub-national detail for high-risk markets | Missing | None; country level only. |
| B09 | Update rhythm by product (daily, monthly, quarterly) stated | Partly | Daily data refresh, Country Brief cadence by tier; monitor history holds one day. |
| B10 | Early warning with lead-time and false-alarm measures | Partly | Monitor and triggers exist; no adjudicated alert set (I35 not connected). |
| B11 | Peer benchmarking in every brief (percentiles, regional medians) | Partly | Deep has four peer sets; briefs carry no peer comparison. |
| B12 | An assumptions register that underlies the briefs (Oxford Analytica publishes rolling assumptions) | Missing | Assumptions are inside each brief; no shared register. |

### C. Data breadth, depth and 10-year history: 4 met, 5 partly, 5 missing

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| C01 | Countries covered | Met | About 200 countries in the core datasets. |
| C02 | Macro series with 10 or more years | Met | IMF: 2015 to 2025 observed or estimated, to 2031 projected, six series. |
| C03 | Financial conditions with 10 or more years | Met | World Bank WDI 2012 to 2025, eight series (coverage varies by country). |
| C04 | UAE trade with the partner, 10 or more years | Met | IMF IMTS 2012 to 2025 by partner (some partners start later). |
| C05 | Direct investment positions, 10 or more years | Partly | At most 8 points per country, 2017 to 2024. |
| C06 | Institutional quality, 10 or more years | Missing | Governance holds the latest year only; the World Bank API returns 11 points (checked for Egypt). |
| C07 | Diplomatic alignment history | Partly | UN ideal points held 1990 to 2023 for 194 countries but used only as a snapshot, not as a UAE-distance trend. |
| C08 | Engagement history (visits, deals, agreements by year) | Partly | Visits and deals start November 2024; agreements carry no signing dates. |
| C09 | Conflict and security history | Missing | None held; UCDP offers a free token API (to verify), SIPRI military spending is in the World Bank series. |
| C10 | Society, development and resource series | Missing | Population, income, remittances, urbanisation, water, food, CO2 not held; World Bank series checked and available. |
| C11 | Media and perception history | Missing | 45 days of tone only. |
| C12 | Leadership change history | Partly | Current office-holders with start dates; no 10-year record of changes. |
| C13 | Connectivity history (flights, ports) | Missing | Current snapshot only. |
| C14 | Data lag and vintage shown per metric | Partly | Deep's indicator dictionary states lag; other tabs show build dates only. |

### D. Consolidation and usability: 0 met, 3 partly, 7 missing

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| D01 | One country identity carried across every page | Missing | Country is stored in four places. |
| D02 | Reconciled country position (lenses compared on one scale) | Missing | Five or six scores on different scales with no reconciliation. |
| D03 | One fact pack feeding every product | Missing | Four fact packs; ids positional and not stable across products. |
| D04 | Brief to detail to evidence ladder | Missing | Each product is a separate paid run; click-through from a number to its evidence exists only in Deep. |
| D05 | One council entry point | Missing | Three councils with similar roles and separate challengers. |
| D06 | Role-based entry (Leader, Minister, Desk officer, Analyst) | Missing | No role chooser; audience is a setting inside the minister product. |
| D07 | One export pack across layers | Partly | Per-product PDF and print; no combined pack. |
| D08 | Library holds every saved output | Partly | 14 kinds saved; Deep outputs and registers are not listed. |
| D09 | Shared persistence and handover between people | Missing | Everything is in one browser's local storage. |
| D10 | Arabic and English parity | Partly | Interface and AI outputs bilingual; rule-based evidence notes are partly English only. |

### E. Governance, cost and assurance: 5 met, 2 partly, 1 missing

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| E01 | Rights and licensing register | Met | Register with status and a confirm action per provider. |
| E02 | Scope guard for prohibited requests | Met | Browser and server guard, with tests. |
| E03 | Hard cost ceiling per paid run | Met | US$1 ceiling shared across agents; costs measured and shown. |
| E04 | Cache reuse and cache warming | Met | Shared cached prefix; first agent warms the cache. |
| E05 | Acceptance register tied to tests | Met | MS01 to MS31 and FE-AC01 to FE-AC20, with tests. |
| E06 | A locked benchmark task set with human review | Missing | None; the specification asks for 100 tasks. |
| E07 | Human review gate before anything counts as published | Partly | Deep requires a named reviewer on the server; other products carry a draft banner only. |
| E08 | Provenance manifest on every product | Partly | Deep consolidation has one; other products list sources only. |

## 3 Benchmark against agency standards and commercial products

What each public description says, and where Geo Desk stands. Commercial descriptions come from the vendors' own pages or library guides found on 25 October 2026 and were not independently verified; sources disagree on some counts, noted below.

| Benchmark | What it does (public description) | Geo Desk today | Adopt |
|---|---|---|---|
| US Intelligence Community, ICD 203 | Five analytic standards and nine tradecraft standards: sourcing quality, uncertainty, information versus assumption, alternatives, relevance to the customer, argumentation, change from prior judgments, accuracy, visuals. Confidence stated as high, moderate or low. | Strong on alternatives, relevance, verification; partial on sourcing, uncertainty, assumptions, change, visuals | Use the nine standards as the checklist every brief is gated against |
| National Intelligence Estimates | Key Judgments up front; commentary notes that Key Judgments are what most readers see, so they need the most care; dissents noted in text | BLUF in some products; dissent panel in the Strategy Council | A common Key Judgments block with confidence and dissent on every brief |
| UK probability yardstick (PHIA) | A standard set of terms mapped to seven numerical ranges, deliberately not continuous to avoid false precision | None | Publish a Geo Desk lexicon (proposal below) and enforce it in prompts and parsers |
| CIA World Factbook | Basic intelligence on history, people, government, economy, energy, geography, environment, communications, transportation, military, terrorism and transnational issues, for 266 entities | Economy, trade, governance, agreements; no energy, communications, transport or military series | A reference tab per country with the missing domains where open data exist |
| EIU Country Risk Service and Country Report | Ratings in sovereign, currency, banking, political and economic-structure categories; two-year and five-year forecasts (sources differ on which product carries which); 120 to 131 countries by source | Separate scores; baseline forecasts to 3 years | A category framework with short and long-term views and forecasts to 5 years |
| Fitch BMI Country Risk Index | 0 to 100 index averaging short and long-term political and economic components with a double-weighted operational component (labour, trade and investment, logistics, crime and security); a separate ESG index with 10-year forecasts for 140 markets | None | Same structure, published weights, sensitivity test, missing-data rule |
| Verisk Maplecroft | 198 countries; 150+ political, human-rights and environmental indices (counts differ by source); time series and trend indicators; annual updates at minimum, some quarterly | Ten-year series for macro, finance and trade only | Time series and trend arrows for every indicator shown |
| Oxford Analytica Daily Brief | Daily, by region, country and issue; 'what matters and why'; a rolling assumptions product underlies the analysis (section names not verified) | Country Brief on a cadence; no shared assumptions register | An assumptions register linked to every judgment |

What I could not verify: exact PHIA ranges, Oxford Analytica section names, current EIU and Fitch methodology weights, and UCDP's current token policy. Each is flagged where used.

## 4 Ten-year country trend spine

A trend panel for every country, built by scripts into one file per country, free to read. Each metric shows ten years of values, the change against five years ago, a z-score against its own history, and the same measure for the UAE, the regional median and the peer set, with a lag label and source. Projections are dashed and typed (observation, estimate, projection).

Status key: Held now, Buildable (open source checked or known), Capture forward (no history exists, start storing now), No source found.

| Domain | Metric | Status | Years | Source or route | Note |
|---|---|---|---|---|---|
| Macro | Real GDP growth | Held now | 2015-2031 | IMF WEO (held) |  |
| Macro | Inflation, consumer prices | Held now | 2015-2031 | IMF WEO (held) |  |
| Macro | Current account, % of GDP | Held now | 2015-2031 | IMF WEO (held) |  |
| Macro | Government gross debt, % of GDP | Held now | 2015-2031 | IMF WEO (held) |  |
| Macro | Nominal GDP, US$ | Held now | 2015-2031 | IMF WEO (held) |  |
| Macro | Unemployment rate | Held now | 2015-2031 | IMF WEO (held) | Missing for some countries |
| Macro | GDP per capita | Buildable | 2015-2025 | World Bank WDI NY.GDP.PCAP.CD | Checked: 11 points for Egypt, 10 for the UAE |
| Macro | Population | Buildable | 2015-2025 | World Bank WDI SP.POP.TOTL | Checked |
| Macro | Trade openness, % of GDP | Buildable | 2015-2025 | World Bank WDI NE.TRD.GNFS.ZS | Checked |
| Finance | Private credit, % of GDP | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Non-performing loans | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Bank capital to assets | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Exchange rate per US$ | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Reserves, months of imports | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Total reserves, US$ | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | Broad money, % of GDP | Held now | 2012-2025 | World Bank WDI (held) |  |
| Finance | FDI net inflows, US$ | Buildable | 2015-2025 | World Bank WDI BX.KLT.DINV.CD.WD | Checked |
| Finance | Remittances received, US$ | Buildable | 2015-2025 | World Bank WDI BX.TRF.PWKR.CD.DT | Checked; none for the UAE as a receiver |
| Trade with the UAE | UAE goods exports to the partner | Held now | 2012-2025 | IMF IMTS (held) | Customs basis, includes re-exports |
| Trade with the UAE | UAE goods imports from the partner | Held now | 2012-2025 | IMF IMTS (held) |  |
| Trade with the UAE | Total and balance | Held now | 2012-2025 | Derived from held series |  |
| Trade with the UAE | Partner share of UAE exports and imports, and rank | Held now | 2012-2025 | Derived from held series | Needs one pass over all partners |
| Trade with the UAE | Partner's contribution to UAE concentration (HHI) | Held now | 2012-2025 | Derived from held series |  |
| Trade with the UAE | UAE share of the partner's trade, and rival shares | Buildable | 2015-2025 | IMF direction of trade (to verify access) | Held for one year only today |
| Trade with the UAE | Trade before and after a CEPA | Held now | per agreement | Held (CEPA effect) |  |
| Investment | UAE outward position in the partner | Held now | 2017-2024 | IMF direct investment positions (held) | Eight points at most |
| Investment | Partner's inward position in the UAE | Held now | 2017-2024 | IMF direct investment positions (held) |  |
| Institutions | Rule of law | Buildable | 2015-2025 | World Bank WGI (same API as today's builder) | Checked: 11 points for Egypt |
| Institutions | Regulatory quality | Buildable | 2015-2025 | World Bank WGI |  |
| Institutions | Government effectiveness | Buildable | 2015-2025 | World Bank WGI |  |
| Institutions | Control of corruption | Buildable | 2015-2025 | World Bank WGI |  |
| Institutions | Political stability | Buildable | 2015-2025 | World Bank WGI |  |
| Institutions | Voice and accountability | Buildable | 2015-2025 | World Bank WGI |  |
| Diplomatic alignment | UN ideal-point distance to the UAE, by year | Buildable | 1990-2023 | Held UN ideal points (UAE series exists) | Three-year lag; a computation, no new source |
| Diplomatic alignment | UN voting agreement with the UAE | Held now | latest | Held |  |
| Diplomatic alignment | Visits and engagements per year | Capture forward | from Nov 2024 | WAM headlines (held feed) | Start storing yearly counts now |
| Diplomatic alignment | Announced UAE deals per year, by sector | Capture forward | from Nov 2024 | WAM headlines (held feed) |  |
| Diplomatic alignment | Agreements by signing year | No source found | none | MOFA and MOFT lists carry no dates | Needs a dated source |
| Diplomatic alignment | Bilateral event tone | Capture forward | 45 days held | GDELT (held, rolling) | Backfill from GDELT archives not verified |
| Security | Armed-conflict events and deaths | Buildable | 1989-2025 | UCDP API (free token; to verify) | Not held today |
| Security | Military spending, % of GDP | Buildable | 2015-2025 | World Bank WDI MS.MIL.XPND.GD.ZS | Checked; none for the UAE |
| Security | Sanctions-list entries naming the country | Capture forward | current | OFAC and UN lists (held) | Take monthly snapshots |
| Security | Ransomware postings naming organisations | Capture forward | 90 days held | ransomware.live (held, restricted for commercial use) |  |
| Security | Terrorism incidents | No source found | none | No compliant open source found |  |
| Society | Urban population share | Buildable | 2015-2025 | World Bank WDI SP.URB.TOTL.IN.ZS | Checked |
| Society | Internet users, % of population | Buildable | 2015-2024 | World Bank WDI IT.NET.USER.ZS | Checked |
| Society | Health spending, % of GDP | Buildable | 2015-2023 | World Bank WDI SH.XPD.CHEX.GD.ZS | Checked |
| Society | Inequality (Gini) | Buildable | sparse | World Bank WDI SI.POV.GINI | Checked: 4 points for Egypt; sparse |
| Resources | Oil and gas rents, % of GDP | Buildable | 2015-2021 | World Bank WDI NY.GDP.PETR.RT.ZS | Checked; ends 2021 |
| Resources | Water withdrawal, % of resources | Buildable | 2015-2022 | World Bank WDI ER.H2O.FWTL.ZS | Checked |
| Resources | Food imports, % of merchandise | Buildable | 2015-2025 | World Bank WDI TM.VAL.FOOD.ZS.UN | Checked |
| Resources | Food production index | Buildable | 2015-2024 | World Bank WDI AG.PRD.FOOD.XD | Checked |
| Resources | Renewable electricity share | Buildable | 2015-2021 | World Bank WDI EG.ELC.RNEW.ZS | Checked; ends 2021 |
| Resources | CO2 per capita | Buildable | 2015-2024 | World Bank WDI EN.GHG.CO2.PC.CE.AR5 | Checked |
| Leadership | Head of state and government tenure | Held now | current | Wikidata (held) |  |
| Leadership | Leadership changes in ten years | Buildable | 2015-2026 | Wikidata office-holder history (to verify) | Held only for the current office-holder |
| Leadership | Elections held and scheduled | Held now | upcoming | Wikipedia calendars (held) | No history held |
| Connectivity | UAE direct destinations active | Capture forward | current | Held flights dataset | Take monthly snapshots |
| Connectivity | Missions and offices | Capture forward | current | Held | Take yearly snapshots |
| Connectivity | Port and chokepoint dependence | No source found | none | Locations held, no throughput data |  |

Totals: 24 held, 26 buildable, 7 capture forward, 3 no source. After the build the Case File carries about 55 trended metrics per country instead of about 6 series, plus the point-in-time facts.

## 5 What to add to the plan

### 5.1 Country Intelligence Standard (every brief must carry)

1. The Answer (five lines) with confidence and next trigger
2. Key judgments, each with confidence (high, moderate, low) and a lexicon word with its range
3. Source grade for each source cited and an evidence index
4. Assumptions list, linked to the shared assumptions register
5. Alternatives considered and the strongest dissent
6. Ten-year trend panel for the metrics the judgments rely on
7. Peer and regional benchmark for the same metrics
8. Risk matrix (short and long-term) and exposure with confidence
9. Forecasts at 1, 3, 5 and 10 years where data support them, each typed
10. What changed since the last assessment
11. Triggers with thresholds and owner
12. Options with window, cost, downside and validation step
13. Visual: posture page and trend small multiples
14. Manifest: data builds, rights, reviewer, version

### 5.2 Proposed Geo Desk estimative lexicon (proposal, not the US or UK scale)

| Word | Range |
|---|---|
| Almost no chance | under 5% |
| Very unlikely | 5 to 20% |
| Unlikely | 20 to 40% |
| Roughly even | 40 to 60% |
| Likely | 60 to 80% |
| Very likely | 80 to 95% |
| Almost certain | over 95% |

Ranges are non-overlapping steps, as in the UK approach. Needs owner approval before use; prompts must use the words, and a parser rejects numeric probabilities that disagree with the word.

### 5.3 Country risk matrix (proposal)

Six categories, each with a short-term view (latest against the last three years and z-score) and a long-term view (ten-year slope plus IMF projection): political (governance trend, leadership changes, elections, UN alignment shift), economic (growth volatility, inflation, debt, current account), financial (NPL, credit, capital, reserves, FX), operational (openness, logistics, labour where data exist), security (conflict events, military spending, sanctions, cyber), resource and climate (water, food imports, rents). Published weights, a missing-data rule that lowers confidence rather than the score, and a sensitivity test. Operational and human-rights categories are flagged partial until their data exist.

### 5.4 Revised phases

| Phase | Scope | AI cost |
|---|---|---|
| 0 | Trend builders: WGI history (6 series), 16 further World Bank series, UN ideal-point distance, snapshot capture for engagement, sanctions, flights, tone | None |
| 1 | Case File shell, role chooser, sticky country, Position Card, Trend Spine panel, draft Answer, Library includes Deep, PDF for the consolidation | None |
| 2 | Risk matrix, lexicon and Standard checklist as quality gates, unified fact pack with stable ids, derive chain | Derivations only |
| 3 | One council entry point; assumptions register; change-since-last on every brief | Unchanged per run |
| 4 | Shared storage and handover; locked 100-task benchmark; UCDP and Wikidata history if verified | None |

Cost: the trend and risk layers are deterministic and free to read. Added data is roughly one to two megabytes; the World Bank builders take minutes in the daily workflow. The longer fact pack adds cached input tokens per run (a cent or two, an estimate).

### 5.5 Decisions needed

1. Approve the lexicon wording and ranges.
2. Approve the six risk categories and whether to publish a single composite or only the matrix.
3. Confirm which of the buildable sources to use (WGI history and the World Bank series are low-risk; UCDP needs a token; Wikidata history needs a check).
4. Confirm the order: data first (phase 0) or Case File shell first.

## 6 Sources

- [ICD 203 (DNI)](https://www.dni.gov/files/documents/ICD/ICD-203.pdf)
- [ODNI objectivity and tradecraft](https://www.odni.gov/index.php/how-we-work/objectivity)
- [UK: explaining uncertainty in intelligence assessment](https://www.gov.uk/government/publications/explaining-uncertainty-in-uk-intelligence-assessment)
- [Words of estimative probability](https://en.wikipedia.org/wiki/Words_of_estimative_probability)
- [CIA World Factbook guide (archived)](https://start.csail.mit.edu/mirror/cia.gov/library/publications/the-world-factbook/docs/profileguide.html)
- [EIU Country Risk Service brochure (via Quantec)](https://www.quantec.co.za/media/20e7ae1f/EIU-Country-Risk-Service-Brochure.pdf)
- [Fitch BMI ESG country brochure](https://your.fitch.group/rs/732-CKH-767/images/BMI%20ESG%20Country%20Brochure.pdf?version=1)
- [Verisk Maplecroft risk indices](https://www.maplecroft.com/risk-indices/)
- [Oxford Analytica Daily Brief features](https://dailybrief.oxan.com/Help/FeaturesNow)
- [UCDP API](https://ucdp.uu.se/apidocs/)

## 7 Consolidated country dashboard (specification)

One page per country, three views over the same data: Executive, Detailed, Readiness. A role switch (Leader, Minister, Desk officer, Analyst) sets the default view and density; it never changes the numbers. Mockup shown in the session with Egypt's real held series; unbuilt metrics are hatched.

### 7.1 Views and panels

| View | Audience | Panels |
|---|---|---|
| Executive (one screen) | Leader, Minister | The Answer (5 lines) · six-lens Position Card with divergence sentence · four headline trend tiles (10-year sparkline, 5-year change, regional median) · country risk matrix (six categories, short and long term) · triggers and the strongest dissent · four assurance tiles (trend coverage, evidence count, research coverage, freshness) |
| Detailed | Desk officer, Analyst | Ten-year trend spine (about 55 metrics, sparkline, latest, 5-year change, z-score, regional median, UAE and peer comparators, lag, source) · exposure register with known and unknown · institutions with rank and history · benchmark against peers · forecasts typed by kind with ranges · research cards and coverage gaps · council output and disagreement register · evidence drawer on every number |
| Readiness | Product owner, auditors | The 57-criteria audit by group · the 60-metric data readiness bar · the benchmark matrix against agency and vendor features · phase tracker · cost dashboard |

### 7.2 Rules
1. Every figure is typed: observation, estimate, projection, or capture-in-progress. Projections are dashed.
2. A metric that is not built is hatched and says why; unknown is never drawn as zero.
3. No single composite score. Lenses and matrix cells are shown separately, with a divergence sentence when they disagree.
4. Every tile opens the evidence drawer: fact id, source, vintage, lag, rights status, threshold and owner.
5. Comparators are fixed in advance (UAE, regional median, declared peer set), never chosen after seeing results.
6. Executive view loads with no model call; the Detailed view adds only deterministic data; paid products open from buttons.
7. Arabic and English parity, right-to-left layout, and print to the Briefing Pack with the same panels.

### 7.3 Data contract

One endpoint per country returns the dashboard object: answer, lenses, trend spine (metric, unit, series with kind per point, status, lag, source), risk matrix, exposure rows, triggers, forecasts, research coverage, council digests, manifest. Built from the shared fact pack and the trend files, cached by data manifest hash, so a changed dataset invalidates it.

### 7.4 Acceptance tests
- DB-01: the Executive view renders for every country in under one second with no model call.
- DB-02: every figure on screen opens an evidence drawer with source, vintage and lag.
- DB-03: a metric with no data is hatched with a reason, never zero or blank.
- DB-04: projections are visibly distinct from observations on every chart.
- DB-05: switching role changes density and default view, never a number.
- DB-06: the lens divergence sentence appears whenever two lenses differ by more than 40 percentile points.
- DB-07: the Readiness view counts match the audit tables.
- DB-08: Arabic view mirrors layout and carries every label and figure unchanged.
- DB-09: the printed pack contains the same panels as the screen and states what is missing.
- DB-10: a changed dataset build marks the dashboard stale until rebuilt.

### 7.5 Corrections noted
- In the mockup's benchmark matrix, EIU's forecast horizon is described by its sources as two and five years, so the "10-year trends and forecasts" row should read partial (◐) for EIU, not stated.
- The role switch in the mockup only relabels the view; in the product it sets density and the default view.
