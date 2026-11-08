"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Scale, X } from "lucide-react";
import { useT } from "@/lib/store";
import { Block, CountryPicker, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { CompareBoard } from "./CompareBoard";
import { initialRank, type RankState } from "./CompareRank";
import { CompareAsk, SAVED_KEY, type SavedCompare } from "./CompareAsk";
import { colorOf } from "./CompareVisuals";
import { profileInputsFor } from "@/lib/agent/data";
import { extrasFor, loadExtras, type ExtrasBundle } from "@/lib/compare-extras";
import type { ProfileInputs } from "@/lib/bird/profile";
import { MAX_COUNTRIES, MIN_COUNTRIES, angleEvidence, buildCompareCountry, catalogue, compareEvidence, factsEvidence, nameOf, relationEvidence, split } from "@/lib/compare";
import { PURPOSE_BY, rankCountries, rankEvidence } from "@/lib/compare-rank";
import { playEvidence, sequence, sequenceEvidence } from "@/lib/compare-playbook";
import { bestConnected, briefed, largestPartners, neighboursOf, sameRegion } from "@/lib/compare-presets";
import { loadTrade } from "@/lib/intel-client";
import { loadFlights } from "@/lib/flights-client";
import { INFO, readHeld } from "@/lib/bird/runner";
import { compareHtml } from "@/lib/compare-html";
import { classification } from "@/lib/case/report";
import { downloadHtmlReport } from "@/lib/reportpdf";

const PICK_KEY = "gd-compare-pick"; const OFF_KEY = "gd-compare-off";
const readJson = <T,>(k: string, ok: (x: unknown) => x is T): T | null => { try { const j = JSON.parse(localStorage.getItem(k) ?? "null") as unknown; return ok(j) ? j : null; } catch { return null; } };
const isos = (x: unknown): x is string[] => Array.isArray(x) && x.every((i) => typeof i === "string" && /^[A-Z]{3}$/.test(i));
const isSaved = (x: unknown): x is SavedCompare => !!x && typeof x === "object" && typeof (x as SavedCompare).text === "string" && isos((x as SavedCompare).isos);

/** COMPARE: two to four countries side by side. The comparison itself is free (rule-built from the held data, with the UAE relationship, trade and investment, flights, instruments, strategic profile and rivals, as a radar, small multiples and a sortable table with the leader of each figure marked); below it, a box to ask the agents a specific comparative question, which they answer in the format asked after you confirm the cost; and a PDF of the comparison and the answer. */
export function CompareApp() {
  const { lang } = useT(); const L = lang as Lang; const t = (en: string, ar: string) => (L === "ar" ? ar : en); const { list, by } = useCountryList();
  const [picked, setPicked] = useState<string[]>([]); const [ready, setReady] = useState(false); const [inputs, setInputs] = useState<Record<string, ProfileInputs | "err">>({}); const started = useRef(new Set<string>()); const [off, setOffState] = useState<Set<string>>(new Set()); const [saved, setSavedState] = useState<SavedCompare | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [rank, setRank] = useState<RankState>(() => initialRank()); const [asOf, setAsOf] = useState(""); const [presetBusy, setPresetBusy] = useState(""); const [extras, setExtras] = useState<ExtrasBundle | null>(null);
  useEffect(() => { const k = setTimeout(() => { const q = new URLSearchParams(location.search).get("c"); const fromUrl = q ? q.toUpperCase().split(",").filter((i) => /^[A-Z]{3}$/.test(i) && i !== "ARE") : []; const s = readJson(SAVED_KEY, isSaved); const stored = readJson(PICK_KEY, isos); const first = (fromUrl.length ? fromUrl : stored?.length ? stored : s?.isos ?? []).filter((i, n, a) => a.indexOf(i) === n).slice(0, MAX_COUNTRIES); setPicked(first); setSavedState(s); setOffState(new Set(readJson(OFF_KEY, isos) ?? [])); setAsOf(new Date().toISOString().slice(0, 10)); setReady(true); }, 0); return () => clearTimeout(k); }, []);
  useEffect(() => { let dead = false; loadExtras().then((x) => { if (!dead) setExtras(x); }).catch(() => {}); return () => { dead = true; }; }, []);
  useEffect(() => { for (const iso of picked) { if (started.current.has(iso)) continue; started.current.add(iso); profileInputsFor(iso, "en", { news: false }).then((i) => setInputs((x) => ({ ...x, [iso]: i ?? "err" }))).catch(() => setInputs((x) => ({ ...x, [iso]: "err" }))); } }, [picked]);
  const choose = (next: string[]) => { setPicked(next); try { localStorage.setItem(PICK_KEY, JSON.stringify(next)); const u = new URL(location.href); if (next.length) u.searchParams.set("c", next.join(",")); else u.searchParams.delete("c"); history.replaceState(null, "", u); } catch { /* the choice still applies for this visit */ } };
  const setOff = (s: Set<string>) => { setOffState(s); try { localStorage.setItem(OFF_KEY, JSON.stringify([...s])); } catch { /* ignore */ } };
  const setSaved = (s: SavedCompare | null) => setSavedState(s);
  const cs = useMemo(() => (extras ? picked.map((i) => inputs[i]).filter((x): x is ProfileInputs => !!x && x !== "err").map((i) => buildCompareCountry({ ...i, lang }, extrasFor(extras, i.d.iso3))) : []), [picked, inputs, lang, extras]);
  const active = useMemo(() => split(catalogue(cs), cs).shown.filter((m) => !off.has(m.id)), [cs, off]);
  const shownAll = useMemo(() => split(catalogue(cs), cs).shown, [cs]); const rows = useMemo(() => rankCountries(cs, rank.weights, shownAll, rank.strict), [cs, rank, shownAll]); const purpose = PURPOSE_BY.get(rank.purposeId); const purposeName = purpose ? (L === "ar" ? purpose.ar : purpose.en) : rank.purposeId;
  const labels = useMemo(() => Object.fromEntries(shownAll.map((m) => [m.id, L === "ar" ? m.ar : m.en])), [shownAll, L]);
  const evidence = () => [{ name: "Held data side by side", text: compareEvidence(cs, active, L) }, { name: "Rule-built playbook lines, ranking, sequence, angles and the UAE position", text: [playEvidence(cs, L), rankEvidence(rows, cs, shownAll, purposeName, rank.weights, L), sequenceEvidence(sequence(cs, rows.map((r) => r.iso), L, asOf), purposeName, asOf), angleEvidence(cs, L), relationEvidence(cs, L), factsEvidence(cs, L)].join("\n\n") }];
  const loading = extras ? picked.filter((i) => !inputs[i]) : picked; const failed = picked.filter((i) => inputs[i] === "err"); const name = (iso: string) => { const c = by.get(iso); return c ? nameOf({ name: c.name, nameAr: c.nameAr ?? null }, L) : iso; };
  const can = cs.length >= MIN_COUNTRIES && loading.length === 0;
  const preset = async (id: "neighbours" | "region" | "partners" | "air" | "briefed") => {
    setPresetBusy(id); setErr("");
    try {
      const first = picked[0]; let next: string[] = [];
      if (id === "neighbours" && first) { const i = inputs[first]; next = i && i !== "err" ? neighboursOf(i.d) : []; }
      else if (id === "region" && first) next = sameRegion(list, first, await loadTrade().catch(() => null));
      else if (id === "partners") { const t = await loadTrade().catch(() => null); next = t ? largestPartners(t) : []; }
      else if (id === "air") { const f = await loadFlights().catch(() => null); next = f ? bestConnected(f) : []; }
      else if (id === "briefed") next = briefed(list.map((c) => c.iso3), (iso) => Object.values(INFO).filter((x) => !!readHeld(x.key(iso))).length);
      if (next.length >= MIN_COUNTRIES) choose(next); else setErr(id === "briefed" ? t("Fewer than two countries have a desk product on file in this browser.", "أقل من دولتين لها منتج مكتب محفوظ في هذا المتصفح.") : t("That set could not be read from the held data (or needs a first country chosen).", "تعذّر قراءة هذه المجموعة من البيانات المحفوظة (أو تحتاج إلى اختيار دولة أولى)."));
    } finally { setPresetBusy(""); }
  };
  const pdf = async (withAnswer: boolean) => {
    if (!can) return; setBusy(true); setErr("");
    try {
      const at = new Date().toISOString(); const names = cs.map((c) => nameOf(c, L)); const title = `${t("Country comparison", "مقارنة بين الدول")}: ${names.join(" · ")}`; const a = withAnswer && saved && saved.isos.join() === cs.map((c) => c.iso).join() ? { message: saved.message, text: saved.text, depts: saved.depts, usd: saved.usd } : null;
      await downloadHtmlReport(compareHtml(cs, active, L, { title, foot: `Geo Desk · ${at.slice(0, 10)}`, classification: classification(L), date: at.slice(0, 10), answer: a, rank: { purposeName, rows, labels, strict: rank.strict }, seq: sequence(cs, rows.map((r) => r.iso), L, asOf) }), { id: `compare:${cs.map((c) => c.iso).join("-")}:${at}`, iso: cs[0].iso, country: names.join(" · "), kind: "compare", title, lang: L, at, usd: a ? saved!.usd : null }, `compare-${cs.map((c) => c.iso).join("-")}-${at.slice(0, 10)}.pdf`);
    } catch { setErr(t("Could not make the PDF.", "تعذّر إعداد PDF.")); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 px-1 pb-10">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Scale size={22} aria-hidden /></span>{t("Compare", "مقارنة")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("Put two to four countries side by side: the UAE's relationship with each, trade and investment, flights, the instruments, the strategic profile and the rivals. The comparison is free and built from the data the platform holds; a figure that is not held says so. Then ask the agents a specific question about the countries and get a report in the format you need.", "ضع من دولتين إلى أربع دول جنبًا إلى جنب: علاقة الإمارات بكل منها والتجارة والاستثمار والرحلات والأدوات والملف الاستراتيجي والمنافسين. المقارنة مجانية ومبنية على بيانات المنصة؛ والرقم غير المحفوظ يُذكر كذلك. ثم اسأل الوكلاء سؤالًا محددًا عن الدول واحصل على تقرير بالصيغة التي تحتاجها.")}</p></header>

      <Block title={t("The countries", "الدول")} hint={t(`Choose two to four (${picked.length} chosen). The first is drawn in blue, the others in the colours shown.`, `اختر من دولتين إلى أربع (${picked.length} مختارة). تُرسم الأولى بالأزرق والبقية بالألوان الظاهرة.`)} right={<div className="flex shrink-0 flex-wrap items-center gap-2">{can && <button type="button" onClick={() => void pdf(false)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[12px] text-t0 hover:border-accent disabled:opacity-50"><FileDown size={13} aria-hidden />{busy ? t("Making the PDF…", "جارٍ إعداد PDF…") : t("PDF: the comparison", "PDF: المقارنة")}</button>}</div>}>
        <div className="flex flex-wrap items-start gap-3"><div className="min-w-60 flex-1"><CountryPicker list={list} value={null} onPick={(iso) => { if (picked.length < MAX_COUNTRIES && !picked.includes(iso)) choose([...picked, iso]); }} L={L} /></div>
          <ul className="flex flex-wrap gap-1.5" aria-label={t("Chosen countries", "الدول المختارة")}>{picked.map((iso, n) => { const c = by.get(iso); const col = colorOf(cs.length ? cs : [], iso); return <li key={iso} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-bg2 ps-3 pe-1.5 text-[13px] text-t0"><i className="inline-block size-2.5 rounded-full" style={{ background: cs.some((x) => x.iso === iso) ? col : ["#0a7ea4", "#d9731a", "#6d4bd8", "#0e9f6e"][n % 4] }} />{c?.flag} {name(iso)}{loading.includes(iso) && <span className="text-[11px] text-t2">{t("loading…", "جارٍ التحميل…")}</span>}{failed.includes(iso) && <span className="text-[11px] text-risk">{t("no data", "لا بيانات")}</span>}<button type="button" aria-label={`${t("Remove", "أزل")} ${name(iso)}`} onClick={() => choose(picked.filter((x) => x !== iso))} className="grid size-7 place-items-center rounded-full text-t2 hover:bg-bg3 hover:text-t0"><X size={14} aria-hidden /></button></li>; })}{picked.length > 0 && <li><button type="button" onClick={() => choose([])} className="h-10 px-2 text-[12px] text-accent hover:underline">{t("Clear", "مسح")}</button></li>}</ul></div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={t("Preset sets", "مجموعات جاهزة")}><span className="text-[11.5px] text-t2">{t("Preset sets:", "مجموعات جاهزة:")}</span>{([["neighbours", t("Neighbours of the first", "جيران الأولى"), !picked[0]], ["region", t("Same region as the first", "إقليم الأولى"), !picked[0]], ["partners", t("UAE's largest trade partners", "أكبر شركاء الإمارات التجاريين"), false], ["air", t("Best connected by air", "الأفضل ربطًا جويًا"), false], ["briefed", t("Already briefed", "التي أُعدّت عنها إحاطات"), false]] as const).map(([id, label, off2]) => <button key={id} type="button" disabled={off2 || !!presetBusy} onClick={() => void preset(id)} className="h-7 rounded-full border border-line bg-bg2 px-2.5 text-[11.5px] text-t1 hover:border-accent hover:text-accent disabled:opacity-50">{presetBusy === id ? "…" : label}</button>)}</div>
        {picked.length >= MAX_COUNTRIES && <p className="mt-1.5 text-[11.5px] text-t2">{t("Four is the most the page compares. Remove one to add another.", "أربع دول هي الحد الأقصى للمقارنة. أزل واحدة لتضيف أخرى.")}</p>}
        {failed.length > 0 && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{t("The Case File could not be loaded for: ", "تعذّر تحميل ملف الحالة لـ: ")}{failed.map(name).join(", ")}. {t("Remove it or try again later.", "أزلها أو أعد المحاولة لاحقًا.")}</p>}
        {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{err}</p>}
      </Block>

      {ready && picked.length < MIN_COUNTRIES && <p className="rounded-[14px] border border-dashed border-line p-5 text-[13px] text-t1">{t("Choose at least two countries above to see them side by side.", "اختر دولتين على الأقل أعلاه لتراهما جنبًا إلى جنب.")}</p>}
      {picked.length >= MIN_COUNTRIES && cs.length < MIN_COUNTRIES && loading.length > 0 && <p className="rounded-[14px] border border-line p-5 text-[13px] text-t1" role="status">{t("Loading the held data…", "جارٍ تحميل البيانات المحفوظة…")}</p>}
      {cs.length >= MIN_COUNTRIES && <CompareBoard cs={cs} L={L} off={off} setOff={setOff} names={name} active={active} rank={rank} setRank={setRank} rows={rows} asOf={asOf} />}
      {cs.length >= MIN_COUNTRIES && <CompareAsk L={L} cs={cs} evidence={evidence} saved={saved} setSaved={setSaved} onPdf={() => void pdf(true)} pdfBusy={busy} />}
      <p className="text-[11.5px] leading-snug text-t2">{t("Every figure comes from the datasets the platform holds, with the year it refers to in each country's own profile (Bird's eye view). Nothing is estimated: a figure that is not held shows as not held, and a leader is named only where at least two countries hold the figure and differ. Proposals written by the agents are for a human decision; nothing is sent to anyone.", "كل رقم من مجموعات البيانات المحفوظة في المنصة، وسنته في ملف كل دولة (نظرة الطائر). لا شيء مقدَّر: الرقم غير المحفوظ يظهر كذلك، ولا يُسمّى متقدّم إلا إذا توافر الرقم لدولتين على الأقل واختلفا. المقترحات التي يكتبها الوكلاء لقرار بشري؛ ولا يُرسل شيء إلى أحد.")}</p>
    </div>
  );
}
