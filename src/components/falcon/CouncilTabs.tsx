"use client";
import { useMemo } from "react";
import { RedFlags, ReviewPair, reviewsOf } from "../desk/Quality";
import { qualityGates } from "@/lib/falcon/gates";
import type { CouncilParsed } from "@/lib/falcon/council-parse";
import { headOf } from "@/lib/report/model";
import { Markdown } from "../Markdown";
import { safeHttp } from "@/lib/url";
import { Fold, FoldGroup, ListBar, NoMatch, SegBar, useListView, type Facet } from "../report/kit";
import { AsOfSoWhat, StandardParts, useStandard } from "../report/standard";
import { useTr } from "../case/bits";
import { GatesPanel } from "./GatesPanel";
import { Pill, type Lang } from "./bits";
import { AuditPanel, ChallengesPanel, CouncilHero, DisagreementsPanel, ImpactPanel, JudgmentsPanel, OptionsPanel, ScenariosPanel } from "./CouncilParts";

type Source = { url: string; title: string };
export type AgentRes = { id: string; name: string; text: string; usd: number; searches: number; failed: number; status: "done" | "skipped" | "error"; note?: string };
type Saved = { report: string; agents: AgentRes[]; sources: Source[]; at: string };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** The assessment: the head with the red-team result, the red flags, then the sections that fold (key judgments on their map, disagreements, impact, options, scenarios, the editor's full text and the automated gates). */
export function AssessTab({ L, saved, p, iso, onJump }: { L: Lang; saved: Saved; p: CouncilParsed; iso: string; onJump: (id: string) => void }) {
  const t = useTr(L); const head = useMemo(() => headOf("falcon-council", saved.report, { sources: saved.sources, lang: L }), [saved, L]);
  const gates = useMemo(() => { let rt = false; try { rt = !!localStorage.getItem(`gd-rt:${iso}`); } catch { /* storage unavailable */ } return qualityGates(saved.report, "council", { redTeamed: rt }); }, [saved.report, iso]);
  const std = useStandard(saved.report); const ANGLE_AGENT: Record<string, string[]> = { gov: ["geo"], friends: ["geo"], military: ["geo", "natsec"], natsec: ["natsec"], econ: ["econ"], tradeinv: ["econ"], logistics: ["econ"], energy: ["energy", "food"], tech: ["tech"], soft: ["tech"], info: ["tech"], legal: ["geo"], climate: ["tech"], influence: ["uae"] };
  const angleTarget = (a: string) => { const f = ANGLE_AGENT[a]; const i = f ? p.judgments.findIndex((j) => f.some((x) => new RegExp(`\\b${x}\\b`).test(j.agents))) : -1; return i >= 0 ? `fc-j-${i + 1}` : null; };
  const jumpAngle = (id: string) => { onJump("fc-judgments"); setTimeout(() => { const el = document.getElementById(id); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.add("ring-2", "ring-accent"); setTimeout(() => el?.classList.remove("ring-2", "ring-accent"), 1600); }, 250); };
  const nav = [p.judgments.length > 0 && { id: "fc-judgments", label: t("Key judgments", "الأحكام الرئيسية") }, p.disagreements.length > 0 && { id: "fc-dis", label: t("Disagreements", "الخلافات") }, p.items.length > 0 && { id: "fc-impact", label: t("UAE impact", "الأثر للإمارات") }, p.options.length > 0 && { id: "fc-options", label: t("Options", "الخيارات") }, (p.scenarios.length > 0 || p.signposts.length > 0) && { id: "fc-scen", label: t("Scenarios", "السيناريوهات") }, p.audit.length > 0 && { id: "fc-audit", label: t("Claim audit", "تدقيق الادعاءات") }, { id: "fc-text", label: t("Full assessment", "التقييم الكامل") }].filter(Boolean) as { id: string; label: string }[];
  return (
    <div className="space-y-4" dir={L === "ar" ? "rtl" : "ltr"}>
      <CouncilHero L={L} p={p} head={head} gates={gates} nav={nav} onJump={onJump} />
      <AsOfSoWhat L={L} at={saved.at} soWhat={std?.soWhat} />
      <RedFlags L={L} reviews={reviewsOf(saved.report)} />
      <FoldGroup L={L}>
        <StandardParts L={L} std={std} target={angleTarget} onJump={jumpAngle} />
        {p.judgments.length > 0 && <Fold id="fc-judgments" title={t("Key judgments", "الأحكام الرئيسية")} count={p.judgments.length} hint={t("Each judgment with its likelihood, confidence and what the red team did to it.", "كل حكم مع احتماله وثقته وما فعله الفريق الأحمر به.")}><JudgmentsPanel L={L} p={p} /></Fold>}
        {p.disagreements.length > 0 && <Fold id="fc-dis" title={t("Preserved disagreements", "خلافات محفوظة")} count={p.disagreements.length}><DisagreementsPanel L={L} p={p} /></Fold>}
        {p.agrees.length > 0 && <Fold id="fc-agrees" title={t("Where the council agrees", "حيث يتفق المجلس")} count={p.agrees.length} hint={t("Shared evidence and one model are the reason, so this is not independent corroboration.", "السبب أدلة مشتركة ونموذج واحد، فليس هذا تثبّتًا مستقلًا.")}><ul className="space-y-1.5">{p.agrees.map((a, i) => <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-t0"><span aria-hidden className="text-ok">✓</span><span dir="auto">{a}</span></li>)}</ul></Fold>}
        {p.items.length > 0 && <Fold id="fc-impact" title={t("UAE impact and opportunities", "الأثر والفرص للإمارات")} count={p.items.length}><ImpactPanel L={L} p={p} /></Fold>}
        {p.options.length > 0 && <Fold id="fc-options" title={t("Options for decision", "خيارات للقرار")} count={p.options.length}><OptionsPanel L={L} p={p} /></Fold>}
        {(p.scenarios.length > 0 || p.signposts.length > 0) && <Fold id="fc-scen" title={t("Scenarios and signposts", "السيناريوهات والمؤشرات الدالة")} count={p.scenarios.length}><ScenariosPanel L={L} p={p} /></Fold>}
        <Fold id="fc-text" title={t("Assessment", "التقييم")} hint={t("The editor's whole text, as written.", "نص المحرر كاملًا كما كُتب.")} defaultOpen={false}><article><Markdown source={p.editorMd} /></article></Fold>
        <Fold id="fc-gates" title={t("Automated quality gates", "بوابات الجودة الآلية")} defaultOpen={false}><GatesPanel md={saved.report} kind="council" L={L} iso3={iso} /></Fold>
      </FoldGroup>
    </div>
  );
}

/** Verification and challenge: both auditors, the verifier's claim audit and the red team's challenges, each searchable. */
export function VerifyTab({ L, saved, p }: { L: Lang; saved: Saved; p: CouncilParsed }) {
  const t = useTr(L);
  return (
    <div className="space-y-4">
      <ReviewPair L={L} reviews={reviewsOf(saved.report)} />
      <FoldGroup L={L}>
        {p.audit.length > 0 && <Fold id="fc-audit" title={t("Claim audit", "تدقيق الادعاءات")} count={p.audit.length}><AuditPanel L={L} p={p} /></Fold>}
        {p.challenges.length > 0 && <Fold id="fc-chal" title={t("Red-team challenges", "تحديات الفريق الأحمر")} count={p.challenges.length}><ChallengesPanel L={L} p={p} /></Fold>}
      </FoldGroup>
      {!p.audit.length && !p.challenges.length && <p className="text-[12.5px] text-t2">—</p>}
    </div>
  );
}

const ST_C = (s: string) => (s === "done" ? "var(--ok)" : s === "error" ? "var(--risk)" : "var(--t2)");
/** Each agent as one card of the roster (status, searches, cost), then its own text, with a search over all of them. */
export function AgentsTab({ L, saved }: { L: Lang; saved: Saved }) {
  const t = useTr(L); const total = saved.agents.reduce((a, x) => a + x.usd, 0);
  const facets = useMemo<Facet<AgentRes>[]>(() => [{ id: "s", label: t("Status", "الحالة"), get: (x) => x.status, options: (["done", "skipped", "error"] as const).filter((k) => saved.agents.some((x) => x.status === k)).map((v) => ({ v, label: v, color: ST_C(v) })) }], [saved.agents, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(saved.agents, { text: (a) => `${a.name} ${a.id} ${a.text}`, facets, sorts: [{ id: "usd", label: t("Cost, highest first", "الكلفة، الأعلى أولًا"), cmp: (a, z) => z.usd - a.usd }, { id: "name", label: t("Name", "الاسم"), cmp: (a, z) => a.name.localeCompare(z.name) }] });
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-line bg-bg1 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("Agent steps by status", "خطوات الوكلاء بحسب الحالة")}</p><SegBar segs={(["done", "skipped", "error"] as const).map((k) => ({ label: k, n: saved.agents.filter((a) => a.status === k).length, color: ST_C(k) }))} />
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{saved.agents.map((a) => <li key={a.id} className="rounded-[10px] bg-bg2 p-2 text-[11.5px]" style={{ borderInlineStart: `3px solid ${ST_C(a.status)}` }}><div className="flex items-center gap-1.5"><span className="min-w-0 flex-1 truncate font-medium text-t0" title={a.name}>{a.name}</span><span className="numt text-[10.5px] text-t2">${a.usd.toFixed(2)}</span></div><span className="mt-1 block h-1 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full bg-accent" style={{ width: `${total > 0 ? Math.max(2, (a.usd / total) * 100) : 0}%` }} /></span>{a.searches > 0 && <span className="mt-0.5 block text-[10px] text-t2">{a.searches} 🔎</span>}</li>)}</ul></div>
      <ListBar L={L} view={view} placeholder={t("Search the agents' texts", "ابحث في نصوص الوكلاء")} />
      <div className="space-y-2.5">{view.shown.map((a) => <details key={a.id} className="rounded-[12px] border border-line bg-bg1 p-3" open={a.id === "orchestrator" && !view.active}><summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[13px] font-semibold text-t0">{a.name}<Pill c={ST_C(a.status)}>{a.status}</Pill><span className="num ms-auto text-[10.5px] font-normal text-t2">{a.searches ? `${a.searches} 🔎 · ` : ""}${a.usd.toFixed(2)}</span></summary>{a.text ? <article className="mt-2" dir={L === "ar" ? "rtl" : "ltr"}><Markdown source={a.text} /></article> : <p className="mt-2 text-[12px] text-t2">{a.note ?? "—"}</p>}</details>)}{!view.shown.length && <NoMatch L={L} />}</div>
    </div>
  );
}

/** The sources, searchable and filterable by site. */
export function SourcesTab({ L, saved }: { L: Lang; saved: Saved }) {
  const t = useTr(L); const top = useMemo(() => { const m = new Map<string, number>(); for (const s of saved.sources) m.set(host(s.url), (m.get(host(s.url)) ?? 0) + 1); return [...m.entries()].sort((a, z) => z[1] - a[1]).slice(0, 8); }, [saved.sources]);
  const facets = useMemo<Facet<Source>[]>(() => (top.length > 1 ? [{ id: "h", label: t("Site", "الموقع"), get: (x) => host(x.url), options: top.map(([v, n]) => ({ v, label: `${v} · ${n}` })) }] : []), [top, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(saved.sources, { text: (s) => `${s.title} ${s.url}`, facets });
  return (
    <div>{saved.sources.length > 6 && <ListBar L={L} view={view} placeholder={t("Search sources", "ابحث في المصادر")} />}
      <ol className="space-y-1.5 text-[12.5px]">{view.shown.map((s) => <li key={s.url} className="flex gap-2"><span className="num w-6 shrink-0 text-end text-t2">{saved.sources.indexOf(s) + 1}</span><a href={safeHttp(s.url)} target="_blank" rel="noreferrer noopener" className="min-w-0 break-words text-t1 hover:text-accent">{s.title}<span className="block text-[10.5px] text-t2">{host(s.url)}</span></a></li>)}</ol>
      {!view.shown.length && <NoMatch L={L} />}</div>
  );
}
