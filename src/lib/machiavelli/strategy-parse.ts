import { bandOf, confidenceOf, plain } from "../visual";

// Readers for the three Machiavellian products. The browser draws their tables (outcome trees, the option-appraisal analyzer, the horizon board, the relationship map) with no further model call, so the column names in src/lib/dossier/strategy.ts are load-bearing.
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);
export function sectionLines(md: string, title: RegExp): string[] {
  const out: string[] = []; let on = false; for (const l of md.split("\n")) { const h = /^(#{1,3}) (.*)$/.exec(l); if (h) { if (on) break; if (h[1].length >= 2 && title.test(h[2])) on = true; } else if (on) out.push(l); } return out;
}
type Tab = { head: string[]; rows: string[][] };
function tableOf(lines: string[]): Tab { const t = lines.filter((l) => l.trim().startsWith("|")); if (t.length < 2) return { head: [], rows: [] }; return { head: cells(t[0]).map((c) => plain(c).toLowerCase()), rows: t.slice(1).filter((l) => !isRule(l)).map(cells) }; }
/** Reads one section's table into rows keyed by the given names; a column is found by its heading and falls back to its position. Cells keep their markdown (links stay readable by the UI). */
export function rowsOf<K extends string>(md: string, title: RegExp, spec: Record<K, RegExp>): Record<K, string>[] {
  const { head, rows } = tableOf(sectionLines(md, title)); if (!head.length) return [];
  const keys = Object.keys(spec) as K[]; const idx = keys.map((k, i) => { const j = head.findIndex((h) => spec[k].test(h)); return j >= 0 ? j : i; });
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[idx[i]] ?? "").trim()])) as Record<K, string>);
}
export const labelled = (lines: string[], label: RegExp) => { for (const l of lines) { const m = new RegExp(`\\*\\*(?:${label.source})(?:\\s*\\([^)]*\\))?[:.]?\\*\\*[:.]?\\s*(.*)$`, "i").exec(l.replace(/^\s*[-*•]\s+/, "")); if (m) return m[1].trim(); } return ""; };
const bullets = (lines: string[]) => lines.filter((l) => /^\s*[-*•]\s+/.test(l)).map((l) => l.replace(/^\s*[-*•]\s+/, "").trim()).filter(Boolean);
const proseOf = (lines: string[]) => lines.filter((l) => l.trim() && !l.trim().startsWith("|") && !/^\s*[-*•]\s+/.test(l)).map((l) => l.trim());
export const firstLink = (s: string) => { const m = /\[([^\]]+)\]\((https?:[^)\s]+)\)/.exec(s); return m ? { text: m[1], url: m[2] } : null; };
const ids = (s: string) => (/^\s*[-–—]?\s*$/.test(s) ? [] : (s.match(/[A-Za-z]{1,3}\d{1,2}/g) ?? []).map((x) => x.toUpperCase()));
export const int15 = (s: string) => { const m = /\b([1-5])\b/.exec(s); return m ? +m[1] : null; };

export type PathNode = { id: string; stage: "action" | "mechanism" | "intermediate" | "ultimate" | null; outcome: string; parents: string[]; branch: "favourable" | "adverse" | "neutral" | "baseline" | "shock" | null; horizon: string; evidence: string; confidence: "high" | "moderate" | "low" | null; stop: string };
const stageOf = (s: string): PathNode["stage"] => (/^action/i.test(s) ? "action" : /^mechan/i.test(s) ? "mechanism" : /^interm/i.test(s) ? "intermediate" : /^ultim/i.test(s) ? "ultimate" : null);
const branchOf = (s: string): PathNode["branch"] => (/^favour|^favor/i.test(s) ? "favourable" : /^advers/i.test(s) ? "adverse" : /^neutral/i.test(s) ? "neutral" : /^baseline/i.test(s) ? "baseline" : /^shock/i.test(s) ? "shock" : null);
export function pathNodes(md: string, title: RegExp): PathNode[] {
  return rowsOf(md, title, { id: /^id/, stage: /stage/, outcome: /outcome/, parents: /parent/, branch: /branch/, horizon: /horizon/, evidence: /evidence/, confidence: /confidence/, stop: /stop/ }).filter((r) => /^[A-Za-z]{1,3}\d{1,2}$/.test(plain(r.id).trim())).map((r) => ({ id: plain(r.id).trim().toUpperCase(), stage: stageOf(plain(r.stage)), outcome: plain(r.outcome), parents: ids(plain(r.parents)), branch: branchOf(plain(r.branch)), horizon: plain(r.horizon), evidence: r.evidence, confidence: confidenceOf(plain(r.confidence)), stop: plain(r.stop) }));
}
/** The scenario table of a strategy dossier and the scenario builder's tree share the id-and-parents shape, so one placement routine lays out both: depth is the longest chain of parents, order within a depth follows the table. */
export function layoutTree(nodes: { id: string; parents: string[] }[]): { id: string; depth: number; row: number }[] {
  const byId = new Map(nodes.map((n) => [n.id, n])); const memo = new Map<string, number>();
  const depth = (id: string, seen: string[] = []): number => { if (memo.has(id)) return memo.get(id)!; if (seen.includes(id)) return 0; const n = byId.get(id); const ps = (n?.parents ?? []).filter((p) => byId.has(p) && p !== id); const d = ps.length ? 1 + Math.max(...ps.map((p) => depth(p, [...seen, id]))) : 0; memo.set(id, d); return d; };
  const count = new Map<number, number>(); return nodes.map((n) => { const d = depth(n.id); const r = count.get(d) ?? 0; count.set(d, r + 1); return { id: n.id, depth: d, row: r }; });
}

export type Appraisal = { id: string; scores: [number | null, number | null, number | null, number | null, number | null, number | null]; gates: { authority: boolean | null; transparency: boolean | null; conduct: boolean | null } };
const gate = (s: string) => (/^\s*pass/i.test(plain(s)) ? true : /^\s*fail/i.test(plain(s)) ? false : null);
export type StratParsed = {
  title: string; line: string; bottom: string; outcome: string; scopeNote: string;
  developments: { date: string; text: string; source: string; effect: string }[]; baseline: { indicator: string; value: string; date: string; source: string; meaning: string }[];
  history: string; roots: { dimension: string; evidence: string; why: string; confidence: "high" | "moderate" | "low" | null }[]; neighbours: { actor: string; type: string; balance: string; patrons: string; note: string }[]; gapQuestion: string;
  relationship: { strand: string; activity: string; status: string; delivery: string; source: string }[]; agency: { actor: string; mandate: string; path: string; stance: string }[]; gaps: { gap: string; why: string; capability: string; existing: string; instrument: string; benefit: string }[];
  options: { id: string; option: string; instrument: string; outcome: string; mechanism: string; counterpart: string; uae: string; cost: string; authority: string; exit: string }[]; appraisal: Appraisal[];
  scenarios: { name: string; conditions: string; implication: string; response: string; status: string }[]; pathway: PathNode[];
  horizons: { period: string; work: string; owner: string; gate: string; kpi: string; exit: string }[]; indicators: { id: string; indicator: string; baseline: string; signpost: string; review: string }[]; challenges: { challenge: string; perspective: string; evidence: string; effect: string }[]; dissent: string; unresolved: string[];
  why: string[]; axes: { axis: string; score: string; cause: string; how: string }[]; tracks: { short: StratAction[]; medium: StratAction[]; long: StratAction[] }; exitConditions: string;
};
export type StratAction = { action: string; detail: string; owner: string; gate: string; kpi: string; seats: string };
const act = (md: string, title: RegExp): StratAction[] => rowsOf(md, title, { action: /action/, detail: /detail/, owner: /owner/, gate: /gate/, kpi: /kpi/, seats: /seat|driven/ }).map((r) => ({ ...r, seats: /seat|driven/i.test((tableOf(sectionLines(md, title)).head.at(-1) ?? "")) ? r.seats : "" }));
export function parseStrategy(md: string): StratParsed {
  const title = /^# (.*)$/m.exec(md)?.[1].trim() ?? ""; const top = md.split("\n").slice(0, 8); const line = top.find((l) => /prepared for/i.test(l)) ?? "";
  const dec = sectionLines(md, /^Decision and Scope/i); const why = sectionLines(md, /^Why This Country/i);
  const bottom = labelled(dec.length ? dec : why, /bottom line/i); const asIs = (s: string) => s;
  return {
    title, line: plain(line), bottom: plain(bottom), outcome: plain(labelled(dec, /outcome targeted/i)), scopeNote: proseOf(sectionLines(md, /^Scope Note/i)).join(" "),
    developments: rowsOf(md, /^Latest Developments/i, { date: /date/, text: /development/, source: /source/, effect: /effect/ }), baseline: rowsOf(md, /^Evidence Baseline/i, { indicator: /indicator/, value: /value/, date: /date/, source: /source/, meaning: /mean/ }),
    history: proseOf(sectionLines(md, /^Historical Context/i)).join(" "),
    roots: rowsOf(md, /^Roots of the Country/i, { dimension: /dimension/, evidence: /evidence/, why: /why/, confidence: /confidence/ }).map((r) => ({ ...r, confidence: confidenceOf(plain(r.confidence)) })),
    neighbours: rowsOf(md, /^Neighbours and Competition/i, { actor: /neighbour|actor/, type: /type/, balance: /balance/, patrons: /patron/, note: /observation|uae/ }), gapQuestion: plain(labelled(sectionLines(md, /^Neighbours and Competition/i), /gap question/i)),
    relationship: rowsOf(md, /^Existing UAE Relationship/i, { strand: /strand/, activity: /documented/, status: /implemented|announced/, delivery: /delivery/, source: /source/ }), agency: rowsOf(md, /^Counterpart Agency/i, { actor: /actor/, mandate: /mandate|offering/, path: /path|constraint/, stance: /complement|compete/ }),
    gaps: rowsOf(md, /^Gap Analysis/i, { gap: /^gap/, why: /why/, capability: /capability/, existing: /existing|aspiration/, instrument: /instrument/, benefit: /benefit/ }),
    options: rowsOf(md, /^Options$/i, { id: /^id/, option: /^option/, instrument: /instrument/, outcome: /outcome/, mechanism: /mechanism/, counterpart: /counterpart/, uae: /uae benefit/, cost: /cost/, authority: /authority/, exit: /exit/ }).filter((r) => /^O\d+/i.test(plain(r.id))),
    appraisal: rowsOf(md, /^Option Appraisal/i, { id: /^id/, a: /uae benefit/, b: /counterpart/, c: /feasib/, d: /commercial/, e: /risk/, f: /revers/, authority: /authority/, transparency: /transparen/, conduct: /conduct/ }).filter((r) => /^O\d+/i.test(plain(r.id))).map((r) => ({ id: plain(r.id).toUpperCase(), scores: [int15(r.a), int15(r.b), int15(r.c), int15(r.d), int15(r.e), int15(r.f)] as Appraisal["scores"], gates: { authority: gate(r.authority), transparency: gate(r.transparency), conduct: gate(r.conduct) } })),
    scenarios: rowsOf(md, /^Scenarios/i, { name: /scenario/, conditions: /condition/, implication: /implication/, response: /response/, status: /status/ }), pathway: pathNodes(md, /^Outcome Pathway/i),
    horizons: rowsOf(md, /^Strategy Horizons/i, { period: /period/, work: /work/, owner: /owner/, gate: /gate/, kpi: /kpi/, exit: /exit|stop/ }), indicators: rowsOf(md, /^Indicators and Triggers/i, { id: /^id/, indicator: /indicator/, baseline: /baseline/, signpost: /signpost|threshold/, review: /review/ }).filter((r) => /MI\d+/i.test(r.id)),
    challenges: rowsOf(md, /^(Independent Challenge|Risks, Challenge)/i, { challenge: /challenge/, perspective: /perspective/, evidence: /evidence/, effect: /effect/ }), dissent: plain(labelled([...sectionLines(md, /^Independent Challenge/i), ...sectionLines(md, /^Risks, Challenge/i)], /preserved dissent/i)),
    unresolved: bullets(sectionLines(md, /^Unresolved/i)).map(plain),
    why: bullets(why).map(plain), axes: rowsOf(md, /^Weakest Axis/i, { axis: /axis/, score: /score/, cause: /cause/, how: /how/ }), tracks: { short: act(md, /^Short Term/i), medium: act(md, /^Medium Term/i), long: act(md, /^Long Term/i) },
    exitConditions: plain(labelled(sectionLines(md, /^Risks, Challenge/i), /exit conditions/i)) || asIs(""),
  };
}
export type ScenParsed = {
  title: string; line: string; recap: { input: string; value: string }[]; developments: StratParsed["developments"]; tree: PathNode[];
  io: { input: string; mechanism: string; intermediate: string; favourable: string; adverse: string; signpost: string }[]; shifts: { indicator: string; baseline: string; favourable: string; adverse: string; evidence: string }[];
  sequence: { step: string; period: string; instrument: string; gate: string; exit: string }[]; redteam: { check: string; finding: string; effect: string }[]; gaps: string[];
};
export function parseScenario(md: string): ScenParsed {
  return {
    title: /^# (.*)$/m.exec(md)?.[1].trim() ?? "", line: plain(md.split("\n").slice(0, 8).find((l) => /prepared for/i.test(l)) ?? ""),
    recap: rowsOf(md, /^Inputs Recap/i, { input: /input/, value: /value/ }), developments: rowsOf(md, /^Latest Developments/i, { date: /date/, text: /development/, source: /source/, effect: /effect/ }), tree: pathNodes(md, /^Outcome Tree/i),
    io: rowsOf(md, /^Inputs to Outputs/i, { input: /input/, mechanism: /mechanism/, intermediate: /intermediate/, favourable: /favourable/, adverse: /adverse/, signpost: /signpost/ }),
    shifts: rowsOf(md, /^Indicator Shifts/i, { indicator: /indicator/, baseline: /baseline/, favourable: /favourable/, adverse: /adverse/, evidence: /evidence/ }), sequence: rowsOf(md, /^Recommended Instrument Sequencing/i, { step: /step/, period: /period/, instrument: /instrument/, gate: /gate/, exit: /exit/ }),
    redteam: rowsOf(md, /^Red Team/i, { check: /check/, finding: /finding/, effect: /effect/ }), gaps: bullets(sectionLines(md, /^Uncertainty/i)).map(plain),
  };
}
export type LinkStatus = "documented" | "alleged" | "uncertain" | null;
export type InterfParsed = {
  title: string; line: string; bottom: string; scope: string; evidence: { statement: string; cls: "verified" | "allegation" | "inference" | "unresolved" | null; basis: string; confidence: "high" | "moderate" | "low" | null }[];
  hypotheses: { hypothesis: string; support: string; contra: string; needed: string; assessment: "leading" | "plausible" | "unlikely" | "untested" | null }[]; map: { from: string; to: string; relationship: string; status: LinkStatus; evidence: string }[]; mechanisms: string[];
  hard: { category: string; relevance: string; consequences: string }[]; impact: { id: string; horizon: string; consequence: string; parents: string[]; domain: string; evidence: string; confidence: "high" | "moderate" | "low" | null }[];
  options: { option: string; mechanism: string; consent: string; rights: string; exit: string }[]; indicators: string[]; unresolved: string[];
};
export function parseInterference(md: string): InterfParsed {
  const scope = sectionLines(md, /^Case and Scope/i);
  return {
    title: /^# (.*)$/m.exec(md)?.[1].trim() ?? "", line: plain(md.split("\n").slice(0, 8).find((l) => /prepared for/i.test(l)) ?? ""), bottom: plain(labelled(scope, /bottom line/i)), scope: proseOf(scope).filter((l) => !/\*\*bottom line/i.test(l)).join(" "),
    evidence: rowsOf(md, /^Evidence Versus Inference/i, { statement: /statement/, cls: /class/, basis: /source|basis/, confidence: /confidence/ }).map((r) => ({ ...r, cls: /verified/i.test(r.cls) ? "verified" as const : /allegation/i.test(r.cls) ? "allegation" as const : /inference/i.test(r.cls) ? "inference" as const : /unresolved/i.test(r.cls) ? "unresolved" as const : null, confidence: confidenceOf(plain(r.confidence)) })),
    hypotheses: rowsOf(md, /^Competing Hypotheses/i, { hypothesis: /hypothesis/, support: /supporting/, contra: /contradicting/, needed: /diagnostic|needed/, assessment: /assessment/ }).map((r) => ({ ...r, assessment: /leading/i.test(r.assessment) ? "leading" as const : /plausible/i.test(r.assessment) ? "plausible" as const : /unlikely/i.test(r.assessment) ? "unlikely" as const : /untested/i.test(r.assessment) ? "untested" as const : null })),
    map: rowsOf(md, /^Relationship Map/i, { from: /from/, to: /^to/, relationship: /relationship/, status: /status/, evidence: /evidence/ }).map((r) => ({ ...r, status: (/documented/i.test(r.status) ? "documented" : /alleged/i.test(r.status) ? "alleged" : /uncertain/i.test(r.status) ? "uncertain" : null) as LinkStatus })),
    mechanisms: bullets(sectionLines(md, /^Mechanisms and Consequences/i)).map(plain), hard: rowsOf(md, /^Hard-Power Dimension/i, { category: /category/, relevance: /relevance/, consequences: /consequence/ }),
    impact: rowsOf(md, /^Impact Pathway/i, { id: /^id/, horizon: /horizon/, consequence: /consequence/, parents: /parent/, domain: /domain/, evidence: /evidence/, confidence: /confidence/ }).filter((r) => /^[A-Za-z]{1,3}\d{1,2}$/.test(plain(r.id).trim())).map((r) => ({ ...r, id: plain(r.id).trim().toUpperCase(), parents: ids(plain(r.parents)), confidence: confidenceOf(plain(r.confidence)) })),
    options: rowsOf(md, /^Lawful Resilience/i, { option: /option/, mechanism: /mechanism/, consent: /consent|authority/, rights: /rights/, exit: /exit/ }), indicators: bullets(sectionLines(md, /^Indicators and What/i)).map(plain), unresolved: bullets(sectionLines(md, /^Unresolved/i)).map(plain),
  };
}
export type BriefParsed = { title: string; line: string; header: { field: string; value: string }[]; changed: { date: string; text: string; source: string }[]; why: { development: string; effect: string; direction: "raises" | "lowers" | "neutral" | "unclear" | null; size: "high" | "medium" | "low" | null }[]; watch: { signpost: string; threshold: string; where: string; response: string }[]; escalation: { raised: boolean; reason: string } };
export function parseBrief(md: string): BriefParsed {
  const esc = sectionLines(md, /^Escalation Flag/i).join(" "); const m = /\*\*Escalation flag:?\*\*:?\s*(.*)/i.exec(esc); const t = plain(m?.[1] ?? esc).trim(); const raised = /^raised/i.test(t);
  return {
    title: /^# (.*)$/m.exec(md)?.[1].trim() ?? "", line: plain(md.split("\n").slice(0, 8).find((l) => /prepared for/i.test(l)) ?? ""), header: rowsOf(md, /^Header/i, { field: /field/, value: /value/ }),
    changed: rowsOf(md, /^What Changed/i, { date: /date/, text: /development/, source: /source/ }).filter((r) => !/^no material/i.test(plain(r.text))),
    why: rowsOf(md, /^Why It Matters/i, { development: /development/, effect: /effect/, direction: /direction/, size: /size/ }).map((r) => ({ ...r, direction: /^raise/i.test(r.direction) ? "raises" as const : /^lower/i.test(r.direction) ? "lowers" as const : /^neutral/i.test(r.direction) ? "neutral" as const : /^unclear/i.test(r.direction) ? "unclear" as const : null, size: /high/i.test(r.size) ? "high" as const : /medium/i.test(r.size) ? "medium" as const : /low/i.test(r.size) ? "low" as const : null })),
    watch: rowsOf(md, /^Recommended Watch/i, { signpost: /signpost/, threshold: /threshold/, where: /where/, response: /response/ }), escalation: { raised, reason: raised ? t.replace(/^raised:?\s*/i, "") : t.replace(/^none\.?\s*/i, "") },
  };
}
export { bandOf };
