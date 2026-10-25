// The research source register for the Deep Intelligence desk (FALCON EYE FE01 and FE02).
// Only institutions whose identity and entry point were checked on 25 October 2026 are listed, and the list is curated by hand: it is never widened from an unverified directory.
// "status" is the honest connector state, not a promise of coverage:
//   feed    - the institution publishes an RSS feed that the desk reads directly (title, date, author, the feed's own short description, link)
//   search  - the institution blocks bots or has no feed, so pieces are found the way a reader would, by a news search restricted to its site (headline and link only)
//   pending - source identified; ingestion validation pending (the site was unreachable or has no machine-readable feed from this environment)
export type Connector = "feed" | "search" | "pending";
export type Source = {
  id: string; name: string; short: string; kind: "uae" | "global";
  /** where the institution sits (ISO3) and which region that is: the headquarters is a separate fact from the geography a paper analyses */
  domicile: string; region: string; langs: ("en" | "ar")[]; remit: { en: string; ar: string };
  entry: string; ref: string; connector: Connector; feeds?: string[]; domain?: string; note: { en: string; ar: string };
};
export const SOURCES: Source[] = [
  { id: "trends", name: "TRENDS Research & Advisory", short: "TRENDS", kind: "uae", domicile: "ARE", region: "Middle East", langs: ["en", "ar"], domain: "trendsresearch.org", entry: "https://trendsresearch.org", ref: "S1", connector: "pending",
    remit: { en: "UAE policy, technology and regional research; its report on the economic impact of AI in the UAE was reachable.", ar: "أبحاث السياسات والتقنية والإقليم في الإمارات؛ وقد أمكن الوصول إلى تقريره عن الأثر الاقتصادي للذكاء الاصطناعي في الإمارات." },
    note: { en: "Source identified; ingestion validation pending. The main site did not load from this environment, so pieces appear only when a news search finds them (headline and link).", ar: "المصدر محدد؛ والتحقق من الاستيعاب معلق. لم يُحمَّل الموقع الرئيسي من هذه البيئة، فتظهر المواد فقط حين يجدها بحث الأخبار (عنوان ورابط)." } },
  { id: "ecssr", name: "Emirates Center for Strategic Studies and Research", short: "ECSSR", kind: "uae", domicile: "ARE", region: "Middle East", langs: ["en", "ar"], domain: "ecssr.ae", entry: "https://www.ecssr.ae/en/who-we-are/ecssr-at-a-glance", ref: "S2", connector: "pending",
    remit: { en: "Arabic and English research on strategic, economic, regional, societal, energy, climate and future-oriented subjects.", ar: "أبحاث بالعربية والإنجليزية في الشؤون الاستراتيجية والاقتصادية والإقليمية والمجتمعية والطاقة والمناخ واستشراف المستقبل." },
    note: { en: "Source identified; ingestion validation pending. The site is a script-rendered page with no RSS feed that could be read, so pieces appear only when a news search finds them.", ar: "المصدر محدد؛ والتحقق من الاستيعاب معلق. الموقع صفحة تُرسم بالسكربت ولا توجد تغذية RSS يمكن قراءتها، فتظهر المواد فقط حين يجدها بحث الأخبار." } },
  { id: "iseas", name: "ISEAS–Yusof Ishak Institute", short: "ISEAS", kind: "global", domicile: "SGP", region: "Asia", langs: ["en"], domain: "iseas.edu.sg", entry: "https://www.iseas.edu.sg/", ref: "S6", connector: "feed", feeds: ["https://www.iseas.edu.sg/category/articles-commentaries/feed/"],
    remit: { en: "Southeast Asian country, economic and strategic context.", ar: "السياق القُطري والاقتصادي والاستراتيجي لجنوب شرق آسيا." }, note: { en: "Direct feed of its articles and commentaries.", ar: "تغذية مباشرة لمقالاته وتعليقاته." } },
  { id: "saiia", name: "South African Institute of International Affairs", short: "SAIIA", kind: "global", domicile: "ZAF", region: "Africa", langs: ["en"], domain: "saiia.org.za", entry: "https://saiia.org.za/about/", ref: "S7", connector: "feed", feeds: ["https://saiia.org.za/feed/"],
    remit: { en: "African policy perspectives and international economic governance.", ar: "منظورات السياسات الأفريقية والحوكمة الاقتصادية الدولية." }, note: { en: "Direct feed of its research and commentary.", ar: "تغذية مباشرة لأبحاثه وتعليقاته." } },
  { id: "bruegel", name: "Bruegel", short: "Bruegel", kind: "global", domicile: "BEL", region: "Europe", langs: ["en"], domain: "bruegel.org", entry: "https://www.bruegel.org/", ref: "", connector: "feed", feeds: ["https://www.bruegel.org/rss.xml"],
    remit: { en: "European and global economics. A candidate source: its datasets pages returned access errors, so only its publication feed is read and no dataset is connected.", ar: "اقتصاد أوروبا والعالم. مصدر مرشح: أعادت صفحات بياناته أخطاء وصول، فتُقرأ تغذية منشوراته فقط ولا تُربط أي بيانات." }, note: { en: "Direct feed of its publications; no datasets connected.", ar: "تغذية مباشرة لمنشوراته؛ ولا بيانات مربوطة." } },
  { id: "lowy", name: "Lowy Institute (The Interpreter)", short: "Lowy", kind: "global", domicile: "AUS", region: "Oceania", langs: ["en"], domain: "lowyinstitute.org", entry: "https://www.lowyinstitute.org/the-interpreter", ref: "", connector: "feed", feeds: ["https://www.lowyinstitute.org/the-interpreter/rss.xml"],
    remit: { en: "Indo-Pacific and international policy commentary.", ar: "تعليقات على سياسات المحيطين الهندي والهادئ والسياسة الدولية." }, note: { en: "Direct feed of The Interpreter.", ar: "تغذية مباشرة لـ The Interpreter." } },
  { id: "crisis", name: "International Crisis Group", short: "Crisis Group", kind: "global", domicile: "BEL", region: "Europe", langs: ["en"], domain: "crisisgroup.org", entry: "https://www.crisisgroup.org/", ref: "", connector: "feed", feeds: ["https://www.crisisgroup.org/rss.xml"],
    remit: { en: "Conflict analysis and prevention, field-based.", ar: "تحليل النزاعات ومنعها اعتمادًا على العمل الميداني." }, note: { en: "Direct feed of its latest analysis.", ar: "تغذية مباشرة لأحدث تحليلاته." } },
  { id: "chatham", name: "Chatham House", short: "Chatham House", kind: "global", domicile: "GBR", region: "Europe", langs: ["en"], domain: "chathamhouse.org", entry: "https://www.chathamhouse.org/regions/a-z", ref: "S3", connector: "search",
    remit: { en: "Regional and international affairs comparisons.", ar: "مقارنات في الشؤون الإقليمية والدولية." }, note: { en: "Its feed returned 403 to the desk, so pieces are found by a site-restricted news search (headline and link).", ar: "أعادت تغذيته الرمز 403، فتُعثر على المواد ببحث أخبار مقيَّد بموقعه (عنوان ورابط)." } },
  { id: "csis", name: "Center for Strategic and International Studies", short: "CSIS", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "csis.org", entry: "https://www.csis.org/programs", ref: "S4", connector: "search",
    remit: { en: "Security, economics, technology and regional research perspectives.", ar: "منظورات بحثية في الأمن والاقتصاد والتقنية والأقاليم." }, note: { en: "Its feed serves stale items, so pieces are found by a site-restricted news search.", ar: "تغذيته تقدم مواد قديمة، فتُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "orf", name: "Observer Research Foundation", short: "ORF", kind: "global", domicile: "IND", region: "Asia", langs: ["en"], domain: "orfonline.org", entry: "https://www.orfonline.org/who-we-are", ref: "S5", connector: "search",
    remit: { en: "Indian policy perspectives and international economic and security questions.", ar: "منظورات السياسات الهندية والقضايا الاقتصادية والأمنية الدولية." }, note: { en: "Its feeds returned 404, so pieces are found by a site-restricted news search.", ar: "أعادت تغذياته الرمز 404، فتُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "carnegie", name: "Carnegie Endowment for International Peace", short: "Carnegie", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "carnegieendowment.org", entry: "https://carnegieendowment.org", ref: "", connector: "search", remit: { en: "Foreign policy and regional research with centres in several regions.", ar: "أبحاث السياسة الخارجية والأقاليم بمراكز في عدة مناطق." }, note: { en: "Found by a site-restricted news search.", ar: "تُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "mei", name: "Middle East Institute", short: "MEI", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "mei.edu", entry: "https://www.mei.edu", ref: "", connector: "search", remit: { en: "Middle East policy research.", ar: "أبحاث سياسات الشرق الأوسط." }, note: { en: "Its feed returned 403, so pieces are found by a site-restricted news search.", ar: "أعادت تغذيته الرمز 403، فتُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "agsiw", name: "Arab Gulf States Institute in Washington", short: "AGSIW", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "agsiw.org", entry: "https://agsiw.org", ref: "", connector: "search", remit: { en: "Gulf politics, economies and security, from Washington.", ar: "سياسات الخليج واقتصاداته وأمنه من واشنطن." }, note: { en: "Found by a site-restricted news search.", ar: "تُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "brookings", name: "Brookings Institution", short: "Brookings", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "brookings.edu", entry: "https://www.brookings.edu", ref: "", connector: "search", remit: { en: "Economics, governance and foreign policy.", ar: "الاقتصاد والحوكمة والسياسة الخارجية." }, note: { en: "Found by a site-restricted news search.", ar: "تُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "atlantic", name: "Atlantic Council", short: "Atlantic Council", kind: "global", domicile: "USA", region: "Americas", langs: ["en"], domain: "atlanticcouncil.org", entry: "https://www.atlanticcouncil.org", ref: "", connector: "search", remit: { en: "International affairs, geoeconomics and regional centres.", ar: "الشؤون الدولية والاقتصاد الجيوسياسي والمراكز الإقليمية." }, note: { en: "Found by a site-restricted news search.", ar: "تُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
  { id: "iiss", name: "International Institute for Strategic Studies", short: "IISS", kind: "global", domicile: "GBR", region: "Europe", langs: ["en"], domain: "iiss.org", entry: "https://www.iiss.org", ref: "", connector: "search", remit: { en: "Defence, security and military balance.", ar: "الدفاع والأمن والتوازن العسكري." }, note: { en: "Found by a site-restricted news search.", ar: "تُعثر على المواد ببحث أخبار مقيَّد بموقعه." } },
];
export const SOURCE_BY = new Map(SOURCES.map((s) => [s.id, s]));
/** Perspectives a country dossier should seek (spec section 4). A missing one is shown as a gap, never filled to look balanced. */
export const REQUIRED_PERSPECTIVES = [
  { id: "uae", en: "A UAE institution", ar: "مؤسسة إماراتية" },
  { id: "local", en: "A source domiciled in the country's own region", ar: "مصدر مقرّه إقليم الدولة نفسه" },
  { id: "intl", en: "A wider international source", ar: "مصدر دولي أوسع" },
  { id: "arabic", en: "Arabic-language evidence", ar: "أدلة باللغة العربية" },
  { id: "contrary", en: "A credible challenge to the dominant reading", ar: "تحدٍّ معقول للقراءة السائدة" },
] as const;
export const TOPICS: { id: string; en: string; ar: string; re: RegExp }[] = [
  { id: "economy", en: "Economy and trade", ar: "الاقتصاد والتجارة", re: /\b(econom\w*|trade|tariff\w*|gdp|growth|inflation|export\w*|import\w*|invest\w*|fiscal|debt|currency|bank\w*|financ\w*)\b/i },
  { id: "energy", en: "Energy and resources", ar: "الطاقة والموارد", re: /\b(energy|oil|gas|lng|opec|nuclear|solar|renewable\w*|hydrogen|mineral\w*|lithium|pipeline\w*)\b/i },
  { id: "security", en: "Security and defence", ar: "الأمن والدفاع", re: /\b(security|defen[cs]e|military|war|conflict|missile\w*|navy|naval|drone\w*|terror\w*|ceasefire|sanction\w*)\b/i },
  { id: "tech", en: "Technology and AI", ar: "التقنية والذكاء الاصطناعي", re: /\b(ai|artificial intelligence|tech\w*|digital|cyber\w*|semiconductor\w*|chip\w*|data cent\w*|compute|5g)\b/i },
  { id: "climate", en: "Climate and environment", ar: "المناخ والبيئة", re: /\b(climate|cop\d*|emission\w*|carbon|net.zero|water|environment\w*|heat)\b/i },
  { id: "diplomacy", en: "Diplomacy and politics", ar: "الدبلوماسية والسياسة", re: /\b(diplomat\w*|summit|treaty|election\w*|president|minister\w*|foreign policy|alliance\w*|mediation|brics|g20|united nations|un)\b/i },
  { id: "society", en: "Society, migration and food", ar: "المجتمع والهجرة والغذاء", re: /\b(migrat\w*|refugee\w*|food|famine|population|youth|education|health|labou?r|gender)\b/i },
];
export const REGION_TERMS: { id: string; en: string; ar: string; re: RegExp }[] = [
  { id: "gulf", en: "Gulf", ar: "الخليج", re: /\b(gulf|gcc|persian gulf|arabian peninsula)\b/i },
  { id: "mena", en: "Middle East and North Africa", ar: "الشرق الأوسط وشمال أفريقيا", re: /\b(middle east|mena|levant|maghreb|red sea|arab world)\b/i },
  { id: "africa", en: "Africa", ar: "أفريقيا", re: /\b(africa\w*|sahel|horn of africa)\b/i },
  { id: "asia", en: "Asia", ar: "آسيا", re: /\b(asia\w*|asean|indo-pacific|south china sea|central asia)\b/i },
  { id: "europe", en: "Europe", ar: "أوروبا", re: /\b(europe\w*|eu|nato)\b/i },
  { id: "americas", en: "The Americas", ar: "الأمريكتان", re: /\b(latin america|caribbean|north america|south america)\b/i },
];
