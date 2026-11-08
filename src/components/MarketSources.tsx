"use client";
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { safeHttp } from "@/lib/url";
import { loadMarketSources, verificationState, type MarketSources as Data } from "@/lib/markets/sources";

type Lang = "en" | "ar";
const T = {
  en: {
    label: "Price source", unchecked: "Not independently checked", checked: "Independently checked", vendor: "licensed data vendor, not the exchange", plan: "ADX data needs the vendor's", plan2: "plan and DFM data its", plan3: "plan",
    none: "No second source for these prices could be reached by script, so a quote on this page is one publisher's figure. Compare it with the exchange's own screen before relying on it.", details: "What was tried", evidence: "Evidence", checkedOn: "checked", built: "Built", fail: "The source registry could not be loaded.",
  },
  ar: {
    label: "مصدر الأسعار", unchecked: "لم يُتحقق منها بمصدر مستقل", checked: "جرى التحقق منها بمصدر مستقل", vendor: "مزوّد بيانات مرخّص، وليس السوق", plan: "بيانات سوق أبوظبي تتطلب خطة", plan2: "لدى المزوّد وبيانات سوق دبي خطة", plan3: "",
    none: "لم نتمكن من الوصول بالبرمجة إلى مصدر ثانٍ لهذه الأسعار، فالسعر في هذه الصفحة رقم جهة نشر واحدة. قارنه بشاشة السوق نفسه قبل الاعتماد عليه.", details: "ما جرت تجربته", evidence: "الدليل", checkedOn: "فُحص", built: "أُنشئ", fail: "تعذّر تحميل سجل المصادر.",
  },
} as const;

export function MarketSources() {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed<Data>("msrc", loadMarketSources);
  if (q.loading) return null;
  const m = q.value; if (q.error || !m) return <div role="status" className="rounded-[6px] border border-line2 bg-bg2 px-3 py-2 text-[12px] text-t1">{u.fail}</div>;
  const ok = verificationState(m) === "checked"; const p = m.primary;
  return (
    <div role="status" className="rounded-[6px] border border-line2 bg-bg2 px-3 py-2.5 text-[12.5px] text-t1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="label">{u.label}</span>
        <a href={safeHttp(p.url)} target="_blank" rel="noreferrer noopener" className="font-semibold text-accent hover:underline">{p.name}</a>
        <span className="text-t2">({u.vendor})</span>
        <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${ok ? "var(--ok)" : "var(--warn)"} 18%, transparent)`, color: ok ? "var(--ok)" : "var(--warn)" }}>{ok ? u.checked : u.unchecked}</span>
      </div>
      {!ok && <p className="mt-1.5 leading-snug">{u.none}</p>}
      {(p.plan.ADX || p.plan.DFM) && <p className="mt-1 text-[11px] text-t2">{u.plan} {p.plan.ADX} {u.plan2} {p.plan.DFM} {u.plan3}.</p>}
      <details className="mt-2"><summary className="cursor-pointer text-[12px] font-medium text-t0">{u.details} · {m.checks.length}</summary>
        <ul className="mt-1.5 space-y-2 text-[11.5px] leading-snug">{m.checks.map((c) => (
          <li key={c.id}><a href={safeHttp(c.url)} target="_blank" rel="noreferrer noopener" className="font-medium text-accent hover:underline">{c.name}</a>: {c.reason}
            <span className="num block text-[10.5px] text-t2">{u.evidence}: {c.evidence.join(" · ")} · {u.checkedOn} {c.checked}</span></li>))}</ul>
        <p className="mt-2 text-[10.5px] text-t2">{u.built} {m.built.slice(0, 10)}</p></details>
    </div>
  );
}
