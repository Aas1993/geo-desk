"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/store";
import { loadTrack, saveTrack, type TrackItem, type TrackStatus } from "@/lib/fs-track";
import { Card } from "./ui";

const T = {
  en: { title: "Decisions and follow-up", empty: "Nothing tracked yet. Open a foresight product and press Track on an option, an opportunity or a decision to follow it here.", hint: "Kept in this browser only, per country. It turns a finding into an owned, dated item: set a status, a due date and a note.", st: { open: "Open", doing: "In progress", done: "Done", dropped: "Dropped" }, due: "Due", note: "Note", owner: "Owner", added: "added", del: "Remove" },
  ar: { title: "القرارات والمتابعة", empty: "لا شيء قيد التتبع بعد. افتح منتج الاستشراف واضغط «تتبّع» على خيار أو فرصة أو قرار لمتابعته هنا.", hint: "محفوظة في هذا المتصفح فقط، لكل دولة. تحوّل الاستنتاج إلى بند له مسؤول وموعد: حدّد الحالة وتاريخ الاستحقاق وملاحظة.", st: { open: "مفتوح", doing: "قيد التنفيذ", done: "منجز", dropped: "أُسقط" }, due: "الاستحقاق", note: "ملاحظة", owner: "الجهة", added: "أُضيف", del: "إزالة" },
} as const;
const COL: Record<TrackStatus, string> = { open: "var(--warn)", doing: "var(--accent)", done: "var(--ok)", dropped: "var(--t2)" };

/** The follow-up tracker of one country: options, opportunities and decisions added from the foresight products, each with a status, a due date and a note. */
export function FsTracker({ iso3 }: { iso3: string }) {
  const { lang } = useT(); const u = T[lang as "en" | "ar"]; const [items, setItems] = useState<TrackItem[]>([]);
  const read = useCallback(() => setItems(loadTrack(iso3)), [iso3]);
  useEffect(() => { const t = setTimeout(read, 0); window.addEventListener("gd-track", read); return () => { clearTimeout(t); window.removeEventListener("gd-track", read); }; }, [read]);
  const patch = (id: string, p: Partial<TrackItem>) => { const next = items.map((x) => (x.id === id ? { ...x, ...p } : x)); setItems(next); saveTrack(iso3, next); };
  return (
    <Card title={`${u.title}${items.length ? ` · ${items.length}` : ""}`} icon="☑">
      {!items.length ? <p className="text-[12.5px] leading-snug text-t1">{u.empty}</p> : (
        <ul className="space-y-2.5">{items.map((x) => (
          <li key={x.id} className="rounded-[10px] bg-bg2 p-2.5" style={{ borderInlineStart: `3px solid ${COL[x.status]}` }}>
            <p className={`text-[12.5px] leading-snug ${x.status === "done" || x.status === "dropped" ? "text-t2 line-through" : "text-t0"}`}>{x.text}</p>
            <p className="num mt-0.5 text-[10.5px] text-t2">{x.from}{x.window ? ` · ${x.window}` : ""}{x.owner ? ` · ${x.owner}` : ""} · {u.added} {x.added}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <select value={x.status} onChange={(e) => patch(x.id, { status: e.target.value as TrackStatus })} className="h-7 rounded-[8px] border border-line bg-bg1 px-1.5 text-[11.5px] text-t0">{(Object.keys(u.st) as TrackStatus[]).map((k) => <option key={k} value={k}>{u.st[k]}</option>)}</select>
              <label className="flex items-center gap-1 text-[11px] text-t2">{u.due}<input type="date" value={x.due ?? ""} onChange={(e) => patch(x.id, { due: e.target.value })} className="h-7 rounded-[8px] border border-line bg-bg1 px-1.5 text-[11.5px] text-t0" /></label>
              <input value={x.note ?? ""} placeholder={u.note} maxLength={300} onChange={(e) => patch(x.id, { note: e.target.value })} className="h-7 min-w-[120px] flex-1 rounded-[8px] border border-line bg-bg1 px-2 text-[11.5px] text-t0" />
              <button type="button" aria-label={u.del} onClick={() => { const next = items.filter((y) => y.id !== x.id); setItems(next); saveTrack(iso3, next); }} className="grid size-7 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><Trash2 size={12} /></button>
            </div>
          </li>))}</ul>)}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.hint}</p>
    </Card>
  );
}
