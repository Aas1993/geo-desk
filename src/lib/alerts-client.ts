"use client";
import { useEffect } from "react";
import { create } from "zustand";
import type { Alert, AlertsPayload } from "@/lib/alerts";

const SEEN_KEY = "gd-alerts-seen";
type S = { items: Alert[]; at: number | null; sources: Record<string, boolean>; error: boolean; seen: number; load: () => Promise<void>; markSeen: () => void };
const readSeen = () => { try { return +(localStorage.getItem(SEEN_KEY) ?? 0) || 0; } catch { return 0; } };
export const useAlerts = create<S>((set, get) => ({
  items: [], at: null, sources: {}, error: false, seen: 0,
  load: async () => {
    try { const r = await fetch("/api/alerts"); if (!r.ok) throw new Error(String(r.status)); const j = (await r.json()) as AlertsPayload; set({ items: j.items, at: j.fetchedAt, sources: j.sources ?? {}, error: false, seen: get().seen || readSeen() }); }
    catch { set({ error: true }); }
  },
  markSeen: () => { const t = Date.now(); try { localStorage.setItem(SEEN_KEY, String(t)); } catch {} set({ seen: t }); },
}));

/** Polls the alerts feed every 3 minutes while the app is open. Mounted once, by the bell. */
export function useAlertsPoll() {
  const load = useAlerts((s) => s.load);
  useEffect(() => { void load(); const i = setInterval(load, 180_000); return () => clearInterval(i); }, [load]);
}
/** Unread count for the bell: new since the panel was last opened, and either severe or about the UAE region. */
export function useAlertCount(): number {
  useAlertsPoll();
  return useAlerts((s) => s.items.filter((a) => a.t > s.seen && (a.sev >= 2 || a.uae)).length);
}
