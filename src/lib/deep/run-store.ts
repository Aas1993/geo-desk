import type { Run } from "./consolidate";
// Consolidation runs are kept in this process's memory, keyed by idempotency key and by run id. They are lost on restart (the browser keeps its own copy of what it was sent); the Deep desk says so.
const g = globalThis as unknown as { __gdConsRuns?: Map<string, Run> }; const runs = (g.__gdConsRuns ??= new Map<string, Run>());
export const storeRun = (r: Run) => { runs.set(r.idem, r); runs.set(r.id, r); while (runs.size > 80) runs.delete(runs.keys().next().value as string); };
export const lookupRun = (id: string): Run | null => runs.get(id) ?? null;
