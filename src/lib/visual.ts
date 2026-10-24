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
  const out: string[] = []; let on = false; let lvl = 0;
  for (const l of md.split("\n")) {
    const h = /^(#{1,3}) (.*)$/.exec(l);
    if (h) { const n = h[1].length; if (on) { if (n <= lvl) break; out.push(l); continue; } if (n >= 2 && title.test(h[2])) { on = true; lvl = n; } }
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

// ---- Foresight products: the matrices and labelled lines the illustrated views draw (A: the report; B: the eight-page ministerial brief) ----
export const DIRECTION_RE = /^(improving|stable|worsening|volatile)\b/i;
export type FsDir = "improving" | "stable" | "worsening" | "volatile";
export type Band = { label: string; pct: number };
export type FsCell = { dir: FsDir | null; band: Band | null; range: boolean; text: string };
export type FsRow = { front: string; h: FsCell[]; confidence: "high" | "moderate" | "low" | null };
export type FsScenario = { code: string; name: string; weight: number | null; wildcard: boolean; drivers: string; looks: string; signposts: string; uae: string };
export type Level = "high" | "medium" | "low" | null;
export type FsOpportunity = { text: string; window: string; works: string[]; tags: string[]; step: string; benefit: Level; feasibility: Level; partners: string; why: string; constraint: string };
export type FsSignpost = { text: string; where: string; threshold: string; toward: string; response: string };
export type FsRisk = { text: string; trigger: string; impact: string; impactLevel: Level; velocity: "fast" | "medium" | "slow" | null; band: Band | null; action: string };
export type FsEffect = "opportunity" | "exposure" | "mixed" | "urgent";
export type FsImpact = { area: string; effect: FsEffect | null; size: Level; horizon: string; why: string };
export type FsOption = { window: "immediate" | "medium" | "long" | null; text: string; decision: string; tradeoff: string; owner: string; tags: string[] };
export type FsChange = { text: string; evidence: string; dir: FsDir | null; when: string; why: string };
export type FsKpi = { label: string; value: string; year: string; dir: FsDir | null; source: string };
export type FsParsed = {
  product: "brief" | "report" | null; title: string; bluf: string; judgments: Judgment[]; situation: { front: string; dir: FsDir | null; text: string }[]; matrix: FsRow[]; horizons: string[]; scenarios: FsScenario[]; opportunities: FsOpportunity[]; signposts: FsSignpost[]; risks: FsRisk[];
  scope: string; outlook: { dir: FsDir | null; band: Band | null; text: string } | null; uae: string; opportunity: string; dashboard: FsKpi[]; changes: FsChange[]; timeline: { date: string; event: string; why: string }[]; forecastPath: { horizon: string; text: string; band: Band | null; confidence: "high" | "moderate" | "low" | null }[];
  mostLikely: string; axes: string; reconciled: string; impact: FsImpact[]; options: FsOption[]; bottom: { know: string; next: string; why: string; advantage: string; decisions: string[]; monitor: string[] }; weak: { signal: string; cls: string; evidence: string; why: string }[]; scores: { score: string; value: number | null; basis: string }[]; ranges: { indicator: string; latest: string; y3: string; y5: string; y10: string }[];
};
const cellOf = (raw: string): FsCell => { const t = plain(raw); const m = DIRECTION_RE.exec(t); return { dir: m ? (m[1].toLowerCase() as FsDir) : null, band: bandOf(t), range: /\(\s*range\s*\)/i.test(t), text: t.replace(DIRECTION_RE, "").replace(/^\s*\([^)]*\)\s*:?\s*/, "").replace(/^[:\s]+/, "") }; };
const colAt = (head: string[], re: RegExp, d: number) => { const i = head.findIndex((h) => re.test(h)); return i >= 0 ? i : d; };
const level = (s: string): Level => (/\bhigh\b/i.test(s) ? "high" : /\bmedium|moderate\b/i.test(s) ? "medium" : /\blow\b/i.test(s) ? "low" : null);
const dirOf = (s: string): FsDir | null => { const m = DIRECTION_RE.exec(plain(s)); return m ? (m[1].toLowerCase() as FsDir) : null; };
const EFFECT_RE = /^(opportunity|exposure|mixed|urgent)\b/i;
/** Every markdown table in a block of lines, with its lower-cased header cells. */
function tablesIn(lines: string[]): { head: string[]; rows: string[][] }[] {
  const out: { head: string[]; rows: string[][] }[] = []; let cur: string[] = [];
  const flush = () => { if (cur.length >= 2) out.push(tableRows(cur)); cur = []; };
  for (const l of lines) { if (l.trim().startsWith("|")) cur.push(l); else flush(); } flush();
  return out.filter((t) => t.rows.length);
}
const tableWith = (lines: string[], re: RegExp) => tablesIn(lines).find((t) => t.head.some((h) => re.test(h)));
/** The text after a bold label such as "**Scope:**" on its line. */
const labelled = (lines: string[], label: RegExp): string => { for (const l of lines) { const m = new RegExp(`\\*\\*(?:${label.source})[:.]?\\*\\*[:.]?\\s*(.*)$`, "i").exec(l.replace(/^\s*[-*•]\s+/, "")); if (m) return plain(m[1]); } return ""; };
const bulletsAfter = (lines: string[], label: RegExp): string[] => { const i = lines.findIndex((l) => new RegExp(`\\*\\*(?:${label.source})`, "i").test(l)); if (i < 0) return []; const out: string[] = []; const first = plain(lines[i].replace(/^.*?\*\*[:.]?\s*/, "").replace(/^.*\*\*\s*/, "")); if (first) out.push(first); for (let j = i + 1; j < lines.length; j++) { const l = lines[j]; if (/^(?:[-*•]\s+)?\*\*/.test(l) || /^#/.test(l)) break; else if (/^\s*[-*•]\s+/.test(l)) out.push(plain(l.replace(/^\s*[-*•]\s+/, ""))); } return out.filter(Boolean); };
const sectionAny = (md: string, ...res: RegExp[]) => { for (const r of res) { const s = section(md, r); if (s.length) return s; } return [] as string[]; };

export function parseForesight(md: string): FsParsed {
  const base = parseBrief(md); const title = /^#\s+(.*)$/m.exec(md)?.[1] ?? "";
  const product: FsParsed["product"] = /Ministerial Executive Foresight Brief/i.test(title) || /^##\s+Page 1\b/m.test(md) ? "brief" : /Strategic Foresight Report|Foresight Dossier/i.test(title) ? "report" : null;
  const out: FsParsed = { product, title, bluf: base.bluf, judgments: base.judgments, situation: [], matrix: [], horizons: [], scenarios: [], opportunities: [], signposts: [], risks: [], scope: "", outlook: null, uae: "", opportunity: "", dashboard: [], changes: [], timeline: [], forecastPath: [], mostLikely: "", axes: "", reconciled: "", impact: [], options: [], bottom: { know: "", next: "", why: "", advantage: "", decisions: [], monitor: [] }, weak: [], scores: [], ranges: [] };
  const P = (n: number) => section(md, new RegExp(`^Page ${n}\\b`, "i")); const p1 = P(1), p2 = P(2), p3 = P(3), p4 = P(4), p5 = P(5), p6 = P(6), p7 = P(7), p8 = P(8);
  // the brief: its first page carries the snapshot, and its key judgments live in the first table
  if (p1.length) {
    out.scope = labelled(p1, /Scope/); const ol = labelled(p1, /Strategic outlook/); if (ol) out.outlook = { dir: dirOf(ol), band: bandOf(ol), text: plain(ol).replace(DIRECTION_RE, "").replace(/^\s*\([^)]*\)\s*:?\s*/, "").trim() };
    out.uae = labelled(p1, /Most important UAE implication/); out.opportunity = labelled(p1, /Most significant opportunity/);
    const kj = tableWith(p1, /judge/); if (kj) { const cj = Math.max(0, colAt(kj.head, /judge/, 1)), cl = colAt(kj.head, /likelihood/, 2), cc = colAt(kj.head, /confidence/, 3), cs = colAt(kj.head, /so what/, 4); out.judgments = kj.rows.slice(0, 6).map((r) => ({ text: plain(r[cj] ?? ""), band: bandOf(r[cl] ?? ""), confidence: confidenceOf(r[cc] ?? ""), so: plain(r[cs] ?? "") })).filter((j) => j.text); }
    const kp = tableWith(p1, /indicator/); if (kp) { const cv = colAt(kp.head, /value/, 1), cy = colAt(kp.head, /year/, 2), cd = colAt(kp.head, /direction/, 3), cs = colAt(kp.head, /source/, 4); out.dashboard = kp.rows.slice(0, 6).map((r) => ({ label: plain(r[0] ?? ""), value: plain(r[cv] ?? ""), year: plain(r[cy] ?? ""), dir: dirOf(r[cd] ?? ""), source: plain(r[cs] ?? "").slice(0, 60) })).filter((k) => k.label && k.value);}
    out.bluf = out.bluf || out.uae;
  }
  if (p2.length) {
    const ch = tableWith(p2, /change/); if (ch) { const ce = colAt(ch.head, /evidence/, 1), cd = colAt(ch.head, /direction/, 2), cw = colAt(ch.head, /when/, 3), cy = colAt(ch.head, /matters|why/, 4); out.changes = ch.rows.slice(0, 6).map((r) => ({ text: plain(r[0] ?? "").slice(0, 200), evidence: plain(r[ce] ?? "").slice(0, 260), dir: dirOf(r[cd] ?? ""), when: plain(r[cw] ?? "").slice(0, 40), why: plain(r[cy] ?? "").slice(0, 240) })).filter((c) => c.text); }
    const tl = tableWith(p2, /^date/); if (tl) out.timeline = tl.rows.slice(0, 7).map((r) => ({ date: plain(r[0] ?? ""), event: plain(r[1] ?? "").slice(0, 160), why: plain(r[2] ?? "").slice(0, 160) })).filter((t) => t.event);
  }
  if (p3.length) {
    out.mostLikely = labelled(p3, /Most likely direction/); out.axes = labelled(p3, /Axes/);
    const fp = tableWith(p3, /^horizon/); if (fp) out.forecastPath = fp.rows.slice(0, 6).map((r) => ({ horizon: plain(r[0] ?? ""), text: plain(r[1] ?? "").slice(0, 200), band: bandOf(r[colAt(fp.head, /likelihood/, 2)] ?? ""), confidence: confidenceOf(r[colAt(fp.head, /confidence/, 3)] ?? "") })).filter((f) => f.text);
  }
  const SC = tableWith(p3.length ? p3 : sectionAny(md, /^Scenarios to/i), /^scenario/);
  if (SC) { const cw = colAt(SC.head, /weight/, 1), cd = SC.head.findIndex((h) => /drivers/.test(h)), cl = colAt(SC.head, /look/, 2), cs = colAt(SC.head, /signpost/, 3), cu = colAt(SC.head, /uae/, 4);
    for (const r of SC.rows.slice(0, 5)) { const name = plain(r[0] ?? ""); const wc = /wildcard|disruptive|^W\b/i.test(name); const w = /(\d{1,3})\s*(?:%|percent)?/.exec(plain(r[cw] ?? "")); const code = /^(S\d|W)\b/i.exec(name)?.[1].toUpperCase() ?? (wc ? "W" : `S${out.scenarios.length + 1}`);
      out.scenarios.push({ code, name: ((n1) => { const n2 = n1.replace(/^(?:wildcard|disruptive)\s*[:.\-–—]?\s*/i, ""); return n2 && !n2.startsWith("(") ? n2 : n1 || name; })(name.replace(/^(?:S\d|W)\b\s*[:.\-–—]?\s*/i, "")), weight: wc || !w ? null : Math.min(100, +w[1]), wildcard: wc, drivers: cd >= 0 ? plain(r[cd] ?? "").slice(0, 240) : "", looks: plain(r[cl] ?? "").slice(0, 260), signposts: plain(r[cs] ?? "").slice(0, 260), uae: plain(r[cu] ?? "").slice(0, 260) }); } }
  const sit = tableRows(sectionAny(md, /^The Situation Now/i)); if (sit.rows.length) { const ci = colAt(sit.head, /direction/, 2), ct = colAt(sit.head, /happening|what/, 1); for (const r of sit.rows.slice(0, 12)) out.situation.push({ front: plain(r[0] ?? ""), dir: dirOf(r[ci] ?? ""), text: plain(r[ct] ?? "").slice(0, 220) }); }
  const mx = tableRows(sectionAny(md, /^Outlook by Front/i)); if (mx.rows.length) { const cc = mx.head.findIndex((h) => /confidence/.test(h)); const last = cc > 0 ? cc : mx.head.length; out.horizons = mx.head.slice(1, last).map((h) => h.replace(/\b\w/g, (c) => c.toUpperCase())); for (const r of mx.rows.slice(0, 12)) out.matrix.push({ front: plain(r[0] ?? ""), h: Array.from({ length: Math.max(1, last - 1) }, (_, i) => cellOf(r[i + 1] ?? "")), confidence: confidenceOf(cc >= 0 ? r[cc] ?? "" : "") }); }
  const oppLines = p5.length ? p5 : sectionAny(md, /^The UAE Opportunity Map/i); const op = tableWith(oppLines, /opportunity/);
  if (op) { const cw = colAt(op.head, /window|horizon/, 1), ck = colAt(op.head, /works/, 99), cf = colAt(op.head, /first step/, 99), ct = colAt(op.head, /tag/, 99), cb = colAt(op.head, /^benefit/, 99), cs = colAt(op.head, /feasib/, 99), cp = colAt(op.head, /partner/, 99), cr = colAt(op.head, /rationale/, 99), cc = colAt(op.head, /constraint|cost/, 99);
    for (const r of op.rows.slice(0, 9)) { const text = plain(r[0] ?? ""); if (text) out.opportunities.push({ text: text.slice(0, 180), window: plain(r[cw] ?? "").slice(0, 70), works: [...new Set((plain(r[ck] ?? "").match(/\bS[1-3]\b/gi) ?? []).map((x) => x.toUpperCase()))], tags: tagsIn(r[ct] ?? r.join(" ")), step: plain(r[cf] ?? "").slice(0, 200), benefit: level(r[cb] ?? ""), feasibility: level(r[cs] ?? ""), partners: plain(r[cp] ?? "").slice(0, 140), why: plain(r[cr] ?? "").slice(0, 200), constraint: plain(r[cc] ?? "").slice(0, 160) }); } }
  const sp = tableWith(p7.length ? p7 : sectionAny(md, /^Signposts and Triggers/i), /signpost|indicator/); if (sp) { const cw = colAt(sp.head, /where|source/, 1), ch = colAt(sp.head, /threshold|date/, 2), ct = colAt(sp.head, /shifts|toward/, 3), cr = colAt(sp.head, /response/, 4);
    for (const r of sp.rows.slice(0, 12)) { const text = plain(r[0] ?? ""); if (text) out.signposts.push({ text: text.slice(0, 200), where: plain(r[cw] ?? "").slice(0, 100), threshold: plain(r[ch] ?? "").slice(0, 120), toward: plain(r[ct] ?? "").slice(0, 60), response: plain(r[cr] ?? "").slice(0, 200) }); } }
  const rk = tableWith(p7.length ? p7 : sectionAny(md, /^Risks to UAE/i), /^risk/); if (rk) { const ct = colAt(rk.head, /trigger/, 1), ci = colAt(rk.head, /impact/, 2), cl = colAt(rk.head, /likelihood/, 3), cv = colAt(rk.head, /velocity/, 99), ca = colAt(rk.head, /action/, 99);
    for (const r of rk.rows.slice(0, 9)) { const text = plain(r[0] ?? ""); const vel = /fast/i.test(r[cv] ?? "") ? "fast" : /slow/i.test(r[cv] ?? "") ? "slow" : /medium/i.test(r[cv] ?? "") ? "medium" : null; if (text) out.risks.push({ text: text.slice(0, 180), trigger: plain(r[ct] ?? "").slice(0, 160), impact: plain(r[ci] ?? "").slice(0, 160), impactLevel: level(r[ci] ?? ""), velocity: vel, band: bandOf(r[cl] ?? "") ?? bandOf(r[ci] ?? ""), action: plain(r[ca] ?? "").slice(0, 160) }); } }
  const im = tableWith(p4.length ? p4 : sectionAny(md, /^UAE Impact Matrix/i, /^UAE Strategic Impact/i), /interest|area/); if (im) { const ce = colAt(im.head, /effect/, 1), cs = colAt(im.head, /size/, 2), ch = colAt(im.head, /horizon/, 3), cw = colAt(im.head, /why/, 4);
    out.impact = im.rows.slice(0, 15).map((r) => { const m = EFFECT_RE.exec(plain(r[ce] ?? "")); return { area: plain(r[0] ?? ""), effect: m ? (m[1].toLowerCase() as FsEffect) : null, size: level(r[cs] ?? ""), horizon: plain(r[ch] ?? "").slice(0, 40), why: plain(r[cw] ?? "").slice(0, 200) }; }).filter((x) => x.area); }
  out.reconciled = labelled(p6, /Reconciled call/) || (/Reconciled call/i.test(sectionAny(md, /^Three Advisers/i).join(" ")) ? plain(sectionAny(md, /^Three Advisers/i).join(" ").replace(/^[\s\S]*?Reconciled call[:.]?\**\s*/i, "")).slice(0, 400) : "");
  const opt = tableWith(p6.length ? p6 : sectionAny(md, /^Options$/i, /^Strategic Options/i), /^window|^option/); if (opt) { const cw = colAt(opt.head, /^window/, 0), co = colAt(opt.head, /^option/, 1), cd = colAt(opt.head, /decision|benefit/, 2), ct = colAt(opt.head, /trade/, 3), cw2 = colAt(opt.head, /owner/, 4), cg = colAt(opt.head, /tag/, 5);
    out.options = opt.rows.slice(0, 14).map((r) => { const w = plain(r[cw] ?? ""); return { window: /immediate|0 to 12|0-12/i.test(w) ? "immediate" as const : /long|5 to 20|5-20/i.test(w) ? "long" as const : /medium|1 to 5|1-5/i.test(w) ? "medium" as const : null, text: plain(r[co] ?? "").slice(0, 200), decision: plain(r[cd] ?? "").slice(0, 200), tradeoff: plain(r[ct] ?? "").slice(0, 160), owner: plain(r[cw2] ?? "").slice(0, 80), tags: tagsIn(r[cg] ?? r.join(" ")) }; }).filter((o) => o.text); }
  if (p8.length) { const b = out.bottom; b.know = labelled(p8, /What you need to know/); b.next = labelled(p8, /What may happen next/); b.why = labelled(p8, /Why it matters for the UAE/); b.advantage = labelled(p8, /The advantage the UAE could gain/); b.decisions = bulletsAfter(p8, /Decisions or directions/); b.monitor = bulletsAfter(p8, /Keep monitoring/); }
  const wk = tableRows(sectionAny(md, /^Emerging Trends and Weak Signals/i)); if (wk.rows.length) out.weak = wk.rows.slice(0, 12).map((r) => ({ signal: plain(r[0] ?? ""), cls: plain(r[1] ?? ""), evidence: plain(r[2] ?? "").slice(0, 200), why: plain(r[3] ?? "").slice(0, 200) })).filter((x) => x.signal);
  const sc = tableRows(sectionAny(md, /^Comparative Scores/i)); if (sc.rows.length) out.scores = sc.rows.slice(0, 12).map((r) => { const v = /(\d{1,3})/.exec(plain(r[1] ?? "")); return { score: plain(r[0] ?? ""), value: v ? Math.min(100, +v[1]) : null, basis: plain(r[2] ?? "").slice(0, 80) }; }).filter((x) => x.score);
  const fr = tableRows(sectionAny(md, /^Forecast Ranges/i)); if (fr.rows.length) out.ranges = fr.rows.slice(0, 12).map((r) => ({ indicator: plain(r[0] ?? ""), latest: plain(r[1] ?? ""), y3: plain(r[2] ?? ""), y5: plain(r[3] ?? ""), y10: plain(r[4] ?? "") })).filter((x) => x.indicator);
  return out;
}
