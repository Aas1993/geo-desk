// Tests for the provider layer: the model mapping, the request and response translation for Hugging Face, the JSON fallback, the error lines and the price lookup. No network: fetch is replaced.
import assert from "node:assert/strict";
import { HF_DEFAULT_MODEL, LlmError, isNoCredit, llmClient, resolveModel, unwrapJson, upstreamMessage } from "./llm";
import { priceOf, runUsd } from "./dossier/cost";

(async () => {
  const env = process.env as Record<string, string | undefined>; const real = globalThis.fetch;
  // ---- the model: untouched under Anthropic, one HF model for every claude-* name under HF
  delete env.LLM_PROVIDER; assert.equal(resolveModel("claude-sonnet-5-5"), "claude-sonnet-5-5");
  env.LLM_PROVIDER = "hf"; delete env.HF_MODEL; assert.equal(resolveModel("claude-haiku-5-5"), HF_DEFAULT_MODEL); assert.equal(resolveModel("acme/other-model"), "acme/other-model"); env.HF_MODEL = "deepseek-ai/DeepSeek-V4-Flash"; assert.equal(resolveModel("claude-opus-5-5"), "deepseek-ai/DeepSeek-V4-Flash"); delete env.HF_MODEL;
  // ---- the price lookup drops a routing suffix; DeepSeek is far cheaper than Sonnet; an unknown model is still priced like Opus
  assert.deepEqual(priceOf(HF_DEFAULT_MODEL), priceOf("deepseek-ai/DeepSeek-V4.1-Flash")); assert.ok(priceOf("deepseek-ai/DeepSeek-V4.1-Flash:deepinfra"));
  const t = { input: 1e6, output: 1e6, cacheRead: 0, cacheWrite: 0, searches: 0 }; assert.ok(runUsd(t, HF_DEFAULT_MODEL) < runUsd(t, "claude-sonnet-5-5") / 5); assert.equal(runUsd(t, "nope/unknown"), runUsd(t, "claude-opus-5-5"));
  // ---- JSON helpers
  assert.equal(unwrapJson('```json\n{"a":1}\n```'), '{"a":1}'); assert.equal(unwrapJson('<think>hm</think>Sure: {"a":1} done'), '{"a":1}'); assert.equal(unwrapJson('{"a":1}'), '{"a":1}');
  // ---- the HF client
  env.HF_TOKEN = "hf_test"; const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  const reply = (queue: (() => Response)[]) => { globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") }); return queue.shift()!(); }) as typeof fetch; };
  const ok = (content: string, extra: Record<string, unknown> = {}) => () => Response.json({ choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 200, prompt_tokens_details: { cached_tokens: 400 } }, ...extra });
  const SCHEMA = { type: "object", properties: { a: { type: "number" } } };
  reply([ok('```json\n{"a":1}\n```')]);
  const m = await llmClient().messages.create({ model: "claude-sonnet-5-5", max_tokens: 500, system: [{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }] as never, messages: [{ role: "user", content: "hi" }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } });
  assert.equal(calls[0].url, "https://router.huggingface.co/v1/chat/completions"); assert.equal(calls[0].auth, "Bearer hf_test"); assert.equal(calls[0].body.model, HF_DEFAULT_MODEL); assert.equal(calls[0].body.max_tokens, 500);
  assert.deepEqual((calls[0].body.messages as { role: string }[]).map((x) => x.role), ["system", "user"]); assert.equal((calls[0].body.response_format as { type: string }).type, "json_schema");
  assert.equal(m.content[0].text, '{"a":1}', "a fenced JSON answer is unwrapped"); assert.equal(m.stop_reason, "end_turn");
  assert.deepEqual(m.usage, { input_tokens: 600, output_tokens: 200, cache_read_input_tokens: 400, cache_creation_input_tokens: 0 }, "cached tokens are split out of the prompt tokens");
  // ---- a provider with no structured output: retried once as plain JSON with the schema in the prompt
  calls.length = 0; reply([() => Response.json({ error: "response_format json_schema is not supported" }, { status: 400 }), ok('{"a":2}')]);
  const m2 = await llmClient().messages.create({ model: "x", max_tokens: 1, system: "S", messages: [{ role: "user", content: "q" }], output_config: { format: { type: "json_schema", schema: SCHEMA } } });
  assert.equal(calls.length, 2); assert.equal((calls[1].body.response_format as { type: string }).type, "json_object"); assert.match(String((calls[1].body.messages as { content: string }[])[0].content), /JSON Schema/); assert.equal(m2.content[0].text, '{"a":2}');
  // ---- no retry when the failure is about money or the token; the length and filter stops map to Anthropic's names
  calls.length = 0; reply([() => Response.json({ error: "You have no remaining credits." }, { status: 402 })]);
  await assert.rejects(() => llmClient().messages.create({ model: "x", max_tokens: 1, messages: [{ role: "user", content: "q" }], output_config: { format: { type: "json_schema", schema: SCHEMA } } }), (e: unknown) => e instanceof LlmError && e.status === 402 && isNoCredit(e)); assert.equal(calls.length, 1);
  reply([() => Response.json({ choices: [{ message: { content: "<think>x</think>cut" }, finish_reason: "length" }], usage: {} })]);
  const m3 = await llmClient().messages.create({ model: "x", max_tokens: 1, messages: [{ role: "user", content: "q" }] }); assert.equal(m3.stop_reason, "max_tokens"); assert.equal(m3.content[0].text, "cut");
  reply([() => Response.json({ choices: [{ message: { content: "" }, finish_reason: "content_filter" }] })]); assert.equal((await llmClient().messages.create({ model: "x", max_tokens: 1, messages: [{ role: "user", content: "q" }] })).stop_reason, "refusal");
  // ---- a missing token fails before any request
  delete env.HF_TOKEN; calls.length = 0; await assert.rejects(() => llmClient().messages.create({ model: "x", max_tokens: 1, messages: [{ role: "user", content: "q" }] }), (e: unknown) => e instanceof LlmError && e.status === 401); assert.equal(calls.length, 0);
  // ---- the user-facing lines name the right provider
  const fb = () => "generic"; assert.match(upstreamMessage(new LlmError("x", 401), fb), /HF_TOKEN/); assert.match(upstreamMessage(new LlmError("You have no remaining credits.", 402), fb), /Hugging Face/); assert.equal(upstreamMessage(new Error("boom"), fb), "generic");
  delete env.LLM_PROVIDER; assert.match(upstreamMessage(new LlmError("x", 401), fb), /Anthropic/);
  globalThis.fetch = real; console.log("llm: ok");
})().catch((e) => { console.error(e); process.exit(1); });
