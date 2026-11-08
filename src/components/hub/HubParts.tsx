"use client";
import { useEffect, useState } from "react";
import { Check, ExternalLink, Paperclip, Sparkles } from "lucide-react";
import type { Country } from "@/lib/types";
import { ANGLES, ANGLE_COLOR, ANGLE_LABEL, summaryText, type Angle, type HubItem } from "@/lib/hub/model";
import { loadTopo, outlineFor, type Outline } from "@/lib/hub/outline";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Markdown } from "../Markdown";
import type { SourceStat } from "./useHubData";

const TONE_C = { opportunity: "var(--ok)", risk: "var(--risk)", neutral: "var(--t2)" } as const;
const ago = (ts: number | null, L: Lang) => { if (ts == null) return "—"; const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 60 ? `${m}${L === "ar" ? " د" : "m"}` : m < 1440 ? `${Math.round(m / 60)}${L === "ar" ? " س" : "h"}` : `${Math.round(m / 1440)}${L === "ar" ? " ي" : "d"}`; };

/** One update on the board: the mark, the angles, the date and source, the link, whether it is new, and the clip button. */
export function ItemCard({ x, L, isNew, clipped, onClip, compact }: { x: HubItem; L: Lang; isNew: boolean; clipped: boolean; onClip: () => void; compact?: boolean }) {
  const t = useTr(L); const mark = x.tone === "neutral" ? null : x.tone;
  return (
    <li id={`hub-${x.id}`} className="rounded-[12px] border border-line bg-bg1 p-2.5" style={{ borderInlineStart: `4px solid ${TONE_C[x.tone]}` }}>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-t2">
        {isNew && <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-[var(--accent-ink)]">{t("NEW", "جديد")}</span>}
        {x.angles.slice(0, compact ? 2 : 3).map((a) => <span key={a} className="rounded-full px-1.5 py-px text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${ANGLE_COLOR[a]} 16%, var(--bg-2))`, color: ANGLE_COLOR[a] }}>{t(ANGLE_LABEL[a].en, ANGLE_LABEL[a].ar)}</span>)}
        <span className="num">{x.date || (x.asOf ? `${t("as of", "حتى")} ${x.asOf}` : t("on file", "محفوظ"))}</span><span>· {x.source}</span>{x.level === 3 && <Pill c="var(--accent)">{t("leader level", "مستوى القيادة")}</Pill>}{x.meta && x.kind !== "macro" && <span>· {x.meta}</span>}
        {mark && <span title={t(`Keyword mark, not an assessment${x.why.length ? `: ${x.why.join(", ")}` : ""}`, `علامة كلمات مفتاحية لا تقييم${x.why.length ? `: ${x.why.join("، ")}` : ""}`)} className="rounded-full px-1.5 py-px text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${TONE_C[mark]} 18%, var(--bg-2))`, color: TONE_C[mark] }}>{mark === "risk" ? t("risk mark", "علامة خطر") : t("opportunity mark", "علامة فرصة")}{x.why.length ? ` · ${x.why.slice(0, 2).join(", ")}` : ""}</span>}
      </div>
      <p className="mt-1 text-[13px] font-medium leading-snug text-t0" dir="auto">{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">{x.title}<ExternalLink size={11} className="ms-1 inline opacity-60" aria-hidden /></a> : x.title}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[10.5px] text-t2">{x.ts != null ? `${ago(x.ts, L)} ${t("ago", "مضت")}` : ""}</span>
        <button type="button" onClick={onClip} aria-pressed={clipped} className={`inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[11.5px] font-medium ${clipped ? "bg-ok/15 text-ok" : "bg-bg3 text-t1 hover:text-accent"}`}>{clipped ? <Check size={12} aria-hidden /> : <Paperclip size={12} aria-hidden />}{clipped ? t("In the report (remove)", "في التقرير (إزالة)") : t("Add to report", "أضف إلى التقرير")}</button></div>
    </li>
  );
}

/** Angle chips with the count each would show under the other filters. */
export function AngleChips({ L, counts, on, onToggle, onClear }: { L: Lang; counts: Record<Angle, number>; on: Angle[]; onToggle: (a: Angle) => void; onClear: () => void }) {
  const t = useTr(L);
  return (
    <div role="group" aria-label={t("Angles", "الزوايا")} className="flex flex-wrap gap-1.5">
      <button type="button" aria-pressed={!on.length} onClick={onClear} className="inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium" style={{ borderColor: !on.length ? "var(--accent)" : "var(--line)", color: !on.length ? "var(--accent)" : "var(--t1)", background: !on.length ? "color-mix(in srgb, var(--accent) 14%, var(--bg-2))" : "var(--bg-1)" }}>{t("All angles", "كل الزوايا")}</button>
      {ANGLES.map((a) => { const sel = on.includes(a); return <button key={a} type="button" aria-pressed={sel} disabled={!counts[a] && !sel} onClick={() => onToggle(a)} className="inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium disabled:opacity-40" style={{ borderColor: sel ? ANGLE_COLOR[a] : "var(--line)", color: sel ? ANGLE_COLOR[a] : "var(--t1)", background: sel ? `color-mix(in srgb, ${ANGLE_COLOR[a]} 14%, var(--bg-2))` : "var(--bg-1)" }}><i className="size-1.5 rounded-full" style={{ background: ANGLE_COLOR[a] }} />{t(ANGLE_LABEL[a].en, ANGLE_LABEL[a].ar)}<span className="num text-[11px] opacity-80">{counts[a]}</span></button>; })}
    </div>
  );
}

/** The map-style mini panel: the country's outline from the held boundary file, its capital, and what the board holds for it by angle. */
export function MiniPanel({ c, L, counts, total }: { c: Country; L: Lang; counts: Record<Angle, number>; total: number }) {
  const t = useTr(L); const [o, setO] = useState<Outline | null | undefined>(undefined);
  useEffect(() => { let dead = false; loadTopo().then((tp) => { if (!dead) setO(outlineFor(tp, c.num, 300, 180, 12, c.lng != null && c.lat != null ? [c.lng, c.lat] : null)); }).catch(() => { if (!dead) setO(null); }); return () => { dead = true; }; }, [c.num, c.lng, c.lat]);
  const rows = ANGLES.filter((a) => counts[a] > 0); const max = Math.max(1, ...rows.map((a) => counts[a]));
  return (
    <section aria-label={t("Country at a glance", "الدولة بنظرة")} className="overflow-hidden rounded-[14px] border border-line bg-bg1">
      <div className="relative bg-bg2" style={{ aspectRatio: "300 / 180" }}>
        {o === undefined && <div className="absolute inset-0 grid place-items-center text-[11px] text-t2">{t("Drawing…", "جارٍ الرسم…")}</div>}
        {o === null && <div className="absolute inset-0 grid place-items-center px-3 text-center text-[11px] text-t2">{t("The boundary file has no outline for this country.", "ملف الحدود لا يحوي حدودًا لهذه الدولة.")}</div>}
        {o && <svg viewBox={`0 0 ${o.w} ${o.h}`} className="size-full" role="img" aria-label={`${c.name}`} style={{ direction: "ltr" }}><path d={o.d} fill="color-mix(in srgb, var(--accent) 22%, var(--bg-1))" stroke="var(--accent)" strokeWidth="1" strokeLinejoin="round" />{o.pin && <><circle cx={o.pin[0]} cy={o.pin[1]} r="6" fill="var(--accent)" opacity=".25" /><circle cx={o.pin[0]} cy={o.pin[1]} r="3" fill="var(--accent)" /></>}</svg>}
        <span className="absolute start-2 top-2 rounded-full bg-bg1/85 px-2 py-0.5 text-[10.5px] text-t1">{c.flag} {c.capital ?? ""}</span>
      </div>
      <div className="space-y-1 p-2.5"><p className="label">{t(`${total} updates on the board`, `${total} مستجدًا على اللوحة`)}</p>
        {rows.length === 0 ? <p className="text-[11.5px] text-t2">{t("Nothing in this window.", "لا شيء في هذه النافذة.")}</p> : rows.map((a) => <div key={a} className="flex items-center gap-2"><span className="w-28 shrink-0 truncate text-[11px] text-t1">{t(ANGLE_LABEL[a].en, ANGLE_LABEL[a].ar)}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg3" style={{ direction: "ltr" }}><i className="block h-full rounded-full" style={{ width: `${(counts[a] / max) * 100}%`, background: ANGLE_COLOR[a] }} /></span><b className="num w-6 text-end text-[11px] text-t0">{counts[a]}</b></div>)}
      </div>
    </section>
  );
}

/** The freshness strip: for each source, whether it loaded, how many items, how old the newest is, and what it can and cannot reach. */
export function Freshness({ L, sources }: { L: Lang; sources: SourceStat[] }) {
  const t = useTr(L);
  return (
    <details className="rounded-[12px] border border-line bg-bg1 p-2.5">
      <summary className="cursor-pointer text-[12px] font-medium text-t0">{t("Sources and freshness", "المصادر وحداثتها")} <span className="text-t2">· {sources.filter((s) => s.ok).length}/{sources.length} {t("loaded", "حُمّلت")}</span></summary>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{sources.map((s) => <li key={s.id} className="flex items-start gap-2 text-[11.5px] leading-snug"><i className="mt-1 size-2 shrink-0 rounded-full" style={{ background: s.ok ? "var(--ok)" : "var(--risk)" }} /><span><b className="text-t0">{t(s.label.en, s.label.ar)}</b> <span className="num text-t1">{s.ok ? `${s.n}${s.newest ? ` · ${t("newest", "الأحدث")} ${ago(s.newest, L)}` : ""}` : t("did not load", "لم يُحمَّل")}</span>{s.note && <span className="block text-t2">{t(s.note.en, s.note.ar)}</span>}</span></li>)}</ul>
    </details>
  );
}

type Sum = { text: string; usd: number | null; truncated: boolean; n: number };
/** "Summarise the hub": click-started, in-page confirmation, at most 40 visible items to the Desk agent's writer, cited by item number, cost shown. */
export function SummaryPanel({ L, iso, name, items }: { L: Lang; iso: string; name: string; items: HubItem[] }) {
  const t = useTr(L); const [asking, setAsking] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [out, setOut] = useState<Sum | null>(null);
  const sample = summaryText(items, 40);
  const run = async () => {
    setAsking(false); setBusy(true); setErr(""); const s = summaryText(items, 40); if (!s.n) { setBusy(false); return; }
    try {
      const r = await fetch("/api/agent/compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Summarise the updates on ${name} below for a Ministry desk officer: what changed, what matters for the UAE's interests, and what to watch next. Cite every statement with the item numbers in square brackets, like [3]. Use only the items; say what they do not cover.`, iso3: iso, country: name, lang: L === "ar" ? "ar" : "en", format: "answer", length: "short", notes: "Mention keyword marks (risk or opportunity) only as marks, never as assessments.", sources: [{ name: "Country Updates Hub: the visible items", text: s.text }] }) });
      const j = (await r.json().catch(() => ({}))) as { text?: string; usd?: number; truncated?: boolean; message?: string };
      if (r.ok && j.text) setOut({ text: j.text, usd: j.usd ?? null, truncated: !!j.truncated, n: s.n }); else setErr(j.message ?? t("The writer could not finish.", "تعذّر على الكاتب الإنهاء."));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Block title={t("Summarise the hub", "لخّص المركز")} hint={t("Sends the visible items (at most 40) to the Desk agent's writer for a short summary that cites the item numbers. Click-started; about US$0.03 to 0.08, capped at US$0.25.", "يرسل العناصر الظاهرة (40 كحد أقصى) إلى كاتب وكيل المكتب لملخص قصير يستشهد بأرقام العناصر. يبدأ بنقرة؛ نحو 0.03 إلى 0.08 دولار وبسقف 0.25 دولار.")}>
      <button type="button" disabled={busy || !sample.n} onClick={() => setAsking(true)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><Sparkles size={14} aria-hidden />{busy ? t("Writing…", "جارٍ الكتابة…") : t(`Summarise ${sample.n} visible items`, `لخّص ${sample.n} عنصرًا ظاهرًا`)}</button>
      {asking && <div role="alertdialog" aria-label={t("Confirm the summary", "تأكيد الملخص")} className="mt-2 rounded-[10px] border border-accent/50 bg-bg3 p-2.5"><p className="text-[12.5px] leading-snug text-t0">{t(`Send ${sample.n} items about ${name} to the writer? It uses a model once (about US$0.03 to 0.08, capped at US$0.25) and adds nothing that is not in the items.`, `إرسال ${sample.n} عنصرًا عن ${name} إلى الكاتب؟ يستخدم نموذجًا مرة واحدة (نحو 0.03 إلى 0.08 دولار وبسقف 0.25) ولا يضيف ما ليس في العناصر.`)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void run()} className="inline-flex h-8 items-center rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-[var(--accent-ink)]">{t("Write the summary", "اكتب الملخص")}</button><button type="button" onClick={() => setAsking(false)} className="inline-flex h-8 items-center rounded-[8px] border border-line px-3 text-[12px] text-t1">{t("Cancel", "إلغاء")}</button></div></div>}
      {err && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2 text-[12px] text-t0">{err}</p>}
      {out && <div className="mt-2 rounded-[10px] border border-line bg-bg2 p-2.5"><div className="text-[12.5px]"><Markdown source={out.text} /></div><p className="mt-1.5 text-[11px] text-t2">{t(`Written from ${out.n} items`, `كُتب من ${out.n} عنصرًا`)}{out.usd != null ? ` · US$${out.usd.toFixed(3)}` : ""}{out.truncated ? ` · ${t("cut at the length limit", "قُطع عند حد الطول")}` : ""} · {t("item numbers follow the order on the board at that moment", "أرقام العناصر بترتيب اللوحة لحظتها")}</p></div>}
    </Block>
  );
}
