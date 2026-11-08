"use client";
import { useMemo } from "react";
import { X } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { TvWidget } from "./TradingView";

const TABS = [
  { id: "indices", en: "Indices", ar: "المؤشرات", symbols: [["FOREXCOM:SPXUSD", "S&P 500"], ["FOREXCOM:NSXUSD", "Nasdaq 100"], ["FOREXCOM:DJI", "Dow Jones"], ["FOREXCOM:UK100", "FTSE 100"], ["FOREXCOM:GRXEUR", "DAX"], ["FOREXCOM:JP225", "Nikkei 225"], ["DFM:DFMGI", "DFM General Index"], ["ADX:FADGI", "FTSE ADX General"], ["QSE:GNRI", "QE Index (Qatar)"]] },
  { id: "commodities", en: "Commodities", ar: "السلع", symbols: [["TVC:UKOIL", "Brent crude"], ["TVC:USOIL", "WTI crude"], ["TVC:GOLD", "Gold"], ["TVC:SILVER", "Silver"], ["NYMEX:NG1!", "Natural gas"], ["COMEX:HG1!", "Copper"]] },
  { id: "fx", en: "Currencies", ar: "العملات", symbols: [["FX:EURUSD", "EUR/USD"], ["FX:GBPUSD", "GBP/USD"], ["FX_IDC:USDAED", "USD/AED"], ["FX_IDC:USDSAR", "USD/SAR"], ["FX_IDC:USDQAR", "USD/QAR"], ["FX_IDC:USDINR", "USD/INR"], ["FX_IDC:USDCNY", "USD/CNY"], ["FX:USDJPY", "USD/JPY"]] },
  { id: "crypto", en: "Crypto", ar: "العملات المشفرة", symbols: [["BITSTAMP:BTCUSD", "Bitcoin"], ["BITSTAMP:ETHUSD", "Ethereum"], ["COINBASE:SOLUSD", "Solana"], ["BINANCE:XRPUSDT", "XRP"], ["BINANCE:BNBUSDT", "BNB"]] },
] as const;

/** Opens when any of the Indices / Commodities / Currencies / Crypto layers is on: a live TradingView overview (display-only embed). */
export function MarketsPanel() {
  const { lang } = useT(); const on = useStore((s) => s.layers); const toggle = useStore((s) => s.toggleLayer);
  const active = TABS.filter((t) => on[t.id]); const first = active[0]?.id;
  const tabs = useMemo(() => TABS.map((t) => ({ title: lang === "ar" ? t.ar : t.en, symbols: t.symbols.map(([s, d]) => ({ s, d })), originalTitle: t.en })), [lang]);
  if (!active.length) return null;
  const config = { tabs: [...tabs].sort((a, b) => (a.originalTitle === TABS.find((t) => t.id === first)?.en ? -1 : b.originalTitle === TABS.find((t) => t.id === first)?.en ? 1 : 0)), showChart: true, showSymbolLogo: true, showFloatingTooltip: false, width: "100%", height: "100%", isTransparent: true };
  return (
    <aside aria-label="Markets" className="glass anim-rise absolute inset-x-2 bottom-[72px] z-30 overflow-hidden rounded-[16px] sm:inset-x-auto sm:bottom-auto sm:end-[76px] sm:top-[68px] sm:w-[360px]">
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="display text-[15px] font-semibold">{lang === "ar" ? "الأسواق" : "Markets"}</h2>
        <button onClick={() => active.forEach((t) => toggle(t.id))} aria-label="Close" className="grid size-8 place-items-center rounded-md text-t1 hover:text-t0"><X size={16} /></button></div>
      <div className="px-2 pb-2"><TvWidget kind="market-overview" config={config} height={400} title="Markets" /></div>
    </aside>
  );
}
