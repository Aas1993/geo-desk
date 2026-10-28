import Anthropic from "@anthropic-ai/sdk";
import { renderFacts } from "@/lib/ask/facts";
import { noteText, rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, runModelTask, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";
import { manifestHash } from "@/lib/deep/consolidate";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { caseFacts } from "@/lib/case/facts";
import { loadCase } from "@/lib/case/load";
import { DEFAULT_EMB_FOCUS, DEFAULT_KING_FOCUS, PRODUCTS, checkRefs, citedIds, cleanDeskOptions, deskBase, deskKey, worstOf, type Product } from "@/lib/desk/core";
import { deskExtraFacts } from "@/lib/desk/context";
import { planFor, type Call } from "@/lib/desk/plan";

export const maxDuration = 800;
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); // every call of one run together never spends more than this
const FINAL_RESERVE = 0.9; // the final writer reads every earlier text and may pay for a cold cache, so the earlier calls never spend the share it needs
const LIKELY = 0.6; // a call uses about this share of its worst-case budget (measured 0.4 to 0.7); the ceiling itself is enforced inside runModelTask, so a call that overruns is stopped, never billed past it
const MAX_PER_HOUR = Math.max(1, +(process.env.DOSSIER_MAX_PER_HOUR ?? 4) || 4); const MAX_DIRECTIVES_PER_HOUR = Math.max(1, +(process.env.DESK_MAX_DIRECTIVES_PER_HOUR ?? 12) || 12); const TTL = 6 * 3600_000; const MAX_CONCURRENT = 2;
type CallOut = { id: string; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Done = { product: Product; report: string; agents: CallOut[]; sources: Source[]; usage: Usage; at: string; model: string; options: unknown; name: string; manifest: string; facts: { id: string; kind: string; text: string; src: string; url?: string }[] };
// the hourly cap and the in-flight guard of the full sittings are shared with the dossier, council and Architect routes; directives have their own, higher, hourly cap because they cost about a third as much
const g = globalThis as unknown as { __gdDossier?: { cache: Map<string, unknown>; running: Set<string>; runs: number[] }; __gdDesk?: Map<string, Done>; __gdDeskDir?: { running: Set<string>; runs: number[] } };
const store = (g.__gdDossier ??= { cache: new Map(), running: new Set<string>(), runs: [] as number[] }); const dir = (g.__gdDeskDir ??= { running: new Set<string>(), runs: [] as number[] }); const cache = (g.__gdDesk ??= new Map());

/** THE KING's council and the Embassy council: a click-started run of ten (or thirteen) specialists in sittings and a final writer, or a directive routed to the specialists whose field it touches. The refusal guard runs first, so a prohibited request costs nothing. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const iso3 = String(body.iso3 ?? "").toUpperCase(); const product = String(body.product ?? "") as Product;
  if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE" || !(PRODUCTS as string[]).includes(product)) return Response.json({ error: "bad_request" }, { status: 400 });
  const king = product.startsWith("king"); const directive = product.endsWith("directive"); const o = cleanDeskOptions(body, king ? DEFAULT_KING_FOCUS : DEFAULT_EMB_FOCUS);
  if (directive && o.mode !== "update" && o.topic.length < 4) return Response.json({ error: "bad_request", message: o.lang === "ar" ? "اكتب السؤال أو التوجيه." : "Write the question or the directive." }, { status: 400 });
  const refusal = refusalFor(`${o.focus} ${o.topic}`); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[o.lang](refusal) }, { status: 400 });
  const refresh = body.refresh === true; const enc = new TextEncoder(); const context = o.useContext && typeof body.context === "string" ? noteText(body.context).slice(0, 24_000) : "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      let key = ""; let slot = 0; let refund = () => {}; const pool = directive ? dir : store;
      try {
        send({ type: "status", text: "Collecting the shared evidence base…" });
        const [c, snap, res] = await Promise.all([loadCase(iso3), loadSnapshot(iso3).catch(() => null), loadResearch(iso3).catch(() => null)]); if (!c) { send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        const manifest = manifestHash(snap, null, iso3); key = deskKey(product, iso3, o, manifest, context);
        const hit = cache.get(key); if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
        if (pool.running.has(key)) { send({ type: "error", error: "busy", message: "This is already being written. Try again in a minute." }); return finish(); }
        pool.runs = pool.runs.filter((t) => Date.now() - t < 3600_000); const lim = directive ? MAX_DIRECTIVES_PER_HOUR : MAX_PER_HOUR;
        if (pool.runs.length >= lim) { send({ type: "error", error: "limit", message: `Limit of ${lim} new ${directive ? "directives" : "detailed briefings"} per hour reached (${directive ? "DESK_MAX_DIRECTIVES_PER_HOUR" : "DOSSIER_MAX_PER_HOUR"}). Cached results are still free.` }); return finish(); }
        if (!directive && store.running.size >= MAX_CONCURRENT) { send({ type: "error", error: "busy", message: "Other detailed briefings are being written. Try again in a few minutes." }); return finish(); }
        if (directive && dir.running.size >= 3) { send({ type: "error", error: "busy", message: "Other directives are being worked. Try again in a minute." }); return finish(); }
        slot = Date.now(); pool.runs.push(slot); pool.running.add(key); refund = () => { const i = pool.runs.indexOf(slot); if (i >= 0) pool.runs.splice(i, 1); };
        const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort());
        const gathered = await caseFacts(iso3, c, snap, res?.pubs ?? []); if (gathered) for (const x of deskExtraFacts(c)) gathered.facts.push({ id: `F${gathered.facts.length + 1}`, kind: x.kind, text: x.text, src: x.src });
        if (!gathered || gathered.facts.length < 8) { refund(); send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); }
        send({ type: "facts", count: gathered.facts.length, tiles: [], gaps: gathered.gaps });
        const plan = planFor(product, o, context); const base = deskBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options: o, context, contextLabel: plan.contextLabel });
        const client = new Anthropic(); const out: Record<string, string> = {}; const results: CallOut[] = []; const sources: Source[] = []; const seen = new Set<string>();
        const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 }; let spent = 0; const nameOf = (x: Call) => (o.lang === "ar" ? x.name.ar : x.name.en);
        const effort = (x: Call): Effort => ENV_EFFORT ?? (x.stage === 1 ? "medium" : "low");
        send({ type: "roster", agents: plan.calls.map((x) => ({ id: x.id, name: nameOf(x), stage: x.stage, searches: x.searches })) });
        const run1 = async (x: Call) => {
          send({ type: "agent", id: x.id, status: "start" });
          try {
            const r = await runModelTask({ client, model: MODEL, system: plan.system, firstText: base, roleText: x.role(out), budget: { maxTokens: x.maxTokens, searches: x.searches, fetches: 0, fetchTokens: 8000 }, effort: effort(x), maxUsd: x.stage === 1 ? CAP : CAP - (fin ? worstOf(fin.maxTokens, fin.searches) * FINAL_RESERVE : 0), signal: ac.signal, send: (e) => send({ ...e, agent: x.id }), label: `desk-${product}-${x.id}`, spentBefore: () => spent });
            const usd = r.usage.usd ?? 0; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) total[k] += r.usage[k]; total.usd = spent;
            for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
            const start = r.report.search(/^#{1,3} /m); const text = (start > 0 && x.stage === 0 ? r.report.slice(start) : r.report).trim(); out[x.id] = text;
            results.push({ id: x.id, name: nameOf(x), text, usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); send({ type: "agent", id: x.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
          } catch (e) { if (ac.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[desk] ${product} ${x.id} failed:`, msg); results.push({ id: x.id, name: nameOf(x), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); send({ type: "agent", id: x.id, status: "error", message: msg }); }
        };
        const skipped = (x: Call, why: string) => { results.push({ id: x.id, name: nameOf(x), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why }); send({ type: "agent", id: x.id, status: "skipped", message: why }); };
        const stage0 = plan.calls.filter((x) => x.stage === 0); const fin = plan.calls.find((x) => x.stage === 1);
        // the first call goes alone so the shared evidence is cached before the others read it
        if (stage0.length) { send({ type: "status", text: stage0.length > 1 ? "The first sitting is reading the evidence and warming the shared cache…" : "Working…" }); await run1(stage0[0]); }
        if (stage0.length > 1) {
          const room = CAP - spent - (fin ? worstOf(fin.maxTokens, fin.searches) * LIKELY : 0); let used = 0; const go: Call[] = [];
          for (const x of stage0.slice(1)) { const w = worstOf(x.maxTokens, x.searches) * LIKELY; if (used + w <= room) { used += w; go.push(x); } else skipped(x, "no money left under the cost ceiling"); }
          if (go.length) { send({ type: "status", text: `${go.length} more sitting${go.length === 1 ? " is" : "s are"} working in parallel…` }); await Promise.all(go.map(run1)); }
        }
        if (fin) { if (CAP - spent >= worstOf(fin.maxTokens, fin.searches) * LIKELY) { send({ type: "status", text: "Writing the final product…" }); await run1(fin); } else skipped(fin, "no money left under the cost ceiling"); }
        const ordered = plan.calls.map((x) => results.find((r) => r.id === x.id)).filter((x): x is CallOut => !!x);
        const known = new Set(gathered.facts.map((f) => f.id)); const report = checkRefs(plan.compose(ordered.map((r) => ({ id: r.id, text: r.text }))), known); const cited = new Set(citedIds(report));
        const done: Done = { product, report, agents: ordered, sources, usage: total, at: new Date().toISOString(), model: MODEL, options: { ...o, kind: product, context: undefined }, name: gathered.name, manifest, facts: gathered.facts.filter((f) => cited.has(f.id)).map((f) => ({ id: f.id, kind: f.kind, text: f.text.slice(0, 1600), src: f.src, url: f.url })) };
        if (ordered.some((a) => a.status === "done")) { cache.set(key, done); while (cache.size > 30) cache.delete(cache.keys().next().value as string); } else refund();
        send({ type: "done", cached: false, ...done });
      } catch (e) {
        if (req.signal.aborted) return finish();
        console.error("[desk] run failed:", e instanceof Error ? e.message : e);
        const nocredit = e instanceof Error && /credit balance/i.test(e.message); const authish = e instanceof Error && /authentication|api key|credential|x-api-key|oauth|refresh token|invalid_grant|expired/i.test(e.message);
        send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || authish ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: safeMessage(e) });
      } finally { if (key) pool.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
