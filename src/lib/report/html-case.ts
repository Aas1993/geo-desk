import { INK, MUTE, TRACK, esc, scoreC } from "./html";

// PDF pieces the Strategic Council and the Statecraft Architect need that the shared kit (html.ts) does not have.
/** A ring that fills to `value` (0-100) with `text` inside (a pass count such as "9/12", or a /100 score) and a caption: the shared gauge() always prints the number itself. */
export function ringGauge(value: number, text: string, label: string, color?: string): string {
  const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, value));
  return `<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${TRACK}" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${color ?? scoreC(p)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${((c * p) / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="56" text-anchor="middle" font-size="${text.length > 5 ? 18 : 23}" font-weight="700" fill="${INK}">${esc(text)}</text></svg><div class="cap">${esc(label)}</div>`;
}
const CELL: [number, string, string][] = [[4, "#e3f4ec", "#0e9f6e"], [3, "#e8ecf8", "#6d4bd8"], [2, "#fdf0d9", "#b8741a"], [-9, "#fbe3e7", "#d92d4a"]];
/** A grid of 0-5 scores (criteria down, options across) with coloured cells and an optional totals row; one block. */
export function heatTable(o: { head: string; cols: { label: string; color: string }[]; rows: { label: string; scores: (number | null)[] }[]; totalLabel?: string; totals?: (number | null)[] }): string {
  const cell = (n: number | null) => { if (n == null) return `<td style="text-align:center;color:${MUTE}">–</td>`; const [, bg, fg] = CELL.find(([min]) => n >= min)!; return `<td style="text-align:center;background:${bg};color:${fg};font-weight:700">${n}</td>`; };
  return `<table class="tbl"><thead><tr><th>${esc(o.head)}</th>${o.cols.map((c) => `<th style="text-align:center;color:${c.color}">${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${o.rows.map((r) => `<tr><td>${esc(r.label)}</td>${r.scores.map(cell).join("")}</tr>`).join("")}${o.totals ? `<tr><td><b>${esc(o.totalLabel ?? "")}</b></td>${o.totals.map((n, i) => `<td style="text-align:center;font-weight:700;color:${o.cols[i]?.color ?? INK}">${n ?? "–"}</td>`).join("")}</tr>` : ""}</tbody></table>`;
}
/** The shared card rule gives a card a basis of half the row plus its padding and border (content-box), so two never fit side by side and every card takes a full row. These cards are border-box, set inline on each card because the PDF builder does not carry a <style> element placed among the blocks. */
export const borderBox = (html: string) => html.replace(/<div class="card([^"]*)" style="/g, '<div class="card$1" style="box-sizing:border-box;');
