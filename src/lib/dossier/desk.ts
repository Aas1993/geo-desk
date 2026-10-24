import { oneLine, noteText } from "../guard";
import { SYSTEM } from "./prompt";
import { STATECRAFT } from "../statecraft";

// The political and economic DESK BRIEF: a long analytical country brief for a desk officer, built from the topics the officer picks, at the length and detail they choose.
export type TopicGroup = { id: string; en: string; ar: string; items: { key: string; en: string; ar: string }[] };
export const DESK_TOPICS: TopicGroup[] = [
  { id: "political", en: "Political", ar: "السياسة", items: [
    { key: "leadership", en: "Leadership, institutions and who decides", ar: "القيادة والمؤسسات وصنّاع القرار" },
    { key: "domestic", en: "Domestic politics, elections and stability", ar: "السياسة الداخلية والانتخابات والاستقرار" },
    { key: "unrest", en: "Unrest, protests and civil-society pressure", ar: "الاضطرابات والاحتجاجات وضغوط المجتمع المدني" },
    { key: "foreign", en: "Foreign policy, alliances and major-power ties", ar: "السياسة الخارجية والتحالفات وعلاقات القوى الكبرى" },
    { key: "regional", en: "Regional dynamics, disputes and mediation", ar: "الديناميات الإقليمية والنزاعات والوساطة" },
    { key: "security", en: "Security, conflict and terrorism", ar: "الأمن والنزاع والإرهاب" },
    { key: "sanctions", en: "Sanctions, export controls and compliance exposure", ar: "العقوبات وضوابط التصدير ومخاطر الامتثال" },
    { key: "governance", en: "Governance, rule of law and corruption", ar: "الحوكمة وسيادة القانون والفساد" },
    { key: "narrative", en: "Public narrative and media toward the UAE", ar: "الخطاب العام والإعلام تجاه الإمارات" },
  ] },
  { id: "economic", en: "Economic", ar: "الاقتصاد", items: [
    { key: "macro", en: "Macroeconomy: growth, inflation, jobs (five-year series)", ar: "الاقتصاد الكلي: النمو والتضخم والوظائف (خمس سنوات)" },
    { key: "fiscal", en: "Public finances, debt, ratings and IMF programmes", ar: "المالية العامة والدين والتصنيفات وبرامج صندوق النقد" },
    { key: "external", en: "External position: current account, reserves, exchange rate", ar: "الوضع الخارجي: الحساب الجاري والاحتياطيات وسعر الصرف" },
    { key: "trade", en: "Trade with the UAE and market access", ar: "التجارة مع الإمارات والنفاذ إلى الأسواق" },
    { key: "investment", en: "Investment and finance: UAE capital, banks, funds", ar: "الاستثمار والتمويل: رؤوس الأموال الإماراتية والبنوك والصناديق" },
    { key: "sectors", en: "Sectors and opportunities (energy, logistics, food, tech, tourism, mining)", ar: "القطاعات والفرص (الطاقة واللوجستيات والغذاء والتقنية والسياحة والتعدين)" },
    { key: "business", en: "Business environment, regulation and barriers", ar: "بيئة الأعمال والتنظيم والعوائق" },
    { key: "development", en: "Development finance and aid", ar: "تمويل التنمية والمساعدات" },
    { key: "labour", en: "Labour, demographics and remittances", ar: "العمل والديموغرافيا والتحويلات" },
  ] },
  { id: "uae", en: "Relationship with the UAE", ar: "العلاقة مع الإمارات", items: [
    { key: "history", en: "Diplomatic history and engagement log", ar: "التاريخ الدبلوماسي وسجل التواصل" },
    { key: "agreements", en: "Agreements, MoUs and their implementation", ar: "الاتفاقيات ومذكرات التفاهم وتنفيذها" },
    { key: "aviation", en: "Aviation and connectivity", ar: "الطيران والربط" },
    { key: "consular", en: "Nationals, businesses and consular matters", ar: "المواطنون والأعمال والشؤون القنصلية" },
    { key: "multilateral", en: "Multilateral and UN alignment, candidacies", ar: "التعددية والتوافق في الأمم المتحدة والترشيحات" },
    { key: "softpower", en: "Soft power: education, culture, humanitarian", ar: "القوة الناعمة: التعليم والثقافة والعمل الإنساني" },
  ] },
  { id: "strategy", en: "Strategy and influence", ar: "الاستراتيجية والنفوذ", items: [
    { key: "play", en: "The UAE play: options, recommended moves and sequencing", ar: "خطة الإمارات: الخيارات والتحركات الموصى بها وتسلسلها" },
    { key: "rivals", en: "Rival powers and the competition for influence", ar: "القوى المنافسة والتنافس على النفوذ" },
    { key: "levers", en: "Levers: hard, economic, financial, logistic and soft power", ar: "الأدوات: القوة الصلبة والاقتصادية والمالية واللوجستية والناعمة" },
    { key: "scorecard", en: "Country scorecard: every aspect, with drivers", ar: "بطاقة أداء الدولة: كل الجوانب ومحركاتها" },
  ] },
  { id: "forward", en: "Looking ahead", ar: "نظرة مستقبلية", items: [
    { key: "scenarios", en: "Scenarios and risk register (12 to 24 months)", ar: "السيناريوهات وسجل المخاطر (12 إلى 24 شهرًا)" },
    { key: "watch", en: "Indicators to watch and calendar of coming events", ar: "مؤشرات المتابعة وجدول الأحداث القادمة" },
    { key: "actions", en: "Recommended desk actions and open questions", ar: "إجراءات المكتب الموصى بها والأسئلة المفتوحة" },
  ] },
];
export const ALL_TOPICS = DESK_TOPICS.flatMap((g) => g.items.map((i) => i.key));
const T = (...ids: string[]) => ids;
export const PRESETS: { id: string; en: string; ar: string; topics: string[] }[] = [
  { id: "political", en: "Political desk", ar: "مكتب الشؤون السياسية", topics: T("scorecard", "play", "leadership", "domestic", "unrest", "foreign", "regional", "security", "sanctions", "narrative", "history", "agreements", "multilateral", "scenarios", "watch", "actions") },
  { id: "economic", en: "Economic desk", ar: "مكتب الشؤون الاقتصادية", topics: T("scorecard", "play", "macro", "fiscal", "external", "trade", "investment", "sectors", "business", "development", "history", "agreements", "aviation", "scenarios", "watch", "actions") },
  { id: "joint", en: "Joint political and economic", ar: "السياسي والاقتصادي معًا", topics: T("scorecard", "play", "leadership", "domestic", "foreign", "security", "sanctions", "macro", "fiscal", "external", "trade", "investment", "sectors", "history", "agreements", "scenarios", "watch", "actions") },
  { id: "strategic", en: "Strategic influence", ar: "النفوذ الاستراتيجي", topics: T("scorecard", "play", "rivals", "levers", "foreign", "regional", "security", "investment", "sectors", "agreements", "softpower", "scenarios", "watch", "actions") },
  { id: "all", en: "Everything", ar: "كل شيء", topics: ALL_TOPICS },
];
export const DESK_LENGTHS = [["short", "Short (about 1,500 words)", "قصير (نحو 1500 كلمة)"], ["standard", "Standard (about 4,000 words)", "قياسي (نحو 4000 كلمة)"], ["detailed", "Detailed (about 6,000 words)", "مفصّل (نحو 6000 كلمة)"], ["exhaustive", "Exhaustive (up to about 10,000 words)", "شامل جدًا (حتى نحو 10000 كلمة)"]] as const;
export const DESK_STYLES = [["bullets", "Bullet summary", "نقاط موجزة"], ["analysis", "Analytical prose", "تحليل نثري"], ["full", "Full analysis with evidence tables", "تحليل كامل مع جداول الأدلة"]] as const;
export const DESK_HORIZONS = [["30d", "Last 30 days", "آخر 30 يومًا"], ["12m", "Last 12 months", "آخر 12 شهرًا"], ["5y", "Five years", "خمس سنوات"]] as const;
export const DESK_LENSES = [["joint", "Political and economic", "السياسي والاقتصادي"], ["political", "Political emphasis", "تركيز سياسي"], ["economic", "Economic emphasis", "تركيز اقتصادي"]] as const;
export type DeskLength = (typeof DESK_LENGTHS)[number][0]; export type DeskStyle = (typeof DESK_STYLES)[number][0]; export type DeskHorizon = (typeof DESK_HORIZONS)[number][0]; export type DeskLens = (typeof DESK_LENSES)[number][0];
export type DeskOptions = { topics: string[]; custom: string; length: DeskLength; style: DeskStyle; horizon: DeskHorizon; lens: DeskLens; lang: "en" | "ar"; context: string };
const pick = <T extends string>(list: readonly (readonly [T, string, string])[], v: unknown, d: T): T => (list.some(([k]) => k === v) ? (v as T) : d);
export function cleanDeskOptions(b: Record<string, unknown>): DeskOptions {
  const raw = Array.isArray(b.topics) ? (b.topics as unknown[]).filter((x): x is string => typeof x === "string" && ALL_TOPICS.includes(x)) : []; const topics = ALL_TOPICS.filter((k) => raw.includes(k)); // fixed order, no duplicates
  const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n) : "");
  return { topics: topics.length ? topics : PRESETS[2].topics, custom: oneLine(txt(b.custom, 600), 600), length: pick(DESK_LENGTHS, b.length, "standard"), style: pick(DESK_STYLES, b.style, "analysis"), horizon: pick(DESK_HORIZONS, b.horizon, "12m"), lens: pick(DESK_LENSES, b.lens, "joint"), lang: b.lang === "ar" ? "ar" : "en", context: noteText(txt(b.context, 4000)) };
}
export const deskKey = (iso3: string, o: DeskOptions) => { const s = JSON.stringify([o.topics, o.custom, o.length, o.style, o.horizon, o.lens, o.lang, o.context]); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return `desk:${iso3}:${o.lang}:${o.length}:${h >>> 0}`; };
/** Search and fetch budgets and output ceilings per length: these bound what one run can cost. */
export const DESK_BUDGET: Record<DeskLength, { maxTokens: number; searches: number; fetches: number; fetchTokens: number; words: number }> = {
  short: { maxTokens: 12_000, searches: 5, fetches: 1, fetchTokens: 8_000, words: 1500 },
  standard: { maxTokens: 24_000, searches: 8, fetches: 2, fetchTokens: 10_000, words: 4000 },
  detailed: { maxTokens: 38_000, searches: 12, fetches: 3, fetchTokens: 12_000, words: 6000 },
  exhaustive: { maxTokens: 50_000, searches: 14, fetches: 4, fetchTokens: 12_000, words: 10000 },
};
const label = (key: string) => DESK_TOPICS.flatMap((g) => g.items).find((i) => i.key === key)?.en ?? key;

// The evidence rules are shared with the ministerial brief, so the two cannot drift apart.
const EVIDENCE = SYSTEM.slice(SYSTEM.indexOf("# Evidence rules"), SYSTEM.indexOf("# What you produce"));
export const DESK_SYSTEM = `You are a senior analyst on a UAE Ministry of Foreign Affairs political and economic desk. You write the DESK BRIEF: a detailed, evidence-led country analysis that a desk officer uses to brief upward, answer ministry queries and keep watch on the country. It is analysis, not talking points (a separate ministerial brief covers what to say in a meeting). The officer chooses the topics, the length and the level of detail, and you follow those choices exactly.

${EVIDENCE}
# What you produce
One markdown document with exactly three top-level parts, each starting with a level-1 heading ("# ") with these exact titles, in this order: "# 1. Desk Summary", "# 2. Analysis by Topic", "# 3. Annexes". Use level-2 ("## ") headings inside a part and markdown tables for indicators, chronologies and registers. Start with a title line ("# Desk Brief: <country>") and a one-line "Prepared for / Lens / Horizon / As of / Newest source" block. Never write a preamble or a closing remark about the task.

## Part 1. Desk Summary
- "Key judgments": 5 to 8 numbered bullets, each a finding in one or two sentences with a confidence (High, Medium, Low), the main evidence, and why it matters to the UAE.
- "Indicator dashboard": a table of the most important numbers from the chosen topics (indicator, latest value, date, change over the horizon, source). Use the application's series in the facts first; add web figures only with a source and date. "not found" is an acceptable cell.
- "Country scorecard": a compact table of the seven aspects from the application's scorecard fact (friendliness toward the UAE, political, economic, financial, social and people-to-people, security and risk, UAE leverage): score, one-line driver, direction. If the scorecard fact is missing, say so.
- "The UAE play in brief": three lines: the best opening for UAE influence, the main exposure, and the one thing to watch.
- "What has changed": the developments inside the requested horizon that move the picture, newest first.
- "How solid this is": two lines on evidence quality and the biggest gaps.

## Part 2. Analysis by Topic
One "## " section per CHOSEN topic, in the order given in the request, titled exactly as the topic. Cover only the chosen topics and any custom subjects (as extra "## " sections at the end of Part 2, before Part 3, never inside the annexes); do not add others. Write each section in the requested style:
- bullets: 4 to 8 tight bullets with figures, dates and a source each; no long prose.
- analysis: two to four paragraphs: what the situation is, what drives it, what it means for the UAE, and the outlook with a confidence.
- full: the situation; an evidence table (indicator or fact, value, date, source, status); the drivers and the competing explanations; implications for the UAE (political, economic, security, reputational); the outlook with a confidence; and "what would change our view".
The Strategy and influence topics follow the statecraft lens below: "The UAE play" gives the strategic objective (assumed unless stated), a power map by instrument, three courses of action with costs, second-order effects and probabilities, a recommended sequenced play with timing windows, owners as roles and kill criteria, gives, gets and holds-back, and a red team with tripwires. "Rival powers" is a table of each rival present (Saudi Arabia, Qatar, Türkiye, China, India, the US, the EU and its members, Russia, Iran, Israel) with sourced evidence of footprint, direction and what it means for the UAE, and says plainly where the UAE is ahead, level or behind. "Levers" goes instrument by instrument (hard, economic, financial, logistic, soft, humanitarian, diplomatic): what the UAE holds, what it could add, at what cost. "Country scorecard" explains each of the seven aspects: the application score, the drivers behind it, what would move it and what the UAE can do about the weakest aspects.
Where a topic needs UAE internal records, positions or mandates (for example consular cases, approved positions, company exposure), write "DESK INPUT REQUIRED:" with what is needed, unless the desk context supplies it.

## Part 3. Annexes
- "Chronology": a dated table (date, event, why it matters, source) across the horizon.
- "Data tables": the five-year series available (growth, inflation, debt, current account, trade with the UAE and others) as tables, with notes on definitions and gaps.
- "Source assessment": a table of the main sources used (source, type, reliability High/Medium/Low, used for).
- "Gaps and requests": what could not be established and what the desk or embassy should supply.
- "Watchlist": a table (indicator or event, trigger or date, why it matters to the UAE, what to do).

${STATECRAFT}

# Length and balance
The request gives a total word target. Spend about 10 percent on Part 1 and 10 percent on Part 3 and divide the rest across the chosen topics, giving more to topics that matter more under the stated lens (political emphasis, economic emphasis or joint) and to topics where the evidence is richest. For the Detailed and Exhaustive lengths treat the target as a floor: write at least 85 percent of it, spending the extra on evidence tables, drivers and implications for the UAE, never on repetition. Stay within about 15 percent above the target in total. Tables and links cost space: plan the budget so that all three parts are finished, and shorten topic sections rather than leave out Part 3 or end mid-sentence. In a short brief, keep Part 3 to the chronology and the watchlist. Never pad: if the evidence is thin, say so and keep that section short.

# Horizon
The request gives a time horizon (last 30 days, last 12 months or five years). Weight developments and data inside it, mention longer-run context only where it changes the reading, and date every item. Today's date is given in the request: do not cite anything dated after it.

# Indicators in the facts
The facts can include leverage and exposure (how far each side leans on the other), bilateral temperature (GDELT events between UAE and the country), World Bank governance scores, the leadership clock (tenure, age, coming elections), UAE humanitarian funding reported to OCHA FTS, UAE investment position, and UAE company and fund deals read from WAM headlines. Use them: lead the leverage and temperature readings in the dashboard and the strategic-importance assessment, use governance and the leadership clock for the political assessment and the counterpart's authority, use the aid and investment figures for development and economic sections, and use the deal facts as the base list of UAE investments in the country, each with its link and described as an announcement, not a verified transaction. State plainly what each figure is not (percentiles are position, not power; temperature is machine-coded news; FTS is only humanitarian reporting). If a fact is absent, say it was not found.

# Cost discipline and research effort
Every run has a hard ceiling of about one US dollar, and a typical run uses well under half of it, so the search budget in the request is there to be used on what decides the quality of the advice: (1) what has happened in the last 30 days in this country and in its relationship with the UAE; (2) who else is present here (investment, lending, ports, arms, bases, mediation) among Saudi Arabia, Qatar, Türkiye, China, India, the US, the EU and its members, Russia and Iran, and which of them is moving; (3) the counterpart, and the scheduled events of the next 90 days (elections, IMF reviews, debt maturities, summits). Plan the searches so each answers a different one of these, never repeat a query, and prefer what a search result already says over fetching a page. Never write "not researched" about rivals or recent events: search for it, or write "not found after searching". Write each section once, in final form: no drafts, no restating the same fact in several sections. Keep tables compact. If budget runs short, finish every part in shorter form rather than leave a part out.

# Research method
Start from the facts and from what happened most recently: run your first searches for the last 30 days in this country and in its relationship with the UAE (and for scheduled events in the next 90 days), put the date of the newest source you relied on in the "As of" line, and mark anything older than 90 days as possibly stale where it drives a conclusion. Then research with the tools only what the facts lack, topic by topic, preferring official, institutional and primary sources with dates. Stop once a topic is adequately supported. Write in the requested language; for Arabic use Modern Standard Arabic, keep URLs and fact ids such as F12 in Latin characters and keep table structure.`;

export function deskMessage(o: { facts: string; asOf: string; country: string; options: DeskOptions }) {
  const x = o.options; const b = DESK_BUDGET[x.length]; const lens = DESK_LENSES.find(([k]) => k === x.lens)![1]; const hz = DESK_HORIZONS.find(([k]) => k === x.horizon)![1]; const st = DESK_STYLES.find(([k]) => k === x.style)![1];
  return `<facts country="${o.country}" as_of="${o.asOf}">\n${o.facts}\n</facts>\n\n<desk_input>\n${x.context ? `<note kind="desk context, approved positions and instructions">\n${x.context}\n</note>\n` : "(none supplied)\n"}</desk_input>\n\n<request>\nCountry: ${o.country}\nLens: ${lens}\nTime horizon: ${hz}\nStyle: ${st} (${x.style})\nTotal length: about ${b.words.toLocaleString("en")} words\nResearch budget: up to ${b.searches} web searches and ${b.fetches} page fetches (use the searches)\nChosen topics, in this order (${x.topics.length}):\n${x.topics.map((k, i) => `${i + 1}. ${label(k)}`).join("\n")}\n${x.custom ? `Custom subjects to cover as extra sections at the end: ${x.custom}\n` : ""}Language: ${x.lang === "ar" ? "Arabic (Modern Standard)" : "English"}\nToday: ${o.asOf.slice(0, 10)}\n</request>\n\nWrite the desk brief now.`;
}
