"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/store";

const KEY = "gd-economy";
/** Economy mode for the two one-call briefs: a smaller model, about 70 percent cheaper, a little less careful. Remembered in this browser. */
export function useEconomy() {
  const [eco, setEco] = useState(false);
  useEffect(() => { const t = setTimeout(() => { try { setEco(localStorage.getItem(KEY) === "1"); } catch { /* storage unavailable */ } }, 0); return () => clearTimeout(t); }, []);
  const set = (v: boolean) => { setEco(v); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* storage unavailable */ } };
  return [eco, set] as const;
}
export function EconomySwitch({ eco, onChange }: { eco: boolean; onChange: (v: boolean) => void }) {
  const { lang } = useT();
  return (
    <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11.5px] leading-snug text-t1">
      <input type="checkbox" checked={eco} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
      <span>{lang === "ar" ? "وضع التوفير: نموذج أصغر وأرخص بنحو 70% (أقل دقة قليلًا في الاستنتاج). الافتراضي أدق." : "Economy mode: a smaller model, about 70% cheaper and a little less careful in its reasoning. The default is more careful."}</span>
    </label>
  );
}
