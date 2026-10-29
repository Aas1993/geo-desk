import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseRss } from "@/lib/rss";
import type { Headline } from "@/lib/types";

// country names that are also people, places or words elsewhere: the plain query adds the country's own place and demonym so the feed is about the country
const CONTEXT: Record<string, string> = { JOR: "Amman OR Jordanian OR Hashemite", GEO: "Tbilisi OR Georgian OR Caucasus", NER: "Niamey OR Nigerien OR Sahel", TCD: "\"N'Djamena\" OR Chadian OR Sahel", GIN: "Conakry OR Guinean", MLI: "Bamako OR Malian", CHL: "Santiago OR Chilean", PER: "Lima OR Peruvian", COL: "Bogota OR Colombian", IND: "Delhi OR Indian OR Modi", SGP: "Singapore OR Singaporean", SYR: "Damascus OR Syrian", OMN: "Muscat OR Omani" };
export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3)) return Response.json({ items: [] }, { status: 400 });
  const uae = new URL(req.url).searchParams.get("uae") === "1";
  // the search phrase is the country's own name from the dataset, so the query string cannot inject search operators or turn this into an open query proxy
  const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; name: string }[]; const name = list.find((c) => c.iso3 === iso3)?.name;
  if (!name) return Response.json({ items: [] }, { status: 404 });
  try {
    // "uae=1" asks for coverage that links the country and the UAE; both queries are re-fetched at most every 5 minutes
    const ctx = CONTEXT[iso3]; const q = uae ? `"${name}" (UAE OR Emirates OR Emirati OR "Abu Dhabi" OR Dubai)${ctx ? ` (${ctx})` : ""}` : `"${name}"${ctx ? ` (${ctx})` : ""}`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:${uae ? "14d" : "7d"}&hl=en&gl=US&ceid=US:en`;
    const r = await fetch(url, { next: { revalidate: 300 }, headers: { "User-Agent": "geo-desk/0.1" } });
    if (!r.ok) return Response.json({ items: [], error: true }, { status: 502 });
    // Google News titles end with " - Outlet"; split it so we show headline + outlet + link only.
    const items: Headline[] = parseRss(await r.text(), "", uae ? 10 : 14).sort((a, b) => b.ts - a.ts).map((h) => {
      const i = h.title.lastIndexOf(" - ");
      return i > 0 ? { ...h, title: h.title.slice(0, i), outlet: h.title.slice(i + 3) } : h;
    });
    return Response.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch { return Response.json({ items: [], error: true }, { status: 502 }); }
}
