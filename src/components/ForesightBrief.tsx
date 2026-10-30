"use client";
import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { parseForesight, type FsParsed } from "@/lib/visual";
import { Meter } from "./VisualBrief";
import { Bars, BandChip, ChangesPanel, DIRC, DirChip, GLYPH, ImpactMatrix, OppRadar, OptionColumns, PV, RiskHeat, ScenarioPanel, SignpostList, type Lang } from "./fs-panels";
import { useForesightData, useTracker } from "./fs-hooks";
import { GatesPanel } from "./falcon/GatesPanel";
import { Plus } from "lucide-react";

const B = {
  en: { title: "Ministerial Executive Foresight Brief", page: "Page", pages: ["Strategic Intelligence Snapshot", "What Is Changing and Why It Matters", "Future Outlook and Scenarios", "Implications for the UAE", "Strategic Opportunities for the UAE", "Strategic Options for Ministerial Consideration", "Risks, Triggers and Early Warning", "Ministerial Bottom Line"],
    outlook: "Strategic outlook", uae: "Most important UAE implication", opp: "Most significant opportunity", judg: "Key judgments", evidence: "Evidence", why: "Why it matters to the UAE", timeline: "Timeline", likely: "Most likely direction", path: "Forecast path", imf: "IMF path (growth, debt)", growth: "Real GDP growth, %", debt: "Public debt, % of GDP", know: "What you need to know", next: "What may happen next", whyUae: "Why it matters for the UAE", adv: "The advantage the UAE could gain", decisions: "Decisions or directions that may be required", monitor: "Keep monitoring", reconciled: "Reconciled call", source: "Source summary: every figure carries its source and date in the text version. Open-source analysis built from public sources and the application's datasets; not a classified assessment.", empty: "The brief text has no sections the page view can read yet.", scope: "Scope", track: "Track", tracked: "Tracked" },
  ar: { title: "موجز الاستشراف التنفيذي للوزير", page: "صفحة", pages: ["لمحة الاستخبارات الاستراتيجية", "ما الذي يتغير ولماذا يهم", "التوقعات والسيناريوهات", "الآثار على الإمارات", "الفرص الاستراتيجية للإمارات", "خيارات استراتيجية لنظر الوزير", "المخاطر والمحفزات والإنذار المبكر", "الخلاصة للوزير"],
    outlook: "التوجه الاستراتيجي", uae: "أهم أثر على الإمارات", opp: "أهم فرصة", judg: "الأحكام الرئيسية", evidence: "الدليل", why: "لماذا يهم الإمارات", timeline: "الخط الزمني", likely: "الاتجاه الأرجح", path: "مسار التوقع", imf: "مسار صندوق النقد (النمو والدين)", growth: "نمو الناتج الحقيقي، %", debt: "الدين العام، % من الناتج", know: "ما يجب أن تعرفه", next: "ما قد يحدث لاحقًا", whyUae: "لماذا يهم الإمارات", adv: "الميزة التي قد تكسبها الإمارات", decisions: "قرارات أو توجيهات قد تلزم", monitor: "تابع رصد", reconciled: "الحكم الموحّد", source: "ملخص المصادر: يحمل كل رقم مصدره وتاريخه في النص. تحليل مفتوح المصدر مبني على مصادر عامة وبيانات التطبيق؛ وليس تقييمًا سريًا.", empty: "لا يحتوي نص الموجز بعدُ على أقسام يقرأها عرض الصفحات.", scope: "النطاق", track: "تتبّع", tracked: "قيد التتبع" },
} as const;

function Page({ n, title, children, L, kicker }: { n: number; title: string; children: React.ReactNode; L: Lang; kicker?: string }) {
  return (
    <section className="fs-page rounded-[16px] border border-line bg-bg1 p-4 sm:p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-2.5"><div className="min-w-0"><div className="label text-accent">{B[L].page} {n} / 8</div><h3 className="display text-[18px] font-semibold leading-tight text-t0">{title}</h3></div>{kicker && <p className="hidden max-w-[44%] text-end text-[11.5px] leading-snug text-t2 sm:block">{kicker}</p>}</header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
const Callout = ({ label, text, accent }: { label: string; text: string; accent?: boolean }) => (text ? <div className={`rounded-[12px] p-3 ${accent ? "border border-accent/40 bg-accent/5" : "bg-bg2"}`}><div className={`label mb-1 ${accent ? "text-accent" : ""}`}>{label}</div><p className="text-[13.5px] leading-snug text-t0">{text}</p></div> : null);

/** The Ministerial Executive Foresight Brief as eight designed pages read from the brief's own text and tables; one dominant message per page, large numbers, a UAE implication on every page. No model call beyond the brief itself. */
export function ForesightBrief({ iso3, name, markdown, prevMarkdown, prevAt }: { iso3: string; name: string; markdown: string; prevMarkdown?: string | null; prevAt?: string }) {
  const { lang } = useT(); const L = lang as Lang; const u = B[L]; const v = PV[L]; const p = useMemo<FsParsed>(() => parseForesight(markdown), [markdown]); const prev = useMemo(() => (prevMarkdown ? parseForesight(prevMarkdown) : null), [prevMarkdown]);
  const data = useForesightData(iso3); const { track, has } = useTracker(iso3, "Ministerial brief");
  const [weights, setWeights] = useState<Record<string, number>>({}); const w = useMemo(() => { const base = Object.fromEntries(p.scenarios.filter((s) => !s.wildcard).map((s) => [s.code, s.weight ?? 0])); return { ...base, ...weights }; }, [p.scenarios, weights]);
  const m = data?.macro; const nothing = !p.judgments.length && !p.changes.length && !p.scenarios.length && !p.options.length;
  if (nothing) return <p className="text-[12.5px] text-t2">{u.empty}</p>;
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      <div className="no-print"><h3 className="display text-[17px] font-semibold text-t0">{u.title} · {name}</h3></div>
      <div className="hidden print:block"><h2 className="display text-[20px] font-semibold">{u.title} · {name}</h2></div>
      <Page n={1} title={u.pages[0]} L={L} kicker={p.scope}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="rounded-[14px] p-4" style={{ background: p.outlook?.dir ? `color-mix(in srgb, ${DIRC[p.outlook.dir]} 14%, var(--bg-2))` : "var(--bg-2)", borderInlineStart: `5px solid ${p.outlook?.dir ? DIRC[p.outlook.dir] : "var(--line)"}` }}>
            <div className="label mb-1">{u.outlook}</div>
            <div className="display flex items-center gap-2 text-[28px] font-semibold leading-none" style={{ color: p.outlook?.dir ? DIRC[p.outlook.dir] : undefined }}>{p.outlook?.dir ? `${GLYPH[p.outlook.dir]} ${v.dir[p.outlook.dir]}` : "—"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><BandChip b={p.outlook?.band ?? null} L={L} /></div>
            {p.outlook?.text && <p className="mt-2 text-[13px] leading-snug text-t0">{p.outlook.text}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{p.dashboard.map((k, i) => { const big = k.value.split(/\s*[(,;]/)[0].trim(); const rest = k.value.slice(big.length).replace(/^[\s(,;]+|[)\s]+$/g, ""); return <div key={i} className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[24px] font-semibold leading-tight text-t0" dir="auto">{big}</div>{rest && <div className="num text-[10.5px] leading-snug text-t1">{rest}</div>}<div className="mt-0.5 text-[11.5px] leading-snug text-t1">{k.label}</div><div className="num mt-0.5 flex items-center gap-1 text-[10px] text-t2">{k.dir && <span style={{ color: DIRC[k.dir] }}>{GLYPH[k.dir]}</span>}<span>{k.year}{k.source ? ` · ${k.source}` : ""}</span></div></div>; })}</div>
        </div>
        {p.judgments.length > 0 && <div><h4 className="label mb-2">{u.judg}</h4><ul className="grid gap-2.5 md:grid-cols-2">{p.judgments.map((j, i) => <Meter key={i} j={j} lang={L} />)}</ul></div>}
        <div className="grid gap-2.5 md:grid-cols-2"><Callout label={u.uae} text={p.uae} accent /><Callout label={u.opp} text={p.opportunity} accent /></div>
      </Page>
      <Page n={2} title={u.pages[1]} L={L}>
        <ol className="grid gap-2.5 md:grid-cols-2">{p.changes.map((c, i) => (
          <li key={i} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${c.dir ? DIRC[c.dir] : "var(--line)"}` }}><div className="flex items-center justify-between gap-2"><span className="num text-[11px] text-t2">{i + 1}</span><DirChip d={c.dir} L={L} /></div>
            <p className="mt-1 text-[13.5px] font-semibold leading-snug text-t0">{c.text}</p>{c.evidence && <p className="mt-1 text-[11.5px] leading-snug text-t1">{c.evidence}</p>}{c.when && <p className="num mt-0.5 text-[10.5px] text-t2">⏱ {c.when}</p>}
            {c.why && <p className="mt-2 rounded-[8px] bg-bg1 p-2 text-[11.5px] leading-snug text-t0">🇦🇪 {c.why}</p>}</li>))}</ol>
        {p.timeline.length > 0 && <div><h4 className="label mb-2">{u.timeline}</h4><div className="overflow-x-auto" dir="ltr"><ol className="relative flex min-w-[520px] gap-0 pt-3"><span aria-hidden className="absolute inset-x-0 top-[17px] h-px bg-line" />{p.timeline.map((t, i) => <li key={i} className="relative flex-1 px-1.5"><i className="absolute -top-0.5 start-1.5 size-2.5 rounded-full bg-accent ring-4 ring-bg1" /><div className="num mt-3 text-[11px] font-semibold text-accent">{t.date}</div><div className="text-[12px] leading-snug text-t0">{t.event}</div>{t.why && <div className="text-[10.5px] leading-snug text-t2">{t.why}</div>}</li>)}</ol></div></div>}
      </Page>
      <Page n={3} title={u.pages[2]} L={L} kicker={p.mostLikely ? `${u.likely}: ${p.mostLikely}` : undefined}>
        {p.forecastPath.length > 0 && <div><h4 className="label mb-2">{u.path}</h4><ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(5, p.forecastPath.length)},minmax(0,1fr))` }}>{p.forecastPath.slice(0, 5).map((f, i) => (
          <li key={i} className="rounded-[12px] bg-bg2 p-2.5"><div className="num text-[12px] font-bold text-accent">{f.horizon}</div><p className="mt-1 text-[11.5px] leading-snug text-t0">{f.text}</p><div className="mt-1.5 flex flex-wrap gap-1"><BandChip b={f.band} L={L} />{f.confidence && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10px] text-t1">{v.conf[f.confidence]}</span>}</div></li>))}</ol></div>}
        {m && (m.growth.length > 2 || m.debt.length > 2) && <div className="grid gap-4 sm:grid-cols-2"><div><h4 className="label mb-1">{u.growth}</h4><Bars s={m.growth} first={m.firstEstimate} unit="%" label={u.growth} /></div><div><h4 className="label mb-1">{u.debt}</h4><Bars s={m.debt} first={m.firstEstimate} unit="" label={u.debt} /></div></div>}
        <ScenarioPanel p={p} L={L} weights={w} />
      </Page>
      <Page n={4} title={u.pages[3]} L={L}><ImpactMatrix p={p} L={L} /></Page>
      <Page n={5} title={u.pages[4]} L={L}><OppRadar p={p} L={L} weights={w} setWeights={setWeights} onTrack={track} tracked={has} /></Page>
      <Page n={6} title={u.pages[5]} L={L} kicker={p.reconciled ? `${u.reconciled}: ${p.reconciled}` : undefined}><OptionColumns p={p} L={L} onTrack={track} tracked={has} />{p.reconciled && <Callout label={u.reconciled} text={p.reconciled} accent />}</Page>
      <Page n={7} title={u.pages[6]} L={L}><RiskHeat p={p} L={L} /><SignpostList p={p} L={L} /></Page>
      <Page n={8} title={u.pages[7]} L={L}>
        <div className="grid gap-2.5 md:grid-cols-2"><Callout label={u.know} text={p.bottom.know} accent /><Callout label={u.next} text={p.bottom.next} /><Callout label={u.whyUae} text={p.bottom.why} /><Callout label={u.adv} text={p.bottom.advantage} accent /></div>
        <div className="grid gap-2.5 md:grid-cols-2">
          <div className="rounded-[12px] bg-bg2 p-3"><div className="label mb-1.5">{u.decisions}</div><ul className="space-y-1.5">{p.bottom.decisions.map((d, i) => <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-t0"><span aria-hidden className="text-accent">☐</span><span className="min-w-0 flex-1">{d}</span><button type="button" onClick={() => track(d, "decision")} disabled={has(d)} className="no-print inline-flex shrink-0 items-center gap-0.5 self-start text-[10.5px] text-accent hover:underline disabled:text-t2"><Plus size={10} />{has(d) ? u.tracked : u.track}</button></li>)}</ul></div>
          <div className="rounded-[12px] bg-bg2 p-3"><div className="label mb-1.5">{u.monitor}</div><ul className="space-y-1.5">{p.bottom.monitor.map((d, i) => <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-t0"><span aria-hidden className="text-warn">▲</span><span>{d}</span></li>)}</ul></div>
        </div>
        <p className="text-[10.5px] leading-snug text-t2">{u.source}</p>
      </Page>
      <div className="no-print"><ChangesPanel now={p} prev={prev} prevAt={prevAt} L={L} /></div>
      <div className="no-print"><GatesPanel md={markdown} kind="foresight" L={L} iso3={iso3} /></div>
    </div>
  );
}
