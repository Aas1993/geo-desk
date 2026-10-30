// THE CLIP TRAY: items the desk chose to carry from the Country Updates Hub into the reports. A clip is the item as it was found (text, source, date, angle, link) plus the person's own note; nothing is added or scored. Kept per country in this browser (`gd-clips:<ISO>`), and read by the Bird's eye report, the Country Brief, the President's brief and the Desk agent as labelled field updates (analysis input, not verified fact).
export type Tone = "opportunity" | "risk" | "neutral";
export type Clip = { id: string; iso: string; text: string; source: string; url?: string; date: string; angle: string; kind: string; tone?: Tone; note: string; at: string };
export const MAX_CLIPS = 60; export const MAX_TEXT = 400; export const MAX_NOTE = 500;
export const clipsKey = (iso: string) => `gd-clips:${iso}`;
export const CLIPS_EVENT = "gd-clips";
const isTone = (x: unknown): x is Tone => x === "opportunity" || x === "risk" || x === "neutral";
const cut = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const safeUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u.slice(0, 600) : undefined);
/** Reads a stored value defensively: anything that is not a well-formed clip is dropped. */
export function parseClips(raw: unknown, iso: string): Clip[] {
  if (!Array.isArray(raw)) return [];
  const out: Clip[] = []; const seen = new Set<string>();
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>; const text = cut(o.text, MAX_TEXT); if (!text || typeof o.id !== "string" || seen.has(o.id)) continue; seen.add(o.id);
    out.push({ id: o.id.slice(0, 120), iso, text, source: cut(o.source, 120), url: safeUrl(o.url), date: cut(o.date, 10), angle: cut(o.angle, 24) || "other", kind: cut(o.kind, 16) || "news", tone: isTone(o.tone) ? o.tone : undefined, note: cut(o.note, MAX_NOTE), at: cut(o.at, 30) });
  }
  return out.slice(0, MAX_CLIPS);
}
/** Adds a clip at the end; the same item (same id) is never clipped twice. Returns the new list and whether it was added. */
export function addClip(xs: Clip[], c: Omit<Clip, "at" | "note"> & { note?: string; at?: string }, now = new Date()): { list: Clip[]; added: boolean; full: boolean } {
  if (xs.some((x) => x.id === c.id)) return { list: xs, added: false, full: false };
  if (xs.length >= MAX_CLIPS) return { list: xs, added: false, full: true };
  return { list: [...xs, { ...c, text: cut(c.text, MAX_TEXT), source: cut(c.source, 120), url: safeUrl(c.url), note: cut(c.note, MAX_NOTE), at: c.at ?? now.toISOString() }], added: true, full: false };
}
export const removeClip = (xs: Clip[], id: string): Clip[] => xs.filter((x) => x.id !== id);
export const annotateClip = (xs: Clip[], id: string, note: string): Clip[] => xs.map((x) => (x.id === id ? { ...x, note: cut(note, MAX_NOTE) } : x));
/** Moves a clip one place up (-1) or down (+1); the ends stay put. */
export function moveClip(xs: Clip[], id: string, dir: -1 | 1): Clip[] {
  const i = xs.findIndex((x) => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= xs.length) return xs;
  const out = xs.slice(); [out[i], out[j]] = [out[j], out[i]]; return out;
}
/** The tray as text for the agents: one line per clip in the person's order, capped, with the note kept (it is the person's own steer). */
export function clipsText(xs: Clip[], max = 4000): string {
  const lines: string[] = []; let n = 0;
  for (const c of xs) {
    const line = `- ${c.date || "undated"} [${c.angle}${c.tone && c.tone !== "neutral" ? `, marked ${c.tone}` : ""}] ${c.text} (${c.source || "source not named"}${c.url ? `, ${c.url}` : ""})${c.note ? ` | Desk note: ${c.note}` : ""}`;
    if (n + line.length > max) { lines.push(`- (${xs.length - lines.length} more clips not shown: size cap)`); break; }
    lines.push(line); n += line.length + 1;
  }
  return lines.join("\n");
}
/** The label every report puts above the clips: what they are and what they are not. */
export const CLIPS_LABEL = { en: "Field updates clipped by the desk", ar: "مستجدات ميدانية انتقاها المكتب" };
export const CLIPS_CAVEAT = { en: "Dated and sourced as found in the Country Updates Hub; chosen by the desk, not verified by the platform. Analysis input, never evidence on its own.", ar: "مؤرخة ومنسوبة كما وردت في مركز مستجدات الدولة؛ انتقاها المكتب ولم تتحقق المنصة منها. مدخل للتحليل لا دليل بذاته." };
/** The tray as a block of text for the agents, with the label that says how to read it; empty when there are no clips. */
export const clipsFact = (xs: Clip[], max = 4000): string => (xs.length ? `${CLIPS_LABEL.en} (${CLIPS_CAVEAT.en})\n${clipsText(xs, max)}` : "");
export function clipsMarkdown(xs: Clip[], L: "en" | "ar" = "en", name = ""): string {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en);
  return [`# ${L === "ar" ? CLIPS_LABEL.ar : CLIPS_LABEL.en}${name ? `: ${name}` : ""}`, "", `> ${L === "ar" ? CLIPS_CAVEAT.ar : CLIPS_CAVEAT.en}`, "", ...xs.map((c, i) => `${i + 1}. **${c.date || e("undated", "بلا تاريخ")}** · ${c.angle}${c.tone && c.tone !== "neutral" ? ` · ${c.tone}` : ""}: ${c.text} — ${c.url ? `[${c.source || c.url}](${c.url})` : c.source || e("source not named", "المصدر غير مسمى")}${c.note ? `\n   - ${e("Desk note", "ملاحظة المكتب")}: ${c.note}` : ""}`)].join("\n");
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
const TONE_C: Record<string, string> = { opportunity: "#0e9f6e", risk: "#d92d4a", neutral: "#5b6572" };
/** The tray as a PDF section: a heading, the caveat and one inline-styled card per clip (inline styles so every report stylesheet draws it alike). */
export function clipsHtml(xs: Clip[], L: "en" | "ar" = "en"): string {
  if (!xs.length) return "";
  const e = (en: string, ar: string) => (L === "ar" ? ar : en);
  return `<h2>${esc(L === "ar" ? CLIPS_LABEL.ar : CLIPS_LABEL.en)}</h2><p style="color:#5b6572;font-size:10px;margin:2px 0 6px">${esc(L === "ar" ? CLIPS_CAVEAT.ar : CLIPS_CAVEAT.en)}</p>${xs.map((c, i) => `<div style="border:1px solid #cfd6df;border-inline-start:5px solid ${TONE_C[c.tone ?? "neutral"]};border-radius:8px;padding:6px 9px;margin:5px 0;background:#fff;page-break-inside:avoid"><span style="color:#5b6572;font-size:10px">${i + 1} · ${esc(c.date || e("undated", "بلا تاريخ"))} · ${esc(c.angle)}${c.tone && c.tone !== "neutral" ? ` · ${esc(c.tone === "risk" ? e("risk mark", "علامة خطر") : e("opportunity mark", "علامة فرصة"))}` : ""}</span><br><b>${esc(c.text)}</b><br><span style="color:#5b6572;font-size:10px">${esc(c.source)}${c.url ? ` · ${esc(c.url)}` : ""}</span>${c.note ? `<p style="margin:3px 0 0;color:#0b2540"><b>${esc(e("Desk note", "ملاحظة المكتب"))}:</b> ${esc(c.note)}</p>` : ""}</div>`).join("")}`;
}
// ---- browser storage (safe when storage is blocked)
export function readClips(iso: string): Clip[] { try { return typeof localStorage === "undefined" ? [] : parseClips(JSON.parse(localStorage.getItem(clipsKey(iso)) ?? "[]"), iso); } catch { return []; } }
export function writeClips(iso: string, xs: Clip[]): void { try { localStorage.setItem(clipsKey(iso), JSON.stringify(xs.slice(0, MAX_CLIPS))); } catch { /* the tray is still shown for this visit */ } try { window.dispatchEvent(new CustomEvent(CLIPS_EVENT, { detail: iso })); } catch { /* no window */ } }
/** The tray of a country as the labelled text block the agents read (browser only; empty on the server or when nothing is clipped). */
export const clipsFactFor = (iso: string, max = 3500): string => clipsFact(readClips(iso), max);
