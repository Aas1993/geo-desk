"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Binoculars, FileDown, X } from "lucide-react";
import { useT } from "@/lib/store";
import type { CaseData } from "@/lib/case/load";
import { birdMarkdown, consolidate, type Bird, type From, type Inputs, type Prod } from "@/lib/bird/consolidate";
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
import { BirdAudit } from "./BirdAudit";
import { auditMarkdown, briefHash, sourceDigest, verdictOf, type AuditSaved } from "@/lib/bird/audit";
import { readAudit, runBirdAudit } from "@/lib/bird/auditClient";
import { useCountryList } from "../falcon/hooks";
import { useJson, useStored } from "../deep/hooks";
import { useTr } from "../case/bits";

const KEYS = (iso: string) => ({ king: `gd-desk:king-council:${iso}`, mofa: `gd-desk:mofa-council:${iso}`, intel: `gd-desk:emb-intel:${iso}`, plan: `gd-desk:emb-plan:${iso}`, architect: `gd-case-architect:${iso}`, council: `gd-case-council:${iso}`, falcon: `gd-council:${iso}`, deep: `gd-deep-council:${iso}:full`, mach: `gd-scouncil:${iso}` });
const readProd = (key: string): Prod => { const s = readSourceByKey(key)[0]; return s ? { report: s.report, at: s.at, usd: s.usd, sources: s.sources ?? [], lang: s.lang } : null; };
/** THE BIRD'S EYE VIEW: the last tab. One page that consolidates what every tab says about a country into the top strategic view for a decision in the UAE's interest: the course the deciding tabs give and whether they agree, the auditors' red flags, the top insights, the ranked interests, the next moves, the opportunities and risks, the security triad, what to watch, and how ready and how well checked the evidence is. Free: it reads what is already saved and the Case File data; it starts no paid run. */
export function BirdApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref] = useStored<{ iso: string | null }>("gd-bird", { iso: null });
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const load = useJson<CaseData>(iso ? `/api/case/${iso}` : null); const d = load.data; const [tick, setTick] = useState(0); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { const on = () => setTick((n) => n + 1); window.addEventListener("storage", on); window.addEventListener("focus", on); return () => { window.removeEventListener("storage", on); window.removeEventListener("focus", on); }; }, []);
  const [auto, setAuto] = useState(false); const [saved, setSaved] = useState(false); const [bird, setBird] = useState<Bird | null>(null); const [digest, setDigest] = useState(""); const [audit, setAudit] = useState<AuditSaved | null>(null); const nm = d ? (L === "ar" && d.nameAr ? d.nameAr : d.name) : iso ?? "";
  useEffect(() => { const k = setTimeout(() => { if (!iso) { setBird(null); return; } const ks = KEYS(iso); const inputs: Inputs = { iso, name: nm, d, track: readTrack(iso), now: Date.now(), products: { king: readProd(ks.king), mofa: readProd(ks.mofa), intel: readProd(ks.intel), plan: readProd(ks.plan), architect: readProd(ks.architect), council: readProd(ks.council), falcon: readProd(ks.falcon), deep: readProd(ks.deep), mach: readProd(ks.mach) } }; const b = consolidate(inputs); setBird(b); setDigest(sourceDigest(inputs, b)); setAudit(readAudit(iso)); }, 0); return () => clearTimeout(k); }, [iso, d, nm, tick]);
  const pick = useCallback((i: string | null) => setPref({ iso: i }), [setPref]);
  const makePdf = async (b0: Bird | null, quiet: boolean, a0: AuditSaved | null = audit) => { const b1 = b0; if (!b1 || !iso) return; if (!quiet) { setBusy("0%"); setErr(""); } try { const at = new Date().toISOString(); const brief0 = birdMarkdown(b1, L); const auditMd = auditMarkdown(a0, briefHash(brief0 + digest), L); await downloadHtmlReport(birdHtml(b1, L === "ar" ? "ar" : "en", { title: `${L === "ar" ? "نظرة الطائر" : "Bird's eye view"}: ${nm}`, foot: `Geo Desk · ${at.slice(0, 10)}`, classification: classification(L), auditHtml: mdToHtml(stripReviewJson(auditMd)) }), { id: `bird:${iso}:${at}`, iso, country: nm, kind: "bird", title: `${L === "ar" ? "نظرة الطائر" : "Bird's eye view"}: ${nm}`, lang: L === "ar" ? "ar" : "en", at, usd: null }, `bird-${iso}-${at.slice(0, 10)}.pdf`, (a, b2) => { if (!quiet) setBusy(`${Math.round((a / b2) * 100)}%`); }, quiet); } catch { if (!quiet) setErr(t("Could not make the PDF.", "تعذّر إعداد PDF.")); } finally { if (!quiet) setBusy(""); } };
  useEffect(() => { if (!auto || !bird) return; const k = setTimeout(() => { setAuto(false); void (async () => { const brief0 = birdMarkdown(bird, L); const out = await runBirdAudit({ iso: iso!, lang: L === "ar" ? "ar" : "en", brief: brief0, digest, signal: new AbortController().signal, onEvent: () => {} }); const a1 = out.ok ? readAudit(iso!) : null; if (a1) setAudit(a1); await makePdf(bird, true, a1); setSaved(true); })(); }, 0); return () => clearTimeout(k); }, [auto, bird, digest]); // eslint-disable-line react-hooks/exhaustive-deps
  const brief = bird ? birdMarkdown(bird, L) : ""; const hash = briefHash(brief + digest); const aV = audit ? verdictOf(audit.report) : null; const cleared = !!audit && audit.hash === hash && !!aV?.ok;
  const [pdfAsk, setPdfAsk] = useState(""); // an in-page confirmation: the browser pop-up is suppressed in some shells, which made the button do nothing
  const pdf = () => { if (!bird) return; if (cleared) { void makePdf(bird, false); return; } setPdfAsk(!audit ? t("This brief has not been audited. Publish the PDF without the independent audit? (Run the audit first to have the three auditors check it.)", "لم يُدقَّق هذا الموجز. هل تنشر PDF دون التدقيق المستقل؟ (شغّل التدقيق أولًا ليفحصه المدققون الثلاثة.)") : audit.hash !== hash ? t("The brief changed after its audit. Publish anyway?", "تغيّر الموجز بعد تدقيقه. هل تنشره على أي حال؟") : t("The audit did not clear this brief (red flags or a rejection). Publish anyway?", "لم يُجز التدقيق هذا الموجز (أعلام حمراء أو رفض). هل تنشره على أي حال؟")); };
  const finished = useCallback((ran: number) => { setTick((n) => n + 1); if (ran > 0) setTimeout(() => setAuto(true), 1500); }, []);
  const sel = by.get(iso ?? "");
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
      {iso && d && <Complete L={L} iso={iso} name={nm} d={d} tick={tick} onFinished={finished} />}
      {bird && <BirdAudit L={L} iso={iso!} brief={brief} digest={digest} audit={audit} hash={hash} onSaved={() => { setAudit(readAudit(iso!)); setTick((n) => n + 1); }} />}
      {saved && <p role="status" className="rounded-[10px] border border-ok/40 bg-ok/10 p-2.5 text-[12.5px] text-t0">{t("The bird's eye report was built from the full picture and saved to the ", "بُني تقرير نظرة الطائر من الصورة الكاملة وحُفظ في ")}<Link href="/archive" className="text-accent underline">{t("Archive", "الأرشيف")}</Link>.</p>}
      {bird && <>
        <BirdReport bird={bird} L={L} missing={missing} />
        <p className="text-[11px] leading-snug text-t2">{t("Built by rules from what is saved in this browser and the free Case File data. It does not replace the tabs it reads: every line names its source, and a decision should be taken on the tabs themselves.", "مبنية بالقواعد مما هو محفوظ في هذا المتصفح وبيانات ملف الحالة المجانية. وهي لا تحل محل التبويبات التي تقرأها: كل سطر يسمّي مصدره، ويُتخذ القرار على التبويبات نفسها.")}</p>
      </>}
    </div>
  );
}
