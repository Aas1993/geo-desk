import type { Headline } from "@/lib/types";
export const FEEDS: [string, string][] = [
  ["BBC", "https://feeds.bbci.co.uk/news/world/rss.xml"],
  ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
  ["The Guardian", "https://www.theguardian.com/world/rss"],
  ["DW", "https://rss.dw.com/rdf/rss-en-world"],
  ["France 24", "https://www.france24.com/en/rss"],
  ["NPR", "https://feeds.npr.org/1004/rss.xml"],
];
const dec = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();
export function parseRss(xml: string, outlet: string, max: number): Headline[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  const out: Headline[] = [];
  for (const it of items.slice(0, max)) {
    const title = it.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]; const link = it.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] ?? it.match(/<link[^>]*href="([^"]+)"/)?.[1];
    const date = it.match(/<(?:pubDate|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date)>/)?.[1];
    if (!title || !link) continue;
    const ts = date ? Date.parse(dec(date)) : NaN;
    out.push({ outlet, title: dec(title), link: dec(link), ts: isFinite(ts) ? ts : Date.now() });
  }
  return out;
}
