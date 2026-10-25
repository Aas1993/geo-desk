"use client";
import { classification } from "@/lib/case/report";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Printer } from "lucide-react";
import { DIMS, RADAR_AXES, TIERS, tx } from "@/lib/machiavelli/content";
import { STRAT_PRESETS } from "@/lib/dossier/strategy";
import { snapOf, type Profile } from "@/lib/machiavelli/profile-core";
import { briefingHtml, printBriefing, saveBlob } from "@/lib/dossier/export";
import { SCOPE_BY } from "@/lib/falcon/scopes";
import type { Country } from "@/lib/types";
import { Block, CountryPicker, Kpi, Pill, ScopePicker, type Lang } from "../falcon/bits";
import { CouncilTab } from "./StrategyCouncil";
import { BriefTab } from "./CountryBrief";
import { ExamplesTab } from "./WorkedExamples";
import { Question, InstrumentChips, Progress, Refusal, RunBar, refusalText } from "./forms";
import { filterBody, type Filters } from "./filters";
import { Radar6, ScoreRow, Tabs, usd } from "./parts";
import { StrategyVisual } from "./StrategyVisual";
import { useRun, type ProfileSet } from "./useRun";

const T = {
  en: { strategy: "Strategy", council: "Council", brief: "Country brief", examples: "Worked examples", subject: "Subject", dims: "Scorecard dimensions", dimsH: "Dataset-derived, 0 to 5, each with its evidence and rule. They are kept apart on purpose: there is no combined control score.", axes: "Opportunity-radar axes", axesH: "The same evidence read for opportunity (weights 25, 20, 20, 15, 10 and 10 percent). Move the weights in Falcon Eye, Opportunity.", tier: "Tier hint", rec: "What the data suggests doing better (legitimate instruments only)", rollup: "Roll-up of the member countries", mode: "Product", dossier: "Country strategy dossier", enhance: "Enhancement strategy", q: "UAE decision question", ins: "Instruments to examine first (optional)", gen: "Generate country strategy", genScope: "Generate strategy", genE: "Build enhancement strategy", regen: "Regenerate", cost: { dossier: "Measured on Egypt: about $0.37, 5,500 words, six searches; hard-capped at $1.00 and cached for six hours. A click starts it; nothing is sent until you do, and nothing here authorises contact, spending or security activity.", enhance: "Measured on India: about $0.26, 2,900 words, six searches; hard-capped at $1.00 and cached for six hours. A click starts it; nothing here authorises contact, spending or security activity." }, saved: "Saved", spent: "Spent", copy: "Copy", copied: "Copied", pdf: "Print / PDF", pick: "Choose a country or scope to begin.", trade: "UAE goods trade", inv: "UAE outward investment", aid: "Humanitarian funding (5 years)", rank: "UAE rank among powers", hint: "A 5 on hard power or durability needs analyst evidence and is never derived from data.", noProfile: "No dataset profile for this subject.", n: "countries" },
  ar: { strategy: "الاستراتيجية", council: "المجلس", brief: "موجز الدولة", examples: "أمثلة تطبيقية", subject: "الموضوع", dims: "أبعاد بطاقة الدرجات", dimsH: "مشتقة من البيانات من 0 إلى 5، لكل منها دليلها وقاعدتها. وتُفصل عمدًا: لا توجد درجة تحكم مجمَّعة.", axes: "محاور رادار الفرص", axesH: "الأدلة نفسها مقروءة للفرص (الأوزان 25 و20 و20 و15 و10 و10 بالمئة). حرّك الأوزان في عين الصقر، الفرص.", tier: "مؤشر الفئة", rec: "ما توحي به البيانات لتحسينه (بأدوات مشروعة فقط)", rollup: "تجميع الدول الأعضاء", mode: "المنتج", dossier: "ملف الاستراتيجية القُطرية", enhance: "استراتيجية التعزيز", q: "سؤال قرار الإمارات", ins: "أدوات للبدء بفحصها (اختياري)", gen: "أنشئ الاستراتيجية القُطرية", genScope: "أنشئ الاستراتيجية", genE: "ابنِ استراتيجية التعزيز", regen: "أعد الإنشاء", cost: { dossier: "قيس على مصر: نحو 0.37 دولار و5,500 كلمة وست عمليات بحث؛ بسقف 1.00 دولار ومخزَّن ست ساعات. تبدأ بنقرة؛ ولا يُرسل شيء قبلها، ولا شيء هنا يجيز اتصالًا أو إنفاقًا أو نشاطًا أمنيًا.", enhance: "قيس على الهند: نحو 0.26 دولار و2,900 كلمة وست عمليات بحث؛ بسقف 1.00 دولار ومخزَّن ست ساعات. تبدأ بنقرة؛ ولا شيء هنا يجيز اتصالًا أو إنفاقًا أو نشاطًا أمنيًا." }, saved: "محفوظ", spent: "المنفَق", copy: "نسخ", copied: "تم النسخ", pdf: "طباعة / PDF", pick: "اختر دولة أو نطاقًا للبدء.", trade: "تجارة السلع الإماراتية", inv: "الاستثمار الإماراتي الخارجي", aid: "التمويل الإنساني (5 سنوات)", rank: "ترتيب الإمارات بين القوى", hint: "الدرجة 5 في القوة الصلبة أو الاستمرارية تحتاج دليل محلل ولا تُشتق من البيانات أبدًا.", noProfile: "لا ملف بيانات لهذا الموضوع.", n: "دولة" },
} as const;
const bn = (v: number | null) => (v == null ? "n/a" : v >= 1e9 ? `US$${(v / 1e9).toFixed(1)}bn` : `US$${Math.round(v / 1e6)}m`);

export function ProfilePanel({ p, L }: { p: Profile; L: Lang }) {
  const u = T[L]; const tier = p.tier ? TIERS.find((t) => t.id === p.tier) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Kpi label={u.trade} value={p.facts.tradeUsdM ? bn(p.facts.tradeUsdM * 1e6) : "n/a"} sub={p.facts.tradeYear ? `${p.facts.tradeYear}${p.facts.tradeCagr != null ? ` · ${(p.facts.tradeCagr * 100).toFixed(1)}%/yr` : ""}` : undefined} /><Kpi label={u.inv} value={bn(p.facts.invOutUsd)} /><Kpi label={u.aid} value={p.facts.aid5Usd ? bn(p.facts.aid5Usd) : "none"} /><Kpi label={u.rank} value={p.facts.rank ? `#${p.facts.rank}` : "n/a"} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title={u.dims} hint={u.dimsH}><div className="grid items-start gap-3 sm:grid-cols-[minmax(0,230px)_1fr]"><Radar6 size={250} labels={DIMS.map((d) => (L === "ar" ? d.ar : d.en))} series={[{ name: p.name, color: "var(--accent)", values: DIMS.map((d) => p.dims[d.id].s) }]} /><div className="space-y-2">{DIMS.map((d) => <ScoreRow key={d.id} label={L === "ar" ? d.ar : d.en} value={p.dims[d.id].s} ev={p.dims[d.id].ev} hint={d.id === "hard" || d.id === "dur" ? u.hint : undefined} />)}</div></div></Block>
        <Block title={u.axes} hint={u.axesH} right={tier ? <Pill c="var(--accent)" title={tier.definition}>{u.tier}: {tier.id} {tx(tier.name, L)}</Pill> : undefined}><div className="grid items-start gap-3 sm:grid-cols-[minmax(0,230px)_1fr]"><Radar6 size={250} labels={RADAR_AXES.map((a) => (L === "ar" ? a.ar : a.en))} series={[{ name: p.name, color: "var(--c2)", values: RADAR_AXES.map((a) => p.axes[a.id].s) }]} /><div className="space-y-2"><div className="rounded-[10px] bg-bg2 p-2.5 text-[12px] text-t0">{L === "ar" ? "المركّب" : "Composite"} <b className="num text-[15px]">{p.composite}</b></div>{RADAR_AXES.map((a) => <ScoreRow key={a.id} label={L === "ar" ? a.ar : a.en} value={p.axes[a.id].s} ev={p.axes[a.id].ev} />)}</div></div></Block>
      </div>
      <Block title={u.rec}><ul className="space-y-1.5 text-[12.5px] leading-snug text-t0">{p.recs.map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-accent">▸</span>{r}</li>)}</ul></Block>
    </div>
  );
}

type Tab = "strategy" | "council" | "brief" | "examples";
/** Country, regional and global strategy: the dataset profile, the click-started strategy dossier or enhancement strategy, the Council, the Country Brief and the worked examples. */
export function CountryStrategy({ L, f, setF, list, by, set, scope }: { L: Lang; f: Filters; setF: (p: Partial<Filters>) => void; list: Country[]; by: Map<string, Country>; set: ProfileSet | null; scope: "country" | "regional" | "global" }) {
  const u = T[L]; const [tab, setTab] = useState<Tab>("strategy"); const [mode, setMode] = useState<"dossier" | "enhance">("dossier"); const [q, setQ] = useState(STRAT_PRESETS[0][1]); const [ins, setIns] = useState<string[]>([]);
  const iso = scope === "global" && !f.iso ? "WLD" : f.iso; const isScopeId = !!iso && SCOPE_BY.has(iso); const c = iso ? by.get(iso) : undefined; const name = c ? (L === "ar" && c.nameAr ? c.nameAr : c.name) : "";
  const profile = set && iso ? set.profiles.find((p) => p.iso3 === iso) : undefined; const key = iso ? `gd-strat:${iso}:${mode}` : null; const run = useRun(iso, key);
  useEffect(() => { const t = setTimeout(() => { try { const h = JSON.parse(sessionStorage.getItem("gd-handoff") ?? "null") as { mode?: string } | null; if (h?.mode === "enhance") { setMode("enhance"); sessionStorage.removeItem("gd-handoff"); } } catch { /* none */ } }, 0); return () => clearTimeout(t); }, []);
  const refusal = refusalText([q, f.objective], L);
  const members = useMemo(() => (isScopeId && set ? set.profiles.filter((p) => { const s = SCOPE_BY.get(iso!)!; return s.kind === "region" ? p.region === s.key : s.kind === "subregion" ? p.subregion === s.key : false; }) : []), [isScopeId, iso, set]);
  const start = () => { if (!iso || refusal) return; void run.run({ kind: "strategy", mode, lang: L, question: q, instruments: ins, ...filterBody(f) }, profile && set ? { snap: snapOf(profile, set.sources) } : undefined); };
  const s = run.saved; const html = () => briefingHtml(s!.report, { title: `${name}: ${mode === "enhance" ? u.enhance : u.dossier}`, rtl: L === "ar", foot: `${s!.model} · ${s!.at}`, classification: classification(L === "ar" ? "ar" : "en") });
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <Block title={u.subject}>
        {scope === "country" ? <CountryPicker list={list} value={iso && !isScopeId ? iso : null} onPick={(i) => setF({ iso: i })} L={L} /> : <ScopePicker list={list} value={iso} onPick={(i) => setF({ iso: i })} L={L} />}
      </Block>
      {!iso ? <p className="rounded-[12px] border border-line bg-bg1 p-4 text-[13px] text-t1">{u.pick}</p> : (<>
        <Tabs<Tab> tabs={[{ id: "strategy", label: u.strategy }, { id: "council", label: u.council }, ...(scope === "country" ? [{ id: "brief" as Tab, label: u.brief }, { id: "examples" as Tab, label: u.examples }] : [])]} value={tab} onChange={setTab} label={name} />
        {tab === "strategy" && (<div className="space-y-4">
          {profile ? <ProfilePanel p={profile} L={L} /> : isScopeId && members.length > 0 ? <Block title={`${u.rollup}: ${members.length} ${u.n}`}><div className="grid gap-2 sm:grid-cols-3">{DIMS.map((d) => <div key={d.id} className="rounded-[10px] bg-bg2 p-2.5 text-[12px]"><span className="text-t1">{L === "ar" ? d.ar : d.en}</span><b className="num float-end text-t0">{(members.reduce((a, x) => a + x.dims[d.id].s, 0) / members.length).toFixed(1)}</b></div>)}</div><p className="mt-2 text-[11px] text-t2">{[...members].sort((a, b) => b.composite - a.composite).slice(0, 6).map((m) => `${m.name} ${m.composite}`).join(" · ")}</p></Block> : set ? <p className="text-[12px] text-t2">{u.noProfile}</p> : null}
          <Block title={mode === "enhance" ? u.enhance : u.dossier}>
            <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={u.mode}>{(["dossier", "enhance"] as const).map((m) => <button key={m} role="radio" aria-checked={mode === m} type="button" onClick={() => setMode(m)} className={`h-8 rounded-full px-3 text-[12.5px] ${mode === m ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{u[m]}</button>)}</div>
            <Question value={q} onChange={setQ} presets={STRAT_PRESETS} label={u.q} /><div className="mt-3"><span className="label mb-1 block">{u.ins}</span><InstrumentChips value={ins} onChange={setIns} L={L} /></div><Refusal text={refusal} />
            <RunBar phase={run.phase} onRun={start} onCancel={run.cancel} disabled={!!refusal || q.trim().length < 8} L={L} label={s ? u.regen : mode === "enhance" ? u.genE : scope === "country" ? u.gen : u.genScope} cost={u.cost[mode]} />
            <Progress phase={run.phase} status={run.status} tail={run.tail} searches={run.searches} sources={run.sources} err={run.err} L={L} />
          </Block>
          {s && run.phase !== "running" && (<>
            <div className="flex flex-wrap items-center gap-2"><span className="numt text-[11.5px] text-t1">{c?.flag} {name} · {u.saved} {s.at.slice(0, 16).replace("T", " ")} UTC · {u.spent} {usd(s.usage.usd)} · {s.usage.searches} {L === "ar" ? "بحثًا" : "searches"}{s.cached ? (L === "ar" ? " · من الذاكرة" : " · cached") : ""}</span>
              <span className="ms-auto flex flex-wrap gap-1.5"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(s.report); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Copy size={13} />{copied ? u.copied : u.copy}</button><button type="button" onClick={() => saveBlob(`${iso}-${mode}-strategy.md`, "text/markdown", s.report)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />.md</button><button type="button" onClick={() => printBriefing(html())} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Printer size={13} />{u.pdf}</button></span></div>
            <StrategyVisual md={s.report} L={L} iso3={iso} />
          </>)}
        </div>)}
        {tab === "council" && <CouncilTab L={L} iso={iso} name={name} f={f} set={set} />}
        {tab === "brief" && scope === "country" && <BriefTab L={L} iso={iso} name={name} f={f} set={set} profile={profile} />}
        {tab === "examples" && scope === "country" && <ExamplesTab L={L} />}
      </>)}
    </div>
  );
}
