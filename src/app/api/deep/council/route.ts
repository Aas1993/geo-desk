import Anthropic from "@anthropic-ai/sdk";
import { AUDITORS, SUBJECTS, reviewTail } from "@/lib/review/pair";
import { pairReserve, runAuditors } from "@/lib/review/run";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { DAGENTS, DAGENT_BY, DCOUNCIL_SYSTEM, cleanDOptions, dComposeReport, dCouncilBase, dCouncilKey, dRoleText, dWorstCase, planAgents, type DAgent, type DAgentId } from "@/lib/deep/council";
import { consolidate, manifestHash } from "@/lib/deep/consolidate";
import { deepFacts } from "@/lib/deep/facts";
import { loadResearch } from "@/lib/deep/research";
import { selectRoles } from "@/lib/deep/routing";
import { loadSnapshot } from "@/lib/deep/snapshot";

export const maxDuration = 800;
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // one team, all its agents together, never spends more than this
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4); const TTL = 6 * 3600_000; const MAX_CONCURRENT = 2;
type AgentOut = { id: DAgentId | "revs" | "revr"; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Done = { report: string; agents: AgentOut[]; sources: Source[]; usage: Usage; at: string; model: string; options: unknown; name: string; roles: unknown; manifest: string };
// the hourly cap and the in-flight guard are shared with the dossier route, so a team counts as one new briefing
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, unknown>; running: Set<string>; runs: number[] }; __gdDCouncil?: Map<string, Done> };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set<string>(), runs: [] as number[] }); const cache = (g.__gdDCouncil ??= new Map());

/** The Deep Intelligence analyst team: the roles the routing rule selects (in at most three specialist runs), the independent challenger and the verifier in parallel, then the chair. The refusal guard runs first, so a prohibited request costs nothing. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const raw = String(body.iso3 ?? "ARE").toUpperCase(); if (!/^[A-Z]{3}$/.test(raw)) return Response.json({ error: "bad_request" }, { status: 400 });
  const iso3 = raw === "ARE" ? null : raw; const refusal = refusalFor(String(body.question ?? ""));
  if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[body.lang === "ar" ? "ar" : "en"](refusal) }, { status: 400 });
  const refresh = body.refresh === true; const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      let key = ""; let slot = 0; let refund = () => {};
      try {
        send({ type: "status", text: "Collecting the shared data snapshot and the research cards…" });
        const [snap, res] = await Promise.all([loadSnapshot(iso3), loadResearch(iso3).catch(() => null)]); const pubs = res?.pubs ?? [];
        const run = consolidate({ question: String(body.question ?? ""), iso3, horizonYears: 3, audience: "analyst", lang: body.lang === "ar" ? "ar" : "en", modules: "all", snapshot: snap, research: res ? { pubs, status: res.status, fetchedAt: res.fetchedAt } : null, researchError: res ? undefined : "research sources unreachable", now: new Date() });
        const flags = { macro: snap.readings.some((r) => ["I01", "I03", "I05", "I06"].includes(r.id) && r.state !== "ok" && r.state !== "na"), financial: snap.readings.some((r) => ["I07", "I08", "I09", "I12"].includes(r.id) && r.state !== "ok" && r.state !== "na"), trade: !!iso3 };
        const o0 = cleanDOptions(body, []); const picked = selectRoles({ question: o0.question, iso3, horizonYears: o0.horizonYears, hasResearch: pubs.length > 0, flags, consequential: body.consequential !== false });
        const o = cleanDOptions(body, picked.roles); key = dCouncilKey(iso3, o, manifestHash(snap, res ? { pubs, status: res.status, fetchedAt: res.fetchedAt } : null, iso3));
        const hit = cache.get(key); if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
        if (store.running.has(key)) { send({ type: "error", error: "busy", message: "This team is already sitting. Try again in a minute." }); return finish(); }
        store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
        if (store.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new detailed briefings per hour reached (DOSSIER_MAX_PER_HOUR). Cached results are still free.` }); return finish(); }
        if (store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
        slot = Date.now(); store.runs.push(slot); store.running.add(key); refund = () => { const i = store.runs.indexOf(slot); if (i >= 0) store.runs.splice(i, 1); };
        const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
        const gathered = deepFacts(snap, pubs, run); if (gathered.facts.length < 8) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); }
        const name = snap.name ?? "the UAE"; send({ type: "facts", count: gathered.facts.length, tiles: [], gaps: gathered.gaps });
        const base = dCouncilBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), subject: iso3 ? `UAE and ${name}` : "UAE", options: o });
        const client = new Anthropic(); const out: Partial<Record<DAgentId, string>> = {}; const results: AgentOut[] = []; const sources: Source[] = []; const seen = new Set<string>();
        const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 }; let spent = 0; const lang = o.lang; const nameOf = (a: DAgent) => (lang === "ar" ? a.ar : a.en);
        const plan = planAgents(o.roles, o.mode); const team = DAGENTS.filter((a) => plan.includes(a.id)); const effort = (a: DAgent): Effort => ENV_EFFORT ?? (a.id === "chair" ? "medium" : "low");
        send({ type: "roster", agents: [...team.map((a) => ({ id: a.id, name: nameOf(a), stage: a.stage, searches: a.searches })), ...AUDITORS.map((a) => ({ id: a.id, name: lang === "ar" ? a.ar : a.en, stage: 9, searches: a.searches }))], roles: picked.why });
        const run1 = async (a: DAgent) => {
          send({ type: "agent", id: a.id, status: "start" });
          try {
            const r = await runModelTask({ client, model: MODEL, system: DCOUNCIL_SYSTEM, firstText: base, roleText: dRoleText(a, { prior: out, roles: o.roles }), budget: { maxTokens: a.maxTokens, searches: a.searches, fetches: a.fetches, fetchTokens: 8000 }, effort: effort(a), maxUsd: CAP, signal: ac.signal, send: (e) => send({ ...e, agent: a.id }), label: a.id, spentBefore: () => spent });
            const usd = r.usage.usd ?? 0; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) total[k] += r.usage[k]; total.usd = spent;
            for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
            const start = r.report.search(/^#{1,3} /m); const text = (start > 0 && a.id !== "chair" ? r.report.slice(start) : r.report).trim(); out[a.id] = text;
            results.push({ id: a.id, name: nameOf(a), text, usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); send({ type: "agent", id: a.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
          } catch (e) { if (ac.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[deep-council] ${a.id} failed:`, msg); results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); send({ type: "agent", id: a.id, status: "error", message: msg }); }
        };
        const skipped = (a: DAgent, why: string) => { results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why }); send({ type: "agent", id: a.id, status: "skipped", message: why }); };
        const A = (id: DAgentId) => DAGENT_BY.get(id)!; const stage0 = team.filter((a) => a.stage === 0);
        // the first specialist run goes alone so the shared evidence is cached before the others read it: parallel starts would each pay to write the same prefix
        if (stage0.length) { send({ type: "status", text: "The first analysts are reading the evidence and warming the shared cache…" }); await run1(stage0[0]); if (stage0.length > 1) { send({ type: "status", text: "The other analysts are working in parallel…" }); await Promise.all(stage0.slice(1).map(run1)); } }
        const hasCh = plan.includes("challenger"); const hasChair = plan.includes("chair"); const room = CAP - spent - (hasChair ? dWorstCase(A("chair")) : 0) - pairReserve(); const both = (hasCh ? dWorstCase(A("challenger")) : 0) + dWorstCase(A("verifier"));
        if (room >= both) await Promise.all([...(hasCh ? [run1(A("challenger"))] : []), run1(A("verifier"))]);
        else { if (hasCh && room >= dWorstCase(A("challenger"))) { await run1(A("challenger")); skipped(A("verifier"), "would not fit under the cost ceiling"); } else { if (hasCh) skipped(A("challenger"), "would not fit under the cost ceiling"); if (room >= dWorstCase(A("verifier"))) await run1(A("verifier")); else skipped(A("verifier"), "would not fit under the cost ceiling"); } }
        if (hasChair) { if (CAP - spent >= dWorstCase(A("chair")) * 0.7) await run1(A("chair")); else skipped(A("chair"), "no money left under the cost ceiling"); }
        const ordered0 = team.map((a) => results.find((r) => r.id === a.id)).filter((x): x is AgentOut => !!x);
        const aud = await runAuditors({ client, model: MODEL, system: DCOUNCIL_SYSTEM, firstText: base, subject: SUBJECTS["deep"], product: ordered0.some((x) => x.status === "done") ? dComposeReport(ordered0 as never, o.mode) : "", lang: o.lang, cap: CAP, spent, signal: ac.signal, send, label: "deep-council", effort: ENV_EFFORT ?? "low", sources, total }); spent = aud.spent; const ordered: AgentOut[] = [...ordered0, ...(aud.outs as AgentOut[])];
        const known = new Set(gathered.facts.map((f) => f.id)); const report = dComposeReport(ordered0 as never, o.mode) + (reviewTail(ordered) ? `\n\n${reviewTail(ordered)}` : "").replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => ((ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`));
        const done: Done = { report, agents: ordered, sources, usage: total, at: new Date().toISOString(), model: MODEL, options: { ...o, kind: "deepcouncil" }, name, roles: picked.why, manifest: run.manifestId };
        if (ordered.some((a) => a.status === "done")) { cache.set(key, done); while (cache.size > 20) cache.delete(cache.keys().next().value as string); }
        send({ type: "done", cached: false, ...done });
      } catch (e) {
        if (req.signal.aborted) return finish();
        console.error("[deep-council] run failed:", e instanceof Error ? e.message : e);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message); const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: safeMessage(e) });
      } finally { if (key) store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
