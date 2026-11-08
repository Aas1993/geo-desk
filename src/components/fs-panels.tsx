"use client";
import { Plus } from "lucide-react";
import { type Band, type FsCell, type FsDir, type FsEffect, type FsParsed, type Level } from "@/lib/visual";
import type { Exposure } from "@/lib/foresight-data";
import { Chip, Panel } from "./VisualBrief";

export type Lang = "en" | "ar";
/** Labels shared by the report's illustrated view and the ministerial brief's pages. */
export const PV = {
  en: { dir: { improving: "Improving", stable: "Stable", worsening: "Worsening", volatile: "Volatile" }, eff: { opportunity: "Opportunity", exposure: "Exposure", mixed: "Mixed", urgent: "Urgent" }, lvl: { high: "High", medium: "Medium", low: "Low" }, conf: { high: "High", moderate: "Moderate", low: "Low" },
    grid: "Outlook by front and horizon", gridHint: "Colour is the direction; the label is how likely the expectation is, or Range where only a range is defensible. Confidence falls with distance.", range: "Range", front: "Front", balance: "How the fronts lean",
    scen: "Scenarios to 2035", weights: "Rough weights, not predictions", wild: "Wildcard", drivers: "Drivers", signp: "Signposts", uaeEff: "UAE effect",
    impact: "UAE impact matrix", impactHint: "Which national interests the development touches, and how.", size: "Size", none: "Not materially affected", opp: "UAE opportunity map", survives: "Works in", step: "First step", benefit: "Benefit", feas: "Feasibility", partners: "Partners", constraint: "Constraint",
    radar: "Opportunity radar", radarHint: "Higher is more beneficial, further right is more feasible. Both are analyst judgments.", sim: "Test the scenario weights", simHint: "Move the weights and see which opportunities hold up. The share is the scenario weight in which the opportunity still works: it is not a probability of success.", reset: "Reset", survival: "Holds in", of: "of the weight",
    risk: "Risk heat map", riskHint: "Likelihood across, impact down. Numbers match the register.", lik: ["Very unlikely", "Unlikely", "Even", "Likely", "Very likely"], imp: ["High", "Medium", "Low"], velocity: "Velocity", fast: "Fast", slow: "Slow", trigger: "Trigger",
    sign: "Signposts and warning thresholds", toward: "points toward", resp: "UAE response", opts: "Options for consideration", w: { immediate: "Immediate · 0 to 12 months", medium: "Medium term · 1 to 5 years", long: "Long term · 5 to 20 years" }, track: "Track", tracked: "Tracked", decision: "Decision", tradeoff: "Trade-off", owner: "Owner",
    exp: "UAE strategic impact graph", expHint: "How strongly this country touches each UAE interest, as a percentile among all countries with data. Dashed spokes have no dataset: the foresight report covers them from sources.", tie: "tie", safety: "safety", nodata: "no data",
    changes: "Changes since the previous report", noChange: "No material change in front directions, scenario weights or opportunities.", since: "Previous report", dirChange: "Direction changed", wChange: "Scenario weight", added: "New", removed: "Dropped",
    scores: "Comparative scores", scoresHint: "Dataset percentiles or analyst judgments, each with its basis: not objective measurements.", weak: "Weak signals and trends", ranges: "Forecast ranges", ind: "Indicator", latest: "Latest", y3: "3 years", y5: "5 years", y10: "10 years" },
  ar: { dir: { improving: "تحسّن", stable: "استقرار", worsening: "تدهور", volatile: "تقلّب" }, eff: { opportunity: "فرصة", exposure: "انكشاف", mixed: "مختلط", urgent: "عاجل" }, lvl: { high: "مرتفع", medium: "متوسط", low: "منخفض" }, conf: { high: "عالية", moderate: "متوسطة", low: "منخفضة" },
    grid: "التوقعات حسب الجبهة والأفق", gridHint: "اللون هو الاتجاه، والوسم هو احتمال التوقع، أو «نطاق» حين لا يصمد إلا نطاق. وتقل الثقة بازدياد البعد.", range: "نطاق", front: "الجبهة", balance: "ميل الجبهات",
    scen: "السيناريوهات حتى 2035", weights: "أوزان تقريبية لا تنبؤات", wild: "حدث مفاجئ", drivers: "المحركات", signp: "المؤشرات", uaeEff: "أثر على الإمارات",
    impact: "مصفوفة الأثر على الإمارات", impactHint: "أي المصالح الوطنية يمسّها التطور وكيف.", size: "الحجم", none: "غير متأثرة بشكل جوهري", opp: "خريطة فرص الإمارات", survives: "تصمد في", step: "الخطوة الأولى", benefit: "الفائدة", feas: "الجدوى", partners: "الشركاء", constraint: "القيد",
    radar: "رادار الفرص", radarHint: "الأعلى أنفع والأبعد يمينًا أجدى. وكلاهما تقدير المحلل.", sim: "اختبر أوزان السيناريوهات", simHint: "حرّك الأوزان وانظر أي الفرص تصمد. النسبة هي وزن السيناريوهات التي تصمد فيها الفرصة، وليست احتمال النجاح.", reset: "إعادة", survival: "تصمد في", of: "من الوزن",
    risk: "خريطة المخاطر", riskHint: "الاحتمال أفقيًا والأثر رأسيًا. الأرقام تطابق السجل.", lik: ["مستبعد جدًا", "غير مرجح", "متكافئ", "مرجح", "مرجح جدًا"], imp: ["مرتفع", "متوسط", "منخفض"], velocity: "السرعة", fast: "سريع", slow: "بطيء", trigger: "المحفز",
    sign: "المؤشرات وعتبات الإنذار", toward: "يشير إلى", resp: "استجابة الإمارات", opts: "خيارات للنظر", w: { immediate: "فوري · 0 إلى 12 شهرًا", medium: "متوسط الأجل · 1 إلى 5 سنوات", long: "بعيد الأجل · 5 إلى 20 سنة" }, track: "تتبّع", tracked: "قيد التتبع", decision: "القرار", tradeoff: "المفاضلة", owner: "الجهة",
    exp: "رسم أثر الدولة على الإمارات", expHint: "مدى مساس هذه الدولة بكل مصلحة إماراتية، كنسبة مئوية بين جميع الدول ذات البيانات. الخطوط المتقطعة بلا بيانات: ويغطيها تقرير الاستشراف من المصادر.", tie: "صلة", safety: "أمان", nodata: "لا بيانات",
    changes: "التغيرات منذ التقرير السابق", noChange: "لا تغير جوهري في اتجاهات الجبهات أو أوزان السيناريوهات أو الفرص.", since: "التقرير السابق", dirChange: "تغير الاتجاه", wChange: "وزن السيناريو", added: "جديد", removed: "أُسقط",
    scores: "مقارنات الدرجات", scoresHint: "نسب مئوية من البيانات أو تقديرات المحلل، لكلٍّ أساسها: وليست قياسات موضوعية.", weak: "الإشارات الضعيفة والاتجاهات", ranges: "نطاقات التوقع", ind: "المؤشر", latest: "الأحدث", y3: "3 سنوات", y5: "5 سنوات", y10: "10 سنوات" },
} as const;
export const IMPACT_AR: Record<string, string> = { trade: "التجارة", investment: "الاستثمار", logistics: "اللوجستيات", finance: "المالية", diplomacy: "الدبلوماسية", security: "الأمن", people: "الشعوب", energy: "الطاقة", technology: "التقنية", foodwater: "الغذاء والمياه" };
export const IMPACT_EN: Record<string, string> = { trade: "Trade", investment: "Investment", logistics: "Logistics", finance: "Finance", diplomacy: "Diplomacy", security: "Security", people: "People", energy: "Energy", technology: "Technology", foodwater: "Food and water" };
export const DIRC: Record<FsDir, string> = { improving: "var(--ok)", stable: "var(--c2)", worsening: "var(--risk)", volatile: "var(--warn)" };
export const GLYPH: Record<FsDir, string> = { improving: "▲", stable: "▬", worsening: "▼", volatile: "◆" };
export const EFFC: Record<FsEffect, string> = { opportunity: "var(--ok)", exposure: "var(--risk)", mixed: "var(--warn)", urgent: "var(--accent)" };
export const SCOL = ["var(--accent)", "var(--c2)", "var(--warn)"];
const tone = (v: number) => (v >= 70 ? "var(--ok)" : v >= 45 ? "var(--warn)" : "var(--risk)");
const lv = (l: Level) => (l === "high" ? 3 : l === "medium" ? 2 : l === "low" ? 1 : 0);
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, var(--bg-2))`;
const dots = (n: number, of = 3) => <span className="num">{"●".repeat(n)}<span className="opacity-30">{"●".repeat(of - n)}</span></span>;

export const DirChip = ({ d, L }: { d: FsDir | null; L: Lang }) => (d ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: mix(DIRC[d], 20), color: DIRC[d] }}>{GLYPH[d]} {PV[L].dir[d]}</span> : null);
export const BandChip = ({ b }: { b: Band | null; L?: Lang }) => (b ? <span className="num rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1" dir="ltr">{b.label}</span> : null);

/** Bars for one yearly series; the years the IMF estimates or projects are drawn lighter. */
export function Bars({ s, first, unit, label }: { s: [number, number][]; first: number; unit: string; label: string }) {
  if (s.length < 3) return null; const W = 300, H = 120, P = 8; const vs = s.map((x) => x[1]); const hi = Math.max(...vs, 0.001), lo = Math.min(...vs, 0); const span = hi - lo || 1; const bw = (W - 2 * P) / s.length; const y = (v: number) => P + ((hi - v) / span) * (H - 2 * P - 12);
  return (
    <div dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--line-2)" strokeDasharray="3 3" />
      {s.map(([yr, v], i) => { const est = yr >= first; const x = P + i * bw; const y0 = y(0), y1 = y(v); return <g key={yr}><rect x={x + 1.5} y={Math.min(y0, y1)} width={bw - 3} height={Math.max(1, Math.abs(y0 - y1))} rx="2" fill="var(--accent)" opacity={est ? 0.45 : 0.95}><title>{yr}{est ? "E" : ""}: {v.toFixed(1)}{unit}</title></rect>{(i % 2 === 0 || i === s.length - 1) && <text x={x + bw / 2} y={H - 1} fontSize="8.5" textAnchor="middle" fill="currentColor" opacity=".55">{String(yr).slice(2)}</text>}</g>; })}
      <text x={W - P} y={10} fontSize="10" textAnchor="end" fill="currentColor" opacity=".7" className="num">{s[s.length - 1][1].toFixed(1)}{unit} ({s[s.length - 1][0]})</text>
    </svg></div>
  );
}

function Cell({ c, L }: { c: FsCell; L: Lang }) {
  if (!c.dir) return <div className="rounded-[8px] bg-bg2 p-2 text-[10.5px] text-t2">—</div>;
  return (
    <div className="rounded-[8px] p-1.5" style={{ background: mix(DIRC[c.dir], 16), borderInlineStart: `3px solid ${DIRC[c.dir]}` }} title={c.text}>
      <div className="text-[10.5px] font-semibold" style={{ color: DIRC[c.dir] }}>{GLYPH[c.dir]} {PV[L].dir[c.dir]}</div>
      {(c.band || c.range) && <div className="text-[9.5px] text-t1">{c.band ? c.band.label : PV[L].range}</div>}
    </div>
  );
}
/** The outlook matrix as a heat grid: one row per front, one column per horizon, with how the fronts lean at the top. */
export function HeatGrid({ p, L }: { p: FsParsed; L: Lang }) {
  const u = PV[L]; const n = Math.max(1, p.matrix[0]?.h.length ?? 3); const cols = `minmax(96px,1fr) repeat(${n},minmax(0,1.5fr)) 52px`; const hs = p.horizons.length ? p.horizons : ["H1", "H2", "H3"].slice(0, n);
  const bal = Array.from({ length: n }, (_, h) => { const c = { improving: 0, stable: 0, worsening: 0, volatile: 0 }; for (const r of p.matrix) { const d = r.h[h]?.dir; if (d) c[d]++; } return c; });
  return (
    <Panel title={u.grid}>
      <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }} dir="ltr">{bal.map((c, i) => { const t = c.improving + c.stable + c.worsening + c.volatile || 1; return (
        <div key={i}><div className="mb-1 truncate text-[10.5px] text-t1">{hs[i]}</div><div className="flex h-2.5 overflow-hidden rounded-full bg-bg3" title={`${c.improving} / ${c.stable} / ${c.worsening} / ${c.volatile}`}>{(["improving", "stable", "worsening", "volatile"] as const).map((k) => c[k] > 0 && <i key={k} style={{ width: `${(c[k] / t) * 100}%`, background: DIRC[k] }} />)}</div>
          <div className="num mt-0.5 text-[9.5px] text-t2"><span style={{ color: DIRC.improving }}>{c.improving}▲</span> <span style={{ color: DIRC.worsening }}>{c.worsening}▼</span> <span style={{ color: DIRC.volatile }}>{c.volatile}◆</span></div></div>); })}</div>
      <div className="overflow-x-auto"><div className="min-w-[540px] space-y-1.5">
        <div className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-t2" style={{ gridTemplateColumns: cols }}><span>{u.front}</span>{hs.map((h, i) => <span key={i}>{h}</span>)}<span className="text-center">●</span></div>
        {p.matrix.map((r, i) => <div key={i} className="grid items-stretch gap-1.5" style={{ gridTemplateColumns: cols }}><div className="flex items-center text-[12px] font-medium leading-tight text-t0">{r.front}</div>{r.h.map((c, j) => <Cell key={j} c={c} L={L} />)}<div className="flex items-center justify-center text-[10px] text-t1" title={r.confidence ? u.conf[r.confidence] : ""}>{r.confidence ? dots(r.confidence === "high" ? 3 : r.confidence === "moderate" ? 2 : 1) : ""}</div></div>)}
      </div></div>
      <p className="mt-2 text-[11px] text-t2">{u.gridHint}</p>
    </Panel>
  );
}

/** Scenario weights as one bar and one card each; a wildcard sits apart because it is outside the sum. */
export function ScenarioPanel({ p, L, weights }: { p: FsParsed; L: Lang; weights?: Record<string, number> }) {
  const u = PV[L]; const main = p.scenarios.filter((s) => !s.wildcard); const w = (s: { code: string; weight: number | null }) => weights?.[s.code] ?? s.weight ?? 0; const total = main.reduce((a, s) => a + w(s), 0) || 1; const wild = p.scenarios.find((s) => s.wildcard);
  if (!main.length) return null;
  return (
    <Panel title={u.scen}>
      <div dir="ltr"><div className="flex h-5 overflow-hidden rounded-full bg-bg3">{main.map((s, i) => <i key={s.code + i} title={`${s.code} ${s.name}: ${Math.round((w(s) / total) * 100)}%`} className="flex items-center justify-center text-[10px] font-bold text-[var(--accent-ink)]" style={{ width: `${(w(s) / total) * 100}%`, background: SCOL[i % 3] }}>{w(s) >= 6 ? `${Math.round((w(s) / total) * 100)}%` : ""}</i>)}</div><p className="mt-1 text-[10.5px] text-t2">{u.weights}{p.axes ? ` · ${p.axes}` : ""}</p></div>
      <div className="mt-3 grid gap-2.5 md:grid-cols-3">{main.map((s, i) => (
        <div key={s.code + i} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${SCOL[i % 3]}` }}>
          <div className="flex items-baseline justify-between gap-2"><h5 className="text-[13px] font-semibold text-t0"><span className="num me-1.5 text-[11px]" style={{ color: SCOL[i % 3] }}>{s.code}</span>{s.name}</h5><span className="num text-[15px] font-bold text-t0">{Math.round((w(s) / total) * 100)}%</span></div>
          {s.drivers && <p className="mt-1 text-[10.5px] leading-snug text-t2"><b className="text-t1">{u.drivers}: </b>{s.drivers}</p>}
          <p className="mt-1.5 text-[12px] leading-snug text-t1">{s.looks}</p>
          {s.signposts && <p className="mt-2 text-[11px] leading-snug text-t2"><b className="text-t1">▸ </b>{s.signposts}</p>}
          {s.uae && <p className="mt-2 rounded-[8px] bg-bg1 p-2 text-[11.5px] leading-snug text-t0">🇦🇪 {s.uae}</p>}
        </div>))}</div>
      {wild && <div className="mt-2.5 rounded-[12px] border border-dashed border-warn/60 p-3"><h5 className="text-[12.5px] font-semibold text-warn">◆ {u.wild}: {wild.name}</h5><p className="mt-1 text-[12px] leading-snug text-t1">{wild.looks}</p>{wild.uae && <p className="mt-1.5 text-[11.5px] leading-snug text-t0">🇦🇪 {wild.uae}</p>}</div>}
    </Panel>
  );
}

const EFF_ORDER: FsEffect[] = ["urgent", "exposure", "mixed", "opportunity"];
/** The UAE impact matrix: one row per national interest, effect as a coloured chip, size as dots. */
export function ImpactMatrix({ p, L }: { p: FsParsed; L: Lang }) {
  const u = PV[L]; if (!p.impact.length) return null; const count = (e: FsEffect) => p.impact.filter((x) => x.effect === e).length;
  const rows = [...p.impact].sort((a, b) => EFF_ORDER.indexOf(a.effect ?? "mixed") - EFF_ORDER.indexOf(b.effect ?? "mixed") || lv(b.size) - lv(a.size));
  return (
    <Panel title={u.impact}>
      <div className="mb-3 grid grid-cols-4 gap-2">{EFF_ORDER.map((e) => <div key={e} className="rounded-[10px] p-2.5 text-center" style={{ background: mix(EFFC[e], 14) }}><div className="num display text-[22px] font-semibold" style={{ color: EFFC[e] }}>{count(e)}</div><div className="text-[10.5px] text-t1">{u.eff[e]}</div></div>)}</div>
      <ul className="space-y-1.5">{rows.map((r, i) => (
        <li key={i} className="grid items-center gap-2 rounded-[10px] bg-bg2 p-2 sm:grid-cols-[minmax(120px,1fr)_96px_52px_72px_2fr]">
          <span className="text-[12.5px] font-medium text-t0">{r.area}</span>
          <span>{r.effect ? <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: mix(EFFC[r.effect], 22), color: EFFC[r.effect] }}>{u.eff[r.effect]}</span> : "—"}</span>
          <span className="text-[10px] text-t1" title={`${u.size}: ${r.size ?? ""}`}>{dots(lv(r.size))}</span><span className="num text-[10.5px] text-t2">{r.horizon}</span><span className="text-[11.5px] leading-snug text-t1">{r.why}</span>
        </li>))}</ul>
      <p className="mt-2 text-[10.5px] text-t2">{u.impactHint} {u.size}: ●●● {u.lvl.high} · ●●○ {u.lvl.medium} · ●○○ {u.lvl.low}.</p>
    </Panel>
  );
}

/** Opportunity radar with a scenario-weight simulator: benefit against feasibility, plus a ranked list by the share of scenario weight in which each opportunity still works. */
export function OppRadar({ p, L, weights, setWeights, onTrack, tracked }: { p: FsParsed; L: Lang; weights: Record<string, number>; setWeights: (w: Record<string, number>) => void; onTrack?: (text: string, from: string) => void; tracked?: (text: string) => boolean }) {
  const u = PV[L]; const main = p.scenarios.filter((s) => !s.wildcard); const total = main.reduce((a, s) => a + (weights[s.code] ?? 0), 0) || 1;
  const rows = p.opportunities.map((o, i) => { const surv = o.works.length ? o.works.reduce((a, c) => a + (weights[c] ?? 0), 0) / total : null; return { o, i, surv }; });
  const ranked = [...rows].sort((a, b) => (b.surv ?? -1) - (a.surv ?? -1) || lv(b.o.benefit) - lv(a.o.benefit));
  if (!rows.length) return null; const W = 280, H = 210, P = 26; const px = (l: Level) => P + ((lv(l) || 2) - 1) / 2 * (W - 2 * P); const py = (l: Level) => H - P - ((lv(l) || 2) - 1) / 2 * (H - 2 * P);
  const base = Object.fromEntries(main.map((s) => [s.code, s.weight ?? 0]));
  return (
    <Panel title={u.opp}>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div dir="ltr"><h5 className="label mb-1">{u.radar}</h5>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={u.radar}>
            <rect x={P} y={P - 8} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2 + 8} fill="var(--bg-3)" opacity=".5" /><rect x={P + (W - 2 * P) / 2} y={P - 8} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2 + 8} fill="var(--ok)" opacity=".1" />
            <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--line-2)" /><line x1={P} x2={P} y1={P - 8} y2={H - P} stroke="var(--line-2)" />
            <text x={W / 2} y={H - 5} textAnchor="middle" fontSize="9" fill="currentColor" opacity=".6">{u.feas} →</text><text x={8} y={H / 2} fontSize="9" fill="currentColor" opacity=".6" transform={`rotate(-90 8 ${H / 2})`} textAnchor="middle">{u.benefit} →</text>
            {rows.map(({ o, i, surv }) => { const jx = ((i * 7) % 5 - 2) * 8, jy = ((i * 11) % 5 - 2) * 8; return <g key={i}><circle cx={px(o.feasibility) + jx} cy={py(o.benefit) + jy} r="9" fill="var(--accent)" opacity={surv == null ? 0.5 : 0.35 + 0.6 * surv} stroke="var(--bg-1)" strokeWidth="1.5"><title>{o.text}</title></circle><text x={px(o.feasibility) + jx} y={py(o.benefit) + jy + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent-ink)">{i + 1}</text></g>; })}
          </svg><p className="mt-1 text-[10px] text-t2">{u.radarHint}</p></div>
        <div>
          {main.length > 0 && <details className="mb-3 rounded-[10px] border border-line bg-bg2/60 p-2.5"><summary className="cursor-pointer text-[12px] font-semibold text-t0">{u.sim}</summary>
            <p className="mt-1 text-[11px] leading-snug text-t2">{u.simHint}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">{main.map((s, i) => <label key={s.code} className="text-[11px] text-t1"><span className="flex justify-between"><span><b style={{ color: SCOL[i % 3] }}>{s.code}</b> {s.name.slice(0, 22)}</span><span className="num text-t0">{Math.round(((weights[s.code] ?? 0) / total) * 100)}%</span></span><input type="range" min={0} max={100} value={weights[s.code] ?? 0} onChange={(e) => setWeights({ ...weights, [s.code]: +e.target.value })} className="w-full accent-[var(--accent)]" /></label>)}</div>
            <button type="button" onClick={() => setWeights(base)} className="mt-1.5 text-[11px] text-accent hover:underline">{u.reset}</button></details>}
          <ol className="space-y-2">{ranked.map(({ o, i, surv }) => (
            <li key={i} className="flex gap-3"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-[var(--accent-ink)]">{i + 1}</span>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-medium leading-snug text-t0">{o.text}</p>
                {o.why && <p className="mt-0.5 text-[11.5px] leading-snug text-t1">{o.why}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">{o.tags.map((t) => <Chip key={t} k={t} lang={L} />)}{o.window && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">⏱ {o.window}</span>}
                  {o.benefit && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">{u.benefit} {u.lvl[o.benefit]}</span>}{o.feasibility && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">{u.feas} {u.lvl[o.feasibility]}</span>}
                  {main.map((s, k) => <span key={s.code} title={`${u.survives} ${s.code}`} className="num rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={o.works.includes(s.code) ? { background: mix(SCOL[k % 3], 25), color: SCOL[k % 3] } : { background: "var(--bg-3)", color: "var(--t2)", opacity: 0.55, textDecoration: "line-through" }}>{s.code}</span>)}</div>
                {surv != null && <div className="mt-1.5 flex items-center gap-2" dir="ltr"><div className="h-1.5 flex-1 rounded-full bg-bg3"><div className="h-1.5 rounded-full" style={{ width: `${Math.round(surv * 100)}%`, background: tone(surv * 100) }} /></div><span className="num w-24 text-end text-[10.5px] text-t2">{u.survival} {Math.round(surv * 100)}%</span></div>}
                {(o.partners || o.constraint) && <p className="mt-1 text-[11px] leading-snug text-t2">{o.partners && <><b className="text-t1">{u.partners}: </b>{o.partners}. </>}{o.constraint && <><b className="text-t1">{u.constraint}: </b>{o.constraint}</>}</p>}
                {o.step && <p className="mt-1 text-[11.5px] leading-snug text-t1">{u.step}: {o.step}</p>}
                {onTrack && <button type="button" onClick={() => onTrack(`${o.text}${o.step ? `: ${o.step}` : ""}`, "opportunity")} disabled={!!tracked?.(`${o.text}${o.step ? `: ${o.step}` : ""}`)} className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline disabled:text-t2"><Plus size={11} />{tracked?.(`${o.text}${o.step ? `: ${o.step}` : ""}`) ? u.tracked : u.track}</button>}
              </div></li>))}</ol>
        </div>
      </div>
    </Panel>
  );
}

const likCol = (pct: number) => (pct <= 15 ? 0 : pct <= 40 ? 1 : pct <= 58 ? 2 : pct <= 80 ? 3 : 4);
/** Risk heat map: likelihood across, impact down; each risk is a numbered dot and the register follows. */
export function RiskHeat({ p, L }: { p: FsParsed; L: Lang }) {
  const u = PV[L]; if (!p.risks.length) return null; const rowOf = (l: Level) => (l === "high" ? 0 : l === "low" ? 2 : 1);
  const at = (c: number, r: number) => p.risks.map((x, i) => ({ x, i })).filter(({ x }) => (x.band ? likCol(x.band.pct) : 2) === c && rowOf(x.impactLevel) === r);
  return (
    <Panel title={u.risk}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,330px)_1fr]">
        <div dir="ltr"><div className="grid gap-1" style={{ gridTemplateColumns: "44px repeat(5,1fr)" }}>
          {[0, 1, 2].map((r) => <div key={r} className="contents"><span className="flex items-center text-[9.5px] text-t2">{u.imp[r]}</span>{[0, 1, 2, 3, 4].map((c) => { const sev = (c + 1) * (3 - r); const col = sev >= 10 ? "var(--risk)" : sev >= 5 ? "var(--warn)" : "var(--ok)"; return <div key={c} className="flex min-h-[44px] flex-wrap content-center items-center justify-center gap-1 rounded-[6px] p-1" style={{ background: mix(col, 22) }}>{at(c, r).map(({ i }) => <span key={i} className="num flex size-5 items-center justify-center rounded-full bg-bg1 text-[10px] font-bold text-t0 ring-1 ring-line">{i + 1}</span>)}</div>; })}</div>)}
          <span />{u.lik.map((t, c) => <span key={c} className="text-center text-[8.5px] leading-tight text-t2">{t}</span>)}</div><p className="mt-1.5 text-[10px] text-t2">{u.riskHint}</p></div>
        <ol className="space-y-1.5">{p.risks.map((r, i) => <li key={i} className="flex gap-2.5 rounded-[10px] bg-bg2 p-2"><span className="num flex size-5 shrink-0 items-center justify-center rounded-full bg-bg1 text-[10px] font-bold text-t0 ring-1 ring-line">{i + 1}</span><div className="min-w-0"><p className="text-[12.5px] font-medium leading-snug text-t0">{r.text}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] leading-snug text-t1">{r.band && <BandChip b={r.band} L={L} />}{r.velocity && <span>{u.velocity}: {r.velocity === "fast" ? u.fast : r.velocity === "slow" ? u.slow : u.lvl.medium}</span>}{r.trigger && <span>⚑ {r.trigger}</span>}</p>{r.action && <p className="text-[11px] text-t2">→ {r.action}</p>}</div></li>)}</ol>
      </div>
    </Panel>
  );
}

export function SignpostList({ p, L }: { p: FsParsed; L: Lang }) {
  const u = PV[L]; if (!p.signposts.length) return null;
  return <Panel title={u.sign}><ul className="space-y-2">{p.signposts.map((s, i) => <li key={i} className="flex gap-2.5 rounded-[10px] bg-bg2 p-2.5 text-[12.5px] leading-snug text-t0"><span aria-hidden className="mt-0.5 text-warn">▲</span><div className="min-w-0"><p>{s.text}{s.threshold && <span className="num ms-1.5 text-[11px] text-t2">({s.threshold})</span>}</p>{(s.toward || s.response) && <p className="mt-0.5 text-[11.5px] text-t1">{s.toward && <>{u.toward} <b className="text-t0">{s.toward}</b></>}{s.response && <> · {u.resp}: {s.response}</>}</p>}</div></li>)}</ul></Panel>;
}

/** The options of the report or the brief, in three columns by window: immediate, medium and long term. */
export function OptionColumns({ p, L, onTrack, tracked }: { p: FsParsed; L: Lang; onTrack?: (text: string, from: string, w?: string, owner?: string) => void; tracked?: (text: string) => boolean }) {
  const u = PV[L]; if (!p.options.length) return null; const ws = ["immediate", "medium", "long"] as const; const COL = ["var(--risk)", "var(--warn)", "var(--c2)"];
  return (
    <Panel title={u.opts}>
      <div className="grid gap-2.5 md:grid-cols-3">{ws.map((w, k) => (
        <div key={w} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${COL[k]}` }}><h5 className="label mb-2" style={{ color: COL[k] }}>{u.w[w]}</h5>
          <ul className="space-y-2.5">{p.options.filter((o) => o.window === w).map((o, i) => (
            <li key={i}><p className="text-[12.5px] font-medium leading-snug text-t0">{o.text}</p>
              {o.decision && <p className="mt-0.5 text-[11px] leading-snug text-t1"><b className="text-t0">{u.decision}: </b>{o.decision}</p>}
              {o.tradeoff && <p className="text-[11px] leading-snug text-t2"><b className="text-t1">{u.tradeoff}: </b>{o.tradeoff}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">{o.tags.map((t) => <Chip key={t} k={t} lang={L} />)}{o.owner && <span className="rounded-full bg-bg1 px-2 py-0.5 text-[10px] text-t1">{o.owner}</span>}
                {onTrack && <button type="button" onClick={() => onTrack(o.text, "option", w, o.owner)} disabled={!!tracked?.(o.text)} className="ms-auto inline-flex items-center gap-0.5 text-[10.5px] text-accent hover:underline disabled:text-t2"><Plus size={10} />{tracked?.(o.text) ? u.tracked : u.track}</button>}</div></li>))}</ul></div>))}</div>
    </Panel>
  );
}

/** The UAE impact graph: the UAE at the centre and one spoke per national interest; a spoke's weight is the percentile from the datasets, a dashed spoke has no dataset. */
export function ImpactGraph({ exposure, L, name }: { exposure: Exposure[]; L: Lang; name: string }) {
  const u = PV[L]; const label = L === "ar" ? IMPACT_AR : IMPACT_EN; const R = 96, C = 130, n = exposure.length; if (!n) return null;
  return (
    <div dir="ltr"><svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[340px]" role="img" aria-label={u.exp}>
      {exposure.map((e, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; const x = C + R * Math.cos(a), y = C + R * Math.sin(a); const v = e.value; const col = v == null ? "var(--t2)" : tone(v); return (
        <g key={e.key}><line x1={C} y1={C} x2={x} y2={y} stroke={col} strokeWidth={v == null ? 1.2 : 1 + (v / 100) * 5} strokeDasharray={v == null ? "3 3" : undefined} opacity={v == null ? 0.5 : 0.8} />
          <circle cx={x} cy={y} r="15" fill="var(--bg-1)" stroke={col} strokeWidth="2" strokeDasharray={v == null ? "3 3" : undefined}><title>{label[e.key]}: {v == null ? u.nodata : v} · {e.basis}</title></circle>
          <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="num">{v == null ? "·" : v}</text>
          <text x={C + (R + 27) * Math.cos(a)} y={C + (R + 27) * Math.sin(a) + 3} textAnchor={Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle"} fontSize="9" fill="currentColor" opacity=".8">{label[e.key]}</text></g>); })}
      <circle cx={C} cy={C} r="26" fill="var(--accent)" /><text x={C} y={C - 2} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--accent-ink)">UAE</text><text x={C} y={C + 10} textAnchor="middle" fontSize="7.5" fill="var(--accent-ink)">{name.slice(0, 12)}</text>
    </svg><p className="mt-1 text-center text-[10.5px] leading-snug text-t2">{u.expHint}</p></div>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim().split(" ").slice(0, 5).join(" ");
/** What moved since the previous report of the same product on the same country: front directions, scenario weights, opportunities. Computed from the two texts, no model call. */
export function ChangesPanel({ now, prev, prevAt, L }: { now: FsParsed; prev: FsParsed | null; prevAt?: string; L: Lang }) {
  const u = PV[L]; if (!prev) return null; const lines: string[] = [];
  const hs = now.horizons.length ? now.horizons : ["H1", "H2", "H3"];
  for (const r of now.matrix) { const o = prev.matrix.find((x) => norm(x.front) === norm(r.front)); if (o) r.h.forEach((c, i) => { const od = o.h[i]?.dir; if (c.dir && od && c.dir !== od && i < 3) lines.push(`${u.dirChange}: ${r.front}, ${hs[i] ?? i + 1}: ${u.dir[od]} → ${u.dir[c.dir]}`); }); }
  for (const s of now.scenarios) { const o = prev.scenarios.find((x) => x.code === s.code); if (o && s.weight != null && o.weight != null && Math.abs(s.weight - o.weight) >= 5) lines.push(`${u.wChange} ${s.code} ${s.name}: ${o.weight}% → ${s.weight}%`); }
  const pn = new Set(prev.opportunities.map((o) => norm(o.text))), nn = new Set(now.opportunities.map((o) => norm(o.text)));
  for (const o of now.opportunities) if (!pn.has(norm(o.text))) lines.push(`${u.added}: ${o.text}`); for (const o of prev.opportunities) if (!nn.has(norm(o.text))) lines.push(`${u.removed}: ${o.text}`);
  if (now.outlook?.dir && prev.outlook?.dir && now.outlook.dir !== prev.outlook.dir) lines.unshift(`${u.dirChange}: ${u.dir[prev.outlook.dir]} → ${u.dir[now.outlook.dir]}`);
  return <Panel title={`${u.changes}${prevAt ? ` · ${u.since} ${prevAt.slice(0, 10)}` : ""}`}>{lines.length ? <ul className="space-y-1.5">{lines.slice(0, 14).map((l, i) => <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-t0"><span aria-hidden className="text-accent">Δ</span><span>{l}</span></li>)}</ul> : <p className="text-[12.5px] text-t1">{u.noChange}</p>}</Panel>;
}

