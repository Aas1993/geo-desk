import { postStream } from "../agent/client";
import { DEFAULT_CHALLENGE_FOCUS } from "../desk/core";
import { parseChallenge, type Challenge } from "../desk/challenge";
import { ANGLE_IDS, COURSE_W, SEAT_BY, challengeKey, type SeatId } from "./model";
import { readAll, readExtras, readHeld, readState, type SeatReading } from "./read";
import { scoreCountry } from "../bird/score";
import { baselineMap } from "./consensus";
import type { CaseData } from "../case/load";
import type { Ev } from "../bird/runner";

// THE CHALLENGE ROUND, from the Round Table: the councils' digests are built from what this browser holds (free), posted to the same desk route and ceilings as every other product, and the finished product is saved under its own key so the debate view and the PDFs read it back. The digests are analysis, not evidence: each names its council with an id, its course and where the course came from, its headline, its risks and recommendations, how it was checked and how its own text reads the country's angles.
export const CHALLENGE_EST = 0.7;
export { challengeKey };
const line = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);
/** One council's digest for the debate. */
export function digestOf(r: SeatReading, name: string): string {
  if (!r.onFile) return "";
  const reads = Object.entries(r.angles).filter(([, a]) => readState(a) === "read").map(([id, a]) => `${id} ${a.reading}`).join(", ");
  const rv = r.verdicts.map((v) => `${v.lens}: ${v.verdict}${v.standing ? ` (${v.standing})` : ""}`).join("; "); const flags = r.redFlags.slice(0, 3).map((f) => `${f.severity}: ${line(f.flag, 140)}`).join(" | ");
  return [`## ${name} [id=${r.id}] (on file ${r.at?.slice(0, 10)}, ${r.ageDays} days old${r.grade ? `, quality grade ${r.grade}` : ""}${rv ? `, auditors ${rv}` : ""})`,
    `Course: ${r.course ? `${COURSE_W[r.course].en.toLowerCase()} (${r.courseFrom === "structured" ? "stated in its structured data" : "read from its text"})` : "no clear course"}${r.confidence ? `; confidence ${r.confidence}` : ""}`,
    r.headline ? `Headline: ${line(r.headline, 300)}` : "", r.risks.length ? `Top risks: ${r.risks.map((x) => line(x, 170)).join(" | ")}` : "", r.recs.length ? `Recommendations: ${r.recs.map((x) => line(x, 170)).join(" | ")}` : "",
    reads ? `How its own text reads the angles (0 to 100, tone of its text, indicative): ${reads}` : "", flags ? `Red flags its auditors raised: ${flags}` : ""].filter(Boolean).join("\n").slice(0, 1900);
}
/** The context the challenge is run on: the digests of the councils on file, the rule-built baseline, and the councils that are missing (so none is invented). */
export function challengeContext(rs: SeatReading[], baseline: Record<string, number | null>, posture: string | null, topic = ""): string {
  const filed = rs.filter((r) => r.id !== "data" && r.onFile); const missing = rs.filter((r) => r.id !== "data" && !r.onFile).map((r) => SEAT_BY.get(r.id)!.en);
  const base = ANGLE_IDS.filter((a) => baseline[a] != null).map((a) => `${a} ${baseline[a]}`).join(", ");
  return [`## The rule-built baseline (Case File data, no model)\nPosture from the data: ${posture ?? "not computed"}. Country score by angle (0 to 100; high is a stable, aligned, open front for the UAE): ${base || "not computed"}.`, ...filed.map((r) => digestOf(r, SEAT_BY.get(r.id)!.en)), missing.length ? `## Not on file\nThese councils have not been run for this country, so they have no position in this round and none may be invented: ${missing.join("; ")}.` : "", topic ? `## The question put to the round\n${line(topic, 600)}` : ""].filter(Boolean).join("\n\n").slice(0, 23_500);
}
export type COutcome = { ok: true; usd: number | null } | { ok: false; error: string; message: string };
export async function runChallenge(o: { iso: string; lang: "en" | "ar"; topic: string; context: string; refresh: boolean; signal: AbortSignal; onEvent: (e: Ev) => void }): Promise<COutcome> {
  const res = await postStream("/api/desk", { product: "council-challenge", iso3: o.iso, lang: o.lang, focus: DEFAULT_CHALLENGE_FOCUS, topic: o.topic, useContext: true, context: o.context, refresh: o.refresh }, o.signal, o.onEvent); if (!res.ok) return res;
  const d = res.done; if (typeof d.report !== "string") return { ok: false, error: "ended", message: "The challenge was not returned." };
  try { localStorage.setItem(challengeKey(o.iso), JSON.stringify({ ...d, type: undefined, topic: o.topic })); window.dispatchEvent(new Event("storage")); } catch { return { ok: false, error: "storage", message: "The challenge could not be saved in this browser (storage is full)." }; }
  const u = d.usage as { usd?: number } | undefined; return { ok: true, usd: typeof u?.usd === "number" ? u.usd : null };
}
export type HeldChallenge = { report: string; at: string; usd: number | null; topic: string; model: string | null; challenge: Challenge | null };
/** The saved challenge of a country, parsed; null when none is on file. */
export function readChallenge(iso: string): HeldChallenge | null {
  try { const j = JSON.parse(localStorage.getItem(challengeKey(iso)) ?? "null") as { report?: string; at?: string; usage?: { usd?: number }; topic?: string; model?: string } | null; if (!j || typeof j.report !== "string" || !j.at) return null; return { report: j.report, at: j.at, usd: typeof j.usage?.usd === "number" ? j.usage.usd : null, topic: j.topic ?? "", model: j.model ?? null, challenge: parseChallenge(j.report) }; } catch { return null; }
}
/** The readings with each council's own angle scores from the challenge put over the text readings (labelled "challenge"); a council the challenge did not score keeps its text readings. */
export function withChallenge(rs: SeatReading[], ch: Challenge | null): SeatReading[] {
  if (!ch) return rs;
  return rs.map((r) => { const c = ch.councils.find((x) => x.id === (r.id as SeatId)); if (!c || !Object.keys(c.angles).length) return r; const angles = { ...r.angles }; for (const [a, v] of Object.entries(c.angles)) angles[a] = { n: Math.max(1, angles[a]?.n ?? 0), pos: angles[a]?.pos ?? 0, neg: angles[a]?.neg ?? 0, reading: v, from: "challenge" }; return { ...r, angles }; });
}
/** The whole challenge round from what the browser holds (for Complete the picture, which has no Round Table on screen): builds the readings and the baseline, then runs it. Needs at least two councils on file. */
export async function runChallengeFromStorage(o: { iso: string; lang: "en" | "ar"; d: CaseData | null; topic?: string; signal: AbortSignal; onEvent: (e: Ev) => void }): Promise<COutcome> {
  const scored = o.d ? scoreCountry(o.d, readExtras(o.iso)) : null; const rs = readAll(o.iso, o.d, scored, Date.now(), readHeld(o.iso));
  if (rs.filter((r) => r.id !== "data" && r.onFile).length < 2) return { ok: false, error: "thin", message: o.lang === "ar" ? "يلزم مجلسان محفوظان على الأقل للتحدي." : "At least two councils must be on file for a challenge round." };
  return runChallenge({ iso: o.iso, lang: o.lang, topic: o.topic ?? "", context: challengeContext(rs, baselineMap(scored), o.d?.posture.posture ?? null, o.topic ?? ""), refresh: true, signal: o.signal, onEvent: o.onEvent });
}
