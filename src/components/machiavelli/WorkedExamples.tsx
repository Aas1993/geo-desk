"use client";
import { useState } from "react";
import { BRIEF_EXAMPLE, COUNCIL_EXAMPLE, COUNCIL_EXAMPLE_FINAL, EGYPT_GAPS, EGYPT_NEIGHBOURS, EGYPT_ROOTS, INDIA_PLAN, INDIA_WHY, type Claim } from "@/lib/machiavelli/worked";
import { REF_BY, REF_LABEL } from "@/lib/machiavelli/reference";
import { safeHttp } from "@/lib/url";
import { Block, Pill, type Lang } from "../falcon/bits";
import { FIG_EGYPT, FIG_INDIA } from "@/lib/machiavelli/figures";
import { Tabs, Tbl, TreeSvg } from "./parts";

const T = {
  en: { sub: "The worked examples of the specification, shown beside what a web check on 25 October 2026 found for each claim it could test. They illustrate the template: they are not assessments, and the module's own products research a country afresh. Examples are in English.", egypt: "Egypt: roots", india: "India: enhancement", council: "India: Council", brief: "Country brief example", roots: "Roots-level snapshot", neigh: "Neighbour relationships and competition", gap: "Gap analysis: where the UAE can credibly add value", why: "Why India, as the specification states it", plan: "Plan", seat: "Seat", report: "Report", check: "Check", correction: "Correction from the check", header: "Header", changed: "What changed", whyM: "Why it matters", watch: "Watch items", esc: "Escalation flag", nrx: "Not rechecked" },
  ar: { sub: "الأمثلة التطبيقية في المواصفة، مع ما وجده فحص ويب في 25 أكتوبر 2026 لكل ادعاء أمكن اختباره. وهي توضّح القالب: ليست تقييمات، وتبحث منتجات الوحدة نفسها في الدولة من جديد. الأمثلة بالإنجليزية.", egypt: "مصر: الجذور", india: "الهند: التعزيز", council: "الهند: المجلس", brief: "مثال موجز دولة", roots: "لقطة على مستوى الجذور", neigh: "علاقات الجوار والمنافسة", gap: "تحليل الفجوات: أين تضيف الإمارات قيمة بمصداقية", why: "لماذا الهند كما تذكرها المواصفة", plan: "الخطة", seat: "المقعد", report: "التقرير", check: "الفحص", correction: "تصحيح من الفحص", header: "الترويسة", changed: "ما تغيّر", whyM: "لماذا يهم", watch: "بنود المراقبة", esc: "علم التصعيد", nrx: "لم يُعَد فحصه" },
} as const;
/** The result of the reference check for one claim, with the sources to read. */
export function RefBadge({ id, L }: { id?: string; L: Lang }) {
  const r = id ? REF_BY.get(id) : undefined; const [open, setOpen] = useState(false); if (!r) return null; const l = REF_LABEL[r.status];
  return <span className="inline-block align-baseline"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="ms-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${l.c} 22%, var(--bg-2))`, color: l.c }}>{L === "ar" ? l.ar : l.en}</button>{open && <span className="mt-1 block rounded-[8px] bg-bg1 p-2 text-[11.5px] font-normal leading-snug text-t1"><span className="block text-t0">{r.finding}</span>{r.sources.map((s) => <a key={s.url} href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" className="mt-0.5 block text-accent hover:underline">{s.title}</a>)}<span className="block text-[10px] text-t2">Checked {r.checked}. Search excerpts and press reports, not every primary record.</span></span>}</span>;
}
const Claims = ({ cs, L }: { cs: Claim[]; L: Lang }) => <>{cs.map((c, i) => <span key={i} className="block">{c.text}<RefBadge id={c.ref} L={L} /></span>)}</>;
type Tab = "egypt" | "india" | "council" | "brief";
export function ExamplesTab({ L }: { L: Lang }) {
  const u = T[L]; const [tab, setTab] = useState<Tab>("egypt");
  return (
    <div className="space-y-4"><p className="rounded-[10px] bg-bg2 p-3 text-[12px] leading-snug text-t1">{u.sub}</p>
      <Tabs<Tab> tabs={[{ id: "egypt", label: u.egypt }, { id: "india", label: u.india }, { id: "council", label: u.council }, { id: "brief", label: u.brief }]} value={tab} onChange={setTab} />
      {tab === "egypt" && <div className="space-y-4"><Block title={u.roots}><Tbl head={["Dimension", "Evidenced findings"]} rows={EGYPT_ROOTS.map((r) => [`**${r.dimension}**`, <Claims key="c" cs={r.findings} L={L} />])} w={["22%", "78%"]} /></Block><Block title={u.neigh}><Tbl head={["Neighbour", "Relationship type", "UAE-relevant observation"]} rows={EGYPT_NEIGHBOURS.map((r) => [`**${r.who}**`, r.type, r.observation])} w={["14%", "36%", "50%"]} /></Block><Block title="Illustrative scenario tree, 1 to 10 years (section 31.4)"><TreeSvg nodes={FIG_EGYPT} L={L} title="Egypt scenario tree" /></Block><Block title={u.gap}><Tbl head={["Gap", "Why Egypt cannot close it alone", "UAE comparative advantage", "Appropriate instrument"]} rows={EGYPT_GAPS.map((r) => [`**${r.gap}**`, r.alone, r.advantage, r.instrument])} /></Block></div>}
      {tab === "india" && <div className="space-y-4"><Block title={u.why}><ul className="space-y-2 text-[12.5px] leading-snug text-t0">{INDIA_WHY.map((c, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-accent">▸</span><span><Claims cs={[c]} L={L} /></span></li>)}</ul></Block><Block title="Illustrative outcome tree (section 40.6)"><TreeSvg nodes={FIG_INDIA} L={L} title="India outcome tree" /></Block>{INDIA_PLAN.map((h) => <Block key={h.horizon} title={h.horizon}><Tbl head={["Action", "Detail", "KPI"]} rows={h.rows.map((r) => [`**${r.action}**`, r.detail, r.kpi])} w={["22%", "50%", "28%"]} /></Block>)}</div>}
      {tab === "council" && <div className="space-y-4"><Block title={u.council}><Tbl head={[u.seat, u.report, u.check]} rows={COUNCIL_EXAMPLE.map((r) => [`**${r.seat}**`, r.report, r.flag ? <span key="f" className="text-warn">{r.flag}<RefBadge id={r.ref} L={L} /></span> : r.ref ? <RefBadge key="r" id={r.ref} L={L} /> : "—"])} w={["18%", "58%", "24%"]} /></Block><p className="rounded-[12px] bg-bg2 p-3 text-[12.5px] leading-snug text-t0">{COUNCIL_EXAMPLE_FINAL}</p></div>}
      {tab === "brief" && <Block title={u.brief}><div className="space-y-2 text-[12.5px] leading-snug text-t0"><p><b>{u.header}: </b>{BRIEF_EXAMPLE.header}</p><p><b>{u.changed}: </b>{BRIEF_EXAMPLE.changed}<RefBadge id={BRIEF_EXAMPLE.ref} L={L} /></p><p><b>{u.whyM}: </b>{BRIEF_EXAMPLE.why}</p><p><b>{u.watch}: </b>{BRIEF_EXAMPLE.watch}</p><p><b>{u.esc}: </b>{BRIEF_EXAMPLE.escalation}</p><p className="rounded-[10px] border border-warn/40 bg-warn/10 p-2.5 text-[12px]"><b>{u.correction}: </b>{BRIEF_EXAMPLE.correction}</p><Pill c="var(--t2)">{u.nrx}</Pill></div></Block>}
    </div>
  );
}
