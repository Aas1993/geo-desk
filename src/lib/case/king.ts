import { deliverableOf, parseDashboard } from "./architect";
import { advantage, openings, toDeepen, type AdvRow } from "./advantage";
import { chairOf, decisionsOf, langOf, listAfter } from "./report";
import { sectionOf } from "./council";
import { gateItems, type GateItem } from "./log";
import { POSTURE, type B, type Posture } from "./core";
import type { CaseData } from "./load";
import { OPTS, scoreboard, type Edits, type ScoreRow } from "./score";
import type { Decision } from "../deep/registers";
import { CRITERIA } from "./seats";
import { parseAmbassador, type AmbParsed } from "./ambassador";
import type { EmbDigest } from "../desk/embassy";

// THE KING: the final decision page. It consolidates everything the platform holds on one country into the one thing a decision-maker needs: the question, the four ways the UAE could act, the one the evidence supports and why, what would change that call, what is still missing, what the ambassador recommends, and a record of the decision that is taken.
// It adds nothing paid: it reads the data, the Strategic Council, the Statecraft Architect and the Ambassador's plan when they exist, and says what is missing when they do not. The decision itself is a named person's, recorded in the decision log with conditions, a review date and, later, the observed result.
export type Verdict = "approve" | "conditions" | "other" | "defer" | "decline";
export const VERDICTS: { id: Verdict; en: string; ar: string; help: B }[] = [
  { id: "approve", en: "Approve the recommended course", ar: "اعتماد المسار الموصى به", help: { en: "Proceed as recommended, with its gates.", ar: "المضي كما هو موصى به مع بواباته." } },
  { id: "conditions", en: "Approve with conditions", ar: "اعتماد بشروط", help: { en: "Proceed only if the conditions you write are met.", ar: "المضي فقط إذا استُوفيت الشروط التي تكتبها." } },
  { id: "other", en: "Choose a different course", ar: "اختيار مسار مختلف", help: { en: "Pick one of the other three and say why.", ar: "اختر أحد المسارات الثلاثة الأخرى وبيّن السبب." } },
  { id: "defer", en: "Defer until a date", ar: "التأجيل إلى موعد", help: { en: "Not yet: name what is awaited and when to decide again.", ar: "ليس بعد: سمِّ ما يُنتظر وموعد القرار من جديد." } },
  { id: "decline", en: "Decline: take no new commitment", ar: "الرفض: لا التزام جديد", help: { en: "Hold and keep watching the triggers.", ar: "المراقبة وتتبع المحفزات." } },
];
export type Option = { posture: Posture; name: B; sub: B; total: number; gates: string[]; recommended: boolean; rule: boolean; scores: Record<string, number> };
export type Check = { id: string; ok: boolean; en: string; ar: string; go?: "council" | "architect" | "ambassador" | "log" };
export type KingBrief = {
  name: string; stance: B; recommended: Posture | null; rulePosture: Posture | null; differs: boolean; options: Option[]; gateWarn: string[];
  checks: Check[]; ready: number; inputsNeeded: number; decisions: { items: string[]; from: "architect" | "council" | "data" };
  risks: string[]; objection: string | null; assumptions: string[]; changeMind: string[]; gates: GateItem[];
  invest: { openings: AdvRow[]; deepen: AdvRow[]; concentration: { who: string; share: number } | null; deals: number };
  amb: AmbParsed | null; emb: EmbDigest | null; riskLevels: { value: number | null; ability: number | null; risk: number | null; stable: boolean };
};
const one = (s: string, n: number) => { const t = s.replace(/[#*|>_`]/g, "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n).trim()}…` : t; };
/** The sentence of a text that holds the strongest objection: the red team's strongest argument, else the Council's dissent. */
export function objectionOf(arch: string | null, council: string | null): string | null {
  const d5 = arch ? deliverableOf(arch, 5) : ""; const m = /(strongest (?:argument|objection|competing explanation)[^.\n]*[.\n][^\n]{0,260})/i.exec(d5); if (m) return one(m[1], 320);
  const k = council ? sectionOf(council, "Risks and Dissent") : ""; return k ? one(k, 320) : null;
}
export function kingBrief(x: { d: CaseData; council: string | null; arch: string | null; ambassador: string | null; emb?: EmbDigest | null; edit: Edits; weights: Record<string, number>; decisions: Decision[]; today: number; councilAt?: string | null; archAt?: string | null }): KingBrief {
  const { d, council, arch } = x; const sb = scoreboard(d, x.edit, x.weights); const rule = d.posture.posture; const best = sb.best;
  const options: Option[] = OPTS.map((o) => { const r = sb.rows.find((q) => q.o === o) as ScoreRow; return { posture: o, name: POSTURE[o].name, sub: POSTURE[o].sub, total: r.total, gates: r.gates, recommended: best?.o === o, rule: rule === o, scores: r.s }; });
  const dec = decisionsOf({ d, arch, council }); const text = `${council ?? ""}\n${arch ?? ""}`; const inputsNeeded = (text.match(/DESK INPUT REQUIRED/g) ?? []).length;
  const dash = arch ? parseDashboard(arch) : null; const d5 = arch ? deliverableOf(arch, 5) : ""; const amb = x.ambassador ? parseAmbassador(x.ambassador) : null;
  const assumptions = listAfter(d5, /\*\*Key Assumptions\*\*:?/i).slice(0, 5); const changeMind = listAfter(d5, /(?:conditions that would change|what would change)[^\n]*\n/i).slice(0, 4);
  const adv = advantage(d); const gates = gateItems(d.iso3, dash, x.decisions, x.today).filter((g) => g.state !== "overdue" || !g.recorded).slice(0, 6);
  const newest = (d.deep?.builds ?? []).map((b) => b.built?.slice(0, 10)).filter(Boolean).sort().slice(-1)[0];
  const fresh = (at?: string | null) => !at || !newest || at.slice(0, 10) >= newest; const unknownExp = (d.deep?.exposure?.rows ?? []).filter((r) => r.conf === "unknown").length;
  const checks: Check[] = [
    { id: "council", ok: !!council, en: "The Strategic Council has judged it", ar: "حكم عليه المجلس الاستراتيجي", go: "council" },
    { id: "architect", ok: !!arch, en: "A three-horizon strategy with dated gates is written", ar: "استراتيجية بثلاثة آفاق وبوابات مؤرخة مكتوبة", go: "architect" },
    { id: "ambassador", ok: !!x.ambassador || !!x.emb, en: "The embassy council has reported (the ambassador's brief, plan and investment case)", ar: "رفع مجلس السفارة تقريره (موجز السفير وخطته وحالته الاستثمارية)", go: "ambassador" },
    { id: "fresh", ok: !!council && !!arch && fresh(x.councilAt) && fresh(x.archAt), en: "The Council and strategy are newer than the data builds", ar: "المجلس والاستراتيجية أحدث من إصدارات البيانات" },
    { id: "gates", ok: !best || best.gates.length === 0, en: "No security or legal gate is tripped on the recommended course", ar: "لا بوابة أمنية أو قانونية مفعّلة على المسار الموصى به" },
    { id: "exposure", ok: unknownExp === 0, en: unknownExp ? `${unknownExp} exposure measure(s) are unknown (unknown is not zero)` : "Every exposure measure is known", ar: unknownExp ? `${unknownExp} من مقاييس الانكشاف غير معروفة (وغير المعروف ليس صفرًا)` : "كل مقاييس الانكشاف معروفة" },
    { id: "inputs", ok: inputsNeeded === 0, en: inputsNeeded ? `${inputsNeeded} input(s) only the desk can supply (approved UAE positions, deposit stock, treaty texts)` : "No desk input is outstanding", ar: inputsNeeded ? `${inputsNeeded} من المدخلات لا يوفرها إلا المكتب (المواقف الإماراتية المعتمدة ورصيد الودائع ونصوص المعاهدات)` : "لا مدخل معلّق من المكتب" },
  ];
  const risks = [...(amb ? [] : []), ...(dash?.risks ?? []).filter((r) => r.impact !== "low").slice(0, 3).map((r) => `${r.name}: ${r.mitigation}`)];
  return { name: d.name, stance: POSTURE[best?.o ?? rule ?? "hold"].name, recommended: best?.o ?? null, rulePosture: rule, differs: !!best && !!rule && best.o !== rule, options, gateWarn: sb.rows.flatMap((r) => r.gates.map((g) => `${r.o}:${g}`)),
    checks, ready: checks.filter((c) => c.ok).length, inputsNeeded, decisions: dec, risks, objection: objectionOf(arch, council), assumptions, changeMind, gates,
    invest: { openings: openings(adv).slice(0, 3), deepen: toDeepen(adv).slice(0, 3), concentration: adv.concentration, deals: adv.total }, amb, emb: x.emb ?? null, riskLevels: { value: d.posture.value, ability: d.posture.ability, risk: d.posture.risk, stable: d.posture.stable } };
}
export const criterionName = (id: string) => CRITERIA.find((c) => c.id === id);

// ---- recording the decision ----
export type KingRecord = { id: string; iso3: string; verdict: Verdict; posture: Posture | null; by: string; at: string; conditions: string; reviewOn: string; awaiting: string; why: string };
export const kingKey = (iso: string) => `gd-case-king:${iso}`;
export type KingForm = { verdict: Verdict; posture: Posture | null; by: string; conditions: string; reviewOn: string; awaiting: string; why: string };
export const formValid = (f: KingForm): { ok: boolean; missing: ("by" | "posture" | "conditions" | "reviewOn" | "awaiting")[] } => {
  const m: ("by" | "posture" | "conditions" | "reviewOn" | "awaiting")[] = []; if (f.by.trim().length < 2) m.push("by");
  if ((f.verdict === "approve" || f.verdict === "conditions" || f.verdict === "other") && !f.posture) m.push("posture"); if (f.verdict === "conditions" && f.conditions.trim().length < 5) m.push("conditions");
  if (f.verdict === "defer" && (!f.reviewOn || f.awaiting.trim().length < 5)) m.push(f.reviewOn ? "awaiting" : "reviewOn"); if (f.verdict === "other" && f.why.trim().length < 5) m.push("conditions"); return { ok: m.length === 0, missing: m };
};
/** The decision as a log entry and as the country's last-decision record. The review date defaults to 90 days for an approval, the chosen date for a deferral. Decisions are a named person's: no name, no record. */
export function kingDecision(iso3: string, name: string, f: KingForm, label: (v: Verdict, p: Posture | null) => string, now: Date, n: number): { decision: Decision; record: KingRecord } {
  const review = f.verdict === "defer" || f.reviewOn ? f.reviewOn : new Date(now.getTime() + 90 * 86_400_000).toISOString().slice(0, 10); const id = `DEC-${now.getTime().toString(36)}${n}`;
  const text = `THE KING · ${name}: ${label(f.verdict, f.posture)}${f.conditions.trim() ? `. Conditions: ${f.conditions.trim().replace(/\s*\n\s*/g, "; ")}` : ""}${f.awaiting.trim() ? `. Awaiting: ${f.awaiting.trim()}` : ""}`.slice(0, 300);
  const decision: Decision = { id, created: now.toISOString(), updated: now.toISOString(), decision: text, informedBy: [`king:${iso3}`, `case:${iso3}`], expected: f.why.trim().slice(0, 400), owner: f.by.trim().slice(0, 80), review, milestones: f.conditions.split(/\n|;/).map((x) => x.trim()).filter((x) => x.length > 3).slice(0, 6).map((t) => ({ text: t.slice(0, 160), done: false })), observed: "", attribution: "association", method: "", status: "open", iso3, source: "king", ref: `king:${iso3}:${now.toISOString().slice(0, 10)}:${f.verdict}` };
  return { decision, record: { id, iso3, verdict: f.verdict, posture: f.posture, by: f.by.trim().slice(0, 80), at: now.toISOString(), conditions: f.conditions.trim(), reviewOn: review, awaiting: f.awaiting.trim(), why: f.why.trim() } };
}
export const textLang = langOf;
export { chairOf };
