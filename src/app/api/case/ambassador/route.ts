import Anthropic from "@anthropic-ai/sdk";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { manifestHash } from "@/lib/deep/consolidate";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { councilDigest } from "@/lib/case/architect";
import { AMB_AGENTS, AMB_BY, AMB_SYSTEM, ambBase, ambFactsBlock, ambKey, ambRole, ambWorst, cleanAmbOptions, composeAmbassador, type AmbAgent, type AmbId } from "@/lib/case/ambassador";
import { caseFacts } from "@/lib/case/facts";
import { loadCase } from "@/lib/case/load";

export const maxDuration = 800;
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // the whole Ambassador run, every agent together, never spends more than this
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4); const TTL = 6 * 3600_000; const MAX_CONCURRENT = 2;
type AgentOut = { id: AmbId; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Done = { report: string; agents: AgentOut[]; sources: Source[]; usage: Usage; at: string; model: string; options: unknown; name: string; manifest: string; usedCouncil: boolean };
// the hourly cap and the in-flight guard are shared with the dossier and council routes, so an Architect run counts as one new briefing
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, unknown>; running: Set<string>; runs: number[] }; __gdAmbassador?: Map<string, Done> };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set<string>(), runs: [] as number[] }); const cache = (g.__gdAmbassador ??= new Map());

/** The Ambassador's desk: five advisers wearing different hats (investments first; the first alone to warm the shared cache, then four in parallel) and an editor who writes the brief, the 100-day, one-year and three-year plans and the structured data. The refusal guard runs first, so a prohibited request costs nothing. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const iso3 = String(body.iso3 ?? "").toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return Response.json({ error: "bad_request" }, { status: 400 });
  const refusal = refusalFor(String(body.focus ?? "")); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[body.lang === "ar" ? "ar" : "en"](refusal) }, { status: 400 });
  const refresh = body.refresh === true; const enc = new TextEncoder(); const councilReport = typeof body.councilReport === "string" ? body.councilReport.slice(0, 60_000) : "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      let key = ""; let slot = 0; let refund = () => {};
      try {
        send({ type: "status", text: "Collecting the shared evidence base…" });
        const [c, snap, res] = await Promise.all([loadCase(iso3), loadSnapshot(iso3).catch(() => null), loadResearch(iso3).catch(() => null)]); if (!c) { send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        const o = cleanAmbOptions(body); const digest = o.useCouncil ? councilDigest(councilReport) : ""; const manifest = manifestHash(snap, null, iso3); key = ambKey(iso3, o, manifest, digest);
        const hit = cache.get(key); if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
        if (store.running.has(key)) { send({ type: "error", error: "busy", message: "This strategy is already being written. Try again in a minute." }); return finish(); }
        store.runs = store.runs.filter((t) => Date.now() - t < 3600_000);
        if (store.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} new detailed briefings per hour reached (DOSSIER_MAX_PER_HOUR). Cached results are still free.` }); return finish(); }
        if (store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
        slot = Date.now(); store.runs.push(slot); store.running.add(key); refund = () => { const i = store.runs.indexOf(slot); if (i >= 0) store.runs.splice(i, 1); };
        const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
        const gathered = await caseFacts(iso3, c, snap, res?.pubs ?? []); if (gathered) for (const x of ambFactsBlock(c)) gathered.facts.push({ id: `F${gathered.facts.length + 1}`, kind: x.kind, text: x.text, src: x.src }); if (!gathered || gathered.facts.length < 8) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: [], gaps: gathered.gaps });
        const base = ambBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options: o, digest });
        const client = new Anthropic(); const out: Partial<Record<AmbId, string>> = {}; const results: AgentOut[] = []; const sources: Source[] = []; const seen = new Set<string>();
        const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 }; let spent = 0; const lang = o.lang; const nameOf = (a: AmbAgent) => (lang === "ar" ? a.ar : a.en);
        const effort = (a: AmbAgent): Effort => ENV_EFFORT ?? (a.id === "EDIT" ? "medium" : "low");
        send({ type: "roster", agents: AMB_AGENTS.map((a) => ({ id: a.id, name: nameOf(a), stage: a.stage, searches: a.searches, hats: a.hats })), usedCouncil: !!digest });
        const run1 = async (a: AmbAgent) => {
          send({ type: "agent", id: a.id, status: "start" });
          try {
            const r = await runModelTask({ client, model: MODEL, system: AMB_SYSTEM, firstText: base, roleText: ambRole(a, out), budget: { maxTokens: a.maxTokens, searches: a.searches, fetches: 0, fetchTokens: 8000 }, effort: effort(a), maxUsd: CAP, signal: ac.signal, send: (e) => send({ ...e, agent: a.id }), label: `amb-${a.id}`, spentBefore: () => spent });
            const usd = r.usage.usd ?? 0; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) total[k] += r.usage[k]; total.usd = spent;
            for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
            const start = r.report.search(/^#{1,3} /m); const text = (start > 0 && a.id !== "EDIT" ? r.report.slice(start) : r.report).trim(); out[a.id] = text;
            results.push({ id: a.id, name: nameOf(a), text, usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); send({ type: "agent", id: a.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
          } catch (e) { if (ac.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[case-ambassador] ${a.id} failed:`, msg); results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); send({ type: "agent", id: a.id, status: "error", message: msg }); }
        };
        const skipped = (a: AmbAgent, why: string) => { results.push({ id: a.id, name: nameOf(a), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why }); send({ type: "agent", id: a.id, status: "skipped", message: why }); };
        const stage0 = AMB_AGENTS.filter((a) => a.stage === 0); const EDIT = AMB_BY.get("EDIT")!;
        // the first adviser goes alone so the shared evidence is cached before the others read it
        send({ type: "status", text: "The investment adviser is reading the evidence and warming the shared cache…" }); await run1(stage0[0]);
        send({ type: "status", text: "Four advisers are working in parallel: who to know, the hats, neighbours and scenarios, research and narrative…" }); await Promise.all(stage0.slice(1).map(run1));
        if (CAP - spent >= ambWorst(EDIT) * 0.7) { send({ type: "status", text: "The editor is writing the brief and the three plans…" }); await run1(EDIT); } else skipped(EDIT, "no money left under the cost ceiling");
        const ordered = AMB_AGENTS.map((a) => results.find((r) => r.id === a.id)).filter((x): x is AgentOut => !!x);
        const known = new Set(gathered.facts.map((f) => f.id)); const report = composeAmbassador(ordered).replace(/\[(F\d+(?:\s*[,–-]\s*F?\d+)*)\]/g, (m, ids: string) => ((ids.match(/\d+/g) ?? []).every((n) => known.has(`F${n}`)) ? m : `[unverified reference ${ids}]`));
        const done: Done = { report, agents: ordered, sources, usage: total, at: new Date().toISOString(), model: MODEL, options: { ...o, kind: "ambassador" }, name: gathered.name, manifest, usedCouncil: !!digest };
        if (ordered.some((a) => a.status === "done")) { cache.set(key, done); while (cache.size > 20) cache.delete(cache.keys().next().value as string); }
        send({ type: "done", cached: false, ...done });
      } catch (e) {
        if (req.signal.aborted) return finish();
        console.error("[case-ambassador] run failed:", e instanceof Error ? e.message : e);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message); const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: safeMessage(e) });
      } finally { if (key) store.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
