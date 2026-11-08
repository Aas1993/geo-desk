import type { Feat } from "../registry";
import { fc, getJson } from "../cache";
type A = { hex: string; flight?: string; r?: string; t?: string; lat?: number; lon?: number; alt_baro?: number | string; gs?: number; track?: number; dbFlags?: number; category?: string };
const CARGO = new Set(["FDX", "UPS", "GTI", "CLX", "ABW", "CKS", "PAC", "DHK", "BOX", "DHL", "TAY", "QTR_C", "SQC", "CAO", "CSS", "GEC", "MAS_C", "ETH_C", "ATN", "NCA", "KZR", "SQ_C", "RCH_C", "ABX", "SWN_C", "BCS", "ICL", "ADB", "EIA", "UAE_C", "MPH", "AHK_C", "CPA_C", "TAY", "JAL_C", "UPS", "WCW", "KAL_C", "CLU", "QAC"]);
const HELI = /^(H60|H47|H64|H53|EC\d\d|AS\d\d|B06|B407|B412|B429|S92|S76|A109|A139|A169|R44|R66|UH1|AH64|CH47|MI8|MI24|KA52|V22|NH90|AW\d)/;
const MIL: [RegExp, string][] = [[/^(K35|KC10|KC46|K46|A330MRT|MRTT|IL78|KC13|KC30|A332T)/, "tanker"], [/^(E3|E6|E8|E2|R135|RC13|P8|P3|U2|Q4|RQ4|MQ9|MQ1|E737|E7|C560S|GLEX|HAWK|EP3|AWAC|RC12|DHC8M|P8A)/, "recon"], [/^(C17|C5|C130|C30J|C27|C295|A400|IL76|AN12|AN24|AN26|C160|CN35|KC390|C2)/, "airlift"], [/^(B52|B1|B2|TU95|TU16|TU22|TU16|T160)/, "bomber"], [/^(F16|F15|F18|FA18|F22|F35|F14|F4|EUFI|RFAL|TORN|SU2|SU3|SU5|MG29|MG31|M346|T38|HAWK|JAS|A10|EF2K|J10|J11|J20)/, "fighter"]];
const milKind = (t = ""): string => { if (HELI.test(t)) return "heli"; for (const [re, k] of MIL) if (re.test(t)) return k; return "other"; };

function toFeature(a: A, now: number, forceMil = false): GeoJSON.Feature | null {
  if (a.lat == null || a.lon == null) return null;
  const cs = (a.flight ?? "").trim(); const mil = forceMil || ((a.dbFlags ?? 0) & 1) === 1; const alt = typeof a.alt_baro === "number" ? a.alt_baro : 0;
  let type = "ga"; let sub: string | undefined;
  if (mil) { type = "military"; sub = milKind(a.t); }
  else if (/^[A-Z]{3}\d/.test(cs)) type = CARGO.has(cs.slice(0, 3)) ? "cargo" : "airline";
  return { type: "Feature", geometry: { type: "Point", coordinates: [a.lon, a.lat] }, properties: { id: `air:${a.hex}`, layer: "flights", type, sub, title: cs || a.r || a.hex, t: now, sev: mil ? 1 : 0, desc: `${a.t ?? ""} ${a.r ? `· ${a.r} ` : ""}· ${alt ? alt.toLocaleString("en-US") + " ft" : "ground"} · ${a.gs ? Math.round(a.gs) + " kt" : ""}`.trim(), src: "adsb.fi open data", extra: { hdg: a.track ?? null } } satisfies Feat } as GeoJSON.Feature;
}
/** Military aircraft worldwide, plus everything within `dist` nautical miles (≤250) of a point when the map is zoomed in. */
export async function flights(q: URLSearchParams): Promise<GeoJSON.FeatureCollection> {
  const lat = parseFloat(q.get("lat") ?? ""), lon = parseFloat(q.get("lon") ?? ""), dist = Math.min(250, Math.max(0, parseInt(q.get("dist") ?? "0", 10) || 0));
  const base = "https://opendata.adsb.fi/api/v2"; const out = new Map<string, GeoJSON.Feature>();
  const mil = await getJson<{ now: number; ac?: A[]; aircraft?: A[] }>(`${base}/mil`).catch(() => null);
  for (const a of mil?.ac ?? mil?.aircraft ?? []) { const f = toFeature(a, mil?.now ?? Date.now(), true); if (f) out.set((f.properties as Feat).id, f); }
  if (dist > 0 && isFinite(lat) && isFinite(lon)) {
    const j = await getJson<{ now: number; ac?: A[]; aircraft?: A[] }>(`${base}/lat/${lat.toFixed(2)}/lon/${lon.toFixed(2)}/dist/${dist}`);
    for (const a of j.ac ?? j.aircraft ?? []) { const f = toFeature(a, j.now ?? Date.now()); if (f && !out.has((f.properties as Feat).id)) out.set((f.properties as Feat).id, f); }
  } else if (!mil) throw new Error("adsb.fi unavailable");
  return fc([...out.values()]);
}
