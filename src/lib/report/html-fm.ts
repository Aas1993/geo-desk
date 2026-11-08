import { layoutTree, type PathNode } from "../machiavelli/strategy-parse";
import { ACC, C2, INK, MUTE, OK, RISK, WARN, esc, tag } from "./html";
import type { Lang } from "./model";

// PDF HELPERS SHARED BY THE FALCON AND MACHIAVELLIAN REPORTS (the shared kit in html.ts is not edited): table blocks that paginate, markdown cells turned to text, the likelihood/confidence map, the outcome tree and the relationship ring as inline SVG. Each function returns ONE top-level block (the PDF builder paginates by body children).
/** A markdown cell as plain text: links keep their words, bold and code marks go, fact references stay. */
export const mdText = (s: unknown) => String(s ?? "").replace(/\[([^\]]+)\]\((?:https?:[^)\s]+)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/[`]+/g, "").replace(/\s+/g, " ").trim();
/** A table cell: plain text (escaped, markdown flattened) or ready HTML that the caller has escaped. */
export type Cell = string | { html: string };
const td = (c: Cell, i: number) => (typeof c === "string" ? `<td${i === 0 ? ` style="font-weight:600"` : ""}>${esc(mdText(c)) || "–"}</td>` : `<td>${c.html}</td>`);
/** One table block. The first column is bold. */
export const dataTable = (head: string[], rows: Cell[][], w?: string[]) => (rows.length ? `<table class="tbl"><thead><tr>${head.map((h, i) => `<th${w?.[i] ? ` style="width:${w[i]}"` : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map(td).join("")}</tr>`).join("")}</tbody></table>` : "");
/** A long table split into blocks of `per` rows (each with its header), so the builder can break the page between them. */
export const tablePaged = (head: string[], rows: Cell[][], per = 8, w?: string[]): string[] => { const out: string[] = []; for (let i = 0; i < rows.length; i += per) out.push(dataTable(head, rows.slice(i, i + per), w)); return out; };
export const pill = (text: string, color: string) => tag(text, color, { sm: true });

const T = (x: number, y: number, t: string, o: { size?: number; weight?: number; fill?: string; anchor?: string } = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 9}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? "start"}">${esc(t)}</text>`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const wrap2 = (t: string, n: number): [string, string] => { if (t.length <= n) return [t, ""]; const sp = t.lastIndexOf(" ", n); const cut = sp > n * 0.4 ? sp : n; const rest = t.slice(cut).trim(); return [t.slice(0, cut).trim(), clip(rest, n)]; };

/** Judgments on a map: likelihood (0-100%, across, with the five likelihood zones) against confidence (up), each a numbered dot in the colour of its own status; a judgment whose words give no likelihood or confidence is listed in `unplaced` by the caller, not drawn. */
export function likelihoodMapSvg(items: { n: number; pct: number | null; conf: "high" | "moderate" | "low" | null; color: string }[], L: Lang): string {
  const W = 580, H = 176, x0 = 104, x1 = W - 10, y0 = 8, rh = 42; const xs = (p: number) => x0 + ((x1 - x0) * Math.max(0, Math.min(100, p))) / 100; const rows = ["high", "moderate", "low"] as const;
  const zones: [number, number, string, string][] = [[0, 20, "#fbe3e7", L === "ar" ? "مستبعد جدًا" : "very unlikely"], [20, 45, "#fdf0d9", L === "ar" ? "مستبعد" : "unlikely"], [45, 55, "#eef1f5", L === "ar" ? "متكافئ" : "even"], [55, 80, "#e8f3ee", L === "ar" ? "مرجح" : "likely"], [80, 100, "#d6efe3", L === "ar" ? "مرجح جدًا" : "very likely"]];
  let g = zones.map(([a, b, c, lab]) => `<rect x="${xs(a)}" y="${y0}" width="${xs(b) - xs(a)}" height="${rh * 3}" fill="${c}"/>${T((xs(a) + xs(b)) / 2, y0 + rh * 3 + 12, lab, { size: 8, fill: MUTE, anchor: "middle" })}`).join("");
  rows.forEach((r, k) => { g += `<line x1="${x0}" x2="${x1}" y1="${y0 + k * rh}" y2="${y0 + k * rh}" stroke="#d6dce4"/>${T(x0 - 6, y0 + k * rh + rh / 2 + 3, L === "ar" ? { high: "ثقة مرتفعة", moderate: "ثقة معتدلة", low: "ثقة منخفضة" }[r] : `${r} confidence`, { size: 8.5, fill: MUTE, anchor: "end" })}`; }); g += `<line x1="${x0}" x2="${x1}" y1="${y0 + 3 * rh}" y2="${y0 + 3 * rh}" stroke="#d6dce4"/>`;
  for (const r of rows) { let last = -99; for (const it of items.filter((x) => x.conf === r && x.pct != null).sort((a, z) => (a.pct ?? 0) - (z.pct ?? 0))) { let cx = Math.max(xs(it.pct ?? 0), last + 20); cx = Math.min(cx, x1 - 10); last = cx; const cy = y0 + rows.indexOf(r) * rh + rh / 2; g += `<circle cx="${cx}" cy="${cy}" r="9" fill="${it.color}"/>${T(cx, cy + 3.5, String(it.n), { size: 9.5, weight: 700, fill: "#fff", anchor: "middle" })}`; } }
  return `<div class="fig"><svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr">${g}</svg></div>`;
}

export const BRANCH_C: Record<string, string> = { favourable: OK, adverse: RISK, neutral: "#6b7280", baseline: C2, shock: WARN };
/** The outcome tree: a directed graph laid out by depth (parents on the left), every node a small box coloured by its branch with its id, stage, horizon, a clipped outcome and confidence; converging paths share a node. The full words of every node belong in a table beside it. */
export function treeSvg(nodes: PathNode[], o: { L: Lang; stage: (s: string) => string; branch: (s: string) => string; conf: (s: string) => string }): string {
  if (!nodes.length) return ""; const pos = new Map(layoutTree(nodes).map((p) => [p.id, p])); const w = 158, h = 56, gx = 34, gy = 9;
  const cols = Math.max(...[...pos.values()].map((p) => p.depth)) + 1, rows = Math.max(...[...pos.values()].map((p) => p.row)) + 1; const vw = cols * (w + gx) - gx + 4, vh = rows * (h + gy) + 2; const xy = (id: string) => { const p = pos.get(id)!; return { x: 2 + p.depth * (w + gx), y: 1 + p.row * (h + gy) }; };
  let g = nodes.flatMap((n) => n.parents.filter((p) => pos.has(p) && p !== n.id).map((p) => { const a = xy(p), b = xy(n.id); const x1 = a.x + w, y1 = a.y + h / 2, x2 = b.x, y2 = b.y + h / 2; return `<path d="M${x1},${y1} C${x1 + gx / 2},${y1} ${x2 - gx / 2},${y2} ${x2},${y2}" fill="none" stroke="${BRANCH_C[n.branch ?? "neutral"] ?? MUTE}" stroke-width="1.4" stroke-opacity=".75"/>`; })).join("");
  for (const n of nodes) { const { x, y } = xy(n.id); const c = BRANCH_C[n.branch ?? "neutral"] ?? MUTE; const [l1, l2] = wrap2(n.outcome, 33);
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#f6f9fc" stroke="#cfd6df"/><rect x="${x}" y="${y}" width="4" height="${h}" rx="2" fill="${c}"/>${T(x + 10, y + 12, `${n.id}${n.stage ? ` ${o.stage(n.stage)}` : ""}${n.horizon ? ` · ${clip(n.horizon, 14)}` : ""}`, { size: 8, weight: 700, fill: c })}${T(x + 10, y + 26, l1, { size: 8.5 })}${l2 ? T(x + 10, y + 37, l2, { size: 8.5 }) : ""}${n.confidence ? T(x + w - 6, y + h - 5, o.conf(n.confidence), { size: 7.5, fill: n.confidence === "high" ? OK : n.confidence === "low" ? RISK : WARN, anchor: "end" }) : ""}`; }
  const used = Object.keys(BRANCH_C).filter((k) => nodes.some((n) => n.branch === k)); const legend = used.length ? `<div class="legend">${used.map((k) => `<span style="color:${BRANCH_C[k]}">■</span> ${esc(o.branch(k))}`).join(" &nbsp; ")}</div>` : "";
  return `<div class="fig"><svg width="100%" viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr;max-width:${Math.min(740, vw * 1.1)}px">${g}</svg>${legend}</div>`;
}

export const LINK_C: Record<string, string> = { documented: OK, alleged: WARN, uncertain: "#6b7280" }; const DASH: Record<string, string> = { documented: "", alleged: "6 4", uncertain: "2 4" };
/** The relationship map: the actors on a ring and each link drawn by its status (solid documented, dashed alleged, dotted uncertain), with the status named on the line and in the legend. */
export function ringMapSvg(links: { from: string; to: string; status: "documented" | "alleged" | "uncertain" | null }[], word: (s: string) => string): string {
  const names = [...new Set(links.flatMap((l) => [l.from, l.to]).filter(Boolean))].slice(0, 14); if (!names.length) return ""; const W = 560, H = 330, cx = W / 2, cy = H / 2, R = 118;
  const pos = new Map(names.map((n, i) => { const a = (i / names.length) * Math.PI * 2 - Math.PI / 2; return [n, { x: cx + Math.cos(a) * R * 1.35, y: cy + Math.sin(a) * R }]; }));
  let g = links.map((l) => { const a = pos.get(l.from), b = pos.get(l.to); if (!a || !b || !l.status) return ""; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${LINK_C[l.status]}" stroke-width="${l.status === "documented" ? 2 : 1.5}"${DASH[l.status] ? ` stroke-dasharray="${DASH[l.status]}"` : ""}/>${T((a.x + b.x) / 2, (a.y + b.y) / 2 - 3, word(l.status), { size: 7.5, fill: LINK_C[l.status], anchor: "middle" })}`; }).join("");
  g += names.map((n) => { const p = pos.get(n)!; return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${ACC}"/>${T(p.x, p.y + (p.y < cy ? -10 : 16), clip(n, 26), { size: 9, anchor: "middle" })}`; }).join("");
  const legend = (["documented", "alleged", "uncertain"] as const).filter((k) => links.some((l) => l.status === k)).map((k) => `<span style="color:${LINK_C[k]}">━</span> ${esc(word(k))}`).join(" &nbsp; ");
  return `<div class="fig"><svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr;max-width:560px">${g}</svg>${legend ? `<div class="legend">${legend}</div>` : ""}</div>`;
}
