"use client";
import { useMemo } from "react";
import { KING_AGENTS, KING_BY, type KingParsed } from "@/lib/desk/king";
import { Pill, type Lang } from "../falcon/bits";
import { POSTURE } from "@/lib/case/core";
import { bt, useTr } from "../case/bits";
import { Bullets, CONF_C, Cites, Drill, Row, openDrill, word } from "./shared";
import { PostureScale, POS_COLOR } from "../bird/visuals";
import { BarList, ListBar, NoMatch, ReportHero, RiskMatrix, SegBar, useListView, type Facet, type SortSpec } from "../report/kit";
import { likelihoodBand, likelihoodRank, impactRank, type ReportHead } from "@/lib/report/model";
import { Clock3, FileWarning, Gavel, Scale, Users } from "lucide-react";

type Ask = (text: string, agents?: string[]) => void;
const fieldName = (L: Lang, id: string) => { const a = KING_BY.get(id); return a ? (L === "ar" ? a.ar : a.en) : id; };
const courseName = (L: Lang, c: string) => bt(L, POSTURE[c as keyof typeof POSTURE]?.name) || c;
const COURSES = ["deepen", "staged", "hedge", "hold"] as const;
const CONF_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1 }; const REV_RANK: Record<string, number> = { easy: 3, moderate: 2, hard: 1 };
const WORDS = { en: { deepen: "deepen", staged: "staged", hedge: "hedge", hold: "hold" }, ar: { deepen: "تعميق", staged: "على مراحل", hedge: "تحوّط", hold: "ترقّب" } };

/** A headline count: when the list is empty (a product cut off at the model's limit, or one that listed nothing) it shows a dash and does not link anywhere. */
const stat = (n: number | string, label: string, c: string, icon: React.ReactNode, jump: string) => (n === 0 ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });
/** The head of the Decision tab: the course in big type on its four-step scale, the bottom line, the quality grade and both auditors' verdicts, and the counts that matter. */
export function KingHero({ L, k, head, heard, nav, onJump }: { L: Lang; k: KingParsed; head: ReportHead; heard: number; nav: { id: string; label: string }[]; onJump: (id: string) => void }) {
  const t = useTr(L); const d = k.decision; const high = k.risks.filter((r) => r.impact === "high").length;
  return <ReportHero L={L} kicker={t("THE KING's Council: the decision", "مجلس القرار النهائي: القرار")} call={courseName(L, d.course)} callColor={POS_COLOR[d.course]} bottomLine={d.headline} head={head}
    scale={<PostureScale readers={[{ id: "king", short: "K", name: t("THE KING's Council", "مجلس القرار النهائي"), value: d.course }]} words={WORDS[L]} L={L} />}
    stats={[stat(k.judgments.length, t("key judgments", "أحكام رئيسية"), "var(--accent)", <Scale size={16} />, "king-judgments"), stat(k.risks.length ? `${high}/${k.risks.length}` : 0, t("high-impact risks", "مخاطر مرتفعة الأثر"), high ? "var(--risk)" : "var(--ok)", <FileWarning size={16} />, "king-risks"), stat(k.watch.length, t("indicators to watch", "مؤشرات للمراقبة"), "var(--c2)", <Clock3 size={16} />, "king-watch"), { n: `${heard}/${KING_AGENTS.length}`, label: t("specialists heard", "مختصون مسموعون"), c: heard === KING_AGENTS.length ? "var(--ok)" : "var(--warn)", icon: <Users size={16} /> }]} nav={nav} onJump={onJump} />;
}

/** The Council's call: the recommended course, how confident, why, under what conditions and what happens if it is wrong. With `compact` the course, headline and confidence (already in the head above) are not repeated. */
export function CouncilCall({ L, k, onAsk, compact }: { L: Lang; k: KingParsed; onAsk: Ask; compact?: boolean }) {
  const t = useTr(L); const d = k.decision;
  return (
    <section className={`rounded-[18px] bg-bg1 p-5 ${compact ? "border border-line" : "border-2 border-accent/60"}`} aria-label={t("The Council's call", "حكم المجلس")}>
      {!compact && <><div className="flex flex-wrap items-center gap-2"><span className="label">{t("The Council's call", "حكم المجلس")}</span><Pill c={CONF_C[d.confidence]}>{t("confidence", "الثقة")}: {word(L, d.confidence)}</Pill></div>
        <p className="display mt-2 text-[28px] font-semibold leading-tight text-accent">{courseName(L, d.course)}</p>
        <p className="mt-1 text-[15px] font-medium leading-snug text-t0" dir="auto">{d.headline}</p></>}
      {compact && <div className="flex flex-wrap items-center gap-2"><span className="label">{t("Why this course", "لماذا هذا المسار")}</span><Pill c={CONF_C[d.confidence]}>{t("confidence", "الثقة")}: {word(L, d.confidence)}</Pill></div>}
      <p className="mt-2 text-[13px] leading-snug text-t1" dir="auto">{d.rationale}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {d.conditions.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><Bullets label={t("Conditions", "الشروط")} items={d.conditions} tone="ok" /></div>}
        {d.ifWrong && <div className="rounded-[12px] bg-bg2 p-3 text-[12.5px] leading-snug"><b className="text-warn">{t("If this is wrong", "إن كان هذا خطأ")}</b><p className="mt-0.5 text-t0" dir="auto">{d.ifWrong}</p></div>}
      </div>
      <button type="button" onClick={() => onAsk(t(`Challenge the recommendation "${courseName(L, d.course)}": what is the strongest case against it and what would make you change it?`, `تحدَّ التوصية «${courseName(L, d.course)}»: ما أقوى حجة ضدها وما الذي يجعلك تغيّرها؟`), ["redteam"])} className="mt-3 inline-flex h-8 items-center rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0 hover:bg-bg2">{t("Ask the Red Team to challenge it", "اطلب من الفريق الأحمر أن يتحداها")}</button>
    </section>
  );
}

/** The four courses side by side: the recommended one marked, how reversible each is, and how many reasons for and against it the Council gave. */
export function CourseTiles({ L, k }: { L: Lang; k: KingParsed }) {
  const t = useTr(L);
  return (
    <ul className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{COURSES.map((c) => { const o = k.options.find((x) => x.course === c); const rec = k.decision.course === c; if (!o) return <li key={c} className="rounded-[12px] border border-dashed border-line p-3 text-[12px] text-t2">{courseName(L, c)}: {t("not written", "لم يُكتب")}</li>;
      const rc = o.reversibility === "easy" ? "var(--ok)" : o.reversibility === "hard" ? "var(--risk)" : "var(--warn)";
      return <li key={c} className="rounded-[12px] border bg-bg2 p-3" style={{ borderColor: rec ? POS_COLOR[c] : "var(--line)", borderTop: `3px solid ${POS_COLOR[c]}` }}>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: POS_COLOR[c] }}>{courseName(L, c)}{rec && <Pill c={POS_COLOR[c]}>{t("recommended", "موصى به")}</Pill>}</p>
        <div className="mt-2 space-y-1.5 text-[11px] text-t1"><div><span className="mb-0.5 flex justify-between"><span>{t("reversibility", "قابلية العكس")}</span><b style={{ color: rc }}>{word(L, o.reversibility)}</b></span><span className="flex gap-0.5" aria-hidden>{[1, 2, 3].map((n) => <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= REV_RANK[o.reversibility] ? rc : "var(--bg-3)" }} />)}</span></div>
          <div className="flex items-center gap-2"><span className="numt w-5 text-ok">{o.for.length}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full bg-ok" style={{ width: `${(o.for.length / Math.max(1, o.for.length + o.against.length)) * 100}%` }} /></span><span className="numt w-5 text-end text-warn">{o.against.length}</span></div><p className="flex justify-between text-[10px] text-t2"><span>{t("for", "مع")}</span><span>{t("against", "ضد")}</span></p></div>
      </li>; })}</ul>
  );
}
export function OptionsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  return <div><CourseTiles L={L} k={k} /><div className="space-y-2">{k.options.map((o, i) => <Drill key={o.course + i} L={L} defaultOpen={o.course === k.decision.course} accent={o.course === k.decision.course ? "var(--accent)" : undefined} head={courseName(L, o.course)} sub={o.summary} tags={<>{o.course === k.decision.course && <Pill c="var(--accent)">{t("recommended", "موصى به")}</Pill>}<Pill c={o.reversibility === "easy" ? "var(--ok)" : o.reversibility === "hard" ? "var(--risk)" : "var(--warn)"}>{t("reversibility", "قابلية العكس")}: {word(L, o.reversibility)}</Pill></>} onAsk={onAsk} askText={t(`Develop the "${courseName(L, o.course)}" course: what exactly would the UAE do, in what order, at what cost and risk?`, `طوّر مسار «${courseName(L, o.course)}»: ماذا ستفعل الإمارات بالضبط وبأي ترتيب وبأي كلفة ومخاطر؟`)}>
    <Bullets label={t("For", "مع")} items={o.for} tone="ok" /><Bullets label={t("Against", "ضد")} items={o.against} tone="warn" /><Bullets label={t("It requires", "يتطلب")} items={o.requires} /><Row label={t("First move", "أول خطوة")}>{o.firstMove}</Row></Drill>)}</div></div>;
}
export function JudgmentsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L); const N = useMemo(() => k.judgments.map((j, i) => ({ ...j, n: i })), [k.judgments]);
  const facets = useMemo<Facet<(typeof N)[number]>[]>(() => [{ id: "conf", label: t("Confidence", "الثقة"), get: (x) => x.confidence, options: (["high", "moderate", "low"] as const).map((v) => ({ v, label: word(L, v), color: CONF_C[v] })) }, { id: "field", label: t("Specialist", "المختص"), get: (x) => x.field, options: [...new Set(N.map((x) => x.field))].map((v) => ({ v, label: fieldName(L, v) })) }], [N, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<(typeof N)[number]>[]>(() => [{ id: "conf", label: t("Confidence, highest first", "الثقة، الأعلى أولًا"), cmp: (a, z) => CONF_RANK[z.confidence] - CONF_RANK[a.confidence] || a.n - z.n }, { id: "conf-low", label: t("Confidence, lowest first", "الثقة، الأدنى أولًا"), cmp: (a, z) => CONF_RANK[a.confidence] - CONF_RANK[z.confidence] || a.n - z.n }, { id: "field", label: t("Specialist", "المختص"), cmp: (a, z) => fieldName(L, a.field).localeCompare(fieldName(L, z.field)) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(N, { text: (j) => `${j.id} ${j.text} ${j.band} ${j.basis} ${fieldName(L, j.field)}`, facets, sorts });
  const rows = (["high", "moderate", "low"] as const).map((c) => ({ label: word(L, c), value: k.judgments.filter((j) => j.confidence === c).length, color: CONF_C[c] }));
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("How confident the Council is in its judgments", "مدى ثقة المجلس في أحكامه")}</p><BarList rows={rows} max={Math.max(1, k.judgments.length)} /></div>
      <ListBar L={L} view={view} placeholder={t("Search judgments", "ابحث في الأحكام")} />
      <div className="space-y-2">{view.shown.map((j) => <Drill key={j.id + j.n} id={`king-j-${j.n}`} L={L} head={<><span className="num me-1.5 text-t2">{j.id}</span>{j.text}</>} tags={<><Pill c="var(--c2)">{j.band}</Pill><Pill c={CONF_C[j.confidence]}>{word(L, j.confidence)}</Pill></>} sub={fieldName(L, j.field)} onAsk={(x) => onAsk(x, [j.field])} askText={t(`Defend or revise judgment ${j.id}: "${j.text.slice(0, 160)}". What would change it?`, `دافع عن الحكم ${j.id} أو راجعه: «${j.text.slice(0, 160)}». ما الذي يغيّره؟`)}>
        <Row label={t("Specialist", "المختص")}>{fieldName(L, j.field)}</Row><Row label={t("Rests on", "يقوم على")}>{j.basis}</Row>{j.evidence.length > 0 && <p className="text-t1"><b className="text-t0">{t("Evidence", "الأدلة")}</b><Cites ids={j.evidence} /></p>}<Row label={t("Indicator to watch", "المؤشر المراقَب")}>{j.indicator}</Row></Drill>)}{!view.shown.length && <NoMatch L={L} />}</div>
    </div>
  );
}
export function RisksView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L); const N = useMemo(() => k.risks.map((r, i) => ({ ...r, n: i + 1, rank: likelihoodRank(r.likelihood) })), [k.risks]);
  const ic = (v: string) => (v === "high" ? "var(--risk)" : v === "medium" ? "var(--warn)" : "var(--ok)");
  const facets = useMemo<Facet<(typeof N)[number]>[]>(() => [{ id: "impact", label: t("Impact", "الأثر"), get: (x) => x.impact, options: (["high", "medium", "low"] as const).map((v) => ({ v, label: word(L, v), color: ic(v) })) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<(typeof N)[number]>[]>(() => [{ id: "impact", label: t("Impact, highest first", "الأثر، الأعلى أولًا"), cmp: (a, z) => impactRank(z.impact) - impactRank(a.impact) || (z.rank ?? 0) - (a.rank ?? 0) }, { id: "like", label: t("Likelihood, highest first", "الاحتمال، الأعلى أولًا"), cmp: (a, z) => (z.rank ?? 0) - (a.rank ?? 0) || impactRank(z.impact) - impactRank(a.impact) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(N, { text: (r) => `${r.name} ${r.trigger} ${r.mitigation} ${r.owner} ${r.likelihood}`, facets, sorts });
  const placed = N.filter((r) => likelihoodBand(r.rank) != null).map((r) => ({ n: r.n, l: likelihoodBand(r.rank)!, i: impactRank(r.impact), label: r.name })); const unplaced = N.length - placed.length;
  return (
    <div>
      <div className="mb-3 grid gap-3 md:grid-cols-[auto_1fr]"><div className="rounded-[12px] bg-bg2 p-3"><RiskMatrix L={L} items={placed} onPick={(n) => openDrill(`king-r-${n}`)} />{unplaced > 0 && <p className="mt-1.5 max-w-[300px] text-[10.5px] leading-snug text-t2">{t(`${unplaced} risk${unplaced === 1 ? "" : "s"} did not state a likelihood the scale can read and ${unplaced === 1 ? "is" : "are"} not placed; ${unplaced === 1 ? "it is" : "they are"} listed below.`, `${unplaced} خطر لم يذكر احتمالًا يقرؤه المقياس فلم يوضع؛ وهو مدرج أدناه.`)}</p>}</div>
        <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("Risks by impact", "المخاطر بحسب الأثر")}</p><SegBar segs={(["high", "medium", "low"] as const).map((v) => ({ label: word(L, v), n: k.risks.filter((r) => r.impact === v).length, color: ic(v) }))} /></div></div>
      <ListBar L={L} view={view} placeholder={t("Search risks", "ابحث في المخاطر")} />
      <div className="space-y-2">{view.shown.map((r) => <Drill key={r.name + r.n} id={`king-r-${r.n}`} L={L} head={<><span className="num me-1.5 text-t2">{r.n}</span>{r.name}</>} accent={ic(r.impact)} tags={<><Pill c={ic(r.impact)}>{t("impact", "الأثر")}: {word(L, r.impact)}</Pill>{r.likelihood && <Pill c="var(--c2)">{r.likelihood}</Pill>}</>} onAsk={onAsk} askText={t(`What is the best way to mitigate "${r.name}" and who should own it?`, `ما أفضل طريقة لمعالجة «${r.name}» ومن ينبغي أن يتولاها؟`)}>
        <Row label={t("Trigger", "المحفّز")}>{r.trigger}</Row><Row label={t("Mitigation", "المعالجة")} tone="ok">{r.mitigation}</Row><Row label={t("Owner (proposed)", "المسؤول (مقترح)")}>{r.owner}</Row></Drill>)}{!view.shown.length && <NoMatch L={L} />}</div>
    </div>
  );
}
export function WatchView({ L, k }: { L: Lang; k: KingParsed }) {
  const t = useTr(L); const sorts = useMemo<SortSpec<KingParsed["watch"][number]>[]>(() => [{ id: "a", label: t("Indicator A to Z", "المؤشر أ-ي"), cmp: (a, z) => a.indicator.localeCompare(z.indicator) }, { id: "src", label: t("Where to read it", "أين يُقرأ"), cmp: (a, z) => a.source.localeCompare(z.source) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(k.watch, { text: (w) => `${w.indicator} ${w.signal} ${w.threshold} ${w.source}`, sorts });
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search indicators", "ابحث في المؤشرات")} />
      <div className="scroll-thin overflow-x-auto rounded-[12px] border border-line bg-bg1"><table className="w-full min-w-[640px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Indicator", "المؤشر")}</th><th className="px-2 text-start font-semibold">{t("Signal", "الإشارة")}</th><th className="px-2 text-start font-semibold">{t("Threshold", "العتبة")}</th><th className="px-2 text-start font-semibold">{t("Where to read it", "أين يُقرأ")}</th></tr></thead>
        <tbody>{view.shown.map((w, i) => <tr key={w.indicator + i} className="border-t border-line align-top"><td className="px-3 py-2 font-semibold text-t0" dir="auto">{w.indicator}</td><td className="px-2 py-2 text-t1" dir="auto">{w.signal}</td><td className="px-2 py-2"><Pill c="var(--warn)">{w.threshold}</Pill></td><td className="px-2 py-2 text-t2" dir="auto">{w.source}</td></tr>)}</tbody></table></div>{!view.shown.length && <NoMatch L={L} />}</div>
  );
}
export function PrecedentsView({ L, k, onAsk }: { L: Lang; k: KingParsed; onAsk: Ask }) {
  const t = useTr(L);
  if (!k.precedents.length) return <p className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{t("The Council cited no UAE precedent that a source supports. Ask the policy-memory specialist.", "لم يستشهد المجلس بسابقة إماراتية تدعمها مصادر. اسأل مختص الذاكرة السياسية.")} <button type="button" onClick={() => onAsk(t("What has the UAE decided in this country and in comparable cases, and what followed?", "ماذا قررت الإمارات في هذه الدولة وفي حالات مماثلة وماذا أعقب ذلك؟"), ["precedent"])} className="ms-1 text-accent underline">{t("Ask", "اسأل")}</button></p>;
  const sorted = [...k.precedents].sort((a, z) => (parseInt(a.year, 10) || 0) - (parseInt(z.year, 10) || 0));
  return <ol className="ms-1.5 space-y-2 border-s-2 border-line ps-4">{sorted.map((p, i) => <li key={i} className="relative"><span aria-hidden className="absolute -start-[23px] top-3 size-4 rounded-full bg-bg1" style={{ border: "2px solid var(--accent)" }} /><span className="numt mb-0.5 inline-block rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] font-semibold text-accent"><Gavel size={10} aria-hidden className="me-1 inline" />{p.year}</span><Drill L={L} head={p.what} sub={p.outcome} onAsk={(x) => onAsk(x, ["precedent"])} askText={t(`Tell me more about this precedent (${p.year}: ${p.what.slice(0, 120)}) and what it implies now.`, `حدّثني أكثر عن هذه السابقة (${p.year}: ${p.what.slice(0, 120)}) وماذا تعني الآن.`)}><Row label={t("What happened", "ماذا حدث")}>{p.outcome}</Row><Row label={t("Lesson", "الدرس")} tone="ok">{p.lesson}</Row></Drill></li>)}</ol>;
}
export function ListsView({ L, k }: { L: Lang; k: KingParsed }) {
  const t = useTr(L);
  return <div className="grid gap-3 md:grid-cols-2">{([[t("Decisions asked of the head of state", "القرارات المطلوبة من رئيس الدولة"), k.decisionsAsked, "ok"], [t("Key assumptions to validate", "افتراضات رئيسية للتحقق"), k.assumptions, undefined], [t("What would change the call", "ما الذي يغيّر الحكم"), k.changeMind, "warn"], [t("Gaps and what would close them", "الثغرات وما يسدّها"), k.gaps, "risk"]] as [string, string[], "ok" | "warn" | "risk" | undefined][]).filter(([, x]) => x.length).map(([l, x, tone]) => <div key={l} className="rounded-[12px] border border-line bg-bg1 p-3" style={{ borderTop: `3px solid ${tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "risk" ? "var(--risk)" : "var(--line-2)"}` }}><Bullets label={l} items={x} tone={tone} /></div>)}</div>;
}
