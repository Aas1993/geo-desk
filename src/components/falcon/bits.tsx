"use client";
import { useMemo, useState } from "react";
import type { Country } from "@/lib/types";
import type { SourceState } from "@/lib/falcon/world";
import { SCOPES, SCOPE_BY, type ScopeKind } from "@/lib/falcon/scopes";

export type Lang = "en" | "ar";
export const mixc = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, var(--bg-2))`;
export const SEV: Record<number, { c: string; en: string; ar: string }> = { 0: { c: "var(--t2)", en: "Info", ar: "معلومة" }, 1: { c: "var(--c2)", en: "Watch", ar: "مراقبة" }, 2: { c: "var(--warn)", en: "Elevated", ar: "مرتفع" }, 3: { c: "var(--risk)", en: "Severe", ar: "شديد" } };
export const SRC_STATE: Record<SourceState, { c: string; en: string; ar: string }> = { current: { c: "var(--ok)", en: "Current", ar: "حديث" }, due: { c: "var(--warn)", en: "Due", ar: "مستحق التحديث" }, stale: { c: "var(--risk)", en: "Stale", ar: "قديم" }, missing: { c: "var(--t2)", en: "Missing", ar: "مفقود" } };
export const REGION_COL: Record<string, string> = { Africa: "#f59e0b", Americas: "#34d399", Asia: "#38bdf8", Europe: "#a78bfa", Oceania: "#f472b6", Other: "#94a3b8" };
export const REGION_AR: Record<string, string> = { Africa: "أفريقيا", Americas: "الأمريكتان", Asia: "آسيا", Europe: "أوروبا", Oceania: "أوقيانوسيا", Other: "أخرى" };
export const ago = (iso: string | null, L: Lang) => { if (!iso) return "—"; const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); const s = m < 60 ? `${m}${L === "ar" ? " د" : "m"}` : m < 1440 ? `${Math.round(m / 60)}${L === "ar" ? " س" : "h"}` : `${Math.round(m / 1440)}${L === "ar" ? " ي" : "d"}`; return s; };

export function Kpi({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return <div className="rounded-[12px] border border-line bg-bg1 p-3"><div className="num display text-[26px] font-semibold leading-none" style={{ color: tone ?? "var(--t0)" }}>{value}</div><div className="mt-1 text-[11.5px] leading-snug text-t1">{label}</div>{sub && <div className="num mt-0.5 text-[10.5px] text-t2">{sub}</div>}</div>;
}
export function Block({ title, hint, children, right }: { title: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <section className="rounded-[14px] border border-line bg-bg1 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="display text-[15px] font-semibold text-t0">{title}</h3>{hint && <p className="mt-0.5 text-[11.5px] leading-snug text-t2">{hint}</p>}</div>{right}</div>{children}</section>;
}
export const Pill = ({ c, children, title }: { c: string; children: React.ReactNode; title?: string }) => <span title={title} className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: mixc(c, 22), color: c }}>{children}</span>;

/** A searchable country chooser: type to filter by English or Arabic name, pick from the list. */
export function CountryPicker({ list, value, onPick, L, exclude = "ARE" }: { list: Country[]; value: string | null; onPick: (iso3: string) => void; L: Lang; exclude?: string }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const cur = list.find((c) => c.iso3 === value);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const hits = useMemo(() => { const n = norm(q.trim()); const all = list.filter((c) => c.iso3 !== exclude); return (n ? all.filter((c) => norm(c.name).includes(n) || (c.nameAr ?? "").includes(q.trim()) || c.iso3.toLowerCase() === n) : all).slice(0, 40); }, [list, q, exclude]);
  return (
    <div className="relative">
      <input value={open ? q : cur ? `${cur.flag} ${L === "ar" && cur.nameAr ? cur.nameAr : cur.name}` : q} onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={L === "ar" ? "اختر دولة…" : "Choose a country…"} aria-label={L === "ar" ? "الدولة" : "Country"} className="h-10 w-full rounded-[10px] border border-line bg-bg2 px-3 text-[13px] text-t0" />
      {open && <ul className="scroll-thin absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[10px] border border-line bg-bg1 p-1 shadow-xl" role="listbox">{hits.map((c) => <li key={c.iso3}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c.iso3); setOpen(false); setQ(""); }} className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-start text-[13px] text-t0 hover:bg-bg3"><span>{c.flag}</span><span className="min-w-0 flex-1 truncate">{L === "ar" && c.nameAr ? c.nameAr : c.name}</span><span className="num text-[10.5px] text-t2">{c.iso3}</span></button></li>)}{!hits.length && <li className="px-3 py-2 text-[12px] text-t2">—</li>}</ul>}
    </div>
  );
}

const KINDS: { k: ScopeKind | "country"; en: string; ar: string }[] = [{ k: "country", en: "Country", ar: "دولة" }, { k: "subregion", en: "Region", ar: "إقليم" }, { k: "bloc", en: "Bloc", ar: "تكتل" }, { k: "sector", en: "Sector", ar: "قطاع" }, { k: "global", en: "World", ar: "العالم" }];
/** Chooses what the product is about: one country, a region or sub-region, a bloc, a sector, or the world. A scope is a three-letter id that is never a country code. */
export function ScopePicker({ list, value, onPick, L }: { list: Country[]; value: string | null; onPick: (id: string) => void; L: Lang }) {
  const cur = value ? SCOPE_BY.get(value) : undefined; const [kind, setKind] = useState<ScopeKind | "country">(cur ? (cur.kind === "region" ? "subregion" : cur.kind) : "country");
  const opts = SCOPES.filter((s) => (kind === "subregion" ? s.kind === "subregion" || s.kind === "region" : s.kind === kind));
  return (
    <div className="space-y-2">
      <div role="tablist" aria-label={L === "ar" ? "نوع النطاق" : "Scope type"} className="flex flex-wrap gap-1">{KINDS.map((x) => <button key={x.k} role="tab" type="button" aria-selected={kind === x.k} onClick={() => { setKind(x.k); if (x.k === "global") onPick("WLD"); }} className={`h-8 rounded-full px-3 text-[12px] ${kind === x.k ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{L === "ar" ? x.ar : x.en}</button>)}</div>
      {kind === "country" ? <CountryPicker list={list} value={value && !SCOPE_BY.has(value) ? value : null} onPick={onPick} L={L} /> : kind === "global" ? <p className="text-[12px] text-t1">🌐 {L === "ar" ? SCOPE_BY.get("WLD")!.ar : SCOPE_BY.get("WLD")!.en}</p> : (
        <select value={cur && opts.some((o) => o.id === cur.id) ? cur.id : ""} onChange={(e) => e.target.value && onPick(e.target.value)} aria-label={L === "ar" ? "النطاق" : "Scope"} className="h-10 w-full rounded-[10px] border border-line bg-bg2 px-2.5 text-[13px] text-t0"><option value="">{L === "ar" ? "اختر…" : "Choose…"}</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.flag} {L === "ar" ? o.ar : o.en}</option>)}</select>)}
    </div>
  );
}
