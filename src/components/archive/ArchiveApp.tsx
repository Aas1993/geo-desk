"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zipSync } from "fflate";
import { Archive, Download, ExternalLink, Trash2 } from "lucide-react";
import { useT } from "@/lib/store";
import { ARCHIVE_EVENT, clearArchive, deleteReport, fmtSize, getFile, keepArchive, listReports, totalSize, type ArchiveMeta } from "@/lib/archive";
import { SWEEP_EVENT, SWEEP_RUN, sweepState, type SweepState } from "@/lib/archive-sweep";
import { GROUP_LABEL, KINDS, type Group } from "@/lib/reportpdf";
import { saveBlobAs } from "@/lib/pdf";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useTr } from "../case/bits";

const safe = (s: string) => s.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 80);
/** THE ARCHIVE: every PDF report the platform has made, kept in this browser, by country. */
export function ArchiveApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { by } = useCountryList();
  const [items, setItems] = useState<ArchiveMeta[] | null>(null); const [q, setQ] = useState(""); const [grp, setGrp] = useState<Group | "all">("all"); const [sweep, setSweep] = useState<SweepState>(sweepState()); const [kept, setKept] = useState<boolean | null>(null); const [msg, setMsg] = useState("");
  const load = useCallback(() => { listReports().then(setItems); }, []);
  useEffect(() => { const k = setTimeout(load, 0); const on = () => load(); const sw = (e: Event) => setSweep((e as CustomEvent<SweepState>).detail); window.addEventListener(ARCHIVE_EVENT, on); window.addEventListener(SWEEP_EVENT, sw); const poll = setInterval(() => setSweep(sweepState()), 2000); return () => { clearTimeout(k); clearInterval(poll); window.removeEventListener(ARCHIVE_EVENT, on); window.removeEventListener(SWEEP_EVENT, sw); }; }, [load]);
  const name = (x: ArchiveMeta) => { const c = by.get(x.iso); return c ? (L === "ar" && c.nameAr ? c.nameAr : c.name) : x.country; };
  const shown = useMemo(() => (items ?? []).filter((x) => (grp === "all" || KINDS[x.kind]?.group === grp) && (!q.trim() || `${x.title} ${name(x)} ${x.kind}`.toLowerCase().includes(q.trim().toLowerCase()))), [items, grp, q, by, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const byCountry = useMemo(() => { const m = new Map<string, ArchiveMeta[]>(); for (const x of shown) { const k = x.iso; (m.get(k) ?? m.set(k, []).get(k)!).push(x); } return [...m.entries()].sort((a, z) => name(a[1][0]).localeCompare(name(z[1][0]))); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const download = async (x: ArchiveMeta) => { const f = await getFile(x.id); if (f) saveBlobAs(f, `${safe(x.kind)}-${x.iso}-${x.at.slice(0, 10)}.pdf`); else setMsg(t("The file is missing from this browser's storage.", "الملف غير موجود في تخزين هذا المتصفح.")); };
  const view = async (x: ArchiveMeta) => { const f = await getFile(x.id); if (f) window.open(URL.createObjectURL(f), "_blank", "noopener"); };
  const zip = async () => { setMsg(t("Preparing the zip…", "جارٍ إعداد الملف المضغوط…")); const files: Record<string, Uint8Array> = {}; for (const x of items ?? []) { const f = await getFile(x.id); if (f) files[`${safe(name(x))}/${safe(x.kind)}-${x.at.slice(0, 10)}-${x.id.length}.pdf`.replace(/\/+/g, "/")] = new Uint8Array(await f.arrayBuffer()); } const z = zipSync(files, { level: 0 }); saveBlobAs(new Blob([z as BlobPart], { type: "application/zip" }), `geo-desk-archive-${new Date().toISOString().slice(0, 10)}.zip`); setMsg(""); };
  const total = totalSize(items ?? []); const groups = (Object.keys(GROUP_LABEL) as Group[]).filter((g) => (items ?? []).some((x) => KINDS[x.kind]?.group === g));
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Archive size={20} /></span>{t("The Archive", "الأرشيف")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("Every PDF report the platform makes, kept by country: the consolidated brief of every council and desk, every strategy, every directive's answer and every report you build. A PDF is made automatically when an AI product finishes (free, from what is already saved) and from any PDF button.", "كل تقرير PDF تنتجه المنصة محفوظًا حسب الدولة: الموجز المجمّع لكل مجلس ومكتب وكل استراتيجية وإجابة كل توجيه وكل تقرير تبنيه. يُعدّ PDF تلقائيًا عند انتهاء أي منتج بالذكاء الاصطناعي (مجانًا من المحفوظ أصلًا) ومن أي زر PDF.")}</p></header>
      <Block title={t("Storage", "التخزين")} hint={t("The archive lives in this browser on this device: nothing is uploaded. The browser can clear it with site data, so download the zip for anything you must keep.", "يعيش الأرشيف في هذا المتصفح على هذا الجهاز: لا شيء يُرفع. ويمكن للمتصفح مسحه مع بيانات الموقع، فنزّل الملف المضغوط لأي شيء يجب حفظه.")}>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-t1"><Pill c="var(--c2)">{(items ?? []).length} {t("reports", "تقريرًا")}</Pill><Pill c="var(--accent)">{fmtSize(total)}</Pill>{sweep.pending > 0 && <Pill c="var(--warn)">{sweep.pending} {t("waiting to be made", "بانتظار الإعداد")}{sweep.building ? ` · ${sweep.building}` : ""}</Pill>}{sweep.failed > 0 && <Pill c="var(--risk)">{sweep.failed} {t("could not be made", "تعذّر إعدادها")}</Pill>}
          <span className="ms-auto flex flex-wrap gap-1.5"><button type="button" onClick={() => window.dispatchEvent(new Event(SWEEP_RUN))} className="h-8 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1 hover:text-t0">{t("Make the missing PDFs now", "أعدّ ملفات PDF الناقصة الآن")}</button><button type="button" onClick={zip} disabled={!items?.length} className="h-8 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1 hover:text-t0 disabled:opacity-50">{t("Download all (zip)", "تنزيل الكل (zip)")}</button><button type="button" onClick={async () => setKept(await keepArchive())} className="h-8 rounded-[8px] bg-bg3 px-3 text-[12px] text-t1 hover:text-t0">{t("Ask the browser to keep it", "اطلب من المتصفح الاحتفاظ به")}</button></span></div>
        {kept != null && <p className="mt-1.5 text-[11.5px] text-t2">{kept ? t("The browser agreed to keep the archive.", "وافق المتصفح على الاحتفاظ بالأرشيف.") : t("The browser did not promise to keep it: download the zip.", "لم يَعِد المتصفح بالاحتفاظ به: نزّل الملف المضغوط.")}</p>}{msg && <p role="status" className="mt-1.5 text-[11.5px] text-t1">{msg}</p>}
      </Block>
      <div className="flex flex-wrap items-center gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search the archive", "ابحث في الأرشيف")} aria-label={t("Search the archive", "ابحث في الأرشيف")} className="h-9 min-w-48 flex-1 rounded-[10px] border border-line bg-bg1 px-3 text-[13px] text-t0" />
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("Kind", "النوع")}><button type="button" aria-pressed={grp === "all"} onClick={() => setGrp("all")} className={`h-8 rounded-full px-3 text-[12px] ${grp === "all" ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1"}`}>{t("All", "الكل")}</button>{groups.map((g) => <button key={g} type="button" aria-pressed={grp === g} onClick={() => setGrp(g)} className={`h-8 rounded-full px-3 text-[12px] ${grp === g ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{L === "ar" ? GROUP_LABEL[g].ar : GROUP_LABEL[g].en}</button>)}</div></div>
      {items === null && <p className="text-[12px] text-t2">{t("Opening the archive…", "جارٍ فتح الأرشيف…")}</p>}
      {items && items.length === 0 && <p className="rounded-[14px] border border-line bg-bg1 p-4 text-[13px] text-t1">{t("Nothing is archived yet. Run an AI product on any page (or press a PDF button) and its report will appear here.", "لا شيء مؤرشف بعد. شغّل أي منتج بالذكاء الاصطناعي في أي صفحة (أو اضغط زر PDF) فيظهر تقريره هنا.")}</p>}
      {byCountry.map(([iso, xs]) => (
        <section key={iso} className="rounded-[14px] border border-line bg-bg1 p-3.5"><h2 className="display flex items-center gap-2 text-[16px] font-semibold text-t0">{by.get(iso)?.flag} {name(xs[0])}<span className="num text-[11px] font-normal text-t2">{xs.length}</span></h2>
          <ul className="mt-2 divide-y divide-line">{xs.map((x) => <li key={x.id} className="flex flex-wrap items-center gap-2 py-2"><div className="min-w-0 flex-1"><p className="text-[13px] font-medium leading-snug text-t0" dir="auto">{x.title}</p><p className="numt text-[11px] text-t2">{L === "ar" ? KINDS[x.kind]?.ar ?? x.kind : KINDS[x.kind]?.en ?? x.kind} · {x.at.slice(0, 16).replace("T", " ")} UTC · {fmtSize(x.size)}{x.usd != null ? ` · US$${x.usd.toFixed(2)}` : ""} · {x.lang.toUpperCase()}</p></div>
            <button type="button" onClick={() => view(x)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><ExternalLink size={13} />{t("Open", "فتح")}</button>
            <button type="button" onClick={() => download(x)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />{t("Download", "تنزيل")}</button>
            <button type="button" onClick={async () => { if (window.confirm(t("Delete this PDF from the archive? The product it came from is not affected.", "حذف هذا الـPDF من الأرشيف؟ لا يتأثر المنتج الذي أُعدّ منه."))) await deleteReport(x.id); }} aria-label={t("Delete", "حذف")} className="grid size-8 place-items-center rounded-[8px] text-t2 hover:text-risk"><Trash2 size={13} /></button></li>)}</ul></section>
      ))}
      {items && items.length > 0 && <p className="text-end"><button type="button" onClick={async () => { if (window.confirm(t("Delete every PDF in the archive?", "حذف كل ملفات PDF في الأرشيف؟"))) await clearArchive(); }} className="text-[11.5px] text-t2 hover:text-risk">{t("Clear the archive", "مسح الأرشيف")}</button></p>}
    </div>
  );
}
