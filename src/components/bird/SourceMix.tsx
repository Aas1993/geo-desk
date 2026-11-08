"use client";
import { KIND_LABEL, sourceMix } from "@/lib/sourcemix";
import type { Lang } from "../falcon/bits";

/** What the product read, at a glance: the sources of the run grouped by kind, with the domains behind each group. It shows whether the world's institutions and think tanks were consulted, not whether they were right. */
export function SourceMix({ sources, L }: { sources: { url: string }[]; L: Lang }) {
  const { total, mix } = sourceMix(sources); if (!total) return null; const t = (en: string, ar: string) => (L === "ar" ? ar : en);
  return (
    <details className="mt-2 rounded-[12px] border border-line bg-bg2">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-2.5 text-[12px] text-t0"><b>{t("Sources read", "المصادر المقروءة")}</b><span className="numt text-t2">{total}</span>{mix.map((m) => <span key={m.kind} className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[10.5px]" style={{ background: `color-mix(in srgb, ${KIND_LABEL[m.kind].c} 15%, transparent)`, color: KIND_LABEL[m.kind].c }}>{t(KIND_LABEL[m.kind].en, KIND_LABEL[m.kind].ar)} {m.n}</span>)}</summary>
      <div className="space-y-1.5 border-t border-line p-2.5">
        <div className="flex h-2 overflow-hidden rounded-full bg-bg3" role="img" aria-label={t("Share of sources by kind", "حصة المصادر بحسب النوع")}>{mix.map((m) => <span key={m.kind} style={{ width: `${(m.n / total) * 100}%`, background: KIND_LABEL[m.kind].c }} />)}</div>
        <ul className="space-y-1 text-[11.5px] leading-snug">{mix.map((m) => <li key={m.kind}><b style={{ color: KIND_LABEL[m.kind].c }}>{t(KIND_LABEL[m.kind].en, KIND_LABEL[m.kind].ar)}</b> <span className="text-t2">{m.hosts.slice(0, 10).join(" · ")}{m.hosts.length > 10 ? " …" : ""}</span></li>)}</ul>
      </div>
    </details>
  );
}
