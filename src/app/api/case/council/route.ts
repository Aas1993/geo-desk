import Anthropic from "@anthropic-ai/sdk";
import { concurrentCap, hourlyCap, withBatch, inBatchMode } from "@/lib/dossier/batch";
import { AUDITORS, SUBJECTS, reviewTail } from "@/lib/review/pair";
import { pairReserve, runAuditors } from "@/lib/review/run";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { manifestHash } from "@/lib/deep/consolidate";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { CASE_SYSTEM, CHAIR, caseBase, caseKey, cleanCaseOptions, composeReport, planAgents, roleText, worstCase, type Agent, type AgentId } from "@/lib/case/council";
import { caseFacts } from "@/lib/case/facts";
import { loadCase } from "@/lib/case/load";
import { activate, SEAT_BY } from "@/lib/case/seats";

export const maxDuration = 800;
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // the whole council, every agent together, never spends more than this
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4); const TTL = 6 * 3600_000; const MAX_CONCURRENT = 2;
type AgentOut = { id: AgentId | "revs" | "revr"; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Done = { report: string; agents: AgentOut[]; sources: Source[]; usage: Usage; at: string; model: string; options: unknown; name: string; seats: string[]; manifest: string };
// the hourly cap and the in-flight guard are shared with the dossier route, so a council counts as one new briefing
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, unknown>; running: Set<string>; runs: number[] }; __gdCCouncil?: Map<string, Done> };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set<string>(), runs: [] as number[] }); const cache = (g.__gdCCouncil ??= new Map());

/** THE FALCON EYE Strategic Council: up to twenty seats in four independent group calls, then the debate, the evidence audit and red team and the execution roadmap in parallel, then the Chair. The refusal guard runs first, so a prohibited request costs nothing. */
export const POST = withBatch(async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const iso3 = String(body.iso3 ?? "").toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const refusal = refusalFor(String(body.question ?? "")); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[body.lang === "ar" ? "ar" : "en"](refusal) }, { status: 400 });
  const refresh = body.refresh === true; const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      let key = ""; let slot = 0; let refund = () => {};
      try {
        send({ type: "status", text: "Stage 1 and 2: tasking the council and collecting the shared evidence base…" });
        const [c, snap, res] = await Promise.all([loadCase(iso3), loadSnapshot(iso3).catch(() => null), loadResearch(iso3).catch(() => null)]); if (!c) { send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        const o = cleanCaseOptions(body, c.power.find((p) => p.id === "hard")?.v ?? null); const manifest = manifestHash(snap, null, iso3); key = caseKey(iso3, o, manifest);
        const hit = cache.get(key); if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
        if (store.running.has(key)) { send({ type: "error", error: "busy", message: "This council is already sitting. Try again in a minute." }); return finish(); }
        store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
        if (store.runs.length >= hourlyCap(MAX_PER_HOUR)) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new detailed briefings per hour reached (DOSSIER_MAX_PER_HOUR). Cached results are still free.` }); return finish(); }
        if (store.running.size >= concurrentCap(MAX_CONCURRENT)) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
        slot = Date.now(); store.runs.push(slot); store.running.add(key); refund = () => { const i = store.runs.indexOf(slot); if (i >= 0) store.runs.splice(i, 1); };
        const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
        const gathered = await caseFacts(iso3, c, snap, res?.pubs ?? []); if (!gathered || gathered.facts.length < 8) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: [], gaps: gathered.gaps });
        const base = caseBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options: o });
        const client = new Anthropic(); const out: Partial<Record<AgentId, string>> = {}; const results: AgentOut[] = []; const sources: Source[] = []; const seen = new Set<string>();
        const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 }; let spent = 0; const lang = o.lang; const nameOf = (a: Agent) => (lang === "ar" ? a.ar : a.en);
        const plan = planAgents(o.seats); const effort = (a: Agent): Effort => ENV_EFFORT ?? (a.id === "chair" ? "medium" : "low"); const why = activate(o.question, { all: o.all }).why;
        send({ type: "roster", agents: [...plan.map((a) => ({ id: a.id, name: nameOf(a), stage: a.stage, searches: a.searches, seats: a.seats })), ...AUDITORS.map((a) => ({ id: a.id, name: lang === "ar" ? a.ar : a.en, stage: 9, searches: a.searches }))], seats: o.seats.map((id) => ({ id, name: SEAT_BY.get(id)!.en, why: why[id] ?? "Selected" })) });
        const run1 = async (a: Agent) => {
          send({ type: "agent", id: a.id, status: "start" });
          try {
            const r = await runModelTask({ client, model: MODEL, system: CASE_SYSTEM, firstText: base, roleText: roleText(a, { prior: out, active: o.seats, question: o.question }), budget: { maxTokens: a.maxTokens, searches: a.searches, fetches: 0, fetchTokens: 8000 }, effort: effort(a), maxUsd: CAP, signal: ac.signal, send: (e) => send({ ...e, agent: a.id }), label: `case-${a.id}`, spentBefore: () => spent });
            const usd = r.usage.usd ?? 0; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) total[k] += r.usage[k]; total.usd = spent;
            for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
            const start = r.report.search(/^#{1,3} /m); const text = (start > 0 && a.id !== "chair" ? r.report.slice(start) : r.report).trim(); out[a.id] = text;
            results.push({ id: a.id, name: nameOf(a), text, usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); send({ type: "agent", id: a.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
          } catch (e) { if (ac.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[case-council] ${a.id} failed:`, msg); results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); send({ type: "agent", id: a.id, status: "error", message: msg }); }
        };
        const skipped = (a: Agent, why2: string) => { results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why2 }); send({ type: "agent", id: a.id, status: "skipped", message: why2 }); };
        const stage0 = plan.filter((a) => a.stage === 0); const stage1 = plan.filter((a) => a.stage === 1);
        // the first independent group goes alone so the shared evidence is cached before the others read it
        if (stage0.length && !inBatchMode()) { send({ type: "status", text: "Stage 3: the seat groups are reading the shared evidence together…" }); await Promise.all(stage0.map(run1)); } else if (stage0.length) { send({ type: "status", text: "Stage 3: the first seats are reading the evidence and warming the shared cache…" }); await run1(stage0[0]); if (stage0.length > 1) { send({ type: "status", text: "Stage 3: the other seat groups are working independently in parallel…" }); await Promise.all(stage0.slice(1).map(run1)); } }
        // stages 4 to 6: audit and red team first, then roadmap, then debate; each starts only if its worst case still leaves the Chair's
        const wc = (a: Agent) => worstCase(a) * (inBatchMode() ? 0.55 : 1); /* half-price tokens: a stage that would not fit at the full price can still run, so the saving buys back the debate */ let room = CAP - spent - wc(CHAIR) - pairReserve() * (inBatchMode() ? 0.55 : 1); const go: Agent[] = []; for (const id of ["review", "execution", "debate"] as const) { const a = stage1.find((x) => x.id === id); if (!a) continue; if (room >= wc(a)) { go.push(a); room -= wc(a); } else skipped(a, "would not fit under the cost ceiling"); }
        if (go.length) { send({ type: "status", text: "Stages 4 to 6: debate, adversarial review and the execution roadmap…" }); await Promise.all(go.map(run1)); }
        if (CAP - spent >= worstCase(CHAIR) * 0.7) { send({ type: "status", text: "Stage 7: the Chair is writing the decision and the strategy…" }); await run1(CHAIR); } else skipped(CHAIR, "no money left under the cost ceiling");
        const ordered0 = plan.map((a) => results.find((r) => r.id === a.id)).filter((x): x is AgentOut => !!x);
        const aud = await runAuditors({ client, model: MODEL, system: CASE_SYSTEM, firstText: base, subject: SUBJECTS["case-council"], product: ordered0.some((x) => x.status === "done") ? composeReport(ordered0 as never) : "", lang: lang, cap: CAP, spent, signal: ac.signal, send, label: "case-council", effort: ENV_EFFORT ?? "low", sources, total }); spent = aud.spent; const ordered: AgentOut[] = [...ordered0, ...(aud.outs as AgentOut[])];
        const known = new Set(gathered.facts.map((f) => f.id)); const report = composeReport(ordered0 as never) + (reviewTail(ordered) ? `\n\n${reviewTail(ordered)}` : "").replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => ((ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`));
        const done: Done = { report, agents: ordered, sources, usage: total, at: new Date().toISOString(), model: MODEL, options: { ...o, kind: "casecouncil" }, name: gathered.name, seats: o.seats, manifest };
        if (ordered.some((a) => a.status === "done")) { cache.set(key, done); while (cache.size > 20) cache.delete(cache.keys().next().value as string); }
        send({ type: "done", cached: false, ...done });
      } catch (e) {
        if (req.signal.aborted) return finish();
        console.error("[case-council] run failed:", e instanceof Error ? e.message : e);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message); const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: safeMessage(e) });
      } finally { if (key) store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
});
