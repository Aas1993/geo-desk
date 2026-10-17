"use client";
import { usePathname } from "next/navigation";
import { ALargeSmall, Crosshair, Globe, Languages, LocateFixed, Map as MapIcon, Minus, Moon, Plus, Satellite, Sun, SunMoon } from "lucide-react";
import { IconBtn } from "./ui";
import { useStore, useT } from "@/lib/store";

export function RightRail() {
  const { t } = useT(); const world = usePathname() === "/";
  const { theme, toggleTheme, toggleLang, cycleScale, zoom, goHome, projection, setProjection, basemap, setBasemap, terminator, toggleTerminator, locate } = useStore();
  const sep = <div className="mx-1.5 my-0.5 h-px bg-line" />;
  return (
    <nav aria-label="Map controls" className="glass absolute end-3 top-[calc(50%+18px)] z-20 hidden -translate-y-1/2 flex-col gap-0.5 rounded-[12px] p-1 sm:flex">
      <IconBtn label={t("language")} onClick={toggleLang}><Languages size={18} /></IconBtn>
      <IconBtn label={t("theme")} onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</IconBtn>
      <IconBtn label={t("textSize")} onClick={cycleScale}><ALargeSmall size={19} /></IconBtn>
      {world && <>
        {sep}
        <IconBtn label={terminator ? t("hideNight") : t("showNight")} active={terminator} onClick={toggleTerminator}><SunMoon size={18} /></IconBtn>
        <IconBtn label={projection === "globe" ? t("flatMap") : t("globeMap")} active={projection === "mercator"} onClick={() => setProjection(projection === "globe" ? "mercator" : "globe")}>{projection === "globe" ? <MapIcon size={18} /> : <Globe size={18} />}</IconBtn>
        <IconBtn label={t("satellite")} active={basemap === "satellite"} onClick={() => setBasemap(basemap === "satellite" ? "dark" : "satellite")}><Satellite size={18} /></IconBtn>
        <IconBtn label={t("myLocation")} onClick={locate}><LocateFixed size={18} /></IconBtn>
        {sep}
        <IconBtn label={t("zoomIn")} onClick={() => zoom(1)}><Plus size={18} /></IconBtn>
        <IconBtn label={t("zoomOut")} onClick={() => zoom(-1)}><Minus size={18} /></IconBtn>
        <IconBtn label={t("home")} onClick={goHome}><Crosshair size={17} /></IconBtn>
      </>}
    </nav>
  );
}
