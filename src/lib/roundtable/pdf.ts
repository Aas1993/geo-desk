import type { CaseData } from "../case/load";
import { scoreCountry } from "../bird/score";
import { classification } from "../case/report";
import { BRIEF_CSS } from "../dossier/export";
import { REPORT_CSS, esc, reportDoc } from "../report/html";
import { baselineMap } from "./consensus";
import { parseChallenge, type Challenge } from "../desk/challenge";
import { readChallenge } from "./challenge";
import { roundtableBlocks } from "./html";
import { roundtableMarkdown } from "./markdown";
import type { LensId } from "./model";
import { readAll, readExtras, readHeld } from "./read";

// THE ROUND TABLE IN PDFs. A product's PDF (the Ministry's, the embassy's, THE KING's, the Country brief, the President's brief, the Case File's, the desk officer's and the Bird's eye view) carries the Round Table for its own page's lens: what each council on file says, the agreement matrix and, when a challenge round has been run, the debate and the arbiter's verdict. The baseline needs the Case File, which is fetched once per country before the PDF is made (prepareRoundtable); without it the table is still drawn, with the baseline left out. Every council's reading is taken from what this browser holds.
const KIND_LENS: Record<string, LensId> = { "mofa-council": "mofa", "emb-intel": "ambassador", "emb-plan": "ambassador", "king-council": "bird", "country-full": "country", "president-brief": "bird", "council-challenge": "bird", "case-council": "country", architect: "country", bird: "bird", "case-report": "country", "dossier-desk": "desk", desk: "desk", "falcon-council": "country", "mach-council": "country", "deep-council": "country" };
export const ROUNDTABLE_KINDS = new Set(Object.keys(KIND_LENS));
export const lensOfKind = (kind: string): LensId | null => KIND_LENS[kind] ?? null;
const baselines = new Map<string, { d: CaseData; at: number }>();
/** Fetches the Case File of a country once (for the baseline). Any failure leaves the table without a baseline. */
export async function prepareRoundtable(iso: string): Promise<void> {
  if (!/^[A-Z]{3}$/.test(iso) || iso === "ARE" || typeof fetch !== "function" || baselines.has(iso)) return;
  try { const r = await fetch(`/api/case/${iso}`); if (!r.ok) return; const d = (await r.json()) as CaseData; if (d && Array.isArray(d.instruments)) baselines.set(iso, { d, at: Date.now() }); } catch { /* the table is drawn without a baseline */ }
}
/** The blocks of the Round Table for a country, in the language and for the lens asked; empty when no council is on file. Reads the browser's storage, so call it in the browser. */
export function roundtableFor(iso: string, lens: LensId, L: "en" | "ar", d: CaseData | null = baselines.get(iso)?.d ?? null, challenge?: Challenge | null): string[] {
  try {
    const scored = d ? scoreCountry(d, readExtras(iso)) : null; const held = readChallenge(iso); const rs = readAll(iso, d, scored, Date.now(), readHeld(iso));
    return roundtableBlocks({ rs, baseline: baselineMap(scored), challenge: challenge !== undefined ? challenge : held?.challenge ?? null, lens, L });
  } catch (err) { console.warn("[pdf] the round table could not be drawn; the PDF goes without it.", err instanceof Error ? err.message : err); return []; }
}
/** The Round Table as a document of its own. */
export function roundtableDoc(o: { iso: string; country: string; lens: LensId; L: "en" | "ar"; d?: CaseData | null }): string | null {
  const blocks = roundtableFor(o.iso, o.lens, o.L, o.d); if (!blocks.length) return null; const ar = o.L === "ar"; const title = `${ar ? "الطاولة المستديرة للمجالس" : "Council round table"}: ${o.country}`;
  return reportDoc({ title, lang: o.L, css: `${BRIEF_CSS}${REPORT_CSS}`, blocks: [`<div class="cls">${esc(classification(o.L))}</div>`, `<h1>${esc(title)}</h1>`, ...blocks, `<div class="foot">Geo Desk · ${new Date().toISOString().slice(0, 10)}</div>`] });
}
/** The Round Table blocks of a product's PDF, for the lens of its own page; empty for a kind that carries none. The challenge's own PDF is drawn from its own text, not from whatever is saved now. */
export function roundtableForProduct(s: { kind: string; iso: string; lang: "en" | "ar"; report: string }): string[] {
  const lens = lensOfKind(s.kind); if (!lens || !/^[A-Z]{3}$/.test(s.iso) || s.iso === "ARE" || typeof localStorage === "undefined") return [];
  return roundtableFor(s.iso, lens, s.lang, undefined, s.kind === "council-challenge" ? parseChallenge(s.report) : undefined);
}
/** The Round Table as markdown for a written Case File report; empty when no council is on file (or outside a browser). */
export function roundtableMarkdownFor(iso: string, lens: LensId, L: "en" | "ar", d: CaseData | null): string {
  if (typeof localStorage === "undefined" || !/^[A-Z]{3}$/.test(iso) || iso === "ARE") return "";
  try { const scored = d ? scoreCountry(d, readExtras(iso)) : null; const held = readChallenge(iso); return roundtableMarkdown({ rs: readAll(iso, d, scored, Date.now(), readHeld(iso)), baseline: baselineMap(scored), challenge: held?.challenge ?? null, lens, L }); } catch { return ""; }
}
