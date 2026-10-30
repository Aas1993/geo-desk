"use client";
import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useT } from "@/lib/store";
import { Card, EmptyState, Skeleton } from "./ui";
import { safeHttp } from "@/lib/url";
import { DossierWorkspace } from "./DossierWorkspace";
import { CrossCheck } from "./CrossCheck";
import { DealX, DealsXNote, useDealsX } from "./SourceChecks";
import type { InvestPayload, Flag } from "@/lib/invest-data";
import type { Country } from "@/lib/types";

type Lang = "en" | "ar";
const T = {
  en: { cta: "Investment dossier (researched)", ctaText: "A detailed, sourced register of UAE investment in this country: who holds what, the form and status of each asset, flagship projects, state money and deposits, pipeline, exposure through the eyes of the National Security Adviser, the Minister of Economy and the Minister of Foreign Affairs, protections, rival capital and recommended moves. It reads the web and bills your Anthropic account (about 25 cents).", open: "Open the investment dossier",
    pos: "UAE investment position", stock: "UAE direct-investment stock", ofGdp: "of their GDP", ofUae: "of UAE investment abroad", inward: "Their stock in the UAE", noStock: "No IMF record for this country. That is a gap in the mirror data, not proof of no investment: use the deal record below and the researched dossier.", trend: "Stock by year (US$, IMF)", out: "UAE in them", inw: "Them in the UAE", rank: "rank",
    deals: "UAE deals in WAM headlines", dealsHint: "Announcements by UAE companies and funds found in the headlines of WAM (rule-classified, since late 2024). Announcements, not verified transactions; stakes and values are not in headlines.", total: "deals", d90: "last 90 days", d365: "last 12 months", all: "All", showAll: "Show all", fewer: "Show fewer", by: "Who is active", sectors: "Sectors", quarters: "Deals per quarter", none: "No UAE company or fund deal was found for this country.",
    prot: "Protection toolkit", protHint: "Treaties on the MOFA and Ministry of Foreign Trade lists. Titles only: texts, dates and entry into force are not published there.", bit: "Investment agreements", tax: "Double-taxation treaties", air: "Air-services agreements", cepa: "CEPA", committees: "Joint committee meetings", none2: "none",
    risk: "Risk context", riskHint: "World Bank governance scores (0–100, higher is better) and the IMF outlook for this year.", rq: "Regulatory quality", rl: "Rule of law", cc: "Control of corruption", pv: "Political stability", debt: "Public debt, % of GDP", inf: "Inflation", gr: "Growth", ca: "Current account, % of GDP",
    read: "Read-out", readHint: "Plain flags computed from the data above. They point to where to look, they are not findings.", src: "Source", loadFail: "The investment data could not be loaded.", retry: "Retry", wam: "WAM",
    f: { no_stock: "No IMF investment-position record: the stock is unknown (a mirror-data gap). Rely on the deals and the researched dossier.", concentrated: "One investor dominates the deal record: {v}.", quiet: "No UAE deal announced in the last 90 days: the pipeline looks quiet.", no_deals: "No UAE company or fund deal found in WAM headlines for this country.", no_bit: "No investment treaty on the official lists: UAE capital here has no treaty protection on file.", has_bit: "{v} investment agreement(s) on file.", no_tax: "No double-taxation treaty on file.", no_cepa: "No CEPA documented.", cepa: "CEPA status: {v}.", debt: "Public debt at {v} of GDP (IMF): sovereign stress can reach contracts, payments and repatriation.", inflation: "Inflation at {v} (IMF): currency and project-cost risk.", weak_rq: "Regulatory quality scores {v}/100 (World Bank): rules may change under investors.", sanctions: "{v} sanctions-list entries have an address here (OFAC, UN): screen every partner." } },
  ar: { cta: "ملف الاستثمارات (مبني على البحث)", ctaText: "سجل مفصّل وموثّق للاستثمارات الإماراتية في هذه الدولة: من يملك ماذا، وشكل كل أصل وحالته، والمشاريع الرئيسية، والأموال السيادية والودائع، والمشاريع المرتقبة، والانكشاف بعيون مستشار الأمن الوطني ووزير الاقتصاد ووزير الخارجية، والحماية، ورؤوس الأموال المنافسة، والتحركات الموصى بها. يقرأ الويب ويُحتسب على حساب Anthropic (نحو 25 سنتًا).", open: "فتح ملف الاستثمارات",
    pos: "المركز الاستثماري الإماراتي", stock: "رصيد الاستثمار الأجنبي المباشر الإماراتي", ofGdp: "من ناتجهم المحلي", ofUae: "من الاستثمار الإماراتي بالخارج", inward: "رصيدهم في الإمارات", noStock: "لا يوجد سجل لصندوق النقد لهذه الدولة. هذه فجوة في بيانات المرآة وليست دليلًا على غياب الاستثمار: استخدم سجل الصفقات أدناه والملف البحثي.", trend: "الرصيد حسب السنة (دولار، صندوق النقد)", out: "الإمارات فيهم", inw: "هم في الإمارات", rank: "المرتبة",
    deals: "صفقات الإمارات في عناوين وام", dealsHint: "إعلانات شركات وصناديق إماراتية وردت في عناوين وكالة أنباء الإمارات (تصنيف بالقواعد، منذ أواخر 2024). إعلانات وليست صفقات مؤكدة؛ والحصص والقيم لا ترد في العناوين.", total: "صفقة", d90: "آخر 90 يومًا", d365: "آخر 12 شهرًا", all: "الكل", showAll: "عرض الكل", fewer: "عرض أقل", by: "من النشط", sectors: "القطاعات", quarters: "الصفقات لكل ربع", none: "لم تُعثر على صفقات لشركات أو صناديق إماراتية في هذه الدولة.",
    prot: "أدوات الحماية", protHint: "اتفاقيات من قوائم وزارة الخارجية ووزارة الاقتصاد والتجارة الخارجية. عناوين فقط: النصوص والتواريخ والنفاذ غير منشورة هناك.", bit: "اتفاقيات الاستثمار", tax: "اتفاقيات تجنب الازدواج الضريبي", air: "اتفاقيات الخدمات الجوية", cepa: "الشراكة الاقتصادية الشاملة", committees: "اجتماعات اللجنة المشتركة", none2: "لا يوجد",
    risk: "سياق المخاطر", riskHint: "درجات الحوكمة للبنك الدولي (من 0 إلى 100، الأعلى أفضل) وتوقعات صندوق النقد لهذا العام.", rq: "جودة التنظيم", rl: "سيادة القانون", cc: "مكافحة الفساد", pv: "الاستقرار السياسي", debt: "الدين العام، % من الناتج", inf: "التضخم", gr: "النمو", ca: "الحساب الجاري، % من الناتج",
    read: "قراءة سريعة", readHint: "علامات بسيطة محسوبة من البيانات أعلاه. تشير إلى أين تنظر وليست نتائج.", src: "المصدر", loadFail: "تعذّر تحميل بيانات الاستثمار.", retry: "إعادة المحاولة", wam: "وام",
    f: { no_stock: "لا يوجد سجل لصندوق النقد للمركز الاستثماري: الرصيد مجهول (فجوة في بيانات المرآة). اعتمد على الصفقات والملف البحثي.", concentrated: "مستثمر واحد يهيمن على سجل الصفقات: {v}.", quiet: "لم تُعلن صفقة إماراتية خلال آخر 90 يومًا: يبدو الأفق هادئًا.", no_deals: "لم تُعثر على صفقات لشركات أو صناديق إماراتية في عناوين وام لهذه الدولة.", no_bit: "لا توجد اتفاقية استثمار في القوائم الرسمية: لا حماية تعاهدية مسجلة لرأس المال الإماراتي هنا.", has_bit: "{v} اتفاقية استثمار مسجلة.", no_tax: "لا توجد اتفاقية تجنب ازدواج ضريبي مسجلة.", no_cepa: "لا توجد شراكة اقتصادية شاملة موثقة.", cepa: "حالة الشراكة الشاملة: {v}.", debt: "الدين العام {v} من الناتج (صندوق النقد): ضغط الدولة قد يصل إلى العقود والمدفوعات وتحويل الأرباح.", inflation: "التضخم {v} (صندوق النقد): مخاطر العملة وتكلفة المشاريع.", weak_rq: "جودة التنظيم {v}/100 (البنك الدولي): قد تتغير القواعد على المستثمرين.", sanctions: "{v} إدراجًا في قوائم العقوبات بعنوان هنا (أوفاك، الأمم المتحدة): افحص كل شريك." } },
} as const;

const usd = (v: number | null | undefined) => (v == null ? "—" : Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}bn` : Math.abs(v) >= 1e6 ? `$${Math.round(v / 1e6)}m` : `$${Math.round(v / 1e3)}k`);
const tone = (v: number) => (v >= 60 ? "var(--ok)" : v >= 40 ? "var(--warn)" : "var(--risk)");
const FLAG_ICON = { warn: "▲", info: "●", ok: "✓" } as const; const FLAG_CLS = { warn: "text-warn", info: "text-t1", ok: "text-ok" } as const;

function Trend({ out, inw, u }: { out: [number, number][]; inw: [number, number][]; u: (typeof T)["en"] }) {
  const years = [...new Set([...out, ...inw].map((p) => p[0]))].sort(); if (years.length < 2) return null; const W = 300, H = 110, P = 6; const all = [...out, ...inw].map((p) => p[1]); const hi = Math.max(...all, 1), lo = Math.min(...all, 0); const px = (y: number) => P + ((y - years[0]) / (years[years.length - 1] - years[0])) * (W - 2 * P); const py = (v: number) => P + ((hi - v) / (hi - lo || 1)) * (H - 2 * P - 12);
  const line = (s: [number, number][], col: string) => s.length > 1 && <><polyline fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" points={s.map(([y, v]) => `${px(y)},${py(v)}`).join(" ")} />{s.map(([y, v]) => <circle key={y} cx={px(y)} cy={py(v)} r="2.6" fill={col}><title>{y}: {usd(v)}</title></circle>)}</>;
  return (
    <div dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={u.trend}>
      <line x1={P} x2={W - P} y1={py(0)} y2={py(0)} stroke="var(--line-2)" strokeDasharray="3 3" />{line(inw, "var(--c2)")}{line(out, "var(--accent)")}
      {years.filter((_, i) => i % Math.ceil(years.length / 5) === 0 || i === years.length - 1).map((y) => <text key={y} x={px(y)} y={H - 1} fontSize="9" textAnchor="middle" fill="currentColor" opacity=".55">{y}</text>)}
    </svg>
    <div className="mt-1 flex gap-3 text-[11px] text-t1"><span><i className="me-1 inline-block size-2 rounded-full bg-accent" />{u.out} {usd(out.at(-1)?.[1])}</span>{inw.length > 1 && <span><i className="me-1 inline-block size-2 rounded-full bg-c2" />{u.inw} {usd(inw.at(-1)?.[1])}</span>}</div></div>
  );
}

export function InvestTab({ c }: { c: Country }) {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const [d, setD] = useState<InvestPayload | null | "err">(null); const [n, setN] = useState(0); const [open, setOpen] = useState(false);
  const dx = useDealsX().value; const [inv, setInv] = useState<string | null>(null); const [sec, setSec] = useState<string | null>(null); const [more, setMore] = useState(false);
  useEffect(() => { let dead = false; fetch(`/api/invest/${c.iso3}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j: InvestPayload) => { if (!dead) setD(j); }).catch(() => { if (!dead) setD("err"); }); return () => { dead = true; }; }, [c.iso3, n]);
  const list = useMemo(() => (d && d !== "err" ? d.deals.items.filter((x) => (!inv || x.by.includes(inv)) && (!sec || (x.sector ?? "other") === sec)) : []), [d, inv, sec]);
  const flagText = (f: Flag) => (u.f as Record<string, string>)[f.id]?.replace("{v}", f.v ?? "") ?? f.id;
  const cta = (
    <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5"><h3 className="display text-[15px] font-semibold text-t0">{u.cta}</h3><p className="mt-1 text-[12.5px] leading-relaxed text-t1">{u.ctaText}</p>
      <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><FileText size={15} />{u.open}</button></div>
  );
  if (d === "err") return <div className="space-y-3">{cta}<EmptyState title={u.loadFail} why="" onRetry={() => { setD(null); setN((x) => x + 1); }} />{open && <DossierWorkspace c={c} mode="investments" onClose={() => setOpen(false)} />}</div>;
  if (!d) return <div className="space-y-3"><Skeleton h={110} /><Skeleton h={160} /><Skeleton h={160} /></div>;
  const o = d.stock.outward, topSector = d.deals.bySector[0]?.[1] ?? 1, topQ = Math.max(1, ...d.deals.byQuarter.map((x) => x[1])); const shown = more ? list : list.slice(0, 10);
  const bars: { k: keyof typeof u; v: number | null }[] = [{ k: "rq", v: d.risk.regulatoryQuality }, { k: "rl", v: d.risk.ruleOfLaw }, { k: "cc", v: d.risk.corruption }, { k: "pv", v: d.risk.stability }];
  const num = (v: number | null, s = "") => (v == null ? "—" : `${(Math.abs(v) < 0.05 ? 0 : v).toFixed(1)}${s}`);
  return (
    <div className="space-y-3">
      {cta}
      <Card title={u.pos} icon="💼">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-[12px] bg-bg2 p-3 sm:col-span-2"><div className="num display text-[24px] font-semibold text-t0">{o ? usd(o.usd) : "—"}</div><div className="text-[11.5px] text-t1">{u.stock}</div><div className="num mt-0.5 text-[10.5px] text-t2">{o ? `${o.year}${o.rank ? ` · ${u.rank} ${o.rank}` : ""}` : ""}</div></div>
          <div className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[20px] font-semibold text-t0">{d.stock.pctOfTheirGdp != null ? `${d.stock.pctOfTheirGdp.toFixed(2)}%` : "—"}</div><div className="text-[11.5px] text-t1">{u.ofGdp}</div></div>
          <div className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[20px] font-semibold text-t0">{d.stock.shareOfUaeAbroad != null ? `${d.stock.shareOfUaeAbroad.toFixed(1)}%` : "—"}</div><div className="text-[11.5px] text-t1">{u.ofUae}</div></div>
        </div>
        {!o ? <p className="mt-3 rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.noStock}</p> : <div className="mt-3"><h4 className="label mb-1.5">{u.trend}</h4><Trend out={o.series ?? []} inw={d.stock.inward?.series ?? []} u={u as never} /></div>}
      </Card>
      <CrossCheck iso={c.iso3} kind="invest" />
      <Card title={`${u.deals} · ${d.deals.total}`} icon="🤝">
        {!d.deals.total ? <p className="text-[12.5px] text-t1">{u.none}</p> : (<>
          <div className="mb-3 flex flex-wrap gap-3 text-[12px] text-t1"><span><b className="num text-t0">{d.deals.total}</b> {u.total}</span><span><b className="num text-t0">{d.deals.last365}</b> {u.d365}</span><span><b className="num text-t0">{d.deals.last90}</b> {u.d90}</span></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><h4 className="label mb-1.5">{u.by}</h4><ul className="space-y-1.5">{d.deals.byInvestor.slice(0, 8).map((x) => <li key={x.name}><button onClick={() => setInv(inv === x.name ? null : x.name)} className={`flex w-full items-baseline justify-between gap-2 rounded-[8px] px-2 py-1 text-start text-[12.5px] ${inv === x.name ? "bg-accent/15 text-accent" : "hover:bg-bg2"}`}><span className="truncate">{x.name}</span><span className="num shrink-0 text-t1">{x.n} · {x.last}</span></button></li>)}</ul></div>
            <div><h4 className="label mb-1.5">{u.sectors}</h4><ul className="space-y-1.5">{d.deals.bySector.slice(0, 7).map(([k, v]) => <li key={k}><button onClick={() => setSec(sec === k ? null : k)} className={`w-full rounded-[8px] px-2 py-1 text-start ${sec === k ? "bg-accent/15" : "hover:bg-bg2"}`}><div className="flex justify-between text-[12.5px]"><span className={sec === k ? "text-accent" : "text-t0"}>{k}</span><span className="num text-t1">{v}</span></div><div className="mt-0.5 h-1.5 rounded-full bg-bg3"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${(v / topSector) * 100}%` }} /></div></button></li>)}</ul></div>
          </div>
          {d.deals.byQuarter.length > 1 && <div className="mt-4" dir="ltr"><h4 className="label mb-1.5">{u.quarters}</h4><div className="flex h-16 items-end gap-1.5">{d.deals.byQuarter.map(([q, v]) => <div key={q} className="flex flex-1 flex-col items-center justify-end gap-0.5" title={`${q}: ${v}`}><span className="num text-[9.5px] text-t2">{v}</span><div className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(6, (v / topQ) * 100)}%` }} /><span className="num text-[8.5px] text-t2">{q.slice(2)}</span></div>)}</div></div>}
          <div className="mt-4 flex flex-wrap items-center gap-1.5"><button onClick={() => { setInv(null); setSec(null); }} className={`h-7 rounded-full px-2.5 text-[11.5px] ${!inv && !sec ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{u.all} · {d.deals.total}</button>{inv && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11.5px] text-accent">{inv}</span>}{sec && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11.5px] text-accent">{sec}</span>}</div>
          <ul className="mt-2 divide-y divide-line">{shown.map((x) => <li key={x.u} className="py-2"><a href={safeHttp(`https://www.wam.ae/en/article/${x.u}`)} target="_blank" rel="noreferrer noopener" className="text-[12.5px] leading-snug text-t0 hover:text-accent">{x.t}</a><div className="num mt-0.5 flex flex-wrap gap-x-2 text-[10.5px] text-t2"><span>{x.d}</span><span>{x.by.join(", ")}</span>{x.sector && <span>{x.sector}</span>}<span>{u.wam}</span></div><DealX u={x.u} x={dx} /></li>)}</ul>
          {list.length > 10 && <button onClick={() => setMore(!more)} className="mt-1 text-[12px] text-accent">{more ? u.fewer : `${u.showAll} (${list.length})`}</button>}
        </>)}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.dealsHint}</p>
        {d.deals.total > 0 && <DealsXNote ids={d.deals.items.map((x) => x.u)} x={dx} />}
      </Card>
      <Card title={u.prot} icon="🛡">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[[u.bit, d.protection.investment], [u.tax, d.protection.tax], [u.air, d.protection.air], [u.committees, d.protection.committees ?? "—"]].map(([k, v]) => <div key={String(k)} className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[20px] font-semibold text-t0">{String(v)}</div><div className="text-[11.5px] leading-snug text-t1">{k}</div></div>)}</div>
        <p className="mt-2.5 text-[12.5px] text-t0"><b>{u.cepa}:</b> {d.protection.cepa ? `${d.protection.cepa.status}${d.protection.cepa.signed ? ` · signed ${d.protection.cepa.signed}` : ""}${d.protection.cepa.inForce ? ` · in force ${d.protection.cepa.inForce}` : ""}` : u.none2}</p>
        {d.protection.titles.length > 0 && <ul className="mt-2 space-y-1 text-[12px] text-t1">{d.protection.titles.map((x, i) => <li key={i}>· {x.t}{x.year ? ` (${x.year})` : ""}</li>)}</ul>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.protHint}</p>
      </Card>
      <Card title={u.risk} icon="⚠️">
        <ul className="space-y-2">{bars.map((b) => <li key={b.k}><div className="flex justify-between text-[12.5px]"><span className="text-t0">{u[b.k] as string}</span><span className="num text-t1">{b.v == null ? "—" : b.v.toFixed(0)}</span></div><div className="mt-1 h-2 rounded-full bg-bg3"><div className="h-2 rounded-full" style={{ width: `${Math.max(2, b.v ?? 0)}%`, background: b.v == null ? "transparent" : tone(b.v) }} /></div></li>)}</ul>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[[u.debt, num(d.risk.debt, "%")], [u.inf, num(d.risk.inflation, "%")], [u.gr, num(d.risk.growth, "%")], [u.ca, num(d.risk.currentAccount, "%")]].map(([k, v]) => <div key={String(k)} className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[18px] font-semibold text-t0">{v}</div><div className="text-[11px] leading-snug text-t1">{k}</div></div>)}</div>
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.riskHint}</p>
      </Card>
      <Card title={u.read} icon="🧭">
        <ul className="space-y-2">{d.flags.map((f) => <li key={f.id} className="flex gap-2.5 text-[12.5px] leading-snug text-t0"><span aria-hidden className={`mt-0.5 ${FLAG_CLS[f.tone]}`}>{FLAG_ICON[f.tone]}</span><span>{flagText(f)}</span></li>)}</ul>
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.readHint}</p>
      </Card>
      {open && <DossierWorkspace c={c} mode="investments" onClose={() => setOpen(false)} />}
    </div>
  );
}
