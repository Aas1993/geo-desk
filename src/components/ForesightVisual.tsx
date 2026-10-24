"use client";
import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { parseForesight } from "@/lib/visual";
import { Meter, Panel } from "./VisualBrief";
import { Bars, ChangesPanel, DIRC, GLYPH, HeatGrid, ImpactGraph, ImpactMatrix, OppRadar, OptionColumns, PV, RiskHeat, ScenarioPanel, SignpostList, type Lang } from "./fs-panels";
import { useForesightData, useTracker } from "./fs-hooks";
import { GatesPanel } from "./falcon/GatesPanel";

const V = {
  en: { title: "Illustrated view", sub: "The report as pictures: the data baseline, the outlook of every front over five horizons, scenarios you can re-weight, the UAE impact and opportunity radar, options by window, the risk heat map and the signposts. Built from the text and the datasets; it costs nothing extra.", base: "Data baseline", imf: "IMF path", growth: "Real GDP growth, %", debt: "Public debt, % of GDP", bluf: "Bottom line", outlook: "Strategic outlook", uae: "Most important UAE implication", judg: "Key judgments", weak: "Weak signals and trends", ranges: "Forecast ranges", ind: "Indicator", latest: "Latest", y3: "3 years", y5: "5 years", y10: "10 years", scores: "Comparative scores", scoresHint: "Dataset percentiles or analyst judgments, each with its basis in the text: not objective measurements.", est: "estimate or projection", noText: "The report text has no tables the picture view can read yet.", sigs: "What the datasets already show", adv: "Reconciled call" },
  ar: { title: "العرض المصوّر", sub: "التقرير بالصور: خط الأساس من البيانات، وتوقعات كل جبهة على خمسة آفاق، وسيناريوهات يمكن إعادة ترجيحها، والأثر على الإمارات ورادار الفرص، والخيارات حسب النافذة الزمنية، وخريطة المخاطر والمؤشرات. مبني على النص والبيانات ولا يكلّف شيئًا إضافيًا.", base: "خط الأساس من البيانات", imf: "مسار صندوق النقد", growth: "نمو الناتج الحقيقي، %", debt: "الدين العام، % من الناتج", bluf: "الخلاصة", outlook: "التوجه الاستراتيجي", uae: "أهم أثر على الإمارات", judg: "الأحكام الرئيسية", weak: "الإشارات الضعيفة والاتجاهات", ranges: "نطاقات التوقع", ind: "المؤشر", latest: "الأحدث", y3: "3 سنوات", y5: "5 سنوات", y10: "10 سنوات", scores: "مقارنات الدرجات", scoresHint: "نسب مئوية من البيانات أو تقديرات المحلل، ولكلٍّ أساسه في النص: وليست قياسات موضوعية.", est: "تقدير أو توقع", noText: "لا يحتوي نص التقرير بعدُ على جداول يقرأها العرض المصوّر.", sigs: "ما تُظهره البيانات أصلًا", adv: "الحكم الموحّد" },
} as const;
const CLS: Record<string, string> = { "strong trend": "var(--ok)", "weak signal": "var(--warn)", uncertainty: "var(--c2)", speculative: "var(--t2)" };
const tone = (v: number) => (v >= 70 ? "var(--ok)" : v >= 45 ? "var(--warn)" : "var(--risk)");

/** The illustrated part of the Comprehensive Strategic Foresight Report: it reads the matrices the model wrote and the free data baseline, and draws them, with no further model call. */
export function ForesightVisual({ iso3, name, markdown, prevMarkdown, prevAt }: { iso3: string; name: string; markdown: string; prevMarkdown?: string | null; prevAt?: string }) {
  const { lang } = useT(); const L = lang as Lang; const u = V[L]; const v = PV[L]; const p = useMemo(() => parseForesight(markdown), [markdown]); const prev = useMemo(() => (prevMarkdown ? parseForesight(prevMarkdown) : null), [prevMarkdown]);
  const data = useForesightData(iso3); const { track, has } = useTracker(iso3, "Strategic report");
  const [wOver, setW] = useState<Record<string, number>>({}); const weights = useMemo(() => ({ ...Object.fromEntries(p.scenarios.filter((s) => !s.wildcard).map((s) => [s.code, s.weight ?? 0])), ...wOver }), [p.scenarios, wOver]);
  const m = data?.macro; const kp = (data?.signals ?? []).filter((s) => ["Growth outlook", "Public debt path", "Inflation", "External balance", "Partnership with the UAE", "Bilateral event tone"].includes(s.label)).slice(0, 6);
  const nothing = !p.bluf && !p.matrix.length && !p.scenarios.length && !p.opportunities.length && !p.signposts.length;
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      <div className="no-print"><h3 className="display text-[17px] font-semibold text-t0">{u.title} · {name}</h3><p className="mt-0.5 text-[12px] leading-snug text-t2">{u.sub}</p></div>
      {(m || kp.length > 0 || (data?.exposure.length ?? 0) > 0) && (
        <section className="fs-page"><Panel title={u.base}>
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,300px)]">
            <div className="space-y-3">
              {kp.length > 0 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{kp.map((s) => <div key={s.id} className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[19px] font-semibold leading-tight text-t0" dir="auto">{s.value}{s.arrow && <span className="ms-1 text-[10px] text-t1">{s.arrow === "up" ? "▲" : s.arrow === "down" ? "▼" : "▬"}</span>}</div><div className="mt-0.5 text-[11px] leading-snug text-t1">{s.label}</div></div>)}</div>}
              {m && <div className="grid gap-4 sm:grid-cols-2"><div><h4 className="label mb-1">{u.growth}</h4><Bars s={m.growth} first={m.firstEstimate} unit="%" label={u.growth} /></div><div><h4 className="label mb-1">{u.debt}</h4><Bars s={m.debt} first={m.firstEstimate} unit="" label={u.debt} /></div></div>}
              {m && <p className="text-[10.5px] text-t2">{u.est}: {m.firstEstimate}+ · IMF World Economic Outlook</p>}
            </div>
            {data && <div><h4 className="label mb-1 text-center">{v.exp}</h4><ImpactGraph exposure={data.exposure} L={L} name={name} /></div>}
          </div>
        </Panel></section>
      )}
      {(p.bluf || p.outlook) && <section className="fs-page rounded-[14px] border border-accent/40 bg-accent/5 p-4"><h4 className="label mb-1.5 text-accent">{u.bluf}</h4><p className="text-[14px] leading-relaxed text-t0">{p.bluf}</p>{p.outlook?.dir && <p className="mt-2 text-[12.5px] text-t1"><b style={{ color: DIRC[p.outlook.dir] }}>{GLYPH[p.outlook.dir]} {v.dir[p.outlook.dir]}</b> {p.outlook.band ? `· ${p.outlook.band.label}` : ""} {p.outlook.text ? `· ${p.outlook.text}` : ""}</p>}{p.uae && <p className="mt-1 text-[12.5px] text-t0">🇦🇪 {p.uae}</p>}</section>}
      {p.judgments.length > 0 && <section className="fs-page"><Panel title={u.judg}><ul className="grid gap-2.5 md:grid-cols-2">{p.judgments.map((j, i) => <Meter key={i} j={j} lang={L} />)}</ul></Panel></section>}
      {p.matrix.length > 0 && <section className="fs-page"><HeatGrid p={p} L={L} /></section>}
      {p.weak.length > 0 && <section className="fs-page"><Panel title={u.weak}><ul className="grid gap-2 md:grid-cols-2">{p.weak.map((w, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5" style={{ borderInlineStart: `3px solid ${CLS[w.cls.toLowerCase()] ?? "var(--line)"}` }}><div className="flex items-baseline justify-between gap-2"><span className="text-[12.5px] font-medium text-t0">{w.signal}</span><span className="text-[10px] font-semibold uppercase" style={{ color: CLS[w.cls.toLowerCase()] ?? "var(--t2)" }}>{w.cls}</span></div><p className="mt-0.5 text-[11.5px] leading-snug text-t1">{w.evidence}</p><p className="mt-0.5 text-[11px] leading-snug text-t2">🇦🇪 {w.why}</p></li>)}</ul></Panel></section>}
      {p.ranges.length > 0 && <section className="fs-page"><Panel title={u.ranges}><div className="overflow-x-auto"><table className="num w-full min-w-[480px] text-[12px]"><thead><tr className="text-start text-[10.5px] uppercase tracking-wide text-t2"><th className="py-1 text-start">{u.ind}</th><th className="text-start">{u.latest}</th><th className="text-start">{u.y3}</th><th className="text-start">{u.y5}</th><th className="text-start">{u.y10}</th></tr></thead><tbody className="divide-y divide-line">{p.ranges.map((r, i) => <tr key={i}><td className="py-1.5 pe-2 font-medium text-t0">{r.indicator}</td><td className="pe-2 text-t0">{r.latest}</td><td className="pe-2 text-t1">{r.y3}</td><td className="pe-2 text-t1">{r.y5}</td><td className="text-t1">{r.y10}</td></tr>)}</tbody></table></div></Panel></section>}
      {p.scenarios.length > 0 && <section className="fs-page"><ScenarioPanel p={p} L={L} weights={weights} /></section>}
      {p.impact.length > 0 && <section className="fs-page"><ImpactMatrix p={p} L={L} /></section>}
      {p.opportunities.length > 0 && <section className="fs-page"><OppRadar p={p} L={L} weights={weights} setWeights={setW} onTrack={track} tracked={has} /></section>}
      {p.options.length > 0 && <section className="fs-page"><OptionColumns p={p} L={L} onTrack={track} tracked={has} />{p.reconciled && <p className="mt-2 rounded-[10px] border border-accent/40 bg-accent/5 p-2.5 text-[12.5px] leading-snug text-t0"><b className="text-accent">{u.adv}: </b>{p.reconciled}</p>}</section>}
      {p.risks.length > 0 && <section className="fs-page"><RiskHeat p={p} L={L} /></section>}
      {p.signposts.length > 0 && <section className="fs-page"><SignpostList p={p} L={L} /></section>}
      {p.scores.length > 0 && <section className="fs-page"><Panel title={u.scores}><ul className="grid gap-2 md:grid-cols-2">{p.scores.map((s, i) => <li key={i}><div className="flex justify-between text-[12px]"><span className="text-t0">{s.score}</span><span className="num text-t1">{s.value ?? "—"}</span></div><div className="mt-1 h-2 rounded-full bg-bg3"><div className="h-2 rounded-full" style={{ width: `${Math.max(2, s.value ?? 0)}%`, background: s.value == null ? "transparent" : tone(s.value) }} /></div><p className="mt-0.5 text-[10px] text-t2">{s.basis}</p></li>)}</ul><p className="mt-2 text-[10.5px] text-t2">{u.scoresHint}</p></Panel></section>}
      <div className="no-print"><ChangesPanel now={p} prev={prev} prevAt={prevAt} L={L} /></div>
      <div className="no-print"><GatesPanel md={markdown} kind="foresight" L={L} iso3={iso3} /></div>
      {nothing && <p className="text-[12px] text-t2">{u.noText}</p>}
    </div>
  );
}
