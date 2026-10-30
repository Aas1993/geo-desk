import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { BATCH_FACTOR, outputRoom, priceOf, runUsd } from "./cost";
import { provider } from "../llm";
import { runHfTask } from "./run-hf";
import { inBatchMode, submitBatch } from "./batch";

// The model-run core shared by the dossier route (one analyst, streamed to the browser) and the Falcon council (several analysts, run in parallel and in sequence).
// One run: a cached system prompt, a cached first block of facts, optional role instructions after the cache point, the web-search tool driven by code the model writes, continuation after pauses,
// a hard cost ceiling enforced while the stream runs, and honest accounting of failed research steps.
export type Source = { url: string; title: string; kind: "search" | "fetch" };
export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
export type Budget = { maxTokens: number; searches: number; fetches: number; fetchTokens: number };
export type RunEvent = Record<string, unknown>;
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];
const MAX_TURNS = 4;
const SEARCH_CAP = 8; const FETCH_CAP = 3; // see toolsLeft: constant tool limits keep the cached prefix identical across calls
const SEARCH_SLACK = 4; // a margin above the budget the model is told: touching the tool limit ends the whole code step
const BLOCKED = ["adx.ae", "qe.com.qa"]; // ADX's terms prohibit automated retrieval

export type RunOptions = {
  client: Anthropic; model: string; system: string;
  /** the cached first block (facts and the request): continuation turns and parallel agents read it at the cache price */
  firstText: string;
  /** instructions that differ per agent: placed after the cache point so the cached prefix stays shared */
  roleText?: string;
  budget: Budget; effort: Effort; maxUsd: number; signal: AbortSignal; send: (e: RunEvent) => void;
  /** a label for the logs and the failed-step status */
  label?: string;
  /** money already spent by sibling runs, so a council shares one ceiling */
  spentBefore?: () => number;
  /** told this call's own spend so far (including the turn in flight), so parallel siblings that share one ceiling can count it */
  onSpend?: (usd: number) => void;
  /** what to keep back from the output room for the input and searches still to come (default 0.15): a sibling run that was given a small share passes a smaller one, or its room falls to the 1,500-token floor and its answer is cut off */
  reserveUsd?: number;
};
export type RunResult = { report: string; sources: Source[]; usage: Usage; stop: string | null; costStopped: boolean; failedSteps: number; apiSearches: number };

/** The prefixes (tools, system, shared evidence) that a call has already started to write to the prompt cache: the first caller registers one and releases it when its answer starts. Shared through globalThis because a dev server can load this module twice. */
const WARM = ((globalThis as { __gdWarm?: Map<string, Promise<void>> }).__gdWarm ??= new Map<string, Promise<void>>());
const WARM_WAIT_MS = 60_000; const WARM_KEEP_MS = 4 * 60_000;

export async function runModelTask(o: RunOptions): Promise<RunResult> {
  if (provider() === "hf") return runHfTask(o); // an open model with our own search tools: see run-hf.ts (no batch transport, no cache sharing)
  const hold = { release: () => {} }; // a call that fails before it answers must still let its waiting siblings go
  try { return await runTask(o, hold); } finally { hold.release(); }
}
async function runTask(o: RunOptions, hold: { release: () => void }): Promise<RunResult> {
  const { client, model, signal, send, budget: bud } = o; const tag = o.label ?? "dossier";
  const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
  // the budget is for the whole run: each continuation after a pause gets only what is left, and a tool with nothing left is withdrawn
  const toolsLeft = () => [
    // the tool definitions are part of the prompt-cache prefix: a definition that differs from one call to the next (or from one turn to the next) makes every such call write the whole evidence block to the cache again. The limit is therefore a constant per task, large enough for every budget up to three searches (the budget itself is told to the model and withdrawn here once spent), so calls with different small budgets share one cached prefix
    ...(bud.searches - u.searches > 0 ? [{ type: "web_search_20260209", name: "web_search", max_uses: Math.max(SEARCH_CAP, bud.searches + SEARCH_SLACK), blocked_domains: BLOCKED }] : []),
    ...(bud.fetches - u.fetches > 0 ? [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: Math.max(FETCH_CAP, bud.fetches), blocked_domains: BLOCKED, max_content_tokens: bud.fetchTokens }] : []),
  ] as unknown as Anthropic.Beta.BetaToolUnion[];
  const research = { failed: 0 }; let apiSearches = 0; let containerId: string | undefined; // the code container of the search tool: a resumed turn must reuse it, or it starts afresh and replays (and pays for) the earlier searches
  const ran: string[] = []; // queries already run, told to the model on every continuation because a resumed turn tends to replay its first search
  const first: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text: o.firstText, cache_control: { type: "ephemeral" } }, ...(o.roleText ? [{ type: "text" as const, text: o.roleText }] : [])];
  // the note goes after the cached facts block, so the prompt-cache prefix (tools, system, facts) stays valid on every continuation
  const withNote = (ms: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] => (ran.length && Array.isArray(ms[0]?.content) ? [{ ...ms[0], content: [...(ms[0].content as Anthropic.Beta.BetaContentBlockParam[]), { type: "text", text: `Searches already run in this task (their results are in the conversation below; never run them again: search for something new or go on to write): ${ran.map((q) => `"${q}"`).join("; ")}.` }] }, ...ms.slice(1)] : ms);
  /** In batch mode the cached prefix lives for an hour (the councils of one bundle run for longer than five minutes), so every later call of the bundle reads it at the cache price. */
  const hourMessages = (ms: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] => ms.map((m, i) => (i === 0 && Array.isArray(m.content) ? { ...m, content: (m.content as Anthropic.Beta.BetaContentBlockParam[]).map((b) => ((b as { cache_control?: unknown }).cache_control ? ({ ...b, cache_control: { type: "ephemeral", ttl: "1h" } } as Anthropic.Beta.BetaContentBlockParam) : b)) } : m));
  const batch = inBatchMode(); const cost = () => runUsd(u, model, batch ? BATCH_FACTOR : 1); const others = () => o.spentBefore?.() ?? 0;
  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: first }];
  const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null; let costStopped = false;
  const addSource = (url: string, title: string, kind: Source["kind"]) => {
    if (!/^https?:\/\//i.test(url)) return; const prev = seen.get(url);
    if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; }
    const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
  };
  for (let turn = 0; turn < MAX_TURNS && !costStopped; turn++) {
    // output room shrinks as money is spent, so one turn can never plan to write past the ceiling
    const maxTok = Math.max(1500, Math.min(bud.maxTokens, outputRoom(cost() + others(), o.maxUsd, model, o.reserveUsd)));
    if (batch) {
      // the batch transport: the same request, sent through the Message Batches API at half the token price, answered whole
      console.warn(`[${tag}] batch request submitted`);
      const bm = await submitBatch(client, { model, max_tokens: maxTok, system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral", ttl: "1h" } }], messages: hourMessages(withNote(messages)), tools: toolsLeft(), ...(containerId ? { container: containerId } : {}), output_config: { effort: o.effort } } as never, signal, (w) => send({ type: "status", text: w })) as unknown as { content: Record<string, unknown>[]; stop_reason: string | null; usage: Record<string, unknown>; container?: { id?: string } | null };
      for (const b of bm.content) {
        const bt = String(b.type);
        if (bt === "text") { const x = String(b.text ?? ""); report += x; send({ type: "text", delta: x }); }
        else if (bt === "server_tool_use") { const inp = (b.input ?? {}) as Record<string, unknown>; if (b.name === "web_search") { u.searches++; const q = String(inp.query ?? ""); if (q && !ran.includes(q)) ran.push(q.slice(0, 160)); send({ type: "tool", name: "search", detail: q }); } else if (b.name === "web_fetch") { u.fetches++; send({ type: "tool", name: "fetch", detail: String(inp.url ?? "") }); } else send({ type: "tool", name: "analyse", detail: "" }); }
        else if (bt === "web_search_tool_result") { if (Array.isArray(b.content)) for (const r of b.content as { url?: string; title?: string }[]) addSource(r.url ?? "", r.title ?? "", "search"); else { research.failed++; send({ type: "status", text: "A web search returned an error; continuing with other sources." }); } }
        else if (bt === "web_fetch_tool_result") { const c = b.content as { type?: string; url?: string; content?: { title?: string } } | undefined; if (c?.type === "web_fetch_result" && c.url) addSource(c.url, c.content?.title ?? "", "fetch"); else research.failed++; }
        else if (/_tool_result$/.test(bt)) { const c = (b.content ?? {}) as { error_code?: string; type?: string; return_code?: number }; if (!Array.isArray(c) && (c.error_code || /error/.test(c.type ?? "") || c.return_code)) research.failed++; }
      }
      stop = bm.stop_reason; containerId = bm.container?.id ?? containerId; apiSearches += ((bm.usage as { server_tool_use?: { web_search_requests?: number } }).server_tool_use?.web_search_requests ?? 0);
      u.input += Number(bm.usage.input_tokens ?? 0); u.output += Number(bm.usage.output_tokens ?? 0); u.cacheRead += Number(bm.usage.cache_read_input_tokens ?? 0); { const w = Number(bm.usage.cache_creation_input_tokens ?? 0); const w1 = Number((bm.usage.cache_creation as { ephemeral_1h_input_tokens?: number } | undefined)?.ephemeral_1h_input_tokens ?? 0); u.cacheWrite += w - w1 + w1 * 1.6; } // an hour-long cache write costs 2.0 times the input price, a five-minute one 1.25
      if (stop === "pause_turn" && cost() + others() > o.maxUsd * 0.9) { send({ type: "status", text: "Stopped researching: close to the per-run cost limit." }); break; }
      if (stop === "pause_turn") { messages = [...messages, { role: "assistant", content: bm.content as unknown as Anthropic.Beta.BetaContentBlockParam[] }]; send({ type: "status", text: "Still researching…" }); continue; }
      break;
    }
    const tac = new AbortController(); signal.addEventListener("abort", () => tac.abort(), { once: true });
    // parallel calls that share one evidence prefix wait only until the first of them has started answering (the cache entry exists from then), not until it has finished, so a council no longer runs its first sitting alone
    if (turn === 0) {
      const key = createHash("sha1").update([model, o.system, o.firstText, JSON.stringify(toolsLeft()), o.effort].join("\u0001")).digest("hex"); const prior = WARM.get(key);
      if (prior) await Promise.race([prior, new Promise<void>((r) => { const t = setTimeout(r, WARM_WAIT_MS); signal.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true }); })]);
      else { const p = new Promise<void>((r) => { hold.release = r; }); WARM.set(key, p); setTimeout(() => { hold.release(); if (WARM.get(key) === p) WARM.delete(key); }, WARM_KEEP_MS).unref?.(); }
    }
    const s = client.beta.messages.stream({
      model, max_tokens: maxTok, system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }], messages: withNote(messages), tools: toolsLeft(), ...(containerId ? { container: containerId } : {}),
      output_config: { effort: o.effort },
    }, { signal: tac.signal });
    const pending = new Map<number, { name: string; json: string; start: Record<string, unknown> }>();
    const turnStart = report.length; const live = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }; // this turn's tokens so far, read from the stream, so the ceiling is enforced while it runs
    const liveUsd = () => runUsd({ input: u.input + live.input, output: u.output + live.output, cacheRead: u.cacheRead + live.cacheRead, cacheWrite: u.cacheWrite + live.cacheWrite, searches: u.searches }, model, batch ? BATCH_FACTOR : 1) + others();
    try {
      for await (const ev of s) {
        if (ev.type === "message_start") { hold.release(); const mu = ev.message.usage; live.input = mu.input_tokens ?? 0; live.cacheRead = mu.cache_read_input_tokens ?? 0; live.cacheWrite = mu.cache_creation_input_tokens ?? 0; }
        else if (ev.type === "message_delta") { live.output = ev.usage.output_tokens ?? live.output; }
        else if (ev.type === "content_block_start") {
          const b = ev.content_block as unknown as { type: string; name?: string; content?: unknown; input?: Record<string, unknown> };
          if (b.type === "server_tool_use") pending.set(ev.index, { name: b.name ?? "tool", json: "", start: b.input ?? {} });
          else if (b.type === "web_search_tool_result") { if (Array.isArray(b.content)) for (const r of b.content as { url?: string; title?: string }[]) addSource(r.url ?? "", r.title ?? "", "search"); else send({ type: "status", text: "A web search returned an error; continuing with other sources." }); }
          else if (b.type === "web_fetch_tool_result") { const c = b.content as { type?: string; url?: string; error_code?: string; content?: { title?: string } } | undefined; if (c?.type === "web_fetch_result" && c.url) addSource(c.url, c.content?.title ?? "", "fetch"); else send({ type: "status", text: `A page could not be fetched (${c?.error_code ?? "error"}); continuing.` }); }
          else if (/_tool_result$/.test(b.type)) { const c = (b.content ?? {}) as { error_code?: string; type?: string; return_code?: number; stderr?: string }; const last = (c.stderr ?? "").trim().split("\n").pop()?.slice(0, 160); const code = !Array.isArray(c) ? c.error_code ?? (/error/.test(c.type ?? "") ? c.type : undefined) ?? (c.return_code ? last || "code step failed" : undefined) : undefined; if (code) { console.warn(`[${tag}] ${b.type} error: ${code}`); research.failed++; send({ type: "status", text: `A research step failed ("${code}"); continuing with what is available.` }); } } // searches run inside the code tool, so their failures only show up here
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
        if (o.onSpend) o.onSpend(liveUsd() - others());
        if (!costStopped && liveUsd() > o.maxUsd) { costStopped = true; tac.abort(); }
      }
    } catch (e) { if (!costStopped) throw e; }
    if (costStopped) { u.input += live.input; u.output += live.output; u.cacheRead += live.cacheRead; u.cacheWrite += live.cacheWrite; stop = "cost"; send({ type: "status", text: `Stopped at the per-run cost limit of $${o.maxUsd.toFixed(2)}.` }); break; }
    const m = await s.finalMessage(); stop = m.stop_reason; containerId = (m as unknown as { container?: { id?: string } | null }).container?.id ?? containerId;
    apiSearches += (m.usage as { server_tool_use?: { web_search_requests?: number } }).server_tool_use?.web_search_requests ?? 0; u.input += m.usage.input_tokens ?? 0; u.output += m.usage.output_tokens ?? 0; u.cacheRead += m.usage.cache_read_input_tokens ?? 0; u.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
    if (m.stop_reason === "pause_turn" && cost() + others() > o.maxUsd * 0.9) { send({ type: "status", text: "Stopped researching: close to the per-run cost limit." }); break; }
    if (m.stop_reason === "pause_turn") { messages = [...messages, { role: "assistant", content: m.content as Anthropic.Beta.BetaContentBlockParam[] }]; send({ type: "status", text: "Still researching…" }); continue; }
    break;
  }
  console.warn(`[${tag}] searches counted from the stream: ${u.searches}; billed by the API: ${apiSearches}; failed research steps: ${research.failed}; tokens in/out/read/write: ${u.input}/${u.output}/${u.cacheRead}/${Math.round(u.cacheWrite)}; priced at ${batch ? "batch" : "standard"}: $${cost().toFixed(4)}`);
  u.usd = priceOf(model) ? cost() : null;
  return { report, sources, usage: u, stop, costStopped, failedSteps: research.failed, apiSearches };
}
