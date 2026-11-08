"use client";
import { create } from "zustand";

export const WIDGETS = [
  { id: "brief", en: "Country brief", ar: "موجز الدولة", ico: "🗞" }, { id: "alerts", en: "Alerts", ar: "التنبيهات", ico: "🔔" }, { id: "watchlist", en: "Watchlist", ar: "قائمة المتابعة", ico: "★" },
  { id: "briefs", en: "Country briefs (AI)", ar: "موجزات الدول (ذكاء اصطناعي)", ico: "🗂" }, { id: "world", en: "World brief (AI)", ar: "موجز العالم (ذكاء اصطناعي)", ico: "🌍" }, { id: "visits", en: "Latest official visits", ar: "آخر الزيارات الرسمية", ico: "🤝" },
  { id: "thinktanks", en: "Think-tank publications", ar: "منشورات مراكز الفكر", ico: "🏛" }, { id: "mediatone", en: "Media tone", ar: "نبرة الإعلام", ico: "📰" }, { id: "headlines", en: "World headlines", ar: "عناوين العالم", ico: "🌐" },
  { id: "news", en: "News about the UAE", ar: "أخبار الإمارات", ico: "📰" }, { id: "markets", en: "Markets", ar: "الأسواق", ico: "📈" }, { id: "commodities", en: "Commodities", ar: "السلع", ico: "📦" }, { id: "economy", en: "Economic pulse", ar: "النبض الاقتصادي", ico: "💹" },
  { id: "partners", en: "Closest partners", ar: "أقرب الشركاء", ico: "🧭" }, { id: "demand", en: "Export demand outlook", ar: "توقعات الطلب على الصادرات", ico: "🌐" },
  { id: "odds", en: "Market odds", ar: "احتمالات الأسواق", ico: "📊" }, { id: "cyber", en: "Cyber pulse", ar: "النبض السيبراني", ico: "🛡" }, { id: "weather", en: "Capitals weather", ar: "طقس العواصم", ico: "🌤" }, { id: "launches", en: "Upcoming launches", ar: "عمليات الإطلاق القادمة", ico: "🚀" }, { id: "livetv", en: "Live TV", ar: "بث مباشر", ico: "📺" },
] as const;
export type WidgetId = (typeof WIDGETS)[number]["id"];
export const PRESETS: Record<string, { en: string; ar: string; ico: string; widgets: WidgetId[] }> = {
  desk: { en: "Desk Officer", ar: "مسؤول المكتب", ico: "💼", widgets: ["brief", "partners", "alerts", "watchlist", "visits", "markets", "headlines"] },
  un: { en: "UN desk", ar: "مكتب الأمم المتحدة", ico: "🇺🇳", widgets: ["world", "alerts", "demand", "thinktanks", "visits", "odds", "headlines"] },
  media: { en: "Media", ar: "الإعلام", ico: "📡", widgets: ["mediatone", "headlines", "thinktanks", "livetv", "alerts", "news"] },
};
type S = {
  open: boolean; askOpen: boolean; askQ: string; preset: string; widgets: WidgetId[]; folded: Record<string, boolean>; saved: Record<string, WidgetId[]>; watch: string[];
  setOpen: (o: boolean) => void; setAsk: (o: boolean, q?: string) => void; usePreset: (id: string) => void; add: (w: WidgetId) => void; remove: (w: WidgetId) => void; move: (w: WidgetId, d: -1 | 1) => void; fold: (w: WidgetId) => void; foldAll: () => void;
  saveLayout: (name: string) => void; toggleWatch: (iso3: string) => void; hydrate: () => void;
};
const KEY = "gd-dash";
const persist = () => { try { const { preset, widgets, folded, saved, watch } = useDashboard.getState(); localStorage.setItem(KEY, JSON.stringify({ preset, widgets, folded, saved, watch })); } catch { /* storage may be unavailable */ } };
const valid = (w: unknown): w is WidgetId => WIDGETS.some((x) => x.id === w);
export const useDashboard = create<S>((set, get) => ({
  open: false, askOpen: false, askQ: "", preset: "desk", widgets: PRESETS.desk.widgets, folded: {}, saved: {}, watch: [],
  setOpen: (open) => set(open ? { open, askOpen: false } : { open }), setAsk: (askOpen, askQ) => set(askOpen ? { askOpen, askQ: askQ ?? get().askQ, open: false } : { askOpen }),
  usePreset: (id) => { const p = PRESETS[id]; const s = get().saved[id]; set({ preset: id, widgets: s ?? p?.widgets ?? get().widgets, folded: {} }); persist(); },
  add: (w) => { if (!get().widgets.includes(w)) set({ widgets: [...get().widgets, w], preset: "custom" }); persist(); },
  remove: (w) => { set({ widgets: get().widgets.filter((x) => x !== w), preset: "custom" }); persist(); },
  move: (w, d) => { const a = [...get().widgets]; const i = a.indexOf(w); const j = i + d; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set({ widgets: a, preset: "custom" }); persist(); },
  fold: (w) => { set({ folded: { ...get().folded, [w]: !get().folded[w] } }); persist(); },
  foldAll: () => { const all = get().widgets.every((w) => get().folded[w]); set({ folded: Object.fromEntries(get().widgets.map((w) => [w, !all])) }); persist(); },
  saveLayout: (name) => { const n = name.trim().slice(0, 24); if (!n) return; set({ saved: { ...get().saved, [n]: get().widgets }, preset: n }); persist(); },
  toggleWatch: (iso3) => { const w = get().watch; set({ watch: w.includes(iso3) ? w.filter((x) => x !== iso3) : [...w, iso3].slice(0, 30) }); persist(); },
  hydrate: () => { try { const p = JSON.parse(localStorage.getItem(KEY) || "{}"); set({ preset: typeof p.preset === "string" ? p.preset : "desk", widgets: Array.isArray(p.widgets) ? p.widgets.filter(valid) : PRESETS.desk.widgets, folded: p.folded ?? {}, saved: p.saved ?? {}, watch: Array.isArray(p.watch) ? p.watch.filter((x: unknown) => typeof x === "string") : [] }); } catch { /* keep defaults */ } },
}));
