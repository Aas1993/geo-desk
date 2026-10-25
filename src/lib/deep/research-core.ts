import { REGION_TERMS, REQUIRED_PERSPECTIVES, SOURCE_BY, TOPICS } from "./sources";

// Research cards and the pure checks on them (FALCON EYE FE01, FE02 and the novelty and blind-spot monitor). Nothing here fetches, so it is testable and the client can re-run it on filtered lists.
// What a card holds is what the publisher itself put in its feed or headline. "The publication argues" is the publisher's own text; "FALCON assesses" is limited to rule-based facts (does it name the UAE, how old is it, how was it found).
export type Pub = {
  id: string; src: string; title: string; url: string; ts: number; lang: "en" | "ar" | "other"; author?: string;
  /** the publisher's own short description from its feed, cut to 280 characters; absent when the piece was found by headline search */
  summary?: string; how: "feed" | "search";
  /** countries the TITLE or description names (ISO3) and regions and topics by rule; geography analysed is separate from the institution's domicile */
  about: string[]; regions: string[]; topics: string[]; uae: boolean; family: string;
};
export type CountryName = { iso3: string; names: string[] };

const ALIASES: Record<string, string[]> = {
  ARE: ["UAE", "United Arab Emirates", "Emirati", "Emirates", "Abu Dhabi", "Dubai"], USA: ["United States", "U.S.", "US", "America", "American"], GBR: ["United Kingdom", "UK", "Britain", "British"], RUS: ["Russia", "Russian"], CHN: ["China", "Chinese"],
  IRN: ["Iran", "Iranian"], SAU: ["Saudi Arabia", "Saudi"], TUR: ["Turkey", "Türkiye", "Turkish"], KOR: ["South Korea"], PRK: ["North Korea"], IND: ["India", "Indian"], EGY: ["Egypt", "Egyptian"], ZAF: ["South Africa"], PSE: ["Palestine", "Palestinian", "Gaza", "West Bank"],
  VNM: ["Vietnam", "Viet Nam"], MMR: ["Myanmar", "Burma"], CZE: ["Czechia", "Czech Republic"], SYR: ["Syria", "Syrian"], ISR: ["Israel", "Israeli"], IRQ: ["Iraq", "Iraqi"], YEM: ["Yemen", "Yemeni", "Houthi"], PAK: ["Pakistan", "Pakistani"], SGP: ["Singapore"], IDN: ["Indonesia", "Indonesian"],
};
/** One matcher per country, built once per list. Names of three letters or fewer ("UK", "US", "UAE") are matched case-sensitively so ordinary words are not tagged. */
export function buildTagger(countries: { iso3: string; name: string }[]) {
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = countries.map((c) => { const names = [...new Set([c.name, ...(ALIASES[c.iso3] ?? [])])]; const loud = names.filter((n) => n.length <= 3); const quiet = names.filter((n) => n.length > 3);
    return { iso3: c.iso3, quiet: quiet.length ? new RegExp(`(?<![\\p{L}])(?:${quiet.map(esc).join("|")})(?![\\p{L}])`, "iu") : null, loud: loud.length ? new RegExp(`(?<![\\p{L}])(?:${loud.map(esc).join("|")})(?![\\p{L}])`, "u") : null }; });
  return (text: string): string[] => rows.filter((r) => r.quiet?.test(text) || r.loud?.test(text)).map((r) => r.iso3);
}
export const langOf = (t: string): "en" | "ar" | "other" => { const ar = (t.match(/[؀-ۿ]/g) ?? []).length; const la = (t.match(/[A-Za-z]/g) ?? []).length; return ar > la ? "ar" : la > 0 ? "en" : "other"; };
const STOP = new Set("the a an of in on to for and or with from by at as is are was be after before over under into how why what who will can may new its their about says say".split(" "));
const tokens = (t: string) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const jacc = (a: Set<string>, b: Set<string>) => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

/** Groups cards whose headlines repeat one story (a syndicated or derivative piece). This is a FLOOR on duplication: headline overlap cannot see two papers that quietly reuse one dataset, which needs the claim-level origin check, so a family count here never proves independence. */
export function familyOf(pubs: Pub[]): Pub[] {
  const out: Pub[] = []; const reps: { id: string; t: Set<string> }[] = [];
  for (const p of [...pubs].sort((a, b) => b.ts - a.ts)) {
    const t = tokens(p.title); const hit = reps.find((r) => jacc(r.t, t) >= 0.6); const fam = hit?.id ?? `F${reps.length + 1}`; if (!hit) reps.push({ id: fam, t });
    out.push({ ...p, family: fam });
  }
  return out;
}
export const topicsOf = (t: string) => TOPICS.filter((x) => x.re.test(t)).map((x) => x.id);
export const regionsOf = (t: string) => REGION_TERMS.filter((x) => x.re.test(t)).map((x) => x.id);

export type Filters = { iso3: string | null; region: string | null; topic: string | null; lang: "any" | "en" | "ar"; domicile: "any" | "uae" | "abroad"; sinceDays: number; q: string };
export const noFilters: Filters = { iso3: null, region: null, topic: null, lang: "any", domicile: "any", sinceDays: 365, q: "" };
export function applyFilters(pubs: Pub[], f: Filters, now: number): Pub[] {
  const q = f.q.trim().toLowerCase();
  return pubs.filter((p) => (!f.iso3 || p.about.includes(f.iso3)) && (!f.region || p.regions.includes(f.region)) && (!f.topic || p.topics.includes(f.topic)) && (f.lang === "any" || p.lang === f.lang)
    && (f.domicile === "any" || (f.domicile === "uae") === (SOURCE_BY.get(p.src)?.kind === "uae")) && now - p.ts <= f.sinceDays * 86_400_000 && (!q || `${p.title} ${p.summary ?? ""}`.toLowerCase().includes(q)));
}

/** Coverage and blind-spot measures for a list of cards, against the perspectives a dossier should seek. Counts are operational measures of coverage, not evidence of quality. */
export type Coverage = {
  total: number; families: number; derivative: number; byInstitution: { src: string; n: number }[]; topShare: number; arabic: number; uaeInst: number; abroadInst: number; regionsOfInst: string[];
  perspectives: { id: string; en: string; ar: string; met: boolean; why: { en: string; ar: string } }[]; gaps: number;
};
export function coverage(pubs: Pub[], countryRegion: string | null, domicileRegionOf: (src: string) => string | null = (s) => SOURCE_BY.get(s)?.region ?? null): Coverage {
  const by = new Map<string, number>(); for (const p of pubs) by.set(p.src, (by.get(p.src) ?? 0) + 1);
  const byInstitution = [...by].map(([src, n]) => ({ src, n })).sort((a, b) => b.n - a.n); const fams = new Set(pubs.map((p) => p.family)).size;
  const uaeInst = pubs.filter((p) => SOURCE_BY.get(p.src)?.kind === "uae").length; const arabic = pubs.filter((p) => p.lang === "ar").length; const regionsOfInst = [...new Set(byInstitution.map((x) => domicileRegionOf(x.src)).filter((x): x is string => !!x))];
  const regMap: Record<string, string[]> = { "Middle East, North Africa, Afghanistan & Pakistan": ["Middle East", "Africa", "Asia"], "Sub-Saharan Africa": ["Africa"], "East Asia & Pacific": ["Asia", "Oceania"], "South Asia": ["Asia"], "Europe & Central Asia": ["Europe", "Asia"], "Latin America & Caribbean": ["Americas"], "North America": ["Americas"] };
  const home = countryRegion ? regMap[countryRegion] ?? [countryRegion] : null; const localMet = home ? regionsOfInst.some((r) => home.includes(r)) : null;
  const intl = byInstitution.filter((x) => SOURCE_BY.get(x.src)?.kind === "global").length;
  const met = { uae: uaeInst > 0, local: localMet ?? false, intl: intl > 0, arabic: arabic > 0, contrary: false };
  const why: Record<string, { en: string; ar: string }> = {
    uae: met.uae ? { en: `${uaeInst} card(s) from UAE institutions`, ar: `${uaeInst} بطاقة من مؤسسات إماراتية` } : { en: "No UAE-institution card in this list (the UAE connectors are pending validation)", ar: "لا بطاقة من مؤسسة إماراتية في هذه القائمة (موصلات الإمارات معلقة للتحقق)" },
    local: home == null ? { en: "Choose a country to test this", ar: "اختر دولة لاختبار ذلك" } : localMet ? { en: `A card from an institution based in ${home?.join(" or ")} names the country`, ar: `بطاقة من مؤسسة مقرّها في ${home} تسمّي الدولة` } : { en: `No card naming the country comes from an institution based in ${home?.join(" or ")}. Either none is registered there or none published on it in the window: a coverage gap, not evidence of silence`, ar: `لا بطاقة تسمّي الدولة من مؤسسة مقرّها في ${home}. إما لا مؤسسة مسجلة هناك أو لم تنشر عنها في الفترة: فجوة تغطية لا دليل على الصمت` },
    intl: met.intl ? { en: "Wider international institutions present", ar: "مؤسسات دولية أوسع حاضرة" } : { en: "No wider international card", ar: "لا بطاقة دولية أوسع" },
    arabic: met.arabic ? { en: `${arabic} Arabic-language card(s)`, ar: `${arabic} بطاقة بالعربية` } : { en: "No Arabic-language card; the feeds read here are English-language", ar: "لا بطاقة بالعربية؛ فالتغذيات المقروءة هنا بالإنجليزية" },
    contrary: { en: "Needs a reading of the arguments, which headline data cannot give; run the Research synthesis analyst", ar: "يحتاج قراءة للحجج لا تتيحها بيانات العناوين؛ شغّل محلل تركيب الأبحاث" },
  };
  const perspectives = REQUIRED_PERSPECTIVES.map((p) => ({ id: p.id, en: p.en, ar: p.ar, met: met[p.id as keyof typeof met], why: why[p.id] }));
  return { total: pubs.length, families: fams, derivative: pubs.length - fams, byInstitution, topShare: pubs.length ? Math.max(0, ...byInstitution.map((x) => x.n)) / pubs.length : 0, arabic, uaeInst, abroadInst: pubs.length - uaeInst, regionsOfInst, perspectives, gaps: perspectives.filter((p) => !p.met).length };
}
/** A source projection, stored as a dated source forecast and never as a current observation or a platform forecast (FE-AC02). */
export type SourceForecast = { id: string; src: string; pub: string; quote: string; target: string; value: string; horizon: string; publishedAt: string; kind: "source-forecast"; status: "dated"; note: string };
export const asSourceForecast = (x: Omit<SourceForecast, "id" | "kind" | "status" | "note">): SourceForecast => ({ ...x, id: `SF-${x.src}-${x.publishedAt}-${x.target}`.replace(/\s+/g, "-").toLowerCase(), kind: "source-forecast", status: "dated", note: "A projection made by the publisher as of its publication date. It is not an observation, and it is not a Geo Desk forecast." });
