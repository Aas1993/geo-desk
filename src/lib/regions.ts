// Arabic names for every region and subregion label the data carries: the World Bank regions on countries.json, the UN regions and subregions on regions.json, and the catch-all. One table, so no screen shows an English region in an Arabic page.
export const REGION_AR: Record<string, string> = {
  Africa: "أفريقيا", Americas: "الأمريكتان", Asia: "آسيا", Europe: "أوروبا", Oceania: "أوقيانوسيا", Other: "أخرى",
  "Latin America & Caribbean": "أمريكا اللاتينية والكاريبي", "Middle East, North Africa, Afghanistan & Pakistan": "الشرق الأوسط وشمال أفريقيا وأفغانستان وباكستان", "Sub-Saharan Africa": "أفريقيا جنوب الصحراء",
  "Europe & Central Asia": "أوروبا وآسيا الوسطى", "East Asia & Pacific": "شرق آسيا والمحيط الهادئ", "South Asia": "جنوب آسيا", "North America": "أمريكا الشمالية",
  "Latin America and the Caribbean": "أمريكا اللاتينية والكاريبي", "Southern Asia": "جنوب آسيا", "Southern Europe": "جنوب أوروبا", "Western Asia": "غرب آسيا", "Australia and New Zealand": "أستراليا ونيوزيلندا", "Western Europe": "غرب أوروبا", "Eastern Europe": "شرق أوروبا",
  "South-eastern Asia": "جنوب شرق آسيا", "Northern America": "أمريكا الشمالية", "Eastern Asia": "شرق آسيا", "Northern Europe": "شمال أوروبا", "Northern Africa": "شمال أفريقيا", Melanesia: "ميلانيزيا", Micronesia: "ميكرونيزيا", "Central Asia": "آسيا الوسطى", Polynesia: "بولينيزيا",
};
/** The region label in the page language; an unknown label is shown as written, never dropped. */
export const regionLabel = (r: string | null | undefined, lang: string) => { const t = (r ?? "").trim(); return lang === "ar" ? REGION_AR[t] ?? t : t; };
/** Sector labels used by the announced-deals feed. */
export const SECTOR_AR: Record<string, string> = { energy: "الطاقة", finance: "المالية", other: "أخرى", health: "الصحة", "ports and logistics": "الموانئ واللوجستيات", industry: "الصناعة", technology: "التقنية", "real estate": "العقارات" };
export const sectorLabel = (s: string, lang: string) => (lang === "ar" ? SECTOR_AR[s] ?? s : s);
