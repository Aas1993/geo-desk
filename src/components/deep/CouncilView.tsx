"use client";
import { useMemo } from "react";
import { Boxes, ClipboardCheck, Gavel, ListChecks, Scale, Users } from "lucide-react";
import { Markdown } from "../Markdown";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Drill, openDrill } from "../desk/shared";
import { RedFlags, ReviewPair, reviewsOf } from "../desk/Quality";
import { AsOfSoWhat, StandardParts, useStandard } from "../report/standard";
import { Fold, FoldGroup, jumpTo, ListBar, NoMatch, ReportHero, SegBar, useListView, type Facet, type SortSpec, type StatSpec } from "../report/kit";
import type { Saved } from "../machiavelli/useRun";
import { cutText, headOf } from "@/lib/report/model";
import { dropTables, parseCouncil, sectionsOf, tablesOf, tally, type Analyst, type Change, type Claim, type CouncilOption, type CouncilParsed, type DissentRow, type FollowRow, type Level, type Verdict } from "@/lib/report/deepmd";

// THE ANALYST TEAM'S REPORT AS A PAGE: the decision at the head, then every section of the saved report as a fold, and the parts that are tables (the options, the challenger's objections, the verifier's claim audit, the follow-through triggers, each analyst's confidence) drawn as filterable cards. Every word of the saved report is on the page: a table is shown as cards with every cell, and the text around it stays. The parsing is src/lib/report/deepmd.ts (shared with the PDF); a part the report does not contain is not drawn.
const FEAS: Record<Level | "none", string> = { high: "var(--ok)", medium: "var(--warn)", low: "var(--risk)", none: "var(--t2)" };
const VERD: Record<Verdict, string> = { supported: "var(--ok)", partly: "var(--warn)", unsupported: "var(--risk)", stale: "var(--warn)", other: "var(--t2)" };
const CHG: Record<Change, string> = { yes: "var(--risk)", partly: "var(--warn)", no: "var(--ok)", unknown: "var(--t2)" };
const RANK: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };
const stat = (n: number | string, label: string, c: string, icon: React.ReactNode, jump: string): StatSpec => (n === 0 || n === "–" ? { n: "–", label, c: "var(--t2)", icon } : { n, label, c, icon, jump });
const md = (body: string) => (body.trim() ? <article><Markdown source={body.replace(/<!--[\s\S]*?-->/g, "")} /></article> : null);
const Kv = ({ fields }: { fields: [string, string][] }) => <dl className="mt-2 grid gap-1.5 text-[12px] leading-snug sm:grid-cols-2">{fields.map(([k, v]) => <div key={k}><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-t2">{k}</dt><dd className="text-t0" dir="auto">{v}</dd></div>)}</dl>;

function OptionCards({ L, p }: { L: Lang; p: CouncilParsed }) {
  const t = useTr(L); const word = (l: Level | "none") => (l === "none" ? t("Not established", "غير مثبتة") : l === "high" ? t("High", "مرتفعة") : l === "medium" ? t("Medium", "متوسطة") : t("Low", "منخفضة"));
  const facets = useMemo<Facet<CouncilOption>[]>(() => [{ id: "feas", label: t("Feasibility", "الجدوى"), get: (o) => o.feas ?? "none", options: (["high", "medium", "low", "none"] as const).filter((k) => p.options.some((o) => (o.feas ?? "none") === k)).map((v) => ({ v, label: word(v), color: FEAS[v] })) }], [p.options, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorts = useMemo<SortSpec<CouncilOption>[]>(() => [{ id: "feas", label: t("Feasibility, highest first", "الجدوى، الأعلى أولًا"), cmp: (a, z) => RANK[z.feas ?? "none"] - RANK[a.feas ?? "none"] }], [L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(p.options, { text: (o) => `${o.title} ${o.fields.map((f) => f[1]).join(" ")}`, facets, sorts }); const ft = tally(p.options.map((o) => o.feas ?? "none"), ["high", "medium", "low", "none"] as const);
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("How feasible the options are, in the analysts' own words", "مدى جدوى الخيارات بكلمات المحللين أنفسهم")}</p><SegBar segs={(["high", "medium", "low", "none"] as const).filter((k) => ft[k] > 0).map((k) => ({ label: word(k), n: ft[k], color: FEAS[k] }))} /></div>
      <ListBar L={L} view={view} placeholder={t("Search the options", "ابحث في الخيارات")} />
      <ul className="grid gap-2.5 lg:grid-cols-2">{view.shown.map((o, i) => { const c = FEAS[o.feas ?? "none"]; return <li key={o.title + i} className="rounded-[14px] border border-line bg-bg2 p-3 text-[12px] leading-snug" style={{ borderTop: `3px solid ${c}` }}><div className="flex flex-wrap items-start gap-2"><b className="min-w-0 flex-1 text-[13.5px] text-t0" dir="auto">{o.title}</b>{o.feasText && <Pill c={c}>{t("Feasibility", "الجدوى")}: {o.feasText}</Pill>}</div><Kv fields={o.fields.filter(([k, v]) => !(v === o.feasText && /feasib|جدوى|إمكان/i.test(k)))} /></li>; })}</ul>{!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}
function DissentCards({ L, rows }: { L: Lang; rows: DissentRow[] }) {
  const t = useTr(L); const lab = (c: Change) => (c === "yes" ? t("Changes the option", "يغيّر الخيار") : c === "partly" ? t("Partly changes it", "يغيّره جزئيًا") : c === "no" ? t("Does not change it", "لا يغيّره") : t("Not stated", "غير مذكور"));
  const facets = useMemo<Facet<DissentRow>[]>(() => [{ id: "chg", label: t("Would it change the option?", "هل يغيّر الخيار؟"), get: (x) => x.changes, options: (["yes", "partly", "no", "unknown"] as const).filter((k) => rows.some((x) => x.changes === k)).map((v) => ({ v, label: lab(v), color: CHG[v] })) }], [rows, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(rows, { text: (x) => `${x.judgment} ${x.objection} ${x.evidence} ${x.changesText}`, facets }); const ct = tally(rows.map((x) => x.changes), ["yes", "partly", "no", "unknown"] as const);
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><SegBar segs={(["yes", "partly", "no", "unknown"] as const).filter((k) => ct[k] > 0).map((k) => ({ label: lab(k), n: ct[k], color: CHG[k] }))} /></div>
      <ListBar L={L} view={view} placeholder={t("Search the objections", "ابحث في الاعتراضات")} />
      <ul className="space-y-2">{view.shown.map((d, i) => <li key={i} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug" style={{ borderInlineStart: `4px solid ${CHG[d.changes]}` }}><div className="flex flex-wrap items-start gap-2"><b className="min-w-0 flex-1 text-t0" dir="auto">{d.judgment}</b><Pill c={CHG[d.changes]}>{lab(d.changes)}</Pill></div><p className="mt-1 text-t0" dir="auto"><b>{t("Strongest objection", "أقوى اعتراض")}: </b>{d.objection}</p><p className="mt-1 text-t1" dir="auto"><b className="text-t0">{t("Evidence or source", "الدليل أو المصدر")}: </b>{d.evidence}</p>{d.changesText && <p className="mt-1 text-t1" dir="auto"><b className="text-t0">{t("Would it change the recommended option?", "هل يغيّر الخيار الموصى به؟")} </b>{d.changesText}</p>}</li>)}</ul>{!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}
function ClaimCards({ L, rows }: { L: Lang; rows: Claim[] }) {
  const t = useTr(L); const lab = (v: Verdict) => (v === "supported" ? t("Supported", "مدعوم") : v === "partly" ? t("Partly supported", "مدعوم جزئيًا") : v === "unsupported" ? t("Unsupported", "غير مدعوم") : v === "stale" ? t("Stale", "قديم") : t("Other", "أخرى"));
  const facets = useMemo<Facet<Claim>[]>(() => [{ id: "v", label: t("Verdict", "الحكم"), get: (c) => c.verdict, options: (["unsupported", "stale", "partly", "supported", "other"] as const).filter((k) => rows.some((x) => x.verdict === k)).map((v) => ({ v, label: lab(v), color: VERD[v] })) }], [rows, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(rows, { text: (c) => `${c.claim} ${c.ref} ${c.verdictText} ${c.correction}`, facets }); const ct = tally(rows.map((x) => x.verdict), ["supported", "partly", "unsupported", "stale", "other"] as const);
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("What the verifier found when it checked each claim against the facts and the sources", "ما وجده المدقق حين فحص كل ادعاء مقابل الحقائق والمصادر")}</p><SegBar segs={(["supported", "partly", "unsupported", "stale", "other"] as const).filter((k) => ct[k] > 0).map((k) => ({ label: lab(k), n: ct[k], color: VERD[k] }))} /></div>
      <ListBar L={L} view={view} placeholder={t("Search the claims", "ابحث في الادعاءات")} />
      <ul className="space-y-2">{view.shown.map((c, i) => <li key={i} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug" style={{ borderInlineStart: `4px solid ${VERD[c.verdict]}` }}><div className="flex flex-wrap items-start gap-2"><span className="numt text-t2">{c.n}</span><b className="min-w-0 flex-1 text-t0" dir="auto">{c.claim}</b><Pill c={VERD[c.verdict]}>{c.verdictText || lab(c.verdict)}</Pill></div>{c.ref && <p className="mt-1 text-[11.5px] text-t2" dir="auto">{c.ref}</p>}{c.correction && <p className="mt-1 text-t1" dir="auto"><b className="text-t0">{t("Correction", "التصحيح")}: </b>{c.correction}</p>}</li>)}</ul>{!view.shown.length && <NoMatch L={L} />}
    </div>
  );
}
function FollowCards({ rows }: { rows: FollowRow[] }) {
  return <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{rows.map((f, i) => <li key={i} className="rounded-[12px] border border-line bg-bg2 p-3" style={{ borderTop: "3px solid var(--accent)" }}><b className="text-[13px] leading-snug text-t0" dir="auto">{f.title}</b><dl className="mt-2 space-y-1.5 text-[12px] leading-snug">{f.fields.map(([k, v]) => <div key={k}><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-t2">{k}</dt><dd className="text-t0" dir="auto">{v}</dd></div>)}</dl></li>)}</ul>;
}
function AnalystCards({ L, rows }: { L: Lang; rows: Analyst[] }) {
  const t = useTr(L); const w = (l: Level | null) => (l === "high" ? t("High", "مرتفعة") : l === "medium" ? t("Medium", "متوسطة") : l === "low" ? t("Low", "منخفضة") : t("Not stated", "غير مذكورة"));
  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-bg2 p-3"><p className="mb-1.5 text-[11px] text-t2">{t("Each analyst's own stated confidence (click a row to open the section)", "ثقة كل محلل كما ذكرها (انقر صفًا لفتح القسم)")}</p>
        <ul className="space-y-1.5">{rows.map((a, i) => <li key={i}><button type="button" onClick={() => openDrill(`dc-an-${i}`)} className="grid w-full grid-cols-[minmax(0,34%)_1fr_auto] items-center gap-2 text-start text-[12px] hover:text-accent"><span className="truncate text-t1" dir="auto">{a.role}</span><span className="block h-2.5 overflow-hidden rounded-full bg-bg3" aria-hidden><span className="block h-full rounded-full" style={{ width: `${a.level === "high" ? 100 : a.level === "medium" ? 62 : a.level === "low" ? 30 : 6}%`, background: a.level ? FEAS[a.level === "high" ? "high" : a.level === "medium" ? "medium" : "low"] : "var(--t2)" }} /></span><span className="numt min-w-8 text-end text-[11px] text-t1">{w(a.level)}</span></button></li>)}</ul></div>
      <div className="space-y-2">{rows.map((a, i) => <Drill key={i} id={`dc-an-${i}`} L={L} head={a.role} tags={<Pill c={a.level ? FEAS[a.level] : "var(--t2)"}>{t("confidence", "الثقة")}: {w(a.level)}</Pill>} sub={a.conclusion ? cutText(a.conclusion, 240) : undefined}>{a.confidence && <p className="text-t1" dir="auto"><b className="text-t0">{t("Confidence", "الثقة")}: </b>{a.confidence}</p>}{md(a.text)}</Drill>)}</div>
    </div>
  );
}

/** The saved report of the analyst team (mode "full") or the research synthesis (mode "research") as a page. */
export function CouncilView({ L, s, mode }: { L: Lang; s: Saved; mode: "research" | "full" }) {
  const t = useTr(L); const p = useMemo(() => parseCouncil(s.report), [s.report]); const secs = useMemo(() => sectionsOf(s.report), [s.report]); const reviews = useMemo(() => reviewsOf(s.report), [s.report]);
  const std = useStandard(s.report);
  // an angle on the fourteen-angle matrix leads to the analyst or section of this page that treats it (null: the tile is not a link)
  const ANGLE_TO: Record<string, RegExp> = { econ: /econom|signal|اقتصاد|الإشارات/i, tradeinv: /trade|invest|تجارة|استثمار/i, logistics: /trade|تجارة/i, energy: /energy|food|طاقة|غذائ/i, natsec: /national security|الأمن الوطني/i, military: /national security|الأمن الوطني/i, gov: /country|political|الدولة|السياس/i, friends: /perspective|policy|المنظورات|السياسة/i, soft: /country|research|الأبحاث/i, info: /research|الأبحاث/i };
  const dec = p.decision[p.leadIdx]?.text ?? ""; const lead = mode === "research" ? p.analysts.find((a) => a.conclusion)?.conclusion ?? "" : dec;
  const head = useMemo(() => headOf(mode === "full" ? "deep-council" : "deep-research", s.report, { sources: s.sources, lang: L, bottomLine: cutText(lead, 560) }), [s.report, s.sources, L, mode, lead]);
  const appendixAt = secs.findIndex((x) => x.level === 1 && /appendix|ملحق/i.test(x.title)); const pre = appendixAt < 0 ? secs : secs.slice(0, appendixAt); const post = appendixAt < 0 ? [] : secs.slice(appendixAt);
  const groups: { title: string; head: string; subs: typeof secs }[] = []; for (const x of post) { if (x.level === 1) groups.push({ title: x.title, head: x.body, subs: [] }); else groups.at(-1)?.subs.push(x); }
  const ct = tally(p.claims.map((c) => c.verdict), ["supported", "partly", "unsupported", "stale", "other"] as const); const ch = tally(p.challenge.map((c) => c.changes), ["yes", "partly", "no", "unknown"] as const);
  const gauge = p.claims.length ? { value: Math.round((ct.supported / p.claims.length) * 100), label: t("claims supported", "ادعاءات مدعومة"), sub: `${ct.supported} ${t("of", "من")} ${p.claims.length}` } : null;
  const intro = pre.filter((x) => x.level === 1 && x.body.trim()); const chair = pre.filter((x) => x.level === 2);
  const isReview = (x: string) => /review|مراجعة/i.test(x); const isAnalysts = (x: string) => /analyst|المحلل/i.test(x); const isChallenge = (x: string) => /challenge|التحدي|الاعتراض/i.test(x); const isVerify = (x: string) => /verif|التحقق|التدقيق/i.test(x);
  const nav = [...(chair[0] ? [{ id: "dc-s0", label: t("The decision", "القرار") }] : []), ...(p.options.length ? [{ id: "dc-options", label: t("Options", "الخيارات") }] : []), ...(p.challenge.length ? [{ id: "dc-challenge", label: t("Dissent", "الخلاف") }] : []), ...(p.claims.length ? [{ id: "dc-claims", label: t("Claim audit", "تدقيق الادعاءات") }] : []), ...(p.analysts.length ? [{ id: "dc-analysts", label: t("Analysts", "المحللون") }] : []), ...(p.follow.length ? [{ id: "dc-follow", label: t("Follow-through", "المتابعة") }] : [])];
  const angleTarget = (a: string) => { const re = ANGLE_TO[a]; if (!re) return null; const ai = p.analysts.findIndex((x) => re.test(x.role)); if (ai >= 0) return `dc-an-${ai}`; const ci = chair.findIndex((x) => re.test(x.title)); return ci >= 0 ? (ci === p.optionsSec ? "dc-options" : ci === p.followSec ? "dc-follow" : `dc-s${ci}`) : null; };
  const jumpAngle = (id: string) => { if (id.startsWith("dc-an-")) { jumpTo("dc-analysts"); setTimeout(() => openDrill(id), 150); } else jumpTo(id); };
  return (
    <div className="space-y-4">
      <ReportHero L={L} kicker={mode === "full" ? t("Deep Intelligence team: decision assessment", "فريق الاستخبارات المعمّقة: تقييم القرار") : t("Deep Intelligence: research synthesis", "الاستخبارات المعمّقة: تركيب الأبحاث")} bottomLine={cutText(lead, 560)} head={head} gauge={gauge}
        stats={[...(mode === "full" ? [stat(p.options.length, t("options", "خيارات"), "var(--accent)", <Boxes size={16} />, "dc-options")] : []), stat(p.claims.length ? `${ct.supported}/${p.claims.length}` : 0, t("claims supported", "ادعاءات مدعومة"), p.claims.length && (ct.unsupported + ct.stale) ? "var(--risk)" : ct.partly ? "var(--warn)" : "var(--ok)", <ClipboardCheck size={16} />, "dc-claims"), ...(mode === "full" ? [stat(p.challenge.length ? `${ch.yes + ch.partly}/${p.challenge.length}` : 0, t("objections that change the option", "اعتراضات تغيّر الخيار"), ch.yes ? "var(--risk)" : ch.partly ? "var(--warn)" : "var(--ok)", <Gavel size={16} />, "dc-challenge")] : []), stat(p.analysts.length, t("analyst sections", "أقسام المحللين"), "var(--c2)", <Users size={16} />, "dc-analysts"), ...(mode === "full" ? [stat(p.follow.length, t("follow-through triggers", "محفّزات المتابعة"), "var(--accent)", <ListChecks size={16} />, "dc-follow"), { n: s.sources.length || "–", label: t("sources cited", "مصادر مستشهد بها"), c: "var(--t2)" }] : [stat(p.deskInputs.length, t("inputs only the desk can give", "مدخلات لا يوفرها إلا المكتب"), "var(--warn)", <Scale size={16} />, "dc-analysts"), { n: s.sources.length || "–", label: t("sources cited", "مصادر مستشهد بها"), c: "var(--t2)" }])]} nav={nav} />
      <AsOfSoWhat L={L} at={s.at} soWhat={std?.soWhat} />
      {p.partial && <p role="status" className="rounded-[12px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] text-t0">{t("The chair did not finish: a cost ceiling or an error stopped the team, so the decision summary and some headings are missing. The analyst sections that were written follow.", "لم ينهِ الرئيس عمله: أوقف سقف الكلفة أو خطأ الفريق، فملخص القرار وبعض العناوين ناقصة. وتتبعها أقسام المحللين التي كُتبت.")}</p>}
      <RedFlags L={L} reviews={reviews} />
      {p.deskInputs.length > 0 && <div className="rounded-[12px] border border-warn/40 bg-warn/5 p-3 text-[12.5px] leading-snug"><b className="text-warn">{t("What only the desk can supply", "ما لا يوفره إلا المكتب")}</b><ul className="mt-1 list-disc space-y-0.5 ps-5 text-t0">{p.deskInputs.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul></div>}
      <FoldGroup L={L}>
        <StandardParts L={L} std={std} target={angleTarget} onJump={jumpAngle} />
        {intro.map((x, i) => <div key={i} className="rounded-[12px] border border-line bg-bg1 p-3">{md(x.body)}</div>)}
        {chair.map((x, i) => {
          const isOpt = i === p.optionsSec && p.options.length > 0; const isFol = i === p.followSec && p.follow.length > 0; const rest = isOpt || isFol ? dropTables(x.body) : x.body;
          return <Fold key={i} id={isOpt ? "dc-options" : isFol ? "dc-follow" : `dc-s${i}`} title={x.title} count={isOpt ? p.options.length : isFol ? p.follow.length : undefined} defaultOpen={i === 0 || isOpt}>{md(rest)}{isOpt && <div className="mt-3"><OptionCards L={L} p={p} /></div>}{isFol && <div className="mt-3"><FollowCards rows={p.follow} /></div>}</Fold>;
        })}
        {groups.filter((g) => !isReview(g.title)).map((g, gi) => {
          if (isAnalysts(g.title) && p.analysts.length) return <Fold key={gi} id="dc-analysts" title={g.title} count={p.analysts.length}>{md(g.head)}<AnalystCards L={L} rows={p.analysts} /></Fold>;
          const here = isChallenge(g.title) && p.challenge.length > 0, claimsHere = isVerify(g.title) && p.claims.length > 0;
          return <Fold key={gi} id={here ? "dc-challenge" : claimsHere ? "dc-claims" : `dc-g${gi}`} title={g.title} count={here ? p.challenge.length : claimsHere ? p.claims.length : undefined} defaultOpen={here || claimsHere}>{md(g.head)}{g.subs.map((x, i) => { const tbl = tablesOf(x.body).length > 0; return <div key={i} className="mt-2">{x.title && <h4 className="text-[13px] font-semibold text-t0" dir="auto">{x.title}</h4>}{md(here || claimsHere ? dropTables(x.body) : x.body)}{tbl && here && <div className="mt-3"><DissentCards L={L} rows={p.challenge} /></div>}{tbl && claimsHere && <div className="mt-3"><ClaimCards L={L} rows={p.claims} /></div>}</div>; })}</Fold>;
        })}
        {reviews.length > 0 && <Fold id="dc-reviews" title={t("The independent auditors' reviews", "مراجعات المدققين المستقلين")} count={reviews.length} defaultOpen={false}><ReviewPair L={L} reviews={reviews} /></Fold>}
      </FoldGroup>
    </div>
  );
}
