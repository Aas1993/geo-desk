"use client";
import { useMemo, useState } from "react";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { useT } from "@/lib/store";
import { allAgreements, has, TYPE_LABEL, TYPE_ORDER, useAgreements, type AgData } from "@/lib/agreements-client";
import { useFlights, liveCount, type FlightData, type Status } from "@/lib/flights-client";
import { useInvestment, usd, type InvestmentData } from "@/lib/investment-client";
import { Card, Skeleton, StatTile } from "./ui";
import { CepaImpactTable } from "./TradeIntel";
import { useStore } from "@/lib/store";
import { useCountries } from "./SearchBox";
import type { Country } from "@/lib/types";

const UI = {
  en: { agreements: "Agreements", cepa: "CEPA", tax: "Tax treaty", air: "Air services", invest: "Investment treaty", committee: "Joint committee", yes: "Yes", no: "None listed", meetings: "meetings",
    inForce: "In force", signed: "Signed", concluded: "Talks concluded", unknown: "Status unclear", signedOn: "Signed", forceOn: "In force", dueOn: "Due", ministry: "Ministry page", noCepa: "No CEPA documented by the Ministry for this country.",
    all: "All", showAll: "Show all", fewer: "Show fewer", mou: "MoU", ag: "Agreement", none: "No agreements are listed for this country in the UAE's official sources.", offices: "UAE economic office", last: "Last meeting", since: "Since",
    flights: "Direct flights", destinations: "destinations", airlinesN: "airlines", fromAirports: "UAE airports", notLive: "not currently operating", noFlights: "No direct flights from the UAE are listed for this country.", suspendedNote: "Suspended routes are shown separately; Gulf schedules are changing quickly.", flightsLag: "From Wikipedia's airport tables (CC BY-SA); community-maintained and can lag the live schedule. Some entries are routings that continue beyond the UAE.", rev: "Page revisions", active: "Active", seasonal: "Seasonal", charter: "Charter", future: "Starting soon", suspended: "Suspended", showAllF: "Show all destinations",
    invTitle: "UAE investment & business presence", outward: "UAE investment there", inward: "Their investment in the UAE", rankN: "destination", ofWorld: "of the UAE's reported outward position", noInv: "No investment position is reported for this country.", invNote: "IMF mirror data (the partner country's own reports), net direct-investment position; latest year differs by country and some countries do not report. No public source counts UAE companies per country, so this is the best open measure of UAE business presence. See the Trade tab for goods trade.",
    sources: "Sources", built: "Data built", lag: "MOFA's list does not include CEPAs and can lag recent signings; the Ministry of Foreign Trade reports", signedN: "signed", forceN: "in force", loadErr: "Agreement data is unavailable right now." },
  ar: { agreements: "الاتفاقيات", cepa: "الشراكة الشاملة", tax: "اتفاقية ضريبية", air: "النقل الجوي", invest: "اتفاقية استثمار", committee: "لجنة مشتركة", yes: "نعم", no: "غير مدرجة", meetings: "اجتماعات",
    inForce: "سارية", signed: "موقّعة", concluded: "انتهت المفاوضات", unknown: "الحالة غير واضحة", signedOn: "التوقيع", forceOn: "بدء السريان", dueOn: "المتوقع", ministry: "صفحة الوزارة", noCepa: "لا توجد اتفاقية شراكة اقتصادية شاملة موثّقة لدى الوزارة لهذه الدولة.",
    all: "الكل", showAll: "عرض الكل", fewer: "عرض أقل", mou: "مذكرة", ag: "اتفاقية", none: "لا توجد اتفاقيات مدرجة لهذه الدولة في المصادر الرسمية للإمارات.", offices: "مكتب اقتصادي إماراتي", last: "آخر اجتماع", since: "منذ",
    flights: "الرحلات المباشرة", destinations: "وجهة", airlinesN: "شركة طيران", fromAirports: "مطارات الإمارات", notLive: "غير عاملة حاليًا", noFlights: "لا توجد رحلات مباشرة من الإمارات مدرجة لهذه الدولة.", suspendedNote: "تُعرض المسارات المعلّقة بشكل منفصل؛ وجداول الخليج تتغيّر بسرعة.", flightsLag: "من جداول المطارات في ويكيبيديا (CC BY-SA)؛ يحررها المجتمع وقد تتأخر عن الجدول الفعلي. بعض المدخلات رحلات تواصل إلى ما بعد الإمارات.", rev: "نسخ الصفحات", active: "عاملة", seasonal: "موسمية", charter: "تأجير", future: "قريبًا", suspended: "معلّقة", showAllF: "عرض كل الوجهات",
    invTitle: "الاستثمار الإماراتي والحضور التجاري", outward: "الاستثمار الإماراتي هناك", inward: "استثمارهم في الإمارات", rankN: "وجهة", ofWorld: "من الاستثمار الإماراتي المُبلَّغ عنه في الخارج", noInv: "لا يوجد مركز استثماري مُبلَّغ عنه لهذه الدولة.", invNote: "بيانات صندوق النقد الدولي المرآتية (من تقارير الدولة الشريكة)، صافي مركز الاستثمار المباشر؛ تختلف السنة الأحدث بين الدول وبعض الدول لا تبلّغ. لا يوجد مصدر عام يُحصي الشركات الإماراتية في كل دولة، لذا هذا أفضل مقياس مفتوح للحضور التجاري. راجع تبويب التجارة لتجارة السلع.",
    sources: "المصادر", built: "تاريخ البناء", lag: "قائمة وزارة الخارجية لا تتضمن اتفاقيات الشراكة وقد تتأخر عن آخر التوقيعات؛ وتفيد وزارة التجارة الخارجية بـ", signedN: "موقّعة", forceN: "سارية", loadErr: "بيانات الاتفاقيات غير متاحة حاليًا." },
} as const;
const STATUS_COLOR = { "in-force": "text-up", signed: "text-warn", concluded: "text-accent", unknown: "text-t2" } as const;
const day = (iso: string | null, lang: "en" | "ar") => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** Everything the UAE has formally agreed with this country, from MOFA and the Ministry of Foreign Trade, with the flights-and-business context in the next release. */
export function AgreementsTab({ c }: { c: Country }) {
  return c.iso3 === "ARE" ? <UaeAgreements /> : <CountryAgreements c={c} />;
}

function CountryAgreements({ c }: { c: Country }) {
  const { lang } = useT(); const u = UI[lang]; const data = useAgreements(); const flights = useFlights(); const inv = useInvestment(); const [type, setType] = useState<string>("all"); const [more, setMore] = useState(false);
  const ag = data?.countries[c.iso3]; const rows = useMemo(() => (ag ? allAgreements(ag) : []), [ag]);
  const counts = useMemo(() => { const m: Record<string, number> = {}; for (const r of rows) m[r.type] = (m[r.type] ?? 0) + 1; return m; }, [rows]);
  const shown = rows.filter((r) => type === "all" || r.type === type); const list = more ? shown : shown.slice(0, 10);
  if (!data) return <div className="space-y-3"><Skeleton h={90} /><Skeleton h={160} /></div>;
  const cepa = ag?.cepa; const jc = ag?.committees[0];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={u.agreements} value={rows.length || "—"} sub={rows.length ? `${rows.filter((r) => r.kind === "mou").length} ${u.mou}` : undefined} />
        <StatTile label={u.cepa} value={cepa ? <span className={STATUS_COLOR[cepa.status]}>{u[cepa.status === "in-force" ? "inForce" : cepa.status]}</span> : "—"} />
        <StatTile label={u.tax} value={has(ag, "tax") ? u.yes : "—"} />
        <StatTile label={u.air} value={has(ag, "air") ? u.yes : "—"} sub={flights ? `${liveCount(flights.countries[c.iso3])} ${u.destinations}` : undefined} />
        <StatTile label={u.invest} value={has(ag, "investment") ? u.yes : "—"} />
        <StatTile label={u.committee} value={jc ? (jc.meetings != null ? `${jc.meetings} ${u.meetings}` : u.yes) : "—"} />
      </div>
      <Card title={u.cepa} icon="🤝">
        {cepa ? (
          <div className="space-y-1.5 text-[13px]">
            <div className={`font-semibold ${STATUS_COLOR[cepa.status]}`}>{u[cepa.status === "in-force" ? "inForce" : cepa.status]}</div>
            <div className="num text-t1">{u.signedOn}: {day(cepa.signed, lang)}{cepa.inForce ? ` · ${u.forceOn}: ${day(cepa.inForce, lang)}` : cepa.due ? ` · ${u.dueOn}: ${day(cepa.due, lang)}` : ""}</div>
            <a href={cepa.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink size={12} />{u.ministry}</a>
          </div>
        ) : <p className="text-[12.5px] text-t1">{u.noCepa}</p>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.lag} {data.cepaSummary.signed} {u.signedN} / {data.cepaSummary.inForce} {u.forceN} ({data.cepaSummary.asOf}).</p>
      </Card>
      <FlightsCard data={flights} iso3={c.iso3} lang={lang} />
      <InvestmentCard data={inv} iso3={c.iso3} lang={lang} />
      {!rows.length && <p className="text-[13px] text-t1">{u.none}</p>}
      {!!rows.length && (
        <Card title={u.agreements} icon="📜">
          <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {[["all", rows.length] as const, ...TYPE_ORDER.filter((t) => counts[t]).map((t) => [t, counts[t]] as const)].map(([t, n]) => (
              <button key={t} onClick={() => { setType(t); setMore(false); }} aria-pressed={type === t} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${type === t ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:border-accent"}`}>
                {t === "all" ? u.all : TYPE_LABEL[t][lang]} <span className="num opacity-70">{n}</span></button>))}
          </div>
          <ul className="divide-y divide-line/60">{list.map((r, i) => (
            <li key={i} className="py-2 text-[13px] leading-snug text-t0">{r.t}
              <div className="num mt-0.5 text-[10.5px] text-t2">{r.kind === "mou" ? u.mou : u.ag} · {TYPE_LABEL[r.type]?.[lang]} · {r.src}{r.year ? ` · ${r.year}` : ""}</div></li>))}</ul>
          {shown.length > 10 && <button onClick={() => setMore(!more)} className="mt-2 text-[12.5px] text-accent hover:underline">{more ? u.fewer : `${u.showAll} (${shown.length})`}</button>}
        </Card>
      )}
      {!!ag?.committees.length && (
        <Card title={u.committee} icon="🗓">
          {ag.committees.map((j, i) => <div key={i} className="num text-[12.5px] text-t1">{j.since ? `${u.since} ${j.since}` : ""}{j.meetings != null ? ` · ${j.meetings} ${u.meetings}` : ""}{j.last ? <div className="mt-0.5 text-t2">{u.last}: {j.last}</div> : null}</div>)}
        </Card>
      )}
      {!!ag?.offices.length && (
        <Card title={u.offices} icon="🏢">
          {ag.offices.map((o, i) => <div key={i} className="space-y-1 text-[12.5px]"><div className="text-t0">{o.label}</div>
            {o.email && <a href={`mailto:${o.email}`} className="flex items-center gap-1.5 text-accent hover:underline"><Mail size={12} />{o.email}</a>}
            {o.phone && <div className="num flex items-center gap-1.5 text-t1"><Phone size={12} />{o.phone}</div>}</div>)}
        </Card>
      )}
      <Sources data={data} lang={lang} />
    </div>
  );
}

function Sources({ data, lang }: { data: AgData; lang: "en" | "ar" }) {
  const u = UI[lang];
  return (
    <p className="text-[11px] leading-relaxed text-t2">{u.sources}: {Object.values(data.sources).map((s, i) => <span key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noreferrer noopener" className="underline hover:text-accent">{s.name}</a></span>)}. {u.built} {data.built.slice(0, 10)}.</p>
  );
}

const FLIGHT_COLOR: Record<Status, string> = { active: "text-up", seasonal: "text-accent", charter: "text-t1", future: "text-warn", suspended: "text-down" };
function FlightsCard({ data, iso3, lang }: { data: FlightData | null; iso3: string; lang: "en" | "ar" }) {
  const u = UI[lang]; const [open, setOpen] = useState(false);
  if (!data) return <Skeleton h={90} />;
  const f = data.countries[iso3]; const live = liveCount(f);
  const order: Record<Status, number> = { active: 0, seasonal: 1, charter: 2, future: 3, suspended: 4 };
  const dests = f ? [...f.destinations].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)) : [];
  const shown = open ? dests : dests.slice(0, 8); const origins = f ? [...new Set(dests.flatMap((d) => d.from))].sort() : [];
  return (
    <Card title={u.flights} icon="✈️">
      {!f ? <p className="text-[12.5px] text-t1">{u.noFlights}</p> : (
        <>
          <div className="num flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-[22px] font-semibold text-t0">{live}<span className="ms-1.5 text-[12px] font-normal text-t2">{u.destinations}</span></span>
            <span className="text-[12.5px] text-t1">{f.airlines.length} {u.airlinesN}</span>
            <span className="text-[12.5px] text-t1">{u.fromAirports}: {origins.join(" · ")}</span>
          </div>
          {f.counts.suspended + f.counts.future + f.counts.charter > 0 && <p className="mt-1 text-[12px] text-t1">{[f.counts.suspended && `${f.counts.suspended} ${u.suspended.toLowerCase()}`, f.counts.future && `${f.counts.future} ${u.future.toLowerCase()}`, f.counts.charter && `${f.counts.charter} ${u.charter.toLowerCase()}`].filter(Boolean).join(" · ")} — {u.notLive}. {f.counts.suspended ? u.suspendedNote : ""}</p>}
          <ul className="mt-2 divide-y divide-line/60">{shown.map((d) => (
            <li key={d.iata} className="py-1.5 text-[12.5px]"><div className="flex items-baseline justify-between gap-2"><span className="text-t0"><span className="num me-1.5 text-t2">{d.iata}</span>{d.name.replace(/ (International )?Airport$/i, "")}</span><span className={`shrink-0 text-[11px] ${FLIGHT_COLOR[d.status]}`}>{u[d.status]}</span></div>
              <div className="num text-[10.5px] text-t2">{d.from.join("/")} · {d.airlines.map((a) => a.name).join(", ")}</div></li>))}</ul>
          {dests.length > 8 && <button onClick={() => setOpen(!open)} className="mt-2 text-[12.5px] text-accent hover:underline">{open ? u.fewer : `${u.showAllF} (${dests.length})`}</button>}
        </>
      )}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.flightsLag} <a href={data.source.url} target="_blank" rel="noreferrer noopener" className="underline hover:text-accent">Wikipedia</a> · {u.built} {data.built.slice(0, 10)}.</p>
    </Card>
  );
}

function InvestmentCard({ data, iso3, lang }: { data: InvestmentData | null; iso3: string; lang: "en" | "ar" }) {
  const u = UI[lang]; if (!data) return <Skeleton h={80} />; const i = data.countries[iso3]; const o = i?.outward; const inw = i?.inward;
  return (
    <Card title={u.invTitle} icon="🏗">
      {!o && !inw ? <p className="text-[12.5px] text-t1">{u.noInv}</p> : (
        <div className="grid grid-cols-2 gap-2">
          {o && <StatTile label={u.outward} value={usd(o.usd)} sub={`${o.year}${o.rank ? ` · #${o.rank} ${u.rankN}` : ""}`} />}
          {inw && <StatTile label={u.inward} value={usd(inw.usd)} sub={String(inw.year)} />}
        </div>
      )}
      {o && data.world?.usd > 0 && <p className="num mt-2 text-[12px] text-t1">{((o.usd / data.world.usd) * 100).toFixed(1)}% {u.ofWorld} ({usd(data.world.usd)}, {data.world.year}).</p>}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.invNote} <a href={data.source.url} target="_blank" rel="noreferrer noopener" className="underline hover:text-accent">IMF</a> · {u.built} {data.built.slice(0, 10)}.</p>
    </Card>
  );
}

/** The UAE's own page: its whole treaty network, CEPA by CEPA, with the counts that matter. */
function UaeAgreements() {
  const { lang } = useT(); const u = UI[lang]; const data = useAgreements(); const flights = useFlights(); const inv = useInvestment(); const select = useStore((s) => s.select); const cs = useCountries();
  if (!data) return <div className="space-y-3"><Skeleton h={90} /><Skeleton h={220} /></div>;
  const all = Object.entries(data.countries); const cepas = all.filter(([, c]) => c.cepa).map(([k, c]) => [k, c.cepa!] as const).sort((a, b) => (b[1].inForce ?? b[1].signed ?? "").localeCompare(a[1].inForce ?? a[1].signed ?? ""));
  const n = (type: string) => all.filter(([, c]) => has(c, type)).length; const live = flights ? Object.values(flights.countries).reduce((s, x) => s + liveCount(x), 0) : null;
  const nm = (iso: string) => { const co = cs?.byIso.get(iso); return co ? `${co.flag ?? ""} ${lang === "ar" && co.nameAr ? co.nameAr : co.name}`.trim() : iso; };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={u.cepa} value={data.cepaSummary.signed} sub={`${data.cepaSummary.inForce} ${u.forceN} · ${data.cepaSummary.asOf}`} />
        <StatTile label={u.tax} value={n("tax")} sub={lang === "ar" ? "دولة" : "countries"} />
        <StatTile label={u.air} value={n("air")} sub={live != null ? `${live} ${u.destinations}` : undefined} />
        <StatTile label={u.invest} value={n("investment")} sub={lang === "ar" ? "دولة" : "countries"} />
        <StatTile label={u.committee} value={all.filter(([, c]) => c.committees.length).length} />
        <StatTile label={u.invTitle.split(" & ")[0]} value={inv ? usd(inv.world.usd) : "—"} sub={inv ? String(inv.world.year) : undefined} />
      </div>
      <Card title={`${u.cepa} (${cepas.length})`} icon="🤝"><ul className="divide-y divide-line/60">{cepas.map(([iso, ce]) => (
        <li key={iso} className="flex items-baseline justify-between gap-2 py-1.5 text-[13px]"><button onClick={() => select(iso, "agreements")} className="truncate text-start hover:text-accent">{nm(iso)}</button>
          <span className="num shrink-0 text-[11.5px]"><span className={STATUS_COLOR[ce.status]}>{u[ce.status === "in-force" ? "inForce" : ce.status]}</span><span className="text-t2"> · {day(ce.inForce ?? ce.signed, lang)}</span></span></li>))}</ul>
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.lag} {data.cepaSummary.signed} {u.signedN} / {data.cepaSummary.inForce} {u.forceN} ({data.cepaSummary.asOf}).</p></Card>
      <CepaImpactTable />
      <Sources data={data} lang={lang} />
    </div>
  );
}
