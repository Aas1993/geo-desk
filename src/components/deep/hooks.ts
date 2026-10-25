"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ResearchResult } from "@/lib/deep/research";
import type { Snapshot } from "@/lib/deep/snapshot";

// Data hooks for the Deep Intelligence desk. The snapshot and the research cards each load once per country and are shared by every tab, so a figure is fetched and computed once.
export type Load<T> = { data: T | null; err: string; loading: boolean; reload: () => void };
export function useJson<T>(url: string | null): Load<T> {
  const [s, set] = useState<{ data: T | null; err: string; loading: boolean }>({ data: null, err: "", loading: !!url }); const [n, setN] = useState(0);
  useEffect(() => { let dead = false; const t = setTimeout(() => { if (!url) { set({ data: null, err: "", loading: false }); return; } set((x) => ({ ...x, loading: true, err: "" })); fetch(url).then(async (r) => { if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { message?: string }).message ?? String(r.status)); return r.json() as Promise<T>; }).then((d) => { if (!dead) set({ data: d, err: "", loading: false }); }).catch((e: Error) => { if (!dead) set({ data: null, err: e.message, loading: false }); }); }, 0); return () => { dead = true; clearTimeout(t); }; }, [url, n]);
  return { ...s, reload: useCallback(() => setN((x) => x + 1), []) };
}
export const useSnapshot = (iso: string | null) => useJson<Snapshot>(`/api/deep/snapshot${iso ? `?iso3=${iso}` : ""}`);
export const useResearch = (iso: string | null) => useJson<ResearchResult>(`/api/deep/research${iso ? `?iso3=${iso}` : ""}`);

/** A value kept in this browser's local storage (the desk has no accounts): read after mount, written on change, and safe when storage is blocked. */
export function useStored<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [v, setV] = useState<T>(init); const [ready, setReady] = useState(false); const keyRef = useRef(key);
  useEffect(() => { keyRef.current = key; const t = setTimeout(() => { try { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s) as T); else setV(init); } catch { /* storage unavailable */ } setReady(true); }, 0); return () => clearTimeout(t); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback((x: T | ((p: T) => T)) => setV((p) => { const n = typeof x === "function" ? (x as (p: T) => T)(p) : x; try { localStorage.setItem(keyRef.current, JSON.stringify(n)); } catch { /* storage unavailable */ } return n; }), []);
  return [v, set, ready];
}

/** The filters every Deep tab shares (specification section 2): country, region, topic, sector, horizon, language, as-of date and access. Kept in the browser. */
export type DeepFilters = { iso: string | null; region: string; topic: string; sector: string; horizon: number; lang: "any" | "en" | "ar"; asOf: string; access: "any" | "feed" | "search" };
export const DEFAULT_DEEP: DeepFilters = { iso: null, region: "", topic: "", sector: "", horizon: 3, lang: "any", asOf: "", access: "any" };
export function useDeepFilters() {
  const [f, set] = useStored<DeepFilters>("gd-deep-filters", DEFAULT_DEEP);
  return [{ ...DEFAULT_DEEP, ...f }, useCallback((p: Partial<DeepFilters>) => set((x) => ({ ...DEFAULT_DEEP, ...x, ...p })), [set])] as const;
}
/** A cost log of the paid runs made from this desk, in this browser: the input to the cost dashboard. */
export type CostEntry = { at: string; kind: "council" | "research" | "architect" | "ambassador"; usd: number; cached: boolean; searches: number; fetches: number; cacheRead: number; input: number; output: number; ms: number; scope: string };
export const COST_KEY = "gd-deep-costs";
export const logCost = (e: CostEntry) => { try { const l = JSON.parse(localStorage.getItem(COST_KEY) ?? "[]") as CostEntry[]; localStorage.setItem(COST_KEY, JSON.stringify([...l, e].slice(-200))); window.dispatchEvent(new Event("gd-deep-cost")); } catch { /* storage unavailable */ } };
