"use client";
import { useCallback, useEffect, useState } from "react";
import { CLIPS_EVENT, addClip, annotateClip, moveClip, readClips, removeClip, writeClips, type Clip } from "@/lib/clips";

/** The clip tray of one country, kept in step with browser storage: other tabs (storage event) and other components (the clips event) refresh it. */
export function useClips(iso: string | null) {
  const [clips, set] = useState<Clip[]>([]);
  useEffect(() => {
    const load = () => set(iso ? readClips(iso) : []); const k = setTimeout(load, 0);
    const on = (e: Event) => { if (!iso || (e as CustomEvent).detail === iso || e.type === "storage") load(); };
    window.addEventListener(CLIPS_EVENT, on); window.addEventListener("storage", on); window.addEventListener("focus", load);
    return () => { clearTimeout(k); window.removeEventListener(CLIPS_EVENT, on); window.removeEventListener("storage", on); window.removeEventListener("focus", load); };
  }, [iso]);
  const apply = useCallback((f: (xs: Clip[]) => Clip[]) => { if (!iso) return; const next = f(readClips(iso)); writeClips(iso, next); set(next); }, [iso]);
  return {
    clips,
    add: (c: Parameters<typeof addClip>[1]): { added: boolean; full: boolean } => { if (!iso) return { added: false, full: false }; const r = addClip(readClips(iso), c); if (r.added) { writeClips(iso, r.list); set(r.list); } return { added: r.added, full: r.full }; },
    remove: (id: string) => apply((xs) => removeClip(xs, id)), note: (id: string, text: string) => apply((xs) => annotateClip(xs, id, text)), move: (id: string, dir: -1 | 1) => apply((xs) => moveClip(xs, id, dir)), clear: () => apply(() => []),
  };
}
