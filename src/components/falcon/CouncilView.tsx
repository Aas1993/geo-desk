"use client";
import { PdfButton } from "../PdfButton";
import { classification } from "@/lib/case/report";
import { CouncilGuide } from "../case/CouncilGuide";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Play, Printer } from "lucide-react";
import { AGENTS, COUNCIL_PRESETS } from "@/lib/falcon/council";
import { parseCouncil } from "@/lib/falcon/council-parse";
import { briefingHtml, printBriefing, saveBlob } from "@/lib/dossier/export";
import type { Country } from "@/lib/types";
import { jumpTo } from "../report/kit";
import { Block, Pill, ScopePicker, type Lang } from "./bits";
import { AgentsTab, AssessTab, SourcesTab, VerifyTab } from "./CouncilTabs";

type Source = { url: string; title: string };
type AgentRes = { id: string; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Saved = { report: string; agents: AgentRes[]; sources: Source[]; usage: { searches: number; usd: number | null; input: number; output: number; cacheRead: number; cacheWrite: number }; at: string; model: string; name: string; cached?: boolean };
type Live = Record<string, { status: "wait" | "run" | "done" | "skipped" | "error"; usd?: number; searches: number; note?: string }>;
const T = {
  en: { title: "Falcon Council", sub: "Bounded specialist agents work in stages from one shared evidence base: an orchestrator plans, four specialists research in parallel, a UAE-interest analyst and a foresight analyst read them, a red team and a verifier challenge and check, and an editor writes the assessment and preserves where they disagreed.", subject: "Subject", question: "Question for the council", presets: "Examples", go: "Convene the council", cost: "Each council runs ten agent steps with about six web searches and bills your Anthropic account (measured at about $0.75 and 95 seconds; the whole council is hard-capped at $1.00 and skips the optional steps rather than pass it). Results are cached for 6 hours.", running: "The council is sitting…", stages: ["Plan", "Specialists", "UAE and foresight", "Challenge and check", "Editor"], wait: "waiting", run: "working", done: "done", skipped: "skipped", error: "failed",
    assess: "Assessment", agentsT: "Agent reports", verifyT: "Verification and challenge", sourcesT: "Sources", bluf: "Bottom line", judg: "Key judgments", status: { survived: "Survived the red team", softened: "Softened", reversed: "Reversed", untested: "Untested" }, agrees: "Where the council agrees", agreesH: "Shared evidence and one model are the reason, so this is not independent corroboration.", dis: "Preserved disagreements", dA: "Position A", dB: "Position B", dE: "Evidence", dR: "What would resolve it", impact: "UAE impact and opportunities", options: "Options for decision", aud: "Claim audit", chal: "Red-team challenges", verd: { confirmed: "Confirmed", disputed: "Disputed", unverifiable: "Unverifiable", stale: "Stale" }, spent: "Spent", copy: "Copy", copied: "Copied", pdf: "Print / PDF", fail: "The council failed:", none: "—", again: "New council", usage: "searches", noCred: "Anthropic credentials are missing or expired." },
  ar: { title: "مجلس الصقر", sub: "وكلاء متخصصون مقيَّدون يعملون على مراحل من قاعدة أدلة واحدة: منسق يخطط، وأربعة متخصصين يبحثون بالتوازي، ومحلل للمصلحة الإماراتية ومحلل استشراف يقرآنهم، وفريق أحمر ومدقق يتحديان ويتحققان، ومحرر يكتب التقييم ويحفظ مواضع الخلاف بينهم.", subject: "الموضوع", question: "سؤال المجلس", presets: "أمثلة", go: "اعقد المجلس", cost: "يجري كل مجلس عشر خطوات وكلاء ونحو ست عمليات بحث ويُحتسب على حساب Anthropic (قيس بنحو 0.75 دولار و95 ثانية؛ وسقف المجلس كله 1.00 دولار ويتخطى الخطوات الاختيارية بدل تجاوزه). النتائج مخزّنة 6 ساعات.", running: "المجلس منعقد…", stages: ["التخطيط", "المتخصصون", "الإمارات والاستشراف", "التحدي والتحقق", "المحرر"], wait: "ينتظر", run: "يعمل", done: "انتهى", skipped: "تُخطّي", error: "فشل",
    assess: "التقييم", agentsT: "تقارير الوكلاء", verifyT: "التحقق والتحدي", sourcesT: "المصادر", bluf: "الخلاصة", judg: "الأحكام الرئيسية", status: { survived: "صمد أمام الفريق الأحمر", softened: "خُفِّف", reversed: "عُكس", untested: "لم يُختبر" }, agrees: "حيث يتفق المجلس", agreesH: "السبب أدلة مشتركة ونموذج واحد، فليس هذا تثبّتًا مستقلًا.", dis: "خلافات محفوظة", dA: "الموقف أ", dB: "الموقف ب", dE: "الدليل", dR: "ما يحسمه", impact: "الأثر والفرص للإمارات", options: "خيارات للقرار", aud: "تدقيق الادعاءات", chal: "تحديات الفريق الأحمر", verd: { confirmed: "مؤكَّد", disputed: "متنازَع", unverifiable: "تعذّر التحقق", stale: "قديم" }, spent: "المنفَق", copy: "نسخ", copied: "تم النسخ", pdf: "طباعة / PDF", fail: "فشل المجلس:", none: "—", again: "مجلس جديد", usage: "عمليات بحث", noCred: "بيانات اعتماد Anthropic مفقودة أو منتهية." },
} as const;

/** The Falcon Council: convene it on a country or scope and a question, watch the agents work stage by stage, then read the editor's assessment with the disagreements preserved, the red-team challenges and the claim audit. */
export function CouncilView({ list, by, iso, setIso, L, seed }: { list: Country[]; by: Map<string, Country>; iso: string | null; setIso: (i: string) => void; L: Lang; seed?: string }) {
  const u = T[L]; const [q, setQ] = useState(seed && seed.length >= 8 ? seed.slice(0, 600) : COUNCIL_PRESETS[0]); const [phase, setPhase] = useState<"form" | "running" | "done" | "error">("form"); const [live, setLive] = useState<Live>({}); const [tail, setTail] = useState(""); const [err, setErr] = useState(""); const [saved, setSaved] = useState<Saved | null>(null); const [tab, setTab] = useState<"assess" | "agents" | "verify" | "sources">("assess"); const [copied, setCopied] = useState(false);
  const jump = (id: string) => { const to = id === "fc-audit" || id === "fc-chal" ? "verify" : "assess"; if (to !== tab) { setTab(to); setTimeout(() => jumpTo(id), 120); } else jumpTo(id); };
  const abort = useRef<AbortController | null>(null); const c = iso ? by.get(iso) : undefined; const key = iso ? `gd-council:${iso}` : "";
  useEffect(() => { const t = setTimeout(() => { setSaved(null); setPhase("form"); setErr(""); if (!key) return; try { const s = localStorage.getItem(key); if (s) { setSaved(JSON.parse(s) as Saved); setPhase("done"); } } catch { /* none saved */ } }, 0); return () => clearTimeout(t); }, [key]);
  useEffect(() => () => abort.current?.abort(), []);
  const roster = useMemo(() => Object.fromEntries(AGENTS.map((a) => [a.id, { status: "wait" as const, searches: 0 }])) as Live, []);
  async function run(refresh = false) {
    if (!iso) return; abort.current?.abort(); const ac = new AbortController(); abort.current = ac; setPhase("running"); setErr(""); setTail(""); setLive({ ...roster }); setSaved(null);
    try {
      const r = await fetch("/api/falcon/council", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iso3: iso, question: q, lang: L, refresh }), signal: ac.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); setErr(j.message ?? j.error ?? "upstream"); setPhase("error"); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ""; let ended = false;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith("data:")) continue; const ev = JSON.parse(line.slice(5)) as Record<string, unknown> & { type: string; agent?: string };
          if (ev.type === "agent") setLive((l) => ({ ...l, [ev.id as string]: { ...(l[ev.id as string] ?? { searches: 0 }), status: ev.status === "start" ? "run" : (ev.status as "done" | "skipped" | "error"), usd: (ev.usd as number | undefined) ?? l[ev.id as string]?.usd, searches: (ev.searches as number | undefined) ?? l[ev.id as string]?.searches ?? 0, note: ev.message as string | undefined } }));
          else if (ev.type === "tool" && ev.agent && ev.name === "search") setLive((l) => ({ ...l, [ev.agent!]: { ...(l[ev.agent!] ?? { status: "run" }), searches: (l[ev.agent!]?.searches ?? 0) + 1, status: l[ev.agent!]?.status ?? "run" } }));
          else if (ev.type === "text" && ev.agent) setTail((x) => (x + String(ev.delta)).slice(-360));
          else if (ev.type === "error") { ended = true; setErr(ev.error === "no_credentials" ? u.noCred : String(ev.message ?? ev.error)); setPhase("error"); }
          else if (ev.type === "done") { ended = true; const d = ev as unknown as Saved; setSaved(d); setPhase("done"); setTab("assess"); try { localStorage.setItem(key, JSON.stringify(d)); window.dispatchEvent(new Event("storage")); } catch { /* storage full */ } }
        }
      }
      if (!ended) { setErr("The connection ended before the council finished."); setPhase("error"); }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr((e as Error).message); setPhase("error"); } }
  }
  const p = useMemo(() => (saved ? parseCouncil(saved.report) : null), [saved]); const name = c ? (L === "ar" && c.nameAr ? c.nameAr : c.name) : "";
  const html = () => briefingHtml(saved!.report, { title: `${u.title}: ${name}`, rtl: L === "ar", foot: `${saved!.model} · ${saved!.at}`, classification: classification(L === "ar" ? "ar" : "en") });
  const pill = (s: Live[string]["status"]) => (s === "done" ? "var(--ok)" : s === "run" ? "var(--accent)" : s === "error" ? "var(--risk)" : s === "skipped" ? "var(--t2)" : "var(--line-2)");
  return (
    <div className="space-y-4">
      <CouncilGuide L={L} iso={iso} />
      <Block title={u.title} hint={u.sub}>
        {(phase === "form" || phase === "error") && (<>
          <div className="grid gap-3 md:grid-cols-[1fr_1.3fr]"><div><span className="label mb-1 block">{u.subject}</span><ScopePicker list={list} value={iso} onPick={setIso} L={L} /></div><label><span className="label mb-1 block">{u.question}</span><textarea rows={3} maxLength={600} value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-[10px] border border-line bg-bg2 p-2.5 text-[13px] text-t0" /></label></div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-t2">{u.presets}:</span>{COUNCIL_PRESETS.map((x, i) => <button key={i} type="button" onClick={() => setQ(x)} className="h-7 max-w-[260px] truncate rounded-full border border-line bg-bg2 px-2.5 text-[11px] text-t1 hover:text-t0" title={x}>{x}</button>)}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={!iso || q.trim().length < 8} onClick={() => run(false)} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] shadow-[var(--glow)] disabled:opacity-50"><Play size={15} />{u.go}</button>{saved && <button type="button" onClick={() => setPhase("done")} className="h-10 rounded-[10px] bg-bg3 px-4 text-[13px] text-t1 hover:text-t0">←</button>}</div>
          <p className="mt-2 text-[11.5px] leading-snug text-t2">{u.cost}</p>{phase === "error" && <div role="alert" className="mt-3 rounded-[8px] border border-down/40 bg-down/10 p-3 text-[13px]">{u.fail} {err}</div>}
        </>)}
        {phase === "running" && (<div role="status">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold"><i className="size-1.5 animate-pulse rounded-full bg-accent" />{u.running}</div>
          <div className="space-y-2.5">{u.stages.map((st, si) => <div key={si}><div className="label mb-1">{si + 1}. {st}</div><div className="grid gap-1.5 sm:grid-cols-2">{AGENTS.filter((a) => a.stage === si).map((a) => { const l = live[a.id] ?? { status: "wait" as const, searches: 0 }; return <div key={a.id} className="flex items-center gap-2 rounded-[10px] bg-bg2 p-2 text-[12px]" style={{ borderInlineStart: `3px solid ${pill(l.status)}` }}><span className="min-w-0 flex-1 truncate text-t0">{L === "ar" ? a.ar : a.en}</span><span className="numt text-[10.5px] text-t2">{l.searches ? `${l.searches} 🔎 ` : ""}{l.usd != null ? `$${l.usd.toFixed(2)}` : ""}</span><Pill c={pill(l.status)}>{u[l.status === "wait" ? "wait" : l.status === "run" ? "run" : l.status === "done" ? "done" : l.status === "skipped" ? "skipped" : "error"]}</Pill></div>; })}</div></div>)}</div>
          {tail && <p className="mt-3 line-clamp-3 rounded-[8px] bg-bg2 p-2 text-[11px] leading-snug text-t2" dir="auto">{tail}</p>}
        </div>)}
        {phase === "done" && saved && p && (
          <div className="flex flex-wrap items-center gap-2"><span className="num text-[11.5px] text-t1">{c?.flag} {name} · {saved.at.slice(0, 16).replace("T", " ")} UTC · {u.spent} {saved.usage.usd != null ? `$${saved.usage.usd.toFixed(2)}` : "—"} · {saved.usage.searches} {u.usage}{saved.cached ? " · cached" : ""}</span>
            <span className="ms-auto flex flex-wrap gap-1.5"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(saved.report); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Copy size={13} />{copied ? u.copied : u.copy}</button><button type="button" onClick={() => saveBlob(`${iso}-council.md`, "text/markdown", saved.report)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Download size={13} />.md</button><PdfButton L={L} storeKey={key} /><button type="button" onClick={() => printBriefing(html())} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-t1 hover:text-t0"><Printer size={13} />{u.pdf}</button><button type="button" onClick={() => setPhase("form")} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-bg3 px-2.5 text-[12px] text-accent">{u.again}</button></span></div>)}
      </Block>
      {phase === "done" && saved && p && (<>
        <div role="tablist" className="flex flex-wrap gap-1">{(["assess", "agents", "verify", "sources"] as const).map((t) => <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-8 rounded-full px-3 text-[12.5px] ${tab === t ? "bg-accent font-semibold text-[var(--accent-ink)]" : "bg-bg2 text-t1 hover:text-t0"}`}>{t === "assess" ? u.assess : t === "agents" ? `${u.agentsT} · ${saved.agents.filter((a) => a.status === "done").length}` : t === "verify" ? u.verifyT : `${u.sourcesT} · ${saved.sources.length}`}</button>)}</div>
        {tab === "assess" && <AssessTab L={L} saved={saved} p={p} iso={iso ?? ""} onJump={jump} />}
        {tab === "agents" && <AgentsTab L={L} saved={saved} />}
        {tab === "verify" && <VerifyTab L={L} saved={saved} p={p} />}
        {tab === "sources" && <Block title={u.sourcesT}><SourcesTab L={L} saved={saved} /></Block>}
      </>)}
    </div>
  );
}
