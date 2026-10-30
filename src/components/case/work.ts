"use client";
import { useCallback, useEffect, useState } from "react";
import type { Work } from "@/lib/case/board";
import { baselineKey, type Baseline } from "@/lib/case/changes";
import { DECISIONS_KEY, logByCountry } from "@/lib/case/log";
import type { Decision } from "@/lib/deep/registers";

/** What this browser holds for the Case File, read live and shared by every screen: the decision log, the review baselines, and which countries have a Council or a strategy on file. */
const EV = "gd-case-work";
const rd = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : d; } catch { return d; } };
export const announce = () => { try { window.dispatchEvent(new Event(EV)); } catch { /* ignore */ } };
function useLive<T>(read: () => T, init: T): T {
  const [v, set] = useState<T>(init);
  useEffect(() => { const f = () => set(read()); const t0 = setTimeout(f, 0); window.addEventListener(EV, f); window.addEventListener("storage", f); window.addEventListener("focus", f); return () => { clearTimeout(t0); window.removeEventListener(EV, f); window.removeEventListener("storage", f); window.removeEventListener("focus", f); }; }, [read]);
  return v;
}
/** The decision log: the same records the Deep Intelligence register keeps, kept in sync across screens. */
export function useDecisionLog(): [Decision[], (f: (p: Decision[]) => Decision[]) => void] {
  const read = useCallback(() => rd<Decision[]>(DECISIONS_KEY, []), []); const ds = useLive(read, [] as Decision[]);
  const set = useCallback((f: (p: Decision[]) => Decision[]) => { const n = f(rd<Decision[]>(DECISIONS_KEY, [])); try { localStorage.setItem(DECISIONS_KEY, JSON.stringify(n)); } catch { /* storage full */ } announce(); }, []);
  return [ds, set];
}
export const readBaseline = (iso: string): Baseline | null => { const b = rd<Baseline | null>(baselineKey(iso), null); return b && b.state ? b : null; };
export const writeBaseline = (iso: string, b: Baseline) => { try { localStorage.setItem(baselineKey(iso), JSON.stringify(b)); } catch { /* storage full */ } announce(); };
/** For the Priority board: per country, a Council or strategy on file, the review baseline and the decision counts. */
export function useWork(today: number): Record<string, Work> {
  const read = useCallback(() => {
    const out: Record<string, Work> = {}; const get = (iso: string) => (out[iso] ??= { council: false, arch: false, baseline: null, log: null, king: null });
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) ?? ""; let m = /^gd-case-council:([A-Z]{3})$/.exec(k); if (m) { get(m[1]).council = true; continue; } m = /^gd-case-architect:([A-Z]{3})$/.exec(k); if (m) { get(m[1]).arch = true; continue; } m = /^gd-case-baseline:([A-Z]{3})$/.exec(k); if (m) { get(m[1]).baseline = readBaseline(m[1]); continue; } m = /^gd-case-king:([A-Z]{3})$/.exec(k); if (m) { const r = rd<{ verdict?: string; at?: string } | null>(k, null); if (r?.verdict && r.at) get(m[1]).king = { verdict: r.verdict, at: r.at }; } } } catch { /* storage unavailable */ }
    const by = logByCountry(rd<Decision[]>(DECISIONS_KEY, []), today); for (const [iso, c] of Object.entries(by)) get(iso).log = c; return out;
  }, [today]);
  return useLive(read, {} as Record<string, Work>);
}
/** The review baseline of one country, read live. */
export function useBaseline(iso: string | null): Baseline | null { const read = useCallback(() => (iso ? readBaseline(iso) : null), [iso]); return useLive(read, null as Baseline | null); }
