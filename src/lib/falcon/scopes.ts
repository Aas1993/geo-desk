import type { Country } from "../types";

// Scopes beyond a single country: the world, a region, a sub-region, a bloc or a sector. Each has a three-letter id that is never an ISO country code, so every place that keys a product by "iso3"
// (the dossier route, the saved copies, the library) works unchanged. A scope's facts are aggregated from the same datasets as a country's (see scope-facts.ts).
export type ScopeKind = "global" | "region" | "subregion" | "bloc" | "sector";
export type Scope = { id: string; kind: ScopeKind; en: string; ar: string; flag: string; /** region or sub-region name as in the regions dataset, or the org key of a bloc, or the sector key */ key: string; note?: { en: string; ar: string } };
export const SCOPES: Scope[] = [
  { id: "WLD", kind: "global", en: "The world", ar: "العالم", flag: "🌐", key: "world" },
  { id: "AFR", kind: "region", en: "Africa", ar: "أفريقيا", flag: "🌍", key: "Africa" }, { id: "AME", kind: "region", en: "The Americas", ar: "الأمريكتان", flag: "🌎", key: "Americas" }, { id: "ASI", kind: "region", en: "Asia", ar: "آسيا", flag: "🌏", key: "Asia" }, { id: "EUR", kind: "region", en: "Europe", ar: "أوروبا", flag: "🌍", key: "Europe" }, { id: "OCE", kind: "region", en: "Oceania", ar: "أوقيانوسيا", flag: "🌏", key: "Oceania" },
  { id: "SSA", kind: "subregion", en: "Sub-Saharan Africa", ar: "أفريقيا جنوب الصحراء", flag: "🌍", key: "Sub-Saharan Africa" }, { id: "NAF", kind: "subregion", en: "Northern Africa", ar: "شمال أفريقيا", flag: "🌍", key: "Northern Africa" }, { id: "WAS", kind: "subregion", en: "Western Asia (Middle East)", ar: "غرب آسيا (الشرق الأوسط)", flag: "🌏", key: "Western Asia" },
  { id: "CAS", kind: "subregion", en: "Central Asia", ar: "آسيا الوسطى", flag: "🌏", key: "Central Asia" }, { id: "SAS", kind: "subregion", en: "Southern Asia", ar: "جنوب آسيا", flag: "🌏", key: "Southern Asia" }, { id: "SEA", kind: "subregion", en: "South-eastern Asia", ar: "جنوب شرق آسيا", flag: "🌏", key: "South-eastern Asia" }, { id: "EAS", kind: "subregion", en: "Eastern Asia", ar: "شرق آسيا", flag: "🌏", key: "Eastern Asia" },
  { id: "LAC", kind: "subregion", en: "Latin America and the Caribbean", ar: "أمريكا اللاتينية والكاريبي", flag: "🌎", key: "Latin America and the Caribbean" }, { id: "NAA", kind: "subregion", en: "Northern America", ar: "أمريكا الشمالية", flag: "🌎", key: "Northern America" },
  { id: "WEU", kind: "subregion", en: "Western Europe", ar: "غرب أوروبا", flag: "🌍", key: "Western Europe" }, { id: "NEU", kind: "subregion", en: "Northern Europe", ar: "شمال أوروبا", flag: "🌍", key: "Northern Europe" }, { id: "SEU", kind: "subregion", en: "Southern Europe", ar: "جنوب أوروبا", flag: "🌍", key: "Southern Europe" }, { id: "EEU", kind: "subregion", en: "Eastern Europe", ar: "شرق أوروبا", flag: "🌍", key: "Eastern Europe" },
  { id: "ANZ", kind: "subregion", en: "Australia and New Zealand", ar: "أستراليا ونيوزيلندا", flag: "🌏", key: "Australia and New Zealand" }, { id: "MLN", kind: "subregion", en: "Melanesia", ar: "ميلانيزيا", flag: "🌏", key: "Melanesia" }, { id: "MCR", kind: "subregion", en: "Micronesia", ar: "ميكرونيزيا", flag: "🌏", key: "Micronesia" }, { id: "PLY", kind: "subregion", en: "Polynesia", ar: "بولينيزيا", flag: "🌏", key: "Polynesia" },
  { id: "GCC", kind: "bloc", en: "Gulf Cooperation Council (without the UAE)", ar: "مجلس التعاون الخليجي (دون الإمارات)", flag: "🤝", key: "gcc" }, { id: "ARB", kind: "bloc", en: "Arab League", ar: "جامعة الدول العربية", flag: "🤝", key: "arableague" }, { id: "OIC", kind: "bloc", en: "Organisation of Islamic Cooperation", ar: "منظمة التعاون الإسلامي", flag: "🤝", key: "oic" },
  { id: "BRI", kind: "bloc", en: "BRICS", ar: "بريكس", flag: "🤝", key: "brics" }, { id: "AFU", kind: "bloc", en: "African Union", ar: "الاتحاد الأفريقي", flag: "🤝", key: "au" }, { id: "ASN", kind: "bloc", en: "ASEAN", ar: "آسيان", flag: "🤝", key: "asean" }, { id: "EUN", kind: "bloc", en: "European Union", ar: "الاتحاد الأوروبي", flag: "🤝", key: "eu" }, { id: "OPC", kind: "bloc", en: "OPEC+", ar: "أوبك+", flag: "🤝", key: "opecplus" },
  { id: "ENE", kind: "sector", en: "Energy and resources", ar: "الطاقة والموارد", flag: "⚡", key: "energy" }, { id: "TEC", kind: "sector", en: "Technology and AI", ar: "التقنية والذكاء الاصطناعي", flag: "💻", key: "technology" }, { id: "TRD", kind: "sector", en: "Trade routes, ports and logistics", ar: "طرق التجارة والموانئ والخدمات اللوجستية", flag: "🚢", key: "logistics" },
  { id: "CAP", kind: "sector", en: "Finance and capital flows", ar: "التمويل وتدفقات رأس المال", flag: "💰", key: "finance" }, { id: "FOD", kind: "sector", en: "Food and water security", ar: "الأمن الغذائي والمائي", flag: "🌾", key: "food" }, { id: "MNR", kind: "sector", en: "Critical minerals", ar: "المعادن الحرجة", flag: "⛏️", key: "minerals" },
  { id: "DEF", kind: "sector", en: "Defence and security", ar: "الدفاع والأمن", flag: "🛡️", key: "defence" }, { id: "CLM", kind: "sector", en: "Climate and environment", ar: "المناخ والبيئة", flag: "🌡️", key: "climate" },
];
export const SCOPE_BY = new Map(SCOPES.map((s) => [s.id, s]));
export const isScope = (id: string) => SCOPE_BY.has(id);
export const KIND_LABEL: Record<ScopeKind, { en: string; ar: string }> = { global: { en: "Global", ar: "عالمي" }, region: { en: "Region", ar: "إقليم" }, subregion: { en: "Sub-region", ar: "إقليم فرعي" }, bloc: { en: "Bloc", ar: "تكتل" }, sector: { en: "Sector", ar: "قطاع" } };
/** A scope dressed as a country record, so the briefing workspace, the library and the saved copies treat it like any other subject. */
export function scopeCountry(s: Scope): Country {
  return { iso3: s.id, iso2: s.id.slice(0, 2), qid: null, num: "000", name: s.en, nameAr: s.ar, capital: null, lat: null, lng: null, region: KIND_LABEL[s.kind].en, flag: s.flag, population: null, areaKm2: null, currencies: [], languages: [], borders: [] };
}
/** The line a prompt gets so that the model knows its subject is not a single country. */
export function scopeLine(id: string): string {
  const s = SCOPE_BY.get(id); if (!s) return "";
  if (s.kind === "global") return "Scope: the world as a whole (no single country). Cover the global system, the regions and the countries and institutions that drive it, and say what matters to the UAE.";
  if (s.kind === "sector") return `Scope: the sector "${s.en}" worldwide (no single country). Cover the sector's global structure, the countries, companies and routes that drive it, and say what matters to the UAE.`;
  if (s.kind === "bloc") return `Scope: the bloc "${s.en}" as a group of countries (not a single government's position). Cover the member states that matter most and where they differ.`;
  return `Scope: the ${s.kind === "region" ? "region" : "sub-region"} "${s.en}" as a group of countries (not a single government's position). Cover the three to five countries that matter most and where they differ.`;
}
