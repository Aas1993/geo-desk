"use client";
import { useState } from "react";
import { RIGHTS, RIGHTS_CHECKED, RIGHTS_LABEL, type RightsStatus } from "@/lib/falcon/rights";
import { safeHttp } from "@/lib/url";
import { Block, Pill, type Lang } from "./bits";

const T = {
  en: { title: "Source rights register", hint: `What each provider's terms were found to say on ${RIGHTS_CHECKED}, how Geo Desk uses the data and what is still to be confirmed. The check read search excerpts and secondary pages, not every provider's current legal page, so each row has an action. This is a working record for the desk, not legal advice; the desk's counsel should confirm it before any wider deployment.`, all: "All", terms: "Terms found", use: "How it is used here", todo: "To do", open: "Provider's page" },
  ar: { title: "سجل حقوق المصادر", hint: `ما وُجد أن شروط كل مزوّد تقوله في ${RIGHTS_CHECKED}، وكيف تستخدم «جيو ديسك» البيانات، وما يبقى للتأكيد. قرأ الفحص مقتطفات بحث وصفحات ثانوية لا الصفحة القانونية الحالية لكل مزوّد، فلكل صف إجراء. وهو سجل عمل للمكتب لا استشارة قانونية؛ وينبغي أن يؤكده مستشار المكتب قبل أي نشر أوسع.`, all: "الكل", terms: "الشروط التي وُجدت", use: "كيف تُستخدم هنا", todo: "المطلوب", open: "صفحة المزوّد" },
} as const;
const ORDER: RightsStatus[] = ["restricted", "unconfirmed", "attribution", "open"];

/** The source rights register, restricted and unconfirmed providers first. */
export function RightsView({ L }: { L: Lang }) {
  const u = T[L]; const [f, setF] = useState<RightsStatus | "all">("all");
  const rows = RIGHTS.filter((r) => f === "all" || r.status === f).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  return (
    <Block title={u.title} hint={u.hint}>
      <div className="mb-3 flex flex-wrap gap-1.5"><button type="button" aria-pressed={f === "all"} onClick={() => setF("all")} className={`h-7 rounded-full px-2.5 text-[11.5px] ${f === "all" ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{u.all} · {RIGHTS.length}</button>{ORDER.map((s) => <button key={s} type="button" aria-pressed={f === s} onClick={() => setF(s)} className={`h-7 rounded-full px-2.5 text-[11.5px] ${f === s ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{RIGHTS_LABEL[s][L]} · {RIGHTS.filter((r) => r.status === s).length}</button>)}</div>
      <ul className="space-y-2">{rows.map((r) => (
        <li key={r.id} className="rounded-[12px] bg-bg2 p-3"><div className="flex flex-wrap items-center gap-2"><b className="text-[13px] text-t0">{r.provider}</b><Pill c={RIGHTS_LABEL[r.status].c}>{RIGHTS_LABEL[r.status][L]}</Pill><span className="text-[11.5px] text-t2">{r.data[L]}</span>{r.url && <a href={safeHttp(r.url)} target="_blank" rel="noreferrer noopener" className="ms-auto text-[11.5px] text-accent">{u.open} ↗</a>}</div>
          <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[12px] leading-snug sm:grid-cols-[110px_minmax(0,1fr)]"><dt className="text-t2">{u.terms}</dt><dd className="text-t0">{r.terms[L]}</dd><dt className="text-t2">{u.use}</dt><dd className="text-t1">{r.use[L]}</dd><dt className="text-t2">{u.todo}</dt><dd className="text-t1">{r.todo[L]}</dd></dl></li>))}</ul>
    </Block>
  );
}
