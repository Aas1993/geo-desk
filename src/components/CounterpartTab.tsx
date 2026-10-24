"use client";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { useT } from "@/lib/store";
import { DossierWorkspace } from "./DossierWorkspace";
import type { Country } from "@/lib/types";

/** Counterpart tab: a profile of the person being met (documented career, public record on the UAE, priorities, incentives, track record, how to move them). Optional: it only runs when the officer opens it. */
export function CounterpartTab({ c }: { c: Country }) {
  const { lang } = useT(); const [open, setOpen] = useState(false); const ar = lang === "ar";
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-accent/40 bg-accent/5 p-3.5">
        <h3 className="display text-[15px] font-semibold text-t0">{ar ? "ملف الطرف المقابل" : "Counterpart profile"}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-t1">{ar ? "ملف عن الوزير أو المسؤول الذي ستلتقيه: من هو، ومسيرته الموثقة، وسجله العلني تجاه الإمارات، وأولوياته ودوافعه، وسجله في التفاوض، وكيف يُقنَع وما يجب تجنبه. الدور العام فقط ومن مصادر موثقة؛ لا شائعات ولا تخمينات، ويذكر الملف ما لا يمكن إثباته. اختياري، ولا يبدأ إلا حين تفتحه، ويُحتسب على حساب Anthropic." : "A profile of the minister or official you are about to meet: who they are, their documented career, their public record on the UAE, stated priorities and incentives, track record in negotiations, how to move them and what to avoid. Public role only, from documented sources; no rumour or guesswork, and it says what it cannot establish. Optional: it runs only when you open it, and bills your Anthropic account (about 20 cents)."}</p>
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)]"><UserRound size={15} />{ar ? "فتح ملف الطرف المقابل" : "Open the counterpart profile"}</button>
      </div>
      {open && <DossierWorkspace c={c} mode="counterpart" onClose={() => setOpen(false)} />}
    </div>
  );
}
