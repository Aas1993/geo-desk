"use client";
import { useCallback, useEffect, useState } from "react";
import { DOMAINS, FILTER_HORIZONS, ISSUES } from "@/lib/dossier/strategy";

// The persistent filters of the module (specification section 3): country or region, issue, horizon, evidence cutoff, approved strategic objective and security domain. Language follows the site toggle.
export type Filters = { iso: string | null; issue: string; horizon: string; domain: string; cutoff: string; objective: string };
export const DEFAULT_FILTERS: Filters = { iso: null, issue: "", horizon: "all", domain: "", cutoff: "", objective: "" };
const KEY = "gd-mach-filters";
export function useFilters() {
  const [f, set] = useState<Filters>(DEFAULT_FILTERS);
  useEffect(() => { const t = setTimeout(() => { try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Filters> | null; if (s) set({ ...DEFAULT_FILTERS, ...s, issue: ISSUES.some((i) => i[0] === s.issue) ? (s.issue ?? "") : "", domain: DOMAINS.some((d) => d[0] === s.domain) ? (s.domain ?? "") : "", horizon: FILTER_HORIZONS.some((h) => h[0] === s.horizon) ? (s.horizon ?? "all") : "all" }); } catch { /* none saved */ } const h = location.hash.replace("#", "").split(":"); if (/^[A-Z]{3}$/.test(h[1] ?? "")) set((x) => ({ ...x, iso: h[1] })); }, 0); return () => clearTimeout(t); }, []);
  const update = useCallback((p: Partial<Filters>) => set((x) => { const n = { ...x, ...p }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* storage unavailable */ } return n; }), []);
  return [f, update] as const;
}
/** The body fields every strategy product takes from the filters. */
export const filterBody = (f: Filters) => ({ issue: f.issue, horizon: f.horizon, domain: f.domain, cutoff: f.cutoff, notes: f.objective ? { objectives: f.objective } : undefined });
