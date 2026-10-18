import type { Feat } from "../registry";
import { fc, getJson } from "../cache";

/** Thrown by loaders that need a free API key the owner has not added yet; the API route turns it into a clear message instead of a failure. */
export class NeedsKey extends Error { constructor(public envVar: string, what: string) { super(`${what}: add ${envVar} to .env.local and restart the dev server.`); } }
const around = (q: URLSearchParams) => { const lat = parseFloat(q.get("lat") ?? ""), lon = parseFloat(q.get("lon") ?? ""), nm = Math.min(250, Math.max(0, parseInt(q.get("dist") ?? "0", 10) || 0)); return isFinite(lat) && isFinite(lon) && nm > 0 ? { lat, lon, km: nm * 1.852 } : null; };

type Pos = { MessageType?: string; MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; time_utc?: string }; Message?: { PositionReport?: { Sog?: number; Cog?: number; NavigationalStatus?: number } } };
/** Ships near the map centre from aisstream.io's free WebSocket (key AISSTREAM_API_KEY). Collects position reports for a few seconds, then returns the latest per vessel. Zoom in to see ships. */
export async function vessels(q: URLSearchParams): Promise<GeoJSON.FeatureCollection> {
  const key = process.env.AISSTREAM_API_KEY; if (!key) throw new NeedsKey("AISSTREAM_API_KEY", "Live vessels need a free aisstream.io key");
  const a = around(q); if (!a) return fc([]); const dLat = a.km / 111, dLon = a.km / (111 * Math.max(0.2, Math.cos((a.lat * Math.PI) / 180)));
  const ships = new Map<number, GeoJSON.Feature>();
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream"); let done = false; const finish = (err?: Error) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch { /* already closed */ } err ? reject(err) : resolve(); }; const timer = setTimeout(() => finish(), 7000);
    ws.addEventListener("open", () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [[[a.lat - dLat, a.lon - dLon], [a.lat + dLat, a.lon + dLon]]], FilterMessageTypes: ["PositionReport"] })));
    ws.addEventListener("message", async (ev) => {
      try { const raw = typeof ev.data === "string" ? ev.data : Buffer.from(await (ev.data as Blob).arrayBuffer()).toString("utf8"); const m = JSON.parse(raw) as Pos & { error?: string }; if (m.error) return finish(new Error(`aisstream: ${m.error}`));
        const md = m.MetaData; const pr = m.Message?.PositionReport; if (!md?.MMSI || md.latitude == null || md.longitude == null) return; const sog = pr?.Sog ?? 0;
        ships.set(md.MMSI, { type: "Feature", geometry: { type: "Point", coordinates: [md.longitude, md.latitude] }, properties: { id: `ais:${md.MMSI}`, layer: "vessels", type: "vessel", title: (md.ShipName ?? "").trim() || `MMSI ${md.MMSI}`, t: md.time_utc ? Date.parse(md.time_utc.replace(" +0000 UTC", "Z").replace(" ", "T")) || Date.now() : Date.now(), sev: sog >= 12 ? 2 : sog >= 1 ? 1 : 0, desc: `MMSI ${md.MMSI} · ${sog.toFixed(1)} kn${pr?.Cog != null ? ` · course ${Math.round(pr.Cog)}°` : ""}`, src: "aisstream.io (AIS)" } satisfies Feat });
      } catch { /* ignore malformed frames */ }
    });
    ws.addEventListener("error", () => finish(new Error("aisstream connection failed")));
  });
  return fc([...ships.values()]);
}

type Cam = { webcamId?: number; title?: string; location?: { latitude?: number; longitude?: number; city?: string; country?: string }; images?: { current?: { preview?: string } }; urls?: { detail?: string } };
/** Public webcams near the map centre from Windy's Webcams API (key WINDY_WEBCAMS_API_KEY). */
export async function cameras(q: URLSearchParams): Promise<GeoJSON.FeatureCollection> {
  const key = process.env.WINDY_WEBCAMS_API_KEY; if (!key) throw new NeedsKey("WINDY_WEBCAMS_API_KEY", "Public cameras need a free Windy webcams key");
  const a = around(q); if (!a) return fc([]);
  const j = await getJson<{ webcams?: Cam[] }>(`https://api.windy.com/webcams/api/v3/webcams?nearby=${a.lat.toFixed(3)},${a.lon.toFixed(3)},${Math.min(250, Math.round(a.km))}&limit=50&include=location,images,urls`, { headers: { "x-windy-api-key": key } });
  return fc((j.webcams ?? []).filter((w) => w.location?.latitude != null && w.location?.longitude != null).map((w) => ({ type: "Feature", geometry: { type: "Point", coordinates: [w.location!.longitude!, w.location!.latitude!] }, properties: { id: `cam:${w.webcamId}`, layer: "cameras", type: "camera", title: w.title ?? "Webcam", sev: 1, desc: [w.location?.city, w.location?.country].filter(Boolean).join(", "), url: w.urls?.detail, src: "Windy Webcams" } satisfies Feat } as GeoJSON.Feature)));
}
