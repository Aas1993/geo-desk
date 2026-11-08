"use client";
import type { Mission1, Mission2 } from "@/lib/desk/embassy";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Drill, Row } from "./shared";

type Ask = (text: string, agents?: string[]) => void;
const STANCE_C: Record<string, string> = { supportive: "var(--ok)", neutral: "var(--t2)", sceptical: "var(--warn)", unknown: "var(--t2)" };
const LEVEL_C: Record<string, string> = { decisive: "var(--accent)", influential: "var(--ok)", useful: "var(--t2)" };
const HZ: Record<string, [string, string, string]> = { d30: ["30 days", "30 يومًا", "var(--warn)"], d100: ["100 days", "100 يوم", "var(--ok)"], y1: ["1 year", "سنة", "var(--accent)"], y3: ["3 years", "3 سنوات", "#7F77DD"] };
const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => <div className="scroll-thin overflow-x-auto rounded-[12px] border border-line bg-bg1"><table className="w-full min-w-[640px] border-collapse text-[12px]"><thead><tr className="bg-bg2 text-[10.5px] text-t2">{head.map((h) => <th key={h} className="px-3 py-2 text-start font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line align-top">{r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? "text-t0" : "text-t1"}`} dir="auto">{c}</td>)}</tr>)}</tbody></table></div>;
/** The first thirty days, in order: who to engage, who leads for the UAE, the ask, the offer and what must be ready first. Public roles and organisations only. */
export function CallSheetView({ L, items, onAsk }: { L: Lang; items: Mission1["callSheet"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{items.map((c, i) => <Drill key={c.who + i} L={L} head={<><b className="num me-1.5 text-t2">{i + 1}</b>{c.who}</>} sub={`${c.when}${c.format ? ` · ${c.format}` : ""}${c.level ? ` · ${c.level}` : ""}`} onAsk={onAsk} askText={t(`Prepare the ${c.format || "engagement"} with ${c.who}: the talking points, the ask, the offer and what must be ready first.`, `جهّز ${c.format || "الارتباط"} مع ${c.who}: نقاط الحوار والطلب والعرض وما يجب جاهزيته أولًا.`)}><Row label={t("Ask", "الطلب")}>{c.ask}</Row><Row label={t("Offer", "العرض")} tone="ok">{c.offer}</Row><Row label={t("Prepare first", "التحضير أولًا")}>{c.prep}</Row></Drill>)}</div>;
}
export function CollectionView({ L, items }: { L: Lang; items: Mission1["collection"] }) {
  const t = useTr(L);
  return <Table head={[t("Gap", "الفجوة"), t("How to close it (open and lawful)", "كيف تُسدّ (علنًا وبوجه مشروع)"), t("Desk", "المكتب")]} rows={items.map((x) => [x.gap, x.how, x.desk])} />;
}
/** The stakeholder map of the strategy: public roles and organisations, what they want from public record, their stance and the open way to engage each. */
export function StakeholdersView({ L, items }: { L: Lang; items: Mission2["stakeholders"] }) {
  const t = useTr(L);
  return <Table head={[t("Who", "من"), t("Level", "المستوى"), t("Interest", "المصلحة"), t("Stance", "الموقف"), t("Engagement", "الارتباط"), t("Owner (proposed)", "المسؤول (مقترح)")]} rows={items.map((x) => [x.who, <Pill key="l" c={LEVEL_C[x.level]}>{x.level}</Pill>, x.interest, <Pill key="s" c={STANCE_C[x.stance]}>{x.stance}</Pill>, x.engagement, x.owner])} />;
}
export function EngagementCalendarView({ L, items }: { L: Lang; items: Mission2["calendar"] }) {
  const t = useTr(L);
  return <Table head={[t("When", "متى"), t("What", "ماذا"), t("Who", "من"), t("Objective", "الهدف"), t("Lead (proposed)", "المسؤول (مقترح)")]} rows={items.map((x) => [x.when, x.what, x.who, x.objective, x.lead])} />;
}
/** Milestones by horizon: the dated, observable results that prove the plans are working. */
export function MilestonesView({ L, items }: { L: Lang; items: Mission2["milestones"] }) {
  const t = useTr(L);
  return <div className="grid gap-3 lg:grid-cols-4">{(["d30", "d100", "y1", "y3"] as const).map((h) => <section key={h} className="rounded-[14px] border border-line bg-bg1 p-3" style={{ borderTop: `3px solid ${HZ[h][2]}` }}><h4 className="display text-[15px] font-semibold text-t0">{L === "ar" ? HZ[h][1] : HZ[h][0]}</h4><ol className="mt-2 space-y-1.5">{items.filter((x) => x.horizon === h).map((x, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2 text-[12px] leading-snug"><b className="text-t0" dir="auto">{x.when}</b> <span className="text-t1" dir="auto">{x.milestone}</span><span className="block text-[11px] text-t2">{[x.initiatives.join(", "), x.gate && `${t("gate", "بوابة")} ${x.gate}`].filter(Boolean).join(" · ")}</span></li>)}{!items.some((x) => x.horizon === h) && <li className="text-[12px] text-t2">{t("None returned.", "لا شيء.")}</li>}</ol></section>)}</div>;
}
/** The budget lines: "not estimated" unless the evidence supports a figure, with the proposed funder. */
export function BudgetView({ L, items }: { L: Lang; items: Mission2["budget"] }) {
  const t = useTr(L);
  return <Table head={[t("Line", "البند"), t("Horizon", "الأفق"), t("Amount", "المبلغ"), t("Basis", "الأساس"), t("Funder (proposed)", "الممول (مقترح)")]} rows={items.map((x) => [x.line, L === "ar" ? HZ[x.horizon][1] : HZ[x.horizon][0], <b key="a" className={/not estimated/i.test(x.amount) ? "text-t2" : "text-t0"}>{x.amount}</b>, x.basis, x.funder])} />;
}
/** Tripwires: a signal, its threshold and the response agreed in advance, so a change of course is a decision already made and not an argument held under pressure. */
export function TripwiresView({ L, items }: { L: Lang; items: Mission2["tripwires"] }) {
  const t = useTr(L);
  return <Table head={[t("Signal", "الإشارة"), t("Threshold", "العتبة"), t("Response agreed in advance", "الاستجابة المتفق عليها"), t("Owner", "المسؤول"), t("Reviews", "يراجع")]} rows={items.map((x) => [x.signal, x.threshold, x.response, x.owner, x.reviews])} />;
}
export function GovernanceView({ L, items }: { L: Lang; items: Mission2["governance"] }) {
  const t = useTr(L);
  return <Table head={[t("Forum", "المنتدى"), t("Cadence", "الوتيرة"), t("Chair (proposed)", "الرئيس (مقترح)"), t("Purpose", "الغرض")]} rows={items.map((x) => [x.forum, x.cadence, x.chair, x.purpose])} />;
}
