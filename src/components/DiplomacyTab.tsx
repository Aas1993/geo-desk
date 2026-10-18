"use client";
import { useMemo, useState } from "react";
import { ExternalLink, Mail, MapPin, Phone, Printer } from "lucide-react";
import { useT } from "@/lib/store";
import { TYPE_LABEL, useMissions, useVisits, wamUrl, type Visit } from "@/lib/diplomacy-client";
import { Card, Skeleton, StatTile } from "./ui";
import type { Country } from "@/lib/types";

const UI = {
  en: { missions: "UAE missions here", none: "The UAE has no mission listed in this country in MOFA's directory.", ambassador: "Ambassador", hours: "Hours", map: "Map", website: "Mission website", tel: "Phone", fax: "Fax", embassies: "embassies", consulates: "consulates-general", total: "missions",
    visits: "Visits & high-level meetings", intro: "UAE engagements with this country as reported by WAM (the Emirates News Agency), classified from headlines. Not a complete diplomatic diary.", last12: "last 12 months", senior: "Senior-level", lastSenior: "Latest senior contact", lastVisit: "Latest visit", never: "None found",
    all: "All", seniorF: "Senior", ministerial: "Ministerial", calls: "Calls", visitsF: "Visits", signings: "Signings", messages: "Messages", meetings: "Meetings", inbound: "Hosted by the UAE", outbound: "UAE abroad", noItems: "No engagements match this filter.", showAll: "Show all", fewer: "Show fewer",
    L3: "Head of state / government", L2: "Ministerial", L1: "Official / delegation", kinds: { visit: "Visit", meeting: "Meeting", call: "Call", signing: "Signing", message: "Message" } as Record<string, string>, source: "Source", built: "Data built", sinceN: "Covers", opens: "Opens the WAM article",
    contactNote: "Names and contacts are published by MOFA and change; confirm on the mission page before relying on them." },
  ar: { missions: "البعثات الإماراتية هنا", none: "لا توجد بعثة للإمارات مدرجة في هذه الدولة في دليل وزارة الخارجية.", ambassador: "السفير", hours: "ساعات العمل", map: "الخريطة", website: "موقع البعثة", tel: "هاتف", fax: "فاكس", embassies: "سفارات", consulates: "قنصليات عامة", total: "بعثات",
    visits: "الزيارات واللقاءات رفيعة المستوى", intro: "تفاعلات الإمارات مع هذه الدولة كما أوردتها وام (وكالة أنباء الإمارات)، مصنّفة من العناوين. ليست سجلًا دبلوماسيًا كاملًا.", last12: "آخر 12 شهرًا", senior: "رفيعة المستوى", lastSenior: "آخر اتصال رفيع", lastVisit: "آخر زيارة", never: "لا شيء",
    all: "الكل", seniorF: "رفيع", ministerial: "وزاري", calls: "اتصالات", visitsF: "زيارات", signings: "توقيعات", messages: "رسائل", meetings: "لقاءات", inbound: "تستضيفها الإمارات", outbound: "الإمارات في الخارج", noItems: "لا توجد تفاعلات مطابقة.", showAll: "عرض الكل", fewer: "عرض أقل",
    L3: "رئيس دولة / حكومة", L2: "وزاري", L1: "مسؤول / وفد", kinds: { visit: "زيارة", meeting: "لقاء", call: "اتصال", signing: "توقيع", message: "رسالة" } as Record<string, string>, source: "المصدر", built: "تاريخ البناء", sinceN: "يغطي منذ", opens: "يفتح خبر وام",
    contactNote: "الأسماء والبيانات منشورة من وزارة الخارجية وتتغير؛ تأكد من صفحة البعثة قبل الاعتماد عليها." },
} as const;
const LEVEL_COLOR = { 3: "#ffc247", 2: "#3ddcff", 1: "#9db0cf" } as const;
const day = (d: string, lang: "en" | "ar") => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
type Filter = "all" | "senior" | "ministerial" | "call" | "visit" | "signing" | "message" | "meeting" | "in" | "out";

/** UAE missions in the country (ambassador, contacts) and the history of visits, meetings, calls and signings reported by WAM. */
export function DiplomacyTab({ c }: { c: Country }) {
  const { lang } = useT(); const u = UI[lang]; const m = useMissions(); const v = useVisits(); const [f, setF] = useState<Filter>("all"); const [more, setMore] = useState(false);
  const list = m?.countries[c.iso3] ?? []; const items = useMemo(() => (v ? v.items.filter((x) => x.c.includes(c.iso3)) : []), [v, c.iso3]);
  const match = (x: Visit) => f === "all" || (f === "senior" && x.l === 3) || (f === "ministerial" && x.l === 2) || x.k === f || x.dir === f;
  const shown = items.filter(match); const rows = more ? shown : shown.slice(0, 12);
  const cutoff = useMemo(() => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - 1); return d.toISOString().slice(0, 10); }, []);
  const last12 = items.filter((x) => x.d >= cutoff).length; const lastSenior = items.find((x) => x.l === 3); const lastVisit = items.find((x) => x.k === "visit");
  const chips: [Filter, string][] = [["all", u.all], ["senior", u.seniorF], ["ministerial", u.ministerial], ["meeting", u.meetings], ["visit", u.visitsF], ["call", u.calls], ["signing", u.signings], ["message", u.messages], ["in", u.inbound], ["out", u.outbound]];
  if (!m || !v) return <div className="space-y-3"><Skeleton h={120} /><Skeleton h={160} /></div>;
  const emb = list.filter((x) => x.type === "embassy").length, cg = list.filter((x) => x.type === "consulate-general" || x.type === "consulate").length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={u.total} value={list.filter((x) => x.type !== "visa-centre").length || "—"} sub={list.length ? `${emb} ${u.embassies} · ${cg} ${u.consulates}` : undefined} />
        <StatTile label={u.last12} value={last12 || "—"} sub={`${items.filter((x) => x.d >= cutoff && x.l === 3).length} ${u.senior.toLowerCase()}`} />
        <StatTile label={u.lastSenior} value={lastSenior ? day(lastSenior.d, lang) : u.never} />
      </div>
      <Card title={u.missions} icon="🏛">
        {!list.length ? <p className="text-[12.5px] text-t1">{u.none}</p> : (
          <ul className="space-y-3">{list.map((x) => (
            <li key={x.id} className="rounded-[10px] border border-line bg-bg2 p-3">
              <div className="flex items-start justify-between gap-2"><div className="text-[13.5px] font-semibold leading-snug text-t0">{x.name}</div><span className="shrink-0 rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">{TYPE_LABEL[x.type][lang]}</span></div>
              {x.head && <div className="mt-1 text-[13px] text-t0"><span className="text-t2">{x.head.role === "Ambassador" ? u.ambassador : x.head.role}: </span>{x.head.name}</div>}
              <div className="mt-2 space-y-1 text-[12.5px] text-t1">
                {x.phone && <a href={`tel:${x.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-accent"><Phone size={12} /><span className="num">{x.phone}</span></a>}
                {x.email && <a href={`mailto:${x.email}`} className="flex items-center gap-1.5 hover:text-accent"><Mail size={12} />{x.email}</a>}
                {x.fax && <div className="flex items-center gap-1.5 text-t2"><Printer size={12} /><span className="num">{u.fax} {x.fax}</span></div>}
                {x.address && <div className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0" /><span>{x.address}{x.lat != null && x.lon != null && <> · <a className="text-accent hover:underline" href={`https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=16/${x.lat}/${x.lon}`} target="_blank" rel="noreferrer noopener">{u.map}</a></>}</span></div>}
                {x.hours && <div className="num text-[11.5px] text-t2">{u.hours}: {x.hours}</div>}
                {x.website && <a href={x.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink size={11} />{u.website}</a>}
              </div></li>))}</ul>)}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.contactNote} <a className="underline hover:text-accent" href={m.source.url} target="_blank" rel="noreferrer noopener">MOFA</a> · {u.built} {m.built.slice(0, 10)}.</p>
      </Card>
      <Card title={u.visits} icon="🤝">
        <p className="mb-2 text-[12px] leading-snug text-t2">{u.intro}</p>
        <div className="mb-1 grid grid-cols-2 gap-2"><StatTile label={u.lastVisit} value={lastVisit ? day(lastVisit.d, lang) : u.never} sub={lastVisit ? (lastVisit.dir === "in" ? u.inbound : lastVisit.dir === "out" ? u.outbound : undefined) : undefined} /><StatTile label={u.all} value={items.length || "—"} sub={`${u.sinceN} ${v.from.slice(0, 7)}`} /></div>
        <div className="no-scrollbar -mx-1 my-2 flex gap-1.5 overflow-x-auto px-1 pb-1">{chips.map(([k, label]) => <button key={k} onClick={() => { setF(k); setMore(false); }} aria-pressed={f === k} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] ${f === k ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:border-accent"}`}>{label}</button>)}</div>
        {!rows.length ? <p className="text-[12.5px] text-t1">{u.noItems}</p> : (
          <ul className="divide-y divide-line/60">{rows.map((x) => (
            <li key={x.u} className="py-2"><a href={wamUrl(x.u)} target="_blank" rel="noreferrer noopener" title={u.opens} className="text-[13px] leading-snug text-t0 hover:text-accent">{x.t}</a>
              <div className="num mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-t2"><span>{day(x.d, lang)}</span><span>{u.kinds[x.k]}</span><span style={{ color: LEVEL_COLOR[x.l] }}>{x.l === 3 ? u.L3 : x.l === 2 ? u.L2 : u.L1}</span>{x.dir && <span>{x.dir === "in" ? u.inbound : u.outbound}</span>}</div></li>))}</ul>)}
        {shown.length > 12 && <button onClick={() => setMore(!more)} className="mt-2 text-[12.5px] text-accent hover:underline">{more ? u.fewer : `${u.showAll} (${shown.length})`}</button>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.source}: <a className="underline hover:text-accent" href={v.source.url} target="_blank" rel="noreferrer noopener">WAM</a> · {u.built} {v.built.slice(0, 10)}.</p>
      </Card>
    </div>
  );
}
