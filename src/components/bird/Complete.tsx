"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CaseData } from "@/lib/case/load";
import { INFO, ORDER, STALE_DAYS, estimate, plan, readHeld, runOne, statusOf, type Ev, type Pid } from "@/lib/bird/runner";
import { Block, Pill, type Lang } from "../falcon/bits";
import { statusWord, useTr } from "../case/bits";

type Run = "queued" | "running" | "waiting" | "done" | "failed" | "skipped";
const sleep = (ms: number, s: AbortSignal) => new Promise<void>((res) => { const t = setTimeout(res, ms); s.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true }); });
type Agent = { id: string; name: string; status: "wait" | "run" | "done" | "skipped" | "error" };
/** COMPLETE THE PICTURE: runs every AI council that has no product for this country, in the order that lets each read the one before, then builds the bird's eye report. One explicit click after the list and the estimate; each run has its own US$1.00 ceiling; the hourly cap pauses it and it resumes by itself. */
export function Complete({ L, iso, name, d, tick, onFinished }: { L: Lang; iso: string; name: string; d: CaseData | null; tick: number; onFinished: (ran: number) => void }) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const [refreshStale, setRefreshStale] = useState(false); const [off, setOff] = useState<Set<Pid>>(new Set()); const [running, setRunning] = useState(false); const [st, setSt] = useState<Partial<Record<Pid, Run>>>({}); const [note, setNote] = useState<Partial<Record<Pid, string>>>({}); const [agents, setAgents] = useState<Agent[]>([]); const [status, setStatus] = useState(""); const [spent, setSpent] = useState(0); const [fatal, setFatal] = useState(""); const ac = useRef<AbortController | null>(null); const [now, setNow] = useState(0);
  useEffect(() => { const k = setTimeout(() => setNow(Date.now()), 0); return () => clearTimeout(k); }, [tick, iso, running]);
  useEffect(() => () => ac.current?.abort(), [iso]);
  const rows = useMemo(() => ORDER.map((id) => { const h = now ? readHeld(INFO[id].key(iso)) : null; return { id, status: now ? statusOf(h, now) : ("fresh" as const), age: h && now ? Math.round((now - Date.parse(h.at)) / 86_400_000) : null }; }), [now, iso, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const todo = useMemo(() => (now ? plan(iso, now, { refreshStale }).filter((x) => !off.has(x.id)) : []), [now, iso, refreshStale, off, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = estimate(todo.map((x) => x.id)); const missingN = rows.filter((r) => r.status === "missing").length;
  const set = (id: Pid, s: Run, n?: string) => { setSt((x) => ({ ...x, [id]: s })); if (n !== undefined) setNote((x) => ({ ...x, [id]: n })); };
  const onEvent = useCallback((e: Ev) => { if (e.type === "roster") setAgents((e.agents as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name, status: "wait" }))); else if (e.type === "agent") setAgents((l) => l.map((a) => (a.id === e.id ? { ...a, status: e.status === "start" ? "run" : (e.status as Agent["status"]) } : a))); else if (e.type === "status") setStatus(String(e.text ?? "")); }, []);
  const start = async () => {
    if (!todo.length || running) return;
    if (!window.confirm(t(`Run ${todo.length} AI councils for ${name}? Estimated cost about US$${est.toFixed(2)} in total, each run capped at US$1.00. Runs that were already made for this country are served free from cache. Leave this page open until it finishes.`, `تشغيل ${todo.length} مجالس بالذكاء الاصطناعي لـ ${name}؟ الكلفة التقديرية نحو ${est.toFixed(2)} دولار إجمالًا، وكل تشغيل بسقف 1.00 دولار. وما سبق تشغيله لهذه الدولة يُخدَّم مجانًا من الذاكرة. أبقِ هذه الصفحة مفتوحة حتى ينتهي.`))) return;
    const a = new AbortController(); ac.current = a; setRunning(true); setFatal(""); setSpent(0); setSt(Object.fromEntries(todo.map((x) => [x.id, "queued"]))); setNote({}); let ran = 0; let total = 0;
    for (const x of todo) {
      if (a.signal.aborted) break; set(x.id, "running", ""); setAgents([]); setStatus(""); let tries = 0; let out = await runOne(x.id, iso, lang, d, { refresh: x.status === "stale", signal: a.signal, onEvent });
      while (!out.ok && !a.signal.aborted && (out.error === "limit" || out.error === "busy") && tries < 80) { tries++; set(x.id, "waiting", out.error === "limit" ? t("Hourly limit of full sittings reached: waiting, it resumes by itself while this page stays open.", "بلغ الحد الساعي للجلسات الكاملة: انتظار، ويستأنف تلقائيًا ما دامت هذه الصفحة مفتوحة.") : t("Another briefing is being written: waiting.", "يُكتب موجز آخر: انتظار.")); await sleep(out.error === "limit" ? 60_000 : 20_000, a.signal); if (a.signal.aborted) break; set(x.id, "running", ""); out = await runOne(x.id, iso, lang, d, { refresh: x.status === "stale", signal: a.signal, onEvent }); }
      if (a.signal.aborted) { set(x.id, "skipped", t("Stopped.", "أُوقف.")); break; }
      if (out.ok) { ran++; total += out.usd ?? 0; setSpent(total); set(x.id, "done", out.cached ? t("from cache, free", "من الذاكرة بلا كلفة") : out.usd != null ? `US$${out.usd.toFixed(2)}` : ""); }
      else { set(x.id, "failed", out.message); if (["no_credits", "no_credentials", "disabled"].includes(out.error)) { setFatal(out.message); break; } }
    }
    setRunning(false); setAgents([]); setStatus(""); onFinished(ran);
  };
  const stop = () => ac.current?.abort();
  return (
    <Block title={t("Complete the picture", "أكمل الصورة")} hint={t("Runs every AI council of the platform that has nothing on file for this country (Strategic Council, Architect, Falcon, Machiavellian, Deep Intelligence, embassy intelligence, the Ministry, mission strategy and THE KING), in the order that lets each read the one before, then builds the bird's eye report. You see the list and the estimate first; each run is capped at US$1.00 and the hourly cap pauses it and it resumes by itself.", "يشغّل كل مجلس بالذكاء الاصطناعي في المنصة لا محفوظ له شيء لهذه الدولة (المجلس الاستراتيجي ومهندس فن الحكم والصقر والميكيافيلي والاستخبارات المعمّقة واستخبارات السفارة والوزارة واستراتيجية البعثة والقرار النهائي) بالترتيب الذي يقرأ فيه كل منها ما قبله، ثم يبني تقرير نظرة الطائر. ترى القائمة والتقدير أولًا؛ وكل تشغيل بسقف 1.00 دولار ويوقفه الحد الساعي ثم يستأنف تلقائيًا.")}
      right={<Pill c={missingN === 0 ? "var(--ok)" : "var(--warn)"}>{missingN === 0 ? t("nothing missing", "لا شيء ناقص") : `${missingN} ${t("missing", "ناقص")}`}</Pill>}>
      <ul className="space-y-1.5">{rows.map((r) => { const run = st[r.id]; const inPlan = todo.some((x) => x.id === r.id); return (
        <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-bg2 p-2 text-[12.5px]">
          <input type="checkbox" aria-label={L === "ar" ? INFO[r.id].ar : INFO[r.id].en} checked={inPlan} disabled={running || (r.status === "fresh") || (r.status === "stale" && !refreshStale)} onChange={() => setOff((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} />
          <Link href={INFO[r.id].href} className="min-w-0 flex-1 text-t0 hover:text-accent">{L === "ar" ? INFO[r.id].ar : INFO[r.id].en}</Link>
          {run ? <Pill c={run === "done" ? "var(--ok)" : run === "failed" ? "var(--risk)" : run === "running" ? "var(--accent)" : run === "waiting" ? "var(--warn)" : "var(--t2)"}>{run === "queued" ? t("queued", "في الطابور") : run === "waiting" ? t("waiting", "انتظار") : run === "skipped" ? t("stopped", "أُوقف") : statusWord(L, run === "running" ? "run" : run === "failed" ? "error" : "done")}</Pill> : <Pill c={r.status === "missing" ? "var(--warn)" : r.status === "stale" ? "var(--t2)" : "var(--ok)"}>{r.status === "missing" ? t("missing", "ناقص") : r.status === "stale" ? `${t("older than", "أقدم من")} ${STALE_DAYS} ${t("days", "يومًا")}` : `${t("on file", "محفوظ")}${r.age != null ? ` · ${r.age} ${t("d", "يوم")}` : ""}`}</Pill>}
          <span className="numt w-16 text-end text-[11px] text-t2">~US${INFO[r.id].est.toFixed(2)}</span>
          {note[r.id] && <span className="basis-full text-[11px] leading-snug text-t1" dir="auto">{note[r.id]}</span>}</li>); })}</ul>
      <label className="mt-2 flex items-start gap-2 text-[12px] text-t1"><input type="checkbox" checked={refreshStale} disabled={running} onChange={(e) => setRefreshStale(e.target.checked)} className="mt-0.5" /><span>{t(`Also refresh the products older than ${STALE_DAYS} days`, `حدّث أيضًا المنتجات الأقدم من ${STALE_DAYS} يومًا`)}</span></label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!running ? <button type="button" onClick={start} disabled={!todo.length} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50">{todo.length ? t(`Run ${todo.length} councils (about US$${est.toFixed(2)})`, `شغّل ${todo.length} مجالس (نحو ${est.toFixed(2)} دولار)`) : t("Everything is on file", "كل شيء محفوظ")}</button> : <button type="button" onClick={stop} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-bg3 px-5 text-[13px] font-semibold text-t0">{t("Stop after this call", "أوقف بعد هذا الاستدعاء")}</button>}
        {(running || spent > 0) && <span className="numt text-[12px] text-t1">{t("spent so far", "المصروف حتى الآن")} US${spent.toFixed(2)}</span>}</div>
      {running && <p className="mt-2 text-[11.5px] leading-snug text-warn">{t("Stay on this page while the councils run: leaving it cancels the run in progress. What is finished stays saved.", "ابقَ في هذه الصفحة أثناء عمل المجالس: مغادرتها تلغي التشغيل الجاري. وما انتهى يبقى محفوظًا.")}</p>}
      {running && agents.length > 0 && <div className="mt-2"><p className="text-[11.5px] text-t1">{status}</p><ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t("Agents", "الوكلاء")}>{agents.map((a) => <li key={a.id} className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: "var(--bg3)", color: "var(--t0)", border: `1px solid ${a.status === "done" ? "var(--ok)" : a.status === "run" ? "var(--accent)" : a.status === "error" ? "var(--risk)" : a.status === "skipped" ? "var(--warn)" : "var(--line)"}` }} dir="auto">{a.name}</li>)}</ul></div>}
      {fatal && <p role="alert" className="mt-2 rounded-[10px] border border-risk/40 bg-risk/10 p-2.5 text-[12px] text-t0">{fatal}</p>}
    </Block>
  );
}
