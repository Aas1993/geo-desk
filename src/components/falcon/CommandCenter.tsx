"use client";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WorldCountry, WorldModel } from "@/lib/falcon/world";
import { safeHttp } from "@/lib/url";
import { Block, Kpi, Pill, REGION_AR, REGION_COL, SEV, SRC_STATE, ago, type Lang } from "./bits";
import { useAlerts } from "./hooks";

const T = {
  en: { kpiC: "Countries tracked", kpiW: "Early warnings triggered", kpiWsub: "severe", kpiS: "Sources current", kpiSsub: "due or stale", kpiA: "Live alerts", kpiAsub: "UAE-relevant",
    room: "Situation room", roomHint: "A merged feed of hazards, outbreaks, events and headlines, de-duplicated. A quiet feed is not a quiet world: each source below shows whether it answered.", cat: { all: "All", unrest: "Unrest", security: "Security", disasters: "Disasters", health: "Health", diplomacy: "Diplomacy", cyber: "Cyber", news: "News" }, sevMin: "Minimum severity", uaeOnly: "UAE-relevant only", more: "Show more", empty: "Nothing matches these filters.", feedFail: "The live feed could not be loaded.", loading: "Loading…",
    ew: "Early warnings, highest UAE stake first", ewHint: "Indicators with a written threshold, read from the datasets. Observed values, not AI judgments. Open the radar for the full board and filters.", all: "Open the full board", pulse: "Warnings by region", srcT: "Source health", srcHint: "Each dataset's build date against its refresh cadence: current within 1.5 cadences, due within 3, stale beyond. This is the evidence cutoff of everything on this page.", cols: ["Dataset", "Provider", "Built", "Age", "State"], day: "d", obs: "observed", threshold: "threshold" },
  ar: { kpiC: "دول قيد الرصد", kpiW: "إنذارات مبكرة مُفعَّلة", kpiWsub: "شديدة", kpiS: "مصادر حديثة", kpiSsub: "مستحقة أو قديمة", kpiA: "تنبيهات حية", kpiAsub: "ذات صلة بالإمارات",
    room: "غرفة الموقف", roomHint: "تغذية مدمجة للمخاطر الطبيعية والأوبئة والأحداث والعناوين بعد إزالة التكرار. التغذية الهادئة لا تعني عالمًا هادئًا: يبيّن كل مصدر أدناه هل ردّ.", cat: { all: "الكل", unrest: "اضطرابات", security: "أمن", disasters: "كوارث", health: "صحة", diplomacy: "دبلوماسية", cyber: "سيبراني", news: "أخبار" }, sevMin: "الحد الأدنى للخطورة", uaeOnly: "ذات الصلة بالإمارات فقط", more: "عرض المزيد", empty: "لا شيء يطابق هذه المرشحات.", feedFail: "تعذّر تحميل التغذية الحية.", loading: "جارٍ التحميل…",
    ew: "الإنذارات المبكرة، الأعلى حصة إماراتية أولًا", ewHint: "مؤشرات لها عتبة مكتوبة، مقروءة من البيانات. قيم مرصودة لا أحكام ذكاء اصطناعي. افتح الرادار للوحة الكاملة والمرشحات.", all: "افتح اللوحة الكاملة", pulse: "الإنذارات حسب الإقليم", srcT: "صحة المصادر", srcHint: "تاريخ بناء كل مجموعة بيانات مقابل وتيرة تحديثها: حديثة خلال 1.5 وتيرة، ومستحقة خلال 3، وقديمة بعد ذلك. وهذا هو حد الأدلة لكل ما في هذه الصفحة.", cols: ["مجموعة البيانات", "المزوّد", "البناء", "العمر", "الحالة"], day: "ي", obs: "مرصود", threshold: "العتبة" },
} as const;

export function topWarnings(w: WorldModel, n: number) {
  return w.countries.flatMap((c) => c.warnings.map((k) => ({ c, k, score: k.sev * (1 + (c.c.exposure ?? 0) / 50) }))).sort((a, b) => b.score - a.score).slice(0, n);
}
export function WarningRow({ c, k, L, onPick }: { c: WorldCountry; k: WorldCountry["warnings"][number]; L: Lang; onPick: (iso: string) => void }) {
  const u = T[L]; const s = SEV[k.sev];
  return (
    <li><button type="button" onClick={() => onPick(c.iso3)} className="grid w-full items-start gap-x-3 gap-y-0.5 rounded-[10px] bg-bg2 p-2.5 text-start hover:bg-bg3 sm:grid-cols-[minmax(130px,1fr)_minmax(0,2fr)_auto]">
      <span className="text-[12.5px] font-semibold text-t0">{c.flag} {L === "ar" && c.nameAr ? c.nameAr : c.name}<span className="num ms-1.5 text-[10.5px] font-normal text-t2">UAE stake {c.c.exposure ?? "—"}</span></span>
      <span className="min-w-0 text-[12px] leading-snug text-t1"><b className="text-t0">{k.label}:</b> <span className="num">{k.value}</span> <span className="text-t2">({u.threshold} {k.threshold}{k.baseline ? `; ${k.baseline}` : ""})</span><span className="mt-0.5 block text-[11px] text-t2">{k.impact}</span></span>
      <span className="flex items-center gap-1.5 sm:justify-end"><Pill c={s.c}>{s[L]}</Pill><span className="num text-[10px] text-t2">{k.src} · {k.freq}</span></span>
    </button></li>
  );
}

/** The Falcon Eye command center: headline counts, the live situation room, the early warnings with the biggest UAE stake, and the health of every dataset behind the page. */
export function CommandCenter({ world, L, onPick, openRadar }: { world: WorldModel; L: Lang; onPick: (iso: string) => void; openRadar: () => void }) {
  const u = T[L]; const { data, err } = useAlerts(); const [cat, setCat] = useState("all"); const [sev, setSev] = useState(0); const [uae, setUae] = useState(false); const [more, setMore] = useState(false);
  const items = useMemo(() => (data?.items ?? []).filter((a) => (cat === "all" || a.cat === cat) && a.sev >= sev && (!uae || a.uae)).sort((a, b) => b.sev - a.sev || b.t - a.t), [data, cat, sev, uae]);
  const warns = world.countries.reduce((a, c) => a + c.warnings.length, 0); const severe = world.countries.reduce((a, c) => a + c.warnings.filter((k) => k.sev === 3).length, 0);
  const cur = world.sources.filter((s) => s.state === "current").length; const notCur = world.sources.length - cur; const top = useMemo(() => topWarnings(world, 8), [world]);
  const byRegion = useMemo(() => { const m: Record<string, number> = {}; for (const c of world.countries) m[c.region] = (m[c.region] ?? 0) + c.warnings.length; return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [world]); const maxR = Math.max(1, ...byRegion.map((x) => x[1]));
  const shown = more ? items.slice(0, 120) : items.slice(0, 14);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"><Kpi label={u.kpiC} value={world.countries.length} /><Kpi label={u.kpiW} value={warns} sub={`${severe} ${u.kpiWsub}`} tone={severe ? "var(--warn)" : undefined} /><Kpi label={u.kpiS} value={`${cur}/${world.sources.length}`} sub={notCur ? `${notCur} ${u.kpiSsub}` : undefined} tone={notCur ? "var(--warn)" : "var(--ok)"} /><Kpi label={u.kpiA} value={data ? data.items.length : "…"} sub={data ? `${data.items.filter((a) => a.uae).length} ${u.kpiAsub}` : undefined} /></div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Block title={u.room} hint={u.roomHint}>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">{Object.entries(u.cat).map(([k, v]) => <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)} className={`h-7 rounded-full border px-2.5 text-[11.5px] ${cat === k ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg2 text-t1 hover:text-t0"}`}>{v}</button>)}
            <label className="ms-auto flex items-center gap-1.5 text-[11.5px] text-t1">{u.sevMin}<select value={sev} onChange={(e) => setSev(+e.target.value)} className="h-7 rounded-[8px] border border-line bg-bg2 px-1.5 text-[11.5px] text-t0">{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{SEV[n][L]}</option>)}</select></label>
            <label className="flex items-center gap-1.5 text-[11.5px] text-t1"><input type="checkbox" checked={uae} onChange={(e) => setUae(e.target.checked)} className="accent-[var(--accent)]" />{u.uaeOnly}</label></div>
          {data && <p className="mb-2 flex flex-wrap gap-1.5 text-[10.5px]">{Object.entries(data.sources).map(([k, ok]) => <Pill key={k} c={ok ? "var(--ok)" : "var(--risk)"}>{k} {ok ? "✓" : "✗"}</Pill>)}<span className="num text-t2">{ago(new Date(data.fetchedAt).toISOString(), L)}</span></p>}
          {err && !data && <p className="text-[12.5px] text-warn">{u.feedFail}</p>}{!data && !err && <p className="text-[12.5px] text-t2">{u.loading}</p>}
          <ul className="divide-y divide-line">{shown.map((a) => <li key={a.id} className="flex items-start gap-2.5 py-2"><i aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: SEV[a.sev].c }} /><div className="min-w-0 flex-1"><a href={a.url ? safeHttp(a.url) : undefined} target="_blank" rel="noreferrer noopener" className="text-[12.5px] leading-snug text-t0 hover:text-accent" dir="auto">{a.title}{a.url && <ExternalLink size={10} className="ms-1 inline" />}</a><div className="num mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-t2"><span>{ago(new Date(a.t).toISOString(), L)}</span><span>{u.cat[a.cat as keyof typeof u.cat] ?? a.cat}</span><span>{a.src}</span>{a.uae && <Pill c="var(--accent)">UAE</Pill>}</div></div></li>)}{data && !items.length && <li className="py-3 text-[12.5px] text-t2">{u.empty}</li>}</ul>
          {items.length > shown.length && <button type="button" onClick={() => setMore(true)} className="mt-2 text-[12px] text-accent hover:underline">{u.more} ({items.length - shown.length})</button>}
        </Block>
        <div className="space-y-4">
          <Block title={u.pulse}><ul className="space-y-1.5">{byRegion.map(([r, n]) => <li key={r} className="grid grid-cols-[88px_1fr_28px] items-center gap-2 text-[12px]"><span className="text-t1">{L === "ar" ? REGION_AR[r] ?? r : r}</span><div className="h-2.5 rounded-full bg-bg3" dir="ltr"><div className="h-2.5 rounded-full" style={{ width: `${(n / maxR) * 100}%`, background: REGION_COL[r] ?? "var(--accent)" }} /></div><span className="num text-end text-t0">{n}</span></li>)}</ul></Block>
          <Block title={u.ew} hint={u.ewHint} right={<button type="button" onClick={openRadar} className="shrink-0 text-[11.5px] text-accent hover:underline">{u.all}</button>}><ul className="space-y-1.5">{top.map(({ c, k }) => <WarningRow key={k.id} c={c} k={k} L={L} onPick={onPick} />)}</ul></Block>
        </div>
      </div>
      <Block title={u.srcT} hint={u.srcHint}>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-[12px]"><thead><tr className="text-[10px] uppercase tracking-wide text-t2">{u.cols.map((h) => <th key={h} className="py-1 pe-2 text-start font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{world.sources.map((s) => <tr key={s.file}><td className="py-1.5 pe-2 font-medium text-t0">{s.label}</td><td className="pe-2 text-t1">{s.provider}</td><td className="num pe-2 text-t1">{s.builtAt ? s.builtAt.slice(0, 16).replace("T", " ") : "—"}</td><td className="num pe-2 text-t1">{s.ageDays != null ? `${s.ageDays}${u.day}` : "—"} <span className="text-t2">/ {s.cadence}</span></td><td><Pill c={SRC_STATE[s.state].c}>{SRC_STATE[s.state][L]}</Pill></td></tr>)}</tbody></table></div>
      </Block>
    </div>
  );
}
