import { readFile } from "node:fs/promises";
import path from "node:path";
import { fc } from "../cache";
import type { Feat } from "../registry";

/** Layers whose data is a committed GeoJSON file built by a script (public/data/layers/<name>.geojson). Validated on load so a bad file fails loudly. */
export async function staticLayer(name: string): Promise<GeoJSON.FeatureCollection> {
  const j = JSON.parse(await readFile(path.join(process.cwd(), "public/data/layers", `${name}.geojson`), "utf8")) as GeoJSON.FeatureCollection;
  if (j.type !== "FeatureCollection" || !Array.isArray(j.features)) throw new Error(`${name}: not a FeatureCollection`);
  for (const f of j.features) { const p = f.properties as Partial<Feat> | null; if (!p?.id || !p.type || !p.title || !f.geometry) throw new Error(`${name}: feature missing id/type/title/geometry`); }
  return fc(j.features);
}
export const STATIC_LAYERS = ["ports", "power", "heritage", "bases", "exchanges", "thinktanks", "outlets", "channels", "straits", "seas", "pipelines", "cables"] as const;
