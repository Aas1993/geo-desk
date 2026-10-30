"use client";
import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useFollowCountry } from "@/lib/country";
import type { CaseData } from "@/lib/case/load";
import { regionLabel } from "@/lib/regions";
import { CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useJson, useStored } from "../deep/hooks";
import { useTr } from "../case/bits";
import { ScenarioTool } from "./ScenarioTool";
import { CoalitionTool } from "./CoalitionTool";
import { LedgerTool } from "./LedgerTool";
import { DecisionsTool } from "./DecisionsTool";
import { PackTool } from "./PackTool";

const TOOLS = [["scenario", "Scenario sandbox", "مختبر السيناريوهات"], ["coalition", "Coalition and vote map", "خريطة التحالفات والتصويت"], ["ledger", "Influence ledger", "سجل النفوذ"], ["decisions", "Decision log", "سجل القرارات"], ["pack", "Briefing pack", "حزمة الإحاطة"]] as const;
type ToolId = (typeof TOOLS)[number][0];
const NEEDS_COUNTRY: ToolId[] = ["scenario", "ledger", "decisions", "pack"];

/** THE STRATEGY LAB: five tools that work for any country: the scenario sandbox, the coalition and vote map, the influence ledger over time, the decision log and the briefing-pack builder. Free: rules and held data only; the one optional model call (the scenario write-up) is click-started and capped. */
export function LabApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref, ready] = useStored<{ iso: string | null; tool: ToolId }>("gd-labtool", { iso: null, tool: "scenario" });
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const tool: ToolId = TOOLS.some((x) => x[0] === pref.tool) ? pref.tool : "scenario";
  useFollowCountry(iso, (i) => setPref((p) => ({ ...p, iso: i })), ready); // the country is shared by every page (src/lib/country.ts)
  const load = useJson<CaseData>(iso ? `/api/case/${iso}` : null); const d = load.data && load.data.iso3 === iso ? load.data : null; const cc = by.get(iso ?? "");
  const name = d ? (L === "ar" && d.nameAr ? d.nameAr : d.name) : cc ? (L === "ar" && cc.nameAr ? cc.nameAr : cc.name) : iso ?? "";
  // the map tools may pre-select a country from the URL (?iso=XXX) so the hub and the panel can link here
  useEffect(() => { const k = setTimeout(() => { try { const q = new URLSearchParams(location.search); const i = (q.get("iso") ?? "").toUpperCase(); const tl = q.get("tool"); if (/^[A-Z]{3}$/.test(i) || tl) setPref((p) => ({ iso: /^[A-Z]{3}$/.test(i) ? i : p.iso, tool: TOOLS.some((x) => x[0] === tl) ? (tl as ToolId) : p.tool })); } catch { /* no query */ } }, 0); return () => clearTimeout(k); }, [setPref]);
  const [, force] = useState(0); useEffect(() => { const on = () => force((n) => n + 1); window.addEventListener("gd-lab-snap", on); return () => window.removeEventListener("gd-lab-snap", on); }, []);
  const props = { L, iso, d, name, cc };
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><FlaskConical size={20} /></span>{t("Strategy Lab", "مختبر الاستراتيجية")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("Five decision tools for any country: test shocks against the Case File posture, see who votes with the UAE and who could be won, read the UAE's footprint against rivals over time, keep a log of decisions with owners and dates, and build one illustrated briefing pack. All rule-built from held data and labelled as such; nothing is invented and no model runs unless you start it.", "خمس أدوات قرار لأي دولة: اختبر الصدمات على موقف ملف الحالة، وانظر من يصوّت مع الإمارات ومن يمكن كسبه، واقرأ حضور الإمارات أمام المنافسين عبر الزمن، وسجّل القرارات بأصحابها ومواعيدها، وابنِ حزمة إحاطة مصوّرة واحدة. كلها مبنية بالقواعد من بيانات محفوظة ومعنونة بذلك؛ لا شيء مختلق ولا يعمل نموذج إلا إذا بدأته.")}</p></header>
      <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label={t("Country", "الدولة")}>
        <div className="flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Focal country", "الدولة المحورية")}</span><div className="flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => setPref((p) => ({ ...p, iso: i }))} L={L} /></div>{iso && <button type="button" onClick={() => setPref((p) => ({ ...p, iso: null }))} aria-label={t("Clear", "مسح")} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div>
          {d && <p className="flex flex-wrap items-center gap-2 pb-1 text-[12px] text-t1"><b className="text-[15px] text-t0">{d.flag} {name}</b><Pill c="var(--t2)">{regionLabel(d.region, L)}</Pill></p>}</div>
        {iso && load.loading && !d && <p className="mt-2 text-[12px] text-t2">{t("Building the Case File…", "جارٍ بناء ملف الحالة…")}</p>}
        {iso && load.err && !d && <p role="alert" className="mt-2 text-[12px] text-warn">{load.err}</p>}
      </section>
      <div role="tablist" aria-label={t("Tools", "الأدوات")} className="flex flex-wrap gap-1.5">{TOOLS.map(([id, en, ar]) => <button key={id} role="tab" aria-selected={tool === id} type="button" onClick={() => setPref((p) => ({ ...p, tool: id }))} className="inline-flex h-9 items-center rounded-full border px-4 text-[12.5px] font-medium" style={{ borderColor: tool === id ? "var(--accent)" : "var(--line)", background: tool === id ? "color-mix(in srgb, var(--accent) 16%, var(--bg-2))" : "var(--bg-1)", color: tool === id ? "var(--accent)" : "var(--t1)" }}>{t(en, ar)}</button>)}</div>
      {NEEDS_COUNTRY.includes(tool) && !iso && <p className="rounded-[14px] border border-line bg-bg1 p-4 text-[13px] text-t1">{t("Pick a country above to use this tool.", "اختر دولة أعلاه لاستخدام هذه الأداة.")}</p>}
      {NEEDS_COUNTRY.includes(tool) && iso && !d && !load.err && <p className="text-[12px] text-t2">{t("Loading…", "جارٍ التحميل…")}</p>}
      {tool === "scenario" && iso && d && <ScenarioTool {...props} />}
      {tool === "coalition" && <CoalitionTool {...props} />}
      {tool === "ledger" && iso && d && <LedgerTool {...props} />}
      {tool === "decisions" && iso && d && <DecisionsTool {...props} />}
      {tool === "pack" && iso && d && <PackTool {...props} />}
    </div>
  );
}
