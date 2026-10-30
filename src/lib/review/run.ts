import type Anthropic from "@anthropic-ai/sdk";
import { outputRoom, runUsd } from "../dossier/cost";
import { runModelTask, type Effort, type RunEvent, type Source, type Usage } from "../dossier/run";
import { worstOf } from "../desk/core";
import { AUDITORS, auditorRole, type Auditor, type Subject } from "./pair";

// The server step shared by every council that has the reviewer pair: both auditors read the finished product at once, each under half of the money that is left, and neither may run if the pair does not fit under the cost ceiling.
export type AuditOut = { id: string; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "error" | "skipped"; note?: string };
export type AuditRun = { auditors?: Auditor[]; limit?: number; client: Anthropic; model: string; system: string; firstText: string; subject: Subject; product: string; lang: "en" | "ar"; cap: number; spent: number; signal: AbortSignal; send: (e: RunEvent) => void; label: string; effort: Effort; sources: Source[]; total: Usage };
const REV_LIKELY = 0.6; const REV_RESERVE_USD = 0.01; // the auditors read one finished text and write little, so they keep back only a cent for the input still to come
/** What a run must keep back for the pair, so the earlier calls never spend it. */
export const pairReserve = () => AUDITORS.reduce((a, x) => a + worstOf(x.maxTokens, x.searches), 0) * 0.6;
export async function runAuditors(o: AuditRun): Promise<{ outs: AuditOut[]; spent: number }> {
  const AUD = o.auditors ?? AUDITORS; const name = (a: Auditor) => (o.lang === "ar" ? a.ar : a.en); const outs: AuditOut[] = []; let spent = o.spent; const seen = new Set(o.sources.map((s) => s.url));
  const skip = (a: Auditor, why: string) => { outs.push({ id: a.id, name: name(a), text: "", usd: 0, searches: 0, failed: 0, status: "skipped", note: why }); o.send({ type: "agent", id: a.id, status: "skipped", message: why }); };
  const need = AUD.reduce((s, a) => s + worstOf(a.maxTokens, a.searches), 0) * REV_LIKELY;
  if (!o.product.trim()) { for (const a of AUD) skip(a, "nothing to review"); return { outs, spent }; }
  if (o.cap - spent < need || outputRoom(spent, o.cap, o.model, REV_RESERVE_USD) < 1800 * AUD.length) { for (const a of AUD) skip(a, "no money left under the cost ceiling"); return { outs, spent }; }
  o.send({ type: "status", text: "Independent auditors are checking the product…" });
  const at = spent; const share = (o.cap - at) / AUD.length;
  await Promise.all(AUD.map(async (a) => {
    o.send({ type: "agent", id: a.id, status: "start" });
    try {
      const r = await runModelTask({ client: o.client, model: o.model, system: o.system, firstText: o.firstText, roleText: auditorRole(a.lens, o.subject, o.product, o.limit), budget: { maxTokens: a.maxTokens, searches: a.searches, fetches: 0, fetchTokens: 6000 }, effort: o.effort, maxUsd: at + share, signal: o.signal, send: (e) => o.send({ ...e, agent: a.id }), label: `${o.label}-${a.id}`, spentBefore: () => at, reserveUsd: REV_RESERVE_USD });
      const usd = r.usage.usd ?? runUsd(r.usage, o.model); r.usage.usd = usd; spent += usd; for (const k of ["input", "output", "cacheRead", "cacheWrite", "searches", "fetches"] as const) o.total[k] += r.usage[k]; o.total.usd = spent;
      for (const s of r.sources) if (!seen.has(s.url)) { seen.add(s.url); o.sources.push(s); }
      outs.push({ id: a.id, name: name(a), text: r.report.trim(), usd, searches: r.usage.searches, failed: r.failedSteps, status: "done", note: r.costStopped ? "stopped at the cost ceiling" : undefined }); o.send({ type: "agent", id: a.id, status: "done", usd, searches: r.usage.searches, failed: r.failedSteps });
    } catch (e) { if (o.signal.aborted) throw e; const msg = e instanceof Error ? e.message.slice(0, 120) : "error"; console.error(`[review] ${o.label} ${a.id} failed:`, msg); outs.push({ id: a.id, name: name(a), text: "", usd: 0, searches: 0, failed: 0, status: "error", note: msg }); o.send({ type: "agent", id: a.id, status: "error", message: msg }); }
  }));
  outs.sort((x, y) => AUD.findIndex((a) => a.id === x.id) - AUD.findIndex((a) => a.id === y.id));
  return { outs, spent };
}
