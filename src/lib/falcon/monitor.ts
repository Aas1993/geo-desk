import { DEFAULT_WEIGHTS, scoreCountry } from "./score";
import type { WorldModel } from "./world";

// Continuous monitoring, honestly defined: a compact snapshot of the world model is taken on a schedule (and on demand), snapshots are kept as a daily history, and changes and watchlist rules are evaluated over them.
// Everything here is observed from datasets and feeds. Nothing in it is an AI judgment, and nothing in it is streaming: the freshness of each source is part of every snapshot.
export type Snapshot = { d: string; at: string; n: number; w: number; sev3: number; src: { current: number; due: number; stale: number }; c: Record<string, { o: number | null; r: number | null; x: number | null; k: string[] }> };
export type History = { built: string; days: Snapshot[] };
export const HISTORY_DAYS = 90;
export function snapshotOf(w: WorldModel, at = new Date()): Snapshot {
  const c: Snapshot["c"] = {}; let tw = 0, s3 = 0;
  for (const x of w.countries) { const s = scoreCountry(x.c, DEFAULT_WEIGHTS); c[x.iso3] = { o: s.opp, r: s.risk, x: x.c.exposure, k: x.warnings.map((k) => `${k.label}:${k.sev}`) }; tw += x.warnings.length; s3 += x.warnings.filter((k) => k.sev === 3).length; }
  const src = { current: 0, due: 0, stale: 0 }; for (const s of w.sources) if (s.state === "current") src.current++; else if (s.state === "due") src.due++; else src.stale++;
  return { d: at.toISOString().slice(0, 10), at: at.toISOString(), n: w.countries.length, w: tw, sev3: s3, src, c };
}
/** Today's snapshot replaces an earlier one of the same date; only the newest HISTORY_DAYS days are kept. */
export function appendSnapshot(h: History | null, s: Snapshot): History {
  const days = [...(h?.days ?? []).filter((x) => x.d !== s.d), s].sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-HISTORY_DAYS); return { built: s.at, days };
}
export type Change = { iso3: string; kind: "new-warning" | "cleared-warning" | "risk-up" | "risk-down" | "opp-up" | "opp-down" | "stake-change"; text: string; sev: number; x: number | null };
/** What moved between two snapshots: warnings that appeared or cleared, and risk, opportunity or stake moves of at least `min` points (default 5). Sorted by the UAE stake of the country and the size of the change. */
export function diffSnapshots(prev: Snapshot, cur: Snapshot, min = 5): Change[] {
  const out: Change[] = [];
  for (const [iso, c] of Object.entries(cur.c)) {
    const p = prev.c[iso]; if (!p) continue; const pk = new Set(p.k), ck = new Set(c.k);
    for (const k of c.k) if (!pk.has(k)) { const [l, s] = k.split(":"); out.push({ iso3: iso, kind: "new-warning", text: l, sev: +s, x: c.x }); }
    for (const k of p.k) if (!ck.has(k)) { const [l, s] = k.split(":"); out.push({ iso3: iso, kind: "cleared-warning", text: l, sev: +s, x: c.x }); }
    const mv = (a: number | null, b: number | null) => (a != null && b != null ? b - a : 0);
    const dr = mv(p.r, c.r), dop = mv(p.o, c.o), dx = mv(p.x, c.x);
    if (Math.abs(dr) >= min) out.push({ iso3: iso, kind: dr > 0 ? "risk-up" : "risk-down", text: `${p.r} to ${c.r}`, sev: Math.abs(dr) >= 15 ? 2 : 1, x: c.x });
    if (Math.abs(dop) >= min) out.push({ iso3: iso, kind: dop > 0 ? "opp-up" : "opp-down", text: `${p.o} to ${c.o}`, sev: 1, x: c.x });
    if (Math.abs(dx) >= min) out.push({ iso3: iso, kind: "stake-change", text: `${p.x} to ${c.x}`, sev: 1, x: c.x });
  }
  return out.sort((a, b) => (b.x ?? 0) * (b.sev + 1) - (a.x ?? 0) * (a.sev + 1));
}

// ---- watchlist rules (stored in the browser) ----
export type WarnRule = { id: string; name: string; enabled: boolean; kind: "warning"; label: string; minSev: number; minStake: number; scope: string };
export type ScoreRule = { id: string; name: string; enabled: boolean; kind: "score"; metric: "risk" | "opp" | "stake"; op: ">=" | "<="; value: number; minStake: number; scope: string };
export type AlertRule = { id: string; name: string; enabled: boolean; kind: "alert"; cat: string; minSev: number; uaeOnly: boolean; keyword: string };
export type Rule = WarnRule | ScoreRule | AlertRule;
export type Hit = { key: string; ruleId: string; ruleName: string; title: string; detail: string; sev: number; iso3?: string; source: "dataset" | "feed" };
/** A rule's scope: "any", a three-letter country code, or a region name as in the regions dataset. */
const inScope = (scope: string, iso: string, region: string) => scope === "any" || scope === iso || scope === region;
export type AlertLite = { id: string; cat: string; sev: number; title: string; uae: boolean; url?: string };
export function evalRules(rules: Rule[], w: WorldModel, alerts: AlertLite[]): Hit[] {
  const hits: Hit[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    if (r.kind === "warning") { for (const c of w.countries) { if (!inScope(r.scope, c.iso3, c.region) || (c.c.exposure ?? 0) < r.minStake) continue; for (const k of c.warnings) if ((r.label === "any" || k.label === r.label) && k.sev >= r.minSev) hits.push({ key: `${r.id}|${k.id}`, ruleId: r.id, ruleName: r.name, title: `${c.name}: ${k.label} ${k.value}`, detail: `threshold ${k.threshold}; UAE stake ${c.c.exposure ?? "n/a"}`, sev: k.sev, iso3: c.iso3, source: "dataset" }); } }
    else if (r.kind === "score") { for (const c of w.countries) { if (!inScope(r.scope, c.iso3, c.region) || (c.c.exposure ?? 0) < r.minStake) continue; const s = scoreCountry(c.c, DEFAULT_WEIGHTS); const v = r.metric === "risk" ? s.risk : r.metric === "opp" ? s.opp : c.c.exposure; if (v == null) continue; if (r.op === ">=" ? v >= r.value : v <= r.value) hits.push({ key: `${r.id}|${c.iso3}`, ruleId: r.id, ruleName: r.name, title: `${c.name}: ${r.metric} ${v}`, detail: `rule ${r.metric} ${r.op} ${r.value}; UAE stake ${c.c.exposure ?? "n/a"}`, sev: 1, iso3: c.iso3, source: "dataset" }); } }
    else { const kw = r.keyword.trim().toLowerCase(); for (const a of alerts) if ((r.cat === "all" || a.cat === r.cat) && a.sev >= r.minSev && (!r.uaeOnly || a.uae) && (!kw || a.title.toLowerCase().includes(kw))) hits.push({ key: `${r.id}|${a.id}`, ruleId: r.id, ruleName: r.name, title: a.title, detail: `${a.cat}, severity ${a.sev}${a.uae ? ", UAE-relevant" : ""}`, sev: a.sev, source: "feed" }); }
  }
  return hits.sort((a, b) => b.sev - a.sev);
}
type NoId<T> = T extends unknown ? Omit<T, "id"> : never;
export const PRESET_RULES: NoId<Rule>[] = [
  { name: "Severe warnings where the UAE has a stake", enabled: true, kind: "warning", label: "any", minSev: 3, minStake: 50, scope: "any" },
  { name: "Debt at stress level anywhere", enabled: true, kind: "warning", label: "Public debt", minSev: 2, minStake: 0, scope: "any" },
  { name: "High risk where the UAE is exposed", enabled: true, kind: "score", metric: "risk", op: ">=", value: 60, minStake: 60, scope: "any" },
  { name: "UAE-relevant severe alerts", enabled: true, kind: "alert", cat: "all", minSev: 3, uaeOnly: true, keyword: "" },
  { name: "Red Sea and Hormuz headlines", enabled: true, kind: "alert", cat: "all", minSev: 1, uaeOnly: false, keyword: "red sea" },
];
