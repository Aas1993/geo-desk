import type { PBrief } from "../desk/president";
import type { KingParsed } from "../desk/king";
import { ACC, MUTE, OK, RISK, WARN, esc, h2, note, stackBar, statRow } from "../report/html";

// THE DECISION LOG: what was decided (or still has to be), by whom, by when, and what follows. Entries are the desk's own, edited by hand; "pull from products on file" only proposes candidates (the President's decisions with the choice recorded, the President's recommendations, the King's council's decisions asked) and adds what the user accepts, once each. Kept per country in this browser (`gd-decisions:<ISO>`). Nothing is invented: a missing owner or date stays empty.
export type Status = "open" | "in-progress" | "done" | "dropped";
export type DSource = "president" | "desk" | "council" | "manual";
export type FollowUp = { id: string; text: string; owner: string; due: string; done: boolean };
export type Decision = { id: string; key?: string; title: string; source: DSource; options?: string[]; chosen?: number | null; owner: string; due: string; status: Status; notes: string; followUps: FollowUp[]; created: string; updated: string };
export const MAX_DECISIONS = 200; export const MAX_FOLLOWUPS = 20;
export const STATUSES: Status[] = ["open", "in-progress", "done", "dropped"];
export const STATUS_NAME: Record<Status, { en: string; ar: string; c: string }> = { open: { en: "Open", ar: "مفتوح", c: ACC }, "in-progress": { en: "In progress", ar: "قيد التنفيذ", c: WARN }, done: { en: "Done", ar: "منجز", c: OK }, dropped: { en: "Dropped", ar: "مُسقَط", c: MUTE } };
export const SOURCE_NAME: Record<DSource, { en: string; ar: string }> = { president: { en: "President's brief", ar: "موجز الرئيس" }, desk: { en: "Desk product", ar: "منتج المكتب" }, council: { en: "Council", ar: "المجلس" }, manual: { en: "Entered by hand", ar: "أُدخل يدويًا" } };
export const decisionsKey = (iso: string) => `gd-decisions:${iso}`;
const cut = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, n);
const cutMulti = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\r/g, "").trim().slice(0, n);
/** A real calendar date as YYYY-MM-DD, or "" (a bad or missing date is empty, never guessed). */
export function cleanDate(s: unknown): string { const t = String(s ?? "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return ""; const d = new Date(`${t}T00:00:00Z`); return isFinite(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : ""; }
export const todayOf = (now: number) => new Date(now).toISOString().slice(0, 10);
const isStatus = (x: unknown): x is Status => STATUSES.includes(x as Status);
const isSource = (x: unknown): x is DSource => x === "president" || x === "desk" || x === "council" || x === "manual";
let seq = 0; export const newId = (p = "d") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
/** Reads a stored value defensively: anything that is not a well-formed decision is dropped, ids are unique, caps are applied. */
export function parseDecisions(raw: unknown, now = Date.now()): Decision[] {
  if (!Array.isArray(raw)) return []; const out: Decision[] = []; const seen = new Set<string>(); const stamp = new Date(now).toISOString();
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>; const title = cut(o.title, 240); if (!title || typeof o.id !== "string" || !o.id || seen.has(o.id)) continue; seen.add(o.id);
    const options = Array.isArray(o.options) ? o.options.map((x) => cut(x, 240)).filter(Boolean).slice(0, 8) : undefined; const ch = typeof o.chosen === "number" && options && o.chosen >= 0 && o.chosen < options.length ? Math.floor(o.chosen) : null;
    const fu: FollowUp[] = []; const fseen = new Set<string>(); if (Array.isArray(o.followUps)) for (const f of o.followUps) { const q = (f ?? {}) as Record<string, unknown>; const text = cut(q.text, 240); if (!text || typeof q.id !== "string" || fseen.has(q.id)) continue; fseen.add(q.id); fu.push({ id: q.id.slice(0, 60), text, owner: cut(q.owner, 100), due: cleanDate(q.due), done: q.done === true }); }
    out.push({ id: o.id.slice(0, 60), key: typeof o.key === "string" ? o.key.slice(0, 80) : undefined, title, source: isSource(o.source) ? o.source : "manual", options: options?.length ? options : undefined, chosen: ch, owner: cut(o.owner, 100), due: cleanDate(o.due), status: isStatus(o.status) ? o.status : "open", notes: cutMulti(o.notes, 1500), followUps: fu.slice(0, MAX_FOLLOWUPS), created: cut(o.created, 30) || stamp, updated: cut(o.updated, 30) || cut(o.created, 30) || stamp });
  }
  return out.slice(0, MAX_DECISIONS);
}
export type NewDecision = Partial<Omit<Decision, "id" | "created" | "updated" | "followUps">> & { title: string; followUps?: FollowUp[] };
export function addDecision(xs: Decision[], p: NewDecision, now = Date.now(), id = newId()): { list: Decision[]; added: boolean } {
  if (xs.length >= MAX_DECISIONS || (p.key && xs.some((x) => x.key === p.key)) || !cut(p.title, 240)) return { list: xs, added: false };
  const t = new Date(now).toISOString(); const [d] = parseDecisions([{ ...p, id, followUps: p.followUps ?? [], created: t, updated: t }], now); if (!d) return { list: xs, added: false };
  return { list: [...xs, d], added: true };
}
export const updateDecision = (xs: Decision[], id: string, patch: Partial<Omit<Decision, "id" | "created">>, now = Date.now()): Decision[] => xs.map((x) => { if (x.id !== id) return x; const [d] = parseDecisions([{ ...x, ...patch, id: x.id, created: x.created, updated: new Date(now).toISOString() }], now); return d ?? x; });
export const removeDecision = (xs: Decision[], id: string): Decision[] => xs.filter((x) => x.id !== id);
export function addFollowUp(xs: Decision[], id: string, f: { text: string; owner?: string; due?: string }, now = Date.now(), fid = newId("f")): Decision[] {
  return xs.map((x) => (x.id === id && x.followUps.length < MAX_FOLLOWUPS && cut(f.text, 240) ? updateOne(x, { followUps: [...x.followUps, { id: fid, text: cut(f.text, 240), owner: cut(f.owner, 100), due: cleanDate(f.due), done: false }] }, now) : x));
}
const updateOne = (x: Decision, patch: Partial<Decision>, now: number): Decision => ({ ...x, ...patch, updated: new Date(now).toISOString() });
export const toggleFollowUp = (xs: Decision[], id: string, fid: string, now = Date.now()): Decision[] => xs.map((x) => (x.id === id ? updateOne(x, { followUps: x.followUps.map((f) => (f.id === fid ? { ...f, done: !f.done } : f)) }, now) : x));
export const removeFollowUp = (xs: Decision[], id: string, fid: string, now = Date.now()): Decision[] => xs.map((x) => (x.id === id ? updateOne(x, { followUps: x.followUps.filter((f) => f.id !== fid) }, now) : x));
export const editFollowUp = (xs: Decision[], id: string, fid: string, patch: Partial<Pick<FollowUp, "text" | "owner" | "due">>, now = Date.now()): Decision[] => xs.map((x) => (x.id === id ? updateOne(x, { followUps: x.followUps.map((f) => (f.id === fid ? { ...f, text: patch.text != null ? cut(patch.text, 240) || f.text : f.text, owner: patch.owner != null ? cut(patch.owner, 100) : f.owner, due: patch.due != null ? cleanDate(patch.due) : f.due } : f)) }, now) : x));

// ---- due dates
const live = (s: Status) => s === "open" || s === "in-progress";
/** Overdue: still open or in progress and the due date is before today (UTC date; no due date is never overdue). */
export const isOverdue = (d: { status: Status; due: string }, now: number) => live(d.status) && !!d.due && d.due < todayOf(now);
/** Due soon: open or in progress and due from today to `days` days ahead. */
export function dueSoon(d: { status: Status; due: string }, now: number, days = 7): boolean { if (!live(d.status) || !d.due) return false; const t = todayOf(now); return d.due >= t && d.due <= todayOf(now + days * 86_400_000); }
export type Summary = { total: number; open: number; inProgress: number; done: number; dropped: number; overdue: number; dueSoon: number; undated: number; followUps: number; followUpsDone: number };
export function summary(xs: Decision[], now: number): Summary {
  const c = (s: Status) => xs.filter((x) => x.status === s).length; const fu = xs.flatMap((x) => x.followUps);
  return { total: xs.length, open: c("open"), inProgress: c("in-progress"), done: c("done"), dropped: c("dropped"), overdue: xs.filter((x) => isOverdue(x, now)).length, dueSoon: xs.filter((x) => dueSoon(x, now)).length, undated: xs.filter((x) => live(x.status) && !x.due).length, followUps: fu.length, followUpsDone: fu.filter((f) => f.done).length };
}
/** Overdue first, then by due date (undated last), then newest. */
export const sortDecisions = (xs: Decision[], now: number): Decision[] => [...xs].sort((a, z) => Number(isOverdue(z, now)) - Number(isOverdue(a, now)) || (a.due || "9999").localeCompare(z.due || "9999") || z.created.localeCompare(a.created));
export type Dot = { id: string; title: string; t: number; kind: "overdue" | "soon" | "open" | "done"; due: string };
/** The due dates on a strip from the earliest to the latest (today included), as positions 0..1; `today` is the position of today. */
export function timeline(xs: Decision[], now: number): { from: string; to: string; today: number; dots: Dot[] } | null {
  const dated = xs.filter((x) => x.due && x.status !== "dropped"); if (!dated.length) return null; const t0 = todayOf(now); const days = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86_400_000;
  const lo = Math.min(days(t0), ...dated.map((x) => days(x.due))); const hi = Math.max(days(t0), ...dated.map((x) => days(x.due))); const span = Math.max(1, hi - lo);
  return { from: new Date(lo * 86_400_000).toISOString().slice(0, 10), to: new Date(hi * 86_400_000).toISOString().slice(0, 10), today: (days(t0) - lo) / span, dots: dated.map((x) => ({ id: x.id, title: x.title, due: x.due, t: (days(x.due) - lo) / span, kind: x.status === "done" ? "done" : isOverdue(x, now) ? "overdue" : dueSoon(x, now) ? "soon" : "open" })) };
}

// ---- candidates from the products on file
export type Candidate = { key: string; title: string; source: DSource; options?: string[]; chosen: number | null; owner: string; due: string; notes: string; label: string };
const hash = (s: string) => { let h = 5381; for (const ch of s.toLowerCase().replace(/\s+/g, " ").trim()) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
/** The decisions on file as proposals: the President's decisions (with the recorded choice), the President's recommendations and the King's council's decisions asked. Keys are stable for the same text, so a rewritten brief does not re-add what is already logged. The Ministry and embassy plans carry free-text owners and dates, not clean ones, so they are not pulled. */
export function candidatesFrom(o: { president?: PBrief | null; choice?: Record<number, number> | null; king?: Pick<KingParsed, "decisionsAsked"> | null }): Candidate[] {
  const out: Candidate[] = []; const p = o.president; const ch = o.choice ?? {};
  (p?.decisions ?? []).forEach((d, i) => { const c = typeof ch[i] === "number" && ch[i] >= 0 && ch[i] < d.options.length ? ch[i] : null; out.push({ key: `pres:dec:${hash(d.decision)}`, title: d.decision, source: "president", options: d.options.length ? d.options : undefined, chosen: c, owner: d.by, due: "", notes: [d.recommendation ? `Recommendation: ${d.recommendation}` : "", d.ifNot ? `If not decided: ${d.ifNot}` : ""].filter(Boolean).join("\n"), label: c != null ? `Chosen: ${d.options[c]}` : "No choice recorded" }); });
  (p?.recommendations ?? []).forEach((r) => { out.push({ key: `pres:rec:${hash(r.action)}`, title: r.action, source: "president", chosen: null, owner: r.owner, due: cleanDate(r.when), notes: r.when && !cleanDate(r.when) ? `When (as written in the brief): ${r.when}` : "", label: r.when ? `When: ${r.when}` : "No date in the brief" }); });
  (o.king?.decisionsAsked ?? []).forEach((q) => { out.push({ key: `king:ask:${hash(q)}`, title: q, source: "council", chosen: null, owner: "", due: "", notes: "Decision asked of the head of state in the King's council brief.", label: "No owner or date in the brief" }); });
  return out;
}
/** Adds the picked candidates, each once (by key, also against what is already logged). */
export function mergeCandidates(xs: Decision[], picks: Candidate[], now = Date.now()): { list: Decision[]; added: number; skipped: number } {
  let list = xs; let added = 0; let skipped = 0; const seen = new Set<string>();
  for (const c of picks) { if (seen.has(c.key)) { skipped++; continue; } seen.add(c.key); const r = addDecision(list, { key: c.key, title: c.title, source: c.source, options: c.options, chosen: c.chosen, owner: c.owner, due: c.due, notes: c.notes, status: "open" }, now); if (r.added) { list = r.list; added++; } else skipped++; }
  return { list, added, skipped };
}

// ---- exports
/** One CSV cell: quoted, quotes doubled, and a leading = + - @ (or tab/CR) neutralised with an apostrophe so a spreadsheet never runs it as a formula. */
export function csvCell(v: unknown): string { let s = String(v ?? "").replace(/\r?\n/g, " | "); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }
export function toCsv(xs: Decision[], L: "en" | "ar" = "en"): string {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en);
  const head = [e("ID", "المعرف"), e("Decision", "القرار"), e("Source", "المصدر"), e("Status", "الحالة"), e("Owner", "المسؤول"), e("Due", "الموعد"), e("Chosen option", "الخيار المعتمد"), e("Options", "الخيارات"), e("Notes", "ملاحظات"), e("Follow-ups", "المتابعات"), e("Created", "أُنشئ"), e("Updated", "حُدّث")];
  const rows = xs.map((x) => [x.id, x.title, SOURCE_NAME[x.source][L], STATUS_NAME[x.status][L], x.owner, x.due, x.options && x.chosen != null ? x.options[x.chosen] : "", (x.options ?? []).join(" / "), x.notes, x.followUps.map((f) => `[${f.done ? "x" : " "}] ${f.text}${f.owner || f.due ? ` (${[f.owner, f.due].filter(Boolean).join(", ")})` : ""}`).join(" | "), x.created, x.updated]);
  return `\uFEFF${[head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
export const toJson = (iso: string, xs: Decision[], now = Date.now()) => JSON.stringify({ kind: "geo-desk-decision-log", iso, exported: new Date(now).toISOString(), decisions: xs }, null, 2);
const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Folds a content line at 75 octets (continuation lines start with a space), never inside a multi-byte character. */
export function icsFold(line: string): string[] {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return [line]; const out: string[] = []; let cur = ""; let bytes = 0; let limit = 75;
  for (const ch of line) { const n = enc.encode(ch).length; if (bytes + n > limit) { out.push(cur); cur = ""; bytes = 0; limit = 74; } cur += ch; bytes += n; }
  out.push(cur); return out.map((l, i) => (i ? ` ${l}` : l));
}
const ymd = (d: string) => d.replace(/-/g, ""); const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const stamp = (now: number) => new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** An iCalendar file of the due dates (all-day events, stable UIDs so a re-import updates instead of duplicating); dropped decisions and done follow-ups are left out. */
export function toIcs(iso: string, xs: Decision[], now = Date.now(), L: "en" | "ar" = "en"): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Geo Desk//Decision log//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEsc(`Geo Desk decisions ${iso}`)}`];
  const ev = (uid: string, due: string, summary: string, desc: string, status: string) => lines.push("BEGIN:VEVENT", `UID:${uid}@geo-desk.${iso}`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${ymd(due)}`, `DTEND;VALUE=DATE:${ymd(nextDay(due))}`, `SUMMARY:${icsEsc(summary)}`, ...(desc ? [`DESCRIPTION:${icsEsc(desc)}`] : []), `STATUS:${status}`, "TRANSP:TRANSPARENT", "END:VEVENT");
  for (const x of xs) {
    if (x.status === "dropped") continue;
    if (x.due) ev(x.id, x.due, `${iso}: ${x.title}`, [x.owner ? `${L === "ar" ? "المسؤول" : "Owner"}: ${x.owner}` : "", `${L === "ar" ? "الحالة" : "Status"}: ${STATUS_NAME[x.status][L]}`, x.notes].filter(Boolean).join("\n"), x.status === "done" ? "CONFIRMED" : "TENTATIVE");
    for (const f of x.followUps) if (f.due && !f.done) ev(`${x.id}-${f.id}`, f.due, `${iso}: ${f.text}`, [f.owner ? `${L === "ar" ? "المسؤول" : "Owner"}: ${f.owner}` : "", `${L === "ar" ? "متابعة لـ" : "Follow-up to"}: ${x.title}`].filter(Boolean).join("\n"), "TENTATIVE");
  }
  lines.push("END:VCALENDAR"); return `${lines.flatMap(icsFold).join("\r\n")}\r\n`;
}

// ---- PDF blocks and text
export function decisionBlocks(xs: Decision[], now: number, L: "en" | "ar", name: string): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const s = summary(xs, now); const out: string[] = [];
  out.push(h2(`${e("Decision log", "سجل القرارات")}: ${name}`), note(esc(e("The desk's own record of decisions, owners, dates and follow-ups; nothing in it is adopted policy. A blank owner or date means none was recorded.", "سجل المكتب للقرارات وأصحابها ومواعيدها ومتابعاتها؛ لا شيء فيه سياسة معتمدة. الخانة الفارغة تعني أنه لم يُسجَّل مسؤول أو موعد."))));
  out.push(statRow([{ n: s.open + s.inProgress, label: e("open or in progress", "مفتوح أو قيد التنفيذ"), color: ACC }, { n: s.overdue, label: e("overdue", "متأخر"), color: s.overdue ? RISK : OK }, { n: s.dueSoon, label: e("due in 7 days", "مستحق خلال 7 أيام"), color: s.dueSoon ? WARN : OK }, { n: s.done, label: e("done", "منجز"), color: OK }]));
  if (s.total) out.push(stackBar(STATUSES.map((k) => ({ label: STATUS_NAME[k][L], n: xs.filter((x) => x.status === k).length, color: STATUS_NAME[k].c })).filter((x) => x.n > 0)));
  if (!xs.length) { out.push(note(esc(e("No decisions are logged for this country yet.", "لا قرارات مسجلة لهذه الدولة بعد.")), "warn")); return out; }
  out.push(`<table class="tbl"><thead><tr><th>${esc(e("Decision", "القرار"))}</th><th>${esc(e("Chosen", "المعتمد"))}</th><th>${esc(e("Owner", "المسؤول"))}</th><th>${esc(e("Due", "الموعد"))}</th><th>${esc(e("Status", "الحالة"))}</th></tr></thead><tbody>${sortDecisions(xs, now).map((x) => `<tr><td>${esc(x.title)}${x.notes ? `<br><span class="sub">${esc(x.notes.slice(0, 200))}</span>` : ""}</td><td>${x.options && x.chosen != null ? esc(x.options[x.chosen]) : "-"}</td><td>${esc(x.owner || "-")}</td><td style="${isOverdue(x, now) ? `color:${RISK};font-weight:700` : dueSoon(x, now) ? `color:${WARN};font-weight:700` : ""}">${esc(x.due || "-")}</td><td style="color:${STATUS_NAME[x.status].c};font-weight:700">${esc(STATUS_NAME[x.status][L])}</td></tr>`).join("")}</tbody></table>`);
  const fus = xs.filter((x) => x.followUps.length); if (fus.length) out.push(h2(e("Follow-ups", "المتابعات")), `<div class="card w1">${fus.map((x) => `<p><b>${esc(x.title)}</b></p><ul>${x.followUps.map((f) => `<li>${f.done ? "✓ " : "☐ "}${esc(f.text)}${f.owner || f.due ? ` <span class="sub">(${esc([f.owner, f.due].filter(Boolean).join(", "))})</span>` : ""}</li>`).join("")}</ul>`).join("")}</div>`);
  return out;
}
export function decisionText(xs: Decision[], now: number, name: string): string {
  const s = summary(xs, now); if (!xs.length) return `Decision log, ${name}: none logged.`;
  return `Decision log, ${name}: ${s.total} decisions (${s.open} open, ${s.inProgress} in progress, ${s.done} done, ${s.dropped} dropped; ${s.overdue} overdue). ${sortDecisions(xs, now).map((x) => `${x.title}${x.options && x.chosen != null ? ` -> chosen: ${x.options[x.chosen]}` : ""} [${x.status}; owner ${x.owner || "not recorded"}; due ${x.due || "not set"}]`).join("; ")}`;
}
export const readDecisions = (iso: string): Decision[] => { try { return typeof localStorage === "undefined" ? [] : parseDecisions(JSON.parse(localStorage.getItem(decisionsKey(iso)) ?? "[]")); } catch { return []; } };
