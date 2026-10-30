"use client";
import { useMemo, useState } from "react";
import { CalendarClock, Handshake, Layers, Radar, Route, Scale } from "lucide-react";
import { Freshness } from "../bird/visuals";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { ANGLES } from "@/lib/report/angles";
import { HORIZONS, daysSince, milestoneRows, readStandard, type AngleStatus, type Milestone, type Scenario, type Standard } from "@/lib/report/standard";
import { diffBlocks, readPrev } from "@/lib/report/diff";
import { BarList, Columns, Fold, Gantt, ListBar, NoMatch, jumpTo, useListView, type Facet, type SortSpec } from "./kit";

// THE STANDARD PARTS OF A REPORT ON SCREEN (the PDF's twins are in src/lib/report/standardHtml.ts): the as-of line with its freshness, the so-what for the UAE, the angle coverage matrix (click an angle to jump to its section), scenarios with tripwires, the implementation milestones (lanes, a Gantt and a filterable list), the coalition and friends list and the influence ledger. Each part is drawn only when the product carries it; a product made before the standard existed shows none of them.
const ST: Record<AngleStatus, { c: string; en: string; ar: string }> = { covered: { c: "var(--ok)", en: "covered", ar: "مغطى" }, thin: { c: "var(--warn)", en: "thin", ar: "ضعيف" }, notfound: { c: "var(--risk)", en: "not found", ar: "لم يوجد" } };
const SC: Record<Scenario["kind"], { c: string; en: string; ar: string }> = { base: { c: "var(--accent)", en: "Base case", ar: "الحالة الأساسية" }, upside: { c: "var(--ok)", en: "Upside", ar: "الصعود" }, downside: { c: "var(--risk)", en: "Downside", ar: "الهبوط" }, other: { c: "var(--c2)", en: "Scenario", ar: "سيناريو" } };
const HC: Record<Milestone["horizon"], string> = { "30d": "var(--ok)", "100d": "var(--accent)", "1y": "var(--c2)", "3y": "var(--warn)", other: "var(--t2)" };
export const useStandard = (report: string | null | undefined): Standard | null => useMemo(() => (report ? readStandard(report) : null), [report]);

/** The as-of date with its freshness bar, and the so-what for the UAE: the two lines every report opens with. */
export function AsOfSoWhat({ L, at, soWhat }: { L: Lang; at: string; soWhat?: string }) {
  const t = useTr(L); const d = daysSince(at);
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_1fr]">
      {d != null && <div className="rounded-[12px] border border-line bg-bg1 p-3"><p className="label flex items-center gap-1.5"><CalendarClock size={12} aria-hidden />{t("As of", "حتى تاريخ")} <span className="numt text-t0">{at.slice(0, 10)}</span></p><div className="mt-2"><Freshness days={d} /></div><p className="mt-1 text-[11px] text-t2">{d === 0 ? t("made today", "أُعدّ اليوم") : t(`${d} day${d === 1 ? "" : "s"} old`, `قبل ${d} يومًا`)}{d > 30 ? <b className="text-risk"> · {t("stale: re-run before deciding", "قديم: أعد التشغيل قبل القرار")}</b> : null}</p></div>}
      {soWhat && <div className="rounded-[12px] border border-ok/40 bg-ok/10 p-3"><p className="label text-ok">{t("So what for the UAE", "ماذا يعني هذا لمصالح الإمارات")}</p><p className="mt-1 text-[13px] leading-snug text-t0" dir="auto">{soWhat}</p></div>}
    </div>
  );
}

/** The fourteen angles as tiles: covered, thin, not found or not stated. `target` maps an angle id to the id of the section that treats it, and a click jumps there (a tile with no target is not a link). */
export function AngleMatrix({ L, std, target, onJump }: { L: Lang; std: Standard; target?: (angleId: string) => string | null; onJump?: (id: string) => void }) {
  const t = useTr(L); const by = new Map(std.angles.map((a) => [a.id, a])); const n = (s: AngleStatus) => std.angles.filter((a) => a.status === s).length; if (!std.angles.length) return null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11.5px]"><Pill c="var(--ok)">{n("covered")} {t("covered", "مغطاة")}</Pill><Pill c="var(--warn)">{n("thin")} {t("thin", "ضعيفة")}</Pill><Pill c="var(--risk)">{n("notfound")} {t("not found", "لم توجد")}</Pill><Pill c="var(--t2)">{ANGLES.length - std.angles.length} {t("not stated", "غير مذكورة")}</Pill></div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{ANGLES.map((a, i) => { const c = by.get(a.id); const to = c ? target?.(a.id) ?? null : null; const inner = <><span className="flex items-start justify-between gap-1"><span className="numt text-[10.5px] text-t2">{i + 1}</span>{c ? <span className="text-[10px] font-semibold" style={{ color: ST[c.status].c }}>{ST[c.status][L]}</span> : <span className="text-[10px] text-t2">{t("not stated", "غير مذكور")}</span>}</span><span className="mt-0.5 block text-[12px] font-medium leading-snug text-t0">{a.short[L === "ar" ? 1 : 0]}</span>{c?.note && <span className="mt-0.5 block text-[10.5px] leading-snug text-t2" dir="auto">{c.note}</span>}</>;
        const cls = `block w-full rounded-[10px] p-2 text-start ${c ? "bg-bg2" : "border border-dashed border-line bg-bg1"}`; const st = c ? { borderTop: `3px solid ${ST[c.status].c}` } : undefined;
        return <li key={a.id} title={a.en}>{to ? <button type="button" onClick={() => (onJump ?? jumpTo)(to)} className={`${cls} hover:ring-1 hover:ring-accent`} style={st}>{inner}</button> : <div className={cls} style={st}>{inner}</div>}</li>; })}</ul>
    </div>
  );
}
export function ScenarioCards({ L, xs }: { L: Lang; xs: Scenario[] }) {
  const t = useTr(L);
  return (
    <div className="grid gap-3 md:grid-cols-3">{xs.map((x, i) => <div key={i} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${SC[x.kind].c}` }}>
      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold" style={{ color: SC[x.kind].c }}>{x.name || SC[x.kind][L]}{x.likelihood && <Pill c="var(--c2)">{x.likelihood}</Pill>}</p>
      {x.summary && <p className="mt-1 text-[12.5px] leading-snug text-t0" dir="auto">{x.summary}</p>}{x.trigger && <p className="mt-1 text-[12px] text-t1" dir="auto"><b className="text-t0">{t("Trigger", "المحفّز")}:</b> {x.trigger}</p>}
      {x.tripwires.length > 0 && <div className="mt-2"><p className="label">{t("Tripwires", "نقاط الإنذار")}</p><ul className="mt-1 space-y-1.5">{x.tripwires.map((w, k) => <li key={k} className="rounded-[8px] bg-bg1 p-2 text-[12px] leading-snug"><b className="text-t0" dir="auto">{w.indicator}</b>{w.threshold && <> <Pill c="var(--warn)">{w.threshold}</Pill></>}{w.move && <p className="mt-0.5 text-ok" dir="auto">→ {w.move}</p>}</li>)}</ul></div>}
      {x.plan && <p className="mt-2 text-[12px] text-t1" dir="auto"><b className="text-t0">{t("Response", "الاستجابة")}:</b> {x.plan}</p>}
    </div>)}</div>
  );
}
export function MilestonePlan({ L, ms }: { L: Lang; ms: Milestone[] }) {
  const t = useTr(L); const g = useMemo(() => milestoneRows(ms), [ms]); const [sel, setSel] = useState<string | null>(null);
  const facets = useMemo<Facet<Milestone>[]>(() => [{ id: "h", label: t("Horizon", "الأفق"), get: (m) => m.horizon, options: HORIZONS.filter((h) => ms.some((m) => m.horizon === h.id)).map((h) => ({ v: h.id, label: h[L], color: HC[h.id] })) }, { id: "o", label: t("Owner", "المسؤول"), get: (m) => m.owner, options: [...new Set(ms.map((m) => m.owner).filter(Boolean))].slice(0, 8).map((v) => ({ v, label: v })) }], [ms, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<Milestone>[]>(() => [{ id: "end", label: t("Finish date", "تاريخ الانتهاء"), cmp: (a, z) => (a.end || "9").localeCompare(z.end || "9") }, { id: "start", label: t("Start date", "تاريخ البدء"), cmp: (a, z) => (a.start || "9").localeCompare(z.start || "9") }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(ms, { text: (m) => `${m.id} ${m.title} ${m.owner} ${m.gate} ${m.measure} ${m.target}`, facets, sorts });
  return (
    <div className="space-y-4">
      <Columns min="md:grid-cols-4" cols={HORIZONS.filter((h) => h.id !== "other" || ms.some((m) => m.horizon === "other")).map((h) => ({ key: h.id, title: h[L], color: HC[h.id], count: ms.filter((m) => m.horizon === h.id).length, body: <ul className="space-y-1.5">{ms.filter((m) => m.horizon === h.id).map((m) => <li key={m.id}><button type="button" onClick={() => { setSel(m.id); jumpTo(`ms-${m.id}`); }} className="block w-full rounded-[8px] bg-bg1 p-2 text-start text-[12px] leading-snug hover:ring-1 hover:ring-accent"><b className="numt me-1 text-t2">{m.id}</b><span className="text-t0" dir="auto">{m.title}</span>{m.end && <span className="numt mt-0.5 block text-[10.5px] text-t2">{t("by", "حتى")} {m.end}</span>}</button></li>)}</ul> }))} />
      {g.rows.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-2 text-[11px] text-t2">{t(`Sequencing from ${g.base}: bars run from each start to each finish (months).`, `التسلسل من ${g.base}: كل شريط من البدء إلى الانتهاء (بالأشهر).`)}</p><Gantt L={L} rows={g.rows.map((r) => ({ id: r.id, label: `${r.id} ${r.title}`, start: r.s, end: r.e, color: HC[r.horizon] }))} months={g.months} onPick={(id) => { setSel(id); jumpTo(`ms-${id}`); }} active={sel} />{g.undated.length > 0 && <p className="mt-2 text-[11px] text-t2">{t(`${g.undated.length} step${g.undated.length === 1 ? " has" : "s have"} no dates and ${g.undated.length === 1 ? "is" : "are"} not on the chart.`, `${g.undated.length} خطوة بلا تواريخ وليست على المخطط.`)}</p>}</div>}
      <div><ListBar L={L} view={view} placeholder={t("Search the plan", "ابحث في الخطة")} /><ul className="space-y-2">{view.shown.map((m) => <li key={m.id} id={`ms-${m.id}`} className="scroll-mt-20 rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] leading-snug" style={{ borderInlineStart: `4px solid ${HC[m.horizon]}`, outline: sel === m.id ? "2px solid var(--accent)" : undefined }}><div className="flex flex-wrap items-center gap-1.5"><b className="numt text-t2">{m.id}</b><b className="text-t0" dir="auto">{m.title}</b><Pill c={HC[m.horizon]}>{(HORIZONS.find((h) => h.id === m.horizon) ?? HORIZONS[4])[L]}</Pill></div>
        <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">{([[t("Owner", "المسؤول"), m.owner], [t("Start", "البداية"), m.start], [t("Finish", "النهاية"), m.end], [t("Gate", "البوابة"), m.gate], [t("Measure", "المقياس"), m.measure], [t("Target", "الهدف"), m.target], [t("Resources", "الموارد"), m.resources], [t("Initiatives", "المبادرات"), m.initiatives.join(", ")], [t("Depends on", "يعتمد على"), m.dependsOn.join(", ")], [t("Risk", "الخطر"), m.risk]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex gap-1.5"><dt className="shrink-0 text-t2">{k}:</dt><dd className="text-t0" dir="auto">{v}</dd></div>)}</dl></li>)}{!view.shown.length && <NoMatch L={L} />}</ul></div>
    </div>
  );
}
export function CoalitionList({ L, std }: { L: Lang; std: Standard }) {
  const t = useTr(L); const kinds = [...new Set(std.coalition.map((c) => c.kind).filter(Boolean))];
  const facets = useMemo<Facet<Standard["coalition"][number]>[]>(() => (kinds.length > 1 ? [{ id: "k", label: t("Kind", "النوع"), get: (c) => c.kind, options: kinds.map((v) => ({ v, label: v })) }] : []), [std.coalition]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(std.coalition, { text: (c) => `${c.name} ${c.kind} ${c.offer} ${c.ask} ${c.seat} ${c.stance}`, facets });
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search friends and blocs", "ابحث في الأصدقاء والتكتلات")} /><ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{view.shown.map((c, i) => <li key={i} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug" style={{ borderTop: "3px solid var(--accent)" }}><p className="flex flex-wrap items-center gap-1.5 font-semibold text-t0"><Handshake size={14} aria-hidden className="text-accent" /><span dir="auto">{c.name}</span>{c.kind && <Pill c="var(--accent)">{c.kind}</Pill>}{c.stance && <Pill c="var(--c2)">{c.stance}</Pill>}</p>
      {c.offer && <p className="mt-1 text-t1" dir="auto"><b className="text-ok">{t("Offered", "ما نعرضه")}:</b> {c.offer}</p>}{c.ask && <p className="mt-0.5 text-t1" dir="auto"><b className="text-warn">{t("Asked", "ما نطلبه")}:</b> {c.ask}</p>}{c.owner && <p className="mt-0.5 text-t2" dir="auto">{t("Owner", "المسؤول")}: {c.owner}</p>}{c.seat && <p className="mt-0.5 text-t2" dir="auto">{c.seat}</p>}</li>)}</ul>{!view.shown.length && <NoMatch L={L} />}</div>
  );
}
export function InfluenceLedger({ L, std }: { L: Lang; std: Standard }) {
  const t = useTr(L); const mx = Math.max(1, ...std.ledger.flatMap((r) => [r.uae ?? 0, ...r.rivals.map((x) => x.value ?? 0)]));
  return (
    <ul className="space-y-3">{std.ledger.map((r, i) => <li key={i} className="rounded-[12px] bg-bg2 p-3"><p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-t0" dir="auto">{r.instrument}{r.headroom != null && <Pill c="var(--warn)">{t("headroom", "هامش")} {r.headroom}</Pill>}</p>
      <div className="mt-2"><BarList max={mx} rows={[{ label: t("UAE", "الإمارات"), value: r.uae ?? 0, text: r.uae == null ? t("not estimated", "غير مقدّر") : String(r.uae), color: "var(--ok)" }, ...r.rivals.filter((x) => x.value != null).map((x) => ({ label: x.name, value: x.value ?? 0, color: "var(--t2)" }))]} /></div>{r.note && <p className="mt-1 text-[11.5px] text-t2" dir="auto">{r.note}</p>}</li>)}</ul>
  );
}

/** Every standard part the product carries, as folds (each with an id for jump links): angles, scenarios, the plan, the coalition, the ledger. `skip` names parts the page already draws itself. `target` maps an angle to the id of the section that treats it. */
export function StandardParts({ L, std, skip = [], target, onJump }: { L: Lang; std: Standard | null; skip?: string[]; target?: (angleId: string) => string | null; onJump?: (id: string) => void }) {
  const t = useTr(L); if (!std?.any) return null; const has = (k: string) => !skip.includes(k);
  return (
    <>
      {has("angles") && std.angles.length > 0 && <Fold id="std-angles" icon={<Layers size={16} />} title={t("The fourteen angles: what this report covers", "الزوايا الأربع عشرة: ما يغطيه هذا التقرير")} hint={t("Covered, thin or not found, angle by angle: a gap is shown, never filled with a guess.", "مغطى أو ضعيف أو لم يوجد، زاوية بزاوية: تظهر الثغرة ولا تُملأ بتخمين.")}><AngleMatrix L={L} std={std} target={target} onJump={onJump} /></Fold>}
      {has("scenarios") && std.scenarios.length > 0 && <Fold id="std-scenarios" icon={<Scale size={16} />} title={t("Scenarios and tripwires", "السيناريوهات ونقاط الإنذار")} count={std.scenarios.length}><ScenarioCards L={L} xs={std.scenarios} /></Fold>}
      {has("milestones") && std.milestones.length > 0 && <Fold id="std-plan" icon={<Route size={16} />} title={t("Implementation plan", "خطة التنفيذ")} count={std.milestones.length} hint={t("Owner, dates, measure and the gate that releases the next step; 30 days, 100 days, one year and three years.", "المسؤول والتواريخ والمقياس والبوابة التي تفتح الخطوة التالية؛ 30 يومًا و100 يوم وسنة وثلاث سنوات.")}><MilestonePlan L={L} ms={std.milestones} /></Fold>}
      {has("coalition") && std.coalition.length > 0 && <Fold id="std-coalition" icon={<Handshake size={16} />} title={t("Friends and coalition", "الأصدقاء والتحالفات")} count={std.coalition.length}><CoalitionList L={L} std={std} /></Fold>}
      {has("ledger") && std.ledger.length > 0 && <Fold id="std-ledger" icon={<Radar size={16} />} title={t("Influence ledger against rivals", "سجل النفوذ أمام المنافسين")} count={std.ledger.length}><InfluenceLedger L={L} std={std} /></Fold>}
    </>
  );
}

/** What changed since the version this run replaced (the page keeps that version's structured data under `<storeKey>:prev`): new items, gone items and values that moved. Nothing is drawn when there is no earlier version. */
export function WhatChanged({ L, storeKey, report }: { L: Lang; storeKey: string | null | undefined; report: string | null | undefined }) {
  const t = useTr(L); const prev = useMemo(() => (storeKey && report ? readPrev(storeKey) : null), [storeKey, report]); const d = useMemo(() => (prev && report ? diffBlocks(prev.blocks, report) : null), [prev, report]);
  if (!prev || !d) return null; const col = (key: string, title: string, color: string, xs: string[]) => <div key={key} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${color}` }}><p className="flex justify-between text-[12px] font-semibold" style={{ color }}>{title}<span className="numt text-t2">{xs.length}</span></p>{xs.length ? <ul className="mt-1.5 space-y-1 text-[12.5px] leading-snug text-t0">{xs.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul> : <p className="mt-1.5 text-[11.5px] text-t2">{t("none", "لا شيء")}</p>}</div>;
  return (
    <Fold id="std-changed" icon={<CalendarClock size={16} />} title={t(`What changed since ${prev.at.slice(0, 10)}`, `ما تغيّر منذ ${prev.at.slice(0, 10)}`)} hint={t("Compared with the version this run replaced: new items, gone items and values that moved.", "مقارنة بالنسخة التي استبدلها هذا التشغيل: عناصر جديدة وزائلة وقيم تحرّكت.")} defaultOpen={!d.same}>
      {d.same ? <p className="text-[12.5px] text-t1">{t("Nothing in the structured data changed.", "لم يتغير شيء في البيانات المنظمة.")}</p> : <div className="grid gap-3 md:grid-cols-3">{col("a", t("New", "جديد"), "var(--ok)", d.added.map((x) => `${x.label} · ${x.section}`))}{col("r", t("Gone", "زال"), "var(--risk)", d.removed.map((x) => `${x.label} · ${x.section}`))}{col("m", t("Moved", "تحرّك"), "var(--warn)", d.moved.map((x) => `${x.label}: ${x.from} → ${x.to}`))}</div>}
    </Fold>
  );
}
