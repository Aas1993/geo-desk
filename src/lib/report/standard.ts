import { jsonBlock } from "../desk/core";
import { ANGLES } from "./angles";

// THE STANDARD PARTS OF A REPORT (docs/state-of-the-art-reporting-spec.md, section C): the as-of line, the so-what, the angle coverage matrix, scenarios with tripwires, the implementation milestones, the coalition and friends list and the influence ledger. A product carries them as structured keys in its JSON block; a product made before they existed carries none, and then nothing is drawn: no part is ever built from a guess. The keys are read under several names because the prompts that write them are edited elsewhere; each reader keeps only what it recognises.
export type AngleStatus = "covered" | "thin" | "notfound";
export type AngleCov = { id: string; status: AngleStatus; note: string; section: string };
export type Scenario = { kind: "base" | "upside" | "downside" | "other"; name: string; likelihood: string; summary: string; trigger: string; tripwires: { indicator: string; threshold: string; move: string }[]; plan: string };
export type Milestone = { initiatives: string[]; id: string; horizon: "30d" | "100d" | "1y" | "3y" | "other"; title: string; owner: string; start: string; end: string; gate: string; measure: string; target: string; resources: string; dependsOn: string[]; risk: string };
export type CoalitionRow = { owner: string; name: string; kind: string; offer: string; ask: string; seat: string; stance: string };
export type LedgerRow = { instrument: string; uae: number | null; headroom: number | null; rivals: { name: string; value: number | null }[]; note: string };
export type Standard = { soWhat: string; angles: AngleCov[]; scenarios: Scenario[]; milestones: Milestone[]; coalition: CoalitionRow[]; ledger: LedgerRow[]; any: boolean };

const TAGS = ["standard", "king", "mission1", "mission2", "mofa", "architect", "case", "falcon", "deep", "strategy", "directive"];
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, n = 320) => (typeof v === "string" ? v.replace(/[<>\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : typeof v === "number" && isFinite(v) ? String(v) : "");
const strs = (v: unknown, n = 8, m = 200) => arr(v).map((x) => str(x, m)).filter(Boolean).slice(0, n);
const num = (v: unknown): number | null => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/[%,]/g, "")) : NaN; return isFinite(n) ? n : null; };
/** The first non-empty value under any of the names, looking through every JSON block a product carries. */
export function pickKey(blocks: Record<string, unknown>[], names: string[]): unknown { for (const b of blocks) for (const n of names) { const v = b[n]; if (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : typeof v === "string" ? v.trim() : v != null) return v; } return undefined; }
export const blocksOf = (report: string): Record<string, unknown>[] => TAGS.map((t) => jsonBlock(report, t)?.data).filter((x): x is Record<string, unknown> => !!x);

// ---- angles
const SYN: Record<string, string> = { political: "gov", governance: "gov", diplomatic: "friends", standing: "friends", diplomacy: "friends", alliances: "friends", security: "natsec", homeland: "natsec", hardpower: "military", economic: "econ", economy: "econ", trade: "tradeinv", investment: "tradeinv", corridors: "logistics", resources: "energy", technology: "tech", space: "tech", society: "soft", softpower: "soft", ledger: "influence", legal: "legal", normative: "legal", narrative: "info", information: "info" };
export function matchAngle(v: unknown): string | null {
  const t = str(v, 80).toLowerCase(); if (!t) return null; const n = /^#?(\d{1,2})$/.exec(t); if (n && +n[1] >= 1 && +n[1] <= ANGLES.length) return ANGLES[+n[1] - 1].id;
  const k = t.replace(/[^a-z]/g, ""); const hit = ANGLES.find((a) => a.id === k) ?? ANGLES.find((a) => a.en.toLowerCase() === t || a.ar === t); if (hit) return hit.id; if (SYN[k]) return SYN[k];
  const w = ANGLES.find((a) => k.length >= 5 && a.en.toLowerCase().replace(/[^a-z]/g, "").startsWith(k.slice(0, 8))); return w?.id ?? null;
}
const status = (v: unknown): AngleStatus | null => { const t = str(v, 40).toLowerCase(); if (!t) return null; if (/not.?found|missing|none|gap|absent|no data|لم يوجد|غير موجود/.test(t)) return "notfound"; if (/thin|partial|limited|weak|some|ضعيف|جزئي|محدود/.test(t)) return "thin"; if (/cover|full|ok|yes|done|strong|good|مغطى|كامل/.test(t)) return "covered"; return null; };
export function readAngles(blocks: Record<string, unknown>[]): AngleCov[] {
  const raw = pickKey(blocks, ["angles", "angleCoverage", "angle_coverage", "coverage", "angleMatrix"]); const out = new Map<string, AngleCov>();
  const put = (id: string | null, st: AngleStatus | null, note: unknown, section: unknown) => { if (!id || !st) return; out.set(id, { id, status: st, note: str(note, 240), section: str(section, 60) }); };
  if (Array.isArray(raw)) for (const x of raw) { const o = rec(x); put(matchAngle(o.id ?? o.angle ?? o.n ?? o.name ?? o.title), status(o.status ?? o.state ?? o.coverage ?? o.level), o.note ?? o.why ?? o.gap ?? o.closes ?? o.reading, o.section ?? o.ref); }
  else if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) { if (typeof v === "string") put(matchAngle(k), status(v), "", ""); else { const o = rec(v); put(matchAngle(k), status(o.status ?? o.state ?? o.coverage), o.note ?? o.why ?? o.gap, o.section); } }
  return ANGLES.map((a) => out.get(a.id)).filter((x): x is AngleCov => !!x);
}

// ---- scenarios, milestones, coalition, ledger
const kindOf = (v: unknown): Scenario["kind"] => { const t = str(v, 40).toLowerCase(); return /base|central|expected|الأساس/.test(t) ? "base" : /up|best|favour|positive|صعود|إيجاب/.test(t) ? "upside" : /down|worst|adverse|negative|stress|هبوط|سلب/.test(t) ? "downside" : "other"; };
export function readScenarios(blocks: Record<string, unknown>[]): Scenario[] {
  const raw = pickKey(blocks, ["scenarios", "scenarioSet", "scenarioCases"]); const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.entries(raw).map(([k, v]) => ({ kind: k, ...rec(v) })) : [];
  return list.map((x): Scenario | null => { const o = rec(x); const name = str(o.name ?? o.title ?? o.label ?? o.kind ?? o.case, 120); const summary = str(o.summary ?? o.description ?? o.story ?? o.trigger ?? o.what, 360); if (!name && !summary) return null;
    let tw = arr(o.tripwires ?? o.signposts ?? o.watch ?? (Array.isArray(o.indicators) ? o.indicators : undefined)).map((t) => { const q = rec(t); return typeof t === "string" ? { indicator: str(t, 160), threshold: "", move: "" } : { indicator: str(q.indicator ?? q.name ?? q.signal, 160), threshold: str(q.threshold ?? q.level, 120), move: str(q.move ?? q.response ?? q.then ?? q.plan, 200) }; }).filter((t) => t.indicator).slice(0, 6);
    const ind = typeof o.indicator === "string" ? str(o.indicator, 160) : ""; const trig = str(o.trigger, 220); let plan = str(o.plan ?? o.response ?? o.uaeResponse, 260);
    if (!tw.length && ind) { tw = [{ indicator: ind, threshold: trig, move: plan }]; plan = ""; }
    return { kind: kindOf(o.kind ?? o.type ?? o.case ?? o.name), name, likelihood: str(o.likelihood ?? o.band ?? o.probability, 60), summary, trigger: tw.length && tw[0].threshold === trig ? "" : trig, tripwires: tw, plan }; }).filter((x): x is Scenario => !!x).slice(0, 6);
}
const horizonOf = (v: unknown): Milestone["horizon"] => { const t = str(v, 40).toLowerCase(); return /30|thirty|d30/.test(t) ? "30d" : /100|d100/.test(t) ? "100d" : /3\s*(y|year)|three|y3|36/.test(t) ? "3y" : /1\s*(y|year)|one year|y1|12|annual/.test(t) ? "1y" : "other"; };
export function readMilestones(blocks: Record<string, unknown>[]): Milestone[] {
  const raw = pickKey(blocks, ["milestones", "implementation", "roadmap", "timeline", "implementationPlan"]); const rows: { h: unknown; x: unknown }[] = [];
  if (Array.isArray(raw)) for (const x of raw) rows.push({ h: rec(x).horizon ?? rec(x).phase, x }); else if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) for (const x of arr(v)) rows.push({ h: k, x });
  return rows.map(({ h, x }, i): Milestone | null => { const o = rec(x); const title = str(o.title ?? o.milestone ?? o.initiative ?? o.action ?? o.name ?? o.what, 200); if (!title) return null; return { id: str(o.id, 10) || `M${i + 1}`, horizon: horizonOf(h ?? o.horizon), title, owner: str(o.owner ?? o.lead, 120), start: str(o.start ?? o.from ?? o.begins, 24), end: str(o.end ?? o.finish ?? o.to ?? o.due ?? o.by ?? o.when, 24), initiatives: strs(o.initiatives, 10, 16), gate: str(o.gate ?? o.decisionGate, 180), measure: str(o.measure ?? o.kpi, 180), target: str(o.target, 120), resources: str(o.resources ?? o.cost ?? o.budget, 100), dependsOn: strs(o.dependsOn ?? o.dependencies, 6, 12), risk: str(o.risk, 180) }; }).filter((x): x is Milestone => !!x).slice(0, 60);
}
export function readCoalition(blocks: Record<string, unknown>[]): CoalitionRow[] {
  const raw = pickKey(blocks, ["coalition", "friends", "coalitions", "friendsAndBlocs", "alliances"]);
  return arr(raw).map((x): CoalitionRow | null => { const o = rec(x); const name = str(o.name ?? o.who ?? o.partner ?? o.country, 120); if (!name) return null; return { owner: str(o.owner, 120), name, kind: str(o.kind ?? o.type, 40), offer: str(o.offer ?? o.offered ?? o.give, 220), ask: str(o.ask ?? o.asked ?? o.want, 220), seat: str(o.seat ?? o.votes ?? o.vote ?? o.forum, 160), stance: str(o.stance ?? o.relation ?? o.position, 60) }; }).filter((x): x is CoalitionRow => !!x).slice(0, 30);
}
export function readLedger(blocks: Record<string, unknown>[]): LedgerRow[] {
  const raw = pickKey(blocks, ["ledger", "influenceLedger"]);
  return arr(raw).map((x): LedgerRow | null => { const o = rec(x); const instrument = str(o.instrument ?? o.lever ?? o.name, 100); if (!instrument) return null; const rv = o.rivals && !Array.isArray(o.rivals) ? Object.entries(rec(o.rivals)).map(([name, v]) => ({ name, value: num(v) })) : arr(o.rivals).map((r) => ({ name: str(rec(r).name ?? rec(r).who, 40), value: num(rec(r).value ?? rec(r).score ?? rec(r).footprint) })).filter((r) => r.name); return { instrument, uae: num(o.uae ?? o.footprint), headroom: num(o.headroom), rivals: rv.slice(0, 8), note: str(o.note ?? o.reading, 200) }; }).filter((x): x is LedgerRow => !!x).slice(0, 16);
}
/** The so-what for the UAE: a structured key, or the first paragraph under a "So what" heading; empty when the product has neither. */
export function readSoWhat(report: string, blocks: Record<string, unknown>[]): string {
  const k = pickKey(blocks, ["soWhat", "so_what", "uaeSoWhat", "uaeImplication", "whatItMeansForTheUAE"]); if (typeof k === "string" && k.trim()) return str(k, 700);
  const m = /^#{1,3}\s*(?:so what|what (?:this|it) means for the uae)[^\n]*\n+([^\n#][\s\S]*?)(?=\n\s*\n|^#|$(?![\s\S]))/im.exec(report); return m ? m[1].replace(/\*\*/g, "").replace(/\s+/g, " ").trim().slice(0, 700) : "";
}
export function readStandard(report: string): Standard {
  const b = blocksOf(report); const s = { soWhat: readSoWhat(report, b), angles: readAngles(b), scenarios: readScenarios(b), milestones: readMilestones(b), coalition: readCoalition(b), ledger: readLedger(b) };
  return { ...s, any: !!(s.soWhat || s.angles.length || s.scenarios.length || s.milestones.length || s.coalition.length || s.ledger.length) };
}

// ---- dates
/** Whole days between an ISO date and now (null when the date does not parse). */
export const daysSince = (iso: string, now = Date.now()): number | null => { const t = Date.parse(iso); return isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null; };
/** Months from `base` (a date) to `iso`: for a Gantt axis. Dates that do not parse give null. */
export const monthsFrom = (base: string, iso: string): number | null => { const a = Date.parse(base), b = Date.parse(iso); return isFinite(a) && isFinite(b) ? Math.round(((b - a) / (30.4375 * 86_400_000)) * 10) / 10 : null; };
/** Month offsets for milestones that have both dates; those without are returned in `undated`. The axis starts at the earliest start. */
export function milestoneRows(ms: Milestone[]): { rows: (Milestone & { s: number; e: number })[]; undated: Milestone[]; months: number; base: string | null } {
  const dated = ms.filter((m) => isFinite(Date.parse(m.start)) && isFinite(Date.parse(m.end))); const undated = ms.filter((m) => !dated.includes(m)); if (!dated.length) return { rows: [], undated, months: 0, base: null };
  const base = dated.map((m) => m.start).sort()[0]; const rows = dated.map((m) => ({ ...m, s: monthsFrom(base, m.start)!, e: monthsFrom(base, m.end)! })).sort((a, z) => a.s - z.s || a.e - z.e);
  return { rows, undated, months: Math.max(3, Math.ceil(Math.max(...rows.map((r) => r.e)))), base };
}
export const HORIZONS: { id: Milestone["horizon"]; en: string; ar: string }[] = [{ id: "30d", en: "First 30 days", ar: "أول 30 يومًا" }, { id: "100d", en: "First 100 days", ar: "أول 100 يوم" }, { id: "1y", en: "One year", ar: "سنة" }, { id: "3y", en: "Three years", ar: "ثلاث سنوات" }, { id: "other", en: "Other timing", ar: "توقيت آخر" }];
