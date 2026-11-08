"use client";
import { useRef, useState } from "react";
import type { CaseData } from "@/lib/case/load";
import { parseReviews } from "@/lib/desk/core";
import { stripReviewJson } from "@/lib/review/pair";
import { liveEnd, liveEvent, liveStart, type Live } from "@/lib/bird/live";
import { INFO, runOne } from "@/lib/bird/runner";
import type { Prod } from "@/lib/bird/consolidate";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Markdown } from "../Markdown";
import { LiveDesk } from "./LiveDesk";
import { SourceMix } from "./SourceMix";
import { FieldUpdates } from "../hub/FieldUpdates";

/** The statecraft brief: the Country Brief agent team's output, shown as a bottom line and one card per section (the first three open), with the two auditors' verdicts and the specialists' own findings kept beneath. When it has not been run, one explicit click runs it (about US$0.90, under the US$1.00 ceiling, with an in-page confirmation). */
export function CountryBriefPanel({ L, iso, d, prod, onRan }: { L: Lang; iso: string; d: CaseData | null; prod: Prod; onRan: () => void }) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const [asking, setAsking] = useState(false); const [running, setRunning] = useState(false); const [live, setLive] = useState<Live>({}); const [startedAt, setStartedAt] = useState(0); const [note, setNote] = useState(""); const [err, setErr] = useState(""); const ac = useRef<AbortController | null>(null);
  const run = async (refresh: boolean) => {
    if (running) return; setAsking(false); setErr(""); setNote(""); setRunning(true); setLive(liveStart({}, "country", Date.now())); setStartedAt(Date.now()); const a = new AbortController(); ac.current = a;
    const out = await runOne("country", iso, lang, d, { refresh, signal: a.signal, onEvent: (e) => { if (e.type === "status") setNote(String(e.text ?? "")); else setLive((l) => liveEvent(l, "country", e, Date.now())); } });
    setLive((l) => liveEnd(l, "country", Date.now())); setRunning(false); if (out.ok) onRan(); else if (out.error !== "aborted") setErr(out.message);
  };
  const est = INFO.country.est; const reviews = prod ? parseReviews(prod.report) : [];
  const clean = prod ? stripReviewJson(prod.report) : ""; const at = clean.indexOf("# Specialist Findings"); const main = at >= 0 ? clean.slice(0, at) : clean; const findings = at >= 0 ? clean.slice(at).replace(/^# Specialist Findings\s*/, "") : "";
  const secs = main.split(/^(?=# )/m).map((x) => x.trim()).filter(Boolean); const lead = secs.find((x) => /^# Country Brief/i.test(x) || /^# موجز الدولة/.test(x)); const rest = secs.filter((x) => x !== lead);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {prod ? <><Pill c="var(--ok)">{t("written", "مكتوب")} {prod.at.slice(0, 10)}</Pill>{prod.usd != null && <Pill c="var(--t2)">US${prod.usd.toFixed(2)}</Pill>}{reviews.map((r) => <Pill key={r.lens} c={r.verdict === "approve" ? "var(--ok)" : r.verdict === "reject" ? "var(--risk)" : "var(--warn)"}>{r.lens}: {r.verdict}</Pill>)}</> : <Pill c="var(--warn)">{t("not run", "لم يُشغَّل")}</Pill>}
        {!running && <button type="button" onClick={() => setAsking((v) => !v)} className="ms-auto inline-flex h-8 items-center rounded-[10px] bg-accent px-3 text-[12px] font-semibold text-[var(--accent-ink)]">{prod ? t("Refresh the statecraft brief", "حدّث موجز فن الحكم") : t(`Run the statecraft brief (about US$${est.toFixed(2)})`, `شغّل موجز فن الحكم (نحو ${est.toFixed(2)} دولار)`)}</button>}
      </div>
      <div className="mt-2"><FieldUpdates L={L} iso={iso} name="" compact /></div>
      {asking && !running && <div role="alertdialog" aria-label={t("Confirm the run", "تأكيد التشغيل")} className="mt-2 rounded-[10px] border border-accent/50 bg-bg3 p-3"><p className="text-[12.5px] leading-snug text-t0">{t(`Run the Country Brief for this country? Nine specialists in four sittings, a Chief Strategist and the two independent auditors, using web search for the history, tourism and latest news. Estimated cost about US$${est.toFixed(2)}, capped at US$1.00. It takes about three minutes; stay on this page.`, `تشغيل موجز الدولة؟ تسعة مختصين في أربع جلسات ورئيس استراتيجيين والمدققان المستقلان، مع البحث في الويب للتاريخ والسياحة وآخر الأخبار. الكلفة التقديرية نحو ${est.toFixed(2)} دولار بسقف 1.00 دولار. يستغرق نحو ثلاث دقائق؛ ابقَ في هذه الصفحة.`)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void run(!!prod)} className="inline-flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]">{t("Confirm and run", "أكّد وشغّل")}</button><button type="button" onClick={() => setAsking(false)} className="inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] text-t1">{t("Cancel", "إلغاء")}</button></div></div>}
      {(running || Object.keys(live).length > 0) && <LiveDesk L={L} live={live} running={running} startedAt={startedAt} names={{ country: L === "ar" ? INFO.country.ar : INFO.country.en }} />}
      {running && note && <p className="mt-1 text-[11.5px] text-t2">{note}</p>}
      {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
      {!prod && !running && <div className="mt-3 rounded-[10px] border border-dashed border-line p-3 text-[12px] leading-snug text-t1">{t("The data panels above are free and complete for what the platform holds. The statecraft brief adds what the datasets cannot: the country's background and history, tourism, what each side wants from the other, the latest news with sources, and technology and innovation, the geopolitical and statecraft assessment, written by nine specialists and checked by two independent auditors.", "اللوحات أعلاه مجانية وكاملة لما تحتفظ به المنصة. ويضيف موجز فن الحكم ما لا تحمله البيانات: خلفية الدولة وتاريخها والسياحة وما يريده كل طرف من الآخر وآخر الأخبار بمصادرها والتقييم الجيوسياسي وفن الحكم، بقلم تسعة مختصين وتدقيق مدققَين مستقلَّين.")}</div>}
      {prod && <SourceMix sources={prod.sources} L={L} />}
      {prod && <div className="mt-3 space-y-2">
        {lead && <div className="rounded-[12px] border border-accent/40 p-3" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}><div className="text-[13px]"><Markdown source={lead} /></div></div>}
        {rest.map((x, i) => { const title = /^# (.*)$/m.exec(x)?.[1] ?? ""; const body = x.replace(/^# .*\n?/, ""); return <details key={i} open={i < 3} className="rounded-[12px] border border-line bg-bg2"><summary className="cursor-pointer list-none p-3 text-[13px] font-semibold text-t0">{title}</summary><div className="border-t border-line p-3 text-[12.5px]"><Markdown source={body} /></div></details>; })}
        {findings && <details className="rounded-[12px] border border-line bg-bg2"><summary className="cursor-pointer list-none p-3 text-[13px] font-semibold text-t0">{t("The specialists' own findings", "ما كتبه المختصون أنفسهم")}</summary><div className="border-t border-line p-3 text-[12.5px]"><Markdown source={findings} /></div></details>}
      </div>}
    </div>
  );
}
