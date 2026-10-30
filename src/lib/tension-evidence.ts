// What the open public records say about each tension-register entry (public/data/tension-evidence.json, built by scripts/build-tension-evidence.mjs).
// A machine read shows a source exists, answers and holds the words the entry relies on. It never turns an entry into a verified one: `verified` in the register stays an analyst's call.
export type Check = { label: string; url: string; status: number; found: boolean | null; how: "page" | "feed" | "library search"; at: string; expect?: string; note?: string };
export type UnDoc = { symbol: string | null; title: string; date: string | null; url: string };
export type EntryEvidence = { checks: Check[]; icj?: string[]; undl?: { query: string; note: string | null; total: number; capped?: boolean; records: UnDoc[]; at: string } };
export type IcjCase = { id: string; title: string; url: string; status: number; latest: { release: string; date: string; title: string } | null; outcome: string | null };
export type TensionEvidence = {
  built: string;
  sources: Record<string, { id: string; name: string; publisher: string; url: string; basis: string; note?: string; status: "ok" | "failed"; rows: number }>;
  unavailable: { name: string; url: string; reason: string }[];
  icj: { cases: IcjCase[] };
  tone: { single: boolean; source: { name: string; url: string }; unavailable: { name: string; url: string; reason: string }[]; probedAt: string };
  crisisgroup: { uae: { title: string; url: string; date: string | null }[]; feedItems: number };
  entries: Record<string, EntryEvidence>;
};
let cache: Promise<TensionEvidence> | null = null;
export const loadTensionEvidence = (): Promise<TensionEvidence> => (cache ??= fetch("/data/tension-evidence.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<TensionEvidence>; }).catch((e) => { cache = null; throw e; }));

export const evidenceKey = (iso3: string, kind: string) => `${iso3}-${kind}`;
export type CheckTally = { found: number; missing: number; unread: number; total: number; level: "read" | "partial" | "unread" };
/** How many of an entry's sources were read and held the expected text. "missing" means the page answered without it: the entry may be out of date, which a person should look at. */
export function tally(e: EntryEvidence | undefined): CheckTally {
  const c = e?.checks ?? []; const found = c.filter((x) => x.found === true).length, missing = c.filter((x) => x.found === false).length, unread = c.filter((x) => x.found === null).length;
  return { found, missing, unread, total: c.length, level: !c.length || found === 0 ? "unread" : found === c.length ? "read" : "partial" };
}
