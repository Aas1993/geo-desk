"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { Card, EmptyState, Skeleton, StatTile } from "./ui";
import { safeHttp } from "@/lib/url";
import { SCORE_DIMS, SCORE_TIERS, rivalName, scorePartLabel, wgiLabel } from "@/lib/intel-labels";
import type { IntelPayload } from "@/lib/intel-data";
import type { Country } from "@/lib/types";

type M = IntelPayload["metrics"]; type Lang = "en" | "ar";
const T = {
  en: { since: "Since your last read", baseline: "First look: a baseline was saved in this browser. Changes will show here next time.", nothing: "Nothing has moved since", markRead: "Mark as read", saved: "Saved", triggers: "Triggers", trigHint: "Rules checked against the latest data every time you open this tab. Edit the thresholds; they are kept in this browser.", fired: "triggered", ok: "ok", noData: "no data",
    lev: "Leverage and exposure", levHint: "Where this partner sits among all partners: how much it leans on the UAE (y) and how much the UAE leans on it (x). Position, not power.", theirs: "They lean on the UAE", ours: "The UAE leans on them", q: { mutual: "Mutual interdependence", "uae-leverage": "The UAE has the leverage", "uae-exposed": "The UAE is the more exposed", light: "Light ties", partial: "Partial picture" },
    temp: "Bilateral temperature", tempHint: "Cooperation vs conflict in news events between the UAE and this country (GDELT, Goldstein scale −10 to +10), last", days: "days", coop: "cooperative", conf: "conflictual", worldAvg: "all countries", events: "events", cooling: "cooling", warming: "warming", flat: "steady",
    gov: "Governance and stability", govHint: "World Bank governance scores, 0–100 (higher is better). The tick marks the UAE.", rank: "rank", of: "of",
    lead: "Leadership clock", inOffice: "in office", years: "yrs", age: "age", elections: "Coming elections", noElect: "No national election found in the calendars used (the list is incomplete).", head: { state: "Head of state", gov: "Head of government" },
    inv: "UAE investment and deals", stock: "UAE investment stock", ofGdp: "of their GDP", ofUae: "of UAE investment abroad", inward: "Their investment in the UAE", deals: "deals in WAM headlines", last90: "last 90 days", last12: "last 12 months", noStock: "The IMF investment-position data has no record for this country: the deals below are announcements only.", dealsHint: "Announcements by UAE funds and companies, read from WAM headlines. Not verified transactions; values are not extracted.", noDeals: "No UAE company or fund deal found in WAM headlines for this country in the last two years.",
    aid: "UAE humanitarian funding", aidHint: "Reported to the UN OCHA Financial Tracking Service. Not all UAE aid: development finance, loans and unreported bilateral aid are not included.", aidNone: "No UAE humanitarian funding to this country is recorded in FTS.", partial: "partial year", ofTotal: "of UAE funding reported that year", recipients: "recipients",
    src: "Source", loadFail: "The indicators could not be loaded.", retry: "Retry" },
  ar: { since: "منذ آخر قراءة لك", baseline: "أول اطلاع: حُفظت نقطة مرجعية في هذا المتصفح، وستظهر التغيّرات هنا في المرة القادمة.", nothing: "لم يتغيّر شيء منذ", markRead: "تعليم كمقروء", saved: "تم الحفظ", triggers: "المحفّزات", trigHint: "قواعد تُفحص على أحدث البيانات كلما فتحت هذا التبويب. عدّل العتبات؛ تُحفظ في هذا المتصفح.", fired: "فُعّل", ok: "سليم", noData: "لا بيانات",
    lev: "النفوذ والانكشاف", levHint: "موقع هذا الشريك بين الشركاء: مقدار اعتماده على الإمارات (المحور الرأسي) واعتماد الإمارات عليه (الأفقي). موقع لا قوة.", theirs: "يعتمدون على الإمارات", ours: "تعتمد الإمارات عليهم", q: { mutual: "اعتماد متبادل", "uae-leverage": "للإمارات اليد العليا", "uae-exposed": "الإمارات أكثر انكشافًا", light: "روابط خفيفة", partial: "صورة جزئية" },
    temp: "الحرارة الثنائية", tempHint: "التعاون مقابل الصراع في الأحداث الإخبارية بين الإمارات وهذه الدولة (GDELT، مقياس غولدشتاين من −10 إلى +10)، آخر", days: "يومًا", coop: "تعاونية", conf: "صراعية", worldAvg: "كل الدول", events: "حدثًا", cooling: "تبريد", warming: "تدفئة", flat: "مستقرة",
    gov: "الحوكمة والاستقرار", govHint: "درجات الحوكمة للبنك الدولي من 0 إلى 100 (الأعلى أفضل). العلامة تشير إلى الإمارات.", rank: "المرتبة", of: "من",
    lead: "ساعة القيادة", inOffice: "في المنصب", years: "سنة", age: "العمر", elections: "الانتخابات القادمة", noElect: "لا توجد انتخابات وطنية في التقاويم المستخدمة (والقائمة غير مكتملة).", head: { state: "رئيس الدولة", gov: "رئيس الحكومة" },
    inv: "الاستثمار الإماراتي والصفقات", stock: "رصيد الاستثمار الإماراتي", ofGdp: "من ناتجهم المحلي", ofUae: "من الاستثمار الإماراتي بالخارج", inward: "استثمارهم في الإمارات", deals: "صفقات في عناوين وام", last90: "آخر 90 يومًا", last12: "آخر 12 شهرًا", noStock: "لا تتضمن بيانات صندوق النقد لمراكز الاستثمار سجلًا لهذه الدولة: الصفقات أدناه إعلانات فقط.", dealsHint: "إعلانات لصناديق وشركات إماراتية من عناوين وام. ليست معاملات مؤكدة ولا تُستخرج القيم.", noDeals: "لا توجد صفقة لشركة أو صندوق إماراتي في عناوين وام لهذه الدولة خلال العامين الأخيرين.",
    aid: "التمويل الإنساني الإماراتي", aidHint: "كما أُبلغ لخدمة التتبع المالي في الأمم المتحدة (أوتشا). ليس كل المساعدات الإماراتية: التمويل التنموي والقروض والمساعدات الثنائية غير المبلَّغ عنها غير مشمولة.", aidNone: "لا يوجد تمويل إنساني إماراتي لهذه الدولة مسجّل في الخدمة.", partial: "سنة جزئية", ofTotal: "من التمويل الإماراتي المبلَّغ عنه في تلك السنة", recipients: "جهات مستفيدة",
    src: "المصدر", loadFail: "تعذّر تحميل المؤشرات.", retry: "إعادة المحاولة" },
} as const;

// ---- triggers: each is a rule on one metric, with an editable threshold ----
type Trig = { id: string; en: string; ar: string; metric: keyof M; op: "<" | ">" | "drop" | "rise"; def: number; unit: string };
const TRIGS: Trig[] = [
  { id: "temp", en: "Bilateral temperature falls below", ar: "الحرارة الثنائية تنخفض عن", metric: "temperature", op: "<", def: 0.5, unit: "" },
  { id: "cool", en: "Temperature trend cools by more than", ar: "اتجاه الحرارة يبرد بأكثر من", metric: "temperatureTrend", op: "<", def: -1, unit: "" },
  { id: "tone", en: "Media tone toward the UAE falls below", ar: "نبرة الإعلام تجاه الإمارات تنخفض عن", metric: "mediaTone", op: "<", def: -3, unit: "" },
  { id: "gap", en: "Days since a senior engagement exceed", ar: "الأيام منذ آخر لقاء رفيع تتجاوز", metric: "daysSinceSenior", op: ">", def: 180, unit: "d" },
  { id: "score", en: "Partnership Index drops by at least", ar: "مؤشر الشراكة ينخفض بمقدار", metric: "partnershipScore", op: "drop", def: 3, unit: "pts" },
  { id: "ofac", en: "New sanctions entries since last read, at least", ar: "إدراجات عقوبات جديدة منذ آخر قراءة، على الأقل", metric: "ofac", op: "rise", def: 1, unit: "" },
  { id: "stab", en: "Political stability score falls below", ar: "درجة الاستقرار السياسي تنخفض عن", metric: "politicalStability", op: "<", def: 30, unit: "" },
  { id: "ransom", en: "Ransomware postings (30 days) exceed", ar: "منشورات برامج الفدية (30 يومًا) تتجاوز", metric: "ransomware30", op: ">", def: 10, unit: "" },
  { id: "elect", en: "A national election is within", ar: "انتخابات وطنية خلال", metric: "daysToElection", op: "<", def: 120, unit: "d" },
];
const ls = { get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }, set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } } };
type Snap = { at: string; metrics: M; visits: string[]; deals: string[] };
type TCfg = { on: Record<string, boolean>; val: Record<string, number> };
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (v: number | null | undefined, d = 1) => (v == null ? "—" : v.toLocaleString("en", { maximumFractionDigits: d, minimumFractionDigits: 0 }));
const usd = (v: number | null | undefined) => (v == null ? "—" : Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}bn` : Math.abs(v) >= 1e6 ? `$${Math.round(v / 1e6).toLocaleString("en")}m` : `$${Math.round(v / 1e3).toLocaleString("en")}k`);
const sgn = (v: number, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;
const day = (iso: string) => iso.replace(/-00$/, "");

function Quadrant({ theirs, ours, th, u }: { theirs: number | null; ours: number | null; th: number; u: (typeof T)["en"] }) {
  const S = 200, P = 24; const x = (v: number) => P + (v / 100) * (S - P * 1.4); const y = (v: number) => S - P - (v / 100) * (S - P * 1.4);
  const lab = (t: string, px: number, py: number, anchor: "start" | "end" = "start") => <text x={px} y={py} fontSize="8.5" fill="currentColor" opacity=".55" textAnchor={anchor}>{t}</text>;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[240px]" role="img" aria-label={u.lev}>
      <rect x={P} y={P * 0.4} width={S - P * 1.4} height={S - P * 1.4} rx="6" fill="var(--bg-2)" stroke="var(--line)" />
      <line x1={x(th)} y1={P * 0.4} x2={x(th)} y2={S - P} stroke="var(--line-2)" strokeDasharray="3 3" /><line x1={P} y1={y(th)} x2={S - P * 0.4} y2={y(th)} stroke="var(--line-2)" strokeDasharray="3 3" />
      {lab("UAE leverage", P + 5, P * 0.4 + 12)}{lab("Mutual", S - P * 0.4 - 5, P * 0.4 + 12, "end")}{lab("Light", P + 5, S - P - 6)}{lab("UAE exposed", S - P * 0.4 - 5, S - P - 6, "end")}
      {theirs != null && ours != null && <circle cx={x(ours)} cy={y(theirs)} r="7" fill="var(--accent)" stroke="var(--bg-1)" strokeWidth="2" />}
      {theirs != null && ours == null && <line x1={P} y1={y(theirs)} x2={S - P * 0.4} y2={y(theirs)} stroke="var(--accent)" strokeWidth="3" />}
      {ours != null && theirs == null && <line x1={x(ours)} y1={P * 0.4} x2={x(ours)} y2={S - P} stroke="var(--accent)" strokeWidth="3" />}
      <text x={S / 2} y={S - 4} fontSize="9" fill="currentColor" opacity=".7" textAnchor="middle">{u.ours} →</text><text x={8} y={S / 2} fontSize="9" fill="currentColor" opacity=".7" textAnchor="middle" transform={`rotate(-90 8 ${S / 2})`}>{u.theirs} →</text>
    </svg>
  );
}
function Spark({ weeks }: { weeks: { w: string; g: number }[] }) {
  if (weeks.length < 2) return null; const W = 220, H = 56, P = 4; const lo = Math.min(-1, ...weeks.map((x) => x.g)), hi = Math.max(1, ...weeks.map((x) => x.g)); const px = (i: number) => P + (i / (weeks.length - 1)) * (W - 2 * P); const py = (v: number) => P + ((hi - v) / (hi - lo)) * (H - 2 * P);
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="weekly temperature"><line x1="0" x2={W} y1={py(0)} y2={py(0)} stroke="var(--line-2)" strokeDasharray="3 3" /><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={weeks.map((x, i) => `${px(i)},${py(x.g)}`).join(" ")} />{weeks.map((x, i) => <circle key={x.w} cx={px(i)} cy={py(x.g)} r="2.5" fill="var(--accent)"><title>{x.w}: {x.g}</title></circle>)}</svg>;
}


const SC = { en: { title: "Country scorecard", rank: "rank", of: "of", cov: "data coverage", parts: "parts", pct: "percentile among countries", hint: "Seven aspects, each the average of its parts. Every part is a 0–100 percentile among countries that have data (higher is better for the UAE), so nothing is judged against an invented standard. Weights: friendliness 25, political 15, economic 15, leverage 15, financial 10, social 10, security 10. An analytical aid, not an official assessment; the social aspect covers connectivity and openness only (UAE nationals and diaspora are not in the data).", partial: "Partial picture: some aspects have no data for this country.", none: "No scorecard for this country." },
  ar: { title: "بطاقة أداء الدولة", rank: "المرتبة", of: "من", cov: "تغطية البيانات", parts: "مؤشرات", pct: "المئين بين الدول", hint: "سبعة جوانب، كل منها متوسط مؤشراته. كل مؤشر هو مئين من 0 إلى 100 بين الدول التي لديها بيانات (الأعلى أفضل للإمارات)، فلا يُقاس شيء بمعيار مفترض. الأوزان: الود 25، السياسي 15، الاقتصادي 15، النفوذ 15، المالي 10، الاجتماعي 10، الأمن 10. أداة تحليلية وليست تقييمًا رسميًا؛ الجانب الاجتماعي يغطي الربط والانفتاح فقط (المواطنون الإماراتيون والجاليات غير موجودين في البيانات).", partial: "صورة جزئية: بعض الجوانب بلا بيانات لهذه الدولة.", none: "لا توجد بطاقة أداء لهذه الدولة." } } as const;
const scoreTone = (v: number) => (v >= 70 ? "bg-ok" : v >= 45 ? "bg-warn" : "bg-risk");
function ScoreCard({ d, L }: { d: IntelPayload; L: Lang }) {
  const u = SC[L]; const s = d.scorecard; const w = s?.weights ?? {};
  return (
    <Card title={u.title} icon="🧭">
      {!s ? <p className="text-[12.5px] text-t1">{u.none}</p> : (<>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-center"><div className="num display text-[40px] font-semibold leading-none text-t0">{s.overall}</div><div className="num text-[11px] text-t2">/100</div></div>
          <div className="min-w-[160px] flex-1 text-[12.5px]"><div className="display text-[15px] font-semibold text-t0">{SCORE_TIERS[s.tier][L]}</div><div className="num text-t1">{u.rank} {s.rank} {u.of} {s.of} · {u.cov} {s.coverage}%</div>{s.coverage < 100 && <div className="text-[11.5px] text-t2">{u.partial}</div>}</div>
        </div>
        <ul className="mt-3 space-y-2">{SCORE_DIMS.map((x) => { const dm = s.dims[x.key]; return (
          <li key={x.key}><details className="group"><summary className="cursor-pointer list-none">
            <div className="flex items-baseline justify-between text-[12.5px]"><span className="text-t0">{x[L]} <span className="num text-[10.5px] text-t2">· {w[x.key]}%</span></span><span className="num text-t1">{dm?.score == null ? "—" : dm.score}</span></div>
            <div className="mt-1 h-2 rounded-full bg-bg3"><div className={`h-2 rounded-full ${dm?.score == null ? "" : scoreTone(dm.score)}`} style={{ width: `${Math.max(2, dm?.score ?? 0)}%` }} /></div></summary>
            <div className="mt-1.5 rounded-md bg-bg2 p-2 text-[11.5px] text-t1"><div className="mb-1 text-t2">{x.hint}</div>
              {dm?.parts.length ? <ul className="num space-y-0.5">{dm.parts.map((p) => <li key={p.k} className="flex justify-between gap-2"><span>{scorePartLabel(p.k)}</span><span className="text-t0">{p.s} <span className="text-t2">{u.pct}</span></span></li>)}</ul> : <span className="text-t2">—</span>}</div>
          </details></li>); })}</ul>
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.hint}</p></>)}
    </Card>
  );
}

const RV = { en: { title: "Who else is here", rank: "UAE ranks", of: "of", hint: "Share of this country's merchandise trade by power, from each power's own customs data (IMF) against the country's World Bank totals. Mirror data, approximate: it shows trade weight only, not investment, lending, ports, security or political influence. UAE figures include re-exports.", none: "No comparison available for this country." },
  ar: { title: "من الحاضر أيضًا", rank: "ترتيب الإمارات", of: "من", hint: "حصة كل قوة من تجارة السلع لهذه الدولة، من بيانات الجمارك لكل قوة (صندوق النقد) مقابل إجماليات البنك الدولي للدولة. بيانات مرآة تقريبية: تُظهر الوزن التجاري فقط، وليس الاستثمار أو الإقراض أو الموانئ أو الأمن أو النفوذ السياسي. أرقام الإمارات تشمل إعادة التصدير.", none: "لا توجد مقارنة متاحة لهذه الدولة." } } as const;
function RivalsCard({ d, L }: { d: IntelPayload; L: Lang }) {
  const u = RV[L]; const r = d.rivals; const top = r ? Math.max(...r.list.map((x) => x.share), 1) : 1;
  return (
    <Card title={u.title} icon="🏁">
      {!r ? <p className="text-[12.5px] text-t1">{u.none}</p> : (<>
        <ul className="space-y-1.5">{r.list.slice(0, 8).map((x) => <li key={x.c} className="text-[12.5px]"><div className="flex items-baseline justify-between"><span className={x.c === "ARE" ? "font-semibold text-accent" : "text-t0"}>{rivalName(x.c, L)}{x.y ? <span className="text-[10.5px] text-t2"> · {x.y}</span> : null}</span><span className="num text-t1">{x.share}%</span></div>
          <div className="mt-0.5 h-1.5 rounded-full bg-bg3"><div className={`h-1.5 rounded-full ${x.c === "ARE" ? "bg-accent" : "bg-t2"}`} style={{ width: `${Math.max(2, (x.share / top) * 100)}%` }} /></div></li>)}</ul>
        {!r.list.slice(0, 8).some((x) => x.c === "ARE") && <p className="num mt-1.5 text-[12px] text-accent">{rivalName("ARE", L)} {r.uae.share}%</p>}
        <p className="num mt-1.5 text-[11.5px] text-t1">{u.rank} {r.uae.rank} {u.of} {r.of} · {r.year}</p></>)}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.hint}</p>
    </Card>
  );
}
export function IntelTab({ c }: { c: Country }) {
  const { lang } = useT(); const L = lang as Lang; const u = T[L]; const [d, setD] = useState<IntelPayload | null | "err">(null); const [n, setN] = useState(0);
  useEffect(() => { let dead = false; fetch(`/api/intel/${c.iso3}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j: IntelPayload) => { if (!dead) setD(j); }).catch(() => { if (!dead) setD("err"); }); return () => { dead = true; }; }, [c.iso3, n]);
  const snapKey = `gd-intel-read:${c.iso3}`; const cfgKey = `gd-intel-triggers:${c.iso3}`;
  const [snap, setSnap] = useState<Snap | null | undefined>(undefined); const [cfg, setCfg] = useState<TCfg>({ on: {}, val: {} }); const [saved, setSaved] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setSnap(ls.get<Snap | null>(snapKey, null)); setCfg(ls.get<TCfg>(cfgKey, { on: {}, val: {} })); setSaved(false); }, 0); return () => clearTimeout(t); }, [snapKey, cfgKey]);
  useEffect(() => { if (d && d !== "err" && snap === null) { const s: Snap = { at: new Date().toISOString(), metrics: d.metrics, visits: d.ids.visits, deals: d.ids.deals }; ls.set(snapKey, s); } }, [d, snap, snapKey]); // first look: store a baseline
  const diff = useMemo(() => {
    if (!d || d === "err" || !snap) return [] as string[]; const out: string[] = []; const P = snap.metrics; const M0 = d.metrics;
    const nv = d.recentVisits.filter((v) => !snap.visits.includes(v.u)); for (const v of nv.slice(0, 5)) out.push(`+ ${v.d} · ${v.t}`); if (nv.length > 5) out.push(`+ ${nv.length - 5} more engagements`);
    const nd = d.deals.items.filter((x) => !snap.deals.includes(x.u)); for (const x of nd.slice(0, 4)) out.push(`+ deal ${x.d} · ${x.t}`); if (nd.length > 4) out.push(`+ ${nd.length - 4} more deals`);
    const chg = (k: keyof M, label: string, min: number, dp = 1) => { const a = num(P[k]), b = num(M0[k]); if (a != null && b != null && Math.abs(b - a) >= min) out.push(`${label}: ${fmt(a, dp)} → ${fmt(b, dp)} (${sgn(b - a, dp)})`); };
    chg("partnershipScore", "Partnership Index", 1, 0); chg("temperature", "Bilateral temperature", 0.3, 2); chg("mediaTone", "Media tone", 0.3, 2); chg("politicalStability", "Political stability", 1, 1); chg("agreements", "Agreements on record", 1, 0); chg("ofac", "OFAC sanctions entries", 1, 0); chg("un", "UN sanctions entries", 1, 0); chg("ransomware30", "Ransomware postings (30d)", 3, 0); chg("growth", "IMF growth forecast", 0.3, 1); chg("debt", "Government debt % GDP", 1, 1);
    if (P.cepa !== M0.cepa && (P.cepa || M0.cepa)) out.push(`CEPA: ${P.cepa ?? "none"} → ${M0.cepa ?? "none"}`);
    return out;
  }, [d, snap]);
  const markRead = () => { if (!d || d === "err") return; const s: Snap = { at: new Date().toISOString(), metrics: d.metrics, visits: d.ids.visits, deals: d.ids.deals }; ls.set(snapKey, s); setSnap(s); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const evalTrig = (t: Trig): { fired: boolean; value: number | null } => {
    if (!d || d === "err") return { fired: false, value: null }; const thr = cfg.val[t.id] ?? t.def; const v = num(d.metrics[t.metric]); if (v == null) return { fired: false, value: null }; const p = num(snap?.metrics[t.metric]);
    if (t.op === "<") return { fired: v < thr, value: v }; if (t.op === ">") return { fired: v > thr, value: v }; if (p == null) return { fired: false, value: null }; if (t.op === "drop") return { fired: p - v >= thr, value: v - p }; return { fired: v - p >= thr, value: v - p };
  };
  const setCfgSave = (nx: TCfg) => { setCfg(nx); ls.set(cfgKey, nx); };

  if (d === "err") return <EmptyState title={u.loadFail} why="" onRetry={() => { setD(null); setN((x) => x + 1); }} />;
  if (!d) return <div className="space-y-3"><Skeleton h={120} /><Skeleton h={180} /><Skeleton h={160} /></div>;
  const lv = d.leverage; const tp = d.temperature; const firedCount = TRIGS.filter((t) => (cfg.on[t.id] ?? true) && evalTrig(t).fired).length;
  const trendWord = tp?.trend == null ? null : tp.trend <= -0.4 ? u.cooling : tp.trend >= 0.4 ? u.warming : u.flat;
  return (
    <div className="space-y-3">
      <ScoreCard d={d} L={L} />
      <Card title={`${u.since}${snap ? ` · ${snap.at.slice(0, 10)}` : ""}`} icon="🔔">
        {snap === undefined ? <Skeleton h={40} /> : snap === null ? <p className="text-[12.5px] text-t1">{u.baseline}</p> : diff.length === 0 ? <p className="text-[12.5px] text-t1">{u.nothing} {snap.at.slice(0, 10)}.</p> : <ul className="space-y-1.5 text-[12.5px] leading-snug text-t0">{diff.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul>}
        {snap && <button onClick={markRead} className="mt-3 h-8 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1 hover:text-t0">{saved ? u.saved : u.markRead}</button>}
      </Card>
      <Card title={`${u.triggers}${firedCount ? ` · ${firedCount} ${u.fired}` : ""}`} icon="🎯">
        <p className="mb-2 text-[12px] text-t2">{u.trigHint}</p>
        <ul className="space-y-1.5">{TRIGS.map((t) => { const on = cfg.on[t.id] ?? true; const r = on ? evalTrig(t) : { fired: false, value: null }; const thr = cfg.val[t.id] ?? t.def; return (
          <li key={t.id} className={`flex flex-wrap items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-[12.5px] ${r.fired ? "border-warn/60 bg-warn/10" : "border-line bg-bg2/50"}`}>
            <input type="checkbox" checked={on} aria-label={L === "ar" ? t.ar : t.en} onChange={(e) => setCfgSave({ ...cfg, on: { ...cfg.on, [t.id]: e.target.checked } })} className="size-4 accent-[var(--accent)]" />
            <span className="min-w-0 flex-1" dir="auto">{L === "ar" ? t.ar : t.en}</span>
            <input type="number" step="any" value={thr} aria-label="threshold" onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setCfgSave({ ...cfg, val: { ...cfg.val, [t.id]: v } }); }} className="num h-7 w-16 rounded-[6px] border border-line bg-bg1 px-1.5 text-end text-[12px] text-t0" /><span className="num w-6 text-[11px] text-t2">{t.unit}</span>
            <span className={`num w-28 text-end text-[11.5px] ${r.fired ? "font-semibold text-warn" : "text-t2"}`}>{!on ? "" : r.value == null ? u.noData : r.fired ? `${u.fired}: ${t.op === "drop" || t.op === "rise" ? sgn(r.value, 1) : fmt(r.value, 2)}` : `${u.ok}: ${t.op === "drop" || t.op === "rise" ? sgn(r.value, 1) : fmt(r.value, 2)}`}</span>
          </li>); })}</ul>
      </Card>
      <Card title={u.lev} icon="⚖️">
        {!lv ? <p className="text-[12.5px] text-t1">{u.noData}</p> : <div className="flex flex-wrap items-center gap-4"><Quadrant theirs={lv.theirs} ours={lv.ours} th={lv.threshold} u={u as never} />
          <div className="min-w-[180px] flex-1 space-y-1.5 text-[12.5px]"><div className="display text-[15px] font-semibold text-t0">{(u.q as Record<string, string>)[lv.quadrant]}</div>
            <div className="num text-t1">{u.theirs}: <b className="text-t0">{lv.theirs ?? "—"}</b>/100 · {u.ours}: <b className="text-t0">{lv.ours ?? "—"}</b>/100</div>
            <ul className="num space-y-0.5 text-[11.5px] text-t2"><li>UAE share of their trade: {fmt(lv.raw.uaeSharePartnerTrade)}%</li><li>UAE investment, % of their GDP: {fmt(lv.raw.uaeInvPctGdp, 2)}%</li><li>Their share of UAE trade: {fmt(lv.raw.shareUaeTrade, 2)}%</li><li>Their share of UAE investment abroad: {fmt(lv.raw.shareUaeInvAbroad, 2)}%</li><li>Their investment in the UAE, % of UAE GDP: {fmt(lv.raw.theirInvPctUaeGdp, 2)}%</li></ul></div></div>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.levHint}</p>
      </Card>
      <RivalsCard d={d} L={L} />
      <Card title={u.temp} icon="🌡️">
        {!tp ? <p className="text-[12.5px] text-t1">{u.noData}</p> : (<>
          <div className="grid grid-cols-3 gap-2"><StatTile label="Goldstein" value={sgn(tp.g, 2)} sub={tp.worldG != null ? `${u.worldAvg} ${sgn(tp.worldG, 2)}` : undefined} /><StatTile label={u.coop} value={`${Math.round(tp.coop * 100)}%`} sub={`${u.conf} ${Math.round(tp.conflict * 100)}%`} /><StatTile label={u.events} value={tp.n.toLocaleString("en")} sub={trendWord ? `${trendWord} (${sgn(tp.trend!, 1)})` : undefined} /></div>
          <div className="mt-2"><Spark weeks={tp.weeks} /></div></>)}
        <p className="mt-1 text-[11px] leading-snug text-t2">{u.tempHint} {tp?.days ?? 45} {u.days}.</p>
      </Card>
      <Card title={u.gov} icon="🏛">
        {!d.governance ? <p className="text-[12.5px] text-t1">{u.noData}</p> : <ul className="space-y-2">{d.governance.dims.map((x) => <li key={x.key}><div className="flex items-baseline justify-between text-[12.5px]"><span className="text-t0">{wgiLabel(x.key)}</span><span className="num text-t1">{x.score == null ? "—" : fmt(x.score)}{x.rank ? <span className="text-t2"> · {u.rank} {x.rank} {u.of} {x.of}</span> : null}</span></div>
          <div className="relative mt-1 h-2 rounded-full bg-bg3"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(2, x.score ?? 0)}%` }} />{x.uae != null && <i className="absolute -top-1 h-4 w-0.5 bg-t0" style={{ left: `${x.uae}%` }} title={`UAE ${x.uae}`} />}</div></li>)}</ul>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.govHint} {d.governance ? `(${d.governance.year})` : ""}</p>
      </Card>
      <Card title={u.lead} icon="🕰">
        {!d.leaders ? <p className="text-[12.5px] text-t1">{u.noData}</p> : (<>
          <ul className="space-y-1.5">{d.leaders.people.map((p) => <li key={p.role} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px]"><span><span className="text-t2">{u.head[p.role]}: </span><b className="text-t0">{p.name}</b></span><span className="num text-t1">{p.start ? `${u.inOffice} ${p.start.slice(0, 4)}${p.tenureYears != null ? ` (${fmt(p.tenureYears)} ${u.years})` : ""}` : ""}{p.age != null ? ` · ${u.age} ${p.age}` : ""}</span></li>)}</ul>
          <h4 className="label mb-1 mt-3">{u.elections}</h4>{d.leaders.elections.length ? <ul className="space-y-1 text-[12.5px]">{d.leaders.elections.map((e) => <li key={e.label + e.date} className="flex justify-between gap-3"><span className="text-t0" dir="auto">{e.label}</span><span className="num text-t1">{day(e.date)} · {e.approx ? "~" : ""}{e.daysAway} {u.days}</span></li>)}</ul> : <p className="text-[12px] text-t2">{u.noElect}</p>}</>)}
      </Card>
      <Card title={u.inv} icon="💼">
        <div className="grid grid-cols-3 gap-2"><StatTile label={u.stock} value={usd(d.invest?.outwardUsd)} sub={d.invest?.outwardYear ? `${d.invest.outwardYear}${d.invest.outwardRank ? ` · #${d.invest.outwardRank}` : ""}` : undefined} /><StatTile label={u.ofGdp} value={d.invest?.pctOfTheirGdp != null ? `${fmt(d.invest.pctOfTheirGdp, 2)}%` : "—"} sub={d.invest?.shareOfUaeAbroad != null ? `${fmt(d.invest.shareOfUaeAbroad, 1)}% ${u.ofUae}` : undefined} /><StatTile label={u.inward} value={usd(d.invest?.inwardUsd)} /></div>
        {!d.invest?.outwardUsd && <p className="mt-2 text-[12px] text-t2">{u.noStock}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]"><b className="num text-t0">{d.deals.total}</b><span className="text-t1">{u.deals}</span><span className="num text-t2">· {d.deals.last90} {u.last90} · {d.deals.last365} {u.last12}</span></div>
        {d.deals.byInvestor.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{d.deals.byInvestor.map(([k, v]) => <span key={k} className="rounded-full border border-line bg-bg2 px-2 py-0.5 text-[11px] text-t1">{k} <b className="num text-t0">{v}</b></span>)}{d.deals.bySector.filter(([k]) => k !== "other").slice(0, 3).map(([k, v]) => <span key={k} className="rounded-full border border-line2 px-2 py-0.5 text-[11px] text-t2">{k} {v}</span>)}</div>}
        {d.deals.items.length === 0 ? <p className="mt-2 text-[12px] text-t2">{u.noDeals}</p> : <ul className="mt-2 space-y-2">{d.deals.items.map((x) => <li key={x.u} className="text-[12.5px] leading-snug"><a href={safeHttp(`https://www.wam.ae/en/article/${x.u}`)} target="_blank" rel="noreferrer noopener" className="text-t0 hover:text-accent" dir="auto">{x.t}</a><div className="num text-[11px] text-t2">{x.d} · {x.by.join(", ")}{x.sector ? ` · ${x.sector}` : ""}</div></li>)}</ul>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.dealsHint}</p>
      </Card>
      <Card title={u.aid} icon="🤝">
        {!d.aid ? <p className="text-[12.5px] text-t1">{u.aidNone}</p> : (<>
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>{d.aid.years.map((y) => { const v = d.aid!.byYear[String(y)] ?? 0; const mx = Math.max(1, ...d.aid!.years.map((k) => d.aid!.byYear[String(k)] ?? 0)); const partial = y === d.aid!.years[d.aid!.years.length - 1]; return <div key={y} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${y}: ${usd(v)}${partial ? ` (${u.partial})` : ""}`}><div className={`w-full rounded-t ${partial ? "bg-accent/40" : "bg-accent"}`} style={{ height: `${Math.max(2, (v / mx) * 70)}px` }} /><span className="num text-[10px] text-t2">{String(y).slice(2)}</span></div>; })}</div>
          <p className="mt-2 text-[12.5px] text-t0">{d.aid.latestFull != null ? <><b className="num">{usd(d.aid.latestFull)}</b> in {d.aid.latestFullYear}{d.aid.rankLatestFull ? ` · #${d.aid.rankLatestFull} ${u.of} ${d.aid.of} ${u.recipients}` : ""}{d.aid.shareOfUaeTotal != null ? ` · ${fmt(d.aid.shareOfUaeTotal, 1)}% ${u.ofTotal}` : ""}</> : null} <span className="num text-t2">· {usd(d.aid.cumulative)} since 2019</span></p></>)}
        <p className="mt-1 text-[11px] leading-snug text-t2">{u.aidHint}</p>
      </Card>
    </div>
  );
}
