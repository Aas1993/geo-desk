import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

// The country silhouette for the hub's mini panel: the held boundary file (Natural Earth), drawn flat (equirectangular, x scaled by the cosine of the middle latitude) and fitted to a box. Small outlying islands are left out of the fit so a country with a distant territory is not drawn tiny.
type Ring = [number, number][];
const area = (r: Ring) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i]; const [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
export type Outline = { d: string; w: number; h: number; pin: [number, number] | null };
/** The path of the country with this numeric ISO code, fitted into a w by h box with a margin; null when the file has no such country. `pin` places a point (longitude, latitude), such as the capital, when it falls inside the box. */
export function outlineFor(topo: Topology, num: string | number, w = 300, h = 190, pad = 10, at?: [number, number] | null): Outline | null {
  const col = topo.objects.countries as GeometryCollection | undefined; if (!col) return null;
  const f = feature(topo, col).features.find((x) => String(Number(x.id)) === String(Number(num))); if (!f || !f.geometry) return null;
  const polys: Ring[][] = f.geometry.type === "Polygon" ? [f.geometry.coordinates as Ring[]] : f.geometry.type === "MultiPolygon" ? (f.geometry.coordinates as Ring[][]) : []; if (!polys.length) return null;
  const big = Math.max(...polys.map((p) => area(p[0]))); const keep = polys.filter((p) => area(p[0]) >= big * 0.03);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of keep) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180) || 1; const sx = (w - 2 * pad) / Math.max(1e-6, (x1 - x0) * k); const sy = (h - 2 * pad) / Math.max(1e-6, y1 - y0); const s = Math.min(sx, sy);
  const ox = (w - (x1 - x0) * k * s) / 2; const oy = (h - (y1 - y0) * s) / 2; const px = (x: number) => ox + (x - x0) * k * s; const py = (y: number) => oy + (y1 - y) * s;
  const d = keep.map((p) => p.map((r) => `M${r.map(([x, y]) => `${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join("L")}Z`).join("")).join("");
  const pin: [number, number] | null = at && at[0] >= x0 - 1 && at[0] <= x1 + 1 && at[1] >= y0 - 1 && at[1] <= y1 + 1 ? [px(at[0]), py(at[1])] : null;
  return { d, w, h, pin };
}
let topoP: Promise<Topology> | null = null;
export const loadTopo = () => (topoP ??= fetch("/data/countries-50m.json").then((r) => r.json() as Promise<Topology>).catch((e) => { topoP = null; throw e; }));
