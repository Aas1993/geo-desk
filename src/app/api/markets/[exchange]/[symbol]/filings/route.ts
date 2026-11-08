import { filings } from "@/lib/markets/dfm-filings";
import { listingOr404 } from "@/lib/markets/http";
export async function GET(req: Request, { params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const { exchange, symbol } = await params; const l = await listingOr404(exchange, symbol); if (l instanceof Response) return l;
  // Only DFM has a public machine-readable disclosure feed. ADX's terms prohibit automated retrieval, so we say so instead of guessing.
  if (l.exchange === "QSE") return Response.json({ available: false, reason: "qse_no_feed", items: [], total: 0 }); // Qatar Exchange: no machine-readable feed is used (qe.com.qa asks robots not to read its documents)
  if (l.exchange !== "DFM") return Response.json({ available: false, reason: "adx_no_feed", items: [], total: 0 });
  if (!l.feedSymbol) return Response.json({ available: false, reason: "no_feed_match", items: [], total: 0 });
  const skip = Math.max(0, parseInt(new URL(req.url).searchParams.get("skip") ?? "0", 10) || 0);
  try { const r = await filings(l.feedSymbol, skip); return Response.json({ available: true, ...r }, { headers: { "Cache-Control": "public, s-maxage=600" } }); }
  catch (e) { return Response.json({ available: true, error: "upstream", items: [], total: 0 }, { status: 502 }); }
}
