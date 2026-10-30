// Financial conditions read from the IMF and the BIS (public/data/fin-sources.json, built by scripts/build-fin-sources.mjs), set beside the World Bank figures the Deep view already shows.
// Rules: a source with no figure for a country is simply absent; bank ratios are derived from the IMF's reported balance-sheet items with the IMF's FSI definitions and say so; nothing is estimated.
import type { Verdict } from "./crosscheck";
export type FSrc = { id: string; name: string; publisher: string; basis: string; kind: "primary"; url: string; note?: string; status: "ok" | "failed"; rows: number; formula?: Record<string, string> };
export type Mv = { p: string; v: number; yoy?: number };
export type RatioSet = { a?: [number, number][]; q?: [string, number][] };
export type FinItem = { fsi?: Partial<Record<"capAssets" | "regCap" | "t1" | "roa" | "liq" | "npl", RatioSet>> & { nplLevel?: [number, number][] }; cpi?: { y: number; v: number }; fx?: { y: number; v: number }; neerImf?: Mv; reerImf?: Mv; neerBis?: Mv; reerBis?: Mv; policyBis?: { p: string; v: number } };
export type FinSources = { built: string; sources: Record<string, FSrc>; unavailable: { name: string; url: string; measure: string; reason: string }[]; countries: Record<string, FinItem> };
let cache: Promise<FinSources> | null = null;
export const loadFinSources = (): Promise<FinSources> => (cache ??= fetch("/data/fin-sources.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<FinSources>; }).catch((e) => { cache = null; throw e; }));

export const WB_FIN: FSrc = { id: "wb", name: "World Bank World Development Indicators", publisher: "World Bank", basis: "annual, published with a lag", kind: "primary", url: "https://databank.worldbank.org/source/world-development-indicators", status: "ok", rows: 0, note: "Its bank indicators are the IMF's own FSI data republished, so a gap here is mostly timing." };

export type Kind = "pp" | "rel" | "yoy";
/** How far apart two readings may sit and still "agree" / be "close": percentage points for ratios and rates, a share of the value for levels, points of year-on-year change for exchange-rate indices. */
export const LIMITS: Record<Kind, [number, number]> = { pp: [0.5, 2], rel: [0.005, 0.05], yoy: [1.5, 4] };
export function rowVerdict(kind: Kind, vals: number[]): Verdict {
  const v = vals.filter((x) => Number.isFinite(x)); if (!v.length) return "none"; if (v.length < 2) return "single";
  const [ag, cl] = LIMITS[kind]; const spread = kind === "rel" ? (Math.max(...v) - Math.min(...v)) / Math.max(Math.abs(Math.max(...v)), Math.abs(Math.min(...v)), 1e-9) : Math.max(...v) - Math.min(...v);
  return spread <= ag ? "agree" : spread <= cl ? "close" : "differ";
}
export type Cell = { s: string; v: number; when: string; derived?: boolean; compared: boolean };
export type Row = { id: string; label: { en: string; ar: string }; unit: string; kind: Kind; cells: Cell[]; verdict: Verdict; compareNote?: string };
type WbPoint = { v: number; y: number; s?: [number, number][] }; export type WbDict = Record<string, WbPoint> | null;
const at = (set: [number, number][] | undefined, y: number) => set?.find((p) => p[0] === y)?.[1];
const lastOf = <T extends [unknown, number]>(a?: T[]) => (a && a.length ? a[a.length - 1] : undefined);

/** One row per indicator: every source's latest figure with its period, and the verdict over those that cover the same period. */
export function buildRows(wb: WbDict, f: FinItem | undefined): Row[] {
  const rows: Row[] = []; const fsi = f?.fsi;
  const row = (id: string, en: string, ar: string, unit: string, kind: Kind, cells: Cell[], note?: string) => { if (!cells.length) return; rows.push({ id, label: { en, ar }, unit, kind, cells, verdict: cells.filter((c) => c.compared).length >= 2 ? rowVerdict(kind, cells.filter((c) => c.compared).map((c) => c.v)) : "single", ...(note ? { compareNote: note } : {}) }); };
  const wbCell = (k: string, same?: number): Cell[] => (wb?.[k] ? [{ s: "wb", v: wb[k].v, when: String(wb[k].y), compared: same == null || wb[k].y === same }] : []);
  // bank ratios that the World Bank also carries: compared in the World Bank's year, with the IMF's latest quarter shown beside
  for (const [id, k, wk, en, ar] of [["capital", "capAssets", "capital", "Bank capital to assets", "رأس المال المصرفي إلى الأصول"], ["npl", "npl", "npl", "Non-performing loans ratio", "نسبة القروض المتعثرة"]] as const) {
    const wy = wb?.[wk]?.y, set = fsi?.[k]; const same = wy != null ? at(set?.a, wy) : undefined; const cells: Cell[] = [...wbCell(wk)];
    if (set?.a?.length) { const l = wy != null && same != null ? ([wy, same] as [number, number]) : lastOf(set.a)!; cells.push({ s: "imf_fsi", v: l[1], when: String(l[0]), derived: true, compared: wy != null && l[0] === wy }); }
    const la = lastOf(set?.a), q = lastOf(set?.q); if (q && !(la && q[0] === `${la[0]}-Q4`)) cells.push({ s: "imf_fsi", v: q[1], when: q[0], derived: true, compared: false });
    row(id, en, ar, "%", "pp", cells, k === "npl" ? "denominator is loans after specific provisions" : undefined);
  }
  for (const [id, k, en, ar] of [["regCap", "regCap", "Regulatory capital to risk-weighted assets", "رأس المال الرقابي إلى الأصول المرجحة بالمخاطر"], ["t1", "t1", "Tier 1 capital to risk-weighted assets", "الشريحة الأولى إلى الأصول المرجحة بالمخاطر"], ["roa", "roa", "Return on assets (before tax)", "العائد على الأصول (قبل الضريبة)"], ["liq", "liq", "Liquid assets to total assets", "الأصول السائلة إلى إجمالي الأصول"]] as const) {
    const set = fsi?.[k]; const a = lastOf(set?.a), q = lastOf(set?.q); const cells: Cell[] = [];
    if (a) cells.push({ s: "imf_fsi", v: a[1], when: String(a[0]), derived: true, compared: false }); if (q && (!a || q[0] !== `${a[0]}-Q4`)) cells.push({ s: "imf_fsi", v: q[1], when: q[0], derived: true, compared: false });
    row(id, en, ar, "%", "pp", cells);
  }
  // inflation and exchange rate: the World Bank figure beside the IMF's, compared when they are for the same year
  if (f?.cpi) row("cpi", "Inflation, consumer prices", "التضخم، أسعار المستهلك", "%", "pp", [...wbCell("cpi", f.cpi.y), { s: "imf_cpi", v: f.cpi.v, when: String(f.cpi.y), compared: wb?.cpi?.y === f.cpi.y }]);
  if (f?.fx) row("fx", "Exchange rate, per US$", "سعر الصرف مقابل الدولار", "", "rel", [...wbCell("fx", f.fx.y), { s: "imf_er", v: f.fx.v, when: String(f.fx.y), compared: wb?.fx?.y === f.fx.y }]);
  // effective exchange rates: the index levels use different bases, so the comparison is the year-on-year change
  const eff = (id: string, en: string, ar: string, a?: Mv, b?: Mv) => { const cells: Cell[] = []; if (a) cells.push({ s: "imf_eer", v: a.v, when: a.p, compared: a.yoy != null && b?.yoy != null }); if (b) cells.push({ s: "bis_eer", v: b.v, when: b.p, compared: a?.yoy != null && b.yoy != null }); if (!cells.length) return;
    const yoys = [a?.yoy, b?.yoy].filter((x): x is number => x != null); rows.push({ id, label: { en, ar }, unit: "index", kind: "yoy", cells, verdict: rowVerdict("yoy", cells.every((c) => c.compared) ? yoys : yoys.length ? [yoys[0]] : []), compareNote: yoys.length ? `year on year: ${[a?.yoy != null ? `IMF ${a.yoy > 0 ? "+" : ""}${a.yoy}%` : "", b?.yoy != null ? `BIS ${b.yoy > 0 ? "+" : ""}${b.yoy}%` : ""].filter(Boolean).join(", ")}` : undefined }); };
  eff("neer", "Nominal effective exchange rate", "سعر الصرف الفعلي الاسمي", f?.neerImf, f?.neerBis); eff("reer", "Real effective exchange rate", "سعر الصرف الفعلي الحقيقي", f?.reerImf, f?.reerBis);
  if (f?.policyBis) row("policy", "Central bank policy rate", "سعر الفائدة الأساسي للبنك المركزي", "%", "pp", [{ s: "bis_cbpol", v: f.policyBis.v, when: f.policyBis.p, compared: false }]);
  return rows;
}
