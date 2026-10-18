"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Download, RefreshCw, Search, FileText, Globe, Sparkles } from "lucide-react";
import { useT } from "@/lib/store";
import { Panel } from "./markets-ui";
import { Markdown } from "./Markdown";
import { normaliseNote } from "@/lib/research/normalise";
import type { Listing } from "@/lib/markets/types";
import { safeHttp } from "@/lib/url";

type Source = { url: string; title: string; kind: "search" | "fetch" };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; usd: number | null };
type Saved = { report: string; sources: Source[]; usage: Usage; at: string; model: string; truncated?: boolean };
type Step = { id: number; kind: "search" | "fetch" | "analyse" | "status"; text: string };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export function ResearchTab({ listing, lang }: { listing: Listing; lang: "en" | "ar" }) {
  const { t } = useT();
  const storeKey = `gd-research:${listing.exchange}:${listing.symbol}:${lang}`;
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [text, setText] = useState(""); const [steps, setSteps] = useState<Step[]>([]); const [sources, setSources] = useState<Source[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null); const [err, setErr] = useState<{ error: string; message?: string } | null>(null);
  const [facts, setFacts] = useState<{ filings: number | null; headlines: number; hasMarketData: boolean; notes: string[] } | null>(null);
  const abort = useRef<AbortController | null>(null); const stepId = useRef(0); const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { // restore the last note for this stock/language from this browser
    const t0 = setTimeout(() => { try { const s = localStorage.getItem(storeKey); if (s) { const v = JSON.parse(s) as Saved; v.report = normaliseNote(v.report); setSaved(v); setText(v.report); setSources(v.sources); setPhase("done"); } else { setSaved(null); setText(""); setSources([]); setSteps([]); setPhase("idle"); } } catch {} }, 0);
    return () => { clearTimeout(t0); abort.current?.abort(); };
  }, [storeKey]);

  const push = (kind: Step["kind"], text: string) => setSteps((s) => {
    const last = s[s.length - 1]; // collapse runs of "Analysing" into one line with a count
    if (kind === "analyse" && last?.kind === "analyse") return [...s.slice(0, -1), { ...last, text: String((Number(last.text) || 1) + 1) }];
    return [...s.slice(-40), { id: ++stepId.current, kind, text: kind === "analyse" ? "1" : text }];
  });
  async function run(refresh: boolean) {
    abort.current?.abort(); const ac = new AbortController(); abort.current = ac;
    setPhase("running"); setText(""); setSteps([]); setSources([]); setErr(null); setFacts(null); setSaved(null);
    try {
      const r = await fetch(`/api/research/${listing.exchange}/${encodeURIComponent(listing.symbol)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, refresh }), signal: ac.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); setErr({ error: j.error ?? "upstream", message: j.message }); setPhase("error"); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let idx: number; while ((idx = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2); if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5)) as Record<string, unknown> & { type: string };
          if (ev.type === "text") { setText((x) => x + (ev.delta as string)); }
          else if (ev.type === "status") push("status", ev.text as string);
          else if (ev.type === "facts") { setFacts(ev as never); push("status", t("rs_factsReady")); }
          else if (ev.type === "tool") push(ev.name as Step["kind"], ev.detail as string);
          else if (ev.type === "source") { const n = ev as unknown as Source; setSources((s) => (s.some((x) => x.url === n.url) ? s.map((x) => (x.url === n.url ? { ...x, kind: n.kind } : x)) : [...s, n])); }
          else if (ev.type === "error") { setErr({ error: ev.error as string, message: ev.message as string }); setPhase("error"); }
          else if (ev.type === "done") { const d = ev as unknown as Saved; setText(d.report); setSources(d.sources); setSaved(d); setPhase("done"); try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch {} }
        }
      }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr({ error: "upstream", message: (e as Error).message }); setPhase("error"); } }
  }
  useEffect(() => { if (phase === "running") endRef.current?.scrollIntoView({ block: "nearest" }); }, [text, steps, phase]);

  // sources the finished note actually cites (its URL appears in the text) are listed first
  const cited = phase === "done" ? sources.filter((s) => text.includes(s.url) || text.includes(decodeURI(s.url))) : [];
  const rest = sources.filter((s) => !cited.includes(s));
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text + `\n\n---\nGenerated ${saved?.at ?? ""} by Geo Desk research analyst (${saved?.model ?? ""}). Not investment advice.\n`], { type: "text/markdown" })); a.download = `${listing.exchange}-${listing.symbol}-research.md`; a.click(); URL.revokeObjectURL(a.href); };
  const errText = !err ? "" : err.error === "no_credits" ? t("rs_err_credits") : err.error === "no_credentials" ? t("rs_err_cred") : err.error === "rate" ? t("rs_err_rate") : err.error === "busy" ? (err.message ?? "") : err.error === "disabled" ? t("rs_err_disabled") : err.error === "refusal" ? (err.message ?? "") : `${t("rs_err_generic")} ${err.message ?? ""}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        {phase === "idle" && (
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[640px]"><div className="rule-gold mb-3" /><h2 className="display text-[24px] font-semibold">{t("rs_title")}</h2><p className="mt-2 text-[13.5px] leading-relaxed text-t1">{t("rs_intro")}</p>
                <ul className="mt-3 grid gap-1.5 text-[12.5px] text-t1 sm:grid-cols-2">{(["rs_c1", "rs_c2", "rs_c3", "rs_c4", "rs_c5", "rs_c6"] as const).map((k) => <li key={k} className="flex gap-2"><span className="text-accent">▸</span>{t(k)}</li>)}</ul></div>
              <button onClick={() => run(false)} className="flex shrink-0 items-center gap-2 rounded-[6px] bg-accent px-5 py-3 text-[14px] font-semibold text-[var(--accent-ink)] hover:opacity-90"><Sparkles size={16} />{t("rs_generate")}</button>
            </div>
            <p className="mt-4 rounded-[6px] border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-t2">{t("rs_cost")}</p>
          </Panel>
        )}
        {phase === "error" && <Panel><div className="text-[13.5px]"><b className="text-down">{t("rs_failed")}</b> {errText}</div><button onClick={() => run(false)} className="mt-3 rounded-full border border-line2 px-4 py-1.5 text-[12.5px] text-accent hover:bg-bg2">{t("retry")}</button></Panel>}
        {(phase === "running" || (phase === "error" && text)) && (
          <Panel title={t("rs_progress")} aside={phase === "running" ? <span className="flex items-center gap-1.5 text-[11px] text-accent"><i className="size-1.5 animate-pulse rounded-full bg-accent" />{t("rs_working")}</span> : undefined}>
            {facts && <p className="mb-2 text-[11.5px] text-t2">{facts.filings != null ? `${facts.filings} DFM filings · ` : ""}{facts.headlines} {t("rs_headlines")}{facts.hasMarketData ? ` · ${t("rs_mdata")}` : ""}</p>}
            <ul className="max-h-48 space-y-1 overflow-y-auto text-[12.5px]">{steps.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-t1">{s.kind === "search" ? <Search size={13} className="mt-0.5 shrink-0 text-accent" /> : s.kind === "fetch" ? <FileText size={13} className="mt-0.5 shrink-0 text-c2" /> : s.kind === "analyse" ? <Sparkles size={13} className="mt-0.5 shrink-0 text-t2" /> : <Globe size={13} className="mt-0.5 shrink-0 text-t2" />}
                <span className="min-w-0 break-words">{s.kind === "search" ? (s.text ? `${t("rs_searching")} “${s.text}”` : t("rs_searchingWeb")) : s.kind === "fetch" ? (s.text ? `${t("rs_reading")} ${host(s.text)}` : t("rs_readingPage")) : s.kind === "analyse" ? `${t("rs_analysing")}${Number(s.text) > 1 ? ` ×${s.text}` : ""}` : s.text}</span></li>))}<div ref={endRef} /></ul>
          </Panel>
        )}
        {text && (
          <Panel>
            {phase === "done" && saved && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="text-[11.5px] text-t2">{t("rs_generated")} {new Date(saved.at).toLocaleString(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · {saved.model}</div>
                <div className="flex gap-1.5">
                  <button onClick={copy} className="flex items-center gap-1.5 rounded-[6px] border border-line2 px-2.5 py-1.5 text-[12px] text-t1 hover:bg-bg2"><Copy size={13} />{copied ? t("copied") : t("rs_copy")}</button>
                  <button onClick={download} className="flex items-center gap-1.5 rounded-[6px] border border-line2 px-2.5 py-1.5 text-[12px] text-t1 hover:bg-bg2"><Download size={13} />.md</button>
                  <button onClick={() => run(true)} className="flex items-center gap-1.5 rounded-[6px] border border-line2 px-2.5 py-1.5 text-[12px] text-accent hover:bg-bg2"><RefreshCw size={13} />{t("rs_regen")}</button>
                </div>
              </div>)}
            <article dir={lang === "ar" ? "rtl" : "ltr"}><Markdown source={text} />{phase === "running" && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}</article>
            {saved?.truncated && <p className="mt-4 text-[12px] text-warn">{t("rs_truncated")}</p>}
          </Panel>
        )}
      </div>
      <aside className="space-y-4">
        <Panel title={`${t("rs_sources")} (${cited.length ? `${cited.length} ${t("rs_cited")} · ${rest.length} ${t("rs_otherRes")}` : sources.length})`}>
          {sources.length === 0 ? <p className="text-[12.5px] text-t2">{t("rs_sourcesEmpty")}</p> : (
            <ol className="max-h-[520px] space-y-2 overflow-y-auto text-[12.5px]">{[...cited, ...rest].map((s, i) => (
              <li key={s.url} className="flex gap-2"><span className="num w-5 shrink-0 text-end text-t2">{i + 1}</span><a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" className="min-w-0 break-words text-t1 hover:text-accent"><span className="block truncate text-t0" title={s.title}>{s.title}</span><span className="num text-[11px] text-t2">{host(s.url)} · {cited.includes(s) ? <b className="font-medium text-accent">{t("rs_cited")}</b> : s.kind === "fetch" ? t("rs_read") : t("rs_found")}</span></a></li>))}</ol>)}
          <p className="mt-3 text-[11px] text-t2">{t("rs_sourcesNote")}</p>
        </Panel>
        {saved && (
          <Panel title={t("rs_usage")}>
            <dl className="num grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]"><dt className="text-t2">{t("rs_searches")}</dt><dd className="text-end">{saved.usage.searches}</dd><dt className="text-t2">{t("rs_pages")}</dt><dd className="text-end">{saved.usage.fetches}</dd><dt className="text-t2">{t("rs_tokensIn")}</dt><dd className="text-end">{(saved.usage.input + saved.usage.cacheRead + saved.usage.cacheWrite).toLocaleString("en-US")}</dd><dt className="text-t2">{t("rs_tokensOut")}</dt><dd className="text-end">{saved.usage.output.toLocaleString("en-US")}</dd>{saved.usage.usd != null && <><dt className="text-t2">{t("rs_tokenCost")}</dt><dd className="text-end text-accent">≈ ${saved.usage.usd.toFixed(2)}</dd></>}</dl>
            <p className="mt-2 text-[11px] text-t2">{t("rs_costNote")}</p>
          </Panel>)}
        <p className="text-[11px] leading-relaxed text-t2">{t("rs_disclaimer")}</p>
      </aside>
    </div>
  );
}
