"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { useStore, useT } from "@/lib/store";
import type { Headline } from "@/lib/types";

export function Ticker({ items }: { items: Headline[] }) {
  const { t } = useT(); const on = useStore((s) => s.layers.ticker); const toggle = useStore((s) => s.toggleLayer);
  const [hold, setHold] = useState(false);
  if (!on || !items.length) return null;
  const row = items.map((h, i) => (
    <a key={i} href={h.link} target="_blank" rel="noreferrer" className="mx-5 inline-flex items-baseline gap-2 whitespace-nowrap hover:text-accent">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-t2">{h.outlet}</span><span className="text-[13px] text-t0">{h.title}</span>
    </a>
  ));
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 hidden h-9 items-center overflow-hidden border-t border-line bg-bg1 sm:start-14 sm:flex" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <span className="flex h-full shrink-0 items-center gap-2 border-e border-line bg-bg1 px-3 text-[11px] font-semibold tracking-wide text-t1"><i className="size-1.5 rounded-full bg-accent" />{t("headlines").toUpperCase()}</span>
      <div className="min-w-0 flex-1 overflow-hidden"><div className="ticker-track inline-flex" style={{ animationPlayState: hold ? "paused" : "running", width: "max-content" }}>{row}{row}</div></div>
      <button aria-label={t("close")} onClick={() => toggle("ticker")} className="grid h-full w-9 shrink-0 place-items-center text-t2 hover:text-t0"><X size={14} /></button>
    </div>
  );
}
