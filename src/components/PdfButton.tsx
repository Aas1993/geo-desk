"use client";
import { useState } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { downloadReport, readSourceByKey, type Source } from "@/lib/reportpdf";
import type { Lang } from "./falcon/bits";

/** The PDF report of a finished product: made from what is saved in this browser, downloaded and kept in the Archive. Give it the key the product is saved under, or the product itself. */
export function PdfButton({ L, storeKey, source, className }: { L: Lang; storeKey?: string; source?: Source; className?: string }) {
  const ar = L === "ar"; const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle"); const [pct, setPct] = useState(0);
  const go = async () => {
    const s = source ?? (storeKey ? readSourceByKey(storeKey)[0] : undefined); if (!s) { setState("error"); return; }
    setState("busy"); setPct(0); try { await downloadReport(s, { onProgress: (d, t) => setPct(Math.round((d / Math.max(1, t)) * 100)) }); setState("done"); } catch { setState("error"); }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={go} disabled={state === "busy"} className={className ?? "inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0 disabled:opacity-60"}><FileDown size={13} />{state === "busy" ? `${ar ? "جارٍ إعداد PDF" : "Making PDF"} ${pct}%` : "PDF"}</button>
      {state === "done" && <Link href="/archive" className="text-[11px] text-ok hover:underline">{ar ? "حُفظ في الأرشيف" : "Saved to the Archive"}</Link>}
      {state === "error" && <span role="alert" className="text-[11px] text-warn">{ar ? "تعذّر إعداد PDF" : "Could not make the PDF"}</span>}
    </span>
  );
}
