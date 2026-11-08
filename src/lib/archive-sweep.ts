import { listReports } from "./archive";
import { PDF_FORMAT, archiveReport, idOf, readAllSources, type Source } from "./reportpdf";

// THE SWEEPER: whenever a product is saved in this browser (every run dispatches a storage event when it finishes), and once after the app opens, the products that have no PDF in the Archive yet are turned into PDFs, a few at a time, in the background. It never starts a paid run and it gives up quietly on a product it cannot render.
export type SweepState = { pending: number; building: string | null; done: number; failed: number };
export const SWEEP_EVENT = "gd-archive-progress"; export const SWEEP_RUN = "gd-archive-run";
let state: SweepState = { pending: 0, building: null, done: 0, failed: 0 }; let busy = false;
export const sweepState = () => state;
const set = (s: Partial<SweepState>) => { state = { ...state, ...s }; try { window.dispatchEvent(new CustomEvent(SWEEP_EVENT, { detail: state })); } catch { /* not in a browser */ } };
const failedKey = "gd-archive-failed";
const failedIds = (): Set<string> => { try { return new Set(JSON.parse(sessionStorage.getItem(failedKey) ?? "[]") as string[]); } catch { return new Set(); } };
const markFailed = (id: string) => { try { const s = failedIds(); s.add(id); sessionStorage.setItem(failedKey, JSON.stringify([...s])); } catch { /* ignore */ } };
/** The products that still need a PDF, oldest saved last (newest first). */
export async function missing(): Promise<Source[]> { const have = new Set((await listReports()).filter((x) => x.note === PDF_FORMAT).map((x) => x.id)); const bad = failedIds(); return readAllSources().filter((s) => !have.has(idOf(s)) && !bad.has(idOf(s))).sort((a, z) => z.at.localeCompare(a.at)); }
/** One pass: builds up to `max` missing PDFs. Returns how many remain. */
export async function sweepOnce(max = 3): Promise<number> {
  if (busy) return state.pending; busy = true;
  try {
    let todo = await missing(); set({ pending: todo.length });
    for (const s of todo.slice(0, max)) { set({ building: s.title ?? s.kind }); try { await archiveReport(s); set({ done: state.done + 1 }); } catch (e) { console.warn("[archive] could not make the PDF for", idOf(s), e instanceof Error ? e.message : e); markFailed(idOf(s)); set({ failed: state.failed + 1 }); } }
    todo = await missing(); set({ pending: todo.length, building: null }); return todo.length;
  } finally { busy = false; }
}
/** Starts the background sweep for the page's lifetime; returns the cleanup. */
export function startSweeper(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null; let dead = false;
  const later = (ms: number) => { if (timer) clearTimeout(timer); timer = setTimeout(async () => { if (dead) return; let left = 0; try { left = await sweepOnce(); } catch (e) { console.warn("[archive] the background sweep stopped:", e instanceof Error ? e.message : e); } if (!dead && left > 0) later(15_000); }, ms); };
  const onStore = () => later(4_000); const onRun = () => later(50);
  window.addEventListener("storage", onStore); window.addEventListener(SWEEP_RUN, onRun); later(6_000);
  return () => { dead = true; if (timer) clearTimeout(timer); window.removeEventListener("storage", onStore); window.removeEventListener(SWEEP_RUN, onRun); };
}
