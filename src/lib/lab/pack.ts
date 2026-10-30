import { dropAnnex } from "../reportpdf";
import { stripReviewJson } from "../review/pair";
import { mdToHtml } from "../dossier/export";
import { chipRow, esc, flagBlocks, hero, statRow, tag, OK, WARN, ACC, INK } from "../report/html";
import { headOf } from "../report/model";

// THE BRIEFING PACK, pure part: sections the desk chose (the playbook, the products on file, the Bird's eye summary, the field updates, the Lab views) are put in the order the desk set and become one document: a cover, a contents page, one section per item (each starting a page) and a closing page that says what is dated when and what is not on file. Every section keeps its own as-of date; nothing is rewritten.
export type PackGroup = "playbook" | "products" | "bird" | "field" | "lab";
export type PackSection = { id: string; group: PackGroup; title: string; sub: string; at: string | null; blocks: string[]; note?: string };
export const GROUP_LABEL: Record<PackGroup, { en: string; ar: string }> = { playbook: { en: "Playbook", ar: "دليل فن الحكم" }, products: { en: "Product on file", ar: "منتج محفوظ" }, bird: { en: "Bird's eye", ar: "نظرة الطائر" }, field: { en: "Field updates", ar: "مستجدات ميدانية" }, lab: { en: "Lab view", ar: "عرض المختبر" } };
const GROUP_C: Record<PackGroup, string> = { playbook: OK, products: ACC, bird: INK, field: WARN, lab: "#6d4bd8" };
/** Moves a section one place (-1 up, +1 down); the ends stay put. */
export function moveSection<T extends { id: string }>(xs: T[], id: string, dir: -1 | 1): T[] { const i = xs.findIndex((x) => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= xs.length) return xs; const out = xs.slice(); [out[i], out[j]] = [out[j], out[i]]; return out; }
/** A product's markdown, with its headings one level down so the section title is the only page-starting heading. */
export const demote = (md: string): string => md.replace(/^(#{1,3})(\s)/gm, "#$1$2");
/** One saved product as a section: its quality chips and the auditors' red flags (the same reading the Archive PDF uses), then the consolidated brief without the long role-by-role annex. */
export function productSection(o: { id: string; kind: string; title: string; report: string; at: string; usd: number | null; lang: "en" | "ar"; L: "en" | "ar"; sources?: { url: string }[] }): PackSection {
  const head = headOf(o.kind, o.report, { sources: o.sources, lang: o.lang }); const body = demote(stripReviewJson(dropAnnex(o.report)));
  const meta = `<p class="sub">${esc(o.L === "ar" ? "أُعد في" : "Prepared")} ${esc(o.at.slice(0, 16).replace("T", " "))} UTC${o.usd != null ? ` · US$${o.usd.toFixed(2)}` : ""}${o.lang !== o.L ? ` · ${esc(o.lang === "ar" ? "النص بالعربية" : "text in English")}` : ""}</p>`;
  return { id: o.id, group: "products", title: o.title, sub: head.grade ? `${o.L === "ar" ? "التقدير" : "grade"} ${head.grade}` : "", at: o.at, blocks: [meta, chipRow(head, o.L), ...flagBlocks(head, o.L), mdToHtml(body)].filter(Boolean) };
}
/** A section made from markdown (the Bird's eye summary). */
export const markdownSection = (o: { id: string; group: PackGroup; title: string; sub: string; at: string | null; md: string }): PackSection => ({ id: o.id, group: o.group, title: o.title, sub: o.sub, at: o.at, blocks: [mdToHtml(demote(o.md))] });
const dateOf = (at: string | null) => (at ? at.slice(0, 10) : "");
/** The whole pack as blocks (each a top-level child of the body, because the PDF builder places its page breaks between blocks). `missing` lists what the desk asked for that is not on file, so the gap is on the last page. */
export function buildPack(o: { country: string; flag?: string; L: "en" | "ar"; date: string; sections: PackSection[]; missing: string[]; purpose?: string }): { title: string; blocks: string[] } {
  const e = (en: string, ar: string) => (o.L === "ar" ? ar : en); const n = o.sections.length; const title = e(`Briefing pack: ${o.country}`, `حزمة إحاطة: ${o.country}`);
  const counts = (g: PackGroup) => o.sections.filter((s) => s.group === g).length;
  const cover = hero({ kicker: e("Briefing pack", "حزمة إحاطة"), title: `${o.flag ? `${o.flag} ` : ""}${o.country}`, bottomLine: o.purpose?.trim() || e(`${n} sections chosen and ordered by the desk, each with its own as-of date. Rule-built sections are labelled as such; every proposal is for a human decision.`, `${n} أقسام اخترها المكتب ورتبها، لكل منها تاريخه. الأقسام المبنية بالقواعد معنونة بذلك؛ وكل مقترح للقرار البشري.`), meta: `<div class="meta"><span>${esc(e("Prepared", "أُعدت في"))}: <b>${esc(o.date)}</b></span><span>${esc(e("Sections", "الأقسام"))}: <b>${n}</b></span></div>` });
  const stats = statRow([{ n: counts("products"), label: e("products on file", "منتجات محفوظة"), color: ACC }, { n: counts("playbook") + counts("bird"), label: e("rule-built views", "عروض مبنية بالقواعد"), color: OK }, { n: counts("lab"), label: e("Lab views", "عروض المختبر"), color: "#6d4bd8" }, { n: o.missing.length, label: e("asked for, not on file", "مطلوب وغير محفوظ"), color: o.missing.length ? WARN : OK }]);
  const rows = o.sections.map((s, i) => `<tr><td>${i + 1}</td><td><a href="#pk-${esc(s.id)}">${esc(s.title)}</a>${s.sub ? ` <span class="sub">${esc(s.sub)}</span>` : ""}</td><td>${tag(e(GROUP_LABEL[s.group].en, GROUP_LABEL[s.group].ar), GROUP_C[s.group], { sm: true })}</td><td>${esc(dateOf(s.at) || e("current", "حالي"))}</td></tr>`).join("");
  const toc = `<h1 class="part">${esc(e("Contents", "المحتويات"))}</h1><table class="tbl"><thead><tr><th>#</th><th>${esc(e("Section", "القسم"))}</th><th>${esc(e("Kind", "النوع"))}</th><th>${esc(e("As of", "بتاريخ"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  const secs = o.sections.flatMap((s, i) => [`<h1 class="part" id="pk-${esc(s.id)}">${i + 1}. ${esc(s.title)}</h1>`, ...(s.note ? [`<p class="sub">${esc(s.note)}</p>`] : []), ...s.blocks]);
  const end = [`<h1 class="part">${esc(e("Dating, sources and what is not on file", "التواريخ والمصادر وما ليس محفوظًا"))}</h1>`, `<p>${esc(e("Each section keeps the date it was written or built. Products are the agents' work as saved in this browser, with the independent auditors' flags shown first; rule-built views (the playbook, the Lab views) come from held datasets and say so. Field updates are items the desk chose, not verified by the platform. Nothing here is a decision: every move is a proposal for a human.", "كل قسم يحتفظ بتاريخ كتابته أو بنائه. المنتجات عمل الوكلاء كما حُفظ في هذا المتصفح مع أعلام المدققين المستقلين أولًا؛ والعروض المبنية بالقواعد (الدليل وعروض المختبر) من بيانات محفوظة وتقول ذلك. المستجدات الميدانية عناصر اختارها المكتب ولم تتحقق منها المنصة. لا شيء هنا قرار: كل خطوة مقترح للإنسان."))}</p>`, o.missing.length ? `<div class="note warn"><b>${esc(e("Asked for but not on file", "مطلوب وغير محفوظ"))}:</b> ${o.missing.map(esc).join(" · ")}. ${esc(e("Run them in their tabs first; they are not invented here.", "شغّلها في تبويباتها أولًا؛ ولا تُختلق هنا."))}</div>` : `<div class="note ok">${esc(e("Everything asked for is in the pack.", "كل ما طُلب موجود في الحزمة."))}</div>`];
  return { title, blocks: [cover, stats, toc, ...secs, ...end] };
}
