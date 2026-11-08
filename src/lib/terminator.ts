import type { Feature, Polygon } from "geojson";
/** The night side of the Earth at `date` as a polygon (solar declination + sidereal angle; accurate to ~1°). */
export function nightPolygon(date = new Date()): Feature<Polygon> {
  const d2r = Math.PI / 180; const jd = date.getTime() / 86400000 + 2440587.5; const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360; const g = ((357.528 + 0.9856003 * n) % 360) * d2r;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * d2r; const eps = (23.439 - 0.0000004 * n) * d2r;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam)); const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const gmst = ((18.697374558 + 24.06570982441908 * n) % 24 + 24) % 24; // hours
  const subLon = ((ra / d2r - gmst * 15 + 540) % 360) - 180; // longitude where the sun is overhead
  const ring: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) { const H = (lon - subLon) * d2r; ring.push([lon, Math.atan(-Math.cos(H) / Math.tan(dec || 1e-6)) / d2r]); }
  const pole = dec >= 0 ? -90 : 90; // night covers the pole that is away from the sun
  ring.push([180, pole], [-180, pole], ring[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}
export function graticule(step = 30): GeoJSON.FeatureCollection {
  const f: GeoJSON.Feature[] = [];
  for (let lon = -180; lon <= 180; lon += step) { const c: [number, number][] = []; for (let lat = -85; lat <= 85; lat += 5) c.push([lon, lat]); f.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } }); }
  for (let lat = -60; lat <= 60; lat += step) { const c: [number, number][] = []; for (let lon = -180; lon <= 180; lon += 5) c.push([lon, lat]); f.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } }); }
  return { type: "FeatureCollection", features: f };
}
