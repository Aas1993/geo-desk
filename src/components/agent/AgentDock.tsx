"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useGlobalCountry } from "@/lib/country";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { AskPanel } from "./AskPanel";

/** THE DESK AGENT WITHIN REACH ON EVERY PAGE: a button that opens the agent in a drawer over whatever page is open, so a question can be asked without leaving it. It is the same agent as the Agent page (the same panel, the same plan-then-confirm steps, the same last answer), and it asks about the country the app is on. Once opened it stays mounted while the drawer is closed, so a run in progress is not lost. Not shown on the Agent page itself. */
export function AgentDock() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const path = usePathname(); const g = useGlobalCountry(); const [open, setOpen] = useState(false); const [used, setUsed] = useState(false);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  if (path.startsWith("/agent")) return null;
  return (
    <>
      <button type="button" onClick={() => { setOpen((v) => !v); setUsed(true); }} aria-expanded={open} aria-label={t("Ask the Desk agent", "اسأل وكيل المكتب")} className="glass absolute bottom-[76px] end-3 z-40 inline-flex h-11 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold text-t0 hover:text-accent sm:bottom-14"><Bot size={17} aria-hidden /><span className="hidden sm:inline">{t("Ask the agent", "اسأل الوكيل")}</span></button>
      {used && (
        <aside hidden={!open} aria-label={t("Desk agent", "وكيل المكتب")} className="absolute inset-y-0 end-0 z-50 flex w-[min(560px,100vw)] flex-col border-s border-line bg-bg1 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line p-3"><span className="grid size-8 place-items-center rounded-[10px] bg-accent text-[var(--accent-ink)]"><Bot size={16} aria-hidden /></span><b className="flex-1 text-[14px] text-t0">{t("Desk agent", "وكيل المكتب")}</b><Link href="/agent" onClick={() => setOpen(false)} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-line px-2.5 text-[12px] text-t1 hover:border-accent hover:text-accent"><Maximize2 size={13} aria-hidden />{t("Full page", "صفحة كاملة")}</Link><button type="button" onClick={() => setOpen(false)} aria-label={t("Close", "إغلاق")} className="grid size-8 place-items-center rounded-[9px] border border-line text-t1 hover:text-t0"><X size={15} aria-hidden /></button></div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3"><AskPanel L={L} fixedIso={g.iso} storageKey="gd-agent-last" /></div>
        </aside>
      )}
    </>
  );
}
