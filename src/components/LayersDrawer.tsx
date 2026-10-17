"use client";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useStore, useT, type LayerId } from "@/lib/store";
import type { Dict } from "@/lib/i18n";

type Item = { key: keyof Dict; color: string; layer?: LayerId };
const GROUPS: { key: keyof Dict; items: Item[] }[] = [
  { key: "gl_live", items: [
    { key: "tickerL", color: "#f2605c", layer: "ticker" }, { key: "flightL", color: "#5b9bff" }, { key: "vesselL", color: "#3dd68c" },
    { key: "eventsL", color: "#f2605c" }, { key: "hazardsL", color: "#f5b84b" }, { key: "weatherL", color: "#4fd1e6" }, { key: "firesL", color: "#ff8a4c" } ] },
  { key: "gl_ref", items: [
    { key: "labelsL", color: "#9aa7c0", layer: "labels" }, { key: "bordersL", color: "#9aa7c0", layer: "borders" }, { key: "capitalsL", color: "#5b9bff", layer: "capitals" } ] },
  { key: "gl_dip", items: [{ key: "missionsL", color: "#5b9bff" }, { key: "visitsL", color: "#3dd68c" }, { key: "thinkL", color: "#b58cff" }, { key: "unL", color: "#4fd1e6" }] },
  { key: "gl_sec", items: [{ key: "conflictL", color: "#f2605c" }, { key: "sanctionsL", color: "#f5b84b" }, { key: "chokeL", color: "#4fd1e6" }] },
  { key: "gl_eco", items: [{ key: "tradeL", color: "#3dd68c" }, { key: "energyL", color: "#f5b84b" }] },
];

export function LayersDrawer() {
  const { t } = useT(); const { menuOpen, setMenu, layers, toggleLayer } = useStore();
  const [closed, setClosed] = useState<Record<string, boolean>>({ gl_dip: true, gl_sec: true, gl_eco: true });
  if (!menuOpen) return null;
  return (
    <aside aria-label={t("layers")} className="glass anim-slide absolute bottom-14 top-14 start-0 z-40 flex w-[min(320px,88vw)] flex-col rounded-none border-y-0 border-s-0 sm:bottom-9 sm:start-14">
      <header className="flex items-center justify-between px-4 py-3.5">
        <h2 className="display text-[17px] font-semibold">{t("layers")}</h2>
        <button aria-label={t("close")} onClick={() => setMenu(false)} className="grid size-8 place-items-center rounded-lg text-t1 hover:bg-bg2"><X size={17} /></button>
      </header>
      <p className="px-4 pb-2 text-[11px] text-t2">{t("layersNote")}</p>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {GROUPS.map((g) => (
          <section key={g.key} className="border-t border-line/60 py-1.5">
            <button onClick={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))} aria-expanded={!closed[g.key]} className="label flex w-full items-center justify-between rounded-lg px-2 py-2 hover:bg-bg2">
              {t(g.key)}<ChevronDown size={14} className={`transition-transform ${closed[g.key] ? "-rotate-90 rtl:rotate-90" : ""}`} />
            </button>
            {!closed[g.key] && g.items.map((it) => {
              const live = !!it.layer; const on = live && layers[it.layer!];
              return (
                <button key={it.key} disabled={!live} onClick={() => it.layer && toggleLayer(it.layer)} aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-[13.5px] ${live ? "text-t0 hover:bg-bg2" : "cursor-not-allowed text-t2"} ${on ? "bg-bg2/70" : ""}`}>
                  <i className="size-2.5 shrink-0 rounded-full border-2" style={{ borderColor: it.color, background: on ? it.color : "transparent", opacity: live ? 1 : 0.4 }} />
                  <span className="flex-1 text-start">{t(it.key)}</span>
                  {!live && <span className="rounded-full border border-line px-1.5 text-[10px] uppercase tracking-wide">{t("soon")}</span>}
                </button>
              );
            })}
          </section>
        ))}
      </div>
      <footer className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11px] text-t2">
        <span>{t("boundaries")}</span>
      </footer>
    </aside>
  );
}
