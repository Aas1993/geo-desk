"use client";
import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, LocateFixed, Newspaper, Activity, HeartPulse, Radio, Handshake, ShieldAlert } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { useAlerts } from "@/lib/alerts-client";
import { getMap } from "@/lib/map-bus";
import type { Alert } from "@/lib/alerts";

type Tab = "uae" | "all" | "flagged" | "security" | "unrest" | "disasters" | "diplomacy" | "health" | "cyber";
const SEV = ["text-t2", "text-accent", "text-warn", "text-down"] as const;
const ICON = { hazard: Activity, health: HeartPulse, event: Radio, news: Newspaper, diplomacy: Handshake, cyber: ShieldAlert } as const;
const TABS: { id: Tab; key: "alertsUae" | "alertsAll" | "alertsFlagged" | "alertsSecurity" | "alertsUnrest" | "alertsDisasters" | "alertsDiplomacy" | "alertsHealth" | "alertsCyber"; test: (a: Alert) => boolean }[] = [
  { id: "uae", key: "alertsUae", test: (a) => a.uae }, { id: "all", key: "alertsAll", test: () => true },
  { id: "flagged", key: "alertsFlagged", test: (a) => a.sev >= 2 }, { id: "security", key: "alertsSecurity", test: (a) => a.security },
  { id: "unrest", key: "alertsUnrest", test: (a) => a.cat === "unrest" }, { id: "disasters", key: "alertsDisasters", test: (a) => a.cat === "disasters" },
  { id: "diplomacy", key: "alertsDiplomacy", test: (a) => a.cat === "diplomacy" }, { id: "health", key: "alertsHealth", test: (a) => a.cat === "health" }, { id: "cyber", key: "alertsCyber", test: (a) => a.cat === "cyber" },
];
const rel = (now: number, t: number) => { const m = Math.max(0, Math.round((now - t) / 60000)); return m < 1 ? "now" : m < 60 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };

/** The bell's feed: one merged list from hazards, WHO, GDELT and headlines, with tabs for what matters to a UAE desk. */
export function AlertsPanel() {
  const { t, lang } = useT(); const open = useStore((s) => s.alertsOpen); const setOpen = useStore((s) => s.setAlertsOpen);
  const { items, error, markSeen, sources, at } = useAlerts(); const down = Object.entries(sources).filter(([, ok]) => !ok).map(([k]) => k); const [tab, setTab] = useState<Tab>("uae"); const [now, setNow] = useState(0);
  useEffect(() => { if (!open) return; markSeen(); const tick = () => setNow(Date.now()); const first = setTimeout(tick, 0); const i = setInterval(tick, 30_000); return () => { clearTimeout(first); clearInterval(i); }; }, [open, markSeen]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, setOpen]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((x) => [x.id, items.filter(x.test).length])) as Record<Tab, number>, [items]);
  const list = useMemo(() => items.filter(TABS.find((x) => x.id === tab)!.test).slice(0, 80), [items, tab]);
  if (!open) return null;
  const locate = (a: Alert) => { const m = getMap(); if (a.coords && m) m.flyTo({ center: a.coords, zoom: Math.max(m.getZoom(), 5), duration: 1400 }); };
  return (
    <aside role="dialog" aria-label={t("alerts")} className="glass anim-rise absolute inset-x-2 top-[68px] z-40 flex max-h-[calc(100%-150px)] flex-col overflow-hidden rounded-[16px] sm:inset-x-auto sm:end-3 sm:w-[390px]">
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="display text-[15px] font-semibold">{t("alerts")}</h2><button onClick={() => setOpen(false)} aria-label={t("close")} className="grid size-8 place-items-center rounded-md text-t1 hover:text-t0"><X size={16} /></button></div>
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pt-2">
        {TABS.map((x) => <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-medium transition-colors ${tab === x.id ? "bg-accent text-[var(--accent-ink)]" : "bg-bg3 text-t1 hover:text-t0"}`}>{t(x.key)}<span className="num text-[10.5px] opacity-75">{counts[x.id]}</span></button>)}
      </div>
      {(down.length > 0 || (error && items.length > 0)) && <p role="status" className="mx-3 mt-2 rounded-[8px] border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-[11.5px] leading-snug text-t0">{error && items.length > 0 ? (lang === "ar" ? "تعذّر تحديث التنبيهات؛ تُعرض آخر نتائج وصلت." : "The feed could not be refreshed; showing the last results.") : (lang === "ar" ? `مصادر لا تستجيب الآن: ${down.join("، ")}. غياب تنبيهات منها لا يعني خلو الوضع.` : `Sources not answering right now: ${down.join(", ")}. No alerts from them does not mean all clear.`)}{at ? <span className="num ms-1 text-t2">{lang === "ar" ? "آخر تحديث" : "updated"} {new Date(at).toISOString().slice(11, 16)} UTC</span> : null}</p>}
      <ul className="scroll-thin mt-2 min-h-[80px] flex-1 overflow-y-auto px-2 pb-2">
        {error && !items.length && <li className="px-3 py-6 text-center text-[13px] text-t2">{t("feedError")}</li>}
        {!error && !items.length && <li className="px-3 py-6 text-center text-[13px] text-t2">{t("feedLoading")}</li>}
        {!!items.length && !list.length && <li className="px-3 py-6 text-center text-[13px] text-t2">{t("alertsEmpty")}</li>}
        {list.map((a) => { const Icon = ICON[a.kind]; return (
          <li key={a.id} className="flex gap-2.5 rounded-[10px] px-2 py-2 hover:bg-bg3">
            <span className={`mt-0.5 shrink-0 ${SEV[a.sev]}`}><Icon size={15} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-t0">{a.title}</div>
              <div className="num mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-t2"><span>{a.src}</span>{now > 0 && <span>{rel(now, a.t)}</span>}{a.uae && <span className="text-accent">UAE</span>}
                {a.coords && <button onClick={() => locate(a)} className="inline-flex items-center gap-1 text-t1 hover:text-accent"><LocateFixed size={11} />{t("alertsLocate")}</button>}
                {a.url && /^https?:/.test(a.url) && <a href={a.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-t1 hover:text-accent"><ExternalLink size={11} />Open</a>}</div>
            </div>
          </li>); })}
      </ul>
      <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-t2">{t("alertsNote")}</p>
    </aside>
  );
}
