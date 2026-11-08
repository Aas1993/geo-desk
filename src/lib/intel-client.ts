"use client";
import { useEffect, useState } from "react";
import type { OutlookData, PartnershipData, TradeData } from "./intel";
export * from "./intel";

const once = <T,>(url: string) => { let p: Promise<T> | null = null; return () => (p ??= fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status))))).catch((e) => { p = null; throw e; })); };
export const loadTrade = once<TradeData>("/data/trade.json"), loadOutlook = once<OutlookData>("/data/outlook.json"), loadPartnership = once<PartnershipData>("/data/partnership.json");
function useLoaded<T>(load: () => Promise<T>): T | null { const [d, setD] = useState<T | null>(null); useEffect(() => { let dead = false; load().then((j) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, [load]); return d; }
export const useTrade = () => useLoaded(loadTrade), useOutlook = () => useLoaded(loadOutlook), usePartnership = () => useLoaded(loadPartnership);
