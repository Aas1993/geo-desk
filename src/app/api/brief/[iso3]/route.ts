import Anthropic from "@anthropic-ai/sdk";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { countryFacts, renderFacts } from "@/lib/ask/facts";
import { SCHEMA, SYSTEM, userMessage } from "@/lib/brief/prompt";
import { INSTRUMENT_KEYS } from "@/lib/statecraft";

export const maxDuration = 120;
// Deliberately cheaper than the stock research note: no web tools, low effort, short output, cached for hours.
const MODEL = process.env.BRIEF_MODEL || "claude-sonnet-5-5";
const MAX_PER_HOUR = Math.max(1, +(process.env.BRIEF_MAX_PER_HOUR ?? 20) || 20);
const TTL = 3 * 3600_000;
// $ per million tokens (Anthropic price list, cached 2026-10-06). Unknown models report no dollar figure.
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = { "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 }, "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-haiku-5-5": { in: 0.5, out: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } };

type Brief = { headline: string; confidence: "low" | "medium" | "high"; sections: { key: string; bullets: { text: string; basis: string[]; tags?: string[] }[] }[] };
type Done = { brief: Brief; facts: { id: string; kind: string; text: string; src: string; url?: string }[]; gaps: string[]; at: string; model: string; usage: { input: number; output: number; usd: number | null } };
const g = globalThis as unknown as { __gdBrief?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } };
const store = (g.__gdBrief ??= { cache: new Map(), running: new Set(), runs: [] });

export async function GET() {
  // Status probe: lets the UI show the model and the cost guardrails before anything is spent.
  const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length;
  return Response.json({ enabled: process.env.BRIEF_ENABLED !== "0", model: MODEL, ttlHours: TTL / 3600_000, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  if (process.env.BRIEF_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3)) return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean }; const arabic = body.lang === "ar"; const key = `${iso3}:${arabic ? "ar" : "en"}`;
  const hit = store.cache.get(key);
  if (hit && !body.refresh && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running.has(key)) return Response.json({ error: "busy", message: "A brief for this country is already being written." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
  if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new briefs per hour reached (BRIEF_MAX_PER_HOUR). Cached briefs are still free.` }, { status: 429 });
  const slot = Date.now(); store.runs.push(slot); store.running.add(key); // reserved before any await so parallel requests cannot all pass the cap
  const refund = () => { const rs = store.runs as number[]; const i = rs.indexOf(slot); if (i >= 0) rs.splice(i, 1); };
  try {
    const gathered = await countryFacts(iso3); if (!gathered) { refund(); return Response.json({ error: "not_found" }, { status: 404 }); }
    const client = new Anthropic(); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 5000, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), arabic }) }],
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
    }, { signal: req.signal });
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") return Response.json({ error: msg.stop_reason, message: msg.stop_reason === "refusal" ? "The model declined to write this brief." : "The brief was cut off. Try again." }, { status: 502 });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join(""); let brief: Brief;
    try { brief = JSON.parse(text) as Brief; } catch { return Response.json({ error: "bad_output", message: "The model returned an unreadable brief. Try again." }, { status: 502 }); }
    const ids = new Set(gathered.facts.map((f) => f.id)); // drop citations to facts that do not exist
    for (const s of brief.sections) for (const b of s.bullets) { b.basis = b.basis.filter((x) => ids.has(x)); b.tags = (b.tags ?? []).filter((t) => (INSTRUMENT_KEYS as readonly string[]).includes(t)).slice(0, 3); }
    const u = msg.usage; const pr = PRICE[MODEL]; const inTok = u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    const usd = pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + (u.cache_read_input_tokens ?? 0) * pr.cacheRead + (u.cache_creation_input_tokens ?? 0) * pr.cacheWrite) / 1e6 : null;
    const done: Done = { brief, facts: gathered.facts.map(({ id, kind, text, src, url }) => ({ id, kind, text, src, url })), gaps: gathered.gaps, at: new Date().toISOString(), model: MODEL, usage: { input: inTok, output: u.output_tokens, usd } };
    store.cache.set(key, done); if (store.cache.size > 100) store.cache.delete(store.cache.keys().next().value as string);
    return Response.json({ ...done, cached: false });
  } catch (e) {
    if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 });
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    const message = status === 401 ? "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`." : status === 400 && /credit/i.test(String((e as Error).message)) ? "Your Anthropic credit balance is too low." : safeMessage(e);
    return Response.json({ error: "upstream", message }, { status: 502 });
  } finally { store.running.delete(key); }
}
