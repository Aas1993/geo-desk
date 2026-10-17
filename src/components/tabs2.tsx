"use client";
import { useStore, useT } from "@/lib/store";
import { displayName } from "@/lib/countries";
import { useKeyed } from "@/lib/useKeyed";
import { loadAgree, loadIdeal } from "@/lib/un";
import { usd, pct } from "@/lib/format";
import { Card, EmptyState, Skeleton, Source, StatTile, ShareBar } from "./ui";
import { Bar, MultiLine } from "./charts";
import { useCountries } from "./SearchBox";
import type { BilateralData, Country } from "@/lib/types";

let hs: Promise<Record<string, string>> | null = null;
const loadHs = () => (hs ??= fetch("/data/hs2.json").then((r) => r.json()));

function Products({ title, rows, names, color }: { title: string; rows: { code: string; value: number }[]; names: Record<string, string>; color: string }) {
  const { lang } = useT(); const max = rows[0]?.value ?? 1; const tot = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length) return null;
  return (
    <div className="mt-3">
      <div className="label mb-1.5">{title}</div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.code}>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]"><span className="min-w-0 truncate text-t0">{names[r.code] ?? `HS ${r.code}`}</span><span className="num shrink-0 text-t1">{usd(r.value, lang)} <span className="text-t2">· {Math.round((r.value / tot) * 100)}%</span></span></div>
            <Bar value={r.value} max={max} color={color} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BilateralCard({ c }: { c: Country }) {
  const { t, lang } = useT();
  const home = c.iso3 === "ARE";
  const main = useKeyed<{ data: BilateralData | null } | null>(home ? null : c.iso3, () => fetch(`/api/trade/${c.iso3}?num=${parseInt(c.num, 10)}`).then((r) => { if (!r.ok) throw 0; return r.json(); }));
  const d = main.value?.data ?? null;
  const tr = useKeyed<{ series: { y: number; exports: number | null; imports: number | null }[] }>(d ? c.iso3 : null, () => fetch(`/api/trade/${c.iso3}?num=${parseInt(c.num, 10)}&trend=1&year=${d!.year}&mirror=${d!.mirror ? 1 : 0}`).then((r) => { if (!r.ok) throw 0; return r.json(); }));
  const names = useKeyed<Record<string, string>>(d ? "hs" : null, loadHs).value ?? {};
  if (home) return <Card title={t("bilTitle")} icon="🇦🇪"><p className="text-[12px] text-t2">{t("bilHome")}</p></Card>;
  return (
    <Card title={t("bilTitle")} icon="🇦🇪">
      {main.loading ? (<div className="space-y-2"><p className="text-[12px] text-t2">{t("bilSlow")}</p><Skeleton h={70} /><Skeleton h={90} /></div>)
        : main.error ? <EmptyState title={t("loadFail")} why="" onRetry={main.retry} />
        : !d ? <p className="text-[12px] text-t2">{t("bilNone")}</p> : (<>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label={`${t("uaeShort")} ${t("expS")}`} value={usd(d.exports, lang)} sub={d.year} />
            <StatTile label={`${t("uaeShort")} ${t("impS")}`} value={usd(d.imports, lang)} sub={d.year} />
            <StatTile label={t("uaeBal")} value={d.exports != null && d.imports != null ? (d.exports - d.imports >= 0 ? "+" : "−") + usd(Math.abs(d.exports - d.imports), lang) : "—"} sub={d.year} />
          </div>
          {d.exports != null && d.imports != null && <div className="mt-3"><ShareBar a={d.exports} b={d.imports} aLabel={t("expS")} bLabel={t("impS")} /></div>}
          <Products title={t("topUaeExp")} rows={d.topExports} names={names} color="var(--up)" />
          <Products title={t("topUaeImp")} rows={d.topImports} names={names} color="var(--c2)" />
          <div className="mt-4"><div className="label mb-1.5">{t("bilTrend")}</div>
            {tr.loading ? <Skeleton h={110} /> : (() => {
              const s = [...(tr.value?.series ?? []), { y: d.year, exports: d.exports, imports: d.imports }];
              const ex = s.filter((p) => p.exports != null).map((p) => ({ y: p.y, v: p.exports as number })), im = s.filter((p) => p.imports != null).map((p) => ({ y: p.y, v: p.imports as number }));
              return ex.length > 1 || im.length > 1 ? <MultiLine height={120} fmt={(n) => usd(n, lang)} lines={[{ label: t("expS"), color: "var(--up)", data: ex }, { label: t("impS"), color: "var(--c2)", data: im }]} /> : null;
            })()}
          </div>
          {d.mirror && <p className="mt-3 rounded-[6px] border border-dashed border-line p-2.5 text-[11.5px] text-t2">{t("bilMirror")}</p>}
          <Source name={`${t("comtrade")} · ${d.year}`} url="https://comtradeplus.un.org" />
        </>)}
    </Card>
  );
}

function Partners({ title, list, color }: { title: string; list: [string, number][]; color: string }) {
  const cs = useCountries(); const { lang } = useT(); const select = useStore((s) => s.select);
  return (
    <Card title={title}>
      <ul className="space-y-2">
        {list.map(([iso, v]) => { const c = cs?.byIso.get(iso); if (!c) return null;
          return (<li key={iso}><button onClick={() => select(iso, "un")} className="block w-full text-start">
            <div className="flex items-center justify-between gap-3 text-[13px]"><span className="flex min-w-0 items-center gap-2"><span aria-hidden>{c.flag}</span><span className="truncate">{displayName(c, lang)}</span></span><span className="num text-t1">{pct(v * 100, lang, 0)}</span></div>
            <Bar value={v} max={1} color={color} /></button></li>);
        })}
      </ul>
    </Card>
  );
}

export function UNTab({ c }: { c: Country }) {
  const { t, lang } = useT(); const home = c.iso3 === "ARE";
  const ideal = useKeyed(c.iso3, loadIdeal); const agree = useKeyed(c.iso3, () => loadAgree(c.iso3));
  const a = agree.value ?? null; const all = ideal.value;
  if (ideal.loading || agree.loading) return <div className="space-y-3"><Skeleton h={150} /><Skeleton h={120} /></div>;
  const mine = all?.[c.iso3] ?? [];
  if (!mine.length && !a) return <EmptyState title={t("noData")} why={t("unNone")} />;
  const ranked = a ? Object.entries(a).filter(([k]) => k !== c.iso3).sort((x, y) => y[1] - x[1]) : [];
  const toUae = a?.ARE;
  return (
    <>
      {!home && toUae != null && <div className="grid grid-cols-1"><StatTile label={t("unAgreeUae")} value={pct(toUae * 100, lang, 0)} sub={t("unAgreeRecent")} /></div>}
      {mine.length > 1 && (
        <Card title={t("unIdeal")}>
          <MultiLine height={130} lines={[
            { label: displayName(c, lang), color: "var(--accent)", data: mine },
            ...(!home && all?.ARE ? [{ label: t("uaeShort"), color: "var(--c2)", data: all.ARE, dashed: true }] : []),
          ]} />
          <p className="mt-2 text-[11px] text-t2">{t("unIdealNote")}</p>
        </Card>
      )}
      {ranked.length > 0 && <Partners title={`${t("unMost")} ${displayName(c, lang)}`} list={ranked.slice(0, 5)} color="var(--up)" />}
      {ranked.length > 5 && <Partners title={`${t("unLeast")} ${displayName(c, lang)}`} list={ranked.slice(-5).reverse()} color="var(--risk)" />}
      <Source name={t("unSource")} url="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ" />
    </>
  );
}
