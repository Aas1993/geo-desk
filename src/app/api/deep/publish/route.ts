import { rejectCrossSite } from "@/lib/guard";
import { approve, canPublish, manifestHash } from "@/lib/deep/consolidate";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { oneLine } from "@/lib/guard";
import { lookupRun, storeRun } from "@/lib/deep/run-store";

/** POST /api/deep/publish: records a named reviewer's approval of a consolidation. It checks, on the server and against the data as it is NOW, that a reviewer is named, that the data behind the run has not changed since it was made (FE-AC19) and that no module failed; a stale or partial run is refused. Approving twice returns the same record (idempotent). */
export async function POST(req: Request) {
  const bad = rejectCrossSite(req); if (bad) return bad;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>; const run = lookupRun(String(b.id ?? "")); if (!run) return Response.json({ error: "not_found", message: "This run is no longer held by the server: run it again." }, { status: 404 });
  if (run.review) return Response.json({ run, already: true });
  const by = oneLine(typeof b.reviewer === "string" ? b.reviewer : "", 80); if (!by) return Response.json({ error: "no_reviewer", message: "A named reviewer is required." }, { status: 400 });
  const [snap, res] = await Promise.all([loadSnapshot(run.scope.iso3), loadResearch(run.scope.iso3).catch(() => null)]);
  const now = manifestHash(snap, res ? { pubs: res.pubs, status: res.status, fetchedAt: res.fetchedAt } : null, run.scope.iso3);
  const approved = approve(run, by, oneLine(typeof b.note === "string" ? b.note : "", 400), new Date()); const ok = canPublish(approved, now);
  if (!ok.ok && ok.why && ok.why.en.startsWith("The data behind")) return Response.json({ error: "stale", message: ok.why.en, why: ok.why }, { status: 409 });
  storeRun(approved); return Response.json({ run: approved, publish: ok });
}
