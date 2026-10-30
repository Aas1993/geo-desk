"use client";
import { useEffect, useState } from "react";
import type { Dir, Item, StanceResult } from "./types";

export type Tone = { points: { t: number; v: number }[]; avg: number | null };
export type Tanks = { uae: Item[]; country: Item[]; shared: Item[] };
export type ToneMap = { built: string; coverage?: { measured: number; total: number }; global: { avg: number; points: number }; source?: { name: string; url: string; note: string }; countries: Record<string, { avg: number | null; points: number; trend?: number }> };
type Slot<T> = { data: T | null; err: string | null; loading: boolean };

const cache = new Map<string, unknown>(); // survives tab switches within a session
async function getPart<T>(iso3: string, part: string, dir: Dir, signal: AbortSignal): Promise<T> {
  const key = `${iso3}:${part}:${dir}`; if (cache.has(key)) return cache.get(key) as T;
  const r = await fetch(`/api/media/${iso3}?part=${part}&dir=${dir}`, { signal }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
  cache.set(key, j); return j as T;
}
/** Loads one section at a time (the server queues GDELT calls), so cards fill in as they arrive. */
export function useMedia(iso3: string, dir: Dir) {
  const [s, set] = useState<{ tone: Slot<Tone>; neg: Slot<{ items: Item[] }>; pos: Slot<{ items: Item[] }>; tanks: Slot<Tanks> }>({ tone: { data: null, err: null, loading: true }, neg: { data: null, err: null, loading: true }, pos: { data: null, err: null, loading: true }, tanks: { data: null, err: null, loading: true } });
  useEffect(() => {
    const ac = new AbortController(); let dead = false;
    const run = async <T,>(k: "tone" | "neg" | "pos" | "tanks") => {
      try { const d = await getPart<T>(iso3, k, dir, ac.signal); if (!dead) set((p) => ({ ...p, [k]: { data: d, err: null, loading: false } })); }
      catch (e) { if (!dead && (e as Error).name !== "AbortError") set((p) => ({ ...p, [k]: { data: null, err: (e as Error).message, loading: false } })); }
    };
    set({ tone: { data: null, err: null, loading: true }, neg: { data: null, err: null, loading: true }, pos: { data: null, err: null, loading: true }, tanks: { data: null, err: null, loading: true } });
    (async () => { await run("tanks"); await run("tone"); await run("neg"); await run("pos"); })(); // think tanks first: no GDELT queue
    return () => { dead = true; ac.abort(); };
  }, [iso3, dir]);
  return s;
}

let toneMap: Promise<ToneMap | null> | null = null;
/** Precomputed world tone toward the UAE (public/data/media-tone.json); null until the first build has run. */
export const loadToneMap = () => (toneMap ??= fetch("/data/media-tone.json").then((r) => (r.ok ? (r.json() as Promise<ToneMap>) : null)).catch(() => null));
export function useToneMap(): ToneMap | null | undefined {
  const [d, setD] = useState<ToneMap | null | undefined>(undefined);
  useEffect(() => { let dead = false; loadToneMap().then((j) => { if (!dead) setD(j); }); return () => { dead = true; }; }, []);
  return d;
}
export type { StanceResult };
