import type { CaseData } from "../case/load";
import { parseReviews, type Review } from "../desk/core";
import { embSection, parseMission1, parseMission2 } from "../desk/embassy";
import { parseKing } from "../desk/king";
import { parseMofa } from "../desk/mofa";
import { parsePresident } from "../desk/president";
import { parseDashboard } from "../case/architect";
import { assess } from "../quality/gate";
import type { Extras } from "../bird/score";
import { ANGLE_IDS, SEAT_BY, SEATS, courseRank, type Course, type SeatId } from "./model";

// READING A COUNCIL'S SAVED PRODUCT. Everything the Round Table shows about a council is taken from what that council itself saved in this browser: its structured data where it has any (THE KING's course, the Ministry's posture, the President's scorecard), otherwise its own words, read by stated rules (the cue words below). A reading is "what the council's own text says", never a score the council gave; a council that did not address an angle is shown as silent, and one with nothing on file is shown as not run.
export type Saved = { report: string; at: string; usd: number | null; sources: { url: string }[]; lang: "en" | "ar" };
export function readSaved(key: string): Saved | null {
  try { const j = JSON.parse(localStorage.getItem(key) ?? "null") as { report?: string; brief?: unknown; at?: string; usage?: { usd?: number | null }; sources?: { url: string }[]; options?: { lang?: string } } | null; if (!j || typeof j.report !== "string" || typeof j.at !== "string") return null; const ar = (j.report.match(/[؀-ۿ]/g) ?? []).length > (j.report.match(/[A-Za-z]/g) ?? []).length; return { report: j.report, at: j.at, usd: typeof j.usage?.usd === "number" ? j.usage.usd : null, sources: Array.isArray(j.sources) ? j.sources.filter((s) => s && typeof s.url === "string") : [], lang: j.options?.lang === "ar" || (j.options?.lang !== "en" && ar) ? "ar" : "en" }; } catch { return null; }
}
export type Held = Partial<Record<SeatId, Saved | null>>;
/** Every council's saved product for a country. */
export function readHeld(iso: string): Held { const out: Held = {}; for (const s of SEATS) if (s.key) out[s.id] = readSaved(s.key(iso)); return out; }

// ---- cue words ----
const ANGLE_RE: Record<string, RegExp> = {
  political: /\b(politic|government|governance|parliament|election|cabinet|regime|president|prime minister|coalition|reform|corruption|rule of law|institution)|سياس|حكوم|برلمان|انتخاب|فساد|إصلاح/i,
  diplomatic: /\b(diplomat|embassy|ambassador|bilateral|visit|summit|ally|alliance|partner|friend|relations|mediat|envoy)|دبلوماس|سفار|سفير|ثنائي|زيار|قمة|حلف|شراكة|وساطة|علاقات/i,
  military: /\b(military|defen[cs]e|armed forces|army|navy|air force|arms|procurement|basing|deterren|weapon|interoperab)|عسكر|دفاع|جيش|أسلحة|ردع|بحري|قوات/i,
  security: /\b(security|terror|extremis|insurgen|violence|stability|homeland|border|unrest|conflict|crime|cyber|instability)|أمن|إرهاب|تطرف|عنف|استقرار|حدود|نزاع|صراع|سيبراني/i,
  economic: /\b(econom|gdp|growth|inflation|debt|reserves|fiscal|monetary|currency|budget|imf|unemployment|financ|bank|capital market)|اقتصاد|نمو|تضخم|دين|احتياط|عملة|ميزانية|بطالة|مال/i,
  trade: /\b(trade|export|import|invest|fdi|cepa|tariff|customs|commerc|deal|joint venture|market access|sovereign fund|supply chain)|تجار|صادر|واردات|استثمار|جمرك|صفقة|سوق/i,
  logistics: /\b(logistic|corridor|port|rail|shipping|transit|route|flight|airline|aviation|connectivity|free zone|transport|maritime|silk road)|لوجست|ممر|ميناء|سكك|شحن|عبور|طيران|ربط|نقل|بحري|طريق الحرير/i,
  energy: /\b(energy|oil|gas|lng|renewable|electricity|grid|mineral|water|food|agricultur|resource|nuclear|solar|hydrogen)|طاقة|نفط|غاز|كهرباء|متجدد|مياه|غذاء|زراع|موارد|معادن|شمس/i,
  tech: /\b(technolog|digital|artificial intelligence|ai|data cent|semiconductor|telecom|space|fintech|innovation|5g|satellite)|تقني|رقم|ذكاء اصطناعي|اتصالات|فضاء|ابتكار|بيانات/i,
  soft: /\b(soft power|culture|cultural|education|tourism|aid|humanitarian|diaspora|religio|media|sport|society|public opinion|youth|scholarship)|قوة ناعمة|ثقاف|تعليم|سياح|مساعدات|إنساني|جالية|إعلام|رياض|مجتمع|رأي عام/i,
  influence: /\b(influence|leverage|rival|china|russia|turk|iran|saudi|qatar|india|competition|great power|patron|balance of power|sphere)|نفوذ|رافعة|منافس|صين|روسيا|تركيا|إيران|سعود|قطر|الهند|توازن/i,
  legal: /\b(legal|law|treaty|agreement|mou|convention|sanction|arbitration|jurisdiction|compliance|regulat|court|extradition|memorand|united nations|multilateral)|قانون|معاهد|اتفاق|مذكرة تفاهم|عقوبات|تحكيم|امتثال|تنظيم|محكمة|أمم متحدة|متعدد الأطراف/i,
  climate: /\b(climate|emission|carbon|sustainab|net.zero|adaptation|green|environment|drought|desertif)|مناخ|انبعاث|كربون|استدام|بيئ|جفاف|تصحر|حياد/i,
  info: /\b(narrative|disinformation|propaganda|press|coverage|information|social media|think tank|public diplomacy|reputation|messaging)|سرد|تضليل|دعاية|صحاف|إعلامي|معلومات|سمعة|رسائل/i,
};
const POS = /\b(opportunit|strong|strengthen|stable|stabili|growth|growing|aligned|alignment|cooperat|secur(?:e|ed|ing)\b|favourabl|favorabl|resilien|deepen|expand|advantage|progress|improv|recover|robust|momentum|benefit|gain|upside|well-placed|mutual)|فرص|قوي|تعزيز|مستقر|استقرار|نمو|تحالف|شراكة|تعاون|مرن|توسع|تقدم|تحسن|انتعاش|ميزة|منفعة|مكسب/gi;
const NEG = /\b(risk|fragil|tension|conflict|declin|sanction|deficit|threat|weak|instabil|unstable|rival|concern|vulnerab|exposure|crisis|shortage|stall|delay|dispute|volatil|deteriorat|erosion|hostil|constraint|dependen|debt|failure|fail|loss|shock|escalat|downside|uncertain|blocked)|خطر|مخاطر|هش|توتر|نزاع|صراع|تراجع|عقوبات|عجز|تهديد|ضعيف|عدم استقرار|منافس|قلق|ضعف|أزمة|نقص|تعثر|تأخر|خلاف|تقلب|تدهور|تآكل|عدائي|قيود|اعتماد|ديون|فشل|خسارة|صدمة|تصعيد|غموض/gi;
const COURSE_RE: Record<Course, RegExp> = {
  deepen: /\b(deepen|expand|scale up|accelerate|step up|double down|full partnership|invest more|commit)|تعميق|توسيع|تعزيز|تكثيف|تسريع/gi,
  staged: /\b(staged|phased|phase|stepwise|incremental|sequenc|gate|conditional|milestone|pilot)|مراحل|تدريج|مرحل|مشروط|بوابات|تجريبي/gi,
  hedge: /\b(hedge|diversif|balance|multi-?align|limit exposure|ring-?fence|safeguard|insure)|تحوط|تحوّط|تنويع|موازنة|تحصين|حماية/gi,
  hold: /\b(hold|maintain|wait|pause|defer|restraint|status quo|monitor|no new|watch and)|ترقب|ترقّب|الإبقاء|إبقاء|انتظار|تجميد|التريث|الحفاظ على الوضع/gi,
};
const count = (t: string, re: RegExp) => (t.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []).length;

// ---- text helpers ----
/** The council's own words: the machine-readable blocks and the auditors' reviews (which are about the product, not the country) are left out. */
export function bodyText(report: string): string {
  const noJson = report.replace(/<(\w+)>[\s\S]*?(?:<\/\1>|$)/g, "");
  const cut = noJson.search(/^# (?:Statecraft Review|Reality Review|Consistency Review|Review)\b/m);
  return (cut >= 0 ? noJson.slice(0, cut) : noJson).slice(0, 70_000);
}
const plain = (s: string) => s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1").replace(/\[(?:F\d+(?:\s*[,–-]\s*F?\d+)*|Desk|unverified reference[^\]]*)\]/g, "").replace(/[*_`#>]+/g, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
export const cut = (t: string, n: number) => { const x = plain(t); return x.length > n ? `${x.slice(0, x.lastIndexOf(" ", n) > n * 0.6 ? x.lastIndexOf(" ", n) : n)}…` : x; };
const META = /^(prepared for|prepared by|as of|date|evidence cutoff)\b/i;
/** The first real sentence of the document, past the headers that say who and when. */
export function firstPara(md: string, n = 300): string {
  for (const l of bodyText(md).split("\n")) { const s = plain(l.replace(/^[#>*\-\s]+/, "")); if (s.length > 60 && !s.startsWith("|") && !META.test(s) && (s.match(/ \| /g) ?? []).length < 2) return cut(s, n); }
  return "";
}
/** Bullets, numbered lines and first table cells under the headings that match. */
export function listUnder(md: string, head: RegExp, max: number, n = 200): string[] {
  const out: string[] = []; let level = 0; let on = false; let tableHead = true;
  for (const line of bodyText(md).split("\n")) {
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { if (on && h[1].length <= level) on = false; if (!on && head.test(h[2])) { on = true; level = h[1].length; tableHead = true; } continue; }
    if (!on) continue;
    const b = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line); if (b) { const x = cut(b[1], n); if (x.length > 12) out.push(x); }
    else if (line.trim().startsWith("|")) { if (/^\s*\|?\s*:?-{2,}/.test(line)) { tableHead = false; continue; } if (tableHead) continue; const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => plain(c)); const x = cut(cells.filter((c) => c.length > 6).slice(0, 2).join(": "), n); if (x.length > 12) out.push(x); }
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}
const confOf = (t: string): "high" | "moderate" | "low" | null => { const m = /confidence[^a-z\n]{0,12}\**\s*(high|moderate|low)/i.exec(t) ?? /(?:ثقة|الثقة)[^\n]{0,14}(مرتفعة|عالية|معتدلة|متوسطة|منخفضة)/.exec(t); if (!m) return null; const v = m[1].toLowerCase(); return v === "high" || v === "مرتفعة" || v === "عالية" ? "high" : v === "low" || v === "منخفضة" ? "low" : "moderate"; };
/** The course a text argues for, by counting the words of each course in the document's opening and its conclusion; null when no course clearly leads. */
export function courseFromText(text: string): Course | null {
  const t = bodyText(text); const win = `${t.slice(0, 3000)}\n${t.slice(-1500)}`; const sc = (Object.keys(COURSE_RE) as Course[]).map((c) => ({ c, n: count(win, COURSE_RE[c]) })).sort((a, z) => z.n - a.n);
  return sc[0].n >= 2 && sc[0].n > sc[1].n ? sc[0].c : null;
}

// ---- the angle readings ----
export type AngleRead = { n: number; pos: number; neg: number; reading: number | null; from: "text" | "scorecard" | "data" | "challenge" };
/** How a text reads an angle: the sentences that mention it, and the favourable and adverse cue words in them. The reading is 50 plus or minus the lean of the cues (shrunk when there are few); it is a reading of the text's tone, not a measurement, and an angle with fewer than three sentences is "thin". */
export function angleReading(text: string, id: string): AngleRead {
  const re = ANGLE_RE[id]; let n = 0; let pos = 0; let neg = 0;
  for (const s of bodyText(text).split(/(?<=[.!?؟])\s+|\n+/)) { if (s.length < 25 || !re.test(s)) continue; n++; pos += count(s, POS); neg += count(s, NEG); }
  const reading = n >= 3 && pos + neg > 0 ? Math.max(0, Math.min(100, Math.round(50 + 50 * ((pos - neg) / (pos + neg + 2))))) : null;
  return { n, pos, neg, reading, from: "text" };
}
/** Whether a text read counts as a real reading, thin (few sentences) or silent. */
export const readState = (a: AngleRead | undefined): "read" | "thin" | "silent" => (!a || a.n === 0 ? "silent" : a.reading == null ? "thin" : "read");
const DIM_ANGLE: Record<string, string> = { political: "political", security: "security", economic: "economic", trade: "trade", logistics: "logistics", relations: "diplomatic" };
const STATUS_V = { strong: 80, mixed: 55, weak: 30 };

// ---- one council's reading ----
export type Verdict = { lens: Review["lens"]; verdict: Review["verdict"]; standing: Review["standing"] };
export type SeatReading = {
  id: SeatId; onFile: boolean; at: string | null; ageDays: number | null; usd: number | null; lang: "en" | "ar" | null;
  course: Course | null; courseFrom: "structured" | "text" | "data" | "none"; confidence: "high" | "moderate" | "low" | null;
  headline: string; risks: string[]; recs: string[];
  grade: "A" | "B" | "C" | "D" | null; verdicts: Verdict[]; redFlags: { flag: string; severity: "critical" | "serious"; lens: string; why: string }[];
  angles: Record<string, AngleRead>;
};
const EMPTY = (id: SeatId): SeatReading => ({ id, onFile: false, at: null, ageDays: null, usd: null, lang: null, course: null, courseFrom: "none", confidence: null, headline: "", risks: [], recs: [], grade: null, verdicts: [], redFlags: [], angles: {} });
const lvl = (s: string) => ({ high: 0, medium: 1, low: 2 })[s] ?? 1;
/** Reads one council's saved product. `now` is passed in so the reading is the same on the server and in a test. */
export function readSeat(id: SeatId, p: Saved | null, now: number): SeatReading {
  const r = EMPTY(id); if (!p) return r; const text = p.report;
  r.onFile = true; r.at = p.at; r.usd = p.usd; r.lang = p.lang; r.ageDays = Math.max(0, Math.round((now - Date.parse(p.at)) / 86_400_000));
  const rv = parseReviews(text); r.verdicts = rv.map((x) => ({ lens: x.lens, verdict: x.verdict, standing: x.standing })); r.redFlags = rv.flatMap((x) => x.redFlags.map((f) => ({ flag: f.flag, severity: f.severity, lens: x.lens, why: f.why })));
  const gate = SEAT_BY.get(id)?.gate; if (gate) { try { r.grade = assess(gate, text, p.sources, p.lang).grade; } catch { r.grade = null; } }
  let scorecard: { dim: string; status: "strong" | "mixed" | "weak" }[] = [];
  try {
    if (id === "king") { const k = parseKing(text); if (k) { r.course = k.decision.course; r.courseFrom = "structured"; r.confidence = k.decision.confidence; r.headline = cut(k.decision.headline, 260); r.risks = [...k.risks].sort((a, z) => lvl(a.impact) - lvl(z.impact)).slice(0, 4).map((x) => cut(`${x.name}${x.mitigation ? `: ${x.mitigation}` : ""}`, 200)); r.recs = [...k.decision.conditions.slice(0, 3), ...k.options.filter((o) => o.course === k.decision.course).map((o) => o.firstMove)].filter(Boolean).slice(0, 4).map((x) => cut(x, 200)); } }
    else if (id === "mofa") { const m = parseMofa(text); if (m) { r.course = m.stance.posture; r.courseFrom = "structured"; r.headline = cut(m.stance.headline, 260); r.risks = m.plans.flatMap((x) => x.risks).slice(0, 4).map((x) => cut(x, 200)); r.recs = m.priorities.slice(0, 4).map((x) => cut(`${x.rank}. ${x.title}`, 200)); } }
    else if (id === "intel") { const m = parseMission1(text); const bl = /## Bottom line\s*\n([\s\S]*?)(?=\n## |$)/.exec(embSection(text, "Ambassador's Brief"))?.[1]; r.headline = cut(bl ?? firstPara(text), 260); if (m) { r.risks = [...m.risks].sort((a, z) => lvl(a.impact) - lvl(z.impact)).slice(0, 4).map((x) => cut(`${x.name}${x.mitigation ? `: ${x.mitigation}` : ""}`, 200)); r.recs = m.calendar.slice(0, 4).map((x) => cut(`${x.when}: ${x.what}`, 200)); } }
    else if (id === "plan") { const m = parseMission2(text); if (m) { r.headline = cut(m.strategy.endState || firstPara(text), 260); r.risks = [...m.risks].sort((a, z) => lvl(a.impact) - lvl(z.impact)).slice(0, 4).map((x) => cut(`${x.name}${x.mitigation ? `: ${x.mitigation}` : ""}`, 200)); r.recs = m.strategy.objectives.slice(0, 4).map((x) => cut(x.title, 200)); } }
    else if (id === "president") { const b = parsePresident(text); if (b) { r.headline = cut(b.bottomLine || b.headline, 260); r.recs = [...b.decisions.map((x) => `${x.decision}: ${x.recommendation}`), ...b.recommendations.map((x) => x.action)].slice(0, 4).map((x) => cut(x, 200)); r.risks = [...b.events.filter((e) => e.signal === "risk").map((e) => e.text), ...(b.corridor?.risks ?? [])].slice(0, 4).map((x) => cut(x, 200)); scorecard = b.scorecard; } }
    else if (id === "architect") { const dsh = parseDashboard(text); r.headline = firstPara(text, 260); if (dsh) { r.risks = dsh.risks.slice(0, 4).map((x) => cut(`${x.name}${x.mitigation ? `: ${x.mitigation}` : ""}`, 200)); r.recs = dsh.initiatives.slice(0, 4).map((x) => cut(x.name, 200)); } }
  } catch { /* a damaged block leaves the generic reading below */ }
  if (!r.headline) r.headline = firstPara(text, 260);
  if (!r.risks.length) r.risks = listUnder(text, /risk|threat|vulnerab|red team|challenge|dissent|مخاطر|تهديد|اعتراض/i, 4);
  if (!r.recs.length) r.recs = listUnder(text, /recommend|next step|option|action|decision|priorit|توصي|خطوات|قرار|أولوي/i, 4);
  if (!r.course) { const c = courseFromText(text); if (c) { r.course = c; r.courseFrom = "text"; } }
  if (!r.confidence) r.confidence = confOf(bodyText(text).slice(0, 6000));
  for (const a of ANGLE_IDS) r.angles[a] = angleReading(text, a);
  for (const sc of scorecard) { const a = DIM_ANGLE[sc.dim]; if (a) r.angles[a] = { n: Math.max(r.angles[a].n, 1), pos: r.angles[a].pos, neg: r.angles[a].neg, reading: STATUS_V[sc.status], from: "scorecard" }; }
  for (const [a, v] of Object.entries(ownScores(text))) r.angles[a] = { n: Math.max(r.angles[a].n, 1), pos: r.angles[a].pos, neg: r.angles[a].neg, reading: v, from: "scorecard" }; // the council's own scores (see ANGLE_SCORES_RULE), compared as they are
  return r;
}
/** The council's own score of each angle, when its writer was asked for them (ANGLE_SCORES_RULE): the "angleScores" object of its structured data, 0 to 100, angles the platform knows only. Anything else in it is dropped. */
export function ownScores(report: string): Record<string, number> {
  const out: Record<string, number> = {}; const m = /"angleScores"\s*:\s*(\{[^{}]*\})/.exec(report); if (!m) return out;
  try { for (const [k, v] of Object.entries(JSON.parse(m[1]) as Record<string, unknown>)) { const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN; if (ANGLE_IDS.includes(k.toLowerCase()) && Number.isFinite(n)) out[k.toLowerCase()] = Math.max(0, Math.min(100, Math.round(n))); } } catch { /* a cut-off object gives no scores */ }
  return out;
}
/** The free seat: the rule-built posture and the rule-built score from the Case File data, which is the common baseline every council's reading is set against. */
export function dataSeat(d: CaseData | null, baseline: { angles: { id: string; score: number | null; indicators: unknown[] }[] } | null): SeatReading {
  const r = EMPTY("data"); if (!d) return r; r.onFile = true; r.at = d.asOf; r.ageDays = 0; r.course = d.posture.posture; r.courseFrom = d.posture.posture ? "data" : "none"; r.headline = d.posture.reasons[0]?.en ?? ""; r.recs = []; r.risks = [];
  for (const a of ANGLE_IDS) { const x = baseline?.angles.find((z) => z.id === a); r.angles[a] = { n: x?.indicators.length ?? 0, pos: 0, neg: 0, reading: x?.score ?? null, from: "data" }; }
  return r;
}
/** All the seats' readings, in table order. The data seat is first. */
export function readAll(iso: string, d: CaseData | null, baseline: Parameters<typeof dataSeat>[1], now: number, held: Held = readHeld(iso)): SeatReading[] {
  return SEATS.map((s) => (s.id === "data" ? dataSeat(d, baseline) : readSeat(s.id, held[s.id] ?? null, now)));
}
export { courseRank };
/** The flights, visits and agreements the country score reads, as the Bird's eye view last left them in this browser (all unknown when it never ran), so every page and PDF builds the same baseline. */
export const EXTRAS_KEY = (iso: string) => `gd-rt-extras:${iso}`;
export const NO_EXTRAS: Extras = { flightsLive: null, visits12: null, agreements: null, cepa: null, hasMission: null };
export function readExtras(iso: string): Extras { try { const j = JSON.parse(localStorage.getItem(EXTRAS_KEY(iso)) ?? "null") as Partial<Extras> | null; return { ...NO_EXTRAS, ...(j && typeof j === "object" ? j : {}) }; } catch { return NO_EXTRAS; } }
