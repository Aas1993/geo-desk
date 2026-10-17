import { parseRss } from "@/lib/rss";
import type { Headline } from "@/lib/types";

export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  await params;
  const name = new URL(req.url).searchParams.get("name")?.slice(0, 80);
  if (!name) return Response.json({ items: [] });
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent('"' + name + '"')}+when:7d&hl=en&gl=US&ceid=US:en`;
    const r = await fetch(url, { next: { revalidate: 600 }, headers: { "User-Agent": "geo-desk/0.1" } });
    if (!r.ok) return Response.json({ items: [], error: true }, { status: 502 });
    // Google News titles end with " - Outlet"; split it so we show headline + outlet + link only.
    const items: Headline[] = parseRss(await r.text(), "", 12).map((h) => {
      const i = h.title.lastIndexOf(" - ");
      return i > 0 ? { ...h, title: h.title.slice(0, i), outlet: h.title.slice(i + 3) } : h;
    });
    return Response.json({ items }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch { return Response.json({ items: [], error: true }, { status: 502 }); }
}
