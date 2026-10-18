import { MarketError, fixturesOn } from "./source";
import { findListing } from "./universe";
import type { ApiError, Listing } from "./types";

export const jsonErr = (e: unknown) => {
  const kind: ApiError["error"] = e instanceof MarketError ? e.kind : "upstream";
  const status = kind === "no_key" ? 503 : kind === "plan" ? 402 : kind === "not_found" ? 404 : kind === "rate" ? 429 : 502;
  return Response.json({ error: kind, message: e instanceof MarketError ? e.message : undefined } satisfies ApiError, { status, headers: { "Cache-Control": "no-store" } });
};
export const ok = (body: Record<string, unknown>, maxAge = 60) => Response.json({ ...body, synthetic: fixturesOn() }, { headers: { "Cache-Control": fixturesOn() ? "no-store" : `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 5}` } });
export async function listingOr404(ex: string, sym: string): Promise<Listing | Response> {
  const l = await findListing(ex, sym); return l ?? Response.json({ error: "not_found", message: "Unknown ADX/DFM/QSE symbol" } satisfies ApiError, { status: 404 });
}
