import { NextResponse } from "next/server";
import { cached, getJson } from "@/lib/layers/cache";

type Market = { yes_sub_title?: string; last_price_dollars?: string; yes_bid_dollars?: string; volume_fp?: string | number; volume?: number; status?: string };
type Event = { event_ticker: string; title: string; category?: string; markets?: Market[] };
const TOPIC = /\b(iran|israel|gaza|russia|ukraine|china|taiwan|war|ceasefire|oil|opec|gulf|saudi|uae|emirates|hormuz|houthi|yemen|sanction|nato|nuclear|tariff|trump|putin|zelensky|netanyahu|election|recession|fed|rate)\b/i;

/** Open prediction markets on geopolitics and the economy from Kalshi's public market-data API (keyless). Probabilities are market prices, not forecasts we endorse. */
export async function GET() {
  try {
    const r = await cached("odds:kalshi", 600_000, async () => {
      const j = await getJson<{ events?: Event[] }>("https://api.elections.kalshi.com/trade-api/v2/events?limit=200&status=open&with_nested_markets=true", {}, 25_000);
      const rows = (j.events ?? []).filter((e) => TOPIC.test(e.title)).map((e) => {
        const ms = (e.markets ?? []).filter((m) => m.last_price_dollars != null || m.yes_bid_dollars != null); const vol = ms.reduce((s, m) => s + Number(m.volume_fp ?? m.volume ?? 0), 0);
        const lead = [...ms].sort((a, b) => Number(b.last_price_dollars ?? 0) - Number(a.last_price_dollars ?? 0))[0]; if (!lead) return null;
        return { id: e.event_ticker, title: e.title, lead: ms.length > 1 ? lead.yes_sub_title ?? "" : "", p: Math.round(Number(lead.last_price_dollars ?? lead.yes_bid_dollars ?? 0) * 100), markets: ms.length, vol, url: `https://kalshi.com/markets/${e.event_ticker.split("-")[0].toLowerCase()}` };
      }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.vol - a.vol).slice(0, 12);
      if (!rows.length) throw new Error("no relevant open markets");
      return rows;
    });
    return NextResponse.json({ items: r.value, source: "Kalshi public market data", url: "https://kalshi.com" }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch (e) { return NextResponse.json({ error: "upstream", message: e instanceof Error ? e.message : "error" }, { status: 502 }); }
}
