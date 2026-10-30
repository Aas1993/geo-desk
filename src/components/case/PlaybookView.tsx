"use client";
import { useState } from "react";
import { Compass, Copy, Flag, Route, ShieldCheck, Swords } from "lucide-react";
import { playbookMarkdown, type Phase, type Playbook } from "@/lib/case/playbook";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Markdown } from "../Markdown";
import { useTr } from "./bits";
import { AngleMatrix, CoalitionView, LedgerView, OutcomesView, PlanColumns, PlayCard, TrackerView } from "./PlaybookParts";

const PH_C: Record<Phase, string> = { now: "var(--ok)", next: "var(--accent)", later: "var(--c2)", hold: "var(--t2)" };
const POS_C: Record<string, string> = { deepen: "var(--ok)", staged: "var(--accent)", hedge: "var(--warn)", hold: "var(--t2)" };
const ROLE_C = { channel: "var(--ok)", contested: "var(--warn)", watch: "var(--t2)" } as const;
const Sub = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => <h4 className="mb-1.5 mt-4 flex items-center gap-1.5 text-[12.5px] font-semibold text-t0"><span aria-hidden className="text-accent">{icon}</span>{children}</h4>;
/** THE UAE GEOPOLITICAL STATECRAFT PLAYBOOK for one country, drawn: the course on its scale with how far it is from changing, the interests ranked, the instruments as an ordered ladder (footprint, headroom, when, the move and its gate), the rivals and neighbours, the corridor and trade play, security cooperation at policy level, the calendar, the red lines and the triggers. Rule-built and free; the agents' enrichment, when a product has one, is shown below it. Every move is a proposal. */
export function PlaybookView({ pb, L, enrichment, title }: { pb: Playbook; L: Lang; enrichment?: string; title?: string }) {
  const t = useTr(L); const [copied, setCopied] = useState(false); const [all, setAll] = useState(false); const c = pb.course; const col = c.posture ? POS_C[c.posture] : "var(--t2)";
  const ph = (p: Phase) => (p === "now" ? t("now", "الآن") : p === "next" ? t("next", "تاليًا") : p === "later" ? t("later", "لاحقًا") : t("hold", "إبقاء"));
  const agree = c.agreement === "aligned" ? t("the readings agree", "القراءات متفقة") : c.agreement === "split" ? t("the readings split", "القراءات منقسمة") : c.agreement === "partial" ? t("partly aligned", "متفقة جزئيًا") : t("data rule only", "قاعدة البيانات وحدها");
  return (
    <Block title={title ?? (L === "ar" ? `دليل فن الحكم الجيوسياسي لدولة الإمارات تجاه ${pb.name}` : `The UAE geopolitical statecraft playbook for ${pb.name}`)} hint={t("Rule-built, free, from the Case File data and the products on file. Every move is a proposal for the Ministry and the ambassador to decide; engagement is open, official and consent-based; no covert action.", "مبني بالقواعد ومجانًا من بيانات ملف الحالة والمنتجات المحفوظة. كل خطوة مقترحة تقررها الوزارة والسفير؛ والارتباط علني ورسمي وبالتراضي؛ ولا عمل سري.")}
      right={<button type="button" onClick={async () => { try { await navigator.clipboard.writeText(playbookMarkdown(pb, { enrichment })); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Copy size={13} />{copied ? "✓" : t("Copy markdown", "نسخ")}</button>}>
      <div className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderInlineStart: `4px solid ${col}` }}>
        <div className="flex flex-wrap items-center gap-2"><Compass size={15} style={{ color: col }} aria-hidden /><b className="display text-[18px]" style={{ color: col }}>{c.name}</b><Pill c={c.agreement === "aligned" ? "var(--ok)" : c.agreement === "unknown" ? "var(--t2)" : "var(--warn)"}>{agree}</Pill>{!c.stable && c.posture && <Pill c="var(--warn)">{t("provisional: not stable", "مؤقت: غير مستقر")}</Pill>}{pb.onFile.map((x) => <Pill key={x} c="var(--c2)">{x}</Pill>)}</div>
        <p className="mt-1 text-[12.5px] leading-snug text-t0" dir="auto">{c.line}</p>
        <ul className="mt-1.5 space-y-0.5 text-[12px] leading-snug text-t1">{c.why.map((x) => <li key={x} dir="auto">• {x}</li>)}</ul>
        {(c.king || c.ministry) && <ul className="mt-1.5 space-y-0.5 text-[12px] text-t1">{c.king && <li dir="auto"><b className="text-t0">{t("THE KING", "القرار النهائي")}:</b> {c.king}</li>}{c.ministry && <li dir="auto"><b className="text-t0">{t("The Ministry", "الوزارة")}:</b> {c.ministry}</li>}</ul>}
        <p className="mt-1.5 text-[11.5px] leading-snug text-t2" dir="auto">{c.note}</p>
        {c.flips.length > 0 && <details className="mt-1.5 text-[12px] text-t1"><summary className="cursor-pointer font-semibold text-t0">{t("What would change the course", "ما الذي يغيّر المسار")}</summary><ul className="mt-1 space-y-0.5">{c.flips.map((x) => <li key={x} dir="auto">• {x}</li>)}</ul></details>}
      </div>

      <Sub icon={<Flag size={14} />}>{t("Interests, ranked", "المصالح مرتبة")}</Sub>
      <ol className="grid gap-1.5 md:grid-cols-2">{pb.interests.slice(0, all ? 12 : 6).map((i) => <li key={`${i.rank}${i.title}`} className="flex gap-2.5 rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><span className="numt grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-[var(--accent-ink)]">{i.rank}</span><span className="min-w-0"><b className="text-t0" dir="auto">{i.title}</b> <Pill c={i.source === "ministry" ? "var(--ok)" : "var(--t2)"}>{i.source === "ministry" ? t("Ministry", "الوزارة") : t("rule-ranked", "مرتب بقاعدة")}</Pill><span className="block text-t1" dir="auto">{i.why}</span><span className="block text-[11px] text-t2" dir="auto">{i.basis}</span></span></li>)}</ol>
      {pb.interests.length > 6 && <button type="button" onClick={() => setAll((v) => !v)} className="mt-1.5 text-[12px] text-accent hover:underline">{all ? t("Show fewer", "عرض أقل") : t(`Show all ${pb.interests.length}`, `عرض الكل (${pb.interests.length})`)}</button>}

      <Sub icon={<Route size={14} />}>{t("Instruments, in order", "الأدوات بالترتيب")}</Sub>
      <ol className="space-y-1.5">{pb.instruments.map((i) => <li key={i.id} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug" style={{ borderInlineStart: `4px solid ${PH_C[i.phase]}` }}>
        <div className="flex flex-wrap items-center gap-2"><span className="numt w-5 text-t2">{i.order}</span><b className="text-t0" dir="auto">{i.name}</b><Pill c={PH_C[i.phase]}>{ph(i.phase)}</Pill><span className="text-[11px] text-t2">{i.when}</span><span className="ms-auto flex items-center gap-1.5 text-[11px] text-t2" title={i.basis}>{i.footprint == null ? t("not measured", "غير مقيس") : <><span className="block h-1.5 w-20 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}><span className="block h-full rounded-full" style={{ width: `${(i.footprint / 5) * 100}%`, background: PH_C[i.phase] }} /></span><span className="numt">{i.footprint}/5 · {t("headroom", "المساحة")} {i.headroom}</span></>}</span></div>
        <p className="mt-1 text-t1" dir="auto">{i.move}</p><p className="mt-0.5 text-[11.5px] text-t2" dir="auto"><b>{t("Gate", "البوابة")}:</b> {i.gate}</p></li>)}</ol>

      <Sub icon={<Swords size={14} />}>{t("Rivals and neighbours", "المنافسون والجوار")}</Sub>
      <div className="grid gap-1.5 md:grid-cols-2">{pb.rivals.map((r) => <div key={r.who} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><b className="text-t0" dir="auto">{r.who}</b><p className="text-t1" dir="auto">{r.line}</p><p className="mt-0.5 text-ok" dir="auto">→ {r.response}</p></div>)}</div>
      <div className="mt-1.5 grid gap-1.5 md:grid-cols-2">{pb.neighbours.map((n) => <div key={n.name} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><div className="flex items-center gap-1.5"><b className="text-t0" dir="auto">{n.name}</b><Pill c={ROLE_C[n.role]}>{n.role === "channel" ? t("channel", "قناة") : n.role === "contested" ? t("contested", "متنازع") : t("watch", "مراقبة")}</Pill></div><p className="text-t1" dir="auto">{n.line}</p><p className="mt-0.5 text-t2" dir="auto">→ {n.move}</p></div>)}</div>

      <Sub icon={<Swords size={14} />}>{t("Influence ledger against rivals", "سجل النفوذ أمام المنافسين")}</Sub><LedgerView L={L} ledger={pb.ledger} />
      <Sub icon={<Flag size={14} />}>{t("Friends and coalition plan", "خطة الأصدقاء والتحالف")}</Sub><CoalitionView L={L} items={pb.coalition} />
      <Sub icon={<Route size={14} />}>{t("Economic, trade and investment play", "الخطة الاقتصادية والتجارية والاستثمارية")}</Sub><PlayCard L={L} play={pb.economy} />
      <Sub icon={<Route size={14} />}>{t("Corridor and trade play", "الممر والخطة التجارية")}</Sub>
      <p className="text-[12px] leading-snug text-t1" dir="auto">{pb.corridor.reading}</p>
      <ol className="mt-1 list-decimal space-y-0.5 ps-5 text-[12px] leading-snug text-t0">{pb.corridor.steps.map((x) => <li key={x} dir="auto">{x}</li>)}</ol>
      {pb.corridor.sectors.length > 0 && <ul className="mt-1.5 grid gap-1.5 md:grid-cols-2">{pb.corridor.sectors.map((x) => <li key={x.sector} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><b className="text-t0" dir="auto">{x.sector}</b> <Pill c={x.status === "deepen" ? "var(--ok)" : "var(--accent)"}>{x.status === "deepen" ? t("deepen", "تعميق") : t("open", "فتح")}</Pill><span className="block text-t1" dir="auto">{x.line}</span></li>)}</ul>}

      <Sub icon={<Route size={14} />}>{t("Energy, technology and space play", "خطة الطاقة والتقنية والفضاء")}</Sub><PlayCard L={L} play={pb.energyTechSpace} />
      <Sub icon={<Flag size={14} />}>{t("Soft power and narrative play", "خطة القوة الناعمة والسرد")}</Sub><PlayCard L={L} play={pb.soft} />
      <Sub icon={<ShieldCheck size={14} />}>{t("Security cooperation (policy level)", "التعاون الأمني (على مستوى السياسات)")}</Sub>
      <ul className="space-y-0.5 text-[12px] leading-snug text-t1">{pb.security.lines.map((x) => <li key={x} dir="auto">• {x}</li>)}</ul>
      <p className="mt-1 flex flex-wrap gap-1.5">{pb.security.forms.map((x) => <Pill key={x} c="var(--ok)">{x}</Pill>)}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-t2" dir="auto"><b>{t("Avoid", "تجنب")}:</b> {pb.security.avoid.join("; ")}. <b>{t("Gate", "البوابة")}:</b> {pb.security.gate}</p>

      <Sub icon={<Flag size={14} />}>{t("Diplomatic and visit calendar", "التقويم الدبلوماسي وتقويم الزيارات")}</Sub>
      <ol className="space-y-1">{pb.calendar.map((e, i) => <li key={`${e.when}${i}`} className="flex gap-2.5 rounded-[10px] bg-bg2 p-2 text-[12px] leading-snug"><b className="w-28 shrink-0 text-t0" dir="auto">{e.when}</b><span className="min-w-0 text-t1" dir="auto">{e.what}<span className="block text-[11px] text-t2">{e.lead} · {e.from}</span></span></li>)}</ol>
      {pb.execution.length > 0 && <p className="mt-1.5 text-[11.5px] leading-snug text-t2" dir="auto"><b className="text-t1">{t("Mission plan on file", "خطة البعثة المحفوظة")}:</b> {pb.execution.map((x) => `${x.id} ${x.title} (${x.horizon})`).join("; ")}</p>}

      <Sub icon={<Flag size={14} />}>{t("Implementation plan: 30 days, 100 days, one year, three years", "خطة التنفيذ: 30 يومًا و100 يوم وسنة وثلاث سنوات")}</Sub><PlanColumns L={L} plan={pb.plan} />
      <Sub icon={<ShieldCheck size={14} />}>{t("Red lines", "الخطوط الحمراء")}</Sub>
      <ul className="space-y-1 text-[12px] leading-snug">{pb.redLines.map((x) => <li key={x} className="rounded-[10px] bg-bg2 p-2 text-t0" style={{ borderInlineStart: "3px solid var(--risk)" }} dir="auto">{x}</li>)}</ul>

      <Sub icon={<Flag size={14} />}>{t("Triggers and indicators", "المحفزات والمؤشرات")}</Sub>
      <div className="scroll-thin overflow-x-auto rounded-[12px] border border-line"><table className="w-full min-w-[560px] border-collapse text-[12px]"><thead><tr className="bg-bg2 text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Indicator", "المؤشر")}</th><th className="px-2 py-2 text-start font-semibold">{t("State", "الحالة")}</th><th className="px-2 py-2 text-start font-semibold">{t("Threshold or reading", "العتبة أو القراءة")}</th><th className="px-2 py-2 text-start font-semibold">{t("Action", "الإجراء")}</th></tr></thead><tbody>{pb.triggers.map((x, i) => <tr key={`${x.indicator}${i}`} className="border-t border-line align-top"><td className="px-3 py-1.5 text-t0" dir="auto">{x.indicator}</td><td className="px-2 py-1.5 text-t1">{x.state}</td><td className="px-2 py-1.5 text-t1" dir="auto">{x.threshold}</td><td className="px-2 py-1.5 text-t1" dir="auto">{x.action}</td></tr>)}</tbody></table></div>

      <Sub icon={<Compass size={14} />}>{t("Implementation tracker: where the UAE is within the playbook", "متابع التنفيذ: أين الإمارات في الدليل")}</Sub><TrackerView L={L} tracker={pb.tracker} />
      <Sub icon={<Flag size={14} />}>{t("Outcomes: what the playbook delivers, and what stalling costs", "النتائج: ما يحققه الدليل وكلفة تعثره")}</Sub><OutcomesView L={L} o={pb.outcomes} />
      <Sub icon={<Compass size={14} />}>{t("Angle coverage: the fourteen angles", "تغطية الزوايا: الزوايا الأربع عشرة")}</Sub><AngleMatrix L={L} angles={pb.angles} />
      <details className="mt-3 rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug text-t1"><summary className="cursor-pointer font-semibold text-t0">{t("What else would change this playbook, and what is not held", "ما الذي يغيّر هذا الدليل أيضًا وما غير المحفوظ")}</summary><ul className="mt-1.5 space-y-0.5">{pb.change.map((x) => <li key={x} dir="auto">• {x}</li>)}</ul><p className="mb-0.5 mt-2 font-semibold text-t0">{t("Not held, so not claimed", "غير محفوظ فلا يُدّعى")}</p><ul className="space-y-0.5">{pb.gaps.map((x) => <li key={x} dir="auto">• {x}</li>)}</ul></details>
      {enrichment?.trim() && <div className="mt-4 rounded-[12px] border border-line bg-bg1 p-3"><p className="label mb-1">{t("The desks' enrichment (written by the agents from their searches)", "إثراء المكاتب (كتبه الوكلاء من بحثهم)")}</p><article><Markdown source={enrichment} /></article></div>}
    </Block>
  );
}
