import type { CaseData } from "../case/load";
import { DEFAULT_FOCUS, stateOf } from "../case/architect";
import { DEFAULT_QUESTION as CASE_Q } from "../case/council";
import { activate } from "../case/seats";
import { DEFAULT_QUESTION as DEEP_Q } from "../deep/council";
import { DEFAULT_EMB_FOCUS, DEFAULT_KING_FOCUS, DEFAULT_MOFA_FOCUS, PRODUCT_USD } from "../desk/core";
import { embContext, kingContext, mofaContext } from "../desk/context";
import { COUNCIL_PRESETS } from "../falcon/council";
import { SCOUNCIL_DEFAULT_QUESTION } from "../machiavelli/council";

// COMPLETE THE PICTURE: runs every AI council of the platform that has no product on file for a country (and, if asked, those older than 30 days), one after another and in the order that lets each read the one before, so the bird's eye view is built on all of them.
// Each run goes through the same route, with the same US$1.00 ceiling, cache and hourly cap, as when it is started from its own page; the finished product is saved under the same key, so the page of each council shows it. The user starts it with one explicit click after seeing the list and the estimate; it stops on any error and waits when the hourly cap is reached.
export type Pid = "council" | "architect" | "falcon" | "mach" | "deep" | "intel" | "mofa" | "plan" | "king";
export type Info = { id: Pid; en: string; ar: string; est: number; key: (iso: string) => string; href: string };
/** The order matters: the Strategic Council and the Architect first (they feed the desks), the embassy and the Ministry next, THE KING last (it reads everything). */
export const ORDER: Pid[] = ["council", "architect", "falcon", "mach", "deep", "intel", "mofa", "plan", "king"];
export const INFO: Record<Pid, Info> = {
  council: { id: "council", en: "Strategic Council (Case File)", ar: "المجلس الاستراتيجي (ملف الحالة)", est: 0.78, key: (i) => `gd-case-council:${i}`, href: "/case" },
  architect: { id: "architect", en: "Statecraft Architect", ar: "مهندس فن الحكم", est: 0.79, key: (i) => `gd-case-architect:${i}`, href: "/case" },
  falcon: { id: "falcon", en: "Falcon Council", ar: "مجلس الصقر", est: 0.8, key: (i) => `gd-council:${i}`, href: "/falcon" },
  mach: { id: "mach", en: "Machiavellian council", ar: "المجلس الميكيافيلي", est: 0.8, key: (i) => `gd-scouncil:${i}`, href: "/machiavelli" },
  deep: { id: "deep", en: "Deep Intelligence team", ar: "فريق الاستخبارات المعمّقة", est: 0.7, key: (i) => `gd-deep-council:${i}:full`, href: "/deep" },
  intel: { id: "intel", en: "Embassy intelligence", ar: "استخبارات السفارة", est: 0.94, key: (i) => `gd-desk:emb-intel:${i}`, href: "/ambassador" },
  mofa: { id: "mofa", en: "The Ministry's Council", ar: "مجلس الوزارة", est: PRODUCT_USD["mofa-council"], key: (i) => `gd-desk:mofa-council:${i}`, href: "/mofa" },
  plan: { id: "plan", en: "Mission strategy and plans", ar: "استراتيجية البعثة وخططها", est: 0.9, key: (i) => `gd-desk:emb-plan:${i}`, href: "/ambassador" },
  king: { id: "king", en: "THE KING's Council", ar: "مجلس القرار النهائي", est: 0.75, key: (i) => `gd-desk:king-council:${i}`, href: "/king" },
};
export type Held = { at: string; report: string } | null;
export const readHeld = (key: string): Held => { try { const j = JSON.parse(localStorage.getItem(key) ?? "null") as { at?: string; report?: string } | null; return j && typeof j.report === "string" && typeof j.at === "string" ? { at: j.at, report: j.report } : null; } catch { return null; } };
export type Status = "missing" | "stale" | "fresh";
export const STALE_DAYS = 30;
export function statusOf(h: Held, now: number): Status { if (!h) return "missing"; return (now - Date.parse(h.at)) / 86_400_000 > STALE_DAYS ? "stale" : "fresh"; }
/** What to run: everything with no product, plus (when asked) everything older than 30 days, in dependency order. */
export function plan(iso: string, now: number, o: { refreshStale: boolean }): { id: Pid; status: Status }[] { return ORDER.map((id) => ({ id, status: statusOf(readHeld(INFO[id].key(iso)), now) })).filter((x) => x.status === "missing" || (o.refreshStale && x.status === "stale")); }
/** What the bundle is expected to cost. The batch transport bills tokens at half price and its hour-long cache is shared by the calls of a bundle: the councils are expected to cost about 60% of their streamed cost (to be confirmed by a measured run). */
export const BATCH_EST = 0.6;
export const estimate = (ids: Pid[], batch = false) => Math.round(ids.reduce((a, id) => a + INFO[id].est * (batch ? BATCH_EST : 1), 0) * 100) / 100;
/** In batch mode the councils that do not read each other run at the same time, in these waves; otherwise they run one after another in ORDER. */
export const WAVES: Pid[][] = [["council", "falcon", "mach", "deep", "intel"], ["architect", "mofa"], ["plan"], ["king"]];

type Req = { endpoint: string; body: Record<string, unknown>; extra?: Record<string, unknown> };
const rep = (iso: string, id: Pid) => readHeld(INFO[id].key(iso))?.report ?? null;
/** The request each product is started with: the same body its own page sends, with the context built from what is on file at that moment (so a later product reads an earlier one). */
export function request(id: Pid, iso: string, lang: "en" | "ar", d: CaseData | null, refresh: boolean): Req {
  const filed = { council: rep(iso, "council"), architect: rep(iso, "architect"), kingBrief: rep(iso, "king"), embIntel: rep(iso, "intel"), embPlan: rep(iso, "plan"), mofa: rep(iso, "mofa") };
  switch (id) {
    case "council": return { endpoint: "/api/case/council", body: { iso3: iso, lang, question: CASE_Q, seats: activate(CASE_Q).ids, all: false, refresh } };
    case "architect": return { endpoint: "/api/case/architect", body: { iso3: iso, lang, focus: DEFAULT_FOCUS, useCouncil: true, councilReport: filed.council ?? "", refresh }, extra: d ? { state: stateOf(d) } : undefined };
    case "falcon": return { endpoint: "/api/falcon/council", body: { iso3: iso, lang, question: COUNCIL_PRESETS[0], refresh } };
    case "mach": return { endpoint: "/api/machiavelli/council", body: { iso3: iso, lang, question: SCOUNCIL_DEFAULT_QUESTION, brief: "", refresh } };
    case "deep": return { endpoint: "/api/deep/council", body: { iso3: iso, lang, question: DEEP_Q, mode: "full", consequential: true, horizonYears: 3, audience: "analyst", roles: [], refresh } };
    case "intel": return { endpoint: "/api/desk", body: { product: "emb-intel", iso3: iso, lang, focus: DEFAULT_EMB_FOCUS, topic: "", useContext: true, context: embContext({ council: filed.council, kingBrief: filed.kingBrief, mofa: filed.mofa }, "emb-intel"), refresh } };
    case "mofa": return { endpoint: "/api/desk", body: { product: "mofa-council", iso3: iso, lang, focus: DEFAULT_MOFA_FOCUS, topic: "", useContext: true, context: mofaContext(filed), refresh } };
    case "plan": return { endpoint: "/api/desk", body: { product: "emb-plan", iso3: iso, lang, focus: DEFAULT_EMB_FOCUS, topic: "", useContext: true, context: embContext({ council: filed.council, kingBrief: filed.kingBrief, embIntel: filed.embIntel, mofa: filed.mofa }, "emb-plan"), refresh } };
    case "king": return { endpoint: "/api/desk", body: { product: "king-council", iso3: iso, lang, focus: DEFAULT_KING_FOCUS, topic: "", useContext: true, context: kingContext({ council: filed.council, architect: filed.architect, embIntel: filed.embIntel, embPlan: filed.embPlan }), refresh } };
  }
}
export type Ev = Record<string, unknown> & { type: string };
export type Outcome = { ok: true; usd: number | null; cached: boolean } | { ok: false; error: string; message: string };
/** Runs one product: posts the request, follows the stream, saves the finished product where its own page keeps it. */
export async function runOne(id: Pid, iso: string, lang: "en" | "ar", d: CaseData | null, o: { refresh: boolean; signal: AbortSignal; onEvent: (e: Ev) => void; batch?: boolean }): Promise<Outcome> {
  const r0 = request(id, iso, lang, d, o.refresh); let r: Response;
  try { r = await fetch(r0.endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(o.batch ? { "x-geo-batch": "1" } : {}) }, body: JSON.stringify(r0.body), signal: o.signal }); } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  if (!r.ok || !r.body) { const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string }; return { ok: false, error: j.error ?? "upstream", message: j.message ?? j.error ?? "The request was refused." }; }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith("data:")) continue; let ev: Ev; try { ev = JSON.parse(line.slice(5)) as Ev; } catch { continue; } o.onEvent(ev);
        if (ev.type === "error") return { ok: false, error: String(ev.error ?? "upstream"), message: String(ev.message ?? ev.error ?? "The run failed.") };
        if (ev.type === "done") { const saved = { ...ev, ...(r0.extra ?? {}), type: undefined }; try { localStorage.setItem(INFO[id].key(iso), JSON.stringify(saved)); window.dispatchEvent(new Event("storage")); } catch { return { ok: false, error: "storage", message: "The finished product could not be saved in this browser (storage is full)." }; } const u = (ev.usage as { usd?: number | null } | undefined)?.usd ?? null; return { ok: true, usd: u, cached: ev.cached === true }; }
      }
    }
  } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  return { ok: false, error: "ended", message: "The connection ended before the product finished." };
}
