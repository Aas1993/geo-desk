// What a briefing run costs, and the ceiling it must stay under. Prices are $ per million tokens (Anthropic price list, cached 2026-10-06); a web search is billed at about 1 cent.
export type Price = { in: number; out: number; cacheRead: number; cacheWrite: number };
export const PRICE: Record<string, Price> = { "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 }, "claude-haiku-5-5": { in: 0.5, out: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } };
export const SEARCH_USD = 0.01;
/** The token price of a Message Batches request relative to the normal price. */
export const BATCH_FACTOR = 0.5;
/** The per-run ceiling in dollars. The default is 1; an operator can lower or raise it with DOSSIER_MAX_RUN_USD, but never above 5. */
export const maxRunUsd = (env: string | undefined) => { const n = Number(env); return Number.isFinite(n) && n > 0 ? Math.min(5, n) : 1; };
export type Tally = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number };
/** Estimated dollars for a tally of tokens and searches. An unknown model is priced like Opus, the dearest, so the ceiling errs on the safe side. */
/** Dollars for a tally. `factor` is the token price relative to the normal price (0.5 for the batch transport); web searches are billed at the same price either way. */
export function runUsd(t: Tally, model: string, factor: number = 1): number { if (!(factor > 0)) throw new Error("runUsd: the price factor must be a positive number"); const p = PRICE[model] ?? PRICE["claude-opus-5-5"]; return ((t.input * p.in + t.output * p.out + t.cacheRead * p.cacheRead + t.cacheWrite * p.cacheWrite) / 1e6) * factor + t.searches * SEARCH_USD; }
/** The most output tokens that still fit under the ceiling after what has been spent and a reserve for input and searches yet to come. */
export function outputRoom(spentUsd: number, ceilingUsd: number, model: string, reserveUsd = 0.15): number { const p = PRICE[model] ?? PRICE["claude-opus-5-5"]; return Math.max(0, Math.floor(((ceilingUsd - spentUsd - reserveUsd) / p.out) * 1e6)); }
