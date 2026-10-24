// Pure labels shared by the server loader and the Intel tab (the tab must not import the server file for values: it reads the filesystem).
const WGI_LABEL: Record<string, string> = { pv: "Political stability", ge: "Government effectiveness", rl: "Rule of law", cc: "Control of corruption", rq: "Regulatory quality", va: "Voice and accountability" };
export const WGI_KEYS = Object.keys(WGI_LABEL); export const wgiLabel = (k: string) => WGI_LABEL[k] ?? k;

// Country scorecard labels: eleven aspects in three groups, each made of parts that are percentiles among all countries with data (or yes/no flags).
export const SCORE_GROUPS = { relationship: { en: "The relationship", ar: "العلاقة" }, country: { en: "The country", ar: "الدولة" }, world: { en: "Weight in the world", ar: "الثقل في العالم" } } as const;
export const SCORE_DIMS = [
  { key: "polfriends", group: "relationship", en: "Political friends", ar: "الأصدقاء السياسيون", hint: "How close the political relationship is: news and event tone, UN voting alignment, engagement, agreements and clubs shared with the UAE" },
  { key: "bizfriends", group: "relationship", en: "Business friends", ar: "الأصدقاء في الأعمال", hint: "How deep the commercial tie is: trade, UAE capital there, UAE deals, a CEPA, their investment in the UAE" },
  { key: "strategic", group: "relationship", en: "Strategic value to the UAE", ar: "القيمة الاستراتيجية للإمارات", hint: "Weight of the trade tie for the UAE, UAE logistics footprint, proximity to the Gulf, energy-club membership (a heuristic, not a geopolitical model)" },
  { key: "leverage", group: "relationship", en: "UAE leverage", ar: "نفوذ الإمارات", hint: "How much more they lean on the UAE than the UAE leans on them" },
  { key: "political", group: "country", en: "Political stability and capacity", ar: "الاستقرار السياسي والقدرة", hint: "Stability, government effectiveness and rule of law (World Bank)" },
  { key: "economic", group: "country", en: "Economic", ar: "اقتصادي", hint: "Growth, inflation, size and income level of the economy" },
  { key: "financial", group: "country", en: "Financial", ar: "مالي", hint: "Debt, external balance, regulatory quality and control of corruption" },
  { key: "social", group: "country", en: "Social and people-to-people", ar: "اجتماعي وتواصل الشعوب", hint: "Air connectivity, UAE humanitarian ties and openness (voice and accountability)" },
  { key: "security", group: "country", en: "Security and risk", ar: "الأمن والمخاطر", hint: "Sanctions-list entities and ransomware incidents per US$ billion of GDP (higher is safer)" },
  { key: "uninfluence", group: "world", en: "UN influence", ar: "النفوذ في الأمم المتحدة", hint: "Security Council seat, number of international bodies, and membership of vote-carrying blocs" },
  { key: "global", group: "world", en: "Global influence", ar: "النفوذ العالمي", hint: "Size of economy, population and trade, and seats in the G7, G20, BRICS, NATO, EU or SCO" },
] as const;
const PART: Record<string, string> = {
  temp: "Bilateral event tone", tone: "News tone about the UAE", align: "UN voting alignment", engage: "Engagement record", agree: "Agreements", shared: "Clubs shared with the UAE",
  trade: "Trade with the UAE", invest: "UAE investment stock", deals: "UAE deals (24 months)", cepa: "CEPA status", theirinv: "Their investment in the UAE",
  share: "Share of UAE trade", logi: "UAE logistics deals", near: "Gulf neighbour", energy: "OPEC or OPEC+ member", lev: "Their reliance minus UAE reliance",
  pv: "Political stability", ge: "Government effectiveness", rl: "Rule of law", growth: "Growth outlook", infl: "Inflation (lower is better)", gdp: "Size of economy", gdppc: "Income per head",
  debt: "Public debt (lower is better)", ca: "Current account", rq: "Regulatory quality", cc: "Control of corruption", connect: "Flights and embassy", aid: "UAE humanitarian funding", va: "Voice and accountability",
  sanc: "Sanctions entries per GDP (lower is better)", cyber: "Ransomware incidents per GDP (fewer is better)", unsc: "Security Council seat", orgs: "International bodies joined", blocs: "Vote-carrying blocs", pop: "Population", tradetot: "Total trade", forum: "Top-table seats (G7, G20, BRICS, NATO, EU, SCO)",
};
export const scorePartLabel = (k: string) => PART[k] ?? k;
export const SCORE_TIERS: Record<string, { en: string; ar: string }> = { strategic: { en: "Strategic partner", ar: "شريك استراتيجي" }, strong: { en: "Strong", ar: "قوي" }, mixed: { en: "Mixed", ar: "متفاوت" }, weak: { en: "Weak", ar: "ضعيف" }, thin: { en: "Thin ties", ar: "علاقات محدودة" } };

// The powers compared with the UAE in the rivals dataset (competition for trade weight in each country).
const RIVAL_NAME: Record<string, { en: string; ar: string }> = { ARE: { en: "UAE", ar: "الإمارات" }, CHN: { en: "China", ar: "الصين" }, USA: { en: "United States", ar: "الولايات المتحدة" }, IND: { en: "India", ar: "الهند" }, TUR: { en: "Türkiye", ar: "تركيا" }, SAU: { en: "Saudi Arabia", ar: "السعودية" }, QAT: { en: "Qatar", ar: "قطر" }, RUS: { en: "Russia", ar: "روسيا" }, DEU: { en: "Germany", ar: "ألمانيا" }, FRA: { en: "France", ar: "فرنسا" }, ITA: { en: "Italy", ar: "إيطاليا" }, GBR: { en: "United Kingdom", ar: "المملكة المتحدة" }, JPN: { en: "Japan", ar: "اليابان" }, KOR: { en: "South Korea", ar: "كوريا الجنوبية" } };
export const rivalName = (c: string, lang: "en" | "ar" = "en") => RIVAL_NAME[c]?.[lang] ?? c;
