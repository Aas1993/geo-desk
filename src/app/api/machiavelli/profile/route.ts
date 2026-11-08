import { getProfiles } from "@/lib/machiavelli/profile";

/** The strategic profile of every country (scorecard dimensions, opportunity-radar axes, tier hint, data-rule suggestions) and the concentration of the UAE portfolio. Computed from the app's own datasets: no model call, no cost, read-only. */
export async function GET() {
  const set = await getProfiles(); if (!set) return Response.json({ error: "not_built", message: "The datasets are missing: run the data builders." }, { status: 503 });
  return Response.json(set, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
