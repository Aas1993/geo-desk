import type { B } from "../case/core";
import { ANGLES } from "../bird/score";

// THE COUNCIL ROUND TABLE: every council on the platform seated around one table, each with the course it gives the UAE on a country, what it says, how well it was checked and how it reads the country's fourteen angles, so the councils can be compared and (on a click, for about US$0.7) made to challenge each other. This file holds the seats, the pages' domain lenses and the types; reading a saved product is read.ts, the arithmetic of agreement is consensus.ts, the paid challenge is challenge.ts.
// Nothing here is a verdict. What a council "reads" is taken from its own saved output and labelled as such; a council with nothing on file is shown as not run, never filled in.
export type Course = "deepen" | "staged" | "hedge" | "hold";
/** The posture scale runs from the most reserved course to the most committed one. */
export const COURSES: Course[] = ["hold", "hedge", "staged", "deepen"];
export const COURSE_W: Record<Course, B> = { deepen: { en: "Deepen", ar: "تعميق" }, staged: { en: "Staged", ar: "على مراحل" }, hedge: { en: "Hedge", ar: "تحوّط" }, hold: { en: "Hold", ar: "ترقّب" } };
export const COURSE_C: Record<Course, string> = { deepen: "#0e9f6e", staged: "#0a7ea4", hedge: "#b8741a", hold: "#6b7280" };
export const NO_COURSE = "#9aa3af";
export const courseRank = (c: Course) => COURSES.indexOf(c);

export type SeatId = "data" | "council" | "architect" | "falcon" | "mach" | "deep" | "intel" | "plan" | "mofa" | "king" | "country" | "president";
/** How a saved product is checked by the quality gate, when it has one. */
export type GateKind = "king-council" | "emb-intel" | "emb-plan" | "mofa-council" | null;
export type SeatSpec = { id: SeatId; short: string; en: string; ar: string; role: B; key: ((iso: string) => string) | null; href: string; tab: B; gate: GateKind; /** The label of the product in the PDF and the archive. */ kind: string };
const b = (en: string, ar: string): B => ({ en, ar });
/** The order is the order the councils sit: the data first, then the strategic and security councils, the Ministry and the embassy, and the head of state's seats last. */
export const SEATS: SeatSpec[] = [
  { id: "data", short: "DB", en: "Case File data (rules)", ar: "بيانات ملف الحالة (قواعد)", role: b("The free rule-built posture and score from the data the platform holds; no model", "الموقف والدرجة المبنيان بالقواعد من البيانات المتاحة؛ دون نموذج"), key: null, href: "/case", tab: b("Case File", "ملف الحالة"), gate: null, kind: "case-report" },
  { id: "council", short: "SC", en: "Strategic Council", ar: "المجلس الاستراتيجي", role: b("Nineteen seats on the country's strategy, with a Chair", "تسعة عشر مقعدًا في استراتيجية الدولة برئيس"), key: (i) => `gd-case-council:${i}`, href: "/case", tab: b("Case File: Strategic Council", "ملف الحالة: المجلس الاستراتيجي"), gate: null, kind: "case-council" },
  { id: "architect", short: "AR", en: "Statecraft Architect", ar: "مهندس فن الحكم", role: b("The country strategy: end state, ways, means and sequencing", "استراتيجية الدولة: الحالة النهائية والوسائل والتسلسل"), key: (i) => `gd-case-architect:${i}`, href: "/case", tab: b("Case File: Architect", "ملف الحالة: المهندس"), gate: null, kind: "architect" },
  { id: "falcon", short: "FA", en: "Falcon Council", ar: "مجلس الصقر", role: b("Security, defence and hard power at policy level", "الأمن والدفاع والقوة الصلبة على مستوى السياسات"), key: (i) => `gd-council:${i}`, href: "/falcon", tab: b("Falcon Eye", "عين الصقر"), gate: null, kind: "falcon-council" },
  { id: "mach", short: "MA", en: "Machiavellian council", ar: "المجلس الميكيافيلي", role: b("Influence, leverage and lawful statecraft", "النفوذ والرافعات وفن الحكم المشروع"), key: (i) => `gd-scouncil:${i}`, href: "/machiavelli", tab: b("Machiavellian", "الميكيافيلي"), gate: null, kind: "mach-council" },
  { id: "deep", short: "DI", en: "Deep Intelligence team", ar: "فريق الاستخبارات المعمّقة", role: b("Deep research, judgments with likelihood and confidence", "بحث معمّق وأحكام باحتمال وثقة"), key: (i) => `gd-deep-council:${i}:full`, href: "/deep", tab: b("Deep Intelligence", "الاستخبارات المعمّقة"), gate: null, kind: "deep-council" },
  { id: "mofa", short: "MF", en: "The Ministry's Council", ar: "مجلس الوزارة", role: b("Foreign-policy priorities, goals and the mission's tasks", "أولويات السياسة الخارجية والأهداف ومهام البعثة"), key: (i) => `gd-desk:mofa-council:${i}`, href: "/mofa", tab: b("The Ministry", "الوزارة"), gate: "mofa-council", kind: "mofa-council" },
  { id: "intel", short: "EI", en: "Embassy intelligence", ar: "استخبارات السفارة", role: b("The ambassador's picture: power, partners, plays, risks", "صورة السفير: القوة والشركاء والفرص والمخاطر"), key: (i) => `gd-desk:emb-intel:${i}`, href: "/ambassador", tab: b("The Ambassador: intelligence", "السفير: الاستخبارات"), gate: "emb-intel", kind: "emb-intel" },
  { id: "plan", short: "EP", en: "Mission strategy and plans", ar: "استراتيجية البعثة وخططها", role: b("The embassy's strategy, initiatives and gates", "استراتيجية السفارة ومبادراتها وبواباتها"), key: (i) => `gd-desk:emb-plan:${i}`, href: "/ambassador", tab: b("The Ambassador: strategy", "السفير: الاستراتيجية"), gate: "emb-plan", kind: "emb-plan" },
  { id: "country", short: "CB", en: "Country brief", ar: "موجز الدولة", role: b("The whole country for the UAE reader, with the geopolitical assessment", "الدولة كاملة لقارئ إماراتي مع التقييم الجيوسياسي"), key: (i) => `gd-desk:country-full:${i}`, href: "/bird", tab: b("Bird's eye: Country brief", "نظرة الطائر: موجز الدولة"), gate: null, kind: "country-full" },
  { id: "president", short: "PB", en: "The President's brief", ar: "موجز الرئيس", role: b("Three pages for the head of state: scorecard, interests, corridor, decisions", "ثلاث صفحات لرئيس الدولة: بطاقة وأولويات وممر وقرارات"), key: (i) => `gd-desk:president-brief:${i}`, href: "/bird", tab: b("Bird's eye: President's brief", "نظرة الطائر: موجز الرئيس"), gate: null, kind: "president-brief" },
  { id: "king", short: "KG", en: "THE KING's Council", ar: "مجلس القرار النهائي", role: b("The decision for the head of state: four courses, judgments, risks", "القرار لرئيس الدولة: أربعة مسارات وأحكام ومخاطر"), key: (i) => `gd-desk:king-council:${i}`, href: "/king", tab: b("THE KING", "القرار النهائي"), gate: "king-council", kind: "king-council" },
];
export const SEAT_BY = new Map(SEATS.map((s) => [s.id, s]));
/** The councils that can debate (every seat that has a saved product). */
export const DEBATERS: SeatId[] = SEATS.filter((s) => s.key).map((s) => s.id);
export const isSeatId = (v: unknown): v is SeatId => typeof v === "string" && SEAT_BY.has(v as SeatId);
export const challengeKey = (iso: string) => `gd-desk:council-challenge:${iso}`;

// ---- the pages' domain lenses ----
export type LensId = "bird" | "country" | "mofa" | "ambassador" | "desk";
export type Lens = { id: LensId; en: string; ar: string; /** What the page asks of the councils. */ ask: B; /** The angles of the country score this page reads (the ids of ANGLES). */ angles: string[]; /** The councils that matter most on this page, first; the others are one click away. */ seats: SeatId[]; /** How many of those councils the page shows at first; the rest are one click away. */ focus: number };
const ALL = ANGLES.map((a) => a.id);
export const LENSES: Record<LensId, Lens> = {
  bird: { id: "bird", en: "The complete picture", ar: "الصورة الكاملة", ask: b("Every council and every angle: where the councils agree, where they split and what the arbiter recommends for the UAE.", "كل مجلس وكل زاوية: أين تتفق المجالس وأين تنقسم وما يوصي به الحكَم للإمارات."), angles: ALL, seats: SEATS.map((s) => s.id), focus: 12 },
  country: { id: "country", en: "The country", ar: "الدولة", ask: b("How the councils read this country and the UAE's position in it, angle by angle.", "كيف تقرأ المجالس هذه الدولة وموقع الإمارات فيها زاويةً زاوية."), angles: ALL, seats: SEATS.map((s) => s.id), focus: 12 },
  mofa: { id: "mofa", en: "Foreign policy, diplomacy, law and the multilateral track", ar: "السياسة الخارجية والدبلوماسية والقانون والمسار متعدد الأطراف", ask: b("The Ministry's lens: the foreign-policy course, diplomatic standing and friends, the legal and treaty agenda, multilateral weight, influence and narrative.", "منظور الوزارة: مسار السياسة الخارجية والمكانة الدبلوماسية والأصدقاء والأجندة القانونية والمعاهدات والثقل متعدد الأطراف والنفوذ والسرد."), angles: ["political", "diplomatic", "security", "military", "influence", "legal", "soft", "info"], seats: ["mofa", "king", "council", "architect", "mach", "falcon", "president", "country", "deep", "intel", "plan", "data"], focus: 7 },
  ambassador: { id: "ambassador", en: "The mission: trade, investment, consular and engagement", ar: "البعثة: التجارة والاستثمار والقنصلية والتواصل", ask: b("The mission's lens: trade and investment, logistics, the economy, soft power and engagement on the ground.", "منظور البعثة: التجارة والاستثمار واللوجستيات والاقتصاد والقوة الناعمة والتواصل على الأرض."), angles: ["economic", "trade", "logistics", "energy", "tech", "soft", "diplomatic", "influence"], seats: ["intel", "plan", "mofa", "country", "council", "president", "king", "architect", "deep", "mach", "falcon", "data"], focus: 7 },
  desk: { id: "desk", en: "The desk officer: the full matrix", ar: "ضابط المكتب: المصفوفة الكاملة", ask: b("The full matrix of councils by angle, with every challenge, rebuttal and the arbiter's conditions, for the analytical sections of the report.", "المصفوفة الكاملة للمجالس والزوايا مع كل اعتراض وردّ وشروط الحكَم للأقسام التحليلية في التقرير."), angles: ALL, seats: SEATS.map((s) => s.id), focus: 12 },
};
export const angleName = (id: string, L: "en" | "ar") => { const a = ANGLES.find((x) => x.id === id); return a ? (L === "ar" ? a.ar : a.en) : id; };
export const ANGLE_IDS = ALL;
/** Column headings of the matrix: one short word or two for each angle. */
export const ANGLE_SHORT: Record<string, { en: string; ar: string }> = { political: { en: "Politics", ar: "السياسة" }, diplomatic: { en: "Diplomacy", ar: "الدبلوماسية" }, military: { en: "Military", ar: "العسكري" }, security: { en: "Security", ar: "الأمن" }, economic: { en: "Economy", ar: "الاقتصاد" }, trade: { en: "Trade", ar: "التجارة" }, logistics: { en: "Logistics", ar: "اللوجستيات" }, energy: { en: "Energy", ar: "الطاقة" }, tech: { en: "Tech", ar: "التقنية" }, soft: { en: "Soft power", ar: "القوة الناعمة" }, influence: { en: "Influence", ar: "النفوذ" }, legal: { en: "Legal", ar: "القانوني" }, climate: { en: "Climate", ar: "المناخ" }, info: { en: "Narrative", ar: "السرد" } };
export const angleShort = (id: string, L: "en" | "ar") => ANGLE_SHORT[id]?.[L] ?? angleName(id, L);
