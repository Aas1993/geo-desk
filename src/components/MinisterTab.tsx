"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { useT } from "@/lib/store";
import { PrepPack } from "./PrepPack";
import { DossierWorkspace } from "./DossierWorkspace";
import type { Country } from "@/lib/types";

/** Minister tab: the detailed briefing workspace (executive brief, dossier, talking points) above the quick one-click prep pack. */
export function MinisterTab({ c }: { c: Country }) {
  const { lang } = useT(); const [open, setOpen] = useState(false); const ar = lang === "ar";
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5">
        <h3 className="display text-[15px] font-semibold text-t0">{ar ? "موجز الوزير التفصيلي" : "Detailed ministerial briefing"}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-t1">{ar ? "ثلاث وثائق مترابطة: موجز تنفيذي لخمس دقائق، وملف استخباري استراتيجي عن الدولة، ونقاط حديث للقاء بعينه. تختار الطرف المقابل ونوع اللقاء والعمق والتركيز واللغة، ويُصدَّر الناتج بصيغة PDF أو Word أو PowerPoint." : "Three linked documents: a five-minute executive brief, a strategic country intelligence dossier and talking points for a specific meeting. Choose the counterpart, meeting type, depth, focus and language; export to PDF, Word or PowerPoint. It researches the web as well as this app's data, and only runs when you click."}</p>
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><FileText size={15} />{ar ? "فتح مساحة الموجز" : "Open the briefing workspace"}</button>
      </div>
      <PrepPack c={c} />
      {open && <DossierWorkspace c={c} onClose={() => setOpen(false)} />}
    </div>
  );
}
