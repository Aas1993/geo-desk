import { SCOPES } from "./scopes";

// "Ask Falcon": reads a plain question and says where in Falcon Eye it belongs. It is a router made of word lists and the country and scope names, so it costs nothing, never calls a model and always shows what it understood so the reader can change it.
export type AskSection = "foresight" | "lab" | "council" | "graph" | "monitor" | "radar" | "countries" | "strategy" | "deep";
export type RankQuery = { metric: string; region?: string; org?: string; sector?: string };
export type AskRoute = { section: AskSection; scope: string | null; scopeKind: "country" | "scope" | null; why: string[]; rank?: RankQuery; alternatives: AskSection[]; deepTab?: string };
type Named = { iso3: string; name: string; nameAr?: string | null };

const SYN: [RegExp, string][] = [
  [/\b(world|global|worldwide|international system)\b|العالم|عالمي/i, "WLD"], [/\bsub-?saharan\b|جنوب الصحراء/i, "SSA"], [/\bnorth(ern)? africa\b|\bmaghreb\b|شمال أفريقيا|المغرب العربي/i, "NAF"], [/\b(middle east|west(ern)? asia|levant)\b|الشرق الأوسط|غرب آسيا/i, "WAS"],
  [/\bgcc\b|\bgulf cooperation\b|\bgulf states\b|مجلس التعاون|دول الخليج/i, "GCC"], [/\barab league\b|الجامعة العربية/i, "ARB"], [/\boic\b|islamic cooperation|التعاون الإسلامي/i, "OIC"], [/\bbrics\b|بريكس/i, "BRI"], [/\bafrican union\b|الاتحاد الأفريقي/i, "AFU"], [/\basean\b|آسيان/i, "ASN"], [/\bopec\b|أوبك/i, "OPC"], [/\b(european union|\beu\b)\b|الاتحاد الأوروبي/i, "EUN"],
  [/\bcentral asia\b|آسيا الوسطى/i, "CAS"], [/\bsouth(ern)? asia\b|جنوب آسيا/i, "SAS"], [/\bsoutheast asia\b|\bsouth-?eastern asia\b|جنوب شرق آسيا/i, "SEA"], [/\beast(ern)? asia\b|شرق آسيا/i, "EAS"], [/\blatin america\b|\bcaribbean\b|أمريكا اللاتينية/i, "LAC"], [/\beast(ern)? europe\b|شرق أوروبا/i, "EEU"], [/\bwest(ern)? europe\b|غرب أوروبا/i, "WEU"],
  [/\bafrican?\b|أفريقيا|إفريقيا|أفريقية/i, "AFR"], [/\bamericas\b|الأمريكتان/i, "AME"], [/\basian?\b|آسيا|آسيوية/i, "ASI"], [/\beurope(an)?\b|أوروبا|أوروبية/i, "EUR"], [/\boceania\b|أوقيانوسيا/i, "OCE"],
  [/\b(energy|oil|gas|lng|opec)\b|الطاقة|النفط|الغاز/i, "ENE"], [/\b(ai|artificial intelligence|semiconductor|chips?|technology|cyber)\b|الذكاء الاصطناعي|التقنية/i, "TEC"], [/\b(ports?|shipping|logistics|maritime|chokepoints?|trade routes?)\b|الموانئ|الشحن|اللوجستيات/i, "TRD"], [/\b(finance|capital flows|sovereign wealth|banking)\b|التمويل|المال/i, "CAP"], [/\b(food|water|agricultur\w*)\b|الغذاء|المياه/i, "FOD"], [/\b(critical minerals?|lithium|cobalt|rare earths?)\b|المعادن/i, "MNR"], [/\b(defen[cs]e|military|arms)\b|الدفاع|عسكري/i, "DEF"], [/\b(climate|environment|heat|floods?)\b|المناخ|البيئة/i, "CLM"],
];
const METRIC: [RegExp, RankQuery][] = [
  [/logistic|\bports?\b|shipping|maritime|الموانئ|اللوجستيات/i, { metric: "deals", sector: "ports and logistics" }], [/energy deals|energy investment|الطاقة/i, { metric: "deals", sector: "energy" }], [/\binvest|capital|استثمار/i, { metric: "invest" }], [/\bdeals?\b|acquisitions?|صفقات/i, { metric: "deals" }], [/\btrade\b|exports?|imports?|تجارة/i, { metric: "trade" }],
  [/agreements?|treat(y|ies)|اتفاقيات/i, { metric: "agreements" }], [/minister|visits?|engagement|contact|اتصالات|زيارات/i, { metric: "engagement" }], [/flights?|missions?|embass|رحلات|بعثات/i, { metric: "connectivity" }], [/coalition|alignment|bloc overlap|تحالف/i, { metric: "coalition" }],
];
const ORG: [RegExp, string][] = [[/\boic\b|islamic cooperation/i, "oic"], [/\basean\b/i, "asean"], [/\bbrics\b/i, "brics"], [/\bafrican union\b/i, "au"], [/\barab league\b/i, "arableague"], [/\bgcc\b/i, "gcc"], [/\bopec\+/i, "opecplus"], [/\bopec\b/i, "opec"], [/\bnato\b/i, "nato"], [/\bg20\b/i, "g20"]];
const REGION: [RegExp, string][] = [[/\bafrican?\b/i, "Africa"], [/\basian?\b/i, "Asia"], [/\beurope(an)?\b/i, "Europe"], [/\bamerican?s?\b/i, "Americas"], [/\boceania\b/i, "Oceania"]];
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The country named in the text, if any. Longer names win ("South Sudan" before "Sudan"); a name only counts as a whole word. */
export function findCountry(text: string, list: Named[]): Named | null {
  const t = ` ${norm(text)} `; let best: Named | null = null; let len = 0;
  for (const c of list) { for (const n of [c.name, c.nameAr ?? ""]) { const k = norm(n); if (k.length < 3 || k.length <= len) continue; const i = t.indexOf(k); if (i < 0) continue; const before = t[i - 1], after = t[i + k.length]; if (/[\p{L}\p{N}]/u.test(before ?? " ") || /[\p{L}\p{N}]/u.test(after ?? " ")) continue; best = c; len = k.length; } }
  if (!best) { const m = /\b([A-Z]{3})\b/.exec(text); if (m) best = list.find((c) => c.iso3 === m[1]) ?? null; }
  return best;
}
/** Decides which Falcon Eye section answers the question and what it is about. Precedence: council, scenario lab, foresight, graph ranking, monitoring, radar, then the country desk. */
export function routeAsk(text: string, list: Named[]): AskRoute {
  const q = text.trim(); const why: string[] = []; const c = findCountry(q, list); let scope: string | null = null; let scopeKind: AskRoute["scopeKind"] = null;
  if (c) { scope = c.iso3; scopeKind = "country"; why.push(`country: ${c.name}`); }
  else { for (const [re, id] of SYN) if (re.test(q)) { scope = id; scopeKind = "scope"; why.push(`scope: ${SCOPES.find((s) => s.id === id)?.en ?? id}`); break; } }
  const is = (re: RegExp, label: string) => { const ok = re.test(q); if (ok) why.push(label); return ok; };
  let section: AskSection; let deepTab: string | undefined;
  const rankish = /\b(which|what)\b[^.?]{0,30}\b(countries|states|markets)\b|\brank(ing)?\b|\btop \d*\s*(countries|markets)?\b|\bmost\b.*\b(countries|markets|deals|investment|trade)\b|\bcompare\b|\bpath(s)?\b|\bconnections?\b|\bknowledge graph\b|أي دول|ترتيب|الأكثر|روابط/i;
  if (is(/\bcouncil\b|\bdebate\b|multi-?agent|second opinion|all sides|red team|competing views|مجلس|فريق أحمر/i, "wants several analysts or a challenge")) section = "council";
  else if (is(/\bscenario|what if|what-if|stress test|shock\b|policy option|simulat|tipping|if .{0,40}\b(closes?|collapses?|escalates?|attacks?|bans?|defaults?)\b|سيناريو|ماذا لو|اختبار ضغط|خيارات/i, "a scenario or policy question")) section = "lab";
  else if (is(/foresight|forecast|outlook|\bfuture\b|\b(next|coming) \d+ years?\b|\b20[3-6]\d\b|long[- ]term|megatrend|استشراف|مستقبل|توقعات/i, "a look ahead")) section = "foresight";
  else if (!c && is(rankish, "a ranking across countries")) section = "graph";
  else if (is(/\balerts?\b|\bwatch(list)?\b|\bmonitor|what changed|since yesterday|\btoday\b|new warnings?|تنبيه|رصد|ماذا تغير/i, "a monitoring question")) section = "monitor";
  else if (is(/think[- ]?tanks?|research institutes?|\btrends\b|\becssr\b|financial conditions|trade concentration|\bhhi\b|\bindicators?\b|\bbenchmarks?\b|\bpeers?\b|consolidat|economic intelligence|decision assessment|\bgdp\b|inflation|مراكز الفكر|مركز فكر|مؤشرات|مقارنات|التضخم|الناتج المحلي/i, "a research, economic or indicator question")) { section = "deep"; deepTab = /think[- ]?tanks?|research institutes?|\becssr\b|\btrends\b|مراكز الفكر|مركز فكر/i.test(q) ? "fe02" : /financial conditions|\bcredit\b|\bbank/i.test(q) ? "fe05" : /trade concentration|\bhhi\b|\btrade\b/i.test(q) ? "fe07" : /\bgdp\b|inflation|التضخم|الناتج/i.test(q) ? "fe04" : /indicators?|benchmarks?|peers?|مؤشرات|مقارنات/i.test(q) ? "fe09" : "fe10"; }
  else if (is(/\bstrateg(y|ic|ies)\b|\binfluence\b|\bpartnerships?\b|\benhanc(e|ement)\b|soft power|hard power|\bcorridors?\b|\bimec\b|استراتيجية|نفوذ|شراكة|ممر/i, "a strategy or influence question")) section = "strategy";
  else if (!c && is(/opportunit|\brisk\b|early warning|\bradar\b|رادار|فرص|مخاطر/i, "opportunities or risks across countries")) section = "radar";
  else if (c) { section = "countries"; why.push("no product named: opening the country desk"); }
  else if (scope) { section = "foresight"; why.push("no product named: a foresight brief suits a scope"); }
  else { section = "council"; why.push("no country or scope found: the council can take a free question about the world"); scope = "WLD"; scopeKind = "scope"; }
  let rank: RankQuery | undefined;
  if (section === "graph") {
    const m = METRIC.find(([re]) => re.test(q)); rank = { ...(m?.[1] ?? { metric: "deals" }) };
    const org = ORG.find(([re]) => re.test(q))?.[1]; if (org) rank.org = org; const rg = REGION.find(([re]) => re.test(q))?.[1]; if (rg) rank.region = rg;
    if (!m) why.push("no measure named: ranking by deal announcements"); scope = null; scopeKind = null;
  }
  const all: AskSection[] = ["strategy", "deep", "foresight", "lab", "council", "countries", "graph"]; const alternatives = all.filter((s) => s !== section && (s !== "graph" || !c) && (s !== "countries" || scopeKind === "country"));
  return { section, scope, scopeKind, why, rank, alternatives, deepTab };
}
