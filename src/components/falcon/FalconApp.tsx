"use client";
import { useCallback, useEffect, useState } from "react";
import { Crosshair, Eye, FlaskConical, Globe2, Library, Radar, ShieldCheck, Telescope } from "lucide-react";
import { useT } from "@/lib/store";
import { DossierWorkspace } from "../DossierWorkspace";
import { Pill, SRC_STATE, type Lang } from "./bits";
import { CommandCenter } from "./CommandCenter";
import { RadarView } from "./RadarView";
import { CountryDesk, ForesightDesk, LabDesk, useSaved, type Launch } from "./Desks";
import { LibraryView } from "./LibraryView";
import { PlatformView, type Section } from "./PlatformView";
import { useCountryList, useWorld } from "./hooks";

const SECTIONS: { id: Section; icon: typeof Radar; en: string; ar: string }[] = [
  { id: "command", icon: Radar, en: "Command Center", ar: "مركز القيادة" }, { id: "radar", icon: Crosshair, en: "Radar", ar: "الرادار" }, { id: "countries", icon: Globe2, en: "Country Desk", ar: "مكتب الدولة" }, { id: "foresight", icon: Telescope, en: "Foresight", ar: "الاستشراف" },
  { id: "lab", icon: FlaskConical, en: "Scenario Lab", ar: "مختبر السيناريوهات" }, { id: "library", icon: Library, en: "Library", ar: "المكتبة" }, { id: "platform", icon: ShieldCheck, en: "Platform", ar: "المنصة" },
];
const T = {
  en: { sub: "UAE-first intelligence, foresight and decision support, built on the Geo Desk datasets. Evidence as of", asOf: "Dubai", cover: "Scheduled and event-triggered refreshes, not continuous monitoring: each dataset's build date is on the Command Center. AI products are open-source analysis, never classified assessments, and are proposals for human decision.", load: "Loading the world model…", err: "The world model could not be loaded. The datasets are read from files on the server; try again in a moment." },
  ar: { sub: "استخبارات واستشراف ودعم قرار يضع الإمارات أولًا، مبني على بيانات «جيو ديسك». الأدلة حتى", asOf: "دبي", cover: "تحديثات مجدولة ومحفَّزة بالأحداث لا رصد مستمر: تاريخ بناء كل مجموعة بيانات في مركز القيادة. منتجات الذكاء الاصطناعي تحليل مفتوح المصدر لا تقييمات سرية، وهي مقترحات لقرار بشري.", load: "جارٍ تحميل نموذج العالم…", err: "تعذّر تحميل نموذج العالم. تُقرأ البيانات من ملفات على الخادم؛ حاول بعد قليل." },
} as const;

/** Falcon Eye: the intelligence console of Geo Desk. One shared world model and one set of saved products feed seven sections; every AI product opens in the same briefing workspace. */
export function FalconApp() {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const world = useWorld(); const { list, by } = useCountryList(); const saved = useSaved();
  const [section, setSection] = useState<Section>("command"); const [iso, setIso] = useState<string | null>(null); const [launch, setLaunch] = useState<Launch | null>(null);
  useEffect(() => { const t = setTimeout(() => { const h = location.hash.replace("#", "").split(":"); if (SECTIONS.some((s) => s.id === h[0])) setSection(h[0] as Section); if (/^[A-Z]{3}$/.test(h[1] ?? "")) setIso(h[1]); }, 0); return () => clearTimeout(t); }, []);
  const go = useCallback((s: Section) => { setSection(s); try { history.replaceState(null, "", `#${s}${iso ? `:${iso}` : ""}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); }, [iso]);
  const pick = useCallback((i: string, to?: Section) => { setIso(i); const s = to ?? "countries"; setSection(s); try { history.replaceState(null, "", `#${s}:${i}`); } catch { /* ignore */ } }, []);
  const cur = world && world !== "err" ? world : null; const cs = cur?.sources.reduce<Record<string, number>>((m, s) => ((m[s.state] = (m[s.state] ?? 0) + 1), m), {}) ?? {};
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Eye size={22} /></span>{L === "ar" ? "عين الصقر" : "FALCON EYE"}</h1>
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-snug text-t1">{u.sub} <b className="num text-t0">{cur?.asOf ?? "…"}</b> ({u.asOf}).</p><p className="mt-1 max-w-3xl text-[11px] leading-snug text-t2">{u.cover}</p></div>
        {cur && <div className="flex flex-wrap gap-1.5">{(["current", "due", "stale"] as const).map((k) => (cs[k] ?? 0) > 0 && <Pill key={k} c={SRC_STATE[k].c}>{cs[k]} {SRC_STATE[k][L]}</Pill>)}</div>}
      </header>
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="Falcon Eye sections" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-[84px] lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
          {SECTIONS.map((s) => { const I = s.icon; const on = section === s.id; return <button key={s.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go(s.id)} className={`flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors ${on ? "bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]" : "text-t1 hover:bg-bg3 hover:text-t0"}`}><I size={16} />{s[L]}</button>; })}
        </nav>
        <main className="min-w-0">
          {!cur ? <p className="rounded-[12px] border border-line bg-bg1 p-4 text-[13px] text-t1">{world === "err" ? u.err : u.load}</p> : (<>
            {section === "command" && <CommandCenter world={cur} L={L} onPick={(i) => pick(i)} openRadar={() => go("radar")} />}
            {section === "radar" && <RadarView world={cur} L={L} onPick={(i) => pick(i)} />}
            {section === "countries" && <CountryDesk world={cur} list={list} by={by} iso={iso} setIso={(i) => pick(i, "countries")} L={L} launch={setLaunch} />}
            {section === "foresight" && <ForesightDesk list={list} by={by} iso={iso} setIso={(i) => { setIso(i); }} L={L} launch={setLaunch} saved={saved} />}
            {section === "lab" && <LabDesk list={list} by={by} iso={iso} setIso={(i) => { setIso(i); }} L={L} launch={setLaunch} saved={saved} />}
            {section === "library" && <LibraryView by={by} L={L} launch={setLaunch} />}
            {section === "platform" && <PlatformView L={L} go={go} />}
          </>)}
        </main>
      </div>
      {launch && <DossierWorkspace key={`${launch.mode}-${launch.c.iso3}`} c={launch.c} mode={launch.mode} initial={launch.initial} target={launch.target} onClose={() => { setLaunch(null); window.dispatchEvent(new Event("storage")); }} />}
    </div>
  );
}
