"use client";
import { useState } from "react";
import type { Challenge } from "@/lib/desk/challenge";
import { COURSE_C, COURSE_W, SEAT_BY, angleName, type SeatId } from "@/lib/roundtable/model";
import type { View } from "@/lib/roundtable/view";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { SCORE_C } from "../bird/visuals";

// THE DEBATE VIEW: the saved challenge round drawn as cards of challenge and rebuttal between councils (each marked with the side the evidence favoured), a scoreboard, the per-council scores of the UAE's position and of the country, the points of agreement, the dissent that was kept and the arbiter's verdict with its conditions and what would change it. Only the cards that touch the page's own angles are shown on a page with a lens; the rest are one click away.
const name = (id: SeatId, L: Lang) => { const s = SEAT_BY.get(id); return s ? (L === "ar" ? s.ar : s.en) : id; };
const Score = ({ n }: { n: number | null }) => (n == null ? <span className="text-t2">-</span> : <b style={{ color: SCORE_C(n) }}>{n}</b>);

export function Debate({ ch, v, L, onSel }: { ch: Challenge; v: View; L: Lang; onSel: (id: SeatId) => void }) {
  const t = useTr(L); const [all, setAll] = useState(false); const A = ch.arbiter; const lensOnly = v.lens.id !== "bird" && v.lens.id !== "desk" && v.lens.id !== "country"; const shown = lensOnly && all ? ch.challenges : v.cards; const hiddenN = ch.challenges.length - v.cards.length;
  const angs = (A?.angles ?? []).filter((a) => v.angles.includes(a.id));
  return (
    <div className="space-y-3">
      {(ch.headline || ch.bottomLine) && <div className="rounded-[12px] border border-line border-s-4 border-s-accent bg-bg2 p-3"><p className="text-[13.5px] font-semibold text-t0" dir="auto">{ch.headline}</p>{ch.bottomLine && <p className="mt-1 text-[12.5px] leading-snug text-t1" dir="auto">{ch.bottomLine}</p>}</div>}
      {ch.directiveAnswer && <div className="rounded-[12px] border border-ok/40 bg-ok/10 p-3"><span className="label">{t("The question put to the round", "السؤال المطروح على الجولة")}</span><p className="mt-1 text-[12.5px] leading-snug text-t0" dir="auto">{ch.directiveAnswer}</p></div>}
      {A && (
        <div className="rounded-[14px] border border-ok/50 bg-bg1 p-3.5">
          <div className="flex flex-wrap items-center gap-2"><h4 className="text-[14px] font-semibold text-t0">{t("The arbiter's verdict: the best course for the UAE", "حكم الحَكَم: أفضل مسار للإمارات")}</h4>{A.course && <Pill c={COURSE_C[A.course]}>{COURSE_W[A.course][L]}</Pill>}{A.confidence && <Pill c="var(--t2)">{t("confidence", "الثقة")} {A.confidence}</Pill>}{A.uaeScore != null && <Pill c="var(--accent)">{t("UAE position", "موقف الإمارات")} {A.uaeScore}</Pill>}{A.countryScore != null && <Pill c="var(--accent)">{t("country", "الدولة")} {A.countryScore}</Pill>}</div>
          <p className="mt-2 text-[13px] leading-snug text-t0" dir="auto">{A.recommendation}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {A.conditions.length > 0 && <div><span className="label">{t("Conditions", "الشروط")}</span><ul className="mt-1 list-disc space-y-1 ps-4 text-[12px] leading-snug text-t1">{A.conditions.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul></div>}
            {A.changeMind.length > 0 && <div><span className="label">{t("What would change it", "ما قد يغيّرها")}</span><ul className="mt-1 list-disc space-y-1 ps-4 text-[12px] leading-snug text-t1">{A.changeMind.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul></div>}
          </div>
          {A.ifWrong && <p className="mt-2 text-[12px] text-t1"><b className="text-t0">{t("If it is wrong:", "إن كانت خاطئة:")}</b> {A.ifWrong}</p>}
          {angs.length > 0 && <div className="mt-3"><span className="label">{t("The arbiter's score by angle on this page", "درجة الحَكَم بحسب الزوايا في هذه الصفحة")}</span><div className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">{angs.map((a) => <div key={a.id} className="flex items-center gap-2 text-[11.5px]" title={a.note}><span className="w-40 shrink-0 truncate text-t1">{angleName(a.id, L)}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3"><i className="block h-full" style={{ width: `${a.score}%`, background: SCORE_C(a.score) }} /></span><b className="w-7 text-end tabular-nums" style={{ color: SCORE_C(a.score) }}>{a.score}</b></div>)}</div></div>}
        </div>
      )}
      {ch.councils.length > 0 && (
        <div className="overflow-x-auto rounded-[12px] border border-line bg-bg1"><table className="w-full min-w-[620px] text-[11.5px]"><thead><tr className="text-t2"><th className="p-2 text-start font-semibold">{t("Council", "المجلس")}</th><th className="p-2 text-start font-semibold">{t("Course", "المسار")}</th><th className="p-2 font-semibold">{t("UAE position", "موقف الإمارات")}</th><th className="p-2 font-semibold">{t("Country", "الدولة")}</th><th className="p-2 text-start font-semibold">{t("Best argument", "أقوى حجة")}</th><th className="p-2 text-start font-semibold">{t("Weakest point", "أضعف نقطة")}</th></tr></thead>
          <tbody>{ch.councils.map((c) => <tr key={c.id} className="border-t border-line align-top"><td className="p-2"><button type="button" onClick={() => onSel(c.id)} className="text-start font-medium text-t0 hover:text-accent">{name(c.id, L)}</button><div className="text-[10.5px] text-t2" dir="auto">{c.reason}</div></td><td className="p-2">{c.course ? <Pill c={COURSE_C[c.course]}>{COURSE_W[c.course][L]}</Pill> : <span className="text-t2">-</span>}{c.confidence && <div className="text-[10.5px] text-t2">{c.confidence}</div>}</td><td className="p-2 text-center"><Score n={c.uaeScore} /></td><td className="p-2 text-center"><Score n={c.countryScore} /></td><td className="p-2 text-t1" dir="auto">{c.bestArgument}</td><td className="p-2 text-t1" dir="auto">{c.weakest}</td></tr>)}</tbody></table></div>
      )}
      {v.board.length > 0 && (
        <div className="rounded-[12px] border border-line bg-bg1 p-3"><span className="label">{t("Scoreboard: challenges the evidence settled", "لوحة النتائج: اعتراضات حسمتها الأدلة")}</span>
          <div className="mt-1.5 space-y-1">{v.board.map((b) => { const share = b.faced ? (b.won + b.drawn / 2) / b.faced : 0; const col = b.won > b.lost ? "var(--ok)" : b.won < b.lost ? "var(--risk)" : "var(--warn)"; return <div key={b.id} className="flex items-center gap-2 text-[11.5px]"><span className="w-44 shrink-0 truncate text-t1">{name(b.id, L)}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-bg3"><i className="block h-full" style={{ width: `${Math.round(share * 100)}%`, background: col }} /></span><b className="w-16 text-end tabular-nums text-t0">{b.won}-{b.lost}{b.drawn ? `-${b.drawn}` : ""}</b></div>; })}</div>
          <p className="mt-1 text-[10.5px] text-t2">{t("won - lost - drawn, over the challenges each council brought or faced; the bar is the share the evidence settled in its favour.", "فاز - خسر - تعادل، على الاعتراضات التي قدّمها كل مجلس أو واجهها؛ الشريط حصة ما حسمته الأدلة لصالحه.")}</p></div>
      )}
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="label">{t("Challenges and rebuttals", "الاعتراضات والردود")} ({shown.length})</span>{lensOnly && hiddenN > 0 && <button type="button" onClick={() => setAll((x) => !x)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-t1 hover:border-accent hover:text-accent">{all ? t("Only this page's angles", "زوايا هذه الصفحة فقط") : t(`Show the ${hiddenN} outside this page's angles`, `أظهر الـ${hiddenN} خارج زوايا هذه الصفحة`)}</button>}</div>
        <div className="grid gap-2.5 lg:grid-cols-2">{shown.map((c, i) => {
          const col = c.favours === "from" ? "var(--ok)" : c.favours === "to" ? "var(--risk)" : "var(--t2)"; const fav = c.favours === "from" ? name(c.from, L) : c.favours === "to" ? name(c.to, L) : t("neither", "لا أحد");
          return (
            <article key={i} className="rounded-[12px] border border-line bg-bg1 p-3" style={{ borderTop: `3px solid ${col}` }}>
              <div className="flex flex-wrap items-center justify-between gap-1.5"><b className="text-[12.5px] text-t0"><button type="button" onClick={() => onSel(c.from)} className="hover:text-accent">{name(c.from, L)}</button> <span className="text-t2" aria-hidden>→</span> <button type="button" onClick={() => onSel(c.to)} className="hover:text-accent">{name(c.to, L)}</button></b><Pill c={col}>{t("evidence favours", "الأدلة ترجّح")}: {fav}</Pill></div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-t0" dir="auto"><span className="label me-1">{t("Challenge", "الاعتراض")}</span>{c.challenge}</p>
              <p className="mt-1.5 rounded-[8px] bg-bg2 p-2 text-[12px] leading-snug text-t1" dir="auto"><span className="label me-1">{t("Rebuttal", "الرد")}</span>{c.rebuttal || t("none given", "لا ردّ")}</p>
              <p className="mt-1.5 text-[11px] text-t2" dir="auto">{c.angles.map((a) => angleName(a, L)).join(" · ")}{c.evidence ? ` · ${t("evidence", "الدليل")}: ${c.evidence}` : ""}{c.why ? ` · ${c.why}` : ""}</p>
            </article>
          ); })}</div>
        {shown.length === 0 && <p className="rounded-[12px] border border-dashed border-line p-3 text-[12px] text-t1">{t("No challenge in the saved round touches the angles of this page.", "لا اعتراض في الجولة المحفوظة يمسّ زوايا هذه الصفحة.")}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ch.agreements.length > 0 && <div className="rounded-[12px] border border-ok/40 bg-ok/10 p-3"><span className="label">{t("Where the councils agree", "أين تتفق المجالس")}</span><ul className="mt-1 list-disc space-y-1 ps-4 text-[12px] leading-snug text-t0">{ch.agreements.map((a, i) => <li key={i} dir="auto">{a.point}{a.councils.length ? <span className="text-t2"> ({a.councils.map((c) => SEAT_BY.get(c)?.short ?? c).join(", ")})</span> : null}</li>)}</ul></div>}
        {ch.dissent.length > 0 && <div className="rounded-[12px] border border-warn/40 bg-warn/10 p-3"><span className="label">{t("Dissent kept", "المخالفة المحفوظة")}</span><ul className="mt-1 list-disc space-y-1 ps-4 text-[12px] leading-snug text-t0">{ch.dissent.map((d, i) => <li key={i} dir="auto"><b>{name(d.council, L)}:</b> {d.position} <span className="text-t2">{d.why}</span></li>)}</ul></div>}
      </div>
      {ch.gaps.length > 0 && <p className="text-[11.5px] leading-snug text-t2"><b className="text-t1">{t("Could not be established:", "لم يُثبَت:")}</b> {ch.gaps.join(" · ")}</p>}
      {ch.partial && <p className="rounded-[10px] border border-warn/40 bg-warn/10 p-2 text-[12px] text-t0">{t("The result was cut off before it finished; what is complete is shown.", "انقطعت النتيجة قبل اكتمالها؛ المعروض هو المكتمل.")}</p>}
    </div>
  );
}
