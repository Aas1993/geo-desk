import Anthropic from "@anthropic-ai/sdk";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { PRICE } from "@/lib/dossier/cost";
import { FORMAT_BY } from "@/lib/agent/catalog";
import { COMPOSE_SYSTEM } from "@/lib/agent/plan";

export const maxDuration = 180;
const MODEL = process.env.AGENT_COMPOSE_MODEL || process.env.DOSSIER_MODEL || "claude-sonnet-5-5"; const MAX_PER_HOUR = Math.max(1, +(process.env.AGENT_ANSWERS_PER_HOUR ?? 30) || 30); const CAP_USD = 0.25;
const g = globalThis as unknown as { __gdAgentAnswers?: number[] };
const clean = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").slice(0, n) : "");
/** THE DESK AGENT'S WRITER: takes what the departments wrote and the user's request and writes the answer in the format asked, adding nothing. No web, no tools; a few cents; capped. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>; const lang: "en" | "ar" = b.lang === "ar" ? "ar" : "en"; const message = clean(b.message, 1200).trim(); const iso3 = /^[A-Z]{3}$/.test(String(b.iso3 ?? "")) ? String(b.iso3) : ""; const country = clean(b.country, 80);
  const format = FORMAT_BY.get(clean(b.format, 12)) ?? FORMAT_BY.get("answer")!; const length = b.length === "short" ? "short" : b.length === "long" ? "long" : "standard"; const notes = clean(b.notes, 300);
  const sources = (Array.isArray(b.sources) ? b.sources : []).slice(0, 4).map((s) => { const o = (s ?? {}) as Record<string, unknown>; return { name: clean(o.name, 80), text: clean(o.text, 11_000).trim() }; }).filter((s) => s.text.length > 20);
  if (message.length < 4 || !sources.length) return Response.json({ error: "bad_request", message: "A request and at least one department text are needed." }, { status: 400 });
  const refusal = refusalFor(`${message} ${notes}`); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[lang](refusal) }, { status: 400 });
  const runs = (g.__gdAgentAnswers ??= []).filter((t) => Date.now() - t < 3600_000); g.__gdAgentAnswers = runs; if (runs.length >= MAX_PER_HOUR) return Response.json({ error: "limit", message: `Limit of ${MAX_PER_HOUR} answers per hour reached (AGENT_ANSWERS_PER_HOUR).` }, { status: 429 }); runs.push(Date.now());
  const maxTokens = length === "short" ? 1600 : length === "long" ? 5200 : 3000;
  try {
    const client = new Anthropic(); const user = `<request>\nUser's request: ${message}\nCountry: ${country || iso3 || "none"}\nFormat: ${format.en}. ${format.rule}\nLength: ${length}.${notes ? `\nOther wishes about the form: ${notes}` : ""}\nWrite the answer in ${lang === "ar" ? "Arabic (keep figures, fact ids, names of institutions exact)" : "English"}.\n</request>\n\n${sources.map((s, i) => `<department_text n="${i + 1}" name="${s.name}">\n${s.text}\n</department_text>`).join("\n\n")}`;
    const msg = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system: [{ type: "text", text: COMPOSE_SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }], output_config: { effort: "low" } }, { signal: req.signal });
    const text = msg.content.map((x) => (x.type === "text" ? x.text : "")).join("").trim(); const p = PRICE[MODEL]; const u = msg.usage; const usd = p ? ((u.input_tokens ?? 0) * p.in + (u.output_tokens ?? 0) * p.out + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6 : 0.08;
    if (!text) return Response.json({ error: "empty", message: "The writer returned nothing. Try again." }, { status: 502 });
    return Response.json({ text, truncated: msg.stop_reason === "max_tokens", usd: Math.round(usd * 10000) / 10000, model: MODEL, capUsd: CAP_USD });
  } catch (e) { if (req.signal.aborted) return new Response(null, { status: 499 }); console.error("[agent-compose] failed:", e instanceof Error ? e.message : e); const nocredit = e instanceof Error && /credit balance/i.test(e.message); return Response.json({ error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError ? "no_credentials" : "upstream", message: safeMessage(e) }, { status: 502 }); }
}
