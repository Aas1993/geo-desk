"use client";
// Second-source views: leaders and elections beside Wikidata, deal corroboration, tension-register evidence and the media-tone limit.
// Each reads a sidecar data file (leaders-xcheck.json, deals-xcheck.json, tension-evidence.json) and shows its sources and the ones that could not be read.
import { useT } from "@/lib/store";
import { useKeyed } from "@/lib/useKeyed";
import { Card, Skeleton } from "./ui";
import { safeHttp } from "@/lib/url";
import { loadLeadersX, electionChecks, officeCheck, type ElectionVerdict, type OfficeVerdict, type LeadersX, type WikiElection } from "@/lib/leaders-xcheck";
import { corroboration, type DealsX } from "@/lib/corroboration";
import { loadTensionEvidence, evidenceKey, tally, type TensionEvidence } from "@/lib/tension-evidence";

type Lang = "en" | "ar";
const T = {
  en: {
    leadTitle: "Second sources: leaders and elections", leadIntro: "The leaders and election dates above come from Wikidata and Wikipedia's electoral calendars. Here other publishers are set beside them.",
    legislative: "Parliamentary election", presidential: "Presidential election", holders: "Who holds office",
    v: { none: "No date", single: "One source only", agree: "Sources agree", close: "Within 3 months", differ: "Sources differ" } as Record<ElectionVerdict, string>,
    o: { match: "Names match", differ: "Differs: check", none: "No second reading" } as Record<OfficeVerdict, string>,
    src: { wiki: "Wikipedia electoral calendar", ipu: "IPU Parline", ifes: "IFES ElectionGuide" }, tentative: "date not confirmed", expired: "expected date has passed", staleNote: "Expected dates already past (not compared)",
    wikidata: "Wikidata", factbook: "CIA World Factbook, frozen", snapshot: "snapshot", noSecond: "No second source holds an election date for this country, so there is nothing to cross-check.",
    runoff: "A second reading can be a run-off round or a different chamber: a difference is a reason to look, not proof of an error.", holdersNote: "The Factbook was retired by the CIA, so its reading stops at the snapshot date: an office-holder who changed since then shows as a difference. Names are matched on text, so a different spelling can too.",
    unused: "Sources consulted but not used", read: "Sources read", fail: "The second-source data could not be loaded.", built: "Built",
  },
  ar: {
    leadTitle: "مصادر ثانية: القادة والانتخابات", leadIntro: "القادة ومواعيد الانتخابات أعلاه مصدرها ويكي داتا وتقاويم ويكيبيديا الانتخابية. هنا نضع بجانبها ما تقوله جهات نشر أخرى.",
    legislative: "انتخابات برلمانية", presidential: "انتخابات رئاسية", holders: "من يشغل المنصب",
    v: { none: "لا موعد", single: "مصدر واحد فقط", agree: "المصادر متفقة", close: "خلال 3 أشهر", differ: "المصادر مختلفة" } as Record<ElectionVerdict, string>,
    o: { match: "الأسماء متطابقة", differ: "مختلف: تحقق", none: "لا قراءة ثانية" } as Record<OfficeVerdict, string>,
    src: { wiki: "تقويم ويكيبيديا الانتخابي", ipu: "الاتحاد البرلماني الدولي (Parline)", ifes: "دليل الانتخابات (IFES)" }, tentative: "الموعد غير مؤكد", expired: "انقضى الموعد المتوقع", staleNote: "مواعيد متوقعة انقضت (غير مقارَنة)",
    wikidata: "ويكي داتا", factbook: "كتاب حقائق العالم (CIA)، مجمّد", snapshot: "لقطة", noSecond: "لا يملك أي مصدر ثانٍ موعد انتخابات لهذه الدولة، فلا شيء للمطابقة.",
    runoff: "قد تكون القراءة الثانية جولة إعادة أو غرفة برلمانية أخرى: الاختلاف سبب للتدقيق وليس دليلاً على خطأ.", holdersNote: "أوقفت وكالة الاستخبارات المركزية الكتاب، فتتوقف قراءته عند تاريخ اللقطة؛ ومن تغيّر منصبه بعدها يظهر كاختلاف. وتُطابَق الأسماء نصيًا فقد يظهر اختلاف بسبب التهجئة.",
    unused: "مصادر جرت مراجعتها ولم تُستخدم", read: "مصادر مقروءة", fail: "تعذّر تحميل بيانات المصادر الثانية.", built: "أُنشئ",
  },
} as const;
const TONE: Record<string, string> = { none: "var(--t2)", single: "var(--t2)", agree: "var(--ok)", close: "var(--warn)", differ: "var(--risk)", match: "var(--ok)", corroborated: "var(--ok)", read: "var(--ok)", partial: "var(--warn)", unread: "var(--t2)" };
const Chip = ({ k, label }: { k: string; label: string }) => <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${TONE[k]} 18%, transparent)`, color: TONE[k] }}>{label}</span>;
const Ext = ({ href, children, title }: { href: string; children: React.ReactNode; title?: string }) => <a href={safeHttp(href)} target="_blank" rel="noreferrer noopener" title={title} className="text-accent hover:underline">{children}</a>;
const Unused = ({ list, label }: { list: { name: string; url: string; reason: string }[]; label: string }) => !list.length ? null : (
  <details className="mt-2 text-[11px] text-t2"><summary className="cursor-pointer text-t1">{label} · {list.length}</summary>
    <ul className="mt-1 space-y-1">{list.map((x) => <li key={x.name} className="leading-snug"><Ext href={x.url}>{x.name}</Ext>: {x.reason}</li>)}</ul></details>
);

// ---------- leaders and elections ----------
export function LeadersCheck({ iso, people, elections }: { iso: string; people: { role: "state" | "gov"; name: string }[]; elections: WikiElection[] }) {
  const { lang } = useT(); const u = T[lang as Lang]; const q = useKeyed<LeadersX>("lx", loadLeadersX);
  if (q.loading) return <Card title={u.leadTitle} icon="🧭"><Skeleton h={80} /></Card>;
  const f = q.value; if (q.error || !f) return <Card title={u.leadTitle} icon="🧭"><p className="text-[12.5px] text-t1">{u.fail}</p></Card>;
  const x = f.countries[iso]; const today = new Date().toISOString().slice(0, 10); const checks = electionChecks(x, elections, today);
  const cia = f.sources.cia; const heads = people.map((p) => ({ p, text: x?.cia?.[p.role], v: officeCheck(p.name, x?.cia?.[p.role]) }));
  const used = Object.values(f.sources).filter((s) => s.status === "ok");
  return (
    <Card title={u.leadTitle} icon="🧭">
      <p className="mb-2.5 text-[12px] leading-snug text-t1">{u.leadIntro}</p>
      {!checks.length ? <p className="rounded-[10px] bg-warn/10 p-2.5 text-[12px] leading-snug text-t0">{u.noSecond}</p> : checks.map((c) => (
        <div key={c.office} className="mb-2.5 rounded-[12px] bg-bg2 p-3">
          <div className="flex items-start justify-between gap-2"><span className="text-[12px] text-t0">{u[c.office]}</span><Chip k={c.verdict} label={u.v[c.verdict]} /></div>
          <ul className="mt-1.5 space-y-1 text-[12px]">{c.readings.map((r) => <li key={r.s} className="flex flex-wrap items-baseline justify-between gap-x-3"><span className="text-t1">{r.url ? <Ext href={r.url} title={r.label}>{u.src[r.s]}</Ext> : u.src[r.s]}<span className="text-t2" dir="auto"> · {r.label}</span></span><span className="num text-t0">{r.date.slice(0, r.s === "ipu" ? 7 : 10)}{r.tentative ? <span className="ms-1 text-[10px] text-warn">({u.tentative})</span> : null}</span></li>)}</ul>
          {c.stale.length > 0 && <p className="mt-1 text-[10.5px] text-t2">{u.staleNote}: {c.stale.map((r) => `${u.src[r.s]} ${r.date.slice(0, 7)}`).join(", ")}</p>}
        </div>))}
      {checks.some((c) => c.verdict === "differ" || c.verdict === "close") && <p className="mb-2 text-[11px] leading-snug text-t2">{u.runoff}</p>}
      {heads.length > 0 && <>
        <h4 className="label mb-1 mt-3">{u.holders}</h4>
        <ul className="space-y-1.5 text-[12px]">{heads.map(({ p, text, v }) => <li key={p.role}><div className="flex flex-wrap items-baseline justify-between gap-x-3"><span><b className="text-t0" dir="auto">{p.name}</b> <span className="text-t2">· {u.wikidata}</span></span><Chip k={v} label={u.o[v]} /></div>
          {text && <div className="text-[11px] text-t2" dir="auto">{u.factbook}{cia?.snapshot ? `, ${u.snapshot} ${cia.snapshot}` : ""}: {text}</div>}</li>)}</ul>
        <p className="mt-1.5 text-[11px] leading-snug text-t2">{u.holdersNote}</p></>}
      <p className="mt-2 text-[11px] leading-snug text-t2">{u.read}: {used.map((s, i) => <span key={s.id}>{i ? " · " : ""}<Ext href={s.url} title={`${s.publisher}: ${s.basis}`}>{s.name.split(":")[0]}</Ext></span>)} · {u.built} {f.built.slice(0, 10)}</p>
      <Unused list={f.unavailable} label={u.unused} />
    </Card>
  );
}

// ---------- deal corroboration ----------
let dxCache: Promise<DealsX | null> | null = null;
const loadDealsX = () => (dxCache ??= fetch("/data/deals-xcheck.json").then((r) => (r.ok ? (r.json() as Promise<DealsX>) : null)).catch(() => null));
const D = {
  en: { corroborated: "Corroborated", publishers: "publishers", publisher: "publisher", wamOnly: "WAM only", checked: "checked against", notChecked: "no other source could be checked for this date", syndicated: "also carries the same WAM text", filing: "company filing", title: "Corroboration of the deals", intro: "A deal is marked corroborated only when at least two independent publishers carry it. WAM counts as one; a copy of the WAM text does not count as another; a company's own filing to its exchange does. Outlets that repost the same company press release still count as publishers, so read “corroborated” as carried by two publishers, not as independently verified.", of: "of", corrob: "deals corroborated", checkedN: "deals checked by at least one other source", gap: "The rest are not 'uncorroborated': no other source we can read covers that date, or the wording differed too much to match. Match rules are strict on purpose.", srcs: "Other sources read", unused: "Sources consulted but not used", n: "n" },
  ar: { corroborated: "مؤكَّدة بمصدر ثانٍ", publishers: "جهات نشر", publisher: "جهة نشر", wamOnly: "وام فقط", checked: "جرى التحقق عبر", notChecked: "لا مصدر آخر يمكن فحصه لهذا التاريخ", syndicated: "ينشر النص نفسه الصادر عن وام", filing: "إفصاح الشركة", title: "تأكيد الصفقات", intro: "تُعد الصفقة مؤكَّدة فقط إذا نشرتها جهتان مستقلتان على الأقل. وام تُحتسب واحدة؛ ونسخة من نص وام لا تُحتسب أخرى؛ أما إفصاح الشركة لدى سوقها فيُحتسب. والمنابر التي تعيد نشر البيان الصحفي نفسه تُحتسب جهات نشر، فتُقرأ «مؤكَّدة» بمعنى نشرتها جهتان لا بمعنى تحقق مستقل.", of: "من", corrob: "صفقات مؤكَّدة", checkedN: "صفقات فحصها مصدر آخر على الأقل", gap: "الباقي ليس «غير مؤكَّد»: لا مصدر نقرؤه يغطي ذلك التاريخ، أو اختلفت الصياغة بما يمنع المطابقة. وقواعد المطابقة صارمة عمدًا.", srcs: "مصادر أخرى مقروءة", unused: "مصادر جرت مراجعتها ولم تُستخدم", n: "ن" },
} as const;
export function useDealsX() { return useKeyed<DealsX | null>("dx", loadDealsX); }

/** The corroboration line under one deal: the count, the other publishers as links, or an honest "WAM only". */
export function DealX({ u: id, x }: { u: string; x: DealsX | null | undefined }) {
  const { lang } = useT(); const d = D[lang as Lang]; if (!x) return null;
  const c = corroboration(x.items[id]);
  if (c.level === "corroborated") return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"><Chip k="corroborated" label={`${d.corroborated} · ${c.count} ${d.publishers}`} />
      {c.publishers.map((p) => <Ext key={p.p} href={p.url} title={`${p.title} (${p.d})`}>{p.name}{p.kind === "filing" ? ` · ${d.filing}` : ""}</Ext>)}
      {c.syndicated.length > 0 && <span className="text-t2">{c.syndicated.length} {d.syndicated}</span>}</div>);
  return <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-t2"><Chip k="single" label={`${d.wamOnly} · 1 ${d.publisher}`} />{c.checked.length ? <span>{d.checked} {c.checked.length}</span> : <span>{d.notChecked}</span>}{c.syndicated.length > 0 && <span>{c.syndicated.length} {d.syndicated}</span>}</div>;
}
/** One summary line and the source list for a set of deals. */
export function DealsXNote({ ids, x }: { ids: string[]; x: DealsX | null | undefined }) {
  const { lang } = useT(); const d = D[lang as Lang]; if (!x) return null;
  const cs = ids.map((i) => corroboration(x.items[i])); const n = cs.filter((c) => c.level === "corroborated").length; const chk = cs.filter((c) => c.checked.length).length;
  const used = Object.values(x.sources).filter((s) => s.status === "ok");
  return (
    <div className="mt-2 rounded-[10px] bg-bg2 p-2.5 text-[11px] leading-snug text-t2">
      <div className="text-[12px] text-t0"><b className="num">{n}</b> {d.of} <b className="num">{ids.length}</b> {d.corrob} · <span className="num">{chk}</span> {d.checkedN}</div>
      <p className="mt-1">{d.intro} {d.gap}</p>
      <p className="mt-1">{d.srcs}: {used.map((s, i) => <span key={s.id}>{i ? " · " : ""}<Ext href={s.url} title={`${s.publisher}: ${s.basis}${s.from ? ` (${s.from} to ${s.to})` : ""}`}>{s.name}</Ext></span>)}</p>
      <Unused list={x.unavailable} label={d.unused} />
    </div>
  );
}

// ---------- tension register evidence ----------
const E = {
  en: { head: "Public-record check", machine: "Read by machine", notAnalyst: "not yet confirmed by an analyst", of: "of", found: "sources hold the expected text", missing: "answered without the expected text: the entry may be out of date", unread: "could not be read", docs: "UN documents", latest: "Latest", icj: "ICJ docket", docket: "Court docket", crisis: "Crisis Group names the UAE in", fail: "Evidence data could not be loaded.", unused: "Sources consulted but not used", on: "on" },
  ar: { head: "فحص السجلات العامة", machine: "قراءة آلية", notAnalyst: "لم يؤكدها محلل بعد", of: "من", found: "مصادر تحوي النص المتوقع", missing: "ردّت دون النص المتوقع: قد يكون المدخل قديمًا", unread: "تعذّرت قراءتها", docs: "وثائق الأمم المتحدة", latest: "الأحدث", icj: "سجل محكمة العدل", docket: "جدول القضية", crisis: "تذكر مجموعة الأزمات الإمارات في", fail: "تعذّر تحميل بيانات الأدلة.", unused: "مصادر جرت مراجعتها ولم تُستخدم", on: "في" },
} as const;
export function TensionEvidenceView({ iso3, kind }: { iso3: string; kind: string }) {
  const { lang } = useT(); const e = E[lang as Lang]; const q = useKeyed<TensionEvidence>("te", loadTensionEvidence);
  if (q.loading) return <Skeleton h={40} />; const f = q.value; if (q.error || !f) return <p className="text-[11px] text-t2">{e.fail}</p>;
  const ev = f.entries[evidenceKey(iso3, kind)]; if (!ev) return null; const t = tally(ev);
  const cases = f.icj.cases.filter((c) => ev.icj?.includes(c.id));
  return (
    <div className="mt-2 rounded-[10px] border border-line/60 p-2.5 text-[11px] leading-snug text-t1">
      <div className="flex flex-wrap items-center gap-2"><b className="text-t0">{e.head}</b><Chip k={t.level} label={`${t.found} ${e.of} ${t.total} ${e.found}`} /><span className="text-t2">{e.machine} · {e.notAnalyst}</span></div>
      {(t.missing > 0 || t.unread > 0) && <p className="mt-1 text-t2">{t.missing > 0 ? `${t.missing}: ${e.missing}. ` : ""}{t.unread > 0 ? `${t.unread}: ${e.unread}.` : ""}</p>}
      <ul className="mt-1 space-y-0.5">{ev.checks.map((c) => <li key={c.url} className="flex items-start gap-1.5"><span style={{ color: c.found ? "var(--ok)" : c.found === false ? "var(--risk)" : "var(--t2)" }} aria-hidden>{c.found ? "✓" : c.found === false ? "✗" : "·"}</span><span><Ext href={c.url}>{c.label}</Ext> <span className="text-t2">· {c.how === "feed" ? "RSS" : c.how === "library search" ? "UN library" : "page"} {c.status ? `HTTP ${c.status}` : ""} {e.on} {c.at}{c.note ? ` · ${c.note}` : ""}</span></span></li>)}</ul>
      {cases.map((c) => <p key={c.id} className="mt-1"><b className="text-t0">{e.icj}</b>: <Ext href={c.url}>{c.title}</Ext>{c.latest ? <span className="text-t2" dir="auto"> · {e.latest}: {c.latest.date}, {c.latest.title.split(" - ").pop()}</span> : null}</p>)}
      {ev.undl && <div className="mt-1"><b className="text-t0">{e.docs}</b>: <span className="num">{ev.undl.total}{ev.undl.capped ? "+" : ""}</span>{ev.undl.note ? <span className="text-t2"> · {ev.undl.note}</span> : null}
        <ul className="mt-0.5 space-y-0.5">{ev.undl.records.slice(0, 3).map((r) => <li key={r.url} dir="auto"><Ext href={r.url}>{r.symbol ?? r.url.split("/").pop()}</Ext> <span className="text-t2">· {r.date ?? ""} · {r.title.slice(0, 110)}</span></li>)}</ul></div>}
    </div>
  );
}
export function TensionEvidenceSources() {
  const { lang } = useT(); const e = E[lang as Lang]; const q = useKeyed<TensionEvidence>("te", loadTensionEvidence); const f = q.value; if (!f) return null;
  return <div className="mt-2 text-[11px] text-t2">{Object.values(f.sources).filter((s) => s.status === "ok").map((s, i) => <span key={s.id}>{i ? " · " : ""}<Ext href={s.url} title={`${s.publisher}: ${s.basis}`}>{s.name.split(":")[0]}</Ext></span>)}<Unused list={f.unavailable} label={e.unused} /></div>;
}

// ---------- media tone: a single feed ----------
const M = {
  en: { head: "One machine-coded feed", body: "Tone here is one feed: GDELT's machine-coded tone of news events. We found no second tone measure that is open to read, so a tone figure cannot be cross-checked here and should be read as that feed's reading, not as a finding.", unused: "Other tone and news-analytics services considered" },
  ar: { head: "مصدر آلي واحد", body: "النبرة هنا مصدرها واحد: نبرة الأحداث الإخبارية المرمّزة آليًا في GDELT. لم نجد قياسًا ثانيًا للنبرة متاحًا للقراءة المفتوحة، فلا يمكن مطابقة رقم النبرة هنا، ويُقرأ على أنه قراءة هذا المصدر لا نتيجة مؤكدة.", unused: "خدمات أخرى للنبرة وتحليل الأخبار جرى النظر فيها" },
} as const;
export function ToneLimit() {
  const { lang } = useT(); const m = M[lang as Lang]; const q = useKeyed<TensionEvidence>("te", loadTensionEvidence); const tone = q.value?.tone;
  return (
    <div className="mt-2 rounded-[10px] bg-bg2 p-2.5 text-[11px] leading-snug text-t2"><b className="text-t0">{m.head}.</b> {m.body}
      {tone && <Unused list={tone.unavailable} label={m.unused} />}</div>
  );
}
