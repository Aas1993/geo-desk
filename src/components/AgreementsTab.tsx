"use client";
import { useMemo, useState } from "react";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { useT } from "@/lib/store";
import { allAgreements, has, TYPE_LABEL, TYPE_ORDER, useAgreements, type AgData } from "@/lib/agreements-client";
import { Card, Skeleton, StatTile } from "./ui";
import type { Country } from "@/lib/types";

const UI = {
  en: { agreements: "Agreements", cepa: "CEPA", tax: "Tax treaty", air: "Air services", invest: "Investment", committee: "Joint committee", yes: "Yes", no: "None listed", meetings: "meetings",
    inForce: "In force", signed: "Signed", concluded: "Talks concluded", unknown: "Status unclear", signedOn: "Signed", forceOn: "In force", dueOn: "Due", ministry: "Ministry page", noCepa: "No CEPA documented by the Ministry for this country.",
    all: "All", showAll: "Show all", fewer: "Show fewer", mou: "MoU", ag: "Agreement", none: "No agreements are listed for this country in the UAE's official sources.", offices: "UAE economic office", last: "Last meeting", since: "Since",
    sources: "Sources", built: "Data built", lag: "MOFA's list does not include CEPAs and can lag recent signings; the Ministry of Foreign Trade reports", signedN: "signed", forceN: "in force", loadErr: "Agreement data is unavailable right now." },
  ar: { agreements: "الاتفاقيات", cepa: "الشراكة الشاملة", tax: "اتفاقية ضريبية", air: "النقل الجوي", invest: "الاستثمار", committee: "لجنة مشتركة", yes: "نعم", no: "غير مدرجة", meetings: "اجتماعات",
    inForce: "سارية", signed: "موقّعة", concluded: "انتهت المفاوضات", unknown: "الحالة غير واضحة", signedOn: "التوقيع", forceOn: "بدء السريان", dueOn: "المتوقع", ministry: "صفحة الوزارة", noCepa: "لا توجد اتفاقية شراكة اقتصادية شاملة موثّقة لدى الوزارة لهذه الدولة.",
    all: "الكل", showAll: "عرض الكل", fewer: "عرض أقل", mou: "مذكرة", ag: "اتفاقية", none: "لا توجد اتفاقيات مدرجة لهذه الدولة في المصادر الرسمية للإمارات.", offices: "مكتب اقتصادي إماراتي", last: "آخر اجتماع", since: "منذ",
    sources: "المصادر", built: "تاريخ البناء", lag: "قائمة وزارة الخارجية لا تتضمن اتفاقيات الشراكة وقد تتأخر عن آخر التوقيعات؛ وتفيد وزارة التجارة الخارجية بـ", signedN: "موقّعة", forceN: "سارية", loadErr: "بيانات الاتفاقيات غير متاحة حاليًا." },
} as const;
const STATUS_COLOR = { "in-force": "text-up", signed: "text-warn", concluded: "text-accent", unknown: "text-t2" } as const;
const day = (iso: string | null, lang: "en" | "ar") => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** Everything the UAE has formally agreed with this country, from MOFA and the Ministry of Foreign Trade, with the flights-and-business context in the next release. */
export function AgreementsTab({ c }: { c: Country }) {
  const { lang } = useT(); const u = UI[lang]; const data = useAgreements(); const [type, setType] = useState<string>("all"); const [more, setMore] = useState(false);
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
        <StatTile label={u.air} value={has(ag, "air") ? u.yes : "—"} />
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
