import { getQuote } from "@/lib/markets/source";
import { jsonErr, listingOr404, ok } from "@/lib/markets/http";
export async function GET(req: Request, { params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const { exchange, symbol } = await params; const l = await listingOr404(exchange, symbol); if (l instanceof Response) return l;
  try { return ok({ quote: await getQuote(l) }, 30); } catch (e) { return jsonErr(e); }
}
