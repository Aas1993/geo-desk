"use client";
import { COURSES, COURSE_C, COURSE_W, NO_COURSE, SEAT_BY, angleName, angleShort, type SeatId } from "@/lib/roundtable/model";
import { deltaColor, ring } from "@/lib/roundtable/consensus";
import type { SeatReading } from "@/lib/roundtable/read";
import type { View } from "@/lib/roundtable/view";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { SCORE_C } from "../bird/visuals";

// The Round Table's figures, drawn from the same view the PDF is drawn from (src/lib/roundtable/view.ts): the round-table diagram with a seat for each council, the posture scale, the consensus meter and the agreement matrix. Seats and matrix rows are buttons: a click selects the council.
const name = (id: SeatId, L: Lang) => { const s = SEAT_BY.get(id); return s ? (L === "ar" ? s.ar : s.en) : id; };
export const courseColor = (c: SeatReading["course"]) => (c ? COURSE_C[c] : NO_COURSE);

/** The table: an ellipse with a seat for each council (filled with its course's colour, dashed and empty when it has not been run), the consensus in the middle and, when a challenge is on file, an arrow for each challenge (green when the evidence favoured the challenger, red when it favoured the challenged). */
export function TableDiagram({ v, L, sel, onSel }: { v: View; L: Lang; sel: SeatId | null; onSel: (id: SeatId) => void }) {
  const t = useTr(L); const W = 800; const H = 340; const cx = W / 2; const cy = H / 2; const seats = v.councils; const pts = ring(seats.length, cx, cy, 240, 112); const at = new Map(seats.map((s, i) => [s.id, pts[i]]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ direction: "ltr" }} className="mx-auto w-full max-w-[680px]" role="group" aria-label={t("Round table of the councils", "الطاولة المستديرة للمجالس")}>
      <defs><marker id="rt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--t2)" /></marker></defs>
      <ellipse cx={cx} cy={cy} rx={160} ry={70} fill="rgba(120,140,170,0.12)" stroke="var(--line)" strokeWidth={2} />
      {(v.challenge?.challenges ?? []).slice(0, 12).map((c, i) => { const a = at.get(c.from); const b = at.get(c.to); if (!a || !b) return null; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.favours === "from" ? "var(--ok)" : c.favours === "to" ? "var(--risk)" : "var(--t2)"} strokeWidth={1.6} opacity={0.55} markerEnd="url(#rt-ah)" />; })}
      {v.cons.score != null ? <><text x={cx} y={cy - 2} textAnchor="middle" fontSize={30} fontWeight={700} fill={SCORE_C(v.cons.score)}>{v.cons.score}</text><text x={cx} y={cy + 14} textAnchor="middle" fontSize={9.5} fill="var(--t2)">{t("consensus", "الإجماع")}</text></> : <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="var(--t2)">{t("too few councils to compare", "مجالس أقل من اللازم للمقارنة")}</text>}
      {seats.map((s, i) => {
        const p = pts[i]; const right = Math.cos(p.a) > 0.3; const left = Math.cos(p.a) < -0.3; const anchor = right ? "start" : left ? "end" : "middle"; const lx = p.x + (right ? 26 : left ? -26 : 0); const ly = p.y + (Math.abs(Math.cos(p.a)) <= 0.3 ? (Math.sin(p.a) > 0 ? 38 : -30) : 4); const col = courseColor(s.course); const on = s.id === sel; const nm = name(s.id, L);
        return (
          <g key={s.id} role="button" tabIndex={0} aria-label={`${nm}: ${s.onFile ? (s.course ? COURSE_W[s.course][L] : t("no clear course", "لا مسار واضح")) : t("not run", "لم يُشغَّل")}`} aria-pressed={on} onClick={() => onSel(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSel(s.id); } }} className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--accent)]">
            {on && <circle cx={p.x} cy={p.y} r={25} fill="none" stroke="var(--accent)" strokeWidth={2} />}
            <circle cx={p.x} cy={p.y} r={20} fill={s.onFile ? col : "var(--bg1)"} stroke={s.onFile ? col : "var(--line)"} strokeWidth={2} strokeDasharray={s.onFile ? undefined : "3 3"} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={s.onFile ? "#fff" : "var(--t2)"}>{SEAT_BY.get(s.id)!.short}</text>
            <text x={lx} y={ly} textAnchor={anchor} fontSize={9.5} fill={s.onFile ? "var(--t0)" : "var(--t2)"}>{nm.length > 26 ? `${nm.slice(0, 25)}…` : nm}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** The posture scale: hold, hedge, staged, deepen; each council that gave a course sits on it. */
export function PostureScale({ v, L, sel, onSel }: { v: View; L: Lang; sel: SeatId | null; onSel: (id: SeatId) => void }) {
  const t = useTr(L);
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {COURSES.map((c) => { const here = v.filed.filter((r) => r.course === c); const data = v.data?.course === c;
          return (
            <div key={c} className="text-center">
              <div className="flex min-h-[26px] flex-wrap items-center justify-center gap-1">{here.map((r) => <button key={r.id} type="button" onClick={() => onSel(r.id)} title={name(r.id, L)} aria-pressed={sel === r.id} className="inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[10px] font-bold text-white" style={{ background: COURSE_C[c], outline: sel === r.id ? "2px solid var(--accent)" : undefined }}>{SEAT_BY.get(r.id)!.short}</button>)}{data && <span title={t("The rule-built posture from the data", "الموقف المبني بالقواعد من البيانات")} className="inline-grid h-6 min-w-6 place-items-center rounded-full border border-dashed px-1.5 text-[10px] font-bold" style={{ borderColor: COURSE_C[c], color: COURSE_C[c] }}>DB</span>}</div>
              <div className="mt-1 h-1.5 rounded-full" style={{ background: here.length || data ? COURSE_C[c] : "var(--line)" }} />
              <span className="text-[11px] font-semibold" style={{ color: here.length || data ? COURSE_C[c] : "var(--t2)" }}>{COURSE_W[c][L]} <span className="font-normal text-t2">{here.length || ""}</span></span>
            </div>
          ); })}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-t2">{t("DB is the rule-built posture from the Case File data. A council whose own text states no clear course is not placed.", "DB هو الموقف المبني بالقواعد من بيانات ملف الحالة. المجلس الذي لا يذكر نصه مسارًا واضحًا لا يوضع على المقياس.")}</p>
    </div>
  );
}

/** The consensus meter: how far the councils that gave a course agree, and which course most give. */
export function ConsensusMeter({ v, L }: { v: View; L: Lang }) {
  const t = useTr(L); const c = v.cons; const word = c.label === "strong" ? t("strong consensus", "إجماع قوي") : c.label === "majority" ? t("a majority", "أغلبية") : c.label === "split" ? t("split", "منقسمة") : t("too few to compare", "قليلة للمقارنة");
  return (
    <div className="rounded-[12px] border border-line bg-bg2 p-3" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.score ?? undefined} aria-label={t("Consensus on the course", "الإجماع على المسار")}>
      <div className="flex items-baseline justify-between gap-2"><span className="label">{t("Consensus on the course", "الإجماع على المسار")}</span><b className="text-[22px]" style={{ color: c.score != null ? SCORE_C(c.score) : "var(--t2)" }}>{c.score ?? "-"}</b></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg3"><div className="h-full rounded-full" style={{ width: `${c.score ?? 0}%`, background: c.score != null ? SCORE_C(c.score) : "var(--line)" }} /></div>
      <p className="mt-1.5 text-[12px] leading-snug text-t1">{word}{c.modal ? <> · {t("most councils give", "تعطي أغلب المجالس")} <b style={{ color: COURSE_C[c.modal] }}>{COURSE_W[c.modal][L]}</b> ({Math.round(c.share * 100)}%)</> : null}{v.data?.course && c.modal && v.data.course !== c.modal ? <> · <span className="text-warn">{t("the rule-built posture says", "الموقف المبني بالقواعد يقول")} {COURSE_W[v.data.course][L]}</span></> : null}</p>
      <p className="mt-0.5 text-[10.5px] text-t2">{t("100 when every council sits on one course; 0 when they sit at the two ends of the scale.", "100 حين تتفق المجالس على مسار واحد؛ 0 حين تقف في طرفي المقياس.")}</p>
    </div>
  );
}

/** The agreement and dissent matrix: councils by angle. Each cell is how that council's own text (or its own scorecard, or its challenge score) reads the angle; the colour is the distance from the rule-built baseline. */
export function Matrix({ v, L, sel, onSel, hot, onHot }: { v: View; L: Lang; sel: SeatId | null; onSel: (id: SeatId) => void; hot: string | null; onHot: (a: string | null) => void }) {
  const t = useTr(L);
  return (
    <div>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-separate border-spacing-0.5 text-[11px]">
        <thead><tr><th className="p-1 text-start font-semibold text-t1">{t("Council", "المجلس")}</th>{v.angles.map((a) => <th key={a} className="p-0"><button type="button" onClick={() => onHot(hot === a ? null : a)} aria-pressed={hot === a} title={angleName(a, L)} className={`w-full rounded px-0.5 py-1 text-[9.5px] leading-tight font-semibold ${hot === a ? "bg-accent text-[var(--accent-ink)]" : "text-t1 hover:text-accent"}`}>{angleShort(a, L)}</button></th>)}</tr></thead>
        <tbody>
          {v.rows.map((r) => (
            <tr key={r.id}>
              <th className="max-w-[180px] truncate p-0 text-start font-normal">{r.id === "data" ? <span className="px-1 text-[11px] font-semibold text-t1">{t("Baseline (rule-built)", "الأساس (بالقواعد)")}</span> : <button type="button" onClick={() => onSel(r.id)} aria-pressed={sel === r.id} className={`w-full truncate rounded px-1 py-1 text-start text-[11px] ${sel === r.id ? "bg-accent text-[var(--accent-ink)]" : "text-t0 hover:text-accent"}`}>{name(r.id, L)}</button>}</th>
              {r.cells.map((c) => <td key={c.angle} title={`${angleName(c.angle, L)}: ${c.reading ?? (c.state === "thin" ? t("too few sentences to read", "جمل قليلة للقراءة") : t("silent", "صامت"))}${c.from ? ` · ${c.from === "text" ? t("read from its text", "مقروء من نصه") : c.from === "scorecard" ? t("its own scorecard", "بطاقته الخاصة") : c.from === "challenge" ? t("scored in the challenge", "مُقيَّم في التحدي") : t("rule-built", "بالقواعد")}${c.n ? ` (${c.n})` : ""}` : ""}${c.delta != null ? ` · ${c.delta > 0 ? "+" : ""}${c.delta} ${t("vs baseline", "عن الأساس")}` : ""}`} className={`rounded text-center font-medium tabular-nums ${hot === c.angle ? "ring-1 ring-[var(--accent)]" : ""}`} style={{ background: r.id === "data" ? "var(--bg3)" : deltaColor(c.delta), color: "var(--t0)", height: 26 }}>{c.reading != null ? <>{c.reading}{c.from === "challenge" ? <sup className="text-[8px]">◆</sup> : c.from === "scorecard" ? <sup className="text-[8px]">■</sup> : null}</> : <span className="text-t2">{c.state === "thin" ? "~" : "·"}</span>}</td>)}
            </tr>
          ))}
          <tr><th className="p-1 text-start text-[11px] font-semibold text-t1">{t("Split", "الانقسام")}</th>{v.spreads.map((s) => <td key={s.angle} title={s.n >= 2 ? `${t("spread", "التباين")} ${s.sd}, ${s.min}-${s.max}` : t("fewer than two councils read it", "أقل من مجلسين يقرآنها")} className={`text-center text-[11px] font-bold ${s.dissent ? "text-risk" : "text-t2"}`}>{s.n >= 2 ? (s.dissent ? "≠" : "=") : "·"}</td>)}</tr>
        </tbody>
      </table></div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-t2">{t("Each number is how that council's own saved text reads the angle (0 to 100): a reading of its tone, not a score the council gave; ~ means too few sentences to read and · that it is silent. ■ is the council's own scorecard rating and ◆ its score in the challenge round. Colour is the distance from the rule-built baseline after allowing for the council\'s overall tone (analytic prose is written about risk, so a council that writes cautiously throughout is not flagged on every angle): green reads the angle warmer than the baseline, red cooler; ≠ marks an angle the councils split on. Click a council or an angle to follow it.", "كل رقم هو قراءة النص المحفوظ للمجلس نفسه للزاوية (0 إلى 100): قراءة لنبرته لا درجة وضعها المجلس؛ ~ جمل قليلة للقراءة و· أنه صامت. ■ تقييم بطاقته الخاصة و◆ درجته في جولة التحدي. اللون هو البعد عن الأساس المبني بالقواعد بعد مراعاة نبرة المجلس العامة (النص التحليلي يُكتب عن المخاطر فالمجلس الحذر في كل نصه لا يُعلَّم في كل زاوية): الأخضر يقرأ الزاوية أدفأ من الأساس والأحمر أبرد؛ ≠ زاوية انقسمت عليها المجالس. انقر مجلسًا أو زاوية لتتبّعها.")}</p>
    </div>
  );
}
