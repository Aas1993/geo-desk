"use client";
import type { Map as MLMap } from "maplibre-gl";
/** Lets components outside MapCanvas (the data-layer renderer) reach the live map without prop drilling. */
let current: MLMap | null = null; const listeners = new Set<(m: MLMap | null) => void>();
export const dataLayerIds = new Set<string>(); // MapCanvas skips country selection when a click lands on one of these
export const getMap = () => current;
export function setMap(m: MLMap | null) { current = m; listeners.forEach((l) => l(m)); }
export function onMap(cb: (m: MLMap | null) => void) { listeners.add(cb); if (current) cb(current); return () => { listeners.delete(cb); }; }
