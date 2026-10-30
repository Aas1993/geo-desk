"use client";
import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import type { LayerDef } from "@/lib/layers/registry";
import { useLayerStats } from "@/lib/layers/stats";
import { loadOrgs } from "@/lib/layers/orgs-client";
import { allAgreements, has, loadAgreements } from "@/lib/agreements-client";
import { liveCount, loadFlights } from "@/lib/flights-client";
import { loadInvestment } from "@/lib/investment-client";
import { loadToneMap } from "@/lib/media/client";
import { loadOutlook, loadPartnership, loadTrade } from "@/lib/intel-client";
export type { Orgs } from "@/lib/layers/orgs-client";

type Sanctions = { built: string; countries: Record<string, { ofac: number; un: number }> };
type Painted = { built: string; values?: Record<string, number>; colors?: Record<string, string> };
const CEPA_COLOR: Record<string, string> = { "in-force": "#2de39a", signed: "#ffb547", concluded: "#3ddcff", unknown: "#9db0cf" };
async function flag(def: LayerDef, type: string): Promise<Painted> { const j = await loadAgreements(); return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, c]) => has(c, type)).map(([k]) => [k, def.color])) }; }
/** Per-layer value source. Static datasets are built by scripts/ and shipped in /public/data. Numeric layers get a ramp, categorical layers an explicit colour per country. */
const SOURCES: Record<string, (def: LayerDef) => Promise<Painted>> = {
  sanctions: async () => { const j = (await (await fetch("/data/sanctions.json")).json()) as Sanctions; return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, v.ofac + v.un])) }; },
  agreements: async () => { const j = await loadAgreements(); return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, c]) => [k, allAgreements(c).length] as [string, number]).filter(([, n]) => n > 0)) }; },
  cepa: async () => { const j = await loadAgreements(); return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, c]) => c.cepa).map(([k, c]) => [k, CEPA_COLOR[c.cepa!.status]])) }; },
  uaeflights: async () => { const j = await loadFlights(); return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, c]) => [k, liveCount(c)] as [string, number]).filter(([, n]) => n > 0)) }; },
  uaeinvestment: async () => { const j = await loadInvestment(); return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, c]) => [k, c.outward?.usd ?? 0] as [string, number]).filter(([, n]) => n > 0)) }; },
  mediatone: async () => {
    const j = await loadToneMap(); if (!j) throw new Error("The world media tone map has not been built yet");
    const col = (d: number) => (d <= -1.5 ? "#ff5d73" : d <= -0.5 ? "#ffb547" : d < 0.5 ? "#9db0cf" : d < 1.5 ? "#3ddcff" : "#2de39a");
    return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, v]) => v.avg != null).map(([k, v]) => [k, col((v.avg as number) - j.global.avg)])) };
  },
  languages: async () => {
    const list = (await (await fetch("/data/countries.json")).json()) as { iso3: string; languages: string[] }[];
    const order: [string, string][] = [["arabic", "#2de39a"], ["english", "#5aa9ff"], ["french", "#b693ff"], ["spanish", "#ff8a4c"], ["portuguese", "#ffc247"], ["russian", "#ff5d73"], ["chinese", "#f27fcb"], ["german", "#67e8f9"]];
    const colors: Record<string, string> = {}; for (const c of list) { const hit = order.find(([l]) => c.languages.some((x) => x.toLowerCase().includes(l))); colors[c.iso3] = hit?.[1] ?? "#9db0cf"; }
    return { built: new Date().toISOString(), colors };
  },
  aid: async () => { const j = (await (await fetch("/data/layers/aid.json")).json()) as { meta: { built: string }; countries: Record<string, { usd: number }> }; return { built: j.meta.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, v.usd] as [string, number]).filter(([, n]) => n > 0)) }; },
  regions: async (def) => { const j = (await (await fetch("/data/regions.json")).json()) as { meta: { built: string }; countries: Record<string, { subregion: string }> }; const color = Object.fromEntries((def.legend ?? []).map((l) => [l.label, l.color])); return { built: j.meta.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, v]) => color[v.subregion]).map(([k, v]) => [k, color[v.subregion]])) }; },
  cyber: async () => { const j = (await (await fetch("/data/ransomware.json")).json()) as { built: string; countries: Record<string, { n30: number }> }; return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, v.n30] as [string, number]).filter(([, n]) => n > 0)) }; },
  uaepi: async () => { const j = await loadPartnership(); return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, v.score] as [string, number]).filter(([, n]) => n > 0)) }; },
  uaetrade: async () => { const j = await loadTrade(); return { built: j.built, values: Object.fromEntries(Object.entries(j.countries).map(([k, v]) => [k, (v.a.at(-1)?.[1] ?? 0) + (v.a.at(-1)?.[2] ?? 0)] as [string, number]).filter(([, n]) => n > 0)) }; },
  tradegrowth: async () => { const j = await loadTrade(); const col = (g: number) => (g > 15 ? "#2de39a" : g > 5 ? "#9be15d" : g >= -5 ? "#9db0cf" : g >= -15 ? "#ffb547" : "#ff5d73");
    return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, v]) => v.ttm && v.prev && v.prev.x + v.prev.m > 50).map(([k, v]) => [k, col(((v.ttm!.x + v.ttm!.m) / (v.prev!.x + v.prev!.m) - 1) * 100)])) }; },
  outlook: async () => { const j = await loadOutlook(); const y = new Date().getFullYear(); const col = (g: number) => (g < 0 ? "#ff5d73" : g < 2 ? "#ffb547" : g < 4 ? "#9db0cf" : g < 6 ? "#3ddcff" : "#2de39a");
    return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, v]) => typeof v.growth?.[y] === "number").map(([k, v]) => [k, col(v.growth![y])])) }; },
  dta: (def) => flag(def, "tax"), airagreements: (def) => flag(def, "air"),
  jec: async (def) => { const j = await loadAgreements(); return { built: j.built, colors: Object.fromEntries(Object.entries(j.countries).filter(([, c]) => c.committees.length).map(([k]) => [k, def.color])) }; },
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
        const j = await spec(def); if (dead) return;
        const match: unknown[] = ["match", ["get", "iso3"]]; let max = 1; let n = 0;
        if (j.values) {
          const entries = Object.entries(j.values).filter(([, v]) => v > 0); max = Math.max(1, ...entries.map(([, v]) => v)); n = entries.length;
          const [r, g, b] = hex(def.color);
          for (const [k, v] of entries) match.push(k, `rgba(${r},${g},${b},${(0.06 + 0.62 * Math.pow(Math.log(1 + v) / Math.log(1 + max), 2.2)).toFixed(3)})`);
        } else for (const [k, col] of Object.entries(j.colors ?? {})) { const [r, g, b] = hex(col); match.push(k, `rgba(${r},${g},${b},0.5)`); n++; }
        match.push("rgba(0,0,0,0)");
        const add = () => {
          if (dead || map.getLayer(id)) return;
          map.addLayer({ id, type: "fill", source: "countries", paint: { "fill-color": match as never } }, "border");
          set(def.id, { state: "ok", total: n, shown: n, updated: Date.parse(j.built), byKey: { max } });
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
