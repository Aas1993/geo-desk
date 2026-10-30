"use client";
import { useEffect, useState } from "react";
import { HardDrive, X } from "lucide-react";
import { useT } from "@/lib/store";
import { WARN_AT, fmtChars, measure, type Item } from "@/lib/storage";

/** Tells the person, before a save fails, that this browser's storage is filling up (70% or more), and lets them free space by deleting saved council products one by one (each asks again in the page; a council can be run again to write it back). Shown only when needed. */
export function StorageGuard() {
  const { lang } = useT(); const t = (en: string, ar: string) => (lang === "ar" ? ar : en); const [m, setM] = useState<{ share: number; items: Item[] } | null>(null); const [open, setOpen] = useState(false); const [ask, setAsk] = useState<string | null>(null);
  useEffect(() => { const go = () => { try { setM(measure()); } catch { setM(null); } }; const k = setTimeout(go, 1500); const i = setInterval(go, 60_000); window.addEventListener("storage", go); return () => { clearTimeout(k); clearInterval(i); window.removeEventListener("storage", go); }; }, []);
  if (!m || m.share < WARN_AT) return null; const pct = Math.min(100, Math.round(m.share * 100));
  const del = (key: string) => { try { localStorage.removeItem(key); window.dispatchEvent(new Event("storage")); } catch { /* storage unavailable */ } setAsk(null); try { setM(measure()); } catch { setM(null); } };
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`glass absolute bottom-[76px] start-3 z-40 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold sm:bottom-14 ${pct >= 90 ? "text-risk" : "text-warn"}`}><HardDrive size={14} aria-hidden />{t(`Storage ${pct}% full`, `التخزين ممتلئ ${pct}%`)}</button>
      {open && (
        <div role="dialog" aria-label={t("Free browser storage", "تفريغ تخزين المتصفح")} className="glass absolute bottom-[120px] start-3 z-50 flex max-h-[60vh] w-[min(420px,calc(100vw-24px))] flex-col rounded-[14px] p-3 sm:bottom-24">
          <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><b className="text-[13px] text-t0">{t("This browser's storage is filling up", "تخزين هذا المتصفح يمتلئ")}</b><p className="mt-0.5 text-[11.5px] leading-snug text-t1">{t("Council products are kept here. When it is full a new run cannot be saved. Delete the ones you no longer need; a council can be run again to write one back. The PDF Archive is separate.", "تُحفظ منتجات المجالس هنا. وإذا امتلأ لم يمكن حفظ تشغيل جديد. احذف ما لا تحتاجه؛ ويمكن إعادة تشغيل المجلس لكتابته من جديد. أرشيف PDF منفصل.")}</p></div><button type="button" onClick={() => setOpen(false)} aria-label={t("Close", "إغلاق")} className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line text-t1"><X size={13} aria-hidden /></button></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg3"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "var(--risk)" : "var(--warn)" }} /></div>
          <ul className="scroll-thin mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">{m.items.slice(0, 30).map((x) => (
            <li key={x.key} className="flex items-center gap-2 rounded-[9px] bg-bg2 p-2 text-[12px]"><span className="min-w-0 flex-1 truncate text-t0">{lang === "ar" ? x.label.ar : x.label.en}<span className="block text-[10.5px] text-t2">{x.at ? x.at.slice(0, 10) : ""} · {fmtChars(x.chars)}</span></span>
              {ask === x.key ? <><button type="button" onClick={() => del(x.key)} className="h-7 rounded-[8px] bg-risk px-2.5 text-[11.5px] font-semibold text-white">{t("Confirm delete", "تأكيد الحذف")}</button><button type="button" onClick={() => setAsk(null)} className="h-7 rounded-[8px] border border-line px-2 text-[11.5px] text-t1">{t("Keep", "إبقاء")}</button></> : <button type="button" onClick={() => setAsk(x.key)} className="h-7 rounded-[8px] border border-line px-2.5 text-[11.5px] text-t1 hover:border-risk hover:text-risk">{t("Delete", "حذف")}</button>}</li>))}
            {m.items.length === 0 && <li className="text-[12px] text-t1">{t("Nothing large that can be deleted here; the rest is settings and notes.", "لا شيء كبير يمكن حذفه هنا؛ والباقي إعدادات وملاحظات.")}</li>}</ul>
        </div>
      )}
    </>
  );
}
