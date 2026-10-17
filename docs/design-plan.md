# Geo Desk — Design Plan (a DiploMaps-style diplomatic world map)

Working name: **Geo Desk** (placeholder; pick your own name, logo and palette. Do not reuse DiploMaps' name, branding or text).

Reference studied: diplomaps.ae, observed 17 Oct 2026 in a live browser session. Everything in section 1 is what I saw there. Everything after is my proposal.

---

## 1. What the reference does

**One idea:** a dark, full-screen interactive globe/map. Click any country and a dossier slides in over the left side. Everything else (feeds, search, clock, alerts) is overlaid on the map.

**Screen anatomy (desktop, 800x600 observed):**
| Area | Content |
|---|---|
| Top-left | Hamburger (opens Layers drawer), then a wide search box. Placeholder rotates between "Search a country, organization, strait…" and natural-language examples ("Ask: how much does the UAE trade with Lebanon"). Mic icon for voice. |
| Top-right | Alerts bell with red count badge (74). Large monospace clock `22:13:05`, date line, green "Live · 18 s ago" dot, UTC time. |
| Right rail (vertical icon buttons) | Language toggle (ع), light/dark, grid (view/preset), table/compare, layers, text size (Aa), locate-me, zoom +/−. |
| Bottom | Scrolling "WORLD HEADLINES" ticker (outlet name in small caps + headline), dismissable (×). |
| Left drawer (hamburger) | Layer groups, collapsible. "195 states · Boundaries & sources" footer link. |
| Country panel (left card) | Flag, name, native-name, formal name, ☆ follow, ⇄ compare, ✕ close. Scrollable tab bar below. |
| Mobile bottom nav | Map · Layers · Brief · Ask · Share |
| First visit | Modal "Which country do you handle?" (your desk opens on it) or "Explore the map instead", then a 3-step coach-mark tour ("Tap any country on the map"). |

**Layer groups (drawer):**
- **Live feeds** (with a time window: All / 1h / 6h / 24h / 2d / 7d): Flight radar, Live vessels (AIS), Telegram on the map, Global events, Natural hazards, Epidemic watch, Weather, Satellite imagery, Public cameras, Active fires, Satellites, Space launches, Headline ticker.
- **Diplomacy & media:** UAE missions, Official visits, Think tanks, News outlets, News channels.
- Then collapsed groups: Security & risk, Economy, Infrastructure, Memberships, UN, Organisations, Reference, Regions, Seas & waters, Culture & heritage.

**Country dossier tabs:** Overview · Briefs · Economy · Trade · Military · Visits · UN · Society · News.
- **Overview:** capital + local time + weather + AQI; population/area/currency tiles; Leadership (photo, name, role; head of state, government, foreign minister, speaker); State & institutions (next election, UN status, regional group, languages, currency); Borders (flag chips); Memberships (GCC, Arab League, OPEC+); related seas and straits as chips; "Show sites on the map".
- **Briefs:** "48-hour one-pager" (print/save as PDF); an event-pressure score with counts (violent / protests / coercion); an AI-written brief with sections (Political, Military, Security, Intel, Conflict, Outlook), a "Generated 0 min ago · newest source 33 min ago" stamp, a bottom-line sentence, and numbered inline citations.
- **Economy:** GDP, rank, growth, per-capita, FX rate; latest inflation with sparkline; monthly goods trade; IMF outlook bars (projections drawn lighter and marked *); debt, budget balance, current account.
- **Trade:** exports, imports, balance; top exported/imported products with icon, value and % share; trade as % of GDP.
- **Military:** spending, rank, % GDP; personnel; land/air/naval counts with world rank; arms trade (SIPRI).
- **Visits:** 12-month official-visit counts (in/out, by role); dated list with direction arrow, flag, role and source links.
- **UN:** voting positions by issue, with a "compare with" country selector.
- **Society:** aid, science.
- **News:** latest video footage with outlet and age.

**Notable product choices:** deep-linkable hash URL (`#zoom/lat/lng/projection?sel=OMN`); every number carries year, rank and source; AI text carries citations and freshness; bilingual EN/AR with RTL; "your desk" personalisation for diplomats.

---

## 2. Product definition for ours

**Audience:** diplomats, analysts, journalists and students who need a fast, trustworthy country picture.

**Scope decision (important):** the reference is a huge product with ~30 live data feeds. We build it in **phases**; phase 1 is a convincing, fast, honest core. We never fake data: every tile shows a source and date, and an unavailable feed shows an honest empty state (same principle as The Wire in this repo).

**Differentiators we can pick (choose 1–2):** a "meeting pack" generator (one-pager PDF per country pair), bilateral compare view, a watchlist with alerts, Arabic-first UI.

---

## 3. Visual design system

**Mood:** command-centre, calm, high-density, dark by default. No gradients-for-decoration; colour only carries meaning.

**Tokens (CSS variables; light theme mirrors them)**
| Token | Dark | Use |
|---|---|---|
| `--bg-0` | `#070B14` | map background / ocean |
| `--bg-1` | `#0E1424` | panels, cards |
| `--bg-2` | `#161E33` | raised tiles, inputs |
| `--line` | `#243049` | 1px borders |
| `--text-0` | `#E8EDF7` | primary text |
| `--text-1` | `#9AA7C0` | secondary |
| `--text-2` | `#66728C` | tertiary / labels |
| `--accent` | `#5B9BFF` | selection, links, country outline |
| `--ok` / `--warn` / `--risk` | `#3DD68C` / `#F5B84B` / `#F2605C` | status, pressure score, live dot |
Category colours for layers (flights blue, vessels green, events red, hazards amber, weather cyan, etc.) from one 10-colour palette checked for colour-blind separation.

**Type:** Inter (UI) + JetBrains Mono (clock, numbers in tiles; tabular figures). Arabic: IBM Plex Sans Arabic. Scale 11/12/13/15/18/24/40 px. Labels in 11px uppercase with 0.06em tracking. Text-size control (Aa) scales root font-size 90/100/115/130%.

**Shape and space:** 4px grid; panel radius 14px, tile radius 10px, chips fully rounded; panels get a 1px `--line` border and a soft 0 8px 32px rgba(0,0,0,.45) shadow, translucent `--bg-1` at 92% with 12px backdrop blur. Icons: Lucide, 18px, 1.75 stroke. Flags: emoji fallback + SVG flag set (flag-icons).

**Motion:** 200ms ease-out for panels (slide 16px + fade); map fly-to 1.2s; number tiles count up once; everything respects `prefers-reduced-motion`.

**RTL:** logical CSS properties only (`margin-inline-start`, etc.); panel mirrors to the right; map controls mirror; numbers stay LTR.

---

## 4. Layout and responsive behaviour

- **≥1024px:** map fills the viewport. Country panel 400px wide, docked left (right in RTL), scrollable, tabs sticky. Layers drawer 280px overlays the panel position (one at a time).
- **640–1023px:** panel 360px; right rail collapses to 5 icons.
- **<640px:** bottom nav (Map · Layers · Brief · Ask · Share); country panel becomes a **bottom sheet** with three snap heights (peek 30% / half / full); search becomes an icon that expands full-width; ticker hides unless enabled.
- Panel and drawer states are encoded in the URL so back/forward and sharing work.

---

## 5. Component inventory (build list)

1. `MapCanvas` — MapLibre GL JS, globe projection at low zoom switching to mercator; dark style; country fill layer with hover/selected states; label layers.
2. `TopBar` — `MenuButton`, `SearchBox` (autocomplete, recent, keyboard nav, mic stub), `AlertsBell`, `ClockBlock` (local + UTC + live-freshness dot).
3. `RightRail` — language, theme, view preset, compare, layers, text size, locate, zoom.
4. `LayersDrawer` — groups, toggles with colour dot, time-window pills, count badge for active layers.
5. `CountryPanel` — header, `TabBar` (scroll arrows ‹ ›), tab bodies below.
6. Tab bodies: `OverviewTab`, `BriefsTab`, `EconomyTab`, `TradeTab`, `MilitaryTab`, `VisitsTab`, `UNTab`, `SocietyTab`, `NewsTab`.
7. Primitives: `StatTile`, `RankBadge`, `Sparkline`, `BarSeries` (projections hatched/light), `ShareBar` (exports/imports), `PersonRow`, `FlagChip`, `SourceFootnote`, `Citation`, `Skeleton`, `EmptyState` (explains why no data).
8. `Ticker` — CSS marquee, pause on hover, outlet label, dismiss.
9. `CompareView` — two countries side by side, rows aligned by metric.
10. `OnboardingModal` + `CoachTour`.
11. `ToastHost`, `Tooltip`, `Sheet` (mobile).

---

## 6. Data plan (free/open first, per-tile provenance)

| Need | Source | Notes |
|---|---|---|
| Boundaries | Natural Earth 1:50m (public domain) | Decide disputed-border policy up front and show it in "Boundaries & sources". |
| Basics (capital, pop, area, currency, languages, borders) | REST Countries, World Bank | |
| Leaders and roles | Wikidata SPARQL | Cache; photos from Wikimedia Commons with attribution. |
| Economy | World Bank API, IMF DataMapper (WEO projections), FX from a free FX API | |
| Trade | UN Comtrade (free tier, rate-limited) | Pre-aggregate nightly into our DB. |
| Military | SIPRI (expenditure, arms transfers), Global Firepower-style counts must be sourced carefully | Check licence before shipping any scraped figures. |
| UN voting | Harvard Dataverse UN General Assembly voting dataset | |
| Visits | Curated table (hand/LLM-assisted from ministry press releases) with source URL | Needs editorial review; start with 20 countries. |
| Live: events/protests | GDELT, ACLED (licence required) | Event-pressure score = our documented formula. |
| Live: hazards/fires/quakes | USGS, NASA FIRMS, GDACS | |
| Live: flights/vessels | OpenSky, aisstream.io (free keys, limited) | Phase 3. |
| Weather/AQI | Open-Meteo (+ air-quality API) | |
| Headlines/ticker | RSS from named outlets | Show headline + outlet + link only (no article text). |
| AI briefs | Claude API over retrieved items with mandatory citations | Phase 2; see §8. |

---

## 7. Architecture

- **Next.js (App Router) + TypeScript + Tailwind**, MapLibre GL JS, Zustand for UI/map state, TanStack Query for fetching, Recharts or hand-rolled SVG for the small charts.
- **Postgres (Supabase) + nightly ingest jobs** for slow data (economy, trade, military, UN); thin cached API routes for fast data (weather, headlines); live feeds go through server routes that cache for 30–120s to protect rate limits.
- **i18n:** `next-intl`, EN/AR, message files; all numbers/dates via `Intl` with locale.
- **State in URL:** `?sel=ISO3&tab=trade&layers=flights,events&cmp=ARE` plus the map hash.
- **Performance budget:** first interactive map <2.5s on 4G; country JSON <40 KB; layers lazy-loaded; panel tabs load on first open.
- **Accessibility:** full keyboard path (search → select → tabs), focus rings, aria-live for the Live indicator, 4.5:1 contrast, reduced motion, chart data also available as a table.

> Note for this repo: `AGENTS.md` says this Next.js version has breaking changes. Before writing code, read the relevant guide in `node_modules/next/dist/docs/`.

---

## 8. Honesty and risk rules

- Every metric: value + year + source link; stale data is badged ("Apr 2026").
- AI briefs: generated only from retrieved, cited items; each claim carries a citation number; show "Generated … · newest source …"; no un-cited sentences; label as AI-generated.
- Disputed territories, leader titles and event scoring are political; document the policy in a visible "Methodology" page.
- Respect each source's licence and rate limits; never scrape sites whose terms forbid it.

---

## 9. Phased build

**Phase 0 — Foundations (½ day):** new Next.js app, tokens/theme, i18n shell, layout skeleton, MapLibre dark globe, country hit-testing.
**Phase 1 — Core (the "looks like the real thing" milestone):** TopBar + search, URL state, Country panel with Overview/Economy/Trade (real World Bank/Comtrade data for ~195 states), Layers drawer UI, ticker, light/dark, EN/AR + RTL, mobile bottom sheet.
**Phase 2 — Depth:** Military, UN voting + compare, Visits (curated), News tab, Compare view, Briefs with citations, one-pager PDF export, follow/watchlist.
**Phase 3 — Live:** events, hazards, fires, weather overlays, then flights/vessels, alerts bell.
**Phase 4 — Polish:** onboarding tour, accessibility audit, performance pass, methodology page.

**Definition of done per phase:** runs locally, no console errors, checked at 1440 / 768 / 390 widths, in EN and AR, dark and light.

---

## 10. Open decisions (need your call)
1. Name, logo and palette (I used a placeholder palette).
2. Which phase-1 audience: UAE-centric (like the reference) or neutral/global?
3. Own repo/folder vs. a route inside this StockApp project (I recommend a separate folder).
4. Whether AI briefs (paid API) are in scope for v1.
