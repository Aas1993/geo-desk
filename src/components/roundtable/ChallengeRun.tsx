"use client";
import { useRef, useState } from "react";
import { Swords } from "lucide-react";
import { liveEnd, liveEvent, liveStart, type Live } from "@/lib/bird/live";
import { CHALLENGE_EST, challengeContext, runChallenge } from "@/lib/roundtable/challenge";
import type { SeatReading } from "@/lib/roundtable/read";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { LiveDesk } from "../bird/LiveDesk";

// THE CHALLENGE RUN: a directive box that steers what the councils debate, and one click (with an in-page confirmation, because the app's browser dismisses a pop-up confirm) that runs the round: about US$0.6, capped at US$1.00, through the same desk route and limits as every other paid product. The digests are built free from what the browser holds; nothing is sent until the user confirms.
const nowMs = () => Date.now();
const SUGGEST: { en: string; ar: string }[] = [
  { en: "Which course serves the UAE best here, and which council is most likely to be wrong?", ar: "أي مسار يخدم الإمارات أفضل هنا، وأي مجلس أرجح أن يكون مخطئًا؟" },
  { en: "Where do the security view and the economic view of this country pull in opposite directions, and how should the UAE resolve it?", ar: "أين يتعارض المنظور الأمني والاقتصادي لهذه الدولة وكيف ينبغي للإمارات حسم ذلك؟" },
  { en: "What is the one condition that, if it fails, makes every council's recommendation wrong?", ar: "ما الشرط الوحيد الذي إن سقط جعل توصية كل مجلس خاطئة؟" },
];
export function ChallengeRun({ L, iso, name, pure, baseline, posture, held, topic0, onRan }: { L: Lang; iso: string; name: string; pure: SeatReading[]; baseline: Record<string, number | null>; posture: string | null; held: boolean; topic0: string; onRan: () => void }) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const [topic, setTopic] = useState(topic0); const [asking, setAsking] = useState(false); const [running, setRunning] = useState(false); const [live, setLive] = useState<Live>({}); const [startedAt, setStartedAt] = useState(0); const [note, setNote] = useState(""); const [err, setErr] = useState(""); const ac = useRef<AbortController | null>(null);
  const filed = pure.filter((r) => r.id !== "data" && r.onFile).length; const enough = filed >= 2;
  const run = async () => {
    if (running || !enough) return; setAsking(false); setErr(""); setNote(""); setRunning(true); setLive(liveStart({}, "challenge", nowMs())); setStartedAt(nowMs()); const a = new AbortController(); ac.current = a;
    const out = await runChallenge({ iso, lang, topic: topic.trim(), context: challengeContext(pure, baseline, posture, topic.trim()), refresh: true, signal: a.signal, onEvent: (e) => { if (e.type === "status") setNote(String(e.text ?? "")); else setLive((l) => liveEvent(l, "challenge", e, nowMs())); } });
    setLive((l) => liveEnd(l, "challenge", nowMs())); setRunning(false); if (out.ok) onRan(); else if (out.error !== "aborted") setErr(out.message);
  };
  return (
    <div className="rounded-[14px] border border-line bg-bg1 p-3.5">
      <label htmlFor="rt-topic" className="label mb-1 block">{t("Steer the challenge (optional): what should the councils debate?", "وجّه التحدي (اختياري): ماذا ينبغي أن تتناقش المجالس؟")}</label>
      <textarea id="rt-topic" value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} maxLength={600} disabled={running} placeholder={t("For example: should the UAE sign the investment agreement now or wait for the election?", "مثال: هل توقّع الإمارات اتفاقية الاستثمار الآن أم تنتظر الانتخابات؟")} className="w-full resize-y rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0 outline-none focus:border-accent" dir="auto" />
      <div className="mt-1.5 flex flex-wrap gap-1.5">{SUGGEST.map((s, i) => <button key={i} type="button" disabled={running} onClick={() => setTopic(t(s.en, s.ar))} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11px] text-t1 hover:border-accent hover:text-accent">{t(s.en, s.ar).slice(0, 60)}…</button>)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!running ? <button type="button" disabled={!enough} onClick={() => setAsking((v) => !v)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><Swords size={15} aria-hidden />{held ? t("Run the challenge round again", "أعد جولة التحدي") : t(`Run the challenge round (about US$${CHALLENGE_EST.toFixed(1)})`, `شغّل جولة التحدي (نحو ${CHALLENGE_EST.toFixed(1)} دولار)`)}</button> : <button type="button" onClick={() => ac.current?.abort()} className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] text-t0">{t("Stop", "إيقاف")}</button>}
        <span className="text-[11.5px] text-t2">{enough ? t(`${filed} councils on file will take part.`, `ستشارك ${filed} مجالس محفوظة.`) : t("At least two councils must be on file to debate: run them from their own tabs or from Complete the picture.", "يلزم مجلسان محفوظان على الأقل للنقاش: شغّلهما من تبويباتهما أو من إكمال الصورة.")}</span>
      </div>
      {asking && !running && <div role="alertdialog" aria-label={t("Confirm the challenge round", "تأكيد جولة التحدي")} className="mt-2 rounded-[10px] border border-accent/50 bg-bg3 p-3"><p className="text-[12.5px] leading-snug text-t0">{t(`Make the ${filed} councils on file for ${name} challenge each other? A cross-examiner, an evidence judge and an arbiter of the UAE's interest read their digests, test the disputed claims against the evidence and the web, and the two independent auditors check the result. ${topic.trim() ? "Your question steers the debate. " : ""}Estimated cost about US$${CHALLENGE_EST.toFixed(1)}, capped at US$1.00; about three minutes. Nothing is sent to anyone.`, `جعل المجالس الـ${filed} المحفوظة لـ${name} تتحدى بعضها؟ يقرأ مستجوِب وقاضي أدلة وحَكَم لمصلحة الإمارات خلاصاتها ويختبرون المسائل المتنازع عليها بالأدلة والويب، ويفحص المدققان المستقلان النتيجة. ${topic.trim() ? "سؤالكم يوجّه النقاش. " : ""}الكلفة التقديرية نحو ${CHALLENGE_EST.toFixed(1)} دولار بسقف 1.00 دولار؛ نحو ثلاث دقائق. لا يُرسل شيء إلى أحد.`)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void run()} className="inline-flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]">{t("Confirm and run", "أكّد وشغّل")}</button><button type="button" onClick={() => setAsking(false)} className="inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] text-t1">{t("Cancel", "إلغاء")}</button></div></div>}
      {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
      {(running || Object.keys(live).length > 0) && <div className="mt-2"><LiveDesk L={L} live={live} running={running} startedAt={startedAt} names={{ challenge: t("The challenge round", "جولة التحدي") }} />{running && note && <p className="mt-1 text-[11.5px] text-t2">{note}</p>}</div>}
    </div>
  );
}
