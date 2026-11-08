"use client";
import { useMemo } from "react";
import { Banknote, Flag, ListChecks, Milestone, ShieldAlert, Target, Users, Zap } from "lucide-react";
import type { Mission2 } from "@/lib/desk/embassy";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { BarList, ReportHero, SegBar, type StatSpec } from "../report/kit";
import { HZ, HZ_W, STANCE_W, countBy, flatInits, hasFigure } from "@/lib/report/mission-model";
import type { ReportHead } from "@/lib/report/model";
import { plain } from "./EmbIntel";

const HZ_C: Record<string, string> = { d30: "var(--warn)", d100: "var(--ok)", y1: "var(--accent)", y3: "#7F77DD" };
const STANCE_C: Record<string, string> = { supportive: "var(--ok)", neutral: "var(--t2)", sceptical: "var(--warn)", unknown: "var(--line-2)" };
const dash = (n: number, label: string, c: string, icon: React.ReactNode, jump: string): StatSpec => (n === 0 ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });

/** The head of the mission strategy: the end state in three years as the bottom line, the quality grade and both auditors' verdicts, and the counts that matter. */
export function PlanHero({ L, m, head, nav, onJump }: { L: Lang; m: Mission2 | null; head: ReportHead; nav: { id: string; label: string }[]; onJump: (id: string) => void }) {
  const t = useTr(L); const n = m ? flatInits(m.plans) : []; const high = m ? m.risks.filter((r) => r.impact === "high").length : 0; const figs = m ? m.budget.filter((b) => hasFigure(b.amount)).length : 0;
  const stats: StatSpec[] | undefined = m ? [
    dash(m.strategy.objectives.length, t("objectives", "أهداف"), "var(--accent)", <Target size={16} />, "plan-objectives"),
    dash(n.length, t(`initiatives (${HZ.map((h) => m.plans[h].length).join(" · ")})`, `مبادرات (${HZ.map((h) => m.plans[h].length).join(" · ")})`), "var(--ok)", <ListChecks size={16} />, "plan-plans"),
    dash(m.gates.length, t("decision gates", "بوابات قرار"), "var(--warn)", <Flag size={16} />, "plan-gates"),
    dash(m.dueDiligence.length, t("due-diligence subjects", "مواضيع العناية الواجبة"), "var(--c2)", <ShieldAlert size={16} />, "plan-dd"),
    dash(m.milestones.length, t("milestones", "معالم"), "var(--accent)", <Milestone size={16} />, "plan-milestones"),
    dash(m.stakeholders.length, t("stakeholders mapped", "أصحاب مصلحة"), "var(--c2)", <Users size={16} />, "plan-stakeholders"),
    m.risks.length ? { n: `${high}/${m.risks.length}`, label: t("high-impact risks", "مخاطر مرتفعة الأثر"), c: high ? "var(--risk)" : "var(--ok)", icon: <Zap size={16} />, jump: "plan-risks" } : { n: "–", label: t("high-impact risks", "مخاطر مرتفعة الأثر"), c: "var(--t2)", icon: <Zap size={16} /> },
    m.budget.length ? { n: `${figs}/${m.budget.length}`, label: t("budget lines with a figure", "بنود ميزانية بمبلغ"), c: figs ? "var(--ok)" : "var(--t2)", icon: <Banknote size={16} />, jump: "plan-budget" } : { n: "–", label: t("budget lines", "بنود الميزانية"), c: "var(--t2)", icon: <Banknote size={16} /> },
  ] : undefined;
  return <ReportHero L={L} kicker={t("Mission strategy and plans: the end state in three years", "استراتيجية البعثة والخطط: الحالة المنشودة بعد ثلاث سنوات")} bottomLine={m?.strategy.endState ? plain(m.strategy.endState, 520) : undefined} head={head} stats={stats} nav={nav} onJump={onJump} />;
}

const Tile = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] font-medium text-t2">{title}</p>{children}</div>;
/** The plan as figures: initiatives by horizon and desk, how complete each initiative is as written, stakeholders by stance and the budget lines that carry a figure. */
export function PlanGlance({ L, m }: { L: Lang; m: Mission2 }) {
  const t = useTr(L); const all = useMemo(() => flatInits(m.plans), [m.plans]); const desks = useMemo(() => countBy(all, (i) => i.desk.toUpperCase()).slice(0, 8), [all]);
  const has: [string, (i: (typeof all)[number]) => boolean][] = [[t("owner proposed", "مسؤول مقترح"), (i) => !!i.owner], ["KPI", (i) => !!i.kpi], [t("baseline", "خط الأساس"), (i) => !!i.baseline], [t("target", "الهدف"), (i) => !!i.target], [t("milestone", "معلم"), (i) => !!i.milestone], [t("decision gate", "بوابة قرار"), (i) => !!i.gate], [t("due diligence", "عناية واجبة"), (i) => i.dueDiligence.length > 0], [t("dependencies", "تبعيات"), (i) => i.dependsOn.length > 0], [t("cost figure", "رقم الكلفة"), (i) => hasFigure(i.cost)]];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {all.length > 0 && <Tile title={t("Initiatives by horizon and by desk", "المبادرات بحسب الأفق وبحسب المكتب")}><SegBar segs={HZ.map((h) => ({ label: HZ_W[h][L], n: m.plans[h].length, color: HZ_C[h] }))} />{desks.length > 1 && <div className="mt-2.5"><BarList rows={desks.map((d) => ({ label: d.key, value: d.n, color: "var(--accent)" }))} /></div>}</Tile>}
      {all.length > 0 && <Tile title={t("How complete each initiative is, as written", "اكتمال كل مبادرة كما كُتبت")}><BarList max={all.length} rows={has.map(([label, f]) => { const n = all.filter(f).length; return { label, value: n, text: `${n}/${all.length}`, color: n === all.length ? "var(--ok)" : n === 0 ? "var(--risk)" : "var(--warn)" }; })} /></Tile>}
      {m.stakeholders.length > 0 && <Tile title={t("Stakeholders by stance", "أصحاب المصلحة بحسب الموقف")}><SegBar segs={(["supportive", "neutral", "sceptical", "unknown"] as const).map((k) => ({ label: STANCE_W[k][L], n: m.stakeholders.filter((x) => x.stance === k).length, color: STANCE_C[k] }))} /></Tile>}
      {m.budget.length > 0 && <Tile title={t("Budget lines and which carry a figure", "بنود الميزانية وأيها يحمل رقمًا")}><BarList max={Math.max(1, ...HZ.map((h) => m.budget.filter((b) => b.horizon === h).length))} rows={HZ.map((h) => { const xs = m.budget.filter((b) => b.horizon === h); const f = xs.filter((b) => hasFigure(b.amount)).length; return { label: HZ_W[h][L], value: xs.length, text: `${f}/${xs.length}`, color: HZ_C[h] }; }).filter((r) => r.value > 0)} /><p className="mt-1.5 text-[10.5px] text-t2">{t("Lines are “not estimated” unless the evidence supports a figure.", "البنود «غير مقدّرة» ما لم يدعم الدليل رقمًا.")}</p></Tile>}
    </div>
  );
}
