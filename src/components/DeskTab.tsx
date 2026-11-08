"use client";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useT } from "@/lib/store";
import { DossierWorkspace } from "./DossierWorkspace";
import type { Country } from "@/lib/types";

/** Desk brief tab: a long political and economic country brief for a desk officer, with the topics, length and detail chosen by the officer. */
export function DeskTab({ c }: { c: Country }) {
  const { lang } = useT(); const [open, setOpen] = useState(false); const ar = lang === "ar";
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5">
        <h3 className="display text-[15px] font-semibold text-t0">{ar ? "موجز مكتب الشؤون السياسية والاقتصادية" : "Political and economic desk brief"}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-t1">{ar ? "موجز تحليلي مفصّل لضابط المكتب، يغطي كل الجبهات: القيادة والسياسة الداخلية والسياسة الخارجية والأمن والعقوبات والاقتصاد الكلي والمالية العامة والتجارة والاستثمار والقطاعات والعلاقة مع الإمارات والسيناريوهات. تختار المواضيع بنفسك، والطول (من 1500 إلى 14000 كلمة)، ومستوى التفصيل، والأفق الزمني، واللغة. يُصدَّر بصيغة PDF أو Word أو PowerPoint." : "A detailed analytical brief for a desk officer, across every front: leadership and domestic politics, foreign policy, security, sanctions, the macroeconomy, public finances, trade, investment, sectors, the relationship with the UAE, scenarios and a watchlist. You choose the topics, the length (about 1,500 to 14,000 words), the level of detail, the time horizon and the language. Export to PDF, Word or PowerPoint. It reads the web as well as this app's data and only runs when you click."}</p>
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><ClipboardList size={15} />{ar ? "فتح مساحة موجز المكتب" : "Open the desk brief workspace"}</button>
      </div>
      {open && <DossierWorkspace c={c} mode="desk" onClose={() => setOpen(false)} />}
    </div>
  );
}
