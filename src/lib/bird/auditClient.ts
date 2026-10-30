import { auditKey, briefHash, type AuditSaved } from "./audit";
import type { Ev, Outcome } from "./runner";

export const readAudit = (iso: string): AuditSaved | null => { try { const j = JSON.parse(localStorage.getItem(auditKey(iso)) ?? "null") as AuditSaved | null; return j && typeof j.report === "string" && typeof j.hash === "string" ? j : null; } catch { return null; } };
/** Runs the three auditors on the bird's eye brief and keeps the audit, with the fingerprint of the brief it audited. */
export async function runBirdAudit(o: { iso: string; lang: "en" | "ar"; brief: string; digest: string; refresh?: boolean; signal: AbortSignal; onEvent: (e: Ev) => void }): Promise<Outcome> {
  let r: Response; try { r = await fetch("/api/bird/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iso3: o.iso, lang: o.lang, brief: o.brief, digest: o.digest, refresh: o.refresh === true }), signal: o.signal }); } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  if (!r.ok || !r.body) { const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string }; return { ok: false, error: j.error ?? "upstream", message: j.message ?? j.error ?? "The request was refused." }; }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith("data:")) continue; let ev: Ev; try { ev = JSON.parse(line.slice(5)) as Ev; } catch { continue; } o.onEvent(ev);
        if (ev.type === "error") return { ok: false, error: String(ev.error ?? "upstream"), message: String(ev.message ?? ev.error ?? "The audit failed.") };
        if (ev.type === "done") { const report = String(ev.report ?? ""); if (!report.trim()) return { ok: false, error: "empty", message: "The auditors wrote nothing (a cost ceiling or an error stopped them)." }; const usd = typeof ev.usd === "number" ? ev.usd : null; const s: AuditSaved = { report, at: String(ev.at ?? new Date().toISOString()), usd, hash: briefHash(o.brief + o.digest), lang: o.lang }; try { localStorage.setItem(auditKey(o.iso), JSON.stringify(s)); window.dispatchEvent(new Event("storage")); } catch { return { ok: false, error: "storage", message: "The audit could not be saved in this browser." }; } return { ok: true, usd, cached: ev.cached === true }; }
      }
    }
  } catch (e) { return { ok: false, error: (e as Error).name === "AbortError" ? "aborted" : "network", message: (e as Error).message }; }
  return { ok: false, error: "ended", message: "The connection ended before the audit finished." };
}
