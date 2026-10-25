import { loadSnapshot } from "@/lib/deep/snapshot";

/** Everything the Deep Intelligence tabs read, computed once from the app's own datasets: macro series with baselines and backtests, financial conditions, trade concentration, exposure register, peer benchmarks and indicator readings. No model call and no cost. */
export async function GET(req: Request) {
  const iso = new URL(req.url).searchParams.get("iso3")?.toUpperCase() || null; if (iso && !/^[A-Z]{3}$/.test(iso)) return Response.json({ error: "bad_request" }, { status: 400 });
  try { return Response.json(await loadSnapshot(iso === "ARE" ? null : iso), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } }); }
  catch (e) { console.error("[deep/snapshot]", e instanceof Error ? e.message : e); return Response.json({ error: "upstream", message: "The datasets could not be read." }, { status: 503 }); }
}
