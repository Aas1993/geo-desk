import { getDailyMany, getQuotes } from "@/lib/markets/source";
import { jsonErr, ok } from "@/lib/markets/http";
import { universe } from "@/lib/markets/universe";
import { lastOf, periodReturn, rsi, sma, volatility, ytdReturn } from "@/lib/markets/indicators";

export async function GET(req: Request, { params }: { params: Promise<{ exchange: string }> }) {
  const { exchange } = await params; const ex = exchange.toUpperCase();
  const ls = (await universe()).filter((l) => l.exchange === ex); if (!ls.length) return Response.json({ error: "not_found" }, { status: 404 });
  const enrich = new URL(req.url).searchParams.get("enrich") === "1";
  try {
    if (!enrich) return ok({ quotes: await getQuotes(ls) }, 60);
    const daily = await getDailyMany(ls); const rows: Record<string, unknown> = {};
    for (const [sym, b] of Object.entries(daily)) {
      if (b.length < 3) continue; const c = b.map((x) => x.c); const last = c[c.length - 1]; const s200 = lastOf(sma(c, 200)), s50 = lastOf(sma(c, 50));
      rows[sym] = { r1w: periodReturn(b, 5), r1m: periodReturn(b, 21), r3m: periodReturn(b, 63), ytd: ytdReturn(b), r1y: periodReturn(b, 250), rsi: lastOf(rsi(c, 14)), vs200: s200 ? last / s200 - 1 : null, vs50: s50 ? last / s50 - 1 : null, vol: volatility(b, 60), spark: c.slice(-40) };
    }
    return ok({ metrics: rows }, 900);
  } catch (e) { return jsonErr(e); }
}
