// Tests for the model-neutral run engine: routing, the safety rules of the web tools, and a whole run against a scripted provider (no network, no cost).
import assert from "node:assert/strict";
import { OA_MODELS, oaUsd, routeOf } from "./llm/models";
import { safeUrl, searchBackend, searchBackends, parseFeed, rankItems, queryTerms, webSearch, webFetch, resetSearchPool } from "./llm/web";
import { runModelTaskGemini } from "./llm/gemini";
import { diskGet, diskSet } from "./dossier/diskcache";
import { mkdtempSync, writeFileSync as wf, readdirSync as rd } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runModelTaskOA } from "./llm/oa";
import { runRouted } from "./llm/route";
import { BudgetError, readSpend } from "./spend";

// routing: Claude unless a role is switched to a known model whose key is set
const M = OA_MODELS["hf-deepseek-flash"];
assert.equal(routeOf("sitting", {}), "claude");
assert.equal(routeOf("sitting", { LLM_SITTING: "claude" }), "claude");
assert.equal(routeOf("sitting", { LLM_SITTING: "hf-deepseek-flash", HF_TOKEN: "x" }), M);
assert.equal(routeOf("sitting", { LLM_SITTING: "hf-deepseek-flash" }), "claude", "a missing key falls back to Claude");
assert.equal(routeOf("sitting", { LLM_SITTING: "nonsense", HF_TOKEN: "x" }), "claude", "an unknown alias falls back to Claude");
assert.equal(routeOf("chief", { LLM_SITTING: "hf-deepseek-flash", HF_TOKEN: "x" }), "claude", "roles are switched one at a time");
assert.equal(oaUsd({ ...M, price: { in: 1, out: 2, cacheRead: 0.5 } }, { input: 1e6, output: 1e6, cacheRead: 2e6 }), 1 + 2 + 1);

// the page reader and search never reach the local network or a blocked site
for (const bad of ["http://localhost:3020/api/x", "http://127.0.0.1/", "http://10.1.2.3/", "http://192.168.0.5/", "http://172.20.0.1/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "file:///etc/passwd", "ftp://example.org/", "https://intranet/", "https://printer.local/", "https://adx.ae/page", "https://www.adx.ae/x", "not a url"]) assert.equal(safeUrl(bad), null, `${bad} must be refused`);
for (const ok of ["https://www.imf.org/en/Countries/JOR", "http://example.org/a?b=1", "https://172.15.0.1/x".replace("172.15.0.1", "www.chathamhouse.org")]) assert.ok(safeUrl(ok), `${ok} must be allowed`);
assert.equal(searchBackend({}), "free"); assert.equal(searchBackend({ BRAVE_API_KEY: "k" }), "brave"); assert.equal(searchBackend({ BRAVE_API_KEY: "k", TAVILY_API_KEY: "t" }), "tavily");
assert.deepEqual(searchBackends({ EXA_API_KEY: "e", LINKUP_API_KEY: "l", SERPER_API_KEY: "s" }), ["linkup", "exa", "serper"], "every keyed provider is listed, in preference order");
assert.ok(routeOf("sitting", { LLM_SITTING: "gemini-grounded", GEMINI_API_KEY: "g" }) !== "claude" && (OA_MODELS["gemini-grounded"].engine === "gemini"), "Gemini with Google Search runs on its own engine");

// the keyless search: feeds are parsed, and only items that mention enough of the query come back, best first
const rss = `<rss><channel><item><title><![CDATA[IMF sets December target for Egypt review]]></title><link>https://example.org/egypt-imf</link><description>The IMF and Egypt &amp; officials agree a programme timetable</description></item><item><title>Sports roundup</title><link>https://example.org/sport</link><description>Football</description></item></channel></rss>`;
const atom = `<feed><entry><title>UAE and Jordan sign accord</title><link href="https://example.org/uae-jordan"/><summary>Agreement signed in Amman</summary></entry><entry><title>No link entry</title></entry></feed>`;
assert.deepEqual(parseFeed(rss, "The National").map((x) => [x.title, x.url]), [["IMF sets December target for Egypt review (The National)", "https://example.org/egypt-imf"], ["Sports roundup (The National)", "https://example.org/sport"]]);
assert.equal(parseFeed(rss)[0].snippet, "The IMF and Egypt & officials agree a programme timetable");
assert.deepEqual(parseFeed(atom).map((x) => x.url), ["https://example.org/uae-jordan"], "an Atom link is read from href, and an entry with no link is dropped");
assert.deepEqual(queryTerms("The latest UAE-Jordan relations news"), ["uae", "jordan", "relations"]);
assert.deepEqual(rankItems([...parseFeed(rss), ...parseFeed(atom)], "Egypt IMF review").map((x) => x.url), ["https://example.org/egypt-imf"], "two matching words are needed");
assert.deepEqual(rankItems(parseFeed(atom), "Jordan"), parseFeed(atom).slice(0, 1), "a one-word query needs one");
assert.deepEqual(rankItems(parseFeed(rss), "football tournament final"), [], "one word of three is not enough");

// the free models
const OR = routeOf("sitting", { LLM_SITTING: "or-gemma", OPENROUTER_API_KEY: "k" }); assert.ok(OR !== "claude" && OR.price.out === 0 && OR.base.includes("openrouter.ai"));
assert.equal(routeOf("audit", { LLM_AUDIT: "or-gemma" }), "claude", "a free model still needs its (free) key");

// the disk cache: a saved product comes back until its time limit, a damaged file is a miss, and only the newest files are kept
const tmp = mkdtempSync(path.join(tmpdir(), "gd-cache-")); const cwd0 = process.cwd(); process.chdir(tmp);
const fresh = { at: new Date().toISOString(), report: "r" }; diskSet("k1", fresh);
assert.deepEqual(diskGet("k1", 6 * 3600_000), fresh); assert.equal(diskGet("other", 6 * 3600_000), null);
assert.equal(diskGet("k1", -1), null, "past its time limit it is a miss"); diskSet("old", { at: new Date(Date.now() - 7 * 3600_000).toISOString() }); assert.equal(diskGet("old", 6 * 3600_000), null);
const f1 = rd(path.join(tmp, ".cache", "desk")).find((n) => n.endsWith(".json"))!; wf(path.join(tmp, ".cache", "desk", f1), "{not json"); assert.equal(diskGet("k1", 6 * 3600_000), null, "a damaged file is a miss, not an error");
for (let i = 0; i < 70; i++) diskSet(`bulk${i}`, { at: new Date().toISOString() }); assert.ok(rd(path.join(tmp, ".cache", "desk")).length <= 60, "only the newest 60 are kept");
process.chdir(cwd0);

// a whole run against a scripted provider
void (async () => {
const enc = new TextEncoder();
const sse = (chunks: object[]) => new Response(new ReadableStream({ start(c) { for (const x of chunks) c.enqueue(enc.encode(`data: ${JSON.stringify(x)}\n\n`)); c.enqueue(enc.encode("data: [DONE]\n\n")); c.close(); } }), { status: 200, headers: { "content-type": "text/event-stream" } });
const real = globalThis.fetch; let calls = 0; const bodies: { messages: { role: string; content?: string; tool_calls?: unknown }[]; tools?: { function: { name: string } }[]; max_tokens?: number }[] = []; let script: (n: number) => Response = () => new Response("no script", { status: 500 });
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("/chat/completions")) { calls++; bodies.push(JSON.parse(String(init?.body))); return script(calls); }
  if (u.includes("gdeltproject")) return new Response(JSON.stringify({ articles: [{ url: "https://www.example.org/uae-jordan", title: "UAE and Jordan sign", domain: "example.org", seendate: "20261030" }, { url: "http://127.0.0.1/secret", title: "local", domain: "x" }] }), { status: 200 });
  if (u.includes("wikipedia.org")) return new Response(JSON.stringify({ query: { search: [{ title: "Jordan", snippet: "a <b>country</b>" }] } }), { status: 200 });
  return new Response("", { status: 404 });
}) as typeof fetch;
process.env.HF_TOKEN = "test-key";
const events: Record<string, unknown>[] = [];
const base = { client: null as never, model: "x", system: "sys", firstText: "facts and request", budget: { maxTokens: 2000, searches: 1, fetches: 0, fetchTokens: 2000 }, effort: "low" as const, maxUsd: 1, signal: new AbortController().signal, send: (e: Record<string, unknown>) => events.push(e), label: "t" };
const toolTurn = [{ choices: [{ delta: { content: "Let me search." } }] }, { choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "web_search", arguments: '{"query":"UAE Jordan' } }] } }] }, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ' agreement"}' } }] } }] }, { choices: [{ finish_reason: "tool_calls", delta: {} }] }, { usage: { prompt_tokens: 1000, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 400 } }, choices: [] }];
const finalTurn = [{ choices: [{ delta: { content: "Final answer " } }] }, { choices: [{ delta: { content: "[F1]." } }] }, { choices: [{ finish_reason: "stop", delta: {} }] }, { usage: { prompt_tokens: 1500, completion_tokens: 100 }, choices: [] }];
script = (n) => sse(n === 1 ? toolTurn : finalTurn);
const r = await runModelTaskOA(base, M);
assert.equal(r.report, "Final answer [F1].", "only the turn that calls no tool is the answer; the narration is dropped");
assert.equal(calls, 2); assert.equal(r.usage.searches, 1); assert.equal(r.failedSteps, 0); assert.equal(r.stop, "end_turn");
assert.deepEqual(r.sources.map((s) => s.url), ["https://www.example.org/uae-jordan", "https://en.wikipedia.org/wiki/Jordan"], "a result pointing at the local network is dropped");
assert.equal(r.usage.input, 600 + 1500); assert.equal(r.usage.cacheRead, 400); assert.equal(r.usage.output, 150);
assert.ok(Math.abs(r.usage.usd! - oaUsd(M, { input: 2100, cacheRead: 400, output: 150 })) < 1e-9, "cost comes from the provider's token counts");
assert.ok(bodies[0].tools?.some((t) => t.function.name === "web_search") && !bodies[0].tools?.some((t) => t.function.name === "web_fetch"), "a tool with no budget is not offered");
assert.ok(!bodies[1].tools, "once the search budget is used the tool is withdrawn");
assert.ok(bodies[1].messages.some((m) => m.role === "tool"), "the results are given back to the model");
assert.match(bodies[0].messages[0].content ?? "", /no code step/i, "the Claude-only code-step rules are overridden");

// a model that asks for a second search when none is left gets told so, not served
calls = 0; script = (n) => sse(n === 1 ? toolTurn : n === 2 ? [{ choices: [{ delta: { tool_calls: [{ index: 0, id: "c2", function: { name: "web_search", arguments: '{"query":"again"}' } }] } }] }, { choices: [{ finish_reason: "tool_calls", delta: {} }] }, { usage: { prompt_tokens: 1200, completion_tokens: 20 }, choices: [] }] : finalTurn);
const r2 = await runModelTaskOA(base, M); assert.equal(r2.usage.searches, 1, "the budget is enforced even if the model ignores it"); assert.equal(r2.report, "Final answer [F1].");

// the cost ceiling stops a run that writes past it
calls = 0; script = () => sse([{ choices: [{ delta: { content: "x".repeat(200_000) } }] }, { choices: [{ finish_reason: "stop", delta: {} }] }]);
const r3 = await runModelTaskOA({ ...base, maxUsd: 0.001 }, M); assert.equal(r3.costStopped, true); assert.equal(r3.stop, "cost");

// a free model costs nothing and its output room is not NaN
process.env.OPENROUTER_API_KEY = "k"; calls = 0; script = (n) => sse(n === 1 ? toolTurn : finalTurn);
const rf = await runModelTaskOA(base, OA_MODELS["or-gemma"]); assert.equal(rf.usage.usd, 0); assert.equal(rf.report, "Final answer [F1]."); assert.ok(Number.isFinite(bodies[bodies.length - 1].max_tokens as number) || bodies[bodies.length - 1].max_tokens === undefined);

// a paid call through the router is written to the spend ledger, and a spent limit stops the next one (run in a temporary folder so the real ledger is untouched)
{ const t = mkdtempSync(path.join(tmpdir(), "gd-led-")); const c0 = process.cwd(); process.chdir(t);
  process.env.HF_TOKEN = "k"; process.env.LLM_SITTING = "hf-deepseek-flash"; calls = 0; script = (n) => sse(n === 1 ? toolTurn : finalTurn);
  const paid = await runRouted({ ...base, label: "desk-test-C1" }, "sitting"); assert.equal(paid.report, "Final answer [F1]."); const rows = readSpend(1e12); assert.equal(rows.length, 1); assert.equal(rows[0].label, "desk-test-C1"); assert.equal(rows[0].model, "hf-deepseek-flash"); assert.ok(rows[0].usd > 0 && Math.abs(rows[0].usd - paid.usage.usd!) < 1e-6);
  process.env.SPEND_DAILY_USD = String(rows[0].usd / 2); await assert.rejects(runRouted(base, "sitting"), BudgetError, "a call is refused once the daily limit is used up"); assert.equal(calls, 2, "and no request was sent to the provider");
  delete process.env.SPEND_DAILY_USD; process.chdir(c0); }

// a provider error surfaces (the router then falls back to Claude), and an empty answer counts as an error
script = () => new Response('{"error":"no credits"}', { status: 402 });
await assert.rejects(runModelTaskOA(base, M), /402/);
process.env.LLM_SITTING = "hf-deepseek-flash"; process.env.LLM_FALLBACK = "0";
await assert.rejects(runRouted(base, "sitting"), /402/, "with the fallback off the failure is shown");
script = () => sse([{ choices: [{ finish_reason: "stop", delta: {} }] }]);
await assert.rejects(runRouted(base, "sitting"), /empty answer/);

// the search pool: calls rotate over the keyed providers, a provider that reports a quota problem is put aside, and when none answers the keyless search takes over
const prevFetch = globalThis.fetch; const hosts: string[] = []; let linkupMode: "ok" | "quota" = "ok"; let exaMode: "ok" | "down" = "ok";
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url); hosts.push(new URL(u).hostname);
  if (u.includes("api.linkup.so")) return linkupMode === "quota" ? new Response("{}", { status: 429 }) : new Response(JSON.stringify({ results: [{ name: "L1", url: "https://l.example.org/a", content: "c", type: "text" }, { name: "img", url: "https://l.example.org/i.png", type: "image" }] }), { status: 200 });
  if (u.includes("api.exa.ai")) return exaMode === "down" ? new Response("{}", { status: 500 }) : new Response(JSON.stringify({ results: [{ title: "E1", url: "https://e.example.org/a", highlights: ["h"] }] }), { status: 200 });
  if (/gdeltproject|wikipedia|search\.worldbank|marginalia/.test(u)) return new Response("", { status: 500 });
  if (u.includes("r.jina.ai")) return new Response("Title: Jina Title\nURL Source: x\n\n" + "word ".repeat(100), { status: 200 });
  if (u.startsWith("https://tiny.example.org")) return new Response("<html><title>t</title><body>hi</body></html>", { status: 200, headers: { "content-type": "text/html" } });
  return prevFetch(url, init);
}) as typeof fetch;
process.env.LINKUP_API_KEY = "a"; process.env.EXA_API_KEY = "b"; delete process.env.TAVILY_API_KEY; delete process.env.SERPER_API_KEY; delete process.env.BRAVE_API_KEY; resetSearchPool();
const first = await webSearch("q1"); assert.deepEqual(first.map((x) => x.url), ["https://l.example.org/a"], "an image result is not a source");
const second = await webSearch("q2"); assert.deepEqual(second.map((x) => x.url), ["https://e.example.org/a"], "the next call goes to the next provider");
assert.equal((await webSearch("q3"))[0].url, "https://l.example.org/a");
linkupMode = "quota"; resetSearchPool(); const afterQuota = await webSearch("q4"); assert.ok(afterQuota.length >= 1, "a provider at its quota is skipped and the next one answers");
hosts.length = 0; for (let i = 0; i < 4; i++) await webSearch(`again ${i}`); assert.ok(!hosts.some((h) => h.includes("linkup")), "a provider that reported a quota problem is left alone for an hour");
exaMode = "down"; assert.deepEqual(await webSearch("none answer"), [], "when every provider fails the keyless search answers (here empty) and nothing throws");
// the page reader: a page that gives almost no text is read through Jina Reader
const pg = await webFetch("https://tiny.example.org/page", 1000); assert.equal(pg.title, "Jina Title"); assert.ok(pg.text.length > 200 && !/URL Source/.test(pg.text), "the reader's header lines are removed");
await assert.rejects(webFetch("http://localhost/x", 1000), /address refused/);
globalThis.fetch = prevFetch;
delete process.env.LINKUP_API_KEY; delete process.env.EXA_API_KEY; resetSearchPool();

// Gemini with Google Search: one call, Google runs the searches, redirect links are resolved to the real sites
let gReq: { url: string; key: string | null; body: { tools?: unknown[]; systemInstruction?: { parts: { text: string }[] }; generationConfig?: { maxOutputTokens?: number } } } | null = null;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  if (u.includes(":generateContent")) { gReq = { url: u, key: new Headers(init?.headers).get("x-goog-api-key"), body: JSON.parse(String(init?.body)) }; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: "The answer " }, { text: "[F2]." }] }, finishReason: "STOP", groundingMetadata: { webSearchQueries: ["uae jordan", "jordan imf"], groundingChunks: [{ web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "imf.org" } }, { web: { uri: "https://www.example.org/direct", title: "Direct" } }, { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "dup" } }] } }], usageMetadata: { promptTokenCount: 1000, cachedContentTokenCount: 100, candidatesTokenCount: 300, thoughtsTokenCount: 50 } }), { status: 200 }); }
  if (u.includes("grounding-api-redirect")) return new Response(null, { status: 302, headers: { location: "https://www.imf.org/en/Countries/JOR" } });
  return new Response("", { status: 404 });
}) as typeof fetch;
process.env.GEMINI_API_KEY = "g-key"; const gev: Record<string, unknown>[] = [];
const gr = await runModelTaskGemini({ ...base, send: (e) => gev.push(e) }, OA_MODELS["gemini-grounded"]);
assert.equal(gr.report, "The answer [F2].", "the model's thinking parts are not part of the answer");
assert.deepEqual(gr.sources.map((x) => x.url), ["https://www.imf.org/en/Countries/JOR", "https://www.example.org/direct"], "redirect links become the real address and a duplicate is dropped");
assert.equal(gr.usage.searches, 2); assert.equal(gr.usage.input, 900); assert.equal(gr.usage.cacheRead, 100); assert.equal(gr.usage.output, 350); assert.equal(gr.usage.usd, 0); assert.equal(gr.stop, "end_turn");
assert.ok(gReq!.url.includes("/models/gemini-2.5-flash:generateContent") && gReq!.key === "g-key" && JSON.stringify(gReq!.body.tools) === JSON.stringify([{ google_search: {} }]), "it asks for Google Search grounding with the key in the header");
assert.match(gReq!.body.systemInstruction!.parts[0].text, /no code step/i); assert.equal(gReq!.body.generationConfig!.maxOutputTokens, 2000);
assert.equal(gev.filter((e) => e.type === "tool").length, 2);
globalThis.fetch = (async () => new Response('{"error":"quota"}', { status: 429 })) as typeof fetch; await assert.rejects(runModelTaskGemini(base, OA_MODELS["gemini-grounded"]), /429/);
delete process.env.GEMINI_API_KEY;

globalThis.fetch = real;
console.log("llm: all assertions passed");
})().catch((e) => { console.error(e); process.exit(1); });
