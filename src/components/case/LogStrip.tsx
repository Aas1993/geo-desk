"use client";
import { useMemo } from "react";
import { addMissing, decisionFromText, logCounts, textRef } from "@/lib/case/log";
import { useNow } from "@/lib/use-now";
import type { Lang } from "../falcon/bits";
import { useTr } from "./bits";
import { useDecisionLog } from "./work";

/** Under the decisions asked of the reader: log them with one click (a review date 30 days ahead, editable later), and see what is already due. Logging the same sentence twice does nothing. */
export function LogStrip({ L, iso, items, from, onOpen }: { L: Lang; iso: string; items: string[]; from: "architect" | "council" | "data"; onOpen: () => void }) {
  const t = useTr(L); const now = useNow(60_000); const [ds, setDs] = useDecisionLog(); const c = useMemo(() => logCounts(ds, iso, now), [ds, iso, now]);
  const loggable = from === "data" ? [] : items; const have = new Set(ds.map((d) => d.ref)); const todo = loggable.filter((x) => !have.has(textRef(iso, x)));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px]">
      {loggable.length > 0 && (todo.length > 0 ? <button type="button" onClick={() => setDs((x) => addMissing(x, todo.map((s, i) => decisionFromText(iso, s, from as "architect" | "council", new Date(), x.length + i))))} className="h-8 rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-[var(--accent-ink)]">{t(`Add ${todo.length === loggable.length ? "these" : todo.length} to the decision log`, `أضف ${todo.length === loggable.length ? "هذه" : todo.length} إلى سجل القرارات`)}</button> : <span className="text-ok">✓ {t("All logged for review", "كلها مسجّلة للمراجعة")}</span>)}
      <span className="numt text-t1">{t(`${c.open} open · ${c.due} due within 14 days · ${c.overdue} overdue`, `${c.open} مفتوح · ${c.due} مستحق خلال 14 يومًا · ${c.overdue} متأخر`)}</span>
      <button type="button" onClick={onOpen} className="ms-auto text-accent hover:underline">{t("Open the decision log", "افتح سجل القرارات")}</button>
    </div>
  );
}
