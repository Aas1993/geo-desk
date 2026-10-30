import { loadCase } from "@/lib/case/load";

/** The Case File for one country: six lenses, eight value pillars, the posture rule, the instrument matrix, the measured position toward UAE policy, neighbours, rivals and the ten-year trend spine. Computed from held datasets; no model call and no cost. */
export async function GET(_req: Request, ctx: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await ctx.params; const iso = iso3.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso) || iso === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  try { const d = await loadCase(iso); return d ? Response.json(d, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } }) : Response.json({ error: "not_found" }, { status: 404 }); }
  catch (e) { console.error("[case]", e instanceof Error ? e.message : e); return Response.json({ error: "upstream", message: "The datasets could not be read." }, { status: 503 }); }
}
