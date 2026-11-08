"use client";
import { useEffect, useState } from "react";
export type Position = { usd: number; year: number; rank?: number };
export type InvestmentData = { built: string; world: Position; source: { name: string; url: string; note: string }; countries: Record<string, { outward?: Position; inward?: Position }> };
let cache: Promise<InvestmentData> | null = null;
/** UAE direct-investment positions by counterpart country (public/data/investment.json, rebuilt daily from the IMF). */
export const loadInvestment = () => (cache ??= fetch("/data/investment.json").then((r) => r.json() as Promise<InvestmentData>).catch((e) => { cache = null; throw e; }));
export function useInvestment(): InvestmentData | null {
  const [d, setD] = useState<InvestmentData | null>(null);
  useEffect(() => { let dead = false; loadInvestment().then((j) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, []);
  return d;
}
export const usd = (n: number) => { const a = Math.abs(n); const s = a >= 1e9 ? `${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}bn` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}m` : `${Math.round(a / 1e3)}k`; return `${n < 0 ? "−" : ""}$${s}`; };
