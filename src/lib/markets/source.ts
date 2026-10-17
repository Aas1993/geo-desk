// One entry point for market data: fixtures (dev only, flagged) or the Twelve Data vendor.
import * as td from "./td";
import * as fx from "./fixtures";
import type { Bar, Fundamentals, Listing, Quote } from "./types";
export { MarketError, keyConfigured, fixturesOn } from "./td";
export type { Range } from "./td";

export async function getQuote(l: Listing): Promise<Quote> { return td.fixturesOn() ? fx.quoteFx(l) : td.quote(l); }
export async function getBars(l: Listing, range: td.Range) { return td.fixturesOn() ? fx.barsFx(l, range) : td.bars(l, range); }
export async function getDaily(l: Listing): Promise<Bar[]> { return td.fixturesOn() ? fx.dailyFx(l) : td.daily(l); }
export async function getFundamentals(l: Listing, period: "annual" | "quarterly", sections?: td.Section[]): Promise<Fundamentals> { return td.fixturesOn() ? fx.fundamentalsFx(l, period) : td.fundamentals(l, period, sections); }
export { ALL_SECTIONS, type Section } from "./td";
export async function getQuotes(ls: Listing[]) {
  if (td.fixturesOn()) return Object.fromEntries(ls.map((l) => [l.symbol, fx.quoteFx(l)]));
  return td.quotes(ls);
}
/** Daily bars for many listings at once (board enrichment). Vendor: one batched time_series call per 40 symbols. */
export async function getDailyMany(ls: Listing[]): Promise<Record<string, Bar[]>> {
  if (td.fixturesOn()) return Object.fromEntries(ls.map((l) => [l.symbol, fx.dailyFx(l)]));
  return td.dailyMany(ls);
}
