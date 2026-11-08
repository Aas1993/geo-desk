"use client";
import { useMemo, type ReactNode } from "react";
import type { SeatReport } from "@/lib/machiavelli/council-parse";
import type { Seat } from "@/lib/machiavelli/seats";
import { ListBar, NoMatch, useListView, type Facet, type SortSpec } from "../report/kit";
import { useTr } from "../case/bits";
import { Pill, type Lang } from "../falcon/bits";
import { Inline } from "./parts";

export const GROUP_C: Record<string, string> = { perspectives: "var(--c2)", economy: "var(--accent)", security: "var(--risk)", diplomacy: "var(--ok)", challenge: "var(--warn)", verify: "var(--t2)", chair: "var(--t0)", brief: "var(--t2)" };
const GROUP_W: Record<Lang, Record<string, string>> = { en: { perspectives: "Perspectives", economy: "Economy", security: "Security", diplomacy: "Diplomacy", challenge: "Challenge", verify: "Verification", chair: "Chair", brief: "Brief" }, ar: { perspectives: "المنظورات", economy: "الاقتصاد", security: "الأمن", diplomacy: "الدبلوماسية", challenge: "التحدي", verify: "التحقق", chair: "الرئاسة", brief: "الموجز" } };
const unknown = (s: string) => /not established|^\s*$|^[-–—]$|غير مثبت/i.test(s);
export type SeatRow = { seat: Seat; r: SeatReport | undefined; line: string; expandable: boolean };
/** The council's seats as tiles: its group, its insight and how many of its indicators are established; a tile expands in place to the seat's full report. Search the insights, filter by group, sort by name or by how many indicators are established. */
export function SeatTiles({ L, rows, open, setOpen, body, labels }: { L: Lang; rows: SeatRow[]; open: string | null; setOpen: (id: string | null) => void; body: (row: SeatRow) => ReactNode; labels: { view: string; hide: string } }) {
  const t = useTr(L);
  const facets = useMemo<Facet<SeatRow>[]>(() => [{ id: "g", label: t("Group", "المجموعة"), get: (x) => x.seat.group, options: Object.keys(GROUP_W.en).filter((g) => rows.some((x) => x.seat.group === g)).map((v) => ({ v, label: GROUP_W[L][v], color: GROUP_C[v] })) }, { id: "r", label: t("Report", "التقرير"), get: (x) => (x.r ? "yes" : "no"), options: [{ v: "yes", label: t("written", "مكتوب") }, { v: "no", label: t("not on file", "غير محفوظ") }] }], [rows, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = (x: SeatRow) => (x.r?.indicators ?? []).filter((i) => !unknown(i.reading)).length;
  const sorts = useMemo<SortSpec<SeatRow>[]>(() => [{ id: "name", label: t("Seat A to Z", "المقعد أ-ي"), cmp: (a, z) => a.seat.en.localeCompare(z.seat.en) }, { id: "est", label: t("Most indicators established", "الأكثر مؤشرات مثبتة"), cmp: (a, z) => est(z) - est(a) }, { id: "grp", label: t("Group", "المجموعة"), cmp: (a, z) => a.seat.group.localeCompare(z.seat.group) }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(rows, { text: (x) => `${x.seat.en} ${x.seat.ar} ${x.line} ${(x.r?.indicators ?? []).map((i) => `${i.indicator} ${i.reading}`).join(" ")} ${x.r?.instrument ?? ""} ${x.r?.limits ?? ""}`, facets, sorts });
  return (
    <div><ListBar L={L} view={view} placeholder={t("Search the seats", "ابحث في المقاعد")} />
      <ul className="grid gap-2 md:grid-cols-2">{view.shown.map((x) => { const on = open === x.seat.id; const n = x.r?.indicators.length ?? 0; const e = est(x); return (
        <li key={x.seat.id} id={`seat-${x.seat.id}`} className={`scroll-mt-24 rounded-[12px] bg-bg2 p-3 ${on ? "md:col-span-2" : ""}`} style={{ borderTop: `3px solid ${GROUP_C[x.seat.group]}` }}>
          <div className="flex flex-wrap items-center gap-1.5"><b className="min-w-0 flex-1 text-[12.5px] text-t0" dir="auto">{L === "ar" ? x.seat.ar : x.seat.en}</b><Pill c={GROUP_C[x.seat.group]}>{GROUP_W[L][x.seat.group]}</Pill></div>
          <p className="mt-1 text-[12px] leading-snug text-t1" dir="auto"><Inline text={x.line || (x.r ? "" : "—")} /></p>
          <div className="mt-2 flex flex-wrap items-center gap-2">{n > 0 && <span className="flex items-center gap-1.5 text-[10.5px] text-t2" title={t(`${e} of ${n} indicators established`, `${e} من ${n} مؤشرات مثبتة`)}><span className="flex gap-0.5" aria-hidden>{x.r!.indicators.map((i, k) => <span key={k} className="size-2 rounded-full" style={{ background: unknown(i.reading) ? "var(--bg-3)" : "var(--ok)" }} />)}</span>{x.r!.indicators.map((i) => i.indicator).join(", ")}</span>}
            {x.expandable && <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : x.seat.id)} className="ms-auto h-7 shrink-0 rounded-full bg-bg3 px-2.5 text-[11px] text-accent">{on ? labels.hide : labels.view}</button>}</div>
          {on && body(x)}</li>); })}</ul>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}
