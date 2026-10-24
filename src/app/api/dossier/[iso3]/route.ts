import Anthropic from "@anthropic-ai/sdk";
import { type Tile } from "@/lib/dossier/facts";
import { BUDGET } from "@/lib/dossier/options";
import { resolveProduct } from "@/lib/dossier/products";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Source, type Usage } from "@/lib/dossier/run";

export const maxDuration = 800; // a comprehensive briefing researches and writes for several minutes
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5"; // Sonnet by default: about half the price of Opus per token, which is what keeps a run under the dollar ceiling
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as (typeof EFFORTS)[number]) : null; // otherwise: low for short runs (less thinking, fewer tokens), medium for long ones
const effortFor = (long: boolean): (typeof EFFORTS)[number] => ENV_EFFORT ?? (long ? "medium" : "low");
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4);
const TTL = 6 * 3600_000;
const MAX_CONCURRENT = 2; // runs in flight at once, whatever their options
const MAX_RUN_USD = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // a run never spends more than this: the output room shrinks as money is spent, and a stream is cut off the moment the running total passes it

type Done = { report: string; sources: Source[]; tiles: Tile[]; usage: Usage; at: string; model: string; options: unknown; name: string };
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set(), runs: [] });
const prune = () => { const now = Date.now(); for (const [k, v] of store.cache) if (now - Date.parse(v.at) > TTL) store.cache.delete(k); while (store.cache.size > 40) store.cache.delete(store.cache.keys().next().value as string); };

export async function GET() {
  const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length;
  return Response.json({ enabled: process.env.DOSSIER_ENABLED !== "0", model: MODEL, effort: ENV_EFFORT ?? "low/medium", maxRunUsd: MAX_RUN_USD, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent), budget: BUDGET }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const refresh = body.refresh === true; const rp = resolveProduct(body, iso3); const key = rp.key;
  if (rp.invalid) return Response.json({ error: "bad_request", message: rp.invalid }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch {} };
      const finish = () => { try { controller.close(); } catch {} };
      const hit = store.cache.get(key);
      if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
      if (store.running.has(key)) { send({ type: "error", error: "busy", message: "This briefing is already being written. Try again in a minute." }); return finish(); }
      store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
      if (store.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new detailed briefings per hour reached (DOSSIER_MAX_PER_HOUR). Cached briefings are still free.` }); return finish(); }
      if (store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
      const slot = Date.now(); store.runs.push(slot); store.running.add(key); // the slot is taken before anything is awaited, so parallel requests cannot all pass the cap
      const refund = () => { const rs = store.runs as number[]; const i = rs.indexOf(slot); if (i >= 0) rs.splice(i, 1); };
      const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
      try {
        send({ type: "status", text: "Collecting the UAE-side record (agreements, missions, visits, trade, flights, investment, outlook, headlines)…" });
        const gathered = await rp.gather(iso3); if (!gathered) { refund(); send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        if (gathered.facts.length < 6) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this country yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: gathered.tiles, gaps: gathered.gaps });
        const r = await runModelTask({ client: new Anthropic(), model: MODEL, system: rp.system, firstText: rp.message({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name }), budget: rp.budget, effort: effortFor(rp.long), maxUsd: MAX_RUN_USD, signal: ac.signal, send }); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
        const { sources, usage: u, stop, costStopped } = r; let report = r.report;
        if (costStopped) report += `\n\n> Stopped at the per-run cost limit of $${MAX_RUN_USD.toFixed(2)}: this briefing is incomplete. Choose a shorter length or fewer topics for a complete one.\n`;
        if (stop === "refusal") { send({ type: "error", error: "refusal", message: "The model declined to write this briefing." }); return finish(); }
        const firstHeading = report.search(/^# /m); const clean = firstHeading > 0 ? report.slice(firstHeading) : report; // drop any stray lead-in before the document title
        const known = new Set(gathered.facts.map((f) => f.id)); const checked = clean.replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => (ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`);
        const done: Done = { report: checked, sources, tiles: gathered.tiles, usage: u, at: new Date().toISOString(), model: MODEL, options: rp.options, name: gathered.name };
        if (report.trim()) { store.cache.set(key, done); prune(); }
        send({ type: "done", cached: false, truncated: stop === "max_tokens" || stop === "cost", costStopped, ...done });
      } catch (e) {
        if (ac.signal.aborted) return finish();
        console.error("[dossier] run failed:", e instanceof Error ? e.message : e);
        const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message);
        const kind = nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : e instanceof Anthropic.BadRequestError ? "bad_request" : "upstream";
        send({ type: "error", error: kind, message: safeMessage(e) });
      } finally { store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
