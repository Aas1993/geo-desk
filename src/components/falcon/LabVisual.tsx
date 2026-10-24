"use client";
import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { parseLab, parseRedTeam, type LabNode } from "@/lib/falcon/lab-parse";
import { CRITERIA, CRITERION_LABEL, EQUAL_WEIGHTS, rank, robustness, type Weights } from "@/lib/falcon/mca";
import { BandChip, SignpostList, PV, type Lang } from "../fs-panels";
import { Panel } from "../VisualBrief";

const V = {
  en: { bottom: "Bottom line", assumptions: "Baseline assumptions", sens: "Sensitivity", graph: "Outcome graph", graphHint: "Left to right: direct, second and third order. An arrow means the earlier outcome feeds the later one; outcomes with two parents are shared, not double-counted. Colour is the impact on the UAE. Select an outcome for its mechanism, evidence and indicator.", order: ["Direct", "Second order", "Third order"], mech: "Mechanism", interest: "UAE interest", horizon: "Horizon", impact: "Impact", conf: "Confidence", evidence: "Evidence", indicator: "Indicator to watch", from: "Fed by", feeds: "Feeds", variants: "Mild, central and severe", exposure: "UAE exposure", protects: "Already protects the UAE", options: "Options analyzer", optHint: "Scores are analyst judgments from 1 (worst) to 5 (best). Move the weights: the ranking and the robustness figure update. Robustness is the share of 400 random weight sets (each weight varied by up to 50%) in which the option ranks first.", weights: "Weights", reset: "Reset", total: "Weighted score", robust: "ranks first in", winner: "Leading option", depends: "The leading option depends on the weights: it ranks first in fewer than 60% of the variations.", stable: "The leading option is stable across the weight variations.", changed: "With your weights the leader differs from the equal-weight leader.", memo: "Decision memo", sign: "Signposts", empty: "The lab text has no tables the picture view can read yet.", none: "—" },
  ar: { bottom: "الخلاصة", assumptions: "الافتراضات الأساسية", sens: "الحساسية", graph: "رسم النتائج", graphHint: "من اليسار إلى اليمين: مباشر وثانوي وثالثي. السهم يعني أن النتيجة الأسبق تغذي اللاحقة؛ والنتائج ذات الأبوين مشتركة لا تُحتسب مرتين. اللون هو الأثر على الإمارات. اختر نتيجة لترى آليتها ودليلها ومؤشرها.", order: ["مباشر", "الدرجة الثانية", "الدرجة الثالثة"], mech: "الآلية", interest: "المصلحة الإماراتية", horizon: "الأفق", impact: "الأثر", conf: "الثقة", evidence: "الدليل", indicator: "المؤشر المراقب", from: "تغذيها", feeds: "تغذي", variants: "خفيف ومركزي وشديد", exposure: "انكشاف الإمارات", protects: "ما يحمي الإمارات أصلًا", options: "محلل الخيارات", optHint: "الدرجات تقديرات المحلل من 1 (الأسوأ) إلى 5 (الأفضل). حرّك الأوزان فيتحدث الترتيب ومقياس الصمود. الصمود هو نسبة 400 مجموعة أوزان عشوائية (يتغير كل وزن حتى 50%) يحتل فيها الخيار المرتبة الأولى.", weights: "الأوزان", reset: "إعادة", total: "الدرجة الموزونة", robust: "الأول في", winner: "الخيار المتصدر", depends: "الخيار المتصدر يتوقف على الأوزان: يحتل المرتبة الأولى في أقل من 60% من التباينات.", stable: "الخيار المتصدر ثابت عبر تباينات الأوزان.", changed: "بأوزانك يختلف المتصدر عن متصدر الأوزان المتساوية.", memo: "مذكرة القرار", sign: "المؤشرات", empty: "لا يحتوي نص المختبر بعدُ على جداول يقرأها العرض المصوّر.", none: "—" },
} as const;
const IMP = { high: "var(--risk)", medium: "var(--warn)", low: "var(--ok)" } as const;
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, var(--bg-2))`;
const HEAT = ["var(--risk)", "var(--risk)", "var(--warn)", "var(--c2)", "var(--ok)", "var(--ok)"];

function Graph({ nodes, L }: { nodes: LabNode[]; L: Lang }) {
  const u = V[L]; const [sel, setSel] = useState<string | null>(nodes[0]?.id ?? null); const W = 176, H = 62, GX = 70, GY = 14;
  const cols = [1, 2, 3].map((o) => nodes.filter((n) => n.order === o)); const rows = Math.max(1, ...cols.map((c) => c.length));
  const pos = new Map<string, { x: number; y: number }>(); cols.forEach((c, ci) => c.forEach((n, ri) => pos.set(n.id, { x: 10 + ci * (W + GX), y: 24 + ri * (H + GY) + ((rows - c.length) * (H + GY)) / 2 })));
  const width = 20 + 3 * W + 2 * GX, height = 36 + rows * (H + GY); const cur = nodes.find((n) => n.id === sel);
  return (
    <div>
      <div className="overflow-x-auto" dir="ltr"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full" role="img" aria-label={u.graph}>
        {u.order.map((t, i) => <text key={i} x={10 + i * (W + GX) + W / 2} y={14} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" opacity=".55" letterSpacing=".06em">{t.toUpperCase()}</text>)}
        {nodes.map((n) => n.parents.map((p) => { const a = pos.get(p), b = pos.get(n.id); if (!a || !b || a.x === b.x) return null; const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2; const hot = sel === n.id || sel === p; return <path key={`${p}-${n.id}`} d={`M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2},${y2}`} fill="none" stroke={hot ? "var(--accent)" : "var(--line-2)"} strokeWidth={hot ? 2.2 : 1.3} markerEnd="" opacity={hot ? 1 : 0.8} />; }))}
        {nodes.map((n) => { const p = pos.get(n.id)!; const col = n.impact ? IMP[n.impact] : "var(--t2)"; const on = sel === n.id; return (
          <g key={n.id} onClick={() => setSel(n.id)} style={{ cursor: "pointer" }} role="button" aria-label={`${n.id} ${n.text}`}>
            <rect x={p.x} y={p.y} width={W} height={H} rx="9" fill={mix(col, 16)} stroke={on ? "var(--accent)" : col} strokeWidth={on ? 2.4 : 1.2} />
            <text x={p.x + 8} y={p.y + 15} fontSize="10" fontWeight="800" fill={col} className="num">{n.id}</text>
            <text x={p.x + W - 8} y={p.y + 15} fontSize="9" textAnchor="end" fill="currentColor" opacity=".6">{n.band?.label ?? ""}</text>
            <foreignObject x={p.x + 6} y={p.y + 19} width={W - 12} height={H - 21}><div style={{ fontSize: 10.5, lineHeight: 1.22, overflow: "hidden", maxHeight: H - 22 }}>{n.text}</div></foreignObject>
          </g>); })}
      </svg></div>
      {cur && (
        <div className="mt-3 rounded-[12px] bg-bg2 p-3" style={{ borderInlineStart: `4px solid ${cur.impact ? IMP[cur.impact] : "var(--line)"}` }}>
          <div className="flex flex-wrap items-center gap-1.5"><span className="num text-[12px] font-bold text-accent">{cur.id}</span><BandChip b={cur.band} L={L} />{cur.impact && <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: mix(IMP[cur.impact], 22), color: IMP[cur.impact] }}>{u.impact}: {PV[L].lvl[cur.impact]}</span>}{cur.confidence && <span className="rounded-full bg-bg3 px-2 py-0.5 text-[10.5px] text-t1">{u.conf}: {PV[L].conf[cur.confidence]}</span>}</div>
          <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-t0">{cur.text}</p>
          <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[12px] leading-snug sm:grid-cols-2">
            {cur.mechanism && <div><dt className="label">{u.mech}</dt><dd className="text-t1">{cur.mechanism}</dd></div>}{cur.interest && <div><dt className="label">{u.interest}</dt><dd className="text-t1">{cur.interest} · {cur.horizon}</dd></div>}
            {cur.impactText && cur.impactText.length > 6 && <div><dt className="label">{u.impact}</dt><dd className="text-t1">{cur.impactText}</dd></div>}{cur.evidence && <div><dt className="label">{u.evidence}</dt><dd className="text-t1">{cur.evidence}</dd></div>}
            {cur.indicator && <div><dt className="label">{u.indicator}</dt><dd className="text-t1">{cur.indicator}</dd></div>}
            <div><dt className="label">{u.from} / {u.feeds}</dt><dd className="num text-t1">{cur.parents.join(", ") || u.none} → {cur.id} → {nodes.filter((n) => n.parents.includes(cur.id)).map((n) => n.id).join(", ") || u.none}</dd></div>
          </dl>
        </div>)}
      <p className="mt-2 text-[10.5px] leading-snug text-t2">{u.graphHint}</p>
    </div>
  );
}

function Analyzer({ p, L }: { p: ReturnType<typeof parseLab>; L: Lang }) {
  const u = V[L]; const [w, setW] = useState<Weights>({ ...EQUAL_WEIGHTS }); const opts = p.scored;
  const ranked = useMemo(() => rank(opts, w), [opts, w]); const rb = useMemo(() => robustness(opts, w), [opts, w]); const base = useMemo(() => rank(opts, EQUAL_WEIGHTS)[0], [opts]);
  if (opts.length < 2) return null; const lead = ranked[0]; const leadRb = rb[lead.i] ?? 0; const hi = Math.max(...ranked.map((r) => r.total ?? 0), 1);
  return (
    <Panel title={u.options}>
      <div className="overflow-x-auto"><table className="num w-full min-w-[560px] text-[11.5px]"><thead><tr className="text-[10px] uppercase tracking-wide text-t2"><th className="py-1 pe-2 text-start">{L === "ar" ? "الخيار" : "Option"}</th>{CRITERIA.map((c) => <th key={c} className="px-1 text-center font-semibold">{CRITERION_LABEL[c][L].replace(/ \(.*\)/, "")}</th>)}</tr></thead>
        <tbody>{opts.map((o, i) => <tr key={i} className="border-t border-line"><td className="py-1.5 pe-2 text-[12px] font-medium text-t0" title={p.reasons[i]}>{o.name}</td>{CRITERIA.map((c) => { const v = o.scores[c]; return <td key={c} className="px-1 text-center"><span className="inline-block min-w-6 rounded-[6px] px-1.5 py-0.5 font-bold" style={v ? { background: mix(HEAT[v], 26), color: HEAT[v] } : undefined}>{v ?? "—"}</span></td>; })}</tr>)}</tbody></table></div>
      <details className="mt-3 rounded-[10px] border border-line bg-bg2/60 p-2.5" open><summary className="cursor-pointer text-[12px] font-semibold text-t0">{u.weights}</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">{CRITERIA.map((c) => <label key={c} className="text-[11px] text-t1"><span className="flex justify-between"><span>{CRITERION_LABEL[c][L]}</span><span className="num text-t0">{w[c]}</span></span><input type="range" min={0} max={100} value={w[c]} onChange={(e) => setW({ ...w, [c]: +e.target.value })} className="w-full accent-[var(--accent)]" /></label>)}</div>
        <button type="button" onClick={() => setW({ ...EQUAL_WEIGHTS })} className="mt-1.5 text-[11px] text-accent hover:underline">{u.reset}</button></details>
      <ul className="mt-3 space-y-2">{ranked.map((r, k) => (
        <li key={r.i} className="grid items-center gap-2 sm:grid-cols-[minmax(120px,1.2fr)_3fr_auto]" dir="ltr"><span className="text-[12.5px] font-medium text-t0"><span className="num me-1.5 text-[11px] text-t2">{k + 1}</span>{r.name}</span>
          <div className="h-3 rounded-full bg-bg3"><div className="h-3 rounded-full" style={{ width: `${((r.total ?? 0) / hi) * 100}%`, background: k === 0 ? "var(--accent)" : "var(--c2)", opacity: k === 0 ? 1 : 0.7 }} /></div>
          <span className="num whitespace-nowrap text-[11px] text-t1">{r.total?.toFixed(2) ?? "—"} · {u.robust} {Math.round((rb[r.i] ?? 0) * 100)}%</span></li>))}</ul>
      <p className="mt-2 rounded-[8px] px-2.5 py-1.5 text-[11.5px] leading-snug" style={{ background: mix(leadRb < 0.6 ? "var(--warn)" : "var(--ok)", 14) }}><b>{u.winner}: {lead.name}.</b> {leadRb < 0.6 ? u.depends : u.stable}{base && lead.i !== base.i ? ` ${u.changed}` : ""}</p>
      <p className="mt-1 text-[10.5px] leading-snug text-t2">{u.optHint}</p>
    </Panel>
  );
}

/** The Scenario and Policy Lab as pictures: the outcome graph, the variants, UAE exposure, a re-weightable options analyzer, the memo and the signposts. Read from the lab's tables; no further model call. */
export function LabVisual({ name, markdown }: { iso3: string; name: string; markdown: string }) {
  const { lang } = useT(); const L = lang as Lang; const u = V[L]; const p = useMemo(() => parseLab(markdown), [markdown]);
  const empty = !p.nodes.length && !p.scored.length && !p.bottom;
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      <div className="no-print"><h3 className="display text-[17px] font-semibold text-t0">{p.title.replace(/^Scenario and Policy Lab:\s*/i, "") || name}</h3></div>
      {p.bottom && <section className="fs-page rounded-[14px] border border-accent/40 bg-accent/5 p-4"><h4 className="label mb-1.5 text-accent">{u.bottom}</h4><p className="text-[14px] leading-relaxed text-t0">{p.bottom}</p>{p.scope && <p className="mt-1.5 text-[12px] leading-snug text-t1">{p.scope}</p>}</section>}
      {p.assumptions.length > 0 && <section className="fs-page"><Panel title={u.assumptions}><ul className="grid gap-2 md:grid-cols-2">{p.assumptions.map((a, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5"><div className="flex items-baseline justify-between gap-2"><span className="text-[12.5px] font-medium text-t0">{a.text}</span>{a.sensitivity && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: mix(IMP[a.sensitivity], 22), color: IMP[a.sensitivity] }}>{u.sens}: {PV[L].lvl[a.sensitivity]}</span>}</div><p className="num mt-0.5 text-[12px] text-t0" dir="auto">{a.value}</p><p className="text-[10.5px] text-t2">{a.basis}</p></li>)}</ul></Panel></section>}
      {p.nodes.length > 0 && <section className="fs-page"><Panel title={u.graph}><Graph nodes={p.nodes} L={L} />{p.feedback && <p className="mt-2 text-[11.5px] leading-snug text-t1">↻ {p.feedback}</p>}</Panel></section>}
      {p.variants.length > 0 && <section className="fs-page"><Panel title={u.variants}><div className="grid gap-2.5 md:grid-cols-3">{p.variants.map((v, i) => <div key={i} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${["var(--ok)", "var(--warn)", "var(--risk)"][i] ?? "var(--line)"}` }}><div className="flex items-center justify-between gap-2"><h5 className="text-[13px] font-semibold text-t0">{v.name}</h5><BandChip b={v.band} L={L} /></div><p className="mt-1.5 text-[12px] leading-snug text-t1">{v.differs}</p><p className="mt-1.5 rounded-[8px] bg-bg1 p-2 text-[11.5px] leading-snug text-t0">🇦🇪 {v.exposure}</p>{v.signpost && <p className="mt-1.5 text-[10.5px] text-t2">▸ {v.signpost}</p>}</div>)}</div></Panel></section>}
      {p.exposure.length > 0 && <section className="fs-page"><Panel title={u.exposure}><ul className="space-y-2">{p.exposure.map((x, i) => <li key={i} className="grid items-center gap-2 sm:grid-cols-[minmax(120px,1fr)_120px_2fr]"><span className="text-[12.5px] font-medium text-t0">{x.interest}<span className="ms-1.5 text-[10px] text-t2">{x.kind}</span></span><div className="h-2.5 rounded-full bg-bg3" dir="ltr"><div className="h-2.5 rounded-full" style={{ width: x.level === "high" ? "100%" : x.level === "medium" ? "60%" : "28%", background: x.level ? IMP[x.level] : "transparent" }} /></div><span className="text-[11.5px] leading-snug text-t1">{x.evidence}{x.protection ? <span className="text-t2"> · {u.protects}: {x.protection}</span> : null}</span></li>)}</ul></Panel></section>}
      {p.scored.length > 1 && <section className="fs-page"><Analyzer p={p} L={L} />{p.options.length > 0 && <div className="mt-2 grid gap-2 md:grid-cols-2">{p.options.map((o, i) => <div key={i} className="rounded-[10px] bg-bg2 p-2.5 text-[11.5px] leading-snug"><b className="text-[12.5px] text-t0">{o.name}</b><p className="mt-0.5 text-t1">{o.what}</p><p className="num mt-0.5 text-t2">{[o.owner, o.time, o.cost].filter(Boolean).join(" · ")}</p>{o.risk && <p className="text-t2">⚠ {o.risk}</p>}</div>)}</div>}</section>}
      {p.memo && <section className="fs-page rounded-[14px] border border-line bg-bg1 p-4"><h4 className="label mb-1.5">{u.memo}</h4><p className="text-[13px] leading-relaxed text-t0">{p.memo}</p></section>}
      {p.signposts.length > 0 && <section className="fs-page"><SignpostList p={{ signposts: p.signposts.map((s) => ({ text: s.text, where: "", threshold: s.threshold, toward: s.toward, response: s.response })) } as never} L={L} /></section>}
      {empty && <p className="text-[12px] text-t2">{u.empty}</p>}
    </div>
  );
}

const OVERALL = { holds: { c: "var(--ok)", en: "Holds", ar: "يصمد" }, "holds-with-changes": { c: "var(--warn)", en: "Holds with changes", ar: "يصمد مع تعديلات" }, "does-not-hold": { c: "var(--risk)", en: "Does not hold", ar: "لا يصمد" } } as const;
const CHG: Record<string, { c: string; en: string; ar: string }> = { keep: { c: "var(--ok)", en: "Keep", ar: "أبقِ" }, soften: { c: "var(--warn)", en: "Soften", ar: "خفّف" }, reverse: { c: "var(--risk)", en: "Reverse", ar: "اعكس" }, caveat: { c: "var(--c2)", en: "Add a caveat", ar: "أضف تحفظًا" } };
const CHK: Record<string, { c: string; en: string; ar: string }> = { confirmed: { c: "var(--ok)", en: "Confirmed", ar: "مؤكَّد" }, disputed: { c: "var(--risk)", en: "Disputed", ar: "متنازَع" }, unverifiable: { c: "var(--warn)", en: "Unverifiable", ar: "تعذّر التحقق" }, stale: { c: "var(--c2)", en: "Stale", ar: "قديم" } };
const R = {
  en: { verdict: "Verdict", competing: "Strongest competing explanation", hyp: "Competing hypotheses", forT: "For", against: "Against", diag: "Most diagnostic", changes: "Judgments to change", challenge: "Challenge", actors: "Omitted actors and perspectives", checks: "Checks against the record", dissent: "Unresolved dissent", empty: "The review text has no sections the picture view can read yet." },
  ar: { verdict: "الحكم", competing: "أقوى تفسير منافس", hyp: "الفرضيات المتنافسة", forT: "مع", against: "ضد", diag: "الأكثر دلالة", changes: "أحكام تحتاج تغييرًا", challenge: "التحدي", actors: "أطراف ووجهات نظر مغفلة", checks: "التحقق من السجل", dissent: "خلاف لم يُحسم", empty: "لا يحتوي نص المراجعة بعدُ على أقسام يقرأها العرض المصوّر." },
} as const;
/** The Red Team review as pictures: the overall verdict, the competing hypotheses, which judgments to change and how, who was left out and what held up against the record. */
export function RedTeamVisual({ markdown }: { markdown: string }) {
  const { lang } = useT(); const L = lang as Lang; const u = R[L]; const p = useMemo(() => parseRedTeam(markdown), [markdown]); const ov = p.overall ? OVERALL[p.overall] : null;
  const empty = !p.verdict && !p.hypotheses.length && !p.changes.length;
  const counts = (["confirmed", "disputed", "unverifiable", "stale"] as const).map((k) => [k, p.checks.filter((c) => c.verdict === k).length] as const);
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      {(p.verdict || ov) && <section className="fs-page rounded-[14px] p-4" style={{ background: mix(ov?.c ?? "var(--accent)", 12), borderInlineStart: `5px solid ${ov?.c ?? "var(--line)"}` }}><div className="flex flex-wrap items-center gap-2"><h4 className="label">{u.verdict}</h4>{ov && <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: mix(ov.c, 25), color: ov.c }}>{ov[L]}</span>}</div><p className="mt-1.5 text-[14px] leading-relaxed text-t0">{p.verdict}</p></section>}
      {p.competing && <section className="fs-page"><Panel title={u.competing}><p className="text-[13px] leading-relaxed text-t0">{p.competing}</p></Panel></section>}
      {p.hypotheses.length > 0 && <section className="fs-page"><Panel title={u.hyp}><div className="grid gap-2.5 md:grid-cols-3">{p.hypotheses.map((h, i) => { const c = /strongest/i.test(h.verdict) ? "var(--ok)" : /weak/i.test(h.verdict) ? "var(--t2)" : "var(--warn)"; return <div key={i} className="rounded-[12px] bg-bg2 p-3" style={{ borderTop: `3px solid ${c}` }}><div className="flex items-baseline justify-between gap-2"><h5 className="text-[12.5px] font-semibold text-t0">{h.name}</h5><span className="text-[10px] font-bold uppercase" style={{ color: c }}>{h.verdict}</span></div><p className="mt-1.5 text-[11.5px] leading-snug text-t1"><b className="text-t0">{u.forT}: </b>{h.forText}</p><p className="mt-1 text-[11.5px] leading-snug text-t1"><b className="text-t0">{u.against}: </b>{h.against}</p>{h.diagnostic && <p className="mt-1 text-[10.5px] leading-snug text-t2">◎ {h.diagnostic}</p>}</div>; })}</div></Panel></section>}
      {p.changes.length > 0 && <section className="fs-page"><Panel title={u.changes}><ul className="space-y-2">{p.changes.map((c, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5"><div className="flex items-start justify-between gap-3"><p className="text-[12.5px] font-medium leading-snug text-t0">{c.original}</p>{c.change && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: mix(CHG[c.change].c, 24), color: CHG[c.change].c }}>{CHG[c.change][L]}</span>}</div><p className="mt-1 text-[11.5px] leading-snug text-t1"><b className="text-t0">{u.challenge}: </b>{c.challenge}</p>{c.evidence && <p className="text-[10.5px] text-t2">{c.evidence}</p>}</li>)}</ul></Panel></section>}
      {p.actors.length > 0 && <section className="fs-page"><Panel title={u.actors}><ul className="grid gap-2 md:grid-cols-2">{p.actors.map((a, i) => <li key={i} className="rounded-[10px] bg-bg2 p-2.5"><b className="text-[12.5px] text-t0">{a.actor}</b><p className="mt-0.5 text-[11.5px] leading-snug text-t1">{a.view}</p>{a.effect && <p className="mt-0.5 text-[11px] leading-snug text-t2">→ {a.effect}</p>}</li>)}</ul></Panel></section>}
      {p.checks.length > 0 && <section className="fs-page"><Panel title={u.checks}><div className="mb-2.5 flex flex-wrap gap-2">{counts.map(([k, n]) => n > 0 && <span key={k} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: mix(CHK[k].c, 22), color: CHK[k].c }}>{n} {CHK[k][L]}</span>)}</div><ul className="space-y-1.5">{p.checks.map((c, i) => <li key={i} className="flex items-start gap-2.5 rounded-[10px] bg-bg2 p-2 text-[12px] leading-snug"><span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={c.verdict ? { background: mix(CHK[c.verdict].c, 24), color: CHK[c.verdict].c } : undefined}>{c.verdict ? CHK[c.verdict][L] : "?"}</span><span className="min-w-0 flex-1 text-t0">{c.claim}</span><span className="num hidden shrink-0 text-[10.5px] text-t2 sm:block">{c.source}</span></li>)}</ul></Panel></section>}
      {p.dissent && <section className="fs-page rounded-[14px] border border-line bg-bg1 p-4"><h4 className="label mb-1.5">{u.dissent}</h4><p className="text-[13px] leading-relaxed text-t0">{p.dissent}</p></section>}
      {empty && <p className="text-[12px] text-t2">{u.empty}</p>}
    </div>
  );
}
