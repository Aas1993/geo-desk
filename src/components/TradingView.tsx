"use client";
import { useEffect, useRef } from "react";
import { useStore, useT } from "@/lib/store";
import type { Listing } from "@/lib/markets/types";

/**
 * TradingView's embeddable widgets — the free, sanctioned way to show live/delayed ADX and DFM prices without a data licence.
 * Terms (tradingview.com/policies): display-only, TradingView attribution must stay visible as designed, personal/non-commercial use
 * unless you have an agreement. The widgets run in the visitor's browser; their data can't be read by, or processed in, our code.
 */
export type TvKind = "advanced-chart" | "symbol-info" | "technical-analysis" | "financials" | "symbol-profile" | "ticker-tape" | "screener" | "mini-symbol-overview" | "events";

/** TradingView uses the exchanges' official tickers; for DFM that is the disclosure-feed ticker (e.g. EMIRATESNBD, not the vendor's ENBD). */
export const tvSymbol = (l: Pick<Listing, "exchange" | "symbol" | "feedSymbol">) => `${l.exchange}:${l.feedSymbol ?? l.symbol}`;

export function TvWidget({ kind, config, height, title }: { kind: TvKind; config: Record<string, unknown>; height: number; title: string }) {
  const { theme, lang } = useStore(); const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(config) + theme + lang;
  useEffect(() => {
    const host = ref.current; if (!host) return; host.innerHTML = "";
    const inner = document.createElement("div"); inner.className = "tradingview-widget-container__widget"; inner.style.height = "calc(100% - 22px)";
    const s = document.createElement("script"); s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`; s.async = true;
    s.text = JSON.stringify({ autosize: true, colorTheme: theme, isTransparent: false, backgroundColor: theme === "dark" ? "#0a111e" : "#f6f9fd", locale: lang === "ar" ? "ar_AE" : "en", ...config });
    const credit = document.createElement("div"); credit.className = "tradingview-widget-copyright"; credit.style.cssText = "font-size:11px;padding-top:4px;color:var(--t2)";
    credit.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:var(--accent)">${title} · Track all markets on TradingView</a>`;
    host.append(inner, credit, s);
    return () => { host.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, kind]);
  return <div ref={ref} className="tradingview-widget-container w-full" style={{ height }} dir="ltr" />;
}

export function TvNote() {
  const { t } = useT();
  return <p className="text-[11.5px] leading-relaxed text-t2">{t("tv_note")}</p>;
}
