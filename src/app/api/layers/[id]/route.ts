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
import { radar, weather } from "@/lib/layers/sources/weather";

type Loader = (q: URLSearchParams) => Promise<object>;
const statics = Object.fromEntries(STATIC_LAYERS.map((n) => [n, { ttlSec: 3600, load: () => staticLayer(n) }]));
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
  events: { ttlSec: 600, load: () => events() },
  gpsjam: { ttlSec: 21600, load: () => gpsjam() },
  radar: { ttlSec: 120, load: () => radar() },
  // area queries are cached per ~1° cell so panning does not hammer the free API
  flights: { ttlSec: 10, load: (q) => flights(q), keyed: (q) => `${Math.round(+(q.get("lat") ?? 0))},${Math.round(+(q.get("lon") ?? 0))},${q.get("dist") ?? 0}` },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const def = BY_ID.get(id); const src = LOADERS[id];
  if ((!def && id !== "radar") || !src) return NextResponse.json({ error: "unknown_layer" }, { status: 404 });
  const q = new URL(req.url).searchParams; const key = `layer:${id}:${src.keyed ? src.keyed(q) : ""}`;
  try {
    const r = await cached(key, src.ttlSec * 1000, () => src.load(q));
    return NextResponse.json({ ...r.value, meta: { layer: id, fetchedAt: r.at, cached: r.fromCache, count: (r.value as { features?: unknown[] }).features?.length ?? null } }, { headers: { "Cache-Control": `public, s-maxage=${Math.min(src.ttlSec, 60)}` } });
  } catch (e) { return NextResponse.json({ error: "upstream", message: e instanceof Error ? e.message : "error" }, { status: 502 }); }
}
