"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { calibration, deleteSaved, loadResolutions, registryEntries, resolve, type Outcome } from "@/lib/falcon/library";
import type { Country } from "@/lib/types";
import { FsTracker } from "../FsTracker";
import { Block, Kpi, Pill, type Lang } from "./bits";
import { KIND_LABEL, launchFor, useSaved, type Launch } from "./Desks";

const T = {
  en: { saved: "Saved products", savedH: "Everything generated on this browser, kept so the desk can reopen, review and compare it. Stored locally; nothing is uploaded.", cols: ["Product", "Country", "Issued", "Words", "Cost"], open: "Open", rt: "Red team", del: "Delete", none: "Nothing saved yet. Generate a product from any desk and it will appear here.",
    reg: "Forecast registry and calibration", regH: "Key judgments with a likelihood band, frozen at the issue date of the saved product. When the outcome is known, mark it: the registry scores how well the bands were calibrated. Band midpoints stand in for probabilities, so this is a coarse check, not a model score.", yes: "Came true", no: "Did not", undo: "Reset", n: "Resolved", brier: "Brier score", brierH: "0 is perfect; 0.25 is what always saying roughly even scores", skill: "Skill against that baseline", hit: "Direction right", few: "Fewer than 20 resolved judgments: too few to say anything about calibration.", noReg: "No foresight product with likelihood bands is saved yet.", open2: "Unresolved", done: "Resolved",
    trk: "Decisions and follow-up, by country", noTrk: "Nothing tracked. Press Track on an option, opportunity or decision in a foresight product." },
  ar: { saved: "المنتجات المحفوظة", savedH: "كل ما أُنشئ على هذا المتصفح، محفوظ ليعيد المكتب فتحه ومراجعته ومقارنته. يُخزَّن محليًا ولا يُرفع شيء.", cols: ["المنتج", "الدولة", "تاريخ الإصدار", "الكلمات", "الكلفة"], open: "افتح", rt: "الفريق الأحمر", del: "حذف", none: "لا شيء محفوظ بعد. أنشئ منتجًا من أي مكتب وسيظهر هنا.",
    reg: "سجل التوقعات والمعايرة", regH: "أحكام رئيسية بنطاق احتمال، مجمّدة عند تاريخ إصدار المنتج المحفوظ. وحين تُعرف النتيجة، سجّلها: يقيس السجل مدى معايرة النطاقات. تُستخدم منتصفات النطاقات بديلًا عن الاحتمالات، فهذا فحص تقريبي لا درجة نموذج.", yes: "تحقق", no: "لم يتحقق", undo: "إعادة", n: "المحسومة", brier: "درجة بريير", brierH: "0 هي الكمال؛ و0.25 ما تحققه عبارة «متكافئ» دائمًا", skill: "المهارة مقابل ذلك الأساس", hit: "الاتجاه الصحيح", few: "أقل من 20 حكمًا محسومًا: عدد لا يكفي للقول شيئًا عن المعايرة.", noReg: "لا يوجد منتج استشراف محفوظ بنطاقات احتمال بعد.", open2: "غير محسومة", done: "محسومة",
    trk: "القرارات والمتابعة حسب الدولة", noTrk: "لا شيء قيد التتبع. اضغط «تتبّع» على خيار أو فرصة أو قرار في منتج استشراف." },
} as const;

export function LibraryView({ by, L, launch }: { by: Map<string, Country>; L: Lang; launch: (l: Launch) => void }) {
  const u = T[L]; const saved = useSaved(); const [res, setRes] = useState<Record<string, { outcome: Outcome; at: string }>>({}); const [tick, setTick] = useState(0); const [isos, setIsos] = useState<string[]>([]);
  useEffect(() => { const read = () => { setRes(loadResolutions()); try { const out: string[] = []; for (let i = 0; i < localStorage.length; i++) { const m = /^gd-fs-track:([A-Z]{3})$/.exec(localStorage.key(i) ?? ""); if (m && (JSON.parse(localStorage.getItem(`gd-fs-track:${m[1]}`) ?? "[]") as unknown[]).length) out.push(m[1]); } setIsos(out.sort()); } catch { /* storage unavailable */ } }; const t = setTimeout(read, 0); window.addEventListener("gd-registry", read); window.addEventListener("gd-track", read); return () => { clearTimeout(t); window.removeEventListener("gd-registry", read); window.removeEventListener("gd-track", read); }; }, [tick]);
  const entries = useMemo(() => registryEntries(saved), [saved]); const cal = useMemo(() => calibration(entries, res), [entries, res]);
  const open = entries.filter((e) => !res[e.id]); const done = entries.filter((e) => res[e.id]);
  const row = (e: (typeof entries)[number]) => { const c = by.get(e.iso3); const r = res[e.id]; return <li key={e.id} className="rounded-[10px] bg-bg2 p-2.5"><p className="text-[12.5px] leading-snug text-t0">{e.text}</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-t2"><span>{c?.flag} {c?.name ?? e.iso3}</span><Pill c="var(--accent)">{e.label}</Pill><span className="num">{e.issued}</span>
    {r ? <><Pill c={r.outcome === "yes" ? "var(--ok)" : "var(--risk)"}>{r.outcome === "yes" ? u.yes : u.no}</Pill><button type="button" onClick={() => { resolve(e.id, null); setTick((x) => x + 1); }} className="text-accent hover:underline">{u.undo}</button></> : <span className="ms-auto flex gap-2"><button type="button" onClick={() => { resolve(e.id, "yes"); setTick((x) => x + 1); }} className="rounded-[8px] bg-bg3 px-2 py-0.5 text-[11px] text-t0 hover:text-ok">{u.yes}</button><button type="button" onClick={() => { resolve(e.id, "no"); setTick((x) => x + 1); }} className="rounded-[8px] bg-bg3 px-2 py-0.5 text-[11px] text-t0 hover:text-down">{u.no}</button></span>}</div></li>; };
  return (
    <div className="space-y-4">
      <Block title={u.saved} hint={u.savedH}>
        {saved.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[12.5px]"><thead><tr className="text-[10px] uppercase tracking-wide text-t2">{u.cols.map((h) => <th key={h} className="py-1 pe-2 text-start font-semibold">{h}</th>)}<th /></tr></thead>
          <tbody className="divide-y divide-line">{saved.map((s) => { const c = by.get(s.iso3); return <tr key={s.key}><td className="py-2 pe-2 font-medium text-t0">{KIND_LABEL[s.kind][L]}</td><td className="pe-2 text-t1">{c?.flag} {L === "ar" && c?.nameAr ? c.nameAr : c?.name ?? s.iso3}</td><td className="num pe-2 text-t1">{s.at.slice(0, 10)}</td><td className="num pe-2 text-t1">{s.words.toLocaleString("en")}</td><td className="num pe-2 text-t1">{s.usd != null ? `$${s.usd.toFixed(2)}` : "—"}</td>
            <td className="whitespace-nowrap text-end">{c && (s.kind === "case-council" || s.kind === "architect" ? <Link href={`/case#detailed/${s.kind === "architect" ? "architect" : "council"}`} className="me-3 text-accent hover:underline">{u.open}</Link> : <button type="button" onClick={() => launch(launchFor(s, c))} className="me-3 text-accent hover:underline">{u.open}</button>)}{c && s.kind !== "redteam" && <button type="button" onClick={() => launch({ c, mode: "redteam", target: { title: `${c.name}: ${KIND_LABEL[s.kind].en}`, text: s.report } })} className="me-3 text-accent hover:underline">{u.rt}</button>}<button type="button" aria-label={u.del} onClick={() => { deleteSaved(s.key); setTick((x) => x + 1); window.dispatchEvent(new Event("focus")); }} className="inline-grid size-6 place-items-center rounded-[6px] bg-bg3 align-middle text-t1 hover:text-t0"><Trash2 size={11} /></button></td></tr>; })}</tbody></table></div> : <p className="text-[12.5px] text-t2">{u.none}</p>}
      </Block>
      <Block title={u.reg} hint={u.regH}>
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Kpi label={u.n} value={cal.n} sub={`${entries.length}`} /><Kpi label={u.brier} value={cal.brier ?? "—"} sub={u.brierH} /><Kpi label={u.skill} value={cal.skill ?? "—"} /><Kpi label={u.hit} value={cal.hit != null ? `${Math.round(cal.hit * 100)}%` : "—"} /></div>
        {cal.n > 0 && cal.n < 20 && <p className="mb-2 rounded-[8px] bg-warn/10 px-2.5 py-1.5 text-[11.5px] text-t0">{u.few}</p>}
        {entries.length ? <><h5 className="label mb-1.5">{u.open2} · {open.length}</h5><ul className="space-y-1.5">{open.slice(0, 40).map(row)}</ul>{done.length > 0 && <><h5 className="label mb-1.5 mt-3">{u.done} · {done.length}</h5><ul className="space-y-1.5">{done.map(row)}</ul></>}</> : <p className="text-[12.5px] text-t2">{u.noReg}</p>}
      </Block>
      <Block title={u.trk}>{isos.length ? <div className="space-y-3">{isos.map((i) => <div key={i}><h5 className="label mb-1">{by.get(i)?.flag} {by.get(i)?.name ?? i}</h5><FsTracker iso3={i} /></div>)}</div> : <p className="text-[12.5px] text-t2">{u.noTrk}</p>}</Block>
    </div>
  );
}
