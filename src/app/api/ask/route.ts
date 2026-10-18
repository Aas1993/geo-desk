import { readFile } from "node:fs/promises";
import { rejectCrossSite } from "@/lib/guard";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { ASK_SYSTEM, askMessage } from "@/lib/ask/prompt";
import { countryFacts, renderFacts, worldFacts } from "@/lib/ask/facts";

export const maxDuration = 120;
// Same guardrails as the briefs: a click starts it, one cheap no-tools call, cached, capped per hour, cost shown.
const MODEL = process.env.ASK_MODEL || process.env.BRIEF_MODEL || "claude-sonnet-5-5"; const MAX_PER_HOUR = Math.max(1, +(process.env.ASK_MAX_PER_HOUR ?? 30) || 30); const TTL = 3600_000;
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = { "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 }, "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-haiku-5-5": { in: 0.5, out: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } };
type Done = { answer: string; scope: string; facts: { id: string; kind: string; text: string; src: string; url?: string }[]; at: string; model: string; usage: { input: number; output: number; usd: number | null } };
const g = globalThis as unknown as { __gdAsk?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } }; const store = (g.__gdAsk ??= { cache: new Map(), running: new Set(), runs: [] });

export async function GET() { const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length; return Response.json({ enabled: process.env.ASK_ENABLED !== "0", model: MODEL, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent) }, { headers: { "Cache-Control": "no-store" } }); }

export async function POST(req: Request) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  if (process.env.ASK_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { q?: string; iso3?: string }; const q = (body.q ?? "").replace(/\s+/g, " ").trim().slice(0, 400); if (q.length < 6) return Response.json({ error: "bad_request", message: "Ask a fuller question." }, { status: 400 });
  // which country is it about? a country named in the question wins, then the one open in the app, else the world picture
  const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; name: string }[];
  const named = list.filter((c) => c.iso3 !== "ARE" && new RegExp(`\\b${c.name.replace(/,.*$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q)).map((c) => c.iso3);
  const iso3 = named[0] ?? (body.iso3 && /^[A-Z]{3}$/.test(body.iso3.toUpperCase()) ? body.iso3.toUpperCase() : null); const key = `${iso3 ?? "world"}|${q.toLowerCase()}`;
  const hit = store.cache.get(key); if (hit && Date.now() - Date.parse(hit.at) < TTL) return Response.json({ ...hit, cached: true });
  if (store.running.has(key)) return Response.json({ error: "busy", message: "That question is already being answered." }, { status: 409 });
  store.runs = store.runs.filter((t) => Date.now() - t < 3600_000); if (store.runs.length >= MAX_PER_HOUR) return Response.json({ error: "rate_limited", message: `Limit of ${MAX_PER_HOUR} new questions per hour reached (ASK_MAX_PER_HOUR). Repeated questions are cached and free.` }, { status: 429 });
  store.running.add(key);
  try {
    const c = iso3 && iso3 !== "ARE" ? await countryFacts(iso3) : null; const w = !c ? await worldFacts() : null; const facts = c?.facts ?? w!.facts; const scope = c ? c.name : "the world and the UAE";
    if (facts.length < 3) return Response.json({ error: "thin", message: "Not enough current data to answer. Try again shortly." }, { status: 422 });
    store.runs.push(Date.now()); const client = new Anthropic();
    const msg = await client.messages.create({ model: MODEL, max_tokens: 1500, system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: askMessage({ facts: renderFacts(facts, c?.gaps), question: q, scope }) }], output_config: { effort: "low" } }, { signal: req.signal });
    if (msg.stop_reason === "refusal") return Response.json({ error: "refusal", message: "The model declined to answer this question." }, { status: 502 });
    const answer = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim(); if (!answer) return Response.json({ error: "bad_output", message: "No answer came back. Try again." }, { status: 502 });
    const u = msg.usage, pr = PRICE[MODEL], cr = u.cache_read_input_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0; const usd = pr ? (u.input_tokens * pr.in + u.output_tokens * pr.out + cr * pr.cacheRead + cw * pr.cacheWrite) / 1e6 : null;
    const cited = new Set([...answer.matchAll(/F\d+/g)].map((m) => m[0]));
    const done: Done = { answer, scope, facts: facts.filter((f) => cited.has(f.id)).map(({ id, kind, text, src, url }) => ({ id, kind, text, src, url })), at: new Date().toISOString(), model: MODEL, usage: { input: u.input_tokens + cr + cw, output: u.output_tokens, usd } };
    store.cache.set(key, done); return Response.json({ ...done, cached: false });
  } catch (e) {
    if (req.signal.aborted) return Response.json({ error: "aborted" }, { status: 499 });
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    return Response.json({ error: "upstream", message: status === 401 ? "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`." : status === 400 && /credit/i.test(String((e as Error).message)) ? "Your Anthropic credit balance is too low." : e instanceof Error ? e.message : "error" }, { status: 502 });
  } finally { store.running.delete(key); }
}
