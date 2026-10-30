"use client";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Compass, Gauge as GaugeIcon, ListChecks, ShieldAlert, Target } from "lucide-react";
import { ARCH_PILLARS, DELIVERABLES, HORIZONS, deliverableOf, type Check, type Dashboard, type Initiative, type InterestRow, type PillarBaseline } from "@/lib/case/architect";
import { HORIZON_HEX, HORIZON_NAME, HORIZON_SHORT, PILLAR_HEX, PILLAR_NAME, PILLAR_TAG, axisMonths, gateRows, isUnfunded, placeRisks, type ArchitectView, type InterestRead, type KeyJudgment, type PillarRow } from "@/lib/case/architectView";
import type { ReportHead } from "@/lib/report/model";
import { Markdown } from "../Markdown";
import { Pill, type Lang } from "../falcon/bits";
import { BarList, Columns, Fold, FoldGroup, Gantt, ListBar, NoMatch, ReportHero, RiskMatrix, SegBar, Timeline, useListView, CONF_COLOR, LEVEL_COLOR, type Facet, type SortSpec, type StatSpec } from "../report/kit";
import { Chip, RingGauge } from "../report/kit-case";
import { DecisionDashboard } from "./ArchitectParts";
import { Hatch, bt, statusWord, useTr } from "./bits";

// THE STATECRAFT ARCHITECT, ILLUSTRATED: the hero (bottom line, tradecraft pass count, auditors' verdicts), the twelve interests and six pillars as tiles, the initiatives by horizon with their Gantt, the gates timeline, the indicators, the risk matrix, the tradecraft checks and the six deliverables as collapsible sections. Each draws what the saved strategy holds and nothing else.
const dashStat = (label: string, icon: React.ReactNode): StatSpec => ({ n: "–", label, c: "var(--t2)", icon });
const confW = (L: Lang, c: string) => ({ high: L === "ar" ? "مرتفعة" : "high", moderate: L === "ar" ? "معتدلة" : "moderate", low: L === "ar" ? "منخفضة" : "low" })[c] ?? c;

export function ArchHero({ L, a, head, onJump }: { L: Lang; a: ArchitectView; head: ReportHead; onJump: (id: string) => void }) {
  const t = useTr(L); const d = a.dash; const ini = d?.initiatives ?? []; const pass = a.checks.filter((c) => c.pass).length; const high = d?.risks.filter((r) => r.impact === "high").length ?? 0; const gates = d ? gateRows(d).length : 0;
  const stats: StatSpec[] = d ? [
    { n: ini.length, label: t("initiatives (proposals)", "مبادرات (مقترحات)"), c: "var(--accent)", icon: <Target size={16} />, jump: "dash" },
    { n: `${ini.filter(isUnfunded).length}/${ini.length}`, label: t("funding not estimated", "تمويل غير مقدّر"), c: "var(--warn)", icon: <CircleDashed size={16} />, jump: "dash" },
    gates ? { n: gates, label: t("decision gates", "بوابات القرار"), c: "var(--c2)", icon: <CalendarClock size={16} />, jump: "dash" } : dashStat(t("decision gates", "بوابات القرار"), <CalendarClock size={16} />),
    d.risks.length ? { n: `${high}/${d.risks.length}`, label: t("high-impact risks", "مخاطر عالية الأثر"), c: high ? "var(--risk)" : "var(--ok)", icon: <ShieldAlert size={16} />, jump: "dash" } : dashStat(t("risks", "مخاطر"), <ShieldAlert size={16} />),
  ] : [];
  return <ReportHero L={L} kicker={t("Statecraft Architect: country strategy (proposals, not policy)", "مهندس فن الحكم: استراتيجية الدولة (مقترحات لا سياسة)")} call={d ? `${ini.length} ${t("initiatives", "مبادرة")} · ${new Set(ini.map((i) => i.horizon)).size} ${t("horizons", "آفاق")}` : undefined} bottomLine={a.bottomLine} head={head} gauge={null} onJump={onJump} stats={stats}
    extra={<div className="mt-3 flex flex-wrap items-start gap-5">
      {a.checks.length > 0 && <RingGauge value={(pass / a.checks.length) * 100} text={`${pass}/${a.checks.length}`} size={96} label={t("tradecraft checks pass (structure present, not proof the judgment is right)", "فحوص أصول الصنعة الناجحة (البنية موجودة لا إثبات صحة الحكم)")} />}
      <div className="min-w-48 flex-1 space-y-2">
        {ini.length > 0 && <div><p className="label mb-1">{t("Initiatives by horizon", "المبادرات حسب الأفق")}</p><SegBar segs={HORIZONS.map((h) => ({ label: HORIZON_SHORT(h.id, L === "ar"), n: ini.filter((i) => i.horizon === h.id).length, color: HORIZON_HEX[h.id] }))} /></div>}
        {a.judgments.some((j) => j.confidence) && <div><p className="label mb-1">{t("Confidence of the key judgments", "ثقة الأحكام الرئيسية")}</p><SegBar segs={(["high", "moderate", "low"] as const).map((c) => ({ label: confW(L, c), n: a.judgments.filter((j) => j.confidence === c).length, color: CONF_COLOR[c] }))} /></div>}
      </div></div>}
    nav={[{ id: "dash", label: t("Decision dashboard", "لوحة القرار") }, { id: "brief", label: t("Ministerial brief", "الموجز الوزاري") }, { id: "roadmap", label: t("Roadmap", "خارطة الطريق") }, { id: "matrix", label: t("Power matrix", "مصفوفة القوة") }, { id: "tradecraft", label: t("Tradecraft", "أصول الصنعة") }, { id: "all", label: t("All deliverables", "كل المخرجات") }]} />;
}

/** The key judgments of the ministerial brief, each with the confidence it states and the reason. */
export function JudgmentTiles({ L, rows }: { L: Lang; rows: KeyJudgment[] }) {
  const t = useTr(L); if (!rows.length) return null;
  return <ul className="grid gap-2 md:grid-cols-2" aria-label={t("Key judgments", "الأحكام الرئيسية")}>{rows.map((j) => <li key={j.n} className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderInlineStart: `4px solid ${j.confidence ? CONF_COLOR[j.confidence] : "var(--t2)"}` }}><div className="flex flex-wrap items-center gap-1.5"><span className="numt text-[10.5px] text-t2">J{j.n}</span>{j.confidence ? <Chip c={CONF_COLOR[j.confidence]}>{t("confidence", "الثقة")}: {confW(L, j.confidence)}</Chip> : <Chip c="var(--t2)">{t("confidence not stated", "الثقة غير معلنة")}</Chip>}</div><p className="mt-1 text-t0" dir="auto">{j.text}</p>{j.reason && <p className="mt-0.5 text-t1" dir="auto">{j.reason}</p>}</li>)}</ul>;
}

const LV_W = (L: Lang, l: string) => (L === "ar" ? ({ high: "عالية", medium: "متوسطة", low: "منخفضة", unknown: "غير معروفة" } as Record<string, string>)[l] ?? l : l);
/** The twelve national interests as tiles with their relevance level, filterable by level. The free reading from held data and the Architect's own table both come here. */
export function InterestTiles({ L, rows }: { L: Lang; rows: { n: number | string; name: string; level: string; levelText?: string; why: string }[] }) {
  const t = useTr(L); const lv = ["high", "medium", "low", "unknown"];
  const facets: Facet<(typeof rows)[number]>[] = [{ id: "lv", label: t("Relevance", "الصلة"), get: (r) => r.level, options: lv.filter((x) => rows.some((r) => r.level === x)).map((x) => ({ v: x, label: LV_W(L, x), color: LEVEL_COLOR[x] ?? "var(--t2)" })) }];
  const view = useListView(rows, { text: (r) => `${r.n} ${r.name} ${r.levelText ?? r.level} ${r.why}`, facets });
  if (!rows.length) return null;
  return (
    <div className="space-y-2.5"><SegBar segs={lv.map((x) => ({ label: LV_W(L, x), n: rows.filter((r) => r.level === x).length, color: LEVEL_COLOR[x] ?? "var(--t2)" }))} />
      <ListBar L={L} view={view} placeholder={t("Search the interests", "ابحث في المصالح")} />
      {view.shown.length ? <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{view.shown.map((r) => <li key={String(r.n) + r.name} className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderTop: `3px solid ${LEVEL_COLOR[r.level] ?? "var(--t2)"}` }}><div className="flex items-start gap-1.5"><b className="numt text-t2">{r.n}</b><span className="min-w-0 flex-1 font-semibold text-t0" dir="auto">{r.name}</span><Pill c={LEVEL_COLOR[r.level] ?? "var(--t2)"}>{r.levelText || statusWord(L, r.level)}</Pill></div><p className="mt-1 text-t1" dir="auto">{r.why}</p></li>)}</ul> : <NoMatch L={L} />}</div>
  );
}
export const interestRowsFree = (rows: InterestRow[], L: Lang) => rows.map((r) => ({ n: r.n, name: L === "ar" ? r.ar : r.en, level: r.level, levelText: statusWord(L, r.level), why: bt(L, r.why) }));
export const interestRowsRead = (rows: InterestRead[]) => rows.map((r) => ({ n: r.n, name: r.name, level: r.level, levelText: r.levelText, why: r.why }));

/** The six pillars on one bar chart of today's baseline score (where there is one), with the pillars the data cannot score marked as not measured. */
export function PillarBars({ L, base }: { L: Lang; base: PillarBaseline[] }) {
  const t = useTr(L); const rows = ARCH_PILLARS.map((p) => ({ p, b: base.find((x) => x.id === p.id) }));
  return <ul className="space-y-1.5" aria-label={t("Baseline score by pillar", "درجة الأساس لكل ركيزة")}>{rows.map(({ p, b }) => <li key={p.id} className="grid grid-cols-[minmax(0,36%)_1fr_auto] items-center gap-2 text-[12px]"><span className="truncate text-t1" dir="auto">{p.n}. {PILLAR_NAME(p.id, L === "ar")}</span>{b?.score == null ? <span className="block h-2.5 rounded-full" style={{ background: "repeating-linear-gradient(45deg,var(--bg-2),var(--bg-2) 4px,var(--line) 4px,var(--line) 5px)" }} /> : <span className="block h-2.5 overflow-hidden rounded-full bg-bg3" role="img" aria-label={`${p.id}: ${b.score}/100`}><span className="block h-full rounded-full" style={{ width: `${Math.max(2, b.score)}%`, background: PILLAR_HEX[p.id] }} /></span>}<span className="numt min-w-10 text-end text-[11px] text-t1">{b?.score == null ? t("n/a", "غير متاح") : `${b.score}/100`}</span></li>)}</ul>;
}

/** The Deliverable 4 matrix as a card for each pillar, with every column the editor wrote. */
export function PillarMatrixCards({ rows }: { rows: PillarRow[] }) {
  if (!rows.length) return null;
  return <ul className="grid gap-2.5 lg:grid-cols-2">{rows.map((r) => { const c = r.id ? PILLAR_HEX[r.id] : "var(--t2)"; return <li key={r.pillar} id={r.id ? `arch-pillar-${r.id}` : undefined} className="scroll-mt-24 rounded-[12px] border border-line bg-bg2 p-3 text-[12px] leading-snug" style={{ borderTop: `3px solid ${c}` }}><b className="text-[13px]" style={{ color: c }} dir="auto">{r.pillar}</b><dl className="mt-1.5 space-y-1">{r.cells.map((x) => <div key={x.label}><dt className="inline font-semibold text-t2" dir="auto">{x.label}: </dt><dd className="inline text-t0" dir="auto">{x.text}</dd></div>)}</dl></li>; })}</ul>;
}

// ---- the dashboard
function IniCard({ L, i, active, onPick }: { L: Lang; i: Initiative; active: boolean; onPick: (id: string) => void }) {
  const t = useTr(L); const ar = L === "ar"; const c = PILLAR_HEX[i.pillar];
  return (
    <li id={`ini-${i.id}`} className="scroll-mt-24 rounded-[10px] border bg-bg1 p-2.5 text-[11.5px] leading-snug" style={{ borderColor: active ? "var(--t0)" : "var(--line)", borderInlineStart: `4px solid ${c}` }}>
      <button type="button" onClick={() => onPick(i.id)} className="flex w-full items-start gap-1.5 text-start"><b className="numt text-t1">{i.id}</b><span className="min-w-0 flex-1 font-semibold text-t0" dir="auto">{i.name}</span></button>
      <div className="mt-1 flex flex-wrap items-center gap-1"><Chip c={c} title={PILLAR_NAME(i.pillar, ar)}>{PILLAR_TAG(i.pillar, ar)}</Chip><Chip c="var(--t2)">{i.status}</Chip><span className="numt text-[10.5px] text-t2">{t("months", "أشهر")} <bdi dir="ltr">{i.startMonth}–{i.endMonth}</bdi></span>{i.gateDate && <Chip c="var(--warn)" title={i.gate}>◆ {i.gateDate}</Chip>}</div>
      {i.lead && <p className="mt-1 text-t1" dir="auto"><b className="text-t2">{t("Lead (proposed)", "الجهة القائدة (مقترحة)")}:</b> {i.lead}</p>}
      <details className="mt-1 text-t1"><summary className="cursor-pointer text-accent">{t("Outcome, KPI, risk, gate and dependencies", "النتيجة والمؤشر والخطر والبوابة والاعتماديات")}</summary><dl className="mt-1 space-y-0.5">
        {([[t("Partners", "الشركاء"), i.partners.join(", ")], [t("Funding", "التمويل"), i.funding], [t("Outcome", "النتيجة المتوقعة"), i.outcome], ["KPI", i.kpi], [t("Principal risk", "الخطر الرئيسي"), i.risk], [t("Decision gate", "بوابة القرار"), `${i.gate}${i.gateDate ? ` (${i.gateDate})` : ""}`.trim()], [t("Depends on", "يعتمد على"), i.dependencies.join(", ")]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="inline font-semibold text-t2">{k}: </dt><dd className="inline" dir="auto">{v}</dd></div>)}</dl></details>
    </li>
  );
}
/** The initiatives: lanes by horizon with their cards, a search box and filters by pillar, horizon, status and funding, a sort, and the Gantt of the same rows on a month axis. */
export function InitiativesView({ L, ini }: { L: Lang; ini: Initiative[] }) {
  const t = useTr(L); const ar = L === "ar"; const [active, setActive] = useState<string | null>(null);
  const statuses = [...new Set(ini.map((i) => i.status))];
  const facets: Facet<Initiative>[] = [
    { id: "pillar", label: t("Pillar", "الركيزة"), get: (i) => i.pillar, options: ARCH_PILLARS.filter((p) => ini.some((i) => i.pillar === p.id)).map((p) => ({ v: p.id, label: PILLAR_NAME(p.id, ar), color: PILLAR_HEX[p.id] })) },
    { id: "horizon", label: t("Horizon", "الأفق"), get: (i) => i.horizon, options: HORIZONS.filter((h) => ini.some((i) => i.horizon === h.id)).map((h) => ({ v: h.id, label: HORIZON_SHORT(h.id, ar), color: HORIZON_HEX[h.id] })) },
    ...(statuses.length > 1 ? [{ id: "status", label: t("Status", "الحالة"), get: (i: Initiative) => i.status, options: statuses.map((s) => ({ v: s, label: s })) }] : []),
    { id: "fund", label: t("Funding", "التمويل"), get: (i) => (isUnfunded(i) ? "no" : "yes"), options: [{ v: "no", label: t("not estimated", "غير مقدّر") }, { v: "yes", label: t("a figure is given", "رقم مذكور") }] },
  ];
  const sorts: SortSpec<Initiative>[] = [{ id: "start", label: t("Start month", "شهر البدء"), cmp: (a, z) => a.startMonth - z.startMonth || a.endMonth - z.endMonth }, { id: "end", label: t("End month", "شهر الانتهاء"), cmp: (a, z) => a.endMonth - z.endMonth }, { id: "pillar", label: t("Pillar", "الركيزة"), cmp: (a, z) => a.pillar.localeCompare(z.pillar) || a.startMonth - z.startMonth }, { id: "gate", label: t("Gate date", "تاريخ البوابة"), cmp: (a, z) => (a.gateDate ?? "9999").localeCompare(z.gateDate ?? "9999") }];
  const view = useListView(ini, { text: (i) => `${i.id} ${i.name} ${i.lead} ${i.partners.join(" ")} ${i.outcome} ${i.kpi} ${i.risk} ${i.gate} ${i.funding}`, facets, sorts });
  const pick = (id: string) => { setActive(id); document.getElementById(`ini-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const months = axisMonths(ini); const rows = [...view.shown].sort((a, z) => (view.sort ? 0 : a.startMonth - z.startMonth || a.endMonth - z.endMonth));
  return (
    <div className="space-y-4">
      <ListBar L={L} view={view} placeholder={t("Search the initiatives", "ابحث في المبادرات")} />
      {view.shown.length ? <>
        <Columns cols={HORIZONS.map((h) => { const xs = view.shown.filter((i) => i.horizon === h.id); return { key: h.id, title: HORIZON_NAME(h.id, ar), color: HORIZON_HEX[h.id], count: xs.length, body: xs.length ? <ul className="space-y-2">{xs.map((i) => <IniCard key={i.id} L={L} i={i} active={active === i.id} onPick={pick} />)}</ul> : <p className="text-[11.5px] text-t2">{t("Nothing proposed.", "لا مقترحات.")}</p> }; })} />
        <section aria-label={t("Gantt chart", "مخطط جانت")}><div className="mb-1 flex flex-wrap items-center gap-2"><span className="label">{t("Initiatives on a month axis (months from now)", "المبادرات على محور الأشهر (أشهر من الآن)")}</span>{ARCH_PILLARS.filter((p) => ini.some((i) => i.pillar === p.id)).map((p) => <span key={p.id} className="inline-flex items-center gap-1 text-[10.5px] text-t1"><i className="size-2 rounded-sm" style={{ background: PILLAR_HEX[p.id] }} />{PILLAR_NAME(p.id, ar)}</span>)}</div>
          <Gantt L={L} months={months} active={active} onPick={pick} rows={rows.map((i) => ({ id: i.id, label: `${i.id} ${i.name}`, start: i.startMonth, end: i.endMonth, color: PILLAR_HEX[i.pillar] }))} />
          <p className="mt-1 text-[10.5px] text-t2">{t("Bars are the Architect's proposed phasing, not an approved plan. Click a bar to open its card.", "الأشرطة مرحلة مقترحة من المهندس لا خطة معتمدة. انقر شريطًا لفتح بطاقته.")}</p></section></> : <NoMatch L={L} />}
    </div>
  );
}

/** Every decision gate on one timeline, in date order: the gates initiatives carry and the dashboard's own list. */
export function GatesView({ L, d, today }: { L: Lang; d: Dashboard; today: number }) {
  const t = useTr(L); const rows = gateRows(d); if (!rows.length) return <Hatch>{t("None listed.", "لا شيء.")}</Hatch>;
  const state = (sort: string) => (sort === "9999" ? null : Date.parse(`${sort}-28`) <= today ? "reached" : "next");
  const firstNext = rows.findIndex((r) => state(r.sort) === "next");
  return <Timeline entries={rows.map((r, k) => { const st = state(r.sort); return { when: r.when, color: st === "reached" ? "var(--warn)" : st === "next" ? "var(--accent)" : "var(--line2, var(--line))", body: <div className="rounded-[8px] bg-bg2 p-2 text-[12px] leading-snug"><div className="flex flex-wrap items-center gap-1.5">{r.id && <b className="numt text-t1">{r.id}</b>}<b className="text-t0" dir="auto">{r.label}</b>{st === "reached" && <Chip c="var(--warn)">{t("date reached: review", "بلغ الموعد: مراجعة")}</Chip>}{k === firstNext && <Chip c="var(--accent)">{t("next", "التالية")}</Chip>}</div>{r.detail && <p className="mt-0.5 text-t1" dir="auto">{r.detail}</p>}</div> }; })} />;
}
export function IndicatorsView({ L, d }: { L: Lang; d: Dashboard }) {
  const t = useTr(L); const view = useListView(d.indicators, { text: (x) => `${x.name} ${x.signal} ${x.threshold} ${x.owner}`, sorts: [{ id: "name", label: t("Name", "الاسم"), cmp: (a, z) => a.name.localeCompare(z.name) }, { id: "owner", label: t("Owner", "المسؤول"), cmp: (a, z) => a.owner.localeCompare(z.owner) }] });
  if (!d.indicators.length) return <Hatch>{t("None listed.", "لا شيء.")}</Hatch>;
  return <div><ListBar L={L} view={view} placeholder={t("Search the indicators", "ابحث في المؤشرات")} />{view.shown.length ? <ul className="grid gap-2 md:grid-cols-2">{view.shown.map((x) => <li key={x.name} className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderInlineStart: "4px solid var(--c2)" }}><b className="text-t0" dir="auto">{x.name}</b>{x.signal && <p className="mt-0.5 text-t1" dir="auto"><b className="text-t2">{t("Signal", "الإشارة")}:</b> {x.signal}</p>}{x.threshold && <p className="text-t1" dir="auto"><b className="text-t2">{t("Threshold", "العتبة")}:</b> {x.threshold}</p>}<p className="text-t1" dir="auto"><b className="text-t2">{t("Owner", "المسؤول")}:</b> {x.owner || "—"}</p></li>)}</ul> : <NoMatch L={L} />}</div>;
}
export function RisksView({ L, d }: { L: Lang; d: Dashboard }) {
  const t = useTr(L); const [active, setActive] = useState<number | null>(null); const all = placeRisks(d); const placed = all.filter((x) => x.l != null);
  const facets: Facet<(typeof all)[number]>[] = [{ id: "imp", label: t("Impact", "الأثر"), get: (x) => x.r.impact, options: (["high", "medium", "low"] as const).filter((v) => all.some((x) => x.r.impact === v)).map((v) => ({ v, label: LV_W(L, v === "high" ? "high" : v === "medium" ? "medium" : "low"), color: LEVEL_COLOR[v] })) }];
  const view = useListView(all, { text: (x) => `${x.r.name} ${x.r.likelihood} ${x.r.impact} ${x.r.mitigation}`, facets });
  if (!d.risks.length) return <Hatch>{t("None listed.", "لا شيء.")}</Hatch>;
  const pick = (n: number) => { setActive(n); document.getElementById(`risk-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  return (
    <div className="space-y-3"><div className="flex flex-wrap items-start gap-5">{placed.length > 0 && <RiskMatrix L={L} active={active} onPick={pick} items={placed.map((x) => ({ n: x.n, l: x.l as 0 | 1 | 2, i: x.i, label: x.r.name }))} />}
      <div className="min-w-56 flex-1 space-y-2"><SegBar segs={(["high", "medium", "low"] as const).map((v) => ({ label: LV_W(L, v), n: d.risks.filter((r) => r.impact === v).length, color: LEVEL_COLOR[v] }))} />{placed.length < all.length && <p className="text-[11px] text-t2">{t(`${all.length - placed.length} risk(s) state no likelihood the scale can read: they are listed, not placed on the matrix.`, `${all.length - placed.length} خطر لا يذكر احتمالًا يقرؤه المقياس: مدرجة وغير موضوعة على المصفوفة.`)}</p>}</div></div>
      <ListBar L={L} view={view} placeholder={t("Search the risks", "ابحث في المخاطر")} />
      {view.shown.length ? <ul className="grid gap-2 md:grid-cols-2">{view.shown.map((x) => <li key={x.n} id={`risk-${x.n}`} className="scroll-mt-24 rounded-[10px] border bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderColor: active === x.n ? "var(--t0)" : "var(--line)", borderInlineStart: `4px solid ${LEVEL_COLOR[x.r.impact]}` }}><div className="flex flex-wrap items-center gap-1.5"><b className="numt text-t2">{x.n}</b><b className="text-t0" dir="auto">{x.r.name}</b><Pill c={LEVEL_COLOR[x.r.impact]}>{t("impact", "الأثر")}: {LV_W(L, x.r.impact)}</Pill>{x.r.likelihood && <Pill c="var(--c2)">{x.r.likelihood}</Pill>}</div>{x.r.mitigation && <p className="mt-1 text-t1" dir="auto"><b className="text-t2">{t("Mitigation", "المعالجة")}:</b> {x.r.mitigation}</p>}</li>)}</ul> : <NoMatch L={L} />}
    </div>
  );
}
/** The Decision dashboard tab: the headline counts, the initiatives, their Gantt, the gates, indicators and risks, each a collapsible section, and the full table of initiatives for those who want every column. */
export function DashboardTab({ L, dash, today }: { L: Lang; dash: Dashboard; today: number }) {
  const t = useTr(L); const ini = dash.initiatives; const ar = L === "ar";
  return (
    <FoldGroup L={L}>
      <Fold id="dash-glance" title={t("At a glance", "نظرة سريعة")} icon={<GaugeIcon size={15} />}><DecisionDashboard L={L} dash={dash} today={today} show={["tiles"]} />
        <div className="mt-3 grid gap-4 md:grid-cols-2"><div><p className="label mb-1.5">{t("Initiatives by pillar", "المبادرات حسب الركيزة")}</p><BarList rows={ARCH_PILLARS.map((p) => ({ label: PILLAR_NAME(p.id, ar), value: ini.filter((i) => i.pillar === p.id).length, color: PILLAR_HEX[p.id] }))} /></div><div><p className="label mb-1.5">{t("Initiatives by horizon", "المبادرات حسب الأفق")}</p><SegBar segs={HORIZONS.map((h) => ({ label: HORIZON_SHORT(h.id, ar), n: ini.filter((i) => i.horizon === h.id).length, color: HORIZON_HEX[h.id] }))} /></div></div></Fold>
      <Fold id="dash-initiatives" title={t("Initiatives by horizon and the Gantt chart", "المبادرات حسب الأفق ومخطط جانت")} count={ini.length} icon={<Compass size={15} />}><InitiativesView L={L} ini={ini} /></Fold>
      <Fold id="dash-gates" title={t("Decision gates timeline", "الجدول الزمني لبوابات القرار")} count={gateRows(dash).length} icon={<CalendarClock size={15} />}><GatesView L={L} d={dash} today={today} /></Fold>
      <Fold id="dash-indicators" title={t("Early-warning indicators", "مؤشرات الإنذار المبكر")} count={dash.indicators.length} icon={<AlertTriangle size={15} />}><IndicatorsView L={L} d={dash} /></Fold>
      <Fold id="dash-risks" title={t("Major risks: likelihood and impact", "المخاطر الرئيسية: الاحتمال والأثر")} count={dash.risks.length} icon={<ShieldAlert size={15} />}><RisksView L={L} d={dash} /></Fold>
      <Fold id="dash-table" title={t("Every initiative as a table", "كل مبادرة في جدول")} defaultOpen={false} icon={<ListChecks size={15} />}><DecisionDashboard L={L} dash={dash} today={today} show={["table"]} /></Fold>
    </FoldGroup>
  );
}

/** The twelve checks as tiles that pass or do not, with the count. A pass shows the structure is present, not that the judgment is right. */
export function ChecksView({ L, checks }: { L: Lang; checks: Check[] }) {
  const t = useTr(L); const pass = checks.filter((c) => c.pass).length; const facets: Facet<Check>[] = [{ id: "r", label: t("Result", "النتيجة"), get: (c) => (c.pass ? "pass" : "fail"), options: [{ v: "fail", label: t("missing", "ناقص"), color: "var(--warn)" }, { v: "pass", label: t("present", "موجود"), color: "var(--ok)" }] }];
  const view = useListView(checks, { text: (c) => `${c.en} ${c.ar} ${c.note.en} ${c.note.ar}`, facets });
  return (
    <div className="space-y-3"><div className="flex flex-wrap items-center gap-4"><RingGauge value={checks.length ? (pass / checks.length) * 100 : 0} text={`${pass}/${checks.length}`} size={92} label={t("checks pass", "فحوص ناجحة")} /><SegBar segs={[{ label: t("present", "موجود"), n: pass, color: "var(--ok)" }, { label: t("missing", "ناقص"), n: checks.length - pass, color: "var(--warn)" }]} /></div>
      <ListBar L={L} view={view} placeholder={t("Search the checks", "ابحث في الفحوص")} />
      {view.shown.length ? <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{view.shown.map((c) => <li key={c.id} className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderTop: `3px solid ${c.pass ? "var(--ok)" : "var(--warn)"}` }}><div className="flex items-start gap-1.5">{c.pass ? <CheckCircle2 size={15} aria-hidden className="mt-0.5 shrink-0 text-ok" /> : <CircleDashed size={15} aria-hidden className="mt-0.5 shrink-0 text-warn" />}<span className="min-w-0 flex-1 font-semibold text-t0" dir="auto">{L === "ar" ? c.ar : c.en}</span><Pill c={c.pass ? "var(--ok)" : "var(--warn)"}>{c.pass ? t("present", "موجود") : t("missing", "ناقص")}</Pill></div><p className="mt-1 text-t1" dir="auto">{bt(L, c.note)}</p></li>)}</ul> : <NoMatch L={L} />}</div>
  );
}

/** The six deliverables as collapsible sections, each with its text, so a reader can open the whole strategy in order. */
export function DeliverableFolds({ L, report, noJson, present }: { L: Lang; report: string; noJson: (s: string) => string; present: number[] }) {
  return (
    <FoldGroup L={L}>{DELIVERABLES.map((x) => { const body = noJson(deliverableOf(report, x.n)); const there = present.includes(x.n) && !!body.trim(); return <Fold key={x.n} id={`deliv-${x.n}`} title={`${x.n}. ${L === "ar" ? x.ar : x.en}`} defaultOpen={x.n === 1} hint={there ? undefined : (L === "ar" ? "لم يُكتب في هذا المنتج" : "not written in this product")}>{there ? <article><Markdown source={body} /></article> : <Hatch>{L === "ar" ? "غير مكتوب" : "not written"}</Hatch>}</Fold>; })}</FoldGroup>
  );
}
