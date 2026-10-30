"use client";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { stateOf, parseDashboard } from "@/lib/case/architect";
import { pickBaseline, whatChanged, type Change, type Sev, type Target } from "@/lib/case/changes";
import type { CaseData } from "@/lib/case/load";
import { isoOf } from "@/lib/case/log";
import type { SavedProduct } from "@/lib/case/saved";
import { useNow } from "@/lib/use-now";
import type { Lang } from "../falcon/bits";
import { bt, useTr } from "./bits";
import { useBaseline, useDecisionLog, writeBaseline } from "./work";
import type { ArchSaved } from "./ArchitectTab";

const SEV_C: Record<Sev, string> = { high: "var(--risk)", medium: "var(--warn)", info: "var(--t2)" };
/** The one "what changed" answer for a country: a chip in the header that counts what has moved since the file was last reviewed, and opens the list. "Mark as reviewed" moves the baseline to now. The first time a country is opened its baseline is set to that moment, so the chip reads "no change" and then does its job. */
export function ChangeChip({ L, d, iso, council, arch, onGo }: { L: Lang; d: CaseData; iso: string; council: SavedProduct | null; arch: ArchSaved | null; onGo: (t: Target) => void }) {
  const t = useTr(L); const now = useNow(60_000); const stored = useBaseline(iso); const [ds] = useDecisionLog(); const [open, setOpen] = useState(false);
  const cur = useMemo(() => stateOf(d, new Date(now).toISOString()), [d, now]);
  useEffect(() => { if (stored || arch?.state) return; const t0 = setTimeout(() => writeBaseline(iso, { at: new Date().toISOString(), state: stateOf(d) }), 400); return () => clearTimeout(t0); }, [iso, stored, arch?.state, d]);
  const base = pickBaseline(stored, arch?.at ?? null, arch?.state); const dash = useMemo(() => (arch ? parseDashboard(arch.report) : null), [arch]);
  const r = useMemo(() => (now ? whatChanged(base, cur, { dash, decisions: ds.filter((x) => isoOf(x) === iso), councilAt: council?.at ?? null, archAt: arch?.at ?? null, today: now }) : null), [base, cur, dash, ds, iso, council, arch, now]);
  if (!r || !r.baseAt) return null; const n = r.changes.length; const high = r.changes.filter((c) => c.sev === "high").length; const since = r.baseAt.slice(0, 10);
  const reviewed = () => { writeBaseline(iso, { at: new Date().toISOString(), state: stateOf(d) }); setOpen(false); };
  return (
    <div className="mt-2 w-full">
      <button type="button" aria-expanded={open} onClick={() => setOpen((x) => !x)} className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-semibold ${n === 0 ? "bg-ok/15 text-ok" : high ? "bg-risk/15 text-risk" : "bg-warn/15 text-warn"}`}>{n === 0 ? <><Check size={13} />{t(`No change since ${since}`, `لا تغيير منذ ${since}`)}</> : <>{t(`${n} ${n === 1 ? "change" : "changes"} since ${since}`, `${n} ${n === 1 ? "تغيير" : "تغييرات"} منذ ${since}`)}{high > 0 && <span className="font-normal">· {t(`${high} high`, `${high} مرتفع`)}</span>}</>}</button>
      {open && <div className="mt-2 rounded-[12px] border border-line bg-bg2 p-3 text-[12px] leading-snug" role="region" aria-label={t("What changed", "ما الذي تغير")}>
        {n === 0 ? <p className="text-t1">{t("Nothing the platform tracks has moved since this country was last reviewed.", "لم يتحرك شيء مما تتبعه المنصة منذ آخر مراجعة لهذه الدولة.")}</p> : <ul className="space-y-1.5">{r.changes.map((c: Change) => <li key={c.id} className="flex items-start gap-2"><i className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: SEV_C[c.sev] }} /><span className="min-w-0 flex-1 text-t0">{bt(L, c.text)}</span>{c.go && <button type="button" onClick={() => { onGo(c.go!); setOpen(false); }} className="shrink-0 text-[11.5px] text-accent hover:underline">{t("Open", "افتح")}</button>}</li>)}</ul>}
        <p className="mt-2 text-[11px] text-t2">{t(`Compared with the country as it stood on ${since}, the later of the last review and the Statecraft Architect's saved state. Nothing is rewritten by itself.`, `مقارنة بالدولة كما كانت في ${since}، أي الأحدث بين آخر مراجعة وحالة مهندس فن الحكم المحفوظة. ولا يُعاد كتابة شيء تلقائيًا.`)}</p>
        <button type="button" onClick={reviewed} className="mt-2 h-8 rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-[var(--accent-ink)]">{t("Mark as reviewed", "علّم كمُراجَع")}</button></div>}
    </div>
  );
}
