"use client";
import { useMemo, useState } from "react";
import { Block } from "../falcon/bits";
import { GROUPS, SERIES, catalogue, fmtValue, nameOf, radarAxes, split, spread, tally, type CompareCountry, type Lang, type Metric, type SectionId } from "@/lib/compare";
import { PURPOSE_BY, type RankRow } from "@/lib/compare-rank";
import { Legend, LeaderTally, MetricCard, Radar, RivalBars, TrendCards } from "./CompareVisuals";
import { CompareAngles } from "./CompareAngles";
import { CompareSections } from "./CompareSections";
import { SortTable } from "./CompareTable";
import { CompareRank, type RankState } from "./CompareRank";
import { ComparePlaybook, RelationCards } from "./ComparePlaybook";

type View = "overview" | "sections" | "angles" | "ranking" | "playbook" | "multiples" | "table";
const VIEWS: { id: View; en: string; ar: string }[] = [{ id: "overview", en: "Overview", ar: "نظرة عامة" }, { id: "sections", en: "Data sections", ar: "أقسام البيانات" }, { id: "angles", en: "Fourteen angles", ar: "الزوايا الأربع عشرة" }, { id: "ranking", en: "Rank by purpose", ar: "الترتيب حسب الغرض" }, { id: "playbook", en: "Playbook and sequence", ar: "الدليل والتسلسل" }, { id: "multiples", en: "Small multiples", ar: "رسوم مصغّرة" }, { id: "table", en: "Sortable table", ar: "جدول قابل للفرز" }];

/** The free comparison: the chosen countries side by side from held data. Which figures show is the user's choice (by group or one by one); the leader of each figure is starred (it can be switched off); six views of the same figures: an overview (who leads, the key-figure radar, the UAE's position in each country, where they differ, the rivals), the fourteen angles and six lenses with gaps shown as gaps, a ranking by purpose with live weights, the playbook line of each country with the recommended sequence, one small chart per figure with the trade and growth series, and a table that sorts by any column. Nothing here calls a model. */
export function CompareBoard({ cs, L, off, setOff, names, active, rank, setRank, rows, asOf }: { cs: CompareCountry[]; L: Lang; off: Set<string>; setOff: (s: Set<string>) => void; names: (iso: string) => string; active: Metric[]; rank: RankState; setRank: (r: RankState) => void; rows: RankRow[]; asOf: string }) {
  const t = (en: string, ar: string) => (L === "ar" ? ar : en); const [view, setView] = useState<View>("overview"); const [hi, setHi] = useState<string | null>(null); const [showLeader, setShowLeader] = useState(true); const [section, setSection] = useState<SectionId>("political");
  const all = useMemo(() => catalogue(cs), [cs]); const { shown, notHeld } = useMemo(() => split(all, cs), [all, cs]);
  const toggle = (ids: string[], on: boolean) => { const n = new Set(off); for (const id of ids) { if (on) n.delete(id); else n.add(id); } setOff(n); };
  const tl = useMemo(() => tally(cs, active), [cs, active]); const axes = useMemo(() => radarAxes(cs, active, L), [cs, active, L]);
  const differ = useMemo(() => active.filter((m) => m.dir !== "none").map((m) => ({ m, s: spread(m, cs) })).filter((x): x is { m: Metric; s: number } => x.s != null && x.s > 0).sort((a, z) => z.s - a.s).slice(0, 5), [active, cs]);
  const pu = PURPOSE_BY.get(rank.purposeId); const purposeName = pu ? (L === "ar" ? pu.ar : pu.en) : rank.purposeId;
  return (
    <div className="space-y-3">
      <Block title={t("What to compare", "ما الذي تقارنه")} hint={t("Every figure is held in the platform; one that none of the chosen countries has is not offered. Turn groups or single figures off; the charts, the ranking and the PDF follow.", "كل رقم محفوظ في المنصة؛ والرقم الذي لا تملكه أي من الدول المختارة لا يُعرض. أطفئ مجموعات أو أرقامًا منفردة وستتبعها الرسوم والترتيب وملف PDF.")} right={<label className="flex shrink-0 items-center gap-1.5 text-[12px] text-t1"><input type="checkbox" checked={showLeader} onChange={(e) => setShowLeader(e.target.checked)} />{t("Mark the leader", "علّم المتقدّم")}</label>}>
        <div className="space-y-2">{GROUPS.map((g) => { const ms = shown.filter((m) => m.group === g.id); if (!ms.length) return null; const on = ms.filter((m) => !off.has(m.id)).length; return (
          <details key={g.id} className="rounded-[10px] border border-line bg-bg2"><summary className="flex cursor-pointer list-none items-center gap-2 p-2.5 text-[12.5px] font-semibold text-t0"><input type="checkbox" aria-label={L === "ar" ? g.ar : g.en} checked={on === ms.length} ref={(el) => { if (el) el.indeterminate = on > 0 && on < ms.length; }} onClick={(e) => e.stopPropagation()} onChange={(e) => toggle(ms.map((m) => m.id), e.target.checked)} />{L === "ar" ? g.ar : g.en}<span className="numt ms-auto text-[11px] font-normal text-t2">{on}/{ms.length}</span></summary>
            <ul className="grid gap-x-4 gap-y-1 border-t border-line p-2.5 sm:grid-cols-2">{ms.map((m) => <li key={m.id}><label className="flex items-start gap-1.5 text-[12px] text-t1"><input type="checkbox" className="mt-0.5" checked={!off.has(m.id)} onChange={(e) => toggle([m.id], e.target.checked)} />{L === "ar" ? m.ar : m.en}{m.thin && <span className="ms-1 text-[10px] text-warn">{t("thin data", "بيانات ضعيفة")}</span>}</label></li>)}</ul></details>); })}</div>
        {notHeld.length > 0 && <p className="mt-2 text-[11.5px] text-t2">{t("Not held for any of these countries (so not offered): ", "غير محفوظ لأي من هذه الدول (فلا يُعرض): ")}{notHeld.map((m) => (L === "ar" ? m.ar : m.en)).join("; ")}.</p>}
      </Block>

      <div className="flex flex-wrap items-center gap-3"><div role="tablist" aria-label={t("Views", "العروض")} className="flex flex-wrap gap-1">{VIEWS.map((v) => <button key={v.id} role="tab" type="button" aria-selected={view === v.id} onClick={() => setView(v.id)} className={`h-8 rounded-full px-3 text-[12px] ${view === v.id ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{L === "ar" ? v.ar : v.en}</button>)}</div><Legend cs={cs} L={L} setHi={setHi} /></div>

      {active.length === 0 && view !== "playbook" && <p className="rounded-[12px] border border-dashed border-line p-4 text-[13px] text-t1">{t("Every figure is switched off. Turn some on above.", "كل الأرقام مطفأة. شغّل بعضها أعلاه.")}</p>}

      {active.length > 0 && view === "overview" && <>
        <Block title={t("Who leads", "من يتقدّم")} hint={t("Counted over the figures that name a leader: at least two of the countries hold it and they differ. For debt, inflation, unemployment and a rival's share the lowest leads; for the rest the highest.", "تُحتسب على الأرقام التي تحدد متقدّمًا: تتوافر لدولتين على الأقل وتختلفان. في الدين والتضخم والبطالة وحصة المنافس يتقدّم الأدنى، وفي الباقي الأعلى.")}><LeaderTally cs={cs} rows={tl} L={L} hi={hi} /></Block>
        <Block title={t("The radar: key figures", "الرادار: أرقام رئيسية")}><Radar cs={cs} axes={axes} L={L} hi={hi} /></Block>
        <Block title={t("The UAE's position in each country", "موقع الإمارات في كل دولة")} hint={t("Its mission, the CEPA, the joint committees, the agreements on file and the latest visits.", "بعثتها والشراكة الاقتصادية واللجان المشتركة والاتفاقيات المحفوظة وآخر الزيارات.")}><RelationCards cs={cs} L={L} hi={hi} /></Block>
        {differ.length > 0 && <Block title={t("Where they differ most", "أين تختلف أكثر")}><ul className="space-y-1.5">{differ.map(({ m }) => <li key={m.id} className="text-[12.5px] text-t1"><b className="text-t0">{L === "ar" ? m.ar : m.en}</b>: {cs.map((c) => `${nameOf(c, L)} ${fmtValue(m, c.v[m.id], L)}`).join(" · ")}</li>)}</ul></Block>}
        {active.some((m) => m.group === "rivals") && <Block title={t("The UAE against its rivals", "الإمارات أمام منافسيها")} hint={t("Each country's trade: the UAE's share and the five largest rival shares.", "تجارة كل دولة: حصة الإمارات وأكبر خمس حصص للمنافسين.")}><RivalBars cs={cs} L={L} hi={hi} names={names} /></Block>}
      </>}

      {view === "sections" && <CompareSections cs={cs} L={L} hi={hi} active={active} showLeader={showLeader} names={names} section={section} setSection={setSection} />}
      {view === "angles" && <CompareAngles cs={cs} L={L} hi={hi} active={active} showLeader={showLeader} />}
      {view === "ranking" && <CompareRank cs={cs} L={L} metrics={shown} state={rank} setState={setRank} rows={rows} />}
      {view === "playbook" && <ComparePlaybook cs={cs} L={L} order={rows.map((r) => r.iso)} purposeName={purposeName} asOf={asOf} />}

      {active.length > 0 && view === "multiples" && <>
        {GROUPS.map((g) => { const ms = active.filter((m) => m.group === g.id); if (!ms.length) return null; return (
          <Block key={g.id} title={L === "ar" ? g.ar : g.en}><ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{ms.map((m) => <MetricCard key={m.id} m={m} cs={cs} L={L} hi={hi} showLeader={showLeader} />)}</ul>{g.id === "rivals" && <div className="mt-3"><RivalBars cs={cs} L={L} hi={hi} names={names} /></div>}</Block>); })}
        {SERIES.map((sd) => <Block key={sd.id} title={L === "ar" ? sd.ar : sd.en} hint={t("Observed years only (the last ten held), one scale for all the countries.", "السنوات المرصودة فقط (آخر عشر محفوظة)، بمقياس واحد لكل الدول.")}><TrendCards cs={cs} L={L} hi={hi} kind={sd.id} /></Block>)}</>}

      {active.length > 0 && view === "table" && <SortTable cs={cs} ms={active} L={L} hi={hi} showLeader={showLeader} filterable />}
    </div>
  );
}
