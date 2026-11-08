"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, FileDown, Plus, X } from "lucide-react";
import { buildPlaybook } from "@/lib/case/playbook";
import { classification } from "@/lib/case/report";
import { clipsHtml, readClips } from "@/lib/clips";
import { BRIEF_CSS } from "@/lib/dossier/export";
import { CSS as BIRD_CSS } from "@/lib/bird/visual";
import { playbookBlocks } from "@/lib/bird/playbookHtml";
import { birdMarkdown, consolidate, type Prod } from "@/lib/bird/consolidate";
import { INFO, readHeld } from "@/lib/bird/runner";
import { presidentKey } from "@/lib/bird/president";
import { readTrack } from "@/lib/mofa/track";
import { listSnaps, LAB_KIND, TOOL_NAME } from "@/lib/lab/snap";
import { GROUP_LABEL, buildPack, markdownSection, moveSection, productSection, type PackSection } from "@/lib/lab/pack";
import { downloadHtmlReport } from "@/lib/reportpdf";
import { REPORT_CSS, esc, reportDoc } from "@/lib/report/html";
import { useStored } from "../deep/hooks";
import { useTr } from "../case/bits";
import { Block, Pill } from "../falcon/bits";
import type { ToolProps } from "./kit";

// the kind each saved product is read as (the same reading the Archive PDF uses)
const KIND: Record<string, string> = { king: "king-council", mofa: "mofa-council", intel: "emb-intel", plan: "emb-plan", architect: "architect", council: "case-council", falcon: "falcon-council", deep: "deep-council", mach: "mach-council", country: "country-full" };
const PRES = { en: "The President's brief", ar: "موجز الرئيس" };
const prod = (key: string): Prod => { const h = readHeld(key); if (!h) return null; try { const j = JSON.parse(localStorage.getItem(key) ?? "null") as { usage?: { usd?: number }; lang?: "en" | "ar" } | null; return { report: h.report, at: h.at, usd: typeof j?.usage?.usd === "number" ? j.usage.usd : null, sources: [], lang: j?.lang === "ar" ? "ar" : "en" }; } catch { return null; } };

/** THE BRIEFING-PACK BUILDER: pick what is on file for the country (the playbook, the councils and briefs, the President's brief, the Bird's eye summary, the field updates, the Lab views), order it, and get one illustrated PDF: a cover, contents, one section per item and a closing page that says what is dated when and what is not on file. Free: it only assembles what is already saved in this browser. */
export function PackTool({ L, iso, d, name }: ToolProps) {
  const t = useTr(L); const lang = L === "ar" ? "ar" : "en"; const [tick, setTick] = useState(() => Date.now()); const [order, setOrder, ready] = useStored<{ ids: string[] | null; purpose: string }>(`gd-pack:${iso}`, { ids: null, purpose: "" }); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { const on = () => setTick(Date.now()); for (const ev of ["storage", "focus", "gd-clips", "gd-lab-snap"]) window.addEventListener(ev, on); return () => { for (const ev of ["storage", "focus", "gd-clips", "gd-lab-snap"]) window.removeEventListener(ev, on); }; }, []);
  const built = useMemo(() => {
    void tick; if (!iso || !d) return { avail: [] as PackSection[], missing: [] as string[] };
    const avail: PackSection[] = []; const missing: string[] = []; const rep = (id: keyof typeof INFO) => readHeld(INFO[id].key(iso))?.report ?? null;
    try { const pb = buildPlaybook(d, { mofa: rep("mofa"), embIntel: rep("intel"), embPlan: rep("plan"), kingBrief: rep("king"), council: rep("council"), architect: rep("architect") }, lang); avail.push({ id: "playbook", group: "playbook", title: t("The UAE statecraft playbook", "دليل فن الحكم للإمارات"), sub: t("rule-built from the Case File and the products on file", "مبني بالقواعد من ملف الحالة والمنتجات المحفوظة"), at: null, blocks: playbookBlocks(pb, lang) }); } catch { missing.push(t("The playbook could not be built", "تعذّر بناء الدليل")); }
    const products = Object.fromEntries((Object.keys(INFO) as (keyof typeof INFO)[]).map((id) => [id, prod(INFO[id].key(iso))])) as Record<keyof typeof INFO, Prod>;
    try { const b = consolidate({ iso, name, d, track: readTrack(iso), now: tick, products: { king: products.king, mofa: products.mofa, intel: products.intel, plan: products.plan, architect: products.architect, council: products.council, falcon: products.falcon, deep: products.deep, mach: products.mach, country: products.country } }); avail.push(markdownSection({ id: "bird", group: "bird", title: t("Bird's eye summary", "ملخص نظرة الطائر"), sub: t("the consolidated view of the products on file", "العرض الموحد للمنتجات المحفوظة"), at: null, md: birdMarkdown(b, lang) })); } catch { /* the summary is skipped when it cannot be built */ }
    for (const id of Object.keys(INFO) as (keyof typeof INFO)[]) { const p = products[id]; const title = t(INFO[id].en, INFO[id].ar); if (p) avail.push(productSection({ id: `p-${id}`, kind: KIND[id], title, report: p.report, at: p.at, usd: p.usd, lang: p.lang, L: lang })); else missing.push(title); }
    const pr = prod(presidentKey(iso)); if (pr) avail.push(productSection({ id: "p-president", kind: "president-brief", title: t(PRES.en, PRES.ar), report: pr.report, at: pr.at, usd: pr.usd, lang: pr.lang, L: lang })); else missing.push(t(PRES.en, PRES.ar));
    const clips = readClips(iso); if (clips.length) avail.push({ id: "clips", group: "field", title: t("Field updates", "مستجدات ميدانية"), sub: `${clips.length}`, at: clips.reduce((a, c) => (c.at > a ? c.at : a), ""), blocks: [clipsHtml(clips, lang)] });
    for (const s of listSnaps(iso)) avail.push({ id: `lab-${s.tool}`, group: "lab", title: t(TOOL_NAME[s.tool].en, TOOL_NAME[s.tool].ar), sub: s.title, at: s.at, blocks: s.blocks, note: s.lang !== lang ? t("Saved in Arabic; shown as saved.", "حُفظ بالإنجليزية؛ يُعرض كما حُفظ.") : undefined });
    return { avail, missing };
  }, [tick, iso, d, name, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(built.avail.map((s) => [s.id, s])); const chosen = (order.ids ?? built.avail.map((s) => s.id)).filter((id) => byId.has(id)); const rest = built.avail.filter((s) => !chosen.includes(s.id));
  const setIds = (ids: string[]) => setOrder((p) => ({ ...p, ids }));
  const sections = chosen.map((id) => byId.get(id)!);
  const pack = () => buildPack({ country: name, flag: d?.flag, L: lang, date: new Date().toISOString().slice(0, 10), sections, missing: built.missing, purpose: order.purpose });
  const make = async () => {
    if (!sections.length || busy || !iso) return; setBusy("0%"); setMsg("");
    try { const at = new Date().toISOString(); const p = pack(); const html = reportDoc({ title: p.title, lang, css: `${BRIEF_CSS}${BIRD_CSS}${REPORT_CSS}`, blocks: [`<div class="cls">${esc(classification(lang))}</div>`, ...p.blocks, `<div class="foot">${esc(`Geo Desk · ${at.slice(0, 10)}`)}</div>`] });
      await downloadHtmlReport(html, { id: `lab-pack:${iso}:${at}`, iso, country: name, kind: "lab-pack", title: p.title, lang, at, usd: null }, `briefing-pack-${iso}-${at.slice(0, 10)}.pdf`, (n, m) => setBusy(`${Math.round((n / Math.max(1, m)) * 100)}%`)); setMsg(t("The pack was saved to the Archive and downloaded.", "حُفظت الحزمة في الأرشيف ونُزّلت.")); }
    catch (e) { setMsg(`${t("The pack could not be made", "تعذّر إعداد الحزمة")}: ${e instanceof Error ? e.message : ""}`); } finally { setBusy(""); }
  };
  return (
    <div className="space-y-4">
      <Block title={t(`Briefing pack: ${name}`, `حزمة إحاطة: ${name}`)} hint={t("Everything below is already saved in this browser; the pack only assembles it. Rule-built views are free and always available; products are the agents' saved work. A product not on file is listed on the last page as not on file, never invented.", "كل ما يلي محفوظ أصلًا في هذا المتصفح؛ والحزمة تجمعه فقط. العروض المبنية بالقواعد مجانية ومتاحة دائمًا؛ والمنتجات عمل الوكلاء المحفوظ. والمنتج غير المحفوظ يُذكر في الصفحة الأخيرة كغير محفوظ ولا يُختلق.")}>
        <label htmlFor="pack-purpose" className="label mb-1 block">{t("Purpose line for the cover (optional)", "سطر الغرض للغلاف (اختياري)")}</label>
        <input id="pack-purpose" value={order.purpose} onChange={(e) => setOrder((p) => ({ ...p, purpose: e.target.value.slice(0, 240) }))} maxLength={240} placeholder={t("For example: for the 4 November meeting with the Minister", "مثال: لاجتماع 4 نوفمبر مع الوزير")} className="h-9 w-full rounded-[8px] border border-line bg-bg2 px-2.5 text-[13px] text-t0" />
        <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void make()} disabled={!sections.length || !!busy || !ready} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-50"><FileDown size={15} aria-hidden />{busy ? `${t("Making the pack", "جارٍ إعداد الحزمة")} ${busy}` : t(`Build the PDF (${sections.length} sections)`, `ابنِ ملف PDF (${sections.length} أقسام)`)}</button>{msg && <span role="status" className="text-[12px] text-t1">{msg}</span>}</div>
        {sections.length > 8 && <p className="mt-2 text-[11.5px] leading-snug text-t2">{t("A long pack makes a large file: the PDF is built from page images, and a pack of 14 sections came to about 55 MB in testing. Take out the sections you do not need for a lighter file, and allow a few minutes.", "الحزمة الطويلة تنتج ملفًا كبيرًا: يُبنى PDF من صور الصفحات، وبلغت حزمة من 14 قسمًا نحو 55 ميغابايت في الاختبار. أخرج الأقسام غير اللازمة لملف أخف، واسمح ببضع دقائق.")}</p>}
      </Block>
      <Block title={t("Contents, in order", "المحتويات بالترتيب")} hint={t("Move a section up or down, or take it out. The cover, the contents and the closing page are added.", "حرّك قسمًا لأعلى أو لأسفل أو أخرجه. يُضاف الغلاف والمحتويات والصفحة الأخيرة.")}>
        {!sections.length ? <p className="text-[12.5px] text-t1">{t("No section chosen. Add one below.", "لم يُختر قسم. أضف واحدًا أدناه.")}</p> : <ol className="space-y-1.5">{sections.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 rounded-[10px] border border-line bg-bg2 p-2"><span className="num w-5 text-center text-[12px] text-t2">{i + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-t0">{s.title}</p><p className="truncate text-[11px] text-t2"><Pill c="var(--accent)">{t(GROUP_LABEL[s.group].en, GROUP_LABEL[s.group].ar)}</Pill> {s.at ? s.at.slice(0, 10) : t("current", "حالي")}{s.sub ? ` · ${s.sub}` : ""}</p></div>
            <button type="button" disabled={i === 0} onClick={() => setIds(moveSection(sections, s.id, -1).map((x) => x.id))} aria-label={t("Move up", "تحريك لأعلى")} className="grid size-7 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-accent disabled:opacity-30"><ArrowUp size={13} /></button>
            <button type="button" disabled={i === sections.length - 1} onClick={() => setIds(moveSection(sections, s.id, 1).map((x) => x.id))} aria-label={t("Move down", "تحريك لأسفل")} className="grid size-7 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-accent disabled:opacity-30"><ArrowDown size={13} /></button>
            <button type="button" onClick={() => setIds(chosen.filter((x) => x !== s.id))} aria-label={t("Take it out", "أخرجه")} className="grid size-7 place-items-center rounded-[6px] bg-bg3 text-t1 hover:text-risk"><X size={13} /></button></li>))}</ol>}
      </Block>
      <Block title={t("Also on file", "محفوظ أيضًا")}>
        {rest.length > 0 && <ul className="mb-3 flex flex-wrap gap-1.5">{rest.map((s) => <li key={s.id}><button type="button" onClick={() => setIds([...chosen, s.id])} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-bg2 px-3 text-[12px] text-t0 hover:border-accent"><Plus size={12} aria-hidden />{s.title}</button></li>)}</ul>}
        {built.missing.length > 0 && <div className="rounded-[10px] border border-dashed border-line p-3"><p className="label mb-1.5">{t("Not on file for this country (listed on the pack's last page)", "غير محفوظ لهذه الدولة (يُذكر في الصفحة الأخيرة)")}</p><ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-t1">{built.missing.map((m) => <li key={m}>{m}</li>)}</ul><p className="mt-1.5 text-[11.5px] text-t2">{t("Run them in their tabs (", "شغّلها في تبويباتها (")}<Link href="/bird" className="text-accent underline">{t("Bird's eye view", "نظرة الطائر")}</Link>{t(" runs the whole bundle); field updates come from the ", " تشغّل الحزمة كلها)؛ والمستجدات الميدانية من ")}<Link href={`/hub/${iso}`} className="text-accent underline">{t("Updates hub", "مركز المستجدات")}</Link>{t("; Lab views are kept with the Keep button in each Lab tool.", "؛ وعروض المختبر تُحفظ بزر الحفظ في كل أداة.")}</p></div>}
        {rest.length === 0 && built.missing.length === 0 && <p className="text-[12px] text-t2">{t("Everything on file is already in the pack.", "كل ما هو محفوظ موجود في الحزمة.")}</p>}
      </Block>
      <p className="text-[11px] text-t2">{t(`The PDF is made in this browser and saved in the Archive as “${LAB_KIND.scenario.replace("scenario", "pack")}”.`, `يُعدّ ملف PDF في هذا المتصفح ويُحفظ في الأرشيف باسم «lab-pack».`)}</p>
    </div>
  );
}
