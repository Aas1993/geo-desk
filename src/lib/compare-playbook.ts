import type { CaseData } from "./case/load";
import { buildPlaybook } from "./case/playbook";
import { POSTURE } from "./case/core";

// THE ONE-LINE UAE STATECRAFT PLAYBOOK OF EACH COUNTRY, and the order to engage them in. The line is read from the per-country playbook (src/lib/case/playbook.ts: rule-built from the Case File, free, no model); if that cannot be built for a country, a plainer line is built here from the same held data (posture, instruments' footprint and headroom, neighbours, rivals) and marked `seam: "fallback"`. Every move is a PROPOSAL for a human decision.
export type Lang = "en" | "ar";
export type PlayLine = { course: string; posture: string | null; instruments: { name: string; phase: string; when: string }[]; first: { name: string; move: string; when: string; gate: string; footprint: number | null; owner: string } | null; corridor: string | null; friends: string | null; first90: string[]; seam: "playbook" | "fallback" };
const OWNER = { en: "Ambassador with the Ministry desk (proposed)", ar: "السفير مع مكتب الوزارة (مقترح)" };
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n)}…` : t);

export function playLine(d: CaseData, lang: Lang): PlayLine {
  try {
    const p = buildPlaybook(d, {}, lang); const ins = [...p.instruments].sort((a, z) => a.order - z.order); const now = ins.find((i) => i.phase === "now") ?? ins[0]; const days = p.calendar.filter((e) => /^(Days|الأيام|أيام)/.test(e.when)).slice(0, 3); const ch = p.neighbours.find((n) => n.role === "channel") ?? p.neighbours[0];
    return { course: p.course.line, posture: p.course.posture, instruments: ins.slice(0, 3).map((i) => ({ name: i.name, phase: i.phase, when: i.when })), first: now ? { name: now.name, move: cut(now.move, 220), when: now.when, gate: cut(now.gate, 160), footprint: now.footprint, owner: days[0]?.lead ?? OWNER[lang] } : null, corridor: p.corridor.steps[0] ? cut(p.corridor.steps[0], 240) : null, friends: ch ? `${ch.name}: ${cut(ch.move, 200)}` : p.rivals[0] ? `${p.rivals[0].who}: ${cut(p.rivals[0].response, 200)}` : null, first90: days.map((e) => `${e.when}: ${cut(e.what, 200)}`), seam: "playbook" };
  } catch {
    const ar = lang === "ar"; const post = d.posture.posture; const ins = [...d.instruments].filter((x) => x.headroom != null).sort((a, z) => (z.headroom ?? 0) - (a.headroom ?? 0)).slice(0, 3); const nb = d.neighbours.ring1.find((n) => (n.part ?? 0) >= 60) ?? d.neighbours.ring1[0];
    return { course: post ? `${ar ? POSTURE[post].name.ar : POSTURE[post].name.en}: ${ar ? POSTURE[post].sub.ar : POSTURE[post].sub.en}` : ar ? "غير محدد: بيانات ناقصة. الأصل الإمساك والمراقبة." : "Not placed: held data is missing. Default to hold and watch.", posture: post, instruments: ins.map((x) => ({ name: ar ? x.name.ar : x.name.en, phase: "next", when: "" })), first: ins[0] ? { name: ar ? ins[0].name.ar : ins[0].name.en, move: ar ? "ابدأ حيث مجال النمو أكبر" : "Start where the headroom is largest", when: ar ? "الأيام 1–100" : "Days 1–100", gate: ar ? "قياس مرجعي مسجل" : "A measured baseline on file", footprint: ins[0].footprint, owner: OWNER[lang] } : null, corridor: null, friends: nb ? `${ar && nb.nameAr ? nb.nameAr : nb.name}: ${ar ? "نسّق معه" : "coordinate with it"}` : null, first90: [], seam: "fallback" };
  }
}

export type SeqRow = { order: number; iso: string; name: string; move: string; owner: string; when: string; by: string | null; measure: string; gate: string; seam: PlayLine["seam"] };
/** The date a window such as "Days 1–100" or "Months 4–12" ends, counted from the as-of date (null when the window cannot be read). */
export function windowEnd(when: string, asOf: string): string | null { const m = /(\d+)\s*$/.exec(when.replace(/[–-]/g, " ").trim()); if (!m) return null; const n = +m[1]; const mult = /^(Months|أشهر|الأشهر)/.test(when) ? 30 : 1; const t = Date.parse(asOf); return isNaN(t) ? null : new Date(t + n * mult * 86_400_000).toISOString().slice(0, 10); }
/** The order to engage the countries in (the ranking's order) with, for each, the playbook's first move, a proposed owner, the window and its end date, a measure on the platform's own 0 to 5 scale and the gate that releases the next step. A proposal; nothing here is decided. */
export function sequence(cs: { iso: string; name: string; nameAr: string | null; play: PlayLine }[], order: string[], lang: Lang, asOf: string): SeqRow[] {
  const ar = lang === "ar"; const out: SeqRow[] = [];
  for (const iso of order) {
    const c = cs.find((x) => x.iso === iso); if (!c) continue; const f = c.play.first; const nm = ar && c.nameAr ? c.nameAr : c.name;
    out.push({ order: out.length + 1, iso, name: nm, move: f ? `${f.name}: ${f.move}` : ar ? "لا خطوة أولى مبنية: القياس أولًا" : "No first move built: measure first", owner: f?.owner ?? OWNER[lang], when: f?.when ?? "", by: f ? windowEnd(f.when, asOf) : null, measure: f && f.footprint != null ? (ar ? `حضور ${f.name} المقيس ${f.footprint}/5 ← ${Math.min(5, Math.round((f.footprint + 1) * 10) / 10)}/5` : `Measured footprint of ${f.name} ${f.footprint}/5 → ${Math.min(5, Math.round((f.footprint + 1) * 10) / 10)}/5`) : ar ? "غير مقيس: سجّل قياسًا مرجعيًا أولًا" : "Not measured: put a baseline on file first", gate: f?.gate ?? (ar ? "قرار الوزارة" : "A decision by the Ministry"), seam: c.play.seam });
  }
  return out;
}

/** The playbook lines and the sequence as text for the writer. */
export function playEvidence(cs: { name: string; nameAr: string | null; play: PlayLine }[], lang: Lang): string {
  const lines = ["## The UAE statecraft playbook, one line per country (rule-built from the Case File; proposals, not policy)"];
  for (const c of cs) { const p = c.play; lines.push(`- ${lang === "ar" && c.nameAr ? c.nameAr : c.name}${p.seam === "fallback" ? " [plain fallback line]" : ""}: course: ${p.course}; top instruments: ${p.instruments.map((i) => `${i.name} (${i.phase}${i.when ? `, ${i.when}` : ""})`).join(", ") || "none placed"}; corridor and trade play: ${p.corridor ?? "not built"}; friends and coalition move: ${p.friends ?? "not built"}; first 90 days: ${p.first90.join(" | ") || (p.first ? `${p.first.when}: ${p.first.name}` : "not built")}`); }
  return lines.join("\n");
}
export function sequenceEvidence(rows: SeqRow[], purpose: string, asOf: string): string { return [`## Rule-built sequence to engage them (order follows the ranking for: ${purpose}; windows count from ${asOf}; proposals, owners are roles)`, ...rows.map((r) => `${r.order}. ${r.name}: ${r.move} | owner: ${r.owner} | window: ${r.when || "not set"}${r.by ? ` (by ${r.by})` : ""} | measure: ${r.measure} | gate: ${r.gate}`)].join("\n"); }
