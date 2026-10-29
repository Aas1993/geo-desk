"use client";
import { useEffect, useState } from "react";
import { liveCounts, liveStages, type Live, type LiveAgent, type LiveProd } from "@/lib/bird/live";
import type { Pid } from "@/lib/bird/runner";
import type { Lang } from "../falcon/bits";

const clock = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const COLOR: Record<LiveAgent["status"], string> = { wait: "var(--t2)", run: "var(--accent)", done: "var(--ok)", skipped: "var(--t2)", error: "var(--risk)" };

/** THE LIVE DESK: every agent of every council that is running, drawn from the events the councils stream: waiting, working (pulsing, with its own clock), done (with how long it took), skipped or failed. Stages read left to right, the independent auditors last. It shows what is happening; it never estimates progress. */
export function LiveDesk({ L, live, running, startedAt, names, queued = [] }: { L: Lang; live: Live; running: boolean; startedAt: number; names: Record<string, string>; queued?: { id: Pid; waitsFor: Pid[] }[] }) {
  const t = (en: string, ar: string) => (L === "ar" ? ar : en); const [now, setNow] = useState(0);
  useEffect(() => { const k = setInterval(() => setNow(Date.now()), 500); const f = setTimeout(() => setNow(Date.now()), 0); return () => { clearInterval(k); clearTimeout(f); }; }, [running]);
  const c = liveCounts(live); const ids = Object.keys(live) as Pid[]; const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const ends = ids.map((i) => live[i]?.t1 ?? 0); const allEnded = ids.length > 0 && ends.every((e) => e > 0); const end = allEnded ? Math.max(...ends) : now;
  return (
    <section aria-label={t("Live desk", "غرفة المتابعة المباشرة")} className="mt-4 rounded-[12px] border border-line bg-bg2 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-[13px] font-semibold text-t0">{t("Live desk", "غرفة المتابعة المباشرة")}</h3>
        <p role="status" aria-live="polite" className="text-[12px] text-t1">{running ? t(`${c.working} working now · ${c.done} finished · ${c.total} agents so far`, `${c.working} يعمل الآن · ${c.done} انتهى · ${c.total} وكيلًا حتى الآن`) : t(`${c.done} of ${c.total} agents finished`, `انتهى ${c.done} من ${c.total} وكيلًا`)}</p>
        <span className="numt ms-auto text-[12px] text-t1">{startedAt && end ? clock(end - startedAt) : "0:00"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg3" aria-hidden><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
      <ul className="mt-3 space-y-3">{queued.map((q) => <li key={q.id} className="flex flex-wrap items-center gap-2 text-[12px]"><span className="font-medium text-t1">{names[q.id] ?? q.id}</span><span className="rounded-full border border-line px-2 py-px text-[10.5px] text-t2">{t("queued", "في الطابور")}</span><span className="text-t2">{t("starts when it has read", "يبدأ بعد أن يقرأ")} {q.waitsFor.map((w) => names[w] ?? w).join(L === "ar" ? "، " : ", ")}</span></li>)}{ids.map((id) => { const p = live[id] as LiveProd; const stages = liveStages(p); const done = p.agents.filter((a) => a.status === "done" || a.status === "skipped" || a.status === "error").length; const fin = !!p.t1; return (
        <li key={id}>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-medium text-t0">{names[id] ?? id}</span>
            <span className="rounded-full px-2 py-px text-[10.5px]" style={{ border: `1px solid ${fin ? "var(--ok)" : "var(--accent)"}`, color: fin ? "var(--ok)" : "var(--accent)" }}>{fin ? t("finished", "انتهى") : t("sitting", "منعقد")}</span>
            <span className="numt text-t2">{p.agents.length ? `${done}/${p.agents.length}` : t("gathering the evidence…", "جمع الأدلة…")}</span>
            <span className="numt ms-auto text-t2">{clock(((p.t1 ?? now) || p.t0) - p.t0)}</span>
          </div>
          {p.agents.length > 0 && <div className="mt-1.5 flex flex-wrap items-start gap-x-1.5 gap-y-1.5">{stages.map((g, gi) => (
            <div key={gi} className="flex flex-wrap items-center gap-1.5">
              {gi > 0 && <span aria-hidden className="text-[11px] text-t2">{L === "ar" ? "←" : "→"}</span>}
              {g.map((a) => <Chip key={a.id} a={a} now={now} L={L} />)}
            </div>))}</div>}
        </li>); })}</ul>
    </section>
  );
}

function Chip({ a, now, L }: { a: LiveAgent; now: number; L: Lang }) {
  const secs = a.status === "run" ? now - (a.t0 ?? now) : a.t0 && a.t1 ? a.t1 - a.t0 : 0; const word = { wait: ["waiting", "ينتظر"], run: ["working", "يعمل"], done: ["done", "انتهى"], skipped: ["skipped", "تُخطّي"], error: ["failed", "تعثّر"] }[a.status][L === "ar" ? 1 : 0];
  return (
    <span title={`${a.name}: ${word}`} className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px]" style={{ color: a.status === "wait" || a.status === "skipped" ? "var(--t2)" : "var(--t0)", background: a.status === "run" ? "color-mix(in srgb, var(--accent) 14%, var(--bg3))" : "var(--bg3)", border: `1px solid ${COLOR[a.status]}`, opacity: a.status === "skipped" ? 0.6 : 1 }}>
      <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
        {a.status === "run" && <span className="live-ring absolute inline-flex h-2 w-2 rounded-full" style={{ background: COLOR.run }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: a.status === "wait" ? "transparent" : COLOR[a.status], border: a.status === "wait" ? `1px solid ${COLOR.wait}` : undefined }} />
      </span>
      <span className="truncate">{a.name}</span>
      {(a.status === "run" || a.status === "done") && <span className="numt text-[10.5px] text-t2">{a.status === "run" ? `${Math.max(0, Math.floor(secs / 1000))}s` : `${Math.max(0, Math.round(secs / 1000))}s`}</span>}
      {a.status === "error" && <span aria-hidden>×</span>}
      <span className="sr-only">{word}</span>
    </span>
  );
}
