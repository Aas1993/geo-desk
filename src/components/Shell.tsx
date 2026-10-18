"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Globe2, CandlestickChart, Share2, LayoutDashboard, Sparkles } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { RightRail } from "./RightRail";
import { TopBar } from "./TopBar";
import { Ticker } from "./Ticker";
import { AlertsPanel } from "./AlertsPanel";
import { useStore, useT } from "@/lib/store";
import type { Headline } from "@/lib/types";

/** Loads saved preferences once and keeps <html> in step with theme / language / text size. */
function usePrefs() {
  const { theme, lang, scale } = useStore();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gd-prefs");
      const p = JSON.parse(raw || "{}");
      useStore.getState().hydrate({ theme: p.theme ?? "dark", lang: p.lang ?? "en", scale: p.scale ?? 1, desk: p.desk ?? null, onboarded: !!p.onboarded, layers: { capitals: true, labels: true, borders: true, ticker: true, ...p.layers }, filters: p.filters ?? {}, timeWindow: p.timeWindow ?? "all", projection: p.projection ?? "globe", basemap: p.basemap ?? "dark", terminator: !!p.terminator, ready: true });
    } catch { useStore.getState().hydrate({ onboarded: false, ready: true }); }
  }, []);
  useEffect(() => { const d = document.documentElement; d.dataset.theme = theme; d.lang = lang; d.dir = lang === "ar" ? "rtl" : "ltr"; d.style.setProperty("--text-scale", String(scale)); d.style.setProperty("--dir", lang === "ar" ? "-1" : "1"); }, [theme, lang, scale]);
}

function useHeadlines() {
  const [f, set] = useState<{ items: Headline[]; at: number | null; ok: boolean }>({ items: [], at: null, ok: true });
  useEffect(() => {
    let dead = false;
    const run = () => fetch("/api/headlines").then((r) => r.json()).then((j) => { if (!dead) set({ items: j.items ?? [], at: j.fetchedAt ?? Date.now(), ok: (j.items ?? []).length > 0 }); }).catch(() => { if (!dead) set((p) => ({ ...p, ok: false })); });
    run(); const i = setInterval(run, 300000); return () => { dead = true; clearInterval(i); };
  }, []);
  return f;
}

function MobileNav() {
  const { t, lang } = useT(); const path = usePathname(); const { menuOpen, setMenu, select } = useStore(); const [toast, setToast] = useState(false);
  const share = async () => { try { await navigator.clipboard.writeText(location.href); setToast(true); setTimeout(() => setToast(false), 1800); } catch {} };
  const cls = (on: boolean) => `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${on ? "text-accent" : "text-t1"}`;
  return (
    <>
      <nav aria-label="Main" className="glass absolute inset-x-2 bottom-2 z-30 flex h-14 items-stretch rounded-[14px] sm:hidden">
        <Link href="/" onClick={() => { setMenu(false); select(null); }} className={cls(path === "/" && !menuOpen)}><Globe2 size={19} />{t("nav_world")}</Link>
        <Link href="/markets" className={cls(path.startsWith("/markets"))}><CandlestickChart size={19} />{t("nav_markets")}</Link>
        {path === "/" && <button onClick={() => setMenu(!menuOpen)} className={cls(menuOpen)}><Layers size={19} />{t("layers")}</button>}
        {path === "/" && <button onClick={() => { select(null); useDashboard.getState().setOpen(true); }} className={cls(false)}><LayoutDashboard size={19} />{lang === "ar" ? "اللوحة" : "Brief"}</button>}
        {path === "/" && <button onClick={() => { select(null); useDashboard.getState().setAsk(true); }} className={cls(false)}><Sparkles size={19} />{lang === "ar" ? "اسأل" : "Ask"}</button>}
        <button onClick={share} className={cls(false)}><Share2 size={19} />{t("share")}</button>
      </nav>
      {toast && <div role="status" className="glass anim-rise absolute bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[13px]">{t("copied")}</div>}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  usePrefs(); const feed = useHeadlines();
  return (
    <div className="fixed inset-0 overflow-hidden bg-bg0 text-t0">
      {children}
      <TopBar feed={feed} />
      <RightRail />
      <AlertsPanel />
      <Ticker items={feed.items} />
      <MobileNav />
    </div>
  );
}
