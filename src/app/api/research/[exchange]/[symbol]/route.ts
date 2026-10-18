import Anthropic from "@anthropic-ai/sdk";
import { rejectCrossSite } from "@/lib/guard";
import { gather, renderFacts } from "@/lib/research/gather";
import { SYSTEM, userMessage } from "@/lib/research/prompt";
import { findListing } from "@/lib/markets/universe";
import { normaliseNote } from "@/lib/research/normalise";
import { connection } from "next/server";
import { safeMessage } from "@/lib/guard";

export const maxDuration = 300;
const MODEL = process.env.RESEARCH_MODEL || "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const EFFORT = (EFFORTS as readonly string[]).includes(process.env.RESEARCH_EFFORT ?? "") ? (process.env.RESEARCH_EFFORT as (typeof EFFORTS)[number]) : "high";
// $ per million tokens for the default model (Anthropic price list, cached 2026-10-06). Unknown models report no dollar figure.
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = { "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 } };
const MAX_PER_HOUR = Math.max(1, +(process.env.RESEARCH_MAX_PER_HOUR ?? 6) || 6); const MAX_CONCURRENT = 2; const MAX_TURNS = 5;
const MAX_RUN_USD = Math.max(1, +(process.env.RESEARCH_MAX_RUN_USD ?? 8) || 8); // a run stops researching once its estimated cost passes this
const BLOCKED = ["adx.ae"]; // ADX's terms prohibit automated retrieval; Cloudflare blocks it anyway.

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Done = { report: string; sources: Source[]; usage: Usage; at: string; model: string };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };

const g = globalThis as unknown as { __gdResearch?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } };
const store = (g.__gdResearch ??= { cache: new Map(), running: new Set(), runs: [] });
const TTL = 6 * 3600_000;

export async function GET() {
  await connection(); // read the switch and the model at request time, not at build time
  // Cheap status probe for the UI: is the feature enabled, which model, is there a usable credential source?
  return Response.json({ enabled: process.env.RESEARCH_ENABLED !== "0", model: MODEL, webBlocked: BLOCKED, remainingThisHour: Math.max(0, MAX_PER_HOUR - store.runs.filter((t) => Date.now() - t < 3600_000).length) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  if (process.env.RESEARCH_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const { exchange, symbol } = await params; const l = await findListing(exchange, symbol);
  if (!l) return Response.json({ error: "not_found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { lang?: string; refresh?: boolean };
  const arabic = body.lang === "ar"; const key = `${l.exchange}:${l.symbol}:${arabic ? "ar" : "en"}`;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch {} };
      const finish = () => { try { controller.close(); } catch {} };
      const hit = store.cache.get(key);
      const fresh = !!hit && Date.now() - Date.parse(hit.at) < TTL; const young = !!hit && Date.now() - Date.parse(hit.at) < 3600_000; // a refresh cannot force a new paid run while the note is under an hour old
      if (hit && (young || (!body.refresh && fresh))) { send({ type: "done", cached: true, ...hit }); return finish(); }
      if (store.running.has(key)) { send({ type: "error", error: "busy", message: "A note for this stock is already being written. Try again in a minute." }); return finish(); }
      store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
      if (store.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new research notes per hour reached (RESEARCH_MAX_PER_HOUR). Cached notes are still free.` }); return finish(); }
      if (store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other research notes are being written. Try again in a few minutes." }); return finish(); }
      store.runs.push(Date.now()); store.running.add(key); // reserved before any await so parallel requests cannot all pass the cap
      const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
      try {
        send({ type: "status", text: "Collecting verified facts (DFM filings, headlines, market data)…" });
        const facts = await gather(l);
        send({ type: "facts", filings: facts.filings?.total ?? null, headlines: facts.news.length, hasMarketData: !!facts.market, notes: facts.notes });
        const client = new Anthropic(); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
        const tools = [
          { type: "web_search_20260209", name: "web_search", max_uses: 12, blocked_domains: BLOCKED },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10, blocked_domains: BLOCKED, max_content_tokens: 60_000 },
        ] as unknown as Anthropic.Beta.BetaToolUnion[];
        let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userMessage({ facts: renderFacts(facts), asOf: facts.asOf, arabic }) }];
        const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
        const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null;
        const addSource = (url: string, title: string, kind: Source["kind"]) => {
          if (!url) return; const prev = seen.get(url);
          if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; } // a page first found by search, later read
          const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
        };

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const s = client.beta.messages.stream({
            model: MODEL, max_tokens: 32000, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], messages, tools,
            output_config: { effort: EFFORT }, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
          }, { signal: ac.signal });
          const pending = new Map<number, { name: string; json: string; start: Record<string, unknown> }>();
          for await (const ev of s) {
            if (ev.type === "content_block_start") {
              const b = ev.content_block as unknown as { type: string; name?: string; content?: unknown; input?: Record<string, unknown> };
              if (b.type === "server_tool_use") { pending.set(ev.index, { name: b.name ?? "tool", json: "", start: b.input ?? {} }); }
              else if (b.type === "web_search_tool_result") {
                if (Array.isArray(b.content)) for (const r of b.content as { url?: string; title?: string }[]) addSource(r.url ?? "", r.title ?? "", "search");
                else send({ type: "status", text: "A web search returned an error; continuing with other sources." });
              } else if (b.type === "web_fetch_tool_result") {
                const c = b.content as { type?: string; url?: string; error_code?: string; content?: { title?: string } } | undefined;
                if (c?.type === "web_fetch_result" && c.url) addSource(c.url, c.content?.title ?? "", "fetch"); else send({ type: "status", text: `A page could not be fetched (${c?.error_code ?? "error"}); continuing.` });
              }
            } else if (ev.type === "content_block_delta") {
              if (ev.delta.type === "text_delta") { report += ev.delta.text; send({ type: "text", delta: ev.delta.text }); }
              else if (ev.delta.type === "input_json_delta") { const p = pending.get(ev.index); if (p) p.json += ev.delta.partial_json; }
            } else if (ev.type === "content_block_stop") {
              const p = pending.get(ev.index);
              if (p) { pending.delete(ev.index); let input: Record<string, unknown> = p.start; try { const d = JSON.parse(p.json || "{}"); if (Object.keys(d).length) input = d; } catch {}
                if (p.name === "web_search") { u.searches++; send({ type: "tool", name: "search", detail: String(input.query ?? "") }); }
                else if (p.name === "web_fetch") { u.fetches++; send({ type: "tool", name: "fetch", detail: String(input.url ?? "") }); }
                else send({ type: "tool", name: "analyse", detail: "" }); }
            }
          }
          const m = await s.finalMessage(); stop = m.stop_reason;
          u.input += m.usage.input_tokens ?? 0; u.output += m.usage.output_tokens ?? 0; u.cacheRead += m.usage.cache_read_input_tokens ?? 0; u.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
          const spent = PRICE[MODEL] ? (u.input * PRICE[MODEL].in + u.output * PRICE[MODEL].out + u.cacheRead * PRICE[MODEL].cacheRead + u.cacheWrite * PRICE[MODEL].cacheWrite) / 1e6 : 0;
          if (m.stop_reason === "pause_turn" && spent > MAX_RUN_USD) { send({ type: "status", text: `Stopped researching: the estimated cost passed the per-run limit of $${MAX_RUN_USD}.` }); break; }
          if (m.stop_reason === "pause_turn") { messages = [...messages, { role: "assistant", content: m.content as Anthropic.Beta.BetaContentBlockParam[] }]; send({ type: "status", text: "Still researching…" }); continue; }
          break;
        }
        if (stop === "refusal") { send({ type: "error", error: "refusal", message: "The model declined to write this note." }); return finish(); }
        const pr = PRICE[MODEL]; if (pr) u.usd = (u.input * pr.in + u.output * pr.out + u.cacheRead * pr.cacheRead + u.cacheWrite * pr.cacheWrite) / 1e6;
        const done: Done = { report: normaliseNote(report), sources, usage: u, at: new Date().toISOString(), model: MODEL };
        if (report.trim()) store.cache.set(key, done);
        send({ type: "done", cached: false, truncated: stop === "max_tokens", ...done });
      } catch (e) {
        if (ac.signal.aborted) return finish();
        const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message);
        const kind = nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : e instanceof Anthropic.BadRequestError ? "bad_request" : "upstream";
        send({ type: "error", error: kind, message: safeMessage(e) });
      } finally { store.running.delete(key); finish(); }
    },
    cancel() {},
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
