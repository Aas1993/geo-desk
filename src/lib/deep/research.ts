import { readFile } from "node:fs/promises";
import path from "node:path";
import { cached } from "@/lib/layers/cache";
import { buildTagger, familyOf, langOf, regionsOf, topicsOf, type Pub } from "./research-core";
import { SOURCES, SOURCE_BY, type Source } from "./sources";

// Server side of the research tabs: reads each curated institution by the best route that works (its own feed, else a site-restricted news search) and returns cards plus an honest per-source status.
// Rights: the desk stores nothing. Each card is the publisher's own title, date, author and short feed description with a link to the original; no full text is fetched, translated or embedded.
export type SourceStatus = { id: string; connector: Source["connector"]; ok: boolean; n: number; error?: string; checkedAt: string };
export type ResearchResult = { pubs: Pub[]; status: SourceStatus[]; fetchedAt: string; country: string | null };
const UA = { "User-Agent": "geo-desk/0.1 (research reader)" };
const dec = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;/g, "’").replace(/&#8211;/g, "–").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (x: string, n: string) => x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`))?.[1];

type Raw = { title: string; url: string; ts: number; author?: string; summary?: string };
function parseFeed(xml: string, max: number): Raw[] {
  const out: Raw[] = [];
  for (const it of (xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? []).slice(0, max)) {
    const title = tag(it, "title"); const link = tag(it, "link") ?? it.match(/<link[^>]*href="([^"]+)"/)?.[1]; const url = link ? dec(link) : ""; if (!title || !/^https?:\/\//i.test(url)) continue;
    const date = tag(it, "pubDate") ?? tag(it, "dc:date"); const ts = date ? Date.parse(dec(date)) : NaN; if (!isFinite(ts)) continue; // a card without a date cannot be placed in time, so it is left out rather than dated "now"
    const au = tag(it, "dc:creator") ?? tag(it, "author"); const ds = tag(it, "description") ?? tag(it, "content:encoded");
    out.push({ title: dec(title).slice(0, 240), url, ts, author: au ? dec(au).slice(0, 80) : undefined, summary: ds ? dec(ds).slice(0, 280) : undefined });
  }
  return out;
}
const get = async (url: string, ms = 20_000) => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), cache: "no-store", redirect: "follow" }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); };

const feedPubs = (s: Source) => cached<Raw[]>(`deep:feed:${s.id}`, 3_600_000, async () => { const all: Raw[] = []; for (const u of s.feeds ?? []) all.push(...parseFeed(await get(u), 40)); return all; }).then((r) => r.value);
/** Pieces found by a news search restricted to institutions' sites. A Google News title ends " - Outlet", which is how a piece is credited to its institution; a title that names no listed institution is dropped. */
const searchRaw = (srcs: Source[], term: string | null) => cached<{ title: string; url: string; ts: number; outlet: string }[]>(`deep:search:${srcs.map((s) => s.id).join(",")}:${term ?? ""}`, 3_600_000, async () => {
  const sites = srcs.filter((s) => s.domain).map((s) => `site:${s.domain}`).join(" OR "); const q = `${term ? `intitle:"${term}" ` : ""}when:365d (${sites})`;
  const xml = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`);
  return parseFeed(xml, 100).map((r) => { const i = r.title.lastIndexOf(" - "); return { title: i > 0 ? r.title.slice(0, i) : r.title, url: r.url, ts: r.ts, outlet: i > 0 ? r.title.slice(i + 3) : "" }; });
}).then((r) => r.value);
const sourceByOutlet = (o: string) => { const t = o.toLowerCase(); return SOURCES.find((s) => t.includes(s.short.toLowerCase()) || t.includes(s.name.toLowerCase()) || (s.domain && t.includes(s.domain.split(".")[0]))); };

export async function loadResearch(iso3: string | null): Promise<ResearchResult> {
  const countries = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; name: string }[];
  const tag3 = buildTagger(countries); const name = iso3 ? countries.find((c) => c.iso3 === iso3)?.name ?? null : null;
  const status: SourceStatus[] = []; const raw: { src: Source; r: Raw; how: "feed" | "search" }[] = []; const checkedAt = new Date().toISOString();
  await Promise.all([
    ...SOURCES.filter((s) => s.connector === "feed").map(async (s) => { try { const rs = await feedPubs(s); rs.forEach((r) => raw.push({ src: s, r, how: "feed" })); status.push({ id: s.id, connector: s.connector, ok: true, n: rs.length, checkedAt }); } catch (e) { status.push({ id: s.id, connector: s.connector, ok: false, n: 0, error: e instanceof Error ? e.message.slice(0, 80) : "error", checkedAt }); } }),
    (async () => {
      const searched = SOURCES.filter((s) => s.connector !== "feed"); const counts = new Map<string, number>(); let err: string | undefined;
      // the UAE institutions are always searched on their own (their output is the point of the first tab); the other search-only sites are searched together, narrowed to the chosen country when there is one
      const jobs = [searchRaw(searched.filter((s) => s.kind === "uae"), null), searchRaw(searched.filter((s) => s.kind === "uae"), name), searchRaw(searched.filter((s) => s.kind === "global"), name)].filter((_, i) => i !== 1 || name);
      const res = await Promise.allSettled(jobs); const seen = new Set<string>();
      for (const x of res) { if (x.status === "rejected") { err = x.reason instanceof Error ? x.reason.message.slice(0, 80) : "error"; continue; }
        for (const h of x.value) { const s = sourceByOutlet(h.outlet); if (!s || s.connector === "feed" || seen.has(h.url)) continue; seen.add(h.url); counts.set(s.id, (counts.get(s.id) ?? 0) + 1); raw.push({ src: s, r: { title: h.title, url: h.url, ts: h.ts }, how: "search" }); } }
      for (const s of searched) status.push({ id: s.id, connector: s.connector, ok: !err || (counts.get(s.id) ?? 0) > 0, n: counts.get(s.id) ?? 0, error: err && !(counts.get(s.id) ?? 0) ? err : undefined, checkedAt });
    })(),
  ]);
  const seenUrl = new Set<string>();
  const pubs: Pub[] = raw.filter((x) => (seenUrl.has(x.r.url) ? false : (seenUrl.add(x.r.url), true))).map((x, i) => {
    const text = `${x.r.title} ${x.r.summary ?? ""}`; const about = tag3(text);
    return { id: `P${i + 1}`, src: x.src.id, title: x.r.title, url: x.r.url, ts: x.r.ts, lang: langOf(x.r.title), author: x.r.author, summary: x.r.summary, how: x.how, about, regions: regionsOf(text), topics: topicsOf(text), uae: about.includes("ARE"), family: "" };
  }).sort((a, b) => b.ts - a.ts);
  return { pubs: familyOf(pubs).sort((a, b) => b.ts - a.ts).map((p, i) => ({ ...p, id: `P${i + 1}` })), status: status.sort((a, b) => a.id.localeCompare(b.id)), fetchedAt: checkedAt, country: iso3 };
}
export { SOURCE_BY };
