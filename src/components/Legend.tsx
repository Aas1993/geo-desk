"use client";
import { useStore, useT } from "@/lib/store";
import { LAYERS, isData } from "@/lib/layers/registry";
import { useLayerStats } from "@/lib/layers/stats";
import { allowedKeys } from "./DataLayers";
import { useYesterday, yesterdayNow } from "./RasterLayers";

/** Bottom-right key for every switched-on data layer: colour dot, name and live count. */
export function Legend() {
  const { t, lang } = useT(); const on = useStore((s) => s.layers); const filters = useStore((s) => s.filters); const win = useStore((s) => s.timeWindow); const stats = useLayerStats((s) => s.layers);
  const active = LAYERS.filter((l) => isData(l) && on[l.id] && l.sub); const date = useStore((s) => s.imageryDate); const setDate = useStore((s) => s.setImageryDate);
  const imagery = !!on.imagery; const latest = useYesterday(); const day = date ?? latest ?? "";
  const shift = (n: number) => { if (!day) return; const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); const v = d.toISOString().slice(0, 10); if (v <= yesterdayNow() && v >= "2012-01-19") setDate(v); };
  if (!active.length && !imagery) return null;
  return (
    <aside aria-label={t("legend")} className="glass anim-rise absolute bottom-16 end-[76px] z-20 hidden max-h-[46vh] w-[230px] overflow-y-auto rounded-[14px] p-3 sm:block scroll-thin">
      <div className="label mb-2 flex items-center justify-between"><span>{t("legend")}</span>{win !== "all" && <span className="num rounded bg-bg3 px-1.5 text-t1">{win}</span>}</div>
      {imagery && <div className="mb-2"><div className="mb-1 text-[11.5px] font-semibold text-t1">NASA VIIRS true colour</div><div className="flex items-center gap-1"><button onClick={() => shift(-1)} aria-label="Previous day" className="grid size-7 place-items-center rounded-md bg-bg3 text-t1 hover:text-t0">‹</button><input type="date" value={day} min="2012-01-19" max={latest ?? undefined} onChange={(e) => e.target.value && setDate(e.target.value)} className="num h-7 flex-1 rounded-md border border-line bg-bg2 px-2 text-[12px] text-t0 outline-none" /><button onClick={() => shift(1)} aria-label="Next day" className="grid size-7 place-items-center rounded-md bg-bg3 text-t1 hover:text-t0">›</button></div></div>}
      {active.map((l) => { const keys = allowedKeys(l, filters[l.id]); return (
        <div key={l.id} className="mb-2 last:mb-0">
          <div className="mb-1 text-[11.5px] font-semibold text-t1">{lang === "ar" ? l.ar : l.en}</div>
          <ul className="space-y-1">{l.sub!.filter((s) => keys.includes(s.key) || s.children?.some((c) => keys.includes(`${s.key}:${c.key}`))).map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[12px] text-t0"><i className="size-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} /><span className="flex-1 truncate">{lang === "ar" ? s.ar : s.en}</span>{stats[l.id]?.byKey[s.key] != null && <span className="num text-[11px] text-t2">{stats[l.id].byKey[s.key]}</span>}</li>))}</ul>
        </div>); })}
    </aside>
  );
}
