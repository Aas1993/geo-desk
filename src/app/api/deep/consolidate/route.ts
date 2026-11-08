import { rejectCrossSite } from "@/lib/guard";
import { MODULES, consolidate, manifestHash, type ModuleId } from "@/lib/deep/consolidate";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { lookupRun, storeRun } from "@/lib/deep/run-store";
import { oneLine } from "@/lib/guard";
import { refusalFor, REFUSAL_TEXT } from "@/lib/machiavelli/guard";

export const maxDuration = 60;
/** POST /api/deep/consolidate: Full Consolidated Intelligence. The server derives everything from its own datasets (the client sends only the question and filters), freezes a manifest, and streams the run's states.
 *  An identical request over unchanged data returns the existing run (idempotency: no duplicate work, no duplicate record). A partial or failed run is never reused, so a retry actually retries. */
export async function POST(req: Request) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>; const raw = String(body.iso3 ?? "").toUpperCase(); if (raw && !/^[A-Z]{3}$/.test(raw)) return Response.json({ error: "bad_request" }, { status: 400 });
  const iso3 = raw && raw !== "ARE" ? raw : null; const lang = body.lang === "ar" ? "ar" : "en"; const question = oneLine(typeof body.question === "string" ? body.question.trim() : "", 500) || "What should the UAE decide, and what would change that decision?";
  const refusal = refusalFor(question); if (refusal) return Response.json({ error: "bad_request", message: REFUSAL_TEXT[lang](refusal) }, { status: 400 });
  const h = Number(body.horizonYears); const horizonYears = Number.isFinite(h) ? Math.min(30, Math.max(1, Math.round(h))) : 3; const audience = (["ministerial", "analyst", "executive"] as const).find((a) => a === body.audience) ?? "analyst";
  const asked = Array.isArray(body.modules) ? (body.modules as unknown[]).filter((m): m is ModuleId => MODULES.some((x) => x.id === m)) : []; const modules: ModuleId[] | "all" = asked.length && asked.length < MODULES.length ? asked : "all";
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      const send = (e: Record<string, unknown>) => { try { c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const end = () => { try { c.close(); } catch {} };
      try {
        send({ type: "state", state: "estimating", costUsd: 0, modules: (modules === "all" ? MODULES.map((m) => m.id) : modules), note: "The rule-based consolidation costs nothing and takes a few seconds; the paid analyst team is a separate, click-started step." });
        send({ type: "state", state: "collecting" });
        const [snapshot, res] = await Promise.all([loadSnapshot(iso3), loadResearch(iso3).then((r) => ({ ok: true as const, r })).catch((e) => ({ ok: false as const, e: e instanceof Error ? e.message.slice(0, 120) : "unreachable" }))]);
        send({ type: "state", state: "analyzing" });
        const research = res.ok ? { pubs: res.r.pubs, status: res.r.status, fetchedAt: res.r.fetchedAt } : null; const prior = body.compareWith ? lookupRun(String(body.compareWith)) : null;
        const built = consolidate({ question, iso3, horizonYears, audience, lang, modules, snapshot, research, researchError: res.ok ? undefined : res.e, now: new Date(), version: (prior?.version ?? 0) + 1 });
        send({ type: "state", state: "verifying" });
        const existing = lookupRun(built.idem);
        if (existing && existing.status !== "partial" && existing.status !== "failed" && body.refresh !== true) { send({ type: "done", reused: true, run: existing, manifestNow: manifestHash(snapshot, research, iso3) }); return end(); }
        for (const m of built.modules) send({ type: "module", id: m.id, state: m.state });
        storeRun(built); send({ type: "done", reused: false, run: built, manifestNow: built.manifest.hash });
      } catch (e) { console.error("[deep/consolidate]", e instanceof Error ? e.message : e); send({ type: "error", error: "upstream", message: "The consolidation could not be completed." }); }
      finally { end(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
/** GET /api/deep/consolidate?id=: the stored run, if this process still holds it. */
export async function GET(req: Request) { const r = lookupRun(new URL(req.url).searchParams.get("id") ?? ""); return r ? Response.json(r) : Response.json({ error: "not_found", message: "This run is no longer held by the server: run it again." }, { status: 404 }); }
