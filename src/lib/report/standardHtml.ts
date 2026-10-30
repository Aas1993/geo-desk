import { ANGLES } from "./angles";
import { ACC, C2, INK, MUTE, OK, RISK, WARN, bands, bar, card, cardsPaged, esc, ganttSvg, h2, kv, note, stat, tag } from "./html";
import type { Lang } from "./model";
import type { Diff } from "./diff";
import { HORIZONS, daysSince, milestoneRows, readStandard, type AngleStatus, type Milestone, type Scenario, type Standard } from "./standard";

// THE STANDARD PARTS IN THE PDF (the screen's twins are in src/components/report/standard.tsx): the as-of line, the so-what, the angle coverage matrix, scenarios with tripwires, the implementation milestones, the coalition list and the influence ledger. pdfHtml() adds them to every product that carries the keys; a product that does not gets none of them.
export const STANDARD_CSS = `.angles{display:flex;flex-wrap:wrap;gap:5px;margin:5px 0}.angle{flex:1 1 calc(14.28% - 5px);min-width:84px;border:1px solid #cfd6df;border-radius:8px;padding:5px 6px;background:#fff}.angle.na{border-style:dashed;background:#fafbfc}.angle b{display:block;font-size:9.5px;color:#0b2540;margin-bottom:2px}.angle .n{color:#5b6572;font-weight:600}.angle p{font-size:8.5px;color:#5b6572;margin:2px 0 0}`
  + `.scn{flex:1 1 calc(33.3% - 8px);min-width:0;border:1px solid #cfd6df;border-radius:10px;padding:7px 9px;background:#fff}.scn h3{margin:0 0 2px;font-size:12px}.scn .tw{margin:3px 0;padding:3px 6px;background:#f6f9fc;border-radius:6px;font-size:10px}`
  + `.led{margin:3px 0;font-size:10px}.led .nm{font-weight:700;color:#0b2540}.led .rv{display:flex;align-items:center;gap:6px;font-size:9px;color:#5b6572}`;
const ST: Record<AngleStatus, { c: string; en: string; ar: string }> = { covered: { c: OK, en: "covered", ar: "مغطى" }, thin: { c: WARN, en: "thin", ar: "ضعيف" }, notfound: { c: RISK, en: "not found", ar: "لم يوجد" } };
const SC: Record<Scenario["kind"], { c: string; en: string; ar: string }> = { base: { c: ACC, en: "Base case", ar: "الحالة الأساسية" }, upside: { c: OK, en: "Upside", ar: "الصعود" }, downside: { c: RISK, en: "Downside", ar: "الهبوط" }, other: { c: C2, en: "Scenario", ar: "سيناريو" } };

export function asOfHtml(at: string, L: Lang, now = Date.now()): string {
  const d = daysSince(at, now); if (d == null) return "";
  const c = d <= 14 ? OK : d <= 30 ? WARN : RISK; const date = at.slice(0, 10);
  return `<div class="card w1" style="padding:5px 10px"><div class="hd"><span>${esc(L === "ar" ? "حتى تاريخ" : "As of")} ${esc(date)}</span><span class="sub">${esc(d === 0 ? (L === "ar" ? "اليوم" : "today") : L === "ar" ? `قبل ${d} يومًا` : `${d} day${d === 1 ? "" : "s"} old`)}${d > 30 ? esc(L === "ar" ? " · قديم: أعد التشغيل قبل القرار" : " · stale: re-run before deciding") : ""}</span></div>${bar(1 - Math.min(d, 30) / 30, c, `${d} d`)}</div>`;
}
export const soWhatHtml = (text: string, L: Lang) => (text ? note(`<h3>${esc(L === "ar" ? "ماذا يعني هذا لمصالح الإمارات" : "So what for the UAE")}</h3><p>${esc(text)}</p>`, "ok") : "");
export function angleMatrixHtml(s: Standard, L: Lang): string[] {
  if (!s.angles.length) return [];
  const by = new Map(s.angles.map((a) => [a.id, a])); const n = (x: AngleStatus) => s.angles.filter((a) => a.status === x).length;
  const tiles = ANGLES.map((a, i) => { const c = by.get(a.id); return `<div class="angle${c ? "" : " na"}" style="${c ? `border-top:3px solid ${ST[c.status].c}` : ""}"><b><span class="n">${i + 1}</span> ${esc(a.short[L === "ar" ? 1 : 0])}</b>${c ? tag(ST[c.status][L], ST[c.status].c, { sm: true }) : tag(L === "ar" ? "غير مذكور" : "not stated", MUTE, { sm: true, out: true })}${c?.note ? `<p>${esc(c.note)}</p>` : ""}</div>`; }).join("");
  return [h2(L === "ar" ? "تغطية الزوايا الأربع عشرة" : "The fourteen angles: what this report covers"), `<div class="stats">${stat(n("covered"), L === "ar" ? "مغطاة" : "covered", OK)}${stat(n("thin"), L === "ar" ? "ضعيفة" : "thin", WARN)}${stat(n("notfound"), L === "ar" ? "لم توجد" : "not found", RISK)}${stat(ANGLES.length - s.angles.length, L === "ar" ? "غير مذكورة" : "not stated", MUTE)}</div>`, `<div class="angles">${tiles}</div>`];
}
export function scenariosHtml(xs: Scenario[], L: Lang): string[] {
  if (!xs.length) return [];
  return [h2(L === "ar" ? "السيناريوهات ونقاط الإنذار" : "Scenarios and tripwires"), `<div class="cards">${xs.map((x) => `<div class="scn" style="border-top:3px solid ${SC[x.kind].c}"><h3 style="color:${SC[x.kind].c}">${esc(x.name || SC[x.kind][L])}${x.likelihood ? ` ${tag(x.likelihood, C2, { sm: true })}` : ""}</h3>${x.summary ? `<p>${esc(x.summary)}</p>` : ""}${x.trigger ? `<p><span class="k">${esc(L === "ar" ? "المحفّز: " : "Trigger: ")}</span>${esc(x.trigger)}</p>` : ""}${x.tripwires.map((t) => `<div class="tw"><b>${esc(t.indicator)}</b>${t.threshold ? ` ${tag(t.threshold, WARN, { sm: true })}` : ""}${t.move ? `<br>→ ${esc(t.move)}` : ""}</div>`).join("")}${x.plan ? `<p><span class="k">${esc(L === "ar" ? "الاستجابة: " : "Response: ")}</span>${esc(x.plan)}</p>` : ""}</div>`).join("")}</div>`];
}
export function milestonesHtml(ms: Milestone[], L: Lang): string[] {
  if (!ms.length) return [];
  const out = [h2(L === "ar" ? "خطة التنفيذ" : "Implementation plan")]; const g = milestoneRows(ms);
  out.push(bands(HORIZONS.filter((h) => ms.some((m) => m.horizon === h.id)).map((h, i) => ({ title: h[L], color: [OK, ACC, C2, INK, MUTE][i] ?? MUTE, count: ms.filter((m) => m.horizon === h.id).length, html: ms.filter((m) => m.horizon === h.id).slice(0, 8).map((m) => `<p><b>${esc(m.id)} · ${esc(m.title)}</b><br><span class="sub">${esc([m.owner, m.end && `${L === "ar" ? "حتى" : "by"} ${m.end}`].filter(Boolean).join(" · "))}</span></p>`).join("") }))));
  if (g.rows.length) out.push(ganttSvg(g.rows.map((r) => ({ label: `${r.id} ${r.title}`, start: r.s, end: r.e, color: ({ "30d": OK, "100d": ACC, "1y": C2, "3y": INK, other: MUTE } as const)[r.horizon] })), { months: g.months, L }));
  out.push(...cardsPaged(ms.map((m) => card({ title: `${m.id} · ${m.title}`, pill: tag((HORIZONS.find((h) => h.id === m.horizon) ?? HORIZONS[4])[L], MUTE, { sm: true }), wide: 1, body: kv([[L === "ar" ? "المسؤول" : "Owner", m.owner], [L === "ar" ? "البداية" : "Start", m.start], [L === "ar" ? "النهاية" : "Finish", m.end], [L === "ar" ? "البوابة" : "Gate", m.gate], [L === "ar" ? "المقياس" : "Measure", m.measure], [L === "ar" ? "الهدف" : "Target", m.target], [L === "ar" ? "الموارد" : "Resources", m.resources], [L === "ar" ? "المبادرات" : "Initiatives", m.initiatives.join(", ")], [L === "ar" ? "يعتمد على" : "Depends on", m.dependsOn.join(", ")], [L === "ar" ? "الخطر" : "Risk", m.risk]]) })), 4));
  return out;
}
export function coalitionHtml(s: Standard, L: Lang): string[] {
  if (!s.coalition.length) return [];
  return [h2(L === "ar" ? "الأصدقاء والتحالفات" : "Friends and coalition"), ...cardsPaged(s.coalition.map((c) => card({ title: c.name, pill: c.kind ? tag(c.kind, ACC, { sm: true }) : "", color: ACC, wide: 3, body: kv([[L === "ar" ? "الموقف" : "Stance", c.stance], [L === "ar" ? "المسؤول" : "Owner", c.owner], [L === "ar" ? "ما نعرضه" : "Offered", c.offer], [L === "ar" ? "ما نطلبه" : "Asked", c.ask], [L === "ar" ? "المقعد/التصويت" : "Seat or vote", c.seat]]) })), 6)];
}
export function ledgerHtml(s: Standard, L: Lang): string[] {
  if (!s.ledger.length) return [];
  const mx = Math.max(1, ...s.ledger.flatMap((r) => [r.uae ?? 0, ...r.rivals.map((x) => x.value ?? 0)]));
  return [h2(L === "ar" ? "سجل النفوذ أمام المنافسين" : "Influence ledger against rivals"), `<div class="card w1">${s.ledger.map((r) => `<div class="led"><span class="nm">${esc(r.instrument)}</span>${r.headroom != null ? ` ${tag(`${L === "ar" ? "هامش" : "headroom"} ${r.headroom}`, WARN, { sm: true })}` : ""}${r.uae != null ? bar(r.uae / mx, OK, String(r.uae), L === "ar" ? "الإمارات" : "UAE") : `<p class="sub">${esc(L === "ar" ? "الإمارات: غير مقدّر" : "UAE: not estimated")}</p>`}${r.rivals.map((x) => (x.value != null ? bar(x.value / mx, MUTE, String(x.value), x.name) : "")).join("")}${r.note ? `<p class="sub">${esc(r.note)}</p>` : ""}</div>`).join("")}</div>`];
}
/** All the standard parts of a saved product for the PDF: `front` (as-of, so-what, angle matrix) goes right after the cover, `annex` (scenarios, plan, coalition, ledger) after the brief. */
export function standardBlocks(report: string, L: Lang, at: string, skip: string[] = [], now = Date.now()): { front: string[]; annex: string[]; std: Standard } {
  const std = readStandard(report); const asOf = asOfHtml(at, L, now); const has = (k: string) => !skip.includes(k);
  return { std, front: [asOf, soWhatHtml(std.soWhat, L), ...(has("angles") ? angleMatrixHtml(std, L) : [])].filter(Boolean), annex: [...(has("scenarios") ? scenariosHtml(std.scenarios, L) : []), ...(has("milestones") ? milestonesHtml(std.milestones, L) : []), ...(has("coalition") ? coalitionHtml(std, L) : []), ...(has("ledger") ? ledgerHtml(std, L) : [])] };
}

/** What changed since the version this one replaced: new items, gone items and values that moved. Nothing when the two are the same. */
export function whatChangedHtml(d: Diff, prevAt: string, L: Lang): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en);
  if (d.same) return [note(`<p>${esc(e(`Nothing in the structured data changed since the report of ${prevAt.slice(0, 10)}.`, `لم يتغير شيء في البيانات المنظمة منذ تقرير ${prevAt.slice(0, 10)}.`))}</p>`)];
  const col = (title: string, color: string, xs: string[]) => ({ title, color, count: xs.length, html: xs.length ? `<ul>${xs.slice(0, 14).map((x) => `<li>${x}</li>`).join("")}</ul>` : `<p class="sub">${esc(e("none", "لا شيء"))}</p>` });
  return [h2(e(`What changed since ${prevAt.slice(0, 10)}`, `ما تغيّر منذ ${prevAt.slice(0, 10)}`)), bands([col(e("New", "جديد"), OK, d.added.map((x) => `<b>${esc(x.label)}</b> <span class="sub">${esc(x.section)}</span>`)), col(e("Gone", "زال"), RISK, d.removed.map((x) => `<b>${esc(x.label)}</b> <span class="sub">${esc(x.section)}</span>`)), col(e("Moved", "تحرّك"), WARN, d.moved.map((x) => `<b>${esc(x.label)}</b>: ${esc(x.from)} → ${esc(x.to)}`))])];
}
