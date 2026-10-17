"use client";
import { CountryPicker } from "./SearchBox";
import { useStore, useT } from "@/lib/store";

export function Onboarding() {
  const { t } = useT(); const { onboarded, finishOnboarding, setDesk, select, goHome } = useStore();
  if (onboarded) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-start justify-center bg-black/50 px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className="glass anim-rise w-full max-w-[420px] rounded-[10px] p-5">
        <div className="rule-gold mb-3" /><h2 id="onb-title" className="display text-[22px] font-semibold">{t("onbTitle")}</h2>
        <p className="mt-1.5 text-[13px] text-t1">{t("onbBody")}</p>
        <div className="mt-4 overflow-hidden rounded-[6px] border border-line bg-bg2 px-3 focus-within:border-accent">
          <CountryPicker inline autoFocus placeholder={t("onbType")} onPick={(c) => { setDesk(c.iso3); finishOnboarding(); select(c.iso3); }} />
        </div>
        <div className="mt-4 flex justify-between text-[13px]">
          <button onClick={() => { finishOnboarding(); goHome(); }} className="text-accent underline underline-offset-2">{t("onbSkip")}</button>
        </div>
      </div>
    </div>
  );
}
