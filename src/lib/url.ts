/** Returns the URL only if it is plain http(s); anything else (javascript:, data:, relative junk) becomes "#". Use for every href built from data. */
export const safeHttp = (u: string | null | undefined): string => { if (!u) return "#"; try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:" ? x.href : "#"; } catch { return "#"; } };

/** Opens an HTML document built in the browser (a printable brief) in a new tab. With "noopener" window.open always returns null, which made callers revoke the blob straight away and show a blank tab, so the opener is cleared afterwards instead and the blob is kept for a few minutes. Pass a window opened earlier in the same click to avoid popup blocking after an await. */
export function openHtml(html: string, pre?: Window | null): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" })); setTimeout(() => URL.revokeObjectURL(url), 180_000);
  const w = pre ?? window.open(url, "_blank"); if (!w) return false;
  try { w.opener = null; } catch { /* cross-origin already */ }
  if (pre) w.location.href = url; return true;
}
