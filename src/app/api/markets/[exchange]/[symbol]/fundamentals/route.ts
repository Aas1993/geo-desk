import { ALL_SECTIONS, getFundamentals, type Section } from "@/lib/markets/source";
import { jsonErr, listingOr404, ok } from "@/lib/markets/http";
export async function GET(req: Request, { params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const { exchange, symbol } = await params; const l = await listingOr404(exchange, symbol); if (l instanceof Response) return l;
  const u = new URL(req.url); const period = u.searchParams.get("period") === "quarterly" ? "quarterly" : "annual";
  const want = (u.searchParams.get("sections") ?? "").split(",").filter((x): x is Section => (ALL_SECTIONS as string[]).includes(x));
  try { return ok({ data: await getFundamentals(l, period, want.length ? want : ALL_SECTIONS), period }, 3600); } catch (e) { return jsonErr(e); }
}
