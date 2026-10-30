import { esc, h2, note, statRow, OK, ACC, INK } from "../report/html";

// THE COALITION AND VOTE MAP (Lab tool b): from the held UN General Assembly agreement shares (un/agree/<ISO>.json), the ideal-point series (un/ideal.json), the organisation member lists and the partnership index, every country gets its agreement with the UAE, the US, China and Russia, who it votes with, whether it is a winnable friend and what it would need. Rules only, no model: an agreement share is the share of General Assembly votes on which two countries voted alike, NOT a vote-by-vote count, and "winnable" is a stated rule, not a prediction.
export type B = { en: string; ar: string };
export type Pole = "ARE" | "USA" | "CHN" | "RUS";
export const POLES: Pole[] = ["ARE", "USA", "CHN", "RUS"];
export const POLE_NAME: Record<Pole, B> = { ARE: { en: "the UAE", ar: "الإمارات" }, USA: { en: "the US", ar: "الولايات المتحدة" }, CHN: { en: "China", ar: "الصين" }, RUS: { en: "Russia", ar: "روسيا" } };
export const POLE_COLOR: Record<Pole | "between", string> = { ARE: "#0e9f6e", USA: "#2563eb", CHN: "#dc2626", RUS: "#9333ea", between: "#f59e0b" };
export type Agree = Record<string, number>;
export type CInfo = { iso3: string; name: string; nameAr?: string | null; flag?: string; region?: string };
export type PartRow = { score: number; rank?: number; c: Record<string, number> };
export type Ideal = Record<string, [number, number][]>;
export type CoalitionInputs = { countries: CInfo[]; agree: Record<Pole, Agree | null>; ideal: Ideal | null; orgs: Record<string, string[]>; part: Record<string, PartRow>; };
export type VotesWith = "USA" | "CHN" | "RUS" | "between" | null;
export type Need = { key: string; value: number; text: B };
export type Row = {
  iso: string; name: string; nameAr: string | null; flag: string; region: string;
  uae: number | null; usa: number | null; chn: number | null; rus: number | null; // agreement shares, 0-100 points
  uaeRank: number | null; uaePct: number | null; votesWith: VotesWith; closest: number | null; // the highest power agreement
  part: number | null; shared: string[]; trend: number | null; // trend: change in ideal-point distance to the UAE, recent 5 years minus the 5 before (negative is closer)
  winnable: boolean; ruleA: boolean; ruleB: boolean; need: Need | null;
};
export const WIN_PCT = 0.7; export const TIE = 2; export const NEAR = 8; export const CLOSER = -0.02;
/** Bodies that nearly every country joins say nothing about a bloc; so does any body of more than 100 members. */
export const UNIVERSAL = ["unga", "who", "itu", "wto", "opcw", "icj", "unesco", "fao", "ilo", "imo", "icao", "wipo", "imf", "isa", "itlos", "wbg", "npt", "iaea", "ecosoc"];
export const MAX_BLOC = 100;
export const ORG_NAME: Record<string, string> = { gcc: "GCC", arableague: "Arab League", oic: "OIC", brics: "BRICS", g20: "G20", au: "African Union", opec: "OPEC", opecplus: "OPEC+", nato: "NATO", eu: "EU", g7: "G7", quad: "Quad", sco: "SCO", asean: "ASEAN", oecd: "OECD", eaeu: "EAEU", csto: "CSTO", unsc: "UN Security Council", commonwealth: "Commonwealth", caricom: "CARICOM", ecowas: "ECOWAS", osce: "OSCE", oas: "OAS", coe: "Council of Europe", cis: "CIS", ots: "Turkic States", eurozone: "Eurozone", schengen: "Schengen", mercosur: "Mercosur", arctic: "Arctic Council", fiveeyes: "Five Eyes", aukus: "AUKUS", icc: "ICC" };
export const orgName = (k: string) => ORG_NAME[k] ?? k.toUpperCase();
export const NEED_NAME: Record<string, B> = { trade: { en: "trade", ar: "التجارة" }, engagement: { en: "visits and engagement", ar: "الزيارات والتفاعل" }, agreements: { en: "agreements", ar: "الاتفاقيات" }, connectivity: { en: "flights and connectivity", ar: "الرحلات والربط" }, investment: { en: "investment", ar: "الاستثمار" } };
export const NEED_ACTION: Record<string, B> = { trade: { en: "a trade push (CEPA or sector access)", ar: "دفعة تجارية (الشراكة الاقتصادية أو النفاذ القطاعي)" }, engagement: { en: "a visit or a ministerial engagement", ar: "زيارة أو لقاء وزاري" }, agreements: { en: "a framework agreement", ar: "اتفاقية إطارية" }, connectivity: { en: "an air-services or transport link", ar: "ربط جوي أو نقل" }, investment: { en: "an investment step (a fund or a first project)", ar: "خطوة استثمارية (صندوق أو مشروع أول)" } };

const pts = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? Math.round(v * 1000) / 10 : null);
/** The share of the values that are at or below v (0-1). */
export const fracAtOrBelow = (v: number, xs: number[]) => (xs.length ? xs.filter((x) => x <= v).length / xs.length : 0);
export const medianOf = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Who a country votes with: the highest of the US, China and Russia (a pole is skipped for itself); within TIE points of the next is "between". */
export function votesWith(a: { USA: number | null; CHN: number | null; RUS: number | null }): { who: VotesWith; closest: number | null } {
  const xs = (["USA", "CHN", "RUS"] as const).filter((k) => a[k] != null).map((k) => ({ k, v: a[k] as number })).sort((p, q) => q.v - p.v);
  if (!xs.length) return { who: null, closest: null };
  if (xs.length > 1 && xs[0].v - xs[1].v < TIE) return { who: "between", closest: xs[0].v };
  return { who: xs[0].k, closest: xs[0].v };
}
/** Change in the ideal-point distance to the UAE: the mean over the latest five matched years minus the mean over the five before (negative is closer). Needs three matched years in each window. */
export function distanceTrend(ideal: Ideal | null, iso: string): number | null {
  const a = ideal?.ARE; const b = ideal?.[iso]; if (!a || !b || iso === "ARE") return null;
  const am = new Map(a); const ds = b.filter(([y]) => am.has(y)).map(([y, v]) => [y, Math.abs(v - am.get(y)!)] as [number, number]).sort((p, q) => p[0] - q[0]);
  if (ds.length < 6) return null; const last = ds.slice(-5).map((x) => x[1]); const prev = ds.slice(-10, -5).map((x) => x[1]); if (prev.length < 3) return null;
  return Math.round((mean(last)! - mean(prev)!) * 1000) / 1000;
}
export function sharedBlocs(orgs: Record<string, string[]>, iso: string): string[] {
  return Object.entries(orgs).filter(([k, m]) => !UNIVERSAL.includes(k) && m.length >= 2 && m.length <= MAX_BLOC && m.includes("ARE") && m.includes(iso)).map(([k]) => k).sort();
}
export function weakest(p: PartRow | undefined): Need | null {
  if (!p) return null; const ks = Object.keys(NEED_NAME).filter((k) => typeof p.c[k] === "number"); if (!ks.length) return null;
  const k = ks.reduce((a, c) => (p.c[c] < p.c[a] ? c : a)); return { key: k, value: p.c[k], text: NEED_NAME[k] };
}
/** Builds a row for every country in the list (the UAE excluded: it is the pole). */
export function buildRows(inp: CoalitionInputs): Row[] {
  const A = inp.agree; const base = inp.countries.filter((c) => c.iso3 !== "ARE");
  const uaeAll = base.map((c) => pts(A.ARE?.[c.iso3])).filter((x): x is number => x != null); const sorted = [...uaeAll].sort((a, b) => b - a);
  const parts = base.map((c) => inp.part[c.iso3]?.score).filter((x): x is number => typeof x === "number"); const med = medianOf(parts);
  return base.map((c): Row => {
    const uae = pts(A.ARE?.[c.iso3]); const usa = c.iso3 === "USA" ? null : pts(A.USA?.[c.iso3]); const chn = c.iso3 === "CHN" ? null : pts(A.CHN?.[c.iso3]); const rus = c.iso3 === "RUS" ? null : pts(A.RUS?.[c.iso3]);
    const vw = votesWith({ USA: usa, CHN: chn, RUS: rus }); const p = inp.part[c.iso3]; const part = p ? p.score : null; const trend = distanceTrend(inp.ideal, c.iso3);
    const pct = uae != null ? fracAtOrBelow(uae, uaeAll) : null; const rank = uae != null ? sorted.findIndex((x) => x <= uae) + 1 : null;
    const pole = c.iso3 === "USA" || c.iso3 === "CHN" || c.iso3 === "RUS";
    const ruleA = !pole && pct != null && pct >= WIN_PCT && part != null && med != null && part < med;
    const ruleB = !pole && uae != null && vw.closest != null && Math.abs(vw.closest - uae) <= NEAR && trend != null && trend <= CLOSER;
    return { iso: c.iso3, name: c.name, nameAr: c.nameAr ?? null, flag: c.flag ?? "", region: c.region ?? "", uae, usa, chn, rus, uaeRank: rank, uaePct: pct, votesWith: vw.who, closest: vw.closest, part, shared: sharedBlocs(inp.orgs, c.iso3), trend, winnable: ruleA || ruleB, ruleA, ruleB, need: weakest(p) };
  });
}
export const friendsToAdd = (rows: Row[]): Row[] => rows.filter((r) => r.winnable && r.uae != null).sort((a, b) => b.uae! - a.uae!);
/** The rule that named a winnable country, in words with the values. */
export function whyWinnable(r: Row, medianPart: number | null): B[] {
  const out: B[] = [];
  if (r.ruleA) out.push({ en: `Rule A: agrees with the UAE on ${r.uae!.toFixed(0)}% of votes (top ${Math.round((1 - (r.uaePct ?? 0)) * 100) + 1}% of countries) while its partnership index is ${r.part} (median ${medianPart != null ? medianPart.toFixed(0) : "n/a"}): aligned in votes, thin in ties.`, ar: `القاعدة أ: تتفق مع الإمارات في ${r.uae!.toFixed(0)}٪ من الأصوات (ضمن الأعلى ${Math.round((1 - (r.uaePct ?? 0)) * 100) + 1}٪) بينما مؤشر الشراكة ${r.part} (الوسيط ${medianPart != null ? medianPart.toFixed(0) : "غير متاح"}): متوافقة في التصويت ضعيفة الروابط.` });
  if (r.ruleB) out.push({ en: `Rule B: its agreement with the UAE (${r.uae!.toFixed(0)}%) is within ${NEAR} points of its agreement with its closest power (${r.closest!.toFixed(0)}%) and its ideal-point distance to the UAE moved closer (${r.trend!.toFixed(2)}).`, ar: `القاعدة ب: اتفاقها مع الإمارات (${r.uae!.toFixed(0)}٪) ضمن ${NEAR} نقاط من اتفاقها مع أقرب قوة (${r.closest!.toFixed(0)}٪) واقتربت مسافتها المثالية من الإمارات (${r.trend!.toFixed(2)}).` });
  return out;
}
export const needText = (r: Row): B | null => (r.need ? { en: `Weakest tie: ${r.need.text.en} (${r.need.value}/100 in the partnership index). It would need ${NEED_ACTION[r.need.key].en}.`, ar: `أضعف رابط: ${r.need.text.ar} (${r.need.value}/100 في مؤشر الشراكة). تحتاج إلى ${NEED_ACTION[r.need.key].ar}.` } : null);
export type Summary = { n: number; withUae: number; votesWith: Record<"USA" | "CHN" | "RUS" | "between" | "none", number>; uaeMedian: number | null; uaeP70: number | null; partMedian: number | null; winnable: number; friends: number };
export function summarise(rows: Row[], inp: CoalitionInputs): Summary {
  const uae = rows.map((r) => r.uae).filter((x): x is number => x != null).sort((a, b) => a - b); const vw = { USA: 0, CHN: 0, RUS: 0, between: 0, none: 0 };
  for (const r of rows) vw[r.votesWith ?? "none"]++;
  const parts = rows.map((r) => r.part).filter((x): x is number => x != null); const p70 = uae.length ? uae[Math.min(uae.length - 1, Math.ceil(WIN_PCT * uae.length) - 1)] : null; const f = friendsToAdd(rows).length;
  void inp; return { n: rows.length, withUae: uae.length, votesWith: vw, uaeMedian: medianOf(uae), uaeP70: p70, partMedian: medianOf(parts), winnable: rows.filter((r) => r.winnable).length, friends: f };
}
export const SORTS = ["name", "uae", "usa", "chn", "rus", "part", "blocs"] as const;
export type SortKey = (typeof SORTS)[number];
export function sortRows(rows: Row[], key: SortKey, dir: 1 | -1 = -1): Row[] {
  const val = (r: Row): number | string | null => (key === "name" ? r.name : key === "blocs" ? r.shared.length : key === "part" ? r.part : r[key]);
  return [...rows].sort((a, b) => { const x = val(a); const y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * (key === "name" ? -dir : dir); });
}
export const votesWithLabel = (v: VotesWith, L: "en" | "ar"): string => (v == null ? (L === "ar" ? "غير متاح" : "n/a") : v === "between" ? (L === "ar" ? "بين قوتين" : "between") : POLE_NAME[v][L]);

// ---- the map (pure SVG so the PDF carries it too)
type Ring = number[][]; type Geom = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] } | { type: string; coordinates?: unknown };
export type Feat = { properties: { iso3: string }; geometry: Geom };
/** Settings for the map drawn into a PDF (light) and on screen (finer). */
export const PDF_MAP = { w: 720, minPx: 1.3, minDeg: 1.2 }; export const SCREEN_MAP = { w: 1000, minPx: 0.5, minDeg: 0.6 };
export type MapPaths = { w: number; h: number; paths: Map<string, string>; dots: Map<string, [number, number]> };
const LAT_TOP = 84; const LAT_BOT = -58;
/** Projects the country shapes (equirectangular, 58S to 84N) to SVG path strings. Points closer than `minPx` to the previous one are dropped, a polygon under `minDeg` of both width and height is dropped, and a country left with no polygon becomes a dot. */
export function buildPaths(feats: Feat[], o: { w: number; minPx?: number; minDeg?: number } = { w: 1000 }): MapPaths {
  const w = o.w; const h = Math.round((w * (LAT_TOP - LAT_BOT)) / 360); const minPx = o.minPx ?? 0.4; const minDeg = o.minDeg ?? 0.8;
  const X = (lon: number) => ((lon + 180) / 360) * w; const Y = (lat: number) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOT)) * h; const r1 = (v: number) => Math.round(v * 10) / 10;
  const paths = new Map<string, string>(); const dots = new Map<string, [number, number]>();
  for (const f of feats) {
    const polys: Ring[][] = f.geometry.type === "Polygon" ? [(f.geometry as { coordinates: Ring[] }).coordinates] : f.geometry.type === "MultiPolygon" ? (f.geometry as { coordinates: Ring[][] }).coordinates : [];
    let d = ""; let big: { a: number; c: [number, number] } | null = null;
    for (const poly of polys) {
      const ring = poly[0]; if (!ring?.length) continue; let x0 = 180, x1 = -180, y0 = 90, y1 = -90; for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const area = (x1 - x0) * (y1 - y0); if (!big || area > big.a) big = { a: area, c: [(x0 + x1) / 2, (y0 + y1) / 2] };
      if (x1 - x0 < minDeg && y1 - y0 < minDeg) continue;
      for (const rg of poly) {
        // a ring that crosses the antimeridian (Russia, Fiji) jumps by about 360 degrees between two points: it is drawn twice, once with the western longitudes moved east and once with the eastern ones moved west, and the map's edge clips the overflow
        const wraps = rg.some((pt, i) => i > 0 && Math.abs(pt[0] - rg[i - 1][0]) > 180); const shifts: ((lon: number) => number)[] = wraps ? [(l) => (l < 0 ? l + 360 : l), (l) => (l > 0 ? l - 360 : l)] : [(l) => l];
        for (const sh of shifts) { let px = NaN, py = NaN; let seg = ""; let n = 0; for (const [lon, lat] of rg) { const x = X(sh(lon)), y = Y(Math.max(LAT_BOT - 5, Math.min(LAT_TOP + 2, lat))); if (n && Math.hypot(x - px, y - py) < minPx) continue; seg += n ? ` ${r1(x)} ${r1(y)}` : `M${r1(x)} ${r1(y)}L`; px = x; py = y; n++; } if (n >= 3) d += `${seg}Z`; }
      }
    }
    if (d) paths.set(f.properties.iso3, d); else if (big) dots.set(f.properties.iso3, [r1(X(big.c[0])), r1(Y(big.c[1]))]);
  }
  return { w, h, paths, dots };
}
/** The map as an SVG string. `fill` gives each country's colour; `outline` is drawn over the focal country. */
export function mapSvg(m: MapPaths, fill: (iso: string) => string, o: { outline?: string | null; stroke?: string; bg?: string } = {}): string {
  const st = o.stroke ?? "#ffffff";
  const groups = new Map<string, string>(); const add = (c: string, x: string) => groups.set(c, (groups.get(c) ?? "") + x);
  for (const [iso, d] of m.paths) add(fill(iso), `<path d="${d}"/>`); for (const [iso, [x, y]] of m.dots) add(fill(iso), `<circle cx="${x}" cy="${y}" r="1.6"/>`);
  const body = `<g stroke="${st}" stroke-width=".4">${[...groups].map(([c, x]) => `<g fill="${c}">${x}</g>`).join("")}</g>`;
  const out = o.outline ? (m.paths.has(o.outline) ? `<path d="${m.paths.get(o.outline)}" fill="none" stroke="${INK}" stroke-width="1.4"/>` : m.dots.has(o.outline) ? `<circle cx="${m.dots.get(o.outline)![0]}" cy="${m.dots.get(o.outline)![1]}" r="3.4" fill="none" stroke="${INK}" stroke-width="1.4"/>` : "") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w} ${m.h}" width="100%" role="img">${o.bg ? `<rect width="${m.w}" height="${m.h}" fill="${o.bg}"/>` : ""}${body}${out}</svg>`;
}
/** A light-to-strong scale for an agreement share (0-100) on white paper. */
export function agreeColor(v: number | null | undefined): string {
  if (v == null) return "#eceff3"; const t = Math.max(0, Math.min(1, (v - 30) / 60)); const lo = [229, 233, 239], hi = [10, 126, 164]; // 30% and below pale, 90% and above full
  return `rgb(${lo.map((x, i) => Math.round(x + (hi[i] - x) * t)).join(",")})`;
}
export const voteColor = (r: Row | undefined): string => (!r ? "#eceff3" : r.votesWith ? POLE_COLOR[r.votesWith] : "#eceff3");
export type MapMode = "agree" | "votes";
/** The fill function for a map mode over the rows (the UAE is shown in its own green). */
export const fillFor = (rows: Row[], mode: MapMode) => { const by = new Map(rows.map((r) => [r.iso, r])); return (iso: string) => (iso === "ARE" ? POLE_COLOR.ARE : mode === "agree" ? agreeColor(by.get(iso)?.uae) : voteColor(by.get(iso))); };

// ---- the focal country
export type Focal = { row: Row; of: number; neighbours: { iso: string; name: string; uae: number | null; withUae: boolean }[]; partners: { iso: string; name: string; v: number; uae: number | null }[]; sharedNames: string[] };
export function focalOf(rows: Row[], iso: string, agree: Agree | null, ring1: { iso: string; name: string }[] = []): Focal | null {
  const row = rows.find((r) => r.iso === iso); if (!row) return null; const by = new Map(rows.map((r) => [r.iso, r])); const uaeAll = rows.map((r) => r.uae).filter((x): x is number => x != null);
  const p70 = uaeAll.length ? [...uaeAll].sort((a, b) => a - b)[Math.min(uaeAll.length - 1, Math.ceil(WIN_PCT * uaeAll.length) - 1)] : null;
  const neighbours = ring1.filter((n) => n.iso !== "ARE").map((n) => { const u = by.get(n.iso)?.uae ?? null; return { iso: n.iso, name: n.name, uae: u, withUae: u != null && p70 != null && u >= p70 }; }).sort((a, b) => (b.uae ?? -1) - (a.uae ?? -1));
  const partners = Object.entries(agree ?? {}).filter(([k]) => k !== iso && by.has(k)).map(([k, v]) => ({ iso: k, name: by.get(k)!.name, v: Math.round(v * 1000) / 10, uae: by.get(k)!.uae })).sort((a, b) => b.v - a.v).slice(0, 8);
  return { row, of: uaeAll.length, neighbours, partners, sharedNames: row.shared.map(orgName) };
}

// ---- the report blocks (PDF) and the text (pack, agents)
const pc = (v: number | null) => (v == null ? "–" : `${v.toFixed(0)}%`);
export function coalitionBlocks(o: { L: "en" | "ar"; rows: Row[]; sum: Summary; mapHtml: string; focal: Focal | null; friends: Row[]; mode: MapMode; countryName?: string }): string[] {
  const { L, sum, focal, friends } = o; const e = (en: string, ar: string) => (L === "ar" ? ar : en); const nm = (r: Row) => (L === "ar" && r.nameAr ? r.nameAr : r.name);
  const bl: string[] = [];
  bl.push(note(`<b>${esc(e("Coalition and vote map", "خريطة التحالفات والتصويت"))}</b> ${esc(e("Built from General Assembly agreement shares (the share of votes on which two countries voted alike; not a vote-by-vote count) and the partnership index. “Winnable” is a stated rule, not a prediction.", "مبنية على حصص الاتفاق في الجمعية العامة (حصة الأصوات التي صوّتت فيها دولتان بالطريقة نفسها؛ وليست إحصاء صوتًا بصوت) ومؤشر الشراكة. «القابلة للكسب» قاعدة معلنة لا تنبؤ."))}`, "warn"));
  bl.push(statRow([{ n: sum.withUae, label: e("countries with a UAE agreement share", "دول لها حصة اتفاق مع الإمارات"), color: ACC }, { n: sum.votesWith.USA, label: e("vote most with the US", "تصوّت أكثر مع الولايات المتحدة"), color: POLE_COLOR.USA }, { n: sum.votesWith.CHN, label: e("with China", "مع الصين"), color: POLE_COLOR.CHN }, { n: sum.votesWith.RUS, label: e("with Russia", "مع روسيا"), color: POLE_COLOR.RUS }, { n: sum.winnable, label: e("winnable by the rules", "قابلة للكسب بالقواعد"), color: OK }]));
  bl.push(h2(e(o.mode === "agree" ? "Agreement with the UAE" : "Who each country votes with", o.mode === "agree" ? "الاتفاق مع الإمارات" : "مع من تصوّت كل دولة")), `<div class="fig">${o.mapHtml}</div>`, `<p class="sub">${esc(o.mode === "agree" ? e("Darker is closer to the UAE's votes; grey means no agreement share held.", "الأغمق أقرب إلى تصويت الإمارات؛ الرمادي لا حصة محفوظة.") : e("Green is the UAE; blue the US; red China; purple Russia; amber within 2 points of two powers.", "الأخضر الإمارات؛ الأزرق أمريكا؛ الأحمر الصين؛ البنفسجي روسيا؛ العنبري ضمن نقطتين من قوتين."))}</p>`);
  if (focal) { const r = focal.row; bl.push(h2(e(`${o.countryName ?? r.name} on the vote map`, `${o.countryName ?? r.name} على خريطة التصويت`)), `<table class="tbl"><tr><th>${esc(e("Agreement with", "الاتفاق مع"))}</th><th>${esc(e("Share of votes", "حصة الأصوات"))}</th></tr>${(["uae", "usa", "chn", "rus"] as const).map((k, i) => `<tr><td>${esc(POLE_NAME[POLES[i]][L])}</td><td>${esc(pc(r[k]))}</td></tr>`).join("")}</table>`, `<p>${esc(e(`Votes with: ${votesWithLabel(r.votesWith, "en")}. Rank among ${focal.of} on agreement with the UAE: ${r.uaeRank ?? "n/a"}. Shared blocs with the UAE: ${focal.sharedNames.join(", ") || "none"}.`, `يصوّت مع: ${votesWithLabel(r.votesWith, "ar")}. الترتيب بين ${focal.of} في الاتفاق مع الإمارات: ${r.uaeRank ?? "غير متاح"}. كتل مشتركة مع الإمارات: ${focal.sharedNames.join("، ") || "لا شيء"}.`))}</p>`); if (r.winnable) bl.push(note(whyWinnable(r, sum.partMedian).map((x) => esc(x[L])).join("<br>"), "ok")); }
  bl.push(h2(e(`Friends the UAE could add (${friends.length})`, `أصدقاء يمكن للإمارات إضافتهم (${friends.length})`)), `<table class="tbl"><tr><th>#</th><th>${esc(e("Country", "الدولة"))}</th><th>${esc(e("UAE", "الإمارات"))}</th><th>${esc(e("Votes with", "تصوّت مع"))}</th><th>${esc(e("Partnership", "الشراكة"))}</th><th>${esc(e("What it would need", "ما تحتاجه"))}</th></tr>${friends.slice(0, 20).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(nm(r))}</td><td>${esc(pc(r.uae))}</td><td>${esc(votesWithLabel(r.votesWith, L))}</td><td>${r.part ?? "–"}</td><td>${esc(needText(r)?.[L] ?? e("partnership data not held", "بيانات الشراكة غير متاحة"))}</td></tr>`).join("")}</table>`);
  bl.push(`<p class="sub">${esc(e("Rule A: UAE agreement in the top 30% of countries and a partnership index below the median. Rule B: UAE agreement within 8 points of the country's closest power and its ideal-point distance to the UAE closer over the last five years. Not held: resolution-level votes, abstentions and absences, the content of the votes.", "القاعدة أ: اتفاق مع الإمارات ضمن أعلى 30٪ ومؤشر شراكة دون الوسيط. القاعدة ب: اتفاق مع الإمارات ضمن 8 نقاط من أقرب قوة للدولة واقتراب مسافتها المثالية من الإمارات خلال خمس سنوات. غير متاح: الأصوات على مستوى القرارات والامتناع والغياب ومضمون التصويت."))}</p>`);
  return bl;
}
export function coalitionText(o: { rows: Row[]; sum: Summary; focal: Focal | null; friends: Row[] }): string {
  const { sum, focal, friends } = o; const lines = [`Coalition and vote map (General Assembly agreement shares, not vote-by-vote counts; winnable is a stated rule, not a prediction). ${sum.withUae} countries have a UAE agreement share; most votes with the US ${sum.votesWith.USA}, China ${sum.votesWith.CHN}, Russia ${sum.votesWith.RUS}, between ${sum.votesWith.between}. ${sum.winnable} are winnable by the rules.`];
  if (focal) { const r = focal.row; lines.push(`${r.name}: agreement with the UAE ${pc(r.uae)}, US ${pc(r.usa)}, China ${pc(r.chn)}, Russia ${pc(r.rus)}; votes with ${votesWithLabel(r.votesWith, "en")}; rank ${r.uaeRank ?? "n/a"} of ${focal.of} on agreement with the UAE; shared blocs with the UAE: ${focal.sharedNames.join(", ") || "none"}.${r.winnable ? ` Winnable: ${whyWinnable(r, sum.partMedian).map((x) => x.en).join(" ")}` : ""}`); }
  lines.push(`Friends the UAE could add (top ${Math.min(10, friends.length)}): ${friends.slice(0, 10).map((r) => `${r.name} (${pc(r.uae)}; ${needText(r)?.en ?? "partnership data not held"})`).join(" | ")}`);
  return lines.join("\n");
}
