import { loadResearch } from "@/lib/deep/research";

/** Research cards from the curated think-tank register (direct feeds where they work, a site-restricted news search where they do not) with the connector status of every source. Nothing is stored and no model is called. */
export async function GET(req: Request) {
  const iso = new URL(req.url).searchParams.get("iso3")?.toUpperCase() || null; if (iso && !/^[A-Z]{3}$/.test(iso)) return Response.json({ error: "bad_request" }, { status: 400 });
  try { return Response.json(await loadResearch(iso === "ARE" ? null : iso), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } }); }
  catch (e) { console.error("[deep/research]", e instanceof Error ? e.message : e); return Response.json({ error: "upstream", message: "Research sources could not be read." }, { status: 503 }); }
}
