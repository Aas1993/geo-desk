import type { Country } from "@/lib/types";
import type { ResearchResult } from "@/lib/deep/research";
import type { Snapshot } from "@/lib/deep/snapshot";
import type { Lang } from "../falcon/bits";
import type { DeepFilters } from "./hooks";

/** What every Deep tab receives: the shared filters, the shared data snapshot and research cards (each loaded once), and the country list. */
export type TabProps = { L: Lang; f: DeepFilters; setF: (p: Partial<DeepFilters>) => void; snap: Snapshot | null; snapErr: string; snapLoading: boolean; res: ResearchResult | null; resErr: string; resLoading: boolean; reloadRes: () => void; list: Country[]; by: Map<string, Country>; name: string | null; go: (t: string) => void };
export const tx = (L: Lang, b: { en: string; ar: string }) => (L === "ar" ? b.ar : b.en);
export const fmtN = (v: number | null | undefined, d = 1) => (v == null || !isFinite(v) ? "n/a" : v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }));
export const usdM = (m: number | null | undefined) => (m == null ? "n/a" : Math.abs(m) >= 1000 ? `US$${(m / 1000).toFixed(1)}bn` : `US$${Math.round(m)}m`);
export const stateColor = (s: string) => (s === "alert" ? "var(--risk)" : s === "watch" ? "var(--warn)" : s === "ok" ? "var(--ok)" : "var(--t2)");
export const STATE_LABEL: Record<string, { en: string; ar: string }> = { ok: { en: "In range", ar: "ضمن النطاق" }, watch: { en: "Watch", ar: "مراقبة" }, alert: { en: "Alert", ar: "إنذار" }, na: { en: "No state", ar: "بلا حالة" } };
