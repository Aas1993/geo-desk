"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Compass, Gauge, LayoutDashboard, ListChecks, ScrollText, Users, X } from "lucide-react";
import { useT } from "@/lib/store";
import type { CaseData } from "@/lib/case/load";
import { POSTURE } from "@/lib/case/core";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useJson, useStored } from "../deep/hooks";
import { Detailed, Executive } from "./Dashboard";
import { CouncilTab, councilKey } from "./CouncilTab";
import { DeskBrief } from "./DeskBrief";
import { Readiness } from "./Readiness";
import { Statecraft } from "./Statecraft";
import { StrategyTab } from "./StrategyTab";
import { bt, useTr } from "./bits";

type Tab = "exec" | "detail" | "statecraft" | "council" | "strategy" | "desk" | "ready"; type Aud = "leader" | "minister" | "desk" | "analyst";
const TABS: { id: Tab; icon: typeof Gauge; en: string; ar: string }[] = [
  { id: "exec", icon: LayoutDashboard, en: "Executive", ar: "تنفيذي" }, { id: "detail", icon: ListChecks, en: "Detailed", ar: "تفصيلي" }, { id: "statecraft", icon: Compass, en: "UAE statecraft", ar: "فن الحكم الإماراتي" }, { id: "council", icon: Users, en: "Strategic Council", ar: "المجلس الاستراتيجي" },
  { id: "strategy", icon: Briefcase, en: "Strategy", ar: "الاستراتيجية" }, { id: "desk", icon: ScrollText, en: "Desk brief", ar: "موجز المكتب" }, { id: "ready", icon: Gauge, en: "Readiness", ar: "الجاهزية" },
];
const AUD: { id: Aud; en: string; ar: string; tab: Tab }[] = [{ id: "leader", en: "Leader", ar: "القائد", tab: "exec" }, { id: "minister", en: "Minister", ar: "الوزير", tab: "exec" }, { id: "desk", en: "Desk officer", ar: "ضابط المكتب", tab: "desk" }, { id: "analyst", en: "Analyst", ar: "المحلل", tab: "detail" }];
type Pref = { iso: string | null; aud: Aud };

/** The Case File: one country, one dashboard, every layer. Executive and Detailed views, the UAE statecraft layer, the twenty-seat Strategic Council, the strategy scorecard, the desk-officer brief and the Readiness audit. The role switch sets the default view and never changes a number. */
export function CaseApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref, ready] = useStored<Pref>("gd-case", { iso: null, aud: "minister" }); const [tab, setTab] = useState<Tab>("exec"); const [report, setReport] = useState<string | null>(null);
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const load = useJson<CaseData>(iso ? `/api/case/${iso}` : null); const d = load.data;
  useEffect(() => { const t0 = setTimeout(() => { const h = location.hash.replace("#", "") as Tab; if (TABS.some((x) => x.id === h)) setTab(h); }, 0); return () => clearTimeout(t0); }, []);
  useEffect(() => { if (!ready || pref.iso) return; const t0 = setTimeout(() => { try { const f = JSON.parse(localStorage.getItem("gd-deep-filters") ?? "null") as { iso?: string } | null; if (f?.iso && f.iso !== "ARE") setPref((p) => ({ ...p, iso: f.iso! })); } catch { /* ignore */ } }, 0); return () => clearTimeout(t0); }, [ready, pref.iso, setPref]);
  useEffect(() => { const t0 = setTimeout(() => { try { const s = iso ? localStorage.getItem(councilKey(iso)) : null; setReport(s ? (JSON.parse(s) as { report?: string }).report ?? null : null); } catch { setReport(null); } }, 0); return () => clearTimeout(t0); }, [iso]);
  const pick = useCallback((i: string | null) => { setPref((p) => ({ ...p, iso: i })); try { for (const k of ["gd-deep-filters", "gd-mach-filters"]) localStorage.setItem(k, JSON.stringify({ ...(JSON.parse(localStorage.getItem(k) ?? "{}") as object), iso: i })); } catch { /* ignore */ } }, [setPref]);
  const go = (x: Tab) => { setTab(x); try { history.replaceState(null, "", `#${x}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); };
  const sel = by.get(iso ?? ""); const nm = sel ? (L === "ar" && sel.nameAr ? sel.nameAr : sel.name) : null;
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Compass size={20} /></span>{t("CASE FILE", "ملف الحالة")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("One country, one dashboard: value to the UAE, position toward UAE policy, power and neighbours, ten-year trends, the Strategic Council, the strategy and the desk brief.", "دولة واحدة ولوحة واحدة: القيمة للإمارات والموقف من سياسة الإمارات والقوة والجوار والاتجاهات لعشر سنوات والمجلس الاستراتيجي والاستراتيجية وموجز المكتب.")}</p>
        <p className="flex flex-wrap items-center gap-3 text-[11.5px] text-t2">{t("Related", "ذو صلة")}: <Link href="/falcon" className="text-accent hover:underline">{t("Falcon", "الصقر")}</Link><Link href="/machiavelli" className="text-accent hover:underline">{t("Machiavellian", "الميكيافيلي")}</Link><Link href="/deep" className="text-accent hover:underline">{t("Deep Intelligence", "الاستخبارات المعمّقة")}</Link><Link href="/markets" className="text-accent hover:underline">{t("Markets", "الأسواق")}</Link></p></header>
      <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label="Country and role"><div className="flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Country", "الدولة")}</span><div className="flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => pick(i)} L={L} /></div>{iso && <button type="button" onClick={() => pick(null)} aria-label={t("Clear", "مسح")} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div>
        <div><span className="label mb-1 block">{t("View as", "العرض بصفة")}</span><div className="flex flex-wrap gap-1" role="group">{AUD.map((a) => <button key={a.id} type="button" aria-pressed={pref.aud === a.id} onClick={() => { setPref((p) => ({ ...p, aud: a.id })); go(a.tab); }} className={`h-9 rounded-full px-3 text-[12.5px] ${pref.aud === a.id ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{L === "ar" ? a.ar : a.en}</button>)}</div></div></div>
        {d && <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-t1"><b className="text-[15px] text-t0">{d.flag} {nm}</b><Pill c="var(--t2)">{d.region}</Pill>{d.scorecard && <Pill c="var(--t2)">{t("scorecard", "البطاقة")} {d.scorecard.overall} · {d.scorecard.tier}</Pill>}{d.posture.posture && <Pill c="var(--accent)">{t("posture", "الموقف")}: {bt(L, POSTURE[d.posture.posture].name)}</Pill>}{report && <Pill c="var(--ok)">{t("council report on file", "تقرير المجلس محفوظ")}</Pill>}<span className="text-t2">{t("Role changes the default view, never a number.", "الدور يغيّر العرض الافتراضي لا رقمًا.")}</span></p>}</section>
      <nav aria-label="Case File" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{TABS.map((x) => { const I = x.icon; const on = tab === x.id; return <button key={x.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go(x.id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[12.5px] ${on ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg1 text-t1 hover:text-t0"}`}><I size={15} />{L === "ar" ? x.ar : x.en}</button>; })}</nav>
      <main className="min-w-0">
        {tab === "ready" && <Readiness L={L} d={d} />}
        {tab !== "ready" && !iso && <p className="rounded-[12px] border border-line bg-bg1 p-4 text-[13px] text-t1">{t("Choose a country above. The same country carries to Falcon, Machiavellian and Deep Intelligence.", "اختر دولة أعلاه. وتنتقل الدولة نفسها إلى الصقر والميكيافيلي والاستخبارات المعمّقة.")}</p>}
        {tab !== "ready" && iso && load.loading && !d && <p className="text-[12px] text-t2">{t("Building the Case File…", "جارٍ بناء ملف الحالة…")}</p>}
        {tab !== "ready" && iso && load.err && <p role="alert" className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{t("The Case File could not be built: ", "تعذر بناء ملف الحالة: ")}{load.err}</p>}
        {iso && d && tab === "exec" && <Executive L={L} d={d} report={report} />}
        {iso && d && tab === "detail" && <Detailed L={L} d={d} />}
        {iso && d && tab === "statecraft" && <Statecraft L={L} d={d} report={report} />}
        {iso && d && <div hidden={tab !== "council"}><CouncilTab key={iso} L={L} iso={iso} name={nm ?? iso} hard={d.power.find((p) => p.id === "hard")?.v ?? null} onReport={setReport} /></div>}
        {iso && d && tab === "strategy" && <StrategyTab L={L} d={d} iso={iso} report={report} />}
        {iso && d && tab === "desk" && <DeskBrief L={L} d={d} report={report} />}
      </main>
    </div>
  );
}
