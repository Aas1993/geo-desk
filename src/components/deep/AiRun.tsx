"use client";
import { classification } from "@/lib/case/report";
import { CouncilGuide } from "../case/CouncilGuide";
import { useEffect, useRef, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { briefingHtml, printBriefing } from "@/lib/dossier/export";
import { GatesPanel } from "../falcon/GatesPanel";
import { Markdown } from "../Markdown";
import { Block, Pill, type Lang } from "../falcon/bits";
import { Progress, Refusal, RunBar, refusalText } from "../machiavelli/forms";
import { usd } from "../machiavelli/parts";
import { useRun } from "../machiavelli/useRun";
import { statusWord } from "../case/bits";
import { logCost } from "./hooks";

// A click-started paid analyst run on the Deep council route, with its cost ceiling stated, progress shown, the finished report kept in this browser, and the cost logged for the cost dashboard.
// The same panel serves the research synthesis (lighter, two agents) and the full decision team.
type Agents = { id: string; name: string; status: string; usd?: number; searches: number; note?: string }[];
export function AiRun({ L, iso, question, mode, title, hint, cost, go, storeKey, roles, body }: { L: Lang; iso: string | null; question: string; mode: "research" | "full"; title: string; hint: string; cost: string; go: string; storeKey: string; roles?: Record<string, { en: string; ar: string }> | null; body?: Record<string, unknown> }) {
  const run = useRun(iso ?? "ARE", `${storeKey}:${iso ?? "ARE"}:${mode}`, undefined, "/api/deep/council"); const s = run.saved; const [copied, setCopied] = useState(false); const t0 = useRef(0); const logged = useRef("");
  const refusal = refusalText([question], L);
  const start = () => { if (refusal) return; t0.current = Date.now(); void run.run({ lang: L, question, mode, consequential: mode === "full", refresh: !!s, ...body }); };
  useEffect(() => { if (run.phase === "done" && s && logged.current !== s.at) { logged.current = s.at; logCost({ at: s.at, kind: mode === "research" ? "research" : "council", usd: s.usage.usd ?? 0, cached: !!s.cached, searches: s.usage.searches, fetches: 0, cacheRead: s.usage.cacheRead, input: s.usage.input, output: s.usage.output, ms: t0.current ? Date.now() - t0.current : 0, scope: iso ?? "ARE" }); } }, [run.phase, s, mode, iso]);
  const ag = (s as unknown as { agents?: Agents } | null)?.agents ?? [];
  const html = () => briefingHtml(s!.report, { title, rtl: L === "ar", foot: `${s!.model} · ${s!.at}`, classification: classification(L === "ar" ? "ar" : "en") });
  return (
    <Block title={title} hint={hint} right={s ? <Pill c="var(--warn)">{L === "ar" ? "تحليل عمل غير مُراجَع" : "Working analysis, not reviewed"}</Pill> : undefined}>
      {mode === "full" && <CouncilGuide L={L} iso={iso} />}
      <Refusal text={refusal} />
      <RunBar phase={run.phase} onRun={start} onCancel={run.cancel} disabled={!!refusal || question.trim().length < 8} L={L} label={s ? (L === "ar" ? "تشغيل من جديد" : "Run again") : go} cost={cost} />
      {run.phase === "running" && run.agents.length > 0 && <ul className="mt-3 grid gap-1.5 sm:grid-cols-2" aria-label="Agents">{run.agents.map((a) => <li key={a.id} className="flex items-center gap-2 rounded-[10px] bg-bg2 p-2 text-[12px]" style={{ borderInlineStart: `3px solid ${a.status === "done" ? "var(--ok)" : a.status === "run" ? "var(--accent)" : a.status === "error" ? "var(--risk)" : "var(--line)"}` }}><span className="min-w-0 flex-1 truncate text-t0">{a.name}</span><span className="num text-[10.5px] text-t2">{statusWord(L, a.status)}{a.usd != null ? ` · ${usd(a.usd)}` : ""}</span></li>)}</ul>}
      <Progress phase={run.phase} status={run.status} tail={run.tail} searches={run.searches} sources={run.sources} err={run.err} L={L} />
      {s && run.phase !== "running" && (<div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2"><span className="numt text-[11.5px] text-t1">{s.at.slice(0, 16).replace("T", " ")} UTC · {s.cached ? (L === "ar" ? "من الذاكرة المؤقتة (بلا كلفة)" : "from cache (no cost)") : `${L === "ar" ? "الكلفة" : "cost"} ${usd(s.usage.usd)}`} · {s.usage.searches} {L === "ar" ? "بحثًا" : "searches"} · {s.sources.length} {L === "ar" ? "مصدرًا" : "sources"}</span>
          <span className="ms-auto flex gap-1.5"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(s.report); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Copy size={13} />{copied ? "✓" : (L === "ar" ? "نسخ" : "Copy")}</button><button type="button" onClick={() => printBriefing(html())} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1"><Printer size={13} />{L === "ar" ? "طباعة" : "Print"}</button></span></div>
        {roles && Object.keys(roles).length > 0 && <p className="text-[11.5px] leading-snug text-t1"><b className="text-t0">{L === "ar" ? "الفريق المختار ولماذا: " : "Team chosen, and why: "}</b>{Object.entries(roles).map(([k, v]) => `${k}: ${L === "ar" ? v.ar : v.en}`).join(" · ")}</p>}
        {ag.length > 0 && <p className="text-[11px] text-t2">{ag.map((a) => `${a.name}: ${statusWord(L, a.status)}${a.usd != null ? ` ${usd(a.usd)}` : ""}${a.note ? ` (${a.note})` : ""}`).join(" · ")}</p>}
        <article><Markdown source={s.report} /></article>
        <GatesPanel md={s.report} kind="other" L={L} iso3={iso ?? "ARE"} />
      </div>)}
    </Block>
  );
}
