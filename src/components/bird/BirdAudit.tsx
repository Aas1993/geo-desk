"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AUDIT_EST_USD, verdictOf, type AuditSaved } from "@/lib/bird/audit";
import { runBirdAudit } from "@/lib/bird/auditClient";
import type { Ev } from "@/lib/bird/runner";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { ReviewPair } from "../desk/Quality";

type Agent = { id: string; name: string; status: "wait" | "run" | "done" | "skipped" | "error" };
/** The independent audit before publishing: the Statecraft, Reality and Consistency auditors read the brief and the products it was built from, and may red-flag it. About US$0.45, click-started, under the US$1.00 ceiling. */
export function BirdAudit({ L, iso, brief, digest, audit, hash, onSaved }: { L: Lang; iso: string; brief: string; digest: string; audit: AuditSaved | null; hash: string; onSaved: () => void }) {
  const t = useTr(L); const [busy, setBusy] = useState(false); const [agents, setAgents] = useState<Agent[]>([]); const [err, setErr] = useState(""); const ac = useRef<AbortController | null>(null);
  useEffect(() => () => ac.current?.abort(), []);
  const v = audit ? verdictOf(audit.report) : null; const stale = !!audit && audit.hash !== hash; const state = !audit ? "none" : stale ? "stale" : v?.ok ? "ok" : "flags";
  const run = async () => {
    if (busy) return; const a = new AbortController(); ac.current = a; setBusy(true); setErr(""); setAgents([]);
    const out = await runBirdAudit({ iso, lang: L === "ar" ? "ar" : "en", brief, digest, refresh: !!audit, signal: a.signal, onEvent: (e: Ev) => { if (e.type === "roster") setAgents((e.agents as { id: string; name: string }[]).map((x) => ({ id: x.id, name: x.name, status: "wait" }))); else if (e.type === "agent") setAgents((l) => l.map((x) => (x.id === e.id ? { ...x, status: e.status === "start" ? "run" : (e.status as Agent["status"]) } : x))); } });
    setBusy(false); if (out.ok) onSaved(); else if (out.error !== "aborted") setErr(out.message);
  };
  return (
    <Block title={t("Audit before publishing", "التدقيق قبل النشر")} hint={t("Three independent auditors read this brief and the products it was built from before it is published: a Statecraft Auditor (does it serve the UAE and is the course sound), a Reality Auditor (is the data real and current, against the evidence on file) and a Consistency Auditor (does every line say what its source tab says, is anything important missing, do the tabs agree). They may red-flag it, and the audit goes into the PDF.", "يقرأ ثلاثة مدققين مستقلين هذا الموجز والمنتجات التي بُني منها قبل نشره: مدقق فن الحكم (هل يخدم الإمارات وهل المسار سليم) ومدقق الواقع (هل البيانات حقيقية وحديثة مقابل الأدلة المحفوظة) ومدقق الاتساق (هل يقول كل سطر ما يقوله تبويبه المصدر وهل ينقص شيء مهم وهل تتفق التبويبات). ويمكنهم رفع علم أحمر ويدخل التدقيق في ملف PDF.")}
      right={<Pill c={state === "ok" ? "var(--ok)" : state === "none" ? "var(--t2)" : "var(--warn)"}>{state === "ok" ? t("cleared for publication", "مُجاز للنشر") : state === "none" ? t("not audited", "لم يُدقَّق") : state === "stale" ? t("changed since the audit", "تغيّر بعد التدقيق") : t("not cleared", "غير مُجاز")}</Pill>}>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={run} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"><ShieldCheck size={15} />{busy ? t("Auditing…", "جارٍ التدقيق…") : audit ? t(`Audit again (about US$${AUDIT_EST_USD.toFixed(2)})`, `دقّق من جديد (نحو ${AUDIT_EST_USD.toFixed(2)} دولار)`) : t(`Audit before publishing (about US$${AUDIT_EST_USD.toFixed(2)})`, `دقّق قبل النشر (نحو ${AUDIT_EST_USD.toFixed(2)} دولار)`)}</button>
        {audit && <span className="numt text-[11.5px] text-t2">{audit.at.slice(0, 16).replace("T", " ")} UTC{audit.usd != null ? ` · US$${audit.usd.toFixed(2)}` : ""}</span>}</div>
      {busy && agents.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("Auditors", "المدققون")}>{agents.map((a) => <li key={a.id} className="rounded-full px-2.5 py-0.5 text-[11px] text-t0" style={{ background: "var(--bg3)", border: `1px solid ${a.status === "done" ? "var(--ok)" : a.status === "run" ? "var(--accent)" : a.status === "error" ? "var(--risk)" : a.status === "skipped" ? "var(--warn)" : "var(--line)"}` }}>{a.name}</li>)}</ul>}
      {busy && <p className="mt-2 text-[11.5px] leading-snug text-warn">{t("Stay on this page while the auditors work.", "ابقَ في هذه الصفحة أثناء عمل المدققين.")}</p>}
      {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
      {stale && <p role="status" className="mt-2 text-[12px] text-warn">{t("The brief has changed since it was audited (a product was added or re-run). Audit it again before publishing.", "تغيّر الموجز منذ تدقيقه (أُضيف منتج أو أُعيد تشغيله). دقّقه من جديد قبل النشر.")}</p>}
      {audit && <div className="mt-3"><ReviewPair L={L} reviews={v!.reviews} flags /></div>}
    </Block>
  );
}
