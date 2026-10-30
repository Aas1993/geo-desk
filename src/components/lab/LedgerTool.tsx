"use client";
import { useMemo, useState } from "react";
import type { Pt } from "@/lib/case/core";
import type { HSeries } from "@/lib/desk/history";
import { CAP, DOT_C, biggestMove, captureRows, captureSpan, combinedSvg, drawn, fmtSeries, geom, instrumentBars, ledgerBlocks, ledgerText, notHeld, rivalLedger, seriesColor } from "@/lib/lab/ledger";
import { uaeHistory } from "@/lib/desk/history";
import { Block, Kpi } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { Hatch, N, useTr } from "../case/bits";
import { Gaps, SaveBar, type ToolProps } from "./kit";

/** One small line chart: the series as drawn, with the first, last, peak and trough marked (each dot carries its value for hover and screen readers). */
function Line({ pts, color, label, fmt, w = 240, h = 74 }: { pts: Pt[]; color: string; label: string; fmt: (v: number) => string; w?: number; h?: number }) {
  const g = geom(pts, w, h); if (!g) return <Hatch>—</Hatch>;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ direction: "ltr", maxWidth: w }}>
      {g.zeroY != null && <line x1="0" x2={w} y1={g.zeroY} y2={g.zeroY} stroke="var(--line)" strokeDasharray="3 3" />}
      <path d={g.path} fill="none" stroke={color} strokeWidth="1.8" />
      {g.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3.2" fill={DOT_C[d.kinds.includes("peak") ? "peak" : d.kinds.includes("trough") ? "trough" : d.kinds.includes("last") ? "last" : "first"]}><title>{`${d.pt[0]}: ${fmt(d.pt[1])} (${d.kinds.join(", ")})`}</title></circle>)}
      <text x="2" y={h - 1} fontSize="9" fill="var(--t2)">{g.x0}</text><text x={w - 2} y={h - 1} fontSize="9" fill="var(--t2)" textAnchor="end">{g.x1}</text>
    </svg>
  );
}

/** THE INFLUENCE LEDGER OVER TIME: instruments (a present reading), the UAE against rivals in the country's trade (one held year), the UAE's own series over time and the monthly capture, with what is not held over time stated. Free: held data only, no model. */
export function LedgerTool({ L, iso, d, name }: ToolProps) {
  const t = useTr(L); const { by } = useCountryList(); const [index, setIndex] = useState(false);
  const nameOf = (i: string) => { const c = by.get(i); return i === "ARE" ? (L === "ar" ? "الإمارات" : "UAE") : c ? (L === "ar" && c.nameAr ? c.nameAr : c.name) : i; };
  const h = useMemo(() => (d ? uaeHistory(d) : null), [d]);
  if (!d || !h || !iso) return null;
  const bars = instrumentBars(d, L); const rl = rivalLedger(d, nameOf); const bm = biggestMove(h.series); const caps = captureRows(d.capture); const span = captureSpan(d.capture);
  const bmSeries = bm ? h.series.find((s) => s.id === bm.id) : null; const lang = L === "ar" ? "ar" : "en";
  const build = () => ({ title: t("Influence ledger", "سجل النفوذ"), blocks: ledgerBlocks(d, h, lang, nameOf, index), text: ledgerText(d, h, lang, nameOf) });
  const lineChartFor = (s: HSeries, i: number) => (
    <div key={s.id} className="rounded-[10px] border border-line bg-bg2 p-2.5" style={{ borderTop: `3px solid ${seriesColor(i)}` }}>
      <p className="text-[12px] font-medium leading-snug text-t0">{s.name[L]}</p>
      <Line pts={drawn(s, index)} color={seriesColor(i)} label={s.name[L]} fmt={(v) => (index ? v.toFixed(0) : fmtSeries(s, v, L))} />
      {s.first && s.last && <p className="mt-1 text-[11px] leading-snug text-t1"><N>{fmtSeries(s, s.first[1], L)}</N> ({s.first[0]}) → <N>{fmtSeries(s, s.last[1], L)}</N> ({s.last[0]}){s.change != null && <> · <N>{s.change >= 0 ? "+" : ""}{s.change.toFixed(0)}%</N></>}{s.cagr != null && <> · <N>{s.cagr >= 0 ? "+" : ""}{s.cagr.toFixed(1)}%</N>/{t("yr", "سنة")}</>}</p>}
      {s.peak && s.trough && <p className="text-[10.5px] text-t2"><span style={{ color: DOT_C.peak }}>●</span> {t("peak", "الذروة")} <N>{fmtSeries(s, s.peak[1], L)}</N> ({s.peak[0]}) · <span style={{ color: DOT_C.trough }}>●</span> {t("trough", "القاع")} <N>{fmtSeries(s, s.trough[1], L)}</N> ({s.trough[0]})</p>}
      <p className="mt-0.5 text-[10.5px] leading-snug text-t2">{s.note[L]}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <Block title={t(`The UAE's influence ledger in ${name}`, `سجل نفوذ الإمارات في ${name}`)} hint={t("Footprint and headroom by instrument, standing against rivals, and the UAE's own series over time. Instruments and rival shares are a present reading; what is not held over time is listed below, never filled in.", "الحضور ومجال التوسع بحسب الأداة، والمكانة أمام المنافسين، وسلاسل الإمارات عبر الزمن. الأدوات وحصص المنافسين قراءة حالية؛ وما لا يتوافر عبر الزمن مذكور أدناه ولا يُملأ.")} right={<SaveBar L={L} tool="ledger" iso={iso} country={name} build={build} />}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Kpi label={t("long series held", "سلاسل طويلة محفوظة")} value={h.series.length} tone={h.series.length ? "var(--ok)" : "var(--warn)"} />
          <Kpi label={t("UAE rank in the country's trade", "ترتيب الإمارات في تجارة الدولة")} value={rl.uaeRank != null ? `#${rl.uaeRank}/${rl.of}` : "n/a"} sub={rl.uaeShare != null ? `${rl.uaeShare}% ${t("share", "حصة")}` : undefined} />
          <Kpi label={t("gap to the leading rival", "الفجوة إلى المنافس الأول")} value={rl.gap != null ? `${rl.gap} pp` : rl.leader?.isUae ? t("UAE leads", "الإمارات الأولى") : "n/a"} sub={rl.leader && !rl.leader.isUae ? rl.leader.name : undefined} tone={rl.gap ? "var(--warn)" : "var(--ok)"} />
          <Kpi label={t("largest single move", "أكبر تحرك منفرد")} value={bm ? `${bm.pct >= 0 ? "+" : ""}${bm.pct.toFixed(0)}%` : "n/a"} sub={bm && bmSeries ? `${bmSeries.name[L]} ${bm.from}-${bm.to}` : undefined} tone="var(--accent)" />
        </div>
        {h.summary.length > 0 && <ul className="mt-3 list-disc space-y-1 ps-5 text-[12.5px] leading-snug text-t1">{h.summary.slice(0, 6).map((s, i) => <li key={i}>{s[L]}</li>)}</ul>}
      </Block>

      <Block title={t("Instruments: footprint and headroom", "الأدوات: الحضور ومجال التوسع")} hint={t("Footprint 0 to 5 from the datasets named beside each; headroom is what remains to 5 (hatched). A present reading: no earlier readings are archived.", "الحضور من 0 إلى 5 من مجموعات البيانات المذكورة؛ ومجال التوسع ما تبقى إلى 5 (مخطط). قراءة حالية: لا قراءات سابقة مؤرشفة.")}>
        <ul className="space-y-2.5">{bars.map((x) => (
          <li key={x.id} className="grid items-center gap-x-3 gap-y-0.5 md:grid-cols-[170px_1fr_auto]">
            <span className="text-[12.5px] font-medium text-t0">{x.name}</span>
            {x.footprint == null ? <Hatch>{t("not measured", "غير مقيس")}</Hatch> : <div className="flex h-3 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }} role="img" aria-label={`${x.name}: ${x.footprint}/5`}><i className="block h-full" style={{ width: `${(x.footprint / 5) * 100}%`, background: "var(--accent)" }} /><i className="block h-full" style={{ width: `${((x.headroom ?? 0) / 5) * 100}%`, background: "repeating-linear-gradient(45deg,var(--bg-2),var(--bg-2) 3px,var(--line) 3px,var(--line) 4px)" }} /></div>}
            <span className="text-[11.5px] text-t1"><N>{x.footprint != null ? `${x.footprint.toFixed(1)} · ${x.headroom?.toFixed(1)}` : "—"}</N> · {x.intensity}</span>
            <span className="text-[10.5px] text-t2 md:col-span-3">{x.basis}</span>
          </li>))}</ul>
      </Block>

      <Block title={t("The UAE against rivals in the country's trade", "الإمارات أمام المنافسين في تجارة الدولة")} hint={t("Share of the country's imports in the one year held. Rivals' series over time are not held (see the gaps below).", "حصة من واردات الدولة في السنة المحفوظة. سلاسل المنافسين عبر الزمن غير محفوظة (انظر الفجوات).")}>
        {rl.rows.length ? <ul className="space-y-1.5">{rl.rows.slice(0, 10).map((r) => (
          <li key={r.iso} className="grid grid-cols-[110px_1fr_52px] items-center gap-2 text-[12px]"><span className={`truncate ${r.isUae ? "font-semibold text-ok" : "text-t1"}`}>{r.name}{r.isUae ? " ★" : ""}</span><div className="h-2.5 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}><i className="block h-full rounded-full" style={{ width: `${(r.share / Math.max(1, rl.rows[0].share)) * 100}%`, background: r.isUae ? "var(--ok)" : "var(--t2)" }} /></div><N>{r.share.toFixed(1)}%</N></li>))}</ul> : <Hatch>{t("no rival data held for this country", "لا بيانات منافسين لهذه الدولة")}</Hatch>}
        {d.leverage && <p className="mt-2 text-[11.5px] text-t1">{t("Leverage reading", "قراءة النفوذ المتبادل")}: {t("theirs", "لديها")} <N>{d.leverage.theirs ?? "n/a"}</N> · {t("ours", "لدينا")} <N>{d.leverage.ours ?? "n/a"}</N>{d.leverage.quadrant ? ` · ${d.leverage.quadrant}` : ""}</p>}
      </Block>

      <Block title={t("The UAE's series over time", "سلاسل الإمارات عبر الزمن")} hint={t("From IMF direction of trade and direct-investment positions (mirror data), the World Bank and UN voting distance. Dots: first, last, peak, trough.", "من اتجاهات التجارة ومراكز الاستثمار المباشر لدى الصندوق (بيانات المرآة) والبنك الدولي ومسافة التصويت. النقاط: الأولى والأخيرة والذروة والقاع.")}
        right={<label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-t1"><input type="checkbox" checked={index} onChange={(e) => setIndex(e.target.checked)} className="accent-[var(--accent)]" />{t("Index to first year = 100", "فهرسة إلى السنة الأولى = 100")}</label>}>
        {h.series.length ? <>
          {index && <div className="mb-3 rounded-[10px] border border-line bg-bg2 p-2.5"><div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: combinedSvg(h.series, 620, 170) }} /><p className="mt-1 flex flex-wrap gap-x-3 text-[11px]">{h.series.map((s, i) => <span key={s.id} style={{ color: seriesColor(i) }}>● {s.name[L]}</span>)}</p><p className="text-[10.5px] text-t2">{t("Every series indexed to 100 at its own first year, so different units share one scale. A rising line is a rising value, not a better position (UN distance: lower is closer).", "كل سلسلة مفهرسة إلى 100 في سنتها الأولى لتشترك الوحدات المختلفة في مقياس واحد. الخط الصاعد قيمة صاعدة لا موقفًا أفضل (مسافة الأمم المتحدة: الأقل أقرب).")}</p></div>}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{h.series.map(lineChartFor)}</div>
          {h.eras.some((x) => x.eras.some((y) => y.avg != null)) && <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse text-[11.5px]"><caption className="label mb-1 text-start">{t("Era averages", "متوسطات الحقب")}</caption><thead><tr className="text-t2"><th className="p-1 text-start font-medium">{t("Series", "السلسلة")}</th>{h.eras[0].eras.map((e) => <th key={e.id} className="p-1 text-start font-medium">{e.label[L]}</th>)}</tr></thead><tbody>{h.eras.filter((x) => x.eras.some((y) => y.avg != null)).map((x) => { const s = h.series.find((y) => y.id === x.id)!; return <tr key={x.id} className="border-t border-line"><td className="p-1 text-t0">{x.name[L]}</td>{x.eras.map((y) => <td key={y.id} className="p-1 text-t1">{y.avg != null ? <N>{fmtSeries(s, y.avg, L)}</N> : "—"}</td>)}</tr>; })}</tbody></table></div>}
        </> : <Hatch>{t("no long series held for this country", "لا سلاسل طويلة محفوظة لهذه الدولة")}</Hatch>}
      </Block>

      <Block title={t("Monthly signals", "الإشارات الشهرية")} hint={t("Counts whose sources keep no history, snapshotted once a month by the platform: a line appears as months accumulate.", "أعداد لا تحتفظ مصادرها بتاريخ، تلتقطها المنصة شهريًا: يظهر خط كلما تراكمت الأشهر.")}>
        {caps.length && span ? <>
          <p className="mb-2 text-[11.5px] text-t1">{t(`${span.n} monthly snapshot${span.n === 1 ? "" : "s"} held (${span.first}${span.n > 1 ? ` to ${span.last}` : ""}). A trend line needs at least 2; ${CAP} give a year.`, `${span.n} لقطة شهرية محفوظة (${span.first}${span.n > 1 ? ` إلى ${span.last}` : ""}). يلزم لقطتان على الأقل لخط اتجاه؛ و${CAP} تعطي سنة.`)}</p>
          <ul className="grid gap-2 sm:grid-cols-2">{caps.map((r, i) => <li key={r.id} className="rounded-[10px] border border-line bg-bg2 p-2.5"><p className="text-[12px] leading-snug text-t0">{r.name[L]}</p><div className="mt-1 flex items-center gap-3"><b className="num display text-[22px]" style={{ color: seriesColor(i) }}>{r.latest ?? "—"}</b>{r.line ? <div className="min-w-0 flex-1"><Line pts={r.values.map((v, k) => [k, v] as Pt)} color={seriesColor(i)} label={r.name[L]} fmt={(v) => String(v)} w={160} h={44} /></div> : <Hatch>{t("one snapshot: no trend yet", "لقطة واحدة: لا اتجاه بعد")}</Hatch>}</div></li>)}</ul>
        </> : <Hatch>{t("no monthly capture held", "لا لقطات شهرية محفوظة")}</Hatch>}
      </Block>

      <Gaps L={L} items={notHeld(d, h, lang)} />
      {h.limits.length > 0 && <p className="text-[11px] leading-snug text-t2">{h.limits.map((x) => x[L]).join(" ")}</p>}
    </div>
  );
}
