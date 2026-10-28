import Anthropic from "@anthropic-ai/sdk";
import { AUDITORS, SUBJECTS, reviewTail } from "@/lib/review/pair";
import { pairReserve, runAuditors } from "@/lib/review/run";
import { foresightDossierFacts } from "@/lib/dossier/facts";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { scopeFacts } from "@/lib/falcon/scope-facts";
import { isScope, scopeLine } from "@/lib/falcon/scopes";
import { AGENTS, AGENT_BY, COUNCIL_SYSTEM, cleanCouncilOptions, composeReport, councilBase, councilKey, parsePlan, roleText, worstCase, type Agent, type AgentId } from "@/lib/falcon/council";

export const maxDuration = 800; // a council researches and writes for several minutes
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // one council, all its agents together, never spends more than this
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4); const TTL = 6 * 3600_000; const MAX_CONCURRENT = 2;
type AgentOut = { id: AgentId | "revs" | "revr"; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Done = { report: string; agents: AgentOut[]; sources: Source[]; tiles: unknown[]; usage: Usage; at: string; model: string; options: unknown; name: string };
// the hourly cap and the in-flight guard are shared with the dossier route, so a council counts as one new briefing
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, unknown>; running: Set<string>; runs: number[] }; __gdCouncil?: Map<string, Done> };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set<string>(), runs: [] as number[] }); const cache = (g.__gdCouncil ??= new Map());

export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const iso3 = String(body.iso3 ?? "").toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const o = cleanCouncilOptions(body); const key = councilKey(iso3, o); const refresh = body.refresh === true; const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      const hit = cache.get(key); if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
      if (store.running.has(key)) { send({ type: "error", error: "busy", message: "This council is already sitting. Try again in a minute." }); return finish(); }
      store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
      if (store.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new detailed briefings per hour reached (DOSSIER_MAX_PER_HOUR). Cached results are still free.` }); return finish(); }
      if (store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
      const slot = Date.now(); store.runs.push(slot); store.running.add(key); const refund = () => { const i = store.runs.indexOf(slot); if (i >= 0) store.runs.splice(i, 1); };
      const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
      try {
        send({ type: "status", text: "Collecting the shared evidence base…" });
        const gathered = isScope(iso3) ? await scopeFacts(iso3) : await foresightDossierFacts(iso3); if (!gathered) { refund(); send({ type: "error", error: "not_found", message: "Unknown country or scope." }); return finish(); }
        if (gathered.facts.length < 6) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: gathered.tiles, gaps: gathered.gaps });
        const base = councilBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options: o, scopeNote: isScope(iso3) ? scopeLine(iso3) : undefined });
        const client = new Anthropic(); const out: Partial<Record<AgentId, string>> = {}; const results: AgentOut[] = []; const sources: Source[] = []; const seen = new Set<string>();
        const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 }; let spent = 0;
        const lang = o.lang; const nameOf = (a: Agent) => (lang === "ar" ? a.ar : a.en);
        const effort = (a: Agent): Effort => ENV_EFFORT ?? (a.id === "editor" ? "medium" : "low");
        send({ type: "roster", agents: [...AGENTS.map((a) => ({ id: a.id, name: nameOf(a), stage: a.stage, searches: a.searches })), ...AUDITORS.map((a) => ({ id: a.id, name: lang === "ar" ? a.ar : a.en, stage: 9, searches: a.searches }))] });
        const run = async (a: Agent, questions?: string) => {
          send({ type: "agent", id: a.id, status: "start" });
          try {
            const r = await runModelTask({ client, model: MODEL, system: COUNCIL_SYSTEM, firstText: base, roleText: roleText(a, { questions, prior: out }), budget: { maxTokens: a.maxTokens, searches: a.searches, fetches: 0, fetchTokens: 8000 }, effort: effort(a), maxUsd: CAP, signal: ac.signal, send: (e) => send({ ...e, agent: a.id }), spentBefore: () => spent, label: `council:${a.id}` });
            const usd = r.usage.usd ?? 0; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) total[k] += r.usage[k]; total.usd = spent;
            for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
            const start = r.report.search(/^#{1,2} /m); const text = (start > 0 && a.id !== "editor" ? r.report.slice(start) : r.report).trim(); out[a.id] = text;
            results.push({ id: a.id, name: nameOf(a), text, usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); send({ type: "agent", id: a.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
          } catch (e) { if (ac.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[council] ${a.id} failed:`, msg); results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); send({ type: "agent", id: a.id, status: "error", message: "This agent failed; the council continues without it." }); }
        };
        const skipped = (a: Agent, why: string) => { results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why }); send({ type: "agent", id: a.id, status: "skipped", message: why }); };
        const A = (id: AgentId) => AGENT_BY.get(id)!;
        // stage 0: the plan
        await run(A("orchestrator")); const plan = parsePlan(out.orchestrator ?? "");
        // stage 1: the four specialists in parallel, skipping any the plan calls irrelevant
        send({ type: "status", text: "The specialists are working in parallel…" });
        await Promise.all((["geo", "econ", "energy", "tech"] as const).map((id) => (plan.skip.includes(id) ? Promise.resolve(skipped(A(id), "the plan judged it irrelevant here")) : run(A(id), plan.questions[id]))));
        // stage 2: the UAE analyst and the foresight analyst read the specialists
        await Promise.all([run(A("uae")), run(A("foresight"))]);
        // stage 3: the challenge and the check, only if they still fit under the ceiling with the editor
        const room = CAP - spent - worstCase(A("editor")) - pairReserve(); const both = worstCase(A("redteam")) + worstCase(A("verifier"));
        if (room >= both) await Promise.all([run(A("redteam")), run(A("verifier"))]); else if (room >= worstCase(A("redteam"))) { await run(A("redteam")); skipped(A("verifier"), "would not fit under the cost ceiling"); } else { skipped(A("redteam"), "would not fit under the cost ceiling"); skipped(A("verifier"), "would not fit under the cost ceiling"); }
        // stage 4: the editor writes the product
        if (CAP - spent >= worstCase(A("editor")) * 0.7) await run(A("editor")); else skipped(A("editor"), "no money left under the cost ceiling");
        const ordered0 = AGENTS.map((a) => results.find((r) => r.id === a.id)).filter((x): x is AgentOut => !!x);
        const aud = await runAuditors({ client, model: MODEL, system: COUNCIL_SYSTEM, firstText: base, subject: SUBJECTS["falcon"], product: ordered0.some((x) => x.status === "done") ? composeReport(ordered0 as never, lang) : "", lang: lang, cap: CAP, spent, signal: ac.signal, send, label: "falcon-council", effort: ENV_EFFORT ?? "low", sources, total }); spent = aud.spent; const ordered: AgentOut[] = [...ordered0, ...(aud.outs as AgentOut[])];
        const known = new Set(gathered.facts.map((f) => f.id)); const report = composeReport(ordered0 as never, lang) + (reviewTail(ordered) ? `\n\n${reviewTail(ordered)}` : "").replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => ((ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`));
        const done: Done = { report, agents: ordered, sources, tiles: gathered.tiles, usage: total, at: new Date().toISOString(), model: MODEL, options: { ...o, kind: "council" }, name: gathered.name };
        if (ordered.some((a) => a.status === "done")) { cache.set(key, done); while (cache.size > 20) cache.delete(cache.keys().next().value as string); }
        send({ type: "done", cached: false, ...done });
      } catch (e) {
        if (ac.signal.aborted) return finish();
        console.error("[council] run failed:", e instanceof Error ? e.message : e);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message); const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: safeMessage(e) });
      } finally { store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
