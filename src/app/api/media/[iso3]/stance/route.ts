import { readFile } from "node:fs/promises";
import { oneLine, rejectCrossSite, safeMessage } from "@/lib/guard";
import path from "node:path";
import { priceOf } from "@/lib/dossier/cost";
import { llmClient, resolveModel, upstreamMessage } from "@/lib/llm";
import { peekArticles } from "@/lib/media/gdelt";
import { thinkTankItems, UAE_TERMS } from "@/lib/media/thinktanks";
import { SCHEMA, SYSTEM, userMessage } from "@/lib/media/stance-prompt";
import type { Item, StanceRead, StanceResult } from "@/lib/media/types";

export const maxDuration = 180;
// Cheap by design: no web tools, low effort, headline-sized input, cached for hours, started only by a click.
const MODEL = resolveModel(process.env.MEDIA_MODEL || process.env.BRIEF_MODEL || "claude-sonnet-5-5");
const MAX_PER_HOUR = Math.max(1, +(process.env.MEDIA_MAX_PER_HOUR ?? 12) || 12); const TTL = 3 * 3600_000;
const g = globalThis as unknown as { __gdMedia?: { cache: Map<string, StanceResult>; running: Set<string>; runs: number[] } };
const store = (g.__gdMedia ??= { cache: new Map(), running: new Set(), runs: [] });

export async function GET() {
  const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length;
  return Response.json({ enabled: process.env.MEDIA_ENABLED !== "0", model: MODEL, ttlHours: TTL / 3600_000, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  if (process.env.MEDIA_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean }; const arabic = body.lang === "ar"; const key = `${iso3}:${arabic ? "ar" : "en"}`;
  const hit = store.cache.get(key); if (hit && !body.refresh && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running.has(key)) return Response.json({ error: "busy", message: "A stance read for this country is already running." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
  if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new stance reads per hour reached (MEDIA_MAX_PER_HOUR). Cached reads are still free.` }, { status: 429 });
  store.running.add(key);
  try {
    const rd = async <T,>(f: string) => JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T;
    const [fips, list] = await Promise.all([rd<Record<string, string>>("fips.json"), rd<{ iso3: string; name: string }[]>("countries.json")]);
    const country = list.find((c) => c.iso3 === iso3); const code = fips[iso3]; if (!country || !code) return Response.json({ error: "not_found" }, { status: 404 });
    const name = country.name.replace(/,.*$/, ""); const qIn = `"United Arab Emirates" sourcecountry:${code}`, qOut = `"${name}" sourcecountry:AE`;
    // GDELT lists come only from what the page has already loaded (a cold GDELT call can take minutes); think tanks are fetched now
    const [tU, tC] = await Promise.all([thinkTankItems(UAE_TERMS, "TU"), thinkTankItems([name], "TC")].map((p) => p.catch(() => [] as Item[])));
    const inNeg = peekArticles(qIn, "toneasc", 6), inPos = peekArticles(qIn, "tonedesc", 6), outNeg = peekArticles(qOut, "toneasc", 6), outPos = peekArticles(qOut, "tonedesc", 6);
    const target = (it: Item) => (/^(M|TU)/.test(it.id) ? "UAE" : name);
    const uniq = new Map<string, Item>(); for (const it of [...inNeg, ...inPos, ...outNeg, ...outPos, ...tU.slice(0, 8), ...tC.slice(0, 8)]) if (!uniq.has(it.id)) uniq.set(it.id, it);
    const items = [...uniq.values()]; if (items.length < 4) return Response.json({ error: "thin", message: "Not enough recent coverage was found to judge a stance. Try again later." }, { status: 422 });
    store.runs.push(Date.now());
    const text = items.map((it) => `[${it.id}] (${it.kind === "thinktank" ? "think tank" : "media"}, ${oneLine(it.outlet, 80)}, ${new Date(it.ts).toISOString().slice(0, 10)}, TARGET: ${target(it)}) ${oneLine(it.title, 300)}`).join("\n");
    const client = llmClient(); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 6000, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: userMessage({ items: text, country: name, arabic }) }],
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
    }, { signal: req.signal });
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") return Response.json({ error: msg.stop_reason, message: msg.stop_reason === "refusal" ? "The model declined to judge this coverage." : "The read was cut off. Try again." }, { status: 502 });
    let read: StanceRead; try { read = JSON.parse(msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")) as StanceRead; } catch { return Response.json({ error: "bad_output", message: "The model returned an unreadable result. Try again." }, { status: 502 }); }
    const ids = new Set(items.map((i) => i.id)); read.items = read.items.filter((i) => ids.has(i.id)); for (const n of read.narratives) n.ids = n.ids.filter((x) => ids.has(x)); read.narratives = read.narratives.filter((n) => n.ids.length);
    const u = msg.usage; const pr = priceOf(MODEL); const cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0;
    const usd = pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + cr * pr.cacheRead + cw * pr.cacheWrite) / 1e6 : null;
    const done: StanceResult = { read, items, at: new Date().toISOString(), model: MODEL, usage: { input: u.input_tokens + cr + cw, output: u.output_tokens, usd } };
    store.cache.set(key, done); return Response.json({ ...done, cached: false });
  } catch (e) {
    if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 });
    const message = upstreamMessage(e, safeMessage);
    return Response.json({ error: "upstream", message }, { status: 502 });
  } finally { store.running.delete(key); }
}
