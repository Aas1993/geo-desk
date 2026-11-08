import { plain } from "../visual";
import { SEATS } from "./seats";
import { labelled, parseStrategy, rowsOf, sectionLines, type StratParsed } from "./strategy-parse";

// Reader for the Strategy Council document: the Chair's Final Council Strategy, nineteen seat reports, the Independent Challenger's dissent and the Evidence Verifier's audit.
export type SeatReport = { id: string | null; name: string; insight: string; indicators: { indicator: string; reading: string; evidence: string }[]; report: string; instrument: string; limits: string };
export type SCouncilParsed = {
  chair: StratParsed; reading: string; amendments: { amendment: string; missed: string; seats: string; effect: string }[]; disagreements: { issue: string; a: string; b: string; seats: string; resolve: string }[]; open: string[];
  seats: SeatReport[]; dissent: { seat: string; assumption: string; why: string; evidence: string; effect: string }[]; dissenting: string; competing: string;
  audit: { claim: string; seat: string; verdict: "confirmed" | "disputed" | "unverifiable" | "stale" | null; evidence: string; note: string }[]; gaps: string[]; sourceQuality: string[];
};
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);
const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/\bseat\b/g, "").replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
/** The seat a heading names: matched on the seat's English name without its brackets and the word seat, so "Logistics and Corridor seat (Silk Road Desk)" and "Logistics and Corridor" both resolve. */
export const seatIdOf = (name: string) => { const n = norm(name); return SEATS.find((s) => norm(s.en) === n)?.id ?? SEATS.find((s) => n.includes(norm(s.en)) || norm(s.en).includes(n))?.id ?? null; };
export function seatReports(md: string): SeatReport[] {
  const out: SeatReport[] = []; const lines = md.split("\n"); let cur: { name: string; lines: string[] } | null = null; const flush = () => { if (!cur) return; const L = cur.lines; const tab = L.filter((l) => l.trim().startsWith("|")); const rows = tab.slice(1).filter((l) => !isRule(l)).map(cells);
    out.push({ id: seatIdOf(cur.name), name: plain(cur.name), insight: plain(labelled(L, /insight/i)), indicators: rows.filter((r) => !/^none owned$/i.test(plain(r[0] ?? ""))).map((r) => ({ indicator: plain(r[0] ?? ""), reading: plain(r[1] ?? ""), evidence: r[2] ?? "" })), report: labelled(L, /report/i), instrument: plain(labelled(L, /recommended instrument/i)), limits: plain(labelled(L, /limits/i)) }); cur = null; };
  for (const l of lines) { const h = /^#{3} Seat:\s*(.*)$/i.exec(l); if (h) { flush(); cur = { name: h[1].trim(), lines: [] }; continue; } if (cur && /^#{1,2} /.test(l)) { flush(); continue; } if (cur) cur.lines.push(l); }
  flush(); return out;
}
export function parseSCouncil(md: string): SCouncilParsed {
  const head = md.split(/^# Appendix: Seat Reports/m)[0]; const chair = parseStrategy(head); const tail = md.slice(md.indexOf("# Appendix: Seat Reports") >= 0 ? md.indexOf("# Appendix: Seat Reports") : md.length);
  const verdict = (s: string) => (/^confirmed/i.test(plain(s)) ? "confirmed" as const : /^disputed/i.test(plain(s)) ? "disputed" as const : /^unverifiable/i.test(plain(s)) ? "unverifiable" as const : /^stale/i.test(plain(s)) ? "stale" as const : null);
  const bullets = (lines: string[]) => lines.filter((l) => /^\s*[-*•]\s+/.test(l)).map((l) => plain(l.replace(/^\s*[-*•]\s+/, "")));
  const reading = sectionLines(head, /^Council Reading/i).filter((l) => l.trim() && !/\*\*bottom line/i.test(l)).join(" ").trim();
  return {
    chair: { ...chair, bottom: chair.bottom || plain(labelled(sectionLines(head, /^Council Reading/i), /bottom line/i)) }, reading: plain(reading),
    amendments: rowsOf(head, /^Amendments the Council/i, { amendment: /amendment/, missed: /missed/, seats: /seat/, effect: /effect/ }), disagreements: rowsOf(head, /^Where the Council Disagrees/i, { issue: /issue/, a: /position a/, b: /position b/, seats: /seat/, resolve: /resolve/ }), open: bullets(sectionLines(head, /^Open Items/i)),
    seats: seatReports(tail),
    dissent: rowsOf(tail, /^Dissent/i, { seat: /seat/, assumption: /assumption/, why: /why/, evidence: /evidence/, effect: /effect/ }), dissenting: plain(labelled(sectionLines(tail, /^Dissent/i), /dissenting finding/i)), competing: plain(labelled(sectionLines(tail, /^Dissent/i), /strongest competing/i)),
    audit: rowsOf(tail, /^Claim Audit/i, { claim: /claim/, seat: /seat/, verdict: /verdict/, evidence: /evidence|source/, note: /note/ }).map((r) => ({ ...r, verdict: verdict(r.verdict) })), gaps: bullets(sectionLines(tail, /^Open Gaps/i)), sourceQuality: bullets(sectionLines(tail, /^Source Quality/i)),
  };
}
