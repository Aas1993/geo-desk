"use client";
import Link from "next/link";
import { DOMAIN_LABEL, MOFA_BY, MOFA_DOMAINS, mofaRole, type Mofa } from "@/lib/desk/mofa";
import { headlineOf } from "@/lib/desk/core";
import { type OrgNode } from "@/lib/mofa/org";
import { PROGRESS_RULE, STATUSES, counts, progressOf, type Track, type TrackStatus } from "@/lib/mofa/track";
import { STATE_LABEL, type SeatState } from "@/lib/room/seats";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Bullets, Cites, Drill, Row } from "../desk/shared";

const bar = (p: number | null, c = "var(--ok)") => p == null ? null : <span className="inline-flex w-24 items-center gap-1.5 align-middle" aria-label={`${Math.round(p * 100)}%`}><span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full" style={{ width: `${Math.round(p * 100)}%`, background: c }} /></span><span className="numt text-[10.5px] text-t2">{Math.round(p * 100)}%</span></span>;
const INTEREST_AR: Record<string, string> = { security: "الأمن", economic: "الاقتصاد", "energy and food": "الطاقة والغذاء", "diplomatic standing": "المكانة الدبلوماسية", alliances: "التحالفات", citizens: "المواطنون", reputation: "السمعة" };
export const POSTURE_AR: Record<string, string> = { deepen: "تعميق", staged: "على مراحل", hedge: "تحوّط", hold: "ترقّب" };

/** The ranked priorities, each with its goals and the tasks set for the mission under it. */
export function PrioritiesView({ L, m, track, onAsk }: { L: Lang; m: Mofa; track: Track; onAsk: (text: string) => void }) {
  const t = useTr(L);
  return (
    <div className="space-y-2.5">
      {m.priorities.map((p) => { const goals = m.goals.filter((g) => g.priority === p.id); const tasks = m.mission.filter((x) => x.priority === p.id); const pr = progressOf(m, track, p.id);
        return (
          <Drill key={p.id} L={L} defaultOpen={p.rank <= 2} accent="var(--accent)" onAsk={onAsk} askText={`Priority ${p.id} (${p.title}): what would it take to advance it faster, and what could derail it?`} head={<><span className="numt me-1.5 text-t2">#{p.rank}</span>{p.title}</>} sub={bar(pr)} tags={<><Pill c="var(--c2)">{L === "ar" ? INTEREST_AR[p.interest] ?? p.interest : p.interest}</Pill>{p.horizon && <Pill c="var(--t2)">{p.horizon}</Pill>}<Pill c="var(--t2)">{p.id}</Pill></>}>
            <Row label={t("Why it ranks here", "لماذا يحتل هذه المرتبة")}>{p.why}<Cites ids={p.evidence} /></Row>
            {p.owner && <Row label={t("Ministry owner (proposed)", "مسؤول الوزارة (مقترح)")}>{p.owner}</Row>}
            {goals.length > 0 && <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[640px] text-[11.5px]"><thead><tr className="text-start text-t2">{[t("Goal", "الهدف"), t("Measure", "المقياس"), t("Baseline", "خط الأساس"), t("Target", "المستهدف"), t("By", "بحلول"), t("Owner", "المسؤول")].map((h) => <th key={h} className="py-1 pe-2 text-start font-medium">{h}</th>)}</tr></thead><tbody>{goals.map((g) => <tr key={g.id} className="border-t border-line align-top"><td className="py-1 pe-2 text-t0" dir="auto"><span className="numt text-t2">{g.id}</span> {g.goal}</td><td className="py-1 pe-2" dir="auto">{g.measure}</td><td className="py-1 pe-2" dir="auto">{g.baseline}</td><td className="py-1 pe-2" dir="auto">{g.target}</td><td className="py-1 pe-2" dir="auto">{g.by}</td><td className="py-1 pe-2" dir="auto">{g.owner}</td></tr>)}</tbody></table></div>}
            {tasks.length > 0 && <div className="mt-2"><Bullets label={t("Tasks set for the mission", "المهام المكلّفة للبعثة")} items={tasks.map((x) => `${x.id}: ${x.task} (${x.who}${x.when ? `, ${x.when}` : ""}${x.measure ? `; ${x.measure}` : ""})`)} /></div>}
          </Drill>
        ); })}
    </div>
  );
}
/** The embassy's plans in the seven domains, then the reporting lines and the triggers for an updated brief. */
export function PlansView({ L, m }: { L: Lang; m: Mofa }) {
  const t = useTr(L); const by = new Map(m.plans.map((p) => [p.domain, p]));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">{MOFA_DOMAINS.map((d) => { const p = by.get(d); const lab = DOMAIN_LABEL[d]; return (
        <section key={d} className="rounded-[14px] border border-line bg-bg1 p-3.5"><h4 className="display text-[15px] font-semibold text-t0">{L === "ar" ? lab.ar : lab.en}</h4>
          {p ? <><p className="mt-1 text-[12.5px] leading-snug text-t1" dir="auto">{p.aim}</p>
            <ul className="mt-2 space-y-1.5">{p.actions.map((a, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2 text-[12px] leading-snug"><span className="text-t0" dir="auto">{a.action}</span><span className="mt-0.5 block text-[10.5px] text-t2">{[a.owner, a.when, a.measure && `${t("measure", "المقياس")}: ${a.measure}`].filter(Boolean).join(" · ")}</span></li>)}</ul>
            {p.risks.length > 0 && <div className="mt-2"><Bullets label={t("Risks", "المخاطر")} items={p.risks} tone="warn" /></div>}{p.dependsOn.length > 0 && <p className="mt-1.5 text-[11px] text-t2">{t("Depends on", "يعتمد على")}: {p.dependsOn.join(", ")}</p>}</>
            : <p className="mt-1 text-[12px] text-warn">{t("This domain was not written in this run.", "لم يُكتب هذا المجال في هذا التشغيل.")}</p>}
        </section>); })}</div>
      {m.reporting.length > 0 && <Block title={t("Reporting and updated briefs", "التقارير والموجزات المحدّثة")} hint={t("What the mission sends the Ministry, what the Ministry sends back, and how often.", "ما ترسله البعثة إلى الوزارة وما تعيده الوزارة وبأي وتيرة.")}><ul className="grid gap-2 md:grid-cols-2">{m.reporting.map((r, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><b className="text-t0">{r.cadence}</b> <span className="text-t2">{r.from} → {r.to}</span><span className="mt-0.5 block text-t1" dir="auto">{r.content}</span></li>)}</ul></Block>}
      {m.watch.length > 0 && <Block title={t("What triggers an updated brief", "ما الذي يستدعي موجزًا محدّثًا")}><ul className="space-y-1.5">{m.watch.map((w, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><b className="text-t0" dir="auto">{w.indicator}</b> <span className="text-t1">— {w.signal}</span><span className="mt-0.5 block text-[11px] text-t2">{t("Threshold", "العتبة")}: {w.threshold}{w.action ? ` · ${t("then", "عندها")}: ${w.action}` : ""}</span></li>)}</ul></Block>}
    </div>
  );
}
/** The tracker: set each goal and task, add a note, and send the progress to the Ministry for an updated brief. */
export function TrackerView({ L, m, track, set, onUpdate, busy }: { L: Lang; m: Mofa; track: Track; set: (id: string, s: TrackStatus, note?: string) => void; onUpdate: () => void; busy: boolean }) {
  const t = useTr(L); const c = counts(m, track); const all = progressOf(m, track);
  const row = (id: string, kind: string, text: string, sub: string) => { const e = track[id]; const st = e?.status ?? "todo"; return (
    <li key={id} className="rounded-[10px] bg-bg2 p-2.5"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><p className="text-[12.5px] leading-snug text-t0" dir="auto"><span className="numt me-1 text-t2">{id}</span>{text}</p><p className="text-[10.5px] text-t2" dir="auto">{kind} · {sub}</p></div>
      <div role="radiogroup" aria-label={`${id} ${t("status", "الحالة")}`} className="flex flex-wrap gap-1">{STATUSES.map((s) => <button key={s.id} type="button" role="radio" aria-checked={st === s.id} onClick={() => set(id, s.id, e?.note)} className={`h-7 rounded-full border px-2.5 text-[11px] ${st === s.id ? "font-semibold text-t0" : "text-t2 hover:text-t0"}`} style={{ borderColor: st === s.id ? s.color : "var(--line)", background: st === s.id ? `color-mix(in srgb, ${s.color} 18%, transparent)` : "transparent" }}>{L === "ar" ? s.ar : s.en}</button>)}</div></div>
      {(st !== "todo" || e?.note) && <input aria-label={`${id} ${t("note", "ملاحظة")}`} maxLength={160} value={e?.note ?? ""} onChange={(ev) => set(id, st, ev.target.value)} placeholder={t("A short note (what moved, what is blocking)", "ملاحظة قصيرة (ما الذي تحرك وما العائق)")} className="mt-1.5 h-8 w-full rounded-[8px] border border-line bg-bg1 px-2 text-[12px] text-t0" />}{e?.at && <p className="mt-0.5 text-[10px] text-t2">{t("Updated", "حُدّث")} {e.at.slice(0, 10)}</p>}
    </li>); };
  return (
    <div className="space-y-4">
      <Block title={t("Progress", "التقدم")} hint={`${L === "ar" ? PROGRESS_RULE.ar : PROGRESS_RULE.en} ${t("Statuses are kept in this browser: the Ministry's own systems are the record.", "تُحفظ الحالات في هذا المتصفح: وأنظمة الوزارة هي السجل.")}`} right={bar(all)}>
        <div className="flex flex-wrap items-center gap-2">{STATUSES.map((s) => <Pill key={s.id} c={s.color}>{L === "ar" ? s.ar : s.en}: {c[s.id]}</Pill>)}<span className="text-[11.5px] text-t2">{t("of", "من")} {c.total}</span>
          <button type="button" disabled={busy || c.total === 0} onClick={onUpdate} className="ms-auto h-9 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-50">{t("Send this progress for an updated brief", "أرسل هذا التقدم لموجز محدّث")}</button></div>
        <p className="mt-2 text-[11px] text-t2">{t("The updated brief searches the last 30 days, reads your statuses and notes, and says which goals to keep, change or drop. It is a paid run (about US$0.20) and opens under Ask or direct.", "يبحث الموجز المحدّث في آخر 30 يومًا ويقرأ حالاتك وملاحظاتك ويقول أي الأهداف تُبقي أو تُغيّر أو تُسقط. هو تشغيل مدفوع (نحو 0.20 دولار) ويُفتح تحت «اسأل أو وجّه».")}</p>
      </Block>
      {m.priorities.map((p) => { const goals = m.goals.filter((g) => g.priority === p.id); const tasks = m.mission.filter((x) => x.priority === p.id); return (
        <Block key={p.id} title={`#${p.rank} ${p.title}`} right={bar(progressOf(m, track, p.id))}><ul className="space-y-1.5">{goals.map((g) => row(g.id, t("Goal", "هدف"), g.goal, `${g.target} · ${g.by} · ${g.owner}`))}{tasks.map((x) => row(x.id, t("Mission task", "مهمة البعثة"), x.task, `${x.who} · ${x.when}`))}{goals.length + tasks.length === 0 && <li className="text-[12px] text-t2">{t("No goal or task under this priority.", "لا هدف ولا مهمة تحت هذه الأولوية.")}</li>}</ul></Block>); })}
    </div>
  );
}
/** One role of the Ministry: what it does, the key roles in it, and what its agent said about this country. */
export function NodePanel({ L, node, report, state, kids, onClose }: { L: Lang; node: OrgNode; report: string | null; state: SeatState; kids: OrgNode[]; onClose: () => void }) {
  const t = useTr(L); const a = node.agent ? MOFA_BY.get(node.agent) : null; const text = a && report ? mofaRole(report, a) : ""; const head = text ? headlineOf(text) : "";
  return (
    <section className="rounded-[14px] border border-line bg-bg1 p-4" aria-label={L === "ar" ? node.ar : node.en}>
      <div className="flex flex-wrap items-start gap-2"><h3 className="display min-w-0 flex-1 text-[17px] font-semibold text-t0" dir="auto">{L === "ar" ? node.ar : node.en}</h3>{node.key && <Pill c="var(--warn)">★ {t("key role", "دور رئيسي")}</Pill>}<button type="button" onClick={onClose} className="h-8 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0">{t("Close", "إغلاق")}</button></div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-t1" dir="auto">{L === "ar" ? node.mandate.ar : node.mandate.en}</p>
      <div className="mt-2.5 grid gap-3 md:grid-cols-2"><Bullets label={t("Key functions", "المهام الرئيسية")} items={node.roles.map((r) => (L === "ar" ? r.ar : r.en))} />
        <div className="space-y-1.5 text-[12px]">{a ? <><p className="text-t1"><b className="text-t0">{t("Council agent", "وكيل المجلس")}:</b> M{a.n} · {L === "ar" ? a.ar : a.en} <Pill c="var(--c2)">{L === "ar" ? STATE_LABEL[state].ar : STATE_LABEL[state].en}</Pill></p>{head ? <p className="rounded-[10px] bg-bg2 p-2.5 leading-snug text-t0" dir="auto"><b className="text-t2">{t("Its headline for this country", "خلاصته لهذه الدولة")}:</b> {head}</p> : <p className="text-t2">{t("Run the Ministry's Council to hear this role on the chosen country.", "شغّل مجلس الوزارة لتسمع هذا الدور في الدولة المختارة.")}</p>}</> : <p className="text-t2">{t("No council agent thinks from this role: it is a support function that the council does not need to reason for.", "لا يفكر وكيل في المجلس من هذا الدور: فهو وظيفة مساندة لا يحتاج المجلس إلى التفكير نيابةً عنها.")}</p>}
          {node.link && <Link href={node.link} className="inline-block text-accent hover:underline">{t("Open the Ambassador's desks", "افتح مكاتب السفير")} →</Link>}
          {kids.length > 0 && <p className="text-t2">{t("Departments", "الإدارات")}: {kids.map((k) => (L === "ar" ? k.ar : k.en)).join(" · ")}</p>}</div></div>
    </section>
  );
}
