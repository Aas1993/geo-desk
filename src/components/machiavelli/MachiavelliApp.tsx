"use client";
import { useFollowCountry } from "@/lib/country";
import { useCallback, useEffect, useState } from "react";
import { Compass, Gauge, GitBranch, Globe2, Landmark, ListChecks, Map as MapIcon, ScrollText, ShieldAlert, Wrench } from "lucide-react";
import { useT } from "@/lib/store";
import { DOMAINS, FILTER_HORIZONS, ISSUES } from "@/lib/dossier/strategy";
import { Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { CountryStrategy } from "./CountryStrategy";
import { DeliveryView } from "./DeliveryView";
import { ExternalView } from "./ExternalView";
import { GlobalPosition, RegionalStrategy } from "./GlobalRegional";
import { HistoryView } from "./HistoryView";
import { IndicatorsView } from "./IndicatorsView";
import { InstrumentsView } from "./InstrumentsView";
import { ScenarioStudio } from "./ScenarioStudio";
import { useFilters } from "./filters";
import { useProfiles } from "./useRun";

type Section = "global" | "regional" | "country" | "instruments" | "history" | "scenarios" | "external" | "delivery" | "indicators";
const SECTIONS: { id: Section; icon: typeof Globe2; en: string; ar: string }[] = [
  { id: "global", icon: Globe2, en: "Global Position", ar: "الموقف العالمي" }, { id: "regional", icon: MapIcon, en: "Regional Strategy", ar: "الاستراتيجية الإقليمية" }, { id: "country", icon: Landmark, en: "Country Strategy", ar: "الاستراتيجية القُطرية" },
  { id: "instruments", icon: Wrench, en: "Power Instruments", ar: "أدوات القوة" }, { id: "history", icon: ScrollText, en: "History and Benchmarks", ar: "التاريخ والمقارنات" }, { id: "scenarios", icon: GitBranch, en: "Scenarios", ar: "السيناريوهات" },
  { id: "external", icon: ShieldAlert, en: "External Influence", ar: "التأثير الخارجي" }, { id: "delivery", icon: ListChecks, en: "Strategy and Delivery", ar: "الاستراتيجية والتنفيذ" }, { id: "indicators", icon: Gauge, en: "Indicators and Review", ar: "المؤشرات والمراجعة" },
];
const T = {
  en: { title: "MACHIAVELLIAN", sub: "UAE strategic influence and long-term partnerships", about: "A candid, UAE-first, evidence-led lens on interests, capabilities, institutions, credibility, economic value, competition and long-term consequences. The aim is durable influence through legitimate cooperation. It never plans takeover, covert infiltration, proxy subversion, identity-based manipulation or coercive control; Machiavelli is a critical historical lens, not an instruction manual. Open-source analysis and proposals for human decision: nothing here authorises contact, spending or security activity.", issue: "Issue", horizon: "Horizon", domain: "Security domain", cutoff: "Evidence cutoff", objective: "Approved strategic objective", objPh: "The objective this work serves (kept in this browser, passed to the products as desk input)", lang: "Language follows the site toggle", filters: "Filters", clear: "Clear", load: "Loading the strategic profiles…", err: "The strategic profiles could not be loaded: the datasets are read from files on the server.", built: "Datasets built", nav: "Machiavellian sections" },
  ar: { title: "الميكيافيلي", sub: "النفوذ الاستراتيجي للإمارات والشراكات طويلة الأمد", about: "عدسة صريحة تضع الإمارات أولًا وتستند إلى الأدلة، في المصالح والقدرات والمؤسسات والمصداقية والقيمة الاقتصادية والمنافسة والعواقب بعيدة المدى. الهدف نفوذ دائم عبر التعاون المشروع. ولا تُخطِّط الوحدة أبدًا لاستيلاء أو تسلل خفي أو تخريب بالوكالة أو تلاعب على أساس الهوية أو سيطرة قسرية؛ وميكيافيلي عدسة تاريخية نقدية لا دليل تعليمات. تحليل مفتوح المصدر ومقترحات لقرار بشري: ولا شيء هنا يجيز اتصالًا أو إنفاقًا أو نشاطًا أمنيًا.", issue: "القضية", horizon: "الأفق", domain: "المجال الأمني", cutoff: "حد الأدلة", objective: "الهدف الاستراتيجي المعتمد", objPh: "الهدف الذي يخدمه هذا العمل (يُحفظ في هذا المتصفح ويُمرَّر إلى المنتجات مدخلًا من المكتب)", lang: "اللغة تتبع مفتاح الموقع", filters: "التصفية", clear: "مسح", load: "جارٍ تحميل الملفات الاستراتيجية…", err: "تعذّر تحميل الملفات الاستراتيجية: تُقرأ البيانات من ملفات على الخادم.", built: "بناء البيانات", nav: "أقسام الميكيافيلي" },
} as const;
const ISSUE_AR: Record<string, string> = { "": "أي قضية", trade: "التجارة والنفاذ إلى الأسواق", investment: "الاستثمار والتمويل", corridor: "الممرات والموانئ واللوجستيات", energy: "الطاقة والموارد", technology: "التقنية والمعايير", diplomacy: "الدبلوماسية والتعددية", development: "التنمية والإغاثة", education: "التعليم والبحث والثقافة" };
const DOMAIN_AR: Record<string, string> = { "": "بلا مجال أمني", policy: "التعاون الأمني الدفاعي (مستوى السياسات)", maritime: "مرونة الملاحة ونقاط الاختناق", cyber: "مرونة الفضاء السيبراني والبنية الحيوية", "energy-security": "أمن الطاقة وسلاسل الإمداد" };
const HZ_AR: Record<string, string> = { all: "كل الآفاق", short: "قصير (0–18 شهرًا)", medium: "متوسط (18 شهرًا–5 سنوات)", long: "طويل (5–10 سنوات)" };

/** GeoDesk's Machiavellian Strategic Influence module (Phase 3): a top-level sibling of Falcon Eye with its own sections, persistent filters and shared evidence. */
export function MachiavelliApp() {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const { list, by } = useCountryList(); const set = useProfiles(); const [f, setF] = useFilters(); const [section, setSection] = useState<Section>("country"); const [today, setToday] = useState("");
  useEffect(() => { const t = setTimeout(() => { setToday(new Date().toISOString().slice(0, 10)); const h = location.hash.replace("#", "").split(":"); if (SECTIONS.some((s) => s.id === h[0])) setSection(h[0] as Section); }, 0); return () => clearTimeout(t); }, []);
  useFollowCountry(f.iso && f.iso !== "ARE" ? f.iso : null, (i) => setF({ iso: i })); // the country is shared by every page (src/lib/country.ts)
  const go = useCallback((s: Section) => { setSection(s); try { history.replaceState(null, "", `#${s}${f.iso ? `:${f.iso}` : ""}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); }, [f.iso]);
  const sets = set && set !== "err" ? set : null; const built = sets ? Object.entries(sets.sources).map(([k, v]) => `${k} ${v?.slice(0, 10) ?? "n/a"}`).join(" · ") : "";
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Compass size={22} /></span>{u.title}</h1><p className="text-[13px] font-medium text-t1">{u.sub}</p><p className="max-w-3xl text-[11.5px] leading-snug text-t2">{u.about}</p></header>
      <section aria-label={u.filters} className="rounded-[14px] border border-line bg-bg1 p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-[11px] text-t2">{u.issue}<select value={f.issue} onChange={(e) => setF({ issue: e.target.value })} className="mt-0.5 h-9 w-full rounded-[8px] border border-line bg-bg2 px-2 text-[12.5px] text-t0">{ISSUES.map(([k, v]) => <option key={k} value={k}>{L === "ar" ? ISSUE_AR[k] : v}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.horizon}<select value={f.horizon} onChange={(e) => setF({ horizon: e.target.value })} className="mt-0.5 h-9 w-full rounded-[8px] border border-line bg-bg2 px-2 text-[12.5px] text-t0">{FILTER_HORIZONS.map(([k, v]) => <option key={k} value={k}>{L === "ar" ? HZ_AR[k] : v}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.domain}<select value={f.domain} onChange={(e) => setF({ domain: e.target.value })} className="mt-0.5 h-9 w-full rounded-[8px] border border-line bg-bg2 px-2 text-[12.5px] text-t0">{DOMAINS.map(([k, v]) => <option key={k} value={k}>{L === "ar" ? DOMAIN_AR[k] : v}</option>)}</select></label>
          <label className="text-[11px] text-t2">{u.cutoff}<input type="date" value={f.cutoff} max={today || undefined} onChange={(e) => setF({ cutoff: e.target.value })} className="mt-0.5 h-9 w-full rounded-[8px] border border-line bg-bg2 px-2 text-[12.5px] text-t0" /></label>
          <div className="flex items-end gap-2"><Pill c="var(--t2)">{u.lang}</Pill>{(f.issue || f.horizon !== "all" || f.domain || f.cutoff || f.objective) && <button type="button" onClick={() => setF({ issue: "", horizon: "all", domain: "", cutoff: "", objective: "" })} className="h-7 rounded-full bg-bg3 px-2.5 text-[11px] text-t1 hover:text-t0">{u.clear}</button>}</div>
        </div>
        <label className="mt-2.5 block text-[11px] text-t2">{u.objective}<textarea rows={2} maxLength={500} value={f.objective} onChange={(e) => setF({ objective: e.target.value })} placeholder={u.objPh} className="mt-0.5 w-full rounded-[8px] border border-line bg-bg2 p-2 text-[12.5px] text-t0" /></label>
        {built && <p className="mt-1.5 text-[10.5px] text-t2">{u.built}: {built}</p>}
      </section>
      <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label={u.nav} className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-[84px] lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
          {SECTIONS.map((s) => { const I = s.icon; const on = section === s.id; return <button key={s.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go(s.id)} className={`flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors ${on ? "bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]" : "text-t1 hover:bg-bg3 hover:text-t0"}`}><I size={16} />{s[L]}</button>; })}
        </nav>
        <main className="min-w-0">
          {set === "err" && <p role="alert" className="mb-3 rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{u.err}</p>}
          {set === null && <p className="mb-3 text-[12px] text-t2">{u.load}</p>}
          {section === "global" && <GlobalPosition L={L} f={f} setF={setF} list={list} by={by} set={set} />}
          {section === "regional" && <RegionalStrategy L={L} f={f} setF={setF} list={list} by={by} set={set} />}
          {section === "country" && <CountryStrategy L={L} f={f} setF={setF} list={list} by={by} set={sets} scope="country" />}
          {section === "instruments" && <InstrumentsView L={L} list={list} />}
          {section === "history" && <HistoryView L={L} />}
          {section === "scenarios" && <ScenarioStudio L={L} f={f} setF={setF} list={list} by={by} set={sets} />}
          {section === "external" && <ExternalView L={L} f={f} setF={setF} list={list} by={by} />}
          {section === "delivery" && <DeliveryView L={L} f={f} by={by} set={sets} />}
          {section === "indicators" && <IndicatorsView L={L} f={f} by={by} set={sets} />}
        </main>
      </div>
    </div>
  );
}
