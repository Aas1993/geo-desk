import Anthropic from "@anthropic-ai/sdk";
import { dossierFacts, type Tile } from "@/lib/dossier/facts";
import { BUDGET, cleanOptions, optionsKey } from "@/lib/dossier/options";
import { SYSTEM, userMessage } from "@/lib/dossier/prompt";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";

export const maxDuration = 800; // a comprehensive briefing researches and writes for several minutes
const MODEL = process.env.DOSSIER_MODEL || "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as (typeof EFFORTS)[number]) : "medium";
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4);
const TTL = 6 * 3600_000;
// $ per million tokens (Anthropic price list, cached 2026-10-06) and about $0.01 per web search; the figure shown is an estimate. Unknown models report no dollar figure.
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = { "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 }, "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 } };
const SEARCH_USD = 0.01;
const MAX_CONCURRENT = 2; // runs in flight at once, whatever their options
const MAX_RUN_USD = Math.max(1, +(process.env.DOSSIER_MAX_RUN_USD ?? 6) || 6); // a run stops researching once its estimated cost passes this
const MAX_TURNS = 4;
const BLOCKED = ["adx.ae"]; // ADX's terms prohibit automated retrieval

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
type Done = { report: string; sources: Source[]; tiles: Tile[]; usage: Usage; at: string; model: string; options: unknown; name: string };
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, Done>; running: Set<string>; runs: number[] } };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set(), runs: [] });
const prune = () => { const now = Date.now(); for (const [k, v] of store.cache) if (now - Date.parse(v.at) > TTL) store.cache.delete(k); while (store.cache.size > 40) store.cache.delete(store.cache.keys().next().value as string); };

export async function GET() {
  const recent = store.runs.filter((t) => Date.now() - t < 3600_000).length;
  return Response.json({ enabled: process.env.DOSSIER_ENABLED !== "0", model: MODEL, effort: EFFORT, remainingThisHour: Math.max(0, MAX_PER_HOUR - recent), budget: BUDGET }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const options = cleanOptions(body); const refresh = body.refresh === true; const key = optionsKey(iso3, options);
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
        const gathered = await dossierFacts(iso3); if (!gathered) { refund(); send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        if (gathered.facts.length < 6) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this country yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: gathered.tiles, gaps: gathered.gaps });
        const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
        const bud = BUDGET[options.depth]; const client = new Anthropic(); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
        // the budget is for the whole run: each continuation after a pause gets only what is left, and a tool with nothing left is withdrawn
        const toolsLeft = () => [
          ...(bud.searches - u.searches > 0 ? [{ type: "web_search_20260209", name: "web_search", max_uses: bud.searches - u.searches, blocked_domains: BLOCKED }] : []),
          ...(bud.fetches - u.fetches > 0 ? [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: bud.fetches - u.fetches, blocked_domains: BLOCKED, max_content_tokens: bud.fetchTokens }] : []),
        ] as unknown as Anthropic.Beta.BetaToolUnion[];
        const cost = () => { const pr = PRICE[MODEL] ?? PRICE["claude-opus-5-5"]; return (u.input * pr.in + u.output * pr.out + u.cacheRead * pr.cacheRead + u.cacheWrite * pr.cacheWrite) / 1e6 + u.searches * SEARCH_USD; };
        let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userMessage({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options }) }];
        const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null;
        const addSource = (url: string, title: string, kind: Source["kind"]) => {
          if (!/^https?:\/\//i.test(url)) return; const prev = seen.get(url);
          if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; }
          const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
        };
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const s = client.beta.messages.stream({
            model: MODEL, max_tokens: bud.maxTokens, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], messages, tools: toolsLeft(),
            output_config: { effort: EFFORT }, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
          }, { signal: ac.signal });
          const pending = new Map<number, { name: string; json: string; start: Record<string, unknown> }>();
          for await (const ev of s) {
            if (ev.type === "content_block_start") {
              const b = ev.content_block as unknown as { type: string; name?: string; content?: unknown; input?: Record<string, unknown> };
              if (b.type === "server_tool_use") pending.set(ev.index, { name: b.name ?? "tool", json: "", start: b.input ?? {} });
              else if (b.type === "web_search_tool_result") { if (Array.isArray(b.content)) for (const r of b.content as { url?: string; title?: string }[]) addSource(r.url ?? "", r.title ?? "", "search"); else send({ type: "status", text: "A web search returned an error; continuing with other sources." }); }
              else if (b.type === "web_fetch_tool_result") { const c = b.content as { type?: string; url?: string; error_code?: string; content?: { title?: string } } | undefined; if (c?.type === "web_fetch_result" && c.url) addSource(c.url, c.content?.title ?? "", "fetch"); else send({ type: "status", text: `A page could not be fetched (${c?.error_code ?? "error"}); continuing.` }); }
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
          if (m.stop_reason === "pause_turn" && cost() > MAX_RUN_USD) { send({ type: "status", text: `Stopped researching: the estimated cost passed the per-run limit of $${MAX_RUN_USD}.` }); break; }
          if (m.stop_reason === "pause_turn") { messages = [...messages, { role: "assistant", content: m.content as Anthropic.Beta.BetaContentBlockParam[] }]; send({ type: "status", text: "Still researching…" }); continue; }
          break;
        }
        if (stop === "refusal") { send({ type: "error", error: "refusal", message: "The model declined to write this briefing." }); return finish(); }
        const pr = PRICE[MODEL]; if (pr) u.usd = (u.input * pr.in + u.output * pr.out + u.cacheRead * pr.cacheRead + u.cacheWrite * pr.cacheWrite) / 1e6 + u.searches * SEARCH_USD;
        const known = new Set(gathered.facts.map((f) => f.id)); const checked = report.replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => (ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`);
        const done: Done = { report: checked, sources, tiles: gathered.tiles, usage: u, at: new Date().toISOString(), model: MODEL, options, name: gathered.name };
        if (report.trim()) { store.cache.set(key, done); prune(); }
        send({ type: "done", cached: false, truncated: stop === "max_tokens", ...done });
      } catch (e) {
        if (ac.signal.aborted) return finish();
        const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message);
        const kind = nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : e instanceof Anthropic.BadRequestError ? "bad_request" : "upstream";
        send({ type: "error", error: kind, message: safeMessage(e) });
      } finally { store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
