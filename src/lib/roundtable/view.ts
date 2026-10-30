import type { CChallenge, Challenge } from "../desk/challenge";
import { scoreboard, type Board } from "../desk/challenge";
import { consensus, differences, rowCells, spreads, type Cell, type Consensus, type Differs, type Spread } from "./consensus";
import { COURSE_W, LENSES, SEAT_BY, angleName, type Lens, type LensId, type SeatId } from "./model";
import type { SeatReading } from "./read";

// WHAT A PAGE SHOWS: the readings, the baseline and the saved challenge put through the page's domain lens: the angles it reads, the councils that matter on it (first), the matrix, the consensus and the challenge cards that touch its angles. Both the screen and the PDF are drawn from this, so they say the same thing.
export type Row = { id: SeatId; cells: Cell[]; diffs: Differs[]; /** The council's overall tone against the baseline in points (negative: it reads every angle cooler), when it could be taken out. */ offset: number | null };
export type View = { lens: Lens; angles: string[]; baseline: Record<string, number | null>; data: SeatReading | null; councils: SeatReading[]; filed: SeatReading[]; cons: Consensus; rows: Row[]; spreads: Spread[]; challenge: Challenge | null; cards: CChallenge[]; hidden: number; board: Board[] };
/** A challenge card belongs to a lens when it names no angle or one of the lens's angles. */
export const inLens = (c: Pick<CChallenge, "angles">, angles: string[]) => !c.angles.length || c.angles.some((a) => angles.includes(a));
/** `all` shows every council on file; otherwise only the page's focus councils (the rest are counted in `hidden`). */
export function viewOf(o: { rs: SeatReading[]; baseline: Record<string, number | null>; challenge: Challenge | null; lens: LensId; all?: boolean }): View {
  const lens = LENSES[o.lens]; const order = new Map(lens.seats.map((id, i) => [id, i])); const by = (a: SeatReading, z: SeatReading) => (order.get(a.id) ?? 99) - (order.get(z.id) ?? 99);
  const data = o.rs.find((r) => r.id === "data") ?? null; const councils = o.rs.filter((r) => r.id !== "data").sort(by); const filedAll = councils.filter((r) => r.onFile);
  const top = new Set<SeatId>(lens.seats.filter((id) => id !== "data").slice(0, lens.focus)); const filed = o.all || filedAll.length <= lens.focus ? filedAll : filedAll.filter((r) => top.has(r.id));
  const rows: Row[] = [...(data?.onFile ? [data] : []), ...filed].map((r) => { const { cells, offset } = rowCells(r, lens.angles, o.baseline); return { id: r.id, cells, offset, diffs: r.id === "data" ? [] : differences(cells, o.baseline) }; });
  const cons = consensus(filed); const cards = (o.challenge?.challenges ?? []).filter((c) => inLens(c, lens.angles));
  return { lens, angles: lens.angles, baseline: o.baseline, data, councils, filed, cons, rows, spreads: spreads(rows, lens.angles), challenge: o.challenge, cards, hidden: filedAll.length - filed.length, board: o.challenge ? scoreboard({ challenges: cards }) : [] };
}

/** The page's answer in a few plain sentences: how many councils sit, where they agree and split, what to be careful of, and what the arbiter says (or that the challenge has not been run). Built only from the view, so it says nothing the figures do not. */
export function summaryOf(v: View, L: "en" | "ar", staleDays = 30): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const out: string[] = []; const c = v.cons; const n = v.filed.length; if (!n) return out;
  const nm = (id: SeatId) => { const s = SEAT_BY.get(id); return s ? (L === "ar" ? s.ar : s.en) : id; }; const an = (a: string) => angleName(a, L);
  if (c.n < 2) out.push(e(`${n} council${n === 1 ? "" : "s"} on file, but fewer than two give a clear course, so there is nothing to compare yet.`, `${n} مجلس محفوظ، لكن أقل من مجلسين يعطيان مسارًا واضحًا فلا شيء للمقارنة بعد.`));
  else out.push(e(`${c.n} of the ${n} councils on file give a clear course. ${c.modal ? `Most of them (${Math.round(c.share * 100)}%) say ${COURSE_W[c.modal].en.toLowerCase()}.` : "They are evenly split on the course."}${v.data?.course ? ` The free rule-built posture says ${COURSE_W[v.data.course].en.toLowerCase()}.` : ""}`, `${c.n} من ${n} مجلسًا محفوظًا تعطي مسارًا واضحًا. ${c.modal ? `أغلبها (${Math.round(c.share * 100)}%) يقول ${COURSE_W[c.modal].ar}.` : "وهي منقسمة بالتساوي على المسار."}${v.data?.course ? ` والموقف المبني بالقواعد مجانًا يقول ${COURSE_W[v.data.course].ar}.` : ""}`));
  const split = v.spreads.filter((s) => s.dissent).sort((a, z) => z.sd - a.sd).slice(0, 3).map((s) => an(s.angle)); const agree = v.spreads.filter((s) => s.n >= 3 && !s.dissent).sort((a, z) => a.sd - z.sd).slice(0, 2).map((s) => an(s.angle));
  if (split.length) out.push(e(`They split most on: ${split.join("; ")}.${agree.length ? ` They agree most on: ${agree.join("; ")}.` : ""}`, `أكثر ما ينقسمون عليه: ${split.join("؛ ")}.${agree.length ? ` وأكثر ما يتفقون عليه: ${agree.join("؛ ")}.` : ""}`));
  const flagged = v.filed.filter((r) => r.redFlags.length); const stale = v.filed.filter((r) => (r.ageDays ?? 0) > staleDays);
  if (flagged.length || stale.length) out.push(e(`${flagged.length ? `Be careful: the auditors raised red flags on ${flagged.slice(0, 3).map((r) => nm(r.id)).join(", ")}${flagged.length > 3 ? ` and ${flagged.length - 3} more` : ""}. ` : ""}${stale.length ? `${stale.length} council${stale.length === 1 ? " is" : "s are"} older than ${staleDays} days.` : ""}`.trim(), `${flagged.length ? `تنبّه: رفع المدققون أعلامًا حمراء على ${flagged.slice(0, 3).map((r) => nm(r.id)).join("، ")}${flagged.length > 3 ? ` و${flagged.length - 3} أخرى` : ""}. ` : ""}${stale.length ? `${stale.length} من المجالس أقدم من ${staleDays} يومًا.` : ""}`.trim()));
  const A = v.challenge?.arbiter; out.push(A ? e(`After the challenge round, the arbiter recommends ${A.course ? COURSE_W[A.course].en.toLowerCase() : "a consolidated course"}${A.confidence ? ` (confidence ${A.confidence})` : ""}: see its verdict and conditions below.`, `بعد جولة التحدي يوصي الحَكَم بـ${A.course ? COURSE_W[A.course].ar : "مسار موحّد"}${A.confidence ? ` (الثقة ${A.confidence})` : ""}: انظر حكمه وشروطه أدناه.`) : e("The table shows where the councils differ, not which is right: run the challenge round below to have them cross-examine each other.", "يعرض الجدول أين تختلف المجالس لا أيها على حق: شغّل جولة التحدي أدناه لتستجوب المجالس بعضها."));
  return out;
}
