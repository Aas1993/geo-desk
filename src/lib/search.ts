// Web search and page reading for runs that are not on Claude. Anthropic's own web_search / web_fetch tools run on its servers and exist nowhere else, so under LLM_PROVIDER=hf the run calls these instead.
// Tavily is the one provider wired in (POST /search and /extract, a bearer key, https://tavily.com); the seam is these two functions, so another provider means changing only this file.
export type SearchHit = { url: string; title: string; snippet: string };
export type Page = { url: string; title: string; text: string };

/** ADX's terms prohibit automated retrieval, and qe.com.qa is likewise off limits: the same list the Claude path passes as blocked_domains. */
export const BLOCKED_DOMAINS = ["adx.ae", "qe.com.qa"];
export const isBlocked = (url: string) => { try { const h = new URL(url).hostname.toLowerCase(); return BLOCKED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return true; } };
export const searchConfigured = () => !!process.env.TAVILY_API_KEY;
const BASE = (process.env.TAVILY_BASE_URL || "https://api.tavily.com").replace(/\/+$/, "");
export class SearchError extends Error { constructor(message: string, public status?: number) { super(message); this.name = "SearchError"; } }

async function post(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const key = process.env.TAVILY_API_KEY; if (!key) throw new SearchError("TAVILY_API_KEY is not set.", 401);
  // a slow search must not hold a run for ever: the run's own signal still wins
  const t = AbortSignal.timeout(45_000); const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, t]) : t });
  const text = await r.text(); let j: Record<string, unknown> = {}; try { j = JSON.parse(text); } catch { /* an error page */ }
  if (!r.ok) { const d = j.detail as { error?: string } | string | undefined; throw new SearchError((typeof d === "string" ? d : d?.error) || text.slice(0, 160) || `HTTP ${r.status}`, r.status); }
  return j;
}

/** One web search: up to `max` results with a short snippet each. Blocked domains are asked for by the provider and filtered again here. */
export async function webSearch(query: string, o: { signal?: AbortSignal; max?: number } = {}): Promise<SearchHit[]> {
  const j = await post("/search", { query: query.slice(0, 400), max_results: o.max ?? 6, search_depth: "basic", include_answer: false, exclude_domains: BLOCKED_DOMAINS }, o.signal);
  const rs = Array.isArray(j.results) ? (j.results as { url?: string; title?: string; content?: string }[]) : [];
  return rs.filter((r) => r.url && !isBlocked(r.url)).map((r) => ({ url: String(r.url), title: String(r.title ?? r.url), snippet: String(r.content ?? "").slice(0, 600) }));
}

/** Reads one page as text, cut to about `maxTokens` tokens (3.5 characters each). A blocked or unreadable page throws, and the run tells the model so. */
export async function webFetch(url: string, o: { signal?: AbortSignal; maxTokens?: number } = {}): Promise<Page> {
  if (!/^https?:\/\//i.test(url) || isBlocked(url)) throw new SearchError("That address cannot be fetched.", 403);
  const j = await post("/extract", { urls: [url], format: "text", extract_depth: "basic", timeout: 20 }, o.signal);
  const ok = Array.isArray(j.results) ? (j.results as { url?: string; raw_content?: string }[])[0] : undefined;
  if (!ok?.raw_content) { const f = Array.isArray(j.failed_results) ? (j.failed_results as { error?: string }[])[0] : undefined; throw new SearchError(f?.error || "The page could not be read.", 404); }
  const max = Math.round((o.maxTokens ?? 6000) * 3.5); const text = ok.raw_content.length > max ? `${ok.raw_content.slice(0, max)}\n[page cut here]` : ok.raw_content;
  return { url: ok.url ?? url, title: text.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "").slice(0, 140) ?? url, text };
}
