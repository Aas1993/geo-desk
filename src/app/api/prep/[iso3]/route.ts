import { priceOf } from "@/lib/dossier/cost";
import { llmClient, resolveModel, upstreamMessage } from "@/lib/llm";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { countryFacts, renderFacts } from "@/lib/ask/facts";
import { PREP_SCHEMA, PREP_SYSTEM, prepMessage, type Prep } from "@/lib/ask/prep";
import { INSTRUMENT_KEYS } from "@/lib/statecraft";

export const maxDuration = 120;
// Same guardrails as the other AI features: click-started, one no-tools call, cached, capped per hour, cost shown, unknown citations dropped.
const ECONOMY_MODEL = resolveModel(process.env.ECONOMY_MODEL || "claude-haiku-5-5"); // opt-in per request: about 70 percent cheaper
const MODEL = resolveModel(process.env.PREP_MODEL || process.env.BRIEF_MODEL || "claude-sonnet-5-5"); const MAX_PER_HOUR = Math.max(1, +(process.env.PREP_MAX_PER_HOUR ?? 10) || 10); const TTL = 3 * 3600_000;
type Done = { prep: Prep; facts: { id: string; kind: string; text: string; src: string; url?: string }[]; name: string; at: string; model: string; usage: { usd: number | null } };
const g = globalThis as unknown as { __gdPrep?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } }; const store = (g.__gdPrep ??= { cache: new Map(), running: new Set(), runs: [] });

export async function GET() { const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length; return Response.json({ enabled: process.env.PREP_ENABLED !== "0", model: MODEL, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent) }, { headers: { "Cache-Control": "no-store" } }); }

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  if (process.env.PREP_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean; economy?: boolean }; const ar = body.lang === "ar"; const eco = body.economy === true; const model = eco ? ECONOMY_MODEL : MODEL; const key = `${iso3}:${ar ? "ar" : "en"}${eco ? ":eco" : ""}`;
  const hit = store.cache.get(key); if (hit && !body.refresh && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running.has(key)) return Response.json({ error: "busy", message: "A prep pack for this country is already being written." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000); if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new prep packs per hour reached (PREP_MAX_PER_HOUR). Cached packs are still free.` }, { status: 429 });
  const slot = Date.now(); store.runs.push(slot); store.running.add(key); // reserved before any await so parallel requests cannot all pass the cap
  const refund = () => { const rs = store.runs as number[]; const i = rs.indexOf(slot); if (i >= 0) rs.splice(i, 1); };
  try {
    const c = await countryFacts(iso3); if (!c) { refund(); return Response.json({ error: "not_found" }, { status: 404 }); } if (c.facts.length < 6) { refund(); return Response.json({ error: "thin", message: "Not enough data on this country yet." }, { status: 422 }); }
    const msg = await llmClient().messages.create({ model, max_tokens: 7000, system: [{ type: "text", text: PREP_SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: prepMessage({ facts: renderFacts(c.facts, c.gaps), country: c.name, arabic: ar }) }], output_config: { effort: "low", format: { type: "json_schema", schema: PREP_SCHEMA as unknown as Record<string, unknown> } } }, { signal: req.signal });
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") return Response.json({ error: msg.stop_reason, message: msg.stop_reason === "refusal" ? "The model declined to write this pack." : "The pack was cut off. Try again." }, { status: 502 });
    let prep: Prep; try { prep = JSON.parse(msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")) as Prep; } catch { return Response.json({ error: "bad_output", message: "The model returned an unreadable pack. Try again." }, { status: 502 }); }
    const ids = new Set(c.facts.map((f) => f.id)); const clean = <T extends { basis: string[] }>(xs: T[]) => xs.map((x) => ({ ...x, basis: x.basis.filter((b) => ids.has(b)) }));
    prep.questions = (prep.questions ?? []).map((x) => ({ ...x, basis: x.basis.filter((b) => ids.has(b)) })); prep.objectives = clean(prep.objectives); prep.talkingPoints = clean(prep.talkingPoints); prep.sensitivities = clean(prep.sensitivities); prep.openItems = clean(prep.openItems); prep.scorecard = clean(prep.scorecard ?? []); prep.tripwires = clean(prep.tripwires ?? []);
    const tg = <T extends { basis: string[]; tags?: string[] }>(xs: T[]) => xs.map((x) => ({ ...x, basis: x.basis.filter((b) => ids.has(b)), tags: (x.tags ?? []).filter((t) => (INSTRUMENT_KEYS as readonly string[]).includes(t)).slice(0, 3) })); prep.play = tg(prep.play ?? []); prep.trades = tg(prep.trades ?? []);
    const u = msg.usage, pr = priceOf(model), cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0; const used = new Set([...prep.objectives, ...prep.talkingPoints, ...prep.sensitivities, ...prep.openItems, ...prep.questions, ...prep.scorecard, ...prep.play, ...prep.trades, ...prep.tripwires].flatMap((x) => x.basis));
    const done: Done = { prep, facts: c.facts.filter((f) => used.has(f.id)).map(({ id, kind, text, src, url }) => ({ id, kind, text, src, url })), name: c.name, at: new Date().toISOString(), model, usage: { usd: pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + cr * pr.cacheRead + cw * pr.cacheWrite) / 1e6 : null } };
    store.cache.set(key, done); if (store.cache.size > 100) store.cache.delete(store.cache.keys().next().value as string); return Response.json({ ...done, cached: false });
  } catch (e) {
    if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 });
    return Response.json({ error: "upstream", message: upstreamMessage(e, safeMessage) }, { status: 502 });
  } finally { store.running.delete(key); }
}
