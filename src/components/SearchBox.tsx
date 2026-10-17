"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { loadCountries, displayName, type CountryData } from "@/lib/countries";
import { useStore, useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import type { Country } from "@/lib/types";
import type { Listing } from "@/lib/markets/types";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function useCountries() {
  const [d, setD] = useState<CountryData | null>(null);
  useEffect(() => { loadCountries().then(setD); }, []);
  return d;
}
let uni: Promise<Listing[]> | null = null;
const loadStocks = () => (uni ??= fetch("/data/markets.json").then((r) => r.json()).then((j) => j.rows as Listing[]));

type Hit = { kind: "country"; c: Country; s: number } | { kind: "stock"; l: Listing; s: number };

/** Country picker. With `withStocks`, ADX/DFM listings appear in the same list (used by the top bar). */
export function CountryPicker({ onPick, onPickStock, withStocks, placeholder, autoFocus, onEscape, inputRef, inline }: { onPick: (c: Country) => void; onPickStock?: (l: Listing) => void; withStocks?: boolean; placeholder: string; autoFocus?: boolean; onEscape?: () => void; inputRef?: React.RefObject<HTMLInputElement | null>; inline?: boolean }) {
  const d = useCountries(); const { lang, t } = useT();
  const stocks = useKeyed(withStocks ? "s" : null, loadStocks).value;
  const [q, setQ] = useState(""); const [i, setI] = useState(0); const [open, setOpen] = useState(false);
  const own = useRef<HTMLInputElement>(null); const ref = inputRef ?? own;
  const results = useMemo<Hit[]>(() => {
    if (!q.trim()) return []; const n = norm(q.trim()); const out: Hit[] = [];
    if (d) for (const c of d.list) {
      const names = [c.name, c.nameAr ?? "", c.capital ?? "", c.iso3, c.iso2].map(norm);
      const s = names[0].startsWith(n) || names[1].startsWith(n) ? 0 : names[2].startsWith(n) || names[3] === n || names[4] === n ? 1 : names.some((x) => x.includes(n)) ? 2 : 9; if (s < 9) out.push({ kind: "country", c, s });
    }
    if (stocks) for (const l of stocks) {
      const sym = norm(l.symbol), nm = norm(l.name), ar = norm(l.nameAr ?? "");
      const s = sym === n ? 0 : sym.startsWith(n) || nm.startsWith(n) || ar.startsWith(n) ? 1 : nm.includes(n) || ar.includes(n) || sym.includes(n) ? 2 : 9; if (s < 9) out.push({ kind: "stock", l, s });
    }
    const label = (h: Hit) => (h.kind === "country" ? h.c.name : h.l.symbol);
    return out.sort((a, b) => a.s - b.s || (a.kind === b.kind ? 0 : a.kind === "stock" ? -1 : 1) || label(a).localeCompare(label(b))).slice(0, 8);
  }, [d, stocks, q]);
  const pick = (h: Hit) => { if (h.kind === "country") onPick(h.c); else onPickStock?.(h.l); setQ(""); setOpen(false); };
  return (
    <div className="relative w-full">
      <input ref={ref} autoFocus={autoFocus} value={q} placeholder={placeholder} role="combobox" aria-expanded={open && results.length > 0} aria-controls="search-list" aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setI(0); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
          else if (e.key === "Enter" && results[i]) pick(results[i]);
          else if (e.key === "Escape") { setQ(""); setOpen(false); onEscape?.(); }
        }}
        className={`w-full bg-transparent text-[14px] text-t0 placeholder:text-t2 outline-none ${inline ? "h-11" : "h-full"}`} />
      {open && results.length > 0 && (
        <ul id="search-list" role="listbox" className={inline ? "-mx-3 border-t border-line py-1" : "glass absolute start-[-40px] end-[-12px] top-[calc(100%+10px)] z-50 overflow-hidden rounded-[8px] py-1 anim-rise"}>
          {results.map((h, idx) => (
            <li key={h.kind === "country" ? "c" + h.c.iso3 : "s" + h.l.exchange + h.l.symbol} role="option" aria-selected={idx === i} onMouseDown={(e) => { e.preventDefault(); pick(h); }} onMouseEnter={() => setI(idx)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-[14px] ${idx === i ? "bg-bg2" : ""}`}>
              {h.kind === "country" ? (<><span className="text-lg" aria-hidden>{h.c.flag}</span><span className="flex-1 truncate">{displayName(h.c, lang)}</span>{h.c.capital && <span className="truncate text-[12px] text-t2">{h.c.capital}</span>}</>)
                : (<><span className="num grid h-6 min-w-[3.4rem] place-items-center rounded bg-accent px-1.5 text-[11px] font-semibold text-[var(--accent-ink)]">{h.l.symbol}</span><span className="flex-1 truncate">{lang === "ar" && h.l.nameAr ? h.l.nameAr : h.l.name}</span><span className="text-[11px] text-t2">{h.l.exchange} · {t("nav_markets")}</span></>)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function SearchBox() {
  const { t } = useT(); const select = useStore((s) => s.select); const ref = useRef<HTMLInputElement>(null);
  const router = useRouter(); const path = usePathname();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="flex h-10 w-full items-center gap-2.5 rounded-[8px] border border-line bg-bg2 px-3.5 transition-colors focus-within:border-accent">
      <Search size={17} className="shrink-0 text-t2" aria-hidden />
      <CountryPicker inputRef={ref} withStocks placeholder={t("search")}
        onPick={(c) => { if (path === "/") select(c.iso3); else router.push(`/?sel=${c.iso3}`); }}
        onPickStock={(l) => router.push(`/markets/${l.exchange}/${encodeURIComponent(l.symbol)}`)} />
      <kbd className="num hidden shrink-0 rounded border border-line2 px-1.5 text-[10px] text-t2 sm:block">/</kbd>
    </div>
  );
}
