"use client";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { CaseData } from "@/lib/case/load";
import { fmtV, fmtVAr, uaeHistory, type HSeries } from "@/lib/desk/history";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Spark, bt, useTr } from "../case/bits";
import { Drill, Row } from "./shared";

/** The UAE in this country over time: deterministic, from held data, free. Each series opens to its figures, its eras and its limits; the deals feed is listed with links; and what the data cannot show is stated. */
export function History({ L, d, onAsk }: { L: Lang; d: CaseData; onAsk: (text: string) => void }) {
  const t = useTr(L); const h = useMemo(() => uaeHistory(d), [d]); const nm = L === "ar" && d.nameAr ? d.nameAr : d.name; const v = (s: HSeries, x: number) => (L === "ar" ? fmtVAr(s, x) : fmtV(s, x));
  const chg = (s: HSeries) => (s.change == null ? "n/a" : `${s.change >= 0 ? "+" : ""}${s.change.toFixed(0)}%`);
  return (
    <div className="space-y-4">
      <Block title={t(`The UAE in ${nm}: what the record shows`, `الإمارات في ${nm}: ما يُظهره السجل`)} hint={t("Computed from held datasets by stated rules, free. Click any series for its figures and eras; click a headline for its source.", "محسوب من مجموعات البيانات المحفوظة بقواعد معلنة، مجانًا. انقر أي سلسلة لأرقامها وحقباتها؛ وانقر العنوان لمصدره.")}>
        <ul className="space-y-1.5">{h.summary.map((x, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-t0"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" /><span dir="auto">{bt(L, x)}</span></li>)}</ul>
        <button type="button" onClick={() => onAsk(t(`What does the history of the UAE's ties with ${nm} imply for what the UAE should do now? Use the UAE's own past decisions here and in comparable cases.`, `ماذا يعني تاريخ علاقات الإمارات مع ${nm} لما ينبغي أن تفعله الآن؟ استعن بقرارات الإمارات السابقة هنا وفي حالات مماثلة.`))} className="mt-3 inline-flex h-8 items-center rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0 hover:bg-bg2">{t("Ask the council what the history implies", "اسأل المجلس عمّا يعنيه التاريخ")}</button>
      </Block>
      <section aria-label={t("Series", "السلاسل")}><h3 className="mb-2 text-[14px] font-semibold text-t0">{t("The series", "السلاسل")}</h3>
        {h.series.length === 0 ? <p className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{t("No long series is held for this country.", "لا سلسلة طويلة محفوظة لهذه الدولة.")}</p> : <div className="grid gap-2.5 lg:grid-cols-2">{h.series.map((s, i) => { const er = h.eras.find((e) => e.id === s.id)?.eras ?? []; return (
          <Drill key={s.id} L={L} defaultOpen={i < 2} head={bt(L, s.name)} sub={s.last ? `${v(s, s.last[1])} (${s.last[0]})` : undefined} tags={<Pill c={s.change != null && s.change >= 0 ? "var(--ok)" : "var(--warn)"}>{chg(s)} {s.first ? `${t("since", "منذ")} ${s.first[0]}` : ""}</Pill>}>
            <div className="rounded-[10px] bg-bg2 p-2.5"><Spark obs={s.pts} w={360} h={70} color="#378ADD" /></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3"><Row label={t("First", "الأول")}>{s.first ? `${v(s, s.first[1])} (${s.first[0]})` : "n/a"}</Row><Row label={t("Latest", "الأحدث")}>{s.last ? `${v(s, s.last[1])} (${s.last[0]})` : "n/a"}</Row><Row label={t("Peak", "الذروة")}>{s.peak ? `${v(s, s.peak[1])} (${s.peak[0]})` : "n/a"}</Row><Row label={t("Trough", "القاع")}>{s.trough ? `${v(s, s.trough[1])} (${s.trough[0]})` : "n/a"}</Row><Row label={t("Change", "التغير")}>{chg(s)}</Row>{s.cagr != null && <Row label={t("Per year", "سنويًا")}>{`${s.cagr >= 0 ? "+" : ""}${s.cagr.toFixed(1)}%`}</Row>}</div>
            {er.some((e) => e.avg != null) && <div><b className="text-t0">{t("Average by era", "المتوسط بحسب الحقبة")}</b><ul className="mt-0.5 space-y-0.5 text-t1">{er.filter((e) => e.avg != null).map((e) => <li key={e.id} className="numt flex justify-between gap-3"><span>{bt(L, e.label)}</span><b className="text-t0">{v(s, e.avg!)}</b></li>)}</ul></div>}
            <p className="text-[11.5px] text-t2">{bt(L, s.note)}</p>
            <button type="button" onClick={() => onAsk(t(`Explain the movement in "${s.name.en}" for ${nm} (${s.first?.[0]} to ${s.last?.[0]}): what drove it, what the UAE did or did not do, and what it implies.`, `اشرح حركة «${s.name.ar}» في ${nm} (${s.first?.[0]} إلى ${s.last?.[0]}): ما الذي دفعها وماذا فعلت الإمارات أو لم تفعل وماذا تعني.`))} className="inline-flex h-8 items-center rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t0 hover:bg-bg2">{t("Ask the council to explain this", "اسأل المجلس أن يشرح هذا")}</button>
          </Drill>); })}</div>}
      </section>
      <Block title={t("UAE deal headlines naming the country", "عناوين الصفقات الإماراتية التي تسمّي الدولة")} hint={t(`${h.deals.length} headlines held (the most recent forty), newest first: announcements, not completed investment. Each opens to its source.`, `${h.deals.length} عنوانًا محفوظًا (أحدث أربعين)، الأحدث أولًا: إعلانات لا استثمار منجز. ويفتح كل منها مصدره.`)}>
        {h.deals.length === 0 ? <p className="text-[12.5px] text-t1">{t("No deal headline names this country in the feed held.", "لا عنوان صفقة يسمّي هذه الدولة في التغذية المحفوظة.")}</p> : <>
          {h.dealYears.length > 0 && <p className="mb-2 flex flex-wrap gap-1.5 text-[11px] text-t2">{h.dealYears.slice().reverse().map((y) => <span key={y.y} className="num rounded-full border border-line px-2 py-0.5 text-t1">{y.y}: {y.n}</span>)}</p>}
          <ul className="space-y-1.5">{h.deals.map((x, i) => <li key={x.d + i} className="rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug"><div className="flex flex-wrap items-center gap-2"><span className="num text-[11px] text-t2">{x.d}</span>{x.by.map((b) => <Pill key={b} c="var(--ok)">{b}</Pill>)}{x.sector && <Pill c="var(--t2)">{x.sector}</Pill>}{/^https?:\/\//.test(x.u) && <a href={x.u} target="_blank" rel="noreferrer noopener" className="ms-auto inline-flex items-center gap-1 text-[11px] text-accent hover:underline">{t("source", "المصدر")} <ExternalLink size={11} /></a>}</div><p className="mt-1 text-t0" dir="auto">{x.t}</p></li>)}</ul></>}
      </Block>
      {(h.capture.visits12 != null || h.capture.dest != null) && <Block title={t("Engagement now", "التفاعل الآن")}><div className="grid gap-2.5 sm:grid-cols-4">{([[t("Engagements, last 12 months", "اللقاءات خلال 12 شهرًا"), h.capture.visits12], [t("UAE direct destinations", "وجهات إماراتية مباشرة"), h.capture.dest], [t("Announced UAE deals, 12 months", "صفقات إماراتية معلنة خلال 12 شهرًا"), h.capture.deals12], [t("Sanctions-list entries naming the country", "إدراجات في قوائم العقوبات تسمّي الدولة"), h.capture.ofac]] as [string, number | null][]).map(([l, x]) => <div key={l} className="rounded-[12px] border border-line bg-bg1 p-3"><div className="label">{l}</div><div className="num display text-[22px] font-semibold text-t0">{x ?? "n/a"}</div></div>)}</div></Block>}
      <section className="rounded-[12px] border border-line bg-bg1 p-3.5"><h4 className="text-[12.5px] font-semibold text-t0">{t("What this view cannot show", "ما لا يستطيع هذا العرض إظهاره")}</h4><ul className="mt-1.5 list-disc space-y-1 ps-5 text-[12px] leading-snug text-t1">{h.limits.map((x, i) => <li key={i}>{bt(L, x)}</li>)}</ul></section>
    </div>
  );
}
