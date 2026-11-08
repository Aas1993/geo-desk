"use client";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { Card, Skeleton } from "./ui";
import { safeHttp } from "@/lib/url";
import { loadGovSources, loadSocSources, govReading, socReading, position, latestPer, publishers, WGI_ONLY, type EvSrc, type EvGone, type Item, type Reading, type GovDim, type SocMetric } from "@/lib/evidence";
import type { Verdict } from "@/lib/crosscheck";

type Lang = "en" | "ar";
const T = {
  en: {
    govTitle: "Governance: independent sources", socTitle: "Society: independent sources", pubs: "publishers",
    govIntro: "The World Bank scores above rest on one publisher. Here every other open index we could read is set beside them. Scales differ, so each source is shown as its position among the countries it ranks (100 = first, 0 = last).",
    socIntro: "The figures above come from the World Bank. Here the same measures from other open publishers are set beside them, in the same unit.",
    v: { none: "No source", single: "One source only", agree: "Sources agree", close: "Close", differ: "Sources differ" } as Record<Verdict, string>,
    span: "positions span", pts: "points", diff: "spread", older: "older than the others, not compared", uae: "UAE", primary: "publishes its own figures", republisher: "republishes another source", shown: "shown above", baseline: "stored copy of the figure",
    only: "World Bank only, no independent source held", onlyWhy: "Political stability, government effectiveness and regulatory quality have no second source here: the open indices read measure other things, and a gap stays a gap rather than being filled.",
    oneSrc: "One source only", extra: "Also held (UNDP only)", noRows: "No source holds a figure for this country.",
    unavailable: "Sources consulted but not used", how: "Where each source comes from, and its licence", upstream: "Upstream", licence: "Licence", built: "Built",
    govHow: "These indices measure perceptions or expert judgement, not facts counted directly. A gap between them is a reason to look, not an error; the V-Dem indices are four views from one publisher and count once.",
    socHow: "Several of these series share an upstream (UN Population Division for life expectancy, UNESCO for literacy, ITU for internet use), so agreement between them shows the republication is consistent, not that two measurements agree. The upstream of each source is listed below.",
    fail: "The cross-check data could not be loaded.", yrs: "yrs",
  },
  ar: {
    govTitle: "الحوكمة: مصادر مستقلة", socTitle: "المجتمع: مصادر مستقلة", pubs: "جهات نشر",
    govIntro: "درجات البنك الدولي أعلاه مصدرها جهة واحدة. هنا نضع بجانبها كل مؤشر مفتوح آخر استطعنا قراءته. المقاييس مختلفة، لذا يظهر كل مصدر بموقعه بين الدول التي يصنّفها (100 = الأول، 0 = الأخير).",
    socIntro: "الأرقام أعلاه مصدرها البنك الدولي. هنا نضع بجانبها المقاييس نفسها من جهات نشر مفتوحة أخرى، بالوحدة نفسها.",
    v: { none: "لا مصدر", single: "مصدر واحد فقط", agree: "المصادر متفقة", close: "متقاربة", differ: "المصادر مختلفة" } as Record<Verdict, string>,
    span: "تتباعد المواقع بمقدار", pts: "نقطة", diff: "الفرق", older: "أقدم من الباقي، غير مقارَن", uae: "الإمارات", primary: "تنشر أرقامها بنفسها", republisher: "تعيد نشر مصدر آخر", shown: "معروض أعلاه", baseline: "نسخة محفوظة من الرقم",
    only: "البنك الدولي فقط، ولا مصدر مستقل لدينا", onlyWhy: "الاستقرار السياسي وفعالية الحكومة وجودة التنظيم لا مصدر ثانٍ لها هنا: المؤشرات المفتوحة التي قرأناها تقيس أشياء أخرى، وتبقى الفجوة فجوة ولا تُملأ.",
    oneSrc: "مصدر واحد فقط", extra: "متوفر أيضًا (برنامج الأمم المتحدة الإنمائي فقط)", noRows: "لا يوجد مصدر يملك رقماً لهذه الدولة.",
    unavailable: "مصادر جرت مراجعتها ولم تُستخدم", how: "مصدر كل جهة ورخصتها", upstream: "المصدر الأصلي", licence: "الرخصة", built: "أُنشئ",
    govHow: "تقيس هذه المؤشرات الانطباعات أو تقدير الخبراء، لا وقائع تُعدّ مباشرة. والفجوة بينها سبب للتدقيق وليست خطأ؛ ومؤشرات V-Dem الأربعة رؤى من جهة واحدة وتُحتسب مرة واحدة.",
    socHow: "تشترك عدة من هذه السلاسل في مصدر أصلي (شعبة السكان في الأمم المتحدة للعمر المتوقع، واليونسكو لمعرفة القراءة، والاتحاد الدولي للاتصالات للإنترنت)، فاتفاقها يدل على اتساق إعادة النشر لا على اتفاق قياسين. ويُذكر المصدر الأصلي لكل جهة أدناه.",
    fail: "تعذّر تحميل بيانات المطابقة.", yrs: "سنة",
  },
} as const;
type U = (typeof T)["en"] | (typeof T)["ar"];

const TONE: Record<Verdict, string> = { none: "var(--t2)", single: "var(--t2)", agree: "var(--ok)", close: "var(--warn)", differ: "var(--risk)" };
const Chip = ({ v, label }: { v: Verdict; label: string }) => <span className="inline-block shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${TONE[v]} 18%, transparent)`, color: TONE[v] }}>{label}</span>;
const SrcLink = ({ s }: { s: EvSrc }) => <a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" title={`${s.publisher}: ${s.note ?? ""}`} className="text-accent hover:underline">{s.name}</a>;
const val = (s: EvSrc, v: number) => (s.scale === 1 ? v.toFixed(2) : Number.isInteger(v) ? String(v) : v.toFixed(1));

function Notes({ u, srcs, gone, built, how, why }: { u: U; srcs: EvSrc[]; gone: EvGone[]; built: string; how: string; why?: string }) {
  return (<>
    <p className="mt-2.5 text-[11px] leading-snug text-t2">{how}</p>
    {why && <p className="mt-1.5 rounded-[10px] bg-bg2 p-2.5 text-[11.5px] leading-snug text-t1">{why}</p>}
    <details className="mt-2.5 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.how} · {srcs.length}</summary>
      <ul className="mt-1.5 space-y-2 text-[11.5px] leading-snug text-t1">{srcs.map((s) => <li key={s.id}><SrcLink s={s} /> · {s.year} · {s.kind === "primary" ? u.primary : u.republisher}<div className="text-[10.5px] text-t2">{s.basis}.{s.upstream ? ` ${u.upstream}: ${s.upstream}` : ""} {u.licence}: {s.licence}</div></li>)}</ul></details>
    <details className="mt-2 rounded-[10px] bg-bg2 p-2.5"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.unavailable} · {gone.length}</summary>
      <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-t1">{gone.map((x) => <li key={x.name}>· <a href={safeHttp(x.url)} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">{x.name}</a>: {x.reason}</li>)}</ul>
      <p className="mt-2 text-[10.5px] text-t2">{u.built} {built.slice(0, 10)}</p></details>
  </>);
}

function GovBlock({ label, items, uae, src, u }: { label: string; items: Item[]; uae: Item[] | undefined; src: Record<string, EvSrc>; u: U }) {
  const r = govReading(items); const rows = items.filter((i) => src[i.s]);
  return (
    <div className="rounded-[12px] bg-bg2 p-3">
      <div className="flex items-start justify-between gap-2"><span className="text-[12.5px] font-medium text-t0">{label}</span><Chip v={r.verdict} label={u.v[r.verdict]} /></div>
      {r.spread != null && r.used.length > 1 && <div className="num text-[11px] text-t2">{u.span} {Math.round(r.spread)} {u.pts}</div>}
      <div className="mt-1.5 divide-y divide-line/60 text-[12px]">
        {rows.map((i) => { const s = src[i.s]; const p = position(i); const ua = uae?.find((x) => x.s === i.s); const up = ua ? position(ua) : null;
          return (
            <div key={i.s} className="py-1.5">
              <div className="flex items-baseline justify-between gap-2"><div className="min-w-0"><SrcLink s={s} /><div className="text-[10.5px] leading-snug text-t2">{s.kind === "republisher" ? u.republisher : u.primary} · {i.y}{i.r && i.n && i.s !== "wgi" ? ` · #${i.r}/${i.n}` : ""}</div></div>
                <span className="num text-end text-t0">{val(s, i.v)}</span></div>
              {p != null && <div className="relative mt-1 h-1.5 rounded-full bg-bg3"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(2, p)}%` }} />{up != null && <i className="absolute -top-0.5 h-2.5 w-0.5 bg-t0" style={{ left: `${up}%` }} title={`${u.uae} ${Math.round(up)}`} />}</div>}
            </div>); })}
      </div>
    </div>
  );
}

export function GovernanceEvidence({ iso }: { iso: string }) {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed("gs", loadGovSources);
  if (q.loading) return <Card title={u.govTitle} icon="⚖️"><Skeleton h={90} /></Card>;
  const g = q.value; if (q.error || !g) return <Card title={u.govTitle} icon="⚖️"><p className="text-[12.5px] text-t1">{u.fail}</p></Card>;
  const c = g.countries[iso]; const dims = (["cc", "va", "rl"] as GovDim[]).filter((d) => c?.[d]?.length); const ids = dims.flatMap((d) => c![d]!.map((i) => i.s));
  return (
    <Card title={`${u.govTitle} · ${publishers(ids, g.sources)} ${u.pubs}`} icon="⚖️">
      <p className="mb-2.5 text-[12px] leading-snug text-t1">{u.govIntro}</p>
      {!dims.length ? <p className="rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.noRows}</p> : <div className="space-y-2.5">{dims.map((d) => <GovBlock key={d} label={g.dims[d].label} items={c![d]!} uae={iso === "ARE" ? undefined : g.countries.ARE?.[d]} src={g.sources} u={u} />)}</div>}
      <p className="mt-2.5 text-[11.5px] leading-snug text-t1"><b className="text-t0">{WGI_ONLY.map((k) => ({ pv: "Political stability", ge: "Government effectiveness", rq: "Regulatory quality" })[k]).join(" · ")}:</b> {u.only}.</p>
      <Notes u={u} srcs={Object.values(g.sources).sort((a, b) => a.name.localeCompare(b.name))} gone={g.unavailable} built={g.built} how={u.govHow} why={u.onlyWhy} />
    </Card>
  );
}

type WbNow = Partial<Record<"le" | "lit" | "net", { v: number; y: number } | null>>;
function SocBlock({ metric, label, unit, items, wb, src, u }: { metric: SocMetric; label: string; unit: string; items: Item[]; wb?: { v: number; y: number } | null; src: Record<string, EvSrc>; u: U }) {
  // the World Bank figure the tab shows replaces the stored baseline so the two cannot disagree on screen
  const merged = latestPer([...items.filter((i) => i.s !== "wb"), ...(wb ? [{ s: "wb", v: wb.v, y: wb.y }] : items.filter((i) => i.s === "wb"))]);
  const r: Reading = socReading(metric, merged); const rows = merged.filter((i) => src[i.s]).sort((a, b) => (a.s === "wb" ? -1 : b.s === "wb" ? 1 : src[a.s].name.localeCompare(src[b.s].name)));
  const base = merged.find((i) => i.s === "wb"); const f = (v: number) => (metric === "hdi" ? v.toFixed(3) : v.toFixed(1)); const suffix = unit === "%" ? "%" : unit === "years" ? ` ${u.yrs}` : "";
  return (
    <div className="rounded-[12px] bg-bg2 p-3">
      <div className="flex items-start justify-between gap-2"><span className="text-[12.5px] font-medium text-t0">{label}</span><Chip v={r.verdict} label={u.v[r.verdict]} /></div>
      {r.spread != null && r.used.length > 1 && <div className="num text-[11px] text-t2">{u.diff} {r.spread.toFixed(metric === "hdi" ? 3 : 1)}{suffix}</div>}
      <div className="mt-1.5 divide-y divide-line/60 text-[12px]">
        {rows.map((i) => { const s = src[i.s]; const old = r.older.includes(i.s); const d = base && i.s !== "wb" && !old ? i.v - base.v : null;
          return (
            <div key={i.s} className="flex items-baseline justify-between gap-2 py-1.5">
              <div className="min-w-0"><SrcLink s={s} /><div className="text-[10.5px] leading-snug text-t2">{i.s === "wb" ? (wb ? u.shown : u.baseline) : s.kind === "republisher" ? u.republisher : u.primary} · {i.y}{old ? ` · ${u.older}` : ""}</div></div>
              <span className="num text-end"><span className={old ? "text-t2" : "text-t0"}>{f(i.v)}{suffix}</span>{d != null && Math.abs(d) >= (metric === "hdi" ? 0.005 : 0.05) && <span className="ms-1 text-[10.5px] text-t2">({d > 0 ? "+" : "−"}{Math.abs(d).toFixed(metric === "hdi" ? 3 : 1)})</span>}</span>
            </div>); })}
      </div>
    </div>
  );
}

export function SocietyEvidence({ iso, wb }: { iso: string; wb: WbNow }) {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed("ss", loadSocSources);
  if (q.loading) return <Card title={u.socTitle} icon="⚖️"><Skeleton h={90} /></Card>;
  const s = q.value; if (q.error || !s) return <Card title={u.socTitle} icon="⚖️"><p className="text-[12.5px] text-t1">{u.fail}</p></Card>;
  const c = s.countries[iso]; const main = (["le", "lit", "net"] as const).filter((m) => c?.[m]?.length || wb[m]); const extra = (["eys", "hdi"] as const).filter((m) => c?.[m]?.length);
  const ids = [...main.flatMap((m) => (c?.[m] ?? []).map((i) => i.s)), ...extra.flatMap((m) => c![m]!.map((i) => i.s))];
  return (
    <Card title={`${u.socTitle} · ${publishers(ids, s.sources)} ${u.pubs}`} icon="⚖️">
      <p className="mb-2.5 text-[12px] leading-snug text-t1">{u.socIntro}</p>
      {!main.length && !extra.length ? <p className="rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.noRows}</p> : (<div className="space-y-2.5">
        {main.map((m) => <SocBlock key={m} metric={m} label={s.metrics[m].label} unit={s.metrics[m].unit} items={c?.[m] ?? []} wb={wb[m]} src={s.sources} u={u} />)}
        {extra.length > 0 && <div><div className="mb-1 text-[11px] font-medium text-t2">{u.extra}</div><div className="space-y-2.5">{extra.map((m) => <SocBlock key={m} metric={m} label={s.metrics[m].label} unit={s.metrics[m].unit} items={c![m]!} src={s.sources} u={u} />)}</div></div>}
      </div>)}
      <Notes u={u} srcs={Object.values(s.sources).sort((a, b) => a.name.localeCompare(b.name))} gone={s.unavailable} built={s.built} how={u.socHow} />
    </Card>
  );
}
