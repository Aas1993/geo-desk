"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Newspaper } from "lucide-react";
import { useT, useStore } from "@/lib/store";
import { CountryPicker, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useStored } from "../deep/hooks";
import { useTr } from "../case/bits";
import { HubApp } from "./HubApp";

/** The country chooser above the board; the choice is the URL (/hub/XXX) so the hub can be linked and reloaded. */
function Chooser({ iso }: { iso: string | null }) {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list } = useCountryList(); const r = useRouter();
  return <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-bg1 p-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Country", "الدولة")}</span><CountryPicker list={list} value={iso} onPick={(i) => r.push(`/hub/${i}`)} L={L} /></div></div>;
}
/** /hub: pick a country (the selected map country or the last hub country is offered first). */
export function HubPicker() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const r = useRouter(); const sel = useStore((s) => s.sel); const [last] = useStored<{ iso: string | null }>("gd-hub-last", { iso: null });
  useEffect(() => { const k = setTimeout(() => { const i = sel && sel !== "ARE" ? sel : last.iso; if (i && /^[A-Z]{3}$/.test(i)) r.replace(`/hub/${i}`); }, 250); return () => clearTimeout(k); }, [sel, last.iso, r]);
  return (
    <div className="space-y-4"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Newspaper size={20} /></span>{t("Country Updates Hub", "مركز مستجدات الدولة")}</h1>
      <p className="text-[13px] font-medium text-t0">{t("A country's national, political, economic and security updates from every angle on one board, with the visits, deals, alerts and macro movers, a clip tray that feeds the reports, and a marker for what is new since you last looked. Click a country on the world map, or choose one here.", "مستجدات الدولة الوطنية والسياسية والاقتصادية والأمنية من كل زاوية على لوحة واحدة، مع الزيارات والصفقات والتنبيهات وتحركات الاقتصاد الكلي، وصينية مقتطفات تغذي التقارير، وعلامة لما استجد منذ آخر مرة نظرت فيها. انقر دولة على خريطة العالم أو اخترها هنا.")}</p>
      <Chooser iso={null} /></div>
  );
}
/** /hub/XXX: the board for one country. */
export function HubPage({ iso }: { iso: string }) {
  const [, setLast] = useStored<{ iso: string | null }>("gd-hub-last", { iso: null });
  useEffect(() => { const k = setTimeout(() => setLast({ iso }), 0); return () => clearTimeout(k); }, [iso, setLast]);
  return <div className="space-y-3"><Chooser iso={iso} /><HubApp iso={iso} /></div>;
}
