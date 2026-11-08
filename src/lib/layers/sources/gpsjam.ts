import { cellToBoundary } from "h3-js";
import type { Feat } from "../registry";
import { fc, UA } from "../cache";
/** GPSJam: share of aircraft reporting poor GPS accuracy per H3 cell, derived from ADS-B (data by John Wiseman, gpsjam.org). */
export async function gpsjam(): Promise<GeoJSON.FeatureCollection> {
  for (let back = 1; back <= 3; back++) {
    const day = new Date(Date.now() - back * 86400e3).toISOString().slice(0, 10);
    const r = await fetch(`https://gpsjam.org/data/${day}-h3_4.csv`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000), cache: "no-store" });
    if (!r.ok) continue;
    const feats: GeoJSON.Feature[] = [];
    for (const line of (await r.text()).trim().split("\n").slice(1)) {
      const [hex, good, bad] = line.split(","); const g = +good, b = +bad, n = g + b; if (n < 5) continue; const ratio = b / n; if (ratio < 0.02) continue;
      const ring = cellToBoundary(hex, true); ring.push(ring[0]); // [lng, lat] order
      feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: { id: `gps:${hex}`, layer: "gpsjam", type: ratio >= 0.1 ? "high" : "med", title: `${Math.round(ratio * 100)}% of aircraft report degraded GPS`, t: Date.parse(day + "T12:00:00Z"), sev: ratio >= 0.1 ? 3 : 1, desc: `${b} of ${n} aircraft on ${day} (UTC)`, src: "GPSJam · ADS-B derived", url: "https://gpsjam.org" } satisfies Feat });
    }
    return fc(feats);
  }
  throw new Error("GPSJam data unavailable");
}
