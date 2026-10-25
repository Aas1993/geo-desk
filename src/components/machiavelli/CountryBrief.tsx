"use client";
import { useEffect, useMemo, useState } from "react";
import { DIMS, RADAR_AXES, TIERS, tx } from "@/lib/machiavelli/content";
import { BRIEF_CADENCE_DAYS, briefDue, changeCheck, snapOf, type Profile, type Snap } from "@/lib/machiavelli/profile-core";
import { parseBrief } from "@/lib/machiavelli/strategy-parse";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Progress, RunBar } from "./forms";
import type { Filters } from "./filters";
import { Inline, Tabs, Tbl, usd } from "./parts";
import { useRun, type ProfileSet, type Saved } from "./useRun";

const T = {
  en: { title: "Country brief", sub: "A recurring, dated brief on one country, filtered for UAE relevance: what changed since the last brief, why it matters (mapped to a scorecard dimension, a radar axis or a Council seat), what to watch, and an escalation flag. The change check and the flag come from the datasets by a stated rule; the model writes the narrative.", status: "Brief status", tier: "Opportunity tier", cadence: "Refresh cadence", last: "Last brief", days: "days ago", never: "none yet", due: "Due", overdue: "Overdue", ok: "Up to date", check: "Change check since the last brief", noPrev: "No earlier snapshot: the first brief sets the baseline.", flag: "Escalation flag", flagRule: "Raised by the rule: a scorecard or radar movement was found, so the Council should re-convene before the next cycle.", noFlag: "Not raised: no scorecard or radar movement since the last brief.", go: "Generate country brief", again: "Generate a new brief", cost: "Measured on India: about $0.15 and 900 words, three searches; capped at $1.00. Cached for the day. The start is always a click.", hist: "Earlier briefs", changed: "What changed", why: "Why it matters to the UAE", watch: "Recommended watch items", modelFlag: "The brief's own flag", raised: "Raised", none: "None", spent: "Spent", hdr: "Header", noMove: "No scorecard or radar movement.", cadences: "Tier 1 monthly, tier 2 quarterly, others twice a year" },
  ar: { title: "موجز الدولة", sub: "موجز دوري مؤرَّخ عن دولة واحدة مصفّى لصلته بالإمارات: ما تغيّر منذ الموجز الأخير، ولماذا يهم (مربوطًا ببُعد في بطاقة الدرجات أو محور رادار أو مقعد في المجلس)، وما يُراقَب، وعلم تصعيد. ويأتي فحص التغيّر والعلم من البيانات بقاعدة معلنة؛ ويكتب النموذج السرد.", status: "حالة الموجز", tier: "فئة الفرصة", cadence: "وتيرة التحديث", last: "آخر موجز", days: "يومًا مضى", never: "لا يوجد بعد", due: "مستحق", overdue: "متأخر", ok: "محدَّث", check: "فحص التغيّر منذ الموجز الأخير", noPrev: "لا لقطة سابقة: الموجز الأول يضع خط الأساس.", flag: "علم التصعيد", flagRule: "رُفع بالقاعدة: وُجدت حركة في بطاقة الدرجات أو الرادار، فينبغي أن يعاود المجلس الانعقاد قبل الدورة التالية.", noFlag: "لم يُرفع: لا حركة في بطاقة الدرجات أو الرادار منذ الموجز الأخير.", go: "أنشئ موجز الدولة", again: "أنشئ موجزًا جديدًا", cost: "قيس على الهند: نحو 0.15 دولار و900 كلمة وثلاث عمليات بحث؛ بسقف 1.00 دولار. مخزَّن لليوم. والبدء بنقرة دائمًا.", hist: "موجزات سابقة", changed: "ما تغيّر", why: "لماذا يهم الإمارات", watch: "بنود المراقبة الموصى بها", modelFlag: "علم الموجز نفسه", raised: "مرفوع", none: "لا", spent: "المنفَق", hdr: "الترويسة", noMove: "لا حركة في بطاقة الدرجات أو الرادار.", cadences: "الفئة 1 شهريًا والفئة 2 فصليًا والبقية مرتين في السنة" },
} as const;
const nameOf = (id: string, L: Lang) => { const d = DIMS.find((x) => x.id === id) ?? null; if (d) return L === "ar" ? d.ar : d.en; const a = RADAR_AXES.find((x) => x.id === id); return a ? (L === "ar" ? a.ar : a.en) : id; };
export type BriefRec = { at: string; report: string; snap?: Snap };
const KEY = (iso: string) => `gd-cbrief:${iso}`;
export const loadBriefs = (iso: string): BriefRec[] => { try { return (JSON.parse(localStorage.getItem(KEY(iso)) ?? "[]") as BriefRec[]).filter((x) => x.report); } catch { return []; } };

export function BriefTab({ L, iso, name, set, profile }: { L: Lang; iso: string; name: string; f: Filters; set: ProfileSet | null; profile?: Profile }) {
  const u = T[L]; const [hist, setHist] = useState<BriefRec[]>([]); const [view, setView] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setHist(loadBriefs(iso)); setView(0); }, 0); return () => clearTimeout(t); }, [iso]);
  const run = useRun(iso, null, (d: Saved) => { const rec: BriefRec = { at: d.at, report: d.report, snap: d.snap }; setHist((h) => { const n = [rec, ...h.filter((x) => x.at.slice(0, 10) !== d.at.slice(0, 10))].slice(0, 6); try { localStorage.setItem(KEY(iso), JSON.stringify(n)); window.dispatchEvent(new Event("storage")); } catch { /* storage full */ } return n; }); setView(0); });
  const last = hist[0]; const cur = profile && set ? snapOf(profile, set.sources) : null; const chk = last?.snap && cur ? changeCheck(last.snap, cur) : null;
  const due = briefDue(profile?.tier ?? null, last?.at ?? null); const tier = profile?.tier ? TIERS.find((t) => t.id === profile.tier) : null;
  const text = chk ? (chk.changes.length ? chk.changes.map((c) => `${c.kind} ${nameOf(c.id, "en")} ${c.from} to ${c.to}`).join("; ") : "no score or dataset movement") : "";
  const start = () => void run.run({ kind: "countrybrief", lang: L, prevDate: last?.at.slice(0, 10) ?? "", tier: profile?.tier ?? "", flagged: !!chk?.flagged, change: text }, cur ? { snap: cur } : undefined);
  const shown = hist[view]; const p = useMemo(() => (shown ? parseBrief(shown.report) : null), [shown]);
  return (
    <div className="space-y-4">
      <Block title={u.title} hint={u.sub}>
        <div className="grid gap-2.5 sm:grid-cols-4"><div className="rounded-[10px] bg-bg2 p-2.5"><span className="label">{u.tier}</span><p className="text-[13px] font-semibold text-t0">{tier ? `${tier.id} ${tx(tier.name, L)}` : "—"}</p></div><div className="rounded-[10px] bg-bg2 p-2.5"><span className="label">{u.cadence}</span><p className="text-[13px] font-semibold text-t0">{BRIEF_CADENCE_DAYS[profile?.tier ?? "none"]} {L === "ar" ? "يومًا" : "days"}</p><p className="text-[10px] text-t2">{u.cadences}</p></div><div className="rounded-[10px] bg-bg2 p-2.5"><span className="label">{u.last}</span><p className="text-[13px] font-semibold text-t0">{last ? `${last.at.slice(0, 10)} · ${due.days} ${u.days}` : u.never}</p></div><div className="rounded-[10px] bg-bg2 p-2.5"><span className="label">{u.status}</span><p className="mt-0.5">{due.overdue ? <Pill c="var(--risk)">{u.overdue}</Pill> : due.due ? <Pill c="var(--warn)">{u.due}</Pill> : <Pill c="var(--ok)">{u.ok}</Pill>}</p></div></div>
        <div className="mt-3 rounded-[12px] bg-bg2 p-3"><h4 className="label mb-1">{u.check}</h4>{!chk ? <p className="text-[12px] text-t1">{u.noPrev}</p> : chk.changes.length === 0 ? <p className="text-[12px] text-t1">{u.noMove}</p> : <ul className="space-y-1 text-[12px] text-t0">{chk.changes.map((c, i) => <li key={i} className="flex flex-wrap gap-2"><Pill c={c.kind === "dataset" ? "var(--t2)" : "var(--warn)"}>{c.kind}</Pill><b>{nameOf(c.id, L)}</b><span className="num text-t1">{c.from} → {c.to}{c.delta != null ? ` (${c.delta > 0 ? "+" : ""}${c.delta})` : ""}</span></li>)}</ul>}
          {chk && <p className="mt-2 text-[12px]"><b className="text-t0">{u.flag}: </b><span className={chk.flagged ? "text-risk" : "text-t1"}>{chk.flagged ? u.flagRule : u.noFlag}</span></p>}</div>
        <RunBar phase={run.phase} onRun={start} onCancel={run.cancel} L={L} label={last ? u.again : u.go} cost={u.cost} />
        <Progress phase={run.phase} status={run.status} tail={run.tail} searches={run.searches} sources={run.sources} err={run.err} L={L} />
      </Block>
      {hist.length > 1 && <Tabs tabs={hist.map((h, i) => ({ id: String(i), label: h.at.slice(0, 10) }))} value={String(view)} onChange={(v) => setView(Number(v))} label={u.hist} />}
      {p && shown && (<div className="space-y-4">
        <section className={`rounded-[14px] border p-3 ${p.escalation.raised || chk?.flagged ? "border-risk/50 bg-risk/5" : "border-line bg-bg1"}`}><div className="flex flex-wrap items-center gap-2"><h4 className="label">{u.flag}</h4><Pill c={chk?.flagged ? "var(--risk)" : "var(--ok)"}>{chk ? (chk.flagged ? u.raised : u.none) : "—"} {L === "ar" ? "(قاعدة)" : "(rule)"}</Pill><Pill c={p.escalation.raised ? "var(--risk)" : "var(--ok)"}>{u.modelFlag}: {p.escalation.raised ? u.raised : u.none}</Pill></div>{p.escalation.reason && <p className="mt-1.5 text-[12.5px] leading-snug text-t0"><Inline text={p.escalation.reason} /></p>}<p className="mt-1 text-[11px] text-t2">{p.line} · {name}</p></section>
        <Block title={u.hdr}><Tbl head={["Field", "Value"]} rows={p.header.map((h) => [`**${h.field}**`, h.value])} /></Block>
        <Block title={u.changed}><Tbl head={["Date", "Development", "Source"]} rows={p.changed.map((c) => [c.date, c.text, c.source])} w={["11%", "55%", "34%"]} empty="No material development found." /></Block>
        <Block title={u.why}><Tbl head={["Development", "Effect", "Direction", "Size"]} rows={p.why.map((w) => [w.development, `**${w.effect}**`, w.direction ? <Pill key="d" c={w.direction === "raises" ? "var(--ok)" : w.direction === "lowers" ? "var(--risk)" : "var(--t2)"}>{w.direction}</Pill> : "—", w.size ?? "—"])} w={["40%", "28%", "12%", "20%"]} /></Block>
        <Block title={u.watch}><Tbl head={["Signpost", "Threshold", "Where to check", "Response if crossed"]} rows={p.watch.map((w) => [w.signpost, w.threshold, w.where, w.response])} /></Block>
        <p className="num text-[11px] text-t2">{shown.at.slice(0, 16).replace("T", " ")} UTC</p>
      </div>)}
      {run.saved && <p className="num text-[11px] text-t2">{u.spent} {usd(run.saved.usage.usd)}</p>}
    </div>
  );
}
