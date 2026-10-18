"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Star, X, ArrowLeftRight, Bookmark, Printer } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { displayName } from "@/lib/countries";
import { useCountries } from "./SearchBox";
import { OverviewTab, EconomyTab, TradeTab, MilitaryTab, SocietyTab, NewsTab } from "./tabs";
import { UNTab } from "./tabs2";
import { BriefTab } from "./BriefTab";
import { MinisterTab } from "./MinisterTab";
import { AgreementsTab } from "./AgreementsTab";
import { MediaTab } from "./MediaTab";
import { DiplomacyTab } from "./DiplomacyTab";
import { IconBtn } from "./ui";
import { useDashboard } from "@/lib/dashboard-store";
import { printOnePager } from "@/lib/one-pager";
import type { Country, CountryDetail, TabId } from "@/lib/types";

const TABS: TabId[] = ["overview", "brief", "minister", "economy", "trade", "agreements", "diplomacy", "media", "military", "un", "society", "news"];
const cache = new Map<string, CountryDetail>(); const stamp = new Map<string, number>(); // weather and air quality are part of the detail, so it is refreshed when older than 15 minutes
const fresh = (iso: string) => (stamp.get(iso) ?? 0) > Date.now() - 900_000;

export function useDetail(c: Country | undefined) {
  const [state, set] = useState<{ iso: string; data: CountryDetail | null; err: boolean } | null>(null);
  const [n, setN] = useState(0);
  const iso = c?.iso3; const lat = c?.lat; const lng = c?.lng; const qid = c?.qid;
  useEffect(() => {
    if (!iso || (cache.has(iso) && fresh(iso))) return;
    let dead = false;
    fetch(`/api/country/${iso}?lat=${lat ?? ""}&lng=${lng ?? ""}&qid=${qid ?? ""}`).then((r) => { if (!r.ok) throw 0; return r.json() as Promise<CountryDetail>; })
      .then((data) => { cache.set(iso, data); stamp.set(iso, Date.now()); if (!dead) set({ iso, data, err: false }); })
      .catch(() => { if (!dead) set({ iso, data: null, err: true }); });
    return () => { dead = true; };
  }, [iso, lat, lng, qid, n]);
  const hit = iso ? cache.get(iso) : undefined;
  const mine = state && state.iso === iso ? state : null;
  const retry = useCallback(() => { set(null); setN((x) => x + 1); }, []);
  return { data: hit ?? mine?.data ?? null, loading: !hit && !mine, error: !hit && !!mine?.err, retry };
}

/** Adds or removes the country from the dashboard watchlist. */
function WatchBtn({ iso3 }: { iso3: string }) {
  const watched = useDashboard((d) => d.watch.includes(iso3)); const toggle = useDashboard((d) => d.toggleWatch); const { lang } = useT();
  return <IconBtn label={watched ? (lang === "ar" ? "إزالة من المتابعة" : "Remove from watchlist") : (lang === "ar" ? "متابعة" : "Add to watchlist")} active={watched} onClick={() => toggle(iso3)}><Bookmark size={16} fill={watched ? "currentColor" : "none"} /></IconBtn>;
}

export function CountryPanel() {
  const { t, lang } = useT(); const d = useCountries();
  const { sel, tab, setTab, select, desk, setDesk, sheet, setSheet, cmpOpen, openCompare, cmp } = useStore();
  const bar = useRef<HTMLDivElement>(null); const body = useRef<HTMLDivElement>(null);
  const c = sel && d ? d.byIso.get(sel) : undefined;
  const detail = useDetail(c);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [sel, tab]);
  if (!sel || !c || cmpOpen) return null;
  const isDesk = desk === c.iso3;
  const sheetH = { peek: "h-[30vh]", half: "h-[58vh]", full: "h-[calc(100dvh-140px)]" }[sheet];
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.indexOf(tab); const dir = document.documentElement.dir === "rtl" ? -1 : 1;
    const go = e.key === "ArrowRight" ? i + dir : e.key === "ArrowLeft" ? i - dir : -1;
    if (go >= 0 && go < TABS.length) { e.preventDefault(); setTab(TABS[go]); (bar.current?.children[go] as HTMLElement)?.focus(); }
  };
  return (
    <section aria-label={displayName(c, lang)} key={c.iso3}
      className={`glass anim-slide fixed inset-x-2 bottom-[72px] z-30 flex flex-col rounded-t-[16px] ${sheetH} sm:absolute sm:inset-x-auto sm:bottom-16 sm:start-3 sm:top-[76px] sm:h-auto sm:w-[420px] sm:rounded-[16px]`}>
      <button aria-label="Resize" onClick={() => setSheet(sheet === "half" ? "full" : sheet === "full" ? "peek" : "half")} className="grid h-5 shrink-0 place-items-center sm:hidden"><i className="h-1 w-10 rounded-full bg-line" /></button>
      <header className="flex items-start gap-3 px-4 pb-2 pt-1 sm:pt-4">
        <span className="text-[34px] leading-none" aria-hidden>{c.flag}</span>
        <div className="min-w-0 flex-1">
          <h2 className="display line-clamp-2 text-[22px] font-semibold leading-tight">{displayName(c, lang)}</h2>
          <p className="truncate text-[13px] text-t1">{lang === "ar" ? c.name : c.nameAr ?? ""}</p>
          <p className="truncate text-[12px] text-t2">{c.region}</p>
        </div>
        <WatchBtn iso3={c.iso3} />
        <IconBtn label={lang === "ar" ? "موجز من صفحة واحدة (طباعة)" : "One-page brief (print / PDF)"} onClick={() => void printOnePager(c, lang)} className="max-sm:hidden"><Printer size={16} /></IconBtn>
        <IconBtn label={isDesk ? t("yourDesk") : t("setDesk")} active={isDesk} onClick={() => setDesk(isDesk ? null : c.iso3)}><Star size={17} fill={isDesk ? "currentColor" : "none"} /></IconBtn>
        <IconBtn label={t("compare")} onClick={() => openCompare(cmp && cmp !== c.iso3 ? cmp : desk && desk !== c.iso3 ? desk : c.iso3 !== "ARE" ? "ARE" : null)} className="max-sm:hidden"><ArrowLeftRight size={16} /></IconBtn>
        <IconBtn label={t("close")} onClick={() => select(null)}><X size={18} /></IconBtn>
      </header>
      <div className="flex gap-2 px-4 pb-2 sm:hidden">
        <button onClick={() => openCompare(cmp && cmp !== c.iso3 ? cmp : desk && desk !== c.iso3 ? desk : c.iso3 !== "ARE" ? "ARE" : null)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1"><ArrowLeftRight size={13} />{t("compare")}</button>
        <button onClick={() => void printOnePager(c, lang)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1"><Printer size={13} />{lang === "ar" ? "موجز (طباعة)" : "Brief (PDF)"}</button>
      </div>
      <div className="relative border-b border-line">
        <div ref={bar} role="tablist" aria-label="Sections" onKeyDown={onKey} className="no-scrollbar flex overflow-x-auto px-2">
          {TABS.map((id) => (
            <button key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}
              className={`shrink-0 border-b-2 px-2 py-2.5 text-[12.5px] font-medium transition-colors ${tab === id ? "border-accent text-accent" : "border-transparent text-t1 hover:text-t0"}`}>{t(`tab_${id}` as "tab_overview")}</button>
          ))}
        </div>
        
      </div>
      <div ref={body} role="tabpanel" className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}>
        {tab === "overview" && <OverviewTab c={c} detail={detail} />}
        {tab === "brief" && <BriefTab c={c} />}
        {tab === "minister" && (c.iso3 === "ARE" ? <p className="text-[13px] text-t1">{lang === "ar" ? "موجز الوزير يخص الدول التي تلتقي بها الإمارات." : "The ministerial brief covers the countries the UAE meets with."}</p> : <MinisterTab c={c} />)}
        {tab === "economy" && <EconomyTab c={c} detail={detail} />}
        {tab === "agreements" && <AgreementsTab c={c} />}
        {tab === "diplomacy" && <DiplomacyTab c={c} />}
        {tab === "media" && <MediaTab c={c} />}
        {tab === "trade" && <TradeTab c={c} detail={detail} />}
        {tab === "un" && <UNTab c={c} />}
        {tab === "military" && <MilitaryTab detail={detail} />}
        {tab === "society" && <SocietyTab detail={detail} />}
        {tab === "news" && <NewsTab c={c} />}
      </div>
    </section>
  );
}
