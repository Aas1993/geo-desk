// A small follow-up tracker for foresight decisions and options: it lives in the browser (localStorage) per country, so a finding becomes an owned, dated item and not a page that is read once.
export type TrackStatus = "open" | "doing" | "done" | "dropped";
export type TrackItem = { id: string; text: string; window?: string; owner?: string; due?: string; status: TrackStatus; note?: string; added: string; from: string };
const key = (iso3: string) => `gd-fs-track:${iso3}`;
export function loadTrack(iso3: string): TrackItem[] { try { const v = JSON.parse(localStorage.getItem(key(iso3)) ?? "[]"); return Array.isArray(v) ? (v as TrackItem[]) : []; } catch { return []; } }
export function saveTrack(iso3: string, items: TrackItem[]) { try { localStorage.setItem(key(iso3), JSON.stringify(items.slice(0, 200))); window.dispatchEvent(new Event("gd-track")); } catch { /* storage unavailable */ } }
/** Adds an item unless the same text is already tracked; returns whether it was new. */
export function addTrack(iso3: string, it: Omit<TrackItem, "id" | "status" | "added">): boolean {
  const cur = loadTrack(iso3); const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim(); if (cur.some((x) => norm(x.text) === norm(it.text))) return false;
  saveTrack(iso3, [{ ...it, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, status: "open", added: new Date().toISOString().slice(0, 10) }, ...cur]); return true;
}
