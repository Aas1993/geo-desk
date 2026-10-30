import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseRss } from "@/lib/rss";
import type { Headline } from "@/lib/types";

// country names that are also people, places or words elsewhere: the plain query adds the country's own place and demonym so the feed is about the country
const CONTEXT: Record<string, string> = { JOR: "Amman OR Jordanian OR Hashemite", GEO: "Tbilisi OR Georgian OR Caucasus", NER: "Niamey OR Nigerien OR Sahel", TCD: "\"N'Djamena\" OR Chadian OR Sahel", GIN: "Conakry OR Guinean", MLI: "Bamako OR Malian", CHL: "Santiago OR Chilean", PER: "Lima OR Peruvian", COL: "Bogota OR Colombian", IND: "Delhi OR Indian OR Modi", SGP: "Singapore OR Singaporean", SYR: "Damascus OR Syrian", OMN: "Muscat OR Omani" };
// the angles the platform reads news by (see docs/state-of-the-art-reporting-spec.md, section G): each adds its own terms to the country query
const TOPICS: Record<string, string> = { political: "government OR parliament OR election OR president OR \"prime minister\" OR minister", security: "security OR military OR army OR attack OR terrorism OR defence OR border OR conflict", economy: "economy OR trade OR investment OR IMF OR \"central bank\" OR inflation OR debt OR budget", energy: "energy OR oil OR gas OR electricity OR solar OR nuclear OR hydrogen OR minerals OR water", tech: "\"artificial intelligence\" OR \"data centre\" OR \"data center\" OR satellite OR \"space agency\" OR telecom OR cybersecurity OR semiconductor OR digital OR startup", logistics: "port OR rail OR railway OR shipping OR corridor OR logistics OR airport OR \"free zone\" OR \"supply chain\"", society: "culture OR education OR tourism OR aid OR humanitarian OR students OR diaspora OR media OR festival" };
// the search matches the whole article, so a headline is kept for an angle only when the headline itself speaks to it: a precise short list is better than a long loose one
const TOPIC_RE: Record<string, RegExp> = { political: /govern|parliament|elect|president|prime minister|minister|king|cabinet|vote|law|coalition|summit|talks/i, security: /secur|militar|army|attack|terror|defen[cs]e|border|conflict|strike|troops|missile|war|police|arrest|killed/i, economy: /econom|trade|invest|imf|bank|inflation|debt|budget|deal|growth|tariff|export|import|loan|fund|gdp|currency/i, energy: /energy|oil|gas|electric|solar|nuclear|hydrogen|mineral|water|power|renewable|fuel|pipeline|lng|phosphate|potash/i, tech: /artificial intelligence|\bai\b|data cent|satellite|space|telecom|cyber|semiconductor|digital|tech|startup|5g|software|robot/i, logistics: /port|rail|ship|corridor|logistic|airport|free zone|supply chain|cargo|freight|terminal|canal|highway|aqaba|suez|transit/i, society: /cultur|educat|touris|aid|humanitarian|student|diaspora|media|festival|university|heritage|refugee|health|school|sport/i };
export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3)) return Response.json({ items: [] }, { status: 400 });
  const sp = new URL(req.url).searchParams; const uae = sp.get("uae") === "1"; const topic = TOPICS[sp.get("topic") ?? ""] ? (sp.get("topic") as string) : null;
  // the search phrase is the country's own name from the dataset, so the query string cannot inject search operators or turn this into an open query proxy
  const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; name: string }[]; const name = list.find((c) => c.iso3 === iso3)?.name;
  if (!name) return Response.json({ items: [] }, { status: 404 });
  try {
    // "uae=1" asks for coverage that links the country and the UAE; both queries are re-fetched at most every 5 minutes
    const ctx = CONTEXT[iso3]; const base = uae ? `"${name}" (UAE OR Emirates OR Emirati OR "Abu Dhabi" OR Dubai)${ctx ? ` (${ctx})` : ""}` : `"${name}"${ctx ? ` (${ctx})` : ""}`; const q = topic ? `${base} (${TOPICS[topic]})` : base;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:${uae ? "14d" : "7d"}&hl=en&gl=US&ceid=US:en`;
    const r = await fetch(url, { next: { revalidate: 300 }, headers: { "User-Agent": "geo-desk/0.1" } });
    if (!r.ok) return Response.json({ items: [], error: true }, { status: 502 });
    // Google News titles end with " - Outlet"; split it so we show headline + outlet + link only.
    const items: Headline[] = parseRss(await r.text(), "", topic ? 30 : uae ? 10 : 14).sort((a, b) => b.ts - a.ts).map((h) => {
      const i = h.title.lastIndexOf(" - ");
      return i > 0 ? { ...h, title: h.title.slice(0, i), outlet: h.title.slice(i + 3) } : h;
    });
    const kept = topic ? items.filter((h) => TOPIC_RE[topic].test(h.title)).slice(0, 10) : items;
    return Response.json({ items: kept }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch { return Response.json({ items: [], error: true }, { status: 502 }); }
}
