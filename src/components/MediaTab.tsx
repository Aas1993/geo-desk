"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Sparkles, RefreshCw, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { useMedia, useToneMap, type ToneMap } from "@/lib/media/client";
import { STANCES, type Dir, type Item, type Stance, type StanceResult, type Verdict } from "@/lib/media/types";
import { Card, Skeleton } from "./ui";
import { useCountries } from "./SearchBox";
import type { Country } from "@/lib/types";

const COLOR: Record<Stance | "mixed", string> = { hostile: "#ff5d73", critical: "#ff8a4c", neutral: "#9db0cf", friendly: "#3ddcff", supportive: "#2de39a", mixed: "#b693ff" };
const UI = {
  en: { toUae: "Toward the UAE", toCountry: "Toward", intro: "How media and think tanks frame the UAE (the country's own outlets) or this country (UAE outlets). Tone is free and always on; the stance read is an AI judgement you start yourself.",
    toneTitle: "Coverage tone", toneAbout: "Average tone of events involving the UAE reported by this country's outlets (GDELT), last 45 days", toneOut: "Average tone of UAE media articles mentioning", world: "World average", vsWorld: "vs world average", below: "more negative", above: "more positive", rank: "most favourable", of: "of", measured: "countries measured",
    thin: "Too little coverage for a reliable average.", toneNote: "Tone is how negative the wording of coverage reads, not whether outlets are hostile: war and crime news score low whatever the attitude. Use it to compare, and use the stance read to judge attitude.", noMap: "The world comparison is still being built.",
    neg: "Sharpest negative coverage", pos: "Most positive coverage", rankedBy: "Ranked by tone (GDELT), last 14 days. Headlines may be translated or in the original language.", none: "Nothing found in the last 14 days.", loading: "Loading…", slow: "GDELT limits requests, so a first look at a country takes about a minute.",
    tanks: "Think tanks", onUae: "On the UAE", onCountry: "On", both: "Both", tanksNote: "Recent pieces from CFR, Chatham House, Carnegie, Brookings, Atlantic Council, MEI, Washington Institute, CSIS, RAND, Crisis Group, IISS, AGSIW and others (via news search of their sites).",
    stance: "Stance read (AI)", stanceIntro: "An AI reads the headlines above plus think-tank titles and labels each hostile, critical, neutral, friendly or supportive, with evidence. It runs only when you click and each new run bills your Anthropic account (about 2–4 cents); results are cached for 3 hours.",
    run: "Run stance read", rerun: "Run again", running: "Reading the coverage…", runSlow: "Collecting headlines first (up to a minute), then judging. About 20 seconds more.", conf: "Confidence", narratives: "Narratives", watch: "What would shift it", evidence: "Evidence", cost: "Cost", cachedL: "cached", left: "new reads left this hour", based: "headlines judged",
    stanceNote: "Judged from headlines only, not full articles. A read of what is published, not an intelligence assessment.", social: "Social media", socialNote: "No compliant free source exists for live social posts, so none are shown rather than guessed.",
    xName: "X / Twitter", xWhy: "Unavailable: the API is paid, and scraping breaks its terms.", bskyName: "Bluesky", bskyWhy: "Anonymous search is blocked. Needs an account login.", redditName: "Reddit", redditWhy: "Needs an approved API app.", ytName: "YouTube", ytWhy: "Needs a free API key.", tgName: "Telegram", tgWhy: "Unavailable: scraping channels breaks its terms.",
    radar: "UAE image abroad", radarIntro: "How each country's outlets report on events involving the UAE, as average tone over 45 days, against the world average. Tone, not stance: open a country for the stance read.", cool: "Coolest coverage", warm: "Warmest coverage", openC: "Open", building: "The world comparison is being built (a long job because GDELT limits requests). Check back soon.", partial: "Partial results", asOf: "Data built", src: "Source" },
  ar: { toUae: "تجاه الإمارات", toCountry: "تجاه", intro: "كيف تؤطّر وسائل الإعلام ومراكز الفكر الإمارات (إعلام الدولة نفسها) أو هذه الدولة (الإعلام الإماراتي). النبرة مجانية ومتاحة دائمًا؛ أما قراءة الموقف فحكم ذكاء اصطناعي تبدؤه بنفسك.",
    toneTitle: "نبرة التغطية", toneAbout: "متوسط نبرة الأحداث التي تخص الإمارات كما ترصدها منابر هذه الدولة (GDELT)، آخر 45 يومًا", toneOut: "متوسط نبرة مقالات الإعلام الإماراتي التي تذكر", world: "المتوسط العالمي", vsWorld: "مقابل المتوسط العالمي", below: "أكثر سلبية", above: "أكثر إيجابية", rank: "الأكثر إيجابية", of: "من", measured: "دولة مقيسة",
    thin: "التغطية قليلة جدًا لحساب متوسط موثوق.", toneNote: "النبرة تقيس مدى سلبية صياغة المقالات لا عدائية المنابر: أخبار الحرب والجريمة تسجّل منخفضة أيًا كان الموقف. استخدمها للمقارنة، واستخدم قراءة الموقف للحكم على الاتجاه.", noMap: "المقارنة العالمية قيد البناء.",
    neg: "أشد التغطيات سلبية", pos: "أكثر التغطيات إيجابية", rankedBy: "مرتبة حسب النبرة (GDELT)، آخر 14 يومًا. قد تكون العناوين مترجمة أو بلغتها الأصلية.", none: "لا شيء في آخر 14 يومًا.", loading: "جارٍ التحميل…", slow: "يحدّ GDELT من الطلبات، لذا تستغرق أول نظرة على دولة نحو دقيقة.",
    tanks: "مراكز الفكر", onUae: "عن الإمارات", onCountry: "عن", both: "الاثنان", tanksNote: "مواد حديثة من CFR وتشاتام هاوس وكارنيغي وبروكنغز والمجلس الأطلسي ومعهد الشرق الأوسط ومعهد واشنطن وCSIS ورند ومجموعة الأزمات وIISS وAGSIW وغيرها (عبر البحث في مواقعها).",
    stance: "قراءة الموقف (ذكاء اصطناعي)", stanceIntro: "يقرأ الذكاء الاصطناعي العناوين أعلاه مع عناوين مراكز الفكر ويصنّف كل عنوان: عدائي أو ناقد أو محايد أو ودّي أو داعم، مع الأدلة. لا يعمل إلا بضغطتك وكل تشغيل جديد يُحتسب على حساب Anthropic (نحو 2–4 سنتات)؛ والنتائج مخزّنة 3 ساعات.",
    run: "تشغيل قراءة الموقف", rerun: "تشغيل مجددًا", running: "جارٍ قراءة التغطية…", runSlow: "جمع العناوين أولًا (حتى دقيقة) ثم الحكم عليها. نحو 20 ثانية إضافية.", conf: "الثقة", narratives: "السرديات", watch: "ما قد يغيّر الصورة", evidence: "الأدلة", cost: "التكلفة", cachedL: "مخزّن", left: "قراءات جديدة متبقية هذه الساعة", based: "عنوانًا جرى تقييمه",
    stanceNote: "حكم من العناوين فقط لا من المقالات الكاملة. قراءة لما يُنشر وليست تقييمًا استخباريًا.", social: "وسائل التواصل", socialNote: "لا يوجد مصدر مجاني ومتوافق للمنشورات الحية، لذا لا نعرض شيئًا بدل التخمين.",
    xName: "إكس / تويتر", xWhy: "غير متاح: الواجهة مدفوعة والاستخراج يخالف شروطها.", bskyName: "بلو سكاي", bskyWhy: "البحث المجهول محجوب. يتطلب تسجيل دخول.", redditName: "ريديت", redditWhy: "يتطلب تطبيق واجهة معتمدًا.", ytName: "يوتيوب", ytWhy: "يتطلب مفتاحًا مجانيًا.", tgName: "تيليغرام", tgWhy: "غير متاح: استخراج القنوات يخالف شروطه.",
    radar: "صورة الإمارات في الخارج", radarIntro: "كيف ترصد منابر كل دولة الأحداث التي تخص الإمارات، بمتوسط النبرة خلال 45 يومًا مقابل المتوسط العالمي. نبرة لا موقف: افتح دولة لقراءة الموقف.", cool: "الأبرد تغطية", warm: "الأدفأ تغطية", openC: "فتح", building: "المقارنة العالمية قيد البناء (مهمة طويلة لأن GDELT يحدّ الطلبات). عد قريبًا.", partial: "نتائج جزئية", asOf: "تاريخ البناء", src: "المصدر" },
} as const;

const day = (ts: number, lang: "en" | "ar") => new Date(ts).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short" });
const VERDICT_LABEL: Record<Verdict, { en: string; ar: string }> = { hostile: { en: "Hostile", ar: "عدائي" }, critical: { en: "Critical", ar: "ناقد" }, neutral: { en: "Neutral", ar: "محايد" }, friendly: { en: "Friendly", ar: "ودّي" }, supportive: { en: "Supportive", ar: "داعم" }, mixed: { en: "Mixed", ar: "متباين" } };

function ItemList({ items, lang, empty }: { items: Item[]; lang: "en" | "ar"; empty: string }) {
  if (!items.length) return <p className="text-[12.5px] text-t2">{empty}</p>;
  return <ul className="divide-y divide-line/60">{items.map((it) => (
    <li key={it.id} className="py-2"><a href={it.url} target="_blank" rel="noreferrer noopener" className="text-[13px] leading-snug text-t0 hover:text-accent">{it.title}</a>
      <div className="num mt-0.5 text-[10.5px] text-t2">{it.outlet} · {day(it.ts, lang)}</div></li>))}</ul>;
}

function Gauge({ avg, base }: { avg: number; base: number }) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v + 5) / 10) * 100))}%`;
  return (
    <div className="relative mt-2 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#ff5d73,#ffb547 35%,#9db0cf 50%,#3ddcff 65%,#2de39a)" }} role="img" aria-label={`tone ${avg}, world ${base}`}>
      <i className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-t0/70" style={{ insetInlineStart: pos(base) }} />
      <i className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg0 bg-t0 shadow" style={{ insetInlineStart: pos(avg) }} />
    </div>
  );
}
function Spark({ pts }: { pts: { t: number; v: number }[] }) {
  if (pts.length < 2) return null; const w = 300, h = 54; const vs = pts.map((p) => p.v); const lo = Math.min(...vs, -1), hi = Math.max(...vs, 1); const x = (i: number) => (i / (pts.length - 1)) * w, y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  return <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-[54px] w-full" preserveAspectRatio="none" aria-hidden><line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-line" strokeDasharray="3 3" /><polyline fill="none" stroke="var(--accent)" strokeWidth="1.8" points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} /></svg>;
}

/** Media radar for one country: tone toward the UAE (or toward the country from UAE media), the sharpest and warmest coverage, think tanks, and an opt-in AI stance read. */
export function MediaTab({ c }: { c: Country }) {
  const { lang } = useT(); const map = useToneMap();
  return c.iso3 === "ARE" ? <UaeRadar map={map} lang={lang} /> : <CountryMedia c={c} map={map} lang={lang} />;
}

function CountryMedia({ c, map, lang }: { c: Country; map: ToneMap | null | undefined; lang: "en" | "ar" }) {
  const u = UI[lang]; const [dir, setDir] = useState<Dir>("in"); const m = useMedia(c.iso3, dir); const [tankTab, setTankTab] = useState<"uae" | "country" | "shared">("uae");
  const name = c.name.replace(/,.*$/, ""); const nm = map?.countries[c.iso3]; const base = map?.global.avg;
  const ranked = useMemo(() => (map ? Object.entries(map.countries).filter(([, v]) => v.avg != null).sort((a, b) => (b[1].avg as number) - (a[1].avg as number)) : []), [map]);
  const rank = ranked.findIndex(([k]) => k === c.iso3) + 1; const tone = m.tone.data; const avg = dir === "in" ? (nm?.avg ?? tone?.avg ?? null) : (tone?.avg ?? null);
  const tanks = m.tanks.data; const tankItems = tanks ? (tankTab === "uae" ? tanks.uae : tankTab === "country" ? tanks.country : tanks.shared) : [];
  return (
    <div className="space-y-3">
      <div role="tablist" className="glass flex gap-1 rounded-[10px] p-1">
        {(["in", "out"] as const).map((d) => <button key={d} role="tab" aria-selected={dir === d} onClick={() => setDir(d)} className={`h-8 flex-1 rounded-[8px] text-[12.5px] font-medium transition-colors ${dir === d ? "bg-accent text-[var(--accent-ink)]" : "text-t1 hover:text-t0"}`}>{d === "in" ? u.toUae : `${u.toCountry} ${name}`}</button>)}
      </div>
      <p className="text-[12px] leading-snug text-t2">{u.intro}</p>
      <Card title={u.toneTitle} icon="📡">
        <div className="text-[12px] text-t1">{dir === "in" ? u.toneAbout : `${u.toneOut} ${name}, 30d`}</div>
        {avg == null ? (m.tone.loading && dir === "out" ? <Skeleton h={50} className="mt-2" /> : <p className="mt-2 text-[12.5px] text-t2">{map === null || (dir === "in" && !nm) ? u.noMap : u.thin}</p>) : (
          <>
            <div className="num mt-1 flex items-baseline gap-3"><span className="text-[28px] font-semibold text-t0">{avg > 0 ? "+" : ""}{avg.toFixed(1)}</span>
              {dir === "in" && base != null && <span className="text-[12.5px] text-t1">{Math.abs(avg - base).toFixed(1)} {avg < base ? u.below : u.above} {u.vsWorld} ({base.toFixed(1)})</span>}
              {dir === "in" && nm?.trend != null && Math.abs(nm.trend) >= 0.3 && <span className={`inline-flex items-center gap-0.5 text-[12px] ${nm.trend > 0 ? "text-up" : "text-down"}`}>{nm.trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{nm.trend > 0 ? "+" : ""}{nm.trend.toFixed(1)}</span>}
              {dir === "in" && nm?.trend != null && Math.abs(nm.trend) < 0.3 && <Minus size={14} className="text-t2" />}</div>
            {dir === "in" && base != null && <Gauge avg={avg} base={base} />}
            {dir === "in" && rank > 0 && <p className="num mt-1.5 text-[11.5px] text-t2">#{rank} {u.rank} {u.of} {ranked.length} {u.measured}</p>}
          </>
        )}
        {m.tone.loading ? <Skeleton h={54} className="mt-2" /> : m.tone.data && <Spark pts={m.tone.data.points} />}
        {m.tone.err && avg == null && <p className="mt-1 text-[11.5px] text-down">{m.tone.err}</p>}
        <p className="mt-2 text-[11px] leading-snug text-t2">{u.toneNote}</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-1">
        {([["neg", u.neg, m.neg], ["pos", u.pos, m.pos]] as const).map(([k, title, slot]) => (
          <Card key={k} title={title} icon={k === "neg" ? "🔻" : "🔺"}>
            {slot.loading ? <><Skeleton h={44} className="mb-2" /><Skeleton h={44} /><p className="mt-2 text-[11px] text-t2">{u.slow}</p></> : slot.err ? <p className="text-[12px] text-down">{slot.err}</p> : <ItemList items={slot.data?.items ?? []} lang={lang} empty={u.none} />}
            <p className="mt-1 text-[10.5px] text-t2">{u.rankedBy}</p>
          </Card>))}
      </div>
      <Card title={u.tanks} icon="🏛">
        <div className="mb-2 flex gap-1.5">{(["uae", "country", "shared"] as const).map((t) => <button key={t} onClick={() => setTankTab(t)} aria-pressed={tankTab === t} className={`rounded-full border px-2.5 py-1 text-[11.5px] ${tankTab === t ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:border-accent"}`}>{t === "uae" ? u.onUae : t === "country" ? `${u.onCountry} ${name}` : u.both}{tanks ? ` ${(t === "uae" ? tanks.uae : t === "country" ? tanks.country : tanks.shared).length}` : ""}</button>)}</div>
        {m.tanks.loading ? <Skeleton h={60} /> : m.tanks.err ? <p className="text-[12px] text-down">{m.tanks.err}</p> : <ItemList items={tankItems} lang={lang} empty={u.none} />}
        <p className="mt-1 text-[10.5px] leading-snug text-t2">{u.tanksNote}</p>
      </Card>
      <StanceCard iso3={c.iso3} name={name} lang={lang} />
      <Card title={u.social} icon="💬">
        <ul className="space-y-1.5 text-[12.5px]">{[[u.xName, u.xWhy], [u.bskyName, u.bskyWhy], [u.redditName, u.redditWhy], [u.ytName, u.ytWhy], [u.tgName, u.tgWhy]].map(([n, w]) => <li key={n}><span className="font-medium text-t0">{n}</span> <span className="text-t2">· {w}</span></li>)}</ul>
        <p className="mt-2 text-[11px] text-t2">{u.socialNote}</p>
      </Card>
    </div>
  );
}

function StanceCard({ iso3, name, lang }: { iso3: string; name: string; lang: "en" | "ar" }) {
  const u = UI[lang]; const key = `gd-stance:${iso3}:${lang}`; const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle"); const [res, setRes] = useState<StanceResult | null>(null); const [err, setErr] = useState("");
  const [status, setStatus] = useState<{ enabled: boolean; model: string; remainingThisHour: number } | null>(null); const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const t0 = setTimeout(() => { try { const s = localStorage.getItem(key); if (s) { setRes(JSON.parse(s)); setPhase("done"); } else { setRes(null); setPhase("idle"); } } catch { setRes(null); setPhase("idle"); } setErr(""); }, 0);
    fetch(`/api/media/${iso3}/stance`).then((r) => r.json()).then(setStatus).catch(() => {});
    return () => { clearTimeout(t0); abort.current?.abort(); };
  }, [key, iso3]);
  const run = async (refresh: boolean) => {
    abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("running"); setErr("");
    try {
      const r = await fetch(`/api/media/${iso3}/stance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, refresh }), signal: ac.signal }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
      setRes(j); setPhase("done"); try { localStorage.setItem(key, JSON.stringify(j)); } catch {} fetch(`/api/media/${iso3}/stance`).then((x) => x.json()).then(setStatus).catch(() => {});
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr((e as Error).message); setPhase("error"); } }
  };
  const byId = new Map((res?.items ?? []).map((i) => [i.id, i])); const judged = res?.read.items ?? [];
  const dist = (target: "uae" | "country") => STANCES.map((s) => ({ s, n: judged.filter((i) => i.target === target && i.stance === s).length })); const tot = (target: "uae" | "country") => judged.filter((i) => i.target === target).length;
  if (status && !status.enabled) return null;
  return (
    <Card title={u.stance} icon="🧠">
      {phase !== "done" && phase !== "running" && (
        <>
          <p className="text-[12.5px] leading-relaxed text-t1">{u.stanceIntro}</p>
          <button onClick={() => run(false)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><Sparkles size={15} />{u.run}</button>
          {status && <p className="num mt-2 text-[11px] text-t2">{status.model} · {status.remainingThisHour} {u.left}</p>}
        </>
      )}
      {phase === "running" && <div role="status"><Skeleton h={14} className="mb-2 w-2/3" /><Skeleton h={12} className="mb-2" /><Skeleton h={12} className="w-5/6" /><p className="mt-3 text-[12.5px] text-t1">{u.running} {u.runSlow}</p></div>}
      {phase === "error" && <div role="alert" className="rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px]">{err}<button onClick={() => run(false)} className="ms-3 underline">{u.run}</button></div>}
      {phase === "done" && res && (
        <div className="space-y-3">
          {([["uae", `${u.toUae}`, res.read.toUae], ["country", `${u.toCountry} ${name}`, res.read.toCountry]] as const).map(([t, label, v]) => (
            <div key={t} className="rounded-[10px] border border-line bg-bg2 p-3">
              <div className="flex items-center justify-between gap-2"><span className="label">{label}</span><span className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: COLOR[v.verdict] + "26", color: COLOR[v.verdict] }}>{VERDICT_LABEL[v.verdict][lang]}</span></div>
              <p className="mt-1.5 text-[13px] leading-snug text-t0">{v.summary}</p>
              {tot(t) > 0 && <><div className="mt-2 flex h-2 overflow-hidden rounded-full" role="img" aria-label={dist(t).map((d) => `${d.s} ${d.n}`).join(", ")}>{dist(t).filter((d) => d.n).map((d) => <i key={d.s} style={{ width: `${(d.n / tot(t)) * 100}%`, background: COLOR[d.s] }} />)}</div>
                <p className="num mt-1 text-[10.5px] text-t2">{dist(t).filter((d) => d.n).map((d) => `${d.n} ${VERDICT_LABEL[d.s][lang].toLowerCase()}`).join(" · ")} ({tot(t)} {u.based})</p></>}
            </div>))}
          <p className="num text-[11px] text-t2">{u.conf}: {res.read.confidence}</p>
          {!!res.read.narratives.length && <div><h4 className="label mb-1.5">{u.narratives}</h4><ul className="space-y-2">{res.read.narratives.map((n, i) => (
            <li key={i} className="text-[12.5px]"><span className="me-1.5 inline-block size-2 rounded-full align-middle" style={{ background: n.tone === "critical" ? COLOR.critical : n.tone === "friendly" ? COLOR.friendly : COLOR.neutral }} /><span className="font-medium text-t0">{n.label}</span>
              <div className="mt-0.5 flex flex-wrap gap-1">{n.ids.map((id) => { const it = byId.get(id); return it ? <a key={id} href={it.url} target="_blank" rel="noreferrer noopener" title={it.title} className="num inline-flex items-center gap-0.5 rounded bg-bg3 px-1.5 text-[10.5px] text-t1 hover:text-accent">{it.outlet.replace(/^www\./, "")}<ExternalLink size={9} /></a> : null; })}</div></li>))}</ul></div>}
          <details className="rounded-[10px] border border-line bg-bg1/60 p-3 text-[12px]"><summary className="cursor-pointer text-t0">{u.evidence} ({judged.length})</summary>
            <ul className="mt-2 space-y-2">{judged.map((j) => { const it = byId.get(j.id); if (!it) return null; return (
              <li key={j.id}><span className="me-1.5 inline-block size-2 rounded-full align-middle" style={{ background: COLOR[j.stance] }} /><a href={it.url} target="_blank" rel="noreferrer noopener" className="text-t0 hover:text-accent">{it.title}</a>
                <div className="num text-[10.5px] text-t2">{VERDICT_LABEL[j.stance][lang]} · {j.target === "uae" ? "UAE" : name} · {it.outlet} — {j.reason}</div></li>); })}</ul></details>
          <p className="text-[12px] text-t1"><b>{u.watch}:</b> {res.read.watch}</p>
          <div className="flex items-center gap-3 border-t border-line pt-2"><span className="num text-[11px] text-t2">{res.model} · {u.cost} {res.usage.usd != null ? `$${res.usage.usd.toFixed(3)}` : "n/a"}{res.cached ? ` · ${u.cachedL}` : ""} · {res.at.slice(0, 16).replace("T", " ")} UTC</span>
            <button onClick={() => run(true)} className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><RefreshCw size={13} />{u.rerun}</button></div>
          <p className="text-[11px] leading-snug text-t2">{u.stanceNote}</p>
        </div>)}
    </Card>
  );
}

/** For the UAE itself: who covers it coolest and warmest, from the precomputed world tone map. */
function UaeRadar({ map, lang }: { map: ToneMap | null | undefined; lang: "en" | "ar" }) {
  const u = UI[lang]; const select = useStore((s) => s.select); const cs = useCountries();
  const rows = useMemo(() => (map ? Object.entries(map.countries).filter(([, v]) => v.avg != null).sort((a, b) => (a[1].avg as number) - (b[1].avg as number)) : []), [map]);
  if (map === undefined) return <Skeleton h={160} />;
  if (!map || !rows.length) return <Card title={u.radar} icon="📡"><p className="text-[12.5px] text-t1">{u.building}</p></Card>;
  const list = (title: string, items: typeof rows) => (
    <Card title={title}><ul className="divide-y divide-line/60">{items.map(([k, v]) => { const co = cs?.byIso.get(k); return (
      <li key={k} className="flex items-center justify-between gap-2 py-1.5 text-[13px]"><button onClick={() => select(k, "media")} className="flex min-w-0 items-center gap-2 text-start hover:text-accent"><span aria-hidden>{co?.flag}</span><span className="truncate">{co ? (lang === "ar" && co.nameAr ? co.nameAr : co.name) : k}</span></button>
        <span className="num shrink-0 text-t1">{(v.avg as number) > 0 ? "+" : ""}{(v.avg as number).toFixed(1)} <span className="text-t2">({((v.avg as number) - map.global.avg > 0 ? "+" : "") + ((v.avg as number) - map.global.avg).toFixed(1)})</span></span></li>); })}</ul></Card>);
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-t1">{u.radarIntro}</p>
      <div className="num rounded-[10px] border border-line bg-bg2 p-3 text-[12.5px] text-t1">{u.world}: <b className="text-t0">{map.global.avg.toFixed(1)}</b> · {map.coverage ? `${map.coverage.measured} ${u.of} ${map.coverage.total}` : rows.length} {u.measured}</div>
      {list(u.cool, rows.slice(0, 10))}{list(u.warm, rows.slice(-10).reverse())}
      <p className="text-[11px] leading-snug text-t2">{map.source?.note} {u.asOf} {map.built.slice(0, 10)}. {u.src}: <a className="underline hover:text-accent" href={map.source?.url ?? "https://www.gdeltproject.org/"} target="_blank" rel="noreferrer noopener">GDELT</a>.</p>
    </div>
  );
}
