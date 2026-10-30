import { classification } from "../case/report";
import { BRIEF_CSS } from "../dossier/export";
import { REPORT_CSS, esc, reportDoc } from "../report/html";
import type { LabSnap } from "./snap";

// The standard page of a Lab PDF: classification line, title, the blocks (each a top-level child of the body, because the PDF builder places its page breaks between blocks) and a footer.
export function labDoc(o: { title: string; lang: "en" | "ar"; foot: string; blocks: string[]; extraCss?: string }): string {
  return reportDoc({ title: o.title, lang: o.lang, css: `${BRIEF_CSS}${REPORT_CSS}${o.extraCss ?? ""}`, blocks: [`<div class="cls">${esc(classification(o.lang))}</div>`, `<h1>${esc(o.title)}</h1>`, ...o.blocks, `<div class="foot">${esc(o.foot)}</div>`] });
}
export const snapDoc = (s: LabSnap): string => labDoc({ title: `${s.title}: ${s.country}`, lang: s.lang, foot: `Geo Desk · ${s.at.slice(0, 10)}`, blocks: s.blocks });
