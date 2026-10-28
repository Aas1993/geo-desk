"use client";
import { useMemo } from "react";
import type { Review } from "@/lib/desk/core";
import { assess, type Quality } from "@/lib/quality/gate";
import { Block, Pill, type Lang } from "../falcon/bits";
import type { Saved } from "../machiavelli/useRun";
import { useTr } from "../case/bits";
import { Bullets, Drill, Row } from "./shared";

const GRADE_C: Record<string, string> = { A: "var(--ok)", B: "var(--ok)", C: "var(--warn)", D: "var(--risk)" };
/** The quality gate and the independent review of a saved product, from the product itself: free, and recomputed whenever it is opened. */
export function useQuality(kind: Quality["kind"], s: Saved | null): Quality | null {
  return useMemo(() => (s ? assess(kind, s.report, s.sources, (s.options as { lang?: string } | undefined)?.lang === "ar" ? "ar" : (s.options as { lang?: string } | undefined)?.lang === "en" ? "en" : null) : null), [kind, s]);
}
export function QualityPanel({ L, q }: { L: Lang; q: Quality }) {
  const t = useTr(L); const G: Record<string, [string, string]> = { evidence: ["Evidence", "الأدلة"], structure: ["Structure", "البنية"], plan: ["Plan integrity", "سلامة الخطة"], boundary: ["Boundary", "الحدود"], review: ["Independent review", "المراجعة المستقلة"], language: ["Language", "اللغة"] };
  return (
    <Block title={t("Quality check", "فحص الجودة")} hint={t("Free checks run on the product itself: completeness, evidence, source mix, plan integrity, boundary, language and the independent reviewer's verdict. It proves the product is traceable and consistent, not that the analysis is right; read the failures first.", "فحوص مجانية على المنتج نفسه: الاكتمال والأدلة وتنوّع المصادر وسلامة الخطة والحدود واللغة وحكم المراجع المستقل. تثبت أن المنتج قابل للتتبع ومتسق لا أن التحليل صحيح؛ فاقرأ الإخفاقات أولًا.")} right={<span className="flex items-center gap-2"><Pill c={GRADE_C[q.grade]}>{t("grade", "التقدير")} {q.grade}</Pill><b className="num display text-[20px]" style={{ color: GRADE_C[q.grade] }}>{q.score}</b></span>}>
      {q.failed.length > 0 && <div className="mb-3 rounded-[10px] border border-warn/40 bg-warn/10 p-2.5 text-[12px] leading-snug text-t0"><b>{t("To fix or read with care", "للإصلاح أو القراءة بحذر")}:</b> {q.failed.map((c) => (L === "ar" ? c.ar : c.en)).join(" · ")}</div>}
      <ul className="grid gap-1.5 md:grid-cols-2">{[...q.checks].sort((a, z) => Number(a.ok) - Number(z.ok)).map((c) => <li key={c.id}><Drill L={L} accent={c.ok ? "var(--ok)" : "var(--risk)"} head={<><span className={c.ok ? "text-ok" : "text-risk"}>{c.ok ? "✓" : "✗"}</span> {L === "ar" ? c.ar : c.en}</>} tags={<Pill c="var(--t2)">{L === "ar" ? G[c.group][1] : G[c.group][0]}</Pill>}><Row label={t("Reading", "القراءة")}>{c.detail}</Row><Row label={t("Weight", "الوزن")}>{String(c.weight)}</Row></Drill></li>)}</ul>
      <p className="mt-2 text-[11px] text-t2">{t(`Sources used: ${q.sources.total} (${q.sources.official} official, ${q.sources.thinktank} think-tank, ${q.sources.news} news, ${q.sources.other} other).`, `المصادر المستخدمة: ${q.sources.total} (${q.sources.official} رسمية و${q.sources.thinktank} مراكز فكر و${q.sources.news} أخبار و${q.sources.other} أخرى).`)}</p>
    </Block>
  );
}
const V: Record<string, string> = { approve: "var(--ok)", revise: "var(--warn)", reject: "var(--risk)" };
export function ReviewPanel({ L, r, who }: { L: Lang; r: Review; who: string }) {
  const t = useTr(L);
  return (
    <Block title={`${who}: ${t("independent review", "المراجعة المستقلة")}`} hint={t("A second reader who did not write the product checked it against the evidence, the boundary and the UAE's interests before it was compiled.", "قارئ ثانٍ لم يكتب المنتج راجعه مقابل الأدلة والحدود ومصالح الإمارات قبل تجميعه.")} right={<Pill c={V[r.verdict]}>{t("verdict", "الحكم")}: {r.verdict}</Pill>}>
      <p className="text-[13px] leading-snug text-t0" dir="auto">{r.summary}</p>
      {r.partial && <p className="mt-1 text-[11.5px] text-warn">{t("The review was cut off; what was complete is shown.", "قُطعت المراجعة؛ ويُعرض المكتمل منها.")}</p>}
      {r.strengths.length > 0 && <div className="mt-2"><Bullets label={t("What holds", "ما يصمد")} items={r.strengths} tone="ok" /></div>}
      {r.issues.length > 0 && <div className="mt-3 space-y-2">{r.issues.map((i, k) => <Drill key={i.where + k} L={L} defaultOpen={i.severity === "high"} accent={i.severity === "high" ? "var(--risk)" : i.severity === "medium" ? "var(--warn)" : "var(--t2)"} head={i.problem} tags={<><Pill c={i.severity === "high" ? "var(--risk)" : i.severity === "medium" ? "var(--warn)" : "var(--t2)"}>{i.severity}</Pill>{i.where && <Pill c="var(--c2)">{i.where}</Pill>}</>}><Row label={t("Fix", "الإصلاح")} tone="ok">{i.fix}</Row></Drill>)}</div>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">{([[t("Claims without evidence", "ادعاءات بلا دليل"), r.unsupported, "warn"], [t("Contradictions", "تناقضات"), r.conflicts, "warn"], [t("Boundary flags", "علامات الحدود"), r.boundary, "risk"], [t("Still missing for the decision", "ما ينقص للقرار")+"", r.missing, undefined]] as [string, string[], "warn" | "risk" | undefined][]).filter(([, x]) => x.length).map(([l, x, tone]) => <div key={l} className="rounded-[12px] border border-line bg-bg1 p-3"><Bullets label={l} items={x} tone={tone} /></div>)}</div>
    </Block>
  );
}
