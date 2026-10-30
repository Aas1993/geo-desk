"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { POSTURE, type Posture } from "@/lib/case/core";
import { LABEL, NO_SHOCK, SHOCKS, computeScenario, scenarioBlocks, scenarioText, shockText, type RuleOut, type ScenarioResult, type Shocks } from "@/lib/lab/scenario";
import { TOOL_NAME } from "@/lib/lab/snap";
import { Block, Pill } from "../falcon/bits";
import { useStored } from "../deep/hooks";
import { LEVEL_C, bt, useTr } from "../case/bits";
import { Markdown } from "../Markdown";
import { Gaps, SaveBar, Slider, type ToolProps } from "./kit";

const POS_VAR: Record<Posture, string> = { deepen: "var(--ok)", staged: "var(--accent)", hedge: "var(--warn)", hold: "var(--t2)" };
const PRESETS: { en: string; ar: string; s: Partial<Shocks> }[] = [
  { en: "Oil down 30%", ar: "هبوط النفط 30٪", s: { oil: -30 } }, { en: "Red Sea closed 3 months", ar: "إغلاق البحر الأحمر 3 أشهر", s: { closure: 3 } },
  { en: "Sanctions and a currency fall", ar: "عقوبات وهبوط العملة", s: { sanctions: 2, currency: 30 } }, { en: "Disorderly leadership change", ar: "تغيّر قيادة غير منظم", s: { leadership: 2 } },
];
const sh = (x: number) => (x === 0 ? "0" : `${x > 0 ? "+" : "−"}${Math.abs(x) % 1 ? Math.abs(x).toFixed(1) : Math.abs(x)}`);
const WRITEUP_CAP = 0.25; // the Desk agent writer's ceiling per answer (api/agent/compose)

/** One reading (value, ability or risk) as a bar: the base case is the tick, the shocked case is the fill. */
function ReadingBar({ label, base, now, good }: { label: string; base: number; now: number; good: "high" | "low" }) {
  const d = now - base; const worse = good === "high" ? d < 0 : d > 0; const c = d === 0 ? "var(--t2)" : worse ? "var(--risk)" : "var(--ok)";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]"><span className="text-t1">{label}</span><span className="num" dir="ltr"><b className="text-t0">{now}</b> <span className="text-t2">({base})</span> <b style={{ color: c }}>{d === 0 ? "" : sh(d)}</b></span></div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }} role="img" aria-label={`${label}: ${now}, base ${base}`}><i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${now}%`, background: c === "var(--t2)" ? "var(--accent)" : c, opacity: 0.85 }} /><i className="absolute inset-y-[-2px] w-0.5 bg-t0" style={{ left: `calc(${base}% - 1px)` }} /></div>
    </div>
  );
}
function PostureCard({ L, title, r, tone }: { L: ToolProps["L"]; title: string; r: NonNullable<ScenarioResult["base"]>; tone: Posture }) {
  const t = useTr(L); const p = POSTURE[tone];
  return <div className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: `3px solid ${POS_VAR[tone]}` }}><p className="label">{title}</p><p className="display mt-0.5 text-[20px] font-semibold" style={{ color: POS_VAR[tone] }}>{bt(L, p.name)}</p><p className="mt-0.5 text-[11.5px] leading-snug text-t1">{bt(L, p.sub)}</p><p className="mt-1.5 text-[11px] text-t2">{r.stable ? t("Stable under a 10-point swing in any reading.", "مستقر عند تغيّر 10 نقاط في أي قراءة.") : t(`Not stable: a 10-point swing also gives ${r.alternatives.map((a) => POSTURE[a].name.en).join(" or ")}.`, `غير مستقر: تغيّر 10 نقاط يعطي أيضًا ${r.alternatives.map((a) => POSTURE[a].name.ar).join(" أو ")}.`)}</p></div>;
}
function RuleCard({ L, x, name }: { L: ToolProps["L"]; x: RuleOut; name: string }) {
  const t = useTr(L);
  return (
    <details className="mt-1.5 rounded-[8px] bg-bg2 px-2.5 py-1.5 text-[11.5px] leading-snug text-t1">
      <summary className="cursor-pointer text-t0">{x.active && !x.held ? <span className="text-warn">{t("Not held: no effect", "غير متوافر: لا أثر")}</span> : x.active ? <span dir="ltr" className="num">{t("value", "القيمة")} {sh(x.shift.value)} · {t("ability", "القدرة")} {sh(x.shift.ability)} · {t("risk", "المخاطر")} {sh(x.shift.risk)}</span> : t("The rule (no shock set)", "القاعدة (لا صدمة)")}</summary>
      <p className="mt-1"><b className="text-t0">{t("Reads", "يقرأ")}:</b> {x.input.map((i, k) => <span key={k} className="me-2">{bt(L, i.label)} = <bdi dir="ltr" className="num text-t0">{i.display}</bdi></span>)}</p>
      <p className="mt-1">{bt(L, x.rule)}</p><p className="mt-1 text-t2"><b>{t("Formula (proposed coefficient)", "المعادلة (معامل مقترح)")}:</b> {bt(L, x.formula)}</p>
      {(x.active || !x.held) && <p className="mt-1 text-t2">{bt(L, x.note)}</p>}<span className="sr-only">{name}</span>
    </details>
  );
}

/** THE SCENARIO SANDBOX: six shock sliders, each a rule from the Case File's held data; the base case (the Case File's own posture) against the shocked case, with the rule shown. Free; the optional agent write-up is click-started and capped. */
export function ScenarioTool({ L, iso, d, name }: ToolProps) {
  const t = useTr(L); const [stored, setShocks] = useStored<Shocks>(`gd-lab-scn:${iso ?? "none"}`, NO_SHOCK); const shocks: Shocks = { ...NO_SHOCK, ...stored };
  const res = useMemo(() => (d ? computeScenario(d, shocks) : null), [d, shocks.oil, shocks.sanctions, shocks.leadership, shocks.closure, shocks.donor, shocks.currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false); const [out, setOut] = useState<{ text: string; usd: number | null; truncated: boolean; key: string } | null>(null); const [err, setErr] = useState(""); const ac = useRef<AbortController | null>(null);
  const key = JSON.stringify(shocks); useEffect(() => () => ac.current?.abort(), []);
  if (!d || !res) return null;
  const anyActive = res.active.length > 0; const write = out && out.key === key ? out : null; const text = scenarioText(res, name, shocks);
  const run = async () => {
    setAsk(false); setErr(""); setBusy(true); const a = new AbortController(); ac.current = a;
    try {
      const r = await fetch("/api/agent/compose", { method: "POST", headers: { "Content-Type": "application/json" }, signal: a.signal, body: JSON.stringify({ message: L === "ar" ? `اكتب مذكرة قصيرة للمكتب عن معنى هذا السيناريو التوضيحي لمسار الإمارات تجاه ${name}، من جدول القواعد فقط، وبيّن ما الذي يجب أن يراقبه المكتب.` : `Write a short note for the desk on what this illustrative scenario means for the UAE's course toward ${name}, using only the rule table, and say what the desk should watch.`, iso3: d.iso3, country: name, lang: L === "ar" ? "ar" : "en", format: "answer", length: "short", notes: "Say plainly that these are illustrative rule outputs with proposed coefficients, not forecasts. Add no figure that is not in the table.", sources: [{ name: "Scenario rule table", text }] }) });
      const j = (await r.json().catch(() => ({}))) as { text?: string; usd?: number; truncated?: boolean; message?: string };
      if (r.ok && j.text) setOut({ text: j.text, usd: typeof j.usd === "number" ? j.usd : null, truncated: !!j.truncated, key }); else setErr(j.message ?? t("The writer could not finish.", "تعذّر على الكاتب الإكمال."));
    } catch (e) { if ((e as Error).name !== "AbortError") setErr((e as Error).message); } finally { setBusy(false); }
  };
  const gaps = res.rules.filter((r) => !r.held).map((r) => ({ what: bt(L, SHOCKS.find((s) => s.id === r.id)!.name), why: bt(L, r.note) }));
  return (
    <div className="space-y-4">
      <p role="note" className="rounded-[10px] border border-warn/50 bg-bg1 p-2.5 text-[12px] leading-snug text-t0">{bt(L, LABEL)}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Block title={t("Shocks", "الصدمات")} hint={t("Move a slider: the rule behind it, the held input it reads and its shift are shown under it.", "حرّك المؤشر: تظهر تحته القاعدة والمدخل المحفوظ الذي يقرؤه وتغيّره.")} right={<button type="button" onClick={() => { setShocks({ ...NO_SHOCK }); setOut(null); }} disabled={!anyActive} className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0 disabled:opacity-40"><RotateCcw size={13} aria-hidden />{t("Reset", "إعادة ضبط")}</button>}>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("Ready scenarios", "سيناريوهات جاهزة")}>{PRESETS.map((p) => <button key={p.en} type="button" onClick={() => setShocks({ ...NO_SHOCK, ...p.s })} className="rounded-full border border-line bg-bg2 px-2.5 py-1 text-[11.5px] text-t1 hover:border-accent hover:text-accent">{t(p.en, p.ar)}</button>)}</div>
          <div className="space-y-3">{SHOCKS.map((s) => { const x = res.rules.find((r) => r.id === s.id)!; return <div key={s.id}><Slider id={`scn-${s.id}`} label={bt(L, s.name)} value={shocks[s.id]} min={s.min} max={s.max} step={s.step} onChange={(v) => setShocks({ ...shocks, [s.id]: v })} text={shockText(s.id, shocks[s.id], L)} hint={bt(L, s.ask)} /><RuleCard L={L} x={x} name={name} /></div>; })}</div>
        </Block>
        <div className="space-y-4">
          {!res.placed || !res.base || !res.shocked ? <Block title={t("Not placed", "غير محدد")}><p className="text-[12.5px] text-t1">{bt(L, res.line)}</p></Block> : <>
            <Block title={t("Base case against the shocked case", "الحالة الأساسية مقابل الحالة المصدومة")} hint={t("The base case is the Case File's own posture. The shocked case runs the shifted readings through the same rule and thresholds.", "الحالة الأساسية هي موقف ملف الحالة نفسه. وتمرّر الحالة المصدومة القراءات المعدّلة عبر القاعدة والعتبات نفسها.")}>
              <div className="grid gap-3 sm:grid-cols-2"><PostureCard L={L} title={t("Base case", "الحالة الأساسية")} r={res.base} tone={res.base.posture!} /><PostureCard L={L} title={t("Shocked case", "الحالة المصدومة")} r={res.shocked} tone={res.shocked.posture!} /></div>
              <div className="mt-3 space-y-2.5" aria-label={t("The three readings", "القراءات الثلاث")}><ReadingBar label={t("Value to the UAE", "القيمة للإمارات")} base={res.base.value} now={res.shocked.value} good="high" /><ReadingBar label={t("UAE ability to act", "قدرة الإمارات على الفعل")} base={res.base.ability} now={res.shocked.ability} good="high" /><ReadingBar label={t("Risk", "المخاطر")} base={res.base.risk} now={res.shocked.risk} good="low" /></div>
              <p className="mt-1 text-[10.5px] text-t2">{t("Tick = base case; fill = shocked case; figures in brackets are the base.", "العلامة = الحالة الأساسية؛ التعبئة = الحالة المصدومة؛ الأرقام بين القوسين هي الأساس.")}</p>
              {!res.baseRuleAgrees && <p className="mt-1 text-[11px] text-warn">{t("The Case File's rounded readings sit on a threshold: the base posture is the Case File's own, and a shocked case is computed from the rounded readings.", "قراءات ملف الحالة المقرَّبة تقع على عتبة: الموقف الأساسي هو موقف ملف الحالة نفسه، وتُحسب الحالة المصدومة من القراءات المقرَّبة.")}</p>}
              <div className="mt-3 rounded-[10px] border border-line bg-bg2 p-2.5"><p className="label mb-0.5">{t("What changes in the playbook", "ما الذي يتغير في الدليل")}</p><p className="text-[12.5px] leading-snug text-t0">{bt(L, res.line)}</p></div>
              {res.crossed.length > 0 && <div className="mt-2.5"><p className="label mb-1">{t("Thresholds crossed", "العتبات المتجاوزة")}</p><div className="flex flex-wrap gap-1.5">{res.crossed.map((c) => <Pill key={c.cond.id} c={c.now ? "var(--ok)" : "var(--risk)"}>{bt(L, c.cond.label)} ({c.cond.op} {c.cond.limit}): {c.was ? t("met", "متحققة") : t("not met", "غير متحققة")} → {c.now ? t("met", "متحققة") : t("not met", "غير متحققة")}</Pill>)}</div></div>}
              {res.needs.length > 0 && <div className="mt-2.5 rounded-[10px] border border-dashed border-line p-2.5"><p className="label mb-1">{t("What would have to be true", "ما الذي يجب أن يتحقق")}</p><ul className="space-y-0.5 text-[12px] leading-snug text-t1">{res.needs.map((n, i) => <li key={i}>{bt(L, n)}</li>)}</ul></div>}
            </Block>
            <Block title={t("Instruments: intensity under each case", "الأدوات: الشدة في كل حالة")} hint={t("Footprint and headroom are today's readings from the Case File; a shock changes the posture, and with it the stated intensity.", "الحضور والمجال قراءتان حاليتان من ملف الحالة؛ تغيّر الصدمة الموقف ومعه الشدة المعلنة.")}>
              <div className="overflow-x-auto"><table className="w-full text-start text-[12px]"><thead><tr className="text-t2"><th scope="col" className="py-1 pe-2 text-start font-medium">{t("Instrument", "الأداة")}</th><th scope="col" className="px-2 text-start font-medium">{t("Footprint", "الحضور")}</th><th scope="col" className="px-2 text-start font-medium">{t("Base", "الأساس")}</th><th scope="col" className="px-2 text-start font-medium">{t("Shocked", "بعد الصدمة")}</th></tr></thead>
                <tbody className="divide-y divide-line">{res.instruments.map((i) => <tr key={i.id} style={i.changed ? { background: "color-mix(in srgb, var(--warn) 10%, transparent)" } : undefined}><td className="py-1.5 pe-2 text-t0">{bt(L, i.name)}</td><td className="px-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}>{i.footprint != null && <div className="h-full rounded-full bg-accent" style={{ width: `${(i.footprint / 5) * 100}%` }} />}</div><span className="num text-[10.5px] text-t2" dir="ltr">{i.footprint ?? t("not measured", "غير مقيس")}{i.headroom != null ? ` / ${i.headroom}` : ""}</span></td><td className="px-2 text-t1">{bt(L, i.base)}</td><td className="px-2 font-medium" style={{ color: i.changed ? "var(--warn)" : "var(--t1)" }}>{bt(L, i.shocked)}</td></tr>)}</tbody></table></div>
            </Block>
            <Block title={t("Risk categories (short-term view)", "فئات المخاطر (المدى القصير)")} hint={t("A category steps up one level for each step a rule names; a category with no data stays \"not available\", never low.", "تصعد الفئة مستوى لكل خطوة تذكرها قاعدة؛ والفئة بلا بيانات تبقى \"غير متاحة\" لا منخفضة.")}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{res.cats.map((c) => <div key={c.id} className="rounded-[10px] border border-line bg-bg2 p-2.5" style={{ borderTop: `3px solid ${LEVEL_C[c.shocked]}` }}><p className="text-[12.5px] font-medium text-t0">{bt(L, c.name)}</p><p className="mt-0.5 text-[12px]"><span style={{ color: LEVEL_C[c.base] }}>{lv(c.base, L)}</span>{c.base !== c.shocked && <> <span className="text-t2">→</span> <b style={{ color: LEVEL_C[c.shocked] }}>{lv(c.shocked, L)}</b></>}</p><p className="mt-0.5 text-[10.5px] leading-snug text-t2">{bt(L, c.text)}</p>{c.by.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{c.by.map((id) => <Pill key={id} c="var(--warn)">{bt(L, SHOCKS.find((s) => s.id === id)!.name)}</Pill>)}</p>}</div>)}</div>
            </Block>
          </>}
          <Gaps L={L} items={anyActive ? gaps : []} />
          <Block title={t("Agent write-up (optional)", "كتابة الوكيل (اختيارية)")} hint={t("Click-started. The Desk agent's writer turns the rule table above into a short note and adds no figure; a few cents, capped at US$0.25.", "تبدأ بنقرة. يحوّل كاتب وكيل المكتب جدول القواعد أعلاه إلى مذكرة قصيرة دون إضافة أي رقم؛ بضعة سنتات وبحد أقصى 0.25 دولار.")}>
            <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setAsk((v) => !v)} disabled={busy || !res.placed || !anyActive} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><Sparkles size={14} aria-hidden />{busy ? t("Writing…", "جارٍ الكتابة…") : write ? t("Write it again", "اكتبها مجددًا") : t("Write the note", "اكتب المذكرة")}</button>{!anyActive && <span className="text-[11.5px] text-t2">{t("Set a shock first.", "اضبط صدمة أولًا.")}</span>}</div>
            {ask && !busy && <div role="alertdialog" aria-label={t("Confirm the write-up", "تأكيد الكتابة")} className="mt-2 rounded-[10px] border border-accent/50 bg-bg3 p-3"><p className="text-[12.5px] leading-snug text-t0">{t(`Send the rule table for ${name} to the Desk agent's writer? It is one model call, no web search, a few cents and never more than US$${WRITEUP_CAP.toFixed(2)}.`, `إرسال جدول القواعد لـ ${name} إلى كاتب وكيل المكتب؟ استدعاء نموذج واحد دون بحث على الويب، بضعة سنتات ولا يتجاوز ${WRITEUP_CAP.toFixed(2)} دولار.`)}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void run()} className="inline-flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]">{t("Write it", "اكتبها")}</button><button type="button" onClick={() => setAsk(false)} className="inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] text-t0">{t("Cancel", "إلغاء")}</button></div></div>}
            {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
            {write && <div className="mt-3"><div className="text-[13px]"><Markdown source={write.text} /></div><p className="mt-1.5 text-[11px] text-t2">{write.usd != null ? `US$${write.usd.toFixed(4)} · ` : ""}{t("written from the rule table; for this shock setting only", "كُتبت من جدول القواعد؛ لهذا الضبط فقط")}{write.truncated ? ` · ${t("the writer reached its length limit", "بلغ الكاتب حد الطول")}` : ""}</p></div>}
          </Block>
          <SaveBar L={L} tool="scenario" iso={d.iso3} country={name} disabled={!res.placed} build={() => ({ title: `${TOOL_NAME.scenario[L === "ar" ? "ar" : "en"]}`, blocks: scenarioBlocks(res, name, shocks, L === "ar" ? "ar" : "en", write?.text), text: write ? `${text}\n\nAgent write-up:\n${write.text}` : text })} />
        </div>
      </div>
    </div>
  );
}
const LV: Record<string, { en: string; ar: string }> = { none: { en: "not available", ar: "غير متاح" }, low: { en: "low", ar: "منخفض" }, medium: { en: "medium", ar: "متوسط" }, high: { en: "high", ar: "مرتفع" } };
const lv = (l: string, L: ToolProps["L"]) => LV[l][L];
