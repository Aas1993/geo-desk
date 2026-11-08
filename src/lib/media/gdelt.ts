import { cached, peek } from "@/lib/layers/cache";
import type { Item } from "./types";

// GDELT's DOC API asks for one request every 5 s and answers 429 erratically, so every call goes through one global queue
// (one request per ~7 s, a few retries with backoff). A cold country therefore takes a while; results are cached for an hour.
const UA = "geo-desk research (https://github.com/Aas1993/geo-desk)";
const g = globalThis as unknown as { __gdQueue?: { chain: Promise<unknown>; last: number; waiting: number } };
const q = (g.__gdQueue ??= { chain: Promise.resolve(), last: 0, waiting: 0 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export class Busy extends Error {}

async function fetchDoc(params: Record<string, string>): Promise<unknown> {
  const url = "https://api.gdeltproject.org/api/v2/doc/doc?" + new URLSearchParams({ format: "json", ...params });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45_000), cache: "no-store" }); const t = await r.text();
      if (r.ok && t.startsWith("{")) return JSON.parse(t);
      if (r.ok && /too short or too long|invalid/i.test(t)) throw new Error("GDELT rejected the query");
    } catch (e) { if (e instanceof Error && /rejected/.test(e.message)) throw e; }
    await sleep(10_000 * attempt);
  }
  throw new Error("GDELT is rate-limiting or unavailable right now");
}
function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (q.waiting >= 14) return Promise.reject(new Busy("Too many media lookups queued; try again in a minute."));
  q.waiting++;
  const run = q.chain.then(async () => { const wait = q.last + 7_000 - Date.now(); if (wait > 0) await sleep(wait); try { return await fn(); } finally { q.last = Date.now(); } }).finally(() => { q.waiting--; });
  q.chain = run.catch(() => undefined); return run;
}
const TTL = 3_600_000;
export type Series = { points: { t: number; v: number }[]; avg: number | null };
const stamp = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(9, 11) || 0, +s.slice(11, 13) || 0);

/** Average tone of matching articles over the last 30 days. */
export const toneSeries = (query: string) => cached<Series>(`gdelt:tone:${query}`, TTL, () => limited(async () => {
  const j = (await fetchDoc({ query, mode: "timelinetone", timespan: "30d" })) as { timeline?: { data: { date: string; value: number }[] }[] };
  const pts = (j.timeline?.[0]?.data ?? []).filter((p) => Number.isFinite(p.value)).map((p) => ({ t: stamp(p.date), v: +p.value.toFixed(2) }));
  return { points: pts, avg: pts.length ? +(pts.reduce((s, p) => s + p.v, 0) / pts.length).toFixed(2) : null };
})).then((r) => r.value);

/** Articles, ranked most negative or most positive first (GDELT ranks by tone; it does not return the score). */
export const articles = (query: string, sort: "toneasc" | "tonedesc" | "datedesc", n: number, prefix: string) => cached<Item[]>(`gdelt:art:${sort}:${n}:${query}`, TTL, () => limited(async () => {
  const j = (await fetchDoc({ query, mode: "artlist", maxrecords: String(Math.min(n * 3, 75)), sort, timespan: "14d" })) as { articles?: { url: string; title: string; seendate: string; domain: string; language?: string }[] };
  const seen = new Set<string>(); const out: Item[] = [];
  for (const a of j.articles ?? []) { const k = a.title.toLowerCase().slice(0, 60); if (seen.has(k) || !/^https?:/.test(a.url) || a.title.length < 12) continue; seen.add(k); out.push({ id: `${prefix}${out.length + 1}`, title: a.title.trim().slice(0, 220), url: a.url, outlet: a.domain, ts: stamp(a.seendate), lang: a.language, kind: "media" }); if (out.length >= n) break; }
  return out;
})).then((r) => r.value);

/** Already-loaded article lists only; never starts a GDELT call (those can take minutes when GDELT is throttling). */
export const peekArticles = (query: string, sort: "toneasc" | "tonedesc" | "datedesc", n: number) => peek<Item[]>(`gdelt:art:${sort}:${n}:${query}`) ?? [];
