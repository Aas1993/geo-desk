import { bandOf, confidenceOf, plain, type Band, type Level } from "../visual";
import { CRITERIA, type Criterion, type Scored } from "./mca";

// Readers for the Scenario Lab and Red Team documents: the browser draws their tables (outcome graph, options analyzer, hypotheses) with no further model call.
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);
function section(md: string, title: RegExp): string[] {
  const out: string[] = []; let on = false; for (const l of md.split("\n")) { const h = /^(#{1,3}) (.*)$/.exec(l); if (h) { if (on) break; if (h[1].length >= 2 && title.test(h[2])) on = true; } else if (on) out.push(l); } return out;
}
function table(lines: string[]): { head: string[]; rows: string[][] } {
  const t = lines.filter((l) => l.trim().startsWith("|")); if (t.length < 2) return { head: [], rows: [] };
  return { head: cells(t[0]).map((c) => plain(c).toLowerCase()), rows: t.slice(1).filter((l) => !isRule(l)).map(cells) };
}
const col = (head: string[], re: RegExp, d: number) => { const i = head.findIndex((h) => re.test(h)); return i >= 0 ? i : d; };
const level = (s: string): Level => (/\bhigh\b/i.test(s) ? "high" : /\bmedium|moderate\b/i.test(s) ? "medium" : /\blow\b/i.test(s) ? "low" : null);
const labelled = (lines: string[], label: RegExp) => { for (const l of lines) { const m = new RegExp(`\\*\\*(?:${label.source})[:.]?\\*\\*[:.]?\\s*(.*)$`, "i").exec(l.replace(/^\s*[-*•]\s+/, "")); if (m) return plain(m[1]); } return ""; };

export type LabNode = { id: string; parents: string[]; text: string; mechanism: string; order: 1 | 2 | 3; horizon: string; interest: string; band: Band | null; impact: Level; impactText: string; confidence: "high" | "moderate" | "low" | null; evidence: string; indicator: string };
export type LabVariant = { name: string; differs: string; band: Band | null; exposure: string; signpost: string };
export type LabParsed = { title: string; bottom: string; scope: string; assumptions: { text: string; value: string; basis: string; sensitivity: Level }[]; nodes: LabNode[]; variants: LabVariant[]; exposure: { interest: string; kind: string; level: Level; evidence: string; protection: string }[]; options: { name: string; what: string; owner: string; time: string; cost: string; risk: string; reversibility: string }[]; scored: Scored[]; reasons: string[]; memo: string; signposts: { text: string; threshold: string; toward: string; response: string }[]; feedback: string };

export function parseLab(md: string): LabParsed {
  const title = /^#\s+(.*)$/m.exec(md)?.[1] ?? ""; const def = section(md, /^Scenario Definition/i);
  const as = table(section(md, /^Baseline Assumptions/i)); const og = table(section(md, /^Outcome Graph/i)); const sc = table(section(md, /^Scenario Comparison/i)); const ux = table(section(md, /^UAE Exposure/i)); const po = table(section(md, /^Policy Options/i)); const os = table(section(md, /^Option Scores/i)); const sg = table(section(md, /^Signposts/i));
  const ogLines = section(md, /^Outcome Graph/i);
  const nodes: LabNode[] = []; if (og.rows.length) { const cid = col(og.head, /^id/, 0), cp = col(og.head, /parent/, 1), co = col(og.head, /^outcome/, 2), cm = col(og.head, /mechanism/, 3), cd = col(og.head, /^order/, 4), ch = col(og.head, /horizon/, 5), ci = col(og.head, /interest/, 6), cl = col(og.head, /plausib/, 7), cim = col(og.head, /^impact/, 8), cc = col(og.head, /confidence/, 9), ce = col(og.head, /evidence/, 10), cn = col(og.head, /indicator/, 11);
    for (const r of og.rows.slice(0, 18)) { const id = plain(r[cid] ?? "").toUpperCase().replace(/\s+/g, ""); if (!id) continue; const ord = /([123])/.exec(plain(r[cd] ?? ""))?.[1]; nodes.push({ id, parents: (plain(r[cp] ?? "").toUpperCase().match(/N\d+/g) ?? []).filter((p) => p !== id), text: plain(r[co] ?? "").slice(0, 200), mechanism: plain(r[cm] ?? "").slice(0, 200), order: (ord ? +ord : 1) as 1 | 2 | 3, horizon: plain(r[ch] ?? "").slice(0, 30), interest: plain(r[ci] ?? "").slice(0, 60), band: bandOf(r[cl] ?? ""), impact: level(r[cim] ?? ""), impactText: plain(r[cim] ?? "").slice(0, 120), confidence: confidenceOf(r[cc] ?? ""), evidence: plain(r[ce] ?? "").slice(0, 120), indicator: plain(r[cn] ?? "").slice(0, 160) }); } }
  const known = new Set(nodes.map((n) => n.id)); for (const n of nodes) n.parents = n.parents.filter((p) => known.has(p));
  const scored: Scored[] = []; const reasons: string[] = []; if (os.rows.length) { const idx = Object.fromEntries(CRITERIA.map((c) => [c, col(os.head, c === "benefit" ? /benefit/ : c === "cost" ? /cost/ : c === "diplomatic" ? /diplomatic/ : c === "security" ? /security/ : c === "feasibility" ? /feasib/ : /risk/, -1)])) as Record<Criterion, number>; const cr = col(os.head, /reason/, -1);
    for (const r of os.rows.slice(0, 8)) { const s: Partial<Record<Criterion, number>> = {}; for (const c of CRITERIA) { const v = idx[c] >= 0 ? /([1-5])/.exec(plain(r[idx[c]] ?? ""))?.[1] : undefined; if (v) s[c] = +v; } const name = plain(r[0] ?? ""); if (name) { scored.push({ name, scores: s }); reasons.push(cr >= 0 ? plain(r[cr] ?? "") : ""); } } }
  return {
    title, bottom: labelled(def, /Bottom line/), scope: plain(def.filter((l) => l.trim() && !/^\s*\*\*Bottom/i.test(l)).join(" ")).slice(0, 600),
    assumptions: as.rows.slice(0, 8).map((r) => ({ text: plain(r[0] ?? ""), value: plain(r[col(as.head, /value/, 1)] ?? ""), basis: plain(r[col(as.head, /basis/, 2)] ?? "").slice(0, 120), sensitivity: level(r[col(as.head, /sensitiv/, 3)] ?? "") })).filter((a) => a.text),
    nodes, feedback: plain(ogLines.filter((l) => !l.trim().startsWith("|") && l.trim()).join(" ")).slice(0, 500),
    variants: sc.rows.slice(0, 4).map((r) => ({ name: plain(r[0] ?? ""), differs: plain(r[col(sc.head, /differs/, 1)] ?? "").slice(0, 200), band: bandOf(r[col(sc.head, /plausib/, 2)] ?? ""), exposure: plain(r[col(sc.head, /exposure/, 3)] ?? "").slice(0, 220), signpost: plain(r[col(sc.head, /signpost/, 4)] ?? "").slice(0, 160) })).filter((v) => v.name),
    exposure: ux.rows.slice(0, 15).map((r) => ({ interest: plain(r[0] ?? ""), kind: plain(r[col(ux.head, /direct/, 1)] ?? ""), level: level(r[col(ux.head, /^exposure/, 2)] ?? ""), evidence: plain(r[col(ux.head, /evidence/, 3)] ?? "").slice(0, 160), protection: plain(r[col(ux.head, /protect/, 4)] ?? "").slice(0, 160) })).filter((x) => x.interest),
    options: po.rows.slice(0, 8).map((r) => ({ name: plain(r[0] ?? ""), what: plain(r[col(po.head, /what/, 1)] ?? "").slice(0, 220), owner: plain(r[col(po.head, /owner/, 2)] ?? "").slice(0, 80), time: plain(r[col(po.head, /time/, 3)] ?? "").slice(0, 60), cost: plain(r[col(po.head, /cost/, 4)] ?? "").slice(0, 80), risk: plain(r[col(po.head, /risk/, 5)] ?? "").slice(0, 160), reversibility: plain(r[col(po.head, /revers/, 6)] ?? "").slice(0, 60) })).filter((o) => o.name),
    scored, reasons, memo: plain(section(md, /^Decision Memo/i).join(" ")).slice(0, 1800),
    signposts: sg.rows.slice(0, 10).map((r) => ({ text: plain(r[0] ?? ""), threshold: plain(r[col(sg.head, /threshold|date/, 1)] ?? "").slice(0, 100), toward: plain(r[col(sg.head, /shifts|toward/, 2)] ?? "").slice(0, 60), response: plain(r[col(sg.head, /response/, 3)] ?? "").slice(0, 160) })).filter((x) => x.text),
  };
}

export type RedParsed = { title: string; verdict: string; overall: "holds" | "holds-with-changes" | "does-not-hold" | null; competing: string; hypotheses: { name: string; forText: string; against: string; diagnostic: string; verdict: string }[]; changes: { original: string; challenge: string; evidence: string; change: "keep" | "soften" | "reverse" | "caveat" | null }[]; actors: { actor: string; view: string; evidence: string; effect: string }[]; checks: { claim: string; verdict: "confirmed" | "disputed" | "unverifiable" | "stale" | null; source: string }[]; dissent: string };
export function parseRedTeam(md: string): RedParsed {
  const title = /^#\s+(.*)$/m.exec(md)?.[1] ?? ""; const vd = section(md, /^Verdict/i); const o = labelled(vd, /Overall/); const hy = table(section(md, /^Competing Hypotheses/i)); const ch = table(section(md, /^Judgments to Change/i)); const ac = table(section(md, /^Omitted Actors/i)); const ck = table(section(md, /^Checks Against/i));
  return {
    title, verdict: plain(vd.filter((l) => l.trim() && !/^\s*\*\*Overall/i.test(l)).join(" ")).slice(0, 900), overall: /does not hold/i.test(o) ? "does-not-hold" : /changes/i.test(o) ? "holds-with-changes" : /holds/i.test(o) ? "holds" : null, competing: plain(section(md, /^Strongest Competing/i).join(" ")).slice(0, 1200),
    hypotheses: hy.rows.slice(0, 5).map((r) => ({ name: plain(r[0] ?? ""), forText: plain(r[1] ?? "").slice(0, 220), against: plain(r[2] ?? "").slice(0, 220), diagnostic: plain(r[3] ?? "").slice(0, 200), verdict: plain(r[4] ?? "") })).filter((h) => h.name),
    changes: ch.rows.slice(0, 10).map((r) => { const c = plain(r[3] ?? ""); return { original: plain(r[0] ?? "").slice(0, 220), challenge: plain(r[1] ?? "").slice(0, 240), evidence: plain(r[2] ?? "").slice(0, 200), change: /reverse/i.test(c) ? "reverse" as const : /soften/i.test(c) ? "soften" as const : /caveat/i.test(c) ? "caveat" as const : /keep/i.test(c) ? "keep" as const : null }; }).filter((x) => x.original),
    actors: ac.rows.slice(0, 8).map((r) => ({ actor: plain(r[0] ?? ""), view: plain(r[1] ?? "").slice(0, 220), evidence: plain(r[2] ?? "").slice(0, 200), effect: plain(r[3] ?? "").slice(0, 200) })).filter((a) => a.actor),
    checks: ck.rows.slice(0, 12).map((r) => { const v = plain(r[1] ?? ""); return { claim: plain(r[0] ?? "").slice(0, 220), verdict: /disputed/i.test(v) ? "disputed" as const : /unverifiable/i.test(v) ? "unverifiable" as const : /stale/i.test(v) ? "stale" as const : /confirmed/i.test(v) ? "confirmed" as const : null, source: plain(r[2] ?? "").slice(0, 120) }; }).filter((x) => x.claim),
    dissent: plain(section(md, /^Unresolved Dissent/i).join(" ")).slice(0, 900),
  };
}
