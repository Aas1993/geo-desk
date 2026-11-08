"use client";
import { useMemo, type ReactNode } from "react";
import { APPRAISAL_CRITERIA, GATES, type AppraisedOption } from "@/lib/machiavelli/appraisal";
import type { Appraisal, PathNode, StratParsed } from "@/lib/machiavelli/strategy-parse";
import { headOf } from "@/lib/report/model";
import { ListBar, NoMatch, ReportHero, SegBar, useListView, type Facet, type SortSpec, type StatSpec } from "../report/kit";
import { AsOfSoWhat, StandardParts, useStandard } from "../report/standard";
import { FTbl } from "../report/kit-fm";
import { useTr } from "../case/bits";
import { Pill, type Lang } from "../falcon/bits";
import { BRANCH, CONF, Inline, STAGE } from "./parts";

// Screen pieces shared by the Machiavellian pages: the head of a product (call, bottom line, as-of, so-what, auditors' chips, counts and links), the six 1-5 scores of an appraised option as bars, option cards and the list of an outcome tree's nodes. None estimates anything: each draws what the saved product holds.
/** The head of a Machiavellian product: the hero (no quality grade: that exists only for the four gated desk kinds), the as-of and so-what line, and the counts. The standard parts are placed by the caller inside its own fold group with `<MachStandard>`. */
export function MachHead({ L, kind, report, at, kicker, call, callColor, bottomLine, stats, nav, onJump, extra }: { L: Lang; kind: string; report: string; at: string; kicker: string; call?: string; callColor?: string; bottomLine?: string; stats?: StatSpec[]; nav?: { id: string; label: string }[]; onJump?: (id: string) => void; extra?: ReactNode }) {
  const head = useMemo(() => headOf(kind, report, { lang: L, bottomLine }), [kind, report, L, bottomLine]); const std = useStandard(report);
  return (
    <div className="space-y-3">
      <ReportHero L={L} kicker={kicker} call={call} callColor={callColor} bottomLine={bottomLine} head={head} gauge={null} stats={stats} nav={nav} onJump={onJump} extra={extra} />
      <AsOfSoWhat L={L} at={at} soWhat={std?.soWhat} />
    </div>
  );
}
/** The standard parts (angle matrix, scenarios with tripwires, plan, coalition, ledger) of a product, from its own JSON; nothing when it has none. */
export function MachStandard({ L, report, skip, target, onJump }: { L: Lang; report: string; skip?: string[]; target?: (angle: string) => string | null; onJump?: (id: string) => void }) {
  const std = useStandard(report); return <StandardParts L={L} std={std} skip={skip} target={target} onJump={onJump} />;
}
export const stat = (n: number | string, label: string, c: string, icon: ReactNode, jump?: string, empty = false): StatSpec => (empty ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });

const SC = (v: number | null) => (v == null ? "var(--line-2)" : v >= 4 ? "var(--ok)" : v >= 3 ? "var(--accent)" : v >= 2 ? "var(--warn)" : "var(--risk)");
const gateTone = (v: boolean | null) => (v === true ? "var(--ok)" : v === false ? "var(--risk)" : "var(--t2)");
/** The six 1-5 scores of an appraised option as six small bars with their criterion names, and the three gates as pills. */
export function ScoreBars({ L, o }: { L: Lang; o: AppraisedOption }) {
  return (
    <div className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">{APPRAISAL_CRITERIA.map((c, i) => <div key={c.id} className="flex items-center gap-2 text-[11px]"><span className="w-36 shrink-0 truncate text-t2" title={L === "ar" ? c.ar : c.en}>{L === "ar" ? c.ar : c.en}</span><span className="flex h-1.5 flex-1 gap-0.5" role="img" aria-label={`${L === "ar" ? c.ar : c.en}: ${o.scores[i] ?? "?"}/5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className="h-full flex-1 rounded-full" style={{ background: o.scores[i] != null && k <= (o.scores[i] as number) ? SC(o.scores[i]) : "var(--bg-3)" }} />)}</span><b className="numt w-7 text-end text-t0">{o.scores[i] ?? "–"}</b></div>)}</div>
  );
}
export const GateRow = ({ L, g }: { L: Lang; g: Appraisal["gates"] }) => <>{GATES.map((x) => <Pill key={x.id} c={gateTone(g[x.id])} title={x.en}>{L === "ar" ? x.ar : x.en}: {g[x.id] === true ? (L === "ar" ? "اجتاز" : "Pass") : g[x.id] === false ? (L === "ar" ? "أخفق" : "Fail") : "?"}</Pill>)}</>;

/** The options of a strategy as cards (instrument, outcome, benefits, cost, authority, exit), searchable and filterable by instrument. */
export function OptionCards({ L, p }: { L: Lang; p: StratParsed }) {
  const t = useTr(L); const ap = useMemo(() => new Map(p.appraisal.map((a) => [a.id, a])), [p.appraisal]);
  const facets = useMemo<Facet<StratParsed["options"][number]>[]>(() => { const xs = [...new Set(p.options.map((o) => o.instrument).filter(Boolean))].slice(0, 8); return xs.length > 1 ? [{ id: "i", label: t("Instrument", "الأداة"), get: (o) => o.instrument, options: xs.map((v) => ({ v, label: v })) }] : []; }, [p.options, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<StratParsed["options"][number]>[]>(() => [{ id: "name", label: t("Option A to Z", "الخيار أ-ي"), cmp: (a, z) => a.option.localeCompare(z.option) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(p.options, { text: (o) => Object.values(o).join(" "), facets, sorts });
  const row = (k: string, v: string) => (v ? <p className="text-t1"><b className="text-t0">{k}: </b><Inline text={v} /></p> : null);
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search options", "ابحث في الخيارات")} />
      <ul className="grid gap-2.5 md:grid-cols-2">{view.shown.map((o) => { const a = ap.get(o.id.toUpperCase()); return <li key={o.id} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12px] leading-snug" style={{ borderTop: "3px solid var(--accent)" }}><div className="flex flex-wrap items-start justify-between gap-2"><b className="text-[12.5px] text-t0" dir="auto"><span className="numt text-t2">{o.id}</span> <Inline text={o.option} /></b>{o.instrument && <Pill c="var(--accent)">{o.instrument}</Pill>}</div>
        <div className="mt-1.5 space-y-0.5">{row(t("Outcome targeted", "النتيجة المستهدفة"), o.outcome)}{row(t("Mechanism", "الآلية"), o.mechanism)}{row(t("Counterpart benefit", "منفعة الطرف المقابل"), o.counterpart)}{row(t("UAE benefit", "منفعة الإمارات"), o.uae)}{row(t("Cost and resources", "الكلفة والموارد"), o.cost)}{row(t("Authority", "الصلاحية"), o.authority)}{row(t("Exit condition", "شرط الخروج"), o.exit)}</div>
        {a && <div className="mt-2 flex flex-wrap gap-1"><GateRow L={L} g={a.gates} /></div>}</li>; })}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}

/** The nodes of an outcome tree as a list under the picture, with the full words of each (the picture clips them): filter by branch and stage, search. */
export function NodeList({ L, nodes }: { L: Lang; nodes: PathNode[] }) {
  const t = useTr(L);
  const rows = nodes.map((n) => [n.id, n.stage ? STAGE[n.stage][L] : "", n.outcome, n.branch ? <Pill key="b" c={BRANCH[n.branch].c}>{BRANCH[n.branch][L]}</Pill> : "—", n.horizon, n.parents.join(", ") || "—", n.confidence ? <Pill key="c" c={CONF[n.confidence].c}>{CONF[n.confidence][L]}</Pill> : "—", n.evidence, n.stop]);
  const branches = Object.keys(BRANCH).filter((k) => nodes.some((n) => n.branch === k));
  return <FTbl L={L} head={[t("ID", "المعرّف"), t("Stage", "المرحلة"), t("Outcome", "النتيجة"), t("Branch", "الفرع"), t("Horizon", "الأفق"), t("Follows from", "يعتمد على"), t("Confidence", "الثقة"), t("Evidence", "الدليل"), t("Stop condition", "شرط التوقف")]} rows={rows} w={["6%", "9%", "24%", "9%", "9%", "8%", "9%", "16%", "10%"]} texts={nodes.map((n) => `${n.branch ?? ""} ${n.confidence ?? ""}`)} facet={branches.length > 1 ? { label: t("Branch", "الفرع"), keys: nodes.map((n) => n.branch ?? ""), options: branches.map((k) => ({ v: k, label: BRANCH[k][L], color: BRANCH[k].c })) } : undefined} searchAt={5} />;
}
/** A bar of how many nodes sit on each branch of a tree. */
export function BranchBar({ L, nodes }: { L: Lang; nodes: PathNode[] }) {
  return <SegBar segs={Object.keys(BRANCH).map((k) => ({ label: BRANCH[k][L], n: nodes.filter((n) => n.branch === k).length, color: BRANCH[k].c }))} />;
}

/** The four evidence classes of an external-influence assessment (verified, allegation, inference, unresolved) as four columns, with one search box and chips to show a single class. */
export function EvidenceGrid({ L, rows, names, colors }: { L: Lang; rows: { statement: string; cls: string | null; basis: string; confidence: "high" | "moderate" | "low" | null }[]; names: Record<string, string>; colors: Record<string, string> }) {
  const t = useTr(L); const keys = ["verified", "allegation", "inference", "unresolved"] as const;
  const facets = useMemo<Facet<(typeof rows)[number]>[]>(() => [{ id: "c", label: t("Class", "الفئة"), get: (x) => x.cls ?? "", options: keys.filter((k) => rows.some((x) => x.cls === k)).map((v) => ({ v, label: names[v], color: colors[v] })) }], [rows, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(rows, { text: (x) => `${x.statement} ${x.basis} ${x.cls ?? ""}`, facets });
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><SegBar segs={keys.map((k) => ({ label: names[k], n: rows.filter((x) => x.cls === k).length, color: colors[k] }))} /></div>
      <ListBar L={L} view={view} placeholder={t("Search the statements", "ابحث في العبارات")} />
      <div className="grid gap-2.5 md:grid-cols-2">{keys.map((k) => { const xs = view.shown.filter((e) => e.cls === k); if (view.pick.c && view.pick.c !== k) return null; return <div key={k} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${colors[k]}` }}><div className="mb-1.5 flex items-center justify-between"><Pill c={colors[k]}>{names[k]}</Pill><span className="num text-[11px] text-t2">{xs.length}</span></div><ul className="space-y-1.5 text-[12px] leading-snug text-t0">{xs.map((r, i) => <li key={i}><Inline text={r.statement} />{r.confidence && <span className="ms-1.5 text-[10px]" style={{ color: CONF[r.confidence].c }}>{CONF[r.confidence][L]}</span>}<span className="block text-[10.5px] text-t2"><Inline text={r.basis} /></span></li>)}{xs.length === 0 && <li className="text-t2">—</li>}</ul></div>; })}</div>
      {!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}
