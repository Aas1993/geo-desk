import type { CaseData } from "./case/load";
import type { TradeData } from "./intel";
import type { FlightData } from "./flights-client";
import { MAX_COUNTRIES } from "./compare";

// PRESET SETS OF COUNTRIES for the Compare tab: each is read from held data (never a hand-made list), and never includes the UAE. A preset is only a starting choice; the user can change it.
const uniq = (xs: string[], first: string[] = []) => [...new Set([...first, ...xs])].filter((x) => x !== "ARE").slice(0, MAX_COUNTRIES);
/** The first country and the neighbours it shares a border with, those the UAE's partnership index rates highest first. */
export const neighboursOf = (d: CaseData): string[] => uniq([...d.neighbours.ring1].sort((a, z) => (z.part ?? -1) - (a.part ?? -1)).map((n) => n.iso), [d.iso3]);
/** The countries of the first country's region with the largest goods trade with the UAE (latest year), the first country included. */
export function sameRegion(list: { iso3: string; region: string }[], first: string, t: TradeData | null): string[] {
  const reg = list.find((c) => c.iso3 === first)?.region; if (!reg) return [first]; const tot = (iso: string) => { const r = t?.countries[iso]?.a.at(-1); return r ? r[1] + r[2] : 0; };
  return uniq(list.filter((c) => c.region === reg && c.iso3 !== first).sort((a, z) => tot(z.iso3) - tot(a.iso3)).map((c) => c.iso3), [first]);
}
/** The UAE's largest goods-trade partners (latest year on file). */
export const largestPartners = (t: TradeData): string[] => uniq(Object.entries(t.countries).map(([iso, r]) => [iso, r.a.at(-1) ? r.a.at(-1)![1] + r.a.at(-1)![2] : 0] as const).sort((a, z) => z[1] - a[1]).map(([iso]) => iso));
/** The countries with the most direct routes from the UAE (active and seasonal), the best connected by air. */
export const bestConnected = (f: FlightData): string[] => uniq(Object.entries(f.countries).map(([iso, c]) => [iso, c.counts.active + c.counts.seasonal] as const).sort((a, z) => z[1] - a[1]).map(([iso]) => iso));
/** The countries the user has already briefed: those with the most desk products on file (`count` says how many for a country; none is left out). */
export const briefed = (isos: string[], count: (iso: string) => number): string[] => uniq(isos.map((iso) => [iso, count(iso)] as const).filter(([, n]) => n > 0).sort((a, z) => z[1] - a[1]).map(([iso]) => iso));
