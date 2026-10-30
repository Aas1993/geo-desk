"use client";
import { useMemo } from "react";
import { BadgeCheck, CalendarRange, Flag, Gauge as GaugeIcon, ListChecks, Map as MapIcon, Scale, Target } from "lucide-react";
import { DOMAIN_LABEL, MOFA_DOMAINS, type Mofa } from "@/lib/desk/mofa";
import { counts, progressOf, STATUSES, type Track } from "@/lib/mofa/track";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { PostureScale, POS_COLOR } from "../bird/visuals";
import { BarList, ReportHero, SegBar, type StatSpec } from "../report/kit";
import { INTEREST_W, LEGAL_ORDER, LEGAL_W, POSTURE_W, countBy, measured } from "@/lib/report/mission-model";
import type { ReportHead } from "@/lib/report/model";

export const LEGAL_C: Record<string, string> = { "in force": "var(--ok)", pending: "var(--warn)", missing: "var(--risk)", "not held": "var(--t2)" };
const dash = (n: number | string, label: string, c: string, icon: React.ReactNode, jump: string): StatSpec => (n === 0 ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });
const WORDS = (L: Lang) => Object.fromEntries(Object.entries(POSTURE_W).map(([k, v]) => [k, v[L]]));

/** The head of the Ministry's brief: the posture in big type on its four-step scale, the bottom line, the quality grade and both auditors' verdicts, and the counts that matter. */
export function MofaHero({ L, m, head, track, nav, onJump }: { L: Lang; m: Mofa; head: ReportHead; track: Track; nav: { id: string; label: string }[]; onJump: (id: string) => void }) {
  const t = useTr(L); const prog = progressOf(m, track); const inForce = m.legal.filter((x) => x.status === "in force").length; const c = counts(m, track);
  const stats: StatSpec[] = [
    dash(m.priorities.length, t("ranked priorities", "أولويات مرتبة"), "var(--accent)", <Target size={16} />, "tab:priorities"),
    m.goals.length ? { n: `${measured(m)}/${m.goals.length}`, label: t("goals with a measure and target", "أهداف بمقياس وغاية"), c: measured(m) === m.goals.length ? "var(--ok)" : "var(--warn)", icon: <BadgeCheck size={16} />, jump: "tab:priorities" } : { n: "–", label: t("goals", "أهداف"), c: "var(--t2)", icon: <BadgeCheck size={16} /> },
    dash(m.mission.length, t("tasks for the mission", "مهام للبعثة"), "var(--c2)", <ListChecks size={16} />, "tab:priorities"),
    { n: `${m.plans.length}/${MOFA_DOMAINS.length}`, label: t("domains planned", "مجالات مخططة"), c: m.plans.length === MOFA_DOMAINS.length ? "var(--ok)" : "var(--warn)", icon: <MapIcon size={16} />, jump: "tab:plans" },
    dash(m.negotiation.length + m.visits.length, t("negotiation tracks and visits", "مسارات تفاوض وزيارات"), "var(--accent)", <CalendarRange size={16} />, "tab:agenda"),
    m.legal.length ? { n: `${inForce}/${m.legal.length}`, label: t("legal instruments in force", "صكوك قانونية نافذة"), c: inForce ? "var(--ok)" : "var(--warn)", icon: <Scale size={16} />, jump: "tab:agenda" } : { n: "–", label: t("legal instruments", "صكوك قانونية"), c: "var(--t2)", icon: <Scale size={16} /> },
    dash(m.watch.length, t("triggers for an updated brief", "محفزات موجز محدّث"), "var(--warn)", <Flag size={16} />, "tab:plans"),
    c.total ? { n: `${Math.round((prog ?? 0) * 100)}%`, label: t("progress tracked by the desk", "التقدم المتتبَّع في المكتب"), c: prog ? "var(--ok)" : "var(--t2)", icon: <GaugeIcon size={16} />, jump: "tab:track" } : { n: "–", label: t("progress", "التقدم"), c: "var(--t2)", icon: <GaugeIcon size={16} /> },
  ];
  return <ReportHero L={L} kicker={t("The Ministry's Council: foreign policy posture", "مجلس الوزارة: موقف السياسة الخارجية")} call={POSTURE_W[m.stance.posture]?.[L] ?? m.stance.posture} callColor={POS_COLOR[m.stance.posture]} bottomLine={m.stance.headline || undefined} head={head}
    scale={<PostureScale readers={[{ id: "mofa", short: "M", name: t("The Ministry's Council", "مجلس الوزارة"), value: m.stance.posture }]} words={WORDS(L)} L={L} />} stats={stats} nav={nav} onJump={onJump} />;
}

const Tile = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] font-medium text-t2">{title}</p>{children}</div>;
/** The Ministry's brief as figures: the ranked priorities with their progress, the interests they serve, the seven domains and how many actions each has, the legal agenda by status and the goals by priority. */
export function MofaGlance({ L, m, track, onJump }: { L: Lang; m: Mofa; track: Track; onJump: (id: string) => void }) {
  const t = useTr(L); const by = useMemo(() => new Map(m.plans.map((p) => [p.domain, p])), [m.plans]); const interests = useMemo(() => countBy(m.priorities, (p) => p.interest), [m.priorities]);
  const maxA = Math.max(1, ...m.plans.map((p) => p.actions.length)); const c = counts(m, track);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {m.priorities.length > 0 && <div className="md:col-span-2"><Tile title={t("The ranked priorities and how far each has got", "الأولويات المرتبة ومدى تقدم كل منها")}>
        <ol className="grid gap-1.5 md:grid-cols-2">{m.priorities.map((p) => { const pr = progressOf(m, track, p.id); const g = m.goals.filter((x) => x.priority === p.id).length; const k = m.mission.filter((x) => x.priority === p.id).length;
          return <li key={p.id}><button type="button" onClick={() => onJump("tab:priorities")} className="block w-full rounded-[10px] bg-bg1 p-2 text-start hover:ring-1 hover:ring-accent"><span className="flex items-start gap-2"><b className="numt grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] text-[var(--accent-ink)]">{p.rank}</b><span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium leading-snug text-t0" dir="auto">{p.title}</span><span className="mt-0.5 block text-[10.5px] text-t2">{INTEREST_W[p.interest]?.[L] ?? p.interest}{p.horizon ? ` · ${p.horizon}` : ""} · {g} {t("goals", "أهداف")} · {k} {t("tasks", "مهام")}</span></span></span>
            <span className="mt-1.5 flex items-center gap-2"><span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full bg-ok" style={{ width: `${Math.round((pr ?? 0) * 100)}%` }} /></span><span className="numt w-9 text-end text-[10.5px] text-t2">{pr == null ? "–" : `${Math.round(pr * 100)}%`}</span></span></button></li>; })}</ol></Tile></div>}
      {interests.length > 0 && <Tile title={t("Priorities by the national interest they serve", "الأولويات بحسب المصلحة الوطنية التي تخدمها")}><BarList rows={interests.map((x) => ({ label: INTEREST_W[x.key]?.[L] ?? x.key, value: x.n, color: "var(--accent)" }))} /></Tile>}
      <Tile title={t("The seven domains: actions planned for the embassy", "المجالات السبعة: الإجراءات المخططة للسفارة")}>
        <ul className="grid grid-cols-2 gap-1.5">{MOFA_DOMAINS.map((d) => { const p = by.get(d); return <li key={d}>{p ? <button type="button" onClick={() => onJump(`mofa-plan-${d}`)} className="block w-full rounded-[9px] bg-bg1 p-1.5 text-start hover:ring-1 hover:ring-accent" style={{ borderTop: "3px solid var(--accent)" }}><span className="flex items-center justify-between text-[11.5px] text-t0">{DOMAIN_LABEL[d][L]}<b className="numt">{p.actions.length}</b></span><span className="mt-1 block h-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full bg-accent" style={{ width: `${(p.actions.length / maxA) * 100}%` }} /></span></button> : <div className="rounded-[9px] border border-dashed border-line p-1.5 text-[11.5px] text-t2" style={{ borderTop: "3px solid var(--line)" }}>{DOMAIN_LABEL[d][L]}<span className="block text-[10px]">{t("not written", "لم يُكتب")}</span></div>}</li>; })}</ul></Tile>
      {m.legal.length > 0 && <Tile title={t("Legal and treaty agenda by status", "الأجندة القانونية والمعاهداتية بحسب الحالة")}><SegBar segs={LEGAL_ORDER.map((k) => ({ label: LEGAL_W[k][L], n: m.legal.filter((x) => x.status === k).length, color: LEGAL_C[k] }))} /></Tile>}
      {c.total > 0 && <Tile title={t("Progress on goals and tasks, as marked by the desk", "التقدم في الأهداف والمهام كما يحدده المكتب")}><SegBar segs={STATUSES.map((s) => ({ label: L === "ar" ? s.ar : s.en, n: c[s.id], color: s.color }))} /></Tile>}
    </div>
  );
}
