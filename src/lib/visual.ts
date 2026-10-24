// Pure helpers behind the illustrated view of a brief: they read the markdown a briefing already contains (BLUF, key judgments, the play, tripwires, decisions) and turn it into the shapes the visual cards draw.
// No model is called: the illustrated part costs nothing extra.
import { INSTRUMENT_KEYS } from "./statecraft";

/** The estimative likelihood bands of the tradecraft rules, with the midpoint each one is drawn at. Longest phrases first so "very likely" is not read as "likely". */
export const LIKELIHOOD = [
  { re: /almost no chance/i, label: "Almost no chance", pct: 3 }, { re: /very unlikely/i, label: "Very unlikely", pct: 12 }, { re: /roughly even/i, label: "Roughly even chance", pct: 50 },
  { re: /almost certain/i, label: "Almost certain", pct: 97 }, { re: /very likely/i, label: "Very likely", pct: 88 }, { re: /unlikely/i, label: "Unlikely", pct: 32 }, { re: /likely/i, label: "Likely", pct: 68 },
] as const;
export const bandOf = (text: string): { label: string; pct: number } | null => { for (const b of LIKELIHOOD) if (b.re.test(text)) return { label: b.label, pct: b.pct }; return null; };
export const confidenceOf = (text: string): "high" | "moderate" | "low" | null => (/\bhigh\b/i.test(text) ? "high" : /\bmoderate|medium\b/i.test(text) ? "moderate" : /\blow\b/i.test(text) ? "low" : null);

/** Plain text for a card: links reduced to their text, emphasis and fact ids removed, spaces tidied. */
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1").replace(/\[(?:F\d+(?:\s*[,–-]\s*F?\d+)*|Desk|unverified reference[^\]]*)\]/g, "").replace(/[*_`]+/g, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);
const tagsIn = (s: string) => INSTRUMENT_KEYS.filter((k) => new RegExp(`\\b${k}\\b`, "i").test(s));

export type Judgment = { text: string; band: { label: string; pct: number } | null; confidence: "high" | "moderate" | "low" | null; so: string };
export type Move = { text: string; tags: string[]; when?: string };
export type Parsed = { bluf: string; judgments: Judgment[]; moves: Move[]; signals: string[]; decisions: string[] };

/** The lines of one "## " section (matched by a regex on its title), up to the next heading of the same or higher level. */
function section(md: string, title: RegExp): string[] {
  const lines = md.split("\n"); const out: string[] = []; let on = false;
  for (const l of lines) {
    const h = /^(#{1,2}) (.*)$/.exec(l);
    if (h) { if (on) break; if (h[1] === "##" && title.test(h[2])) { on = true; continue; } }
    else if (on) out.push(l);
  }
  return out;
}
const tableRows = (lines: string[]): { head: string[]; rows: string[][] } => { const t = lines.filter((l) => l.trim().startsWith("|")); if (t.length < 2) return { head: [], rows: [] }; return { head: cells(t[0]).map((c) => plain(c).toLowerCase()), rows: t.slice(1).filter((l) => !isRule(l)).map(cells) }; };
const bullets = (lines: string[]) => lines.filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l)).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""));

export function parseBrief(md: string): Parsed {
  const out: Parsed = { bluf: "", judgments: [], moves: [], signals: [], decisions: [] };
  out.bluf = plain(section(md, /^BLUF/i).join(" ")).slice(0, 700);
  if (!out.bluf) { const l = md.split("\n").find((x) => /^\s*(?:[-*]\s*)?\*\*BLUF/i.test(x)); if (l) out.bluf = plain(l.replace(/^\s*(?:[-*]\s*)?\*\*BLUF[.:]?\*\*:?/i, "")).slice(0, 700); }
  const kj = tableRows(section(md, /^Key Judgments/i)); const col = (re: RegExp) => kj.head.findIndex((h) => re.test(h));
  const cj = Math.max(0, col(/judge/)), cl = col(/likelihood/), cc = col(/confidence/), cs = col(/so what/);
  for (const r of kj.rows.slice(0, 8)) { const text = plain(r[cj] ?? ""); if (!text) continue; out.judgments.push({ text, band: bandOf(r[cl] ?? r[cj] ?? ""), confidence: confidenceOf(r[cc] ?? ""), so: plain(cs >= 0 ? r[cs] ?? "" : "") }); }
  if (!out.judgments.length) for (const l of md.split("\n")) { const m = /^\s*\d+[.)]\s+(We judge[^]*)$/i.exec(l); if (m && out.judgments.length < 6) out.judgments.push({ text: plain(m[1]).slice(0, 260), band: bandOf(m[1]), confidence: confidenceOf(/confidence (?:is )?(\w+)/i.exec(m[1])?.[1] ?? ""), so: "" }); }
  // the play: a numbered list or a table under "The UAE Play" (after "Recommended play" when there is one) or under "The Play"
  const play = [...section(md, /^The UAE Play/i), ...section(md, /^The Play\b/i)]; const at = play.findIndex((l) => /recommended play/i.test(l)); const body = at >= 0 ? play.slice(at + 1) : play;
  const t = tableRows(body.slice(0, 40)); const stop = body.findIndex((l, i) => i > 2 && /^\*\*\(?[a-g]\)/i.test(l.trim()) && !/recommended play/i.test(l));
  const scoped = stop > 0 ? body.slice(0, stop) : body;
  if (t.rows.length) { const ti = t.head.findIndex((h) => /^move|^action|^step/.test(h)); const tg = t.head.findIndex((h) => /tag|instrument/.test(h)); const wi = t.head.findIndex((h) => /window|timing|when/.test(h)); for (const r of tableRows(scoped).rows.slice(0, 6)) { const text = plain(r[Math.max(0, ti)] ?? ""); if (text) out.moves.push({ text: text.slice(0, 200), tags: tagsIn(tg >= 0 ? r[tg] ?? "" : r.join(" ")), when: wi >= 0 ? plain(r[wi] ?? "").slice(0, 60) : undefined }); } }
  if (!out.moves.length) for (const b of bullets(scoped).slice(0, 6)) {
    const m = /^\*\*(.+?)\*\*[:.]?\s*(.*)$/.exec(b); const title = plain(m ? m[1] : b).replace(/^\d+[.)]\s*/, ""); const rest = m ? m[2] : "";
    const tagTxt = /Tags?:\s*([^.]*)/i.exec(rest)?.[1]; const when = /(?:Timing|Window|When):\s*([^.]*)/i.exec(rest)?.[1]; const outcome = /Outcome:\s*([^.]*)/i.exec(rest)?.[1];
    const onlyTags = !!m && tagsIn(m[1]).length > 0 && /^[a-z/, ]+(\([^)]*\))?:?$/i.test(m[1].trim()); const text = plain(m && (tagTxt || when || outcome) ? `${title.replace(/[.:\s]+$/, "")}${outcome ? `: ${outcome}` : ""}` : onlyTags ? rest : m ? `${m[1]} ${rest}` : b);
    out.moves.push({ text: text.slice(0, 200), tags: tagsIn(tagTxt ?? (m ? m[1] : b.slice(0, 80))), when: when ? plain(when).slice(0, 60) : /\(([^)]+)\)/.exec(m?.[1] ?? "")?.[1] });
  }
  if (!out.moves.length) { const hm = section(md, /How to Move Them/i); const ht = tableRows(hm); const items = ht.rows.length ? ht.rows.map((r) => r[0] ?? "") : bullets(hm.filter((l) => !/^\s/.test(l))); for (const x of items.slice(0, 5)) { const m = /^\*\*(.+?)\*\*[:.]?\s*(.*)$/.exec(x); out.moves.push({ text: plain(m ? `${m[1]}${m[2] ? `: ${m[2]}` : ""}` : x).slice(0, 200), tags: tagsIn(x) }); } }
  // tripwires and warning signs: a section named for them, or the "Tripwires" line in the red-team block
  const sig = [...section(md, /tripwire|indicators and warning|warning|watchlist|signals to watch/i)]; const tw = md.split("\n").findIndex((l) => /^\s*[-*]\s*\*\*Tripwires/i.test(l));
  const fromLine = tw >= 0 ? [plain(md.split("\n")[tw].replace(/^\s*[-*]\s*\*\*Tripwires:?\*\*:?/i, ""))] : [];
  const sigT = tableRows(sig); const sigRows = sigT.rows.map((r) => plain(r[0] ?? "")).filter(Boolean);
  out.signals = [...bullets(sig).map(plain), ...sigRows, ...fromLine].filter((s) => s.length > 3).slice(0, 6).map((s) => s.slice(0, 220));
  const dec = section(md, /Decision/i).length ? section(md, /Decision/i) : section(md, /Need to Decide/i); const dt = tableRows(dec);
  out.decisions = (dt.rows.length ? dt.rows.map((r) => plain(r[1] ?? r[0] ?? "")) : bullets(dec).map(plain)).filter(Boolean).slice(0, 4).map((s) => s.slice(0, 220));
  return out;
}
