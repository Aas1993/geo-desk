/** Prints the illustrated pages of a briefing: the rendered DOM and the page's own stylesheets go into a new window in the light theme, one page per sheet, and the browser's print dialog saves them as a PDF. No model call and no server. */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
export function printVisual(node: HTMLElement, title: string): boolean {
  const w = window.open("", "_blank"); if (!w) return false;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("\n"); const root = document.documentElement;
  w.document.write(`<!doctype html><html lang="${esc(root.lang || "en")}" dir="${esc(node.getAttribute("dir") ?? "ltr")}" data-theme="light" class="${esc(root.className)}"><head><meta charset="utf-8"><title>${esc(title)}</title>${styles}<style>@page{size:A4 landscape;margin:9mm}html,body{background:#fff!important;color:#0a1730}body{margin:0;padding:12px}.no-print{display:none!important}.fs-page{break-after:page;page-break-after:always;break-inside:avoid-page;margin:0 0 12px}.fs-page:last-child{break-after:auto;page-break-after:auto}.fs-pg{max-width:1120px;margin:0 auto}</style></head><body class="${esc(document.body.className)}"><div class="fs-pg">${node.innerHTML}</div><script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`);
  w.document.close(); return true;
}
