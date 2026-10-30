import { ACC, C2, CONF_C, MUTE, OK, RISK, WARN, bar, barBlock, card, cardsPaged, esc, h2, kv, list, note, stackBar, statRow, tag } from "../html";
import { cutText, type Lang } from "../model";
import { parseCouncil, tally, type Change, type CouncilParsed, type Level, type Verdict } from "../deepmd";
import type { Illustrator } from "../registry";

// DEEP INTELLIGENCE's PDFs. The analyst team's report is markdown the chair wrote under ten headings plus the challenger's dissent table, the verifier's claim audit and one section per analyst; this reads those parts (src/lib/report/deepmd.ts) and draws them: the decision on the cover, the options with their feasibility, what the verifier found wanting, the objections that change the option, each analyst's confidence and the follow-through triggers. The whole report still follows the cover as the consolidated brief, so nothing it says is lost. A part the report lacks (a run cut off before the chair finished) is simply not drawn.
const FEAS_C: Record<Level, string> = { high: OK, medium: WARN, low: RISK };
const VERD_C: Record<Verdict, string> = { supported: OK, partly: WARN, unsupported: RISK, stale: "#b45309", other: MUTE };
const CHG_C: Record<Change, string> = { yes: RISK, partly: WARN, no: OK, unknown: MUTE };
const sb = (segs: { label: string; n: number; color: string }[]) => stackBar(segs.filter((x) => x.n > 0));
const words = (L: Lang) => ({ high: L === "ar" ? "مرتفعة" : "high", medium: L === "ar" ? "متوسطة" : "medium", low: L === "ar" ? "منخفضة" : "low" });

/** The stat row, the claim audit, the objections and the analysts' confidence: the parts both products share. */
export function councilBlocks(p: CouncilParsed, L: Lang): { stats: string; claims: string[]; dissent: string[]; analysts: string[]; desk: string[] } {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const w = words(L);
  const ct = tally(p.claims.map((c) => c.verdict), ["supported", "partly", "unsupported", "stale", "other"] as const); const ok = ct.supported; const bad = ct.unsupported + ct.stale; const ch = tally(p.challenge.map((c) => c.changes), ["yes", "partly", "no", "unknown"] as const);
  const stats = statRow([
    ...(p.mode === "full" ? [{ n: p.options.length || "–", label: e("options", "خيارات"), color: ACC }] : []), { n: p.analysts.length || "–", label: e("analyst sections", "أقسام المحللين"), color: C2 },
    { n: p.claims.length ? `${ok}/${p.claims.length}` : "–", label: e("claims supported", "ادعاءات مدعومة"), color: !p.claims.length ? MUTE : bad ? RISK : ct.partly ? WARN : OK },
    ...(p.mode === "full" ? [{ n: p.challenge.length ? `${ch.yes + ch.partly}/${p.challenge.length}` : "–", label: e("objections that change the option", "اعتراضات تغيّر الخيار"), color: ch.yes ? RISK : ch.partly ? WARN : OK }, { n: p.follow.length || "–", label: e("follow-through triggers", "محفّزات المتابعة"), color: ACC }] : [{ n: p.deskInputs.length || "–", label: e("inputs only the desk can give", "مدخلات لا يوفرها إلا المكتب"), color: p.deskInputs.length ? WARN : OK }]),
  ]);
  const claims: string[] = [];
  if (p.claims.length) {
    claims.push(h2(e("The verifier's claim audit", "تدقيق المدقق للادعاءات")), sb((["supported", "partly", "unsupported", "stale", "other"] as Verdict[]).map((v) => ({ label: v === "supported" ? e("supported", "مدعوم") : v === "partly" ? e("partly supported", "مدعوم جزئيًا") : v === "unsupported" ? e("unsupported", "غير مدعوم") : v === "stale" ? e("stale", "قديم") : e("other", "أخرى"), n: ct[v], color: VERD_C[v] }))));
    const flagged = p.claims.filter((c) => c.verdict !== "supported"); claims.push(...(flagged.length ? cardsPaged(flagged.map((c) => card({ title: `${c.n}. ${cutText(c.claim, 170)}`, pill: tag(c.verdictText || c.verdict, VERD_C[c.verdict], { sm: true }), color: VERD_C[c.verdict], wide: 1, body: kv([[e("Fact or source", "الحقيقة أو المصدر"), c.ref], [e("Correction", "التصحيح"), c.correction]]) })), 3) : [note(`<p>${esc(e("Every audited claim was found supported.", "وُجد كل ادعاء مدقَّق مدعومًا."))}</p>`, "ok")]));
    if (flagged.length && ct.supported) claims.push(`<p class="sub">${esc(e(`${ct.supported} supported claim${ct.supported === 1 ? " is" : "s are"} listed in the audit table in the report.`, `${ct.supported} ادعاء مدعوم مدرج في جدول التدقيق في التقرير.`))}</p>`);
    if (p.criticalErrors) claims.push(note(`<h3>${esc(e("Critical errors", "أخطاء حرجة"))}</h3><p>${esc(p.criticalErrors)}</p>`, /^(none|no |لا )/i.test(p.criticalErrors) ? "ok" : "risk"));
  }
  const dissent: string[] = [];
  if (p.challenge.length) {
    dissent.push(h2(e("The independent challenger's objections", "اعتراضات المُحاجِج المستقل")), sb((["yes", "partly", "no", "unknown"] as Change[]).map((v) => ({ label: v === "yes" ? e("changes the option", "يغيّر الخيار") : v === "partly" ? e("partly changes it", "يغيّره جزئيًا") : v === "no" ? e("does not change it", "لا يغيّره") : e("not stated", "غير مذكور"), n: ch[v], color: CHG_C[v] }))));
    if (p.challengeIntro) dissent.push(`<p class="sub">${esc(p.challengeIntro)}</p>`);
    dissent.push(...cardsPaged(p.challenge.map((d) => card({ title: cutText(d.judgment, 150), pill: tag(cutText(d.changesText || e("not stated", "غير مذكور"), 34), CHG_C[d.changes], { sm: true }), color: CHG_C[d.changes], wide: 1, body: `<p><b>${esc(e("Strongest objection", "أقوى اعتراض"))}:</b> ${esc(d.objection)}</p>${kv([[e("Evidence or source", "الدليل أو المصدر"), d.evidence], [e("Would it change the recommended option?", "هل يغيّر الخيار الموصى به؟"), d.changesText]])}` })), 3));
  }
  if (p.wrong) dissent.push(note(`<h3>${esc(e("What would make the whole package wrong", "ما الذي يجعل الحزمة كلها خاطئة"))}</h3><p>${esc(p.wrong)}</p>`, "warn"));
  const analysts: string[] = [];
  if (p.analysts.length) analysts.push(h2(e("The analysts and how confident each is", "المحللون ودرجة ثقة كل منهم")), barBlock(p.analysts.map((a) => ({ label: cutText(a.role, 44), share: a.level === "high" ? 1 : a.level === "medium" ? 0.62 : a.level === "low" ? 0.3 : 0.06, color: a.level ? CONF_C[a.level === "medium" ? "moderate" : a.level] : MUTE, text: a.level ? w[a.level] : e("not stated", "غير مذكور") }))), `<p class="sub">${esc(e("The bar is the analyst's own stated confidence (high, medium or low); the sentence is in the report.", "الشريط هو الثقة التي ذكرها المحلل نفسه (مرتفعة أو متوسطة أو منخفضة)؛ والجملة في التقرير."))}</p>`);
  const desk = p.deskInputs.length ? [note(`<h3>${esc(e("What only the desk can supply", "ما لا يوفره إلا المكتب"))}</h3>${list(p.deskInputs.map((x) => cutText(x, 240)))}`, "warn")] : [];
  return { stats, claims, dissent, analysts, desk };
}

export const illustrateDeepCouncil: Illustrator = ({ report, L }) => {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const p = parseCouncil(report); if (!p.decision.length && !p.options.length && !p.claims.length && !p.analysts.length) return null;
  const b = councilBlocks(p, L); const w = words(L); const front: string[] = [b.stats];
  const rest = p.decision.filter((_, i) => i !== p.leadIdx); if (rest.length) front.push(h2(e("The decision", "القرار")), ...rest.map((d, i) => note(`<h3>${esc(d.label)}</h3><p>${esc(d.text)}</p>`, /trade-?off|المقايضة/i.test(d.label) ? "warn" : i === 0 && /question|سؤال/i.test(d.label) ? "" : "")));
  if (p.options.length) {
    const ft = tally(p.options.map((o) => o.feas ?? "none"), ["high", "medium", "low", "none"] as const);
    front.push(h2(e("The options and how feasible each is", "الخيارات ومدى جدوى كل منها")), sb([{ label: `${e("feasibility", "الجدوى")}: ${w.high}`, n: ft.high, color: OK }, { label: `${e("feasibility", "الجدوى")}: ${w.medium}`, n: ft.medium, color: WARN }, { label: `${e("feasibility", "الجدوى")}: ${w.low}`, n: ft.low, color: RISK }, { label: e("not established", "غير مثبتة"), n: ft.none, color: MUTE }]));
    front.push(...cardsPaged(p.options.map((o) => card({ title: o.title, pill: tag(cutText(o.feasText || e("not established", "غير مثبتة"), 30), o.feas ? FEAS_C[o.feas] : MUTE, { sm: true }), color: o.feas ? FEAS_C[o.feas] : MUTE, body: kv(o.fields) })), 4));
  }
  if (p.follow.length) front.push(h2(e("Follow-through: what to watch and who owns it", "المتابعة: ما يُراقَب ومن يملكه")), ...cardsPaged(p.follow.map((f) => card({ title: f.title, color: ACC, wide: 3, body: kv(f.fields) })), 6));
  const annex: string[] = [...b.claims, ...b.dissent, ...b.analysts, ...b.desk];
  const dec = p.decision[p.leadIdx]?.text || ""; const partial = p.partial ? [note(`<p>${esc(e("The chair did not finish: a cost ceiling or an error stopped the team, so the decision summary and some headings are missing. The analyst sections that were written follow.", "لم ينهِ الرئيس عمله: أوقف سقف الكلفة أو خطأ الفريق، فملخص القرار وبعض العناوين ناقصة. وتتبعها أقسام المحللين التي كُتبت."))}</p>`, "warn")] : [];
  return { kicker: e("Deep Intelligence team: decision assessment", "فريق الاستخبارات المعمّقة: تقييم القرار"), title: p.decision.length ? e("Working analysis", "تحليل عمل") : "", titleColor: WARN, bottomLine: cutText(dec, 520), heroExtra: `<div class="legend">${esc(e("Working analysis until a named person reviews it. Each analyst's confidence, the challenger's dissent and the verifier's audit are shown below.", "تحليل عمل حتى يراجعه شخص مسمّى. وتظهر أدناه ثقة كل محلل واعتراضات المُحاجِج وتدقيق المدقق."))}</div>`, front: [...partial, ...front], annex };
};

export const illustrateDeepResearch: Illustrator = ({ report, L, sources }) => {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const p = parseCouncil(report); if (!p.claims.length && !p.analysts.length) return null;
  const b = councilBlocks(p, L); const lead = p.analysts.find((a) => a.conclusion)?.conclusion ?? "";
  const front: string[] = [b.stats, ...(sources.length ? [bar(Math.min(1, sources.length / 40), ACC, `${sources.length}`, e("sources read or searched", "مصادر قُرئت أو بُحث فيها"))] : []), ...b.analysts];
  return { kicker: e("Deep Intelligence: research synthesis", "الاستخبارات المعمّقة: تركيب الأبحاث"), title: e("Research synthesis", "تركيب الأبحاث"), titleColor: C2, bottomLine: cutText(lead, 480), heroExtra: `<div class="legend">${esc(e("Compares what the research argues and checks it; there is no chair, so it informs a decision and does not make one.", "يقارن ما تحاجج به الأبحاث ويتحقق منه؛ ولا رئيس فيه، فيفيد القرار ولا يتخذه."))}</div>`, front, annex: [...b.claims, ...b.desk] };
};
