// Tests for the Hugging Face council runner and the search seam: the tool loop, the budgets, blocked domains, the cost ceiling, the held-back preamble, think-tag filtering and the dispatch from runModelTask. No network: fetch is replaced.
import assert from "node:assert/strict";
import { runModelTask, type RunOptions } from "./dossier/run";
import { runHfTask, thinkFilter } from "./dossier/run-hf";
import { isBlocked, webFetch, webSearch } from "./search";

type Req = { url: string; body: Record<string, unknown> };
const env = process.env as Record<string, string | undefined>; const real = globalThis.fetch; const enc = new TextEncoder();
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}\n\n`;
const usage = (p: number, c: number) => `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: p, completion_tokens: c } })}\n\ndata: [DONE]\n\n`;
/** An SSE body cut into pieces at awkward places, so a line can arrive in two reads. */
const sse = (text: string) => new Response(new ReadableStream({ start(c) { const m = Math.floor(text.length / 2); c.enqueue(enc.encode(text.slice(0, m))); c.enqueue(enc.encode(text.slice(m))); c.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
const toolTurn = (name: string, args: string, pre = "") => sse((pre ? chunk({ content: pre }) : "") + chunk({ tool_calls: [{ index: 0, id: "c1", function: { name, arguments: args.slice(0, 5) } }] }) + chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(5) } }] }) + chunk({}, "tool_calls") + usage(1000, 50));
const answerTurn = (t: string, p = 1500, c = 300) => sse(chunk({ content: t.slice(0, 4) }) + chunk({ content: t.slice(4) }, "stop") + usage(p, c));
const reqs: Req[] = []; let hf: (() => Response)[] = []; let tavily: (path: string, body: Record<string, unknown>) => Response = () => Response.json({ results: [] });
globalThis.fetch = (async (url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body)); reqs.push({ url, body });
  if (url.includes("huggingface.co")) return hf.shift()!(); if (url.includes("tavily.com")) return tavily(new URL(url).pathname, body); throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;
const opts = (over: Partial<RunOptions> = {}, events: Record<string, unknown>[] = []): RunOptions => ({ client: {} as never, model: "deepseek-ai/DeepSeek-V4.1-Flash:cheapest", system: "SYSTEM Begin every code step with import json.", firstText: "FACTS", roleText: "ROLE", budget: { maxTokens: 4000, searches: 3, fetches: 1, fetchTokens: 1000 }, effort: "low", maxUsd: 1, signal: new AbortController().signal, send: (e) => events.push(e), ...over });
const toolNames = (r: Req) => ((r.body.tools as { function: { name: string } }[] | undefined) ?? []).map((t) => t.function.name);

(async () => {
  env.HF_TOKEN = "hf_test"; env.TAVILY_API_KEY = "tvly_test"; env.LLM_PROVIDER = "hf";
  // ---- think filter: tags split across chunks vanish with what they enclose
  { const f = thinkFilter(); const out = ["Hel", "lo <thi", "nk>secret", " more</thi", "nk> world<"].map((c) => f.push(c)).join("") + f.end(); assert.equal(out, "Hello  world<"); }
  // ---- the search seam: blocked domains are dropped and refused, a page is cut to its token limit
  assert.equal(isBlocked("https://www.adx.ae/x"), true); assert.equal(isBlocked("https://example.com/adx.ae"), false); assert.equal(isBlocked("not a url"), true);
  tavily = (path, body) => path === "/search" ? Response.json({ results: [{ url: "https://a.com/1", title: "A", content: "alpha" }, { url: "https://www.adx.ae/2", title: "B", content: "blocked" }], echo: body }) : Response.json({ results: [{ url: "https://a.com/1", raw_content: "# Title\n" + "x".repeat(10_000) }] });
  { const hits = await webSearch("q"); assert.deepEqual(hits.map((h) => h.url), ["https://a.com/1"]); assert.deepEqual((reqs.at(-1)!.body.exclude_domains as string[]).sort(), ["adx.ae", "qe.com.qa"]); const p = await webFetch("https://a.com/1", { maxTokens: 100 }); assert.ok(p.text.length < 400 && p.text.endsWith("[page cut here]")); assert.equal(p.title, "Title"); await assert.rejects(() => webFetch("https://adx.ae/x"), /cannot be fetched/); }
  // ---- the tool loop: search, read the results, answer; the preamble before a tool call is not part of the report
  reqs.length = 0; hf = [() => toolTurn("web_search", '{"query":"uae india trade"}', "Let me search. "), () => answerTurn("Final answer [F1].")];
  tavily = () => Response.json({ results: [{ url: "https://a.com/1", title: "A", content: "alpha" }, { url: "https://www.adx.ae/2", title: "B", content: "blocked" }] });
  { const ev: Record<string, unknown>[] = []; const r = await runHfTask(opts({ label: "t1" }, ev));
    assert.equal(r.report, "Final answer [F1]."); assert.equal(r.stop, "end_turn"); assert.equal(r.usage.searches, 1); assert.equal(r.apiSearches, 1); assert.equal(r.failedSteps, 0);
    assert.deepEqual(r.sources, [{ url: "https://a.com/1", title: "A", kind: "search" }]); assert.deepEqual(r.usage.input, 2500); assert.equal(r.usage.output, 350); assert.ok(r.usage.usd! > 0 && r.usage.usd! < 0.05);
    const hfReqs = reqs.filter((x) => x.url.includes("huggingface")); assert.equal(hfReqs.length, 2); assert.deepEqual(toolNames(hfReqs[0]), ["web_search", "web_fetch"]); assert.equal(hfReqs[0].body.stream, true);
    const m0 = hfReqs[0].body.messages as { role: string; content: string }[]; assert.match(m0[0].content, /NO code step/); assert.equal(m0[1].content, "FACTS\n\nROLE");
    const m1 = hfReqs[1].body.messages as { role: string; tool_call_id?: string; content?: string; tool_calls?: unknown[] }[]; assert.equal(m1.at(-2)!.role, "assistant"); assert.equal(m1.at(-1)!.role, "tool"); assert.match(m1.at(-1)!.content!, /alpha/); assert.ok(!/blocked/.test(m1.at(-1)!.content!));
    assert.deepEqual(ev.filter((e) => e.type === "tool"), [{ type: "tool", name: "search", detail: "uae india trade" }]); assert.equal(ev.filter((e) => e.type === "text").map((e) => e.delta).join(""), "Final answer [F1].", "the preamble was never sent to the browser"); }
  // ---- the budget: a second search over a budget of one is refused, and the tool is withdrawn from the next request
  reqs.length = 0; hf = [() => toolTurn("web_search", '{"query":"one"}'), () => toolTurn("web_search", '{"query":"two"}'), () => answerTurn("Done.")];
  { const r = await runHfTask(opts({ budget: { maxTokens: 4000, searches: 1, fetches: 0, fetchTokens: 1000 } })); const h = reqs.filter((x) => x.url.includes("huggingface")); assert.equal(r.usage.searches, 1); assert.deepEqual(toolNames(h[0]), ["web_search"]); assert.deepEqual(toolNames(h[1]), [], "no tool is offered once its budget is spent");
    assert.match(String((h[2].body.messages as { content?: string }[]).at(-1)!.content), /final answer/i); assert.equal(r.report, "Done."); }
  // ---- a failed search is counted, reported and not fatal
  reqs.length = 0; hf = [() => toolTurn("web_search", '{"query":"x"}'), () => answerTurn("Ok.")]; tavily = () => Response.json({ detail: { error: "Unauthorized: missing or invalid API key." } }, { status: 401 });
  { const ev: Record<string, unknown>[] = []; const r = await runHfTask(opts({}, ev)); assert.equal(r.failedSteps, 1); assert.equal(r.report, "Ok."); assert.ok(ev.some((e) => e.type === "status" && /search returned an error/.test(String(e.text)))); }
  // ---- no search key: one call, no tools, an honest status line
  reqs.length = 0; delete env.TAVILY_API_KEY; hf = [() => answerTurn("From facts.")];
  { const ev: Record<string, unknown>[] = []; const r = await runHfTask(opts({}, ev)); const h = reqs.filter((x) => x.url.includes("huggingface")); assert.equal(h.length, 1); assert.deepEqual(toolNames(h[0]), []); assert.match(String((h[0].body.messages as { content: string }[])[0].content), /No web tools/); assert.ok(ev.some((e) => e.type === "status" && /TAVILY_API_KEY/.test(String(e.text)))); assert.equal(r.report, "From facts."); }
  env.TAVILY_API_KEY = "tvly_test";
  // ---- the ceiling: a run over its limit is cut off, marked as cost-stopped, and what arrived is kept
  reqs.length = 0; hf = [() => sse(chunk({ content: "x".repeat(3000) }) + chunk({ content: "y".repeat(3000) }))];
  { const r = await runHfTask(opts({ maxUsd: 0.00001, budget: { maxTokens: 4000, searches: 0, fetches: 0, fetchTokens: 1 } })); assert.equal(r.costStopped, true); assert.equal(r.stop, "cost"); }
  // ---- a council shares one ceiling: money already spent by siblings counts against this run (onSpend is told only this call's own spend; a ceiling of 0.5 plus a cent is already used up by the siblings)
  reqs.length = 0; hf = [() => answerTurn("Hi.", 100, 10)]; { const seen: number[] = []; await runHfTask(opts({ spentBefore: () => 0.5, onSpend: (n) => seen.push(n), budget: { maxTokens: 4000, searches: 0, fetches: 0, fetchTokens: 1 } })); assert.ok(seen.length > 0 && seen.every((n) => n >= 0 && n < 0.01)); }
  hf = [() => sse(chunk({ content: "z".repeat(400) }) + chunk({ content: "z".repeat(400) }))]; { const r = await runHfTask(opts({ spentBefore: () => 0.9999999, maxUsd: 1, budget: { maxTokens: 4000, searches: 0, fetches: 0, fetchTokens: 1 } })); assert.equal(r.costStopped, true, "siblings' spend counts against the run's ceiling"); }
  // ---- runModelTask sends a run to the HF runner under LLM_PROVIDER=hf, and the Claude client is never touched
  reqs.length = 0; hf = [() => answerTurn("Via dispatch.")]; { const r = await runModelTask(opts({ client: new Proxy({}, { get() { throw new Error("the Anthropic client must not be used"); } }) as never, budget: { maxTokens: 4000, searches: 0, fetches: 0, fetchTokens: 1 } })); assert.equal(r.report, "Via dispatch."); }
  globalThis.fetch = real; console.log("run-hf: ok");
})().catch((e) => { console.error(e); process.exit(1); });
