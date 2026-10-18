"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, LayoutDashboard, Plus, Sparkles, Star, X } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { PRESETS, WIDGETS, useDashboard, type WidgetId } from "@/lib/dashboard-store";
import { useAlerts } from "@/lib/alerts-client";
import { useVisits, wamUrl } from "@/lib/diplomacy-client";
import { useToneMap } from "@/lib/media/client";
import { last } from "@/lib/format";
import { useCountries } from "./SearchBox";
import { Markdown } from "./Markdown";
import { TvWidget } from "./TradingView";
import { Skeleton } from "./ui";
import { ClosestPartners } from "./Partnership";
import { ExportDemand } from "./OutlookCard";
import type { CountryDetail } from "@/lib/types";

type L = "en" | "ar";
const km = (a: [number, number], b: [number, number]) => { const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r, x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const dayStr = (d: string, lang: L) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const ago = (ts: number, now: number) => { const m = Math.max(0, Math.round((now - ts) / 60000)); return m < 60 ? `${m}m` : m < 2880 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
/** Small fetch hook for dashboard widgets; refreshes every `every` ms while mounted. */
function useJson<T>(url: string | null, every = 0): { data: T | null; err: boolean } {
  const [s, set] = useState<{ url: string; data: T | null; err: boolean } | null>(null);
  useEffect(() => { if (!url) return; let dead = false; const run = () => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!dead) set({ url, data: d as T, err: false }); }).catch(() => { if (!dead) set({ url, data: null, err: true }); }); run(); const i = every ? setInterval(run, every) : undefined; return () => { dead = true; if (i) clearInterval(i); }; }, [url, every]);
  return s && s.url === url ? { data: s.data, err: s.err } : { data: null, err: false };
}
function useNow(ms = 30_000) { const [n, setN] = useState(0); useEffect(() => { const t = setTimeout(() => setN(Date.now()), 0); const i = setInterval(() => setN(Date.now()), ms); return () => { clearTimeout(t); clearInterval(i); }; }, [ms]); return n; }

const T = {
  en: { dash: "Dashboard", add: "Add widget", fold: "Fold all", save: "Save current layout", name: "Layout name", empty: "No widgets. Add one above or pick a preset.", close: "Close", openFeed: "Open the full feed", nearby: "Nearby now", within: "within 1,500 km of the capital, from the live feeds", ev: "conflict & protest events today", hz: "natural hazards", out: "internet disruption events (24 h)", rw: "ransomware leak-site postings, 30 days", vis: "official engagements this week", neighbours: "Neighbours", ask: "Ask", change: "Change", watch: "Watch", watching: "Watching", addCountry: "Add a country…", noWatch: "No countries yet. Add some, or use the star in a country panel.", genBrief: "Generate", openBrief: "Open brief", noBrief: "No brief yet", runWorld: "Write world brief", running: "Writing…", cost: "Cost", cachedL: "cached", senior: "Senior only", all: "All", odds: "Prices on open prediction markets, not forecasts we endorse.", building: "Being built; check back soon.", warm: "Warmest", cool: "Coolest", world30: "worldwide in 30 days", top: "Most affected", gdp: "GDP growth", infl: "Inflation", unemp: "Unemployment", more: "Open", noData: "Nothing to show yet.", nextLaunch: "Next launches", aiNote: "AI wording over the listed sources; check before quoting. Each new run bills your Anthropic account.", suggestions: ["What happened in this country this week?", "Risks in the coming days", "Trade and relations with the UAE"], tv: "Live news (official YouTube streams)", source: "Source" },
  ar: { dash: "لوحة المعلومات", add: "إضافة أداة", fold: "طي الكل", save: "حفظ التخطيط الحالي", name: "اسم التخطيط", empty: "لا توجد أدوات. أضف أداة أو اختر قالبًا.", close: "إغلاق", openFeed: "فتح الموجز الكامل", nearby: "حولك الآن", within: "ضمن 1,500 كم من العاصمة، من البث المباشر", ev: "أحداث نزاع واحتجاج اليوم", hz: "كوارث طبيعية", out: "أحداث انقطاع الإنترنت (24 ساعة)", rw: "منشورات فدية على مواقع التسريب، 30 يومًا", vis: "تفاعلات رسمية هذا الأسبوع", neighbours: "الجيران", ask: "اسأل", change: "تغيير", watch: "متابعة", watching: "قيد المتابعة", addCountry: "أضف دولة…", noWatch: "لا توجد دول بعد. أضف دولًا أو استخدم النجمة في لوحة الدولة.", genBrief: "إنشاء", openBrief: "فتح الموجز", noBrief: "لا يوجد موجز بعد", runWorld: "اكتب موجز العالم", running: "جارٍ الكتابة…", cost: "التكلفة", cachedL: "مخزّن", senior: "رفيع فقط", all: "الكل", odds: "أسعار أسواق التوقعات المفتوحة، وليست توقعات نتبناها.", building: "قيد البناء؛ عد قريبًا.", warm: "الأدفأ", cool: "الأبرد", world30: "حول العالم خلال 30 يومًا", top: "الأكثر تأثرًا", gdp: "نمو الناتج", infl: "التضخم", unemp: "البطالة", more: "فتح", noData: "لا شيء للعرض بعد.", nextLaunch: "عمليات الإطلاق القادمة", aiNote: "صياغة بالذكاء الاصطناعي فوق المصادر المدرجة؛ تحقق قبل الاقتباس. كل تشغيل جديد يُحتسب على حساب Anthropic.", suggestions: ["ماذا حدث في هذه الدولة هذا الأسبوع؟", "المخاطر في الأيام المقبلة", "التجارة والعلاقات مع الإمارات"], tv: "أخبار مباشرة (بث يوتيوب الرسمي)", source: "المصدر" },
} as const;

function Wid({ id, children }: { id: WidgetId; children: React.ReactNode }) {
  const { lang } = useT(); const d = useDashboard(); const w = WIDGETS.find((x) => x.id === id)!; const folded = !!d.folded[id]; const i = d.widgets.indexOf(id);
  return (
    <section className="rounded-[12px] border border-line bg-bg1/60">
      <header className="flex items-center gap-1 px-3 py-2"><button onClick={() => d.fold(id)} aria-expanded={!folded} className="flex flex-1 items-center gap-1.5 text-start"><span aria-hidden>{w.ico}</span><span className="label">{lang === "ar" ? w.ar : w.en}</span>{folded ? <ChevronRight size={13} className="text-t2" /> : <ChevronDown size={13} className="text-t2" />}</button>
        <button onClick={() => d.move(id, -1)} disabled={i <= 0} aria-label="Move up" className="grid size-6 place-items-center rounded text-t2 hover:text-t0 disabled:opacity-30"><ArrowUp size={13} /></button>
        <button onClick={() => d.move(id, 1)} disabled={i >= d.widgets.length - 1} aria-label="Move down" className="grid size-6 place-items-center rounded text-t2 hover:text-t0 disabled:opacity-30"><ArrowDown size={13} /></button>
        <button onClick={() => d.remove(id)} aria-label="Remove" className="grid size-6 place-items-center rounded text-t2 hover:text-down"><X size={13} /></button></header>
      {!folded && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}
const Li = ({ children }: { children: React.ReactNode }) => <li className="py-1.5 text-[12.5px] leading-snug text-t0">{children}</li>;
const Meta = ({ children }: { children: React.ReactNode }) => <div className="num mt-0.5 text-[10.5px] text-t2">{children}</div>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noreferrer noopener" className="hover:text-accent">{children}</a>;

/* ───────── widgets ───────── */
type WeatherFC = { features: { properties: { id: string; title: string; desc?: string }; geometry: { coordinates: [number, number] } }[] };
function BriefW({ lang }: { lang: L }) {
  const u = T[lang]; const cs = useCountries(); const desk = useStore((s) => s.desk) ?? "ARE"; const select = useStore((s) => s.select); const setAsk = useDashboard((s) => s.setAsk); const visits = useVisits(); const toggleWatch = useDashboard((s) => s.toggleWatch); const watched = useDashboard((s) => s.watch.includes(desk));
  const c = cs?.byIso.get(desk); const detail = useJson<CountryDetail>(`/api/country/${desk}`, 600_000); const ev = useJson<{ features: { geometry: { coordinates: [number, number] }; properties: { type: string } }[] }>("/api/layers/events", 600_000);
  const hz = useJson<{ features: { geometry: { coordinates: [number, number] } }[] }>("/api/layers/hazards", 600_000); const out = useJson<{ events: number }>(`/api/outages/${desk}`, 900_000); const rw = useJson<{ countries: Record<string, { n30: number }> }>("/data/ransomware.json"); const wx = useJson<WeatherFC>("/api/layers/weather", 1_800_000); const now = useNow();
  const w = detail.data?.weather; const time = now && w?.tz ? new Date(now).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: w.tz }) : "";
  const cap: [number, number] | null = c?.lng != null && c?.lat != null ? [c.lng, c.lat] : null; const near = (fs?: { geometry: { coordinates: [number, number] } }[]) => (cap && fs ? fs.filter((f) => km(cap, f.geometry.coordinates) <= 1500).length : null);
  const evN = ev.data && cap ? ev.data.features.filter((f) => ["conflict", "protest"].includes(f.properties.type) && km(cap, f.geometry.coordinates) <= 1500).length : null; const hzN = near(hz.data?.features);
  const weekAgo = new Date(now || 0 ? now - 7 * 864e5 : 0).toISOString().slice(0, 10); const visN = now && visits ? visits.items.filter((x) => x.d >= weekAgo && (desk === "ARE" || x.c.includes(desk))).length : null;
  const temps = new Map((wx.data?.features ?? []).map((f) => [f.properties.id.slice(3), f.properties.title.split("°")[0]])); const nb = (c?.borders ?? []).map((b) => cs?.byIso.get(b)).filter((x) => !!x).slice(0, 6);
  if (!c) return <Skeleton h={120} />;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2"><span className="text-[26px] leading-none" aria-hidden>{c.flag}</span><div className="min-w-0 flex-1"><div className="display text-[16px] font-semibold leading-tight">{lang === "ar" && c.nameAr ? c.nameAr : c.name}</div><div className="num text-[11.5px] text-t1">{time}{w?.temp != null ? ` · ${Math.round(w.temp)}°` : ""}{w?.aqi != null ? ` · AQI ${w.aqi}` : ""}{c.capital ? ` · ${c.capital}` : ""}</div></div>
        <button onClick={() => toggleWatch(desk)} aria-pressed={watched} aria-label={u.watch} className={`grid size-8 place-items-center rounded-md ${watched ? "text-warn" : "text-t2 hover:text-t0"}`}><Star size={16} fill={watched ? "currentColor" : "none"} /></button>
        <button onClick={() => select(desk, "overview")} className="rounded-md bg-bg3 px-2 py-1 text-[11.5px] text-t1 hover:text-t0">{u.more}</button></div>
      <div className="rounded-[10px] bg-bg2 p-2.5"><div className="label mb-1">{u.nearby}</div><p className="mb-1.5 text-[10.5px] text-t2">{u.within}</p>
        <ul className="space-y-1 text-[12.5px]">{[[evN, u.ev], [hzN, u.hz], [out.data?.events ?? null, u.out], [rw.data?.countries[desk]?.n30 ?? null, u.rw], [visN, u.vis]].map(([n, label], i) => <li key={i} className="flex items-baseline gap-2"><span className="num w-7 text-end font-semibold text-t0">{n ?? "…"}</span><span className="text-t1">{label as string}</span></li>)}</ul></div>
      <TvWidget kind="ticker-tape" height={78} title="Markets" config={{ symbols: [{ proName: "TVC:UKOIL", title: "Brent" }, { proName: "TVC:GOLD", title: "Gold" }, { proName: "FX_IDC:USDAED", title: "USD/AED" }, { proName: "DFM:DFMGI", title: "DFM" }, { proName: "ADX:FADGI", title: "ADX" }], showSymbolLogo: false, displayMode: "adaptive" }} />
      {nb.length > 0 && <div><div className="label mb-1">{u.neighbours}</div><div className="flex flex-wrap gap-1.5">{nb.map((n) => <button key={n!.iso3} onClick={() => select(n!.iso3, "overview")} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[12px] hover:border-accent"><span aria-hidden>{n!.flag}</span> {n!.name} <span className="num text-t2">{temps.get(n!.iso3) != null ? `${temps.get(n!.iso3)}°` : ""}</span></button>)}</div></div>}
      <div className="flex flex-wrap gap-1.5">{u.suggestions.map((q) => <button key={q} onClick={() => setAsk(true, `${q.replace(/this country/, c.name)} (${c.name})`)} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11.5px] text-accent hover:bg-accent/20"><Sparkles size={11} />{q}</button>)}</div>
    </div>
  );
}
function AlertsW({ lang }: { lang: L }) {
  const u = T[lang]; const { items } = useAlerts(); const [tab, setTab] = useState<"uae" | "all" | "sec">("uae"); const setAlerts = useStore((s) => s.setAlertsOpen); const now = useNow(); const list = items.filter((a) => (tab === "uae" ? a.uae : tab === "sec" ? a.security : true)).slice(0, 8);
  return (<><div className="mb-1.5 flex gap-1.5">{([["uae", "UAE"], ["all", u.all], ["sec", lang === "ar" ? "أمني" : "Security"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${tab === k ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1"}`}>{l}</button>)}</div>
    {!items.length ? <Skeleton h={80} /> : <ul className="divide-y divide-line/60">{list.map((a) => <Li key={a.id}>{a.url ? <A href={a.url}>{a.title}</A> : a.title}<Meta>{a.src}{now ? ` · ${ago(a.t, now)}` : ""}</Meta></Li>)}</ul>}
    <button onClick={() => setAlerts(true)} className="mt-1.5 text-[12px] text-accent hover:underline">{u.openFeed}</button></>);
}
function WatchlistW({ lang }: { lang: L }) {
  const u = T[lang]; const cs = useCountries(); const { watch, toggleWatch } = useDashboard(); const select = useStore((s) => s.select); const visits = useVisits(); const now = useNow(); const cutoff = now ? new Date(now - 365 * 864e5).toISOString().slice(0, 10) : "";
  return (<>{!watch.length ? <p className="text-[12.5px] text-t2">{u.noWatch}</p> : <ul className="divide-y divide-line/60">{watch.map((iso) => { const c = cs?.byIso.get(iso); const n = visits?.items.filter((x) => x.d >= cutoff && x.c.includes(iso)).length; const lastV = visits?.items.find((x) => x.c.includes(iso));
    return <Li key={iso}><div className="flex items-center gap-2"><button onClick={() => select(iso, "overview")} className="min-w-0 flex-1 truncate text-start hover:text-accent"><span aria-hidden>{c?.flag}</span> {c ? (lang === "ar" && c.nameAr ? c.nameAr : c.name) : iso}</button><span className="num text-[11px] text-t2">{n ?? "…"}</span><button onClick={() => toggleWatch(iso)} aria-label="Remove" className="text-t2 hover:text-down"><X size={13} /></button></div>{lastV && <Meta>{dayStr(lastV.d, lang)} · {lastV.t.slice(0, 70)}</Meta>}</Li>; })}</ul>}
    <select aria-label={u.addCountry} value="" onChange={(e) => e.target.value && toggleWatch(e.target.value)} className="mt-2 h-8 w-full rounded-md border border-line bg-bg2 px-2 text-[12.5px] text-t1"><option value="">{u.addCountry}</option>{(cs?.list ?? []).filter((c) => c.iso3 !== "ARE" && !watch.includes(c.iso3)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}</select></>);
}
function BriefsW({ lang }: { lang: L }) {
  const u = T[lang]; const cs = useCountries(); const watch = useDashboard((s) => s.watch); const select = useStore((s) => s.select); const [cache, setCache] = useState<Record<string, string>>({});
  useEffect(() => { const t = setTimeout(() => { const o: Record<string, string> = {}; for (const iso of watch) { try { const s = localStorage.getItem(`gd-brief2:${iso}:${lang}`); if (s) o[iso] = (JSON.parse(s) as { brief: { headline: string } }).brief.headline; } catch { /* skip */ } } setCache(o); }, 0); return () => clearTimeout(t); }, [watch, lang]);
  if (!watch.length) return <p className="text-[12.5px] text-t2">{u.noWatch}</p>;
  return <ul className="divide-y divide-line/60">{watch.map((iso) => { const c = cs?.byIso.get(iso); return <Li key={iso}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="font-medium">{c?.flag} {c?.name ?? iso}</div><div className="text-[12px] text-t1">{cache[iso] ?? u.noBrief}</div></div><button onClick={() => select(iso, "brief")} className="shrink-0 rounded-md bg-bg3 px-2 py-1 text-[11px] text-t1 hover:text-t0">{cache[iso] ? u.openBrief : u.genBrief}</button></div></Li>; })}</ul>;
}
function WorldW({ lang }: { lang: L }) {
  const u = T[lang]; const key = `gd-world:${lang}`; const [res, setRes] = useState<{ brief: string; at: string; usage: { usd: number | null }; cached?: boolean } | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { const t = setTimeout(() => { try { const s = localStorage.getItem(key); if (s) setRes(JSON.parse(s)); } catch { /* none */ } }, 0); return () => clearTimeout(t); }, [key]);
  const run = async (refresh: boolean) => { setBusy(true); setErr(""); try { const r = await fetch("/api/world-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, refresh }) }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error); setRes(j); try { localStorage.setItem(key, JSON.stringify(j)); } catch { /* ignore */ } } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return (<>{res ? <><div className="text-[12.5px] leading-relaxed"><Markdown source={res.brief} /></div><div className="num mt-1.5 flex items-center gap-2 text-[10.5px] text-t2"><span>{u.cost} {res.usage.usd != null ? `$${res.usage.usd.toFixed(3)}` : "n/a"}{res.cached ? ` · ${u.cachedL}` : ""} · {res.at.slice(0, 16).replace("T", " ")} UTC</span><button onClick={() => run(true)} disabled={busy} className="ms-auto rounded bg-bg3 px-2 py-0.5 text-t1 hover:text-t0">{busy ? u.running : "↻"}</button></div></> :
    <button onClick={() => run(false)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)]"><Sparkles size={14} />{busy ? u.running : u.runWorld}</button>}
    {err && <p role="alert" className="mt-1.5 text-[12px] text-down">{err}</p>}<p className="mt-1.5 text-[10.5px] leading-snug text-t2">{u.aiNote}</p></>);
}
function VisitsW({ lang }: { lang: L }) {
  const u = T[lang]; const v = useVisits(); const cs = useCountries(); const [senior, setSenior] = useState(true); const list = (v?.items ?? []).filter((x) => !senior || x.l === 3).slice(0, 8);
  return (<><button onClick={() => setSenior(!senior)} aria-pressed={senior} className={`mb-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${senior ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1"}`}>{u.senior}</button>
    {!v ? <Skeleton h={90} /> : <ul className="divide-y divide-line/60">{list.map((x) => <Li key={x.u}><A href={wamUrl(x.u)}>{x.t}</A><Meta>{dayStr(x.d, lang)} · {x.c.map((c) => cs?.byIso.get(c)?.name ?? c).join(", ")}</Meta></Li>)}</ul>}</>);
}
type Items = { uae?: { id: string; title: string; url: string; outlet: string; ts: number }[] };
function ThinkW({ lang }: { lang: L }) { const { data, err } = useJson<Items>("/api/media/ARE?part=tanks", 1_800_000); const now = useNow(); return !data ? (err ? <p className="text-[12px] text-t2">{T[lang].noData}</p> : <Skeleton h={90} />) : <ul className="divide-y divide-line/60">{(data.uae ?? []).slice(0, 7).map((x) => <Li key={x.id}><A href={x.url}>{x.title}</A><Meta>{x.outlet}{now ? ` · ${ago(x.ts, now)}` : ""}</Meta></Li>)}</ul>; }
function ToneW({ lang }: { lang: L }) {
  const u = T[lang]; const map = useToneMap(); const cs = useCountries(); const select = useStore((s) => s.select); if (map === undefined) return <Skeleton h={70} />; if (!map) return <p className="text-[12.5px] text-t2">{u.building}</p>;
  const rows = Object.entries(map.countries).filter(([, v]) => v.avg != null).sort((a, b) => (a[1].avg as number) - (b[1].avg as number)); const nm = (k: string) => cs?.byIso.get(k)?.name ?? k;
  const col = (title: string, r: typeof rows) => <div><div className="label mb-1">{title}</div><ul className="space-y-1 text-[12.5px]">{r.map(([k, v]) => <li key={k} className="flex justify-between gap-2"><button onClick={() => select(k, "media")} className="truncate hover:text-accent">{cs?.byIso.get(k)?.flag} {nm(k)}</button><span className="num text-t1">{(v.avg as number).toFixed(1)}</span></li>)}</ul></div>;
  return <><div className="grid grid-cols-2 gap-3">{col(u.cool, rows.slice(0, 5))}{col(u.warm, rows.slice(-5).reverse())}</div><Meta>{lang === "ar" ? "المتوسط العالمي" : "World average"} {map.global.avg.toFixed(1)} · GDELT</Meta></>;
}
function HeadlinesW({ lang }: { lang: L }) { const { data } = useJson<{ items: { outlet: string; title: string; link: string; ts: number }[] }>("/api/headlines", 300_000); const now = useNow(); return !data ? <Skeleton h={100} /> : <ul className="divide-y divide-line/60">{data.items.slice(0, 9).map((h, i) => <Li key={i}><A href={h.link}>{h.title}</A><Meta>{h.outlet}{now ? ` · ${ago(h.ts, now)}` : ""}</Meta></Li>)}</ul>; }
function NewsW({ lang }: { lang: L }) { const { data } = useJson<{ items: { outlet: string; title: string; link: string; ts: number }[] }>("/api/news/ARE?name=United%20Arab%20Emirates", 600_000); const now = useNow(); return !data ? <Skeleton h={100} /> : <ul className="divide-y divide-line/60">{data.items.slice(0, 8).map((h, i) => <Li key={i}><A href={h.link}>{h.title}</A><Meta>{h.outlet}{now ? ` · ${ago(h.ts, now)}` : ""}</Meta></Li>)}</ul>; }
function MarketsW() { return <TvWidget kind="market-overview" height={330} title="Markets" config={{ tabs: [{ title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "DFM:DFMGI", d: "DFM" }, { s: "ADX:FADGI", d: "ADX" }, { s: "FOREXCOM:UK100", d: "FTSE 100" }, { s: "FOREXCOM:GRXEUR", d: "DAX" }] }, { title: "FX", symbols: [{ s: "FX:EURUSD", d: "EUR/USD" }, { s: "FX_IDC:USDAED", d: "USD/AED" }, { s: "FX_IDC:USDSAR", d: "USD/SAR" }, { s: "FX_IDC:USDINR", d: "USD/INR" }] }, { title: "Crypto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }] }], showChart: false, width: "100%", height: "100%", isTransparent: true }} />; }
function CommoditiesW() { return <TvWidget kind="market-overview" height={300} title="Commodities" config={{ tabs: [{ title: "Commodities", symbols: [{ s: "TVC:UKOIL", d: "Brent" }, { s: "TVC:USOIL", d: "WTI" }, { s: "TVC:GOLD", d: "Gold" }, { s: "TVC:SILVER", d: "Silver" }, { s: "NYMEX:NG1!", d: "Natural gas" }, { s: "COMEX:HG1!", d: "Copper" }] }], showChart: false, width: "100%", height: "100%", isTransparent: true }} />; }
function EconomyW({ lang }: { lang: L }) {
  const u = T[lang]; const desk = useStore((s) => s.desk) ?? "ARE"; const { data } = useJson<CountryDetail>(`/api/country/${desk}`, 3_600_000); if (!data) return <Skeleton h={70} />;
  const row = (label: string, k: string) => { const p = last(data.indicators[k]); return <div className="rounded-[8px] border border-line bg-bg2 p-2"><div className="label">{label}</div><div className="num mt-0.5 text-[18px] font-semibold">{p ? `${p.v.toFixed(1)}%` : "—"}</div><div className="num text-[10px] text-t2">{p?.y ?? ""}</div></div>; };
  return <div className="grid grid-cols-3 gap-2">{row(u.gdp, "gdpGrowth")}{row(u.infl, "inflation")}{row(u.unemp, "unemployment")}</div>;
}
function OddsW({ lang }: { lang: L }) { const u = T[lang]; const { data, err } = useJson<{ items: { id: string; title: string; lead: string; p: number; url: string }[] }>("/api/odds", 600_000); return <>{!data ? (err ? <p className="text-[12px] text-t2">{u.noData}</p> : <Skeleton h={90} />) : <ul className="divide-y divide-line/60">{data.items.slice(0, 7).map((o) => <Li key={o.id}><div className="flex items-baseline gap-2"><span className="num w-10 shrink-0 text-end text-[14px] font-semibold text-accent">{o.p}%</span><A href={o.url}>{o.title}{o.lead ? ` — ${o.lead}` : ""}</A></div></Li>)}</ul>}<p className="mt-1 text-[10.5px] text-t2">{u.odds} · Kalshi</p></>; }
function CyberW({ lang }: { lang: L }) {
  const u = T[lang]; const rw = useJson<{ world30: number; countries: Record<string, { n30: number; sectors: { name: string }[] }> }>("/data/ransomware.json"); const desk = useStore((s) => s.desk) ?? "ARE"; const out = useJson<{ events: number; url: string }>(`/api/outages/${desk}`, 900_000); const cs = useCountries(); const select = useStore((s) => s.select);
  if (!rw.data) return <Skeleton h={80} />; const top = Object.entries(rw.data.countries).sort((a, b) => b[1].n30 - a[1].n30).slice(0, 5); const mine = rw.data.countries[desk];
  return <><div className="num text-[12.5px] text-t1"><b className="text-[18px] text-t0">{rw.data.world30}</b> {u.rw.split(",")[0]} {u.world30}</div>
    <div className="mt-2 rounded-[8px] bg-bg2 p-2 text-[12.5px]">{cs?.byIso.get(desk)?.flag} <b className="num">{mine?.n30 ?? 0}</b> {u.rw}{mine?.sectors?.length ? <Meta>{mine.sectors.map((s) => s.name).join(", ")}</Meta> : null}{out.data ? <Meta>{out.data.events} {u.out}</Meta> : null}</div>
    <div className="label mb-1 mt-2">{u.top}</div><ul className="space-y-1 text-[12.5px]">{top.map(([k, v]) => <li key={k} className="flex justify-between"><button onClick={() => select(k, "overview")} className="hover:text-accent">{cs?.byIso.get(k)?.flag} {cs?.byIso.get(k)?.name ?? k}</button><span className="num text-t1">{v.n30}</span></li>)}</ul>
    <Meta>ransomware.live · IODA · {lang === "ar" ? "بدون أسماء الضحايا" : "victim names not shown"}</Meta></>;
}
function WeatherW({ lang }: { lang: L }) {
  const cs = useCountries(); const desk = useStore((s) => s.desk) ?? "ARE"; const select = useStore((s) => s.select); const { data } = useJson<WeatherFC>("/api/layers/weather", 1_800_000); const c = cs?.byIso.get(desk); if (!data || !c || c.lng == null || c.lat == null) return <Skeleton h={80} />;
  const here: [number, number] = [c.lng, c.lat]; const rows = data.features.map((f) => ({ iso: f.properties.id.slice(3), t: f.properties.title, d: km(here, f.geometry.coordinates) })).sort((a, b) => a.d - b.d).slice(0, 9);
  return <ul className="grid grid-cols-3 gap-1.5">{rows.map((r) => { const co = cs?.byIso.get(r.iso); return <li key={r.iso}><button onClick={() => select(r.iso, "overview")} className="w-full rounded-[8px] border border-line bg-bg2 p-1.5 text-start hover:border-accent"><div className="num text-[15px] font-semibold">{r.t.split(" · ")[0]}</div><div className="truncate text-[10.5px] text-t1">{co?.flag} {r.t.split(" · ")[1]}</div></button></li>; })}</ul>;
}
function LaunchesW({ lang }: { lang: L }) { const { data } = useJson<{ features: { properties: { id: string; title: string; t?: number; desc?: string; url?: string } }[] }>("/api/layers/launches", 1_800_000); const now = useNow(); const rows = (data?.features ?? []).map((f) => f.properties).filter((p) => p.t && p.t > (now || 0) - 3600e3).sort((a, b) => (a.t as number) - (b.t as number)).slice(0, 6);
  return !data ? <Skeleton h={80} /> : <ul className="divide-y divide-line/60">{rows.map((p) => <Li key={p.id}>{p.title}<Meta>{new Date(p.t as number).toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · {p.desc?.slice(0, 60)}</Meta></Li>)}</ul>; }
const CHANNELS = [["Al Jazeera English", "UCNye-wNBqNL5ZzHSJj3l8Bg"], ["Sky News", "UCoMdktPbSTixAyNGwb-UYkQ"], ["DW News", "UCknLrEdhRCp1aegoMqRaCZg"], ["France 24", "UCQfwfsi5VrQ8yKZ-UWmAEFg"], ["Euronews", "UCSrZ3UV4jOidv8ppoVuvW9Q"]] as const;
function TvW({ lang }: { lang: L }) { const [i, setI] = useState(0); const [go, setGo] = useState(false); return (<><div className="mb-1.5 flex flex-wrap gap-1.5">{CHANNELS.map(([n], k) => <button key={n} onClick={() => { setI(k); setGo(true); }} aria-pressed={i === k} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${i === k ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1"}`}>{n}</button>)}</div>
  {go ? <iframe title={CHANNELS[i][0]} className="aspect-video w-full rounded-[8px]" src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${CHANNELS[i][1]}&autoplay=0`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <button onClick={() => setGo(true)} className="grid aspect-video w-full place-items-center rounded-[8px] bg-bg2 text-[12.5px] text-t1 hover:text-t0">▶ {CHANNELS[i][0]}</button>}
  <Meta>{T[lang].tv}</Meta></>); }

const RENDER: Record<WidgetId, (p: { lang: L }) => React.ReactNode> = { partners: () => <ClosestPartners limit={10} compact />, demand: () => <ExportDemand />, brief: BriefW, alerts: AlertsW, watchlist: WatchlistW, briefs: BriefsW, world: WorldW, visits: VisitsW, thinktanks: ThinkW, mediatone: ToneW, headlines: HeadlinesW, news: NewsW, markets: MarketsW, commodities: CommoditiesW, economy: EconomyW, odds: OddsW, cyber: CyberW, weather: WeatherW, launches: LaunchesW, livetv: TvW };

/** DiploMaps-style personal workspace: role presets, widgets you can add, move, fold and remove, saved layouts, and a watchlist. */
export function Dashboard() {
  const { lang } = useT(); const u = T[lang]; const d = useDashboard(); const sel = useStore((s) => s.sel); const [menu, setMenu] = useState(false); const [saving, setSaving] = useState(false); const [name, setName] = useState("");
  useEffect(() => { d.hydrate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (sel && d.open) d.setOpen(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sel]);
  useEffect(() => { if (!d.open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && d.setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [d.open, d]);
  const rest = useMemo(() => WIDGETS.filter((w) => !d.widgets.includes(w.id)), [d.widgets]);
  if (!d.open) return null;
  return (
    <aside role="dialog" aria-label={u.dash} className="glass anim-rise absolute inset-x-2 bottom-[72px] top-[68px] z-30 flex flex-col overflow-hidden rounded-[16px] sm:inset-x-auto sm:bottom-16 sm:start-3 sm:top-[76px] sm:w-[440px]">
      <header className="flex items-center gap-2 px-4 pt-3"><LayoutDashboard size={16} className="text-accent" /><h2 className="display flex-1 text-[15px] font-semibold">{u.dash}</h2><button onClick={() => d.setAsk(true)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent px-2.5 text-[12px] font-semibold text-[var(--accent-ink)]"><Sparkles size={13} />{u.ask}</button><button onClick={() => d.setOpen(false)} aria-label={u.close} className="grid size-8 place-items-center rounded-md text-t1 hover:text-t0"><X size={16} /></button></header>
      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1 pt-2">
        {Object.entries(PRESETS).map(([id, p]) => <button key={id} onClick={() => d.usePreset(id)} aria-pressed={d.preset === id} className={`rounded-full border px-2.5 py-1 text-[12px] ${d.preset === id ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:border-accent"}`}>{p.ico} {lang === "ar" ? p.ar : p.en}</button>)}
        {Object.keys(d.saved).filter((k) => !PRESETS[k]).map((k) => <button key={k} onClick={() => d.usePreset(k)} aria-pressed={d.preset === k} className={`rounded-full border px-2.5 py-1 text-[12px] ${d.preset === k ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1"}`}>★ {k}</button>)}</div>
      <div className="relative flex flex-wrap items-center gap-1.5 px-3 pb-2">
        <button onClick={() => setMenu(!menu)} aria-expanded={menu} className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Plus size={13} />{u.add}</button>
        <button onClick={d.foldAll} className="h-8 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0">{u.fold}</button>
        {saving ? <form onSubmit={(e) => { e.preventDefault(); d.saveLayout(name); setSaving(false); setName(""); }} className="flex gap-1"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={u.name} className="h-8 w-32 rounded-md border border-line bg-bg2 px-2 text-[12px] text-t0 outline-none" /><button className="h-8 rounded-md bg-accent px-2 text-[12px] font-semibold text-[var(--accent-ink)]">OK</button></form> : <button onClick={() => setSaving(true)} className="h-8 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0">＋ {u.save}</button>}
        {menu && <div className="glass absolute start-3 top-9 z-10 max-h-64 w-64 overflow-y-auto rounded-[10px] p-1 scroll-thin">{rest.length ? rest.map((w) => <button key={w.id} onClick={() => { d.add(w.id); setMenu(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[12.5px] text-t0 hover:bg-bg3"><span aria-hidden>{w.ico}</span>{lang === "ar" ? w.ar : w.en}</button>) : <p className="p-2 text-[12px] text-t2">—</p>}</div>}</div>
      <div className="scroll-thin flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">{d.widgets.length ? d.widgets.map((id) => { const R = RENDER[id]; return <Wid key={id} id={id}><R lang={lang} /></Wid>; }) : <p className="p-3 text-[13px] text-t2">{u.empty}</p>}</div>
    </aside>
  );
}
