"use client";
import { useState } from "react";
import { POWER_GROUPS, deskByCode, type EInit, type Mission1, type Mission2, type PowerEntry } from "@/lib/desk/embassy";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { BAND_C, Bullets, Drill, Row, word } from "./shared";

type Ask = (text: string, agents?: string[]) => void;
const GROUP_C: Record<string, string> = { government: "#378ADD", security: "#7F77DD", economy: "#BA7517", private: "#D4537E", community: "#1D9E75", research: "#8a94a6", media: "#C0568C" };
const LEVEL_C: Record<string, string> = { decisive: "var(--accent)", influential: "var(--ok)", useful: "var(--t2)" };
const GROUP_L: Record<string, [string, string]> = { government: ["Government and institutions", "الحكومة والمؤسسات"], security: ["Security institutions", "المؤسسات الأمنية"], economy: ["Economic institutions", "المؤسسات الاقتصادية"], private: ["Business and private sector", "الأعمال والقطاع الخاص"], community: ["Community and civil society", "المجتمع والمجتمع المدني"], research: ["Research and universities", "الأبحاث والجامعات"], media: ["Media", "الإعلام"] };
const HAT_C: Record<string, string> = { E1: "#378ADD", E2: "#BA7517", E3: "#D4537E", E4: "#C0568C", E5: "#7F77DD", E6: "#8a94a6", E7: "#378ADD", E8: "#639922", E9: "#BA7517", E10: "#1D9E75", E11: "#C0568C", E12: "#639922", E13: "#8a94a6" };

/** Who matters, by group and level. Public roles and organisations only; engagement is open, official and reciprocal. */
export function PowerView({ L, power, head, onAsk }: { L: Lang; power: PowerEntry[]; head: string[]; onAsk: Ask }) {
  const t = useTr(L); const [lvl, setLvl] = useState<"all" | "decisive" | "influential" | "useful">("all"); const shown = power.filter((p) => lvl === "all" || p.level === lvl);
  return (
    <div className="space-y-4">
      {head.length > 0 && <p className="rounded-[10px] bg-bg2 p-3 text-[12.5px] leading-snug text-t0"><b>{t("On file (Wikidata):", "المسجّل (ويكي بيانات):")}</b> {head.join("; ")}</p>}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("Level", "المستوى")}>{(["all", "decisive", "influential", "useful"] as const).map((x) => <button key={x} type="button" aria-pressed={lvl === x} onClick={() => setLvl(x)} className={`h-8 rounded-full px-3 text-[12px] ${lvl === x ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{x === "all" ? t("All", "الكل") : word(L, x)} <span className="num text-[10.5px] opacity-70">{x === "all" ? power.length : power.filter((p) => p.level === x).length}</span></button>)}</div>
      {POWER_GROUPS.map((g) => { const xs = shown.filter((p) => p.group === g); if (!xs.length) return null; return (
        <section key={g}><h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-t0"><i className="size-2.5 rounded-sm" style={{ background: GROUP_C[g] }} />{L === "ar" ? GROUP_L[g][1] : GROUP_L[g][0]}<span className="num text-[11px] font-normal text-t2">{xs.length}</span></h4>
          <div className="grid gap-2 lg:grid-cols-2">{xs.map((p, i) => <Drill key={p.who + i} L={L} accent={GROUP_C[g]} head={p.who} sub={p.mandate} tags={<Pill c={LEVEL_C[p.level]}>{word(L, p.level)}</Pill>} onAsk={onAsk} askText={t(`Prepare the ambassador's engagement with ${p.who}: the ask, the offer, the right level, the sequence and what to avoid.`, `أعدّ تواصل السفير مع ${p.who}: الطلب والعرض والمستوى المناسب والتسلسل وما يُتجنّب.`)}><Row label={t("Why they matter", "لماذا يهمّون")}>{p.why}</Row><Row label={t("Engage (open, official)", "التواصل (علني ورسمي)")} tone="ok">{p.approach}</Row><Row label={t("Caution", "تحذير")} tone="warn">{p.caution}</Row><Row label={t("Source", "المصدر")}>{p.source}</Row></Drill>)}</div></section>); })}
      <p className="text-[11px] leading-snug text-t2">{t("Public roles and organisations only, from documented public sources. Engagement is open, official and reciprocal; nothing here is a profile of a private individual, and no allegiance is inferred from ethnicity, tribe or religion.", "أدوار عامة وجهات فقط من مصادر عامة موثّقة. والتواصل علني ورسمي وتبادلي؛ ولا شيء هنا ملف عن فرد خاص ولا يُستنتج ولاء من العرق أو القبيلة أو الدين.")}</p>
    </div>
  );
}
export function PartnersView({ L, partners, onAsk }: { L: Lang; partners: Mission1["partners"]; onAsk: Ask }) {
  const t = useTr(L); const sectors = [...new Set(partners.map((p) => p.sector).filter(Boolean))]; const [sec, setSec] = useState(""); const shown = partners.filter((p) => !sec || p.sector === sec);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Sector", "القطاع")}><button type="button" aria-pressed={!sec} onClick={() => setSec("")} className={`h-8 rounded-full px-3 text-[12px] ${!sec ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{t("All sectors", "كل القطاعات")}</button>{sectors.map((x) => <button key={x} type="button" aria-pressed={sec === x} onClick={() => setSec(x)} className={`h-8 rounded-full px-3 text-[12px] ${sec === x ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{x}</button>)}</div>
      <div className="grid gap-2 lg:grid-cols-2">{shown.map((p, i) => <Drill key={p.name + i} L={L} head={p.name} sub={p.winwin} tags={<><Pill c="var(--c2)">{p.sector}</Pill><Pill c={p.kind === "state-linked" ? "var(--warn)" : "var(--ok)"}>{word(L, p.kind)}</Pill></>} onAsk={onAsk} askText={t(`Prepare the introduction of ${p.name} to a UAE counterpart: structure, terms, the due diligence first, and the risks.`, `أعدّ تقديم ${p.name} إلى نظير إماراتي: الهيكل والشروط والعناية الواجبة أولًا والمخاطر.`)}>
        <Row label={t("Why this company", "لماذا هذه الشركة")}>{p.why}</Row><Row label={t("UAE counterpart", "النظير الإماراتي")}>{p.uaeCounterpart}</Row><Row label={t("Win-win", "مكسب للطرفين")} tone="ok">{p.winwin}</Row><Row label={t("Structure", "الهيكل")}>{p.structure}</Row><Row label={t("First step", "أول خطوة")}>{p.firstStep}</Row><Bullets label={t("Due diligence first", "العناية الواجبة أولًا")} items={p.dueDiligence} tone="warn" /><Row label={t("Risk", "الخطر")} tone="risk">{p.risk}</Row><Row label={t("Source", "المصدر")}>{p.source}</Row></Drill>)}</div>
      <p className="text-[11px] leading-snug text-t2">{t("Candidates for introduction, from public, documented sources. Each needs the due diligence shown before any introduction: ownership, sanctions screening, compliance, finances and reputation. Nothing here is an approval or a commitment.", "مرشحون للتقديم من مصادر عامة موثّقة. ويحتاج كل منهم إلى العناية الواجبة المبيّنة قبل أي تقديم: الملكية وفحص العقوبات والامتثال والمالية والسمعة. ولا شيء هنا موافقة أو التزام.")}</p>
    </div>
  );
}
export function PlaysView2({ L, plays, onAsk }: { L: Lang; plays: Mission1["plays"]; onAsk: Ask }) {
  const t = useTr(L); const K: Record<string, string> = { enter: "var(--accent)", expand: "var(--ok)", protect: "var(--warn)" };
  return <div className="grid gap-2 lg:grid-cols-2">{plays.map((p, i) => <Drill key={p.vehicle + p.sector + i} L={L} head={<><span className="num me-1.5 text-t2">#{i + 1}</span>{p.vehicle}</>} sub={p.why} tags={<><Pill c={K[p.kind]}>{word(L, p.kind)}</Pill>{p.sector && <Pill c="var(--t2)">{p.sector}</Pill>}{p.window && <Pill c="var(--c2)">{p.window}</Pill>}</>} onAsk={onAsk} askText={t(`Build the investment case for ${p.vehicle} in ${p.sector || "this country"}: the counterpart, the structure, the protections, the first 100 days and the due diligence.`, `ابنِ الحالة الاستثمارية لـ ${p.vehicle} في ${p.sector || "هذه الدولة"}: النظير والهيكل والحماية وأول 100 يوم والعناية الواجبة.`)}>
    <Row label={t("Local counterpart", "النظير المحلي")}>{p.partner}</Row><Row label={t("Structure", "الهيكل")}>{p.structure}</Row><Row label={t("Protections", "الحماية")} tone="ok">{p.protections}</Row><Row label={t("First step", "أول خطوة")}>{p.firstStep}</Row><Bullets label={t("Due diligence first", "العناية الواجبة أولًا")} items={p.dueDiligence} tone="warn" /><Row label={t("Risk", "الخطر")} tone="risk">{p.risk}</Row></Drill>)}</div>;
}
const InitCard = ({ L, i, onAsk }: { L: Lang; i: EInit; onAsk: Ask }) => {
  const t = useTr(L); const dk = deskByCode(i.desk);
  return (
    <Drill L={L} head={<><b className="num me-1.5 text-t2">{i.id}</b>{i.title}</>} tags={<>{dk && <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: HAT_C[i.desk.toUpperCase()] ?? "var(--t2)" }} title={L === "ar" ? dk.ar : dk.en}>{i.desk.toUpperCase()}</span>}{i.objective && <Pill c="var(--c2)">{i.objective}</Pill>}</>} sub={i.kpi} onAsk={(x) => onAsk(x, dk ? [dk.id] : undefined)} askText={t(`Detail initiative ${i.id} (${i.title.slice(0, 100)}): the steps, the due diligence, the dependencies and how success is measured.`, `فصّل المبادرة ${i.id} (${i.title.slice(0, 100)}): الخطوات والعناية الواجبة والتبعيات وكيف يُقاس النجاح.`)}>
      <Row label={t("Owner (proposed)", "المسؤول (مقترح)")}>{i.owner}</Row><Bullets label={t("Actions", "الإجراءات")} items={i.actions} /><Row label="KPI">{i.kpi}</Row><Row label={t("Baseline", "خط الأساس")}>{i.baseline}</Row><Row label={t("Target", "الهدف")}>{i.target}</Row><Row label={t("Cost", "الكلفة")}>{i.cost}</Row><Bullets label={t("Due diligence first", "العناية الواجبة أولًا")} items={i.dueDiligence} tone="warn" /><Row label={t("Depends on", "يعتمد على")}>{i.dependsOn.join(", ")}</Row><Row label={t("Risk", "الخطر")} tone="risk">{i.risk}</Row><Row label={t("Decision gate", "بوابة القرار")}>{i.gate}</Row></Drill>
  );
};
/** The three plans side by side; every initiative opens to its owner, actions, KPI, due diligence, dependencies and gate. */
export function PlanBoard2({ L, plans, onAsk }: { L: Lang; plans: Mission2["plans"]; onAsk: Ask }) {
  const t = useTr(L); const cols: [string, string, string, EInit[]][] = [["100 days", "مئة يوم", "var(--ok)", plans.d100], ["One year", "سنة", "var(--accent)", plans.y1], ["Three years", "ثلاث سنوات", "#7F77DD", plans.y3]];
  return <div className="grid gap-3 lg:grid-cols-3">{cols.map(([en, ar, c, xs]) => <section key={en} className="rounded-[14px] border border-line bg-bg1 p-3" style={{ borderTop: `3px solid ${c}` }}><h4 className="display text-[16px] font-semibold text-t0">{L === "ar" ? ar : en}</h4><span className="text-[11px] text-t2">{xs.length} {t("initiatives (proposals)", "مبادرات (مقترحات)")}</span><div className="mt-2 space-y-2">{xs.map((i) => <InitCard key={i.id} L={L} i={i} onAsk={onAsk} />)}{xs.length === 0 && <p className="text-[12px] text-t2">{t("None returned.", "لا شيء.")}</p>}</div></section>)}</div>;
}
export function ObjectivesView({ L, m, onAsk }: { L: Lang; m: Mission2; onAsk: Ask }) {
  const t = useTr(L); const s = m.strategy;
  return (
    <div className="space-y-4">
      {(s.endState || s.logic) && <div className="grid gap-3 md:grid-cols-2">{s.endState && <div className="rounded-[14px] border-2 border-accent/50 bg-bg1 p-4"><div className="label">{t("End state in three years", "الحالة المنشودة بعد ثلاث سنوات")}</div><p className="mt-1 text-[14px] leading-snug text-t0" dir="auto">{s.endState}</p></div>}{s.logic && <div className="rounded-[14px] border border-line bg-bg1 p-4"><div className="label">{t("Strategic logic", "المنطق الاستراتيجي")}</div><p className="mt-1 text-[13px] leading-snug text-t1" dir="auto">{s.logic}</p></div>}</div>}
      <div className="grid gap-2 lg:grid-cols-2">{s.objectives.map((o) => <Drill key={o.id} L={L} head={<><b className="num me-1.5 text-t2">{o.id}</b>{o.title}</>} sub={o.why} onAsk={onAsk} askText={t(`How do we deliver objective ${o.id} (${o.title.slice(0, 100)}) and what could stop it?`, `كيف نحقق الهدف ${o.id} (${o.title.slice(0, 100)}) وما الذي قد يوقفه؟`)}><Bullets label={t("Measured by", "يقاس بـ")} items={o.measures} tone="ok" /></Drill>)}</div>
      <div className="grid gap-3 md:grid-cols-3">{([[t("Assumptions", "الافتراضات"), s.assumptions, undefined], [t("What we will not do", "ما لن نفعله"), s.notDoing, "warn"], [t("What the mission needs from the ministry", "ما تحتاجه البعثة من الوزارة"), s.enablers, "ok"]] as [string, string[], "ok" | "warn" | undefined][]).filter(([, x]) => x.length).map(([l, x, tone]) => <div key={l} className="rounded-[12px] border border-line bg-bg1 p-3"><Bullets label={l} items={x} tone={tone} /></div>)}</div>
    </div>
  );
}
export function DueDiligenceView({ L, dd, onAsk }: { L: Lang; dd: Mission2["dueDiligence"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{dd.map((x) => <Drill key={x.subject} L={L} head={x.subject} tags={<><Pill c="var(--c2)">{x.kind}</Pill>{x.when && <Pill c="var(--t2)">{x.when}</Pill>}</>} onAsk={onAsk} askText={t(`Run the due-diligence plan for ${x.subject}: what to check, where, in what order, and what would stop the introduction.`, `نفّذ خطة العناية الواجبة لـ ${x.subject}: ما يُفحص وأين وبأي ترتيب وما الذي يوقف التقديم.`)}><Bullets label={t("Checks", "الفحوص")} items={x.checks} tone="warn" /><Row label={t("Where to check", "أين يُفحص")}>{x.source}</Row><Row label={t("Desk", "المكتب")}>{x.ownerDesk}</Row></Drill>)}</div>;
}
export function GatesView({ L, gates }: { L: Lang; gates: Mission2["gates"] }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{gates.map((g) => <Drill key={g.id} L={L} head={<><b className="num me-1.5 text-t2">{g.id}</b>{g.question}</>} tags={g.when ? <Pill c="var(--c2)">{g.when}</Pill> : undefined}><Row label={t("Evidence that settles it", "الدليل الذي يحسمه")}>{g.evidence}</Row><Row label={t("If the answer is no", "إن كان الجواب لا")} tone="warn">{g.ifNo}</Row></Drill>)}</div>;
}
export function EmbRisks({ L, risks, onAsk }: { L: Lang; risks: Mission1["risks"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{risks.map((r, i) => <Drill key={r.name + i} L={L} head={r.name} accent={r.impact === "high" ? "var(--risk)" : r.impact === "medium" ? "var(--warn)" : "var(--ok)"} tags={<><Pill c={BAND_C[r.impact === "high" ? "high" : r.impact === "medium" ? "medium" : "low"]}>{t("impact", "الأثر")}: {word(L, r.impact)}</Pill>{r.likelihood && <Pill c="var(--c2)">{r.likelihood}</Pill>}</>} onAsk={onAsk} askText={t(`How should the mission mitigate "${r.name}" and who owns it?`, `كيف ينبغي أن تعالج البعثة «${r.name}» ومن يتولاها؟`)}><Row label={t("Trigger", "المحفّز")}>{r.trigger}</Row><Row label={t("Mitigation", "المعالجة")} tone="ok">{r.mitigation}</Row><Row label={t("Owner (proposed)", "المسؤول (مقترح)")}>{r.owner}</Row></Drill>)}</div>;
}
export function ScenariosView2({ L, scenarios, onAsk }: { L: Lang; scenarios: Mission1["scenarios"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{scenarios.map((s, i) => <Drill key={s.name + i} L={L} head={s.name} sub={s.trigger} onAsk={onAsk} askText={t(`Develop the "${s.name}" scenario: how the UAE should prepare and what to do at the trigger.`, `طوّر سيناريو «${s.name}»: كيف تستعد الإمارات وماذا تفعل عند المحفّز.`)}><ul className="space-y-1">{s.effects.map((e) => <li key={e.desk + e.text} className="text-t0"><b>{e.desk}:</b> {e.text}</li>)}</ul><Row label={t("UAE response", "استجابة الإمارات")} tone="ok">{s.response}</Row><Row label={t("Indicator", "المؤشر")}>{s.indicator}</Row></Drill>)}</div>;
}
export function CalendarView({ L, cal }: { L: Lang; cal: Mission1["calendar"] }) {
  const t = useTr(L);
  return <ol className="space-y-2">{cal.map((c, i) => <li key={i}><Drill L={L} head={<><span className="numt me-2 text-t2">{c.when}</span>{c.what}</>}><Row label={t("Why it matters", "لماذا يهم")}>{c.why}</Row><Row label={t("Lead (proposed)", "المتولي (مقترح)")}>{c.lead}</Row></Drill></li>)}</ol>;
}
export function AskedView({ L, asked, onAsk }: { L: Lang; asked: Mission1["askedOfUs"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="space-y-2">{asked.map((a, i) => <Drill key={a.ask + i} L={L} head={a.ask} sub={a.from} onAsk={onAsk} askText={t(`How should the UAE respond to this ask: "${a.ask.slice(0, 140)}"? Options, conditions and a recommendation.`, `كيف ينبغي أن تستجيب الإمارات لهذا الطلب: «${a.ask.slice(0, 140)}»؟ الخيارات والشروط وتوصية.`)}><Row label={t("Our position (proposal)", "موقفنا (مقترح)")} tone="ok">{a.position}</Row><Row label={t("Cost", "الكلفة")}>{a.cost}</Row></Drill>)}</div>;
}
