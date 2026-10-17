import { getBars, type Range } from "@/lib/markets/source";
import { jsonErr, listingOr404, ok } from "@/lib/markets/http";
const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "2Y", "5Y", "MAX"];
export async function GET(req: Request, { params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const { exchange, symbol } = await params; const l = await listingOr404(exchange, symbol); if (l instanceof Response) return l;
  const range = (new URL(req.url).searchParams.get("range") ?? "6M").toUpperCase();
  if (!RANGES.includes(range)) return Response.json({ error: "upstream", message: "bad range" }, { status: 400 });
  try { const r = await getBars(l, range as Range); return ok({ ...r, range }, range === "1D" ? 60 : 300); } catch (e) { return jsonErr(e); }
}
