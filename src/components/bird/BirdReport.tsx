"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Eye, Flag, Lightbulb, Shield, TrendingUp, Wheat, Zap } from "lucide-react";
import type { Bird, From } from "@/lib/bird/consolidate";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { PlaybookView } from "../case/PlaybookView";
import { Bar, Freshness, Gauge, POS_COLOR, PostureScale, SCORE_C, srcColor } from "./visuals";

const WORDS: Record<"en" | "ar", Record<string, string>> = { en: { deepen: "deepen", staged: "staged", hedge: "hedge", hold: "hold" }, ar: { deepen: "تعميق", staged: "على مراحل", hedge: "تحوّط", hold: "ترقّب" } };
const GRADE_C: Record<string, string> = { A: "var(--ok)", B: "var(--ok)", C: "var(--warn)", D: "var(--risk)" };
const SHORT: Record<string, string> = { "Case File posture (free, from the data)": "C", "THE KING's decision": "K", "The Ministry's posture": "M" };
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n)}…` : t);
const verdictColor = (v: string) => { const w = v.split(":").pop() ?? v; return /reject|fail|not/i.test(w) ? "var(--risk)" : /revise|partial|caution/i.test(w) ? "var(--warn)" : "var(--ok)"; };
const SourceChip = ({ f }: { f: From }) => <Link href={f.href} className="inline-flex items-center gap-1 rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1 hover:text-accent"><span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: srcColor(f.tab) }} />{f.tab}</Link>;
const SECTIONS = [["course", "The course", "المسار"], ["flags", "Red flags", "الأعلام الحمراء"], ["councils", "Council by council", "مجلس بمجلس"], ["insights", "Insights", "الرؤى"], ["interests", "Interests", "المصالح"], ["playbook", "Playbook", "دليل فن الحكم"], ["moves", "Next moves", "الخطوات"], ["opps", "Opportunities", "الفرص"], ["risks", "Risks", "المخاطر"], ["security", "Security", "الأمن"], ["evidence", "Readiness", "الجاهزية"], ["profile", "Country brief", "موجز الدولة"], ["ask", "Ask a question", "اسأل"], ["score", "Country score", "درجة الدولة"]] as const;

const Stat = ({ n, label, c, icon }: { n: string | number; label: string; c: string; icon: React.ReactNode }) => <li className="flex items-center gap-2.5 rounded-[12px] border border-line bg-bg2 p-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-[9px]" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>{icon}</span><span><b className="numt block text-[18px] leading-none text-t0">{n}</b><span className="text-[11px] text-t2">{label}</span></span></li>;
/** THE REPORT of the bird's eye view, drawn: a dashboard first (readiness, the course on its scale, the counts that matter), then each section as something to look at rather than a list to read. Every figure and every line comes from the consolidated brief, and every line still names its tab. */
export function BirdReport({ bird, L, missing }: { bird: Bird; L: Lang; missing: Bird["evidence"] }) {
  const t = useTr(L); const lg: "en" | "ar" = L === "ar" ? "ar" : "en"; const T = (x: { en: string; ar: string }) => x[lg]; const words = WORDS[lg]; const [allFlags, setAllFlags] = useState(false);
  const crit = bird.redFlags.filter((f) => f.severity === "critical").length; const serious = bird.redFlags.length - crit; const onFile = bird.evidence.filter((e) => e.onFile); const ages = onFile.map((e) => e.ageDays ?? 0);
  const readers = bird.stance.rows.map((r) => ({ id: r.from.tab, short: SHORT[r.label.en] ?? "•", name: T(r.label).replace(/ \(.*\)$/, ""), value: r.value }));
  const lead = bird.stance.rows.find((r) => r.from.tab === "THE KING" && r.value) ?? bird.stance.rows.find((r) => r.value);
  const agree = bird.stance.agreement; const agreeC = agree === "aligned" ? "var(--ok)" : agree === "unknown" ? "var(--t2)" : "var(--warn)"; const agreeW = agree === "aligned" ? t("aligned", "متفقة") : agree === "split" ? t("split", "منقسمة") : agree === "partial" ? t("partly aligned", "متفقة جزئيًا") : t("not enough to compare", "لا يكفي للمقارنة");
  const headline = (tab: string) => bird.insights.find((x) => x.from.tab === tab)?.text;
  const when = bird.actions.reduce<{ when: string; items: Bird["actions"] }[]>((g, a) => { const f = g.find((x) => x.when === a.when); if (f) f.items.push(a); else g.push({ when: a.when, items: [a] }); return g; }, []);
  const kinds = bird.opportunities.reduce<{ kind: string; items: Bird["opportunities"] }[]>((g, o) => { const k = T(o.kind); const f = g.find((x) => x.kind === k); if (f) f.items.push(o); else g.push({ kind: k, items: [o] }); return g; }, []);
  const lvls = [["high", t("High impact", "أثر مرتفع"), "var(--risk)"], ["medium", t("Medium", "متوسط"), "var(--warn)"], ["low", t("Low", "منخفض"), "var(--t2)"]] as const;
  return (
    <div className="space-y-4">
      {/* ---- the dashboard */}
      <section aria-label={t("At a glance", "نظرة سريعة")} className="rounded-[16px] border border-line bg-bg1 p-4" style={{ backgroundImage: "radial-gradient(600px 220px at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 70%)" }}>
        <div className="grid items-center gap-5 md:grid-cols-[auto_1fr]">
          <Gauge value={bird.readiness.score} label={t("decision readiness", "جاهزية القرار")} sub={`${bird.readiness.checks.filter((c) => c.ok).length}/${bird.readiness.checks.length} ${t("checks", "فحوص")}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="label">{t("The course", "المسار")}</p><Pill c={agreeC}>{agreeW}</Pill></div>
            <p className="display mt-0.5 text-[30px] font-semibold capitalize leading-tight" style={{ color: lead?.value ? POS_COLOR[lead.value] : "var(--t2)" }}>{lead?.value ? words[lead.value] : t("not decided yet", "لم يُحسم بعد")}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-t1" dir="auto">{T(bird.stance.note)}</p>
            <div className="mt-3"><PostureScale readers={readers} words={words} L={lg} /></div>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat n={crit} label={t("critical flags", "أعلام حرجة")} c={crit ? "var(--risk)" : "var(--ok)"} icon={<Flag size={16} />} />
          <Stat n={serious} label={t("serious flags", "أعلام جادة")} c={serious ? "var(--warn)" : "var(--ok)"} icon={<AlertTriangle size={16} />} />
          <Stat n={`${onFile.length}/${bird.evidence.length}`} label={t("councils on file", "مجالس محفوظة")} c={SCORE_C(Math.round((onFile.length / Math.max(1, bird.evidence.length)) * 100))} icon={<Lightbulb size={16} />} />
          <Stat n={ages.length ? `${Math.min(...ages)} ${t("d", "يوم")}` : "-"} label={t("freshest product", "أحدث منتج")} c="var(--accent)" icon={<CalendarClock size={16} />} />
        </ul>
        <nav aria-label={t("Sections", "الأقسام")} className="mt-3 flex flex-wrap gap-1.5">{SECTIONS.map(([id, en, ar]) => <a key={id} href={`#bird-${id}`} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11.5px] text-t1 hover:border-accent hover:text-accent">{t(en, ar)}</a>)}</nav>
      </section>

      {/* ---- the three readings of the course */}
      <div id="bird-course" className="scroll-mt-20"><Block title={t("The course: three readings", "المسار: ثلاث قراءات")} hint={t("The free Case File posture, THE KING's decision and the Ministry's posture side by side.", "موقف ملف الحالة المجاني وقرار القرار النهائي وموقف الوزارة جنبًا إلى جنب.")}>
        <ul className="grid gap-2 md:grid-cols-3">{bird.stance.rows.map((r) => <li key={r.from.tab} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${r.value ? POS_COLOR[r.value] : "var(--line)"}` }}><p className="label">{T(r.label)}</p><p className="mt-1 text-[20px] font-semibold capitalize" style={{ color: r.value ? POS_COLOR[r.value] : "var(--t2)" }}>{r.value ? words[r.value] : t("not on file", "غير محفوظ")}</p><p className="mt-0.5 text-[12px] leading-snug text-t1" dir="auto">{r.detail}</p><div className="mt-1.5"><SourceChip f={r.from} /></div></li>)}</ul></Block></div>

      {/* ---- red flags */}
      {bird.redFlags.length > 0 && <div id="bird-flags" role="alert" className="scroll-mt-20 rounded-[14px] border border-risk/50 bg-risk/10 p-3.5">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-risk"><Flag size={15} aria-hidden /> {bird.redFlags.length} {t("red flags from the independent auditors across the tabs", "أعلام حمراء من المدققين المستقلين عبر التبويبات")} <span className="text-[11.5px] font-normal text-t1">({crit} {t("critical", "حرج")}, {serious} {t("serious", "جاد")})</span></p>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">{bird.redFlags.slice(0, allFlags ? 40 : 4).map((f, i) => <li key={i} className="rounded-[10px] bg-bg1 p-2.5 text-[12.5px] leading-snug" style={{ borderInlineStart: `4px solid ${f.severity === "critical" ? "var(--risk)" : "var(--warn)"}` }}><div className="flex flex-wrap items-center gap-1.5"><Pill c={f.severity === "critical" ? "var(--risk)" : "var(--warn)"}>{f.severity === "critical" ? t("critical", "حرج") : t("serious", "جاد")}</Pill><SourceChip f={f.from} /></div><b className="mt-1 block text-t0" dir="auto">{f.flag}</b>{f.why && <p className="mt-0.5 text-t1" dir="auto">{f.why}</p>}{f.ask && <p className="mt-0.5 text-ok" dir="auto">→ {f.ask}</p>}</li>)}</ul>
        {bird.redFlags.length > 4 && <button type="button" onClick={() => setAllFlags((v) => !v)} className="mt-2 text-[12px] text-accent hover:underline">{allFlags ? t("Show fewer", "عرض أقل") : t(`Show all ${Math.min(bird.redFlags.length, 40)} flags`, `عرض كل الأعلام (${Math.min(bird.redFlags.length, 40)})`)}</button>}</div>}

      {/* ---- council by council */}
      <div id="bird-councils" className="scroll-mt-20"><Block title={t("Council by council", "مجلس بمجلس")} hint={t("Each council's headline, how fresh it is, how it graded and what the two independent auditors said. A dashed tile is a council that has not been run.", "خلاصة كل مجلس وحداثته وتقديره وما قاله المدققان المستقلان. البطاقة المتقطعة مجلس لم يُشغَّل.")}>
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{bird.evidence.map((x) => { const h = headline(x.from.tab); const verd = x.verdicts ? x.verdicts.split(/[;,]/).map((v) => v.trim()).filter(Boolean) : []; return (
          <li key={x.id} className={`rounded-[12px] p-3 ${x.onFile ? "border border-line bg-bg2" : "border border-dashed border-line bg-bg1"}`} style={x.onFile ? { borderTop: `3px solid ${srcColor(x.from.tab)}` } : undefined}>
            <div className="flex items-start justify-between gap-2"><Link href={x.from.href} className="text-[13px] font-semibold text-t0 hover:text-accent">{T(x.label)}</Link>{x.onFile && x.grade ? <span title={t("quality grade", "تقدير الجودة")} className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[14px] font-bold" style={{ background: `color-mix(in srgb, ${GRADE_C[x.grade]} 18%, transparent)`, color: GRADE_C[x.grade] }}>{x.grade}</span> : null}</div>
            {x.onFile ? <>
              {h && <p className="mt-1.5 text-[12px] leading-snug text-t1" dir="auto">{cut(h, 170)}</p>}
              <div className="mt-2"><p className="mb-0.5 text-[10.5px] text-t2">{t("freshness", "الحداثة")}</p><Freshness days={x.ageDays ?? 0} /></div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">{verd.map((v) => <span key={v} className="rounded-full px-2 py-0.5 text-[10.5px]" style={{ background: `color-mix(in srgb, ${verdictColor(v)} 16%, transparent)`, color: verdictColor(v) }}>{v}</span>)}<span className="ms-auto inline-flex items-center gap-1 text-[11px]" style={{ color: x.flags ? "var(--warn)" : "var(--ok)" }}><Flag size={12} aria-hidden />{x.flags}</span></div></>
              : <p className="mt-1.5 text-[12px] text-t2">{t("Not run for this country.", "لم يُشغَّل لهذه الدولة.")} <Link href={x.from.href} className="text-accent hover:underline">{t("Run it", "شغّله")}</Link></p>}
          </li>); })}</ul>
        {missing.length > 0 && <p className="mt-2 text-[12px] text-warn">{t("Run before deciding:", "شغّل قبل القرار:")} {missing.map((x, i) => <span key={x.id}>{i ? " · " : ""}<Link href={x.from.href} className="underline">{T(x.label)}</Link></span>)}</p>}</Block></div>

      {/* ---- insights */}
      <div id="bird-insights" className="scroll-mt-20"><Block title={t("Top strategic insights", "أهم الرؤى الاستراتيجية")} hint={t("The headline each tab gives, in the order that matters for the decision. The colour bar and the chip name the tab it came from.", "الخلاصة التي يقدمها كل تبويب بالترتيب الأهم للقرار. يدل الشريط الملوّن والشارة على التبويب المصدر.")}>
        {bird.insights.length ? <ol className="grid gap-2 md:grid-cols-2">{bird.insights.map((x, i) => <li key={i} className="flex gap-2.5 rounded-[12px] bg-bg2 p-3" style={{ borderInlineStart: `4px solid ${srcColor(x.from.tab)}` }}><span className="numt mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-bg3 text-[11px] font-bold text-t1">{i + 1}</span><div className="min-w-0"><p className={`leading-snug text-t0 ${i === 0 ? "text-[14.5px] font-semibold" : "text-[13px]"}`} dir="auto">{x.text}</p>{x.sub && <p className="mt-0.5 text-[11.5px] leading-snug text-t2" dir="auto">{x.sub}</p>}<div className="mt-1.5"><SourceChip f={x.from} /></div></div></li>)}</ol> : <p className="text-[12.5px] text-t1">{t("No decision tab has been run for this country yet.", "لم يُشغَّل أي تبويب قرار لهذه الدولة بعد.")}</p>}</Block></div>

      {/* ---- interests and next moves */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div id="bird-interests" className="scroll-mt-20"><Block title={t("The UAE's ranked interests here", "مصالح الإمارات هنا مرتبة")} hint={t("The Ministry's priorities, with the progress recorded against each.", "أولويات الوزارة مع التقدم المسجّل لكل منها.")}>
          {bird.interests.length ? <ol className="space-y-2.5">{bird.interests.map((x) => <li key={x.rank} className="rounded-[12px] bg-bg2 p-3"><div className="flex items-start gap-2.5"><span className="numt grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>{x.rank}</span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold leading-snug text-t0" dir="auto">{x.title}</p><div className="mt-1"><Pill c="var(--c2)">{x.interest}</Pill></div><div className="mt-2">{x.progress != null ? <Bar share={x.progress} color="var(--ok)" label={t("progress", "التقدم")} /> : <p className="text-[11px] text-t2">{t("progress not recorded", "لم يُسجَّل تقدم")}</p>}</div></div></div></li>)}</ol>
            : <p className="text-[12.5px] text-t1">{t("The Ministry's Council has not set priorities for this country.", "لم يضع مجلس الوزارة أولويات لهذه الدولة.")} <Link href="/mofa" className="text-accent hover:underline">{t("Run it", "شغّله")}</Link></p>}</Block></div>
        <div id="bird-moves" className="scroll-mt-20"><Block title={t("Next moves", "الخطوات التالية")} hint={t("Conditions before acting, then the mission's tasks and the embassy's calendar, in time order as the tabs gave them.", "الشروط قبل التنفيذ ثم مهام البعثة وتقويم السفارة بحسب الزمن كما قدّمتها التبويبات.")}>
          {when.length ? <ol className="ms-1.5 space-y-3 border-s-2 border-line ps-4">{when.map((g, gi) => <li key={gi} className="relative"><span aria-hidden className="absolute -start-[23px] top-0.5 grid size-4 place-items-center rounded-full bg-bg1" style={{ border: `2px solid ${gi === 0 ? "var(--warn)" : "var(--accent)"}` }} /><p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t0"><CalendarClock size={13} aria-hidden className="text-t2" />{g.when}</p><ul className="mt-1 space-y-1.5">{g.items.map((a, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug"><span className="text-t0" dir="auto">{a.what}</span><span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-t2"><span>{a.owner}</span><SourceChip f={a.from} /></span></li>)}</ul></li>)}</ol> : <p className="text-[12.5px] text-t1">{t("Nothing to schedule yet.", "لا شيء للجدولة بعد.")}</p>}</Block></div>
      </div>

      {/* ---- opportunities and risks */}
      {bird.playbook && <div id="bird-playbook" className="scroll-mt-20"><PlaybookView pb={bird.playbook[lg]} L={L} enrichment={bird.playbook.enrichment[lg]} /></div>}

      <div id="bird-opps" className="scroll-mt-20"><Block title={t("Opportunities", "الفرص")} hint={t("Grouped by kind: trade and investment gaps, UAE companies, sectors to support, and the recommended course.", "مجمّعة بحسب النوع: فجوات التجارة والاستثمار وشركات إماراتية وقطاعات تُدعم والمسار الموصى به.")}>
        {kinds.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{kinds.map((g) => <div key={g.kind} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: "3px solid var(--ok)" }}><p className="flex items-center gap-1.5 text-[12px] font-semibold text-ok"><TrendingUp size={14} aria-hidden />{g.kind}<span className="numt ms-auto text-t2">{g.items.length}</span></p><ul className="mt-1.5 space-y-2">{g.items.map((x, i) => <li key={i} className="text-[12.5px] leading-snug"><span className="text-t0" dir="auto">{x.text}</span>{x.sub && <span className="mt-0.5 block text-[11.5px] text-t1" dir="auto">{x.sub}</span>}<span className="mt-1 block"><SourceChip f={x.from} /></span></li>)}</ul></div>)}</div>
          : <p className="text-[12.5px] text-t1">{t("Run the embassy intelligence sitting to list the gaps, the companies and the sectors.", "شغّل جلسة استخبارات السفارة لتُدرج الفجوات والشركات والقطاعات.")}</p>}</Block></div>
      <div id="bird-risks" className="scroll-mt-20"><Block title={t("Risks", "المخاطر")} hint={t("Sorted into impact bands, with the mitigation each tab gave.", "مرتبة في نطاقات الأثر مع التخفيف الذي قدّمه كل تبويب.")}>
        {bird.risks.length ? <div className="grid gap-3 md:grid-cols-3">{lvls.map(([lv, label, c]) => { const xs = bird.risks.filter((r) => r.level === lv); return (
          <div key={lv} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${c}` }}><p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: c }}><AlertTriangle size={14} aria-hidden />{label}<span className="numt ms-auto text-t2">{xs.length}</span></p>
            {xs.length ? <ul className="mt-1.5 space-y-2">{xs.map((x, i) => <li key={i} className="text-[12.5px] leading-snug"><span className="text-t0" dir="auto">{x.text}</span>{x.sub && <span className="mt-0.5 block text-[11.5px] text-t1" dir="auto"><b className="text-t2">{t("Mitigation:", "التخفيف:")}</b> {x.sub}</span>}<span className="mt-1 block"><SourceChip f={x.from} /></span></li>)}</ul> : <p className="mt-1.5 text-[11.5px] text-t2">{t("none listed", "لا شيء")}</p>}</div>); })}</div>
          : <p className="text-[12.5px] text-t1">{t("No risk register on file.", "لا سجل مخاطر محفوظ.")}</p>}</Block></div>

      {/* ---- the security triad and what to watch */}
      {bird.triad.length > 0 && <div id="bird-security" className="scroll-mt-20"><Block title={t("National, energy and food security", "الأمن الوطني وأمن الطاقة والأمن الغذائي")} hint={t("What the security experts of each council said.", "ما قاله خبراء الأمن في كل مجلس.")}>
        <div className="grid gap-2.5 md:grid-cols-3">{["National security", "Energy security", "Food security"].map((k, i) => { const rows = bird.triad.filter((x) => x.label.en === k); const first = rows[0]; if (!first) return null; const Icon = i === 0 ? Shield : i === 1 ? Zap : Wheat; const c = ["var(--accent)", "var(--warn)", "var(--ok)"][i]; return (
          <div key={k} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${c}` }}><p className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: c }}><Icon size={15} aria-hidden />{T(first.label)}</p><ul className="mt-1.5 space-y-2">{rows.map((x, j) => <li key={j} className="text-[12.5px] leading-snug"><span className="text-t0" dir="auto">{x.headline}</span><span className="mt-1 block"><SourceChip f={x.from} /></span></li>)}</ul></div>); })}</div></Block></div>}
      {bird.watch.length > 0 && <Block title={t("What to watch", "ما يجب رصده")} hint={t("The indicator and the threshold at which the course should be reviewed.", "المؤشر والحد الذي يُراجع عنده المسار.")}><ul className="grid gap-2 md:grid-cols-2">{bird.watch.map((x, i) => <li key={i} className="flex gap-2.5 rounded-[12px] bg-bg2 p-3"><Eye size={16} aria-hidden className="mt-0.5 shrink-0 text-accent" /><div className="min-w-0"><p className="text-[12.5px] leading-snug text-t0" dir="auto">{x.text}</p>{x.sub && <p className="mt-0.5 text-[11.5px] leading-snug text-warn" dir="auto">{x.sub}</p>}<div className="mt-1"><SourceChip f={x.from} /></div></div></li>)}</ul></Block>}

      {/* ---- readiness and the free facts */}
      <div id="bird-evidence" className="scroll-mt-20"><Block title={t("Decision readiness", "جاهزية القرار")} hint={t("The checks that make up the score. A cross is something to fix before a final decision.", "الفحوص التي تكوّن الدرجة. وعلامة × تعني أمرًا يُعالج قبل القرار النهائي.")}>
        <Bar share={bird.readiness.score / 100} color={SCORE_C(bird.readiness.score)} label={t("decision readiness", "جاهزية القرار")} />
        <ul className="mt-3 grid gap-1.5 md:grid-cols-2">{bird.readiness.checks.map((c, i) => <li key={i} className="flex items-start gap-2 rounded-[10px] bg-bg2 p-2 text-[12.5px] leading-snug"><span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${c.ok ? "var(--ok)" : "var(--risk)"} 18%, transparent)`, color: c.ok ? "var(--ok)" : "var(--risk)" }}>{c.ok ? "✓" : "✗"}</span><span className="text-t0">{T(c.label)}</span></li>)}</ul></Block></div>
      {bird.facts.length > 0 && <Block title={t("Free facts from the Case File", "حقائق مجانية من ملف الحالة")}><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{bird.facts.map((f, i) => <li key={i} className="rounded-[12px] bg-bg2 p-3"><span className="label block">{T(f.label)}</span><b className="mt-0.5 block text-[15px] text-t0">{f.value}</b></li>)}</ul></Block>}
    </div>
  );
}
