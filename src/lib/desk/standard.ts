import { ANGLES_SCHEMA, parseAngles } from "../case/angles";

// THE SHARED STRUCTURED KEYS of the state-of-the-art standard (docs/state-of-the-art-reporting-spec.md, C), added to the structured JSON of the embassy and Ministry products. Every key is optional and additive: an older product without them still parses, and a screen draws nothing when a key is absent. One place defines the shape, the prompt text that asks for it and the validating parsers, so the products and the screens agree.
//   angles      [{id, status, note}]                      the 14-angle coverage the product reports (see case/angles.ts)
//   soWhat      string                                    the "so what" for the UAE's interests, one paragraph
//   asOf        string                                    the date the evidence runs to (a product states its as-of date)
//   changed     string[]                                  what changed since the last report (a diff)
//   coalition   [{who, kind, offer, ask, seat, owner}]    the coalition and friends plan
//   influence   [{lever, move, owner, when, measure}]     the influence plan: soft, hard (policy level), investment, trade, logistics, technology, space, energy, narrative
//   scenarios   [{kind, likelihood, summary, trigger, indicator, response}]   base, upside, downside, each with its tripwire
//   playbook    {thesis, course, progressPct, whereWeAre, pillars[{pillar, play, status, progressPct, evidence, nextStep, owner, outcome}], outcomes{twelveMonths[], threeYears[], ifStalled}}   the playbook's implementation tracker (the same shape as the President's brief)
export const LEVERS = ["soft", "hard", "investment", "trade", "logistics", "technology", "space", "energy", "narrative"] as const;
export const PILLAR_STATUS = ["delivered", "in_progress", "not_started", "stalled"] as const;
export type PillarStatus = (typeof PILLAR_STATUS)[number];
export type Coalition = { who: string; kind: "country" | "bloc" | "institution" | "company"; offer: string; ask: string; seat: string; owner: string };
export type Influence = { lever: (typeof LEVERS)[number]; move: string; owner: string; when: string; measure: string };
export type ScenarioRow = { kind: "base" | "upside" | "downside"; likelihood: string; summary: string; trigger: string; indicator: string; response: string };
export type Pillar = { pillar: string; play: string; status: PillarStatus; progressPct: number; evidence: string; nextStep: string; owner: string; outcome: string };
export type Tracker = { thesis: string; course: string; progressPct: number; whereWeAre: string; pillars: Pillar[]; outcomes: { twelveMonths: string[]; threeYears: string[]; ifStalled: string } };
export type Standard = { angles: ReturnType<typeof parseAngles>; soWhat: string; asOf: string; changed: string[]; coalition: Coalition[]; influence: Influence[]; scenarios: ScenarioRow[]; playbook: Tracker | null };
const rec = (v: unknown) => ((v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>);
const s = (v: unknown, n = 240) => (typeof v === "string" ? v.replace(/[<>\u0000-\u001F]/g, " ").trim().slice(0, n) : "");
const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []); const strs = (v: unknown, n: number, m = 240) => arr(v, n).map((x) => s(x, m)).filter(Boolean);
const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v)) || 0)); const pick = <T extends string>(v: unknown, set: readonly T[], d: T): T => (set.includes(String(v).toLowerCase() as T) ? (String(v).toLowerCase() as T) : d);
/** The playbook's implementation tracker as a product reports it; null when the product gives none. */
export function parseTracker(v: unknown): Tracker | null {
  const p = rec(v); const thesis = s(p.thesis, 220); const pillars = arr(p.pillars, 8).map((x): Pillar | null => { const o = rec(x); const pillar = s(o.pillar, 80); return pillar ? { pillar, play: s(o.play, 180), status: pick(String(o.status ?? "").replace(/[\s-]/g, "_"), PILLAR_STATUS, "not_started"), progressPct: pct(o.progressPct), evidence: s(o.evidence, 220), nextStep: s(o.nextStep, 180), owner: s(o.owner, 80), outcome: s(o.outcome, 180) } : null; }).filter((x): x is Pillar => !!x);
  if (!thesis && !pillars.length) return null; const oc = rec(p.outcomes);
  return { thesis, course: pick(p.course, ["deepen", "staged", "hedge", "hold"] as const, "staged"), progressPct: pct(p.progressPct), whereWeAre: s(p.whereWeAre, 520), pillars, outcomes: { twelveMonths: strs(oc.twelveMonths, 4, 200), threeYears: strs(oc.threeYears, 4, 200), ifStalled: s(oc.ifStalled, 320) } };
}
/** Every shared key of a structured block, validated. */
export function parseStandard(j: Record<string, unknown>): Standard {
  return { angles: parseAngles(j.angles), soWhat: s(j.soWhat, 600), asOf: s(j.asOf, 40), changed: strs(j.changed, 8, 240),
    coalition: arr(j.coalition, 12).map((x): Coalition | null => { const q = rec(x); const who = s(q.who, 140); return who ? { who, kind: pick(q.kind, ["country", "bloc", "institution", "company"] as const, "country"), offer: s(q.offer, 220), ask: s(q.ask, 220), seat: s(q.seat, 160), owner: s(q.owner, 100) } : null; }).filter((x): x is Coalition => !!x),
    influence: arr(j.influence, 12).map((x): Influence | null => { const q = rec(x); const move = s(q.move, 240); return move ? { lever: pick(q.lever, LEVERS, "soft"), move, owner: s(q.owner, 100), when: s(q.when, 60), measure: s(q.measure, 200) } : null; }).filter((x): x is Influence => !!x),
    scenarios: arr(j.scenarios, 4).map((x): ScenarioRow | null => { const q = rec(x); const summary = s(q.summary, 320); return summary ? { kind: pick(q.kind, ["base", "upside", "downside"] as const, "base"), likelihood: s(q.likelihood, 40), summary, trigger: s(q.trigger, 220), indicator: s(q.indicator, 200), response: s(q.response, 240) } : null; }).filter((x): x is ScenarioRow => !!x),
    playbook: parseTracker(j.playbook) };
}
const TRACKER_SCHEMA = `playbook: the implementation tracker of the UAE statecraft playbook, from the UAE's interests {"thesis" (the playbook in one line), "course" ("deepen", "staged", "hedge" or "hold"), "progressPct" (0 to 100: the share delivered so far, judged from the evidence and said plainly), "whereWeAre" (at most 40 words), "pillars": four to six {"pillar","play" (what the UAE does),"status" ("delivered", "in_progress", "not_started" or "stalled"),"progressPct","evidence" (announced against delivered, with a fact id or dated source),"nextStep","owner" (a role),"outcome" (what it produces, with the measure)}, "outcomes": {"twelveMonths": up to three, "threeYears": up to three, "ifStalled": what stalling costs the UAE}}`;
/** The prompt text of the shared keys, to be appended to a product's own key list. `which` selects what a product is asked for: the keys with a long answer are only asked of the products that can carry them. */
export const standardSchema = (which: { coalition?: boolean; influence?: boolean; scenarios?: boolean; playbook?: boolean } = {}) =>
  `${ANGLES_SCHEMA}. Keep every string in the keys below under 120 characters, except soWhat. soWhat: the so-what for the UAE's interests (at most 50 words). asOf: the date the evidence runs to (for example "2026-10-30"). changed: up to three lines on what changed since the last report, or "no earlier report on file".${which.coalition ? ` coalition: the coalition and friends plan, up to 6 {"who" (a country, bloc, institution or company), "kind" ("country", "bloc", "institution" or "company"), "offer" (what the UAE offers), "ask" (what it asks), "seat" (the vote, seat or forum that matters), "owner" (proposed)}.` : ""}${which.influence ? ` influence: the influence plan, up to 6, one per lever for the six most important levers {"lever" ("soft", "hard" at policy level only, "investment", "trade", "logistics", "technology", "space", "energy" or "narrative"), "move", "owner" (proposed), "when", "measure"}.` : ""}${which.scenarios ? ` scenarios: exactly three, base, upside and downside {"kind" ("base", "upside" or "downside"), "likelihood" (a band: almost no chance, very unlikely, unlikely, roughly even, likely, very likely, almost certain), "summary", "trigger", "indicator" (with its threshold), "response"}.` : ""}${which.playbook ? ` ${TRACKER_SCHEMA}.` : ""}`;
