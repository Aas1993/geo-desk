"use client";
import { useMemo, type ReactNode } from "react";
import { Fold, ListBar, NoMatch, useListView, type Facet, type SortSpec } from "./kit";
import { Tbl } from "../machiavelli/parts";
import { useTr } from "../case/bits";
import type { Lang } from "../falcon/bits";

// SHARED SCREEN PIECES OF THE FALCON AND MACHIAVELLIAN REPORTS (the shared kit itself is not edited): a section that folds with the same look as the old Block, a table that can be searched, filtered and sorted, and a likelihood-against-confidence map.
/** A drop-in for the old `Block`: the same title, hint and right-hand slot, but the section folds, takes an id (so a link can open it) and can show a count. */
export function FBlock({ id, title, hint, right, count, defaultOpen = true, children }: { id?: string; title: string; hint?: string; right?: ReactNode; count?: number | string; defaultOpen?: boolean; children: ReactNode }) {
  return <Fold id={id} title={title} hint={hint} right={right} count={count} defaultOpen={defaultOpen}>{children}</Fold>;
}
const strOf = (c: ReactNode): string => (typeof c === "string" ? c.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "") : "");
export type TblFacet = { label: string; keys: string[]; options: { v: string; label: string; color?: string }[] };
/** The old `Tbl` with a search box, one row of filter chips and a sort menu once it has enough rows to need them. `texts[i]` adds searchable words for a row whose cells are drawn (pills); `facet.keys[i]` is the value of the row for the chips. */
export function FTbl({ L, head, rows, w, texts, facet, searchAt = 6, empty }: { L: Lang; head: string[]; rows: (ReactNode)[][]; w?: string[]; texts?: string[]; facet?: TblFacet; searchAt?: number; empty?: string }) {
  const t = useTr(L); const items = useMemo(() => rows.map((cells, i) => ({ cells, i, key: facet?.keys[i] ?? "", text: `${cells.map(strOf).join(" ")} ${texts?.[i] ?? ""}` })), [rows, texts, facet]);
  const facets = useMemo<Facet<(typeof items)[number]>[]>(() => (facet && facet.options.length > 1 ? [{ id: "f", label: facet.label, get: (x) => x.key, options: facet.options }] : []), [facet]);
  const sorts = useMemo<SortSpec<(typeof items)[number]>[]>(() => head.map((h, j) => ({ id: String(j), label: h, cmp: (a: (typeof items)[number], z: (typeof items)[number]) => strOf(a.cells[j]).localeCompare(strOf(z.cells[j])) })).filter((s, j) => rows.some((r) => typeof r[j] === "string") && s.label), [head, rows]);
  const view = useListView(items, { text: (x) => x.text, facets, sorts }); const show = rows.length >= searchAt || facets.length > 0;
  return (
    <div>
      {show && <ListBar L={L} view={view} placeholder={t("Search this table", "ابحث في هذا الجدول")} />}
      <Tbl head={head} rows={view.shown.map((x) => x.cells)} w={w} empty={empty} />
      {!view.shown.length && rows.length > 0 && <NoMatch L={L} />}
    </div>
  );
}
const ZONES = [{ max: 20, en: "very unlikely", ar: "مستبعد جدًا", c: "var(--risk)" }, { max: 45, en: "unlikely", ar: "مستبعد", c: "var(--warn)" }, { max: 55, en: "even", ar: "متكافئ", c: "var(--t2)" }, { max: 80, en: "likely", ar: "مرجح", c: "var(--ok)" }, { max: 101, en: "very likely", ar: "مرجح جدًا", c: "var(--ok)" }];
export const zoneOf = (pct: number) => ZONES.findIndex((z) => pct < z.max);
/** Judgments on a grid: the likelihood zone across, the confidence up; each a numbered dot in the colour the caller gives it, and clicking a dot calls `onPick`. A judgment whose words give no likelihood or no confidence is not placed (the caller says so). */
export function LikeMap({ L, items, onPick }: { L: Lang; items: { n: number; pct: number | null; conf: "high" | "moderate" | "low" | null; color: string; label: string }[]; onPick?: (n: number) => void }) {
  const rows = ["high", "moderate", "low"] as const; const lab = { high: L === "ar" ? "مرتفعة" : "high", moderate: L === "ar" ? "معتدلة" : "moderate", low: L === "ar" ? "منخفضة" : "low" };
  return (
    <div className="inline-block max-w-full" dir="ltr" role="group" aria-label={L === "ar" ? "الاحتمال مقابل الثقة" : "Likelihood against confidence"}>
      <div className="flex"><div className="flex w-[64px] flex-col justify-around pe-1.5 text-end text-[10px] text-t2">{rows.map((r) => <span key={r}>{lab[r]}</span>)}</div>
        <div className="grid grid-cols-5 gap-1">{rows.flatMap((r) => ZONES.map((z, zi) => { const here = items.filter((x) => x.pct != null && x.conf === r && zoneOf(x.pct) === zi); return <div key={`${r}-${zi}`} className="flex min-h-[44px] min-w-[58px] flex-wrap content-start gap-1 rounded-[8px] p-1.5" style={{ background: `color-mix(in srgb, ${z.c} 10%, transparent)` }}>{here.map((x) => <button key={x.n} type="button" title={x.label} onClick={() => onPick?.(x.n)} className="numt grid size-6 place-items-center rounded-full text-[10.5px] font-bold text-[var(--bg-0)]" style={{ background: x.color }}>{x.n}</button>)}</div>; }))}</div></div>
      <div className="ms-[64px] mt-1 grid grid-cols-5 gap-1 text-center text-[9.5px] text-t2">{ZONES.map((z) => <span key={z.en}>{L === "ar" ? z.ar : z.en}</span>)}</div>
      <p className="ms-[64px] mt-0.5 text-center text-[10.5px] font-medium text-t1">{L === "ar" ? "الاحتمال ←   ↑ الثقة" : "Likelihood →   ↑ Confidence"}</p>
    </div>
  );
}
