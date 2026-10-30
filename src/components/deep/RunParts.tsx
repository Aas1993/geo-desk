"use client";
import { useMemo, type ReactNode } from "react";
import { Boxes, CheckCircle2, Gauge as GaugeIcon, Layers, ShieldCheck } from "lucide-react";
import type { Judgment, Option, Run } from "@/lib/deep/consolidate";
import { Pill, type Lang } from "../falcon/bits";
import { ListBar, NoMatch, SegBar, StatRow, useListView, type Facet, type SortSpec, type StatSpec } from "../report/kit";
import { STATE_LABEL, stateColor, tx } from "./types";

// THE ROUND OF RULE-BASED CONSOLIDATION AS A PAGE: a head that shows at a glance how the nine modules fared, which way the judgments lean and how sure they are, how many monitoring triggers sit in range, on watch or in alert, and how many quality gates pass; the judgments and the options as lists you can search, filter and sort. Everything is counted from the run itself; the Run's own words and figures are unchanged.
type U = { [k: string]: unknown } & { states: Record<string, string>; dir: Record<string, string>; conf: Record<string, string> };
const DIRC = { supportive: "var(--ok)", adverse: "var(--risk)", mixed: "var(--warn)", neutral: "var(--t2)" } as const; const MODC = { done: "var(--ok)", limited: "var(--warn)", failed: "var(--risk)", na: "var(--t2)" } as const;
const CONFC = { high: "var(--ok)", medium: "var(--c2)", low: "var(--warn)" } as const; const FEASC = { high: "var(--ok)", medium: "var(--warn)", low: "var(--t2)" } as const;
const CRANK: Record<string, number> = { high: 3, medium: 2, low: 1 }; const w = (u: U, k: string) => String(u[k] ?? k);

/** The head of a consolidation run: status, the counts that matter and four small distributions. */
export function RunHero({ L, u, run, stale }: { L: Lang; u: U; run: Run; stale: boolean }) {
  const mods = run.modules; const nMod = (s: string) => mods.filter((m) => m.state === s).length; const applicable = mods.filter((m) => m.state !== "na").length;
  const nDir = (d: string) => run.judgments.filter((j) => j.dir === d).length; const nTrig = (s: string) => run.triggers.filter((x) => x.state === s).length; const pass = run.gates.filter((g) => g.pass).length;
  const stats: StatSpec[] = [{ n: `${nMod("done")}/${applicable || mods.length}`, label: w(u, "applies"), c: nMod("failed") ? "var(--risk)" : nMod("limited") ? "var(--warn)" : "var(--ok)", icon: <Layers size={16} />, jump: "run-modules" }, { n: run.judgments.length || "–", label: w(u, "judg"), c: "var(--accent)", icon: <GaugeIcon size={16} />, jump: run.judgments.length ? "run-judgments" : undefined }, { n: run.options.length || "–", label: w(u, "opts"), c: "var(--c2)", icon: <Boxes size={16} />, jump: undefined }, { n: run.triggers.length ? `${nTrig("alert")}/${run.triggers.length}` : "–", label: `${tx(L, STATE_LABEL.alert)} · ${w(u, "trg")}`, c: nTrig("alert") ? "var(--risk)" : nTrig("watch") ? "var(--warn)" : "var(--ok)", icon: <CheckCircle2 size={16} />, jump: undefined }, { n: run.gates.length ? `${pass}/${run.gates.length}` : "–", label: w(u, "gates"), c: pass === run.gates.length ? "var(--ok)" : "var(--warn)", icon: <ShieldCheck size={16} />, jump: "run-gates" }];
  const jump = (id: string) => { const el = document.getElementById(id); el?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <section aria-label={L === "ar" ? "نظرة سريعة" : "At a glance"} className="rounded-[16px] border border-line bg-bg1 p-4" style={{ backgroundImage: "radial-gradient(600px 220px at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 70%)" }}>
      <p className="label">{L === "ar" ? "الاستخبارات الموحدة الكاملة" : "Full Consolidated Intelligence"} · <span className="numt">{run.createdAt.slice(0, 16).replace("T", " ")} UTC · v{run.version}</span></p>
      <p className="mt-1 text-[14px] font-medium leading-snug text-t0" dir="auto">{run.scope.question}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5"><Pill c={run.status === "complete" ? "var(--ok)" : run.status === "failed" ? "var(--risk)" : "var(--warn)"}>{u.states[run.status === "stale" ? "awaiting_review" : run.status] ?? run.status}</Pill>{run.review ? <Pill c="var(--ok)">{w(u, "published")}: {run.review.by}</Pill> : <Pill c="var(--warn)">{L === "ar" ? "غير مُراجَع" : "not reviewed"}</Pill>}{stale && <Pill c="var(--risk)">{L === "ar" ? "قديم" : "stale"}</Pill>}<Pill c="var(--t2)">{run.scope.country ?? w(u, "none")} · {run.scope.horizonYears} {w(u, "years")}</Pill></div>
      <StatRow stats={stats} onJump={jump} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{w(u, "applies")}</p><SegBar segs={(["done", "limited", "failed", "na"] as const).map((k) => ({ label: w(u, k), n: nMod(k), color: MODC[k] })).filter((s) => s.n > 0)} /></div>
        <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{w(u, "judg")}</p><SegBar segs={(["supportive", "adverse", "mixed", "neutral"] as const).map((k) => ({ label: u.dir[k], n: nDir(k), color: DIRC[k] })).filter((s) => s.n > 0)} /></div>
        {run.triggers.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{w(u, "trg")}</p><SegBar segs={(["ok", "watch", "alert", "na"] as const).map((k) => ({ label: tx(L, STATE_LABEL[k]), n: nTrig(k), color: stateColor(k) })).filter((s) => s.n > 0)} /></div>}
        {run.gates.length > 0 && <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{w(u, "gates")}</p><SegBar segs={[{ label: w(u, "pass"), n: pass, color: "var(--ok)" }, { label: w(u, "fail"), n: run.gates.length - pass, color: "var(--risk)" }].filter((s) => s.n > 0)} /></div>}
      </div>
    </section>
  );
}

/** The integrated judgments with a direction-by-confidence grid (click a cell to filter), search, facets and sort. */
export function JudgmentsList({ L, u, items, render }: { L: Lang; u: U; items: Judgment[]; render: (j: Judgment) => ReactNode }) {
  const facets = useMemo<Facet<Judgment>[]>(() => [{ id: "dir", label: w(u, "judg"), get: (j) => j.dir, options: (["supportive", "adverse", "mixed", "neutral"] as const).filter((k) => items.some((j) => j.dir === k)).map((v) => ({ v, label: u.dir[v], color: DIRC[v] })) }, { id: "conf", label: L === "ar" ? "الثقة" : "Confidence", get: (j) => j.confidence, options: (["high", "medium", "low"] as const).filter((k) => items.some((j) => j.confidence === k)).map((v) => ({ v, label: u.conf[v], color: CONFC[v] })) }, { id: "mod", label: L === "ar" ? "الوحدة" : "Module", get: (j) => j.module, options: [...new Set(items.map((j) => j.module))].map((v) => ({ v, label: v })) }], [items, L, u]);
  const sorts = useMemo<SortSpec<Judgment>[]>(() => [{ id: "conf", label: L === "ar" ? "الثقة، الأعلى أولًا" : "Confidence, highest first", cmp: (a, z) => CRANK[z.confidence] - CRANK[a.confidence] }, { id: "conf-low", label: L === "ar" ? "الثقة، الأدنى أولًا" : "Confidence, lowest first", cmp: (a, z) => CRANK[a.confidence] - CRANK[z.confidence] }, { id: "mod", label: L === "ar" ? "الوحدة" : "Module", cmp: (a, z) => a.module.localeCompare(z.module) }], [L]);
  const view = useListView(items, { text: (j) => `${j.key} ${j.module} ${j.en} ${j.ar} ${j.evidence.join(" ")}`, facets, sorts });
  return (
    <div id="run-judgments" className="scroll-mt-20">
      <div className="mb-3 overflow-x-auto rounded-[12px] bg-bg2 p-3"><table className="text-[11.5px]"><caption className="mb-1.5 text-start text-[11px] text-t2">{L === "ar" ? "الاتجاه مقابل الثقة (انقر خلية للتصفية)" : "Direction against confidence (click a cell to filter)"}</caption><thead><tr><th className="pe-3 text-start font-normal text-t2" />{(["high", "medium", "low"] as const).map((c) => <th key={c} className="px-2 text-center font-medium" style={{ color: CONFC[c] }}>{u.conf[c]}</th>)}</tr></thead>
        <tbody>{(["supportive", "adverse", "mixed", "neutral"] as const).map((d) => <tr key={d}><th scope="row" className="pe-3 text-start font-medium" style={{ color: DIRC[d] }}>{u.dir[d]}</th>{(["high", "medium", "low"] as const).map((c) => { const n = items.filter((j) => j.dir === d && j.confidence === c).length; const on = view.pick.dir === d && view.pick.conf === c; return <td key={c} className="p-0.5 text-center"><button type="button" disabled={!n} aria-pressed={on} onClick={() => { view.reset(); if (!on) { view.setPick("dir", d); view.setPick("conf", c); } }} className="numt h-8 w-16 rounded-[8px] text-[12px] font-semibold disabled:opacity-30" style={{ background: `color-mix(in srgb, ${DIRC[d]} ${n ? 18 : 4}%, transparent)`, color: DIRC[d], outline: on ? `2px solid ${DIRC[d]}` : undefined }}>{n}</button></td>; })}</tr>)}</tbody></table></div>
      <ListBar L={L} view={view} placeholder={L === "ar" ? "ابحث في الأحكام" : "Search the judgments"} />
      <ul className="space-y-2">{view.shown.map((j) => render(j))}</ul>{!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}

/** The options with their feasibility bar, a filter and a sort. */
export function OptionsList({ L, u, items, render }: { L: Lang; u: U; items: Option[]; render: (o: Option) => ReactNode }) {
  const facets = useMemo<Facet<Option>[]>(() => [{ id: "feas", label: w(u, "feas"), get: (o) => o.feasibility, options: (["high", "medium", "low"] as const).filter((k) => items.some((o) => o.feasibility === k)).map((v) => ({ v, label: w(u, v), color: FEASC[v] })) }], [items, u]);
  const sorts = useMemo<SortSpec<Option>[]>(() => [{ id: "feas", label: L === "ar" ? "الجدوى، الأعلى أولًا" : "Feasibility, highest first", cmp: (a, z) => CRANK[z.feasibility] - CRANK[a.feasibility] }], [L]);
  const view = useListView(items, { text: (o) => `${o.id} ${tx(L, o.title)} ${tx(L, o.why)} ${tx(L, o.mechanism)} ${tx(L, o.owner)} ${tx(L, o.downside)} ${tx(L, o.outcome)}`, facets, sorts });
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{w(u, "feas")}</p><SegBar segs={(["high", "medium", "low"] as const).map((k) => ({ label: w(u, k), n: items.filter((o) => o.feasibility === k).length, color: FEASC[k] })).filter((s) => s.n > 0)} /></div>
      <ListBar L={L} view={view} placeholder={L === "ar" ? "ابحث في الخيارات" : "Search the options"} />
      <ul className="space-y-3">{view.shown.map((o) => render(o))}</ul>{!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}
