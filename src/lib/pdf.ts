// Builds a real PDF file in the browser and downloads it. The document is rendered by the browser itself (so Arabic shaping and right-to-left layout are right), turned into images
// page by page, and cut between lines rather than through them. The pages are pictures: the text is not selectable and links are not clickable. For selectable text use the Word file.
const PX = 794; // A4 width at 96 dpi
const BOOST = `html,body{margin:0!important;background:#fff!important}body{padding:0 8px;font-size:13px!important;line-height:1.5!important}h1{font-size:23px!important}h2{font-size:17px!important}h3{font-size:14px!important}table{font-size:11.5px!important;width:100%}.m,.c,.foot,.cls{font-size:10.5px!important}`;

export type PdfOptions = { filename: string; onProgress?: (done: number, total: number) => void };

/** Finds the quietest pixel row near `target` (fewest dark pixels), so a page break lands between lines of text or on a table border, not through letters. */
function quietRow(cv: HTMLCanvasElement, target: number, window: number, forbid: [number, number][] = []): number {
  const ctx = cv.getContext("2d", { willReadFrequently: true })!; const lo = Math.max(1, Math.floor(target - window)); const hi = Math.min(cv.height, Math.floor(target)); if (hi <= lo) return Math.max(1, Math.floor(target));
  const data = ctx.getImageData(0, lo, cv.width, hi - lo).data; let best = hi, bestInk = Infinity;
  for (let y = hi - lo - 1; y >= 0; y--) { const abs = lo + y; if (forbid.some(([a, b]) => abs >= a && abs <= b)) continue; /* never cut right under a heading */ let ink = 0; for (let x = 0; x < cv.width; x += 3) { const i = (y * cv.width + x) * 4; if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) ink++; } if (ink < bestInk) { bestInk = ink; best = lo + y; if (ink === 0) break; } }
  return best;
}

/** `html` is a complete HTML document (with its own styles). It is shown in a hidden A4-width frame, so its CSS cannot touch the app. */
export async function downloadPdf(html: string, o: PdfOptions): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const frame = document.createElement("iframe"); frame.setAttribute("aria-hidden", "true"); frame.style.cssText = `position:fixed;left:-${PX * 3}px;top:0;width:${PX}px;height:1200px;border:0;pointer-events:none;`; frame.srcdoc = html.replace("</head>", `<style>${BOOST}</style></head>`);
  const loaded = new Promise<void>((res) => { frame.onload = () => res(); }); document.body.appendChild(frame);
  try {
    await Promise.race([loaded, new Promise((_, rej) => setTimeout(() => rej(new Error("The document did not load.")), 15_000))]);
    const d = frame.contentDocument!; await d.fonts?.ready; await new Promise((r) => setTimeout(r, 120)); const body = d.body;
    // group the blocks into chunks of about 1,400 px, so no single canvas gets huge and a short table stays whole
    const blocks = Array.from(body.children).filter((e) => !["SCRIPT", "STYLE"].includes(e.tagName)) as HTMLElement[]; const chunks: HTMLElement[][] = []; let cur: HTMLElement[] = []; let h = 0;
    for (const b of blocks) { const bh = b.offsetHeight; if (cur.length && h + bh > 700) { const last = cur[cur.length - 1]; if (cur.length > 1 && /^H[1-4]$/.test(last.tagName)) { cur.pop(); chunks.push(cur); cur = [last]; h = last.offsetHeight; } else { chunks.push(cur); cur = []; h = 0; } } cur.push(b); h += bh; }
    if (cur.length) chunks.push(cur);
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true }); const PW = 210, PH = 297, MX = 12, MT = 12, MB = 14; const CW = PW - 2 * MX; const PAGE_BOTTOM = PH - MB;
    let y = MT; let pages = 1;
    const place = (cv: HTMLCanvasElement, forbid: [number, number][], safe: number[], startsWithHeading: boolean) => {
      const mm = CW / cv.width; let top = 0;
      while (top < cv.height - 1) {
        const room = (PAGE_BOTTOM - y) / mm; let end = Math.min(cv.height, top + room);
        if (end < cv.height) { // does not all fit: break at the quietest row within the last ~110 px that would fit
          const whole = (cv.height - top) * mm; // a block of modest height that would be split into a small first part moves to the next page whole
          if (room < 90 || (top === 0 && startsWithHeading && (PAGE_BOTTOM - y) < 48 && y > MT + 5) || (top === 0 && whole <= 150 && room * mm < whole * 0.6 && y > MT + 5)) { pdf.addPage(); pages++; y = MT; continue; }
          const cand = Math.max(0, ...safe.filter((c) => c > top + 60 && c <= end)); // preferred: break at the end of a paragraph, list item or table row, or just before a heading
          const fit = end; end = cand > 0 && cand >= end - 500 ? quietRow(cv, Math.min(fit, cand + 26), 70, forbid) : quietRow(cv, end, 140, forbid); // snap to the nearest clean gap: the measured position can be a few pixels off the drawn one if (end <= top + 20) end = Math.min(cv.height, top + room);
        }
        const hpx = Math.max(1, Math.round(end - top)); const slice = document.createElement("canvas"); slice.width = cv.width; slice.height = hpx; const sc = slice.getContext("2d")!; sc.fillStyle = "#fff"; sc.fillRect(0, 0, slice.width, hpx); sc.drawImage(cv, 0, top, cv.width, hpx, 0, 0, cv.width, hpx);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.88), "JPEG", MX, y, CW, hpx * mm); y += hpx * mm; top += hpx;
        if (top < cv.height - 1) { pdf.addPage(); pages++; y = MT; }
      }
      y += 1.5;
    };
    const dir = d.documentElement.dir || "ltr";
    for (let i = 0; i < chunks.length; i++) {
      const wrap = d.createElement("div"); wrap.dir = dir; wrap.style.cssText = `position:absolute;left:0;top:0;width:${PX}px;padding:0 8px 14px;background:#fff;`; for (const b of chunks[i]) wrap.appendChild(b.cloneNode(true)); body.appendChild(wrap); const wr = wrap.getBoundingClientRect(); const forbid: [number, number][] = Array.from(wrap.querySelectorAll("h1,h2,h3,h4")).map((hd) => { const r = hd.getBoundingClientRect(); return [Math.floor((r.top - wr.top - 6) * 1.8), Math.ceil((r.bottom - wr.top + 14) * 1.8)] as [number, number]; });
      const safe: number[] = []; const trs = new Set(Array.from(wrap.querySelectorAll("thead tr"))); for (const el of Array.from(wrap.querySelectorAll("p,li,tr,blockquote,h1,h2,h3,h4"))) { const r = el.getBoundingClientRect(); if (/^H[1-4]$/.test(el.tagName)) safe.push(Math.floor((r.top - wr.top - 5) * 1.8)); else if (!trs.has(el)) safe.push(Math.ceil((r.bottom - wr.top + 1) * 1.8)); }
      const cv = await html2canvas(wrap, { scale: 1.8, backgroundColor: "#ffffff", logging: false, windowWidth: PX }); body.removeChild(wrap); place(cv, forbid, safe, /^H[1-4]$/.test(chunks[i][0].tagName)); o.onProgress?.(i + 1, chunks.length); await new Promise((r) => setTimeout(r, 0));
    }
    for (let p = 1; p <= pages; p++) { pdf.setPage(p); pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`${p} / ${pages}`, PW / 2, PH - 6, { align: "center" }); }
    const blob = pdf.output("blob"); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000); // same download path as the Word and PowerPoint files
  } finally { document.body.removeChild(frame); }
}
