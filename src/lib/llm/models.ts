// The models a council call can run on besides Claude, and which role runs on which. Every entry speaks the common chat-completions format (Hugging Face Inference Providers, DeepSeek's own API and most hosts do), so one engine serves them all.
// Prices are US$ per million tokens as the provider lists them (checked 2026-10-31); a price that is not listed is entered at the input price so the cost ceiling errs on the safe side.
export type Role = "sitting" | "chief" | "audit";
export type OAModel = { alias: string; label: string; base: string; keyEnv: string; model: string; price: { in: number; out: number; cacheRead: number }; /** "gemini": Google's own API with its built-in search (gemini.ts); otherwise the common chat-completions engine (oa.ts) */ engine?: "gemini" };
const HF = "https://router.huggingface.co/v1";
export const OA_MODELS: Record<string, OAModel> = {
  // through Hugging Face Inference Providers (one HF_TOKEN, the provider is pinned after the colon so the price is predictable)
  "hf-deepseek-flash": { alias: "hf-deepseek-flash", label: "DeepSeek V4.1 Flash (Hugging Face, Novita)", base: HF, keyEnv: "HF_TOKEN", model: "deepseek-ai/DeepSeek-V4.1-Flash:novita", price: { in: 0.3, out: 1.2, cacheRead: 0.3 } },
  "hf-deepseek-pro": { alias: "hf-deepseek-pro", label: "DeepSeek V4 Pro (Hugging Face, DeepInfra)", base: HF, keyEnv: "HF_TOKEN", model: "deepseek-ai/DeepSeek-V4-Pro:deepinfra", price: { in: 1.3, out: 2.6, cacheRead: 1.3 } },
  "hf-qwen": { alias: "hf-qwen", label: "Qwen 3.8 27B (Hugging Face, Novita)", base: HF, keyEnv: "HF_TOKEN", model: "Qwen/Qwen3.8-27B:novita", price: { in: 0.42, out: 3, cacheRead: 0.42 } },
  "hf-gpt-oss": { alias: "hf-gpt-oss", label: "gpt-oss 120B (Hugging Face, Groq)", base: HF, keyEnv: "HF_TOKEN", model: "openai/gpt-oss-120b:groq", price: { in: 0.15, out: 0.75, cacheRead: 0.15 } },
  // Google AI Studio (GEMINI_API_KEY, free to create, no card). The free tier costs nothing per token and the content may be used to improve Google's products. Free Google Search grounding exists only for Gemini 2.5 Flash and Flash-Lite (500 grounded requests a day); Gemini 3 and newer need a paid plan for it.
  "gemini-grounded": { alias: "gemini-grounded", label: "Gemini 2.5 Flash with Google Search (Google AI Studio, free)", base: "https://generativelanguage.googleapis.com/v1beta", keyEnv: "GEMINI_API_KEY", model: "gemini-2.5-flash", price: { in: 0, out: 0, cacheRead: 0 }, engine: "gemini" },
  "gemini-flash": { alias: "gemini-flash", label: "Gemini 3.8 Flash with Geo Desk search (Google AI Studio, free)", base: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY", model: "gemini-3.8-flash", price: { in: 0, out: 0, cacheRead: 0 } },
  // Groq (GROQ_API_KEY, free tier with per-model daily limits): very fast open models. Entered at the listed paid price so the cost ceiling still protects an account that has billing on.
  "groq-gpt-oss": { alias: "groq-gpt-oss", label: "gpt-oss 120B (Groq)", base: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", model: "openai/gpt-oss-120b", price: { in: 0.15, out: 0.75, cacheRead: 0.15 } },
  // OpenRouter's free models (OPENROUTER_API_KEY, free to create, no card): US$0 per token, but rate-limited per day and a free model's prompts may be logged or used for training by the provider, so never for anything you would not publish
  "or-nemotron-ultra": { alias: "or-nemotron-ultra", label: "NVIDIA Nemotron 3 Ultra (OpenRouter free)", base: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", model: "nvidia/nemotron-3-ultra-550b-a55b:free", price: { in: 0, out: 0, cacheRead: 0 } },
  "or-gemma": { alias: "or-gemma", label: "Google Gemma 4 31B (OpenRouter free)", base: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", model: "google/gemma-4-31b-it:free", price: { in: 0, out: 0, cacheRead: 0 } },
  // DeepSeek's own API (needs DEEPSEEK_API_KEY): the cheapest route, off-peak prices; peak hours (01-04 and 06-10 UTC on weekdays) are double
  "deepseek-flash": { alias: "deepseek-flash", label: "DeepSeek Flash (DeepSeek API)", base: "https://api.deepseek.com", keyEnv: "DEEPSEEK_API_KEY", model: "deepseek-flash", price: { in: 0.15, out: 0.6, cacheRead: 0.003 } },
  "deepseek-pro": { alias: "deepseek-pro", label: "DeepSeek V4 Pro (DeepSeek API)", base: "https://api.deepseek.com", keyEnv: "DEEPSEEK_API_KEY", model: "deepseek-v4-pro", price: { in: 0.66, out: 1.98, cacheRead: 0.022 } },
};
const ENV: Record<Role, string> = { sitting: "LLM_SITTING", chief: "LLM_CHIEF", audit: "LLM_AUDIT" };
/** The model for a role: Claude unless the role is switched to another with LLM_SITTING / LLM_CHIEF / LLM_AUDIT (an alias above). An unknown alias or a missing key means Claude, never a silent failure. */
export function routeOf(role: Role, env: Record<string, string | undefined> = process.env): OAModel | "claude" {
  const v = (env[ENV[role]] ?? "").trim(); if (!v || v === "claude") return "claude";
  const m = OA_MODELS[v]; if (!m) { console.warn(`[llm] ${ENV[role]}=${v} is not a known model alias; using Claude`); return "claude"; }
  if (!env[m.keyEnv]) { console.warn(`[llm] ${ENV[role]}=${v} needs ${m.keyEnv}, which is not set; using Claude`); return "claude"; }
  return m;
}
export const oaUsd = (m: OAModel, t: { input: number; output: number; cacheRead: number }) => (t.input * m.price.in + t.output * m.price.out + t.cacheRead * m.price.cacheRead) / 1e6;
