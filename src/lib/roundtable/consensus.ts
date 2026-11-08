import { COURSES, courseRank, type Course, type SeatId } from "./model";
import type { AngleRead, SeatReading } from "./read";

// THE ARITHMETIC OF AGREEMENT, all of it pure: where the councils sit on the posture scale, how far they agree, which angles they split on, and where a council's reading of an angle differs from the rule-built baseline. Nothing here reads the browser or calls a model.
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs: number[]) => { const m = mean(xs); return m == null || xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length); };

export type Consensus = { n: number; counts: Record<Course, number>; modal: Course | null; share: number; spread: number; score: number | null; label: "strong" | "majority" | "split" | "thin"; seats: Record<Course, SeatId[]> };
/** The consensus of the councils that gave a course (the free data seat is a baseline, not a voice: callers leave it out). The score is 100 when all sit on one course and falls to 0 when they sit at the two ends of the scale; a single voice is "thin", never a consensus. */
export function consensus(rs: Pick<SeatReading, "id" | "course">[]): Consensus {
  const counts: Record<Course, number> = { hold: 0, hedge: 0, staged: 0, deepen: 0 }; const seats: Record<Course, SeatId[]> = { hold: [], hedge: [], staged: [], deepen: [] };
  for (const r of rs) if (r.course) { counts[r.course]++; seats[r.course].push(r.id); }
  const n = COURSES.reduce((a, c) => a + counts[c], 0); const top = [...COURSES].sort((a, z) => counts[z] - counts[a] || courseRank(z) - courseRank(a))[0];
  const ranks = rs.filter((r) => r.course).map((r) => courseRank(r.course as Course)); const spread = sd(ranks); const score = n >= 2 ? Math.round(100 * (1 - Math.min(1, spread / 1.5))) : null;
  const share = n ? counts[top] / n : 0; const tie = n > 0 && COURSES.filter((c) => counts[c] === counts[top]).length > 1;
  const label: Consensus["label"] = n < 2 ? "thin" : share === 1 && n >= 3 ? "strong" : share > 0.5 && !tie ? "majority" : "split";
  return { n, counts, modal: n && !tie ? top : null, share, spread: Math.round(spread * 100) / 100, score, label, seats };
}
/** Whether two councils are on the same side: the same course, or a step apart. */
export const courseGap = (a: Course, b: Course) => Math.abs(courseRank(a) - courseRank(b));

export type Cell = { angle: string; reading: number | null; n: number; from: AngleRead["from"] | null; /** How far the reading sits from the baseline, after allowing for the council's overall tone when it is a text reading. */ delta: number | null; /** The same, before that allowance. */ raw: number | null; state: "read" | "thin" | "silent" };
export const DIFFER = 20;
/** Analytic prose is written about risks, so a council's text reads cooler than a score built from indicators on almost every angle. To keep that from flagging every angle, the text readings of a council are compared with the baseline after taking out the council's own average gap (its overall tone), when at least three angles can be compared: what stands out is then where the council reads an angle differently from how it reads the rest. A scorecard rating or a challenge score is an explicit score and is compared as it is. */
export function rowCells(r: SeatReading, angles: string[], baseline: Record<string, number | null>): { cells: Cell[]; offset: number | null } {
  const raw = angles.map((a): Cell => { const x = r.angles[a]; const b = baseline[a] ?? null; const state: Cell["state"] = !x || x.n === 0 ? "silent" : x.reading == null ? "thin" : "read"; const reading = state === "read" ? x!.reading : null; const d = reading != null && b != null ? reading - b : null; return { angle: a, reading, n: x?.n ?? 0, from: x?.from ?? null, delta: d, raw: d, state }; });
  const gaps = raw.filter((c) => c.from === "text" && c.raw != null).map((c) => c.raw as number); if (gaps.length < 3) return { cells: raw, offset: null };
  const off = mean(gaps) as number; return { cells: raw.map((c) => (c.from === "text" && c.raw != null ? { ...c, delta: Math.round(c.raw - off) } : c)), offset: Math.round(off) };
}
/** One council's row of the matrix: its reading of each angle, and how far that sits from the baseline. A text reading with fewer than three sentences is "thin" and a council that never mentions the angle is "silent": neither is compared. */
export const rowOf = (r: SeatReading, angles: string[], baseline: Record<string, number | null>): Cell[] => rowCells(r, angles, baseline).cells;
export type Spread = { angle: string; n: number; mean: number | null; sd: number; min: number | null; max: number | null; dissent: boolean };
/** Per angle: how many councils read it, the mean and the spread of their readings, and whether they split on it (a spread of 15 points or a gap of 30). The baseline row is not a council. */
export function spreads(rows: { id: SeatId; cells: Cell[] }[], angles: string[]): Spread[] {
  return angles.map((a) => { const xs = rows.filter((r) => r.id !== "data").map((r) => r.cells.find((c) => c.angle === a)?.reading).filter((v): v is number => typeof v === "number"); const s = sd(xs); const lo = xs.length ? Math.min(...xs) : null; const hi = xs.length ? Math.max(...xs) : null;
    return { angle: a, n: xs.length, mean: xs.length ? Math.round(mean(xs)!) : null, sd: Math.round(s * 10) / 10, min: lo, max: hi, dissent: xs.length >= 2 && (s >= 15 || (hi as number) - (lo as number) >= 30) }; });
}
export type Differs = { angle: string; reading: number; baseline: number; delta: number; side: "warmer" | "cooler" };
/** The angles on which a council's reading differs from the baseline by at least DIFFER points: warmer (reads the front as more favourable than the rule-built score) or cooler. */
export function differences(cells: Cell[], baseline: Record<string, number | null>, min = DIFFER): Differs[] {
  return cells.filter((c) => c.reading != null && c.delta != null && Math.abs(c.delta) >= min).map((c) => ({ angle: c.angle, reading: c.reading as number, baseline: baseline[c.angle] as number, delta: c.delta as number, side: (c.delta as number) > 0 ? "warmer" as const : "cooler" as const })).sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta));
}
/** The baseline as a map from angle to score. */
export const baselineMap = (b: { angles: { id: string; score: number | null }[] } | null): Record<string, number | null> => Object.fromEntries((b?.angles ?? []).map((a) => [a.id, a.score]));
/** The posture scale: the councils with a course grouped on it, in scale order. */
export function onScale(rs: Pick<SeatReading, "id" | "course">[]): { course: Course; seats: SeatId[] }[] { return COURSES.map((c) => ({ course: c, seats: rs.filter((r) => r.course === c).map((r) => r.id) })); }

/** A short count line for the header: how many councils are on file and how many gave a course. */
export const filedCount = (rs: Pick<SeatReading, "id" | "onFile">[]) => rs.filter((r) => r.id !== "data" && r.onFile).length;

/** Where n seats sit around an ellipse (the first at the top, then clockwise), rounded so the server and the browser draw the same pixels. */
export function ring(n: number, cx: number, cy: number, rx: number, ry: number): { x: number; y: number; a: number }[] {
  return Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n); return { x: Math.round((cx + Math.cos(a) * rx) * 10) / 10, y: Math.round((cy + Math.sin(a) * ry) * 10) / 10, a }; });
}
/** The colour of a matrix cell from how far the reading sits from the baseline: grey when it cannot be compared, green when the council reads the front warmer than the rule-built score, red when cooler, paler the nearer to the baseline. */
export function deltaColor(delta: number | null): string {
  if (delta == null) return "rgba(120,140,170,0.16)"; const k = Math.min(1, Math.abs(delta) / 40); const a = (0.12 + 0.6 * k).toFixed(2);
  return delta > 0 ? `rgba(14,159,110,${a})` : `rgba(217,45,74,${a})`;
}
