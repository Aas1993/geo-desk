"use client";
import { useCallback, useEffect, useState } from "react";
import { addTrack, loadTrack } from "@/lib/fs-track";
import type { ForesightPayload } from "@/lib/foresight-data";

/** The free baseline of a country (IMF path, signals, exposure), fetched once for the illustrated views. */
export function useForesightData(iso3: string): ForesightPayload | null {
  const [d, setD] = useState<ForesightPayload | null>(null);
  useEffect(() => { let dead = false; fetch(`/api/foresight/${iso3}`).then((r) => (r.ok ? r.json() : null)).then((j: ForesightPayload | null) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, [iso3]);
  return d;
}
const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim();
/** Adds options, opportunities and decisions to the country's follow-up tracker, and says which are already tracked. */
export function useTracker(iso3: string, from: string) {
  const [texts, setTexts] = useState<Set<string>>(new Set());
  const read = useCallback(() => setTexts(new Set(loadTrack(iso3).map((x) => norm(x.text)))), [iso3]);
  useEffect(() => { const t = setTimeout(read, 0); window.addEventListener("gd-track", read); return () => { clearTimeout(t); window.removeEventListener("gd-track", read); }; }, [read]);
  const track = useCallback((text: string, kind: string, window?: string, owner?: string) => { addTrack(iso3, { text, window, owner, from: `${from} · ${kind}` }); read(); }, [iso3, from, read]);
  return { track, has: (text: string) => texts.has(norm(text)) };
}
