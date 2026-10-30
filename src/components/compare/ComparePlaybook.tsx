"use client";
import { Block, Pill } from "../falcon/bits";
import { nameOf, relationOf, type CompareCountry, type Lang } from "@/lib/compare";
import { sequence, type SeqRow } from "@/lib/compare-playbook";
import { colorOf } from "./CompareVisuals";

const PH: Record<string, { en: string; ar: string; c: string }> = { now: { en: "now", ar: "الآن", c: "var(--ok)" }, next: { en: "next", ar: "لاحقًا", c: "var(--c2)" }, later: { en: "later", ar: "في وقت أبعد", c: "var(--t2)" }, hold: { en: "hold", ar: "ترقّب", c: "var(--warn)" } };

/** The UAE's position in each country (the relationship view): its mission, the CEPA, the joint committees, the last visits and the agreements on file, side by side. */
export function RelationCards({ cs, L, hi }: { cs: CompareCountry[]; L: Lang; hi: string | null }) {
  const t = (en: string, ar: string) => (L === "ar" ? ar : en);
  return <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{cs.map((c) => { const r = relationOf(c); return (
    <div key={c.iso} className="rounded-[12px] border border-line bg-bg2 p-3 text-[11.5px] leading-snug text-t1" style={{ borderTop: `3px solid ${colorOf(cs, c.iso)}`, opacity: hi && hi !== c.iso ? 0.35 : 1 }}><p className="mb-1.5 truncate text-[12.5px] font-semibold text-t0">{c.flag} {nameOf(c, L)}</p>
      <p><b className="text-t0">{t("UAE presence", "حضور الدولة")}:</b> {r.presence || t("not held", "غير محفوظ")}</p><p className="mt-1"><b className="text-t0">{r.cepa.split(":")[0]}:</b> {r.cepa.split(":").slice(1).join(":").trim()}</p><p className="mt-1"><b className="text-t0">{t("Agreements on file", "الاتفاقيات المحفوظة")}:</b> {r.agreements ?? t("not held", "غير محفوظ")}</p>
      {r.committees.length > 0 && <p className="mt-1">{r.committees.join("; ")}</p>}
      <p className="mt-1.5 font-semibold text-t0">{t("Latest visits and contacts", "آخر الزيارات واللقاءات")}</p>{r.visits.length ? <ul className="mt-0.5 space-y-0.5">{r.visits.map((v) => <li key={v.d + v.t}><span className="numt text-t2">{v.d}</span> {v.t}</li>)}</ul> : <p className="text-t2">{t("none on file", "لا شيء محفوظ")}</p>}</div>); })}</div>;
}

/** THE ONE-LINE PLAYBOOK of each country and the recommended sequence. The lines come from the per-country playbook (rule-built from the Case File, free); the sequence follows the ranking for the chosen purpose and gives, for each country, the first move, a proposed owner, the window, a measure on the platform's own scale and the gate. All of it is a proposal for a human decision. */
export function ComparePlaybook({ cs, L, order, purposeName, asOf }: { cs: CompareCountry[]; L: Lang; order: string[]; purposeName: string; asOf: string }) {
  const t = (en: string, ar: string) => (L === "ar" ? ar : en); const rows: SeqRow[] = sequence(cs, order, L, asOf);
  return (
    <div className="space-y-3">
      <Block title={t("The UAE statecraft playbook, one line per country", "دليل فن الحكم الإماراتي، سطر لكل دولة")} hint={t("Read from each country's playbook (rule-built from the Case File, free, no model): the course, the first instruments, the corridor and trade play, the friends and coalition move and the first 90 days. Proposals, not policy.", "مقروء من دليل كل دولة (مبني بقواعد من ملف الحالة، مجاني، بلا نموذج): المسار والأدوات الأولى والخطة التجارية وخطة الممرات وخطوة الأصدقاء والائتلاف وأول 90 يومًا. مقترحات لا سياسات.")}>
        <div className="grid gap-2 md:grid-cols-2">{cs.map((c) => { const p = c.play; return (
          <article key={c.iso} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12px] leading-snug text-t1" style={{ borderTop: `3px solid ${colorOf(cs, c.iso)}` }}><div className="flex flex-wrap items-center gap-2"><b className="text-[13px] text-t0">{c.flag} {nameOf(c, L)}</b>{p.seam === "fallback" && <Pill c="var(--warn)" title={t("The full playbook could not be built; this is a plain line from the same held data", "تعذّر بناء الدليل الكامل؛ هذا سطر مبسّط من البيانات المحفوظة نفسها")}>{t("plain line", "سطر مبسّط")}</Pill>}</div>
            <p className="mt-1.5"><b className="text-t0">{t("Course", "المسار")}:</b> {p.course}</p>
            <p className="mt-1"><b className="text-t0">{t("Top instruments", "أهم الأدوات")}:</b> {p.instruments.length ? p.instruments.map((i) => <span key={i.name} className="me-1.5 inline-block">{i.name} <Pill c={PH[i.phase]?.c ?? "var(--t2)"}>{PH[i.phase] ? (L === "ar" ? PH[i.phase].ar : PH[i.phase].en) : i.phase}</Pill></span>) : t("none placed", "لا شيء")}</p>
            <p className="mt-1"><b className="text-t0">{t("Corridor and trade play", "خطة الممر والتجارة")}:</b> {p.corridor ?? t("not built", "غير مبنية")}</p>
            <p className="mt-1"><b className="text-t0">{t("Friends and coalition move", "خطوة الأصدقاء والائتلاف")}:</b> {p.friends ?? t("not built", "غير مبنية")}</p>
            <div className="mt-1"><b className="text-t0">{t("First 90 days", "أول 90 يومًا")}:</b>{p.first90.length ? <ul className="ms-4 list-disc">{p.first90.map((x) => <li key={x}>{x}</li>)}</ul> : <span> {p.first ? `${p.first.when}: ${p.first.name}` : t("not built", "غير مبنية")}</span>}</div></article>); })}</div>
      </Block>
      <Block title={t("Recommended sequence", "التسلسل الموصى به")} hint={t(`The order follows the ranking for "${purposeName}" (change it in the Ranking view). For each country: the playbook's first move, a proposed owner (a role), the window and the date it ends counted from ${asOf}, a measure on the platform's own 0 to 5 scale, and the gate that releases the next step. Proposals for a human decision; nothing is sent.`, `يتبع الترتيب تصنيف «${purposeName}» (غيّره من عرض الترتيب). لكل دولة: الخطوة الأولى في الدليل ومسؤول مقترح (دور) والمدة وتاريخ نهايتها محسوبًا من ${asOf} ومقياس على مقياس المنصة من 0 إلى 5 والبوابة التي تفتح الخطوة التالية. مقترحات لقرار بشري؛ ولا يُرسل شيء.`)}>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-[12px]"><thead className="text-t2"><tr>{[t("#", "#"), t("Country", "الدولة"), t("First move (proposal)", "الخطوة الأولى (مقترح)"), t("Owner", "المسؤول"), t("Window", "المدة"), t("Measure", "المقياس"), t("Gate", "البوابة")].map((h) => <th key={h} scope="col" className="border-b border-line p-2 text-start font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.iso} className="border-b border-line/50 align-top last:border-0"><td className="numt p-2 font-semibold text-t0">{r.order}</td><td className="p-2 font-medium text-t0">{r.name}</td><td className="p-2 text-t1">{r.move}</td><td className="p-2 text-t1">{r.owner}</td><td className="numt p-2 text-t1" dir="ltr">{r.when || "—"}{r.by && <span className="block text-t2">{t("by", "حتى")} {r.by}</span>}</td><td className="p-2 text-t1">{r.measure}</td><td className="p-2 text-t1">{r.gate}</td></tr>)}</tbody></table></div>
      </Block>
    </div>
  );
}
