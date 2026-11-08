import type { Feat } from "../registry";
import { fc, getJson } from "../cache";
type L = { id: string; name: string; net: string; status: { abbrev: string; name: string }; pad: { latitude: string; longitude: string; name: string; location: { name: string } }; launch_service_provider: { name: string }; mission: { name: string; description: string } | null; image: string | null };
/** Upcoming orbital launches (Launch Library 2, free tier = 15 requests/hour, so cached for 30 min). */
export async function launches(): Promise<GeoJSON.FeatureCollection> {
  const j = await getJson<{ results: L[] }>("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=25&mode=normal");
  return fc(j.results.filter((l) => l.pad?.latitude && l.pad?.longitude).map((l) => {
    const t = Date.parse(l.net); const soon = t - Date.now() < 48 * 3600e3;
    return { type: "Feature", geometry: { type: "Point", coordinates: [+l.pad.longitude, +l.pad.latitude] }, properties: { id: `ll2:${l.id}`, layer: "launches", type: "launch", title: l.name, t, sev: soon ? 2 : 1, url: `https://thespacedevs.com/llapi`, desc: `${l.launch_service_provider?.name ?? ""} · ${l.pad.name}, ${l.pad.location?.name ?? ""} · NET ${l.net.slice(0, 16).replace("T", " ")} UTC · ${l.status?.name ?? ""}`, src: "Launch Library 2" } satisfies Feat } as GeoJSON.Feature;
  }));
}
