"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Bell, Brain, Briefcase, CandlestickChart, Compass, Crown, Eye, Globe2, Handshake, Languages, Menu, Moon, Sun } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { useStore, useT } from "@/lib/store";
import { useAlertCount } from "@/lib/alerts-client";
import type { Headline } from "@/lib/types";

export function Clock({ feedAt, feedOk }: { feedAt: number | null; feedOk: boolean }) {
  const { t, lang } = useT(); const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); const t0 = setTimeout(tick, 0); const i = setInterval(tick, 1000); return () => { clearTimeout(t0); clearInterval(i); }; }, []);
  if (!now) return <div className="h-[58px] w-[150px]" />;
  const loc = lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB";
  const dubai = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { timeZone: "Asia/Dubai", ...o }).format(now);
  const age = feedAt ? Math.max(0, Math.round((now.getTime() - feedAt) / 1000)) : null;
  return (
    <div className="glass rounded-[12px] px-3.5 py-2 text-end">
      <div className="num text-[22px] leading-none font-medium tracking-tight text-t0">{dubai({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}<span className="text-[13px] text-t2">:{dubai({ second: "2-digit" })}</span></div>
      <div className="mt-1 flex items-center justify-end gap-2 text-[10.5px] text-t2">
        <span>{dubai({ weekday: "short", day: "numeric", month: "short" })} · GST</span>
        <span className="flex items-center gap-1"><i className={`inline-block size-1.5 rounded-full ${feedOk ? "bg-up shadow-[0_0_6px_var(--up)]" : "bg-down"}`} />{feedOk ? `${t("live")}${age != null ? ` ${age < 90 ? age + "s" : Math.round(age / 60) + "m"}` : ""}` : t("offline")}</span>
      </div>
    </div>
  );
}

function NavPills() {
  const { t } = useT(); const path = usePathname();
  const item = (href: string, on: boolean, icon: React.ReactNode, label: string) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`flex h-9 items-center gap-2 rounded-[9px] px-3 text-[12.5px] font-medium transition-colors ${on ? "bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]" : "text-t1 hover:bg-bg3 hover:text-t0"}`}>{icon}<span className="hidden lg:inline">{label}</span></Link>
  );
  return <nav aria-label="Sections" className="glass hidden h-11 items-center gap-1 rounded-[12px] p-1 sm:flex">{item("/", path === "/", <Globe2 size={16} />, t("nav_world"))}{item("/case", path.startsWith("/case"), <Briefcase size={16} />, t("nav_case"))}{item("/king", path.startsWith("/king"), <Crown size={16} />, t("nav_king"))}{item("/ambassador", path.startsWith("/ambassador"), <Handshake size={16} />, t("nav_amb"))}{item("/markets", path.startsWith("/markets"), <CandlestickChart size={16} />, t("nav_markets"))}{item("/falcon", path.startsWith("/falcon"), <Eye size={16} />, t("nav_falcon"))}{item("/deep", path.startsWith("/deep"), <Brain size={16} />, t("nav_deep"))}{item("/machiavelli", path.startsWith("/machiavelli"), <Compass size={16} />, t("nav_mach"))}{item("/influence", path.startsWith("/influence"), <Award size={16} />, t("nav_influence"))}</nav>;
}

export function TopBar({ feed }: { feed: { items: Headline[]; at: number | null; ok: boolean } }) {
  const { t } = useT(); const path = usePathname(); const world = path === "/";
  const { theme, toggleTheme, toggleLang, menuOpen, setMenu, alertsOpen, setAlertsOpen } = useStore(); const alerts = useAlertCount();
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2.5 p-3">
      <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 sm:max-w-[470px]">
        {world && <button aria-label={t("layers")} aria-expanded={menuOpen} onClick={() => setMenu(!menuOpen)} className={`glass hidden size-11 shrink-0 place-items-center rounded-[12px] transition-colors sm:grid ${menuOpen ? "text-accent hud-glow" : "text-t0 hover:text-accent"}`}><Menu size={19} /></button>}
        <SearchBox />
      </div>
      <div className="pointer-events-auto ms-auto flex items-start gap-2.5">
        <NavPills />
        <div className="hidden md:block"><Clock feedAt={feed.at} feedOk={feed.ok} /></div>
        <button aria-label={t("alerts")} aria-expanded={alertsOpen} onClick={() => setAlertsOpen(!alertsOpen)} className={`glass relative grid size-11 place-items-center rounded-[12px] transition-colors ${alertsOpen ? "text-accent hud-glow" : "text-t0 hover:text-accent"}`}>
          <Bell size={18} />{alerts > 0 && <span className="num absolute -end-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-down px-1 text-[10px] font-semibold leading-[18px] text-white">{alerts > 99 ? "99+" : alerts}</span>}
        </button>
        <div className="flex gap-1.5 sm:hidden">
          <button aria-label={t("language")} onClick={toggleLang} className="glass grid size-11 place-items-center rounded-[12px] text-t1"><Languages size={18} /></button>
          <button aria-label={t("theme")} onClick={toggleTheme} className="glass grid size-11 place-items-center rounded-[12px] text-t1">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>
    </header>
  );
}
