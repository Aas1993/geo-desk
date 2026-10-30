"use client";
import { create } from "zustand";
import type { Lang } from "./format";
import { dict, type Dict } from "./i18n";
import type { TabId } from "./types";

type Theme = "dark" | "light";
type Sheet = "peek" | "half" | "full";
export type Projection = "globe" | "mercator";
export type Basemap = "dark" | "satellite";
export type TimeWindow = "all" | "1h" | "6h" | "24h" | "2d" | "7d";
/** Layer ids are open-ended strings: base layers ("capitals", "labels", "borders", "ticker") and the data layers in lib/layers/registry.ts. */
export type LayerId = string;
export const WINDOW_MS: Record<TimeWindow, number> = { all: Infinity, "1h": 3600e3, "6h": 6 * 3600e3, "24h": 24 * 3600e3, "2d": 48 * 3600e3, "7d": 7 * 24 * 3600e3 };
const BASE_LAYERS: Record<string, boolean> = { capitals: true, labels: true, borders: true, ticker: true };

type S = {
  /** True once saved preferences have been loaded, so URL parameters can be applied on top of them. */
  ready: boolean;
  sel: string | null; tab: TabId; menuOpen: boolean; searchOpen: boolean;
  theme: Theme; lang: Lang; scale: number; desk: string | null; onboarded: boolean;
  cmpOpen: boolean; cmp: string | null;
  layers: Record<LayerId, boolean>;
  /** Sub-filters per layer: filters[layer][key] === false means that sub-type is hidden. */
  filters: Record<LayerId, Record<string, boolean>>;
  timeWindow: TimeWindow;
  projection: Projection; basemap: Basemap; terminator: boolean;
  sheet: Sheet; flyNonce: number; homeNonce: number; locateNonce: number; zoomCmd: { dir: 1 | -1; n: number };
  imageryDate: string | null; setImageryDate: (d: string | null) => void;
  alertsOpen: boolean; focus: { id: string; layer: string } | null;
  select: (iso3: string | null, tab?: TabId) => void; setTab: (t: TabId) => void;
  setMenu: (b: boolean) => void; setSearchOpen: (b: boolean) => void;
  toggleTheme: () => void; toggleLang: () => void; cycleScale: () => void;
  setDesk: (iso3: string | null) => void; finishOnboarding: () => void;
  openCompare: (b?: string | null) => void; closeCompare: () => void; setCmp: (b: string | null) => void;
  toggleLayer: (id: LayerId) => void; setFilter: (layer: LayerId, key: string, on: boolean) => void; setTimeWindow: (w: TimeWindow) => void;
  setProjection: (p: Projection) => void; setBasemap: (b: Basemap) => void; toggleTerminator: () => void; locate: () => void;
  setAlertsOpen: (b: boolean) => void; setFocus: (f: { id: string; layer: string } | null) => void;
  setSheet: (s: Sheet) => void; goHome: () => void; zoom: (dir: 1 | -1) => void;
  hydrate: (p: Partial<Pick<S, "ready" | "theme" | "lang" | "scale" | "desk" | "onboarded" | "layers" | "filters" | "timeWindow" | "projection" | "basemap" | "terminator">>) => void;
};

export const useStore = create<S>((set) => ({
  ready: false, sel: null, tab: "overview", menuOpen: false, searchOpen: false,
  theme: "dark", lang: "en", scale: 1, desk: null, onboarded: true,
  cmpOpen: false, cmp: null, layers: { ...BASE_LAYERS }, filters: {}, timeWindow: "all",
  projection: "globe", basemap: "dark", terminator: false,
  sheet: "half", flyNonce: 0, homeNonce: 0, locateNonce: 0, zoomCmd: { dir: 1, n: 0 }, alertsOpen: false, focus: null, imageryDate: null, setImageryDate: (imageryDate) => set({ imageryDate }),
  select: (iso3, tab) => set((s) => ({ sel: iso3, tab: tab ?? (iso3 === s.sel ? s.tab : "overview"), menuOpen: false, searchOpen: false, alertsOpen: false, sheet: iso3 ? "half" : s.sheet, flyNonce: s.flyNonce + 1 })),
  setTab: (tab) => set({ tab }),
  setMenu: (menuOpen) => set(menuOpen ? { menuOpen, sel: null, alertsOpen: false } : { menuOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  toggleTheme: () => { set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })); persist(); },
  toggleLang: () => { set((s) => ({ lang: s.lang === "en" ? "ar" : "en" })); persist(); },
  cycleScale: () => { set((s) => ({ scale: s.scale >= 1.3 ? 0.9 : +(s.scale + (s.scale < 1 ? 0.1 : 0.15)).toFixed(2) })); persist(); },
  setDesk: (desk) => { set({ desk }); persist(); },
  finishOnboarding: () => { set({ onboarded: true }); persist(); },
  openCompare: (b) => set((s) => ({ cmpOpen: true, cmp: b === undefined ? s.cmp : b, menuOpen: false })),
  closeCompare: () => set({ cmpOpen: false }),
  setCmp: (cmp) => set({ cmp }),
  toggleLayer: (id) => { set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })); persist(); },
  setFilter: (layer, key, on) => { set((s) => ({ filters: { ...s.filters, [layer]: { ...s.filters[layer], [key]: on } } })); persist(); },
  setTimeWindow: (timeWindow) => { set({ timeWindow }); persist(); },
  setProjection: (projection) => { set({ projection }); persist(); },
  setBasemap: (basemap) => { set({ basemap }); persist(); },
  toggleTerminator: () => { set((s) => ({ terminator: !s.terminator })); persist(); },
  locate: () => set((s) => ({ locateNonce: s.locateNonce + 1 })),
  setAlertsOpen: (alertsOpen) => set(alertsOpen ? { alertsOpen, menuOpen: false } : { alertsOpen }),
  setFocus: (focus) => set({ focus }),
  setSheet: (sheet) => set({ sheet }),
  goHome: () => set((s) => ({ sel: null, homeNonce: s.homeNonce + 1 })),
  zoom: (dir) => set((s) => ({ zoomCmd: { dir, n: s.zoomCmd.n + 1 } })),
  hydrate: (p) => set(p),
}));

function persist() {
  try {
    const { theme, lang, scale, desk, onboarded, layers, filters, timeWindow, projection, basemap, terminator } = useStore.getState();
    localStorage.setItem("gd-prefs", JSON.stringify({ theme, lang, scale, desk, onboarded, layers, filters, timeWindow, projection, basemap, terminator }));
  } catch {}
}
export const useT = () => { const l = useStore((s) => s.lang); return { t: (k: keyof Dict) => dict[l][k], lang: l }; };
