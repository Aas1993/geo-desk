import { worldModel } from "@/lib/falcon/world";

/** The Falcon Eye world model: every country's score components and early-warning triggers, plus the freshness of each dataset. Read from files; no model call. */
export async function GET() {
  try { const m = await worldModel(); return Response.json(m, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }); }
  catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
