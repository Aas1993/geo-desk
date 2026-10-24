import Anthropic from "@anthropic-ai/sdk";
import { PRICE, outputRoom, runUsd } from "./cost";

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
};
export type RunResult = { report: string; sources: Source[]; usage: Usage; stop: string | null; costStopped: boolean; failedSteps: number; apiSearches: number };

export async function runModelTask(o: RunOptions): Promise<RunResult> {
  const { client, model, signal, send, budget: bud } = o; const tag = o.label ?? "dossier";
  const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
  // the budget is for the whole run: each continuation after a pause gets only what is left, and a tool with nothing left is withdrawn
  const toolsLeft = () => [
    ...(bud.searches - u.searches > 0 ? [{ type: "web_search_20260209", name: "web_search", max_uses: bud.searches - u.searches + SEARCH_SLACK, blocked_domains: BLOCKED }] : []),
    ...(bud.fetches - u.fetches > 0 ? [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: bud.fetches - u.fetches, blocked_domains: BLOCKED, max_content_tokens: bud.fetchTokens }] : []),
  ] as unknown as Anthropic.Beta.BetaToolUnion[];
  const research = { failed: 0 }; let apiSearches = 0; let containerId: string | undefined; // the code container of the search tool: a resumed turn must reuse it, or it starts afresh and replays (and pays for) the earlier searches
  const ran: string[] = []; // queries already run, told to the model on every continuation because a resumed turn tends to replay its first search
  const first: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text: o.firstText, cache_control: { type: "ephemeral" } }, ...(o.roleText ? [{ type: "text" as const, text: o.roleText }] : [])];
  // the note goes after the cached facts block, so the prompt-cache prefix (tools, system, facts) stays valid on every continuation
  const withNote = (ms: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] => (ran.length && Array.isArray(ms[0]?.content) ? [{ ...ms[0], content: [...(ms[0].content as Anthropic.Beta.BetaContentBlockParam[]), { type: "text", text: `Searches already run in this task (their results are in the conversation below; never run them again: search for something new or go on to write): ${ran.map((q) => `"${q}"`).join("; ")}.` }] }, ...ms.slice(1)] : ms);
  const cost = () => runUsd(u, model); const others = () => o.spentBefore?.() ?? 0;
  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: first }];
  const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null; let costStopped = false;
  const addSource = (url: string, title: string, kind: Source["kind"]) => {
    if (!/^https?:\/\//i.test(url)) return; const prev = seen.get(url);
    if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; }
    const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
  };
  for (let turn = 0; turn < MAX_TURNS && !costStopped; turn++) {
    // output room shrinks as money is spent, so one turn can never plan to write past the ceiling
    const maxTok = Math.max(1500, Math.min(bud.maxTokens, outputRoom(cost() + others(), o.maxUsd, model)));
    const tac = new AbortController(); signal.addEventListener("abort", () => tac.abort(), { once: true });
    const s = client.beta.messages.stream({
      model, max_tokens: maxTok, system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }], messages: withNote(messages), tools: toolsLeft(), ...(containerId ? { container: containerId } : {}),
      output_config: { effort: o.effort },
    }, { signal: tac.signal });
    const pending = new Map<number, { name: string; json: string; start: Record<string, unknown> }>();
    const turnStart = report.length; const live = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }; // this turn's tokens so far, read from the stream, so the ceiling is enforced while it runs
    const liveUsd = () => runUsd({ input: u.input + live.input, output: u.output + live.output, cacheRead: u.cacheRead + live.cacheRead, cacheWrite: u.cacheWrite + live.cacheWrite, searches: u.searches }, model) + others();
    try {
      for await (const ev of s) {
        if (ev.type === "message_start") { const mu = ev.message.usage; live.input = mu.input_tokens ?? 0; live.cacheRead = mu.cache_read_input_tokens ?? 0; live.cacheWrite = mu.cache_creation_input_tokens ?? 0; }
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
  console.warn(`[${tag}] searches counted from the stream: ${u.searches}; billed by the API: ${apiSearches}; failed research steps: ${research.failed}`);
  u.usd = PRICE[model] ? cost() : null;
  return { report, sources, usage: u, stop, costStopped, failedSteps: research.failed, apiSearches };
}
