import { bilateral, trend } from "@/lib/comtrade";

export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  await params;
  const u = new URL(req.url); const num = parseInt(u.searchParams.get("num") ?? "", 10);
  if (!Number.isFinite(num) || num < 1 || num > 999 || num === 784) return Response.json({ error: "bad num" }, { status: 400 });
  try {
    if (u.searchParams.get("trend")) {
      const year = parseInt(u.searchParams.get("year") ?? "", 10);
      if (!Number.isFinite(year) || year < 2000 || year > 2030) return Response.json({ error: "bad year" }, { status: 400 });
      return Response.json({ series: await trend(num, year, u.searchParams.get("mirror") === "1") }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
    }
    const data = await bilateral(num);
    return Response.json({ data }, { headers: { "Cache-Control": data ? "public, s-maxage=86400" : "no-store" } });
  } catch { return Response.json({ error: "upstream" }, { status: 502 }); }
}
