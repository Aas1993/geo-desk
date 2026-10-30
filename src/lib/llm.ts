import Anthropic from "@anthropic-ai/sdk";

// One door to the model for the simple (no web tool) routes. LLM_PROVIDER=hf sends the call to Hugging Face Inference Providers (an OpenAI-compatible router) and hands back an
// Anthropic-shaped message, so a route reads stop_reason, content and usage exactly as before. Unset or "anthropic" is the old behaviour, untouched.
// The councils and the research note still need Anthropic's server-side web search and are NOT routed through here.
export type Provider = "anthropic" | "hf";
export const provider = (): Provider => (process.env.LLM_PROVIDER === "hf" ? "hf" : "anthropic");
const HF_BASE = (process.env.HF_BASE_URL || "https://router.huggingface.co/v1").replace(/\/+$/, "");
/** `:cheapest` lets the router pick the cheapest live provider; novita, one of the live ones, has no structured output, so the JSON fallback below matters. */
export const HF_DEFAULT_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash:cheapest";

/** The model a route should use: under HF every claude-* name (a route default or an old env var) becomes the HF model, so one setting moves every route. */
export function resolveModel(wanted: string): string {
  if (provider() !== "hf") return wanted;
  return !wanted || /^claude-/i.test(wanted) ? process.env.HF_MODEL || HF_DEFAULT_MODEL : wanted;
}

export class LlmError extends Error { constructor(message: string, public status?: number) { super(message); this.name = "LlmError"; } }

type Block = { type: string; text?: string; cache_control?: unknown };
type Params = { model: string; max_tokens: number; system?: string | Block[]; messages: { role: "user" | "assistant"; content: string | Block[] }[]; output_config?: { effort?: string; format?: { type: "json_schema"; schema: Record<string, unknown> } } };
export type LlmMessage = { stop_reason: string | null; content: { type: "text"; text: string }[]; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number } };
export type LlmClient = { messages: { create: (p: Params, o?: { signal?: AbortSignal }) => Promise<LlmMessage> } };

const flat = (c: string | Block[] | undefined) => (typeof c === "string" ? c : (c ?? []).map((b) => (b.type === "text" ? b.text ?? "" : "")).join("\n\n"));
/** Models that think out loud may put the reasoning in the text; it is never part of the answer. */
const stripThink = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
/** JSON that arrives in a code fence, or with a sentence before it, still parses. */
export function unwrapJson(s: string): string {
  const t = stripThink(s); const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); const body = (fence ? fence[1] : t).trim();
  if (body.startsWith("{") || body.startsWith("[")) return body; const a = body.indexOf("{"), z = body.lastIndexOf("}"); return a >= 0 && z > a ? body.slice(a, z + 1) : body;
}

/** Opens a chat-completions request and returns the raw response once the status is good; a bad status becomes an LlmError carrying the provider's message. */
export async function hfOpen(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const token = process.env.HF_TOKEN; if (!token) throw new LlmError("HF_TOKEN is not set.", 401);
  const r = await fetch(`${HF_BASE}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (r.ok) return r;
  const text = await r.text(); let j: Record<string, unknown> = {}; try { j = JSON.parse(text); } catch { /* a non-JSON error page */ }
  const e = j.error; throw new LlmError(typeof e === "string" ? e : (e as { message?: string } | undefined)?.message ?? (text.slice(0, 200) || `HTTP ${r.status}`), r.status);
}
const hfCall = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> => (await hfOpen(body, signal)).json();

function hfClient(): LlmClient {
  return { messages: { async create(p, o) {
    const schema = p.output_config?.format?.schema; const system = flat(p.system);
    const msgs = (sys: string) => [...(sys ? [{ role: "system", content: sys }] : []), ...p.messages.map((m) => ({ role: m.role, content: flat(m.content) }))];
    const base = { model: resolveModel(p.model), max_tokens: p.max_tokens, stream: false };
    let j: Record<string, unknown>;
    try { j = await hfCall({ ...base, messages: msgs(system), ...(schema ? { response_format: { type: "json_schema", json_schema: { name: "result", schema } } } : {}) }, o?.signal); }
    catch (e) {
      // a provider without structured output answers 400 or 422: ask for plain JSON and put the schema in the prompt instead
      if (!schema || !(e instanceof LlmError) || ![400, 422].includes(e.status ?? 0) || /credit|token/i.test(e.message)) throw e;
      j = await hfCall({ ...base, messages: msgs(`${system}\n\nReply with one JSON object only, no prose and no code fence, that matches this JSON Schema:\n${JSON.stringify(schema)}`), response_format: { type: "json_object" } }, o?.signal);
    }
    const ch = (j.choices as { message?: { content?: string }; finish_reason?: string }[] | undefined)?.[0]; if (!ch) throw new LlmError("The model returned no answer.", 502);
    const raw = String(ch.message?.content ?? ""); const text = schema ? unwrapJson(raw) : stripThink(raw);
    const u = (j.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    const cached = u.prompt_tokens_details?.cached_tokens ?? 0; const fr = ch.finish_reason;
    return { stop_reason: fr === "length" ? "max_tokens" : fr === "content_filter" ? "refusal" : "end_turn", content: [{ type: "text", text }], usage: { input_tokens: Math.max(0, (u.prompt_tokens ?? 0) - cached), output_tokens: u.completion_tokens ?? 0, cache_read_input_tokens: cached, cache_creation_input_tokens: 0 } };
  } } };
}

/** The client for the active provider. Under Anthropic the real SDK client is returned: credentials come from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login`. */
export function llmClient(): LlmClient { return provider() === "hf" ? hfClient() : (new Anthropic() as unknown as LlmClient); }

const statusOf = (e: unknown) => (e instanceof LlmError ? e.status : e instanceof Anthropic.APIError ? e.status : undefined);
/** The caller's credentials are missing, wrong or expired. */
export const isAuthError = (e: unknown) => statusOf(e) === 401 || e instanceof Anthropic.AuthenticationError;
/** The account has no money left. Anthropic says so with a 400, Hugging Face with a 402 (or a 403 whose text names credits). */
export const isNoCredit = (e: unknown) => { const m = e instanceof Error ? e.message : ""; const s = statusOf(e); return /credit balance|no remaining credits|pre-?paid credits/i.test(m) || s === 402; };

/** The line to show the user for a failed call. `fallback` turns anything unrecognised into a generic message (safeMessage in guard.ts). */
export function upstreamMessage(e: unknown, fallback: (e: unknown) => string): string {
  const hf = provider() === "hf";
  if (isAuthError(e)) return hf ? "Hugging Face credentials are missing or invalid. Set HF_TOKEN (a token with the Inference Providers permission)." : "Anthropic credentials are missing or expired. Set ANTHROPIC_API_KEY or run `ant auth login`.";
  if (isNoCredit(e)) return hf ? "Your Hugging Face Inference Providers credits are used up. Add credits at huggingface.co/settings/billing." : "Your Anthropic credit balance is too low.";
  if (hf && e instanceof LlmError && e.status === 429) return "Hugging Face rate limit reached. Try again shortly.";
  return fallback(e);
}
