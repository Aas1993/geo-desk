"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ClipboardList, Compass, Crown, FileText, Flag, Gauge, Landmark, LayoutList, ListChecks, ScrollText, Users, X } from "lucide-react";
import { useT } from "@/lib/store";
import type { CaseData } from "@/lib/case/load";
import { POSTURE } from "@/lib/case/core";
import type { Target } from "@/lib/case/changes";
import { TEMPLATES, type ProductId, type TemplateId } from "@/lib/case/report";
import { deskKey } from "../desk/filed";
import { architectKey, councilKey, readProduct, type SavedProduct } from "@/lib/case/saved";
import { regionLabel } from "@/lib/regions";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useJson, useStored } from "../deep/hooks";
import { ArchitectTab, type ArchSaved } from "./ArchitectTab";
import { ChangeChip } from "./ChangeChip";
import { Detailed } from "./Dashboard";
import { DecisionLog } from "./DecisionLog";
import { CouncilTab } from "./CouncilTab";
import { DeskBrief } from "./DeskBrief";
import { Minister } from "./Minister";
import { President } from "./President";
import { Priorities } from "./Priorities";
import { Readiness } from "./Readiness";
import { Reports } from "./Reports";
import { Statecraft } from "./Statecraft";
import { StrategyTab } from "./StrategyTab";
import { bt, useTr } from "./bits";

type View = "priorities" | "president" | "minister" | "detailed" | "reports"; type Sub = "trends" | "value" | "council" | "architect" | "strategy" | "log" | "desk" | "ready";
const VIEWS: { id: View; icon: typeof Gauge; en: string; ar: string; sub: { en: string; ar: string } }[] = [
  { id: "priorities", icon: Flag, en: "Priorities", ar: "الأولويات", sub: { en: "All countries", ar: "كل الدول" } }, { id: "president", icon: Crown, en: "President", ar: "الرئيس", sub: { en: "One page", ar: "صفحة واحدة" } }, { id: "minister", icon: Briefcase, en: "Minister", ar: "الوزير", sub: { en: "The reasons", ar: "الأسباب" } },
  { id: "detailed", icon: ListChecks, en: "Detailed", ar: "التفصيلي", sub: { en: "The evidence", ar: "الأدلة" } }, { id: "reports", icon: FileText, en: "Reports", ar: "التقارير", sub: { en: "Print and share", ar: "اطبع وشارك" } },
];
const SUBS: { id: Sub; icon: typeof Gauge; en: string; ar: string }[] = [
  { id: "trends", icon: LayoutList, en: "Ten-year trends", ar: "اتجاهات عشر سنوات" }, { id: "value", icon: Compass, en: "UAE value and position", ar: "القيمة والموقف" }, { id: "council", icon: Users, en: "Strategic Council", ar: "المجلس الاستراتيجي" }, { id: "architect", icon: Landmark, en: "Statecraft Architect", ar: "مهندس فن الحكم" },
  { id: "strategy", icon: Briefcase, en: "Strategy", ar: "الاستراتيجية" }, { id: "log", icon: ClipboardList, en: "Decision log", ar: "سجل القرارات" }, { id: "desk", icon: ScrollText, en: "Desk brief", ar: "موجز المكتب" }, { id: "ready", icon: Gauge, en: "Readiness", ar: "الجاهزية" },
];
/** Links written before the four-view layout still open the right place. */
const LEGACY: Record<string, [View, Sub?]> = { log: ["detailed", "log"], exec: ["minister"], detail: ["detailed", "trends"], statecraft: ["detailed", "value"], council: ["detailed", "council"], architect: ["detailed", "architect"], strategy: ["detailed", "strategy"], desk: ["detailed", "desk"], ready: ["detailed", "ready"] };
type Pref = { iso: string | null; view?: View; sub?: Sub; aud?: "leader" | "minister" | "desk" | "analyst" };
const fromAud = (a: Pref["aud"]): [View, Sub?] => (a === "leader" ? ["president"] : a === "desk" ? ["detailed", "desk"] : a === "analyst" ? ["detailed", "trends"] : ["minister"]);

/** The Case File: one country, one place. Four views of the same facts: the President's page, the Minister's view, the Detailed evidence and the Reports. Nothing is shown in two places: the views read the same data, the same Council and the same Architect, and the report builder assembles from them. */
export function CaseApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref, ready] = useStored<Pref>("gd-case", { iso: null, view: "president", sub: "trends" });
  const router = useRouter(); const [council, setCouncil] = useState<SavedProduct | null>(null); const [arch, setArch] = useState<ArchSaved | null>(null); const [intel, setIntel] = useState<SavedProduct | null>(null); const [plan, setPlan] = useState<SavedProduct | null>(null); const [preset, setPreset] = useState<{ id: TemplateId; n: number }>({ id: "president", n: 0 });
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const load = useJson<CaseData>(iso ? `/api/case/${iso}` : null); const d = load.data;
  const [view0, s0] = pref.view ? [pref.view, pref.sub] : fromAud(pref.aud); const view: View = iso ? view0 : "priorities"; const sub: Sub = s0 ?? pref.sub ?? "trends";
  const go = useCallback((v: View, s?: Sub) => { setPref((p) => ({ ...p, view: v, sub: s ?? p.sub ?? "trends" })); try { history.replaceState(null, "", `#${v}${v === "detailed" ? `/${s ?? sub}` : ""}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); }, [setPref, sub]);
  useEffect(() => { if (!ready) return; const t0 = setTimeout(() => { const [h, s] = location.hash.replace("#", "").split("/"); if (h === "king") router.replace("/king"); else if (h === "ambassador") router.replace("/ambassador"); else if (LEGACY[h]) go(LEGACY[h][0], LEGACY[h][1]); else if (h === "reports" && TEMPLATES.some((x) => x.id === s)) { setPreset((x) => ({ id: s as TemplateId, n: x.n + 1 })); go("reports"); } else if (VIEWS.some((x) => x.id === h)) go(h as View, SUBS.some((x) => x.id === s) ? (s as Sub) : undefined); }, 0); return () => clearTimeout(t0); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!ready || pref.iso) return; const t0 = setTimeout(() => { try { const f = JSON.parse(localStorage.getItem("gd-deep-filters") ?? "null") as { iso?: string } | null; if (f?.iso && f.iso !== "ARE") setPref((p) => ({ ...p, iso: f.iso! })); } catch { /* ignore */ } }, 0); return () => clearTimeout(t0); }, [ready, pref.iso, setPref]);
  useEffect(() => { const t0 = setTimeout(() => { setCouncil(iso ? readProduct(councilKey(iso)) : null); setIntel(iso ? readProduct(deskKey("emb-intel", iso)) : null); setPlan(iso ? readProduct(deskKey("emb-plan", iso)) : null); const a = iso ? readProduct(architectKey(iso)) : null; let state: ArchSaved["state"]; try { state = a && iso ? (JSON.parse(localStorage.getItem(architectKey(iso)) ?? "{}") as { state?: ArchSaved["state"] }).state : undefined; } catch { /* ignore */ } setArch(a ? { ...a, state } : null); }, 0); return () => clearTimeout(t0); }, [iso]);
  const pick = useCallback((i: string | null) => { setPref((p) => ({ ...p, iso: i })); try { for (const k of ["gd-deep-filters", "gd-mach-filters"]) localStorage.setItem(k, JSON.stringify({ ...(JSON.parse(localStorage.getItem(k) ?? "{}") as object), iso: i })); } catch { /* ignore */ } }, [setPref]);
  const open = (p: ProductId) => (p === "council" || p === "architect" ? go("detailed", p) : router.push(p === "kingCouncil" ? "/king" : "/ambassador")); const toTarget = (x: Target) => go(x.view, x.sub as Sub | undefined);
  const openCountry = useCallback((i: string, to: Target | null) => { const v: View = to?.view ?? "president"; const sb = (to?.sub as Sub | undefined) ?? "trends"; setPref((p) => ({ ...p, iso: i, view: v, sub: sb })); try { for (const k of ["gd-deep-filters", "gd-mach-filters"]) localStorage.setItem(k, JSON.stringify({ ...(JSON.parse(localStorage.getItem(k) ?? "{}") as object), iso: i })); history.replaceState(null, "", `#${v}${v === "detailed" ? `/${sb}` : ""}`); } catch { /* ignore */ } window.scrollTo?.(0, 0); }, [setPref]); const toReport = (id: TemplateId) => { setPreset((x) => ({ id, n: x.n + 1 })); go("reports"); };
  const sel = by.get(iso ?? ""); const nm = sel ? (L === "ar" && sel.nameAr ? sel.nameAr : sel.name) : null; const body = (x: View, s?: Sub) => view === x && (!s || sub === s);
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Compass size={20} /></span>{t("CASE FILE", "ملف الحالة")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("The one place for a country: the President's page, the Minister's view, the evidence and the reports, all from the same facts. The decision room (THE KING) and the embassy council (The Ambassador) are their own pages.", "المكان الواحد للدولة: صفحة الرئيس وعرض الوزير والأدلة والتقارير، كلها من الحقائق نفسها. وغرفة القرار (القرار النهائي) ومجلس السفارة (السفير) صفحتان مستقلتان.")}</p>
        <p className="flex flex-wrap items-center gap-3 text-[11.5px] text-t2">{t("Related", "ذو صلة")}: <Link href="/king" className="text-accent hover:underline">{t("THE KING", "القرار النهائي")}</Link><Link href="/ambassador" className="text-accent hover:underline">{t("The Ambassador", "السفير")}</Link><Link href="/falcon" className="text-accent hover:underline">{t("Falcon", "الصقر")}</Link><Link href="/machiavelli" className="text-accent hover:underline">{t("Machiavellian", "الميكيافيلي")}</Link><Link href="/deep" className="text-accent hover:underline">{t("Deep Intelligence", "الاستخبارات المعمّقة")}</Link><Link href="/markets" className="text-accent hover:underline">{t("Markets", "الأسواق")}</Link></p></header>
      <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label={t("Country", "الدولة")}><div className="flex items-end gap-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Country", "الدولة")}</span><div className="flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => pick(i)} L={L} /></div>{iso && <button type="button" onClick={() => pick(null)} aria-label={t("Clear", "مسح")} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div></div>
        {d && <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-t1"><b className="text-[15px] text-t0">{d.flag} {nm}</b><Pill c="var(--t2)">{regionLabel(d.region, L)}</Pill>{d.scorecard && <Pill c="var(--t2)">{t("scorecard", "البطاقة")} {d.scorecard.overall}</Pill>}{d.posture.posture && <Pill c="var(--accent)">{t("posture", "الموقف")}: {bt(L, POSTURE[d.posture.posture].name)}</Pill>}<Pill c={council ? "var(--ok)" : "var(--t2)"}>{council ? t("Council on file", "المجلس محفوظ") : t("Council not run", "المجلس لم يُشغَّل")}</Pill><Pill c={arch ? "var(--ok)" : "var(--t2)"}>{arch ? t("Strategy on file", "الاستراتيجية محفوظة") : t("Strategy not written", "الاستراتيجية لم تُكتب")}</Pill><Pill c={intel ? "var(--ok)" : "var(--t2)"}>{intel ? t("Embassy brief on file", "موجز السفارة محفوظ") : t("Embassy brief not written", "موجز السفارة لم يُكتب")}</Pill></p>}{d && iso && <ChangeChip L={L} d={d} iso={iso} council={council} arch={arch} onGo={toTarget} />}</section>
      <nav aria-label={t("Views", "العروض")} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{VIEWS.map((x) => { const I = x.icon; const on = view === x.id; return <button key={x.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go(x.id)} className={`flex h-14 items-center gap-3 rounded-[12px] px-3.5 text-start ${on ? "bg-accent text-[var(--accent-ink)]" : "bg-bg1 text-t1 hover:text-t0"}`}><I size={20} className="shrink-0" /><span className="min-w-0"><span className="block text-[14px] font-semibold leading-tight">{L === "ar" ? x.ar : x.en}</span><span className={`block truncate text-[11px] leading-tight ${on ? "opacity-80" : "text-t2"}`}>{bt(L, x.sub)}</span></span></button>; })}</nav>
      {view === "detailed" && <nav aria-label={t("Detailed sections", "أقسام التفصيلي")} className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{SUBS.map((x) => { const I = x.icon; const on = sub === x.id; return <button key={x.id} type="button" aria-current={on ? "page" : undefined} onClick={() => go("detailed", x.id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[12.5px] ${on ? "bg-bg3 font-semibold text-t0 ring-1 ring-accent" : "bg-bg1 text-t1 hover:text-t0"}`}><I size={14} />{L === "ar" ? x.ar : x.en}</button>; })}</nav>}
      <main className="min-w-0">
        {view === "priorities" && <Priorities L={L} onOpen={openCountry} />}
        {iso && load.loading && !d && <p className="text-[12px] text-t2">{t("Building the Case File…", "جارٍ بناء ملف الحالة…")}</p>}
        {iso && load.err && <p role="alert" className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] text-t1">{t("The Case File could not be built: ", "تعذر بناء ملف الحالة: ")}{load.err}</p>}
        {iso && d && body("president") && <President L={L} d={d} council={council?.report ?? null} arch={arch?.report ?? null} onGo={open} onReport={() => toReport("president")} onLog={() => go("detailed", "log")} />}
        {iso && d && body("minister") && <Minister L={L} d={d} council={council?.report ?? null} arch={arch?.report ?? null} archAt={arch?.at ?? null} onGo={open} onReport={() => toReport("minister")} onLog={() => go("detailed", "log")} />}
        {iso && d && body("detailed", "trends") && <Detailed L={L} d={d} />}
        {iso && d && body("detailed", "value") && <Statecraft L={L} d={d} report={council?.report ?? null} />}
        {iso && d && <div hidden={!body("detailed", "council")}><CouncilTab key={iso} L={L} iso={iso} name={nm ?? iso} hard={d.power.find((p) => p.id === "hard")?.v ?? null} onReport={setCouncil} /></div>}
        {iso && d && <div hidden={!body("detailed", "architect")}><ArchitectTab key={iso} L={L} d={d} iso={iso} name={nm ?? iso} councilReport={council?.report ?? null} onArch={setArch} /></div>}
        {iso && d && body("detailed", "strategy") && <StrategyTab L={L} d={d} iso={iso} report={council?.report ?? null} arch={arch?.report ?? null} />}
        {iso && d && body("detailed", "log") && <DecisionLog L={L} d={d} iso={iso} arch={arch?.report ?? null} />}
        {iso && d && body("detailed", "desk") && <DeskBrief L={L} d={d} report={council?.report ?? null} arch={arch?.report ?? null} />}
        {iso && d && body("reports") && <Reports L={L} d={d} iso={iso} council={council} arch={arch} intel={intel} plan={plan} preset={preset} onGo={open} />}
        {body("detailed", "ready") && <Readiness L={L} d={d} />}
      </main>
    </div>
  );
}
