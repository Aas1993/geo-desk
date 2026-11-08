import { loadGraph } from "@/lib/falcon/graph";
import { METRICS, neighbors, paths, rankCountries, search, stats } from "@/lib/falcon/graph-core";

/** The knowledge graph as a queryable service: stats, search, a node's neighbours, paths between two nodes (to the UAE by default) and country rankings. Read-only; every edge says whether it is verified or inferred. */
const ID = /^[A-Z]:[A-Za-z0-9_.\-]{1,80}$/; const num = (v: string | null, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && v != null && v !== "" ? Math.max(lo, Math.min(hi, n)) : d; };
export async function GET(req: Request) {
  const g = await loadGraph(); if (!g) return Response.json({ error: "not_built", message: "Run node scripts/build-graph.mjs" }, { status: 503 });
  const q = new URL(req.url).searchParams; const mode = q.get("mode") ?? "stats"; const head = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" };
  if (mode === "stats") return Response.json(stats(g), { headers: head });
  if (mode === "meta") { const f = g.file; return Response.json({ regions: [...new Set(f.nodes.filter((n) => n.t === "country" && n.r).map((n) => n.r!))].sort(), orgs: f.nodes.filter((n) => n.t === "org").map((n) => ({ id: n.id.slice(2), n: n.n, ar: n.ar })), sectors: f.nodes.filter((n) => n.t === "sector").map((n) => ({ id: n.n, n: n.n })), sources: f.sources, note: f.note }, { headers: head }); }
  if (mode === "search") return Response.json({ results: search(g, (q.get("q") ?? "").slice(0, 60)) }, { headers: head });
  if (mode === "node") { const id = q.get("id") ?? ""; if (!ID.test(id) || !g.byId.has(id)) return Response.json({ error: "not_found" }, { status: 404 }); const prov = q.get("prov"); return Response.json({ node: g.byId.get(id), neighbors: neighbors(g, id, { rels: q.get("rels")?.split(",").filter(Boolean), prov: prov === "verified" || prov === "inferred" ? prov : undefined, minW: num(q.get("minW"), 0, 0, 1), limit: num(q.get("limit"), 40, 1, 200) }) }, { headers: head }); }
  if (mode === "paths") { const from = q.get("from") ?? "", to = q.get("to") ?? "C:ARE"; if (!ID.test(from) || !ID.test(to)) return Response.json({ error: "bad_request" }, { status: 400 }); return Response.json({ paths: paths(g, from, to, { maxHops: num(q.get("hops"), 3, 1, 4), k: num(q.get("k"), 8, 1, 20), direct: q.get("direct") !== "0" }) }, { headers: head }); }
  if (mode === "rank") { const metric = q.get("metric") ?? "deals"; if (!METRICS[metric]) return Response.json({ error: "bad_request" }, { status: 400 }); return Response.json({ rows: rankCountries(g, { metric, region: q.get("region") ?? undefined, subregion: q.get("subregion") ?? undefined, org: q.get("org") ?? undefined, sector: q.get("sector") ?? undefined, limit: num(q.get("limit"), 15, 1, 60) }) }, { headers: head }); }
  return Response.json({ error: "bad_request" }, { status: 400 });
}
