import type { B } from "./core";
import type { CaseData, DealRow } from "./load";

// THE UAE INVESTMENT ADVANTAGE: where the UAE's own vehicles (sovereign funds, port operators, state energy and industry, airlines, technology groups, holding companies, banks, development finance, private groups) could do business in a country, what the country needs, which of those vehicles show up in the deals the platform holds, and which with a sector fit do not.
// It is arithmetic on held data with stated rules, no model call. Two honest limits are printed wherever it is shown: the registry is a working list of UAE investors from public knowledge and the deals feed (ownership and mandates must be verified), and "not present" means "no announced deal in the WAM-based feed", not "no business there": private and unannounced activity is invisible to it.
export type Sector = "energy" | "ports" | "agri" | "finance" | "technology" | "realestate" | "industry" | "health" | "aviation" | "defence" | "development";
export const SECTORS: { id: Sector; en: string; ar: string }[] = [
  { id: "energy", en: "Energy and utilities", ar: "الطاقة والمرافق" }, { id: "ports", en: "Ports, logistics and corridors", ar: "الموانئ واللوجستيات والممرات" }, { id: "agri", en: "Agriculture and food security", ar: "الزراعة والأمن الغذائي" },
  { id: "finance", en: "Finance and capital", ar: "المال ورأس المال" }, { id: "technology", en: "Technology, AI and telecoms", ar: "التقنية والذكاء الاصطناعي والاتصالات" }, { id: "realestate", en: "Real estate and cities", ar: "العقار والمدن" },
  { id: "industry", en: "Industry and manufacturing", ar: "الصناعة والتصنيع" }, { id: "health", en: "Health", ar: "الصحة" }, { id: "aviation", en: "Aviation and tourism", ar: "الطيران والسياحة" }, { id: "defence", en: "Defence cooperation (lawful, policy level)", ar: "التعاون الدفاعي (مشروع، على مستوى السياسات)" }, { id: "development", en: "Development and humanitarian finance", ar: "التمويل التنموي والإنساني" },
];
export type VType = "sovereign" | "port" | "state-energy" | "state-industry" | "aviation" | "technology" | "holding" | "bank" | "development" | "hub" | "food" | "private";
export const VTYPES: { id: VType; en: string; ar: string }[] = [
  { id: "sovereign", en: "Sovereign funds", ar: "الصناديق السيادية" }, { id: "port", en: "Port and logistics operators", ar: "مشغلو الموانئ واللوجستيات" }, { id: "state-energy", en: "State energy and utilities", ar: "الطاقة والمرافق الحكومية" }, { id: "state-industry", en: "State industry and defence industry", ar: "الصناعة الحكومية والدفاعية" },
  { id: "aviation", en: "Airlines", ar: "شركات الطيران" }, { id: "technology", en: "Technology and telecoms groups", ar: "مجموعات التقنية والاتصالات" }, { id: "holding", en: "Holding groups and developers", ar: "المجموعات القابضة والمطورون" }, { id: "bank", en: "Banks", ar: "البنوك" }, { id: "development", en: "Development finance", ar: "التمويل التنموي" },
  { id: "hub", en: "Free zones and trade hubs", ar: "المناطق الحرة ومراكز التجارة" }, { id: "food", en: "Food and agriculture groups", ar: "مجموعات الغذاء والزراعة" }, { id: "private", en: "Private groups", ar: "المجموعات الخاصة" },
];
export type Vehicle = { id: string; name: string; ar: string; type: VType; sectors: Sector[]; match: RegExp };
const V = (id: string, name: string, ar: string, type: VType, sectors: Sector[], match: string): Vehicle => ({ id, name, ar, type, sectors, match: new RegExp(match, "i") });
/** A working list of UAE investors, from public knowledge and the names that appear in the deals feed. Verify ownership and mandate before relying on a classification. */
export const VEHICLES: Vehicle[] = [
  V("adia", "ADIA", "جهاز أبوظبي للاستثمار", "sovereign", ["finance", "realestate", "technology", "energy", "industry"], "\\bADIA\\b|Abu Dhabi Investment( Authority)?\\b"), V("mubadala", "Mubadala", "مبادلة", "sovereign", ["technology", "energy", "industry", "finance", "health", "realestate"], "Mubadala"),
  V("adq", "ADQ", "القابضة (ADQ)", "sovereign", ["agri", "energy", "health", "finance", "ports", "industry"], "\\bADQ\\b"), V("icd", "Investment Corporation of Dubai", "مؤسسة دبي للاستثمارات الحكومية", "sovereign", ["finance", "aviation", "industry", "realestate", "energy"], "Investment Corporation of Dubai|\\bICD\\b"),
  V("mgx", "MGX", "MGX", "sovereign", ["technology"], "\\bMGX\\b"),
  V("dpworld", "DP World", "موانئ دبي العالمية", "port", ["ports", "industry"], "DP World"), V("adports", "AD Ports Group", "مجموعة موانئ أبوظبي", "port", ["ports", "industry"], "AD Ports|Abu Dhabi Ports"), V("dmcc", "DMCC", "مركز دبي للسلع المتعددة", "hub", ["finance", "industry"], "\\bDMCC\\b"),
  V("adnoc", "ADNOC", "أدنوك", "state-energy", ["energy"], "\\bADNOC\\b"), V("xrg", "XRG", "XRG", "state-energy", ["energy"], "\\bXRG\\b"), V("masdar", "Masdar", "مصدر", "state-energy", ["energy"], "Masdar"), V("taqa", "TAQA", "طاقة", "state-energy", ["energy"], "\\bTAQA\\b"), V("dewa", "DEWA", "ديوا", "state-energy", ["energy"], "\\bDEWA\\b"),
  V("ega", "Emirates Global Aluminium", "الإمارات العالمية للألمنيوم", "state-industry", ["industry", "energy"], "\\bEGA\\b|Emirates Global Aluminium"), V("edge", "EDGE Group", "مجموعة إيدج", "state-industry", ["defence", "industry"], "\\bEDGE\\b"), V("modon", "Modon", "مدن", "holding", ["realestate", "industry"], "Modon"),
  V("etihad", "Etihad", "الاتحاد للطيران", "aviation", ["aviation"], "Etihad"), V("flydubai", "flydubai", "فلاي دبي", "aviation", ["aviation"], "flydubai"), V("emirates", "Emirates", "طيران الإمارات", "aviation", ["aviation"], "^Emirates( Group| airline)?$"),
  V("g42", "G42", "G42", "technology", ["technology"], "\\bG42\\b"), V("space42", "Space42", "سبيس42", "technology", ["technology"], "Space42"), V("eand", "e&", "إي آند", "technology", ["technology"], "^e&$|Etisalat"), V("2pz", "2PointZero", "2PointZero", "technology", ["technology", "energy"], "2PointZero"),
  V("ihc", "International Holding Company", "الشركة العالمية القابضة", "holding", ["finance", "realestate", "health", "agri", "technology", "energy"], "\\bIHC\\b|International Holding"), V("alphadhabi", "Alpha Dhabi", "ألفا ظبي", "holding", ["realestate", "industry", "energy", "finance"], "Alpha Dhabi"), V("dubaiholding", "Dubai Holding", "دبي القابضة", "holding", ["realestate", "finance", "technology"], "Dubai Holding"),
  V("dubaiinv", "Dubai Investments", "دبي للاستثمار", "holding", ["realestate", "industry"], "Dubai Investments"), V("aldar", "Aldar", "الدار", "holding", ["realestate"], "\\bAldar\\b"), V("emaar", "Emaar", "إعمار", "holding", ["realestate"], "\\bEmaar\\b"),
  V("enbd", "Emirates NBD", "بنك الإمارات دبي الوطني", "bank", ["finance"], "Emirates NBD"), V("fab", "First Abu Dhabi Bank", "بنك أبوظبي الأول", "bank", ["finance"], "First Abu Dhabi Bank|\\bFAB\\b"), V("lunate", "Lunate", "لوناتي", "private", ["finance"], "Lunate"),
  V("adfd", "Abu Dhabi Fund for Development", "صندوق أبوظبي للتنمية", "development", ["development", "energy", "health"], "\\bADFD\\b|Abu Dhabi Fund for Development"),
  V("aldahra", "Al Dahra", "الظهرة", "food", ["agri"], "Al Dahra"), V("ghitha", "Ghitha", "غذاء", "food", ["agri"], "Ghitha"), V("agthia", "Agthia", "أغذية", "food", ["agri"], "Agthia"),
  V("lulu", "Lulu Group", "مجموعة لولو", "private", ["agri"], "\\bLulu\\b"), V("maf", "Majid Al Futtaim", "ماجد الفطيم", "private", ["realestate"], "Majid Al Futtaim"), V("ghurair", "Al Ghurair", "الغرير", "private", ["industry", "agri"], "Al Ghurair"),
];
const DEAL_SECTOR: Record<string, Sector> = { energy: "energy", "ports and logistics": "ports", finance: "finance", industry: "industry", technology: "technology", "real estate": "realestate", health: "health" };
export const vehicleOf = (name: string): Vehicle | null => VEHICLES.find((v) => v.match.test(name.trim())) ?? null;

// ---- what the country needs: demand signals from the ten-year spine, with the evidence ----
export type Level = "high" | "medium" | "low" | "unknown";
export type Demand = { level: Level; evidence: B };
const b = (en: string, ar: string): B => ({ en, ar });
const lat = (c: CaseData, name: string) => c.spine.find((s) => s.met.name === name && s.has)?.spine.latest?.v ?? null;
const pc = (v: number | null, dd = 0) => (v == null ? "n/a" : `${v.toFixed(dd)}%`);
const f = (v: number | null, dd = 0) => (v == null ? "n/a" : v.toFixed(dd));
export function demandOf(c: CaseData): Record<Sector, Demand> {
  const unk: Demand = { level: "unknown", evidence: b("No dataset held for this signal.", "لا مجموعة بيانات محفوظة لهذه الإشارة.") };
  const rents = lat(c, "Oil and gas rents, % of GDP"); const ren = lat(c, "Renewable electricity share"); const corridor = c.axes.find((x) => x.id === "corridor")?.v ?? null; const food = lat(c, "Food imports, % of merchandise"); const water = lat(c, "Water withdrawal, % of resources");
  const debt = lat(c, "Government gross debt, % of GDP"); const credit = lat(c, "Private credit, % of GDP"); const npl = lat(c, "Non-performing loans"); const net = lat(c, "Internet users, % of population"); const pop = lat(c, "Population"); const urb = lat(c, "Urban population share"); const gdppc = lat(c, "GDP per capita"); const health = lat(c, "Health spending, % of GDP");
  const dest = c.capture?.series.dest?.slice(-1)[0] ?? null; const hard = c.power.find((x) => x.id === "hard")?.v ?? null; const dev = c.instruments.find((x) => x.id === "development");
  const lv = (hi: boolean, mid: boolean, any: boolean): Level => (!any ? "unknown" : hi ? "high" : mid ? "medium" : "low");
  const out: Record<Sector, Demand> = {
    energy: rents == null && ren == null ? unk : { level: lv((rents ?? 0) >= 10 || (ren ?? 100) < 15, (rents ?? 0) >= 3 || (ren ?? 100) < 30, true), evidence: b(`Oil and gas rents ${pc(rents, 1)} of GDP; renewable share of electricity ${pc(ren, 0)}.`, `ريع النفط والغاز ${pc(rents, 1)} من الناتج؛ حصة المتجددة في الكهرباء ${pc(ren, 0)}.`) },
    ports: corridor == null ? unk : { level: lv(corridor >= 4, corridor >= 3, true), evidence: b(`Corridor and geographic criticality ${corridor}/5.`, `أهمية الممرات الجغرافية ${corridor}/5.`) },
    agri: food == null && water == null ? unk : { level: lv((food ?? 0) >= 15 || (water ?? 0) >= 100, (food ?? 0) >= 10 || (water ?? 0) >= 50, true), evidence: b(`Food imports ${pc(food, 1)} of merchandise imports; freshwater withdrawal ${pc(water, 0)} of resources.`, `واردات الغذاء ${pc(food, 1)} من واردات السلع؛ سحب المياه العذبة ${pc(water, 0)} من الموارد.`) },
    finance: debt == null && credit == null ? unk : { level: lv((debt ?? 0) >= 80 || (credit ?? 100) < 25 || (npl ?? 0) >= 10, (debt ?? 0) >= 60 || (credit ?? 100) < 40, true), evidence: b(`Government debt ${pc(debt, 0)} of GDP; private credit ${pc(credit, 0)} of GDP; non-performing loans ${pc(npl, 1)}. Financing need is an opening and a risk: use protected, milestone-based structures.`, `الدين الحكومي ${pc(debt, 0)} من الناتج؛ الائتمان الخاص ${pc(credit, 0)} من الناتج؛ القروض المتعثرة ${pc(npl, 1)}. حاجة التمويل فرصة وخطر معًا: استخدم هياكل محمية قائمة على مراحل.`) },
    technology: net == null && pop == null ? unk : { level: lv((net ?? 0) >= 50 && (pop ?? 0) >= 30e6, (net ?? 0) >= 40 || (pop ?? 0) >= 20e6, true), evidence: b(`Internet users ${pc(net, 0)} of the population; population ${pop == null ? "n/a" : `${(pop / 1e6).toFixed(0)}m`}.`, `مستخدمو الإنترنت ${pc(net, 0)} من السكان؛ السكان ${pop == null ? "غير متاح" : `${(pop / 1e6).toFixed(0)} مليون`}.`) },
    realestate: urb == null && pop == null ? unk : { level: lv((urb ?? 0) >= 55 && (pop ?? 0) >= 30e6, (urb ?? 0) >= 45 || (pop ?? 0) >= 20e6, true), evidence: b(`Urban population ${pc(urb, 0)}; population ${pop == null ? "n/a" : `${(pop / 1e6).toFixed(0)}m`}.`, `سكان الحضر ${pc(urb, 0)}؛ السكان ${pop == null ? "غير متاح" : `${(pop / 1e6).toFixed(0)} مليون`}.`) },
    industry: gdppc == null && pop == null ? unk : { level: lv((gdppc ?? 1e9) < 6000 && (pop ?? 0) >= 30e6, (gdppc ?? 1e9) < 12000 || (pop ?? 0) >= 20e6, true), evidence: b(`GDP per capita US$${f(gdppc)}; population ${pop == null ? "n/a" : `${(pop / 1e6).toFixed(0)}m`}: a large, lower-income market suits industrial zones and manufacturing partnerships.`, `نصيب الفرد من الناتج ${f(gdppc)} دولارًا؛ السكان ${pop == null ? "غير متاح" : `${(pop / 1e6).toFixed(0)} مليون`}: سوق كبيرة منخفضة الدخل تناسب المناطق الصناعية وشراكات التصنيع.`) },
    health: health == null ? unk : { level: lv(health < 4, health < 6, true), evidence: b(`Health spending ${pc(health, 1)} of GDP.`, `الإنفاق الصحي ${pc(health, 1)} من الناتج.`) },
    aviation: pop == null && dest == null ? unk : { level: lv((pop ?? 0) >= 50e6, (pop ?? 0) >= 15e6 || (dest ?? 0) > 0, true), evidence: b(`${f(dest)} active UAE direct destinations; population ${pop == null ? "n/a" : `${(pop / 1e6).toFixed(0)}m`}.`, `${f(dest)} وجهة إماراتية مباشرة نشطة؛ السكان ${pop == null ? "غير متاح" : `${(pop / 1e6).toFixed(0)} مليون`}.`) },
    defence: hard == null ? unk : { level: lv(hard >= 3, hard >= 2, true), evidence: b(`Hard-power channel ${hard}/5 (policy level only). Lawful, consent-based, defensive cooperation and export-controlled defence industry only.`, `قناة القوة الصلبة ${hard}/5 (على مستوى السياسات فقط). تعاون دفاعي مشروع وبالتراضي ودفاعي وصناعة دفاعية خاضعة لضوابط التصدير فقط.`) },
    development: dev?.footprint == null ? unk : { level: lv((dev.headroom ?? 0) >= 3, (dev.headroom ?? 0) >= 2, true), evidence: b(`UAE development and aid footprint ${dev.footprint}/5; headroom ${dev.headroom}.`, `حضور المساعدات التنموية الإماراتية ${dev.footprint}/5؛ المساحة ${dev.headroom}.`) },
  };
  return out;
}

// ---- presence and the gap ----
export type AdvRow = { sector: Sector; name: B; demand: Demand; deals: DealRow[]; present: Vehicle[]; others: string[]; candidates: Vehicle[] };
export type Advantage = {
  rows: AdvRow[]; total: number; present: { v: Vehicle; deals: DealRow[] }[]; others: { name: string; n: number }[]; byType: { type: VType; name: B; present: Vehicle[]; absent: Vehicle[] }[];
  concentration: { who: string; share: number } | null; stock: { usd: number; year: number } | null;
};
export function advantage(c: CaseData): Advantage {
  const demand = demandOf(c); const byV = new Map<string, DealRow[]>(); const others = new Map<string, number>(); const sectorOf = (x: DealRow, v: Vehicle | null): Sector | null => (x.sector && DEAL_SECTOR[x.sector]) || (v ? v.sectors[0] : null);
  const dealSec = new Map<Sector, DealRow[]>(); const presentBySec = new Map<Sector, Set<string>>(); const othersBySec = new Map<Sector, Set<string>>();
  for (const x of c.deals) {
    const vs = x.by.map((n) => ({ n, v: vehicleOf(n) })); const first = vs.find((q) => q.v)?.v ?? null; const sec = sectorOf(x, first); if (sec) dealSec.set(sec, [...(dealSec.get(sec) ?? []), x]);
    for (const { n, v } of vs) { if (v) { byV.set(v.id, [...(byV.get(v.id) ?? []), x]); if (sec) presentBySec.set(sec, (presentBySec.get(sec) ?? new Set()).add(v.id)); } else { others.set(n, (others.get(n) ?? 0) + 1); if (sec) othersBySec.set(sec, (othersBySec.get(sec) ?? new Set()).add(n)); } }
  }
  const presentIds = new Set(byV.keys());
  const rows: AdvRow[] = SECTORS.map((s) => { const pid = presentBySec.get(s.id) ?? new Set<string>(); const fit = VEHICLES.filter((v) => v.sectors.includes(s.id) && !presentIds.has(v.id)); const present = VEHICLES.filter((v) => pid.has(v.id));
    // candidates: one per vehicle type first, so the list shows the breadth of UAE tools, not five funds
    const seen = new Set<VType>(); const cand: Vehicle[] = []; for (const v of fit) if (!seen.has(v.type)) { seen.add(v.type); cand.push(v); } for (const v of fit) if (cand.length < 6 && !cand.includes(v)) cand.push(v);
    return { sector: s.id, name: { en: s.en, ar: s.ar }, demand: demand[s.id], deals: dealSec.get(s.id) ?? [], present, others: [...(othersBySec.get(s.id) ?? [])], candidates: cand.slice(0, 6) }; });
  const total = c.deals.length; const top = [...byV.entries()].sort((a, z) => z[1].length - a[1].length)[0]; const ex = c.spine.find((s) => s.met.name === "UAE outward position in the partner" && s.has)?.spine.latest ?? null;
  return { rows, total, present: [...byV.entries()].map(([id, deals]) => ({ v: VEHICLES.find((v) => v.id === id)!, deals })).sort((a, z) => z.deals.length - a.deals.length), others: [...others.entries()].map(([name, n]) => ({ name, n })).sort((a, z) => z.n - a.n),
    byType: VTYPES.map((t) => ({ type: t.id, name: { en: t.en, ar: t.ar }, present: VEHICLES.filter((v) => v.type === t.id && presentIds.has(v.id)), absent: VEHICLES.filter((v) => v.type === t.id && !presentIds.has(v.id)) })),
    concentration: top && total > 0 ? { who: top[0] === undefined ? "" : (VEHICLES.find((v) => v.id === top[0])?.name ?? top[0]), share: Math.round((top[1].length / total) * 100) } : null, stock: ex ? { usd: ex.v, year: ex.y } : null };
}
/** The gaps worth a first conversation: a sector where the country's need is high or medium and the UAE shows no announced deal, with the vehicles that fit. */
export function openings(a: Advantage): AdvRow[] { return a.rows.filter((r) => (r.demand.level === "high" || r.demand.level === "medium") && r.deals.length === 0 && r.candidates.length > 0).sort((x, z) => (z.demand.level === "high" ? 1 : 0) - (x.demand.level === "high" ? 1 : 0)); }
/** Where the UAE is already present and the need is high: the places to deepen, not to enter. */
export function toDeepen(a: Advantage): AdvRow[] { return a.rows.filter((r) => r.deals.length > 0 && (r.demand.level === "high" || r.demand.level === "medium")); }
