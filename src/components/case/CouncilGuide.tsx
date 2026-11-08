"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { architectKey, councilKey, readProduct, type SavedProduct } from "@/lib/case/saved";
import type { Lang } from "../falcon/bits";

/** One line at the top of the other councils: the Case File's 20-seat council is the one the ministerial file is built from, and says whether it already exists for this country, so the same question is not paid for twice. */
export function CouncilGuide({ L, iso }: { L: Lang; iso: string | null }) {
  const [c, setC] = useState<SavedProduct | null>(null); const [a, setA] = useState<SavedProduct | null>(null);
  useEffect(() => { const t0 = setTimeout(() => { setC(iso ? readProduct(councilKey(iso)) : null); setA(iso ? readProduct(architectKey(iso)) : null); }, 0); return () => clearTimeout(t0); }, [iso]);
  const ar = L === "ar";
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] bg-bg2 p-2.5 text-[12px] leading-snug text-t1" role="note">
      <span>{ar ? "المجلس الاستراتيجي بعشرين مقعدًا في ملف الحالة هو الذي يُبنى منه الملف الوزاري:" : "The Case File's 20-seat Strategic Council is the one the ministerial file is built from:"}</span>
      <b className="text-t0">{iso ? (c ? (ar ? `محفوظ لهذه الدولة (${c.at.slice(0, 10)})` : `on file for this country (${c.at.slice(0, 10)})`) : ar ? "لم يُشغَّل لهذه الدولة" : "not run for this country") : ar ? "اختر دولة" : "choose a country"}</b>
      {iso && a && <span>{ar ? `· الاستراتيجية محفوظة (${a.at.slice(0, 10)})` : `· strategy on file (${a.at.slice(0, 10)})`}</span>}
      <Link href="/case#detailed/council" className="ms-auto text-accent hover:underline">{ar ? "افتح ملف الحالة" : "Open the Case File"}</Link>
    </p>
  );
}
