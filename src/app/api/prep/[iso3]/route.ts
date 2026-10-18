import Anthropic from "@anthropic-ai/sdk";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { countryFacts, renderFacts } from "@/lib/ask/facts";
import { PREP_SCHEMA, PREP_SYSTEM, prepMessage, type Prep } from "@/lib/ask/prep";

export const maxDuration = 120;
// Same guardrails as the other AI features: click-started, one no-tools call, cached, capped per hour, cost shown, unknown citations dropped.
const MODEL = process.env.PREP_MODEL || process.env.BRIEF_MODEL || "claude-sonnet-5-5"; const MAX_PER_HOUR = Math.max(1, +(process.env.PREP_MAX_PER_HOUR ?? 10) || 10); const TTL = 3 * 3600_000;
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = { "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 }, "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-haiku-5-5": { in: 0.5, out: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } };
type Done = { prep: Prep; facts: { id: string; kind: string; text: string; src: string; url?: string }[]; name: string; at: string; model: string; usage: { usd: number | null } };
const g = globalThis as unknown as { __gdPrep?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } }; const store = (g.__gdPrep ??= { cache: new Map(), running: new Set(), runs: [] });

export async function GET() { const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length; return Response.json({ enabled: process.env.PREP_ENABLED !== "0", model: MODEL, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent) }, { headers: { "Cache-Control": "no-store" } }); }

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  if (process.env.PREP_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean }; const ar = body.lang === "ar"; const key = `${iso3}:${ar ? "ar" : "en"}`;
  const hit = store.cache.get(key); if (hit && !body.refresh && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running.has(key)) return Response.json({ error: "busy", message: "A prep pack for this country is already being written." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000); if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new prep packs per hour reached (PREP_MAX_PER_HOUR). Cached packs are still free.` }, { status: 429 });
  const slot = Date.now(); store.runs.push(slot); store.running.add(key); // reserved before any await so parallel requests cannot all pass the cap
  const refund = () => { const rs = store.runs as number[]; const i = rs.indexOf(slot); if (i >= 0) rs.splice(i, 1); };
  try {
    const c = await countryFacts(iso3); if (!c) { refund(); return Response.json({ error: "not_found" }, { status: 404 }); } if (c.facts.length < 6) { refund(); return Response.json({ error: "thin", message: "Not enough data on this country yet." }, { status: 422 }); }
    const msg = await new Anthropic().messages.create({ model: MODEL, max_tokens: 4500, system: [{ type: "text", text: PREP_SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: prepMessage({ facts: renderFacts(c.facts, c.gaps), country: c.name, arabic: ar }) }], output_config: { effort: "low", format: { type: "json_schema", schema: PREP_SCHEMA as unknown as Record<string, unknown> } } }, { signal: req.signal });
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") return Response.json({ error: msg.stop_reason, message: msg.stop_reason === "refusal" ? "The model declined to write this pack." : "The pack was cut off. Try again." }, { status: 502 });
    let prep: Prep; try { prep = JSON.parse(msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")) as Prep; } catch { return Response.json({ error: "bad_output", message: "The model returned an unreadable pack. Try again." }, { status: 502 }); }
    const ids = new Set(c.facts.map((f) => f.id)); const clean = <T extends { basis: string[] }>(xs: T[]) => xs.map((x) => ({ ...x, basis: x.basis.filter((b) => ids.has(b)) }));
    prep.questions = (prep.questions ?? []).map((x) => ({ ...x, basis: x.basis.filter((b) => ids.has(b)) })); prep.objectives = clean(prep.objectives); prep.talkingPoints = clean(prep.talkingPoints); prep.sensitivities = clean(prep.sensitivities); prep.openItems = clean(prep.openItems);
    const u = msg.usage, pr = PRICE[MODEL], cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0; const used = new Set([...prep.objectives, ...prep.talkingPoints, ...prep.sensitivities, ...prep.openItems, ...prep.questions].flatMap((x) => x.basis));
    const done: Done = { prep, facts: c.facts.filter((f) => used.has(f.id)).map(({ id, kind, text, src, url }) => ({ id, kind, text, src, url })), name: c.name, at: new Date().toISOString(), model: MODEL, usage: { usd: pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + cr * pr.cacheRead + cw * pr.cacheWrite) / 1e6 : null } };
    store.cache.set(key, done); if (store.cache.size > 100) store.cache.delete(store.cache.keys().next().value as string); return Response.json({ ...done, cached: false });
  } catch (e) {
    if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 });
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    return Response.json({ error: "upstream", message: status === 401 ? "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`." : status === 400 && /credit/i.test(String((e as Error).message)) ? "Your Anthropic credit balance is too low." : safeMessage(e) }, { status: 502 });
  } finally { store.running.delete(key); }
}
