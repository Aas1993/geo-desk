import { POWER_GROUPS, LEVELS, type EInit, type Mission1, type Mission2 } from "../desk/embassy";
import type { Mofa } from "../desk/mofa";
import { jsonBlock } from "../desk/core";
import { cutText, likelihoodBand, likelihoodRank, impactRank, type B, type Lang } from "./model";

// THE SHARED DATA OF THE EMBASSY AND MINISTRY REPORTS: the words (in both languages) for the kinds and levels these three products use, and the small calculations over their parsed data that both the page and the PDF draw from. Nothing here estimates anything: a figure is a count of what the product wrote, or it is absent.
const b = (en: string, ar: string): B => ({ en, ar });
export const GROUP_W: Record<(typeof POWER_GROUPS)[number], B> = { government: b("Government and institutions", "الحكومة والمؤسسات"), security: b("Security institutions", "المؤسسات الأمنية"), economy: b("Economic institutions", "المؤسسات الاقتصادية"), private: b("Business and private sector", "الأعمال والقطاع الخاص"), community: b("Community and civil society", "المجتمع والمجتمع المدني"), research: b("Research and universities", "الأبحاث والجامعات"), media: b("Media", "الإعلام") };
export const GROUP_SHORT: Record<(typeof POWER_GROUPS)[number], B> = { government: b("Government", "الحكومة"), security: b("Security", "الأمن"), economy: b("Economy", "الاقتصاد"), private: b("Business", "الأعمال"), community: b("Community", "المجتمع"), research: b("Research", "الأبحاث"), media: b("Media", "الإعلام") };
export const GROUP_HEX: Record<string, string> = { government: "#378ADD", security: "#7F77DD", economy: "#BA7517", private: "#D4537E", community: "#1D9E75", research: "#8a94a6", media: "#C0568C" };
export const LEVEL_W: Record<(typeof LEVELS)[number], B> = { decisive: b("decisive", "حاسم"), influential: b("influential", "مؤثر"), useful: b("useful", "مفيد") };
export const PKIND_W: Record<string, B> = { private: b("private", "خاص"), "state-linked": b("state-linked", "مرتبط بالدولة"), association: b("association", "جمعية") };
export const PLAY_W: Record<string, B> = { enter: b("enter", "دخول"), expand: b("expand", "توسّع"), protect: b("protect", "حماية") };
export const GAP_W: Record<string, B> = { trade: b("trade", "تجارة"), investment: b("investment", "استثمار") };
export const SME_W: Record<string, B> = { outbound: b("UAE SMEs going out", "منشآت إماراتية للخارج"), inbound: b("SMEs coming to the UAE", "منشآت قادمة إلى الإمارات") };
export const REL_ORDER = ["ally", "partner", "neutral", "tension", "rival"] as const;
export const REL_W: Record<(typeof REL_ORDER)[number], B> = { ally: b("ally", "حليف"), partner: b("partner", "شريك"), neutral: b("neutral", "محايد"), tension: b("tension", "توتر"), rival: b("rival", "منافس") };
export const DD_KINDS = ["partner", "investment", "legal", "security", "reputation"] as const;
export const DD_W: Record<(typeof DD_KINDS)[number], B> = { partner: b("partner", "شريك"), investment: b("investment", "استثمار"), legal: b("legal", "قانوني"), security: b("security", "أمني"), reputation: b("reputation", "سمعة") };
export const STANCE_W: Record<string, B> = { supportive: b("supportive", "داعم"), neutral: b("neutral", "محايد"), sceptical: b("sceptical", "متشكك"), unknown: b("unknown", "غير معروف") };
export const HZ: ("d30" | "d100" | "y1" | "y3")[] = ["d30", "d100", "y1", "y3"];
export const HZ_W: Record<string, B> = { d30: b("30 days", "30 يومًا"), d100: b("100 days", "100 يوم"), y1: b("1 year", "سنة"), y3: b("3 years", "3 سنوات") };
export const HZ_LONG: Record<string, B> = { d30: b("First 30 days", "أول 30 يومًا"), d100: b("First 100 days", "أول 100 يوم"), y1: b("First year", "السنة الأولى"), y3: b("Three years", "ثلاث سنوات") };
export const IMPACT_W: Record<string, B> = { high: b("high", "مرتفع"), medium: b("medium", "متوسط"), low: b("low", "منخفض") };
export const INTEREST_W: Record<string, B> = { security: b("security", "الأمن"), economic: b("economic", "الاقتصاد"), "energy and food": b("energy and food", "الطاقة والغذاء"), "diplomatic standing": b("diplomatic standing", "المكانة الدبلوماسية"), alliances: b("alliances", "التحالفات"), citizens: b("citizens", "المواطنون"), reputation: b("reputation", "السمعة") };
export const LEGAL_W: Record<string, B> = { "in force": b("in force", "نافذ"), pending: b("pending", "قيد الإنجاز"), missing: b("missing", "ناقص"), "not held": b("not held", "غير محفوظ") };
export const LEGAL_ORDER = ["in force", "pending", "missing", "not held"] as const;
export const POSTURE_W: Record<string, B> = { deepen: b("Deepen", "تعميق"), staged: b("Staged", "على مراحل"), hedge: b("Hedge", "تحوّط"), hold: b("Hold", "ترقّب") };
/** A bottom line as plain words for a header or a cover: markdown emphasis, links and [F12] evidence ids removed (the full text, with its ids, stays in the brief). */
export const plain = (md: string, n = 420) => cutText(md.replace(/\[F\d+(?:\s*[,–-]\s*F?\d+)*\]/g, "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^[-*>\s]+/gm, "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+([.,;:)])/g, "$1").trim(), n);
/** The standard parts the embassy brief already draws itself: its own scenarios (by desk, with a response and an indicator) hide the standard scenario cards, unless the product carries a real "standard" block with scenarios of its own, which then win. */
export function skipStandardIntel(report: string, hasOwnScenarios: boolean): string[] { const s = jsonBlock(report, "standard")?.data; const std = !!s && Array.isArray(s.scenarios) && s.scenarios.length > 0; return hasOwnScenarios && !std ? ["scenarios"] : []; }
export const w = (map: Record<string, B>, key: string, L: Lang) => map[key]?.[L] ?? key;

/** Counts of the power map by group (rows) and level (columns). Only groups that have an entry appear. */
export function powerGrid(power: Mission1["power"]) {
  return POWER_GROUPS.map((g) => { const xs = power.filter((p) => p.group === g); return { group: g, total: xs.length, levels: Object.fromEntries(LEVELS.map((l) => [l, xs.filter((p) => p.level === l).length])) as Record<(typeof LEVELS)[number], number> }; }).filter((r) => r.total > 0);
}
export const countBy = <T,>(xs: T[], key: (x: T) => string): { key: string; n: number }[] => { const m = new Map<string, number>(); for (const x of xs) { const k = key(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); } return [...m].map(([k, n]) => ({ key: k, n })).sort((a, z) => z.n - a.n || a.key.localeCompare(z.key)); };
/** The neighbours in the order of the relation scale, with the countries under each step. */
export const spectrum = (nb: Mission1["neighbours"]) => REL_ORDER.map((r) => ({ rel: r, items: nb.filter((x) => x.relation === r) }));
/** The desks named in the effects of the scenarios, in the order they first appear, and which scenario has an effect on which desk. */
export function scenarioGrid(sc: Mission1["scenarios"]) { const desks: string[] = []; for (const s of sc) for (const e of s.effects) if (!desks.includes(e.desk)) desks.push(e.desk); return { desks, rows: sc.map((s) => ({ name: s.name, has: desks.map((d) => s.effects.some((e) => e.desk === d)) })) }; }
/** Risks placed on the likelihood-impact matrix: only a risk whose own words say how likely it is. */
export function placeRisks(risks: { name: string; likelihood: string; impact: string }[]) {
  const all = risks.map((r, i) => ({ n: i + 1, name: r.name, rank: likelihoodRank(r.likelihood), impact: r.impact, i: impactRank(r.impact) }));
  const placed = all.filter((x) => likelihoodBand(x.rank) != null).map((x) => ({ n: x.n, l: likelihoodBand(x.rank)!, i: x.i, label: x.name, impact: x.impact }));
  return { all, placed, unplaced: all.length - placed.length };
}
export type FlatInit = EInit & { horizon: "d30" | "d100" | "y1" | "y3" };
export const flatInits = (p: Mission2["plans"]): FlatInit[] => HZ.flatMap((h) => p[h].map((i) => ({ ...i, horizon: h })));
/** A figure the product gave, as opposed to "not estimated" and the like. */
export const hasFigure = (s: string) => !!s.trim() && !/^(not estimated|to be set|not established|n\/a|-|–|—)$/i.test(s.trim());
/** How much of the Ministry's goals have a stated target and measure. */
export const measured = (m: Mofa) => m.goals.filter((g) => g.target && g.measure).length;
