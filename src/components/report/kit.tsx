"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Flag, Search, Trash2 } from "lucide-react";
import { Gauge, SCORE_C } from "../bird/visuals";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { CONF_W, STANDING_W, VERDICT_W, worstVerdict, type ReportHead } from "@/lib/report/model";

// THE SHARED REPORT KIT of the screen (the PDF's twin is src/lib/report/html.ts). Every piece is drawn from numbers and words a saved product already holds; none of them estimates anything, and a piece with nothing to draw renders nothing. Pieces that need words take them from the caller, so a page stays in its own language.
export const GRADE_C: Record<string, string> = { A: "var(--ok)", B: "var(--ok)", C: "var(--warn)", D: "var(--risk)" };
export const CONF_COLOR: Record<string, string> = { high: "var(--ok)", moderate: "var(--warn)", low: "var(--risk)" };
export const LEVEL_COLOR: Record<string, string> = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)" };
export const verdictColor = (v: string) => (v === "approve" ? "var(--ok)" : v === "revise" ? "var(--warn)" : "var(--risk)");

// ---- the head of a report
/** The auditors' verdicts, the quality grade and the confidence as one row of chips. */
export function VerdictChips({ L, head }: { L: Lang; head: ReportHead }) {
  const t = useTr(L); const w = worstVerdict(head.verdicts);
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={t("Quality and independent review", "الجودة والمراجعة المستقلة")}>
      {head.grade && <span title={t("quality grade", "تقدير الجودة")} className="inline-flex items-center gap-1.5 rounded-full bg-bg2 py-0.5 pe-2.5 ps-1 text-[11px] text-t1"><span className="grid size-6 place-items-center rounded-full text-[12.5px] font-bold" style={{ background: `color-mix(in srgb, ${GRADE_C[head.grade]} 20%, transparent)`, color: GRADE_C[head.grade] }}>{head.grade}</span>{head.score != null && <span className="numt">{head.score}/100</span>}</span>}
      {head.confidence && <Pill c={CONF_COLOR[head.confidence]}>{t("confidence", "الثقة")}: {CONF_W[head.confidence][L]}</Pill>}
      {head.verdicts.map((v) => <Pill key={v.lens} c={verdictColor(v.verdict)} title={v.summary}>{v.who[L]}: {VERDICT_W[v.verdict][L]}{v.standing ? ` · ${STANDING_W[v.standing][L]}` : ""}</Pill>)}
      {!head.verdicts.length && <Pill c="var(--t2)">{t("not reviewed", "لم يُراجع")}</Pill>}
      {head.flags.length > 0 && <a href="#report-flags" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${head.critical ? "var(--risk)" : "var(--warn)"} 20%, transparent)`, color: head.critical ? "var(--risk)" : "var(--warn)" }}><Flag size={11} aria-hidden />{head.flags.length} {t(head.flags.length === 1 ? "red flag" : "red flags", "أعلام حمراء")}</a>}
      {w && head.verdicts.length > 1 && <span className="sr-only">{VERDICT_W[w][L]}</span>}
    </div>
  );
}
/** Opens the fold with this id (if it is one) and scrolls to the element. */
export function jumpTo(id: string) { window.dispatchEvent(new CustomEvent("gd-fold-open", { detail: id })); requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })); }
export type StatSpec = { n: string | number; label: string; c?: string; icon?: ReactNode; jump?: string };
export const Stat = ({ n, label, c = "var(--accent)", icon, jump, onJump }: StatSpec & { onJump?: (id: string) => void }) => { const inner = <><span className="grid size-8 shrink-0 place-items-center rounded-[9px]" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>{icon ?? <span aria-hidden className="size-2 rounded-full" style={{ background: c }} />}</span><span className="min-w-0 text-start"><b className="numt block truncate text-[18px] leading-none text-t0">{n}</b><span className="text-[11px] text-t2">{label}</span></span></>; return <li>{jump ? <button type="button" onClick={() => (onJump ?? jumpTo)(jump)} className="flex w-full items-center gap-2.5 rounded-[12px] border border-line bg-bg2 p-2.5 hover:border-accent">{inner}</button> : <div className="flex items-center gap-2.5 rounded-[12px] border border-line bg-bg2 p-2.5">{inner}</div>}</li>; };
export const StatRow = ({ stats, onJump }: { stats: StatSpec[]; onJump?: (id: string) => void }) => (stats.length ? <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{stats.map((s, i) => <Stat key={i} {...s} onJump={onJump} />)}</ul> : null);
/** The head of a report: what it is, the call in big type, the bottom line, the quality and review chips, a gauge, the headline counts and a row of links to its sections. */
export function ReportHero({ L, kicker, call, callColor, bottomLine, head, gauge, stats, nav, scale, extra, actions, onJump }: { onJump?: (id: string) => void; L: Lang; kicker: string; call?: string; callColor?: string; bottomLine?: string; head: ReportHead; gauge?: { value: number; label: string; sub?: string } | null; stats?: StatSpec[]; nav?: { id: string; label: string }[]; scale?: ReactNode; extra?: ReactNode; actions?: ReactNode }) {
  const t = useTr(L); const g = gauge === undefined ? (head.score != null ? { value: head.score, label: t("quality score", "درجة الجودة"), sub: head.grade ? `${t("grade", "التقدير")} ${head.grade}` : undefined } : null) : gauge;
  return (
    <section aria-label={t("At a glance", "نظرة سريعة")} className="rounded-[16px] border border-line bg-bg1 p-4" style={{ backgroundImage: "radial-gradient(600px 220px at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 70%)" }}>
      <div className={`grid items-center gap-5 ${g ? "md:grid-cols-[auto_1fr]" : ""}`}>
        {g && <Gauge value={g.value} label={g.label} sub={g.sub} />}
        <div className="min-w-0">
          <p className="label">{kicker}</p>
          {call && <p className="display mt-0.5 text-[28px] font-semibold leading-tight" style={{ color: callColor ?? "var(--accent)" }}>{call}</p>}
          {bottomLine && <p className="mt-1 text-[13.5px] font-medium leading-snug text-t0" dir="auto">{bottomLine}</p>}
          <div className="mt-2.5"><VerdictChips L={L} head={head} /></div>
          {scale && <div className="mt-3">{scale}</div>}{extra}
        </div>
      </div>
      {stats && <StatRow stats={stats} onJump={onJump} />}
      {(nav?.length || actions) && <div className="mt-3 flex flex-wrap items-center gap-1.5">{nav && <nav aria-label={t("Sections", "الأقسام")} className="flex flex-wrap gap-1.5">{nav.map((n) => <SectionLink key={n.id} id={n.id} onJump={onJump}>{n.label}</SectionLink>)}</nav>}{actions && <span className="ms-auto flex gap-1.5">{actions}</span>}</div>}
    </section>
  );
}
/** A link that opens the fold it points to and scrolls there (or hands the id to `onJump`, which can first switch to the tab the section lives in). */
export function SectionLink({ id, children, onJump }: { id: string; children: ReactNode; onJump?: (id: string) => void }) {
  return <a href={`#${id}`} onClick={(e) => { e.preventDefault(); (onJump ?? jumpTo)(id); }} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11.5px] text-t1 hover:border-accent hover:text-accent">{children}</a>;
}
/** The red flags of both auditors as one loud, collapsible band (every field of each flag stays). */
export function FlagBand({ L, head, limit = 4 }: { L: Lang; head: ReportHead; limit?: number }) {
  const t = useTr(L); const [all, setAll] = useState(false); if (!head.flags.length) return null;
  const shown = all ? head.flags : head.flags.slice(0, limit);
  return (
    <div id="report-flags" role="alert" className="scroll-mt-20 rounded-[14px] border border-risk/50 bg-risk/10 p-3.5">
      <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-risk"><Flag size={15} aria-hidden /> {head.flags.length} {t("red flags raised by the independent auditors: read before relying on this product", "أعلام حمراء رفعها المدققون المستقلون: اقرأها قبل الاعتماد على هذا المنتج")} <span className="text-[11.5px] font-normal text-t1">({head.critical} {t("critical", "حرج")}, {head.serious} {t("serious", "جاد")})</span></p>
      <ul className="mt-2 grid gap-2 md:grid-cols-2">{shown.map((f, i) => <li key={i} className="rounded-[10px] bg-bg1 p-2.5 text-[12.5px] leading-snug" style={{ borderInlineStart: `4px solid ${f.severity === "critical" ? "var(--risk)" : "var(--warn)"}` }}><div className="flex flex-wrap items-center gap-1.5"><Pill c={f.severity === "critical" ? "var(--risk)" : "var(--warn)"}>{f.severity === "critical" ? t("critical", "حرج") : t("serious", "جاد")}</Pill><Pill c="var(--c2)">{f.who[L]}</Pill>{f.where && <Pill c="var(--t2)">{f.where}</Pill>}</div><b className="mt-1 block text-t0" dir="auto">{f.flag}</b>{f.why && <p className="mt-0.5 text-t1" dir="auto"><b className="text-risk">{t("Why it matters to the UAE", "لماذا يهم الإمارات")}:</b> {f.why}</p>}{f.ask && <p className="mt-0.5 text-ok" dir="auto">→ <b>{t("Before relying on it", "قبل الاعتماد عليه")}:</b> {f.ask}</p>}</li>)}</ul>
      {head.flags.length > limit && <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-[12px] text-accent hover:underline">{all ? t("Show fewer", "عرض أقل") : t(`Show all ${head.flags.length} flags`, `عرض كل الأعلام (${head.flags.length})`)}</button>}
    </div>
  );
}

// ---- collapsible sections
type FoldSignal = { n: number; open: boolean };
const FoldCtx = createContext<FoldSignal>({ n: 0, open: true });
/** Wraps a page's folds and gives it "Expand all / Collapse all". */
export function FoldGroup({ L, children, bar = true }: { L: Lang; children: ReactNode; bar?: boolean }) {
  const t = useTr(L); const [sig, setSig] = useState<FoldSignal>({ n: 0, open: true });
  return (
    <FoldCtx.Provider value={sig}>
      {bar && <div className="flex justify-end gap-1.5 text-[11.5px]"><button type="button" onClick={() => setSig((s) => ({ n: s.n + 1, open: true }))} className="rounded-full bg-bg2 px-2.5 py-1 text-t1 hover:text-t0">{t("Expand all", "فتح الكل")}</button><button type="button" onClick={() => setSig((s) => ({ n: s.n + 1, open: false }))} className="rounded-full bg-bg2 px-2.5 py-1 text-t1 hover:text-t0">{t("Collapse all", "طي الكل")}</button></div>}
      {children}
    </FoldCtx.Provider>
  );
}
/** A section that folds. The body stays in the page (so in-page search finds it) and is hidden when folded. `id` makes it a target of SectionLink. */
export function Fold({ id, title, hint, count, right, icon, defaultOpen = true, children }: { id?: string; title: string; hint?: string; count?: number | string; right?: ReactNode; icon?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const sig = useContext(FoldCtx); const [open, setOpen] = useState(defaultOpen); const [seen, setSeen] = useState(sig.n);
  if (seen !== sig.n) { setSeen(sig.n); setOpen(sig.open); }
  useEffect(() => { if (!id) return; const f = (e: Event) => { if ((e as CustomEvent<string>).detail === id) setOpen(true); }; window.addEventListener("gd-fold-open", f); return () => window.removeEventListener("gd-fold-open", f); }, [id]);
  const body = `${id ?? "fold"}-body`;
  return (
    <section id={id} className="scroll-mt-20 rounded-[14px] border border-line bg-bg1">
      <div className="flex items-start gap-2 p-3.5">
        <button type="button" aria-expanded={open} aria-controls={body} onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-start gap-2 text-start"><ChevronDown size={16} aria-hidden className={`mt-1 shrink-0 text-t2 transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} />{icon && <span className="mt-0.5 shrink-0 text-accent">{icon}</span>}<span className="min-w-0"><span className="display flex flex-wrap items-center gap-2 text-[15px] font-semibold text-t0">{title}{count != null && <span className="numt rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] font-medium text-t1">{count}</span>}</span>{hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-t2">{hint}</span>}</span></button>{right}
      </div>
      <div id={body} hidden={!open} className="px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

// ---- lists: search, filter and sort
export type Facet<T> = { id: string; label: string; get: (x: T) => string; options: { v: string; label: string; color?: string }[] };
export type SortSpec<T> = { id: string; label: string; cmp: (a: T, b: T) => number };
export type ListView<T> = { shown: T[]; total: number; q: string; setQ: (v: string) => void; pick: Record<string, string>; setPick: (facet: string, v: string) => void; sort: string; setSort: (v: string) => void; facets: Facet<T>[]; sorts: SortSpec<T>[]; reset: () => void; active: boolean };
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Search text, one-of-many facet chips and a sort order over a long list; the original order is the first sort. */
export function useListView<T>(items: T[], o: { text: (x: T) => string; facets?: Facet<T>[]; sorts?: SortSpec<T>[] }): ListView<T> {
  const [q, setQ] = useState(""); const [pick, setPickAll] = useState<Record<string, string>>({}); const [sort, setSort] = useState("");
  const facets = useMemo(() => o.facets ?? [], [o.facets]); const sorts = useMemo(() => o.sorts ?? [], [o.sorts]); const text = o.text;
  const shown = useMemo(() => { const n = fold(q.trim()); let xs = items.filter((x) => (!n || fold(text(x)).includes(n)) && facets.every((f) => !pick[f.id] || f.get(x) === pick[f.id])); const s = sorts.find((x) => x.id === sort); if (s) xs = [...xs].sort(s.cmp); return xs; }, [items, q, pick, sort, facets, sorts, text]);
  const setPick = useCallback((facet: string, v: string) => setPickAll((p) => ({ ...p, [facet]: p[facet] === v ? "" : v })), []);
  const reset = useCallback(() => { setQ(""); setPickAll({}); setSort(""); }, []);
  return { shown, total: items.length, q, setQ, pick, setPick, sort, setSort, facets, sorts, reset, active: !!q.trim() || Object.values(pick).some(Boolean) };
}
/** The controls of a ListView: a search box, a row of chips for each facet, a sort menu and how many of how many are shown. */
export function ListBar<T>({ L, view, placeholder }: { L: Lang; view: ListView<T>; placeholder?: string }) {
  const t = useTr(L);
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-44 flex-1"><Search size={13} aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-t2" /><input value={view.q} onChange={(e) => view.setQ(e.target.value)} placeholder={placeholder ?? t("Search this list", "ابحث في هذه القائمة")} aria-label={placeholder ?? t("Search this list", "ابحث في هذه القائمة")} className="h-8 w-full rounded-[10px] border border-line bg-bg2 ps-8 pe-2 text-[12.5px] text-t0" /></label>
        {view.sorts.length > 0 && <label className="flex items-center gap-1.5 text-[11.5px] text-t2">{t("Sort", "ترتيب")}<select value={view.sort} onChange={(e) => view.setSort(e.target.value)} className="h-8 rounded-[8px] border border-line bg-bg2 px-1.5 text-[12px] text-t0"><option value="">{t("As written", "كما كُتب")}</option>{view.sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
        <span className="numt text-[11.5px] text-t2" role="status">{view.shown.length}/{view.total}</span>
        {view.active && <button type="button" onClick={view.reset} className="text-[11.5px] text-accent hover:underline">{t("Clear", "مسح")}</button>}
      </div>
      {view.facets.map((f) => <div key={f.id} role="group" aria-label={f.label} className="flex flex-wrap items-center gap-1"><span className="me-1 text-[11px] text-t2">{f.label}</span>{f.options.map((op) => { const on = view.pick[f.id] === op.v; return <button key={op.v} type="button" aria-pressed={on} onClick={() => view.setPick(f.id, op.v)} className={`h-7 rounded-full px-2.5 text-[11.5px] ${on ? "font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`} style={on ? { background: op.color ?? "var(--accent)" } : undefined}>{op.label}</button>; })}</div>)}
    </div>
  );
}
export const NoMatch = ({ L }: { L: Lang }) => <p className="rounded-[10px] border border-dashed border-line p-3 text-center text-[12px] text-t2">{L === "ar" ? "لا شيء يطابق التصفية." : "Nothing matches the filter."}</p>;

// ---- figures
/** Horizontal bars for a few rows of numbers: a label, a bar to its share of `max`, and a figure. */
export function BarList({ rows, max }: { rows: { label: string; value: number; text?: string; color?: string; note?: string }[]; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return <ul className="space-y-1.5">{rows.map((r, i) => <li key={i} className="grid grid-cols-[minmax(0,34%)_1fr_auto] items-center gap-2 text-[12px]" title={r.note}><span className="truncate text-t1" dir="auto">{r.label}</span><span className="block h-2.5 overflow-hidden rounded-full bg-bg3" role="img" aria-label={`${r.label}: ${r.text ?? r.value}`}><span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (r.value / m) * 100))}%`, background: r.color ?? "var(--accent)" }} /></span><span className="numt min-w-8 text-end text-[11px] text-t1">{r.text ?? r.value}</span></li>)}</ul>;
}
/** A stacked bar of shares with its legend. */
export function SegBar({ segs }: { segs: { label: string; n: number; color: string }[] }) {
  const total = segs.reduce((a, s) => a + s.n, 0); if (!total) return null;
  return <div><div className="flex h-3 overflow-hidden rounded-full bg-bg3" role="img" aria-label={segs.map((s) => `${s.label} ${s.n}`).join(", ")}>{segs.filter((s) => s.n > 0).map((s) => <span key={s.label} className="block h-full" style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />)}</div><p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-t1">{segs.map((s) => <span key={s.label} className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2 rounded-sm" style={{ background: s.color }} />{s.label} <b className="numt text-t0">{s.n}</b></span>)}</p></div>;
}
/** A three-by-three matrix of likelihood (across) against impact (up). Each item is a numbered dot; clicking a dot calls `onPick`. */
export function RiskMatrix({ L, items, onPick, active }: { L: Lang; items: { n: number; l: 0 | 1 | 2; i: 1 | 2 | 3; label: string }[]; onPick?: (n: number) => void; active?: number | null }) {
  const lab = L === "ar" ? ["منخفض", "متوسط", "مرتفع"] : ["Low", "Medium", "High"]; const tone = (l: number, i: number) => { const s = l + 1 + i; return s >= 5 ? "var(--risk)" : s >= 4 ? "var(--warn)" : "var(--ok)"; };
  return (
    <div className="inline-block" dir="ltr" role="group" aria-label={L === "ar" ? "مصفوفة الاحتمال والأثر" : "Likelihood and impact matrix"}>
      <div className="flex">
        <div className="flex w-12 flex-col justify-around pe-1.5 text-end text-[10px] text-t2">{[2, 1, 0].map((k) => <span key={k}>{lab[k]}</span>)}</div>
        <div className="grid grid-cols-3 gap-1">{[3, 2, 1].flatMap((imp) => [0, 1, 2].map((lk) => { const here = items.filter((x) => x.l === lk && x.i === imp); return <div key={`${lk}-${imp}`} className="flex min-h-[54px] min-w-[84px] flex-wrap content-start gap-1 rounded-[8px] p-1.5" style={{ background: `color-mix(in srgb, ${tone(lk, imp)} 14%, transparent)` }}>{here.map((x) => <button key={x.n} type="button" title={x.label} onClick={() => onPick?.(x.n)} className="numt grid size-6 place-items-center rounded-full text-[10.5px] font-bold text-[var(--bg-0)]" style={{ background: tone(lk, imp), outline: active === x.n ? "2px solid var(--t0)" : undefined }}>{x.n}</button>)}</div>; }))}</div>
      </div>
      <div className="ms-12 mt-1 grid grid-cols-3 gap-1 text-center text-[10px] text-t2">{lab.map((x) => <span key={x}>{x}</span>)}</div>
      <p className="ms-12 mt-0.5 text-center text-[10.5px] font-medium text-t1">{L === "ar" ? "الاحتمال ←   ↑ الأثر" : "Likelihood →   ↑ Impact"}</p>
    </div>
  );
}
/** Columns for an ordered set (impact bands, horizons): a coloured top edge, a title with a count, and the body the caller draws. */
export function Columns({ cols, min = "md:grid-cols-3" }: { cols: { key: string; title: string; color: string; count?: number; body: ReactNode; icon?: ReactNode }[]; min?: string }) {
  return <div className={`grid gap-3 ${min}`}>{cols.map((c) => <div key={c.key} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${c.color}` }}><p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: c.color }}>{c.icon}{c.title}{c.count != null && <span className="numt ms-auto text-t2">{c.count}</span>}</p><div className="mt-1.5">{c.body}</div></div>)}</div>;
}
/** A vertical timeline: a marker for each "when" with its items under it. */
export function Timeline({ entries }: { entries: { when: string; color?: string; body: ReactNode }[] }) {
  return <ol className="ms-1.5 space-y-3 border-s-2 border-line ps-4">{entries.map((e, i) => <li key={i} className="relative"><span aria-hidden className="absolute -start-[23px] top-0.5 size-4 rounded-full bg-bg1" style={{ border: `2px solid ${e.color ?? "var(--accent)"}` }} /><p className="text-[12.5px] font-semibold text-t0" dir="auto">{e.when}</p><div className="mt-1 space-y-1.5">{e.body}</div></li>)}</ol>;
}
/** Bars on a month axis: one row per item from its start month to its end month; clicking a row calls `onPick`. */
export function Gantt({ L, rows, months, onPick, active }: { L: Lang; rows: { id: string; label: string; start: number; end: number; color: string }[]; months: number; onPick?: (id: string) => void; active?: string | null }) {
  const span = Math.max(1, months); const step = span > 60 ? 12 : span > 24 ? 6 : 3; const ticks: number[] = []; for (let m = 0; m <= span; m += step) ticks.push(m);
  return (
    <div className="scroll-thin overflow-x-auto" dir="ltr"><div className="min-w-[560px]">
      <div className="relative ms-[34%] h-4 text-[10px] text-t2">{ticks.map((m) => <span key={m} className="numt absolute -translate-x-1/2" style={{ left: `${(m / span) * 100}%` }}>{m}</span>)}</div>
      <ul className="space-y-1">{rows.map((r) => <li key={r.id} className="grid grid-cols-[34%_1fr] items-center gap-0 text-[11.5px]"><button type="button" onClick={() => onPick?.(r.id)} className={`truncate pe-2 text-end ${active === r.id ? "font-semibold text-t0" : "text-t1"} hover:text-accent`} dir="auto" title={r.label}>{r.label}</button><span className="relative block h-4 rounded bg-bg3">{ticks.map((m) => <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: `${(m / span) * 100}%` }} />)}<span className="absolute inset-y-0.5 rounded-full" style={{ left: `${(Math.max(0, r.start) / span) * 100}%`, width: `${Math.max(1.5, ((Math.min(span, r.end) - Math.max(0, r.start)) / span) * 100)}%`, background: r.color, outline: active === r.id ? "2px solid var(--t0)" : undefined }} /></span></li>)}</ul>
      <p className="mt-1 text-end text-[10px] text-t2">{L === "ar" ? "أشهر" : "months"}</p>
    </div></div>
  );
}

// ---- in-page confirmation (never window.confirm: the app's browser auto-dismisses it)
/** A destructive button that asks "are you sure?" in the page, in place, and acts only on the second press. */
export function ConfirmButton({ L, label, ask, onConfirm, icon = <Trash2 size={13} />, className }: { L: Lang; label: string; ask: string; onConfirm: () => void; icon?: ReactNode; className?: string }) {
  const t = useTr(L); const [on, setOn] = useState(false);
  if (!on) return <button type="button" onClick={() => setOn(true)} className={className ?? "inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] text-t2 hover:text-risk"}>{icon}{label}</button>;
  return <span role="alertdialog" aria-label={ask} className="inline-flex flex-wrap items-center gap-1.5 rounded-[10px] border border-risk/50 bg-risk/10 px-2 py-1 text-[11.5px] text-t0"><span>{ask}</span><button type="button" autoFocus onClick={() => { setOn(false); onConfirm(); }} className="h-7 rounded-[7px] bg-risk px-2.5 text-[11.5px] font-semibold text-white">{t("Yes, remove", "نعم، أزل")}</button><button type="button" onClick={() => setOn(false)} className="h-7 rounded-[7px] bg-bg3 px-2.5 text-[11.5px] text-t1">{t("Cancel", "إلغاء")}</button></span>;
}
export { Gauge, SCORE_C };
