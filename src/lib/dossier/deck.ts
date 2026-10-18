// Builds a PowerPoint deck from the briefing's markdown, in the browser. One slide per section, tables on their own slides (paginated by the library), a sources slide at the end.
export type DeckOptions = { labels?: { sources: string; status: string }; title: string; subtitle: string; rtl: boolean; classification: string; foot: string; sources: { url: string; title: string }[] };
type Block = { t: "p" | "quote"; text: string } | { t: "list"; items: string[]; ordered: boolean } | { t: "table"; head: string[]; rows: string[][] };
type Section = { title: string; part: string; blocks: Block[] };

const plain = (s: string) => s.replace(/[\u2010\u2011]/g, "-").replace(/\u00a0/g, " ").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
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
// ---- layout estimates (PowerPoint grows rows and text to fit, so these are slightly conservative)
const W = 12.3, TOP = 1.35, BOT = 6.95;
const cpi = (fs: number) => (17 * 10 / fs) * 0.95; // characters per inch of Calibri-like text at a font size
const linesFor = (len: number, inches: number, fs: number) => Math.max(1, Math.ceil(len / Math.max(4, (inches - 0.14) * cpi(fs))));
const colWidths = (head: string[], rows: string[][]) => { const w = head.map((h, j) => Math.min(70, Math.max(6, h.length * 0.8, rows.reduce((n, r) => n + (r[j]?.length ?? 0), 0) / Math.max(1, rows.length)))); const min = Math.min(1.25, (W / head.length) * 0.9); const tot = w.reduce((a, b) => a + b, 0); const raw = w.map((x) => (x / tot) * W); let spare = 0; const fixed = raw.map((x) => { if (x < min) { spare += min - x; return min; } return x; }); const big = fixed.filter((x) => x > min).reduce((a, b) => a + b, 0); return fixed.map((x) => (x > min ? x - (spare * x) / big : x)); };
const rowH = (cells: string[], cw: number[], fs: number) => Math.max(...cells.map((c, j) => linesFor(c.length, cw[j], fs))) * (fs * 1.22 / 72) + 0.1;
const textH = (b: Block, fs = 14) => (b.t === "list" ? b.items.reduce((n, x) => n + linesFor(x.length, W - 0.4, fs) * (fs * 1.25 / 72) + 0.07, 0) : linesFor(b.t === "p" || b.t === "quote" ? b.text.length : 0, W, fs) * (fs * 1.25 / 72) + 0.1);

export async function buildDeck(md: string, o: DeckOptions): Promise<Blob> {
  const { default: Pptx } = await import("pptxgenjs"); const p = new Pptx(); p.layout = "LAYOUT_WIDE"; if (o.rtl) p.rtlMode = true;
  const NAVY = "0B2540", ACC = "B8892B", INK = "1A1A1A", MUTE = "666666"; const font = o.rtl ? "Arial" : "Calibri"; const align = o.rtl ? "right" : "left";
  const parsed = parseSections(md); const title = parsed.title; // the "Prepared for ..." block under the title goes on the title slide instead of a slide of its own
  const intro = parsed.sections[0] && parsed.sections[0].title === title ? parsed.sections[0].blocks.map((b) => (b.t === "p" || b.t === "quote" ? b.text : "")).filter(Boolean).join("\n") : ""; const sections = intro ? parsed.sections.slice(1) : parsed.sections;
  const frame = (s: ReturnType<typeof p.addSlide>, head: string, sub?: string) => {
    s.background = { color: "FFFFFF" }; s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.95, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(head, { x: 0.5, y: 0.12, w: 12.3, h: 0.7, fontFace: font, fontSize: 24, bold: true, color: "FFFFFF", valign: "middle", align, fit: "shrink" });
    if (sub) s.addText(sub, { x: 0.5, y: 0.98, w: 12.3, h: 0.3, fontFace: font, fontSize: 10, color: MUTE, align });
    s.addText(o.classification, { x: 0.5, y: 7.1, w: 12.3, h: 0.3, fontFace: font, fontSize: 8, color: "8A1C1C", bold: true, align });
  };
  // title slide
  const t = p.addSlide(); t.background = { color: NAVY }; t.addText(title || o.title, { x: 0.8, y: 2.0, w: 11.7, h: 1.6, fontFace: font, fontSize: 36, bold: true, color: "FFFFFF", align, fit: "shrink" });
  t.addShape("rect", { x: o.rtl ? 11.5 : 0.8, y: 3.75, w: 1.0, h: 0.06, fill: { color: ACC }, line: { color: ACC } });
  t.addText([o.subtitle, intro].filter(Boolean).join("\n"), { x: 0.8, y: 4.0, w: 11.7, h: 2.2, fontFace: font, fontSize: 15, color: "D6DEE8", align, valign: "top", fit: "shrink" });
  t.addText(o.classification, { x: 0.8, y: 6.8, w: 11.7, h: 0.4, fontFace: font, fontSize: 10, color: "E8B4B4", bold: true, align });
  for (const sec of sections) {
    const group = sec.part ? sec.part.replace(/^\d\.\s*/, "") : ""; let n = 1; let slide = p.addSlide(); let y = TOP; let leadIn = false; // true while the only thing on the slide is a short lead-in line for the table that follows
    const heading = () => (n === 1 ? sec.title : `${sec.title} (${n})`);
    const fresh = () => { n++; slide = p.addSlide(); frame(slide, heading(), group); y = TOP; leadIn = false; };
    frame(slide, heading(), group);
    for (let bi = 0; bi < sec.blocks.length; bi++) {
      const b = sec.blocks[bi]; const nxt = sec.blocks[bi + 1];
      if (b.t === "table") {
        const cw = colWidths(b.head, b.rows); const heights = (fs: number) => [rowH(b.head, cw, fs), ...b.rows.map((r) => rowH(b.head.map((_, j) => r[j] ?? ""), cw, fs))]; const sum = (xs: number[]) => xs.reduce((a, c) => a + c, 0);
        const fit = [12, 11, 10, 9].find((fs) => sum(heights(fs)) <= BOT - TOP); const fsFor = (room: number) => [12, 11, 10, 9].find((fs) => sum(heights(fs)) <= room);
        const cell = (text: string, fs: number, head = false) => ({ text, options: { fontFace: font, fontSize: fs, align, valign: "top" as const, bold: head, color: head ? "FFFFFF" : INK, ...(head ? { fill: { color: NAVY } } : {}) } });
        const place = (rows: string[][], fs: number) => { slide.addTable([b.head.map((h) => cell(h, fs, true)), ...rows.map((r) => b.head.map((_, j) => cell(r[j] ?? "", fs)))] as never, { x: 0.5, y, w: W, colW: cw, border: { type: "solid", pt: 0.5, color: "BBBBBB" }, margin: 0.05 } as never); };
        const here = fsFor(BOT - y);
        if (here) { place(b.rows, here); y += sum(heights(here)) + 0.2; }
        else if (fit && !leadIn) { fresh(); place(b.rows, fit); y += sum(heights(fit)) + 0.2; }
        else { // too long for one slide: chunk the rows over slides at 10pt, header repeated
          const fs = 10; const hs = heights(fs); if (y > TOP && (!leadIn || y + hs[0] + hs[1] > BOT)) fresh(); let i = 0;
          while (i < b.rows.length) { let used = hs[0]; const chunk: string[][] = []; while (i < b.rows.length && (used + hs[i + 1] <= BOT - y || !chunk.length)) { used += hs[i + 1]; chunk.push(b.rows[i]); i++; } place(chunk, fs); y += used + 0.2; if (i < b.rows.length) fresh(); }
        }
        leadIn = false; continue;
      }
      const h = textH(b); if (y > TOP && y + h > BOT) fresh();
      // a short lead-in line stays with the table it introduces: if the table's first rows would not fit below it, both move to a fresh slide
      if (nxt && nxt.t === "table" && h < 1.2 && y > TOP) { const cw2 = colWidths(nxt.head, nxt.rows); const need = Math.min(rowH(nxt.head, cw2, 9) + nxt.rows.slice(0, 4).reduce((a, r) => a + rowH(nxt.head.map((_, j) => r[j] ?? ""), cw2, 9), 0), 2.2); if (y + h + need > BOT) fresh(); }
      const runs = b.t === "list" ? b.items.map((it, k) => ({ text: it, options: { bullet: b.ordered ? { type: "number" as const, numberStartAt: k + 1 } : true, breakLine: true } })) : [{ text: b.text, options: { breakLine: true, ...(b.t === "quote" ? { italic: true, color: NAVY } : {}) } }];
      slide.addText(runs as never, { x: 0.5, y, w: W, h: Math.min(h, BOT - y), fontFace: font, fontSize: 14, color: INK, valign: "top", align, paraSpaceAfter: 4, fit: "shrink" }); leadIn = !!nxt && nxt.t === "table" && h < 1.4 && y + h - TOP < 2.2; y += h;
    }
  }
  if (o.sources.length) for (let k = 0; k < o.sources.length; k += 14) { const s = p.addSlide(); frame(s, `${o.labels?.sources ?? "Sources"}${k ? " (2)" : ""}`); s.addText(o.sources.slice(k, k + 14).map((x, i) => ({ text: `${k + i + 1}. ${x.title.slice(0, 90)} — ${x.url.slice(0, 110)}`, options: { breakLine: true } })) as never, { x: 0.5, y: 1.2, w: 12.3, h: 5.8, fontFace: font, fontSize: 10, color: INK, valign: "top", align, paraSpaceAfter: 3 }); }
  const e = p.addSlide(); frame(e, o.labels?.status ?? "Status of this document"); e.addText(o.foot, { x: 0.5, y: 1.3, w: 12.3, h: 5, fontFace: font, fontSize: 13, color: INK, valign: "top", align });
  return (await p.write({ outputType: "blob" })) as Blob;
}
