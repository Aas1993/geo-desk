import { NextResponse } from "next/server";
import { cached } from "@/lib/layers/cache";
import { BY_ID } from "@/lib/layers/registry";
import { hazards } from "@/lib/layers/sources/hazards";
import { fires } from "@/lib/layers/sources/fires";
import { epidemics } from "@/lib/layers/sources/epidemics";
import { launches } from "@/lib/layers/sources/launches";
import { flights } from "@/lib/layers/sources/flights";
import { satellites } from "@/lib/layers/sources/satellites";
import { events } from "@/lib/layers/sources/events";
import { gpsjam } from "@/lib/layers/sources/gpsjam";
import { missions, visits } from "@/lib/layers/sources/diplomacy";
import { staticLayer, STATIC_LAYERS } from "@/lib/layers/sources/static";
import { cameras, NeedsKey, vessels } from "@/lib/layers/sources/keyed";
import { radar, weather } from "@/lib/layers/sources/weather";

type Loader = (q: URLSearchParams) => Promise<object>;
const statics = Object.fromEntries(STATIC_LAYERS.map((n) => [n, { ttlSec: 3600, load: () => staticLayer(n) }]));
// Area queries are snapped to a ~1 degree cell and a whole-number radius before they are cached and loaded, so equivalent requests share one entry and the cached result belongs to the cell it is keyed by.
const canon = (q: URLSearchParams) => { const lat = parseFloat(q.get("lat") ?? ""), lon = parseFloat(q.get("lon") ?? ""); const dist = Math.min(250, Math.max(0, Math.round(parseFloat(q.get("dist") ?? "0")) || 0)); return dist > 0 && isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat: Math.round(lat), lon: Math.round(lon), dist } : null; };
const cell = (q: URLSearchParams) => { const c = canon(q); return c ? `${c.lat},${c.lon},${c.dist}` : "world"; };
const snap = (q: URLSearchParams) => { const c = canon(q); const n = new URLSearchParams(q); if (c) { n.set("lat", String(c.lat)); n.set("lon", String(c.lon)); n.set("dist", String(c.dist)); } else { n.delete("lat"); n.delete("lon"); n.set("dist", "0"); } return n; };
const LOADERS: Record<string, { ttlSec: number; load: Loader; keyed?: (q: URLSearchParams) => string }> = {
  ...statics,
  hazards: { ttlSec: 600, load: () => hazards() },
  fires: { ttlSec: 1800, load: () => fires() },
  epidemics: { ttlSec: 3600, load: () => epidemics() },
  launches: { ttlSec: 1800, load: () => launches() },
  satellites: { ttlSec: 7200, load: () => satellites() },
  weather: { ttlSec: 1800, load: () => weather() },
  missions: { ttlSec: 3600, load: () => missions() },
  visits: { ttlSec: 3600, load: () => visits() },
  // key-gated: they work as soon as the key is in .env.local, and say which key until then. Cached per ~1 degree cell like flights.
  vessels: { ttlSec: 25, load: (q) => vessels(q), keyed: cell },
  cameras: { ttlSec: 1800, load: (q) => cameras(q), keyed: cell },
  events: { ttlSec: 600, load: () => events() },
  gpsjam: { ttlSec: 21600, load: () => gpsjam() },
  radar: { ttlSec: 120, load: () => radar() },
  // area queries are cached per ~1° cell so panning does not hammer the free API
  flights: { ttlSec: 10, load: (q) => flights(q), keyed: cell },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const def = BY_ID.get(id); const src = LOADERS[id];
  if ((!def && id !== "radar") || !src) return NextResponse.json({ error: "unknown_layer" }, { status: 404 });
  const raw = new URL(req.url).searchParams; const q = src.keyed ? snap(raw) : raw; const key = `layer:${id}:${src.keyed ? src.keyed(q) : ""}`;
  try {
    const r = await cached(key, src.ttlSec * 1000, () => src.load(q));
    return NextResponse.json({ ...r.value, meta: { layer: id, fetchedAt: r.at, cached: r.fromCache, count: (r.value as { features?: unknown[] }).features?.length ?? null } }, { headers: { "Cache-Control": `public, s-maxage=${Math.min(src.ttlSec, 60)}` } });
  } catch (e) { if (e instanceof NeedsKey) return NextResponse.json({ error: "needs_key", message: e.message, envVar: e.envVar }, { status: 503 }); return NextResponse.json({ error: "upstream", message: e instanceof Error ? e.message : "error" }, { status: 502 }); }
}
