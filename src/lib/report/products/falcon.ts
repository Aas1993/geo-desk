import { parseCouncil, type RtStatus } from "../../falcon/council-parse";
import { gateScore, qualityGates } from "../../falcon/gates";
import { ACC, C2, OK, RISK, WARN, bar, card, cardsPaged, esc, h2, kv, list, note, stackBar, statRow, tag } from "../html";
import { dataTable, likelihoodMapSvg, pill, tablePaged } from "../html-fm";
import { CONF_W, type Lang } from "../model";
import type { Illustrator } from "../registry";

// THE FALCON COUNCIL's PDF: after the cover, the red-team result of every key judgment (a status bar, a likelihood-against-confidence map, one card each); after the consolidated brief, the disagreements side by side, the UAE opportunities and exposures with their size and feasibility, the options, the scenario weights and signposts, the red team's challenges, the verifier's claim audit and the automated gates. The cover has no quality grade: that exists only for the four gated desk products.
export const RT_C: Record<RtStatus, string> = { survived: OK, softened: WARN, reversed: RISK, untested: "#6b7280" };
export const RT_W: Record<Lang, Record<RtStatus, string>> = { en: { survived: "Survived the red team", softened: "Softened", reversed: "Reversed", untested: "Untested" }, ar: { survived: "صمد أمام الفريق الأحمر", softened: "خُفِّف", reversed: "عُكس", untested: "لم يُختبر" } };
export const VERDICT_C = { confirmed: OK, disputed: RISK, unverifiable: WARN, stale: C2 } as const;
export const VERDICT_W: Record<Lang, Record<string, string>> = { en: { confirmed: "Confirmed", disputed: "Disputed", unverifiable: "Unverifiable", stale: "Stale" }, ar: { confirmed: "مؤكَّد", disputed: "متنازَع", unverifiable: "تعذّر التحقق", stale: "قديم" } };
const CONF_C = { high: OK, moderate: WARN, low: RISK } as const; const RANK = (v: string) => (/high|مرتفع/i.test(v) ? 3 : /medium|moderate|متوسط/i.test(v) ? 2 : /low|منخفض/i.test(v) ? 1 : 0);

export const illustrateFalcon: Illustrator = ({ report, L }) => {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const p = parseCouncil(report); if (!p.judgments.length && !p.bluf && !p.audit.length && !p.challenges.length) return null;
  const n = (s: RtStatus) => p.judgments.filter((j) => j.status === s).length; const conf = p.audit.filter((a) => a.verdict === "confirmed").length;
  const front: string[] = [statRow([
    { n: p.judgments.length || "–", label: e("key judgments", "أحكام رئيسية"), color: ACC },
    { n: p.judgments.length ? `${n("survived")}/${p.judgments.length}` : "–", label: e("survived the red team", "صمدت أمام الفريق الأحمر"), color: n("reversed") ? RISK : OK },
    { n: p.audit.length ? `${conf}/${p.audit.length}` : "–", label: e("audited claims confirmed", "ادعاءات مدقَّقة مؤكَّدة"), color: p.audit.some((a) => a.verdict === "disputed") ? RISK : OK },
    { n: p.disagreements.length || "–", label: e("preserved disagreements", "خلافات محفوظة"), color: C2 },
  ])];
  if (p.judgments.length) {
    front.push(h2(e("Key judgments and the red team", "الأحكام الرئيسية والفريق الأحمر")));
    const segs = (["survived", "softened", "reversed", "untested"] as const).map((s) => ({ label: RT_W[L][s], n: n(s), color: RT_C[s] })).concat([{ label: e("not stated", "غير مذكور"), n: p.judgments.filter((j) => !j.status).length, color: "#cbd5e1" }]); const sb = stackBar(segs); if (sb) front.push(sb);
    const placed = p.judgments.map((j, i) => ({ n: i + 1, pct: j.band?.pct ?? null, conf: j.confidence, color: j.status ? RT_C[j.status] : "#94a3b8" })); const unplaced = placed.filter((x) => x.pct == null || !x.conf).length;
    front.push(`<div class="note"><b>${esc(e("Likelihood against confidence", "الاحتمال مقابل الثقة"))}</b>${likelihoodMapSvg(placed, L)}<p class="sub">${esc(e("Each dot is a judgment, numbered as below and coloured by what the red team did to it. A judgment whose words give no likelihood or no confidence is listed but not placed", "كل نقطة حكم مرقّم كما أدناه ولونها بحسب ما فعله الفريق الأحمر به. والحكم الذي لا تذكر كلماته احتمالًا أو ثقة مدرج وغير موضوع"))}${unplaced ? ` (${unplaced}).` : "."}</p></div>`);
    front.push(...cardsPaged(p.judgments.map((j, i) => card({ title: `${i + 1}. ${j.text}`, pill: j.status ? tag(RT_W[L][j.status], RT_C[j.status], { sm: true }) : "", color: j.status ? RT_C[j.status] : undefined, body: `${j.band ? bar(j.band.pct / 100, j.band.pct >= 55 ? OK : j.band.pct >= 45 ? WARN : RISK, j.band.label, e("likelihood", "الاحتمال")) : ""}${j.confidence ? `<p>${tag(`${e("confidence", "الثقة")}: ${CONF_W[j.confidence][L]}`, CONF_C[j.confidence], { sm: true })}</p>` : ""}${kv([[e("Agents", "الوكلاء"), j.agents], [e("So what for the UAE", "ماذا يعني للإمارات"), j.so]])}` })), 6));
  }
  const annex: string[] = [];
  if (p.disagreements.length) { annex.push(h2(e("Preserved disagreements", "خلافات محفوظة"))); for (const d of p.disagreements) annex.push(`<div class="card w1" style="border-top:3px solid ${C2}"><div class="hd"><span>${esc(d.issue)}</span></div><div style="display:flex;gap:8px;margin:4px 0"><div style="flex:1;background:#eef6fa;border-radius:6px;padding:5px 8px"><b>${esc(e("Position A", "الموقف أ"))}</b><p>${esc(d.a)}</p></div><div style="flex:1;background:#fff6e8;border-radius:6px;padding:5px 8px"><b>${esc(e("Position B", "الموقف ب"))}</b><p>${esc(d.b)}</p></div></div>${kv([[e("Evidence", "الدليل"), d.evidence], [e("What would resolve it", "ما يحسمه"), d.resolve]])}</div>`); }
  if (p.agrees.length) annex.push(note(`<h3>${esc(e("Where the council agrees", "حيث يتفق المجلس"))}</h3>${list(p.agrees)}<p class="sub">${esc(e("Shared evidence and one model are the reason, so this is not independent corroboration.", "السبب أدلة مشتركة ونموذج واحد، فليس هذا تثبّتًا مستقلًا."))}</p>`, "ok"));
  if (p.items.length) {
    annex.push(h2(e("UAE impact and opportunities", "الأثر والفرص للإمارات")));
    for (const [kind, label, c] of [["opp", e("Opportunities", "الفرص"), OK], ["exp", e("Exposures and risks", "التعرضات والمخاطر"), RISK]] as const) { const xs = p.items.filter((x) => (/opportun/i.test(x.type) ? "opp" : "exp") === kind); if (!xs.length) continue; annex.push(`<h3 style="color:${c}">${esc(label)} (${xs.length})</h3>`, ...cardsPaged(xs.map((x) => card({ title: x.item, pill: tag(x.type, c, { sm: true }), color: c, body: `${RANK(x.size) ? bar(RANK(x.size) / 3, RANK(x.size) === 3 ? RISK : RANK(x.size) === 2 ? WARN : OK, x.size.split(/[ (]/)[0], e("size", "الحجم")) : kv([[e("Size", "الحجم"), x.size]])}${RANK(x.feas) ? bar(RANK(x.feas) / 3, RANK(x.feas) === 3 ? OK : RANK(x.feas) === 2 ? WARN : RISK, x.feas.split(/[ (]/)[0], e("feasibility", "الجدوى")) : ""}${kv([[e("Size", "الحجم"), RANK(x.size) ? "" : x.size], [e("Feasibility", "الجدوى"), RANK(x.feas) && x.feas.length <= 12 ? "" : x.feas], [e("Horizon", "الأفق"), x.horizon], [e("First step", "أول خطوة"), x.step]])}` })), 4)); }
  }
  if (p.options.length) annex.push(h2(e("Options for decision", "خيارات للقرار")), ...cardsPaged(p.options.map((x) => card({ title: x.option, pill: x.window ? tag(x.window, ACC, { sm: true }) : "", color: ACC, wide: 1, body: kv([[e("Benefit", "المنفعة"), x.benefit], [e("Risk", "المخاطر"), x.risk], [e("Owner", "المسؤول"), x.owner]]) })), 4));
  if (p.scenarios.length) {
    annex.push(h2(e("Scenarios and signposts", "السيناريوهات والمؤشرات")));
    const w = p.scenarios.filter((s) => s.weight != null); if (w.length) annex.push(`<div class="card w1">${w.map((s) => bar((s.weight ?? 0) / 100, ACC, `${s.weight}%`, `${s.code} ${s.name}`)).join("")}<p class="sub">${esc(e("Weights are the council's rough judgments, not probabilities computed from data.", "الأوزان تقديرات تقريبية من المجلس لا احتمالات محسوبة من بيانات."))}</p></div>`);
    annex.push(...cardsPaged(p.scenarios.map((s) => card({ title: `${s.code} · ${s.name}`, pill: s.weight != null ? tag(`${s.weight}%`, ACC, { sm: true }) : s.wildcard ? tag(e("wildcard", "مفاجأة"), WARN, { sm: true }) : "", color: s.wildcard ? WARN : ACC, wide: 1, body: `<p>${esc(s.text)}</p>` })), 4));
  }
  if (p.signposts.length) annex.push(note(`<h3>${esc(e("Signposts", "المؤشرات الدالة"))}</h3>${list(p.signposts)}`, "warn"));
  if (p.challenges.length) annex.push(h2(e("Red-team challenges", "تحديات الفريق الأحمر")), ...tablePaged([e("Judgment", "الحكم"), e("Agent", "الوكيل"), e("Challenge", "التحدي"), e("Evidence", "الدليل"), e("Change", "التغيير")], p.challenges.map((x) => [x.judgment, x.agent, x.challenge, x.evidence, { html: x.change ? pill(x.change, /revers/i.test(x.change) ? RISK : /soften|caveat/i.test(x.change) ? WARN : OK) : "–" }]), 6, ["24%", "9%", "33%", "20%", "14%"]));
  if (p.audit.length) {
    annex.push(h2(e("Verifier: claim audit", "المدقق: تدقيق الادعاءات")), stackBar((["confirmed", "disputed", "unverifiable", "stale"] as const).map((k) => ({ label: VERDICT_W[L][k], n: p.audit.filter((x) => x.verdict === k).length, color: VERDICT_C[k] }))));
    annex.push(...tablePaged([e("Claim", "الادعاء"), e("Agent", "الوكيل"), e("Verdict", "الحكم"), e("Evidence", "الدليل"), e("Note", "ملاحظة")], p.audit.map((x) => [x.claim, x.agent, { html: x.verdict ? pill(VERDICT_W[L][x.verdict], VERDICT_C[x.verdict]) : "?" }, x.evidence, x.note]), 7, ["32%", "9%", "13%", "24%", "22%"]));
  }
  for (const [t, s, tone] of [[e("Verification summary", "ملخص التحقق"), p.verification, ""], [e("Unresolved", "غير محسوم"), p.unresolved, "warn"]] as [string, string, "" | "warn"][]) if (s) annex.push(note(`<h3>${esc(t)}</h3><p>${esc(s)}</p>`, tone));
  const gates = qualityGates(report, "council"); const gs = gateScore(gates);
  annex.push(h2(e("Automated quality gates", "بوابات الجودة الآلية")), stackBar([{ label: e("pass", "اجتاز"), n: gs.pass, color: OK }, { label: e("check", "راجع"), n: gs.warn, color: WARN }, { label: e("fail", "أخفق"), n: gs.fail, color: RISK }]), dataTable([e("Gate", "البوابة"), e("Status", "الحالة"), e("Detail", "التفصيل")], gates.map((g) => [L === "ar" ? g.ar : g.en, { html: pill(g.status === "pass" ? e("pass", "اجتاز") : g.status === "warn" ? e("check", "راجع") : e("fail", "أخفق"), g.status === "pass" ? OK : g.status === "warn" ? WARN : RISK) }, g.detail]), ["26%", "12%", "62%"]), `<p class="sub">${esc(e("These checks catch what a reader cannot see at a glance. Passing them is necessary, not sufficient: a product is not verified because it passes, and a human reviewer decides.", "تلتقط هذه الفحوص أخطاء لا يراها القارئ من النظرة الأولى. اجتيازها شرط لازم لا كافٍ: لا يصير المنتج «موثّقًا» لمجرد اجتيازها، ويبقى القرار للمراجع البشري."))}</p>`);
  return { kicker: e("Falcon Council: assessment", "مجلس الصقر: التقييم"), bottomLine: p.bluf, front, annex };
};
