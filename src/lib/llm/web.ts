// The web tools for models that have none of their own: a search and a page reader the engine runs on the model's behalf.
// Search backends, first that has a key: Tavily (TAVILY_API_KEY; its free tier is 1,000 searches a month with no card), Brave (BRAVE_API_KEY; now metered, needs a card), else the keyless search below. The keyless search covers recent news, think-tank and official feeds and reference sources, but it is not a web index: it cannot find an arbitrary page or an older document, so a Tavily key is what brings it level with Claude's search.
export type Hit = { title: string; url: string; snippet: string };
export const BLOCKED = ["adx.ae", "qe.com.qa"]; // ADX's terms prohibit automated retrieval
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
type F = typeof fetch;

/** The model chooses the address, so private and local ones are refused (a page fetch must never reach the machine's own network). */
export function safeUrl(u: string): URL | null {
  let x: URL; try { x = new URL(u); } catch { return null; }
  if (x.protocol !== "https:" && x.protocol !== "http:") return null;
  const h = x.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") && !h.includes(":")) return null; // localhost, intranet names
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(h)) return null;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "::1" || /^(fc|fd|fe80)/.test(h)) return null;
  if (BLOCKED.some((b) => h === b || h.endsWith("." + b))) return null;
  return x;
}
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

async function tavily(q: string, f: F): Promise<Hit[]> {
  const r = await f("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` }, body: JSON.stringify({ query: q, max_results: 6, search_depth: "basic" }), signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`tavily ${r.status}`); const j = await r.json() as { results?: { title: string; url: string; content: string }[] };
  return (j.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: (x.content ?? "").slice(0, 400) }));
}
async function brave(q: string, f: F): Promise<Hit[]> {
  const r = await f(`https://api.search.brave.com/res/v1/web/search?count=6&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY! }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`brave ${r.status}`); const j = await r.json() as { web?: { results?: { title: string; url: string; description?: string }[] } };
  return (j.web?.results ?? []).map((x) => ({ title: strip(x.title), url: x.url, snippet: strip(x.description ?? "").slice(0, 400) }));
}
// ---- the keyless search: news, think-tank and official feeds plus reference sources, all free and openly offered ----
// Feeds checked live on 2026-10-31. Some sites (Chatham House, ECFR, MEI, the US State Department) refuse scripted readers and CSIS, CFR, Carnegie and Brookings publish no feed at a stable address, so they are not here.
export const FEEDS: { name: string; url: string }[] = [
  { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml" }, { name: "UN Press", url: "https://press.un.org/en/rss.xml" },
  { name: "International Crisis Group", url: "https://www.crisisgroup.org/rss" }, { name: "Atlantic Council", url: "https://www.atlanticcouncil.org/feed/" }, { name: "RAND", url: "https://www.rand.org/pubs/new.xml" },
  { name: "UK Foreign Office", url: "https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom" }, { name: "The National", url: "https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" }, { name: "Arab News", url: "https://www.arabnews.com/rss.xml" }, { name: "Foreign Policy", url: "https://foreignpolicy.com/feed/" },
  { name: "IAEA", url: "https://www.iaea.org/feeds/topnews" }, { name: "ReliefWeb", url: "https://reliefweb.int/updates/rss.xml" }, { name: "BIS", url: "https://www.bis.org/doclist/bis_fsi_publs.rss" },
];
const unCdata = (x: string) => x.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
/** The items of an RSS or Atom feed: title, link and a short summary. */
export function parseFeed(xml: string, source = ""): Hit[] {
  const out: Hit[] = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>]([\s\S]*?)<\/\1>/g)) {
    const b = m[2]; const t = strip(unCdata(/<title[^>]*>([\s\S]*?)<\/title>/.exec(b)?.[1] ?? "")); const link = /<link[^>]*href="([^"]+)"/.exec(b)?.[1] ?? strip(unCdata(/<link[^>]*>([\s\S]*?)<\/link>/.exec(b)?.[1] ?? ""));
    const d = strip(unCdata(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/.exec(b)?.[1] ?? "")).slice(0, 360);
    if (t && /^https?:\/\//.test(link)) out.push({ title: source ? `${t} (${source})` : t, url: link, snippet: d });
  }
  return out;
}
const STOP = new Set("the and for with from that this are was has have about between over into new latest recent news report what which when where how why its their they them his her our can will may".split(" "));
export const queryTerms = (q: string) => [...new Set(q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))];
/** Items that mention enough of the query's words, best first: two words when the query has more than one, else the one. */
export function rankItems(items: Hit[], q: string, limit = 4): Hit[] {
  const terms = queryTerms(q); if (!terms.length) return []; const need = Math.min(2, terms.length);
  return items.map((h) => { const hay = `${h.title} ${h.snippet}`.toLowerCase(); return { h, n: terms.filter((t) => hay.includes(t)).length }; }).filter((x) => x.n >= need).sort((a, b) => b.n - a.n).slice(0, limit).map((x) => x.h);
}
const FEED_CACHE = ((globalThis as { __gdFeeds?: Map<string, { at: number; items: Hit[] }> }).__gdFeeds ??= new Map());
const FEED_TTL = 30 * 60_000;
async function feedItems(f: F): Promise<Hit[]> {
  const all = await Promise.all(FEEDS.map(async (fd) => { const c = FEED_CACHE.get(fd.url); if (c && Date.now() - c.at < FEED_TTL) return c.items; try { const r = await f(fd.url, { headers: { ...UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, redirect: "follow", signal: AbortSignal.timeout(15_000) }); if (!r.ok) return c?.items ?? []; const items = parseFeed(await r.text(), fd.name); FEED_CACHE.set(fd.url, { at: Date.now(), items }); return items; } catch { return c?.items ?? []; } }));
  return all.flat();
}
async function free(q: string, f: F): Promise<Hit[]> {
  const out: Hit[] = []; const take = (h: Hit[]) => { out.push(...h); };
  const gd = f(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=5&format=json&sort=hybridrel`, { headers: UA, signal: AbortSignal.timeout(8_000) }).then(async (r) => { if (!r.ok) return; const t = await r.text(); try { take(((JSON.parse(t) as { articles?: { url: string; title: string; domain?: string; seendate?: string }[] }).articles ?? []).map((a) => ({ title: a.title, url: a.url, snippet: `${a.domain ?? ""} ${a.seendate ?? ""}`.trim() }))); } catch { /* GDELT answers a throttled call with text, not JSON */ } }).catch(() => {});
  const wp = f(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=2&format=json&origin=*`, { headers: UA, signal: AbortSignal.timeout(8_000) }).then(async (r) => { if (!r.ok) return; const j = await r.json() as { query?: { search?: { title: string; snippet: string }[] } }; take((j.query?.search ?? []).map((a) => ({ title: `${a.title} (Wikipedia)`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.title.replace(/ /g, "_"))}`, snippet: strip(a.snippet) }))); }).catch(() => {});
  const wb = f(`https://search.worldbank.org/api/v3/wds?format=json&qterm=${encodeURIComponent(q)}&rows=3&fl=display_title,url,docdt,docty`, { headers: UA, signal: AbortSignal.timeout(8_000) }).then(async (r) => { if (!r.ok) return; const j = await r.json() as { documents?: Record<string, { display_title?: string; url?: string; docdt?: string; docty?: string }> }; take(Object.values(j.documents ?? {}).filter((d) => d && d.url && d.display_title).map((d) => ({ title: `${d.display_title} (World Bank)`, url: d.url!, snippet: `${d.docty ?? "document"} ${String(d.docdt ?? "").slice(0, 10)}`.trim() }))); }).catch(() => {});
  const mg = f(`https://api.marginalia.nu/public/search/${encodeURIComponent(q)}?count=3`, { headers: UA, signal: AbortSignal.timeout(8_000) }).then(async (r) => { if (!r.ok) return; const j = await r.json() as { results?: { url: string; title?: string; description?: string }[] }; take((j.results ?? []).map((a) => ({ title: strip(a.title ?? a.url), url: a.url, snippet: strip(a.description ?? "").slice(0, 300) }))); }).catch(() => {});
  const fd = feedItems(f).then((items) => take(rankItems(items, q, 4))).catch(() => {});
  await Promise.all([gd, wp, wb, mg, fd]); return out;
}
// ---- keyed search providers, each with a free tier, rotated so no single quota is used up ----
// Free tiers (checked 2026-10-31; limits change, confirm on each site): Tavily 1,000 searches a month, no card; Linkup 20 euros at signup and topped up monthly, no card; Exa 10 dollars a month, no card; Serper 2,500 queries once; Brave now bills (a card, 5 dollars of monthly credit).
async function linkup(q: string, f: F): Promise<Hit[]> {
  const r = await f("https://api.linkup.so/v1/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LINKUP_API_KEY}` }, body: JSON.stringify({ q, depth: "standard", outputType: "searchResults", maxResults: 6 }), signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`linkup ${r.status}`); const j = await r.json() as { results?: { name?: string; url?: string; content?: string; type?: string }[] };
  return (j.results ?? []).filter((x) => x.type !== "image" && x.url).map((x) => ({ title: x.name ?? x.url!, url: x.url!, snippet: strip(x.content ?? "").slice(0, 400) }));
}
async function exa(q: string, f: F): Promise<Hit[]> {
  const r = await f("https://api.exa.ai/search", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.EXA_API_KEY! }, body: JSON.stringify({ query: q, numResults: 6, type: "auto", contents: { highlights: { maxCharacters: 500 } } }), signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`exa ${r.status}`); const j = await r.json() as { results?: { title?: string; url?: string; highlights?: string[]; text?: string }[] };
  return (j.results ?? []).filter((x) => x.url).map((x) => ({ title: x.title ?? x.url!, url: x.url!, snippet: strip((x.highlights ?? []).join(" ") || x.text || "").slice(0, 400) }));
}
async function serper(q: string, f: F): Promise<Hit[]> {
  const r = await f("https://google.serper.dev/search", { method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": process.env.SERPER_API_KEY! }, body: JSON.stringify({ q, num: 6 }), signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`serper ${r.status}`); const j = await r.json() as { organic?: { title?: string; link?: string; snippet?: string }[] };
  return (j.organic ?? []).filter((x) => x.link).map((x) => ({ title: x.title ?? x.link!, url: x.link!, snippet: strip(x.snippet ?? "").slice(0, 400) }));
}
const KEYED: { id: string; env: string; run: (q: string, f: F) => Promise<Hit[]> }[] = [
  { id: "tavily", env: "TAVILY_API_KEY", run: tavily }, { id: "linkup", env: "LINKUP_API_KEY", run: linkup }, { id: "exa", env: "EXA_API_KEY", run: exa }, { id: "serper", env: "SERPER_API_KEY", run: serper }, { id: "brave", env: "BRAVE_API_KEY", run: brave },
];
/** The keyed providers that have a key, in preference order. */
export const searchBackends = (env: Record<string, string | undefined> = process.env) => KEYED.filter((k) => env[k.env]).map((k) => k.id);
export const searchBackend = (env: Record<string, string | undefined> = process.env) => searchBackends(env)[0] ?? "free";
const POOL = ((globalThis as { __gdSearchPool?: { next: number; off: Map<string, number> } }).__gdSearchPool ??= { next: 0, off: new Map() });
const OFF_MS = 60 * 60_000; const quotaish = (m: string) => /\b(402|429|432|433|403|401)\b|credit|quota|limit/i.test(m);
/** Search results with blocked and private addresses removed. Calls are spread round-robin over every keyed provider that has a key, so free quotas last longer; a provider that reports a quota or key problem is left alone for an hour, and a provider that errors for another reason is skipped for this query. If none gives results the keyless search answers, so a spent quota never ends the research. */
export async function webSearch(q: string, f: F = fetch): Promise<Hit[]> {
  const have = KEYED.filter((k) => process.env[k.env]); let hits: Hit[] = [];
  if (have.length) {
    const start = POOL.next++ % have.length;
    for (let i = 0; i < have.length && !hits.length; i++) {
      const k = have[(start + i) % have.length]; if ((POOL.off.get(k.id) ?? 0) > Date.now()) continue;
      try { hits = await k.run(q, f); } catch (e) { const m = e instanceof Error ? e.message : "error"; if (quotaish(m)) POOL.off.set(k.id, Date.now() + OFF_MS); console.warn(`[web] ${k.id} search failed (${m.slice(0, 80)})${quotaish(m) ? "; left alone for an hour" : ""}`); }
    }
  }
  if (!hits.length) hits = await free(q, f);
  return hits.filter((h) => safeUrl(h.url)).slice(0, 10);
}
/** For tests: forget which providers were put aside. */
export const resetSearchPool = () => { POOL.next = 0; POOL.off.clear(); };

/** A page as plain text, cut to maxChars. A page our own reader cannot use (a script-heavy page, a block, a PDF) is read through Jina Reader, which is free without a key at 20 requests a minute and reads PDFs. */
export async function webFetch(url: string, maxChars: number, f: F = fetch): Promise<{ title: string; text: string }> {
  const u = safeUrl(url); if (!u) throw new Error("address refused");
  try {
    const r = await f(u.href, { headers: { ...UA, Accept: "text/html,text/plain;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`); if (!safeUrl(r.url || u.href)) throw new Error("redirected to a refused address");
    const ct = r.headers.get("content-type") ?? ""; if (!/text\/(html|plain)|xml/.test(ct)) throw new Error(`not a text page (${ct.split(";")[0] || "unknown"})`);
    const html = (await r.text()).slice(0, 2_000_000); const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "") || u.hostname;
    const body = html.replace(/<(script|style|nav|footer|header|aside|noscript|svg|form)[\s\S]*?<\/\1>/gi, " ");
    const text = strip(body).slice(0, maxChars); if (text.length >= 400) return { title, text }; throw new Error("almost no text");
  } catch (direct) {
    try {
      const r = await f(`https://r.jina.ai/${u.href}`, { headers: { ...UA, Accept: "text/plain" }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`reader HTTP ${r.status}`); const t = (await r.text()).trim(); if (t.length < 200) throw new Error("reader returned almost nothing");
      const title = /^Title:\s*(.+)$/m.exec(t)?.[1]?.trim() || u.hostname; return { title, text: t.replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars) };
    } catch { throw direct instanceof Error ? direct : new Error("could not read the page"); }
  }
}
