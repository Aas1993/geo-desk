// Twelve Data client — a licensed market-data vendor that lists ADX (XADS) and DFM (XDFM).
// We never scrape the exchanges: ADX forbids automated retrieval, and DFM's open feed only carries disclosures.
// Serialised queue + cache so a free-tier key (8 req/min) degrades to "slow", not "broken".
import type { ApiError, Bar, Dividend, Earning, Fundamentals, Listing, Profile, Quote, Statement, Stats } from "./types";

const BASE = process.env.TD_BASE ?? "https://api.twelvedata.com";
export const keyConfigured = () => { const k = process.env.TWELVEDATA_API_KEY; return !!k && k !== "demo"; };
export const fixturesOn = () => process.env.NODE_ENV !== "production" && process.env.GD_FIXTURES === "1";

export class MarketError extends Error { constructor(readonly kind: ApiError["error"], message?: string) { super(message ?? kind); } }

const num = (v: unknown): number | null => { if (v == null || v === "") return null; const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : null; };
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

// ---- queue + cache ----
const gap = () => Math.max(0, Math.round(60000 / Math.max(1, Number(process.env.TWELVEDATA_RPM) || 8)));
let chain: Promise<unknown> = Promise.resolve();
const cache = new Map<string, { exp: number; v: unknown }>(); const inflight = new Map<string, Promise<unknown>>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(path: string, params: Record<string, string | number>, ttlMs: number, cost = 1): Promise<Record<string, unknown>> {
  if (!keyConfigured()) throw new MarketError("no_key", "TWELVEDATA_API_KEY is not set");
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])); const url = `${BASE}/${path}?${q}`; // key added below, never cached/logged
  const hit = cache.get(url); if (hit && hit.exp > Date.now()) return hit.v as Record<string, unknown>;
  const dup = inflight.get(url); if (dup) return dup as Promise<Record<string, unknown>>;
  const run = chain.then(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch(`${url}&apikey=${process.env.TWELVEDATA_API_KEY}`, { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
        if (!j) throw new MarketError("upstream", `HTTP ${r.status}`);
        if (j.status === "error" || (typeof j.code === "number" && j.code >= 400)) {
          const code = Number(j.code); const msg = String(j.message ?? "");
          if (code === 429) { await sleep(8000 * (attempt + 1)); continue; }
          if (code === 404) throw new MarketError("not_found", msg);
          if (code === 403 || /plan|upgrade|pro|grow|enterprise/i.test(msg)) throw new MarketError("plan", msg);
          throw new MarketError(code === 401 ? "no_key" : "upstream", msg);
        }
        cache.set(url, { exp: Date.now() + ttlMs, v: j }); return j;
      }
      throw new MarketError("rate", "Rate limit — try again shortly");
    } finally { await sleep(gap() * cost); } // a batch of N symbols costs N credits
  });
  chain = run.catch(() => {});
  const p = run.finally(() => inflight.delete(url)); inflight.set(url, p); return p;
}
const vs = (l: Listing) => l.vendorSymbol ?? l.symbol;
const id = (l: Listing) => ({ symbol: vs(l), mic_code: l.mic });

// ---- mappers ----
export function mapQuote(l: Listing, j: Record<string, unknown>): Quote {
  const w = (j.fifty_two_week ?? {}) as Record<string, unknown>;
  return {
    symbol: l.symbol, price: num(j.close), open: num(j.open), high: num(j.high), low: num(j.low), prevClose: num(j.previous_close),
    change: num(j.change), changePct: num(j.percent_change), volume: num(j.volume), avgVolume: num(j.average_volume),
    wk52Low: num(w.low), wk52High: num(w.high), asOf: str(j.datetime), marketOpen: typeof j.is_market_open === "boolean" ? j.is_market_open : null, currency: str(j.currency),
  };
}
export async function quote(l: Listing): Promise<Quote> { return mapQuote(l, await call("quote", id(l), 60_000)); }

/** Batch quotes for the board. Twelve Data returns either one quote or an object keyed by symbol. */
export async function quotes(ls: Listing[]): Promise<Record<string, Quote | { error: string }>> {
  const out: Record<string, Quote | { error: string }> = {};
  const size = batchSize();
  for (let i = 0; i < ls.length; i += size) {
    const chunk = ls.slice(i, i + size).filter((l) => !l.noVendorData); if (!chunk.length) continue; const byTicker = new Map(chunk.map((l) => [vs(l), l]));
    const j = await call("quote", { symbol: chunk.map(vs).join(","), mic_code: chunk[0].mic }, 60_000, chunk.length);
    const entries: [string, Record<string, unknown>][] = typeof j.symbol === "string" ? [[j.symbol, j]] : Object.entries(j).filter(([, v]) => v && typeof v === "object") as [string, Record<string, unknown>][];
    for (const [sym, v] of entries) { const l = byTicker.get(sym); if (!l) continue; out[l.symbol] = v.status === "error" || v.code ? { error: String(v.message ?? "error") } : mapQuote(l, v); }
  }
  return out;
}

export type Range = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "2Y" | "5Y" | "MAX";
export const toBars = (j: Record<string, unknown>): Bar[] =>
  ((j.values as Record<string, unknown>[] | undefined) ?? []).map((v) => ({ t: String(v.datetime), o: num(v.open) ?? 0, h: num(v.high) ?? 0, l: num(v.low) ?? 0, c: num(v.close) ?? 0, v: num(v.volume) ?? 0 })).filter((b) => b.c > 0).reverse();

/** Two years of daily bars — the base for 1M…1Y views and every indicator (SMA 200 needs ≥200 bars). */
export async function daily(l: Listing): Promise<Bar[]> { return toBars(await call("time_series", { ...id(l), interval: "1day", outputsize: 520 }, 15 * 60_000)); }
export async function bars(l: Listing, range: Range): Promise<{ bars: Bar[]; interval: string }> {
  if (range === "1D") return { bars: toBars(await call("time_series", { ...id(l), interval: "5min", outputsize: 80 }, 120_000)), interval: "5min" };
  if (range === "5D") return { bars: toBars(await call("time_series", { ...id(l), interval: "30min", outputsize: 70 }, 300_000)), interval: "30min" };
  if (range === "5Y") return { bars: toBars(await call("time_series", { ...id(l), interval: "1week", outputsize: 262 }, 3600_000)), interval: "1week" };
  if (range === "MAX") return { bars: toBars(await call("time_series", { ...id(l), interval: "1month", outputsize: 600 }, 3600_000)), interval: "1month" };
  const all = await daily(l); if (range === "2Y") return { bars: all, interval: "1day" };
  const n = { "1M": 23, "3M": 66, "6M": 130, "1Y": 260 }[range as "1M"];
  if (range === "YTD") { const y = all.length ? all[all.length - 1].t.slice(0, 4) : ""; const i = all.findIndex((b) => b.t.startsWith(y)); return { bars: all.slice(Math.max(0, i - 1)), interval: "1day" }; }
  return { bars: all.slice(-n), interval: "1day" };
}

/** Symbols per batched request: never more than the per-minute credit allowance, so free keys (8/min) still work, just slowly. */
const batchSize = () => Math.max(1, Math.min(40, Number(process.env.TWELVEDATA_RPM) || 8));

/** Batched daily bars: one request for up to 40 symbols (the vendor bills per symbol). */
export async function dailyMany(ls: Listing[]): Promise<Record<string, Bar[]>> {
  const out: Record<string, Bar[]> = {};
  const size = batchSize();
  for (let i = 0; i < ls.length; i += size) {
    const chunk = ls.slice(i, i + size).filter((l) => !l.noVendorData); if (!chunk.length) continue; const byTicker = new Map(chunk.map((l) => [vs(l), l]));
    const j = await call("time_series", { symbol: chunk.map(vs).join(","), mic_code: chunk[0].mic, interval: "1day", outputsize: 300 }, 15 * 60_000, chunk.length);
    const entries: [string, Record<string, unknown>][] = chunk.length === 1 || Array.isArray(j.values) ? [[vs(chunk[0]), j]] : (Object.entries(j).filter(([, v]) => v && typeof v === "object") as [string, Record<string, unknown>][]);
    for (const [sym, v] of entries) { const l = byTicker.get(sym); if (l && v.status !== "error") out[l.symbol] = toBars(v); }
  }
  return out;
}

// ---- fundamentals ----
function flatten(o: unknown, out: Record<string, number | null> = {}): Record<string, number | null> {
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) { if (v && typeof v === "object") flatten(v, out); else if (typeof v === "number" || v === null) out[k] = v as number | null; }
  return out;
}
export const statements = (j: Record<string, unknown>, key: string): Statement[] =>
  ((j[key] as Record<string, unknown>[] | undefined) ?? []).map((s) => ({ date: String(s.fiscal_date ?? s.quarter ?? ""), year: num(s.year), rows: flatten({ ...s, fiscal_date: undefined, year: undefined }) }));

export function mapStats(j: Record<string, unknown>): Stats {
  const s = (j.statistics ?? {}) as Record<string, Record<string, unknown>>; const v = s.valuations_metrics ?? {}, f = s.financials ?? {}, is = (f.income_statement ?? {}) as Record<string, unknown>,
    bs = (f.balance_sheet ?? {}) as Record<string, unknown>, cf = (f.cash_flow ?? {}) as Record<string, unknown>, ss = s.stock_statistics ?? {}, pr = s.stock_price_summary ?? {}, dv = s.dividends_and_splits ?? {};
  return {
    marketCap: num(v.market_capitalization), enterpriseValue: num(v.enterprise_value), trailingPE: num(v.trailing_pe), forwardPE: num(v.forward_pe), peg: num(v.peg_ratio),
    priceToSales: num(v.price_to_sales_ttm), priceToBook: num(v.price_to_book_mrq), evToRevenue: num(v.enterprise_to_revenue), evToEbitda: num(v.enterprise_to_ebitda),
    grossMargin: num(f.gross_margin), operatingMargin: num(f.operating_margin), profitMargin: num(f.profit_margin), roa: num(f.return_on_assets_ttm), roe: num(f.return_on_equity_ttm),
    revenueTTM: num(is.revenue_ttm), ebitda: num(is.ebitda), netIncomeTTM: num(is.net_income_to_common_ttm), epsTTM: num(is.diluted_eps_ttm), revenueGrowthQ: num(is.quarterly_revenue_growth), earningsGrowthQ: num(is.quarterly_earnings_growth_yoy),
    totalCash: num(bs.total_cash_mrq), totalDebt: num(bs.total_debt_mrq), debtToEquity: num(bs.total_debt_to_equity_mrq), currentRatio: num(bs.current_ratio_mrq), bookValuePerShare: num(bs.book_value_per_share_mrq),
    operatingCashFlow: num(cf.operating_cash_flow_ttm), freeCashFlow: num(cf.levered_free_cash_flow_ttm),
    sharesOutstanding: num(ss.shares_outstanding), floatShares: num(ss.float_shares), beta: num(pr.beta), wk52Change: num(pr.fifty_two_week_change),
    dividendRate: num(dv.forward_annual_dividend_rate), dividendYield: num(dv.forward_annual_dividend_yield), payoutRatio: num(dv.payout_ratio), dividendFrequency: str(dv.dividend_frequency), exDividendDate: str(dv.ex_dividend_date), fiveYearAvgYield: num(dv["5_year_average_dividend_yield"]),
    fiscalYearEnds: str(f.fiscal_year_ends), mostRecentQuarter: str(f.most_recent_quarter),
  };
}
export function mapProfile(j: Record<string, unknown>): Profile {
  return { sector: str(j.sector), industry: str(j.industry), employees: num(j.employees), website: str(j.website), description: str(j.description), ceo: str(j.CEO)?.trim() ?? null, city: str(j.city), country: str(j.country) };
}
export type Section = "stats" | "profile" | "income" | "balance" | "cashflow" | "dividends" | "earnings";
export const ALL_SECTIONS: Section[] = ["stats", "profile", "income", "balance", "cashflow", "dividends", "earnings"];
export async function fundamentals(l: Listing, period: "annual" | "quarterly", sections: Section[] = ALL_SECTIONS): Promise<Fundamentals> {
  const out: Fundamentals = { stats: null, profile: null, income: [], balance: [], cashflow: [], dividends: [], earnings: [], errors: {} };
  const day = 24 * 3600_000; const p = { ...id(l), period };
  const tasks: [keyof Fundamentals["errors"], () => Promise<void>][] = [
    ["stats", async () => { out.stats = mapStats(await call("statistics", id(l), day)); }],
    ["profile", async () => { out.profile = mapProfile(await call("profile", id(l), 7 * day)); }],
    ["income", async () => { out.income = statements(await call("income_statement", p, day), "income_statement"); }],
    ["balance", async () => { out.balance = statements(await call("balance_sheet", p, day), "balance_sheet"); }],
    ["cashflow", async () => { out.cashflow = statements(await call("cash_flow", p, day), "cash_flow"); }],
    ["dividends", async () => { out.dividends = (((await call("dividends", { ...id(l), range: "5y" }, day / 2)).dividends as Record<string, unknown>[]) ?? []).map((d): Dividend => ({ exDate: String(d.ex_date), amount: num(d.amount) ?? 0 })); }],
    ["earnings", async () => { out.earnings = (((await call("earnings", { ...id(l), outputsize: 12 }, day / 2)).earnings as Record<string, unknown>[]) ?? []).map((e): Earning => ({ date: String(e.date), estimate: num(e.eps_estimate), actual: num(e.eps_actual), surprisePct: num(e.surprise_prc) })); }],
  ];
  for (const [key, run] of tasks) { if (!sections.includes(key)) continue; try { await run(); } catch (e) { out.errors[key] = e instanceof MarketError ? e.kind : "upstream"; if (e instanceof MarketError && e.kind === "no_key") break; } }
  return out;
}
