"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { SCORE_DIMS, SCORE_GROUPS, SCORE_TIERS } from "@/lib/intel-labels";
import { instrumentLabel } from "@/lib/statecraft";
import { parseBrief, type Judgment, type Move, type Parsed } from "@/lib/visual";
import type { IntelPayload } from "@/lib/intel-data";
import { Quadrant, RivalsCard, Spark } from "./IntelTab";
import { Skeleton } from "./ui";

type Lang = "en" | "ar";
const V = {
  en: { title: "Illustrated view", sub: "The same briefing as pictures: scores, the balance of influence, the main judgments, the play and the warning signs. Built from the data and the text; it costs nothing extra.", score: "Overall score", rank: "rank", of: "of", cov: "data coverage", tiles: { index: "Partnership Index", deals: "UAE deals, 24 months", gap: "Days since a senior contact", cepa: "CEPA", tone: "Bilateral tone", share: "UAE share of their trade" }, none: "none", tone: "Bilateral tone, weekly", lev: "Balance of leverage", theirs: "They lean on the UAE", ours: "The UAE leans on them", bluf: "Bottom line", judgments: "Key judgments", likelihood: "Likelihood", conf: { high: "High confidence", moderate: "Moderate confidence", low: "Low confidence" }, play: "The play", signals: "Warning signs", decide: "Decisions", trades: "Gives and asks", give: "Give", get: "Get", loadFail: "The data panel could not be loaded; the picture below is built from the text only.", noText: "Generate or open a brief to see its judgments, play and warning signs here." },
  ar: { title: "العرض المصوّر", sub: "الموجز نفسه بالصور: الدرجات وميزان النفوذ وأهم التقديرات والخطة وعلامات الإنذار. مبني على البيانات والنص ولا يكلّف شيئًا إضافيًا.", score: "الدرجة الإجمالية", rank: "المرتبة", of: "من", cov: "تغطية البيانات", tiles: { index: "مؤشر الشراكة", deals: "صفقات الإمارات خلال 24 شهرًا", gap: "الأيام منذ آخر لقاء رفيع", cepa: "الشراكة الشاملة", tone: "النبرة الثنائية", share: "حصة الإمارات من تجارتهم" }, none: "لا يوجد", tone: "النبرة الثنائية أسبوعيًا", lev: "ميزان النفوذ", theirs: "يعتمدون على الإمارات", ours: "تعتمد الإمارات عليهم", bluf: "الخلاصة", judgments: "أهم التقديرات", likelihood: "الاحتمال", conf: { high: "ثقة عالية", moderate: "ثقة متوسطة", low: "ثقة منخفضة" }, play: "الخطة", signals: "علامات الإنذار", decide: "القرارات", trades: "ما نقدّمه وما نطلبه", give: "نقدّم", get: "نطلب", loadFail: "تعذّر تحميل لوحة البيانات؛ الصورة أدناه مبنية على النص فقط.", noText: "أنشئ موجزًا أو افتح موجزًا لتظهر هنا تقديراته وخطته وعلامات الإنذار." },
} as const;

/** One colour per instrument, from the app's own tokens, so tags read the same everywhere. */
const CHIP: Record<string, string> = { hard: "bg-risk/15 text-risk", economic: "bg-accent/15 text-accent", financial: "bg-c2/15 text-c2", logistic: "bg-warn/15 text-warn", soft: "bg-ok/15 text-ok", humanitarian: "bg-ok/15 text-ok", diplomatic: "bg-accent/15 text-accent" };
export const Chip = ({ k, lang }: { k: string; lang: Lang }) => <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${CHIP[k] ?? "bg-bg3 text-t1"}`}>{instrumentLabel(k, lang)}</span>;
const tone = (v: number) => (v >= 70 ? "var(--ok)" : v >= 45 ? "var(--warn)" : "var(--risk)");

function Ring({ value, size = 128 }: { value: number; size?: number }) {
  const r = size / 2 - 10; const c = 2 * Math.PI * r; const col = tone(value);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${value}/100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" textAnchor="middle" fontSize="34" fontWeight="700" fill="currentColor" className="num">{value}</text>
      <text x="50%" y="68%" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".55">/100</text>
    </svg>
  );
}

function Radar({ dims, lang }: { dims: { label: string; v: number | null }[]; lang: Lang }) {
  const S = 340, C = S / 2, R = 96, n = dims.length; const ang = (i: number) => -Math.PI / 2 + (i / n) * 2 * Math.PI; const pt = (i: number, v: number) => [C + Math.cos(ang(i)) * R * (v / 100), C + Math.sin(ang(i)) * R * (v / 100)] as const;
  const poly = dims.map((d, i) => pt(i, d.v ?? 0).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[340px]" role="img" aria-label={dims.map((d) => `${d.label} ${d.v ?? "n/a"}`).join(", ")}>
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={dims.map((_, i) => pt(i, g).join(",")).join(" ")} fill={g === 100 ? "var(--bg-2)" : "none"} stroke="var(--line)" strokeWidth="1" />)}
      {dims.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, 100)[0]} y2={pt(i, 100)[1]} stroke="var(--line)" />)}
      <polygon points={poly} fill="var(--accent)" fillOpacity=".22" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {dims.map((d, i) => { if (d.v == null) return null; const [x, y] = pt(i, d.v); return <circle key={i} cx={x} cy={y} r="3.5" fill={tone(d.v)} stroke="var(--bg-1)" strokeWidth="1.5" />; })}
      {dims.map((d, i) => { const a = ang(i); const lx = C + Math.cos(a) * (R + 16), ly = C + Math.sin(a) * (R + 16); const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"; return <text key={i} x={lx} y={ly + 3} textAnchor={anchor} fontSize="10.5" fill="currentColor" opacity=".8">{d.label}{d.v != null ? ` ${d.v}` : ""}</text>; })}
      <title>{lang === "ar" ? "مخطط الجوانب" : "Aspect radar"}</title>
    </svg>
  );
}

const Panel = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => <section className={`rounded-[14px] border border-line bg-bg1 p-4 ${className}`}>{title && <h4 className="label mb-3">{title}</h4>}{children}</section>;
const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => <div className="rounded-[12px] bg-bg2 p-3"><div className="num display text-[22px] font-semibold leading-tight text-t0">{value}</div><div className="mt-0.5 text-[11.5px] leading-snug text-t1">{label}</div>{sub && <div className="num mt-0.5 text-[10.5px] text-t2">{sub}</div>}</div>;

function Meter({ j, lang }: { j: Judgment; lang: Lang }) {
  const u = V[lang]; const b = j.band; const dots = j.confidence === "high" ? 3 : j.confidence === "moderate" ? 2 : j.confidence === "low" ? 1 : 0;
  return (
    <li className="rounded-[12px] bg-bg2 p-3">
      <p className="text-[13px] leading-snug text-t0">{j.text}</p>
      {b && <div className="mt-2.5" dir="ltr"><div className="relative h-3.5"><div className="absolute inset-x-0 top-[3px] h-2 rounded-full" style={{ background: "linear-gradient(90deg,var(--risk) 0%,var(--warn) 45%,var(--ok) 100%)", opacity: 0.4 }} /><i className="absolute top-0 size-3.5 -translate-x-1/2 rounded-full border-2 border-bg1" style={{ left: `${b.pct}%`, background: tone(b.pct) }} /></div>
        <div className="mt-1 flex items-center justify-between text-[10.5px] text-t2"><span>{u.likelihood}: <b className="text-t1">{b.label}</b></span>{dots > 0 && <span title={u.conf[j.confidence!]} className="num">{"●".repeat(dots)}<span className="opacity-30">{"●".repeat(3 - dots)}</span> <span className="ms-1">{u.conf[j.confidence!]}</span></span>}</div></div>}
      {j.so && <p className="mt-2 text-[11.5px] leading-snug text-t1">→ {j.so}</p>}
    </li>
  );
}

export type VisualInput = { markdown?: string; parsed?: Partial<Parsed>; trades?: { text: string; tags?: string[] }[] };
export function VisualBrief({ iso3, name, markdown, parsed, trades }: { iso3: string; name: string } & VisualInput) {
  const { lang } = useT(); const L = lang as Lang; const u = V[L]; const [d, setD] = useState<IntelPayload | null | "err">(null);
  useEffect(() => { let dead = false; fetch(`/api/intel/${iso3}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j: IntelPayload) => { if (!dead) setD(j); }).catch(() => { if (!dead) setD("err"); }); return () => { dead = true; }; }, [iso3]);
  const p = useMemo<Parsed>(() => { const base = markdown ? parseBrief(markdown) : { bluf: "", judgments: [], moves: [], signals: [], decisions: [] }; return { ...base, ...Object.fromEntries(Object.entries(parsed ?? {}).filter(([, v]) => (Array.isArray(v) ? v.length : !!v))) } as Parsed; }, [markdown, parsed]);
  const sc = d && d !== "err" ? d.scorecard : null; const m = d && d !== "err" ? d.metrics : null; const tp = d && d !== "err" ? d.temperature : null; const lv = d && d !== "err" ? d.leverage : null;
  const groupMean = (g: string) => { if (!sc) return null; const xs = SCORE_DIMS.filter((x) => x.group === g).map((x) => sc.dims[x.key]?.score).filter((v): v is number => v != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
  const dash = (v: number | string | null | undefined) => (v == null ? "—" : String(v)); const sgn = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
  const nothing = !p.bluf && !p.judgments.length && !p.moves.length && !p.signals.length;
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      <div><h3 className="display text-[17px] font-semibold text-t0">{u.title} · {name}</h3><p className="mt-0.5 text-[12px] leading-snug text-t2">{u.sub}</p></div>
      {d === null && <div className="space-y-3"><Skeleton h={190} /><Skeleton h={80} /></div>}
      {d === "err" && <p role="status" className="rounded-[8px] border border-warn/40 bg-warn/10 p-2 text-[12px] text-t0">{u.loadFail}</p>}
      {sc && (<>
        <Panel>
          <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-1.5 text-center"><Ring value={sc.overall} /><div className="display text-[15px] font-semibold text-t0">{SCORE_TIERS[sc.tier][L]}</div><div className="num text-[11px] text-t2">{u.rank} {sc.rank} {u.of} {sc.of} · {u.cov} {sc.coverage}%</div></div>
            <Radar lang={L} dims={SCORE_DIMS.map((x) => ({ label: x.short[L], v: sc.dims[x.key]?.score ?? null }))} />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">{(["relationship", "country", "world"] as const).map((g) => { const v = groupMean(g); return (
            <div key={g}><div className="mb-1 flex items-baseline justify-between text-[12px]"><span className="text-t1">{SCORE_GROUPS[g][L]}</span><span className="num text-t0">{dash(v)}</span></div><div className="h-2 rounded-full bg-bg3"><div className="h-2 rounded-full" style={{ width: `${Math.max(3, v ?? 0)}%`, background: v == null ? "transparent" : tone(v) }} /></div></div>); })}</div>
        </Panel>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Tile label={u.tiles.index} value={m?.partnershipScore != null ? `${m.partnershipScore}/100` : "—"} sub={m?.partnershipRank != null ? `${u.rank} ${m.partnershipRank}` : undefined} />
          <Tile label={u.tiles.deals} value={dash(d !== "err" && d ? d.deals.total : null)} sub={d && d !== "err" ? `${d.deals.last90} / 90d` : undefined} />
          <Tile label={u.tiles.gap} value={dash(m?.daysSinceSenior as number | null)} sub={(m?.lastSenior as string) ?? undefined} />
          <Tile label={u.tiles.cepa} value={m?.cepa ? String(m.cepa) : u.none} />
          <Tile label={u.tiles.tone} value={tp ? sgn(tp.g) : "—"} sub={tp?.worldG != null ? `${sgn(tp.worldG)} ${L === "ar" ? "للجميع" : "all"}` : undefined} />
          <Tile label={u.tiles.share} value={lv?.raw.uaeSharePartnerTrade != null ? `${lv.raw.uaeSharePartnerTrade.toFixed(1)}%` : "—"} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={u.lev}><div className="flex justify-center">{lv ? <Quadrant theirs={lv.theirs} ours={lv.ours} th={lv.threshold} u={{ lev: u.lev, ours: u.ours, theirs: u.theirs } as never} /> : <p className="text-[12px] text-t2">—</p>}</div></Panel>
          <RivalsCard d={d as IntelPayload} L={L} />
        </div>
        {tp && tp.weeks.length > 1 && <Panel title={u.tone}><Spark weeks={tp.weeks} /></Panel>}
      </>)}
      {p.bluf && <section className="rounded-[14px] border border-accent/40 bg-accent/5 p-4"><h4 className="label mb-1.5 text-accent">{u.bluf}</h4><p className="text-[14px] leading-relaxed text-t0">{p.bluf}</p></section>}
      {p.judgments.length > 0 && <Panel title={u.judgments}><ul className="space-y-2.5">{p.judgments.map((j, i) => <Meter key={i} j={j} lang={L} />)}</ul></Panel>}
      {p.moves.length > 0 && <Panel title={u.play}><ol className="space-y-2.5">{p.moves.map((x: Move, i) => (
        <li key={i} className="flex gap-3"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-[var(--accent-ink)]">{i + 1}</span>
          <div className="min-w-0 flex-1"><p className="text-[13px] leading-snug text-t0">{x.text}</p><div className="mt-1 flex flex-wrap items-center gap-1.5">{x.tags.map((t) => <Chip key={t} k={t} lang={L} />)}{x.when && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">⏱ {x.when}</span>}</div></div></li>))}</ol></Panel>}
      {!!trades?.length && <Panel title={u.trades}><ul className="space-y-2.5">{trades.map((t, i) => { const [g, ...r] = t.text.split(/\bget:\s*/i); const give = g.replace(/^\s*give:\s*/i, "").replace(/[;,.\s]+$/, ""); const get = r.join(" ").replace(/\.$/, ""); return (
        <li key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug"><b className="label me-1.5 text-ok">{u.give}</b>{give}</div><span className="hidden text-t2 sm:block" aria-hidden>⇄</span><div className="rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug"><b className="label me-1.5 text-accent">{u.get}</b>{get || "—"}</div></li>); })}</ul></Panel>}
      {p.signals.length > 0 && <Panel title={u.signals}><ul className="space-y-2">{p.signals.map((s, i) => <li key={i} className="flex gap-2.5 rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug text-t0"><span aria-hidden className="mt-0.5 text-warn">▲</span><span>{s}</span></li>)}</ul></Panel>}
      {p.decisions.length > 0 && <Panel title={u.decide}><ul className="space-y-2">{p.decisions.map((s, i) => <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-t0"><span aria-hidden className="mt-0.5 text-accent">☐</span><span>{s}</span></li>)}</ul></Panel>}
      {nothing && d !== null && <p className="text-[12px] text-t2">{u.noText}</p>}
    </div>
  );
}
