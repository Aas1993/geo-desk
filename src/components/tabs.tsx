"use client";
import { useEffect, useState } from "react";
import { useStore, useT } from "@/lib/store";
import { regionLabel } from "@/lib/regions";
import { useNow } from "@/lib/use-now";
import { Card, Row, StatTile, Skeleton, EmptyState, Source, Sparkline, ShareBar } from "./ui";
import { ago, compact, int, last, pct, usd, wmoLabel } from "@/lib/format";
import { useCountries } from "./SearchBox";
import { useOrgs } from "@/lib/layers/orgs-client";
import { LAYERS } from "@/lib/layers/registry";
import { PartnershipCard, ClosestPartners } from "./Partnership";
import { UaeTradeCard } from "./TradeIntel";
import { OutlookCard, ExportDemand } from "./OutlookCard";
import { BilateralCard } from "./tabs2";
import { CrossCheck } from "./CrossCheck";
import type { Country, CountryDetail, Headline, Series } from "@/lib/types";

type D = { data: CountryDetail | null; loading: boolean; error: boolean; retry: () => void };
const WB = "https://data.worldbank.org/";

function Gate({ d, children }: { d: D; children: (x: CountryDetail) => React.ReactNode }) {
  const { t } = useT();
  if (d.loading) return <div className="space-y-3"><Skeleton h={90} /><Skeleton h={120} /><Skeleton h={90} /></div>;
  if (d.error || !d.data) return <EmptyState title={t("loadFail")} why="" onRetry={d.retry} />;
  return <>{children(d.data)}</>;
}

function LocalTime({ tz }: { tz: string | null }) {
  const { lang } = useT(); const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); const t0 = setTimeout(tick, 0); const i = setInterval(tick, 15000); return () => { clearTimeout(t0); clearInterval(i); }; }, []);
  if (!tz || !now) return null;
  const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "shortOffset" }).format(now);
  return <span className="num font-mono text-[13px] text-t1">{f}</span>;
}

/** Organisations this country belongs to, from the same lists the map layers use. */
function MembershipsCard({ iso3 }: { iso3: string }) {
  const { t, lang } = useT(); const orgs = useOrgs(); const toggle = useStore((s) => s.toggleLayer); const on = useStore((s) => s.layers);
  if (!orgs) return null;
  const mine = LAYERS.filter((l) => l.kind === "members" && l.members && orgs.orgs[l.members]?.includes(iso3));
  if (!mine.length) return null;
  return (
    <Card title={t("memberships")} icon="🤝">
      <div className="flex flex-wrap gap-1.5">{mine.map((l) => (
        <button key={l.id} onClick={() => toggle(l.id)} aria-pressed={!!on[l.id]} title={lang === "ar" ? l.ar : l.en} className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${on[l.id] ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:border-accent"}`}>{(lang === "ar" ? l.ar : l.en).split(" · ")[0].replace(/ —.*/, "")}</button>))}</div>
      <p className="mt-2 text-[11px] text-t2">{t("membershipsHint")}</p>
    </Card>
  );
}
export function OverviewTab({ c, detail }: { c: Country; detail: D }) {
  const { t, lang } = useT(); const select = useStore((s) => s.select); const cs = useCountries();
  const w = detail.data?.weather; const wx = wmoLabel(w?.code ?? null);
  const leaders = detail.data?.leaders;
  const L = (r: string) => (r === "head_of_state" ? t("headState") : t("headGov"));
  return (
    <>
      <div className="rounded-[8px] border border-accent/40 bg-gradient-to-b from-accent/10 to-transparent p-3.5">
        <div className="label">{t("capital")}</div>
        <div className="mt-0.5 text-[26px] font-semibold leading-tight">{c.capital ?? "—"}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <LocalTime tz={w?.tz ?? null} />
          {w && w.temp != null && <span className="text-[13px] text-t1">{wx.icon} <span className="num">{Math.round(w.temp)}°</span> {lang === "ar" ? wx.ar : wx.en}</span>}
          {w?.aqi != null && <span className="num text-[12px] text-t2">AQI {w.aqi}</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label={t("population")} value={compact(c.population?.v, lang)} sub={c.population?.y} />
          <StatTile label={t("area")} value={compact(c.areaKm2, lang)} sub="km²" />
          <StatTile label={t("currency")} value={c.currencies[0]?.match(/\((\w+)\)/)?.[1] ?? "—"} />
        </div>
        <Source name={`${t("wb")} · ${t("wikidata")} · ${t("openmeteo")}`} />
      </div>
      {c.iso3 === "ARE" ? <ClosestPartners /> : <PartnershipCard iso3={c.iso3} />}
      <Card title={t("leadership")} icon="👤">
        {detail.loading ? <Skeleton h={80} /> : leaders && leaders.length ? (
          <ul className="space-y-2">
            {leaders.map((p) => (
              <li key={p.role + p.qid} className="flex items-center gap-3">
                {p.img ? <img src={p.img} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-full bg-bg2 object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-bg2 text-t2">👤</span>}
                <div className="min-w-0"><a href={`https://www.wikidata.org/wiki/${p.qid}`} target="_blank" rel="noreferrer" className="block truncate text-[14px] font-medium text-accent hover:underline">{p.name}</a><div className="text-[12px] text-t2">{L(p.role)}</div></div>
              </li>
            ))}
          </ul>
        ) : <p className="text-[12px] text-t2">{t("noData")}</p>}
        <Source name={t("wikidata")} url="https://www.wikidata.org" />
      </Card>
      <MembershipsCard iso3={c.iso3} />
      <Card title={t("region")} icon="🏛">
        <Row k={t("region")} v={regionLabel(c.region, lang)} />
        <Row k={t("languagesL")} v={c.languages.join(", ") || "—"} />
        <Row k={t("currency")} v={c.currencies.join(", ") || "—"} />
      </Card>
      <Card title={t("borders")} icon="🧭">
        {c.borders.length ? (
          <div className="flex flex-wrap gap-2">
            {c.borders.map((b) => { const bc = cs?.byIso.get(b); if (!bc) return null;
              return <button key={b} onClick={() => select(b)} className="flex items-center gap-1.5 rounded-full border border-line bg-bg2 px-2.5 py-1 text-[12.5px] hover:border-accent"><span aria-hidden>{bc.flag}</span>{lang === "ar" && bc.nameAr ? bc.nameAr : bc.name}</button>; })}
          </div>
        ) : <p className="text-[12px] text-t2">{t("noBorders")}</p>}
      </Card>
    </>
  );
}

function Metric({ title, s, fmt, spark = true, pctAxis }: { title: string; s?: Series; fmt: (n: number) => string; spark?: boolean; pctAxis?: boolean }) {
  const { t } = useT(); const l = last(s);
  return (
    <Card title={title}>
      {l ? (<>
        <div className="flex items-baseline gap-2"><span className="num text-[24px] font-semibold">{fmt(l.v)}</span><span className="num text-[12px] text-t2">{l.y}</span></div>
        {spark && s!.length > 2 && <div className="mt-2"><Sparkline data={s!.slice(-15)} pctAxis={pctAxis} /></div>}
      </>) : <p className="text-[12px] text-t2">{t("noData")} — {t("noDataWhy")}</p>}
    </Card>
  );
}

export function EconomyTab({ c, detail }: { c: Country; detail: D }) {
  const { t, lang } = useT();
  return <><OutlookCard iso3={c.iso3} />{c.iso3 === "ARE" && <ExportDemand />}<Gate d={detail}>{({ indicators: i }) => (<>
    <div className="grid grid-cols-2 gap-2">
      <StatTile label={t("gdp")} value={usd(last(i.gdp)?.v, lang)} sub={last(i.gdp)?.y} />
      <StatTile label={t("gdpGrowth")} value={pct(last(i.gdpGrowth)?.v, lang)} sub={last(i.gdpGrowth)?.y} />
      <StatTile label={t("gdpPc")} value={"$" + int(last(i.gdpPc)?.v, lang)} sub={last(i.gdpPc)?.y} className="col-span-2" />
    </div>
    <Metric title={t("gdp")} s={i.gdp} fmt={(n) => usd(n, lang)} />
    <Metric title={t("inflation")} s={i.inflation} fmt={(n) => pct(n, lang)} />
    <Metric title={t("unemployment")} s={i.unemployment} fmt={(n) => pct(n, lang)} />
    <Metric title={t("debt")} s={i.debt} fmt={(n) => pct(n, lang)} />
    <Source name={t("wb")} url={WB} /><p className="text-[11px] text-t2">{t("wbNote")}</p>
  </>)}</Gate></>;
}

export function TradeTab({ c, detail }: { c: Country; detail: D }) {
  const { t, lang } = useT();
  return <>{c.iso3 !== "ARE" && <UaeTradeCard c={c} />}{c.iso3 !== "ARE" && <CrossCheck iso={c.iso3} kind="trade" />}<BilateralCard c={c} /><Gate d={detail}>{({ indicators: i }) => {
    const ex = last(i.exports), im = last(i.imports); const y = ex && im && ex.y === im.y;
    return (<>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t("expS")} value={usd(ex?.v, lang)} sub={ex?.y} /><StatTile label={t("impS")} value={usd(im?.v, lang)} sub={im?.y} />
        <StatTile label={t("balS")} value={y ? (ex!.v - im!.v >= 0 ? "+" : "−") + usd(Math.abs(ex!.v - im!.v), lang) : "—"} sub={y ? ex!.y : undefined} />
      </div>
      {y && <Card><ShareBar a={ex!.v} b={im!.v} aLabel={t("exports")} bLabel={t("imports")} /></Card>}
      <Metric title={t("exports")} s={i.exports} fmt={(n) => usd(n, lang)} />
      <Metric title={t("imports")} s={i.imports} fmt={(n) => usd(n, lang)} />
      <Metric title={t("tradeGdp")} s={i.tradeGdp} fmt={(n) => pct(n, lang, 0)} />
            <Source name={t("wb")} url={WB} />
    </>);
  }}</Gate></>;
}

export function MilitaryTab({ detail }: { detail: D }) {
  const { t, lang } = useT();
  return <Gate d={detail}>{({ indicators: i }) => (<>
    <div className="grid grid-cols-2 gap-2">
      <StatTile label={t("milSpend")} value={usd(last(i.milSpend)?.v, lang)} sub={last(i.milSpend)?.y} />
      <StatTile label={t("milGdp")} value={pct(last(i.milGdp)?.v, lang)} sub={last(i.milGdp)?.y} />
    </div>
    <Metric title={t("milSpend")} s={i.milSpend} fmt={(n) => usd(n, lang)} />
    <Metric title={t("milPers")} s={i.milPers} fmt={(n) => int(n, lang)} />
    <Source name={t("sipri")} url="https://www.sipri.org/databases/milex" />
  </>)}</Gate>;
}

export function SocietyTab({ detail }: { detail: D }) {
  const { t, lang } = useT();
  return <Gate d={detail}>{({ indicators: i }) => (<>
    <Metric title={t("lifeExp")} s={i.lifeExp} fmt={(n) => `${n.toFixed(1)} ${t("years")}`} />
    <Metric title={t("literacy")} s={i.literacy} fmt={(n) => pct(n, lang)} />
    <Metric title={t("internet")} s={i.internet} fmt={(n) => pct(n, lang)} />
    <Source name={t("wb")} url={WB} />
  </>)}</Gate>;
}

/** Fetches one news feed and re-fetches it every 5 minutes while the tab is visible (and straight away when the tab becomes visible again). */
function useNews(c: Country, uae: boolean) {
  const [s, set] = useState<{ key: string; items: Headline[]; err: boolean; at: number } | null>(null); const [n, setN] = useState(0); const key = `${c.iso3}:${uae}`;
  useEffect(() => {
    let dead = false; let last = 0;
    const load = () => { last = Date.now(); fetch(`/api/news/${c.iso3}?name=${encodeURIComponent(c.name)}${uae ? "&uae=1" : ""}`).then((r) => r.json()).then((j) => { if (!dead) set({ key, items: j.items ?? [], err: !!j.error, at: Date.now() }); }).catch(() => { if (!dead) set((p) => (p && p.key === key && p.items.length ? { ...p, err: true } : { key, items: [], err: true, at: Date.now() })); }); };
    load(); const i = setInterval(() => { if (document.visibilityState === "visible") load(); }, 300_000);
    const vis = () => { if (document.visibilityState === "visible" && Date.now() - last > 300_000) load(); }; document.addEventListener("visibilitychange", vis);
    return () => { dead = true; clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, [c.iso3, c.name, uae, key, n]);
  return { s: s && s.key === key ? s : null, retry: () => { set(null); setN((x) => x + 1); } };
}
function NewsList({ items, lang }: { items: Headline[]; lang: "en" | "ar" }) {
  return (
    <ul className="space-y-2">
      {items.map((h, i) => (
        <li key={i}><a href={h.link} target="_blank" rel="noreferrer" className="block rounded-[8px] border border-line bg-bg1/60 p-3 hover:border-accent">
          <div className="text-[13.5px] leading-snug text-t0">{h.title}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-t2"><span className="font-semibold uppercase tracking-wide">{h.outlet}</span><span>·</span><span>{ago(h.ts, lang)}</span></div>
        </a></li>
      ))}
    </ul>
  );
}
export function NewsTab({ c }: { c: Country }) {
  const { t, lang } = useT(); const all = useNews(c, false); const uae = useNews(c, true); const now = useNow(30_000);
  if (!all.s) return <div className="space-y-2"><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></div>;
  if (all.s.err && !all.s.items.length) return <EmptyState title={t("loadFail")} why="" onRetry={all.retry} />;
  const mins = Math.max(0, Math.round(((now || all.s.at) - all.s.at) / 60000)); const ar = lang === "ar";
  const withUae = (uae.s?.items ?? []).slice(0, 8);
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-[11px] text-t2">
        <span className="inline-flex items-center gap-1.5"><span className={`inline-block h-1.5 w-1.5 rounded-full ${all.s.err ? "bg-warn" : "bg-up"}`} />{all.s.err ? (ar ? "تعذّر التحديث، يُعرض آخر ما وصل" : "Refresh failed, showing the last results") : ar ? "يتحدّث تلقائيًا كل 5 دقائق" : "Updates itself every 5 minutes"}</span>
        <span className="num">{ar ? `آخر تحديث منذ ${mins} د` : mins < 1 ? "updated just now" : `updated ${mins} min ago`}</span>
      </div>
      <h3 className="label">{t("latestNews")}</h3>
      {all.s.items.length ? <NewsList items={all.s.items} lang={lang} /> : <EmptyState title={t("noData")} why={t("noDataWhy")} />}
      {withUae.length > 0 && (<><h3 className="label mt-4">{ar ? `${c.nameAr ?? c.name} والإمارات في الأخبار` : `${c.name} and the UAE in the news`}</h3><NewsList items={withUae} lang={lang} /></>)}
      <Source name="Google News RSS" />
    </>
  );
}
