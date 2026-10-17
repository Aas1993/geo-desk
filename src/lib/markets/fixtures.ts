// DEV-ONLY synthetic data (GD_FIXTURES=1, never in production). It exists so the stock UI can be built and
// checked without a vendor key. Every response built from it is flagged `synthetic: true` and the UI shows a banner.
import type { Bar, Fundamentals, Listing, Quote, Statement } from "./types";
import type { Range } from "./td";

function rng(seedStr: string) { let h = 2166136261; for (const c of seedStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function dailyFx(l: Listing, n = 520): Bar[] {
  const r = rng(l.symbol + l.exchange); let p = 1 + r() * 25; const drift = (r() - 0.35) * 0.0006, vol = 0.008 + r() * 0.014; const baseV = 2e5 + r() * 8e6;
  const days: Date[] = []; const d = new Date(Date.UTC(2026, 9, 16)); // last session: Fri 16 Oct 2026
  while (days.length < n) { if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(new Date(d)); d.setUTCDate(d.getUTCDate() - 1); }
  days.reverse(); const out: Bar[] = [];
  for (const day of days) {
    const o = p; const c = Math.max(0.05, o * Math.exp(drift + vol * gauss(r))); const h = Math.max(o, c) * (1 + r() * vol), lo = Math.min(o, c) * (1 - r() * vol);
    out.push({ t: iso(day), o: +o.toFixed(3), h: +h.toFixed(3), l: +lo.toFixed(3), c: +c.toFixed(3), v: Math.round(baseV * (0.5 + r()) * (1 + Math.abs(c / o - 1) * 20)) }); p = c;
  }
  return out;
}
export function barsFx(l: Listing, range: Range): { bars: Bar[]; interval: string } {
  const all = dailyFx(l);
  if (range === "1D" || range === "5D") {
    const r = rng(l.symbol + range); const sessions = range === "1D" ? 1 : 5; const step = range === "1D" ? 5 : 30; const out: Bar[] = []; let p = all[all.length - sessions - 1].c;
    for (const day of all.slice(-sessions)) for (let m = 10 * 60; m < 15 * 60; m += step) { const o = p, c = Math.max(0.05, o * (1 + 0.002 * gauss(r))); out.push({ t: `${day.t} ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c: +c.toFixed(3), v: Math.round(2e4 * (0.5 + r())) }); p = c; }
    return { bars: out, interval: `${step}min` };
  }
  if (range === "2Y") return { bars: all, interval: "1day" };
  if (range === "5Y" || range === "MAX") { const w = all.filter((_, i) => i % 5 === 0); return { bars: w, interval: "1week" }; }
  if (range === "YTD") { const y = all[all.length - 1].t.slice(0, 4); const i = all.findIndex((b) => b.t.startsWith(y)); return { bars: all.slice(Math.max(0, i - 1)), interval: "1day" }; }
  return { bars: all.slice(-({ "1M": 23, "3M": 66, "6M": 130, "1Y": 260 }[range])), interval: "1day" };
}
export function quoteFx(l: Listing): Quote {
  const b = dailyFx(l); const last = b[b.length - 1], prev = b[b.length - 2]; const yr = b.slice(-260);
  return { symbol: l.symbol, price: last.c, open: last.o, high: last.h, low: last.l, prevClose: prev.c, change: +(last.c - prev.c).toFixed(3), changePct: +(((last.c / prev.c) - 1) * 100).toFixed(3), volume: last.v, avgVolume: Math.round(b.slice(-30).reduce((a, x) => a + x.v, 0) / 30), wk52Low: Math.min(...yr.map((x) => x.l)), wk52High: Math.max(...yr.map((x) => x.h)), asOf: last.t, marketOpen: false, currency: l.currency };
}
function stmt(r: () => number, kind: "income" | "balance" | "cashflow", n: number, quarterly: boolean): Statement[] {
  const rev0 = (2e8 + r() * 6e9) * (quarterly ? 0.25 : 1); const out: Statement[] = [];
  for (let i = 0; i < n; i++) {
    const g = Math.pow(1.07 + r() * 0.04, -i); const rev = rev0 * g; const date = quarterly ? `${2026 - Math.floor((i + 1) / 4)}-${["09", "06", "03", "12"][i % 4]}-30` : `${2025 - i}-12-31`; const gp = rev * (0.3 + r() * 0.25), op = gp * (0.45 + r() * 0.2), ni = op * (0.7 + r() * 0.2);
    const rows: Record<string, number> = kind === "income" ? { sales: rev, cost_of_goods: rev - gp, gross_profit: gp, operating_income: op, ebitda: op * 1.15, pretax_income: op * 0.95, income_tax: op * 0.05, net_income: ni, eps_diluted: ni / (2e9) }
      : kind === "balance" ? { cash_and_cash_equivalents: rev * 0.4, total_current_assets: rev * 1.1, total_assets: rev * 3.4 * g, total_current_liabilities: rev * 0.5, total_liabilities: rev * 1.6 * g, short_term_debt: rev * 0.12, long_term_debt: rev * 0.5, total_shareholders_equity: rev * 1.8 * g }
      : { net_income: ni, depreciation: op * 0.12, operating_cash_flow: ni * 1.2, capital_expenditures: -rev * 0.1, investing_cash_flow: -rev * 0.14, financing_cash_flow: -rev * 0.2, common_dividends: -ni * 0.4, free_cash_flow: ni * 1.2 - rev * 0.1 };
    out.push({ date, year: +date.slice(0, 4), rows });
  }
  return out;
}
export function fundamentalsFx(l: Listing, period: "annual" | "quarterly"): Fundamentals {
  const r = rng(l.symbol + "f"); const q = quoteFx(l); const sh = 5e8 + r() * 9e9; const mc = (q.price ?? 1) * sh; const eps = (q.price ?? 1) / (6 + r() * 20);
  return {
    profile: { sector: ["Financial Services", "Real Estate", "Energy", "Industrials", "Utilities", "Consumer Defensive"][Math.floor(r() * 6)], industry: "Synthetic test industry", employees: Math.round(500 + r() * 30000), website: null, description: "SYNTHETIC TEST DATA — generated locally so the interface can be developed without a market-data key. None of these figures describe the real company.", ceo: null, city: l.exchange === "ADX" ? "Abu Dhabi" : "Dubai", country: "United Arab Emirates" },
    stats: { marketCap: mc, enterpriseValue: mc * 1.1, trailingPE: (q.price ?? 1) / eps, forwardPE: (q.price ?? 1) / (eps * 1.08), peg: 1 + r(), priceToSales: 1 + r() * 4, priceToBook: 0.6 + r() * 2.5, evToRevenue: 2 + r() * 4, evToEbitda: 6 + r() * 8, grossMargin: 0.3 + r() * 0.3, operatingMargin: 0.15 + r() * 0.25, profitMargin: 0.1 + r() * 0.25, roa: 0.02 + r() * 0.08, roe: 0.06 + r() * 0.2, revenueTTM: mc / (1 + r() * 4), ebitda: mc / 8, netIncomeTTM: mc / (8 + r() * 12), epsTTM: eps, revenueGrowthQ: -0.05 + r() * 0.3, earningsGrowthQ: -0.1 + r() * 0.4, totalCash: mc * 0.1, totalDebt: mc * 0.2, debtToEquity: 20 + r() * 120, currentRatio: 0.8 + r() * 1.6, bookValuePerShare: (q.price ?? 1) / (0.6 + r() * 2.5), operatingCashFlow: mc / 7, freeCashFlow: mc / 11, sharesOutstanding: sh, floatShares: sh * (0.2 + r() * 0.6), beta: 0.5 + r() * 1.2, wk52Change: -0.2 + r() * 0.7, dividendRate: (q.price ?? 1) * 0.04, dividendYield: 0.02 + r() * 0.05, payoutRatio: 0.3 + r() * 0.5, dividendFrequency: "Annual", exDividendDate: "2026-04-10", fiveYearAvgYield: 4.1, fiscalYearEnds: "2025-12-31", mostRecentQuarter: "2026-06-30" },
    income: stmt(r, "income", period === "annual" ? 5 : 8, period === "quarterly"), balance: stmt(r, "balance", period === "annual" ? 5 : 8, period === "quarterly"), cashflow: stmt(r, "cashflow", period === "annual" ? 5 : 8, period === "quarterly"),
    dividends: Array.from({ length: 5 }, (_, i) => ({ exDate: `${2026 - i}-04-10`, amount: +((q.price ?? 1) * (0.03 + r() * 0.02)).toFixed(3) })),
    earnings: Array.from({ length: 8 }, (_, i) => { const e = eps / 4 * (1 - i * 0.03); const a = e * (0.9 + r() * 0.25); return { date: `${2026 - Math.floor(i / 4)}-${["08", "05", "02", "11"][i % 4]}-14`, estimate: +e.toFixed(3), actual: +a.toFixed(3), surprisePct: +((a / e - 1) * 100).toFixed(2) }; }),
    errors: {},
  };
}
