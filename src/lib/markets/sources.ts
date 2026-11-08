// Where the Markets page's prices come from, and every independent check on them that we looked for (public/data/markets-sources.json, built by scripts/build-markets-sources.mjs).
// Rule: the page says plainly that its prices have one source; a check counts only if it was reached openly, and anything else is listed as unavailable with the reason and the evidence.
export type Primary = { id: string; name: string; url: string; role: string; basis: string; plan: { ADX: string | null; DFM: string | null }; note: string };
export type Check = { id: string; name: string; url: string; status: "ok" | "unavailable"; checked: string; evidence: string[]; reason: string };
export type MarketSources = { built: string; primary: Primary; independentCheck: boolean; checks: Check[] };
let cache: Promise<MarketSources> | null = null;
export const loadMarketSources = (): Promise<MarketSources> => (cache ??= fetch("/data/markets-sources.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<MarketSources>; }).catch((e) => { cache = null; throw e; }));
/** One sentence on the state of the prices' verification, derived from the data so the label can never claim a check that is not there. */
export const verificationState = (m: MarketSources): "unchecked" | "checked" => (m.independentCheck && m.checks.some((c) => c.status === "ok") ? "checked" : "unchecked");
