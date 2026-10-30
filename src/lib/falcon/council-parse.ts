import { bandOf, confidenceOf, plain, type Band } from "../visual";

// Readers for the council document: the editor's assessment, each agent's own text, the red-team challenges and the verifier's claim audit.
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); const isRule = (l: string) => /^\s*\|?\s*:?-{2,}/.test(l);
function section(md: string, title: RegExp): string[] { const out: string[] = []; let on = false; for (const l of md.split("\n")) { const h = /^(#{1,3}) (.*)$/.exec(l); if (h) { if (on) break; if (h[1].length >= 2 && title.test(h[2])) on = true; } else if (on) out.push(l); } return out; }
function table(lines: string[]) { const t = lines.filter((l) => l.trim().startsWith("|")); if (t.length < 2) return { head: [] as string[], rows: [] as string[][] }; return { head: cells(t[0]).map((c) => plain(c).toLowerCase()), rows: t.slice(1).filter((l) => !isRule(l)).map(cells) }; }
const col = (h: string[], re: RegExp, d: number) => { const i = h.findIndex((x) => re.test(x)); return i >= 0 ? i : d; };
const bullets = (lines: string[]) => lines.filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l)).map((l) => plain(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")));
export type RtStatus = "survived" | "softened" | "reversed" | "untested";
export type CouncilParsed = {
  title: string; editorMd: string; bluf: string; judgments: { text: string; band: Band | null; confidence: "high" | "moderate" | "low" | null; agents: string; status: RtStatus | null; so: string }[]; agrees: string[];
  disagreements: { issue: string; a: string; b: string; evidence: string; resolve: string }[]; items: { item: string; type: string; size: string; feas: string; horizon: string; step: string }[]; options: { option: string; window: string; benefit: string; risk: string; owner: string }[];
  verification: string; unresolved: string; agents: { id: string; name: string; text: string }[];
  audit: { claim: string; agent: string; verdict: "confirmed" | "disputed" | "unverifiable" | "stale" | null; evidence: string; note: string }[]; challenges: { judgment: string; agent: string; challenge: string; evidence: string; change: string }[];
  /** The scenarios and signposts section of the assessment, when it is written as bullets or a table: a weight is read only when the text states a percentage. */
  scenarios: CouncilScenario[]; signposts: string[];
};
export type CouncilScenario = { code: string; name: string; weight: number | null; wildcard: boolean; text: string };
/** Scenarios written as `- **S1, Name (50%).** text` bullets (or a table with a scenario column); nothing is invented when the section is shaped otherwise. */
export function councilScenarios(ed: string): { scenarios: CouncilScenario[]; signposts: string[] } {
  const lines = section(ed, /^Scenarios/i); const out: CouncilScenario[] = [];
  const mk = (head: string, text: string, w?: string): CouncilScenario => { const h = plain(head); const wc = /wildcard|disruptive|^W\b/i.test(h); const wm = /\((\d{1,3})\s*(?:%|percent)\)/.exec(h) ?? (w ? /(\d{1,3})\s*(?:%|percent)?/.exec(plain(w)) : null); const code = /^(S\d+|W\d*)\b/i.exec(h)?.[1].toUpperCase() ?? (wc ? "W" : `S${out.length + 1}`);
    const name = h.replace(/^(?:S\d+|W\d*)\b\s*[:.,\-–—]?\s*/i, "").replace(/\(\s*\d{1,3}\s*(?:%|percent)\s*\)/, "").replace(/[\s.:,;]+$/, "").trim(); return { code, name: name || h, weight: wc || !wm ? null : Math.min(100, +wm[1]), wildcard: wc, text: plain(text) }; };
  for (const l of lines) { const m = /^\s*[-*•]\s+(.*)$/.exec(l); if (!m) continue; const b = /^\*\*(.+?)\*\*\s*(.*)$/.exec(m[1]); if (b) out.push(mk(b[1], b[2])); }
  if (!out.length) { const t = table(lines); const cw = t.head.findIndex((h) => /weight|probab|likelihood/.test(h)); const cd = t.head.findIndex((h) => /describ|looks|implication|summary/.test(h)); for (const r of t.rows.slice(0, 6)) if (r[0]) out.push(mk(r[0], cd >= 0 ? r[cd] ?? "" : r.slice(1).join(" "), cw >= 0 ? r[cw] : undefined)); }
  return { scenarios: out.slice(0, 6), signposts: lines.filter((l) => /^\s*\d+[.)]\s+/.test(l)).map((l) => plain(l.replace(/^\s*\d+[.)]\s+/, ""))).slice(0, 10) };
}
export function parseCouncil(md: string): CouncilParsed {
  const cut = md.search(/^# Appendix: Agent Reports/m); const ed = cut >= 0 ? md.slice(0, cut) : md; const app = cut >= 0 ? md.slice(cut) : "";
  const agents = [...app.matchAll(/^## Agent: (.*?) \((\w+)\)\n([\s\S]*?)(?=^## Agent: |\s*$(?![\s\S]))/gm)].map((m) => ({ id: m[2], name: m[1], text: m[3].trim() }));
  const text = (id: string) => agents.find((a) => a.id === id)?.text ?? "";
  const kj = table(section(ed, /^Key Judgments/i)); const dis = table(section(ed, /^Preserved Disagreements/i)); const im = table(section(ed, /^UAE Impact/i)); const op = table(section(ed, /^Options for Decision/i)); const au = table(section(text("verifier"), /^Claim Audit/i)); const ch = table(section(text("redteam"), /^Challenges/i));
  const sc = councilScenarios(ed);
  return {
    scenarios: sc.scenarios, signposts: sc.signposts, title: /^#\s+(.*)$/m.exec(ed)?.[1] ?? "", editorMd: ed, bluf: plain(section(ed, /^BLUF/i).join(" ")).slice(0, 900),
    judgments: kj.rows.slice(0, 10).map((r) => { const st = plain(r[col(kj.head, /red/, 5)] ?? ""); return { text: plain(r[col(kj.head, /judge/, 1)] ?? ""), band: bandOf(r[col(kj.head, /likelihood/, 2)] ?? ""), confidence: confidenceOf(r[col(kj.head, /confidence/, 3)] ?? ""), agents: plain(r[col(kj.head, /agent/, 4)] ?? "").slice(0, 60), status: /survived/i.test(st) ? "survived" as const : /soften/i.test(st) ? "softened" as const : /revers/i.test(st) ? "reversed" as const : /untested/i.test(st) ? "untested" as const : null, so: plain(r[col(kj.head, /so what/, 6)] ?? "").slice(0, 240) }; }).filter((j) => j.text),
    agrees: bullets(section(ed, /^Where the Council Agrees/i)).slice(0, 5),
    disagreements: dis.rows.slice(0, 8).map((r) => ({ issue: plain(r[0] ?? ""), a: plain(r[col(dis.head, /position a/, 1)] ?? "").slice(0, 260), b: plain(r[col(dis.head, /position b/, 2)] ?? "").slice(0, 260), evidence: plain(r[col(dis.head, /evidence/, 3)] ?? "").slice(0, 200), resolve: plain(r[col(dis.head, /resolve/, 4)] ?? "").slice(0, 200) })).filter((d) => d.issue),
    items: im.rows.slice(0, 10).map((r) => ({ item: plain(r[0] ?? ""), type: plain(r[col(im.head, /type/, 1)] ?? ""), size: plain(r[col(im.head, /size/, 2)] ?? ""), feas: plain(r[col(im.head, /feasib/, 3)] ?? ""), horizon: plain(r[col(im.head, /horizon/, 4)] ?? ""), step: plain(r[col(im.head, /step/, 5)] ?? "").slice(0, 200) })).filter((x) => x.item),
    options: op.rows.slice(0, 8).map((r) => ({ option: plain(r[0] ?? ""), window: plain(r[col(op.head, /window/, 1)] ?? ""), benefit: plain(r[col(op.head, /benefit/, 2)] ?? "").slice(0, 200), risk: plain(r[col(op.head, /risk/, 3)] ?? "").slice(0, 200), owner: plain(r[col(op.head, /owner/, 4)] ?? "") })).filter((x) => x.option),
    verification: plain(section(ed, /^Verification Summary/i).join(" ")).slice(0, 900), unresolved: plain(section(ed, /^Unresolved/i).join(" ")).slice(0, 1200), agents,
    audit: au.rows.slice(0, 14).map((r) => { const v = plain(r[col(au.head, /verdict/, 2)] ?? ""); return { claim: plain(r[0] ?? "").slice(0, 240), agent: plain(r[col(au.head, /agent/, 1)] ?? "").slice(0, 30), verdict: /dispute/i.test(v) ? "disputed" as const : /unverif/i.test(v) ? "unverifiable" as const : /stale/i.test(v) ? "stale" as const : /confirm/i.test(v) ? "confirmed" as const : null, evidence: plain(r[col(au.head, /evidence|source/, 3)] ?? "").slice(0, 160), note: plain(r[col(au.head, /note/, 4)] ?? "").slice(0, 160) }; }).filter((x) => x.claim),
    challenges: ch.rows.slice(0, 10).map((r) => ({ judgment: plain(r[0] ?? "").slice(0, 200), agent: plain(r[col(ch.head, /agent/, 1)] ?? "").slice(0, 30), challenge: plain(r[col(ch.head, /^challenge/, 2)] ?? "").slice(0, 260), evidence: plain(r[col(ch.head, /evidence/, 3)] ?? "").slice(0, 160), change: plain(r[col(ch.head, /change/, 4)] ?? "").slice(0, 40) })).filter((x) => x.judgment),
  };
}
