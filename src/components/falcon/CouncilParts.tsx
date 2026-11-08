"use client";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, GitCompare, Scale, ShieldCheck, Users } from "lucide-react";
import type { CouncilParsed, RtStatus } from "@/lib/falcon/council-parse";
import { gateScore, type Gate } from "@/lib/falcon/gates";
import { Meter } from "../VisualBrief";
import { ListBar, NoMatch, ReportHero, SegBar, useListView, type Facet, type SortSpec } from "../report/kit";
import { LikeMap } from "../report/kit-fm";
import { useTr } from "../case/bits";
import { Pill, mixc, type Lang } from "./bits";
import type { ReportHead } from "@/lib/report/model";

// The pieces of the Falcon Council page that the old view drew as plain lists: the head with the red-team result, key judgments on a likelihood/confidence map with filters, the disagreements, the opportunities and exposures, the scenarios with their weights, the claim audit and the red team's challenges, each searchable.
export const SC: Record<RtStatus, string> = { survived: "var(--ok)", softened: "var(--warn)", reversed: "var(--risk)", untested: "var(--t2)" };
export const VC = { confirmed: "var(--ok)", disputed: "var(--risk)", unverifiable: "var(--warn)", stale: "var(--c2)" } as const;
const ST_W = { en: { survived: "Survived the red team", softened: "Softened", reversed: "Reversed", untested: "Untested" }, ar: { survived: "صمد أمام الفريق الأحمر", softened: "خُفِّف", reversed: "عُكس", untested: "لم يُختبر" } } as const;
const V_W = { en: { confirmed: "Confirmed", disputed: "Disputed", unverifiable: "Unverifiable", stale: "Stale" }, ar: { confirmed: "مؤكَّد", disputed: "متنازَع", unverifiable: "تعذّر التحقق", stale: "قديم" } } as const;
const CONF_W = { en: { high: "high", moderate: "moderate", low: "low" }, ar: { high: "مرتفعة", moderate: "معتدلة", low: "منخفضة" } } as const; const CONF_C = { high: "var(--ok)", moderate: "var(--warn)", low: "var(--risk)" } as const;
const RT_RANK: Record<string, number> = { reversed: 0, softened: 1, untested: 2, survived: 3 }; const CONF_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1 };
const rank3 = (v: string) => (/high|مرتفع/i.test(v) ? 3 : /medium|moderate|متوسط/i.test(v) ? 2 : /low|منخفض/i.test(v) ? 1 : 0);

/** The head of the assessment: the bottom line, both auditors' verdicts, the red-team result as one bar and the counts that matter. */
export function CouncilHero({ L, p, head, gates, nav, onJump }: { L: Lang; p: CouncilParsed; head: ReportHead; gates: Gate[]; nav: { id: string; label: string }[]; onJump: (id: string) => void }) {
  const t = useTr(L); const n = (s: RtStatus) => p.judgments.filter((j) => j.status === s).length; const conf = p.audit.filter((a) => a.verdict === "confirmed").length; const gs = gateScore(gates);
  const stat = (v: number | string, label: string, c: string, icon: React.ReactNode, jump: string, empty: boolean) => (empty ? { n: "–", label, c: "var(--t2)", icon } : { n: v, label, c, icon, jump });
  return (
    <ReportHero L={L} kicker={t("Falcon Council: assessment", "مجلس الصقر: التقييم")} bottomLine={p.bluf} head={head} gauge={null} onJump={onJump} nav={nav}
      extra={p.judgments.length > 0 ? <div className="mt-3"><p className="mb-1 text-[11px] text-t2">{t("What the red team did to each key judgment", "ما فعله الفريق الأحمر بكل حكم رئيسي")}</p><SegBar segs={[...(["survived", "softened", "reversed", "untested"] as const).map((s) => ({ label: ST_W[L][s], n: n(s), color: SC[s] })), { label: t("not stated", "غير مذكور"), n: p.judgments.filter((j) => !j.status).length, color: "var(--line-2)" }]} /></div> : null}
      stats={[
        stat(p.judgments.length, t("key judgments", "أحكام رئيسية"), "var(--accent)", <Scale size={16} />, "fc-judgments", !p.judgments.length),
        stat(`${n("survived")}/${p.judgments.length}`, t("survived the red team", "صمدت أمام الفريق الأحمر"), n("reversed") ? "var(--risk)" : "var(--ok)", <ShieldCheck size={16} />, "fc-judgments", !p.judgments.length),
        stat(`${conf}/${p.audit.length}`, t("audited claims confirmed", "ادعاءات مدقَّقة مؤكَّدة"), p.audit.some((a) => a.verdict === "disputed") ? "var(--risk)" : "var(--ok)", <CheckCircle2 size={16} />, "fc-audit", !p.audit.length),
        stat(p.disagreements.length, t("preserved disagreements", "خلافات محفوظة"), "var(--c2)", <GitCompare size={16} />, "fc-dis", !p.disagreements.length),
        stat(`${gs.pass}/${gates.length}`, t("automated gates passed", "بوابات آلية اجتيزت"), gs.fail ? "var(--risk)" : gs.warn ? "var(--warn)" : "var(--ok)", <AlertTriangle size={16} />, "fc-gates", !gates.length),
        stat(p.items.length, t("UAE opportunities and exposures", "فرص وتعرضات للإمارات"), "var(--accent)", <Users size={16} />, "fc-impact", !p.items.length),
      ]} />
  );
}

/** The key judgments: a map of likelihood against confidence, then each judgment with its red-team status, filterable by status, confidence and likelihood and sortable. */
export function JudgmentsPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const N = useMemo(() => p.judgments.map((j, i) => ({ ...j, n: i + 1 })), [p.judgments]);
  const facets = useMemo<Facet<(typeof N)[number]>[]>(() => [
    { id: "st", label: t("Red team", "الفريق الأحمر"), get: (x) => x.status ?? "none", options: (["survived", "softened", "reversed", "untested"] as const).filter((s) => N.some((x) => x.status === s)).map((v) => ({ v, label: ST_W[L][v], color: SC[v] })) },
    { id: "cf", label: t("Confidence", "الثقة"), get: (x) => x.confidence ?? "none", options: (["high", "moderate", "low"] as const).filter((s) => N.some((x) => x.confidence === s)).map((v) => ({ v, label: CONF_W[L][v], color: CONF_C[v] })) },
    { id: "lk", label: t("Likelihood", "الاحتمال"), get: (x) => (x.band ? (x.band.pct < 45 ? "low" : x.band.pct < 55 ? "even" : "high") : "none"), options: [{ v: "high", label: t("likely or more", "مرجح فأكثر") }, { v: "even", label: t("even", "متكافئ") }, { v: "low", label: t("unlikely or less", "مستبعد فأقل") }] },
  ], [N, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<(typeof N)[number]>[]>(() => [
    { id: "lk", label: t("Likelihood, highest first", "الاحتمال، الأعلى أولًا"), cmp: (a, z) => (z.band?.pct ?? -1) - (a.band?.pct ?? -1) || a.n - z.n },
    { id: "lk-low", label: t("Likelihood, lowest first", "الاحتمال، الأدنى أولًا"), cmp: (a, z) => (a.band?.pct ?? 101) - (z.band?.pct ?? 101) || a.n - z.n },
    { id: "cf", label: t("Confidence, highest first", "الثقة، الأعلى أولًا"), cmp: (a, z) => (CONF_RANK[z.confidence ?? ""] ?? 0) - (CONF_RANK[a.confidence ?? ""] ?? 0) || a.n - z.n },
    { id: "rt", label: t("Red team: reversed first", "الفريق الأحمر: المعكوس أولًا"), cmp: (a, z) => (RT_RANK[a.status ?? ""] ?? 4) - (RT_RANK[z.status ?? ""] ?? 4) || a.n - z.n },
  ], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(N, { text: (j) => `${j.n} ${j.text} ${j.agents} ${j.so} ${j.band?.label ?? ""} ${j.status ?? ""}`, facets, sorts });
  const placed = N.map((j) => ({ n: j.n, pct: j.band?.pct ?? null, conf: j.confidence, color: j.status ? SC[j.status] : "var(--t2)", label: j.text })); const unplaced = placed.filter((x) => x.pct == null || !x.conf).length;
  const open = (n: number) => { const el = document.getElementById(`fc-j-${n}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.add("ring-2", "ring-accent"); setTimeout(() => el?.classList.remove("ring-2", "ring-accent"), 1600); };
  if (!N.length) return null;
  return (
    <div>
      <div className="mb-3 grid gap-3 md:grid-cols-[auto_1fr]"><div className="rounded-[12px] bg-bg2 p-3"><LikeMap L={L} items={placed} onPick={open} /><p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-t2">{(["survived", "softened", "reversed", "untested"] as const).map((s) => <span key={s} className="inline-flex items-center gap-1"><i className="size-2 rounded-full" style={{ background: SC[s] }} />{ST_W[L][s]}</span>)}</p>{unplaced > 0 && <p className="mt-1 max-w-[340px] text-[10.5px] leading-snug text-t2">{t(`${unplaced} judgment${unplaced === 1 ? "" : "s"} gave no likelihood or no confidence the map can read and ${unplaced === 1 ? "is" : "are"} listed below, not placed.`, `${unplaced} حكم لم يذكر احتمالًا أو ثقة تقرؤها الخريطة فهو مدرج أدناه وغير موضوع.`)}</p>}</div>
        <div className="rounded-[12px] bg-bg2 p-3 text-[12px] leading-snug text-t1"><p className="mb-1.5 text-[11px] text-t2">{t("How to read it", "كيف تُقرأ")}</p><p>{t("Each dot is a key judgment, numbered as in the list. Across: how likely the council says it is. Up: how confident it is. The colour is what the red team did to it. A confident, likely judgment that survived is the strongest; a low-confidence one that was softened or reversed should not carry a decision alone.", "كل نقطة حكم رئيسي مرقّم كما في القائمة. عرضًا: مدى ترجيح المجلس له. ارتفاعًا: مدى ثقته به. واللون ما فعله الفريق الأحمر به. فالحكم الواثق المرجح الذي صمد هو الأقوى؛ أما منخفض الثقة الذي خُفِّف أو عُكس فلا يحمل قرارًا وحده.")}</p></div></div>
      <ListBar L={L} view={view} placeholder={t("Search judgments", "ابحث في الأحكام")} />
      <ul className="grid gap-2.5 md:grid-cols-2">{view.shown.map((j) => <li key={j.n} id={`fc-j-${j.n}`} className="scroll-mt-24 rounded-[14px] transition-shadow"><div className="flex items-center gap-1.5 px-1 pb-1 text-[10.5px] text-t2"><span className="numt grid size-5 place-items-center rounded-full text-[10px] font-bold text-[var(--bg-0)]" style={{ background: j.status ? SC[j.status] : "var(--t2)" }}>{j.n}</span>{j.status && <Pill c={SC[j.status]}>{ST_W[L][j.status]}</Pill>}{j.agents && <span dir="auto">{j.agents}</span>}</div><ul><Meter j={{ text: j.text, band: j.band, confidence: j.confidence, so: j.so }} lang={L} /></ul></li>)}</ul>
      {!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}

export function DisagreementsPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const view = useListView(p.disagreements, { text: (d) => `${d.issue} ${d.a} ${d.b} ${d.evidence} ${d.resolve}`, sorts: [{ id: "a", label: t("Issue A to Z", "القضية أ-ي"), cmp: (a, z) => a.issue.localeCompare(z.issue) }] });
  return (
    <div>{p.disagreements.length > 3 && <ListBar L={L} view={view} placeholder={t("Search disagreements", "ابحث في الخلافات")} />}
      <ul className="space-y-2.5">{view.shown.map((d, i) => <li key={i} className="rounded-[12px] bg-bg2 p-3"><b className="text-[13px] text-t0" dir="auto">{d.issue}</b><div className="mt-2 grid gap-2 md:grid-cols-2"><p className="rounded-[8px] p-2 text-[12px] leading-snug text-t0" style={{ background: mixc("var(--accent)", 12) }}><b className="label block">{t("Position A", "الموقف أ")}</b>{d.a}</p><p className="rounded-[8px] p-2 text-[12px] leading-snug text-t0" style={{ background: mixc("var(--warn)", 12) }}><b className="label block">{t("Position B", "الموقف ب")}</b>{d.b}</p></div>{(d.evidence || d.resolve) && <p className="mt-1.5 text-[11px] leading-snug text-t1">{d.evidence && <><b className="text-t0">{t("Evidence", "الدليل")}: </b>{d.evidence} </>}{d.resolve && <><b className="text-t0">{t("What would resolve it", "ما يحسمه")}: </b>{d.resolve}</>}</p>}</li>)}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}

const rankColor = (r: number, good: boolean) => (r === 3 ? (good ? "var(--ok)" : "var(--risk)") : r === 2 ? "var(--warn)" : good ? "var(--risk)" : "var(--ok)");
function Level({ label, value, good }: { label: string; value: string; good: boolean }) {
  const r = rank3(value); if (!value) return null;
  return <div className="flex items-center gap-2 text-[11px]"><span className="w-20 shrink-0 text-t2">{label}</span>{r > 0 ? <span className="flex flex-1 gap-0.5" aria-hidden>{[1, 2, 3].map((k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k <= r ? rankColor(r, good) : "var(--bg-3)" }} />)}</span> : <span className="flex-1" />}<b className="max-w-[45%] truncate text-t0" dir="auto" title={value}>{value}</b></div>;
}
/** UAE opportunities and exposures as cards with their size and feasibility drawn as three-step bars, filterable by type. */
export function ImpactPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const N = useMemo(() => p.items.map((x, i) => ({ ...x, n: i, opp: /opportun/i.test(x.type) })), [p.items]);
  const facets = useMemo<Facet<(typeof N)[number]>[]>(() => [{ id: "k", label: t("Kind", "النوع"), get: (x) => (x.opp ? "opp" : "exp"), options: [{ v: "opp", label: t("Opportunities", "الفرص"), color: "var(--ok)" }, { v: "exp", label: t("Exposures", "التعرضات"), color: "var(--risk)" }] }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<(typeof N)[number]>[]>(() => [{ id: "size", label: t("Size, largest first", "الحجم، الأكبر أولًا"), cmp: (a, z) => rank3(z.size) - rank3(a.size) || a.n - z.n }, { id: "feas", label: t("Feasibility, highest first", "الجدوى، الأعلى أولًا"), cmp: (a, z) => rank3(z.feas) - rank3(a.feas) || a.n - z.n }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(N, { text: (x) => `${x.item} ${x.type} ${x.size} ${x.feas} ${x.horizon} ${x.step}`, facets, sorts });
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search opportunities and exposures", "ابحث في الفرص والتعرضات")} />
      <ul className="grid gap-2.5 md:grid-cols-2">{view.shown.map((x) => { const c = x.opp ? "var(--ok)" : "var(--risk)"; return <li key={x.n} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${c}` }}><div className="flex items-start justify-between gap-2"><b className="text-[12.5px] leading-snug text-t0" dir="auto">{x.item}</b><Pill c={c}>{x.type}</Pill></div><div className="mt-2 space-y-1"><Level label={t("size", "الحجم")} value={x.size} good={false} /><Level label={t("feasibility", "الجدوى")} value={x.feas} good /></div>{x.horizon && <p className="mt-1.5 text-[11px] text-t2">{t("Horizon", "الأفق")}: <b className="text-t1">{x.horizon}</b></p>}{x.step && <p className="mt-1 text-[11.5px] leading-snug text-t1">→ {x.step}</p>}</li>; })}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}

export function OptionsPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const view = useListView(p.options, { text: (x) => `${x.option} ${x.window} ${x.benefit} ${x.risk} ${x.owner}` });
  return (
    <div>{p.options.length > 4 && <ListBar L={L} view={view} placeholder={t("Search options", "ابحث في الخيارات")} />}
      <ul className="grid gap-2 md:grid-cols-2">{view.shown.map((x, i) => <li key={i} className="rounded-[12px] bg-bg2 p-3 text-[12px] leading-snug" style={{ borderTop: "3px solid var(--accent)" }}><div className="flex flex-wrap items-baseline justify-between gap-2"><b className="text-[12.5px] text-t0" dir="auto">{x.option}</b>{x.window && <Pill c="var(--accent)">{x.window}</Pill>}</div><p className="mt-1 text-t1"><b className="text-ok">{t("Benefit", "المنفعة")}: </b>{x.benefit}</p>{x.risk && <p className="mt-0.5 text-t1"><b className="text-warn">{t("Risk", "المخاطر")}: </b>{x.risk}</p>}{x.owner && <p className="mt-0.5 text-[11px] text-t2">{t("Owner", "المسؤول")}: {x.owner}</p>}</li>)}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}

/** The scenarios with their weights as bars (a weight is drawn only where the text states a percentage) and the signposts to watch. */
export function ScenariosPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const w = p.scenarios.filter((s) => s.weight != null);
  return (
    <div className="space-y-3">
      {w.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("Scenario weights (the council's rough judgments, not computed probabilities)", "أوزان السيناريوهات (تقديرات المجلس التقريبية لا احتمالات محسوبة)")}</p><ul className="space-y-1.5">{w.map((s) => <li key={s.code} className="grid grid-cols-[minmax(0,40%)_1fr_auto] items-center gap-2 text-[12px]"><span className="truncate text-t1" dir="auto"><b className="numt text-t0">{s.code}</b> {s.name}</span><span className="block h-2.5 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, s.weight ?? 0)}%` }} /></span><span className="numt w-9 text-end text-[11px] text-t1">{s.weight}%</span></li>)}</ul></div>}
      <ul className="grid gap-2 md:grid-cols-2">{p.scenarios.map((s) => <li key={s.code} className="rounded-[12px] bg-bg2 p-3 text-[12px] leading-snug" style={{ borderTop: `3px solid ${s.wildcard ? "var(--warn)" : "var(--accent)"}` }}><div className="flex items-start justify-between gap-2"><b className="text-[12.5px] text-t0" dir="auto"><span className="numt text-t2">{s.code}</span> {s.name}</b>{s.weight != null ? <Pill c="var(--accent)">{s.weight}%</Pill> : s.wildcard ? <Pill c="var(--warn)">{t("wildcard", "مفاجأة")}</Pill> : null}</div><p className="mt-1 text-t1" dir="auto">{s.text}</p></li>)}</ul>
      {p.signposts.length > 0 && <div className="rounded-[12px] border border-line bg-bg1 p-3"><p className="label mb-1.5">{t("Signposts", "المؤشرات الدالة")}</p><ol className="space-y-1 text-[12px] leading-snug text-t1">{p.signposts.map((x, i) => <li key={i} className="flex gap-2"><span className="numt w-5 shrink-0 text-t2">{i + 1}</span><span dir="auto">{x}</span></li>)}</ol></div>}
    </div>
  );
}

/** The verifier's claim audit as a bar of verdicts and a list that can be searched and filtered by verdict. */
export function AuditPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const facets = useMemo<Facet<CouncilParsed["audit"][number]>[]>(() => [{ id: "v", label: t("Verdict", "الحكم"), get: (x) => x.verdict ?? "none", options: (["confirmed", "disputed", "unverifiable", "stale"] as const).filter((k) => p.audit.some((x) => x.verdict === k)).map((v) => ({ v, label: V_W[L][v], color: VC[v] })) }], [p.audit, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<CouncilParsed["audit"][number]>[]>(() => { const o = ["disputed", "stale", "unverifiable", "confirmed"]; return [{ id: "sev", label: t("Problems first", "المشكلات أولًا"), cmp: (a, z) => o.indexOf(a.verdict ?? "") - o.indexOf(z.verdict ?? "") }]; }, [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(p.audit, { text: (x) => `${x.claim} ${x.agent} ${x.verdict ?? ""} ${x.evidence} ${x.note}`, facets, sorts });
  return (
    <div><div className="mb-3 rounded-[12px] bg-bg2 p-3"><SegBar segs={(["confirmed", "disputed", "unverifiable", "stale"] as const).map((k) => ({ label: V_W[L][k], n: p.audit.filter((x) => x.verdict === k).length, color: VC[k] }))} /></div>
      <ListBar L={L} view={view} placeholder={t("Search claims", "ابحث في الادعاءات")} />
      <ul className="space-y-1.5">{view.shown.map((x, i) => <li key={i} className="flex items-start gap-2.5 rounded-[10px] bg-bg2 p-2 text-[12px] leading-snug" style={x.verdict ? { borderInlineStart: `3px solid ${VC[x.verdict]}` } : undefined}><span className="mt-0.5 shrink-0">{x.verdict ? <Pill c={VC[x.verdict]}>{V_W[L][x.verdict]}</Pill> : "?"}</span><span className="min-w-0 flex-1 text-t0" dir="auto">{x.claim}<span className="block text-[10.5px] text-t2">{[x.agent, x.evidence, x.note].filter(Boolean).join(" · ")}</span></span></li>)}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}

const changeKind = (c: string) => (/revers/i.test(c) ? "reversed" : /soften|caveat/i.test(c) ? "softened" : "held");
export function ChallengesPanel({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const cc = { reversed: "var(--risk)", softened: "var(--warn)", held: "var(--ok)" } as const; const cw = { reversed: t("Reversed", "عُكس"), softened: t("Softened", "خُفِّف"), held: t("Held", "ثبت") };
  const facets = useMemo<Facet<CouncilParsed["challenges"][number]>[]>(() => [{ id: "c", label: t("Result", "النتيجة"), get: (x) => changeKind(x.change), options: (["reversed", "softened", "held"] as const).filter((k) => p.challenges.some((x) => changeKind(x.change) === k)).map((v) => ({ v, label: cw[v], color: cc[v] })) }], [p.challenges, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(p.challenges, { text: (x) => `${x.judgment} ${x.agent} ${x.challenge} ${x.evidence} ${x.change}`, facets });
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search challenges", "ابحث في التحديات")} />
      <ul className="space-y-1.5">{view.shown.map((x, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderInlineStart: `3px solid ${cc[changeKind(x.change)]}` }}><div className="flex items-start justify-between gap-2"><b className="text-t0" dir="auto">{x.judgment}</b>{x.change && <Pill c={cc[changeKind(x.change)]}>{x.change}</Pill>}</div><p className="mt-1 text-t1" dir="auto">{x.challenge}</p>{(x.agent || x.evidence) && <p className="text-[10.5px] text-t2">{[x.agent, x.evidence].filter(Boolean).join(" · ")}</p>}</li>)}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}
