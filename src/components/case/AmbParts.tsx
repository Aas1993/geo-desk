"use client";
import { openings, type Advantage, type Level } from "@/lib/case/advantage";
import type { AmbParsed, Contact, Init, Nb, Play } from "@/lib/case/ambassador";
import type { CaseData } from "@/lib/case/load";
import { matchCountry } from "@/lib/case/report";
import { Pill, type Lang } from "../falcon/bits";
import { Meter, bt, useTr } from "./bits";

const HAT_C: Record<string, string> = { economic: "#BA7517", investment: "#D4537E", political: "#378ADD", social: "#1D9E75", security: "#7F77DD", humanitarian: "#639922", research: "#8a94a6", narrative: "#C0568C", "foreign-policy": "#378ADD" };
const LV: Record<Level, string> = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)", unknown: "var(--t2)" };
const REL: Record<Nb["relation"], { en: string; ar: string; c: string }> = { ally: { en: "ally", ar: "حليف", c: "var(--ok)" }, partner: { en: "partner", ar: "شريك", c: "var(--ok)" }, neutral: { en: "neutral", ar: "محايد", c: "var(--t2)" }, tension: { en: "tension", ar: "توتر", c: "var(--warn)" }, rival: { en: "rival", ar: "منافس", c: "var(--risk)" } };
const KIND: Record<Play["kind"], { en: string; ar: string; c: string }> = { enter: { en: "enter", ar: "دخول", c: "var(--accent)" }, expand: { en: "expand", ar: "توسّع", c: "var(--ok)" }, protect: { en: "protect", ar: "حماية", c: "var(--warn)" } };
const nameOf = (v: { name: string; ar: string }, L: Lang) => (L === "ar" ? v.ar : v.name);

/** Need against presence, sector by sector. A sector with a high need and no announced UAE deal is an opening; one with both is a place to deepen. */
export function AdvantageView({ L, a }: { L: Lang; a: Advantage }) {
  const t = useTr(L); const op = openings(a); const lvl = (x: Level) => (x === "high" ? t("high", "عالية") : x === "medium" ? t("medium", "متوسطة") : x === "low" ? t("low", "منخفضة") : t("unknown", "غير معروفة"));
  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[[t("UAE deal headlines found", "عناوين صفقات إماراتية"), a.total, t("announcements, not completed investment", "إعلانات لا استثمار منجز")], [t("UAE vehicles present", "أدوات إماراتية حاضرة"), a.present.length, a.present.slice(0, 3).map((p) => p.v.name).join(", ") || "—"], [t("Openings", "الفرص المفتوحة"), op.length, t("need, and no announced UAE deal", "حاجة وبلا صفقة إماراتية معلنة")], [t("Concentration", "التركّز"), a.concentration ? `${a.concentration.share}%` : "—", a.concentration ? a.concentration.who : t("no deals", "لا صفقات")]].map(([l, v, s], i) => <div key={i} className="rounded-[12px] border border-line bg-bg1 p-3"><div className="label">{l}</div><div className="num display text-[24px] font-semibold text-t0">{v}</div><div className="text-[10.5px] leading-snug text-t2">{s}</div></div>)}
      </div>
      <div className="scroll-thin overflow-x-auto rounded-[14px] border border-line bg-bg1"><table className="w-full min-w-[760px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Sector", "القطاع")}</th><th className="px-2 text-start font-semibold">{t("What the country needs", "ما تحتاجه الدولة")}</th><th className="px-2 text-start font-semibold">{t("UAE already present", "الإمارات حاضرة")}</th><th className="px-2 text-start font-semibold">{t("UAE vehicles with a fit, no announced deal", "أدوات إماراتية مناسبة بلا صفقة معلنة")}</th></tr></thead>
        <tbody>{a.rows.map((r) => { const open = (r.demand.level === "high" || r.demand.level === "medium") && r.deals.length === 0; return (
          <tr key={r.sector} className="border-t border-line align-top" style={open ? { background: "color-mix(in srgb, var(--accent) 6%, transparent)" } : undefined}>
            <td className="px-3 py-2.5 font-semibold text-t0">{bt(L, r.name)}{open && <div className="mt-0.5"><Pill c="var(--accent)">{t("opening", "فرصة")}</Pill></div>}</td>
            <td className="px-2 py-2.5"><Pill c={LV[r.demand.level]}>{lvl(r.demand.level)}</Pill><p className="mt-1 max-w-[260px] text-[11px] leading-snug text-t2">{bt(L, r.demand.evidence)}</p></td>
            <td className="px-2 py-2.5">{r.deals.length ? <><div className="flex flex-wrap gap-1">{r.present.map((v) => <Pill key={v.id} c="var(--ok)">{nameOf(v, L)}</Pill>)}{r.others.map((n) => <Pill key={n} c="var(--c2)">{n}</Pill>)}</div><p className="mt-1 text-[11px] text-t2">{r.deals.length} {t("deal headline(s)", "عنوان صفقة")}</p></> : <span className="text-t2">—</span>}</td>
            <td className="px-2 py-2.5">{(r.demand.level === "high" || r.demand.level === "medium") && r.deals.length === 0 ? <div className="flex flex-wrap gap-1">{r.candidates.map((v) => <span key={v.id} className="rounded-full border border-line bg-bg2 px-2 py-0.5 text-[11px] text-t1">{nameOf(v, L)}</span>)}</div> : <span className="text-t2">—</span>}</td></tr>); })}</tbody></table></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{a.byType.filter((x) => x.present.length + x.absent.length > 0).map((x) => <section key={x.type} className="rounded-[12px] border border-line bg-bg1 p-3"><h4 className="text-[12.5px] font-semibold text-t0">{bt(L, x.name)}</h4><div className="mt-1.5 flex flex-wrap gap-1">{x.present.map((v) => <Pill key={v.id} c="var(--ok)">✓ {nameOf(v, L)}</Pill>)}{x.absent.map((v) => <span key={v.id} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-t2">{nameOf(v, L)}</span>)}</div></section>)}</div>
      <p className="text-[11px] leading-snug text-t2">{t("Present means an announced deal in the WAM-based feed; it does not show private or unannounced business, and \"not present\" does not mean no business. The vehicle list is a working registry from public knowledge and the deals feed: verify ownership and mandate. Need comes from the ten-year spine with the evidence shown.", "حاضرة تعني صفقة معلنة في تغذية وام؛ ولا تُظهر الأعمال الخاصة أو غير المعلنة، و«غير حاضرة» لا تعني بلا أعمال. وقائمة الأدوات سجل عمل من المعرفة العامة وتغذية الصفقات: تحقق من الملكية والتفويض. والحاجة من العمود الفقري لعشر سنوات مع الدليل.")}</p>
    </div>
  );
}

export function PlaysView({ L, plays }: { L: Lang; plays: Play[] }) {
  const t = useTr(L);
  return <div className="grid gap-3 md:grid-cols-2">{plays.map((p, i) => <section key={p.vehicle + p.sector + i} className="rounded-[14px] border border-line bg-bg1 p-4"><div className="flex flex-wrap items-center gap-2"><span className="num text-[11px] text-t2">#{i + 1}</span><b className="text-[14px] text-t0">{p.vehicle}</b><Pill c={KIND[p.kind].c}>{bt(L, KIND[p.kind])}</Pill>{p.sector && <Pill c="var(--t2)">{p.sector}</Pill>}{p.window && <span className="ms-auto text-[11px] text-t2">{p.window}</span>}</div>
    <p className="mt-2 text-[12.5px] leading-snug text-t0">{p.why}</p>{p.firstStep && <p className="mt-1.5 text-[12px] leading-snug text-t1"><b className="text-ok">{t("First step:", "أول خطوة:")}</b> {p.firstStep}</p>}{p.risk && <p className="mt-1 text-[12px] leading-snug text-t1"><b className="text-warn">{t("Risk:", "الخطر:")}</b> {p.risk}</p>}</section>)}</div>;
}

/** The three plans side by side: what to do in the first 100 days, in the first year and over three years. */
export function PlanBoard({ L, plans }: { L: Lang; plans: AmbParsed["plans"] }) {
  const t = useTr(L); const cols: [string, string, string, Init[]][] = [["100 days", "مئة يوم", "var(--ok)", plans.d100], ["One year", "سنة", "var(--accent)", plans.y1], ["Three years", "ثلاث سنوات", "#7F77DD", plans.y3]];
  return <div className="grid gap-3 lg:grid-cols-3">{cols.map(([en, ar, c, xs]) => <section key={en} className="rounded-[14px] border border-line bg-bg1 p-3.5" style={{ borderTop: `3px solid ${c}` }}><h4 className="display text-[16px] font-semibold text-t0">{L === "ar" ? ar : en}</h4><span className="text-[11px] text-t2">{xs.length} {t("initiatives (proposals)", "مبادرات (مقترحات)")}</span>
    <ul className="mt-2 space-y-2">{xs.map((i) => <li key={i.id} className="rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug"><div className="flex items-start gap-1.5"><b className="num text-t1">{i.id}</b><span className="min-w-0 flex-1 font-semibold text-t0">{i.title}</span><i className="mt-1.5 size-2 shrink-0 rounded-sm" style={{ background: HAT_C[i.hat] ?? "var(--t2)" }} title={i.hat} /></div>
      {i.owner && <p className="mt-1 text-t1"><b className="text-t0">{t("Owner (proposed):", "المسؤول (مقترح):")}</b> {i.owner}</p>}{i.kpi && <p className="text-t1"><b className="text-t0">KPI:</b> {i.kpi}</p>}{i.risk && <p className="text-t1"><b className="text-warn">{t("Risk:", "الخطر:")}</b> {i.risk}</p>}{i.gate && <p className="text-t2">{t("Gate:", "البوابة:")} {i.gate}</p>}</li>)}{xs.length === 0 && <li className="text-[12px] text-t2">{t("None returned.", "لا شيء.")}</li>}</ul></section>)}</div>;
}

const GROUP: Record<Contact["group"], { en: string; ar: string; c: string }> = { government: { en: "Government", ar: "الحكومة", c: "#378ADD" }, private: { en: "Private sector", ar: "القطاع الخاص", c: "#BA7517" }, community: { en: "Community and civil society", ar: "المجتمع والمجتمع المدني", c: "#1D9E75" }, research: { en: "Research and universities", ar: "الأبحاث والجامعات", c: "#7F77DD" }, media: { en: "Media", ar: "الإعلام", c: "#C0568C" } };
/** Who to know, by group. Public roles and organisations only; engagement is open, official and reciprocal. */
export function InfluenceMap({ L, contacts, head }: { L: Lang; contacts: Contact[]; head: string[] }) {
  const t = useTr(L);
  return (
    <div className="space-y-4">
      {head.length > 0 && <p className="rounded-[10px] bg-bg2 p-3 text-[12.5px] leading-snug text-t0"><b>{t("On file (Wikidata):", "المسجّل (ويكي بيانات):")}</b> {head.join("; ")}</p>}
      {(Object.keys(GROUP) as Contact["group"][]).map((g) => { const xs = contacts.filter((c) => c.group === g); if (!xs.length) return null; return <section key={g}><h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-t0"><i className="size-2.5 rounded-sm" style={{ background: GROUP[g].c }} />{bt(L, GROUP[g])}<span className="num text-[11px] font-normal text-t2">{xs.length}</span></h4>
        <div className="grid gap-2.5 md:grid-cols-2">{xs.map((c) => <div key={c.who} className="rounded-[12px] border border-line bg-bg1 p-3 text-[12px] leading-snug" style={{ borderInlineStart: `3px solid ${GROUP[g].c}` }}><b className="text-[13px] text-t0">{c.who}</b>{c.why && <p className="mt-1 text-t1">{c.why}</p>}{c.approach && <p className="mt-1 text-t1"><b className="text-ok">{t("Engage:", "التواصل:")}</b> {c.approach}</p>}{c.caution && <p className="mt-0.5 text-t1"><b className="text-warn">{t("Caution:", "تحذير:")}</b> {c.caution}</p>}</div>)}</div></section>; })}
      <p className="text-[11px] leading-snug text-t2">{t("Public roles and organisations only, from documented public sources. Engagement is open, official and reciprocal; nothing here is a profile of a private individual.", "أدوار عامة وجهات فقط من مصادر عامة موثّقة. والتواصل علني ورسمي وتبادلي؛ ولا شيء هنا ملف عن فرد خاص.")}</p>
    </div>
  );
}

/** The country's neighbours: the held facts (UN voting agreement, shared blocs, the UAE's partnership with each) beside the adviser's reading of each relation. */
export function NeighbourBoard({ L, d, ai }: { L: Lang; d: CaseData; ai: Nb[] }) {
  const t = useTr(L); const rows = [...d.neighbours.ring1.map((n) => ({ n, k: t("border", "حدود") })), ...d.neighbours.ring2.map((n) => ({ n, k: t("strategic", "استراتيجي") }))];
  const find = (nm: string) => matchCountry(nm, ai, rows.map((r) => r.n.name));
  return (
    <div className="space-y-3">
      <div className="scroll-thin overflow-x-auto rounded-[14px] border border-line bg-bg1"><table className="w-full min-w-[720px] border-collapse text-[12px]"><thead><tr className="text-[10.5px] text-t2"><th className="px-3 py-2 text-start font-semibold">{t("Neighbour", "الجار")}</th><th className="px-2 text-start font-semibold">{t("UN voting agreement", "اتفاق التصويت")}</th><th className="px-2 text-start font-semibold">{t("Shared blocs", "تكتلات مشتركة")}</th><th className="px-2 text-start font-semibold">{t("UAE partnership", "الشراكة مع الإمارات")}</th><th className="px-2 text-start font-semibold">{t("Relation (adviser)", "العلاقة (المستشار)")}</th></tr></thead>
        <tbody>{rows.map(({ n, k }) => { const a = find(n.name); return <tr key={n.iso} className="border-t border-line align-top"><td className="px-3 py-2"><b className="text-t0">{L === "ar" && n.nameAr ? n.nameAr : n.name}</b><div className="text-[10.5px] text-t2">{k}</div></td>
          <td className="px-2 py-2"><div className="flex items-center gap-1.5"><span className="num w-9 text-end text-t0">{n.un == null ? "n/a" : n.un.toFixed(2)}</span><div className="w-16"><Meter v={n.un == null ? null : n.un * 100} c="var(--accent)" /></div></div></td>
          <td className="px-2 py-2"><div className="flex flex-wrap gap-1">{n.shared.length ? n.shared.map((s) => <span key={s.en} className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-t1">{bt(L, s)}</span>) : <span className="text-t2">—</span>}</div></td>
          <td className="num px-2 py-2 text-t1">{n.part ?? "n/a"}{n.rank ? <span className="text-[10.5px] text-t2"> #{n.rank}</span> : null}</td>
          <td className="px-2 py-2">{a ? <><Pill c={REL[a.relation].c}>{bt(L, REL[a.relation])}</Pill><p className="mt-1 max-w-[260px] text-[11px] leading-snug text-t1">{a.note}</p></> : <span className="text-t2">—</span>}</td></tr>; })}</tbody></table></div>
      <p className="text-[11px] leading-snug text-t2">{t("UN voting agreement is the share of General Assembly votes in agreement. Shared blocs exclude near-universal bodies. Treaties, disputes and trade between neighbours are not in the datasets: the adviser researches them and says what it could not find.", "اتفاق التصويت هو حصة أصوات الجمعية العامة المتفقة. والتكتلات المشتركة تستثني الهيئات شبه العالمية. والمعاهدات والنزاعات والتجارة بين الجيران ليست في مجموعات البيانات: يبحثها المستشار ويذكر ما لم يجده.")}</p>
    </div>
  );
}

export function ScenarioBoard({ L, scenarios }: { L: Lang; scenarios: AmbParsed["scenarios"] }) {
  const t = useTr(L);
  return <div className="grid gap-3 md:grid-cols-2">{scenarios.map((s) => <section key={s.name} className="rounded-[14px] border border-line bg-bg1 p-4"><h4 className="display text-[15px] font-semibold text-t0">{s.name}</h4>{s.trigger && <p className="mt-1 text-[11.5px] leading-snug text-t2"><b>{t("Trigger:", "المحفّز:")}</b> {s.trigger}</p>}
    <ul className="mt-2 space-y-1">{s.effects.map((e) => <li key={e.hat + e.text} className="flex items-start gap-2 text-[12px] leading-snug"><span className="mt-1.5 size-2 shrink-0 rounded-sm" style={{ background: HAT_C[e.hat.toLowerCase().split(/[ ,]/)[0]] ?? "var(--t2)" }} /><span className="text-t0"><b>{e.hat}:</b> {e.text}</span></li>)}</ul>{s.response && <p className="mt-2 rounded-[8px] bg-bg2 p-2 text-[12px] leading-snug text-t0"><b className="text-accent">{t("UAE response:", "استجابة الإمارات:")}</b> {s.response}</p>}</section>)}</div>;
}

