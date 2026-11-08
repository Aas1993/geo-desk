import { parseDirective } from "../../desk/core";
import { ACC, C2, CONF_C, OK, RISK, WARN, bar, card, cardsPaged, esc, h2, kv, list, note, statRow, tag, timeline } from "../html";
import type { Illustrator } from "../registry";

// THE DIRECTIVE ANSWER'S PDF: the answer and its confidence on the cover, the counts, the recommendation, the options side by side as cards (for and against counted, cost and risk stated), the way forward as a timeline grouped by when, the risks with their mitigations, what only the desk can supply and the follow-up questions. The consolidated brief follows. Every field of the parsed answer is drawn.
export const illustrateDirective: Illustrator = ({ report, L }) => {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const d = parseDirective(report); if (!d) return null;
  const front: string[] = [statRow([{ n: d.options.length || "–", label: e("options", "خيارات"), color: ACC }, { n: d.steps.length || "–", label: e("steps", "خطوات"), color: C2 }, { n: d.risks.length || "–", label: e("risks", "مخاطر"), color: d.risks.length ? WARN : "#5b6572" }, { n: d.needs.length || "–", label: e("inputs only the desk can give", "مدخلات لا يوفرها إلا المكتب"), color: d.needs.length ? WARN : "#5b6572" }])];
  if (d.recommendation) front.push(note(`<h3>${esc(e("Recommendation", "التوصية"))}</h3><p>${esc(d.recommendation)}</p>`, "ok"));
  if (d.options.length) front.push(h2(e("Options", "الخيارات")), ...cardsPaged(d.options.map((o) => card({ title: o.name, color: o.pros.length >= o.cons.length ? OK : WARN, wide: 3, body: `${bar(o.pros.length / Math.max(1, o.pros.length + o.cons.length), OK, `${o.pros.length} ${e("for", "مع")} / ${o.cons.length} ${e("against", "ضد")}`)}${o.pros.length ? `<p class="k" style="color:${OK}">${esc(e("For", "مع"))}</p>${list(o.pros)}` : ""}${o.cons.length ? `<p class="k" style="color:${WARN}">${esc(e("Against", "ضد"))}</p>${list(o.cons)}` : ""}${kv([[e("Cost", "الكلفة"), o.cost]])}${o.risk ? `<p><span class="k" style="color:${RISK}">${esc(e("Risk", "الخطر"))}:</span> ${esc(o.risk)}</p>` : ""}` })), 3));
  if (d.steps.length) {
    const groups: { when: string; items: string[] }[] = []; d.steps.forEach((s, i) => { const w = s.when || e("Unscheduled", "غير مجدول"); const html = `<b>${i + 1}. ${esc(s.action)}</b>${s.owner ? ` ${tag(s.owner, C2, { sm: true })}` : ""}${s.detail ? `<br>${esc(s.detail)}` : ""}`; const g = groups.find((x) => x.when === w); if (g) g.items.push(html); else groups.push({ when: w, items: [html] }); });
    front.push(h2(e("The way forward", "سبيل المضي")), `<p class="sub">${esc(e("In order, grouped by when; owners are proposed.", "بالترتيب ومجمّعة بحسب التوقيت؛ والمسؤولون مقترحون."))}</p>`, timeline(groups));
  }
  if (d.risks.length) front.push(h2(e("Risks", "المخاطر")), ...cardsPaged(d.risks.map((r) => card({ title: r.name, color: WARN, wide: 1, body: kv([[e("Mitigation", "المعالجة"), r.mitigation]]) })), 4));
  if (d.needs.length) front.push(note(`<h3>${esc(e("Only the desk or the ministry can supply", "لا يوفره إلا المكتب أو الوزارة"))}</h3>${list(d.needs)}`, "warn"));
  if (d.follow.length) front.push(note(`<h3>${esc(e("Ask next", "اسأل بعد ذلك"))}</h3>${list(d.follow)}`));
  return { kicker: e("Directive or question: the answer", "توجيه أو سؤال: الإجابة"), title: "", bottomLine: d.answer, confidence: d.confidence, heroExtra: `<div class="legend">${esc(e("Working analysis of proposals, not reviewed and not adopted policy; owners are proposed.", "تحليل عمل لمقترحات، غير مُراجَع وليس سياسة معتمدة؛ والمسؤولون مقترحون."))}</div>`, front, titleColor: CONF_C[d.confidence] };
};
