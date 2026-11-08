"use client";
import { ARCH_PILLARS, HORIZONS, type Dashboard, type Initiative } from "@/lib/case/architect";
import { Pill, type Lang } from "../falcon/bits";
import { Tbl } from "../machiavelli/parts";
import { useTr } from "./bits";

export const PILLAR_C: Record<string, string> = { diplomatic: "#378ADD", soft: "#1D9E75", hard: "#7F77DD", economic: "#BA7517", technology: "#D4537E", regional: "#639922" };
const pn = (L: Lang, id: string) => { const p = ARCH_PILLARS.find((x) => x.id === id); return p ? (L === "ar" ? p.ar : p.en).replace(/ \(.*\)$/, "") : id; };
const hn = (L: Lang, id: string) => { const h = HORIZONS.find((x) => x.id === id); return h ? (L === "ar" ? h.ar : h.en) : id; };
const IMP = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)" } as const;

/** The Executive Decision Dashboard (deliverable 6) rendered from the Architect's validated JSON. Everything here is the model's PROPOSAL: lead institutions are proposed ownership, funding is "not estimated" unless the evidence supports a figure, and status starts at "proposed". */
export type DashPart = "tiles" | "timeline" | "table" | "indicators" | "gates" | "risks";
const ALL: DashPart[] = ["tiles", "timeline", "table", "indicators", "gates", "risks"];
export function DecisionDashboard({ L, dash, compact = false, today, show = ALL }: { L: Lang; dash: Dashboard; compact?: boolean; today: number; show?: DashPart[] }) {
  const on = (p: DashPart) => show.includes(p);
  const t = useTr(L); const ini = dash.initiatives; const end = Math.max(24, ...ini.map((i) => i.endMonth)); const ticks = [0, 24, 60, 120, 180, 240].filter((x) => x <= end);
  const gates = ini.filter((i) => i.gateDate).sort((a, b) => (a.gateDate! < b.gateDate! ? -1 : 1)); const next = gates.filter((i) => Date.parse(`${i.gateDate}-28`) >= today);
  const unfunded = ini.filter((i) => /^not estimated/i.test(i.funding)).length; const high = dash.risks.filter((r) => r.impact === "high").length;
  const tile = (label: string, v: string | number, sub?: string) => <div className="rounded-[12px] border border-line bg-bg1 p-2.5"><div className="label">{label}</div><div className="num text-[20px] font-semibold text-t0">{v}</div>{sub && <div className="text-[10.5px] text-t2">{sub}</div>}</div>;
  return (
    <div className="space-y-4">
      {on("tiles") && <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">{tile(t("Initiatives", "المبادرات"), ini.length, HORIZONS.map((h) => `${ini.filter((i) => i.horizon === h.id).length} ${L === "ar" ? ({ short: "قصير", medium: "متوسط", long: "طويل" } as Record<string, string>)[h.id] : h.id}`).join(" · "))}{tile(t("Funding not estimated", "تمويل غير مقدّر"), `${unfunded}/${ini.length}`, t("never invented", "لا يُختلق"))}{tile(t("Decision gates", "بوابات القرار"), dash.gates.length + gates.length, next[0] ? `${t("next", "التالية")}: ${next[0].id} ${next[0].gateDate}` : t("none dated", "لا مؤرخة"))}{tile(t("High-impact risks", "مخاطر عالية الأثر"), high, `${dash.risks.length} ${t("listed", "مدرجة")}`)}{tile(t("Early-warning indicators", "مؤشرات الإنذار المبكر"), dash.indicators.length)}</div>}
      {on("timeline") && <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label="Integrated timeline"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="label">{t("Integrated timeline (months from now)", "الجدول الزمني المتكامل (أشهر من الآن)")}</span>{ARCH_PILLARS.map((p) => <span key={p.id} className="inline-flex items-center gap-1 text-[10.5px] text-t1"><i className="size-2 rounded-sm" style={{ background: PILLAR_C[p.id] }} />{pn(L, p.id)}</span>)}</div>
        <div className="scroll-thin overflow-x-auto" dir="ltr"><div className="min-w-[640px]"><div className="relative ms-[150px] h-4 text-[10px] text-t2">{ticks.map((x) => <span key={x} className="absolute -translate-x-1/2 num" style={{ left: `${(x / end) * 100}%` }}>{x}</span>)}</div>
          <ul className="space-y-1">{[...ini].sort((a, b) => a.startMonth - b.startMonth || a.endMonth - b.endMonth).slice(0, compact ? 12 : 40).map((i) => <li key={i.id} className="flex items-center gap-2 text-[11px]"><span className="w-[148px] shrink-0 truncate text-t0" title={i.name}><b className="num">{i.id}</b> {i.name}</span><span className="relative h-4 flex-1 rounded bg-bg2"><i className="absolute top-0.5 h-3 rounded" style={{ left: `${(i.startMonth / end) * 100}%`, width: `${Math.max(1.5, ((i.endMonth - i.startMonth) / end) * 100)}%`, background: PILLAR_C[i.pillar] }} />{i.gateDate && <b className="absolute -top-0.5 text-[10px] text-warn" style={{ left: `${Math.min(97, (i.endMonth / end) * 100)}%` }} title={`${t("gate", "بوابة")} ${i.gateDate}`}>◆</b>}</span></li>)}</ul></div></div>
        <p className="mt-1 text-[10.5px] text-t2">{t("Bars are the Architect's proposed phasing, not an approved plan. ◆ = a decision gate.", "الأشرطة مرحلة مقترحة من المهندس لا خطة معتمدة. ◆ = بوابة قرار.")}</p></section>}
      {on("table") && !compact && <Tbl head={[t("ID", "المعرّف"), t("Initiative", "المبادرة"), t("Horizon", "الأفق"), t("Pillar", "الركيزة"), t("Lead (proposed)", "الجهة القائدة (مقترحة)"), t("Dependencies", "الاعتماديات"), t("Funding", "التمويل"), t("Expected outcome and KPI", "النتيجة المتوقعة ومؤشر القياس"), t("Principal risk", "الخطر الرئيسي"), t("Decision gate", "بوابة القرار"), t("Status", "الحالة")]}
        rows={[...ini].sort((a, b) => a.startMonth - b.startMonth).map((i: Initiative) => [<b key="i" className="num text-accent">{i.id}</b>, i.name, hn(L, i.horizon).split(":")[0], <Pill key="p" c={PILLAR_C[i.pillar]}>{pn(L, i.pillar)}</Pill>, i.lead || "—", i.dependencies.join(", ") || "—", i.funding, `${i.outcome}${i.kpi ? ` · KPI: ${i.kpi}` : ""}`, i.risk || "—", `${i.gate || "—"}${i.gateDate ? ` (${i.gateDate})` : ""}`, i.status])} />}
      {(on("indicators") || on("gates")) && <div className="grid gap-3 lg:grid-cols-2">
        {on("indicators") && <section className="rounded-[14px] border border-line bg-bg1 p-3"><h4 className="label mb-1.5">{t("Early-warning indicators", "مؤشرات الإنذار المبكر")}</h4><Tbl head={[t("Indicator", "المؤشر"), t("Signal", "الإشارة"), t("Threshold", "العتبة"), t("Owner", "المسؤول")]} rows={dash.indicators.slice(0, compact ? 5 : 20).map((x) => [x.name, x.signal, x.threshold, x.owner || "—"])} empty={t("None listed.", "لا شيء.")} /></section>}
        {on("gates") && <section className="rounded-[14px] border border-line bg-bg1 p-3"><h4 className="label mb-1.5">{t("Upcoming decision gates", "بوابات القرار القادمة")}</h4><Tbl head={[t("Gate", "البوابة"), t("When", "متى"), t("Decision", "القرار")]} rows={[...dash.gates.map((x) => [x.name, x.when, x.decision]), ...gates.map((i) => [`${i.id}: ${i.gate}`, i.gateDate!, i.outcome])].slice(0, compact ? 6 : 30)} empty={t("None listed.", "لا شيء.")} /></section>}
      </div>}
      {on("risks") && <section className="rounded-[14px] border border-line bg-bg1 p-3"><h4 className="label mb-1.5">{t("Major risks", "المخاطر الرئيسية")}</h4><Tbl head={[t("Risk", "الخطر"), t("Likelihood", "الاحتمال"), t("Impact", "الأثر"), t("Mitigation", "المعالجة")]} rows={dash.risks.slice(0, compact ? 5 : 20).map((r) => [r.name, r.likelihood || "—", <Pill key="i" c={IMP[r.impact]}>{r.impact}</Pill>, r.mitigation])} empty={t("None listed.", "لا شيء.")} /></section>}
    </div>
  );
}

/** The three horizons side by side: what is proposed in each, who would lead it (proposed) and the gate that decides it. For ministers: no tables, no indicators, only the shape of the strategy. */
export function HorizonCards({ L, dash }: { L: Lang; dash: Dashboard }) {
  const t = useTr(L);
  return (
    <div className="grid gap-2.5 lg:grid-cols-3">{HORIZONS.map((h) => { const xs = dash.initiatives.filter((i) => i.horizon === h.id); return (
      <section key={h.id} className="rounded-[12px] border border-line bg-bg2 p-3"><h4 className="label mb-1.5">{L === "ar" ? h.ar : h.en}</h4>
        {xs.length === 0 ? <p className="text-[11.5px] text-t2">{t("Nothing proposed.", "لا مقترحات.")}</p> : <ul className="space-y-1.5">{xs.slice(0, 6).map((i) => <li key={i.id} className="text-[12px] leading-snug"><span className="flex items-start gap-1.5"><i className="mt-1.5 size-2 shrink-0 rounded-sm" style={{ background: PILLAR_C[i.pillar] }} /><span className="text-t0"><b className="num text-t1">{i.id}</b> {i.name}</span></span>{i.gateDate && <span className="ms-3.5 block text-[10.5px] text-t2">{t("decision gate", "بوابة القرار")} {i.gateDate}</span>}</li>)}{xs.length > 6 && <li className="text-[11px] text-t2">+{xs.length - 6} {t("more in the Architect", "أخرى في المهندس")}</li>}</ul>}</section>); })}</div>
  );
}
