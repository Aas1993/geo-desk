"use client";
import { useMemo } from "react";
import { POSTURE } from "@/lib/case/core";
import { draftAnswer } from "@/lib/case/answer";
import { metName } from "@/lib/case/ar";
import type { CaseData } from "@/lib/case/load";
import { BLOCK_BY, PRODUCTS, band, decisionsOf, type Ctx, type Out, type ProductId } from "@/lib/case/report";
import { useNow } from "@/lib/use-now";
import { Pill, type Lang } from "../falcon/bits";
import { Markdown } from "../Markdown";
import { LogStrip } from "./LogStrip";
import { Meter, N, Spark, bt, fmt, useTr } from "./bits";

const HEAD = ["Real GDP growth", "Inflation, consumer prices", "Government gross debt, % of GDP", "UAE goods exports to the partner"];
const TONE = { high: "var(--ok)", medium: "var(--warn)", low: "var(--risk)" } as const; const RISK_TONE = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)" } as const;

/** The President's page: one screen, no tables. It renders the same building blocks as the one-page report, so what is read here is exactly what prints. Anything not yet written says what it would add and what it costs. */
export function President({ L, d, council, arch, onGo, onReport, onLog }: { L: Lang; d: CaseData; council: string | null; arch: string | null; onGo: (tab: ProductId) => void; onReport: () => void; onLog: () => void }) {
  const t = useTr(L); const now = useNow(60_000); const a = useMemo(() => draftAnswer(d), [d]); const post = d.posture.posture; const p = d.posture;
  const ctx: Ctx = useMemo(() => ({ d, council, arch, others: [], lang: L, today: now || 0 }), [d, council, arch, L, now]);
  const { dec, risks, gates } = useMemo(() => { const b = (id: string): Out => BLOCK_BY.get(id)!.build(ctx); return { dec: b("decisions"), risks: b("toprisks"), gates: b("nextGates") }; }, [ctx]);
  const items = useMemo(() => decisionsOf({ d, arch, council }), [d, arch, council]);
  const tiles = HEAD.map((n) => d.spine.find((s) => s.met.name === n && s.has)).filter((s): s is NonNullable<typeof s> => !!s);
  const gauges: { k: "value" | "ability" | "risk"; en: string; ar: string; sub: { en: string; ar: string }; v: number | null }[] = [
    { k: "value", en: "Value to the UAE", ar: "القيمة للإمارات", sub: { en: "What the UAE stands to gain", ar: "ما قد تكسبه الإمارات" }, v: p.value }, { k: "ability", en: "UAE ability to act", ar: "قدرة الإمارات على الفعل", sub: { en: "How well placed the UAE is to move", ar: "مدى جاهزية الإمارات للتحرك" }, v: p.ability }, { k: "risk", en: "Risk", ar: "المخاطر", sub: { en: "How exposed the UAE would be (lower is better)", ar: "مدى انكشاف الإمارات (الأقل أفضل)" }, v: p.risk }];
  const ask = (id: ProductId, why: { en: string; ar: string }) => <button type="button" onClick={() => onGo(id)} className="mt-2 inline-flex h-9 items-center rounded-[8px] bg-bg3 px-3 text-[12.5px] text-t0 hover:bg-bg2">{t(`Write it: ${PRODUCTS[id].en} (about US$${PRODUCTS[id].usd.toFixed(2)})`, `اكتبه: ${PRODUCTS[id].ar} (نحو ${PRODUCTS[id].usd.toFixed(2)} دولار)`)} <span className="ms-2 text-[11px] text-t2">{bt(L, why)}</span></button>;
  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1"><h2 className="display text-[30px] font-semibold leading-tight text-t0">{d.flag} {L === "ar" && d.nameAr ? d.nameAr : d.name}</h2><span className="pb-1 text-[12px] text-t2">{t("As of", "بتاريخ")} {d.asOf.slice(0, 10)}</span><Pill c="var(--warn)">{t("Working analysis · not reviewed", "تحليل عمل · غير مُراجَع")}</Pill></header>
      <section className="rounded-[16px] border-2 border-accent/50 bg-bg1 p-5" aria-label={t("The Answer", "الجواب")}>
        <div className="label">{t("The Answer", "الجواب")}</div>
        <p className="display mt-1 text-[28px] font-semibold leading-tight text-t0">{bt(L, a.stance)}</p>{post && <p className="text-[14px] text-t1">{bt(L, POSTURE[post].sub)}</p>}
        <p className="mt-3 text-[15px] leading-relaxed text-t0">{bt(L, a.why)}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-t1"><b className="text-t0">{t("Biggest risk:", "أكبر خطر:")}</b> {bt(L, a.risk)} <b className="ms-2 text-t0">{t("Confidence:", "الثقة:")}</b> {bt(L, a.confidence)}</p></section>
      <section aria-label={t("Three readings", "ثلاث قراءات")} className="grid gap-3 sm:grid-cols-3">{gauges.map((g) => { const b = band(g.k, g.v); const c = b ? (g.k === "risk" ? RISK_TONE : TONE)[b] : "var(--t2)"; return <div key={g.k} className="rounded-[14px] border border-line bg-bg1 p-4"><div className="text-[12.5px] font-semibold text-t0">{L === "ar" ? g.ar : g.en}</div><div className="mt-1 flex items-baseline gap-2"><span className="num display text-[36px] font-semibold leading-none" style={{ color: c }}>{g.v ?? "n/a"}</span>{b && <span className="text-[13px] font-semibold" style={{ color: c }}>{b === "high" ? t("high", "مرتفع") : b === "medium" ? t("medium", "متوسط") : t("low", "منخفض")}</span>}</div><div className="mt-2"><Meter v={g.v} c={c} /></div><p className="mt-1.5 text-[11.5px] leading-snug text-t2">{bt(L, g.sub)}</p></div>; })}
        <p className="text-[11.5px] leading-snug text-t2 sm:col-span-3">{p.value == null ? t("Not enough data to place the country.", "لا بيانات كافية لتحديد موضع الدولة.") : p.stable ? t("This stance holds if any reading moves by 10 points.", "يصمد هذا الموقف إن تحركت أي قراءة 10 نقاط.") : t("This stance changes if a reading moves by 10 points: read the alternatives in the Minister view.", "يتغير هذا الموقف إن تحركت قراءة 10 نقاط: اقرأ البدائل في عرض الوزير.")}</p></section>
      <section className="rounded-[16px] border border-line bg-bg1 p-5" aria-label={t("Decisions for your consideration", "قرارات للنظر")}><div className="flex flex-wrap items-center gap-2"><span className="label">{t("Decisions for your consideration", "قرارات للنظر")}</span>{dec.state === "written" ? <Pill c="var(--ok)">{arch ? t("from the Statecraft Architect", "من مهندس فن الحكم") : t("from the Strategic Council", "من المجلس الاستراتيجي")}</Pill> : <Pill c="var(--warn)">{t("data trigger only", "محفّز البيانات فقط")}</Pill>}</div>
        <div className="mt-2 text-[15px] leading-relaxed [&_li]:my-1.5 [&_ol]:ps-6 [&_p]:text-[15px]"><Markdown source={dec.md} /></div>{dec.need && ask(dec.need, PRODUCTS[dec.need].adds)}<LogStrip L={L} iso={d.iso3} items={items.items} from={items.from} onOpen={onLog} /></section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[16px] border border-line bg-bg1 p-5" aria-label={t("What could go wrong", "ما قد يسوء")}><div className="label">{t("What could go wrong", "ما قد يسوء")}</div><div className="mt-1 text-[13.5px] leading-relaxed [&_li]:my-1.5 [&_p]:text-[13.5px]"><Markdown source={risks.md} /></div>{risks.need && ask(risks.need, { en: "adds the strategy risks", ar: "يضيف مخاطر الاستراتيجية" })}</section>
        <section className="rounded-[16px] border border-line bg-bg1 p-5" aria-label={t("Next decision gates", "بوابات القرار القادمة")}><div className="label">{t("Next decision gates", "بوابات القرار القادمة")}</div>{gates.state === "missing" ? <><p className="mt-1 text-[13px] text-t1">{t("No strategy is written, so there are no dated gates yet.", "لا استراتيجية مكتوبة، فلا بوابات مؤرخة بعد.")}</p>{gates.need && ask(gates.need, PRODUCTS[gates.need].adds)}</> : <div className="mt-1 text-[13.5px] leading-relaxed [&_li]:my-1.5 [&_p]:text-[13.5px]"><Markdown source={gates.md} /></div>}</section>
      </div>
      {tiles.length > 0 && <section aria-label={t("Key numbers", "أرقام رئيسية")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tiles.map((s) => <div key={s.met.name} className="rounded-[14px] border border-line bg-bg1 p-3.5"><div className="text-[11.5px] leading-snug text-t1">{metName(s.met.name, L)}</div><div className="num display mt-1 text-[24px] font-semibold text-t0">{s.spine.latest ? fmt(s.spine.latest.v) : "n/a"}<span className="ms-1.5 text-[11px] font-normal text-t2">{s.spine.latest?.y}</span></div><Spark obs={s.series} proj={s.proj} w={170} h={34} /><div className="numt mt-0.5 text-[10.5px] text-t2">{s.spine.change5 != null && <>{t("5y", "5 س")} <N>{`${s.spine.change5 >= 0 ? "+" : ""}${fmt(s.spine.change5)}`}</N></>}</div></div>)}</section>}
      <footer className="flex flex-wrap items-center gap-3 rounded-[14px] bg-bg2 p-3.5 text-[12px] text-t1"><span className="min-w-0 flex-1">{t("This page is the one-page brief. Print or save it from Reports; the Minister view has the reasons, Detailed has the evidence.", "هذه الصفحة هي الموجز في صفحة واحدة. اطبعها أو احفظها من التقارير؛ ويحمل عرض الوزير الأسباب، ويحمل التفصيلي الأدلة.")}</span><button type="button" onClick={onReport} className="h-10 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)]">{t("Print or save this brief", "اطبع هذا الموجز أو احفظه")}</button></footer>
    </div>
  );
}
