import { getWatch } from "@/lib/machiavelli/hostility-server";

/** The non-friendly-states watch list: measured friction signals plus the register of documented tensions. Computed from the app's own datasets; no model call, no cost, read-only. */
export async function GET() {
  const w = await getWatch(); if (!w) return Response.json({ error: "not_built", message: "The datasets are missing: run the data builders." }, { status: 503 });
  return Response.json(w, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
