// Pure labels shared by the server loader and the Intel tab (the tab must not import the server file for values: it reads the filesystem).
const WGI_LABEL: Record<string, string> = { pv: "Political stability", ge: "Government effectiveness", rl: "Rule of law", cc: "Control of corruption", rq: "Regulatory quality", va: "Voice and accountability" };
export const WGI_KEYS = Object.keys(WGI_LABEL); export const wgiLabel = (k: string) => WGI_LABEL[k] ?? k;

// Country scorecard labels: seven aspects, each made of parts that are percentiles among all countries with data.
export const SCORE_DIMS = [
  { key: "friendliness", en: "Friendliness toward the UAE", ar: "الود تجاه الإمارات", hint: "How warm the relationship is: news tone, bilateral event tone, UN voting alignment, engagement and agreements" },
  { key: "political", en: "Political", ar: "سياسي", hint: "Stability, government effectiveness and rule of law (World Bank)" },
  { key: "economic", en: "Economic", ar: "اقتصادي", hint: "Growth, inflation, size of the economy and trade with the UAE" },
  { key: "financial", en: "Financial", ar: "مالي", hint: "Debt, external balance, regulatory quality and UAE capital and deals" },
  { key: "social", en: "Social and people-to-people", ar: "اجتماعي وتواصل الشعوب", hint: "Air connectivity, UAE humanitarian ties and openness (voice and accountability)" },
  { key: "security", en: "Security and risk", ar: "الأمن والمخاطر", hint: "Sanctions-list exposure and cyber incidents (higher is safer)" },
  { key: "leverage", en: "UAE leverage", ar: "نفوذ الإمارات", hint: "How much more they lean on the UAE than the UAE leans on them" },
] as const;
const PART: Record<string, string> = {
  temp: "Bilateral event tone", tone: "News tone about the UAE", align: "UN voting alignment", engage: "Engagement record", agree: "Agreements", pv: "Political stability", ge: "Government effectiveness", rl: "Rule of law",
  growth: "Growth outlook", infl: "Inflation (lower is better)", gdp: "Size of economy", trade: "Trade with the UAE", debt: "Public debt (lower is better)", ca: "Current account", rq: "Regulatory quality", invest: "UAE investment stock", deals: "UAE deals (24 months)",
  connect: "Flights and embassy", aid: "UAE humanitarian funding", va: "Voice and accountability", sanc: "Sanctions exposure (lower is better)", cyber: "Ransomware incidents (fewer is better)", lev: "Their reliance minus UAE reliance",
};
export const scorePartLabel = (k: string) => PART[k] ?? k;
export const SCORE_TIERS: Record<string, { en: string; ar: string }> = { strategic: { en: "Strategic partner", ar: "شريك استراتيجي" }, strong: { en: "Strong", ar: "قوي" }, mixed: { en: "Mixed", ar: "متفاوت" }, weak: { en: "Weak", ar: "ضعيف" }, thin: { en: "Thin ties", ar: "علاقات محدودة" } };

// The powers compared with the UAE in the rivals dataset (competition for trade weight in each country).
const RIVAL_NAME: Record<string, { en: string; ar: string }> = { ARE: { en: "UAE", ar: "الإمارات" }, CHN: { en: "China", ar: "الصين" }, USA: { en: "United States", ar: "الولايات المتحدة" }, IND: { en: "India", ar: "الهند" }, TUR: { en: "Türkiye", ar: "تركيا" }, SAU: { en: "Saudi Arabia", ar: "السعودية" }, QAT: { en: "Qatar", ar: "قطر" }, RUS: { en: "Russia", ar: "روسيا" }, DEU: { en: "Germany", ar: "ألمانيا" }, FRA: { en: "France", ar: "فرنسا" }, ITA: { en: "Italy", ar: "إيطاليا" }, GBR: { en: "United Kingdom", ar: "المملكة المتحدة" }, JPN: { en: "Japan", ar: "اليابان" }, KOR: { en: "South Korea", ar: "كوريا الجنوبية" } };
export const rivalName = (c: string, lang: "en" | "ar" = "en") => RIVAL_NAME[c]?.[lang] ?? c;
