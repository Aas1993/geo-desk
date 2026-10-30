# Country Updates Hub and the Strategy Lab: study and design

Written 30 October 2026, before the code. Reads `docs/state-of-the-art-reporting-spec.md` (the fourteen angles, the report standard C, enhancements F). Standing rules: legitimate sources only, no invented data, say what is not held, AI runs click-started and capped at US$1.00, nothing existing removed, nothing committed.

## 1. What the platform already holds (and where)

| Need | Held | Where / shape |
|---|---|---|
| News by angle | seven angles + UAE-linked + plain, 7 days (14 for UAE-linked), outlet, link, timestamp | `/api/news/[iso3]?topic=political\|security\|economy\|energy\|tech\|logistics\|society`, `&uae=1`; Google News RSS, 5-minute cache, headline filter per angle |
| Visits and engagements | 1,753 dated WAM headlines since 2024-11, country list, kind (visit, meeting, call, signing, message), level 1-3, direction | `public/data/visits.json`, `Visit` in `diplomacy-client.ts` |
| UAE deal headlines | forty most recent per country, date, parties, sector, link | `CaseData.deals`, `public/data/deals.json` |
| Alerts | merged feed (hazards, WHO, GDELT, wire headlines, WAM, ransomware count): global, not per country | `/api/alerts`, `src/lib/alerts.ts` |
| Macro and market movers | spine of ~45 metrics per country with latest, 5-year change, z-score, IMF projection | `CaseData.spine` (`SpineRow.spine.z`, `change5`) |
| Agreements, flights | counts by type, recent titles (no dates); flight destinations with status | `agreements.json`, `flights.json` (clients exist) |
| The free profile timeline | visits, deals, agreements, headlines merged | `buildProfile().timeline` in `src/lib/bird/profile.ts` |
| Posture rule, risk matrix, instruments | value, ability, risk, thresholds, six-category risk matrix, footprint and headroom per instrument | `case/core.ts`, `case/risk.ts`, `CaseData.posture/instruments` |
| UN voting | agreement of any country with any other (193 files), ideal-point distance series 1990-2023 | `public/data/un/agree/<ISO>.json`, `un/ideal.json`, `CaseData.un` |
| Blocs | 50 organisations, member lists | `public/data/orgs.json` |
| Friendship components | trade, engagement, agreements, connectivity, investment, alignment (0-100) | `partnership.json` |
| Rivals | rival trade shares in the partner, UAE rank | `rivals.json`, `CaseData.rivals` |
| Long view | trade, share, investment stocks, FDI, UN distance, remittances as series; monthly capture (visits12, deals12, ofac, dest) | `uaeHistory()` in `desk/history.ts`, `CaseData.capture` |
| Products on file | councils, briefs, President's brief, Bird report, directives | `gd-*` keys in localStorage, read by `readSourceByKey` / `readAllSources` |
| President's choices | decision index to option index | `gd-president-choice:<ISO>`, decisions parsed by `parsePresident` |

## 2. What is missing (shown as gaps, never filled)

- **Alerts per country**: the feed has no country field. The hub matches the country's name in the title and says so (a title mention, not a geocode); alerts with coordinates are not placed by country.
- **Market movers**: equities are held for the UAE and Qatar only, not for other countries. For other countries "market and macro movers" are the spine metrics that moved (z-score at or above 1.5, or a 5-year change flagged by the risk rules); the page says no equity feed is held.
- **Agreement and flight changes**: the files carry no dates for individual agreements and no history for routes, so a change cannot be dated. The hub shows the current counts and recent titles as "on file", and marks a change only where a clip of the same item was saved before (the "what changed" marker works for the items it can date).
- **Tone and signal**: no sentiment dataset per headline. The marks (opportunity, risk, neutral) are keyword rules, shown as marks with the matched words in the tooltip, labelled "keyword mark, not an assessment", and `neutral` is the default; nothing is scored.
- **Influence over time**: rivals' trade shares are held for one year only; instruments (footprint, headroom) are a present reading. The ledger draws the UAE's own series over time (trade, share, investment, UN distance, monthly visits and deals) and shows rival standing and instruments as the current reading, with the gap stated.
- **Vote-level UN data**: only agreement shares and the ideal-point series, no individual resolutions. "Winnable" is therefore a rule on agreement and relationship thinness, not a vote-by-vote count.
- **Scenario coefficients**: no calibrated model. Every shock is a rule: the held input, the formula and a proposed (not estimated) point shift, shown beside the result and labelled "illustrative rule output".
- **Technology and space registry**: not held (spec F7); proposed below.

## 3. Design

### Part 1: the Country Updates Hub

**Where.** A `hub` tab in the country panel opened from the map (compact), a full route `/hub/[iso3]` (the board), and `/hub` (a picker, remembering the last country). Nav: "Hub" in the top bar and the mobile bar. The panel tab links to the full board.

**Model** (`src/lib/hub/model.ts`, pure, tested). One `HubItem` for everything the page lists: `id`, `kind` (news, visit, deal, alert, macro, agreement, flight, timeline), `angle` (political, security, economy, energy, tech, logistics, society, uae, diplomacy, deals, alerts, macro, connectivity), `title`, `source`, `url`, `ts`, `tone` (opportunity, risk, neutral) with the `why` words. Builders per source; `filterItems` (angles, days 7/30/90, outlets, tone, text); `newSince(items, lastVisit)`; `dedupe` by normalised title. The news API returns at most 7 days, so 30 and 90 days are filled by visits, deals and the timeline, and the page says which sources reach that far.

**Board.** Header with the country and a freshness strip (per-source: loaded, failed, count, newest item age). Controls: angle chips with counts, a 7/30/90-day slider, an outlet filter (top outlets with counts), tone filter, search. Items grouped by day; each card: mark, angle tag, source, date, link, "Add to report" (clip). A "New since you last looked" marker per card and a banner counting them (last visit per country in `gd-hub-seen:<ISO>`, written when the page is left or the user clicks "mark as read"). A map-style mini panel: the country silhouette (from the held boundary file) with the capital, the counts by angle as a ring, and the UAE link. Side: the clip tray (reorder, annotate, remove, copy, export, "clear" with an in-page confirmation). "Summarise the hub": click-started, one writer call through `/api/agent/compose` with at most 40 visible items (title, source, date, angle), cited by item number, cost shown, capped.

**Clips** (`src/lib/clips.ts`). `gd-clips:<ISO>` = array of `{id, text, source, url, date, angle, kind, tone, note, at}`. Pure helpers (add with de-dupe, remove, move, annotate, text for agents capped at 4,000 characters, markdown, HTML) and thin storage wrappers that fire a `gd-clips` event so other open components refresh.

**Flow into the reports.**
- Bird's eye report: a "Field updates" block in the page (`FieldUpdates` component) and in the PDF (`birdHtml` option `fieldHtml`).
- Country Brief and President's brief: `Filed.clips` is read by `countryContext` and `presidentContext` (a labelled section "Field updates clipped by the desk, dated and sourced: analysis input, not verified facts") and shown as a labelled section above each panel.
- Desk agent: `profileTextFor` appends the clips as a fact block, so the router and the writer read them.

### Part 2: the Strategy Lab (`/lab`)

One page, a country picker (the focal country), five tools as tabs; nav entries "Lab" with the key `nav_lab`. Each tool takes the loaded `CaseData` and works for any country; each can **save a snapshot** (`gd-lab-snap:<tool>:<ISO>`: title, as-of, HTML fragment, markdown text) that the pack builder picks up, and **save a PDF to the Archive**.

**(a) Scenario sandbox** (`src/lib/lab/scenario.ts`). Six shocks with sliders (oil price -40% to +40%; a sanctions event 0-3; a leadership change 0-2; a port or Red Sea closure 0-3 months; a donor cut 0-100%; a currency fall 0-50%). Each shock lists: the held input it reads (oil and gas rents, sanctions exposure, leader tenure, corridor axis and trade openness, reserves cover, aid funding, debt and inflation), the rule (a formula with a stated coefficient, "proposed default"), and the resulting point shift to the three posture readings (value, ability, risk). The shifted readings go through the same posture rule as the Case File (`rule` exported from `case/core.ts`; the base case reproduces `CaseData.posture`, asserted by a test), giving the shocked posture, the instruments' intensity under it, the six risk categories stepped up where a rule says so, the stability test, and the playbook line that changes (course and the first instrument). Base case against shocked case side by side; "what would have to be true" (the threshold crossed). An optional agent write-up (click-started, cost shown, capped) sends the rule table to the writer.

**(b) Coalition and vote map** (`coalition.ts`). Loads the agreement files for the UAE, the US, China and Russia and the ideal-point series. Each of 193 countries gets: agreement with each of the four; "votes with" (the highest of the three powers, tied inside 2 points shown as "between"); a bloc from `orgs.json` (shared memberships with the UAE). **Winnable** = agreement with the UAE at or above the 70th percentile while the partnership index is below the median (aligned in votes, thin in ties) or agreement within 8 points of the closest power and a UAE agreement rising over the ideal-point series. **Friends the UAE could add** = the same list ranked by UN agreement, each with what it would need: its weakest partnership component (engagement, agreements, trade, investment, connectivity) and the rule that named it. Drawn as an SVG world map (the held boundary file) coloured by agreement with the UAE or by "votes with", with the focal country outlined, a hover card, and a ranked table; a focal-country card (its four agreements, rank among 193, blocs shared with the UAE, neighbours that vote with the UAE).

**(c) Influence ledger over time** (`ledger.ts`). For the focal country: (1) instruments, footprint and headroom bars with the stated intensity; (2) the UAE against rivals (rival trade shares, the UAE's rank); (3) time series from `uaeHistory` (trade, exports, imports, the country's share of UAE exports, investment stocks, FDI, UN distance) as small multiples with era averages, peak and trough marked; (4) the monthly capture series (visits and deals in 12 months, destinations, sanctions entries); (5) a "what is not held over time" table (rival series, instruments history, aid history) so a gap is visible.

**(d) Decision log** (`decisions.ts`). Entries `{id, title, source, options, chosen, owner, due, status, notes, followUps[], created, updated}` at `gd-decisions:<ISO>`; "pull from products on file" proposes candidates (the President's decisions with the choice recorded, the desk recommendations that have owners and dates) and adds only what the user accepts; fully editable inline; overdue and due-soon marks; export as CSV, JSON, a calendar (.ics) of due dates, and as a pack section.

**(e) Briefing-pack builder** (`pack.ts`). Lists what is on file for the country: the Playbook (rule-built, always available), each council and brief, the President's brief, the Bird report summary, the clips, and the saved Lab snapshots (scenario, coalition, ledger, decision log). Tick, order (up and down), choose language; one illustrated PDF through `downloadHtmlReport`: cover, contents with page-anchors, one section per item (the products converted with the same markdown path as the Archive PDFs, the snapshots as saved), the playbook rendered with the report kit, a sources and "what is not held" page; saved to the Archive.

### Cross-cutting
Bilingual (`t(en, ar)`, RTL safe, Arabic digits not forced), keyboard and screen-reader labels, in-page confirmations only (the app browser dismisses `window.confirm`), no AI call without a click, cost shown before and after.

## 4. Further features that would raise the platform (proposed; the cheap ones built here)

Built now (cheap, free, no model): the "what changed since you last looked" marker; the source freshness strip in the hub; the clip tray export (markdown, JSON, copy); a calendar (.ics) export of decision due dates; scenario, coalition and ledger snapshots feeding the pack.

Proposed, not built: (1) a standing "what changed" diff in every product with scheduled re-runs; (2) the technology and space registry from public announcements (spec F7); (3) a data-freshness dashboard across all datasets (spec F8); (4) peer benchmarks against other middle powers in the same country (F9); (5) a bilateral calendar merging visits, summits, elections and treaty dates; (6) alert-to-country geocoding using the event coordinates and the boundary file; (7) offline reading of saved products (service worker); (8) a vote-level UN dataset (resolutions) to replace the agreement-share rule for "winnable"; (9) dated agreement and route histories so the hub can mark agreement and flight changes; (10) a calibrated scenario model once the owner approves coefficients.

## 5. Checks
Pure logic in `src/lib/hub.test.ts`, `clips.test.ts`, `lab.test.ts` (in `npm test`); `npx tsc --noEmit`, `npx eslint src`, a production build in a scratch copy, README and PLATFORM-GUIDE sections, a visual check in the browser preview.
