"use client";
import type { ReactNode } from "react";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { loadProvider } from "@/lib/markets/client";
import { Skeleton } from "./ui";

export function ProviderBanner({ synthetic }: { synthetic?: boolean }) {
  const { t } = useT(); const p = useKeyed("p", loadProvider).value;
  if (p?.fixtures || synthetic) return (
    <div role="status" className="rounded-[6px] border border-warn/50 bg-warn/10 px-3 py-2 text-[12.5px] text-t0"><b className="text-warn">{t("mk_synth")}</b> — {t("mk_synthBody")}</div>
  );
  if (p && !p.keyConfigured) return (
    <div role="status" className="rounded-[6px] border border-line2 bg-bg2 px-3 py-2.5 text-[12.5px] text-t1">
      <b className="text-t0">{t("mk_nokey")}</b> {t("mk_nokeyBody")} <code className="num rounded bg-bg3 px-1.5 py-0.5 text-[11.5px] text-accent">TWELVEDATA_API_KEY</code> <span>{t("mk_nokeyTail")}</span>
    </div>
  );
  return null;
}
export function Panel({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[8px] border border-line bg-bg1 ${className}`}>
      {title && <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5"><h3 className="label">{title}</h3>{aside}</header>}
      <div className="p-4">{children}</div>
    </section>
  );
}
export function KV({ k, v, hint, tone }: { k: string; v: ReactNode; hint?: string; tone?: "up" | "down" | "" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-[13px] last:border-0">
      <span className="text-t1" title={hint}>{k}</span><span className={`num text-end font-medium ${tone ?? ""}`}>{v}</span>
    </div>
  );
}
export function Pending({ rows = 4 }: { rows?: number }) { return <div className="space-y-2">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={20} />)}</div>; }
export function Unavailable({ error, message, onRetry }: { error: string; message?: string; onRetry?: () => void }) {
  const { t } = useT();
  const text = error === "no_key" ? t("mk_err_nokey") : error === "plan" ? t("mk_err_plan") : error === "not_found" ? t("mk_err_notfound") : error === "rate" ? t("mk_err_rate") : t("mk_err_upstream");
  return (
    <div className="rounded-[6px] border border-dashed border-line2 p-4 text-[12.5px] text-t1">
      <div className="font-medium text-t0">{text}</div>
      {message && error !== "no_key" && <div className="mt-1 break-words text-t2">{message}</div>}
      {onRetry && error !== "no_key" && <button onClick={onRetry} className="mt-2.5 rounded-full border border-line2 px-3 py-1 text-accent hover:bg-bg2">{t("retry")}</button>}
    </div>
  );
}
