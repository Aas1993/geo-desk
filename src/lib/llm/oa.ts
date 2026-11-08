import type { RunOptions, RunResult, Source, Usage } from "../dossier/run";
import { oaUsd, type OAModel } from "./models";
import { webFetch, webSearch } from "./web";

// The model-run core for models that speak the common chat-completions format (DeepSeek, Qwen, GLM, gpt-oss, through Hugging Face or the maker's own API). It returns the same RunResult as runModelTask, so a council call can run on either.
// Differences from the Claude path, on purpose: the tools are Geo Desk's own search and page reader (the model calls them as functions; there is no code step), only the text of the turn that makes no tool call is kept as the answer (earlier turns are narration), and cost comes from the provider's own token counts.
const NOTE = `\n\n# Tools in this environment\nYou have two functions, web_search(query) and web_fetch(url). There is no code step: ignore every instruction above about code steps, "import json", programmatic tool calls or code containers, and call the functions directly. The budget for the whole task is stated in the request; when it is used up the functions are withdrawn. Use the searches for what the facts do not already hold, read a page only when a snippet is not enough, then write the answer in the format asked for. Your final message must be the finished answer only, with no narration of what you did.`;
type TC = { id: string; type: "function"; function: { name: string; arguments: string } };
type Msg = { role: "system" | "user" | "assistant" | "tool"; content?: string | null; tool_calls?: TC[]; tool_call_id?: string };
const MAX_TURNS_CAP = 14;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + " …[cut]" : s);

async function* sse(res: Response): AsyncGenerator<Record<string, unknown>> {
  const dec = new TextDecoder(); let buf = "";
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true }); let i: number;
    while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; const d = line.slice(5).trim(); if (d === "[DONE]") return; try { yield JSON.parse(d) as Record<string, unknown>; } catch { /* a partial line */ } }
  }
}

export async function runModelTaskOA(o: RunOptions, m: OAModel, f: typeof fetch = fetch): Promise<RunResult> {
  const { signal, send, budget: bud } = o; const tag = o.label ?? "oa"; const key = process.env[m.keyEnv] ?? "";
  const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: null };
  const sources: Source[] = []; const seen = new Map<string, Source>(); let report = ""; let stop: string | null = null; let costStopped = false; let failed = 0;
  const others = () => o.spentBefore?.() ?? 0; const cost = () => oaUsd(m, u);
  const addSource = (url: string, title: string, kind: Source["kind"]) => { if (!/^https?:\/\//i.test(url)) return; const p = seen.get(url); if (p) { if (kind === "fetch" && p.kind !== "fetch") { p.kind = "fetch"; send({ type: "source", ...p }); } return; } const s = { url, title: title || url, kind }; seen.set(url, s); sources.push(s); send({ type: "source", ...s }); };
  const messages: Msg[] = [{ role: "system", content: o.system + NOTE }, { role: "user", content: o.firstText + (o.roleText ? `\n\n${o.roleText}` : "") }];
  const tools = () => [
    ...(bud.searches - u.searches > 0 ? [{ type: "function", function: { name: "web_search", description: `Search the web. ${bud.searches - u.searches} searches left in this task. Returns titles, links and snippets.`, parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }] : []),
    ...(bud.fetches - u.fetches > 0 ? [{ type: "function", function: { name: "web_fetch", description: `Read one web page as text. ${bud.fetches - u.fetches} page reads left in this task.`, parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } }] : []),
  ];
  const maxTurns = Math.min(MAX_TURNS_CAP, bud.searches + bud.fetches + 3);
  for (let turn = 0; turn < maxTurns && !costStopped; turn++) {
    const room = Math.floor(((o.maxUsd - others() - cost() - (o.reserveUsd ?? 0.15)) / Math.max(m.price.out, 0.01)) * 1e6); // a free model has no price to divide by: the token cap alone limits it
    const maxTok = Math.max(1500, Math.min(bud.maxTokens, room)); const tl = tools();
    const tac = new AbortController(); signal.addEventListener("abort", () => tac.abort(), { once: true });
    const res = await f(`${m.base}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: m.model, messages, stream: true, stream_options: { include_usage: true }, max_tokens: maxTok, temperature: 0.3, ...(tl.length ? { tools: tl, tool_choice: "auto" } : {}) }), signal: tac.signal });
    if (!res.ok) throw new Error(`${m.alias} ${res.status}: ${(await res.text()).slice(0, 160)}`);
    let text = ""; const calls = new Map<number, { id: string; name: string; args: string }>(); let finish: string | null = null; const live = { input: 0, cacheRead: 0, output: 0 }; let usage: Record<string, unknown> | null = null;
    try {
      for await (const ev of sse(res)) {
        const ch = (ev.choices as { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[] | undefined)?.[0];
        if (ev.usage) usage = ev.usage as Record<string, unknown>;
        if (ch?.delta?.content) { text += ch.delta.content; live.output = Math.round(text.length / 2.8); }
        for (const t of ch?.delta?.tool_calls ?? []) { const c = calls.get(t.index) ?? { id: "", name: "", args: "" }; if (t.id) c.id = t.id; if (t.function?.name) c.name += t.function.name; if (t.function?.arguments) c.args += t.function.arguments; calls.set(t.index, c); }
        if (ch?.finish_reason) finish = ch.finish_reason;
        if (o.onSpend) o.onSpend(cost() + oaUsd(m, { input: live.input, cacheRead: live.cacheRead, output: live.output }));
        if (cost() + oaUsd(m, { input: 0, cacheRead: 0, output: live.output }) + others() > o.maxUsd) { costStopped = true; tac.abort(); }
      }
    } catch (e) { if (!costStopped) throw e; }
    // the provider's own count for the turn (the input is re-sent whole every turn; the cached part is billed at the cache price)
    if (usage) { const cached = Number((usage.prompt_tokens_details as { cached_tokens?: number } | undefined)?.cached_tokens ?? 0); u.input += Math.max(0, Number(usage.prompt_tokens ?? 0) - cached); u.cacheRead += cached; u.output += Number(usage.completion_tokens ?? 0); }
    else u.output += Math.round(text.length / 2.8);
    if (costStopped) { stop = "cost"; report += clip(text, 200000); send({ type: "status", text: `Stopped at the per-run cost limit of $${o.maxUsd.toFixed(2)}.` }); if (text) send({ type: "text", delta: text }); break; }
    const tcs = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c).filter((c) => c.name);
    if (!tcs.length) { report += text; if (text) send({ type: "text", delta: text }); stop = finish === "length" ? "max_tokens" : "end_turn"; break; }
    // a turn that calls tools: its text is narration and is dropped; run the tools and give the results back
    const asst: TC[] = tcs.map((c, i) => ({ id: c.id || `call_${turn}_${i}`, type: "function", function: { name: c.name, arguments: c.args || "{}" } }));
    messages.push({ role: "assistant", content: text || null, tool_calls: asst });
    const results = await Promise.all(asst.map(async (c) => {
      let a: Record<string, unknown> = {}; try { a = JSON.parse(c.function.arguments) as Record<string, unknown>; } catch { /* handled below */ }
      try {
        if (c.function.name === "web_search" && bud.searches - u.searches > 0) { const q = String(a.query ?? "").slice(0, 300); if (!q) throw new Error("no query"); u.searches++; send({ type: "tool", name: "search", detail: q }); const hits = await webSearch(q); for (const h of hits) addSource(h.url, h.title, "search"); return hits.length ? JSON.stringify(hits.map((h) => ({ title: h.title, url: h.url, snippet: h.snippet }))) : "No results for that query; try different words."; }
        if (c.function.name === "web_fetch" && bud.fetches - u.fetches > 0) { const url = String(a.url ?? ""); u.fetches++; send({ type: "tool", name: "fetch", detail: url }); const p = await webFetch(url, bud.fetchTokens * 3); addSource(url, p.title, "fetch"); return `# ${p.title}\n${p.text}`; }
        return "That tool has no budget left in this task. Write the answer from what you have.";
      } catch (e) { failed++; const why = e instanceof Error ? e.message : "error"; send({ type: "status", text: `A research step failed (${why.slice(0, 80)}); continuing with other sources.` }); return `ERROR: ${why}. Try another query or source.`; }
    }));
    asst.forEach((c, i) => messages.push({ role: "tool", tool_call_id: c.id, content: clip(results[i], 14000) }));
    if (turn === maxTurns - 1) { stop = "turns"; send({ type: "status", text: "Stopped researching: the turn limit was reached." }); }
  }
  // a run that spent its turns researching and never wrote: one last turn with no tools, so it must answer
  if (!report.trim() && !costStopped && stop !== "end_turn") {
    messages.push({ role: "user", content: "Stop researching now. Write the finished answer in the format asked for, from the facts and what you found." });
    const res = await f(`${m.base}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: m.model, messages, stream: true, stream_options: { include_usage: true }, max_tokens: Math.max(1500, bud.maxTokens), temperature: 0.3 }), signal });
    if (res.ok) { let t = ""; let usage: Record<string, unknown> | null = null; for await (const ev of sse(res)) { const c = (ev.choices as { delta?: { content?: string | null } }[] | undefined)?.[0]?.delta?.content; if (c) t += c; if (ev.usage) usage = ev.usage as Record<string, unknown>; } if (usage) { const cached = Number((usage.prompt_tokens_details as { cached_tokens?: number } | undefined)?.cached_tokens ?? 0); u.input += Math.max(0, Number(usage.prompt_tokens ?? 0) - cached); u.cacheRead += cached; u.output += Number(usage.completion_tokens ?? 0); } report += t; if (t) send({ type: "text", delta: t }); stop = "end_turn"; }
  }
  u.usd = cost();
  console.warn(`[${tag}] ${m.alias}: searches ${u.searches}, fetches ${u.fetches}, failed research steps ${failed}; tokens in/out/cached: ${u.input}/${u.output}/${u.cacheRead}; $${u.usd.toFixed(4)}`);
  return { report, sources, usage: u, stop, costStopped, failedSteps: failed, apiSearches: 0 };
}
