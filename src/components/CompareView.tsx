"use client";
import { Fragment, useMemo } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { useStore, useT } from "@/lib/store";
import { displayName } from "@/lib/countries";
import { useKeyed } from "@/lib/useKeyed";
import { loadAgree, loadIdeal } from "@/lib/un";
import { compact, int, last, pct, usd } from "@/lib/format";
import { CountryPicker, useCountries } from "./SearchBox";
import { useDetail } from "./CountryPanel";
import { IconBtn, Skeleton } from "./ui";
import type { Country, CountryDetail } from "@/lib/types";
import type { Lang } from "@/lib/format";
import type { Dict } from "@/lib/i18n";

type Metric = { key: keyof Dict; get: (c: Country, d: CountryDetail | null) => { v: number; y?: number } | null; fmt: (n: number, l: Lang) => string; group: "basics" | "eco" | "mil" | "soc" };
const ind = (k: string) => (_: Country, d: CountryDetail | null) => last(d?.indicators[k]);
const METRICS: Metric[] = [
  { key: "population", get: (c) => c.population, fmt: (n, l) => compact(n, l), group: "basics" },
  { key: "area", get: (c) => (c.areaKm2 ? { v: c.areaKm2 } : null), fmt: (n, l) => compact(n, l) + " km²", group: "basics" },
  { key: "gdp", get: ind("gdp"), fmt: (n, l) => usd(n, l), group: "eco" },
  { key: "gdpPc", get: ind("gdpPc"), fmt: (n, l) => "$" + int(n, l), group: "eco" },
  { key: "gdpGrowth", get: ind("gdpGrowth"), fmt: (n, l) => pct(n, l), group: "eco" },
  { key: "inflation", get: ind("inflation"), fmt: (n, l) => pct(n, l), group: "eco" },
  { key: "unemployment", get: ind("unemployment"), fmt: (n, l) => pct(n, l), group: "eco" },
  { key: "debt", get: ind("debt"), fmt: (n, l) => pct(n, l), group: "eco" },
  { key: "exports", get: ind("exports"), fmt: (n, l) => usd(n, l), group: "eco" },
  { key: "tradeGdp", get: ind("tradeGdp"), fmt: (n, l) => pct(n, l, 0), group: "eco" },
  { key: "milSpend", get: ind("milSpend"), fmt: (n, l) => usd(n, l), group: "mil" },
  { key: "milGdp", get: ind("milGdp"), fmt: (n, l) => pct(n, l), group: "mil" },
  { key: "milPers", get: ind("milPers"), fmt: (n, l) => int(n, l), group: "mil" },
  { key: "lifeExp", get: ind("lifeExp"), fmt: (n) => n.toFixed(1), group: "soc" },
  { key: "internet", get: ind("internet"), fmt: (n, l) => pct(n, l), group: "soc" },
];
const GROUP_LABEL: Record<Metric["group"], keyof Dict> = { basics: "tab_overview", eco: "tab_economy", mil: "tab_military", soc: "tab_society" };

function Side({ c, onClose, lang, role }: { c: Country | undefined; onClose?: () => void; lang: Lang; role: "a" | "b" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${role === "b" ? "justify-end text-end" : ""}`}>
      {c && role === "a" && <span className="text-[28px]" aria-hidden>{c.flag}</span>}
      <div className="min-w-0"><div className="truncate text-[16px] font-semibold">{c ? displayName(c, lang) : "—"}</div>{onClose && <div className="text-[11px] text-t2">{c?.capital}</div>}</div>
      {c && role === "b" && <span className="text-[28px]" aria-hidden>{c.flag}</span>}
    </div>
  );
}

export function CompareView() {
  const { t, lang } = useT(); const d = useCountries();
  const { cmpOpen, cmp, setCmp, closeCompare, sel, select } = useStore();
  const a = sel && d ? d.byIso.get(sel) : undefined; const b = cmp && d ? d.byIso.get(cmp) : undefined;
  const da = useDetail(a), db = useDetail(b);
  const ideal = useKeyed(cmpOpen ? "i" : null, loadIdeal).value;
  const agree = useKeyed(a ? a.iso3 : null, () => loadAgree(a!.iso3)).value;
  const rows = useMemo(() => METRICS.map((m) => ({ m, va: a ? m.get(a, da.data) : null, vb: b ? m.get(b, db.data) : null })), [a, b, da.data, db.data]);
  if (!cmpOpen) return null;
  const swap = () => { if (a && b) { select(b.iso3); setCmp(a.iso3); } };
  const agreement = a && b ? agree?.[b.iso3] : undefined;
  const ia = a && ideal?.[a.iso3] ? last(ideal[a.iso3]) : null, ib = b && ideal?.[b.iso3] ? last(ideal[b.iso3]) : null;
  const loading = (a && da.loading) || (b && db.loading);
  return (
    <section aria-label={t("compare")} className="glass anim-slide fixed inset-x-2 bottom-[72px] top-[72px] z-30 flex flex-col rounded-t-[10px] sm:absolute sm:inset-x-auto sm:bottom-16 sm:start-3 sm:top-[76px] sm:w-[560px] sm:rounded-[16px]">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ArrowLeftRight size={16} className="text-accent" aria-hidden /><h2 className="display flex-1 text-[18px] font-semibold">{t("compare")}</h2>
        <IconBtn label={t("closeCompare")} onClick={closeCompare}><X size={18} /></IconBtn>
      </header>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3">
        <Side c={a} lang={lang} role="a" />
        <IconBtn label={t("swap")} onClick={swap}><ArrowLeftRight size={16} /></IconBtn>
        <Side c={b} lang={lang} role="b" />
      </div>
      <div className="px-4 pt-2">
        <div className="flex h-10 items-center rounded-[6px] border border-line bg-bg2 px-3 focus-within:border-accent">
          <CountryPicker onPick={(x) => setCmp(x.iso3)} placeholder={b ? `${t("compareWith")} (${displayName(b, lang)})` : t("pickCountry")} autoFocus={!b} />
        </div>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4 pt-2" style={{ overscrollBehavior: "contain" }}>
        {!b ? <p className="mt-6 text-center text-[13px] text-t2">{t("pickCountry")}</p> : loading ? <div className="space-y-2"><Skeleton h={48} /><Skeleton h={48} /><Skeleton h={48} /></div> : (
          <>
            {(agreement != null || (ia && ib)) && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {agreement != null && <div className="rounded-[6px] border border-line bg-bg2 p-3"><div className="label">{t("agreeBetween")}</div><div className="num mt-1 text-[22px] font-semibold">{pct(agreement * 100, lang, 0)}</div><div className="text-[11px] text-t2">{t("unAgreeRecent")}</div></div>}
                {ia && ib && <div className="rounded-[6px] border border-line bg-bg2 p-3"><div className="label">{t("ideal")}</div><div className="num mt-1 flex items-baseline justify-between text-[18px] font-semibold"><span className="text-accent">{ia.v.toFixed(2)}</span><span className="text-[11px] font-normal text-t2">{ia.y}</span><span className="text-c2">{ib.v.toFixed(2)}</span></div></div>}
              </div>
            )}
            <ul>
              {rows.map(({ m, va, vb }, ri) => {
                const head = ri === 0 || rows[ri - 1].m.group !== m.group ? <li key={"g" + m.group} className="label pb-1 pt-3">{t(GROUP_LABEL[m.group])}</li> : null;
                const max = Math.max(va?.v ?? 0, vb?.v ?? 0);
                return (
                  <Fragment key={m.key}>
                    {head}
                    <li className="grid grid-cols-[1fr_1fr] gap-x-4 border-b border-line/60 py-2">
                      <div className="col-span-2 mb-1 text-center text-[11px] text-t2">{t(m.key)}</div>
                      {[[va, "var(--accent)", false], [vb, "var(--c2)", true]].map(([v, color, rtl], i) => {
                        const x = v as { v: number; y?: number } | null;
                        return (
                          <div key={i} className={rtl ? "text-end" : ""}>
                            <div className="num text-[15px] font-semibold">{x ? m.fmt(x.v, lang) : <span className="text-t2">—</span>}{x?.y && <span className="ms-1.5 text-[10px] font-normal text-t2">{x.y}</span>}</div>
                            {x && max > 0 && x.v >= 0 && <div className="mt-1" style={{ direction: rtl ? "rtl" : "ltr" }}><div className="h-1.5 overflow-hidden rounded-full bg-bg2"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (x.v / max) * 100)}%`, background: color as string }} /></div></div>}
                          </div>
                        );
                      })}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-t2">{t("cmpHint")}</p>
          </>
        )}
      </div>
    </section>
  );
}
