import type { Headline } from "@/lib/types";
import { FEEDS, parseRss } from "@/lib/rss";

export async function GET() {
  const results = await Promise.all(FEEDS.map(async ([name, url]) => {
    try { const r = await fetch(url, { next: { revalidate: 300 }, headers: { "User-Agent": "geo-desk/0.1" } }); return r.ok ? parseRss(await r.text(), name, 8) : []; } catch { return []; }
  }));
  // interleave outlets so the ticker isn't one source at a time
  const items: Headline[] = []; for (let i = 0; i < 8; i++) for (const r of results) if (r[i]) items.push(r[i]);
  return Response.json({ items, fetchedAt: Date.now(), outlets: results.filter((r) => r.length).length }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
