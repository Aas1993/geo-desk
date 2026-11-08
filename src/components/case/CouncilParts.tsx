"use client";
import { useState } from "react";
import { ChevronDown, FileWarning, ListChecks, Scale, Users } from "lucide-react";
import { SEAT_BY, type SeatId } from "@/lib/case/seats";
import { GROUP_ORDER, TOTAL_SEATS, groupName, recommendedScore, seatsHeard, type Claim, type ClaimVerdict, type CouncilOption, type CouncilView, type SeatView } from "@/lib/case/councilView";
import type { ReportHead } from "@/lib/report/model";
import { Markdown } from "../Markdown";
import { PostureScale, POS_COLOR } from "../bird/visuals";
import type { Lang } from "../falcon/bits";
import { BarList, Columns, Fold, FoldGroup, ListBar, NoMatch, ReportHero, SegBar, useListView, CONF_COLOR, type Facet, type SortSpec, type StatSpec } from "../report/kit";
import { Chip, RingGauge } from "../report/kit-case";
import { useTr } from "./bits";

// THE STRATEGIC COUNCIL, ILLUSTRATED: the hero (the Chair's course, its bottom line, the auditors' verdicts), the options with the Chair's scorecard, the seats as tiles with their stance, the evidence audit's verdicts, the debate and the execution roadmap. Each is drawn from what the saved report holds; a part the report lacks shows a dash.
const WORDS = { en: { deepen: "deepen", staged: "staged", hedge: "hedge", hold: "hold" }, ar: { deepen: "تعميق", staged: "على مراحل", hedge: "تحوّط", hold: "ترقّب" } };
const courseColor = (c: string | null) => (c ? POS_COLOR[c] : "var(--t2)");
export const GROUP_C: Record<string, string> = { A1: "#378ADD", A2: "#BA7517", A3: "#1D9E75", A4: "#7F77DD", review: "var(--risk)", execution: "var(--accent)" };
const VERDICT_C: Record<ClaimVerdict, string> = { supported: "var(--ok)", partly: "var(--warn)", unsupported: "var(--risk)", stale: "var(--c2)", other: "var(--t2)" };
const verdictWord = (L: Lang, v: ClaimVerdict) => ({ supported: L === "ar" ? "مدعوم" : "supported", partly: L === "ar" ? "مدعوم جزئيًا" : "partly supported", unsupported: L === "ar" ? "غير مدعوم" : "unsupported", stale: L === "ar" ? "متقادم" : "stale", other: L === "ar" ? "غير مصنّف" : "other" })[v];
const CONF_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1 };
const confWord = (L: Lang, c: string) => ({ high: L === "ar" ? "مرتفعة" : "high", moderate: L === "ar" ? "معتدلة" : "moderate", low: L === "ar" ? "منخفضة" : "low" })[c] ?? c;
const dash = (label: string, icon: React.ReactNode): StatSpec => ({ n: "–", label, c: "var(--t2)", icon });
const seatName = (L: Lang, s: SeatView) => (L === "ar" && SEAT_BY.get(s.id) ? SEAT_BY.get(s.id)!.ar : s.name);

/** The head of the Council's result: the course the Chair recommends in big type on its four-step scale, the bottom line, the auditors' verdicts and the counts that matter. */
export function CouncilHero({ L, v, head, onJump }: { L: Lang; v: CouncilView; head: ReportHead; onJump: (id: string) => void }) {
  const t = useTr(L); const rec = v.recommended; const score = recommendedScore(v); const ok = v.claims.filter((c) => c.verdict === "supported").length; const moves = v.roadmap.reduce((a, p) => a + p.moves.length, 0); const heard = seatsHeard(v);
  const stats: StatSpec[] = [
    heard ? { n: `${heard}/${TOTAL_SEATS}`, label: t("seats heard", "مقاعد مسموعة"), c: "var(--accent)", icon: <Users size={16} />, jump: "seats" } : dash(t("seats heard", "مقاعد مسموعة"), <Users size={16} />),
    v.options.length ? { n: v.options.length, label: t("strategic options", "خيارات استراتيجية"), c: "var(--c2)", icon: <Scale size={16} />, jump: "brief" } : dash(t("strategic options", "خيارات استراتيجية"), <Scale size={16} />),
    v.claims.length ? { n: `${ok}/${v.claims.length}`, label: t("audited claims fully supported", "ادعاءات مدققة مدعومة كليًا"), c: ok === v.claims.length ? "var(--ok)" : "var(--warn)", icon: <FileWarning size={16} />, jump: "audit" } : dash(t("audited claims", "ادعاءات مدققة"), <FileWarning size={16} />),
    moves ? { n: moves, label: t("roadmap moves", "خطوات خارطة التنفيذ"), c: "var(--ok)", icon: <ListChecks size={16} />, jump: "roadmap" } : dash(t("roadmap moves", "خطوات خارطة التنفيذ"), <ListChecks size={16} />),
  ];
  return <ReportHero L={L} kicker={t("Strategic Council: the Chair's decision", "المجلس الاستراتيجي: قرار الرئيس")} call={rec?.name} callColor={courseColor(rec?.course ?? null)} bottomLine={v.bottomLine} head={head} gauge={null} onJump={onJump}
    scale={rec?.course ? <PostureScale readers={[{ id: "council", short: "C", name: t("Strategic Council", "المجلس الاستراتيجي"), value: rec.course }]} words={WORDS[L]} L={L} /> : undefined}
    extra={score != null ? <div className="mt-3"><RingGauge value={score} text={`${score}/100`} size={96} label={t("Chair's scorecard for the recommended option (a judgment, not data)", "درجة الرئيس للخيار الموصى به (حكم لا بيانات)")} /></div> : undefined}
    stats={stats} nav={[{ id: "brief", label: t("Chair's brief", "موجز الرئيس") }, { id: "seats", label: t("Seats", "المقاعد") }, { id: "audit", label: t("Audit and red team", "التدقيق والفريق الأحمر") }, { id: "debate", label: t("Debate", "المناظرة") }, { id: "roadmap", label: t("Roadmap", "خارطة التنفيذ") }]} />;
}

/** The options the Chair weighed, each with its total on the national-interest scorecard, and the scorecard itself as a grid of scores. */
export function OptionsScore({ L, v }: { L: Lang; v: CouncilView }) {
  const t = useTr(L); const sc = v.score; const totalOf = (o: CouncilOption) => sc?.options.find((x) => x.course && x.course === o.course)?.total ?? null;
  if (!v.options.length && !sc) return null;
  const cellC = (n: number | null) => (n == null ? "var(--t2)" : n >= 4 ? "var(--ok)" : n >= 3 ? "var(--c2)" : n >= 2 ? "var(--warn)" : "var(--risk)");
  return (
    <div className="space-y-3">
      {v.options.length > 0 && <div className="grid gap-2.5 md:grid-cols-2">{v.options.map((o) => { const tot = totalOf(o); return (
        <section key={o.n} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${courseColor(o.course)}` }}>
          <div className="flex flex-wrap items-center gap-1.5"><span className="numt text-[11px] text-t2">{o.n}</span><b className="text-[13.5px] text-t0" dir="auto">{o.name}</b>{o.recommended && <Chip c={courseColor(o.course)}>{t("recommended", "موصى به")}</Chip>}</div>
          {tot != null && <div className="mt-1.5"><div className="mb-0.5 text-[10.5px] text-t2">{t("Chair's scorecard total /100", "مجموع بطاقة الرئيس /100")}</div><BarList rows={[{ label: "", value: tot, text: String(tot), color: courseColor(o.course) }]} max={100} /></div>}
          {o.text && <p className="mt-1.5 text-[12px] leading-snug text-t0" dir="auto">{o.text}</p>}
          {o.fields.length > 0 && <details className="mt-1.5 text-[11.5px] text-t1"><summary className="cursor-pointer text-accent">{t("Mechanism, assumptions and indicators", "الآلية والافتراضات والمؤشرات")}</summary><ul className="mt-1 space-y-1">{o.fields.map((f) => <li key={f.label} dir="auto"><b className="text-t0">{f.label}:</b> {f.text}</li>)}</ul></details>}
        </section>); })}</div>}
      {sc && <section className="rounded-[12px] border border-line bg-bg2 p-3" aria-label={t("National-interest scorecard", "بطاقة المصالح الوطنية")}>
        <p className="label mb-1.5">{t("National-interest scorecard (scores 0 to 5, the Chair's judgments)", "بطاقة المصالح الوطنية (الدرجات من 0 إلى 5، من أحكام الرئيس)")}</p>
        {sc.options.some((o) => o.total != null) && <div className="mb-3"><BarList max={100} rows={sc.options.filter((o) => o.total != null).map((o) => ({ label: o.label, value: o.total!, text: String(o.total), color: courseColor(o.course) }))} /></div>}
        <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="py-1 pe-2 text-start font-semibold">{sc.table.head[0] ? sc.table.head[0] : t("Criterion", "المعيار")}</th>{sc.options.map((o, i) => <th key={i} className="px-1 py-1 text-center font-semibold" style={{ color: courseColor(o.course) }}>{o.label}</th>)}</tr></thead>
          <tbody>{sc.rows.map((r) => <tr key={r.criterion} className="border-t border-line"><td className="py-1 pe-2 text-t1" dir="auto">{r.criterion}</td>{r.scores.map((n, i) => <td key={i} className="px-1 py-1 text-center"><span className="numt inline-grid h-6 min-w-8 place-items-center rounded-[6px] px-1 text-[11.5px] font-bold" style={{ background: `color-mix(in srgb, ${cellC(n)} 22%, transparent)`, color: cellC(n) }}>{n ?? "–"}</span></td>)}</tr>)}
            {sc.options.some((o) => o.total != null) && <tr className="border-t-2 border-line"><td className="py-1 pe-2 font-semibold text-t0">{t("Weighted total /100", "المجموع الموزون /100")}</td>{sc.options.map((o, i) => <td key={i} className="numt px-1 py-1 text-center text-[12.5px] font-bold" style={{ color: courseColor(o.course) }}>{o.total ?? "–"}</td>)}</tr>}</tbody></table></div>
      </section>}
    </div>
  );
}

/** The Chair's two deliverables as collapsible sections, one for each heading of the brief and the comprehensive report. */
export function ChairFolds({ L, v }: { L: Lang; v: CouncilView }) {
  const t = useTr(L); if (!v.chair.length) return null;
  return (
    <div className="space-y-2.5"><p className="label">{t("The Chair's brief and report, section by section", "موجز الرئيس وتقريره، قسمًا قسمًا")}</p>
      <FoldGroup L={L}>{v.chair.map((s, i) => <Fold key={s.id} id={`chair-${s.id}`} title={s.title} defaultOpen={i < 2}><article><Markdown source={s.body || "—"} /></article></Fold>)}</FoldGroup></div>
  );
}

function SeatTile({ L, s }: { L: Lang; s: SeatView }) {
  const t = useTr(L); const [open, setOpen] = useState(false); const c = GROUP_C[s.group];
  return (
    <li id={`seat-${s.id}`} className="scroll-mt-24 rounded-[12px] border border-line bg-bg2 p-3 text-[12px]" style={{ borderInlineStart: `4px solid ${c}` }}>
      <div className="flex flex-wrap items-center gap-1.5"><span className="numt rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: `color-mix(in srgb, ${c} 20%, transparent)`, color: c }}>{s.id}</span><b className="text-[12.5px] text-t0" dir="auto">{seatName(L, s)}</b>{s.confidence ? <Chip c={CONF_COLOR[s.confidence]}>{t("confidence", "الثقة")}: {confWord(L, s.confidence)}</Chip> : <Chip c="var(--t2)">{t("confidence not stated", "الثقة غير معلنة")}</Chip>}</div>
      {s.judgment && <p className="mt-1.5 leading-snug text-t0" dir="auto">{s.judgment}</p>}
      {s.stance && <p className="mt-1 leading-snug text-t1" dir="auto"><b className="text-accent">{t("Stance", "الموقف")}:</b> {s.stance}</p>}
      <button type="button" aria-expanded={open} onClick={() => setOpen((x) => !x)} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-accent hover:underline"><ChevronDown size={13} aria-hidden className={`transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} />{open ? t("Hide the full section", "إخفاء القسم كاملًا") : t("The full section", "القسم كاملًا")}</button>
      {open && <div className="mt-2 rounded-[8px] bg-bg1 p-2.5 text-t0"><Markdown source={s.text} /></div>}
    </li>
  );
}
/** The seats as tiles, each with its judgment, stance and confidence, searchable and filterable by group and confidence. */
export function SeatsView({ L, seats }: { L: Lang; seats: SeatView[] }) {
  const t = useTr(L); const facets: Facet<SeatView>[] = [
    { id: "group", label: t("Group", "المجموعة"), get: (s) => s.group, options: GROUP_ORDER.filter((g) => seats.some((s) => s.group === g)).map((g) => ({ v: g, label: groupName(g, L === "ar"), color: GROUP_C[g] })) },
    { id: "conf", label: t("Confidence", "الثقة"), get: (s) => s.confidence ?? "none", options: [...(["high", "moderate", "low"] as const).map((c) => ({ v: c, label: confWord(L, c), color: CONF_COLOR[c] })), { v: "none", label: t("not stated", "غير معلنة"), color: "var(--t2)" }] },
  ];
  const sorts: SortSpec<SeatView>[] = [{ id: "id", label: t("Seat number", "رقم المقعد"), cmp: (a, z) => Number(a.id.slice(1)) - Number(z.id.slice(1)) }, { id: "conf", label: t("Confidence, highest first", "الثقة، الأعلى أولًا"), cmp: (a, z) => (CONF_RANK[z.confidence ?? ""] ?? 0) - (CONF_RANK[a.confidence ?? ""] ?? 0) }];
  const view = useListView(seats, { text: (s) => `${s.id} ${s.name} ${s.judgment} ${s.stance} ${s.text}`, facets, sorts });
  if (!seats.length) return <p className="rounded-[10px] border border-dashed border-line p-3 text-center text-[12px] text-t2">{t("No seat sections in this product.", "لا أقسام للمقاعد في هذا المنتج.")}</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2"><div><p className="label mb-1">{t("Seats by group", "المقاعد حسب المجموعة")}</p><SegBar segs={GROUP_ORDER.map((g) => ({ label: groupName(g, L === "ar"), n: seats.filter((s) => s.group === g).length, color: GROUP_C[g] }))} /></div>
        <div><p className="label mb-1">{t("Confidence the seats state", "الثقة التي تعلنها المقاعد")}</p><SegBar segs={[...(["high", "moderate", "low"] as const).map((c) => ({ label: confWord(L, c), n: seats.filter((s) => s.confidence === c).length, color: CONF_COLOR[c] })), { label: t("not stated", "غير معلنة"), n: seats.filter((s) => !s.confidence).length, color: "var(--t2)" }]} /></div></div>
      <ListBar L={L} view={view} placeholder={t("Search the seats", "ابحث في المقاعد")} />
      {view.shown.length ? <ul className="grid gap-2.5 lg:grid-cols-2">{view.shown.map((s) => <SeatTile key={s.id} L={L} s={s} />)}</ul> : <NoMatch L={L} />}
    </div>
  );
}

/** The evidence audit: how many claims were supported, partly supported, unsupported or stale, and each claim with the auditor's note. */
export function AuditView({ L, v }: { L: Lang; v: CouncilView }) {
  const t = useTr(L); const order: ClaimVerdict[] = ["supported", "partly", "unsupported", "stale", "other"];
  const facets: Facet<Claim>[] = [{ id: "v", label: t("Verdict", "الحكم"), get: (c) => c.verdict, options: order.filter((x) => v.claims.some((c) => c.verdict === x)).map((x) => ({ v: x, label: verdictWord(L, x), color: VERDICT_C[x] })) }];
  const view = useListView(v.claims, { text: (c) => `${c.n} ${c.claim} ${c.verdictText} ${c.audit}`, facets });
  if (!v.claims.length) return <p className="rounded-[10px] border border-dashed border-line p-3 text-center text-[12px] text-t2">{t("No claim table in the evidence audit.", "لا جدول ادعاءات في تدقيق الأدلة.")}</p>;
  return (
    <div className="space-y-3">
      <SegBar segs={order.map((x) => ({ label: verdictWord(L, x), n: v.claims.filter((c) => c.verdict === x).length, color: VERDICT_C[x] }))} />
      <ListBar L={L} view={view} placeholder={t("Search the claims", "ابحث في الادعاءات")} />
      {view.shown.length ? <ul className="grid gap-2 lg:grid-cols-2">{view.shown.map((c, i) => <li key={`${c.n}-${i}`} className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderInlineStart: `4px solid ${VERDICT_C[c.verdict]}` }}><div className="flex flex-wrap items-center gap-1.5"><span className="numt text-[10.5px] text-t2">#{c.n}</span><Chip c={VERDICT_C[c.verdict]} title={c.verdictText}>{c.verdictText || verdictWord(L, c.verdict)}</Chip></div><p className="mt-1 text-t0" dir="auto">{c.claim}</p>{c.audit && <p className="mt-1 text-t1" dir="auto"><b className="text-t0">{t("Audit", "التدقيق")}:</b> {c.audit}</p>}</li>)}</ul> : <NoMatch L={L} />}
    </div>
  );
}

/** The debate, a card for each pair of seats with the argument inside. */
export function DebateView({ L, v }: { L: Lang; v: CouncilView }) {
  const t = useTr(L);
  if (!v.debate.length) return v.debateText ? <article><Markdown source={v.debateText} /></article> : <p className="rounded-[10px] border border-dashed border-line p-3 text-center text-[12px] text-t2">{t("No council debate in this product (a debate runs only when a named pair of seats both sat).", "لا مناظرة في هذا المنتج (تُجرى المناظرة فقط حين ينعقد مقعدا زوج مسمّى معًا).")}</p>;
  const nm = (id: string | null) => (id && SEAT_BY.get(id as SeatId) ? (L === "ar" ? SEAT_BY.get(id as SeatId)!.ar : SEAT_BY.get(id as SeatId)!.en) : "");
  return <FoldGroup L={L}>{v.debate.map((p, i) => <Fold key={i} id={`debate-${i}`} title={p.title} hint={p.a && p.b ? `${nm(p.a)} → ${nm(p.b)}` : undefined} icon={<Scale size={15} />}><article><Markdown source={p.body} /></article></Fold>)}</FoldGroup>;
}

/** The execution roadmap: for each posture the moves in lanes by horizon, each with its owner, gate and measure. */
export function RoadmapView({ L, v }: { L: Lang; v: CouncilView }) {
  const t = useTr(L); const plans = v.roadmap.filter((p) => p.moves.length); if (!plans.length) return null;
  const LANE_C = ["var(--ok)", "var(--accent)", "var(--c2)", "var(--warn)", "var(--risk)"];
  return (
    <div className="space-y-4">{plans.map((p, k) => { const lanes: string[] = []; for (const m of p.moves) if (!lanes.includes(m.lane)) lanes.push(m.lane);
      return <section key={k} aria-label={p.title}>{p.title && <h4 className="mb-1.5 text-[13px] font-semibold text-t0" dir="auto">{p.title}</h4>}
        <Columns min={lanes.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"} cols={lanes.map((ln, i) => ({ key: ln || String(i), title: ln || "—", color: LANE_C[i % LANE_C.length], count: p.moves.filter((m) => m.lane === ln).length, body: <ul className="space-y-2">{p.moves.filter((m) => m.lane === ln).map((m, j) => <li key={j} className="rounded-[8px] bg-bg1 p-2 text-[11.5px] leading-snug"><b className="block text-t0" dir="auto">{m.title}</b>{m.fields.map((f) => <p key={f.label} className="mt-0.5 text-t1" dir="auto"><b className="text-t2">{f.label}:</b> {f.text}</p>)}</li>)}</ul> }))} /></section>; })}
      <p className="text-[10.5px] text-t2">{t("Owners are roles the Council proposes, not approved responsibilities; a cost it does not know stays \"not estimated\".", "المسؤولون أدوار يقترحها المجلس لا مسؤوليات معتمدة؛ والكلفة التي لا يعرفها تبقى «غير مقدّرة».")}</p></div>
  );
}
