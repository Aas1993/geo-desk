# UAE statecraft layer for the Case File: design

Design only, 25 October 2026. Extends docs/audit-case-file-benchmark.md. Egypt is the worked example; its figures are real where held (scorecard, partnership index, leverage, strategic profile, UN agreement, rivals, neighbours), and everything marked illustrative is wording, not output. Nothing is built.

## 1 What the minister needs, and how it is organised

The Case File answers six questions in this order: What is this country worth to the UAE? Where does it stand on UAE foreign policy? What instruments does the UAE have there (hard, soft, economic, institutional) and how much room is left? Who else is in the room, including neighbours and rival powers? What should the UAE do, in what order? What would change the answer?

### 1.1 Value to the UAE: a profile, not one score

Eight pillars, each shown separately (0 to 5 for the module scores, 0 to 100 for scorecard parts) with its evidence and confidence. Two readings are built on top, both with published rules:

- **Net benefit view**: value (pillars 1, 2, 4, 6) against risk (durability, financial and security conditions, sanctions, cyber) and against the UAE's ability to act (leverage, instrument headroom, legitimacy). It places the country in one of four postures: Deepen, Selective and staged, Hedge, Hold and watch.
- **Divergence sentence**: when two pillars differ by more than 40 percentile points, one sentence says why (for example, strong politics but thin commerce).

Egypt today (held data): politics 80, commerce 62, strategic 46, leverage 44 on the scorecard; partnership index 78 (#23); leverage mutual (theirs 72, the UAE's 84); strategic profile hard 1.0, soft 2.9, economic 2.2, durability 3.4, regional 4.5, corridor 5.0; UN agreement with the UAE 0.91; the UAE is 3.7% of Egypt's trade, ninth, behind China 14%, Saudi Arabia 12.1% and the United States 8.3%. Reading: high political and corridor value, medium commercial value, able to act, financially fragile counterpart: a selective and staged posture.

### 1.2 Metric set: 66 strategy data points (in addition to the 60 trend metrics)

**1 Political and diplomatic alignment** (8)

| Metric | Status | Source or route |
|---|---|---|
| UN voting agreement with the UAE | Held now | Held, latest only |
| UN ideal-point distance to the UAE, by year | Buildable | Held series 1990-2023; computation |
| Bilateral event tone and cooperation share | Held now | GDELT, 45 days held |
| Visits and leader meetings per year | Capture forward | Starts Nov 2024 |
| Joint statements and communiqués per year | Capture forward | Capture from official feeds |
| Support for UAE candidacies and positions in multilateral bodies | Read by a seat, no dataset | Read by the Counterpart seat; no dataset |
| Stated position on each priority issue (stance, date, source) | Read by a seat, no dataset | Position map by the Counterpart seat |
| Agreements in force by domain | Held now | MOFA and MOFT lists (no dates) |

**2 Economic and commercial benefit** (14)

| Metric | Status | Source or route |
|---|---|---|
| UAE goods exports and imports, 10 years | Held now | IMF IMTS |
| Partner share of UAE trade and rank | Held now | Derived |
| UAE share of the partner's trade and rank among rivals | Held now | Rivals dataset, one year; history buildable |
| CEPA effect before and after | Held now | Held |
| Market size: GDP and population | Held now | IMF held; population buildable |
| Growth and inflation outlook to 2031 | Held now | IMF |
| Regulatory quality and governance, 10 years | Buildable | World Bank WGI |
| Exchange-rate regime and level | Held now | World Bank WDI |
| Sovereign debt level and path | Held now | IMF |
| IMF programme status | Buildable | IMF lending data; access to verify |
| Remittances and FDI inflows | Buildable | World Bank WDI |
| Sector openings and foreign-ownership limits | Read by a seat, no dataset | Legal seat reads; no dataset |
| Credit ratings | Read by a seat, no dataset | Licensed agencies; not connected |
| Energy trade and dependence | Read by a seat, no dataset | Product-level trade not connected |

**3 Capital and sovereign investment** (8)

| Metric | Status | Source or route |
|---|---|---|
| UAE investment stock in the partner | Held now | IMF positions, 8 points |
| Partner investment in the UAE | Held now | IMF positions |
| Announced deals by sector | Capture forward | WAM headlines since Nov 2024 |
| Investment and double-taxation treaties in force | Held now | MOFA and MOFT lists |
| Named sovereign-fund activity | Capture forward | WAM headlines |
| Arbitration and expropriation record | Buildable | Public case lists; access to verify |
| Exit and repatriation conditions | Read by a seat, no dataset | Legal seat reads |
| Project delivery against announcement | Read by a seat, no dataset | Needs a tracked project register |

**4 Geography, corridors and neighbours** (8)

| Metric | Status | Source or route |
|---|---|---|
| Corridor-criticality axis | Held now | Strategic profile |
| Ports, straits, pipelines, bases nearby | Held now | Held map layers |
| Direct flights and connectivity | Capture forward | Current snapshot; history capture |
| Distance from UAE hubs | Held now | Derived from coordinates |
| Land and maritime neighbours with their UAE scores | Held now | Held: partnership, tier, leverage |
| Chokepoint dependence | Buildable | Needs product and route data |
| Shared resources (water, gas fields) | Buildable | World Bank water; boundaries read by council |
| Regional blocs and memberships | Held now | Held orgs |

**5 Security and hard power** (8)

| Metric | Status | Source or route |
|---|---|---|
| Defence and security agreements | Held now | Held agreement types |
| Joint exercises and defence trade | Read by a seat, no dataset | No compliant open dataset verified |
| Military spending | Buildable | World Bank WDI |
| Conflict events and deaths | Buildable | UCDP token; to verify |
| Foreign bases and presence nearby | Held now | Held bases layer |
| Sanctions-list exposure | Held now | OFAC and UN |
| Cyber exposure | Held now | Ransomware counts, 90 days |
| Counterpart security durability | Held now | Scorecard security dimension |

**6 Soft power and influence** (8)

| Metric | Status | Source or route |
|---|---|---|
| UAE humanitarian and development funding | Held now | UAE aid 2019-2026 |
| Media tone toward the UAE | Held now | GDELT, 45 days |
| Education, scholarships, exchanges | Read by a seat, no dataset | No dataset |
| Cultural and heritage ties | Held now | Heritage layer, shared languages |
| Think-tank and research presence | Held now | Think-tank layer, research cards |
| UN and organisation influence of the partner | Held now | Scorecard dimension |
| Diaspora and residents in the UAE | Read by a seat, no dataset | UAE-side data not held |
| Public perception surveys | Read by a seat, no dataset | None connected |

**7 Decision-makers and durability** (6)

| Metric | Status | Source or route |
|---|---|---|
| Head of state and government, tenure, age | Held now | Wikidata |
| Elections scheduled | Held now | Wikipedia calendars |
| Leadership changes in ten years | Buildable | Wikidata history; to verify |
| Regime type and institutional constraints | Read by a seat, no dataset | Political seat reads; V-Dem access not verified |
| Succession and health risk | Read by a seat, no dataset | Read by the Political seat from dated sources |
| Key ministers and agencies on the UAE file | Read by a seat, no dataset | Counterpart seat reads from public lists |

**8 Competition and third parties** (6)

| Metric | Status | Source or route |
|---|---|---|
| Rival trade shares | Held now | Held, one year; history buildable |
| Rival investment stocks | Read by a seat, no dataset | Not connected |
| Rival defence and diplomatic presence | Read by a seat, no dataset | Missions dataset covers UAE only |
| Rival agreements and summits with the partner | Read by a seat, no dataset | Read by council |
| UAE rank among the partner's trading partners | Held now | Held |
| Where the UAE gains or loses against a rival, by year | Buildable | Needs rivals history |

Totals: 33 held, 11 buildable, 5 capture forward, 17 read by a seat with no dataset. Together with the 60 trend metrics the Case File consolidates about 120 distinct data points per country (some overlap).

## 2 Position toward UAE foreign policy

Three layers. Measured: UN agreement and ideal-point distance, event tone, engagement cadence, agreements in force. Third-party comparison with the same method (Egypt is nearer the UAE, 0.91, than China, 0.78, or Russia, 0.68; the United States is far, 0.33). Stated: a position map written by the Counterpart seat from dated public statements only, one row per priority issue (Iran and Gulf security, Sudan and the Horn, Libya, Gaza and Israel ties, Nile and Ethiopia, energy and OPEC, financing and debt), each with stance (aligned, hedging, divergent, opposed, not stated), date, source and confidence. The seat never infers private intentions.

Also tracked: the asks each side has made of the other and what has been delivered against them.

## 3 Neighbours and third parties

Ring 1 is the land and maritime neighbours; ring 2 the strategic neighbours (Gulf, Levant, Horn, Turkey). Each shows the UAE partnership index, tier and leverage reading from held data (Egypt: Saudi Arabia 95, Turkey 89, Jordan 88, Ethiopia 62, Sudan 61, Qatar 59, Israel 54, Libya 42, Djibouti 39, Eritrea 26, Palestine 20). A Regional systems seat describes coalitions, rivalries and where the UAE's moves in the country change its position elsewhere. Rival powers are shown by trade share, bases, agreements and presence where data exist. Plays are limited to legitimate, disclosed, consent-based instruments; the scope guard still refuses takeover, infiltration, proxy support, identity targeting and coercion.

## 4 Instruments: hard, soft, economic, institutional

The existing instrument menu (diplomacy, trade, education, culture, development, multilateral institutions, technology, finance, defensive security cooperation, exercises) is shown as a matrix: current UAE footprint in the country, headroom, risk, legitimacy check, and recommended intensity per horizon. Hard power stays at policy level only: no operational or targeting content.

## 5 The council with many hats

Run as one orchestrated product, not three. The 19 existing seats are kept (including the Realist seat in the balance-of-power and linkage tradition, the Machiavellian seat as a critical lens, the Counterpart seat, Geopolitical, Statecraft, Economic, Investment, Finance, Logistics, Military at policy level, Social, Political, Influence, Historian, Scenario, Challenger, Verifier, Country Brief). Six hats are proposed:

- Geoeconomics: Dependency, leverage, sanctions and finance as economic tools
- Negotiation: Interests, alternatives, red lines, sequencing, concessions
- Regional systems: Neighbours, coalitions, spillovers between countries
- Technology, climate and resources: Energy, water, food, data, standards (a gap in the 19)
- Legal and compliance: Treaties, investment protection, sanctions law
- Narrative and public diplomacy: Media, education, culture, perception

Guardrails: a hat is an analytical tradition, never an impersonation, and never produces an invented quotation attributed to a real person. Each hat names what it could not establish. Run order: free deterministic dossier, one cache-warming specialist run, remaining specialist groups in parallel, challenger and verifier, then the Chair. All under one US$1 ceiling. Estimate for about 25 seats: US$0.65 to 0.85 (19 seats measured at US$0.54 on Egypt).

## 6 Strategy formulation (the Chair's output)

1. Mandate and ends: the UAE objective for this country, from approved objectives or the default UAE mandate
2. Assessment: value profile, position map, power balance, neighbours, rivals, risks
3. Posture options: Deepen, Selective and staged, Hedge, Hold and watch, each scored on published criteria (benefit 25, risk 20, feasibility 15, legitimacy and legal 15, reversibility 10, cost 10, neighbour effect 5; proposed weights, with a sensitivity table)
4. Preferred posture, why, what would change it, strongest dissent
5. Instrument mix by horizon with intensity, owners, gates, resources (or not estimated), KPIs and exit
6. Horizons: 0 to 18 months, 18 months to 5 years, 5 to 10 years
7. Neighbour and third-party plays
8. Negotiation plan: asks, gives, alternatives, red lines
9. Risk register with tripwires and owners
10. Decision calendar and review dates
11. Human approval, versioning, and a change log against the previous strategy

## 7 Desk-officer detailed brief (24 sections)

The master document, researched once. Length options up to the existing exhaustive 10,000 words plus tables and annexes; the Minister brief and Leader page derive from it.

| # | Section | Produced by | Contents |
|---|---|---|---|
| 1 | Header, BLUF and the Answer | Council + data | Five lines, confidence, next trigger |
| 2 | Position Card and divergence | Deterministic | Six lenses, percentiles, divergence sentence |
| 3 | Dashboard export | Deterministic | Executive and detailed panels as tables and charts |
| 4 | Relationship history and current state | Deterministic + AI | Agreements by domain, visits, deals, milestones; dated |
| 5 | Counterpart: decision map | AI from Wikidata and sources | Who decides, institutions, tenure, succession |
| 6 | Position toward UAE foreign policy | Counterpart seat | Issue-by-issue stance, date, source, confidence |
| 7 | Economic deep-dive with 10-year trends | Deterministic + AI | Macro, finance, trade, partners, outlook, baselines |
| 8 | Capital and investment pipeline | Deterministic + AI | Stock, deals by sector, protection treaties, delivery gaps |
| 9 | Corridors, geography and logistics | Deterministic + AI | Ports, straits, flights, chokepoints |
| 10 | Hard power and security | AI, policy level only | Defence agreements, exercises, conflicts, durability |
| 11 | Soft power and influence | Deterministic + AI | Aid, media, education, culture, institutions |
| 12 | Neighbours and regional system | Regional seat | Ring 1 and ring 2 actors, coalitions, scores |
| 13 | Third-party and rival map | Deterministic + AI | Trade shares, presence, where the UAE leads or trails |
| 14 | Risk register and tripwires | Deterministic + council | Likelihood word, impact, trigger, owner |
| 15 | Scenarios: baseline, favourable, adverse, shock | Scenario seat | Assumptions labelled, no invented probabilities |
| 16 | Strategic options and scoring | Deterministic + council | Four postures scored on published criteria with sensitivity |
| 17 | Preferred strategy and dissent | Chair + challenger | Why, what would change it, strongest objection |
| 18 | Action plan by horizon | Chair | Owners, gates, resources (or not estimated), KPIs, exit |
| 19 | Negotiation plan | Negotiation seat | Interests, asks, gives, alternatives, red lines |
| 20 | Neighbour and third-party plays | Regional + Geopolitical | Legitimate, disclosed, consent-based only |
| 21 | Information gaps and collection requirements | Deterministic | Information-value queue for this country |
| 22 | Assumptions register and estimative lexicon | Deterministic + council | Every assumption with owner and test |
| 23 | Evidence index and manifest | Deterministic | Fact ids, sources, vintages, rights, reviewer |
| 24 | Annexes | Deterministic | Ten-year trend tables, exposure table, governance history, glossary, Arabic version |

## 8 Consolidated dashboard additions

Executive view gains: value profile, net benefit posture, position-toward-UAE tile, power balance bars, neighbour strip and rival share. Detailed view gains: position map, instrument matrix, neighbour table, rival table, decision map, strategy canvas, council digests by hat. Readiness view gains: strategy-metric coverage (66 points).

## 9 Acceptance tests (ST-01 to ST-10)

- ST-01: Every country shows the value profile with evidence and confidence on each pillar
- ST-02: Posture placement follows the published rule and shows its sensitivity
- ST-03: The position map has a stance, date and source on every row, or says not stated
- ST-04: Neighbour and rival tables use held data and label every gap
- ST-05: No plan names an instrument outside the legitimate, disclosed, consent-based set
- ST-06: Every hat reports what it could not establish; the challenger always dissents or says why not
- ST-07: No hat produces a quotation attributed to a real person
- ST-08: The strategy cites the hats that drove each recommendation
- ST-09: The desk brief carries all 24 sections or lists what is missing and why
- ST-10: One run stays under the US$1 ceiling and is served from cache on repeat

## 10 Phasing and cost

Fits after the data phase: (0) trend and strategy data builders, free; (1) Case File shell with the value profile, position tiles, power and neighbour panels, free; (2) unified fact pack, posture scoring, strategy canvas template; (3) six new hats and the orchestrated run; (4) desk brief sections 1 to 24 and derived Minister and Leader briefs. The deterministic parts cost nothing to read; the council and the written briefs are click-started and capped.


## 11 Statecraft Architect (built 25 October 2026)

The master prompt "UAE Statecraft and National Influence Architect" (Parts I to XIII: twelve national interests, country baseline A to F, six pillars, gap analysis, short 0 to 24 months, medium years 3 to 5, long years 5 to 15 and beyond, Options A, B and C, adversarial stress test, four scenarios, implementation and governance, measurement, six deliverables) is implemented as the Architect tab of the Case File. It sits on top of this design rather than replacing it:

| Design element above | Where it lives now |
|---|---|
| Value profile | UAE value and position tab; Executive tab |
| Position toward UAE policy | UAE value and position tab; desk brief section 6 |
| 66 strategy metrics | Readiness tab |
| Six new council hats | C13 geoeconomics, C6 negotiation, C19 and C4 regional systems, C12 technology, climate and resources, C14 law, C18 narrative, all in the 20-seat council |
| Strategy formulation | Strategy tab (scorecard, canvas, three horizons) and the Architect's Parts V to VII |
| 24-section desk brief | Desk brief tab; the Architect's parts are woven into sections 8, 10 to 12, 14 to 18, 22 and 24, each labelled |

Pipeline and cost: five analysts and an editor, worst case about US$0.92 of the US$1.00 ceiling (the first analyst alone to warm the shared cache; implementation and the editor start only if they still fit). Measured on Egypt: US$0.79.

Boundary: hard power is policy-level, lawful, defensive and consent-based; other actors' proxy use is analysed, never designed for the UAE; the scope guard refuses requests for covert action, proxy support, infiltration, takeover or coercion. Tradecraft is benchmarked to the published ICD 203 standards as a method, not as a claim about any agency, and there is no signals or classified access.

Official versus proposed: the Principles of the 50 and the Ministry of Foreign Affairs strategy 2023 to 2026 are cited as official. A Ministry strategy for 2027 to 2029 could not be confirmed in public sources on 25 October 2026 and is not cited as adopted.

Acceptance tests: AR-01 the six agents' worst cases sum under US$1; AR-02 the system prompt carries the boundary, the tradecraft rules and the unconfirmed-strategy note; AR-03 the dashboard parser drops invalid initiatives and never invents funding; AR-04 a missing editor is shown in the output; AR-05 tradecraft checks are deterministic; AR-06 the review engine fires on posture change, 10-point moves, new alerts or builds, 90 days and a dated gate; AR-07 the desk brief stays 24 sections and the Architect fills sections the council has not; AR-08 the scope guard still refuses proxy and covert-operation requests. All are in `src/lib/architect.test.ts`.

## 12 One-stop views and reports (built 25 October 2026)

The Case File is the single place a President or Minister reads a country. It has four views over one set of facts: President (one page), Minister (the reasons), Detailed (the evidence) and Reports (assembled documents). The audit in this section found:

- Four councils overlap (Falcon 10 agents, Machiavellian 19 seats, Deep analyst team, Case 20 seats). None was removed. The Case File council is the one the ministerial file is built from; the others stay for narrower questions, say whether the Case council exists for the same country, and their saved results join the Full dossier as annexes.
- The old Executive tab showed the key numbers twice, the risks in two lists and the indicators in two lists. The Minister view shows each fact once.
- The Falcon Library did not list the Case File's two products. It now does.
- Arabic: logical spacing classes were already used everywhere (no physical left or right classes), 406 of 407 bilingual text pairs had Arabic, and the layout holds at 375px. The real gaps were English evidence strings, English region, metric and source names, the desk brief, mixed Arabic and number sentences forced left to right by `.num`, and some visible English in the map, legend, stock and error screens. These are fixed where listed in the README; the Readiness audit, prompt libraries and platform documentation pages stay in English, and the Falcon radar and Machiavellian profile evidence strings are generated in English.

Cost: the views and reports are free; they read what is saved. The two paid products are click-started under the US$1.00 ceiling and are shown with their measured cost. A report with gaps shows the total to fill them.

Acceptance tests: RP-01 every template block exists; RP-02 a data-only President report marks the strategy parts missing with the Architect's cost, not the Council's; RP-03 with both products on file nothing is missing; RP-04 Arabic reports have Arabic headings, names and metric names and mark a block written in English; RP-05 the Arabic desk brief has 24 Arabic titles and Arabic table headers; RP-06 decisions come from the Architect, then the Council, then the data; RP-07 every region, subregion, metric and domain the data carries has an Arabic name; RP-08 other saved products appear once, as annexes. All are in `src/lib/case-report.test.ts`.
