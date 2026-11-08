"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CaseData } from "@/lib/case/load";
import type { Alert } from "@/lib/alerts";
import { loadVisits, type Visit } from "@/lib/diplomacy-client";
import { loadAgreements, type AgCountry } from "@/lib/agreements-client";
import { loadFlights, type FlightCountry } from "@/lib/flights-client";
import { NEWS_ANGLES, buildItems, type Angle, type HubItem, type NewsRow } from "@/lib/hub/model";

/** One source's state for the freshness strip: loaded or failed, how many items, how old the newest is. */
export type SourceStat = { id: string; label: { en: string; ar: string }; ok: boolean; n: number; newest: number | null; note?: { en: string; ar: string } };
export type HubData = { items: HubItem[]; sources: SourceStat[]; d: CaseData | null; loading: boolean; at: number; reload: () => void };
const getJson = async <T,>(url: string): Promise<T | null> => { try { const r = await fetch(url); return r.ok ? ((await r.json()) as T) : null; } catch { return null; } };

/** Loads every source the hub reads for one country, in parallel; a source that fails is reported (never silently empty) and the rest still show. `names` are the country's names, for matching alert titles. */
export function useHubData(iso: string | null, names: string[], ar: boolean): HubData {
  const [s, set] = useState<{ iso: string | null; news: { angle: Angle; items: NewsRow[]; ok: boolean }[]; visits: Visit[] | null; d: CaseData | null; alerts: Alert[] | null; ag: AgCountry | null | undefined; fl: FlightCountry | null | undefined; at: number } | null>(null); const [n, setN] = useState(0);
  useEffect(() => {
    if (!iso) return; let dead = false;
    void (async () => {
      const reads = await Promise.all([...NEWS_ANGLES.map((a) => ({ a, u: `/api/news/${iso}?topic=${a}` })), { a: "uae" as Angle, u: `/api/news/${iso}?uae=1` }].map(async ({ a, u }) => { const j = await getJson<{ items?: NewsRow[]; error?: boolean }>(u); return { angle: a as Angle, items: j?.items ?? [], ok: !!j && !j.error }; }));
      const [visits, d, al, ag, fl] = await Promise.all([loadVisits().catch(() => null), getJson<CaseData>(`/api/case/${iso}`), getJson<{ items?: Alert[] }>("/api/alerts"), loadAgreements().catch(() => null), loadFlights().catch(() => null)]);
      if (!dead) set({ iso, news: reads, visits: visits?.items ?? null, d, alerts: al?.items ?? null, ag: ag ? ag.countries[iso] ?? null : undefined, fl: fl ? fl.countries[iso] ?? null : undefined, at: Date.now() });
    })();
    return () => { dead = true; };
  }, [iso, n]);
  const mine = s && s.iso === iso ? s : null; const key = names.join("|");
  const items = useMemo(() => (mine && iso ? buildItems({ news: mine.news, visits: mine.visits ?? [], d: mine.d, alerts: mine.alerts ?? [], names: key ? key.split("|") : [], ag: mine.ag, fl: mine.fl, iso, year: new Date(mine.at).getUTCFullYear(), ar }) : []), [mine, iso, key, ar]);
  const sources = useMemo<SourceStat[]>(() => {
    if (!mine || !iso) return []; const of = (k: HubItem["kind"][]) => items.filter((x) => k.includes(x.kind)); const newest = (xs: HubItem[]) => xs.reduce<number | null>((a, x) => (x.ts != null && (a == null || x.ts > a) ? x.ts : a), null);
    const nOk = mine.news.filter((x) => x.ok).length; const news = of(["news"]);
    return [
      { id: "news", label: { en: "News by angle", ar: "الأخبار بحسب الزاوية" }, ok: nOk > 0, n: news.length, newest: newest(news), note: { en: `${nOk} of ${mine.news.length} angle reads answered; reaches back 7 days (14 for UAE-linked)`, ar: `أجابت ${nOk} من ${mine.news.length} قراءات؛ تمتد 7 أيام (14 للمرتبط بالإمارات)` } },
      { id: "visits", label: { en: "Visits and engagements (WAM)", ar: "الزيارات والتفاعلات (وام)" }, ok: mine.visits != null, n: of(["visit"]).length, newest: newest(of(["visit"])), note: { en: "since November 2024", ar: "منذ نوفمبر 2024" } },
      { id: "deals", label: { en: "UAE deal headlines", ar: "عناوين الصفقات الإماراتية" }, ok: !!mine.d, n: of(["deal"]).length, newest: newest(of(["deal"])), note: { en: "the forty most recent for the country", ar: "أحدث أربعين للدولة" } },
      { id: "alerts", label: { en: "Alerts (title mentions)", ar: "التنبيهات (ذكر في العنوان)" }, ok: mine.alerts != null, n: of(["alert"]).length, newest: newest(of(["alert"])), note: { en: "the alert feed has no country field: matched on the country's name", ar: "لا حقل دولة في التنبيهات: المطابقة باسم الدولة" } },
      { id: "macro", label: { en: "Macro movers (annual data)", ar: "تحركات الاقتصاد الكلي (بيانات سنوية)" }, ok: !!mine.d, n: of(["macro"]).length, newest: null, note: { en: "no equity feed is held for this country", ar: "لا بيانات أسهم لهذه الدولة" } },
      { id: "onfile", label: { en: "Agreements and flights (on file)", ar: "الاتفاقيات والرحلات (محفوظة)" }, ok: mine.ag !== undefined && mine.fl !== undefined, n: of(["agreement", "flight"]).length, newest: null, note: { en: "not dated by day in the files", ar: "غير مؤرخة باليوم في الملفات" } },
    ];
  }, [mine, iso, items]);
  const reload = useCallback(() => { set(null); setN((x) => x + 1); }, []);
  return { items, sources, d: mine?.d ?? null, loading: !!iso && !mine, at: mine?.at ?? 0, reload };
}
