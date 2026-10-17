// Tiny in-memory TTL cache with single-flight, shared by the layer data routes. Per-process, lost on restart (see the architecture notes).
const store = new Map<string, { exp: number; v: unknown }>(); const inflight = new Map<string, Promise<unknown>>();
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; at: number; fromCache: boolean }> {
  const hit = store.get(key); const now = Date.now();
  if (hit && hit.exp > now) return { value: hit.v as T, at: hit.exp - ttlMs, fromCache: true };
  const dup = inflight.get(key); if (dup) return { value: (await dup) as T, at: now, fromCache: true };
  const p = load().then((v) => { store.set(key, { exp: Date.now() + ttlMs, v }); return v; }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  try { return { value: await p, at: Date.now(), fromCache: false }; }
  catch (e) { if (hit) return { value: hit.v as T, at: hit.exp - ttlMs, fromCache: true }; throw e; } // serve stale on upstream failure
}
export const UA = "geo-desk/0.1 (personal research project; contact via GitHub Aas1993/geo-desk)";
export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!r.ok) throw new Error(`${new URL(url).host} responded ${r.status}`);
  return (await r.json()) as T;
}
export const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features });
/** Haversine distance in km. */
export function km(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r, x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}
