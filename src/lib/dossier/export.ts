import { openHtml } from "../url";
// Turns the briefing's markdown into standalone HTML for printing to PDF and for a Word-compatible .doc. Escapes everything; only http(s) links are kept.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inline = (t: string) => esc(t).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, a: string, u: string) => `<a href="${u}">${a}</a>`).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
const cells = (r: string) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (r: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r);
export function mdToHtml(md: string): string {
  const L = md.replace(/\r/g, "").split("\n"); const out: string[] = []; let i = 0;
  while (i < L.length) {
    const line = L[i]; if (!line.trim()) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line); if (h) { out.push(`<h${h[1].length}${h[1].length === 1 ? ' class="part"' : ""}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (line.includes("|") && i + 1 < L.length && isSep(L[i + 1])) { const head = cells(line); const rows: string[][] = []; i += 2; while (i < L.length && L[i].includes("|") && L[i].trim()) { rows.push(cells(L[i])); i++; } out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, j) => `<td>${inline(r[j] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`); continue; }
    if (/^\s*>/.test(line)) { const q: string[] = []; while (i < L.length && /^\s*>/.test(L[i])) { q.push(L[i].replace(/^\s*>\s?/, "")); i++; } out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`); continue; }
    const li = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) { const ord = /\d/.test(li[2]); const items: string[] = []; while (i < L.length) { const m = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(L[i]); if (m) { items.push(m[3]); i++; } else if (/^\s{2,}\S/.test(L[i]) && items.length) { items[items.length - 1] += " " + L[i].trim(); i++; } else break; } out.push(`<${ord ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${ord ? "ol" : "ul"}>`); continue; }
    const para = [line]; i++; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*>|\s*([-*•]|\d+[.)])\s)/.test(L[i]) && !(L[i].includes("|") && i + 1 < L.length && isSep(L[i + 1]))) { para.push(L[i]); i++; }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}
const CSS = `@page{size:A4;margin:16mm}body{font:11px/1.45 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111}h1{font-size:19px;margin:18px 0 6px;color:#0b2540;border-bottom:2px solid #0b2540;padding-bottom:3px}h1.part{page-break-before:always}h1.part:first-of-type{page-break-before:auto}h2{font-size:14px;margin:14px 0 4px;color:#0b2540}h3{font-size:12px;margin:10px 0 3px}p{margin:5px 0}table{border-collapse:collapse;width:100%;margin:6px 0;font-size:10px}th,td{border:1px solid #bbb;padding:3px 5px;vertical-align:top;text-align:start}th{background:#e9eef5}blockquote{margin:6px 0;padding:4px 10px;border-inline-start:3px solid #0b2540;background:#f2f5f9}ul,ol{margin:4px 0;padding-inline-start:18px}li{margin:1px 0}a{color:#0b4f9c}code{font-size:.95em}.foot{margin-top:16px;font-size:9px;color:#555;border-top:1px solid #bbb;padding-top:4px}.cls{font-weight:700;letter-spacing:.08em;font-size:9px;color:#8a1c1c}[dir=rtl] .cls{letter-spacing:0}`;
export function briefingHtml(md: string, o: { title: string; rtl: boolean; foot: string; classification: string }, forWord = false): string {
  return `<!doctype html><html${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ""} lang="${o.rtl ? "ar" : "en"}" dir="${o.rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>${CSS}</style></head><body><div class="cls">${esc(o.classification)}</div>${mdToHtml(md)}<div class="foot">${esc(o.foot)}</div></body></html>`;
}
export function printBriefing(html: string) { return openHtml(html.replace("</body>", "<script>addEventListener(\"load\",()=>setTimeout(()=>print(),400))</script></body>")); }
export function saveBlob(name: string, type: string, data: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
