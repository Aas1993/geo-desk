import { CONF_W, STANDING_W, VERDICT_W, type B, type Conf, type Grade, type Lang, type ReportHead } from "./model";

// THE PDF KIT: the same visuals as the screen kit (src/components/report/kit.tsx), as escaped HTML strings with inline SVG and CSS, for the PDF builder (src/lib/pdf.ts). The builder places page breaks between the top-level children of <body>, so every function here returns ONE top-level block (a div, an h2 or an svg wrapper) and a long list is split into several blocks by the caller. A pill needs an explicit height and line-height or html2canvas draws its text off-centre: every pill here has both.
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const INK = "#0b2540", MUTE = "#5b6572", OK = "#0e9f6e", WARN = "#b8741a", RISK = "#d92d4a", ACC = "#0a7ea4", C2 = "#6d4bd8", LINE = "#cfd6df", TRACK = "#e5e9ef";
export const PAL = [ACC, C2, OK, WARN, "#db2777", "#ea580c", "#0284c7", "#65a30d", "#9333ea"];
export const GRADE_C: Record<string, string> = { A: OK, B: OK, C: WARN, D: RISK };
export const CONF_C: Record<string, string> = { high: OK, moderate: WARN, low: RISK };
export const LEVEL_C: Record<string, string> = { high: RISK, medium: WARN, low: OK };
export const POS_C: Record<string, string> = { deepen: OK, staged: ACC, hedge: WARN, hold: "#6b7280" };
export const scoreC = (n: number) => (n >= 75 ? OK : n >= 40 ? WARN : RISK);
export const colorOf = (key: string) => { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };
export const pick = (L: Lang) => (b: B) => b[L];

/** The stylesheet of every illustrated report. Append it to the page's own styles. */
export const REPORT_CSS = `.cards,.cards *,.bands,.bands *,.stats,.stats *,.hero,.hero *,.card,.band,.stat,.note,.flag,.angles,.angles *,.scn{box-sizing:border-box}.kick{font-weight:700;letter-spacing:.08em;font-size:9px;color:${MUTE};text-transform:uppercase}[dir=rtl] .kick{letter-spacing:0}`
 + `.hero{display:flex;gap:16px;align-items:center;border:1px solid ${LINE};border-radius:12px;padding:12px 14px;background:#f6f9fc;margin:6px 0}.hero .g{text-align:center;width:128px;flex:none}.hero .cap{font-size:10px;color:${MUTE}}.hero .m{flex:1;min-width:0}.hero .big{font-size:25px;font-weight:700;line-height:1.15;margin:2px 0}.hero .lead{font-size:12.5px;line-height:1.4;color:#111;margin:3px 0}`
 + `.tag{display:inline-block;border-radius:99px;padding:0 9px;height:17px;line-height:17px;font-size:10px;font-weight:700;color:#fff;vertical-align:middle;white-space:nowrap}.tag.sm{height:15px;line-height:15px;font-size:9px;padding:0 7px}.tag.out{background:#e9edf2!important}`
 + `.gr{display:inline-block;min-width:24px;height:22px;line-height:22px;text-align:center;border-radius:6px;padding:0 6px;font-weight:700;color:#fff;font-size:13px;vertical-align:middle}`
 + `.chips{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px;margin-top:6px}.chips .gg{display:flex;align-items:center;gap:5px}`
 + `.stats{display:flex;gap:8px;margin:8px 0}.stat{flex:1;min-width:0;border:1px solid ${LINE};border-radius:10px;padding:7px 9px;background:#fff}.stat b{display:block;font-size:19px;line-height:1.15}.stat span{font-size:9.5px;color:${MUTE}}`
 + `.meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:9.5px;color:${MUTE};margin:2px 0 6px}.meta b{color:#222}`
 + `.cards{display:flex;flex-wrap:wrap;gap:8px;margin:5px 0}.card{border:1px solid ${LINE};border-radius:10px;padding:8px 10px;background:#fff;flex:1 1 calc(50% - 8px);min-width:0}.card.w3{flex-basis:calc(33.3% - 8px)}.card.w1{flex-basis:100%}.card.dash{border-style:dashed;background:#fafbfc}.card .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;font-weight:700;color:${INK}}.card .hd span:first-child{flex:1;min-width:0}.card p{font-size:10.5px;margin:3px 0}.card .k{color:${MUTE};font-weight:600}.card ul{margin:3px 0;padding-inline-start:15px}.card li{margin:1px 0;font-size:10.5px}`
 + `.bar{display:flex;align-items:center;gap:6px;margin:3px 0}.bar .lb{flex:none;max-width:42%;font-size:10px;color:#333}.trk{flex:1;height:8px;background:${TRACK};border-radius:4px;overflow:hidden;display:block}.trk i{display:block;height:100%}.bar b{font-size:9.5px;min-width:30px;text-align:end;color:#333;font-weight:600}`
 + `.flag{border:1px solid #f0c4cb;border-inline-start:5px solid ${WARN};border-radius:8px;padding:6px 9px;margin:5px 0;background:#fff7f8}.flag.crit{border-inline-start-color:${RISK}}.flag .ask{color:#0b7a55}`
 + `.note{border:1px solid ${LINE};border-inline-start:5px solid ${ACC};border-radius:8px;padding:6px 10px;margin:6px 0;background:#f6f9fc}.note.ok{border-inline-start-color:${OK}}.note.warn{border-inline-start-color:${WARN};background:#fff9ee}.note.risk{border-inline-start-color:${RISK};background:#fff7f8}.note h3{margin:0 0 2px}`
 + `.bands{display:flex;gap:8px;margin:5px 0}.band{flex:1;min-width:0;border:1px solid ${LINE};border-radius:10px;padding:7px 9px;background:#fff}.band h3{margin:0 0 3px;font-size:11.5px}.band ul{margin:3px 0;padding-inline-start:14px}.band li{margin:3px 0;font-size:10.5px}`
 + `.tl{border-inline-start:2px solid ${LINE};margin-inline-start:6px;padding-inline-start:12px}.tl .e{margin:0 0 8px;position:relative}.tl .e::before{content:"";position:absolute;inset-inline-start:-19px;top:3px;width:9px;height:9px;border-radius:50%;background:#fff;border:2px solid ${INK}}.tl .it{background:#f6f9fc;border-radius:6px;padding:4px 8px;margin:3px 0}`
 + `.scale{display:flex;gap:6px;margin-top:8px}.scale>div{flex:1;text-align:center}.scale .k{min-height:20px}.scale .k b{display:inline-block;min-width:20px;height:18px;line-height:18px;border-radius:99px;padding:0 6px;color:#fff;font-size:10px;margin:0 1px;text-align:center}.scale .t{height:7px;border-radius:4px;margin:3px 0}.scale span{font-size:10.5px;font-weight:600}.legend{font-size:9.5px;color:${MUTE};margin-top:5px}.legend b{color:#333}`
 + `.sub{color:${MUTE};font-size:10px}.fig{margin:6px 0;text-align:center}.fig svg{max-width:100%;height:auto}.hr2{border:0;border-top:2px solid ${INK};margin:14px 0 2px}`
 + `.tbl{border-collapse:collapse;width:100%;margin:6px 0;font-size:10px}.tbl th,.tbl td{border:1px solid #bbb;padding:3px 5px;vertical-align:top;text-align:start}.tbl th{background:#e9eef5}`;

export const tag = (text: string, color: string, o: { sm?: boolean; out?: boolean } = {}) => `<span class="tag${o.sm ? " sm" : ""}${o.out ? " out" : ""}" style="${o.out ? `color:${color}` : `background:${color}`}">${esc(text)}</span>`;
export const grade = (g: Grade | string) => `<span class="gr" style="background:${GRADE_C[g] ?? MUTE}">${esc(g)}</span>`;
export const h2 = (text: string) => `<h2>${esc(text)}</h2>`;
export const note = (html: string, tone: "" | "ok" | "warn" | "risk" = "") => `<div class="note${tone ? ` ${tone}` : ""}">${html}</div>`;
export const bar = (share: number, color: string, text: string, label = "") => `<div class="bar">${label ? `<span class="lb">${esc(label)}</span>` : ""}<span class="trk"><i style="width:${Math.round(Math.max(0, Math.min(1, share)) * 100)}%;background:${color}"></i></span><b>${esc(text)}</b></div>`;
/** Several bars as one block (one row per entry). */
export const barBlock = (rows: { label: string; share: number; color: string; text: string }[]) => `<div class="card w1">${rows.map((r) => bar(r.share, r.color, r.text, r.label)).join("")}</div>`;
export const stat = (n: string | number, label: string, color: string) => `<div class="stat"><b style="color:${color}">${esc(String(n))}</b><span>${esc(label)}</span></div>`;
export const statRow = (xs: { n: string | number; label: string; color: string }[]) => `<div class="stats">${xs.map((x) => stat(x.n, x.label, x.color)).join("")}</div>`;
export const gauge = (v: number, label: string, sub = "") => { const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, v)); return `<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${TRACK}" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${scoreC(p)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${((c * p) / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="53" text-anchor="middle" font-size="24" font-weight="700" fill="${INK}">${p}</text>${sub ? `<text x="50" y="68" text-anchor="middle" font-size="8" fill="${MUTE}">${esc(sub)}</text>` : ""}</svg><div class="cap">${esc(label)}</div>`; };
/** A card: a coloured top edge, a head line with an optional pill, and a body of ready HTML. */
export const card = (o: { title: string; pill?: string; color?: string; body?: string; wide?: 1 | 3 | 2; dash?: boolean }) => `<div class="card${o.wide === 3 ? " w3" : o.wide === 1 ? " w1" : ""}${o.dash ? " dash" : ""}" style="${o.color ? `border-top:3px solid ${o.color}` : ""}"><div class="hd"><span>${esc(o.title)}</span>${o.pill ?? ""}</div>${o.body ?? ""}</div>`;
/** Cards that sit side by side and wrap; one block. */
export const cards = (xs: string[]) => `<div class="cards">${xs.join("")}</div>`;
/** Cards in separate blocks of `per` so the builder can break the page between them. */
export const cardsPaged = (xs: string[], per = 4) => { const out: string[] = []; for (let i = 0; i < xs.length; i += per) out.push(cards(xs.slice(i, i + per))); return out; };
export const kv = (rows: [string, string | undefined | null][]) => rows.filter(([, v]) => v != null && String(v).trim() !== "").map(([k, v]) => `<p><span class="k">${esc(k)}:</span> ${esc(v)}</p>`).join("");
export const list = (xs: string[]) => (xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
export const bands = (cols: { title: string; color: string; count?: number; html: string }[]) => `<div class="bands">${cols.map((c) => `<div class="band" style="border-top:3px solid ${c.color}"><h3 style="color:${c.color}">${esc(c.title)}${c.count != null ? ` (${c.count})` : ""}</h3>${c.html}</div>`).join("")}</div>`;
export const timeline = (xs: { when: string; items: string[] }[]) => `<div class="tl">${xs.map((x) => `<div class="e"><b>${esc(x.when)}</b>${x.items.map((i) => `<div class="it">${i}</div>`).join("")}</div>`).join("")}</div>`;
export const flagCard = (f: { flag: string; severity: "critical" | "serious"; who: B; where?: string; why?: string; ask?: string }, L: Lang) => `<div class="flag${f.severity === "critical" ? " crit" : ""}"><b style="color:${f.severity === "critical" ? RISK : WARN}">${esc(f.severity === "critical" ? (L === "ar" ? "حرج" : "CRITICAL") : L === "ar" ? "جاد" : "SERIOUS")}</b> ${tag(f.who[L], C2, { sm: true })}${f.where ? ` ${tag(f.where, MUTE, { sm: true })}` : ""}<br><b>${esc(f.flag)}</b>${f.why ? `<p><span class="k">${esc(L === "ar" ? "لماذا يهم الإمارات: " : "Why it matters to the UAE: ")}</span>${esc(f.why)}</p>` : ""}${f.ask ? `<p class="ask">→ ${esc(L === "ar" ? "قبل الاعتماد عليه: " : "Before relying on it: ")}${esc(f.ask)}</p>` : ""}</div>`;
export const flagBlocks = (head: ReportHead, L: Lang): string[] => (head.flags.length ? [h2(L === "ar" ? "أعلام حمراء رفعها المدققون المستقلون" : "Red flags raised by the independent auditors"), ...head.flags.map((f) => flagCard(f, L))] : []);

/** The auditors' verdicts, the quality grade and the confidence as one row of pills. */
export function chipRow(head: ReportHead, L: Lang): string {
  const out: string[] = [];
  if (head.grade) out.push(`<span class="gg"><span class="sub">${esc(L === "ar" ? "التقدير" : "Quality")}</span>${grade(head.grade)}${head.score != null ? `<span class="sub">${head.score}/100</span>` : ""}</span>`);
  if (head.confidence) out.push(tag(`${L === "ar" ? "الثقة" : "confidence"}: ${CONF_W[head.confidence][L]}`, CONF_C[head.confidence]));
  for (const v of head.verdicts) out.push(tag(`${v.who[L]}: ${VERDICT_W[v.verdict][L]}${v.standing ? ` · ${STANDING_W[v.standing][L]}` : ""}`, v.verdict === "approve" ? OK : v.verdict === "revise" ? WARN : RISK));
  if (!head.verdicts.length) out.push(tag(L === "ar" ? "لم يُراجع" : "not reviewed", MUTE, { out: true }));
  return `<div class="chips">${out.join("")}</div>`;
}
/** The cover: kicker, the call (big), the bottom line, the chips, and optionally a gauge on the side. One block. */
export function hero(o: { kicker: string; title: string; titleColor?: string; bottomLine?: string; gaugeHtml?: string; chips?: string; extra?: string; meta?: string }): string {
  return `<div class="hero">${o.gaugeHtml ? `<div class="g">${o.gaugeHtml}</div>` : ""}<div class="m"><div class="kick">${esc(o.kicker)}</div>${o.title ? `<div class="big" style="color:${o.titleColor ?? INK}">${esc(o.title)}</div>` : ""}${o.bottomLine ? `<p class="lead">${esc(o.bottomLine)}</p>` : ""}${o.chips ?? ""}${o.extra ?? ""}</div></div>${o.meta ?? ""}`;
}
export const metaRow = (xs: [string, string][]) => `<div class="meta">${xs.filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join("")}</div>`;
/** The four courses on one scale, each reader placed where it stands. */
export function postureScale(readers: { short: string; name: string; v: string | null }[], words: Record<string, string>, L: Lang): string {
  const ORDER = ["hold", "hedge", "staged", "deepen"];
  return `<div class="scale">${ORDER.map((p) => { const here = readers.filter((r) => r.v === p); return `<div><div class="k">${here.map((r) => `<b style="background:${POS_C[p]}">${esc(r.short)}</b>`).join("")}</div><div class="t" style="background:${here.length ? POS_C[p] : TRACK}"></div><span style="color:${here.length ? POS_C[p] : MUTE}">${esc(words[p] ?? p)}</span></div>`; }).join("")}</div><div class="legend">${readers.map((r) => `<b>${esc(r.short)}</b> ${esc(r.name)}${r.v ? "" : esc(L === "ar" ? " (غير محفوظ)" : " (not on file)")}`).join(" &nbsp; ")}</div>`;
}

// ---- SVG figures. Each is wrapped in a div so the builder sees one block; text inside SVG is drawn by the browser, so Arabic shapes correctly.
const svgText = (x: number, y: number, t: string, o: { size?: number; weight?: number; fill?: string; anchor?: string } = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 10}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? "start"}">${esc(t)}</text>`;
/** A three-by-three matrix of likelihood (across) against impact (up) with a numbered dot for each placed item and the legend beside it. Items whose likelihood the text does not state go in `unplaced`. */
export function matrixSvg(items: { n: number; l: 0 | 1 | 2; i: 1 | 2 | 3; color?: string }[], L: Lang): string {
  const W = 270, H = 220, x0 = 52, y0 = 10, cw = 70, ch = 56; const cell = (l: number, i: number) => { const sc = l + 1 + i; return sc >= 5 ? "#fbe3e7" : sc >= 4 ? "#fdf0d9" : "#e3f4ec"; };
  let g = ""; for (let l = 0; l < 3; l++) for (let i = 1; i <= 3; i++) g += `<rect x="${x0 + l * cw}" y="${y0 + (3 - i) * ch}" width="${cw - 3}" height="${ch - 3}" rx="6" fill="${cell(l, i)}"/>`;
  const slot = new Map<string, number>(); for (const it of items) { const k = `${it.l}-${it.i}`; const n = slot.get(k) ?? 0; slot.set(k, n + 1); const cx = x0 + it.l * cw + 14 + (n % 3) * 20, cy = y0 + (3 - it.i) * ch + 16 + Math.floor(n / 3) * 20; g += `<circle cx="${cx}" cy="${cy}" r="9" fill="${it.color ?? INK}"/>${svgText(cx, cy + 3.5, String(it.n), { size: 9.5, weight: 700, fill: "#fff", anchor: "middle" })}`; }
  const lab = L === "ar" ? ["منخفض", "متوسط", "مرتفع"] : ["Low", "Medium", "High"]; for (let k = 0; k < 3; k++) { g += svgText(x0 + k * cw + cw / 2 - 2, y0 + 3 * ch + 12, lab[k], { size: 9, fill: MUTE, anchor: "middle" }); g += svgText(x0 - 5, y0 + (2 - k) * ch + ch / 2 + 1, lab[k], { size: 9, fill: MUTE, anchor: "end" }); }
  g += svgText(x0 + (3 * cw) / 2, H - 2, L === "ar" ? "الاحتمال ←" : "Likelihood →", { size: 9.5, weight: 600, anchor: "middle" });
  return `<div class="fig"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr">${g}</svg></div>`;
}
/** Horizontal bars on a month axis: one row per item, from its start month to its end month. */
export function ganttSvg(rows: { label: string; start: number; end: number; color: string; tag?: string }[], o: { months: number; step?: number; L: Lang; unit?: string }): string {
  const lab = 210, W = 740, pad = 8, rh = 20, top = 22; const H = top + rows.length * rh + 16; const span = Math.max(1, o.months); const x = (m: number) => lab + ((W - lab - pad) * Math.max(0, Math.min(span, m))) / span; const step = o.step ?? (span > 60 ? 12 : span > 24 ? 6 : 3);
  let g = ""; for (let m = 0; m <= span; m += step) g += `<line x1="${x(m)}" x2="${x(m)}" y1="${top - 4}" y2="${H - 4}" stroke="#e5e9ef"/>${svgText(x(m), top - 8, `${m}`, { size: 8.5, fill: MUTE, anchor: "middle" })}`;
  rows.forEach((r, k) => { const y = top + k * rh; const a = x(r.start), b = Math.max(a + 5, x(r.end)); g += svgText(lab - 6, y + 12, r.label.length > 36 ? `${r.label.slice(0, 35)}…` : r.label, { size: 9.5, anchor: "end" }) + `<rect x="${a}" y="${y + 3}" width="${b - a}" height="12" rx="6" fill="${r.color}"/>`; });
  return `<div class="fig"><svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr">${g}${svgText(W - pad, H - 3, o.unit ?? (o.L === "ar" ? "أشهر" : "months"), { size: 8.5, fill: MUTE, anchor: "end" })}</svg></div>`;
}
/** A simple stacked bar of shares (a segment each), with a legend under it. */
export function stackBar(segs: { label: string; n: number; color: string }[]): string {
  const total = segs.reduce((a, s) => a + s.n, 0); if (!total) return "";
  return `<div class="card w1"><div class="trk" style="height:12px;display:flex">${segs.filter((s) => s.n > 0).map((s) => `<i style="width:${(s.n / total) * 100}%;background:${s.color};display:block;height:100%"></i>`).join("")}</div><div class="legend">${segs.map((s) => `<span style="color:${s.color}">■</span> ${esc(s.label)} <b>${s.n}</b>`).join(" &nbsp; ")}</div></div>`;
}
/** The standard document wrapper for a page that is built wholly from blocks. */
export function reportDoc(o: { title: string; lang: Lang; css: string; blocks: string[] }): string {
  const rtl = o.lang === "ar";
  return `<!doctype html><html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>${o.css}</style></head><body>${o.blocks.join("\n")}</body></html>`;
}
export const confColor = (c: Conf | null | undefined) => (c ? CONF_C[c] : MUTE);
