"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { RightRail } from "./RightRail";
import { LayersDrawer } from "./LayersDrawer";
import { CountryPanel } from "./CountryPanel";
import { CompareView } from "./CompareView";
import { Onboarding } from "./Onboarding";
import { useStore } from "@/lib/store";
import type { TabId } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false, loading: () => <div className="absolute inset-0 grid place-items-center text-[13px] text-t2">Loading map…</div> });
const TABS = ["overview", "economy", "trade", "military", "un", "society", "news"];

/** Reads ?sel / ?tab / ?cmp on load and keeps them in the URL afterwards. */
function useUrlSync() {
  const { sel, tab, cmpOpen, cmp } = useStore();
  useEffect(() => {
    const q = new URLSearchParams(location.search); const s = q.get("sel")?.toUpperCase(); const tb = q.get("tab"); const cm = q.get("cmp")?.toUpperCase();
    if (cm && /^[A-Z]{3}$/.test(cm)) useStore.getState().openCompare(cm);
    if (s && /^[A-Z]{3}$/.test(s)) useStore.getState().select(s, TABS.includes(tb ?? "") ? (tb as TabId) : "overview");
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (sel) { q.set("sel", sel); q.set("tab", tab); } else { q.delete("sel"); q.delete("tab"); }
    if (cmpOpen && cmp) q.set("cmp", cmp); else q.delete("cmp");
    const s = q.toString(); history.replaceState(null, "", `${location.pathname}${s ? "?" + s : ""}${location.hash}`);
  }, [sel, tab, cmpOpen, cmp]);
}

export function WorldView() {
  useUrlSync();
  return (
    <>
      <MapCanvas />
      <RightRail />
      <LayersDrawer />
      <CountryPanel />
      <CompareView />
      <Onboarding />
    </>
  );
}
