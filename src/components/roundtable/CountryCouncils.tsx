"use client";
import type { CaseData } from "@/lib/case/load";
import { useJson } from "../deep/hooks";
import { useTr } from "../case/bits";
import type { Lang } from "../falcon/bits";
import { CouncilRoundTable } from "./CouncilRoundTable";

/** The map country panel's "Councils" tab: the Round Table for the country, with the Case File loaded here for the rule-built baseline. */
export function CountryCouncils({ iso, name, L }: { iso: string; name: string; L: Lang }) {
  const t = useTr(L); const load = useJson<CaseData>(iso && iso !== "ARE" ? `/api/case/${iso}` : null);
  if (iso === "ARE") return <p className="text-[13px] text-t1">{t("The councils look at other countries from the UAE's side; pick another country.", "تنظر المجالس إلى الدول الأخرى من جانب الإمارات؛ اختر دولة أخرى.")}</p>;
  return <CouncilRoundTable L={L} iso={iso} name={name} d={load.data} lens="country" />;
}
