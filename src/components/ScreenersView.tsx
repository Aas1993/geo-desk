"use client";
import { useState } from "react";
import { useT } from "@/lib/store";
import { TvNote, TvWidget, type TvKind } from "./TradingView";

type Preset = { id: string; en: string; ar: string; kind: TvKind; config: Record<string, unknown>; height: number; group: "screener" | "market" };
const scr = (column: string, screen = "most_capitalized") => ({ width: "100%", market: "uae", defaultColumn: column, defaultScreen: screen, showToolbar: true });
/** TradingView widgets that accept UAE market scope. Display-only (see TradingView.tsx for terms). */
const PRESETS: Preset[] = [
  { id: "overview", en: "Overview", ar: "نظرة عامة", kind: "screener", config: scr("overview"), height: 720, group: "screener" },
  { id: "gainers", en: "Top gainers", ar: "الأكثر ارتفاعاً", kind: "screener", config: scr("overview", "top_gainers"), height: 720, group: "screener" },
  { id: "losers", en: "Top losers", ar: "الأكثر انخفاضاً", kind: "screener", config: scr("overview", "top_losers"), height: 720, group: "screener" },
  { id: "active", en: "Most active", ar: "الأكثر نشاطاً", kind: "screener", config: scr("overview", "volume_leaders"), height: 720, group: "screener" },
  { id: "performance", en: "Performance", ar: "الأداء", kind: "screener", config: scr("performance"), height: 720, group: "screener" },
  { id: "valuation", en: "Valuation", ar: "التقييم", kind: "screener", config: scr("valuation"), height: 720, group: "screener" },
  { id: "dividends", en: "Dividends", ar: "التوزيعات", kind: "screener", config: scr("dividends"), height: 720, group: "screener" },
  { id: "margins", en: "Margins", ar: "الهوامش", kind: "screener", config: scr("margins"), height: 720, group: "screener" },
  { id: "income", en: "Income statement", ar: "قائمة الدخل", kind: "screener", config: scr("income_statement"), height: 720, group: "screener" },
  { id: "balance", en: "Balance sheet", ar: "الميزانية", kind: "screener", config: scr("balance_sheet"), height: 720, group: "screener" },
  { id: "oscillators", en: "Oscillators", ar: "المذبذبات", kind: "screener", config: scr("oscillators"), height: 720, group: "screener" },
  { id: "trend", en: "Trend-following", ar: "تتبّع الاتجاه", kind: "screener", config: scr("trend_following"), height: 720, group: "screener" },
  { id: "calendar", en: "UAE economic calendar", ar: "التقويم الاقتصادي للإمارات", kind: "events", config: { width: "100%", countryFilter: "ae", importanceFilter: "-1,0,1" }, height: 640, group: "market" },
];

export function ScreenersView() {
  const { t, lang } = useT(); const [id, setId] = useState("overview");
  const p = PRESETS.find((x) => x.id === id)!;
  const pill = (x: Preset) => <button key={x.id} role="tab" aria-selected={id === x.id} onClick={() => setId(x.id)} className={`shrink-0 rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium ${id === x.id ? "bg-bg1 text-accent shadow-sm" : "text-t1 hover:text-t0"}`}>{lang === "ar" ? x.ar : x.en}</button>;
  return (
    <section className="space-y-3 rounded-[8px] border border-line bg-bg1 p-4">
      <p className="text-[12.5px] text-t1">{t("mk_screenerNote")}</p>
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        <div role="tablist" aria-label="Screener views" className="flex gap-0.5 rounded-[6px] bg-bg2 p-0.5">{PRESETS.filter((x) => x.group === "screener").map(pill)}</div>
        <div role="tablist" aria-label="Market views" className="flex gap-0.5 rounded-[6px] bg-bg2 p-0.5">{PRESETS.filter((x) => x.group === "market").map(pill)}</div>
      </div>
      <TvWidget key={p.id} kind={p.kind} title="UAE" height={p.height} config={p.config} />
      <TvNote />
    </section>
  );
}
