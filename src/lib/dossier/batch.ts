import type Anthropic from "@anthropic-ai/sdk";
import { AsyncLocalStorage } from "node:async_hooks";
import { BATCH_FACTOR } from "./cost";

// BATCH MODE: the same prompts, the same model and the same tools, sent through the Message Batches API, which bills every token at half price. It is for the long background jobs (the Bird's Eye "Complete the picture" bundle) where nobody watches the text arrive: the answer comes back whole, minutes to an hour later, instead of streaming.
// Nothing about the product changes: the calls are identical, only the transport is. A call that pauses (a long search loop) is sent again as the next request of a later batch. Requests that are made together (the parallel sittings of one council) travel in one batch.
// the store lives on globalThis: the route bundle and the library bundle of a development server can load this module twice, and the switch must be the same object in both
const G = globalThis as unknown as { __gdBatchALS?: AsyncLocalStorage<boolean> }; const als = (G.__gdBatchALS ??= new AsyncLocalStorage<boolean>());
export const inBatchMode = () => als.getStore() === true;
/** Wraps a route handler: a request that carries the header x-geo-batch: 1 runs all of its model calls through the batch transport. */
export function withBatch(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> { return (req) => { if (req.headers.get("x-geo-batch") !== "1") return handler(req); console.warn("[batch] a request is running its model calls through the batch transport"); return als.run(true, () => handler(req)); }; }
const BATCH_PER_HOUR = Math.max(1, +(process.env.DOSSIER_BATCH_MAX_PER_HOUR ?? 12) || 12); const BATCH_CONCURRENT = Math.max(1, +(process.env.DOSSIER_BATCH_MAX_CONCURRENT ?? 6) || 6);
/** The hourly and concurrent limits of full sittings. A batch run mostly waits and costs about 40% less, and it is only started by the explicit "Complete the picture" click, so its limits are higher (DOSSIER_BATCH_MAX_PER_HOUR, DOSSIER_BATCH_MAX_CONCURRENT); every run still keeps its own US$1.00 ceiling. */
export const hourlyCap = (normal: number) => (inBatchMode() ? Math.max(normal, BATCH_PER_HOUR) : normal);
export const concurrentCap = (normal: number) => (inBatchMode() ? Math.max(normal, BATCH_CONCURRENT) : normal);
export { BATCH_FACTOR }; // the token price of a batch request relative to the normal price (web searches are billed at the same price); defined beside runUsd so no stale module copy can leave it undefined

type Msg = Anthropic.Beta.BetaMessage; type Params = Anthropic.Beta.Messages.BatchCreateParams["requests"][number]["params"];
type Job = { id: string; params: Params; resolve: (m: Msg) => void; reject: (e: Error) => void; signal: AbortSignal };
const POLL_MS = 15_000; const GATHER_MS = 1_500; const MAX_WAIT_MS = 6 * 3600_000;
const g = globalThis as unknown as { __gdBatchQ?: { jobs: Job[]; timer: ReturnType<typeof setTimeout> | null }; __gdBatchT?: { poll: number; gather: number } }; const Q = (g.__gdBatchQ ??= { jobs: [], timer: null });
/** The polling and gathering intervals in milliseconds (tests shorten them). */
export const batchTiming = (g.__gdBatchT ??= { poll: POLL_MS, gather: GATHER_MS });
let seq = 0;
async function flush(client: Anthropic, onWait?: (s: string) => void) {
  const jobs = Q.jobs.splice(0, Q.jobs.length).filter((j) => !j.signal.aborted); if (!jobs.length) return;
  try {
    const batch = await client.beta.messages.batches.create({ requests: jobs.map((j) => ({ custom_id: j.id, params: j.params })) }); const t0 = Date.now(); const left = new Map(jobs.map((j) => [j.id, j]));
    const abort = () => { if ([...left.values()].every((j) => j.signal.aborted)) void client.beta.messages.batches.cancel(batch.id).catch(() => {}); }; for (const j of jobs) j.signal.addEventListener("abort", abort, { once: true });
    for (;;) {
      await new Promise((r) => setTimeout(r, batchTiming.poll)); const s = await client.beta.messages.batches.retrieve(batch.id); onWait?.(`Waiting for the batch (${Math.round((Date.now() - t0) / 60_000)} min, ${s.request_counts.succeeded + s.request_counts.errored} of ${jobs.length} done)…`);
      if (s.processing_status === "ended") break; if (Date.now() - t0 > MAX_WAIT_MS) { await client.beta.messages.batches.cancel(batch.id).catch(() => {}); throw new Error("The batch did not finish within six hours."); }
      if ([...left.values()].every((j) => j.signal.aborted)) throw new Error("aborted");
    }
    for await (const r of await client.beta.messages.batches.results(batch.id)) { const j = left.get(r.custom_id); if (!j) continue; left.delete(r.custom_id); if (r.result.type === "succeeded") j.resolve(r.result.message as Msg); else j.reject(new Error(r.result.type === "errored" ? `batch request failed: ${JSON.stringify((r.result as { error?: unknown }).error ?? {}).slice(0, 300)}` : `batch request ${r.result.type}`)); }
    for (const j of left.values()) j.reject(new Error("The batch returned no result for this request."));
  } catch (e) { for (const j of jobs) j.reject(e instanceof Error ? e : new Error(String(e))); }
}
/** Sends one request through the batch transport and resolves with the finished message. */
export function submitBatch(client: Anthropic, params: Params, signal: AbortSignal, onWait?: (s: string) => void): Promise<Msg> {
  return new Promise<Msg>((resolve, reject) => { Q.jobs.push({ id: `r${Date.now().toString(36)}-${++seq}`, params, resolve, reject, signal }); if (!Q.timer) Q.timer = setTimeout(() => { Q.timer = null; void flush(client, onWait); }, batchTiming.gather); });
}
