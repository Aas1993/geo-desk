// Analyst roles and the routing rule that picks the team for a question (FALCON EYE section 10). The coordinator starts from a small default team and expands only when the question or the evidence calls for it:
// ten agents are never run for a simple lookup. Professional roles, not invented people. Roles are methodological lenses; running several in one model call is allowed and cheaper, as long as each keeps its own section and its own evidence.
export type RoleId = "research" | "country" | "macro" | "financial" | "equity" | "trade" | "foresight" | "policy" | "challenger" | "verifier" | "natsec" | "energysec" | "foodsec";
export type Role = { id: RoleId; en: string; ar: string; lens: string; invoke: { en: string; ar: string }; group: "evidence" | "economy" | "outlook" | "review" };
export const ROLES: Role[] = [
  { id: "research", group: "evidence", en: "Research synthesis analyst", ar: "محلل تركيب الأبحاث", lens: "UAE and global research comparison and source dependence", invoke: { en: "Any research-based dossier", ar: "أي ملف قائم على الأبحاث" } },
  { id: "country", group: "evidence", en: "Country and political economy analyst", ar: "محلل الدولة والاقتصاد السياسي", lens: "institutions, local context and implementation constraints", invoke: { en: "Country or region decisions", ar: "قرارات الدول والأقاليم" } },
  { id: "macro", group: "economy", en: "Macroeconomic analyst", ar: "محلل الاقتصاد الكلي", lens: "growth, inflation, fiscal and external dynamics", invoke: { en: "Material macro exposure", ar: "انكشاف كلي جوهري" } },
  { id: "financial", group: "economy", en: "Financial conditions analyst", ar: "محلل الأحوال المالية", lens: "banking, credit, rates, liquidity and contagion", invoke: { en: "Material financing or stability questions", ar: "أسئلة تمويل أو استقرار جوهرية" } },
  { id: "equity", group: "economy", en: "Equity and sector analyst", ar: "محلل الأسهم والقطاعات", lens: "filings, valuation, market structure and firm exposures", invoke: { en: "Securities or listed-sector scope", ar: "نطاق أوراق مالية أو قطاع مدرج" } },
  { id: "trade", group: "economy", en: "Trade and investment analyst", ar: "محلل التجارة والاستثمار", lens: "flows, concentration, routes, barriers and commercial feasibility", invoke: { en: "Trade or investment scope", ar: "نطاق تجارة أو استثمار" } },
  { id: "natsec", group: "outlook", en: "National security analyst", ar: "محلل الأمن الوطني", lens: "threats to UAE people, infrastructure and routes: terrorism, cyber, interference and illicit finance (policy level, public sources)", invoke: { en: "Every package (the UAE's national security is checked on all of them)", ar: "كل حزمة (يُفحص الأمن الوطني الإماراتي في جميعها)" } },
  { id: "energysec", group: "economy", en: "Energy security analyst", ar: "محلل أمن الطاقة", lens: "energy supply, routes, prices and the transition, and where UAE energy companies can secure supply or invest", invoke: { en: "Every package", ar: "كل حزمة" } },
  { id: "foodsec", group: "economy", en: "Food security analyst", ar: "محلل الأمن الغذائي", lens: "staples and agri-inputs a country can supply, routes and export-policy risk, and UAE agri-food investment and offtake", invoke: { en: "Every package", ar: "كل حزمة" } },
  { id: "foresight", group: "outlook", en: "Foresight analyst", ar: "محلل الاستشراف", lens: "alternative futures and nonlinear consequences", invoke: { en: "Medium or long horizon, or high uncertainty", ar: "أفق متوسط أو بعيد أو عدم يقين مرتفع" } },
  { id: "policy", group: "outlook", en: "UAE policy analyst", ar: "محلل السياسة الإماراتية", lens: "feasible UAE options, ownership and trade-offs", invoke: { en: "Every decision package", ar: "كل حزمة قرار" } },
  { id: "challenger", group: "review", en: "Independent challenger", ar: "المُحاجِج المستقل", lens: "counterevidence, model limitations and failure modes", invoke: { en: "Every consequential consolidated package", ar: "كل حزمة موحدة ذات أثر" } },
  { id: "verifier", group: "review", en: "Evidence and quantitative verifier", ar: "مدقق الأدلة والكميات", lens: "freshness, source support, calculations and provenance", invoke: { en: "All published analytical outputs", ar: "كل المخرجات التحليلية المنشورة" } },
];
export const ROLE_BY = new Map(ROLES.map((r) => [r.id, r]));
export type RouteInput = { question: string; iso3: string | null; horizonYears: number; hasResearch: boolean; flags: { macro: boolean; financial: boolean; trade: boolean }; consequential: boolean; listed?: boolean };
const has = (q: string, re: RegExp) => re.test(q);
const RE = {
  macro: /\b(gdp|growth|inflation|fiscal|budget|deficit|debt|recession|macro\w*|economy|economic|current account|unemployment|forecast\w*)\b/i,
  fin: /\b(bank\w*|credit|loan\w*|rate\w*|liquidity|financ\w*|funding|yield\w*|bond\w*|default|reserve\w*|currency|peg|fx|capital flow\w*|contagion)\b/i,
  eq: /\b(stock\w*|equit\w*|share\w*|listed|adx|dfm|valuation|dividend\w*|earnings|index|securit\w*|ipo)\b/i,
  trade: /\b(trade|export\w*|import\w*|tariff\w*|supply chain\w*|logistic\w*|port\w*|route\w*|invest\w*|fdi|market access|cepa|diversif\w*|opportunit\w*)\b/i,
  fore: /\b(scenario\w*|future\w*|long.term|decade|2030|2035|2040|2050|outlook|trajector\w*|shock\w*|transition)\b/i,
};
/** The default small team for a question, with the reason each role is in. UAE policy analyst, the challenger and the verifier are always in, as the specification requires; a decision of no consequence may drop the challenger. */
export function selectRoles(i: RouteInput): { roles: RoleId[]; why: Partial<Record<RoleId, { en: string; ar: string }>> } {
  const q = i.question; const why: Partial<Record<RoleId, { en: string; ar: string }>> = {}; const on = (id: RoleId, en: string, ar: string) => { why[id] = { en, ar }; };
  on("policy", "Every decision package needs feasible UAE options.", "كل حزمة قرار تحتاج خيارات إماراتية ممكنة.");
  on("natsec", "The UAE's national security is checked on every package.", "يُفحص الأمن الوطني الإماراتي في كل حزمة.");
  on("energysec", "Energy security is checked on every package.", "يُفحص أمن الطاقة في كل حزمة.");
  on("foodsec", "Food security is checked on every package.", "يُفحص الأمن الغذائي في كل حزمة.");
  on("verifier", "All analytical outputs are checked for freshness, support and arithmetic.", "تُفحص كل المخرجات التحليلية من حيث الحداثة والإسناد والحساب.");
  if (i.consequential) on("challenger", "The package is consequential, so an independent challenger is required.", "الحزمة ذات أثر، فيلزم مُحاجِج مستقل.");
  if (i.iso3) on("country", "A country is in scope.", "دولة ضمن النطاق.");
  if (i.hasResearch || has(q, /\b(research|think.?tank|paper|study|report|argues?)\b/i)) on("research", "Research cards are in scope, or the question asks about research.", "بطاقات بحثية ضمن النطاق أو يسأل السؤال عن الأبحاث.");
  if (has(q, RE.macro) || i.flags.macro) on("macro", has(q, RE.macro) ? "The question concerns the macro-economy." : "A macro indicator is in alert or watch.", has(q, RE.macro) ? "السؤال عن الاقتصاد الكلي." : "مؤشر كلي في حالة إنذار أو مراقبة.");
  if (has(q, RE.fin) || i.flags.financial) on("financial", has(q, RE.fin) ? "The question concerns financing or stability." : "A financial-conditions indicator is in alert or watch.", has(q, RE.fin) ? "السؤال عن التمويل أو الاستقرار." : "مؤشر للأحوال المالية في حالة إنذار أو مراقبة.");
  if (i.listed || has(q, RE.eq)) on("equity", "Securities or a listed sector are in scope.", "أوراق مالية أو قطاع مدرج ضمن النطاق.");
  if (has(q, RE.trade) || i.flags.trade) on("trade", "Trade, investment or diversification is in scope.", "التجارة أو الاستثمار أو التنويع ضمن النطاق.");
  if (i.horizonYears >= 3 || has(q, RE.fore)) on("foresight", "The horizon is medium or long, or the question is about alternative futures.", "الأفق متوسط أو بعيد أو السؤال عن مستقبلات بديلة.");
  const order = ROLES.map((r) => r.id).filter((id) => why[id]); return { roles: order, why };
}
/** Groups of selected roles that share one model call: three specialist runs at most, then the challenger and the verifier in parallel, then the chair. Roles stay separate sections inside a run. */
export const groupsOf = (roles: RoleId[]) => (["evidence", "economy", "outlook"] as const).map((g) => ({ id: g, roles: roles.filter((r) => ROLE_BY.get(r)!.group === g) })).filter((g) => g.roles.length);
