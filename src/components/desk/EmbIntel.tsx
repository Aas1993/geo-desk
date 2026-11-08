"use client";
import { useMemo } from "react";
import { BadgeDollarSign, Building2, Globe2, Handshake, Landmark, Network, ShieldAlert, Users } from "lucide-react";
import type { Mission1 } from "@/lib/desk/embassy";
import { LEVELS } from "@/lib/desk/embassy";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { BarList, ListBar, NoMatch, ReportHero, SegBar, Timeline, useListView, type SortSpec, type StatSpec } from "../report/kit";
import { GAP_W, GROUP_HEX, GROUP_SHORT, LEVEL_W, PLAY_W, REL_W, countBy, hasFigure, plain, powerGrid, scenarioGrid, spectrum } from "@/lib/report/mission-model";
import type { ReportHead } from "@/lib/report/model";
import { Row } from "./shared";

export { plain };
export const REL_C: Record<string, string> = { ally: "var(--ok)", partner: "var(--accent)", neutral: "var(--t2)", tension: "var(--warn)", rival: "var(--risk)" };
export const PLAY_C: Record<string, string> = { enter: "var(--accent)", expand: "var(--ok)", protect: "var(--warn)" };
export const GAP_C: Record<string, string> = { trade: "var(--c2)", investment: "var(--ok)" };
const dash = (n: number, label: string, c: string, icon: React.ReactNode, jump: string): StatSpec => (n === 0 ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });

/** The head of the Ambassador's intelligence brief: what was found at a glance, the quality grade and both auditors' verdicts, and links to the sections and to the tabs that hold the lists. */
export function IntelHero({ L, m, head, bottom, nav, onJump }: { L: Lang; m: Mission1 | null; head: ReportHead; bottom: string; nav: { id: string; label: string }[]; onJump: (id: string) => void }) {
  const t = useTr(L); const high = m ? m.risks.filter((r) => r.impact === "high").length : 0; const dec = m ? m.power.filter((p) => p.level === "decisive").length : 0;
  const stats: StatSpec[] | undefined = m ? [
    dash(m.power.length, dec ? t(`power map (${dec} decisive)`, `خريطة القوة (${dec} حاسم)`) : t("power map", "خريطة القوة"), "var(--accent)", <Network size={16} />, "tab:power"),
    dash(m.partners.length, t("partner companies", "شركات شريكة"), "var(--c2)", <Handshake size={16} />, "tab:partners"),
    dash(m.plays.length, t("investment plays", "فرص استثمارية"), "var(--ok)", <BadgeDollarSign size={16} />, "tab:invest"),
    dash(m.gaps.length, t("trade and investment gaps", "فجوات التجارة والاستثمار"), "var(--warn)", <Landmark size={16} />, "tab:gaps"),
    dash(m.neighbours.length, t("neighbours read", "جيران مقروءون"), "var(--c2)", <Globe2 size={16} />, "tab:region"),
    m.risks.length ? { n: `${high}/${m.risks.length}`, label: t("high-impact risks", "مخاطر مرتفعة الأثر"), c: high ? "var(--risk)" : "var(--ok)", icon: <ShieldAlert size={16} />, jump: "emb-risks" } : { n: "–", label: t("high-impact risks", "مخاطر مرتفعة الأثر"), c: "var(--t2)", icon: <ShieldAlert size={16} /> },
    dash(m.inbound.length + m.sme.length, t("inbound firms and SME moves", "شركات قادمة ومنشآت"), "var(--accent)", <Building2 size={16} />, "tab:gaps"),
    dash(m.askedOfUs.length, t("asks of us", "طلبات موجهة إلينا"), "var(--warn)", <Users size={16} />, "emb-asked"),
  ] : undefined;
  return <ReportHero L={L} kicker={t("The Ambassador's intelligence brief", "موجز السفير الاستخباري")} bottomLine={bottom || undefined} head={head} stats={stats} nav={nav} onJump={onJump} />;
}

const Tile = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] font-medium text-t2">{title}</p>{children}</div>;

/** The power map as a grid of groups against levels: where the decisive and influential actors sit. */
export function PowerGlance({ L, power }: { L: Lang; power: Mission1["power"] }) {
  const t = useTr(L); const rows = useMemo(() => powerGrid(power), [power]); if (!rows.length) return null; const max = Math.max(1, ...rows.flatMap((r) => LEVELS.map((l) => r.levels[l])));
  return (
    <Tile title={t("Who holds power: by group and level", "من يملك القوة: بحسب المجموعة والمستوى")}>
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.4rem)] items-center gap-1 text-[11.5px]">
        <span />{LEVELS.map((l) => <span key={l} className="text-center text-[10px] text-t2">{LEVEL_W[l][L]}</span>)}
        {rows.map((r) => <div key={r.group} className="contents"><span className="flex min-w-0 items-center gap-1.5 text-t1"><i className="size-2.5 shrink-0 rounded-sm" style={{ background: GROUP_HEX[r.group] }} /><span className="truncate" title={GROUP_SHORT[r.group][L]}>{GROUP_SHORT[r.group][L]}</span><b className="numt text-t0">{r.total}</b></span>
          {LEVELS.map((l) => { const n = r.levels[l]; return <span key={l} className="numt grid h-7 place-items-center rounded-[7px] text-[12px] font-semibold" style={{ background: n ? `color-mix(in srgb, ${GROUP_HEX[r.group]} ${25 + Math.round((n / max) * 55)}%, transparent)` : "var(--bg-3)", color: n ? "var(--t0)" : "var(--t2)" }}>{n || "·"}</span>; })}</div>)}
      </div>
    </Tile>
  );
}
export function GapsGlance({ L, m }: { L: Lang; m: Mission1 }) {
  const t = useTr(L); if (!m.gaps.length) return null; const sized = m.gaps.filter((g) => hasFigure(g.size)).length; const sec = countBy(m.gaps, (g) => g.sector).slice(0, 6);
  return (
    <Tile title={t("Trade and investment gaps", "فجوات التجارة والاستثمار")}>
      <SegBar segs={(["trade", "investment"] as const).map((k) => ({ label: GAP_W[k][L], n: m.gaps.filter((g) => g.kind === k).length, color: GAP_C[k] }))} />
      {sec.length > 1 && <div className="mt-2"><BarList rows={sec.map((x) => ({ label: x.key, value: x.n, color: "var(--accent)" }))} /></div>}
      <p className="mt-2 text-[10.5px] text-t2">{t(`${sized} of ${m.gaps.length} gaps carry a sized estimate; the rest are not estimated.`, `${sized} من ${m.gaps.length} فجوات لها تقدير بالحجم؛ والباقي غير مقدّر.`)}</p>
    </Tile>
  );
}
export function PlaysGlance({ L, m }: { L: Lang; m: Mission1 }) {
  const t = useTr(L); if (!m.plays.length) return null; const sec = countBy(m.plays, (p) => p.sector).slice(0, 6);
  return (
    <Tile title={t("UAE companies' plays", "تحركات الشركات الإماراتية")}>
      <SegBar segs={(["enter", "expand", "protect"] as const).map((k) => ({ label: PLAY_W[k][L], n: m.plays.filter((p) => p.kind === k).length, color: PLAY_C[k] }))} />
      {sec.length > 1 && <div className="mt-2"><BarList rows={sec.map((x) => ({ label: x.key, value: x.n, color: "var(--ok)" }))} /></div>}
    </Tile>
  );
}
/** The neighbours on the scale from ally to rival, each country under its step with the desk's note on hover. */
export function RegionSpectrum({ L, nb }: { L: Lang; nb: Mission1["neighbours"] }) {
  const t = useTr(L); if (!nb.length) return null; const sp = spectrum(nb);
  return (
    <Tile title={t("The neighbours on the scale from ally to rival", "الجوار على مقياس من الحليف إلى المنافس")}>
      <div className="grid grid-cols-5 gap-1.5">{sp.map((s) => <div key={s.rel} className="min-w-0 rounded-[9px] p-1.5" style={{ background: `color-mix(in srgb, ${REL_C[s.rel]} ${s.items.length ? 14 : 5}%, transparent)`, borderTop: `3px solid ${s.items.length ? REL_C[s.rel] : "var(--line)"}` }}>
        <p className="flex items-center justify-between text-[10.5px] font-semibold" style={{ color: REL_C[s.rel] }}>{REL_W[s.rel][L]}<b className="numt">{s.items.length || "·"}</b></p>
        <ul className="mt-1 space-y-0.5">{s.items.map((x) => <li key={x.country} className="truncate text-[11.5px] text-t0" title={`${x.note}${x.uaeImplication ? ` · ${x.uaeImplication}` : ""}`} dir="auto">{x.country}</li>)}</ul></div>)}</div>
    </Tile>
  );
}
/** Which desks each scenario touches: a scenario is a row, a desk a column, a dot where the scenario writes an effect for that desk. */
export function ScenarioGrid({ L, sc }: { L: Lang; sc: Mission1["scenarios"] }) {
  const t = useTr(L); const g = useMemo(() => scenarioGrid(sc), [sc]); if (!g.desks.length) return null;
  return (
    <Tile title={t("Scenarios by desk: where each one bites", "السيناريوهات حسب المكتب: أين يؤثر كل منها")}>
      <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[420px] border-collapse text-[11.5px]"><thead><tr><th className="w-[32%]" />{g.desks.map((d) => <th key={d} className="px-1 pb-1 text-center align-bottom text-[10px] font-medium text-t2" title={d}><span className="block max-w-[5.5rem] truncate" dir="auto">{d}</span></th>)}</tr></thead>
        <tbody>{g.rows.map((r) => <tr key={r.name} className="border-t border-line"><td className="py-1 pe-2 text-t0" dir="auto">{r.name}</td>{r.has.map((h, i) => <td key={i} className="py-1 text-center">{h ? <i className="inline-block size-3 rounded-full bg-accent" aria-label={g.desks[i]} /> : <span className="text-t2">·</span>}</td>)}</tr>)}</tbody></table></div>
    </Tile>
  );
}
/** The dashboard of the brief: the lists of the other tabs drawn as figures. */
export function IntelGlance({ L, m }: { L: Lang; m: Mission1 }) {
  return <div className="grid gap-3 md:grid-cols-2"><PowerGlance L={L} power={m.power} /><GapsGlance L={L} m={m} /><PlaysGlance L={L} m={m} /><RegionSpectrum L={L} nb={m.neighbours} /><div className="md:col-span-2"><ScenarioGrid L={L} sc={m.scenarios} /></div></div>;
}

/** The next 90 days as a timeline (in the order the Chief of Staff wrote them), each marker opening to why it matters and who leads. */
export function CalendarTimeline({ L, cal }: { L: Lang; cal: Mission1["calendar"] }) {
  const t = useTr(L); const view = useListView(cal, { text: (c) => `${c.when} ${c.what} ${c.why} ${c.lead}` });
  return (
    <div>{cal.length > 5 && <ListBar L={L} view={view} placeholder={t("Search the calendar", "ابحث في التقويم")} />}
      <Timeline entries={view.shown.map((c) => ({ when: c.when || "–", body: [<div key="b" className="rounded-[10px] border border-line bg-bg2 p-2.5 text-[12.5px] leading-snug"><b className="text-t0" dir="auto">{c.what}</b><Row label={t("Why it matters", "لماذا يهم")}>{c.why}</Row><Row label={t("Lead (proposed)", "المتولي (مقترح)")}>{c.lead}</Row></div>] }))} />
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}
/** The indicators to watch as a table with a search and a sort. */
export function WatchTable({ L, watch }: { L: Lang; watch: Mission1["watch"] }) {
  const t = useTr(L); const sorts = useMemo<SortSpec<Mission1["watch"][number]>[]>(() => [{ id: "a", label: t("Indicator A to Z", "المؤشر أ-ي"), cmp: (a, z) => a.indicator.localeCompare(z.indicator) }, { id: "src", label: t("Where to read it", "أين يُقرأ"), cmp: (a, z) => a.source.localeCompare(z.source) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(watch, { text: (x) => `${x.indicator} ${x.signal} ${x.threshold} ${x.source}`, sorts });
  return (
    <div>{watch.length > 5 && <ListBar L={L} view={view} placeholder={t("Search indicators", "ابحث في المؤشرات")} />}
      <div className="scroll-thin overflow-x-auto rounded-[12px] border border-line bg-bg1"><table className="w-full min-w-[620px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Indicator", "المؤشر")}</th><th className="px-2 text-start font-semibold">{t("Signal", "الإشارة")}</th><th className="px-2 text-start font-semibold">{t("Threshold", "العتبة")}</th><th className="px-2 text-start font-semibold">{t("Source", "المصدر")}</th></tr></thead>
        <tbody>{view.shown.map((x, i) => <tr key={x.indicator + i} className="border-t border-line align-top"><td className="px-3 py-2 font-semibold text-t0" dir="auto">{x.indicator}</td><td className="px-2 py-2 text-t1" dir="auto">{x.signal}</td><td className="px-2 py-2 text-t0" dir="auto">{x.threshold}</td><td className="px-2 py-2 text-t2" dir="auto">{x.source}</td></tr>)}</tbody></table></div>{!view.shown.length && <NoMatch L={L} />}</div>
  );
}
