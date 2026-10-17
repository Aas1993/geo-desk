import { NextResponse } from "next/server";
import { cached } from "@/lib/layers/cache";
import { buildAlerts } from "@/lib/alerts";

export async function GET() {
  try {
    const r = await cached("alerts:all", 120_000, buildAlerts);
    return NextResponse.json(r.value, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) { return NextResponse.json({ error: "upstream", message: e instanceof Error ? e.message : "error" }, { status: 502 }); }
}
