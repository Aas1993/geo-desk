import type { RunOptions, RunResult, Source, Usage } from "./run";
import { outputRoom, priceOf, runUsd } from "./cost";
import { hfOpen } from "../llm";
import { searchConfigured, webFetch, webSearch } from "../search";

// The model-run core for LLM_PROVIDER=hf: the same contract as runModelTask (options in, events out, one ceiling, a RunResult), but the model is an open one on Hugging Face and the research tools are ours.
// The Claude path leans on four Anthropic features that exist nowhere else, and each has a stand-in here:
//   server-side web_search / web_fetch  -> function calling, executed by src/lib/search.ts (Tavily)
//   pause_turn continuation             -> an ordinary tool loop: call, run the tool, call again
//   prompt-cache sharing and batches    -> none: every call is billed at the full token price
//   effort                              -> not sent
const MAX_TURNS_CAP = 14; // searches + fetches + the answer, never more than this many model calls in one run
const BUFFER_CHARS = 600; // text held back while a turn may still turn into a tool call (a preamble such as "let me search" is not part of the report)
const SEARCH_NOTE = `# Tools in this deployment
You research by calling the functions web_search(query) and web_fetch(url) directly: one or several calls per turn, then read what they return and decide the next step. There is NO code step and no code tool: ignore every instruction in this prompt about code steps, "import json", printing or parsing results, or running searches inside code. The research budget in the request is a hard limit; a call over it returns an error. When you have enough, write the final answer in the requested format and call no more functions. Never describe a search you did not run.`;
const NO_SEARCH_NOTE = `# Tools in this deployment
No web tools are available in this run. Work only from the facts and context you were given, say plainly where they are thin, and do not claim to have searched or read any page.`;
const FINAL_NUDGE = "The research is finished. Write the final answer now, in the requested format, from what you have gathered. Call no more functions.";
const fn = (name: string, description: string, props: Record<string, unknown>, required: string[]) => ({ type: "function", function: { name, description, parameters: { type: "object", properties: props, required } } });
const SEARCH_TOOL = fn("web_search", "Search the web. Returns up to six results, each with a title, a url and a short snippet.", { query: { type: "string", description: "A specific search query" } }, ["query"]);
const FETCH_TOOL = fn("web_fetch", "Read one web page as text. Use it on a result that matters; pages are cut to a limit.", { url: { type: "string", description: "A full http(s) url, usually one returned by web_search" } }, ["url"]);

/** Drops <think>…</think> from a stream, including a tag split across two chunks. */
export function thinkFilter() {
  let inside = false, hold = "";
  const tail = (s: string, tag: string) => { for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) if (tag.startsWith(s.slice(-n))) return s.slice(-n); return ""; };
  return {
    push(chunk: string): string {
      let s = hold + chunk, out = ""; hold = "";
      while (s) {
        if (inside) { const i = s.indexOf("</think>"); if (i < 0) { hold = tail(s, "</think>"); return out; } s = s.slice(i + 8); inside = false; }
        else { const i = s.indexOf("<think>"); if (i < 0) { const k = tail(s, "<think>"); hold = k; return out + s.slice(0, s.length - k.length); } out += s.slice(0, i); s = s.slice(i + 7); inside = true; }
      }
      return out;
    },
    end(): string { const r = inside ? "" : hold; hold = ""; return r; },
  };
}

type Call = { id: string; name: string; args: string };
type ChatMsg = Record<string, unknown>;

export async function runHfTask(o: RunOptions): Promise<RunResult> {
  const { model, signal, send, budget: bud } = o; const tag = o.label ?? "dossier";
  const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
  const wantsTools = bud.searches > 0 || bud.fetches > 0; const configured = searchConfigured(); const tools = wantsTools && configured;
  if (wantsTools && !configured) send({ type: "status", text: "Web search is not set up (TAVILY_API_KEY): this sitting works from the collected facts only." });
  const messages: ChatMsg[] = [{ role: "system", content: `${o.system}\n\n${tools ? SEARCH_NOTE : NO_SEARCH_NOTE}` }, { role: "user", content: o.roleText ? `${o.firstText}\n\n${o.roleText}` : o.firstText }];
  const sources: Source[] = []; const seen = new Map<string, Source>(); const ran: string[] = []; const research = { failed: 0 };
  let report = ""; let stop: string | null = null; let costStopped = false; let forceFinal = !tools; // nothing to research with: the first call is already the last
  const cost = () => runUsd(u, model); const others = () => o.spentBefore?.() ?? 0;
  const addSource = (url: string, title: string, kind: Source["kind"]) => {
    if (!/^https?:\/\//i.test(url)) return; const prev = seen.get(url);
    if (prev) { if (kind === "fetch" && prev.kind !== "fetch") { prev.kind = "fetch"; send({ type: "source", ...prev }); } return; }
    const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s });
  };
  const emit = (t: string) => { if (!t) return; report += t; send({ type: "text", delta: t }); };
  const turnsMax = tools ? Math.min(MAX_TURNS_CAP, bud.searches + bud.fetches + 2) : 1;

  /** One tool call. Budgets are checked and spent before the first await, so parallel calls in one turn cannot overspend. */
  const runCall = async (c: Call): Promise<string> => {
    let a: Record<string, unknown> = {}; try { a = JSON.parse(c.args || "{}"); } catch { return "Error: the arguments were not valid JSON."; }
    if (c.name === "web_search") {
      const q = String(a.query ?? "").replace(/\s+/g, " ").trim().slice(0, 300); if (!q) return "Error: query is required.";
      if (u.searches >= bud.searches) return "The search budget is used up. Write the answer from what you have.";
      if (ran.includes(q)) return "You already ran that query. Use its results or try a different one.";
      u.searches++; ran.push(q); send({ type: "tool", name: "search", detail: q });
      try { const hits = await webSearch(q, { signal }); for (const h of hits) addSource(h.url, h.title, "search"); return hits.length ? hits.map((h, i) => `${i + 1}. ${h.title}\n${h.url}\n${h.snippet}`).join("\n\n") : "No results."; }
      catch (e) { if (signal.aborted) throw e; research.failed++; send({ type: "status", text: "A web search returned an error; continuing with other sources." }); return `The search failed (${e instanceof Error ? e.message.slice(0, 120) : "error"}). Continue with other sources.`; }
    }
    if (c.name === "web_fetch") {
      const url = String(a.url ?? "").trim(); if (!url) return "Error: url is required.";
      if (u.fetches >= bud.fetches) return "The page-reading budget is used up. Write the answer from what you have.";
      u.fetches++; send({ type: "tool", name: "fetch", detail: url });
      try { const p = await webFetch(url, { signal, maxTokens: bud.fetchTokens }); addSource(p.url, p.title, "fetch"); return p.text; }
      catch (e) { if (signal.aborted) throw e; research.failed++; send({ type: "status", text: `A page could not be fetched (${e instanceof Error ? e.message.slice(0, 80) : "error"}); continuing.` }); return `The page could not be read (${e instanceof Error ? e.message.slice(0, 120) : "error"}).`; }
    }
    return `Unknown function ${c.name}.`;
  };

  for (let turn = 0; turn < turnsMax && !costStopped; turn++) {
    const last = turn === turnsMax - 1 || forceFinal;
    if (last && tools && messages[messages.length - 1].role === "tool") messages.push({ role: "user", content: FINAL_NUDGE });
    const offered = !last ? [...(u.searches < bud.searches ? [SEARCH_TOOL] : []), ...(u.fetches < bud.fetches ? [FETCH_TOOL] : [])] : [];
    // output room shrinks as money is spent, so one turn can never plan to write past the ceiling
    const maxTok = Math.max(1500, Math.min(bud.maxTokens, outputRoom(cost() + others(), o.maxUsd, model, o.reserveUsd)));
    const tac = new AbortController(); signal.addEventListener("abort", () => tac.abort(), { once: true });
    const live = { input: Math.round(JSON.stringify(messages).length / 3.5), output: 0, cacheRead: 0 }; // estimates until the stream's own usage arrives
    const liveUsd = () => runUsd({ input: u.input + live.input, output: u.output + live.output, cacheRead: u.cacheRead + live.cacheRead, cacheWrite: 0, searches: u.searches }, model) + others(); // siblings in a council share one ceiling
    const calls = new Map<number, Call>(); const tf = thinkFilter(); let buf = "", flushed = false, text = "", chars = 0, finish: string | null = null; const got: { usage: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | null } = { usage: null }; // a holder, so the stream loop below can fill it in
    const take = (vis: string) => { if (!vis) return; text += vis; if (flushed) { emit(vis); return; } buf += vis; if (!offered.length || (!calls.size && buf.length >= BUFFER_CHARS)) { flushed = true; emit(buf); buf = ""; } };
    try {
      const res = await hfOpen({ model, max_tokens: maxTok, stream: true, stream_options: { include_usage: true }, messages, ...(offered.length ? { tools: offered, tool_choice: "auto" } : {}) }, tac.signal);
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); const lines = acc.split("\n"); acc = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue; const data = line.slice(5).trim(); if (!data || data === "[DONE]") continue;
          let ch: { choices?: { delta?: { content?: string; reasoning_content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[]; usage?: typeof got.usage };
          try { ch = JSON.parse(data); } catch { continue; }
          if (ch.usage) got.usage = ch.usage; const c0 = ch.choices?.[0]; if (!c0) continue; if (c0.finish_reason) finish = c0.finish_reason;
          const d = c0.delta ?? {}; chars += (d.content?.length ?? 0) + (d.reasoning_content?.length ?? 0); // thinking is billed as output, so it counts toward the ceiling
          for (const t of d.tool_calls ?? []) { const i = t.index ?? 0; const cur = calls.get(i) ?? { id: "", name: "", args: "" }; if (t.id) cur.id = t.id; if (t.function?.name) cur.name += t.function.name; if (t.function?.arguments) cur.args += t.function.arguments; calls.set(i, cur); }
          if (d.content) take(tf.push(d.content));
          live.output = Math.max(live.output, Math.round(chars / 2.8));
          if (o.onSpend) o.onSpend(liveUsd() - others());
          if (!costStopped && liveUsd() > o.maxUsd) { costStopped = true; tac.abort(); }
        }
      }
      take(tf.end());
    } catch (e) { if (!costStopped) throw e; }
    const usage = got.usage; const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0;
    if (usage) { u.input += Math.max(0, (usage.prompt_tokens ?? 0) - cached); u.output += usage.completion_tokens ?? 0; u.cacheRead += cached; } else { u.input += live.input; u.output += live.output; } // a provider that sends no usage is billed on the estimate
    if (costStopped) { stop = "cost"; if (!flushed) emit(buf); send({ type: "status", text: `Stopped at the per-run cost limit of $${o.maxUsd.toFixed(2)}.` }); break; }
    const todo = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, c], i) => ({ ...c, id: c.id || `call_${turn}_${i}` })).filter((c) => c.name);
    if (!todo.length || last) { if (!flushed) emit(buf); stop = finish === "length" ? "max_tokens" : finish === "content_filter" ? "refusal" : "end_turn"; break; }
    messages.push({ role: "assistant", content: text || null, tool_calls: todo.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" } })) });
    const outs = await Promise.all(todo.map(runCall));
    todo.forEach((c, i) => messages.push({ role: "tool", tool_call_id: c.id, content: outs[i] }));
    if (cost() + others() > o.maxUsd * 0.9) { forceFinal = true; send({ type: "status", text: "Stopped researching: close to the per-run cost limit." }); } else send({ type: "status", text: "Still researching…" });
  }
  console.warn(`[${tag}] hf: searches ${u.searches}, fetches ${u.fetches}, failed steps ${research.failed}; tokens in/out/read ${u.input}/${u.output}/${u.cacheRead}`);
  u.usd = priceOf(model) ? cost() : null;
  return { report, sources, usage: u, stop, costStopped, failedSteps: research.failed, apiSearches: u.searches };
}
