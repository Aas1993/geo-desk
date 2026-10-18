// Builds a PowerPoint deck from the briefing's markdown, in the browser. One slide per section, tables on their own slides (paginated by the library), a sources slide at the end.
export type DeckOptions = { title: string; subtitle: string; rtl: boolean; classification: string; foot: string; sources: { url: string; title: string }[] };
type Block = { t: "p" | "quote"; text: string } | { t: "list"; items: string[]; ordered: boolean } | { t: "table"; head: string[]; rows: string[][] };
type Section = { title: string; part: string; blocks: Block[] };

const plain = (s: string) => s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
const cells = (r: string) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => plain(c));
const isSep = (r: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r);

/** Splits the markdown into sections ("## " headings, tagged with the numbered "# " part they sit in) with simple blocks. */
export function parseSections(md: string): { title: string; sections: Section[] } {
  const L = md.replace(/\r/g, "").split("\n"); const sections: Section[] = []; let title = ""; let part = ""; let cur = null as Section | null; let i = 0;
  const open = (t: string): Section => { const n: Section = { title: t, part, blocks: [] }; cur = n; sections.push(n); return n; };
  while (i < L.length) {
    const line = L[i]; if (!line.trim() || /^\s*(-{3,}|\*{3,})\s*$/.test(line)) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { const txt = plain(h[2]); if (h[1].length === 1) { if (/^\d\.\s/.test(txt)) { part = txt; cur = null; } else if (!title) title = txt; } else if (h[1].length === 2) open(txt); else { (cur ?? open(part || txt)).blocks.push({ t: "p", text: txt }); } i++; continue; }
    const c: Section = cur ?? open(part || title || "Briefing");
    if (line.includes("|") && i + 1 < L.length && isSep(L[i + 1])) { const head = cells(line); const rows: string[][] = []; i += 2; while (i < L.length && L[i].includes("|") && L[i].trim()) { rows.push(cells(L[i])); i++; } c.blocks.push({ t: "table", head, rows }); continue; }
    if (/^\s*>/.test(line)) { const q: string[] = []; while (i < L.length && /^\s*>/.test(L[i])) { q.push(L[i].replace(/^\s*>\s?/, "")); i++; } c.blocks.push({ t: "quote", text: plain(q.join(" ")) }); continue; }
    const li = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) { const ordered = /\d/.test(li[2]); const items: string[] = []; while (i < L.length) { const m = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(L[i]); if (m) { items.push(plain(m[3])); i++; } else if (/^\s{2,}\S/.test(L[i]) && items.length) { items[items.length - 1] += " " + plain(L[i]); i++; } else break; } c.blocks.push({ t: "list", items, ordered }); continue; }
    const para = [line]; i++; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*>|\s*([-*•]|\d+[.)])\s)/.test(L[i]) && !(L[i].includes("|") && i + 1 < L.length && isSep(L[i + 1]))) { para.push(L[i]); i++; }
    c.blocks.push({ t: "p", text: plain(para.join(" ")) });
  }
  return { title, sections: sections.filter((s) => s.blocks.length) };
}
const lines = (s: string, perLine = 105) => Math.max(1, Math.ceil(s.length / perLine));
const cost = (b: Block) => (b.t === "list" ? b.items.reduce((n, x) => n + lines(x, 100), 0) : b.t === "table" ? 99 : lines(b.text) + 0.5);

export async function buildDeck(md: string, o: DeckOptions): Promise<Blob> {
  const { default: Pptx } = await import("pptxgenjs"); const p = new Pptx(); p.layout = "LAYOUT_WIDE"; if (o.rtl) p.rtlMode = true;
  const NAVY = "0B2540", ACC = "B8892B", INK = "1A1A1A", MUTE = "666666"; const font = o.rtl ? "Arial" : "Calibri"; const align = o.rtl ? "right" : "left";
  const { title, sections } = parseSections(md);
  const frame = (s: ReturnType<typeof p.addSlide>, head: string, sub?: string) => {
    s.background = { color: "FFFFFF" }; s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.95, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(head, { x: 0.5, y: 0.12, w: 12.3, h: 0.7, fontFace: font, fontSize: 24, bold: true, color: "FFFFFF", valign: "middle", align, fit: "shrink" });
    if (sub) s.addText(sub, { x: 0.5, y: 0.98, w: 12.3, h: 0.3, fontFace: font, fontSize: 10, color: MUTE, align });
    s.addText(o.classification, { x: 0.5, y: 7.1, w: 12.3, h: 0.3, fontFace: font, fontSize: 8, color: "8A1C1C", bold: true, align });
  };
  // title slide
  const t = p.addSlide(); t.background = { color: NAVY }; t.addText(title || o.title, { x: 0.8, y: 2.0, w: 11.7, h: 1.6, fontFace: font, fontSize: 36, bold: true, color: "FFFFFF", align, fit: "shrink" });
  t.addShape("rect", { x: o.rtl ? 11.5 : 0.8, y: 3.75, w: 1.0, h: 0.06, fill: { color: ACC }, line: { color: ACC } });
  t.addText(o.subtitle, { x: 0.8, y: 4.0, w: 11.7, h: 1.2, fontFace: font, fontSize: 16, color: "D6DEE8", align, valign: "top" });
  t.addText(o.classification, { x: 0.8, y: 6.8, w: 11.7, h: 0.4, fontFace: font, fontSize: 10, color: "E8B4B4", bold: true, align });
  for (const sec of sections) {
    const group = sec.part ? sec.part.replace(/^\d\.\s*/, "") : ""; let slide = p.addSlide(); let n = 1; let used = 0; let box: { text: string; options: Record<string, unknown> }[] = [];
    const heading = () => (n === 1 ? sec.title : `${sec.title} (${n})`);
    const flush = () => { if (!box.length) return; slide.addText(box as never, { x: 0.5, y: 1.35, w: 12.3, h: 5.65, fontFace: font, fontSize: 14, color: INK, valign: "top", align, paraSpaceAfter: 6, fit: "shrink" }); box = []; };
    const next = () => { flush(); slide = p.addSlide(); n++; used = 0; frame(slide, heading(), group); };
    frame(slide, heading(), group);
    for (const b of sec.blocks) {
      if (b.t === "table") {
        flush(); const cols = b.head.length; const rows = [b.head.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: font, fontSize: 10, align } })), ...b.rows.map((r) => b.head.map((_, j) => ({ text: r[j] ?? "", options: { fontFace: font, fontSize: 10, color: INK, align, valign: "top" as const } })))];
        if (used > 0) { slide = p.addSlide(); n++; frame(slide, heading(), group); }
        slide.addTable(rows as never, { x: 0.5, y: 1.35, w: 12.3, colW: Array(cols).fill(12.3 / cols), border: { type: "solid", pt: 0.5, color: "BBBBBB" }, autoPage: true, autoPageRepeatHeader: true, autoPageLineWeight: 0.5, newSlideStartY: 1.35, margin: 0.05 } as never);
        used = 99; continue;
      }
      const c = cost(b); if (used > 0 && used + c > 15) next(); used += c;
      if (b.t === "list") for (const it of b.items) box.push({ text: it, options: { bullet: b.ordered ? { type: "number" } : true, breakLine: true } });
      else if (b.t === "quote") box.push({ text: b.text, options: { italic: true, color: NAVY, breakLine: true } });
      else box.push({ text: b.text, options: { breakLine: true } });
    }
    flush();
  }
  if (o.sources.length) for (let k = 0; k < o.sources.length; k += 14) { const s = p.addSlide(); frame(s, k ? "Sources (continued)" : "Sources"); s.addText(o.sources.slice(k, k + 14).map((x, i) => ({ text: `${k + i + 1}. ${x.title.slice(0, 90)} — ${x.url.slice(0, 110)}`, options: { breakLine: true } })) as never, { x: 0.5, y: 1.2, w: 12.3, h: 5.8, fontFace: font, fontSize: 10, color: INK, valign: "top", align, paraSpaceAfter: 3 }); }
  const e = p.addSlide(); frame(e, "Status of this document"); e.addText(o.foot, { x: 0.5, y: 1.3, w: 12.3, h: 5, fontFace: font, fontSize: 13, color: INK, valign: "top", align });
  return (await p.write({ outputType: "blob" })) as Blob;
}
