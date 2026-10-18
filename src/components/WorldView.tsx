"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { LayersDrawer } from "./LayersDrawer";
import { CountryPanel } from "./CountryPanel";
import { CompareView } from "./CompareView";
import { Onboarding } from "./Onboarding";
import { DataLayers } from "./DataLayers";
import { Legend } from "./Legend";
import { MarketsPanel } from "./MarketsPanel";
import { Dashboard } from "./Dashboard";
import { AskPanel } from "./AskPanel";
import { useStore } from "@/lib/store";
import { BY_ID, LAYERS } from "@/lib/layers/registry";
import type { TabId } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false, loading: () => <div className="absolute inset-0 grid place-items-center text-[13px] text-t2">Loading map…</div> });
const TABS = ["overview", "brief", "economy", "trade", "agreements", "diplomacy", "media", "military", "un", "society", "news"];

/** Reads ?sel / ?tab / ?cmp on load and keeps them in the URL afterwards. */
function useUrlSync() {
  const { sel, tab, cmpOpen, cmp, layers, timeWindow, ready } = useStore();
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams(location.search); const s = q.get("sel")?.toUpperCase(); const tb = q.get("tab"); const cm = q.get("cmp")?.toUpperCase();
    if (cm && /^[A-Z]{3}$/.test(cm)) useStore.getState().openCompare(cm);
    const ly = q.get("layers"); const wn = q.get("win");
    if (ly) for (const id of ly.split(",")) if (BY_ID.has(id) && !useStore.getState().layers[id]) useStore.getState().toggleLayer(id);
    if (wn && ["1h", "6h", "24h", "2d", "7d"].includes(wn)) useStore.getState().setTimeWindow(wn as never);
    if (s && /^[A-Z]{3}$/.test(s)) useStore.getState().select(s, TABS.includes(tb ?? "") ? (tb as TabId) : "overview");
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams(location.search);
    if (sel) { q.set("sel", sel); q.set("tab", tab); } else { q.delete("sel"); q.delete("tab"); }
    if (cmpOpen && cmp) q.set("cmp", cmp); else q.delete("cmp");
    const on = LAYERS.filter((l) => l.kind !== "base" && l.status === "live" && layers[l.id]).map((l) => l.id);
    if (on.length) q.set("layers", on.join(",")); else q.delete("layers");
    if (timeWindow !== "all") q.set("win", timeWindow); else q.delete("win");
    const s = q.toString(); history.replaceState(null, "", `${location.pathname}${s ? "?" + s : ""}${location.hash}`);
  }, [ready, sel, tab, cmpOpen, cmp, layers, timeWindow]);
}

export function WorldView() {
  useUrlSync();
  return (
    <>
      <MapCanvas />
      <DataLayers />
      <Legend />
      <MarketsPanel />
      <Dashboard />
      <AskPanel />
      <LayersDrawer />
      <CountryPanel />
      <CompareView />
      <Onboarding />
    </>
  );
}
