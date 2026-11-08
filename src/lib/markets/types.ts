export type Exchange = "ADX" | "DFM" | "QSE";
export type Listing = {
  exchange: Exchange; symbol: string; name: string; nameAr?: string | null; currency: string; type: string; mic: string;
  /** DFM only: the ticker DFM's own disclosure feed uses for this issuer, when we could match one. */
  feedSymbol?: string | null; dfmFeed?: boolean;
  /** Other tickers the data vendor uses for the same company (e.g. EMAR for EMAAR). */
  aliases?: string[];
  /** Set by scripts/verify-markets.mjs when an alias is the one the vendor actually has data for. */
  vendorSymbol?: string;
  /** Set by scripts/verify-markets.mjs when the vendor returned no data for the symbol or any alias. */
  noVendorData?: boolean;
};
export type Bar = { t: string; o: number; h: number; l: number; c: number; v: number }; // t = ISO date (or datetime for intraday)
export type Quote = {
  symbol: string; price: number | null; open: number | null; high: number | null; low: number | null; prevClose: number | null;
  change: number | null; changePct: number | null; volume: number | null; avgVolume: number | null;
  wk52Low: number | null; wk52High: number | null; asOf: string | null; marketOpen: boolean | null; currency: string | null;
};
export type Stats = {
  marketCap: number | null; enterpriseValue: number | null; trailingPE: number | null; forwardPE: number | null; peg: number | null;
  priceToSales: number | null; priceToBook: number | null; evToRevenue: number | null; evToEbitda: number | null;
  grossMargin: number | null; operatingMargin: number | null; profitMargin: number | null; roa: number | null; roe: number | null;
  revenueTTM: number | null; ebitda: number | null; netIncomeTTM: number | null; epsTTM: number | null; revenueGrowthQ: number | null; earningsGrowthQ: number | null;
  totalCash: number | null; totalDebt: number | null; debtToEquity: number | null; currentRatio: number | null; bookValuePerShare: number | null;
  operatingCashFlow: number | null; freeCashFlow: number | null;
  sharesOutstanding: number | null; floatShares: number | null; beta: number | null; wk52Change: number | null;
  dividendRate: number | null; dividendYield: number | null; payoutRatio: number | null; dividendFrequency: string | null; exDividendDate: string | null; fiveYearAvgYield: number | null;
  fiscalYearEnds: string | null; mostRecentQuarter: string | null;
};
export type Profile = { sector: string | null; industry: string | null; employees: number | null; website: string | null; description: string | null; ceo: string | null; city: string | null; country: string | null };
export type Statement = { date: string; year: number | null; rows: Record<string, number | null> };
export type Dividend = { exDate: string; amount: number };
export type Earning = { date: string; estimate: number | null; actual: number | null; surprisePct: number | null };
export type Fundamentals = {
  stats: Stats | null; profile: Profile | null;
  income: Statement[]; balance: Statement[]; cashflow: Statement[];
  dividends: Dividend[]; earnings: Earning[];
  errors: Partial<Record<"stats" | "profile" | "income" | "balance" | "cashflow" | "dividends" | "earnings", string>>;
};
export type Provider = { provider: "twelvedata"; keyConfigured: boolean; fixtures: boolean };
export type ApiError = { error: "no_key" | "plan" | "not_found" | "rate" | "upstream"; message?: string };
export type Filing = {
  id: string; date: string; headline: string; type: string | null; period: string | null; dividendsPaymentDate: string | null;
  docs: { id: string; description: string; url: string; language: string | null; type: string | null; category: string | null }[];
};
