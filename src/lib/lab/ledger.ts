import type { B, Pt } from "../case/core";
import type { CaseData } from "../case/load";
import { fmtV, fmtVAr, uaeHistory, type HSeries, type History } from "../desk/history";
import { ACC, INK, MUTE, OK, PAL, RISK, WARN, bar, card, cards, esc, h2, note, statRow, tag } from "../report/html";

// THE INFLUENCE LEDGER OVER TIME: the UAE's footprint in one country, read from held data only. Instruments (footprint, headroom) and rival trade shares are a present reading; the UAE's own series (trade, share of exports, investment stocks, FDI, UN voting distance) are real time series; the monthly capture is a short snapshot series that grows by one point a month. What is not held over time is listed, never filled in.
export type Lang = "en" | "ar";
export const CAP = 12; // minimum months before the capture series is drawn as a line
const pick = (L: Lang, b: B) => (L === "ar" ? b.ar : b.en);
const b = (en: string, ar: string): B => ({ en, ar });

// ---- series maths
export const sortPts = (pts: Pt[]): Pt[] => [...pts].filter((p) => isFinite(p[0]) && isFinite(p[1])).sort((a, z) => a[0] - z[0]);
/** The series indexed to its first non-zero value = 100, so series in different units draw on one scale. Empty when there is no non-zero start. */
export function indexTo100(pts: Pt[]): Pt[] { const s = sortPts(pts); const base = s.find((p) => p[1] !== 0); return base ? s.map(([y, v]) => [y, (v / base[1]) * 100] as Pt) : []; }
/** Year-on-year change in percent between consecutive observations (a gap of years is kept as a longer step); a zero base gives no figure. */
export function yoy(pts: Pt[]): { y: number; from: number; pct: number }[] { const s = sortPts(pts); const out: { y: number; from: number; pct: number }[] = []; for (let i = 1; i < s.length; i++) if (s[i - 1][1] !== 0) out.push({ y: s[i][0], from: s[i - 1][0], pct: ((s[i][1] - s[i - 1][1]) / Math.abs(s[i - 1][1])) * 100 }); return out; }
/** The largest single move in any series (by percent, between consecutive observations), to name in the summary line. Index series (the UN voting distance) are skipped: they sit near zero, where a percent move means nothing. */
export function biggestMove(series: HSeries[]): { id: string; from: number; to: number; pct: number } | null {
  let best: { id: string; from: number; to: number; pct: number } | null = null;
  for (const s of series) if (s.kind !== "index") for (const m of yoy(s.pts)) if (!best || Math.abs(m.pct) > Math.abs(best.pct)) best = { id: s.id, from: m.from, to: m.y, pct: m.pct };
  return best;
}
export type Dot = { x: number; y: number; kinds: ("first" | "last" | "peak" | "trough")[]; pt: Pt };
export type Geom = { path: string; dots: Dot[]; x0: number; x1: number; lo: number; hi: number; w: number; h: number; zeroY: number | null };
/** Chart geometry for one series: the line path in pixel space and the marked points (first, last, peak, trough; a point that is two of them is one dot). */
export function geom(pts0: Pt[], w = 220, h = 70, pad = 6): Geom | null {
  const pts = sortPts(pts0); if (pts.length < 2) return null; const xs = pts.map((p) => p[0]); const vs = pts.map((p) => p[1]); const x0 = xs[0], x1 = xs[xs.length - 1]; let lo = Math.min(...vs), hi = Math.max(...vs); if (lo === hi) { lo -= 1; hi += 1; }
  const px = (y: number) => pad + ((y - x0) / Math.max(1, x1 - x0)) * (w - 2 * pad); const py = (v: number) => h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(" ");
  const peak = pts.reduce((a, p) => (p[1] > a[1] ? p : a)); const trough = pts.reduce((a, p) => (p[1] < a[1] ? p : a)); const marks: [Dot["kinds"][number], Pt][] = [["first", pts[0]], ["last", pts[pts.length - 1]], ["peak", peak], ["trough", trough]];
  const dots: Dot[] = []; for (const [k, p] of marks) { const f = dots.find((d) => d.pt[0] === p[0]); if (f) { if (!f.kinds.includes(k)) f.kinds.push(k); } else dots.push({ x: px(p[0]), y: py(p[1]), kinds: [k], pt: p }); }
  return { path, dots, x0, x1, lo, hi, w, h, zeroY: lo < 0 && hi > 0 ? py(0) : null };
}
export const DOT_C: Record<Dot["kinds"][number], string> = { first: MUTE, last: ACC, peak: OK, trough: RISK };
export const seriesColor = (i: number) => PAL[i % PAL.length];
/** A figure of a series value in the display language (the unit rule of the history layer: dollars, percent or an index). */
export const fmtSeries = (s: HSeries, v: number, L: Lang) => (L === "ar" ? fmtVAr(s, v) : fmtV(s, v));
/** The series as drawn: raw, or indexed to its first value = 100. */
export const drawn = (s: HSeries, index: boolean): Pt[] => (index ? indexTo100(s.pts) : sortPts(s.pts));
/** One chart as an inline SVG string (used for the PDF; the page draws the same geometry with React). */
export function chartSvg(pts: Pt[], color: string, w = 220, h = 70): string {
  const g = geom(pts, w, h); if (!g) return "";
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr">${g.zeroY != null ? `<line x1="0" x2="${w}" y1="${g.zeroY.toFixed(1)}" y2="${g.zeroY.toFixed(1)}" stroke="#cfd6df" stroke-dasharray="3 3"/>` : ""}<path d="${g.path}" fill="none" stroke="${color}" stroke-width="1.8"/>${g.dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="3" fill="${DOT_C[d.kinds.includes("peak") ? "peak" : d.kinds.includes("trough") ? "trough" : d.kinds.includes("last") ? "last" : "first"]}"/>`).join("")}<text x="2" y="${h - 1}" font-size="8" fill="${MUTE}">${g.x0}</text><text x="${w - 2}" y="${h - 1}" font-size="8" fill="${MUTE}" text-anchor="end">${g.x1}</text></svg>`;
}
/** The combined chart of every series indexed to 100 at its own first year (one line per series). */
export function combinedSvg(series: HSeries[], w = 620, h = 170): string {
  const lines = series.map((s, i) => ({ s, i, pts: indexTo100(s.pts) })).filter((x) => x.pts.length >= 2); if (!lines.length) return "";
  const all = lines.flatMap((x) => x.pts); const x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0])); const lo = Math.min(...all.map((p) => p[1]), 100), hi = Math.max(...all.map((p) => p[1]), 100); const pad = 14;
  const px = (y: number) => pad + ((y - x0) / Math.max(1, x1 - x0)) * (w - 2 * pad - 20); const py = (v: number) => h - pad - ((v - lo) / Math.max(1, hi - lo)) * (h - 2 * pad);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="direction:ltr;max-width:100%"><line x1="${pad}" x2="${w - pad}" y1="${py(100).toFixed(1)}" y2="${py(100).toFixed(1)}" stroke="#cfd6df" stroke-dasharray="3 3"/>${lines.map((x) => `<path d="${x.pts.map((p, k) => `${k ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="${seriesColor(x.i)}" stroke-width="1.6"/>`).join("")}<text x="${pad}" y="10" font-size="9" fill="${MUTE}">${Math.round(hi)}</text><text x="${pad}" y="${h - 2}" font-size="9" fill="${MUTE}">${x0}</text><text x="${w - pad - 20}" y="${h - 2}" font-size="9" fill="${MUTE}" text-anchor="end">${x1}</text></svg>`;
}

// ---- instruments and rivals (a present reading)
export type InstrBar = { id: string; name: string; footprint: number | null; headroom: number | null; intensity: string; basis: string };
export const instrumentBars = (d: CaseData, L: Lang): InstrBar[] => d.instruments.map((x) => ({ id: x.id, name: pick(L, x.name), footprint: x.footprint, headroom: x.headroom, intensity: pick(L, x.intensity), basis: pick(L, x.basis) }));
export type RivalRow = { iso: string; name: string; share: number; isUae: boolean };
export type RivalLedger = { rows: RivalRow[]; uaeShare: number | null; uaeRank: number | null; of: number | null; leader: RivalRow | null; gap: number | null };
/** The UAE against the rivals in the country's trade (one held year): the rival list, the UAE row placed by share, the leader and the gap to it. */
export function rivalLedger(d: CaseData, nameOf: (iso: string) => string): RivalLedger {
  const rows: RivalRow[] = d.rivals.map((r) => ({ iso: r.iso, name: nameOf(r.iso), share: r.share, isUae: r.iso === "ARE" }));
  if (d.uaeRank && !rows.some((r) => r.isUae)) rows.push({ iso: "ARE", name: nameOf("ARE"), share: d.uaeRank.share, isUae: true });
  rows.sort((a, z) => z.share - a.share); const uae = rows.find((r) => r.isUae) ?? null; const leader = rows[0] ?? null;
  return { rows, uaeShare: uae?.share ?? null, uaeRank: d.uaeRank?.rank ?? null, of: d.uaeRank?.of ?? null, leader, gap: uae && leader && !leader.isUae ? Math.round((leader.share - uae.share) * 10) / 10 : null };
}

// ---- the monthly capture (a snapshot series that grows by a point a month)
export const CAPTURE: { id: string; name: B }[] = [
  { id: "ofac", name: b("OFAC sanctions-list entries naming the country", "إدراجات قوائم عقوبات أوفاك التي تسمي الدولة") }, { id: "un", name: b("UN sanctions-list entries", "إدراجات قوائم عقوبات الأمم المتحدة") }, { id: "dest", name: b("Active or seasonal UAE flight destinations", "وجهات الطيران الإماراتية النشطة أو الموسمية") },
  { id: "deals12", name: b("UAE deal headlines in the last 12 months", "عناوين الصفقات الإماراتية خلال 12 شهرًا") }, { id: "visits12", name: b("Visits and engagements in the last 12 months", "الزيارات والمشاركات خلال 12 شهرًا") }, { id: "ransom90", name: b("Ransomware leak-site postings in 90 days", "منشورات مواقع تسريب الفدية خلال 90 يومًا") },
];
export type CapRow = { id: string; name: B; values: number[]; latest: number | null; months: number; line: boolean };
export function captureRows(c: CaseData["capture"]): CapRow[] {
  if (!c) return []; const n = c.months.length;
  return CAPTURE.map((k) => { const v = c.series[k.id] ?? []; return { id: k.id, name: k.name, values: v, latest: v.length ? v[v.length - 1] : null, months: n, line: n >= 2 }; });
}
export const captureSpan = (c: CaseData["capture"]) => (c && c.months.length ? { first: c.months[0], last: c.months[c.months.length - 1], n: c.months.length } : null);

// ---- what is not held over time
export type Gap = { what: string; why: string };
export function notHeld(d: CaseData, h: History, L: Lang): Gap[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const g: Gap[] = [];
  g.push({ what: e("Rivals' trade shares over time", "حصص المنافسين التجارية عبر الزمن"), why: e("Held for one year only (the rivals file); a series would need the partner's mirror trade by year for each rival.", "محفوظة لسنة واحدة فقط (ملف المنافسين)؛ والسلسلة تحتاج تجارة المرآة للشريك لكل منافس بحسب السنة.") });
  g.push({ what: e("Instruments' footprint and headroom over time", "حضور الأدوات ومجال التوسع عبر الزمن"), why: e("A present reading rebuilt from the latest data; no archive of earlier readings exists yet, so they are shown as bars, not lines.", "قراءة حالية تُعاد من أحدث البيانات؛ ولا أرشيف لقراءات سابقة بعد، فتُعرض أعمدة لا خطوطًا.") });
  g.push({ what: e("UAE aid and development funding by year", "التمويل الإماراتي للمساعدات والتنمية بحسب السنة"), why: e("Held as a five-year total reported to OCHA, not by year.", "محفوظ كمجموع خمس سنوات مبلغ عنه لأوتشا لا بحسب السنة.") });
  g.push({ what: e("Services trade and investment flows", "تجارة الخدمات وتدفقات الاستثمار"), why: e("Trade is merchandise only (IMF mirror data) and investment is a stock, not a flow.", "التجارة سلعية فقط (بيانات مرآة) والاستثمار رصيد لا تدفق.") });
  if (!h.series.some((s) => s.id === "outward")) g.push({ what: e("The UAE's investment position in the country", "مركز الاستثمار الإماراتي في الدولة"), why: e("No IMF position is held: unknown, not zero.", "لا يتوافر مركز لدى الصندوق: غير معروف لا صفر.") });
  const sp = captureSpan(d.capture); if (!sp || sp.n < CAP) g.push({ what: e("Monthly signals (sanctions entries, destinations, headlines)", "الإشارات الشهرية (إدراجات العقوبات والوجهات والعناوين)"), why: e(`${sp ? sp.n : 0} monthly snapshot${sp?.n === 1 ? "" : "s"} held${sp ? ` (${sp.first} to ${sp.last})` : ""}; the sources keep no history, so a line needs months to accumulate.`, `${sp ? sp.n : 0} لقطة شهرية محفوظة${sp ? ` (${sp.first} إلى ${sp.last})` : ""}؛ ولا تحتفظ المصادر بتاريخ فيلزم أشهر لتكوين خط.`) });
  return g;
}

// ---- PDF blocks and text
export function ledgerBlocks(d: CaseData, h: History, L: Lang, nameOf: (iso: string) => string, index = false): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const out: string[] = []; const rl = rivalLedger(d, nameOf); const bm = biggestMove(h.series);
  out.push(h2(e("The UAE's influence ledger", "سجل نفوذ الإمارات")), note(`<b>${esc(e("What this is.", "ما هذا."))}</b> ${esc(e("The UAE's footprint and headroom by instrument, its standing against rivals in the country's trade, and its own series over time, from held data only. Instruments and rival shares are a present reading; what is not held over time is listed at the end.", "حضور الإمارات ومجال توسعها بحسب الأداة، ومكانتها أمام المنافسين في تجارة الدولة، وسلاسلها عبر الزمن، من بيانات محفوظة فقط. الأدوات وحصص المنافسين قراءة حالية؛ وما لا يتوافر عبر الزمن مذكور في النهاية."))}`));
  out.push(statRow([{ n: h.series.length, label: e("long series held", "سلاسل طويلة محفوظة"), color: h.series.length ? OK : WARN }, { n: rl.uaeRank != null ? `#${rl.uaeRank}/${rl.of}` : "n/a", label: e("UAE rank in the country's trade", "ترتيب الإمارات في تجارة الدولة"), color: INK }, { n: rl.gap != null ? `${rl.gap} pp` : "n/a", label: e("gap to the leading rival (share)", "الفجوة إلى المنافس الأول (الحصة)"), color: rl.gap ? WARN : OK }, { n: bm ? `${bm.pct >= 0 ? "+" : ""}${bm.pct.toFixed(0)}%` : "n/a", label: bm ? `${e("largest move", "أكبر تحرك")}: ${h.series.find((s) => s.id === bm.id)?.name[L] ?? ""} ${bm.from}-${bm.to}` : e("largest move", "أكبر تحرك"), color: ACC }]));
  if (h.summary.length) out.push(`<ul>${h.summary.map((s) => `<li>${esc(pick(L, s))}</li>`).join("")}</ul>`);
  out.push(h2(e("Instruments: footprint and headroom (0 to 5)", "الأدوات: الحضور ومجال التوسع (0 إلى 5)")), `<div class="card w1">${d.instruments.map((x) => (x.footprint == null ? `<div class="bar"><span class="lb">${esc(pick(L, x.name))}</span><span class="sub">${esc(e("not measured", "غير مقيس"))} · ${esc(pick(L, x.intensity))}</span></div>` : bar(x.footprint / 5, ACC, `${x.footprint.toFixed(1)} · ${e("headroom", "المجال")} ${x.headroom?.toFixed(1) ?? "-"} · ${pick(L, x.intensity)}`, pick(L, x.name)))).join("")}</div>`);
  if (rl.rows.length) out.push(h2(e("The UAE against the rivals in the country's trade", "الإمارات أمام المنافسين في تجارة الدولة")), `<div class="card w1">${rl.rows.slice(0, 10).map((r) => bar(r.share / Math.max(1, rl.rows[0].share), r.isUae ? OK : MUTE, `${r.share.toFixed(1)}%`, `${r.name}${r.isUae ? " ★" : ""}`)).join("")}<p class="sub">${esc(e("Share of the country's imports, one held year; the UAE is starred.", "حصة من واردات الدولة، سنة واحدة محفوظة؛ والإمارات مميزة بنجمة."))}</p></div>`);
  if (h.series.length) {
    out.push(h2(e("The UAE's series over time", "سلاسل الإمارات عبر الزمن")), ...(index ? [`<div class="fig">${combinedSvg(h.series)}</div>`, `<p class="sub">${esc(e("Every series indexed to 100 at its own first year.", "كل سلسلة مفهرسة إلى 100 في سنتها الأولى."))} ${h.series.map((s, i) => `<b style="color:${seriesColor(i)}">${esc(s.name[L])}</b>`).join(" · ")}</p>`] : []));
    const cs = h.series.map((s, i) => card({ title: s.name[L], color: seriesColor(i), body: `<div class="fig">${chartSvg(drawn(s, index), seriesColor(i))}</div><p class="sub">${s.first && s.last ? `${esc(fmtSeries(s, s.first[1], L))} (${s.first[0]}) → ${esc(fmtSeries(s, s.last[1], L))} (${s.last[0]})` : ""}${s.peak ? ` · ${esc(e("peak", "الذروة"))} ${esc(fmtSeries(s, s.peak[1], L))} (${s.peak[0]})` : ""}${s.cagr != null ? ` · ${s.cagr >= 0 ? "+" : ""}${s.cagr.toFixed(1)}%/${e("yr", "سنة")}` : ""}</p>` }));
    for (let i = 0; i < cs.length; i += 4) out.push(cards(cs.slice(i, i + 4)));
    const eras = h.eras.filter((x) => x.eras.some((y) => y.avg != null)); if (eras.length) out.push(`<table class="tbl"><thead><tr><th>${esc(e("Era average", "متوسط الحقبة"))}</th>${eras[0].eras.map((x) => `<th>${esc(pick(L, x.label))}</th>`).join("")}</tr></thead><tbody>${eras.map((x) => { const s = h.series.find((y) => y.id === x.id)!; return `<tr><td>${esc(x.name[L])}</td>${x.eras.map((y) => `<td>${y.avg != null ? esc(fmtSeries(s, y.avg, L)) : "-"}</td>`).join("")}</tr>`; }).join("")}</tbody></table>`);
  }
  const caps = captureRows(d.capture); const sp = captureSpan(d.capture);
  if (caps.length && sp) out.push(h2(e("Monthly signals", "الإشارات الشهرية")), `<table class="tbl"><thead><tr><th>${esc(e("Signal", "الإشارة"))}</th><th>${esc(e("Latest", "الأحدث"))} (${esc(sp.last)})</th><th>${esc(e("Months held", "أشهر محفوظة"))}</th></tr></thead><tbody>${caps.map((r) => `<tr><td>${esc(r.name[L])}</td><td>${r.latest ?? "-"}</td><td>${r.months}</td></tr>`).join("")}</tbody></table>`);
  out.push(h2(e("What is not held over time", "ما لا يتوافر عبر الزمن")), `<div class="card w1 dash">${notHeld(d, h, L).map((g) => `<p>${tag(e("not held", "غير متوافر"), MUTE, { sm: true, out: true })} <b>${esc(g.what)}</b> <span class="sub">${esc(g.why)}</span></p>`).join("")}</div>`);
  if (h.limits.length) out.push(`<p class="sub">${esc(h.limits.map((x) => pick(L, x)).join(" "))}</p>`);
  return out;
}
export function ledgerText(d: CaseData, h: History, L: Lang, nameOf: (iso: string) => string): string {
  const rl = rivalLedger(d, nameOf); const ins = d.instruments.map((x) => `${pick(L, x.name)}: ${x.footprint != null ? `footprint ${x.footprint}/5, headroom ${x.headroom}, ${pick(L, x.intensity)}` : "not measured"}`).join("; ");
  const ser = h.series.map((s) => `${s.name[L]}: ${s.first ? `${fmtSeries(s, s.first[1], L)} (${s.first[0]})` : "n/a"} to ${s.last ? `${fmtSeries(s, s.last[1], L)} (${s.last[0]})` : "n/a"}${s.cagr != null ? `, ${s.cagr.toFixed(1)}%/yr` : ""}`).join("; ");
  return `Influence ledger, ${d.name} (as of ${d.asOf.slice(0, 10)}). Instruments: ${ins}. Rivals' trade shares: ${rl.rows.map((r) => `${r.name} ${r.share}%`).join(", ") || "not held"}${rl.uaeRank != null ? `; UAE rank #${rl.uaeRank} of ${rl.of}` : ""}. Series: ${ser || "none held"}. Not held over time: ${notHeld(d, h, L).map((g) => g.what).join("; ")}.`;
}
export const ledgerHistory = (d: CaseData): History => uaeHistory(d);
