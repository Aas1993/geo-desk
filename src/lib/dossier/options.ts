import { noteText, oneLine } from "../guard";
// Options for the detailed ministerial brief. Shared by the form, the API route and the prompt, so the three cannot drift apart.
export const COUNTERPARTS = [["head-of-state", "Head of State"], ["head-of-government", "Prime Minister / Head of Government"], ["foreign-minister", "Foreign Minister"], ["economy-minister", "Economy / Investment / Trade Minister"], ["finance-minister", "Finance Minister"], ["energy-minister", "Energy Minister"], ["defence-security", "Defence / National Security official"], ["other", "Other official"]] as const;
export const MEETINGS = [["bilateral", "Bilateral meeting"], ["state-visit", "State visit"], ["summit", "Multilateral summit (sideline)"], ["courtesy", "Courtesy call"], ["economic-mission", "Economic mission"]] as const;
export const DEPTHS = [["executive", "Executive (about 3 pages)"], ["standard", "Standard (about 10 pages)"], ["comprehensive", "Comprehensive (about 20 pages)"]] as const;
export const FOCUSES = [["comprehensive", "Comprehensive"], ["political", "Political"], ["economic", "Economic"], ["investment", "Investment"], ["security", "Security"], ["multilateral", "Multilateral"]] as const;
export const AUDIENCES = [["minister", "Minister of State (full briefing)"], ["leader", "UAE Leader (two-page brief)"]] as const;
export type Audience = (typeof AUDIENCES)[number][0];
export type Counterpart = (typeof COUNTERPARTS)[number][0]; export type Meeting = (typeof MEETINGS)[number][0]; export type Depth = (typeof DEPTHS)[number][0]; export type Focus = (typeof FOCUSES)[number][0];
export type DossierOptions = { audience: Audience; counterpart: Counterpart; counterpartName: string; meeting: Meeting; meetingDate: string; depth: Depth; focus: Focus[]; lang: "en" | "ar"; notes: { positions: string; previous: string; objectives: string } };
const pick = <T extends string>(list: readonly (readonly [T, string])[], v: unknown, d: T): T => (list.some(([k]) => k === v) ? (v as T) : d);
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n) : "");
/** Clamps whatever the client sent to known values and sane lengths. */
export function cleanOptions(b: Record<string, unknown>): DossierOptions {
  const n = (b.notes ?? {}) as Record<string, unknown>; const f = Array.isArray(b.focus) ? (b.focus as unknown[]).filter((x): x is Focus => FOCUSES.some(([k]) => k === x)) : [];
  return { audience: pick(AUDIENCES, b.audience, "minister"), counterpart: pick(COUNTERPARTS, b.counterpart, "foreign-minister"), counterpartName: oneLine(txt(b.counterpartName, 120), 120), meeting: pick(MEETINGS, b.meeting, "bilateral"), meetingDate: /^\d{4}-\d{2}-\d{2}$/.test(String(b.meetingDate ?? "")) ? String(b.meetingDate) : "", depth: pick(DEPTHS, b.depth, "standard"), focus: f.length && !f.includes("comprehensive") ? [...new Set(f)] : ["comprehensive"], lang: b.lang === "ar" ? "ar" : "en", notes: { positions: noteText(txt(n.positions, 4000)), previous: noteText(txt(n.previous, 4000)), objectives: noteText(txt(n.objectives, 2000)) } };
}
export const optionsKey = (iso3: string, o: DossierOptions) => { const s = JSON.stringify([o.audience, o.counterpart, o.counterpartName, o.meeting, o.meetingDate, o.depth, [...o.focus].sort(), o.lang, o.notes]); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return `${iso3}:${o.lang}:${o.depth}:${h >>> 0}`; };
/** Search and fetch budgets and output ceilings per depth: these bound what one run can cost. */
export const BUDGET: Record<Depth, { maxTokens: number; searches: number; fetches: number; fetchTokens: number; words: string }> = {
  executive: { maxTokens: 9000, searches: 4, fetches: 0, fetchTokens: 8_000, words: "about 1,500 words in total" },
  standard: { maxTokens: 20_000, searches: 7, fetches: 0, fetchTokens: 10_000, words: "about 5,000 words in total" },
  comprehensive: { maxTokens: 34_000, searches: 10, fetches: 2, fetchTokens: 12_000, words: "9,000 to 12,000 words in total" },
};
/** The Leader's brief is two pages: a small budget, whatever depth the form says. */
export const LEADER_BUDGET = { maxTokens: 6000, searches: 3, fetches: 0, fetchTokens: 8_000, words: "about 900 words in total (two pages)" };
export const budgetFor = (o: DossierOptions) => (o.audience === "leader" ? LEADER_BUDGET : BUDGET[o.depth]);
