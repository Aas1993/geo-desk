// Small readers for the markdown the Strategic Council and the Statecraft Architect write: tables, level-2/3 sections, and "**Label:** text" fields. They read what the model wrote and add nothing: a table or field that is not there is simply not returned. Shared by the screen and the PDF.
export type MdTable = { head: string[]; rows: string[][]; /** the last non-empty line before the table (often a bold posture or option title) */ before: string };
const cellsOf = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (r: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r);
/** Markdown of a cell as plain text: bold, italics, code marks and links removed, fact ids kept. */
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
/** Every pipe table in a text, in order. A product cut off mid-table yields the rows that were complete. */
export function mdTables(md: string): MdTable[] {
  const L = (md ?? "").replace(/\r/g, "").split("\n"); const out: MdTable[] = []; let last = "";
  for (let i = 0; i < L.length; i++) {
    if (L[i].includes("|") && i + 1 < L.length && isSep(L[i + 1])) { const head = cellsOf(L[i]); const rows: string[][] = []; let j = i + 2; while (j < L.length && L[j].includes("|") && L[j].trim()) { rows.push(cellsOf(L[j])); j++; } out.push({ head, rows, before: last }); i = j - 1; continue; }
    if (L[i].trim()) last = L[i].trim();
  }
  return out;
}
export type MdSection = { level: number; title: string; body: string };
/** The sections of a text at the given heading levels (default 1 to 3), each with the text under it up to the next heading of those levels. Text before the first heading is dropped. */
export function mdSections(md: string, levels: number[] = [1, 2]): MdSection[] {
  const re = new RegExp(`^(#{1,6})\\s+(.*)$`, "gm"); const hits: { level: number; title: string; at: number; end: number }[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(md ?? ""))) { const level = m[1].length; if (levels.includes(level)) hits.push({ level, title: m[2].trim(), at: m.index, end: m.index + m[0].length }); }
  return hits.map((h, i) => ({ level: h.level, title: h.title, body: (md ?? "").slice(h.end, i + 1 < hits.length ? hits[i + 1].at : undefined).trim() }));
}
export type Field = { label: string; text: string };
/** "**Label:** text" fields, each running to the next field (a seat section's Judgment, Facts, Framework ...). */
export function boldFields(body: string): Field[] {
  const re = /^\*\*([^*\n:]{1,60}):\*\*[ \t]*/gm; const hits: { label: string; at: number; end: number }[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(body ?? ""))) hits.push({ label: m[1].trim(), at: m.index, end: m.index + m[0].length });
  return hits.map((h, i) => ({ label: h.label, text: (body ?? "").slice(h.end, i + 1 < hits.length ? hits[i + 1].at : undefined).trim() })).filter((f) => f.text);
}
export type Conf3 = "high" | "moderate" | "low";
const CONF_AR: [RegExp, Conf3][] = [[/مرتفع|عالي|مرتفعة|عالية/, "high"], [/معتدل|متوسط|معتدلة|متوسطة/, "moderate"], [/منخفض|ضعيف|منخفضة|ضعيفة/, "low"]];
/** The confidence a text states ("moderate confidence", "Confidence: low", Arabic "ثقة معتدلة"), or null when it states none. */
export function confOf(text: string): Conf3 | null {
  const t = (text ?? "").toLowerCase(); let m = /\b(high|moderate|low)(?:[- ]to[- ](?:high|moderate|low))?[ -]confidence/.exec(t) ?? /confidence\s*(?:is|level)?\s*[:\-]?\s*\**\s*(high|moderate|low)/.exec(t) ?? /^\W*(high|moderate|low)\b/.exec(t);
  if (m) return m[1] as Conf3;
  m = /(?:ثقة|الثقة)\s*(?:ال)?(\S+)/.exec(text ?? ""); if (m) for (const [re, c] of CONF_AR) if (re.test(m[1])) return c;
  m = /^[\s\p{P}*]*(\S+)/u.exec(text ?? ""); if (m) for (const [re, c] of CONF_AR) if (re.test(m[1])) return c;
  return null;
}
export const num = (s: string): number | null => { const m = /-?\d+(?:\.\d+)?/.exec(plain(s).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))); return m ? Number(m[0]) : null; };
