"use client";
import { create } from "zustand";
/** Runtime status of each data layer: how many items match the current filters and whether the feed loaded. */
type LS = { state: "idle" | "loading" | "ok" | "error"; total: number; shown: number; updated: number | null; error?: string; byKey: Record<string, number> };
type Store = { layers: Record<string, LS>; set: (id: string, p: Partial<LS>) => void };
export const useLayerStats = create<Store>((set) => ({
  layers: {},
  set: (id, p) => set((s) => { const base: LS = { state: "idle", total: 0, shown: 0, updated: null, byKey: {} }; return { layers: { ...s.layers, [id]: { ...base, ...s.layers[id], ...p } } }; }),
}));
