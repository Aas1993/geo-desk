"use client";
import { KING_BY, type KingParsed } from "@/lib/desk/king";
import { Pill, type Lang } from "../falcon/bits";
import { POSTURE } from "@/lib/case/core";
import { bt, useTr } from "../case/bits";
import { Bullets, CONF_C, Cites, Drill, Row, word } from "./shared";

type Ask = (text: string, agents?: string[]) => void;
const fieldName = (L: Lang, id: string) => { const a = KING_BY.get(id); return a ? (L === "ar" ? a.ar : a.en) : id; };
const courseName = (L: Lang, c: string) => bt(L, POSTURE[c as keyof typeof POSTURE]?.name) || c;

/** The Council's call: the recommended course, how confident, why, under what conditions and what happens if it is wrong. */
export function CouncilCall({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L); const d = k.decision;
  return (
    <section className="rounded-[18px] border-2 border-accent/60 bg-bg1 p-5" aria-label={t("The Council's call", "حكم المجلس")}>
      <div className="flex flex-wrap items-center gap-2"><span className="label">{t("The Council's call", "حكم المجلس")}</span><Pill c={CONF_C[d.confidence]}>{t("confidence", "الثقة")}: {word(L, d.confidence)}</Pill></div>
      <p className="display mt-2 text-[28px] font-semibold leading-tight text-accent">{courseName(L, d.course)}</p>
      <p className="mt-1 text-[15px] font-medium leading-snug text-t0" dir="auto">{d.headline}</p>
      <p className="mt-2 text-[13px] leading-snug text-t1" dir="auto">{d.rationale}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {d.conditions.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><Bullets label={t("Conditions", "الشروط")} items={d.conditions} tone="ok" /></div>}
        {d.ifWrong && <div className="rounded-[12px] bg-bg2 p-3 text-[12.5px] leading-snug"><b className="text-warn">{t("If this is wrong", "إن كان هذا خطأ")}</b><p className="mt-0.5 text-t0" dir="auto">{d.ifWrong}</p></div>}
      </div>
      <button type="button" onClick={() => onAsk(t(`Challenge the recommendation "${courseName(L, d.course)}": what is the strongest case against it and what would make you change it?`, `تحدَّ التوصية «${courseName(L, d.course)}»: ما أقوى حجة ضدها وما الذي يجعلك تغيّرها؟`), ["redteam"])} className="mt-3 inline-flex h-8 items-center rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0 hover:bg-bg2">{t("Ask the Red Team to challenge it", "اطلب من الفريق الأحمر أن يتحداها")}</button>
    </section>
  );
}
export function OptionsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="space-y-2">{k.options.map((o) => <Drill key={o.course} L={L} defaultOpen={o.course === k.decision.course} accent={o.course === k.decision.course ? "var(--accent)" : undefined} head={courseName(L, o.course)} sub={o.summary} tags={<>{o.course === k.decision.course && <Pill c="var(--accent)">{t("recommended", "موصى به")}</Pill>}<Pill c={o.reversibility === "easy" ? "var(--ok)" : o.reversibility === "hard" ? "var(--risk)" : "var(--warn)"}>{t("reversibility", "قابلية العكس")}: {word(L, o.reversibility)}</Pill></>} onAsk={onAsk} askText={t(`Develop the "${courseName(L, o.course)}" course: what exactly would the UAE do, in what order, at what cost and risk?`, `طوّر مسار «${courseName(L, o.course)}»: ماذا ستفعل الإمارات بالضبط وبأي ترتيب وبأي كلفة ومخاطر؟`)}>
    <Bullets label={t("For", "مع")} items={o.for} tone="ok" /><Bullets label={t("Against", "ضد")} items={o.against} tone="warn" /><Bullets label={t("It requires", "يتطلب")} items={o.requires} /><Row label={t("First move", "أول خطوة")}>{o.firstMove}</Row></Drill>)}</div>;
}
export function JudgmentsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="space-y-2">{k.judgments.map((j) => <Drill key={j.id} L={L} head={<><span className="num me-1.5 text-t2">{j.id}</span>{j.text}</>} tags={<><Pill c="var(--c2)">{j.band}</Pill><Pill c={CONF_C[j.confidence]}>{word(L, j.confidence)}</Pill></>} sub={fieldName(L, j.field)} onAsk={(x) => onAsk(x, [j.field])} askText={t(`Defend or revise judgment ${j.id}: "${j.text.slice(0, 160)}". What would change it?`, `دافع عن الحكم ${j.id} أو راجعه: «${j.text.slice(0, 160)}». ما الذي يغيّره؟`)}>
    <Row label={t("Specialist", "المختص")}>{fieldName(L, j.field)}</Row><Row label={t("Rests on", "يقوم على")}>{j.basis}</Row>{j.evidence.length > 0 && <p className="text-t1"><b className="text-t0">{t("Evidence", "الأدلة")}</b><Cites ids={j.evidence} /></p>}<Row label={t("Indicator to watch", "المؤشر المراقَب")}>{j.indicator}</Row></Drill>)}</div>;
}
export function RisksView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="space-y-2">{k.risks.map((r) => <Drill key={r.name} L={L} head={r.name} accent={r.impact === "high" ? "var(--risk)" : r.impact === "medium" ? "var(--warn)" : "var(--ok)"} tags={<><Pill c={r.impact === "high" ? "var(--risk)" : r.impact === "medium" ? "var(--warn)" : "var(--ok)"}>{t("impact", "الأثر")}: {word(L, r.impact)}</Pill>{r.likelihood && <Pill c="var(--c2)">{r.likelihood}</Pill>}</>} onAsk={onAsk} askText={t(`What is the best way to mitigate "${r.name}" and who should own it?`, `ما أفضل طريقة لمعالجة «${r.name}» ومن ينبغي أن يتولاها؟`)}>
    <Row label={t("Trigger", "المحفّز")}>{r.trigger}</Row><Row label={t("Mitigation", "المعالجة")} tone="ok">{r.mitigation}</Row><Row label={t("Owner (proposed)", "المسؤول (مقترح)")}>{r.owner}</Row></Drill>)}</div>;
}
export function WatchView({ L, k }: { L: Lang; k: KingParsed }) {
  const t = useTr(L);
  return <div className="scroll-thin overflow-x-auto rounded-[12px] border border-line bg-bg1"><table className="w-full min-w-[640px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Indicator", "المؤشر")}</th><th className="px-2 text-start font-semibold">{t("Signal", "الإشارة")}</th><th className="px-2 text-start font-semibold">{t("Threshold", "العتبة")}</th><th className="px-2 text-start font-semibold">{t("Where to read it", "أين يُقرأ")}</th></tr></thead>
    <tbody>{k.watch.map((w) => <tr key={w.indicator} className="border-t border-line align-top"><td className="px-3 py-2 font-semibold text-t0" dir="auto">{w.indicator}</td><td className="px-2 py-2 text-t1" dir="auto">{w.signal}</td><td className="px-2 py-2 text-t0" dir="auto">{w.threshold}</td><td className="px-2 py-2 text-t2" dir="auto">{w.source}</td></tr>)}</tbody></table></div>;
}
export function PrecedentsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  if (!k.precedents.length) return <p className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{t("The Council cited no UAE precedent that a source supports. Ask the policy-memory specialist.", "لم يستشهد المجلس بسابقة إماراتية تدعمها مصادر. اسأل مختص الذاكرة السياسية.")} <button type="button" onClick={() => onAsk(t("What has the UAE decided in this country and in comparable cases, and what followed?", "ماذا قررت الإمارات في هذه الدولة وفي حالات مماثلة وماذا أعقب ذلك؟"), ["precedent"])} className="ms-1 text-accent underline">{t("Ask", "اسأل")}</button></p>;
  return <div className="space-y-2">{k.precedents.map((p, i) => <Drill key={i} L={L} head={<><span className="num me-1.5 text-t2">{p.year}</span>{p.what}</>} sub={p.outcome} onAsk={(x) => onAsk(x, ["precedent"])} askText={t(`Tell me more about this precedent (${p.year}: ${p.what.slice(0, 120)}) and what it implies now.`, `حدّثني أكثر عن هذه السابقة (${p.year}: ${p.what.slice(0, 120)}) وماذا تعني الآن.`)}><Row label={t("What happened", "ماذا حدث")}>{p.outcome}</Row><Row label={t("Lesson", "الدرس")} tone="ok">{p.lesson}</Row></Drill>)}</div>;
}
export function ListsView({ L, k }: { L: Lang; k: KingParsed }) {
  const t = useTr(L);
  return <div className="grid gap-3 md:grid-cols-2">{([[t("Decisions asked of the head of state", "القرارات المطلوبة من رئيس الدولة"), k.decisionsAsked, "ok"], [t("Key assumptions to validate", "افتراضات رئيسية للتحقق"), k.assumptions, undefined], [t("What would change the call", "ما الذي يغيّر الحكم"), k.changeMind, "warn"], [t("Gaps and what would close them", "الثغرات وما يسدّها"), k.gaps, "risk"]] as [string, string[], "ok" | "warn" | "risk" | undefined][]).filter(([, x]) => x.length).map(([l, x, tone]) => <div key={l} className="rounded-[12px] border border-line bg-bg1 p-3"><Bullets label={l} items={x} tone={tone} /></div>)}</div>;
}
