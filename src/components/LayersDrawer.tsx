"use client";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useStore, useT, type TimeWindow } from "@/lib/store";
import { GROUPS, LAYERS, statusLabel, type LayerDef } from "@/lib/layers/registry";
import { useLayerStats } from "@/lib/layers/stats";

const WINDOWS: { k: TimeWindow; l: string }[] = [{ k: "all", l: "All" }, { k: "1h", l: "1 h" }, { k: "6h", l: "6 h" }, { k: "24h", l: "24 h" }, { k: "2d", l: "2 d" }, { k: "7d", l: "7 d" }];

function Row({ def }: { def: LayerDef }) {
  const { t, lang } = useT(); const on = useStore((s) => !!s.layers[def.id]); const toggle = useStore((s) => s.toggleLayer);
  const filters = useStore((s) => s.filters[def.id]); const setFilter = useStore((s) => s.setFilter); const st = useLayerStats((s) => s.layers[def.id]);
  const live = def.status === "live"; const name = lang === "ar" ? def.ar : def.en; const tag = statusLabel[def.status];
  const isOn = (k: string) => filters?.[k] !== false;
  return (
    <div>
      <button disabled={!live} onClick={() => toggle(def.id)} aria-pressed={on} title={def.note}
        className={`flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-start text-[13px] transition-colors ${live ? "text-t0 hover:bg-bg3" : "cursor-not-allowed text-t2"} ${on ? "bg-bg3/70" : ""}`}>
        <i className="size-3 shrink-0 rounded-full border-2 transition-all" style={{ borderColor: def.color, background: on ? def.color : "transparent", boxShadow: on ? `0 0 8px ${def.color}` : "none", opacity: live ? 1 : 0.4 }} />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {on && def.kind !== "base" && st && (st.state === "loading" && !st.total ? <span className="text-[10.5px] text-t2">{t("feedLoading")}</span> : st.state === "error" ? <span title={st.error} className="text-[10.5px] text-down">{/ to \.env\.local/.test(st.error ?? "") ? (st.error ?? "").replace(/^.*?: add /, "Add ").replace(/ to \.env\.local.*$/, " to .env.local") : t("feedError")}</span> : st.total ? <span className="num text-[11px] text-t1">{st.shown}{st.shown !== st.total ? <span className="text-t2">/{st.total}</span> : null}</span> : null)}
        {!live && <span className="shrink-0 rounded-full border border-line-2 px-1.5 text-[9.5px] uppercase tracking-wide text-t2" style={{ borderColor: "var(--line-2)" }}>{lang === "ar" ? tag.ar : tag.en}</span>}
      </button>
      {on && def.sub && (
        <ul className="mb-1 ms-[26px] space-y-0.5 border-s border-line ps-2.5">
          {def.sub.map((s) => (
            <li key={s.key}>
              <button onClick={() => setFilter(def.id, s.key, !isOn(s.key))} aria-pressed={isOn(s.key)} className="flex w-full items-center gap-2 rounded-[7px] px-1.5 py-1 text-[12.5px] text-t1 hover:bg-bg3 hover:text-t0">
                <span className="grid size-4 place-items-center rounded-[4px] border" style={{ borderColor: s.color, background: isOn(s.key) ? s.color : "transparent" }}>{isOn(s.key) && <Check size={11} strokeWidth={3} color="#04070d" />}</span>
                <span className="flex-1 truncate text-start">{lang === "ar" ? s.ar : s.en}</span>
                {st?.byKey[s.key] != null && <span className="num text-[11px] text-t2">{st.byKey[s.key]}</span>}
              </button>
              {s.children && isOn(s.key) && (
                <div className="mb-1 ms-6 flex flex-wrap gap-1">{s.children.map((c) => { const k = `${s.key}:${c.key}`; return (
                  <button key={k} onClick={() => setFilter(def.id, k, !isOn(k))} aria-pressed={isOn(k)} className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${isOn(k) ? "border-transparent text-[#04070d]" : "text-t2"}`} style={isOn(k) ? { background: s.color } : { borderColor: "var(--line-2)" }}>{lang === "ar" ? c.ar : c.en}</button>); })}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      {on && live && def.note && <p className="mb-1.5 ms-[26px] text-[10.5px] leading-snug text-t2">{def.note}</p>}
    </div>
  );
}

export function LayersDrawer() {
  const { t, lang } = useT(); const { menuOpen, setMenu, timeWindow, setTimeWindow } = useStore();
  const [closed, setClosed] = useState<Record<string, boolean>>(() => Object.fromEntries(GROUPS.map((g) => [g.id, !(g.open || g.id === "map")])));
  const [q, setQ] = useState(""); const activeN = useStore((s) => LAYERS.filter((l) => l.kind !== "base" && s.layers[l.id]).length);
  const groups = useMemo(() => { const n = q.trim().toLowerCase(); return GROUPS.map((g) => ({ g, items: LAYERS.filter((l) => l.group === g.id && (!n || l.en.toLowerCase().includes(n) || l.ar.includes(n))) })).filter((x) => x.items.length); }, [q]);
  if (!menuOpen) return null;
  return (
    <aside aria-label={t("layers")} className="glass anim-slide absolute inset-x-2 bottom-[72px] top-[72px] z-40 flex flex-col rounded-[16px] sm:inset-x-auto sm:bottom-16 sm:start-3 sm:top-[76px] sm:w-[350px]">
      <header className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <h2 className="display flex items-center gap-2 text-[17px] font-semibold">{t("layers")}{activeN > 0 && <span className="num rounded-full bg-accent px-2 text-[11px] font-semibold text-[var(--accent-ink)]">{activeN}</span>}</h2>
        <button aria-label={t("close")} onClick={() => setMenu(false)} className="grid size-8 place-items-center rounded-lg text-t1 hover:bg-bg3"><X size={17} /></button>
      </header>
      <div className="px-3 pb-2"><label className="flex h-9 items-center gap-2 rounded-[9px] border border-line bg-bg2/70 px-3 focus-within:border-accent"><Search size={14} className="text-t2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("layersSearch")} className="w-full bg-transparent text-[13px] outline-none placeholder:text-t2" /></label></div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 && <p className="p-4 text-center text-[12.5px] text-t2">{t("noMatch")}</p>}
        {groups.map(({ g, items }) => {
          const open = q.trim() ? true : !closed[g.id]; const hasTime = items.some((l) => l.timeFilter && l.status === "live");
          return (
            <section key={g.id} className="border-t border-line/70 py-1">
              <button onClick={() => setClosed((c) => ({ ...c, [g.id]: open }))} aria-expanded={open} className="label flex w-full items-center justify-between rounded-lg px-2 py-2 hover:bg-bg3">
                <span>{lang === "ar" ? g.ar : g.en}<span className="num ms-2 text-t2/70">{items.length}</span></span><ChevronDown size={14} className={`transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`} />
              </button>
              {open && hasTime && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1 px-2"><span className="text-[11px] text-t2">{t("showLast")}</span>{WINDOWS.map((w) => <button key={w.k} onClick={() => setTimeWindow(w.k)} aria-pressed={timeWindow === w.k} className={`num rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${timeWindow === w.k ? "bg-accent text-[var(--accent-ink)]" : "bg-bg3 text-t1 hover:text-t0"}`}>{w.k === "all" ? t("winAll") : w.l}</button>)}</div>
              )}
              {open && items.map((l) => <Row key={l.id} def={l} />)}
            </section>
          );
        })}
      </div>
      <footer className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11px] text-t2"><span className="num">195 {t("statesN")}</span><span>{t("boundSrc")}</span></footer>
    </aside>
  );
}
