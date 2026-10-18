import { noteText, oneLine } from "../guard";
// Options for the detailed ministerial brief. Shared by the form, the API route and the prompt, so the three cannot drift apart.
export const COUNTERPARTS = [["head-of-state", "Head of State"], ["head-of-government", "Prime Minister / Head of Government"], ["foreign-minister", "Foreign Minister"], ["economy-minister", "Economy / Investment / Trade Minister"], ["finance-minister", "Finance Minister"], ["energy-minister", "Energy Minister"], ["defence-security", "Defence / National Security official"], ["other", "Other official"]] as const;
export const MEETINGS = [["bilateral", "Bilateral meeting"], ["state-visit", "State visit"], ["summit", "Multilateral summit (sideline)"], ["courtesy", "Courtesy call"], ["economic-mission", "Economic mission"]] as const;
export const DEPTHS = [["executive", "Executive (about 3 pages)"], ["standard", "Standard (about 10 pages)"], ["comprehensive", "Comprehensive (about 20 to 30 pages)"]] as const;
export const FOCUSES = [["comprehensive", "Comprehensive"], ["political", "Political"], ["economic", "Economic"], ["investment", "Investment"], ["security", "Security"], ["multilateral", "Multilateral"]] as const;
export type Counterpart = (typeof COUNTERPARTS)[number][0]; export type Meeting = (typeof MEETINGS)[number][0]; export type Depth = (typeof DEPTHS)[number][0]; export type Focus = (typeof FOCUSES)[number][0];
export type DossierOptions = { counterpart: Counterpart; counterpartName: string; meeting: Meeting; meetingDate: string; depth: Depth; focus: Focus[]; lang: "en" | "ar"; notes: { positions: string; previous: string; objectives: string } };
const pick = <T extends string>(list: readonly (readonly [T, string])[], v: unknown, d: T): T => (list.some(([k]) => k === v) ? (v as T) : d);
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n) : "");
/** Clamps whatever the client sent to known values and sane lengths. */
export function cleanOptions(b: Record<string, unknown>): DossierOptions {
  const n = (b.notes ?? {}) as Record<string, unknown>; const f = Array.isArray(b.focus) ? (b.focus as unknown[]).filter((x): x is Focus => FOCUSES.some(([k]) => k === x)) : [];
  return { counterpart: pick(COUNTERPARTS, b.counterpart, "foreign-minister"), counterpartName: oneLine(txt(b.counterpartName, 120), 120), meeting: pick(MEETINGS, b.meeting, "bilateral"), meetingDate: /^\d{4}-\d{2}-\d{2}$/.test(String(b.meetingDate ?? "")) ? String(b.meetingDate) : "", depth: pick(DEPTHS, b.depth, "standard"), focus: f.length && !f.includes("comprehensive") ? [...new Set(f)] : ["comprehensive"], lang: b.lang === "ar" ? "ar" : "en", notes: { positions: noteText(txt(n.positions, 4000)), previous: noteText(txt(n.previous, 4000)), objectives: noteText(txt(n.objectives, 2000)) } };
}
export const optionsKey = (iso3: string, o: DossierOptions) => { const s = JSON.stringify([o.counterpart, o.counterpartName, o.meeting, o.meetingDate, o.depth, [...o.focus].sort(), o.lang, o.notes]); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return `${iso3}:${o.lang}:${o.depth}:${h >>> 0}`; };
/** Search and fetch budgets and output ceilings per depth: these bound what one run can cost. */
export const BUDGET: Record<Depth, { maxTokens: number; searches: number; fetches: number; fetchTokens: number; words: string }> = {
  executive: { maxTokens: 9000, searches: 6, fetches: 3, fetchTokens: 20_000, words: "about 1,500 words in total" },
  standard: { maxTokens: 22_000, searches: 10, fetches: 6, fetchTokens: 25_000, words: "about 5,000 words in total" },
  comprehensive: { maxTokens: 44_000, searches: 16, fetches: 10, fetchTokens: 30_000, words: "12,000 to 16,000 words in total" },
};
