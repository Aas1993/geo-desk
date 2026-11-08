import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { PRICE } from "@/lib/dossier/cost";
import { cleanCountries, compareRouterSystem, fallbackComparePlan, fallbackPlan, MIN_FAN, parseComparePlanText, parsePlanText, routerSystem, ROUTER_EST } from "@/lib/agent/plan";

export const maxDuration = 60;
const MODEL = process.env.AGENT_ROUTER_MODEL || "claude-haiku-5-5"; const MAX_PER_HOUR = Math.max(1, +(process.env.AGENT_PLANS_PER_HOUR ?? 60) || 60);
const g = globalThis as unknown as { __gdAgentPlans?: number[]; __gdCountryList?: string; __gdCountryNames?: Record<string, string> };
/** THE DESK AGENT'S ROUTER (and the Compare tab's, when `iso3s` lists two to four countries: the plan then fans out, one run per country): reads the request once (a small, cheap model, no web) and returns the plan: which departments, what each is asked, which country, which format. It runs nothing; the user clicks Run after seeing the plan and its cost. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>; const message = typeof b.message === "string" ? b.message.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 1200) : ""; const lang: "en" | "ar" = b.lang === "ar" ? "ar" : "en";
  const isos = cleanCountries(b.iso3s); const compare = Array.isArray(b.iso3s); if (compare && isos.length < MIN_FAN) return Response.json({ error: "bad_request", message: lang === "ar" ? "اختر دولتين على الأقل وأربع دول على الأكثر." : "Choose two to four countries." }, { status: 400 });
  const given = typeof b.iso3 === "string" && /^[A-Za-z]{3}$/.test(b.iso3) && b.iso3.toUpperCase() !== "ARE" ? b.iso3.toUpperCase() : null;
  if (message.length < 4) return Response.json({ error: "bad_request", message: lang === "ar" ? "اكتب سؤالك أو مهمتك." : "Write your question or task." }, { status: 400 });
  const refusal = refusalFor(message); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[lang](refusal) }, { status: 400 });
  const runs = (g.__gdAgentPlans ??= []).filter((t) => Date.now() - t < 3600_000); g.__gdAgentPlans = runs; if (runs.length >= MAX_PER_HOUR) return Response.json({ error: "limit", message: `Limit of ${MAX_PER_HOUR} plans per hour reached (AGENT_PLANS_PER_HOUR).` }, { status: 429 }); runs.push(Date.now());
  try {
    if (!g.__gdCountryList) { const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; name: string }[]; g.__gdCountryList = list.filter((c) => c.iso3 !== "ARE").map((c) => `${c.iso3} ${c.name}`).join("; "); g.__gdCountryNames = Object.fromEntries(list.map((c) => [c.iso3, c.name])); }
    const client = new Anthropic(); let text = ""; let usd = 0;
    try {
      const msg = await client.messages.create({ model: MODEL, max_tokens: 1300, system: [{ type: "text", text: compare ? compareRouterSystem(isos.map((i) => `${i} ${g.__gdCountryNames?.[i] ?? i}`).join("; ")) : routerSystem(g.__gdCountryList), cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: `${compare ? `Countries selected by the user: ${isos.join(", ")}.\n` : given ? `Country selected by the user: ${given}.\n` : ""}Language of the user: ${lang === "ar" ? "Arabic" : "English"}.\nRequest:\n${message}` }] }, { signal: req.signal });
      text = msg.content.map((x) => (x.type === "text" ? x.text : "")).join(""); const p = PRICE[MODEL]; const u = msg.usage; usd = p ? ((u.input_tokens ?? 0) * p.in + (u.output_tokens ?? 0) * p.out + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6 : ROUTER_EST;
    } catch (e) { if (req.signal.aborted) return new Response(null, { status: 499 }); if (e instanceof Anthropic.AuthenticationError || /credit balance/i.test(e instanceof Error ? e.message : "")) throw e; console.error("[agent-plan] router failed, using the keyword fallback:", e instanceof Error ? e.message : e); }
    const plan = compare ? parseComparePlanText(text, message, isos) ?? fallbackComparePlan(message, isos) : parsePlanText(text, message, given) ?? fallbackPlan(message, given);
    return Response.json({ plan, usd: Math.round(usd * 10000) / 10000, model: MODEL });
  } catch (e) { console.error("[agent-plan] failed:", e instanceof Error ? e.message : e); const nocredit = e instanceof Error && /credit balance/i.test(e.message); return Response.json({ error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError ? "no_credentials" : "upstream", message: safeMessage(e) }, { status: 502 }); }
}
