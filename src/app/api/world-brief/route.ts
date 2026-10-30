import { priceOf } from "@/lib/dossier/cost";
import { llmClient, resolveModel, upstreamMessage } from "@/lib/llm";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { WORLD_SYSTEM } from "@/lib/ask/prompt";
import { renderFacts, worldFacts } from "@/lib/ask/facts";

export const maxDuration = 90;
const MODEL = resolveModel(process.env.BRIEF_MODEL || "claude-sonnet-5-5"); const MAX_PER_HOUR = Math.max(1, +(process.env.WORLD_BRIEF_MAX_PER_HOUR ?? 6) || 6); const TTL = 2 * 3600_000;
type Done = { brief: string; facts: { id: string; text: string; src: string; url?: string }[]; at: string; model: string; usage: { usd: number | null } };
const g = globalThis as unknown as { __gdWorld?: { cache: Map<string, Done>; running: boolean; runs: number[] } }; const store = (g.__gdWorld ??= { cache: new Map(), running: false, runs: [] });

export async function POST(req: Request) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean }; const ar = body.lang === "ar"; const key = ar ? "ar" : "en";
  const hit = store.cache.get(key); if (hit && !body.refresh && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running) return Response.json({ error: "busy", message: "A world brief is already being written." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000); if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new world briefs per hour reached. The cached one is still free.` }, { status: 429 });
  store.running = true;
  try {
    const { facts } = await worldFacts(); if (facts.length < 6) return Response.json({ error: "thin", message: "Not enough current data yet." }, { status: 422 }); store.runs.push(Date.now());
    const msg = await llmClient().messages.create({ model: MODEL, max_tokens: 1200, system: [{ type: "text", text: WORLD_SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: `<facts>\n${renderFacts(facts)}\n</facts>\n\nWrite the world brief. Language: ${ar ? "Arabic (Modern Standard); keep fact ids like F3 in Latin characters" : "English"}.` }], output_config: { effort: "low" } }, { signal: req.signal });
    const brief = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim(); if (!brief) return Response.json({ error: "bad_output", message: "No brief came back. Try again." }, { status: 502 });
    const u = msg.usage, pr = priceOf(MODEL), cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0; const cited = new Set([...brief.matchAll(/F\d+/g)].map((m) => m[0]));
    const done: Done = { brief, facts: facts.filter((f) => cited.has(f.id)).map(({ id, text, src, url }) => ({ id, text, src, url })), at: new Date().toISOString(), model: MODEL, usage: { usd: pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + cr * pr.cacheRead + cw * pr.cacheWrite) / 1e6 : null } };
    store.cache.set(key, done); return Response.json({ ...done, cached: false });
  } catch (e) { if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 }); return Response.json({ error: "upstream", message: upstreamMessage(e, safeMessage) }, { status: 502 }); }
  finally { store.running = false; }
}
