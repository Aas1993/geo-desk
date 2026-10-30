import type { CChallenge, Challenge } from "../desk/challenge";
import { scoreboard, type Board } from "../desk/challenge";
import { consensus, differences, rowCells, spreads, type Cell, type Consensus, type Differs, type Spread } from "./consensus";
import { LENSES, type Lens, type LensId, type SeatId } from "./model";
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
