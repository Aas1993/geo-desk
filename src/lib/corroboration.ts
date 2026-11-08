// Corroboration of the UAE deals in deals.json (public/data/deals.json, from WAM headlines) by other publishers and by company or exchange filings (public/data/deals-xcheck.json, built by scripts/build-deals-xcheck.mjs).
// Rules: a deal is "corroborated" only when at least two independent publishers carry it (WAM counts as one); a syndicated copy of the WAM text is not a second publisher; a filing by the company itself counts as a publisher.
// The match is deliberately strict (investor named, plus shared specifics of the deal), so a deal reported in different words stays at one publisher: that is a gap in what we could match, not a finding that nobody else reported it.
// This file has no imports and uses only erasable TypeScript, so the build script can load it with Node directly.
export type DealRef = { u: string; d: string; t: string; c: string[]; by: string[] };
export type Article = { title: string; summary?: string; date: string };
export type SrcKind = "news" | "filing";
export type Hit = { p: string; name: string; kind: SrcKind; url: string; title: string; d: string; syndicated?: boolean };
export type DealCheck = { hits: Hit[]; checked: string[] };
export type DealsX = {
  built: string;
  sources: Record<string, { id: string; name: string; publisher: string; kind: SrcKind; url: string; basis: string; note?: string; status: "ok" | "failed"; rows: number; from?: string | null; to?: string | null }>;
  unavailable: { name: string; url: string; reason: string }[];
  items: Record<string, DealCheck>;
};
export type Level = "corroborated" | "single";
export type Corroboration = { count: number; level: Level; publishers: { p: string; name: string; kind: SrcKind; url: string; title: string; d: string }[]; syndicated: Hit[]; checked: string[] };

const STOP = new Set(("the and for with from into that this will have has had its their them they are was were been being than then also over under after before about more most such only other new all any one two three four five six seven eight nine ten first second third said says say per via inc ltd llc pjsc plc group company companies holding holdings corp corporation limited " +
  "invest invests investing investment investments investor billion million trillion bn mn usd aed dollar dollars dirham dirhams sign signs signed signing agreement agreements deal deals partnership partner partners launch launches launched announce announces announced acquisition acquire acquires acquired stake complete completes completed expand expands expansion project projects secure secures secured award awards awarded " +
  "build builds building backs supply supplies plan plans opens breaks ground major large key uae emirates emirati abu dhabi dubai sharjah wam national international global regional million").split(" "));
export const fold = (s: string): string => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9$ ]/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string): string[] => fold(s).split(" ").filter(Boolean);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The investor appears in the text as a whole phrase. Short all-capital names (EDGE, XRG, DEWA) must match in capitals so a common word is not mistaken for the company. */
export function mentions(text: string, name: string): boolean {
  const n = name.trim(); if (!n) return false;
  if (n.length <= 4 && n === n.toUpperCase()) return new RegExp(`(^|[^A-Za-z0-9])${escapeRe(n)}([^A-Za-z0-9]|$)`).test(text);
  return new RegExp(`(^|[^a-z0-9])${escapeRe(fold(n))}([^a-z0-9]|$)`).test(fold(text));
}
/** The words of a deal headline that say what the deal is, once the investors, countries and generic deal-speak are removed. */
export function specifics(deal: Pick<DealRef, "t" | "by">, countryNames: string[]): string[] {
  const drop = new Set([...deal.by.flatMap(words), ...countryNames.flatMap(words)]);
  return [...new Set(words(deal.t).filter((w) => w.length >= 3 && !STOP.has(w) && !drop.has(w) && !/^\d+$/.test(w)))];
}
const DAY = 86_400_000;
export const daysBetween = (a: string, b: string): number => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);

export type Match = { ok: boolean; shared: string[]; investor: boolean; country: boolean };
/** Does this article report this deal? The article must come from one day before the WAM item to a week after, name an investor, and share at least two specifics of the deal (or one plus the partner country). */
export function matchDeal(deal: DealRef, art: Article, countryNames: string[]): Match {
  const lag = daysBetween(deal.d, art.date); const text = `${art.title} ${art.summary ?? ""}`;
  const none: Match = { ok: false, shared: [], investor: false, country: false }; if (!Number.isFinite(lag) || lag < -1 || lag > 7) return none;
  const investor = deal.by.some((b) => mentions(text, b)); if (!investor) return none;
  const country = countryNames.some((n) => mentions(text, n)); const have = new Set(words(text)); const shared = specifics(deal, countryNames).filter((w) => have.has(w));
  return { ok: shared.length >= 2 || (shared.length >= 1 && country), shared, investor, country };
}
/** An article that carries the WAM headline unchanged (or all but a word) is a copy of the same wire item, not a second publisher. */
export function isSyndicated(dealTitle: string, artTitle: string): boolean {
  const a = new Set(words(dealTitle)), b = words(artTitle); if (a.size < 4 || b.length < 4) return false;
  const inter = b.filter((w) => a.has(w)).length; return inter / Math.max(a.size, b.length) >= 0.85;
}
/** One verdict from the stored hits: distinct publishers (one per publisher id), WAM counted as the first. */
export function corroboration(check: DealCheck | undefined): Corroboration {
  const seen = new Map<string, Corroboration["publishers"][number]>(); const syndicated: Hit[] = [];
  for (const h of check?.hits ?? []) { if (h.syndicated) { syndicated.push(h); continue; } const cur = seen.get(h.p); if (!cur || h.d < cur.d) seen.set(h.p, { p: h.p, name: h.name, kind: h.kind, url: h.url, title: h.title, d: h.d }); }
  const publishers = [...seen.values()].sort((a, b) => a.d.localeCompare(b.d)); const count = 1 + publishers.length;
  return { count, level: count >= 2 ? "corroborated" : "single", publishers, syndicated, checked: check?.checked ?? [] };
}
/** Was this deal inside the span a feed could answer for? A deal older than the feed's oldest item cannot be checked against it; that stays a gap. */
export const inWindow = (dealDate: string, from: string | null | undefined, to: string | null | undefined): boolean => !!from && !!to && daysBetween(from, dealDate) >= 1 && daysBetween(dealDate, to) >= 0;
