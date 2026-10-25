"use client";
import { useMemo, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { composeDesk, deskMarkdown } from "@/lib/case/desk";
import type { CaseData } from "@/lib/case/load";
import { briefingHtml, printBriefing } from "@/lib/dossier/export";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Markdown } from "../Markdown";
import { useTr } from "./bits";

/** The desk-officer detailed brief: 24 sections composed from the Case File and the council report. A section that needs the council shows that it is not yet written. */
export function DeskBrief({ L, d, report, arch }: { L: Lang; d: CaseData; report: string | null; arch: string | null }) {
  const t = useTr(L); const secs = useMemo(() => composeDesk(d, report, arch), [d, report, arch]); const [copied, setCopied] = useState(false); const [open, setOpen] = useState<number | null>(1);
  const done = secs.filter((s) => s.filled).length; const md = deskMarkdown(d.name, secs);
  return (
    <div className="space-y-4">
      <Block title={t(`Desk Officer Brief: ${d.name}`, `موجز ضابط المكتب: ${d.nameAr ?? d.name}`)} hint={t("The master document in 24 sections. Sections that are arithmetic on held data are written now at no cost; sections that need reading and judgment come from the Strategic Council and show when they are not yet written. The Minister brief and the Leader page derive from this.", "الوثيقة الأم في 24 قسمًا. الأقسام الحسابية على بيانات محفوظة تُكتب الآن بلا كلفة؛ والتي تحتاج قراءة وحكمًا تأتي من المجلس الاستراتيجي وتظهر حين لا تُكتب بعد. ويُشتق منها موجز الوزير وصفحة القائد.")}
        right={<span className="flex gap-1.5"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Copy size={13} />{copied ? "✓" : t("Copy markdown", "نسخ")}</button><button type="button" onClick={() => printBriefing(briefingHtml(md, { title: `Desk Officer Brief: ${d.name}`, rtl: L === "ar", foot: `Geo Desk · ${d.asOf.slice(0, 10)}`, classification: "WORKING ANALYSIS · DRAFT FROM HELD DATASETS AND AI · NOT REVIEWED" }))} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Printer size={13} />{t("Print or PDF", "طباعة أو PDF")}</button></span>}>
        <p className="text-[12.5px] text-t1"><b className="num text-t0">{done}</b> {t("of 24 sections written", "من 24 قسمًا مكتوبة")} · {secs.filter((s) => !s.filled).length} {t("need the council", "تحتاج المجلس")} · {arch ? t("the Statecraft Architect's sections are woven in, each labelled", "أقسام مهندس فن الحكم مدمجة وكل منها معنون") : t("run the Statecraft Architect to add options, scenarios, roadmap and the power matrix", "شغّل مهندس فن الحكم لإضافة الخيارات والسيناريوهات وخارطة الطريق ومصفوفة القوة")}</p>
        <ol className="mt-3 space-y-1.5">{secs.map((s) => <li key={s.n} className="rounded-[10px] bg-bg2"><button type="button" onClick={() => setOpen(open === s.n ? null : s.n)} aria-expanded={open === s.n} className="flex w-full items-center gap-2 p-2.5 text-start text-[12.5px]"><span className="num w-6 text-t2">{s.n}</span><b className="flex-1 text-t0">{s.title}</b><Pill c={s.filled ? (s.by === "data" ? "var(--ok)" : "var(--c2)") : "var(--warn)"}>{s.filled ? (s.by === "data" ? t("data", "بيانات") : s.by === "council" ? t("council", "المجلس") : t("data + council", "بيانات + المجلس")) : t("not yet written", "لم يُكتب بعد")}</Pill></button>
          {open === s.n && <div className="border-t border-line p-3 text-[12.5px] leading-relaxed text-t0"><Markdown source={s.body} /></div>}</li>)}</ol></Block>
    </div>
  );
}
