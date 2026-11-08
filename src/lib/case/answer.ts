import { POSTURE, type B } from "./core";
import { riskMatrix } from "./risk";
import type { CaseData } from "./load";

// The Answer (layer 0): five lines every brief should carry. This is the free, rule-based DRAFT from held data; when a council has run, the Chair's own executive judgment sits beside it. It is a draft for a person to approve, never a published judgment.
export type Answer = { stance: B; why: B; risk: B; trigger: B; confidence: B };
export function draftAnswer(c: CaseData): Answer {
  const p = c.posture.posture; const stance = p ? POSTURE[p].name : { en: "Not placed", ar: "غير محدد" };
  const top = [...c.pillars].filter((x) => x.score != null).sort((a, b) => b.score! - a.score!); const strong = top.slice(0, 2).map((x) => x.name.en.toLowerCase()); const weak = top.slice(-1).map((x) => x.name.en.toLowerCase());
  const why: B = { en: `${c.name} scores highest to the UAE on ${strong.join(" and ") || "n/a"} and lowest on ${weak.join("") || "n/a"}.${c.divergence.flag ? ` ${c.divergence.text.en}` : ""}`, ar: `تسجل ${c.nameAr ?? c.name} أعلى درجاتها للإمارات في ${top.slice(0, 2).map((x) => x.name.ar).join(" و") || "غير متاح"} وأدناها في ${top.slice(-1).map((x) => x.name.ar).join("") || "غير متاح"}.${c.divergence.flag ? ` ${c.divergence.text.ar}` : ""}` };
  const worst = riskMatrix(c).flatMap((r) => [{ n: r.name, k: "short", cell: r.short }, { n: r.name, k: "long", cell: r.long }]).filter((x) => x.cell.level === "high");
  const risk: B = worst.length ? { en: `${worst[0].n.en} risk is high (${worst[0].cell.text.en}).`, ar: `مخاطر ${worst[0].n.ar} مرتفعة (${worst[0].cell.text.ar}).` } : { en: "No category is rated high on the data held; several have no data.", ar: "لا فئة مصنفة مرتفعة بحسب البيانات المتاحة؛ وبعضها بلا بيانات." };
  const alert = c.deep?.readings.find((r) => r.state === "alert"); const unk = c.deep?.exposure?.rows.filter((r) => r.conf === "unknown").length ?? 0;
  const trigger: B = { en: alert ? `${alert.id}: ${alert.display}. Review in 90 days.` : unk ? `Close ${unk} unknown exposure measure(s) before committing capital; review in 90 days.` : "Review in 90 days against the triggers in the Detailed view.", ar: alert ? `${alert.id}: ${alert.displayAr}. مراجعة بعد 90 يومًا.` : unk ? `إغلاق ${unk} من مقاييس الانكشاف غير المعروفة قبل ضخ رأس المال؛ مراجعة بعد 90 يومًا.` : "مراجعة بعد 90 يومًا وفق المحفزات في العرض التفصيلي." };
  const conf = c.deep?.exposure?.priority; const low = c.pillars.filter((x) => x.conf === "low" || x.conf === "none").length;
  const confidence: B = { en: `${conf ? `${Math.round(conf.confidence * 100)}% of exposure measures known; ` : ""}${low} of 8 value pillars rest on one input or none. ${c.posture.stable ? "The posture is stable under a 10-point change." : "The posture changes under a 10-point change."}`, ar: `${conf ? `${Math.round(conf.confidence * 100)}% من مقاييس الانكشاف معروفة؛ ` : ""}${low} من 8 ركائز قيمة تستند إلى مدخل واحد أو لا شيء. ${c.posture.stable ? "الموقف مستقر عند تغيّر 10 نقاط." : "يتغير الموقف عند تغيّر 10 نقاط."}` };
  return { stance, why, risk, trigger, confidence };
}
