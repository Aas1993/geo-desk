import { citedIds, parseReview, type Review } from "../desk/core";
import { EMB_AGENTS, deskByCode, parseMission1, parseMission2 } from "../desk/embassy";
import { parseKing } from "../desk/king";

// THE QUALITY GATE: deterministic checks and balances run on every finished desk product, free, before a person relies on it. It tests what can be tested by rule (structure, evidence, source mix, plan integrity, boundary, language) and shows the independent reviewer's verdict beside it.
// It cannot prove an analysis is right. It proves the product is complete, traceable, internally consistent and inside the boundary, and says exactly where it is not. A low score is a reason to read carefully or write again, never a verdict on the country.
export type Check = { id: string; group: "evidence" | "structure" | "plan" | "boundary" | "review" | "language"; en: string; ar: string; ok: boolean; weight: number; detail: string };
export type Quality = { kind: "king-council" | "emb-intel" | "emb-plan"; score: number; grade: "A" | "B" | "C" | "D"; checks: Check[]; failed: Check[]; review: Review | null; sources: SourceMix };
export type SourceMix = { official: number; thinktank: number; news: number; other: number; total: number };
const OFFICIAL = /(\.gov(\.[a-z]{2})?|\.mil|\.int|\.un\.org|^un\.org|imf\.org|worldbank\.org|oecd\.org|wto\.org|iaea\.org|icj-cij\.org|europa\.eu|wam\.ae|mofa\.gov|ecb\.europa|bis\.org|unctad\.org|fao\.org|ocha|reliefweb|unhcr\.org|ofac\.treasury|treasury\.gov|state\.gov|odni\.gov|cia\.gov)/i;
const THINK = /(chathamhouse|carnegie|csis\.org|iiss\.org|crisisgroup|brookings|atlanticcouncil|mei\.edu|agsiw|ecssr|trendsresearch|gulfresearchcenter|rand\.org|cfr\.org|fpri|stimson|wilsoncenter|aei\.org|heritage|ecfr\.eu|swp-berlin|ifri|clingendael|sipri|acleddata|arabbarometer|oxfordenergy|oxfordeconomics|capitaleconomics|rusi|lowyinstitute|mercatorinstitute|cato\.org|washingtoninstitute|csis|e3g|cigionline|brookings)/i;
const NEWS = /(reuters|apnews|afp\.com|bloomberg|ft\.com|wsj\.com|nytimes|washingtonpost|theguardian|bbc\.|aljazeera|economist\.com|politico|axios|thenationalnews|arabnews|gulfnews|khaleejtimes|middleeasteye|al-monitor|ahram|egyptindependent|dailynewsegypt|cnbc|france24|dw\.com|scmp|nikkei|haaretz|timesofisrael|asharq|alarabiya)/i;
export function sourceMix(urls: { url: string }[]): SourceMix { const m: SourceMix = { official: 0, thinktank: 0, news: 0, other: 0, total: 0 }; for (const u of urls) { let h = ""; try { h = new URL(u.url).hostname.replace(/^www\./, ""); } catch { continue; } m.total++; if (THINK.test(h)) m.thinktank++; else if (OFFICIAL.test(h)) m.official++; else if (NEWS.test(h)) m.news++; else m.other++; } return m; }
const BOUNDARY = /\b(bribe[sd]?|bribery|blackmail|sabotag\w*|assassinat\w*|incit\w* (a )?coup|overthrow (the )?(government|regime)|(fund|arm|finance|train|support)\w* (a |the )?(militia|militias|proxy|proxies|insurgen\w*|rebel groups?)|covert (operation|action|funding|campaign|influence)|disinformation campaign|recruit\w* (an )?(insider|asset|agent)s?|compromising (material|information))\b/gi;
const NEG = /(no|not|never|without|avoid\w*|refus\w*|reject\w*|rule[sd]? out|breach\w*|prohibit\w*|boundary|must not|do not|does not|don't|forbid\w*|excluded?|analy[sz]\w*|against|counter\w*|defen[cs]\w*)\W+(\w+\W+){0,6}$/i;
/** Passages that read as advice to do what the boundary forbids: a match with a negation or an analytic frame just before it (for example "no covert action" or "analyse the proxies") does not count. */
export function boundaryHits(text: string): string[] { const out: string[] = []; for (const m of text.matchAll(BOUNDARY)) { const before = text.slice(Math.max(0, (m.index ?? 0) - 70), m.index ?? 0); if (!NEG.test(before)) out.push(text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 60).replace(/\s+/g, " ")); } return out.slice(0, 5); }
const words = (t: string) => (t.match(/\S+/g) ?? []).length;
const langOf = (t: string): "ar" | "en" => { const a = (t.match(/[؀-ۿ]/g) ?? []).length; const l = (t.match(/[A-Za-z]/g) ?? []).length; return a > l ? "ar" : "en"; };
const K = (id: string, group: Check["group"], weight: number, en: string, ar: string, ok: boolean, detail: string): Check => ({ id, group, weight, en, ar, ok, detail });
const FACT = /^F\d+$/;
function common(report: string, sources: { url: string }[], lang: "en" | "ar" | null): Check[] {
  const body = report.replace(/<(king|mission1|mission2|review|directive)>[\s\S]*?(?:<\/\1>|$)/g, ""); const w = words(body); const cites = citedIds(report).length; const cc = (report.match(/\[F\d+/g) ?? []).length; const per = w ? (cc / w) * 1000 : 0; const sm = sourceMix(sources); const bh = boundaryHits(body);
  return [
    K("cites", "evidence", 14, "Claims carry fact ids", "الادعاءات مرفقة بمعرّفات الحقائق", per >= 6, `${cc} citations (${cites} distinct facts) in ${w} words: ${per.toFixed(1)} per 1,000 (needs 6)`),
    K("unverified", "evidence", 10, "No unverified fact reference", "لا إشارة إلى حقيقة غير متحقق منها", !/unverified reference/.test(report), `${(report.match(/unverified reference/g) ?? []).length} unverified references`),
    K("mix", "evidence", 10, "Sources include official, think-tank and news reporting", "المصادر تشمل رسمية ومراكز فكر وأخبار", sm.official > 0 && sm.thinktank > 0 && sm.news > 0, `${sm.total} web sources: ${sm.official} official, ${sm.thinktank} think-tank, ${sm.news} news, ${sm.other} other`),
    K("boundary", "boundary", 12, "Nothing breaches the boundary", "لا شيء يخالف الحدود", bh.length === 0, bh.length ? `Passages to read: ${bh.map((x) => `“${x}”`).join("; ")}` : "No covert, proxy, coercive or private-individual advice found by the rule scan"),
    K("lang", "language", 3, "Written in the requested language", "مكتوب باللغة المطلوبة", lang == null || langOf(body) === lang, `read as ${langOf(body)}${lang ? `, requested ${lang}` : ""}`),
  ];
}
const grade = (s: number): Quality["grade"] => (s >= 90 ? "A" : s >= 80 ? "B" : s >= 65 ? "C" : "D");
function finish(kind: Quality["kind"], checks: Check[], review: Review | null, sources: SourceMix): Quality {
  if (review) { const high = review.issues.filter((i) => i.severity === "high").length; checks.push(K("review", "review", 16, "The independent reviewer found no high-severity issue", "لم يجد المراجع المستقل مشكلة عالية الخطورة", review.verdict !== "reject" && high === 0, `Verdict ${review.verdict}; ${high} high, ${review.issues.length - high} other issues; ${review.boundary.length} boundary flags`)); }
  else checks.push(K("review", "review", 16, "An independent reviewer checked it", "راجعه مراجع مستقل", false, "No review on file (the reviewer step did not run or did not finish)"));
  const tw = checks.reduce((a, c) => a + c.weight, 0); const ok = checks.filter((c) => c.ok).reduce((a, c) => a + c.weight, 0); const score = Math.round((ok / tw) * 100);
  return { kind, score, grade: grade(score), checks, failed: checks.filter((c) => !c.ok), review, sources };
}
export function assessKing(report: string, sources: { url: string }[], lang: "en" | "ar" | null = null): Quality {
  const k = parseKing(report); const c = common(report, sources, lang); const ex = /^# Executive Brief[^\n]*\n([\s\S]*?)(?=^# |$(?![\s\S]))/m.exec(report)?.[1] ?? "";
  c.push(K("parse", "structure", 10, "The structured decision is complete", "القرار المنظم مكتمل", !!k && !k.partial, k ? (k.partial ? "Cut off at the output limit" : "Parsed in full") : "Could not be read"));
  if (k) {
    c.push(K("options", "structure", 6, "Four distinct courses with reversibility", "أربعة مسارات متمايزة مع قابلية العكس", k.options.length === 4 && new Set(k.options.map((o) => o.course)).size === 4, `${k.options.length} options, ${new Set(k.options.map((o) => o.course)).size} distinct courses`));
    const jt = k.judgments.filter((j) => j.evidence.length > 0 && j.band && FACT.test(j.evidence[0]));
    c.push(K("judgments", "evidence", 10, "At least six key judgments, each with a band and fact ids", "ستة أحكام رئيسية على الأقل بنطاق ومعرّفات", k.judgments.length >= 6 && jt.length >= Math.ceil(k.judgments.length * 0.8), `${k.judgments.length} judgments, ${jt.length} with a likelihood band and evidence`));
    c.push(K("conditions", "structure", 6, "Conditions are stated and the downside is named", "الشروط مذكورة والأثر السلبي مسمّى", k.decision.conditions.length >= 2 && k.decision.ifWrong.length > 10, `${k.decision.conditions.length} conditions; if-wrong ${k.decision.ifWrong ? "stated" : "missing"}`));
    c.push(K("watch", "structure", 6, "Indicators carry thresholds", "المؤشرات لها عتبات", k.watch.length >= 5 && k.watch.filter((w) => w.threshold.length > 2).length >= 5, `${k.watch.length} indicators, ${k.watch.filter((w) => w.threshold.length > 2).length} with thresholds`));
    c.push(K("risks", "structure", 5, "At least five risks with mitigations", "خمس مخاطر على الأقل بمعالجات", k.risks.length >= 5 && k.risks.filter((r) => r.mitigation).length >= 5, `${k.risks.length} risks`));
    c.push(K("precedent", "evidence", 5, "UAE precedents are cited", "سوابق الإمارات مذكورة", k.precedents.length >= 2, `${k.precedents.length} precedents`));
    c.push(K("dissent", "evidence", 5, "The strongest objection is on record", "أقوى اعتراض مسجّل", /strongest (objection|case against|argument)|red team/i.test(report), "Red-team case looked for in the text"));
  }
  c.push(K("exec", "structure", 4, "The Executive Brief is at most 700 words", "الموجز التنفيذي لا يتجاوز 700 كلمة", ex.length > 0 && words(ex) <= 700, `${words(ex)} words`));
  return finish("king-council", c, parseReview(report), sourceMix(sources));
}
export function assessIntel(report: string, sources: { url: string }[], lang: "en" | "ar" | null = null): Quality {
  const m = parseMission1(report); const c = common(report, sources, lang); const heads = ["Bottom line", "What has changed", "Key judgments", "Who to see first", "Calendar", "What not to do", "Decisions only the ambassador can take"]; const have = heads.filter((h) => new RegExp(`^## ${h}`, "m").test(report));
  c.push(K("parse", "structure", 10, "The structured intelligence is complete", "البيانات الاستخبارية المنظمة مكتملة", !!m && !m.partial, m ? (m.partial ? "Cut off at the output limit" : "Parsed in full") : "Could not be read"));
  c.push(K("brief", "structure", 8, "The brief has the briefing-book sections", "الموجز يحوي أقسام كتاب الإحاطة", have.length >= heads.length - 1, `${have.length}/${heads.length} sections`));
  if (m) {
    const priv = m.power.filter((p) => p.group === "private").length; c.push(K("power", "structure", 8, "Power map: ten or more actors incl. private sector, decisive ones named", "خريطة القوة: عشرة فاعلين فأكثر منهم القطاع الخاص", m.power.length >= 10 && priv >= 3 && m.power.some((p) => p.level === "decisive"), `${m.power.length} actors, ${priv} private-sector, ${m.power.filter((p) => p.level === "decisive").length} decisive`));
    c.push(K("partners", "structure", 9, "Partner companies: eight or more, each with a UAE counterpart, win-win and due diligence", "الشركات الشريكة: ثماني فأكثر لكل منها نظير ومكسب وعناية واجبة", m.partners.length >= 8 && m.partners.filter((p) => p.uaeCounterpart && p.winwin && p.dueDiligence.length > 0).length >= Math.ceil(m.partners.length * 0.8), `${m.partners.length} partners, ${m.partners.filter((p) => p.uaeCounterpart && p.winwin && p.dueDiligence.length > 0).length} complete`));
    c.push(K("plays", "structure", 6, "Investment plays: five or more with protections and due diligence", "فرص استثمارية: خمس فأكثر بحماية وعناية واجبة", m.plays.length >= 5 && m.plays.filter((p) => p.dueDiligence.length > 0 && (p.protections || p.structure)).length >= Math.ceil(m.plays.length * 0.7), `${m.plays.length} plays`));
    c.push(K("region", "structure", 5, "Neighbours, scenarios, risks and a 90-day calendar", "الجوار والسيناريوهات والمخاطر وتقويم 90 يومًا", m.neighbours.length >= 4 && m.scenarios.length >= 3 && m.risks.length >= 4 && m.calendar.length >= 5, `${m.neighbours.length} neighbours, ${m.scenarios.length} scenarios, ${m.risks.length} risks, ${m.calendar.length} calendar items`));
  }
  return finish("emb-intel", c, parseReview(report), sourceMix(sources));
}
export function assessPlan(report: string, sources: { url: string }[], lang: "en" | "ar" | null = null): Quality {
  const m = parseMission2(report); const c = common(report, sources, lang);
  c.push(K("parse", "structure", 10, "The structured plan is complete", "الخطة المنظمة مكتملة", !!m && !m.partial, m ? (m.partial ? "Cut off at the output limit" : "Parsed in full") : "Could not be read"));
  if (m) {
    const all = [...m.plans.d100, ...m.plans.y1, ...m.plans.y3]; const ids = all.map((i) => i.id); const idset = new Set(ids); const objs = new Set(m.strategy.objectives.map((o) => o.id)); const company = /(company|fund|deal|agreement|acquisition|concession|joint venture|partner|stake|investment|loan|deposit|port|bank)/i;
    c.push(K("horizons", "plan", 7, "Each horizon has four or more initiatives", "لكل أفق أربع مبادرات فأكثر", m.plans.d100.length >= 4 && m.plans.y1.length >= 4 && m.plans.y3.length >= 4, `${m.plans.d100.length} / ${m.plans.y1.length} / ${m.plans.y3.length} initiatives`));
    c.push(K("owners", "plan", 9, "Every initiative has an owner, a KPI and a gate", "لكل مبادرة مسؤول ومؤشر وبوابة", all.length > 0 && all.every((i) => i.owner && i.kpi && i.gate), `${all.filter((i) => i.owner && i.kpi && i.gate).length}/${all.length} complete`));
    const dd = all.filter((i) => company.test(`${i.title} ${i.actions.join(" ")}`)); c.push(K("dd", "plan", 9, "Initiatives involving a company, deal or agreement name their due diligence", "المبادرات المتعلقة بشركة أو صفقة تسمّي عنايتها الواجبة", dd.every((i) => i.dueDiligence.length > 0), `${dd.filter((i) => i.dueDiligence.length > 0).length}/${dd.length} with due diligence`));
    c.push(K("ids", "plan", 7, "Ids are unique and dependencies and objectives resolve", "المعرّفات فريدة والتبعيات والأهداف مقروءة", idset.size === ids.length && all.every((i) => i.dependsOn.every((d) => idset.has(d)) && (!i.objective || objs.size === 0 || objs.has(i.objective))), `${ids.length - idset.size} duplicate ids; ${all.reduce((a, i) => a + i.dependsOn.filter((d) => !idset.has(d)).length, 0)} dangling dependencies; ${all.filter((i) => i.objective && objs.size && !objs.has(i.objective)).length} unknown objectives`));
    c.push(K("cover", "plan", 6, "Every objective is served by at least one initiative", "كل هدف تخدمه مبادرة واحدة على الأقل", [...objs].every((o) => all.some((i) => i.objective === o)), `${[...objs].filter((o) => !all.some((i) => i.objective === o)).length} objectives with no initiative`));
    c.push(K("desks", "plan", 3, "Desk codes are valid", "رموز المكاتب صحيحة", all.every((i) => !i.desk || deskByCode(i.desk) !== null), `${all.filter((i) => i.desk && !deskByCode(i.desk)).length} unknown desk codes (valid: E1 to E${EMB_AGENTS.length})`));
    c.push(K("cost", "evidence", 6, "Costs are \"not estimated\" unless cited", "التكاليف «غير مقدّرة» ما لم يُستشهد بها", all.every((i) => /not estimated/i.test(i.cost) || FACT.test((i.cost.match(/F\d+/) ?? [""])[0])), `${all.filter((i) => !(/not estimated/i.test(i.cost) || /F\d+/.test(i.cost))).length} initiatives state an uncited cost`));
    c.push(K("gates", "plan", 5, "Three or more decision gates and a due-diligence register", "ثلاث بوابات قرار فأكثر وسجل عناية واجبة", m.gates.length >= 3 && m.dueDiligence.length >= 5, `${m.gates.length} gates, ${m.dueDiligence.length} register items`));
    c.push(K("strategy", "structure", 5, "End state, logic, objectives and what will not be done are stated", "الحالة المنشودة والمنطق والأهداف وما لن يُفعل", !!m.strategy.endState && !!m.strategy.logic && m.strategy.objectives.length >= 4 && m.strategy.notDoing.length >= 2, `${m.strategy.objectives.length} objectives; ${m.strategy.notDoing.length} exclusions`));
  }
  return finish("emb-plan", c, parseReview(report), sourceMix(sources));
}
export function assess(kind: Quality["kind"], report: string, sources: { url: string }[], lang: "en" | "ar" | null = null): Quality { return kind === "king-council" ? assessKing(report, sources, lang) : kind === "emb-intel" ? assessIntel(report, sources, lang) : assessPlan(report, sources, lang); }
