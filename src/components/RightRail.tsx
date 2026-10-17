"use client";
import { Plus, Minus, Crosshair } from "lucide-react";
import { IconBtn } from "./ui";
import { useStore, useT } from "@/lib/store";

export function RightRail() {
  const { t } = useT(); const { zoom, goHome } = useStore();
  return (
    <nav aria-label="Map controls" className="glass absolute end-3 top-4 z-20 hidden flex-col gap-0.5 rounded-[8px] p-0.5 sm:flex">
      <IconBtn label={t("zoomIn")} onClick={() => zoom(1)}><Plus size={18} /></IconBtn>
      <IconBtn label={t("zoomOut")} onClick={() => zoom(-1)}><Minus size={18} /></IconBtn>
      <div className="mx-1.5 h-px bg-line" />
      <IconBtn label={t("home")} onClick={goHome}><Crosshair size={17} /></IconBtn>
    </nav>
  );
}
