import { activate } from "../case/seats";
import { embContext, kingContext, mofaContext, type Filed } from "../desk/context";
import { DEFAULT_FOCUS } from "../case/architect";
import type { Ev } from "../bird/runner";
import { INFO, readHeld, runOne, STALE_DAYS } from "../bird/runner";
import { stripReviewJson } from "../review/pair";
import { DEPT_BY } from "./catalog";
import type { AgentPlan, PlanStep } from "./plan";

// THE DESK AGENT'S HANDS: runs a plan from the browser through the same routes the departments' own tabs use (so the same ceilings, caches, limits and quality steps apply), in parallel, then hands their texts to the writer. Nothing here talks to a model directly.
export type StepOut = { dept: string; name: string; ok: boolean; text: string; usd: number | null; error?: string; cached?: boolean };
export type Ctx = { iso: string; lang: "en" | "ar"; data: () => Promise<string>; signal: AbortSignal; onEvent: (dept: string, e: Ev) => void };
export async function postStream(endpoint: string, body: unknown, signal: AbortSignal, onEvent: (e: Ev) => void): Promise<{ ok: true; done: Record<string, unknown> } | { ok: false; error: string; message: string }> {
  let r: Response; try { r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-geo-bundle": "1" }, body: JSON.stringify(body), signal }); } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  if (!r.ok || !r.body) { const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string }; return { ok: false, error: j.error ?? "upstream", message: j.message ?? j.error ?? "The request was refused." }; }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number; while ((i = buf.indexOf("\n\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith("data:")) continue; let ev: Ev; try { ev = JSON.parse(line.slice(5)) as Ev; } catch { continue; } onEvent(ev); if (ev.type === "error") return { ok: false, error: String(ev.error ?? "upstream"), message: String(ev.message ?? ev.error ?? "The run failed.") }; if (ev.type === "done") return { ok: true, done: ev as unknown as Record<string, unknown> }; } } } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  return { ok: false, error: "ended", message: "The connection ended before the answer finished." };
}
const filed = (iso: string): Filed => { const r = (id: keyof typeof INFO) => readHeld(INFO[id].key(iso))?.report ?? null; return { council: r("council"), architect: r("architect"), kingBrief: r("king"), embIntel: r("intel"), embPlan: r("plan"), mofa: r("mofa") }; };
/** The main text of a department's output: the answer part, without the specialists' annex, the auditors' JSON or the raw tags. */
export function mainText(report: string, max = 10_000): string { const t = stripReviewJson(report); const at = t.indexOf("# Specialist"); return (at > 200 ? t.slice(0, at) : t).trim().slice(0, max); }
const doneText = (d: Record<string, unknown>) => (typeof d.report === "string" ? d.report : typeof d.text === "string" ? d.text : "");
const usdOf = (d: Record<string, unknown>) => { const u = d.usage as { usd?: number } | undefined; return typeof u?.usd === "number" ? u.usd : typeof d.usd === "number" ? d.usd : null; };
/** The request body for one step: the same shapes the departments' own pages send, with the user's question in place of the default one. */
export function stepRequest(s: PlanStep, iso: string, lang: "en" | "ar"): { endpoint: string; body: Record<string, unknown> } | null {
  const f = filed(iso); const q = s.ask;
  switch (s.dept) {
    case "king": return { endpoint: "/api/desk", body: { product: "king-directive", iso3: iso, lang, mode: s.mode, topic: q, urgency: "routine", agents: [], useContext: true, context: kingContext(f) } };
    case "mofa": return { endpoint: "/api/desk", body: { product: "mofa-directive", iso3: iso, lang, mode: s.mode, topic: q, urgency: "routine", agents: [], useContext: true, context: mofaContext(f) } };
    case "embassy": return { endpoint: "/api/desk", body: { product: "emb-directive", iso3: iso, lang, mode: s.mode, topic: q, urgency: "routine", agents: [], useContext: true, context: embContext(f, "emb-directive") } };
    case "council": return { endpoint: "/api/case/council", body: { iso3: iso, lang, question: q, seats: activate(q).ids, all: false, refresh: false } };
    case "architect": return { endpoint: "/api/case/architect", body: { iso3: iso, lang, focus: q || DEFAULT_FOCUS, useCouncil: !!f.council, councilReport: f.council ?? "", refresh: false } };
    case "falcon": return { endpoint: "/api/falcon/council", body: { iso3: iso, lang, question: q, refresh: false } };
    case "mach": return { endpoint: "/api/machiavelli/council", body: { iso3: iso, lang, question: q, brief: "", refresh: false } };
    case "deep": return { endpoint: "/api/deep/council", body: { iso3: iso, lang, question: q, mode: "full", consequential: true, horizonYears: 3, audience: "analyst", roles: [], refresh: false } };
    default: return null;
  }
}
/** One department's work. The free data step and a country brief already on file (under 30 days old) cost nothing. */
export async function runStep(s: PlanStep, c: Ctx): Promise<StepOut> {
  const d = DEPT_BY.get(s.dept); const name = d?.en ?? s.dept; if (!d) return { dept: s.dept, name, ok: false, text: "", usd: null, error: "unknown department" };
  if (d.kind === "data") { const text = await c.data(); return text ? { dept: s.dept, name, ok: true, text, usd: 0, cached: true } : { dept: s.dept, name, ok: false, text: "", usd: null, error: "No data is held for this country yet." }; }
  if (d.id === "country") {
    const h = readHeld(INFO.country.key(c.iso)); if (h && (Date.now() - Date.parse(h.at)) / 86_400_000 <= STALE_DAYS) return { dept: s.dept, name, ok: true, text: mainText(h.report), usd: 0, cached: true };
    const o = await runOne("country", c.iso, c.lang, null, { refresh: false, signal: c.signal, onEvent: (e) => c.onEvent(s.dept, e) }); const nh = readHeld(INFO.country.key(c.iso)); return o.ok && nh ? { dept: s.dept, name, ok: true, text: mainText(nh.report), usd: o.usd } : { dept: s.dept, name, ok: false, text: "", usd: null, error: o.ok ? "The brief was not saved." : o.message };
  }
  const req = stepRequest(s, c.iso, c.lang); if (!req) return { dept: s.dept, name, ok: false, text: "", usd: null, error: "This department cannot be run from here." };
  const r = await postStream(req.endpoint, req.body, c.signal, (e) => c.onEvent(s.dept, e)); if (!r.ok) return { dept: s.dept, name, ok: false, text: "", usd: null, error: r.message };
  const text = mainText(doneText(r.done)); return text ? { dept: s.dept, name, ok: true, text, usd: usdOf(r.done), cached: r.done.cached === true } : { dept: s.dept, name, ok: false, text: "", usd: null, error: "The department returned no text." };
}
export async function runPlan(p: AgentPlan, c: Ctx): Promise<StepOut[]> { return Promise.all(p.steps.map((s) => runStep(s, c))); }
export type Answer = { text: string; usd: number | null; truncated: boolean };
export async function composeAnswer(o: { message: string; plan: AgentPlan; country: string; outs: StepOut[]; lang: "en" | "ar"; signal: AbortSignal }): Promise<{ ok: true; a: Answer } | { ok: false; message: string }> {
  const good = o.outs.filter((x) => x.ok); if (!good.length) return { ok: false, message: o.outs.map((x) => `${x.name}: ${x.error ?? "no output"}`).join(" · ") || "No department produced anything." };
  try { const r = await fetch("/api/agent/compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: o.message, iso3: o.plan.iso3, country: o.country, lang: o.lang, format: o.plan.format, length: o.plan.length, notes: o.plan.notes, sources: good.map((x) => ({ name: x.name, text: x.text })) }), signal: o.signal }); const j = (await r.json().catch(() => ({}))) as { text?: string; usd?: number; truncated?: boolean; message?: string }; return r.ok && j.text ? { ok: true, a: { text: j.text, usd: j.usd ?? null, truncated: !!j.truncated } } : { ok: false, message: j.message ?? "The writer could not finish." }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
