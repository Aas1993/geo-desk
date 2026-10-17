"use client";
import { create } from "zustand";
import type { Lang } from "./format";
import { dict, type Dict } from "./i18n";
import type { TabId } from "./types";

type Theme = "dark" | "light";
type Sheet = "peek" | "half" | "full";
export type LayerId = "capitals" | "labels" | "borders" | "ticker";

type S = {
  sel: string | null; tab: TabId; menuOpen: boolean; searchOpen: boolean;
  theme: Theme; lang: Lang; scale: number; desk: string | null; onboarded: boolean;
  cmpOpen: boolean; cmp: string | null; layers: Record<LayerId, boolean>; sheet: Sheet; flyNonce: number; homeNonce: number; zoomCmd: { dir: 1 | -1; n: number };
  select: (iso3: string | null, tab?: TabId) => void; setTab: (t: TabId) => void;
  setMenu: (b: boolean) => void; setSearchOpen: (b: boolean) => void;
  toggleTheme: () => void; toggleLang: () => void; cycleScale: () => void;
  setDesk: (iso3: string | null) => void; finishOnboarding: () => void;
  openCompare: (b?: string | null) => void; closeCompare: () => void; setCmp: (b: string | null) => void; toggleLayer: (id: LayerId) => void; setSheet: (s: Sheet) => void; goHome: () => void; zoom: (dir: 1 | -1) => void;
  hydrate: (p: Partial<Pick<S, "theme" | "lang" | "scale" | "desk" | "onboarded" | "layers">>) => void;
};

export const useStore = create<S>((set) => ({
  sel: null, tab: "overview", menuOpen: false, searchOpen: false,
  theme: "dark", lang: "en", scale: 1, desk: null, onboarded: true,
  cmpOpen: false, cmp: null, layers: { capitals: true, labels: true, borders: true, ticker: true }, sheet: "half", flyNonce: 0, homeNonce: 0, zoomCmd: { dir: 1, n: 0 },
  select: (iso3, tab) => set((s) => ({ sel: iso3, tab: tab ?? (iso3 === s.sel ? s.tab : "overview"), menuOpen: false, searchOpen: false, sheet: iso3 ? "half" : s.sheet, flyNonce: s.flyNonce + 1 })),
  setTab: (tab) => set({ tab }),
  setMenu: (menuOpen) => set(menuOpen ? { menuOpen, sel: null } : { menuOpen }),
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
  setSheet: (sheet) => set({ sheet }),
  goHome: () => set((s) => ({ sel: null, homeNonce: s.homeNonce + 1 })),
  zoom: (dir) => set((s) => ({ zoomCmd: { dir, n: s.zoomCmd.n + 1 } })),
  hydrate: (p) => set(p),
}));

function persist() {
  try {
    const { theme, lang, scale, desk, onboarded, layers } = useStore.getState();
    localStorage.setItem("gd-prefs", JSON.stringify({ theme, lang, scale, desk, onboarded, layers }));
  } catch {}
}
export const useT = () => { const l = useStore((s) => s.lang); return { t: (k: keyof Dict) => dict[l][k], lang: l }; };
