import type { RunOptions, RunResult, Source, Usage } from "../dossier/run";
import type { OAModel } from "./models";

// Gemini through Google's own API with Grounding with Google Search: Google runs the searches itself inside one call (no tool loop here), so a sitting gets real Google results at no cost on the free tier (Gemini 2.5 Flash: 500 grounded requests a day).
// The model decides how many searches to run; the task's budget is told to it, not enforced. Google returns each source as a redirect link, which is resolved to the real address so the source list and the quality gate see the actual site.
const NOTE = `\n\n# Tools in this environment\nYou can search the web with Google Search. There is no code step: ignore every instruction above about code steps, "import json", programmatic tool calls or code containers. Search only for what the facts do not already hold, and use at most the number of searches stated in the request. Your reply must be the finished answer only, in the format asked for, with no narration of what you did.`;
type Part = { text?: string; thought?: boolean };
type Resp = { candidates?: { content?: { parts?: Part[] }; finishReason?: string; groundingMetadata?: { webSearchQueries?: string[]; groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number } };

/** A Google grounding redirect link to the page it stands for (one manual hop, no body read); anything that cannot be resolved is kept as it is. */
async function realUrl(uri: string, f: typeof fetch): Promise<string> {
  if (!/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/.test(uri)) return uri;
  try { const r = await f(uri, { redirect: "manual", signal: AbortSignal.timeout(6_000) }); const loc = r.headers.get("location"); return loc && /^https?:\/\//.test(loc) ? loc : uri; } catch { return uri; }
}

export async function runModelTaskGemini(o: RunOptions, m: OAModel, f: typeof fetch = fetch): Promise<RunResult> {
  const { signal, send, budget: bud } = o; const tag = o.label ?? "gemini"; const model = process.env.GEMINI_MODEL || m.model;
  const u: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 };
  const ask = `${o.firstText}${o.roleText ? `\n\n${o.roleText}` : ""}\n\n(Search budget for this task: at most ${Math.max(1, bud.searches)} searches.)`;
  const res = await f(`${m.base}/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": process.env[m.keyEnv] ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: o.system + NOTE }] }, contents: [{ role: "user", parts: [{ text: ask }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: bud.maxTokens, temperature: 0.3 } }), signal });
  if (!res.ok) throw new Error(`${m.alias} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = await res.json() as Resp; const c = j.candidates?.[0];
  const report = (c?.content?.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join("").trim();
  const gm = c?.groundingMetadata; const queries = gm?.webSearchQueries ?? []; u.searches = queries.length; for (const q of queries) send({ type: "tool", name: "search", detail: q });
  const chunks = (gm?.groundingChunks ?? []).filter((x) => x.web?.uri); const urls = await Promise.all(chunks.map((x) => realUrl(x.web!.uri!, f)));
  const sources: Source[] = []; const seen = new Set<string>(); chunks.forEach((x, i) => { const url = urls[i]; if (!/^https?:\/\//.test(url) || seen.has(url)) return; seen.add(url); const s = { url, title: x.web?.title || url, kind: "search" as const }; sources.push(s); send({ type: "source", ...s }); });
  const um = j.usageMetadata; if (um) { const cached = Number(um.cachedContentTokenCount ?? 0); u.input = Math.max(0, Number(um.promptTokenCount ?? 0) - cached); u.cacheRead = cached; u.output = Number(um.candidatesTokenCount ?? 0) + Number(um.thoughtsTokenCount ?? 0); }
  const stop = c?.finishReason === "MAX_TOKENS" ? "max_tokens" : c?.finishReason && c.finishReason !== "STOP" ? c.finishReason.toLowerCase() : "end_turn";
  if (report) send({ type: "text", delta: report });
  console.warn(`[${tag}] ${m.alias} (${model}): searches ${u.searches}, sources ${sources.length}, tokens in/out/cached: ${u.input}/${u.output}/${u.cacheRead}; finish ${c?.finishReason ?? "none"}`);
  return { report, sources, usage: u, stop, costStopped: false, failedSteps: 0, apiSearches: 0 };
}
