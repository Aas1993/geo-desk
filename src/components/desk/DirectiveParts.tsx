"use client";
import { useMemo, type ReactNode } from "react";
import { ClipboardList, Flag, Layers, ListChecks, Scale } from "lucide-react";
import type { Directive } from "@/lib/desk/core";
import { headOf } from "@/lib/report/model";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Fold, FoldGroup, ReportHero, Timeline, type StatSpec } from "../report/kit";
import { AsOfSoWhat, StandardParts, useStandard } from "../report/standard";
import { Bullets, Rich } from "./shared";

// A DIRECTIVE OR QUESTION'S ANSWER AS A PAGE: the answer and the confidence at the head (with the counts of what follows), the recommendation, the options side by side as cards (for and against counted, cost and risk stated), the way forward as a timeline grouped by when, the risks with their mitigations, what only the desk can supply and the follow-up questions. Everything the parsed answer holds is on the page; nothing is estimated here.
const stat = (n: number, label: string, c: string, icon: ReactNode, jump: string): StatSpec => (n === 0 ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });

export function DirectiveView({ L, id, report, at, d, kind, chief, onFollow }: { L: Lang; id: string; report: string; at: string; d: Directive; kind: string; chief: string; onFollow: (t: string) => void }) {
  const t = useTr(L); const std = useStandard(report); const head = useMemo(() => headOf("directive", report, { lang: L, confidence: d.confidence, bottomLine: d.answer }), [report, L, d]);
  const sec = (k: string) => `dir-${id}-${k}`; const nav = [...(d.options.length ? [{ id: sec("options"), label: t("Options", "الخيارات") }] : []), ...(d.steps.length ? [{ id: sec("steps"), label: t("The way forward", "سبيل المضي") }] : []), ...(d.risks.length ? [{ id: sec("risks"), label: t("Risks", "المخاطر") }] : [])];
  const groups = useMemo(() => { const out: { when: string; steps: (Directive["steps"][number] & { n: number })[] }[] = []; d.steps.forEach((s, i) => { const w = s.when || t("Unscheduled", "غير مجدول"); const g = out.find((x) => x.when === w); if (g) g.steps.push({ ...s, n: i + 1 }); else out.push({ when: w, steps: [{ ...s, n: i + 1 }] }); }); return out; }, [d.steps, L]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mt-3 space-y-3">
      <ReportHero L={L} kicker={`${kind} · ${chief}`} bottomLine={d.answer} head={head} gauge={null} nav={nav}
        stats={[stat(d.options.length, t("options", "خيارات"), "var(--accent)", <Layers size={16} />, sec("options")), stat(d.steps.length, t("steps", "خطوات"), "var(--c2)", <ListChecks size={16} />, sec("steps")), stat(d.risks.length, t("risks", "مخاطر"), d.risks.length ? "var(--warn)" : "var(--t2)", <Flag size={16} />, sec("risks")), stat(d.needs.length, t("inputs only the desk can give", "مدخلات لا يوفرها إلا المكتب"), "var(--warn)", <ClipboardList size={16} />, sec("needs"))]} />
      <AsOfSoWhat L={L} at={at} soWhat={std?.soWhat} />
      {d.recommendation && <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5"><div className="label">{t("Recommendation", "التوصية")}</div><p className="mt-1 text-[13.5px] leading-snug text-t0" dir="auto"><Rich text={d.recommendation} /></p></div>}
      <FoldGroup L={L} bar={d.options.length + d.steps.length + d.risks.length > 3}>
        {d.options.length > 0 && <Fold id={sec("options")} icon={<Scale size={16} />} title={t("Options", "الخيارات")} count={d.options.length} hint={t("Side by side: what each gains, what it costs and risks.", "جنبًا إلى جنب: ما يكسبه كلٌّ وما يكلّفه وما يخاطر به.")}>
          <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{d.options.map((o, i) => { const tot = Math.max(1, o.pros.length + o.cons.length); return (
            <li key={o.name + i} className="rounded-[14px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug" style={{ borderTop: `3px solid ${o.pros.length >= o.cons.length ? "var(--ok)" : "var(--warn)"}` }}>
              <p className="text-[13.5px] font-semibold text-t0" dir="auto">{o.name}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px]"><span className="numt w-4 text-ok">{o.pros.length}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3" aria-hidden><span className="block h-full bg-ok" style={{ width: `${(o.pros.length / tot) * 100}%` }} /></span><span className="numt w-4 text-end text-warn">{o.cons.length}</span></div>
              <p className="flex justify-between text-[10px] text-t2"><span>{t("for", "مع")}</span><span>{t("against", "ضد")}</span></p>
              <div className="mt-2 space-y-2"><Bullets label={t("For", "مع")} items={o.pros} tone="ok" /><Bullets label={t("Against", "ضد")} items={o.cons} tone="warn" /></div>
              <dl className="mt-2 space-y-1 border-t border-line pt-2"><div className="flex flex-wrap gap-1.5"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-t2">{t("Cost", "الكلفة")}</dt><dd className="text-t0" dir="auto">{o.cost}</dd></div>{o.risk && <div><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-risk">{t("Risk", "الخطر")}</dt><dd className="text-t0" dir="auto">{o.risk}</dd></div>}</dl>
            </li>); })}</ul></Fold>}
        {d.steps.length > 0 && <Fold id={sec("steps")} icon={<ListChecks size={16} />} title={t("The way forward", "سبيل المضي")} count={d.steps.length} hint={t("In order, grouped by when; owners are proposed.", "بالترتيب ومجمّعة بحسب التوقيت؛ والمسؤولون مقترحون.")}>
          <Timeline entries={groups.map((g) => ({ when: g.when, color: "var(--accent)", body: g.steps.map((s) => <div key={s.n} className="rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug"><p className="flex flex-wrap items-start gap-1.5 font-semibold text-t0"><span className="numt text-t2">{s.n}.</span><span className="min-w-0 flex-1" dir="auto">{s.action}</span>{s.owner && <Pill c="var(--c2)">{s.owner}</Pill>}</p>{s.detail && <p className="mt-1 text-t1" dir="auto"><Rich text={s.detail} /></p>}</div>) }))} /></Fold>}
        {d.risks.length > 0 && <Fold id={sec("risks")} icon={<Flag size={16} />} title={t("Risks", "المخاطر")} count={d.risks.length}>
          <ul className="grid gap-2.5 md:grid-cols-2">{d.risks.map((r, i) => <li key={r.name + i} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug" style={{ borderInlineStart: "4px solid var(--warn)" }}><p className="font-semibold text-t0" dir="auto">{r.name}</p>{r.mitigation && <p className="mt-1 text-t1" dir="auto"><b className="text-ok">{t("Mitigation", "المعالجة")}: </b>{r.mitigation}</p>}</li>)}</ul></Fold>}
        <StandardParts L={L} std={std} />
      </FoldGroup>
      {d.needs.length > 0 && <div id={sec("needs")} className="scroll-mt-20 rounded-[12px] border border-warn/40 bg-warn/5 p-3"><Bullets label={t("Only the desk or the ministry can supply", "لا يوفره إلا المكتب أو الوزارة")} items={d.needs} tone="warn" /></div>}
      {d.follow.length > 0 && <div><div className="label mb-1">{t("Ask next", "اسأل بعد ذلك")}</div><div className="flex flex-wrap gap-1.5">{d.follow.map((f) => <button key={f} type="button" onClick={() => onFollow(f)} className="rounded-full border border-line bg-bg2 px-3 py-1 text-start text-[12px] text-t0 hover:border-accent">{f}</button>)}</div></div>}
    </div>
  );
}
