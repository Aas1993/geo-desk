import { stripReviewJson } from "../review/pair";
import { ACC, C2, MUTE, OK, PAL, RISK, WARN, barBlock, esc, h2, note, statRow } from "./html";
import { cutText, type Lang } from "./model";
import { plain, sectionsOf } from "./deepmd";
import { stripMachine } from "./strip";
import type { IllustrateCtx, Illustration } from "./registry";

// THE GENERIC PDF for every kind that has no illustrator of its own (dossier*, country-brief, prep-pack, world-brief, stance, research, president-brief, country-full, agent-answer, compare ...): a cover that says what the report is and in the report's own words what it concludes, a row of honest counts (sections, words, fact ids cited, sources, red flags), a contents list, and, before the source list, where the evidence comes from by publisher. Everything is read from the text and the source list the product already holds; nothing is estimated. The brief itself follows unchanged.
const body = (report: string) => stripMachine(stripReviewJson(report));
/** The first paragraph of real prose in the brief: what it opens with, in its own words. */
export function leadOf(report: string): string {
  for (const raw of body(report).replace(/\r/g, "").split(/\n\s*\n/)) {
    const p = raw.trim(); if (!p || /^(#|>|\||[-*•]\s|\d+[.)]\s|<!--|---)/.test(p)) continue; const t = plain(p.replace(/\n/g, " ")); if (t.length >= 60 && !/^(working analysis|ai-assisted)/i.test(t)) return t;
  }
  return "";
}
export const hostOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
/** Sources counted by publisher (the host of the link), most cited first. */
export function byPublisher(sources: { url: string; title?: string }[]): { host: string; n: number }[] {
  const m = new Map<string, number>(); for (const s of sources) { const h = hostOf(s.url); if (h) m.set(h, (m.get(h) ?? 0) + 1); } return [...m.entries()].map(([host, n]) => ({ host, n })).sort((a, z) => z.n - a.n || a.host.localeCompare(z.host));
}
export function genericIllustrate(c: IllustrateCtx, group: string): Illustration | null {
  const L: Lang = c.L; const e = (en: string, ar: string) => (L === "ar" ? ar : en); const text = body(c.report); if (text.trim().length < 80) return null;
  const secs = sectionsOf(text).filter((s) => s.level <= 2 && s.title && !/^(statecraft|reality|consistency|independent)?\s*(review|auditor)/i.test(s.title)); const words = (text.match(/[\p{L}\p{N}]+/gu) ?? []).length; const facts = new Set([...text.matchAll(/\[(F\d+)(?:[,\s–-]+F?\d+)*\]/g)].flatMap((m) => [...m[0].matchAll(/F?(\d+)/g)].map((x) => `F${x[1]}`)));
  const flags = c.head.flags.length; const lead = leadOf(c.report);
  const front: string[] = [statRow([{ n: secs.length || "–", label: e("sections", "أقسام"), color: ACC }, { n: words.toLocaleString("en"), label: e("words", "كلمة"), color: C2 }, { n: facts.size || "–", label: e("fact ids cited", "معرّفات حقائق مستشهد بها"), color: facts.size ? OK : MUTE }, { n: c.sources.length || "–", label: e("sources", "مصادر"), color: c.sources.length ? OK : MUTE }, { n: flags || "0", label: e("red flags", "أعلام حمراء"), color: flags ? RISK : OK }])];
  if (secs.length > 2) front.push(note(`<h3>${esc(e("In this report", "في هذا التقرير"))}</h3><ul style="columns:2;column-gap:22px;margin:3px 0;padding-inline-start:16px">${secs.slice(0, 18).map((s) => `<li style="break-inside:avoid;font-size:10.5px">${esc(cutText(plain(s.title), 70))}</li>`).join("")}</ul>${secs.length > 18 ? `<p class="sub">${esc(e(`and ${secs.length - 18} more`, `و${secs.length - 18} أخرى`))}</p>` : ""}`));
  const pub = byPublisher(c.sources); const annex: string[] = [];
  if (pub.length >= 2) { const top = pub.slice(0, 10); const mx = top[0].n; annex.push(h2(e("Where the evidence comes from", "من أين جاءت الأدلة")), barBlock(top.map((p, i) => ({ label: p.host, share: p.n / mx, color: PAL[i % PAL.length], text: String(p.n) }))), `<p class="sub">${esc(e(`${c.sources.length} sources from ${pub.length} publishers${pub.length > 10 ? "; the ten most cited are shown" : ""}. A report that rests on one publisher should be read as one view.`, `${c.sources.length} مصدرًا من ${pub.length} ناشرًا${pub.length > 10 ? "؛ تُعرض الأكثر استشهادًا العشرة" : ""}. والتقرير القائم على ناشر واحد يُقرأ على أنه رأي واحد.`))}</p>`); }
  if (pub.length && pub[0].n / c.sources.length > 0.5 && c.sources.length >= 6) annex.push(note(`<p>${esc(e(`One publisher (${pub[0].host}) supplies more than half of the sources: treat the picture as narrow.`, `ناشر واحد (${pub[0].host}) يورّد أكثر من نصف المصادر: فعامِل الصورة على أنها ضيقة.`))}</p>`, "warn"));
  return { kicker: `${c.country} · ${group}`, title: "", titleColor: WARN, bottomLine: cutText(lead, 520), front, annex };
}
