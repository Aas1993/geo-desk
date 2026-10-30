import { investFor } from "@/lib/invest-data";

export async function GET(_req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3)) return Response.json({ error: "bad_request" }, { status: 400 });
  const p = await investFor(iso3); if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(p, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
