import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feat } from "../registry";
import { fc, getJson } from "../cache";
type C = { iso3: string; name: string; capital: string | null; lat: number | null; lng: number | null };
const WMO = (c: number) => (c === 0 ? "Clear" : c <= 3 ? "Partly cloudy" : c <= 48 ? "Fog" : c <= 67 ? "Rain" : c <= 77 ? "Snow" : c <= 82 ? "Showers" : "Thunderstorm");
const color = (t: number) => (t >= 40 ? "#ff3b5c" : t >= 32 ? "#ff8a4c" : t >= 24 ? "#ffc247" : t >= 14 ? "#2de39a" : t >= 4 ? "#3ddcff" : t >= -6 ? "#5aa9ff" : "#b693ff");
/** Current temperature at every capital — one Open-Meteo request for all coordinates. */
export async function weather(): Promise<GeoJSON.FeatureCollection> {
  const cs = (JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as C[]).filter((c) => c.lat != null && c.lng != null && c.capital);
  const j = await getJson<{ current: { temperature_2m: number; weather_code: number; wind_speed_10m: number } }[] | { current: { temperature_2m: number; weather_code: number; wind_speed_10m: number } }>(`https://api.open-meteo.com/v1/forecast?latitude=${cs.map((c) => c.lat!.toFixed(2)).join(",")}&longitude=${cs.map((c) => c.lng!.toFixed(2)).join(",")}&current=temperature_2m,weather_code,wind_speed_10m`, {}, 30_000);
  const arr = Array.isArray(j) ? j : [j];
  return fc(cs.flatMap((c, i) => { const w = arr[i]?.current; if (!w) return []; const t = Math.round(w.temperature_2m);
    return [{ type: "Feature", geometry: { type: "Point", coordinates: [c.lng!, c.lat!] }, properties: { id: `wx:${c.iso3}`, layer: "weather", type: "temp", title: `${t}° · ${c.capital}`, label: `${t}°`, c: color(t), t: Date.now(), desc: `${c.name} · ${WMO(w.weather_code)} · wind ${Math.round(w.wind_speed_10m)} km/h`, src: "Open-Meteo", iso3: c.iso3 } satisfies Feat & { label: string; c: string } } as GeoJSON.Feature]; }));
}
export async function radar() {
  const j = await getJson<{ host: string; radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] } }>("https://api.rainviewer.com/public/weather-maps.json");
  const last = j.radar.past[j.radar.past.length - 1]; return { host: j.host, path: last.path, time: last.time * 1000 };
}
