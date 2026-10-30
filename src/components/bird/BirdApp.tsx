"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Binoculars, FileDown, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useFollowCountry } from "@/lib/country";
import type { CaseData } from "@/lib/case/load";
import { birdMarkdown, consolidate, type Bird, type Inputs, type Prod } from "@/lib/bird/consolidate";
import { mdToHtml } from "@/lib/dossier/export";
import { stripReviewJson } from "@/lib/review/pair";
import { birdHtml } from "@/lib/bird/visual";
import { classification } from "@/lib/case/report";
import { readTrack } from "@/lib/mofa/track";
import { downloadHtmlReport, readSourceByKey } from "@/lib/reportpdf";
import { regionLabel } from "@/lib/regions";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { Complete } from "./Complete";
import { BirdReport } from "./BirdReport";
import { CountryProfile } from "./CountryProfile";
import { ScoreCard } from "./ScoreCard";
import { scoreCountry } from "@/lib/bird/score";
import { scoreHtml } from "@/lib/bird/scoreHtml";
import { AskPanel, type Saved as AskSaved } from "../agent/AskPanel";
import { Block } from "../falcon/bits";
import { CountryBriefPanel } from "./CountryBriefPanel";
import { PresidentBrief } from "./PresidentBrief";
import { CouncilRoundTable } from "../roundtable/CouncilRoundTable";
import { roundtableFor } from "@/lib/roundtable/pdf";
import { FieldUpdates } from "../hub/FieldUpdates";
import { clipsHtml, readClips } from "@/lib/clips";
import { NEWS_TOPICS, buildProfile, type NewsItem, type Profile } from "@/lib/bird/profile";
import { useFlights } from "@/lib/flights-client";
import { useAgreements } from "@/lib/agreements-client";
import { useMissions, useVisits } from "@/lib/diplomacy-client";
import { useTrade } from "@/lib/intel-client";
import { useInvestment } from "@/lib/investment-client";
import { loadTech } from "@/lib/tech-client";
import type { TechData } from "@/lib/tech";
import { BirdAudit } from "./BirdAudit";
import { auditMarkdown, briefHash, sourceDigest, verdictOf, type AuditSaved } from "@/lib/bird/audit";
import { readAudit, runBirdAudit } from "@/lib/bird/auditClient";
import { useCountryList } from "../falcon/hooks";
import { useJson, useStored } from "../deep/hooks";
import { useTr } from "../case/bits";

const KEYS = (iso: string) => ({ king: `gd-desk:king-council:${iso}`, mofa: `gd-desk:mofa-council:${iso}`, intel: `gd-desk:emb-intel:${iso}`, plan: `gd-desk:emb-plan:${iso}`, architect: `gd-case-architect:${iso}`, council: `gd-case-council:${iso}`, falcon: `gd-council:${iso}`, deep: `gd-deep-council:${iso}:full`, mach: `gd-scouncil:${iso}`, country: `gd-desk:country-full:${iso}` });
const readProd = (key: string): Prod => { const s = readSourceByKey(key)[0]; return s ? { report: s.report, at: s.at, usd: s.usd, sources: s.sources ?? [], lang: s.lang } : null; };
/** THE BIRD'S EYE VIEW: the last tab. One page that consolidates what every tab says about a country into the top strategic view for a decision in the UAE's interest: the course the deciding tabs give and whether they agree, the auditors' red flags, the top insights, the ranked interests, the next moves, the opportunities and risks, the security triad, what to watch, and how ready and how well checked the evidence is. Free: it reads what is already saved and the Case File data; it starts no paid run. */
export function BirdApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref, ready] = useStored<{ iso: string | null }>("gd-bird", { iso: null });
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const load = useJson<CaseData>(iso ? `/api/case/${iso}` : null); const d = load.data; const [tick, setTick] = useState(0); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  useFollowCountry(iso, (i) => setPref((p) => ({ ...p, iso: i })), ready); // the country is shared by every page (src/lib/country.ts)
  useEffect(() => { const on = () => setTick((n) => n + 1); window.addEventListener("storage", on); window.addEventListener("focus", on); return () => { window.removeEventListener("storage", on); window.removeEventListener("focus", on); }; }, []);
  const [profile, setProfile] = useState<Profile | null>(null); const [techAll, setTechAll] = useState<TechData | null>(null); useEffect(() => { let dead = false; loadTech().then((j) => { if (!dead) setTechAll(j); }).catch(() => {}); return () => { dead = true; }; }, []); const [view, setView] = useState<"report" | "president">("report"); const [ask, setAsk] = useState<AskSaved | null>(null); const [auto, setAuto] = useState(false); const [saved, setSaved] = useState(false); const [bird, setBird] = useState<Bird | null>(null); const [digest, setDigest] = useState(""); const [audit, setAudit] = useState<AuditSaved | null>(null); const nm = d ? (L === "ar" && d.nameAr ? d.nameAr : d.name) : iso ?? "";
  useEffect(() => { const k = setTimeout(() => { if (!iso) { setBird(null); return; } const ks = KEYS(iso); const inputs: Inputs = { iso, name: nm, d, track: readTrack(iso), now: Date.now(), products: { king: readProd(ks.king), mofa: readProd(ks.mofa), intel: readProd(ks.intel), plan: readProd(ks.plan), architect: readProd(ks.architect), council: readProd(ks.council), falcon: readProd(ks.falcon), deep: readProd(ks.deep), mach: readProd(ks.mach), country: readProd(ks.country) } }; const b = consolidate(inputs); setBird(b); setDigest(sourceDigest(inputs, b)); setAudit(readAudit(iso)); }, 0); return () => clearTimeout(k); }, [iso, d, nm, tick]);
  const pick = useCallback((i: string | null) => setPref({ iso: i }), [setPref]);
  const makePdf = async (b0: Bird | null, quiet: boolean, a0: AuditSaved | null = audit) => { const b1 = b0; if (!b1 || !iso) return; if (!quiet) { setBusy("0%"); setErr(""); } try { const at = new Date().toISOString(); const brief0 = birdMarkdown(b1, L); const auditMd = auditMarkdown(a0, briefHash(brief0 + digest), L); await downloadHtmlReport(birdHtml(b1, L === "ar" ? "ar" : "en", { title: `${L === "ar" ? "نظرة الطائر" : "Bird's eye view"}: ${nm}`, foot: `Geo Desk · ${at.slice(0, 10)}`, classification: classification(L), auditHtml: mdToHtml(stripReviewJson(auditMd)), fieldHtml: clipsHtml(readClips(iso), L === "ar" ? "ar" : "en"), scoreHtml: d ? scoreHtml(scoreCountry(d, { flightsLive: profile?.metrics.flightsLive ?? null, visits12: profile?.metrics.visits12 ?? null, agreements: profile?.metrics.agreements ?? null, cepa: profile?.metrics.cepa ?? null, hasMission: profile?.metrics.hasMission ?? null, tech: profile?.metrics.tech ?? null }), L === "ar" ? "ar" : "en") : "", roundtableBlocks: roundtableFor(iso, "bird", L === "ar" ? "ar" : "en", d), askHtml: ask && ask.iso === iso ? mdToHtml(`# ${L === "ar" ? "السؤال المطروح على نظرة الطائر" : "The question put to the Bird's eye view"}\n\n**${L === "ar" ? "الطلب" : "Request"}:** ${ask.message}\n\n${ask.text}\n\n*${L === "ar" ? "أُعدّ من" : "Prepared from"}: ${ask.depts.join(", ")}.*`) : "" }), { id: `bird:${iso}:${at}`, iso, country: nm, kind: "bird", title: `${L === "ar" ? "نظرة الطائر" : "Bird's eye view"}: ${nm}`, lang: L === "ar" ? "ar" : "en", at, usd: null }, `bird-${iso}-${at.slice(0, 10)}.pdf`, (a, b2) => { if (!quiet) setBusy(`${Math.round((a / b2) * 100)}%`); }, quiet); } catch { if (!quiet) setErr(t("Could not make the PDF.", "تعذّر إعداد PDF.")); } finally { if (!quiet) setBusy(""); } };
  useEffect(() => { if (!auto || !bird) return; const k = setTimeout(() => { setAuto(false); void (async () => { const brief0 = birdMarkdown(bird, L); const out = await runBirdAudit({ iso: iso!, lang: L === "ar" ? "ar" : "en", brief: brief0, digest, signal: new AbortController().signal, onEvent: () => {} }); const a1 = out.ok ? readAudit(iso!) : null; if (a1) setAudit(a1); await makePdf(bird, true, a1); setSaved(true); })(); }, 0); return () => clearTimeout(k); }, [auto, bird, digest]); // eslint-disable-line react-hooks/exhaustive-deps
  const brief = bird ? birdMarkdown(bird, L) : ""; const hash = briefHash(brief + digest); const aV = audit ? verdictOf(audit.report) : null; const cleared = !!audit && audit.hash === hash && !!aV?.ok;
  const [pdfAsk, setPdfAsk] = useState(""); // an in-page confirmation: the browser pop-up is suppressed in some shells, which made the button do nothing
  const pdf = () => { if (!bird) return; if (cleared) { void makePdf(bird, false); return; } setPdfAsk(!audit ? t("This brief has not been audited. Publish the PDF without the independent audit? (Run the audit first to have the three auditors check it.)", "لم يُدقَّق هذا الموجز. هل تنشر PDF دون التدقيق المستقل؟ (شغّل التدقيق أولًا ليفحصه المدققون الثلاثة.)") : audit.hash !== hash ? t("The brief changed after its audit. Publish anyway?", "تغيّر الموجز بعد تدقيقه. هل تنشره على أي حال؟") : t("The audit did not clear this brief (red flags or a rejection). Publish anyway?", "لم يُجز التدقيق هذا الموجز (أعلام حمراء أو رفض). هل تنشره على أي حال؟")); };
  const finished = useCallback((ran: number) => { setTick((n) => n + 1); if (ran > 0) setTimeout(() => setAuto(true), 1500); }, []);
  const sel = by.get(iso ?? "");
  const [countryProd, setCountryProd] = useState<Prod>(null); useEffect(() => { const k = setTimeout(() => setCountryProd(iso ? readProd(KEYS(iso).country) : null), 0); return () => clearTimeout(k); }, [iso, tick]);
  const flights = useFlights(); const agr = useAgreements(); const missionsAll = useMissions(); const visitsAll = useVisits(); const tradeAll = useTrade(); const invAll = useInvestment(); const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => { if (!iso || !nm) { const z = setTimeout(() => setNews([]), 0); return () => clearTimeout(z); } let dead = false; const q = `name=${encodeURIComponent(d?.name ?? nm)}`; Promise.all([null, "uae", ...NEWS_TOPICS].map((k) => fetch(`/api/news/${iso}?${q}${k === "uae" ? "&uae=1" : k ? `&topic=${k}` : ""}`).then((r) => (r.ok ? r.json() : { items: [] })).then((j: { items?: NewsItem[] }) => ({ items: (j.items ?? []).slice(0, k && k !== "uae" ? 5 : 14).map((x) => (k && k !== "uae" ? { ...x, topic: k } : x)) })).catch(() => ({ items: [] as NewsItem[] })))).then((js) => { if (dead) return; const seen = new Set<string>(); const items = (js as { items?: NewsItem[] }[]).flatMap((j) => j.items ?? []).sort((a, z) => (z.topic ? 1 : 0) - (a.topic ? 1 : 0)).filter((x) => x.link && !seen.has(x.link) && seen.add(x.link)).sort((a, z) => z.ts - a.ts); setNews(items); }); return () => { dead = true; }; }, [iso, nm, d?.name]);
  useEffect(() => { const k = setTimeout(() => { if (!iso || !d) { setProfile(null); return; } const ks = KEYS(iso); setProfile(buildProfile({ d, lang: L === "ar" ? "ar" : "en", flights: flights?.countries[iso] ?? null, ag: agr?.countries[iso] ?? null, missions: missionsAll?.countries[iso] ?? [], visits: (visitsAll?.items ?? []).filter((v) => v.c.includes(iso)), trade: tradeAll, news, investment: invAll?.countries[iso] ?? null, councilReport: readProd(ks.council)?.report ?? null, architectReport: readProd(ks.architect)?.report ?? null, now: Date.now(), tech: techAll?.countries[iso] ?? null, techUae: techAll?.countries.ARE ?? null })); }, 0); return () => clearTimeout(k); }, [iso, d, L, flights, agr, missionsAll, visitsAll, tradeAll, invAll, news, techAll, tick]);
  const missing = bird?.evidence.filter((x) => !x.onFile && ["king", "mofa", "intel", "plan"].includes(x.id)) ?? [];
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Binoculars size={20} /></span>{t("Bird's eye view", "نظرة الطائر")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("The one-stop view of a country for the final decision in the UAE's interest: every tab's insight consolidated into the course, the red flags, the top insights, the ranked interests, the next moves, the opportunities and risks, and how ready and how well checked the evidence is. It is free: it reads what is already saved in this browser and the Case File data, and it starts no paid run.", "العرض الشامل لدولة ما للقرار النهائي بما يخدم مصلحة الإمارات: رؤى كل تبويب مجمّعة في المسار والأعلام الحمراء وأهم الرؤى والمصالح المرتبة والخطوات التالية والفرص والمخاطر ومدى جاهزية الأدلة وفحصها. وهو مجاني: يقرأ المحفوظ في هذا المتصفح وبيانات ملف الحالة ولا يبدأ تشغيلًا مدفوعًا.")}</p></header>
      <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label={t("Country", "الدولة")}><div className="flex items-end gap-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Country", "الدولة")}</span><div className="flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => pick(i)} L={L} /></div>{iso && <button type="button" onClick={() => pick(null)} aria-label={t("Clear", "مسح")} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div>
        {bird && <button type="button" onClick={pdf} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"><FileDown size={14} />{busy ? `${t("Making PDF", "جارٍ إعداد PDF")} ${busy}` : cleared ? t("PDF brief (audited)", "موجز PDF (مُدقَّق)") : t("PDF brief", "موجز PDF")}</button>}</div>
        {pdfAsk && bird && <div role="alertdialog" aria-label={t("Confirm the PDF", "تأكيد ملف PDF")} className="mt-2 rounded-[10px] border border-warn/50 bg-bg3 p-3"><p className="text-[12.5px] leading-snug text-t0" dir="auto">{pdfAsk}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => { setPdfAsk(""); void makePdf(bird, false); }} className="inline-flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-[var(--accent-ink)]">{t("Publish the PDF anyway", "انشر PDF على أي حال")}</button><button type="button" onClick={() => setPdfAsk("")} className="inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] text-t1">{t("Cancel", "إلغاء")}</button></div></div>}
        {d && sel && <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-t1"><b className="text-[15px] text-t0">{d.flag} {nm}</b><Pill c="var(--t2)">{regionLabel(d.region, L)}</Pill>{bird && <Pill c={bird.readiness.score >= 75 ? "var(--ok)" : bird.readiness.score >= 40 ? "var(--warn)" : "var(--risk)"}>{t("decision readiness", "جاهزية القرار")} {bird.readiness.score}%</Pill>}</p>}{err && <p role="alert" className="mt-1 text-[12px] text-warn">{err}</p>}</section>
      {!iso && <p className="rounded-[14px] border border-line bg-bg1 p-4 text-[13px] text-t1">{t("Pick a country to see its bird's eye view.", "اختر دولة لترى نظرة الطائر عليها.")}</p>}
      {iso && load.loading && !d && <p className="text-[12px] text-t2">{t("Building the Case File…", "جارٍ بناء ملف الحالة…")}</p>}
      {iso && d && <div role="tablist" aria-label={t("Views", "العروض")} className="flex flex-wrap gap-1.5">{([["report", t("The Bird's eye report", "تقرير نظرة الطائر")], ["president", t("The President's brief", "موجز الرئيس")]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} type="button" onClick={() => setView(id)} className="inline-flex h-9 items-center rounded-full border px-4 text-[12.5px] font-medium" style={{ borderColor: view === id ? "var(--accent)" : "var(--line)", background: view === id ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--bg2)", color: view === id ? "var(--accent)" : "var(--t1)" }}>{label}</button>)}</div>}
      {iso && d && view === "president" && <PresidentBrief L={L} iso={iso} name={nm} d={d} />}
      {iso && d && view === "report" && <Complete L={L} iso={iso} name={nm} d={d} tick={tick} onFinished={finished} />}
      {bird && view === "report" && <BirdAudit L={L} iso={iso!} brief={brief} digest={digest} audit={audit} hash={hash} onSaved={() => { setAudit(readAudit(iso!)); setTick((n) => n + 1); }} />}
      {saved && view === "report" && <p role="status" className="rounded-[10px] border border-ok/40 bg-ok/10 p-2.5 text-[12.5px] text-t0">{t("The bird's eye report was built from the full picture and saved to the ", "بُني تقرير نظرة الطائر من الصورة الكاملة وحُفظ في ")}<Link href="/archive" className="text-accent underline">{t("Archive", "الأرشيف")}</Link>.</p>}
      {bird && view === "report" && <>
        <div id="bird-ask" className="scroll-mt-20"><Block title={t("Ask the Bird's eye view a specific question or give it a directive", "اسأل نظرة الطائر سؤالًا محددًا أو وجّهها بتوجيه")} hint={t(`About ${nm}. The desk agent decides which departments answer (the three desks, the councils, the country brief, the free data), shows you the plan and its cost, and runs it when you click. The answer goes into the PDF.`, `عن ${nm}. يقرر وكيل المكتب أي الإدارات تجيب (المكاتب الثلاثة والمجالس وموجز الدولة والبيانات المجانية) ويعرض الخطة وكلفتها وينفذها بنقرتك. وتدخل الإجابة في ملف PDF.`)}>{iso && <AskPanel L={L} fixedIso={iso} fixedName={nm} storageKey={`gd-bird-ask:${iso}`} onSaved={setAsk} />}</Block></div>
        {d && <ScoreCard d={d} p={profile} L={L} />}
        {d && <CouncilRoundTable L={L} iso={iso!} name={nm} d={d} lens="bird" metrics={profile?.metrics ?? null} />}
        <BirdReport bird={bird} L={L} missing={missing} />
        <FieldUpdates L={L} iso={iso!} name={nm} />
        {profile && <CountryProfile p={profile} L={L} name={nm} brief={<CountryBriefPanel L={L} iso={iso!} d={d} prod={countryProd} onRan={() => setTick((n) => n + 1)} />} />}
        <p className="text-[11px] leading-snug text-t2">{t("Built by rules from what is saved in this browser and the free Case File data. It does not replace the tabs it reads: every line names its source, and a decision should be taken on the tabs themselves.", "مبنية بالقواعد مما هو محفوظ في هذا المتصفح وبيانات ملف الحالة المجانية. وهي لا تحل محل التبويبات التي تقرأها: كل سطر يسمّي مصدره، ويُتخذ القرار على التبويبات نفسها.")}</p>
      </>}
    </div>
  );
}
