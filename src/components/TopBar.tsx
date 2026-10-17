"use client";
import { useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { useStore, useT } from "@/lib/store";
import type { Headline } from "@/lib/types";

export function Clock({ feedAt, feedOk }: { feedAt: number | null; feedOk: boolean }) {
  const { t, lang } = useT(); const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setNow(new Date()); const t0 = setTimeout(tick, 0); const i = setInterval(tick, 1000); return () => { clearTimeout(t0); clearInterval(i); }; }, []);
  if (!now) return <div className="h-9 w-44" />;
  const loc = lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB";
  const dubai = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { timeZone: "Asia/Dubai", ...o }).format(now);
  const age = feedAt ? Math.max(0, Math.round((now.getTime() - feedAt) / 1000)) : null;
  return (
    <div className="flex items-center gap-3 text-end">
      <div>
        <div className="num text-[18px] leading-none font-medium text-t0">{dubai({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })}<span className="ms-1.5 text-[10px] font-normal text-t2">GST</span></div>
        <div className="mt-1 text-[11px] text-t2">{dubai({ weekday: "short", day: "numeric", month: "short" })}</div>
      </div>
      <span className="hidden items-center gap-1.5 border-s border-line ps-3 text-[11px] text-t2 md:flex"><i className={`inline-block size-1.5 rounded-full ${feedOk ? "bg-up" : "bg-down"}`} />{feedOk ? `${t("live")}${age != null ? ` · ${age < 90 ? age + "s" : Math.round(age / 60) + "m"}` : ""}` : t("offline")}</span>
    </div>
  );
}
export function TopBar({ feed }: { feed: { items: Headline[]; at: number | null; ok: boolean } }) {
  const { t } = useT(); const { theme, toggleTheme, toggleLang } = useStore();
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-bg1 px-3 sm:start-14 sm:px-5">
      <div className="hidden shrink-0 sm:block"><div className="display text-[19px] leading-none font-semibold">{t("appName")}</div><div className="label mt-1 !text-[9.5px]">{t("tagline")}</div></div>
      <div className="mx-auto w-full max-w-[560px] sm:w-[min(560px,46vw)]"><SearchBox /></div>
      <div className="hidden sm:block"><Clock feedAt={feed.at} feedOk={feed.ok} /></div>
      <div className="flex gap-1 sm:hidden">
        <button aria-label={t("language")} onClick={toggleLang} className="grid size-9 place-items-center rounded-[6px] text-t1"><Languages size={18} /></button>
        <button aria-label={t("theme")} onClick={toggleTheme} className="grid size-9 place-items-center rounded-[6px] text-t1">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </header>
  );
}
