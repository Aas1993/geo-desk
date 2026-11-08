"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, Newspaper, RefreshCw, Search } from "lucide-react";
import { useT } from "@/lib/store";
import { DEFAULT_FILTER, angleCounts, filterItems, groupByDay, itemClip, newSince, outletCounts, readSeen, snapshotSeen, undated, writeSeen, type Angle, type Filter, type Seen } from "@/lib/hub/model";
import { displayName } from "@/lib/countries";
import { regionLabel } from "@/lib/regions";
import { Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useStored } from "../deep/hooks";
import { useTr } from "../case/bits";
import { AngleChips, Freshness, ItemCard, MiniPanel, SummaryPanel } from "./HubParts";
import { ClipTray } from "./ClipTray";
import { useClips } from "./useClips";
import { useHubData } from "./useHubData";

const WINDOWS = [7, 30, 90] as const;
const TONES = [["all", "All marks", "كل العلامات"], ["opportunity", "Opportunity", "فرصة"], ["risk", "Risk", "خطر"], ["neutral", "Neutral", "محايد"]] as const;

/** THE COUNTRY UPDATES HUB: a country's current national, political, economic and security updates from every angle on one live board: the seven news angles and the UAE-linked coverage, the dated visits and engagements, UAE deal headlines, alerts that name the country, macro movers, and agreements and flights on file. Filter by angle, window, outlet and mark; see what is new since you last looked; clip what matters into the reports. Free: it reads feeds and held data and starts no paid run (the optional summary is click-started and capped). */
export function HubApp({ iso, compact }: { iso: string; compact?: boolean }) {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { by } = useCountryList(); const c = by.get(iso);
  const names = useMemo(() => [c?.name ?? "", c?.nameAr ?? ""].filter(Boolean), [c?.name, c?.nameAr]); const hub = useHubData(c ? iso : null, names, L === "ar");
  const [f0, setF] = useStored<Filter>("gd-hub-filter", DEFAULT_FILTER); const f = useMemo<Filter>(() => ({ ...DEFAULT_FILTER, ...f0, angles: f0.angles ?? [], outlets: f0.outlets ?? [] }), [f0]);
  const tray = useClips(iso); const clipped = useMemo(() => new Set(tray.clips.map((x) => x.id)), [tray.clips]); const [flash, setFlash] = useState("");
  // the last visit: read once per country; the marker stays for this visit and is moved forward when the page is left (after a few seconds) or when "mark as read" is pressed
  const [seen, setSeen] = useState<Seen | null | undefined>(undefined); const loadedAt = useRef(0);
  useEffect(() => { const k = setTimeout(() => setSeen(readSeen(iso)), 0); return () => clearTimeout(k); }, [iso]);
  useEffect(() => { if (hub.at) loadedAt.current = hub.at; }, [hub.at]);
  const itemsRef = useRef(hub.items); useEffect(() => { itemsRef.current = hub.items; }, [hub.items]);
  useEffect(() => { const stamp = () => { if (itemsRef.current.length && loadedAt.current && Date.now() - loadedAt.current > 8000) writeSeen(iso, snapshotSeen(itemsRef.current, Date.now())); }; window.addEventListener("pagehide", stamp); return () => { window.removeEventListener("pagehide", stamp); stamp(); }; }, [iso]);
  const fresh = useMemo(() => newSince(hub.items, seen ?? null), [hub.items, seen]);
  const markRead = useCallback(() => { const s = snapshotSeen(hub.items, Date.now()); writeSeen(iso, s); setSeen(s); setF((p) => ({ ...p, onlyNew: false })); }, [hub.items, iso, setF]);
  const now = hub.at || 0; const shown = useMemo(() => (now ? filterItems(hub.items, f, now, fresh) : []), [hub.items, f, now, fresh]);
  const counts = useMemo(() => angleCounts(hub.items, f, now || 1), [hub.items, f, now]);
  const outlets = useMemo(() => outletCounts(hub.items), [hub.items]); const days = groupByDay(shown); const onFile = undated(shown);
  const toggleAngle = (a: Angle) => setF((p) => ({ ...DEFAULT_FILTER, ...p, angles: (p.angles ?? []).includes(a) ? (p.angles ?? []).filter((x) => x !== a) : [...(p.angles ?? []), a] }));
  const set = (patch: Partial<Filter>) => setF((p) => ({ ...DEFAULT_FILTER, ...p, ...patch }));
  const onClip = (id: string) => { const x = hub.items.find((y) => y.id === id); if (!x) return; if (clipped.has(id)) { tray.remove(id); setFlash(""); return; } const r = tray.add(itemClip(x, iso)); setFlash(r.full ? t("The tray is full (60 clips). Remove one first.", "الصينية ممتلئة (60 مقتطفًا). أزل واحدًا أولًا.") : t("Added to the report tray.", "أُضيف إلى صينية التقرير.")); };
  if (!c) return <p className="text-[12.5px] text-t2">{t("Loading the country…", "جارٍ تحميل الدولة…")}</p>;
  const name = displayName(c, L); const nNew = fresh.size;
  const list = (
    <div className="space-y-3">
      {days.map((g) => <section key={g.day} aria-label={g.day}><h4 className="label mb-1.5 num">{g.day}</h4><ul className="space-y-1.5">{g.items.map((x) => <ItemCard key={x.id} x={x} L={L} isNew={fresh.has(x.id)} clipped={clipped.has(x.id)} onClip={() => onClip(x.id)} compact={compact} />)}</ul></section>)}
      {onFile.length > 0 && <section aria-label={t("On file", "محفوظ")}><h4 className="label mb-1 block">{t("On file: not dated by day", "محفوظ: غير مؤرخ باليوم")}</h4><p className="mb-1.5 text-[11px] text-t2">{t("Annual macro readings, agreements dated by year and flight-route changes. The files give no day dates, so the window does not apply; items new since your last visit are marked.", "قراءات اقتصادية سنوية واتفاقيات مؤرخة بالسنة وتغييرات مسارات الطيران. الملفات لا تعطي تواريخ بالأيام فلا تنطبق النافذة؛ وتُعلَّم العناصر الجديدة منذ زيارتك الأخيرة.")}</p><ul className="space-y-1.5">{onFile.map((x) => <ItemCard key={x.id} x={x} L={L} isNew={fresh.has(x.id)} clipped={clipped.has(x.id)} onClip={() => onClip(x.id)} compact={compact} />)}</ul></section>}
      {!hub.loading && shown.length === 0 && <p className="rounded-[12px] border border-dashed border-line p-4 text-[12.5px] leading-snug text-t1">{hub.items.length ? t("No update matches these filters. Widen the window, clear an angle or the search.", "لا مستجد يطابق هذه المرشحات. وسّع النافذة أو أزل زاوية أو البحث.") : t("Nothing came back from the sources for this country. See Sources and freshness for which ones failed.", "لم تُرجع المصادر شيئًا لهذه الدولة. راجع المصادر وحداثتها لمعرفة ما أخفق.")}</p>}
    </div>
  );
  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-2.5">
        {!compact && <span className="text-[34px] leading-none" aria-hidden>{c.flag}</span>}
        <div className="min-w-0 flex-1">{!compact && <h1 className="display flex items-center gap-2 text-[24px] font-semibold tracking-tight text-t0"><Newspaper size={20} className="text-accent" aria-hidden />{t("Country Updates Hub", "مركز مستجدات الدولة")}: {name}</h1>}
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-t1">{compact ? <b className="text-t0">{t("Updates from every angle", "مستجدات من كل زاوية")}</b> : <Pill c="var(--t2)">{regionLabel(c.region, L)}</Pill>}{hub.at > 0 && <span className="text-t2">{t("loaded", "حُمّل")} {new Date(hub.at).toISOString().slice(11, 16)} UTC</span>}</p></div>
        <button type="button" onClick={hub.reload} disabled={hub.loading} aria-label={t("Reload the sources", "إعادة تحميل المصادر")} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-accent disabled:opacity-50"><RefreshCw size={13} className={hub.loading ? "animate-spin" : ""} aria-hidden />{t("Reload", "تحديث")}</button>
        {compact && <Link href={`/hub/${iso}`} className="inline-flex h-8 items-center rounded-[8px] bg-accent px-2.5 text-[12px] font-semibold text-[var(--accent-ink)]">{t("Open the full hub", "افتح المركز كاملًا")}</Link>}
      </header>
      {hub.loading && <p role="status" className="text-[12px] text-t2">{t("Reading the news angles, visits, deals, alerts and held data…", "جارٍ قراءة زوايا الأخبار والزيارات والصفقات والتنبيهات والبيانات المحفوظة…")}</p>}
      {!hub.loading && seen !== undefined && (seen === null
        ? <p className="rounded-[10px] border border-line bg-bg1 p-2.5 text-[12px] text-t1">{t("First visit to this country's hub: nothing to compare yet. From now on, what is new since you last looked is marked.", "أول زيارة لمركز هذه الدولة: لا شيء للمقارنة بعد. من الآن تُعلَّم المستجدات منذ آخر مرة نظرت فيها.")} <button type="button" onClick={markRead} className="text-accent underline">{t("Start tracking now", "ابدأ التتبع الآن")}</button></p>
        : <div role="status" className="flex flex-wrap items-center gap-2 rounded-[10px] border border-accent/40 bg-bg1 p-2.5 text-[12.5px] text-t0"><b className="num">{nNew}</b> {t(nNew === 1 ? "update is new since you last looked" : "updates are new since you last looked", "مستجدًا جديدًا منذ آخر مرة نظرت فيها")} <span className="text-t2">({new Date(seen.at).toISOString().slice(0, 16).replace("T", " ")} UTC)</span>
          {nNew > 0 && <button type="button" aria-pressed={f.onlyNew} onClick={() => set({ onlyNew: !f.onlyNew })} className="inline-flex h-7 items-center rounded-[8px] border border-line px-2 text-[11.5px] text-t1 hover:border-accent">{f.onlyNew ? t("Show all", "اعرض الكل") : t("Show only new", "اعرض الجديد فقط")}</button>}
          <button type="button" onClick={markRead} className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-line px-2 text-[11.5px] text-t1 hover:border-accent"><CheckCheck size={12} aria-hidden />{t("Mark as read", "تعليم كمقروء")}</button></div>)}
      {hub.sources.length > 0 && <Freshness L={L} sources={hub.sources} />}
      <section aria-label={t("Filters", "المرشحات")} className="space-y-2 rounded-[14px] border border-line bg-bg1 p-3">
        <AngleChips L={L} counts={counts} on={f.angles} onToggle={toggleAngle} onClear={() => set({ angles: [] })} />
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <div className="min-w-48 flex-1"><label htmlFor="hub-days" className="label mb-1 flex justify-between"><span>{t("Time window", "النافذة الزمنية")}</span><b className="num text-accent">{f.days} {t("days", "يومًا")}</b></label><input id="hub-days" type="range" min={0} max={2} step={1} value={Math.max(0, WINDOWS.indexOf(f.days))} onChange={(e) => set({ days: WINDOWS[+e.target.value] })} aria-valuetext={`${f.days} ${t("days", "يومًا")}`} className="w-full accent-[var(--accent)]" /><div className="num flex justify-between text-[10.5px] text-t2" dir="ltr"><span>7</span><span>30</span><span>90</span></div></div>
          <div role="group" aria-label={t("Marks", "العلامات")} className="flex flex-wrap gap-1">{TONES.map(([id, en, ar]) => <button key={id} type="button" aria-pressed={f.tone === id} onClick={() => set({ tone: id })} className="inline-flex h-8 items-center rounded-full border px-2.5 text-[11.5px]" style={{ borderColor: f.tone === id ? "var(--accent)" : "var(--line)", color: f.tone === id ? "var(--accent)" : "var(--t1)" }}>{t(en, ar)}</button>)}</div>
          <div className="relative min-w-40 flex-1"><Search size={13} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-t2" aria-hidden /><input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("Search the updates…", "ابحث في المستجدات…")} aria-label={t("Search the updates", "ابحث في المستجدات")} className="h-8 w-full rounded-[8px] border border-line bg-bg2 ps-8 pe-2 text-[12px] text-t0" /></div>
        </div>
        {outlets.length > 0 && <div role="group" aria-label={t("Source and outlet", "المصدر والمنفذ")} className="flex flex-wrap items-center gap-1"><span className="label me-1">{t("Outlet", "المنفذ")}</span>{outlets.slice(0, compact ? 6 : 12).map((o) => { const on = f.outlets.includes(o.name); return <button key={o.name} type="button" aria-pressed={on} onClick={() => set({ outlets: on ? f.outlets.filter((x) => x !== o.name) : [...f.outlets, o.name] })} className="inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px]" style={{ borderColor: on ? "var(--accent)" : "var(--line)", color: on ? "var(--accent)" : "var(--t1)" }}>{o.name}<span className="num opacity-70">{o.n}</span></button>; })}{f.outlets.length > 0 && <button type="button" onClick={() => set({ outlets: [] })} className="text-[11px] text-accent underline">{t("clear", "مسح")}</button>}</div>}
        {f.days > 7 && <p className="text-[11px] text-t2">{t("The news feeds reach back 7 days (14 for UAE-linked); the longer windows add the visits, deal headlines and alerts the files hold for that period.", "تمتد تغذيات الأخبار 7 أيام (14 للمرتبط بالإمارات)؛ وتضيف النوافذ الأطول الزيارات وعناوين الصفقات والتنبيهات التي تحتفظ بها الملفات لتلك الفترة.")}</p>}
      </section>
      {flash && <p role="status" className="text-[12px] text-ok">{flash}</p>}
      {compact ? <div className="space-y-3">{list}<ClipTray L={L} iso={iso} name={name} tray={tray} compact /></div>
        : <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><div>{list}</div><aside className="space-y-3 lg:sticky lg:top-3 lg:self-start"><MiniPanel c={c} L={L} counts={counts} total={shown.length} /><ClipTray L={L} iso={iso} name={name} tray={tray} /><SummaryPanel L={L} iso={iso} name={name} items={shown} />
          <p className="text-[11px] leading-snug text-t2">{t("Marks are keyword rules on the headline (risk words, opportunity words), shown with the words found; they are not an assessment. Nothing here is scored or invented; a source that did not answer is shown as such.", "العلامات قواعد كلمات مفتاحية على العنوان (كلمات خطر وفرصة) تُعرض مع الكلمات التي وُجدت؛ وليست تقييمًا. لا شيء هنا مُقيَّم أو مختلق؛ والمصدر الذي لم يجب يظهر كذلك.")}</p></aside></div>}
    </div>
  );
}
