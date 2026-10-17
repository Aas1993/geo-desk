"use client";
import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import type { LayerDef } from "@/lib/layers/registry";
import { useLayerStats } from "@/lib/layers/stats";
import { loadOrgs } from "@/lib/layers/orgs-client";
export type { Orgs } from "@/lib/layers/orgs-client";

type Sanctions = { built: string; countries: Record<string, { ofac: number; un: number }> };
/** Per-layer value source. Static datasets are built by scripts/ and shipped in /public/data. */
const SOURCES: Record<string, { url: string; values: (j: Sanctions) => Record<string, number> }> = {
  sanctions: { url: "/data/sanctions.json", values: (j) => Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, v.ofac + v.un])) },
};
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** Colours every country by a value on a log scale, using the layer's colour at rising opacity. Sits under the borders. */
export function ChoroplethLayer({ def, map }: { def: LayerDef; map: MLMap }) {
  const id = `choro-${def.id}`; const set = useLayerStats((s) => s.set);
  useEffect(() => {
    const spec = SOURCES[def.id]; if (!spec) return; let dead = false;
    set(def.id, { state: "loading" });
    (async () => {
      try {
        const j = (await (await fetch(spec.url)).json()) as Sanctions; if (dead) return;
        const v = spec.values(j); const entries = Object.entries(v).filter(([, n]) => n > 0); const max = Math.max(1, ...entries.map(([, n]) => n));
        const [r, g, b] = hex(def.color); const match: unknown[] = ["match", ["get", "iso3"]];
        for (const [k, n] of entries) match.push(k, `rgba(${r},${g},${b},${(0.06 + 0.62 * Math.pow(Math.log(1 + n) / Math.log(1 + max), 2.2)).toFixed(3)})`);
        match.push("rgba(0,0,0,0)");
        const add = () => {
          if (dead || map.getLayer(id)) return;
          map.addLayer({ id, type: "fill", source: "countries", paint: { "fill-color": match as never } }, "border");
          set(def.id, { state: "ok", total: entries.length, shown: entries.length, updated: Date.parse(j.built), byKey: { max } });
        };
        if (map.isStyleLoaded()) add(); else map.once("idle", add);
      } catch (e) { if (!dead) set(def.id, { state: "error", error: (e as Error).message }); }
    })();
    return () => { dead = true; try { if (map.getLayer(id)) map.removeLayer(id); } catch {} set(def.id, { state: "idle", total: 0, shown: 0, byKey: {} }); };
  }, [def, map, id, set]);
  return null;
}

/** Highlights the member states of one organisation. Several can be on at once; each uses its own colour. */
export function MembershipLayer({ def, map }: { def: LayerDef; map: MLMap }) {
  const id = `mem-${def.id}`; const set = useLayerStats((s) => s.set);
  useEffect(() => {
    let dead = false; set(def.id, { state: "loading" });
    (async () => {
      try {
        const j = await loadOrgs(); if (dead) return; const list = j.orgs[def.members ?? ""]; if (!list) throw new Error("No member list for this organisation");
        const [r, g, b] = hex(def.color);
        const add = () => {
          if (dead || map.getLayer(id)) return;
          map.addLayer({ id, type: "fill", source: "countries", filter: ["in", ["get", "iso3"], ["literal", list]], paint: { "fill-color": `rgba(${r},${g},${b},0.34)` } }, "border");
          set(def.id, { state: "ok", total: list.length, shown: list.length, updated: Date.parse(j.built), byKey: { wd: j.source[def.members ?? ""] === "wikidata" ? 1 : 0 } });
        };
        if (map.isStyleLoaded()) add(); else map.once("idle", add);
      } catch (e) { if (!dead) set(def.id, { state: "error", error: (e as Error).message }); }
    })();
    return () => { dead = true; try { if (map.getLayer(id)) map.removeLayer(id); } catch {} set(def.id, { state: "idle", total: 0, shown: 0, byKey: {} }); };
  }, [def, map, id, set]);
  return null;
}
