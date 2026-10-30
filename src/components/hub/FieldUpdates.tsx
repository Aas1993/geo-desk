"use client";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { CLIPS_CAVEAT, CLIPS_LABEL } from "@/lib/clips";
import { Block, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { useClips } from "./useClips";

const TONE: Record<string, string> = { opportunity: "var(--ok)", risk: "var(--risk)", neutral: "var(--t2)" };
/** The labelled "Field updates" section the reports show: what the desk clipped from the Country Updates Hub for this country, dated and sourced, with the desk's notes. It is analysis input the agents also read; it is not verified by the platform. */
export function FieldUpdates({ L, iso, name, compact }: { L: Lang; iso: string; name: string; compact?: boolean }) {
  const t = useTr(L); const { clips } = useClips(iso);
  if (compact) return clips.length ? <details className="rounded-[10px] border border-line bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{t(CLIPS_LABEL.en, CLIPS_LABEL.ar)} <span className="num text-t2">({clips.length})</span> <span className="text-t2">· {t("the agents read these when the brief is written", "يقرؤها الوكلاء عند كتابة الموجز")}</span></summary><p className="mt-1 text-[11px] text-t2">{t(CLIPS_CAVEAT.en, CLIPS_CAVEAT.ar)}</p><ol className="mt-1.5 space-y-1">{clips.map((c, i) => <li key={c.id} className="text-[12px] leading-snug text-t1" dir="auto"><span className="num text-t2">{i + 1}.</span> {c.date ? `${c.date} · ` : ""}{c.text} <span className="text-t2">({c.source}{c.note ? ` · ${t("note", "ملاحظة")}: ${c.note}` : ""})</span></li>)}</ol></details> : null;
  return (
    <Block title={`${t(CLIPS_LABEL.en, CLIPS_LABEL.ar)}: ${name}`} hint={t(CLIPS_CAVEAT.en, CLIPS_CAVEAT.ar)} right={<Link href={`/hub/${iso}`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-accent"><Paperclip size={13} aria-hidden />{t("Open the hub", "افتح المركز")}</Link>}>
      {!clips.length ? <p className="text-[12.5px] leading-snug text-t1">{t("Nothing clipped for this country yet. Open the Country Updates Hub, find an update that matters and press Add to report: it appears here, in the PDF and in what the agents read.", "لا مستجدات منتقاة لهذه الدولة بعد. افتح مركز مستجدات الدولة وابحث عن مستجد مهم واضغط أضف إلى التقرير: يظهر هنا وفي ملف PDF وفيما يقرؤه الوكلاء.")}</p>
        : <ol className="space-y-1.5">{clips.map((c, i) => <li key={c.id} className="rounded-[10px] border border-line bg-bg2 p-2.5" style={{ borderInlineStart: `4px solid ${TONE[c.tone ?? "neutral"]}` }}><p className="text-[11px] text-t2"><span className="num">{i + 1}</span> · {c.date || t("undated", "بلا تاريخ")} · {c.angle}{c.tone && c.tone !== "neutral" ? ` · ${c.tone === "risk" ? t("risk mark", "علامة خطر") : t("opportunity mark", "علامة فرصة")}` : ""}</p><p className="text-[13px] font-medium leading-snug text-t0" dir="auto">{c.text}</p><p className="text-[11px] text-t2">{c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{c.source || c.url}</a> : c.source}</p>{c.note && <p className="mt-1 text-[12px] leading-snug text-t1" dir="auto"><b className="text-t0">{t("Desk note", "ملاحظة المكتب")}:</b> {c.note}</p>}</li>)}</ol>}
    </Block>
  );
}
