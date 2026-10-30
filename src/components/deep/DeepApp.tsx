"use client";
import { useFollowCountry } from "@/lib/country";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpenText, Brain, Building2, Globe2, Landmark, LineChart, Gauge, Library, Ship, X } from "lucide-react";
import { useT } from "@/lib/store";
import { REGION_TERMS, TOPICS } from "@/lib/deep/sources";
import { SCOPES } from "@/lib/falcon/scopes";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { CountryTab } from "./CountryTab";
import { DeepTab } from "./DeepTab";
import { EconTab } from "./EconTab";
import { FinTab } from "./FinTab";
import { ForecastTab } from "./ForecastTab";
import { IndicatorsTab } from "./IndicatorsTab";
import { MarketsTab } from "./MarketsTab";
import { ResearchTab } from "./ResearchTab";
import { TradeTab } from "./TradeTab";
import { useDeepFilters, useResearch, useSnapshot } from "./hooks";

type Tab = "fe01" | "fe02" | "fe03" | "fe04" | "fe05" | "fe06" | "fe07" | "fe08" | "fe09" | "fe10";
const TABS: { id: Tab; icon: typeof Globe2; en: string; ar: string }[] = [
  { id: "fe01", icon: Library, en: "UAE Think Tanks", ar: "مراكز الفكر الإماراتية" }, { id: "fe02", icon: BookOpenText, en: "Global Think Tanks", ar: "مراكز الفكر العالمية" }, { id: "fe03", icon: Landmark, en: "Country and Regional", ar: "الدولة والإقليم" },
  { id: "fe04", icon: BarChart3, en: "Economic Intelligence", ar: "الاستخبارات الاقتصادية" }, { id: "fe05", icon: Building2, en: "Financial Conditions", ar: "الأحوال المالية" }, { id: "fe06", icon: LineChart, en: "Markets and Companies", ar: "الأسواق والشركات" },
  { id: "fe07", icon: Ship, en: "Trade and Investment", ar: "التجارة والاستثمار" }, { id: "fe08", icon: Gauge, en: "Forecasts and Scenarios", ar: "التوقعات والسيناريوهات" }, { id: "fe09", icon: Gauge, en: "Indicators and Benchmarks", ar: "المؤشرات والمقارنات" }, { id: "fe10", icon: Brain, en: "Deep Intelligence", ar: "الاستخبارات المعمّقة" },
];
const T = {
  en: { title: "DEEP INTELLIGENCE", sub: "FALCON EYE second feature set: research, economy, finance, markets and trade in one evidence-linked workspace", about: "Specialist tabs keep their depth; the Deep Intelligence tab joins them and the Full Consolidated Intelligence button produces one UAE decision assessment. Everything here is computed from the datasets the desk holds, with its limits stated; where a source is not connected the desk says so instead of filling the gap. Paid AI steps start only from a click, under a US$1 ceiling.", filters: "Shared filters", country: "Country", none: "UAE only", region: "Region", topic: "Topic", sector: "Sector", horizon: "Horizon", lang: "Language", asOf: "As-of date", access: "Access", any: "Any", years: "years", feed: "Direct feed", search: "Headline search", en: "English", ar: "Arabic", clear: "Clear", asOfNote: "The as-of date limits research cards to those published on or before it. Economic and trade series are shown as at the current data vintage; earlier as-of views need the vintage store to hold earlier snapshots.", related: "Related", sit: "Situation room", mk: "Markets", fal: "Falcon", mac: "Machiavellian", lowfilter: "Geography: the headquarters of a research institution and the geography a paper analyses are separate facts; the country filter selects what a paper is about." },
  ar: { title: "الاستخبارات المعمّقة", sub: "المجموعة الثانية من ميزات عين الصقر: الأبحاث والاقتصاد والمال والأسواق والتجارة في مساحة عمل واحدة موصولة بالأدلة", about: "تحتفظ التبويبات المتخصصة بعمقها؛ ويجمعها تبويب الاستخبارات المعمّقة، ويُنتج زر الاستخبارات الموحدة الكاملة تقييمًا واحدًا لقرار الإمارات. كل ما هنا محسوب من مجموعات البيانات التي تحتفظ بها اللوحة مع بيان حدودها؛ وحيث لا يكون المصدر مربوطًا تصرّح اللوحة بذلك بدل سدّ الفجوة. ولا تبدأ خطوات الذكاء الاصطناعي المدفوعة إلا بنقرة وتحت سقف 1 دولار.", filters: "المرشحات المشتركة", country: "الدولة", none: "الإمارات فقط", region: "الإقليم", topic: "الموضوع", sector: "القطاع", horizon: "الأفق", lang: "اللغة", asOf: "تاريخ الحالة", access: "النفاذ", any: "الكل", years: "سنوات", feed: "تغذية مباشرة", search: "بحث عناوين", en: "الإنجليزية", ar: "العربية", clear: "مسح", asOfNote: "يقيّد تاريخ الحالة بطاقات الأبحاث بما نُشر في ذلك التاريخ أو قبله. وتُعرض السلاسل الاقتصادية والتجارية كما في إصدار البيانات الحالي؛ وتحتاج العروض الأقدم إلى لقطات أقدم في مخزن الإصدارات.", related: "ذو صلة", sit: "غرفة الأوضاع", mk: "الأسواق", fal: "الصقر", mac: "الميكيافيلي", lowfilter: "الجغرافيا: مقر المؤسسة البحثية والجغرافيا التي تحللها الورقة حقيقتان منفصلتان؛ ومرشح الدولة يختار موضوع الورقة." },
} as const;
const SECTORS = SCOPES.filter((s) => s.kind === "sector");

/** FALCON EYE second feature set: ten tabs on shared filters and one shared data snapshot, joined by the Deep Intelligence workspace. */
export function DeepApp() {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const { list, by } = useCountryList(); const [f, setF] = useDeepFilters(); const [tab, setTab] = useState<Tab>("fe10"); const iso = f.iso && f.iso !== "ARE" ? f.iso : null;
  useFollowCountry(iso, (i) => setF({ iso: i })); // the country is shared by every page (src/lib/country.ts)
  const snap = useSnapshot(iso); const res = useResearch(iso); const [today, setToday] = useState("");
  useEffect(() => { const t = setTimeout(() => { setToday(new Date().toISOString().slice(0, 10)); const h = location.hash.replace("#", "").split(":")[0] as Tab; if (TABS.some((x) => x.id === h)) setTab(h); }, 0); return () => clearTimeout(t); }, []);
  const go = useCallback((x: Tab) => { setTab(x); try { history.replaceState(null, "", `#${x}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); }, []);
  const c = iso ? by.get(iso) : null; const nm = c ? (L === "ar" && c.nameAr ? c.nameAr : c.name) : null;
  const props = useMemo(() => ({ L, f, setF, snap: snap.data, snapErr: snap.err, snapLoading: snap.loading, res: res.data, resErr: res.err, resLoading: res.loading, reloadRes: res.reload, list, by, name: nm, go: go as (t: string) => void }), [L, f, setF, snap.data, snap.err, snap.loading, res.data, res.err, res.loading, res.reload, list, by, nm, go]);
  const sel = "mt-0.5 h-9 w-full rounded-[8px] border border-line bg-bg2 px-2 text-[12.5px] text-t0";
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Brain size={20} /></span>{u.title}</h1><p className="text-[13px] font-medium text-t0">{u.sub}</p><p className="max-w-4xl text-[12.5px] leading-relaxed text-t1">{u.about}</p>
        <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-t2">{u.related}: <Link href="/" className="text-accent hover:underline">{u.sit}</Link><Link href="/markets" className="text-accent hover:underline">{u.mk}</Link><Link href="/falcon" className="text-accent hover:underline">{u.fal}</Link><Link href="/machiavelli" className="text-accent hover:underline">{u.mac}</Link></p></header>
      <section aria-label={u.filters} className="rounded-[14px] border border-line bg-bg1 p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-[11px] text-t2"><span className="block">{u.country}</span><div className="mt-0.5 flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => setF({ iso: i })} L={L} /></div>{iso && <button type="button" onClick={() => setF({ iso: null })} aria-label={u.none} title={u.none} className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div>
          <label className="text-[11px] text-t2">{u.region}<select value={f.region} onChange={(e) => setF({ region: e.target.value })} className={sel}><option value="">{u.any}</option>{REGION_TERMS.map((r) => <option key={r.id} value={r.id}>{L === "ar" ? r.ar : r.en}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.topic}<select value={f.topic} onChange={(e) => setF({ topic: e.target.value })} className={sel}><option value="">{u.any}</option>{TOPICS.map((r) => <option key={r.id} value={r.id}>{L === "ar" ? r.ar : r.en}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.sector}<select value={f.sector} onChange={(e) => setF({ sector: e.target.value })} className={sel}><option value="">{u.any}</option>{SECTORS.map((r) => <option key={r.id} value={r.id}>{L === "ar" ? r.ar : r.en}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.horizon}<select value={f.horizon} onChange={(e) => setF({ horizon: +e.target.value })} className={sel}>{[1, 3, 5, 10].map((h) => <option key={h} value={h}>{h} {u.years}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.lang}<select value={f.lang} onChange={(e) => setF({ lang: e.target.value as "any" | "en" | "ar" })} className={sel}><option value="any">{u.any}</option><option value="en">{u.en}</option><option value="ar">{u.ar}</option></select></label>
          <label className="text-[11px] text-t2">{u.asOf}<input type="date" value={f.asOf} max={today || undefined} onChange={(e) => setF({ asOf: e.target.value })} className={sel} /></label>
          <label className="text-[11px] text-t2">{u.access}<select value={f.access} onChange={(e) => setF({ access: e.target.value as "any" | "feed" | "search" })} className={sel}><option value="any">{u.any}</option><option value="feed">{u.feed}</option><option value="search">{u.search}</option></select></label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] leading-snug text-t2">{(f.iso || f.region || f.topic || f.sector || f.lang !== "any" || f.asOf || f.access !== "any") && <button type="button" onClick={() => setF({ iso: null, region: "", topic: "", sector: "", lang: "any", asOf: "", access: "any" })} className="h-6 rounded-full bg-bg3 px-2.5 text-[11px] text-t1 hover:text-t0">{u.clear}</button>}{nm && <Pill c="var(--accent)">{c?.flag} {nm}</Pill>}<span>{u.lowfilter}</span></div>
        <p className="mt-1 text-[10.5px] leading-snug text-t2">{u.asOfNote}</p>
      </section>
      <nav aria-label="FALCON EYE" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((x, i) => { const I = x.icon; const on = tab === x.id; return <button key={x.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go(x.id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[12.5px] ${on ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg1 text-t1 hover:text-t0"}`}><I size={15} /><span className="num text-[10px] opacity-70">FE{String(i + 1).padStart(2, "0")}</span>{L === "ar" ? x.ar : x.en}</button>; })}
      </nav>
      <main className="min-w-0 space-y-4">
        {tab === "fe01" && <ResearchTab {...props} kind="uae" />}
        {tab === "fe02" && <ResearchTab {...props} kind="global" />}
        {tab === "fe03" && <CountryTab {...props} />}
        {tab === "fe04" && <EconTab {...props} />}
        {tab === "fe05" && <FinTab {...props} />}
        {tab === "fe06" && <MarketsTab {...props} />}
        {tab === "fe07" && <TradeTab {...props} />}
        {tab === "fe08" && <ForecastTab {...props} />}
        {tab === "fe09" && <IndicatorsTab {...props} />}
        {tab === "fe10" && <DeepTab {...props} />}
      </main>
    </div>
  );
}
