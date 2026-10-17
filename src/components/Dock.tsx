"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2, CandlestickChart, Layers, Languages, Sun, Moon, ALargeSmall, ArrowLeftRight } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import type { ReactNode } from "react";

function Item({ label, active, children, onClick, href }: { label: string; active?: boolean; children: ReactNode; onClick?: () => void; href?: string }) {
  const cls = `group relative grid size-11 place-items-center rounded-[8px] transition-colors ${active ? "bg-bg2 text-accent" : "text-t1 hover:bg-bg2 hover:text-t0"}`;
  const bar = active ? <i className="absolute inset-y-2 -start-[7px] w-[3px] rounded-full bg-accent" /> : null;
  return href ? (
    <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={cls}>{bar}{children}</Link>
  ) : (
    <button aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={cls}>{bar}{children}</button>
  );
}

export function Dock() {
  const { t } = useT(); const path = usePathname();
  const { theme, toggleTheme, toggleLang, cycleScale, menuOpen, setMenu, cmpOpen, openCompare, closeCompare, sel } = useStore();
  const world = path === "/"; const markets = path.startsWith("/markets");
  return (
    <aside aria-label="Navigation" className="absolute inset-y-0 start-0 z-40 hidden w-14 flex-col items-center border-e border-line bg-bg1 py-3 sm:flex">
      <Link href="/" aria-label={t("appName")} className="display mb-4 grid size-10 place-items-center rounded-[8px] bg-accent text-[22px] font-semibold text-[var(--accent-ink)]">G</Link>
      <nav className="flex flex-col gap-1.5">
        <Item href="/" label={t("nav_world")} active={world}><Globe2 size={20} strokeWidth={1.6} /></Item>
        <Item href="/markets" label={t("nav_markets")} active={markets}><CandlestickChart size={20} strokeWidth={1.6} /></Item>
        {world && <>
          <div className="mx-auto my-1 h-px w-6 bg-line" />
          <Item label={t("layers")} active={menuOpen} onClick={() => setMenu(!menuOpen)}><Layers size={19} strokeWidth={1.6} /></Item>
          <Item label={t("compare")} active={cmpOpen} onClick={() => (cmpOpen ? closeCompare() : openCompare(sel === "ARE" ? null : "ARE"))}><ArrowLeftRight size={19} strokeWidth={1.6} /></Item>
        </>}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5">
        <Item label={t("language")} onClick={toggleLang}><Languages size={19} strokeWidth={1.6} /></Item>
        <Item label={t("theme")} onClick={toggleTheme}>{theme === "dark" ? <Sun size={19} strokeWidth={1.6} /> : <Moon size={19} strokeWidth={1.6} />}</Item>
        <Item label={t("textSize")} onClick={cycleScale}><ALargeSmall size={20} strokeWidth={1.6} /></Item>
      </div>
    </aside>
  );
}
