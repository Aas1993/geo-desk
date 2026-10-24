import Anthropic from "@anthropic-ai/sdk";
import { type Tile } from "@/lib/dossier/facts";
import { BUDGET } from "@/lib/dossier/options";
import { resolveProduct } from "@/lib/dossier/products";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { PRICE, maxRunUsd, outputRoom, runUsd } from "@/lib/dossier/cost";

export const maxDuration = 800; // a comprehensive briefing researches and writes for several minutes
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5"; // Sonnet by default: about half the price of Opus per token, which is what keeps a run under the dollar ceiling
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as (typeof EFFORTS)[number]) : null; // otherwise: low for short runs (less thinking, fewer tokens), medium for long ones
const effortFor = (long: boolean): (typeof EFFORTS)[number] => ENV_EFFORT ?? (long ? "medium" : "low");
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4);
const TTL = 6 * 3600_000;
const MAX_CONCURRENT = 2; // runs in flight at once, whatever their options
const MAX_RUN_USD = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // a run never spends more than this: the output room shrinks as money is spent, and a stream is cut off the moment the running total passes it
const MAX_TURNS = 4;
const SEARCH_SLACK = 4; // a margin above the budget the model is told: touching the tool limit ends the whole code step
const BLOCKED = ["adx.ae", "qe.com.qa"]; // ADX's terms prohibit automated retrieval

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
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
        const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
        const bud = rp.budget; const client = new Anthropic(); // credentials: ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile
        // the budget is for the whole run: each continuation after a pause gets only what is left, and a tool with nothing left is withdrawn
        const toolsLeft = () => [
          ...(bud.searches - u.searches > 0 ? [{ type: "web_search_20260209", name: "web_search", max_uses: bud.searches - u.searches + SEARCH_SLACK, blocked_domains: BLOCKED }] : []),
          ...(bud.fetches - u.fetches > 0 ? [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: bud.fetches - u.fetches, blocked_domains: BLOCKED, max_content_tokens: bud.fetchTokens }] : []),
        ] as unknown as Anthropic.Beta.BetaToolUnion[];
        const research = { failed: 0 }; let apiSearches = 0; let containerId: string | undefined; // the code container of the search tool: a resumed turn must reuse it, or it starts afresh and replays (and pays for) the earlier searches
        const ran: string[] = []; // queries already run, told to the model on every continuation because a resumed turn tends to replay its first search
        // the note goes after the cached facts block, so the prompt-cache prefix (tools, system, facts) stays valid on every continuation
        const withNote = (ms: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] => (ran.length && Array.isArray(ms[0]?.content) ? [{ ...ms[0], content: [...(ms[0].content as Anthropic.Beta.BetaContentBlockParam[]), { type: "text", text: `Searches already run in this task (their results are in the conversation below; never run them again: search for something new or go on to write): ${ran.map((q) => `"${q}"`).join("; ")}.` }] }, ...ms.slice(1)] : ms);
         const cost = () => runUsd(u, MODEL);
        const firstText = rp.message({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name });
        let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: [{ type: "text", text: firstText, cache_control: { type: "ephemeral" } }] }]; // cached, so the continuation turns read the facts at the cache price
        const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null;
        const addSource = (url: string, title: string, kind: Source["kind"]) => {
          if (!/^https?:\/\//i.test(url)) return; const prev = seen.get(url);
          if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; }
          const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
        };
        const long = rp.long; let costStopped = false;
        for (let turn = 0; turn < MAX_TURNS && !costStopped; turn++) {
          // output room shrinks as money is spent, so one turn can never plan to write past the ceiling
          const maxTok = Math.max(1500, Math.min(bud.maxTokens, outputRoom(cost(), MAX_RUN_USD, MODEL)));
          const tac = new AbortController(); ac.signal.addEventListener("abort", () => tac.abort(), { once: true });
          const s = client.beta.messages.stream({
            model: MODEL, max_tokens: maxTok, system: [{ type: "text", text: rp.system, cache_control: { type: "ephemeral" } }], messages: withNote(messages), tools: toolsLeft(), ...(containerId ? { container: containerId } : {}),
            output_config: { effort: effortFor(long) },
          }, { signal: tac.signal });
          const pending = new Map<number, { name: string; json: string; start: Record<string, unknown> }>();
          const turnStart = report.length; const live = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }; // this turn's tokens so far, read from the stream, so the ceiling is enforced while it runs
          const liveUsd = () => runUsd({ input: u.input + live.input, output: u.output + live.output, cacheRead: u.cacheRead + live.cacheRead, cacheWrite: u.cacheWrite + live.cacheWrite, searches: u.searches }, MODEL);
          try {
            for await (const ev of s) {
              if (ev.type === "message_start") { const mu = ev.message.usage; live.input = mu.input_tokens ?? 0; live.cacheRead = mu.cache_read_input_tokens ?? 0; live.cacheWrite = mu.cache_creation_input_tokens ?? 0; }
              else if (ev.type === "message_delta") { live.output = ev.usage.output_tokens ?? live.output; }
              else if (ev.type === "content_block_start") {
                const b = ev.content_block as unknown as { type: string; name?: string; content?: unknown; input?: Record<string, unknown> };
                if (b.type === "server_tool_use") pending.set(ev.index, { name: b.name ?? "tool", json: "", start: b.input ?? {} });
                else if (b.type === "web_search_tool_result") { if (Array.isArray(b.content)) for (const r of b.content as { url?: string; title?: string }[]) addSource(r.url ?? "", r.title ?? "", "search"); else send({ type: "status", text: "A web search returned an error; continuing with other sources." }); }
                else if (b.type === "web_fetch_tool_result") { const c = b.content as { type?: string; url?: string; error_code?: string; content?: { title?: string } } | undefined; if (c?.type === "web_fetch_result" && c.url) addSource(c.url, c.content?.title ?? "", "fetch"); else send({ type: "status", text: `A page could not be fetched (${c?.error_code ?? "error"}); continuing.` }); }
                else if (/_tool_result$/.test(b.type)) { const c = (b.content ?? {}) as { error_code?: string; type?: string; return_code?: number; stderr?: string }; const last = (c.stderr ?? "").trim().split("\n").pop()?.slice(0, 160); const code = !Array.isArray(c) ? c.error_code ?? (/error/.test(c.type ?? "") ? c.type : undefined) ?? (c.return_code ? last || "code step failed" : undefined) : undefined; if (code) { console.warn(`[dossier] ${b.type} error: ${code}`); research.failed++; send({ type: "status", text: `A research step failed ("${code}"); continuing with what is available.` }); } } // searches run inside the code tool, so their failures only show up here
              } else if (ev.type === "content_block_delta") {
                if (ev.delta.type === "text_delta") { report += ev.delta.text; send({ type: "text", delta: ev.delta.text }); live.output = Math.max(live.output, Math.round((report.length - turnStart) / 2.8)); } // text tokens so far, a little over-counted on purpose; the exact figure arrives with message_delta
                else if (ev.delta.type === "input_json_delta") { const p = pending.get(ev.index); if (p) p.json += ev.delta.partial_json; }
              } else if (ev.type === "content_block_stop") {
                const p = pending.get(ev.index);
                if (p) { pending.delete(ev.index); let input: Record<string, unknown> = p.start; try { const d = JSON.parse(p.json || "{}"); if (Object.keys(d).length) input = d; } catch {}
                  if (p.name === "web_search") { u.searches++; const q = String(input.query ?? ""); if (q && !ran.includes(q)) ran.push(q.slice(0, 160)); send({ type: "tool", name: "search", detail: q }); }
                  else if (p.name === "web_fetch") { u.fetches++; send({ type: "tool", name: "fetch", detail: String(input.url ?? "") }); }
                  else send({ type: "tool", name: "analyse", detail: "" }); }
              }
              if (!costStopped && liveUsd() > MAX_RUN_USD) { costStopped = true; tac.abort(); }
            }
          } catch (e) { if (!costStopped) throw e; }
          if (costStopped) { u.input += live.input; u.output += live.output; u.cacheRead += live.cacheRead; u.cacheWrite += live.cacheWrite; stop = "cost"; send({ type: "status", text: `Stopped at the per-run cost limit of $${MAX_RUN_USD.toFixed(2)}.` }); break; }
          const m = await s.finalMessage(); stop = m.stop_reason; containerId = (m as unknown as { container?: { id?: string } | null }).container?.id ?? containerId;
          apiSearches += (m.usage as { server_tool_use?: { web_search_requests?: number } }).server_tool_use?.web_search_requests ?? 0; u.input += m.usage.input_tokens ?? 0; u.output += m.usage.output_tokens ?? 0; u.cacheRead += m.usage.cache_read_input_tokens ?? 0; u.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
          if (m.stop_reason === "pause_turn" && cost() > MAX_RUN_USD * 0.9) { send({ type: "status", text: "Stopped researching: close to the per-run cost limit." }); break; }
          if (m.stop_reason === "pause_turn") { messages = [...messages, { role: "assistant", content: m.content as Anthropic.Beta.BetaContentBlockParam[] }]; send({ type: "status", text: "Still researching…" }); continue; }
          break;
        }
        console.warn(`[dossier] searches counted from the stream: ${u.searches}; billed by the API: ${apiSearches}; failed research steps: ${research.failed}`);
        if (costStopped) report += `\n\n> Stopped at the per-run cost limit of $${MAX_RUN_USD.toFixed(2)}: this briefing is incomplete. Choose a shorter length or fewer topics for a complete one.\n`;
        if (stop === "refusal") { send({ type: "error", error: "refusal", message: "The model declined to write this briefing." }); return finish(); }
        u.usd = PRICE[MODEL] ? cost() : null;
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
