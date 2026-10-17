// The single catalogue of map layers. Everything the layers drawer, renderer, legend, URL state and API routes need lives here.
// `status` is honest: "live" works today, "soon" is planned, "needs-key" works once you add a free key, "unavailable" has no compliant source.
export type GroupId = "map" | "live" | "diplomacy" | "security" | "economy" | "infra" | "un" | "regional" | "security-orgs" | "economic-orgs" | "energy-orgs" | "regions" | "seas" | "culture";
export type Status = "live" | "soon" | "needs-key" | "unavailable";
export type Kind = "points" | "moving" | "viewport" | "raster" | "client" | "choropleth" | "members" | "lines" | "polygons" | "base";
export type Sub = { key: string; en: string; ar: string; color: string; children?: { key: string; en: string; ar: string }[] };
export type LayerDef = {
  id: string; group: GroupId; en: string; ar: string; color: string; kind: Kind; status: Status; note?: string;
  /** Data route (relative to /api/layers/). Omitted for client-only and base layers. */
  api?: string; refreshSec?: number; timeFilter?: boolean; sub?: Sub[];
  /** For membership layers: the Wikidata/ISO member list key in public/data/orgs.json */
  members?: string;
  /** Feature property holding a CSS colour (overrides the sub-type colour) and one holding a text label drawn beside the dot. */
  colorProp?: string; label?: string;
  /** Swatches for categorical choropleths (replaces the gradient bar in the legend). */
  legend?: { label: string; ar: string; color: string }[];
};
export const GROUPS: { id: GroupId; en: string; ar: string; open?: boolean; parent?: string }[] = [
  { id: "map", en: "Map details", ar: "تفاصيل الخريطة" },
  { id: "live", en: "Live feeds", ar: "البث المباشر", open: true },
  { id: "diplomacy", en: "Diplomacy & media", ar: "الدبلوماسية والإعلام" },
  { id: "security", en: "Security & risk", ar: "الأمن والمخاطر" },
  { id: "economy", en: "Economy", ar: "الاقتصاد" },
  { id: "infra", en: "Infrastructure", ar: "البنية التحتية" },
  { id: "un", en: "Memberships · UN", ar: "العضويات · الأمم المتحدة" },
  { id: "regional", en: "Organisations · Regional", ar: "المنظمات · إقليمية" },
  { id: "security-orgs", en: "Organisations · Security", ar: "المنظمات · أمنية" },
  { id: "economic-orgs", en: "Organisations · Economic", ar: "المنظمات · اقتصادية" },
  { id: "energy-orgs", en: "Organisations · Energy & political", ar: "المنظمات · الطاقة والسياسة" },
  { id: "regions", en: "Regions", ar: "المناطق" },
  { id: "seas", en: "Seas & waters", ar: "البحار والمياه" },
  { id: "culture", en: "Culture & heritage", ar: "الثقافة والتراث" },
];

const L = (id: string, group: GroupId, en: string, ar: string, color: string, kind: Kind, status: Status, extra: Partial<LayerDef> = {}): LayerDef => ({ id, group, en, ar, color, kind, status, ...extra });
/** Member lists that exist in public/data/orgs.json (built by scripts/build-orgs.mjs). Others stay "soon" until a trustworthy source is found. */
export const MEMBER_DATA = new Set(["unga", "who", "itu", "wto", "opcw", "au", "arableague", "caricom", "cis", "coe", "ecowas", "oic", "oas", "osce", "commonwealth", "g7", "fiveeyes", "aukus", "quad", "gcc", "opec", "opecplus", "brics", "g20", "eurozone", "eaeu", "csto", "ots", "arctic", "schengen", "eu", "nato", "sco", "asean", "oecd", "mercosur", "unsc"]);
const HUES = ["#3ddcff", "#2de39a", "#ffb547", "#b693ff", "#ff5d73", "#5aa9ff", "#ffc247", "#ff8a4c", "#f27fcb", "#67e8f9", "#9be15d", "#e0a3ff"];
let orgN = 0;
const org = (id: string, group: GroupId, en: string, ar: string, members: string): LayerDef => L(`m:${id}`, group, en, ar, HUES[orgN++ % HUES.length], "members", MEMBER_DATA.has(members) ? "live" : "soon", { members });

export const LAYERS: LayerDef[] = [
  L("labels", "map", "Country names", "أسماء الدول", "#9db0cf", "base", "live"),
  L("borders", "map", "Borders", "الحدود", "#9db0cf", "base", "live"),
  L("capitals", "map", "Capital cities", "العواصم", "#3ddcff", "base", "live"),
  // ───────────── Live feeds ─────────────
  L("flights", "live", "Flight radar", "رادار الطيران", "#5aa9ff", "viewport", "live", { api: "flights", refreshSec: 20, note: "Regional view (zoom in) plus military aircraft worldwide. Source: adsb.fi open data.", sub: [
    { key: "airline", en: "Airlines", ar: "شركات الطيران", color: "#5aa9ff" }, { key: "cargo", en: "Cargo", ar: "الشحن", color: "#2de39a" },
    { key: "ga", en: "Private & general aviation", ar: "الطيران الخاص والعام", color: "#b693ff" },
    { key: "military", en: "Military", ar: "عسكرية", color: "#ffb547", children: [
      { key: "tanker", en: "Tankers", ar: "تزويد بالوقود" }, { key: "recon", en: "Surveillance", ar: "استطلاع" }, { key: "airlift", en: "Airlift", ar: "نقل جوي" },
      { key: "bomber", en: "Bombers", ar: "قاذفات" }, { key: "fighter", en: "Fighters", ar: "مقاتلات" }, { key: "heli", en: "Helicopters", ar: "مروحيات" }, { key: "other", en: "Other", ar: "أخرى" } ] } ] }),
  L("vessels", "live", "Live vessels (AIS)", "السفن المباشرة (AIS)", "#2de39a", "points", "needs-key", { note: "Needs a free aisstream.io key (AISSTREAM_API_KEY). No keyless global AIS feed exists." }),
  L("telegram", "live", "Telegram on the map", "تيليغرام على الخريطة", "#5aa9ff", "points", "unavailable", { note: "Scraping Telegram channels conflicts with Telegram's terms; no compliant feed." }),
  L("events", "live", "Global events", "أحداث العالم", "#ff5d73", "points", "live", { api: "events", refreshSec: 600, timeFilter: true, note: "GDELT, last ~90 minutes of coded events.", sub: [
    { key: "conflict", en: "Armed conflict", ar: "نزاع مسلح", color: "#ff5d73" }, { key: "protest", en: "Protest & unrest", ar: "احتجاجات واضطرابات", color: "#ffb547" },
    { key: "coercion", en: "Coercion & threats", ar: "إكراه وتهديد", color: "#ff8a4c" }, { key: "diplomacy", en: "Diplomacy", ar: "دبلوماسية", color: "#3ddcff" } ] }),
  L("hazards", "live", "Natural hazards", "الكوارث الطبيعية", "#ffb547", "points", "live", { api: "hazards", refreshSec: 600, timeFilter: true, note: "USGS earthquakes, NASA EONET and GDACS.", sub: [
    { key: "quake", en: "Earthquake", ar: "زلزال", color: "#ffc247" }, { key: "cyclone", en: "Tropical cyclone", ar: "إعصار مداري", color: "#3ddcff" },
    { key: "flood", en: "Flood", ar: "فيضان", color: "#5aa9ff" }, { key: "volcano", en: "Volcano", ar: "بركان", color: "#ff7a45" },
    { key: "drought", en: "Drought", ar: "جفاف", color: "#c9a26b" }, { key: "wildfire", en: "Wildfire", ar: "حريق غابات", color: "#ff5d73" } ] }),
  L("epidemics", "live", "Epidemic watch", "رصد الأوبئة", "#ff5d73", "points", "live", { api: "epidemics", refreshSec: 3600, timeFilter: true, note: "WHO Disease Outbreak News." }),
  L("weather", "live", "Weather", "الطقس", "#4fd1e6", "raster", "live", { api: "weather", refreshSec: 1800, colorProp: "c", label: "label", note: "RainViewer precipitation radar and Open-Meteo capital temperatures.", sub: [{ key: "radar", en: "Precipitation radar", ar: "رادار الأمطار", color: "#4fd1e6" }, { key: "temp", en: "Capital temperatures", ar: "حرارة العواصم", color: "#ffb547" }] }),
  L("imagery", "live", "Satellite imagery", "صور الأقمار الاصطناعية", "#9db0cf", "raster", "live", { note: "NASA GIBS daily true-colour mosaic (VIIRS)." }),
  L("cameras", "live", "Public cameras", "الكاميرات العامة", "#ffb547", "points", "needs-key", { note: "Needs a webcam provider key (e.g. Windy webcams)." }),
  L("fires", "live", "Active fires", "الحرائق النشطة", "#ff7a45", "points", "live", { api: "fires", refreshSec: 1800, timeFilter: true, note: "NASA FIRMS hotspots with a FIRMS_MAP_KEY; open EONET wildfire events without one." }),
  L("satellites", "live", "Satellites", "الأقمار الاصطناعية", "#b693ff", "client", "live", { api: "satellites", refreshSec: 7200, note: "CelesTrak orbital elements, propagated in your browser.", sub: [
    { key: "stations", en: "Space stations", ar: "محطات فضائية", color: "#ffffff" }, { key: "nav", en: "Navigation (GPS, Galileo, BeiDou, GLONASS)", ar: "الملاحة", color: "#3ddcff" },
    { key: "weather", en: "Weather", ar: "الطقس", color: "#2de39a" }, { key: "earth", en: "Earth observation", ar: "رصد الأرض", color: "#ffb547" }, { key: "military", en: "Military", ar: "عسكرية", color: "#ff5d73" } ] }),
  L("launches", "live", "Space launches", "إطلاقات الفضاء", "#ffc247", "points", "live", { api: "launches", refreshSec: 1800, note: "Launch Library 2 upcoming launches." }),
  L("ticker", "live", "Headline ticker", "شريط العناوين", "#ff5d73", "base", "live"),
  // ───────────── Diplomacy & media ─────────────
  L("agreements", "diplomacy", "UAE agreements (count)", "الاتفاقيات الإماراتية (العدد)", "#ffc247", "choropleth", "live", { note: "Treaties and MoUs the UAE has with each country: MOFA and Ministry of Foreign Trade, rebuilt daily." }),
  L("cepa", "diplomacy", "UAE CEPA trade deals", "اتفاقيات الشراكة الاقتصادية الشاملة", "#2de39a", "choropleth", "live", { note: "Official Ministry of Foreign Trade pages. The Ministry reports more concluded than are individually documented.", legend: [{ label: "In force", ar: "سارية", color: "#2de39a" }, { label: "Signed", ar: "موقعة", color: "#ffb547" }, { label: "Negotiations concluded", ar: "انتهت المفاوضات", color: "#3ddcff" }] }),
  L("uaeflights", "diplomacy", "Direct flights from the UAE", "الرحلات المباشرة من الإمارات", "#5aa9ff", "choropleth", "live", { note: "Destinations served from UAE airports now or in season (Wikipedia airport tables via Wikidata; can lag the live schedule)." }),
  L("uaeinvestment", "economy", "UAE investment abroad", "الاستثمارات الإماراتية في الخارج", "#2de39a", "choropleth", "live", { note: "UAE direct-investment position by country, IMF Direct Investment Positions (mirror data; latest year differs by country)." }),
  L("dta", "diplomacy", "Double-taxation treaties", "اتفاقيات تجنب الازدواج الضريبي", "#5aa9ff", "choropleth", "live", { note: "Countries with a double-taxation agreement listed by MOFA or the Ministry of Foreign Trade.", legend: [{ label: "Treaty listed", ar: "اتفاقية مدرجة", color: "#5aa9ff" }] }),
  L("airagreements", "diplomacy", "Air services agreements", "اتفاقيات النقل الجوي", "#b693ff", "choropleth", "live", { note: "Countries with an air transport / air services agreement or MoU listed by MOFA.", legend: [{ label: "Agreement listed", ar: "اتفاقية مدرجة", color: "#b693ff" }] }),
  L("jec", "diplomacy", "Joint economic committees", "اللجان الاقتصادية المشتركة", "#ff8a4c", "choropleth", "live", { note: "Joint economic committees with a recorded meeting history (Ministry of Foreign Trade).", legend: [{ label: "Committee", ar: "لجنة", color: "#ff8a4c" }] }),
  L("missions", "diplomacy", "UAE missions", "البعثات الإماراتية", "#3ddcff", "points", "soon", { note: "Needs a curated embassy dataset." }),
  L("visits", "diplomacy", "Official visits", "الزيارات الرسمية", "#2de39a", "lines", "soon", { note: "Needs curated visit records." }),
  L("thinktanks", "diplomacy", "Think tanks", "مراكز الفكر", "#b693ff", "points", "soon"),
  L("outlets", "diplomacy", "News outlets", "المنافذ الإخبارية", "#ff8a4c", "points", "soon"),
  L("channels", "diplomacy", "News channels", "القنوات الإخبارية", "#ff5d73", "points", "soon"),
  // ───────────── Security & risk ─────────────
  L("conflicts", "security", "Active conflicts", "النزاعات النشطة", "#ff5d73", "points", "needs-key", { note: "UCDP/ACLED need an access token." }),
  L("carriers", "security", "US carrier groups", "مجموعات حاملات الطائرات الأمريكية", "#ffb547", "points", "soon", { note: "No open feed; needs curated tracking." }),
  L("bases", "security", "Military bases", "القواعد العسكرية", "#ffb547", "points", "soon"),
  L("gpsjam", "security", "GPS interference", "التشويش على GPS", "#ff8a4c", "polygons", "live", { api: "gpsjam", refreshSec: 21600, note: "Share of aircraft reporting degraded GPS yesterday, from ADS-B (GPSJam).", sub: [
    { key: "high", en: "Severe (10%+ of aircraft)", ar: "شديد (10%+ من الطائرات)", color: "#ff5d73" }, { key: "med", en: "Elevated (2–10%)", ar: "مرتفع (2–10%)", color: "#ffb547" } ] }),
  L("cyber", "security", "Cyber threats", "التهديدات السيبرانية", "#b693ff", "points", "unavailable", { note: "No compliant open feed." }),
  L("sanctions", "security", "Sanctions", "العقوبات", "#ff5d73", "choropleth", "live", { note: "OFAC SDN and UN consolidated list, by country of address." }),
  // ───────────── Economy ─────────────
  L("aid", "economy", "Foreign aid", "المساعدات الخارجية", "#2de39a", "choropleth", "soon", { note: "World Bank ODA received, latest year." }),
  L("exchanges", "economy", "Stock exchanges", "البورصات", "#ffc247", "points", "soon"),
  L("indices", "economy", "Indices & ETFs", "المؤشرات وصناديق المؤشرات", "#3ddcff", "points", "soon"),
  L("fx", "economy", "Currencies (FX)", "العملات", "#2de39a", "points", "soon"),
  L("crypto", "economy", "Cryptocurrencies", "العملات المشفرة", "#ffb547", "points", "soon"),
  L("commodities", "economy", "Commodities", "السلع", "#c9a26b", "points", "soon"),
  // ───────────── Infrastructure ─────────────
  L("ports", "infra", "Ports", "الموانئ", "#5aa9ff", "points", "soon"),
  L("energy", "infra", "Energy & nuclear", "الطاقة والنووي", "#ffc247", "points", "soon", { sub: [{ key: "nuclear", en: "Nuclear", ar: "نووي", color: "#2de39a" }, { key: "fossil", en: "Coal, oil & gas", ar: "فحم ونفط وغاز", color: "#ff7a45" }, { key: "renew", en: "Renewables & hydro", ar: "متجددة ومائية", color: "#3ddcff" }] }),
  L("cables", "infra", "Submarine cables", "الكابلات البحرية", "#3ddcff", "lines", "soon"),
  L("pipelines", "infra", "Strategic pipelines", "خطوط الأنابيب الاستراتيجية", "#ffb547", "lines", "soon"),
  L("straits", "infra", "Straits & chokepoints", "المضائق ونقاط الاختناق", "#ff5d73", "points", "soon"),
  // ───────────── Memberships · UN ─────────────
  L("m:unsc", "un", "Security Council — paint current members", "مجلس الأمن — تلوين الأعضاء الحاليين", "#3ddcff", "members", "live", { members: "unsc" }),
  L("m:nsgt", "un", "Non-Self-Governing Territories", "الأقاليم غير المتمتعة بالحكم الذاتي", "#ffb547", "members", "soon", { members: "nsgt" }),
  ...([["unga", "UNGA · General Assembly", "الجمعية العامة"], ["ecosoc", "ECOSOC · Economic and Social Council", "المجلس الاقتصادي والاجتماعي"], ["icj", "ICJ · International Court of Justice", "محكمة العدل الدولية"], ["who", "WHO · World Health Organization", "منظمة الصحة العالمية"], ["unesco", "UNESCO · UNESCO", "اليونسكو"], ["fao", "FAO · Food and Agriculture Organization", "الفاو"], ["ilo", "ILO · International Labour Organization", "منظمة العمل الدولية"], ["imo", "IMO · International Maritime Organization", "المنظمة البحرية الدولية"], ["icao", "ICAO · International Civil Aviation Organization", "منظمة الطيران المدني الدولي"], ["itu", "ITU · International Telecommunication Union", "الاتحاد الدولي للاتصالات"], ["wipo", "WIPO · World Intellectual Property Organization", "الويبو"], ["imf", "IMF · International Monetary Fund", "صندوق النقد الدولي"], ["wbg", "WBG · World Bank Group", "مجموعة البنك الدولي"], ["wfp", "WFP · World Food Programme", "برنامج الأغذية العالمي"], ["unicef", "UNICEF · UNICEF", "اليونيسف"], ["unhcr", "UNHCR · UN Refugee Agency", "مفوضية اللاجئين"], ["undp", "UNDP · UN Development Programme", "برنامج الأمم المتحدة الإنمائي"], ["unep", "UNEP · UN Environment Programme", "برنامج الأمم المتحدة للبيئة"], ["iaea", "IAEA · International Atomic Energy Agency", "الوكالة الدولية للطاقة الذرية"], ["wto", "WTO · World Trade Organization", "منظمة التجارة العالمية"], ["opcw", "OPCW · Organisation for the Prohibition of Chemical Weapons", "منظمة حظر الأسلحة الكيميائية"], ["irena", "IRENA · International Renewable Energy Agency", "الوكالة الدولية للطاقة المتجددة"], ["itlos", "ITLOS · International Tribunal for the Law of the Sea", "المحكمة الدولية لقانون البحار"], ["isa", "ISA · International Seabed Authority", "السلطة الدولية لقاع البحار"]] as [string, string, string][]).map(([id, en, ar]) => org(id, "un", en, ar, id)),
  // ───────────── Organisations ─────────────
  ...([["au", "African Union", "الاتحاد الأفريقي"], ["arableague", "Arab League", "جامعة الدول العربية"], ["arctic", "Arctic Council", "مجلس القطب الشمالي"], ["asean", "ASEAN", "آسيان"], ["caricom", "CARICOM", "كاريكوم"], ["cis", "Commonwealth of Independent States", "رابطة الدول المستقلة"], ["coe", "Council of Europe", "مجلس أوروبا"], ["ecowas", "ECOWAS", "إيكواس"], ["eu", "European Union", "الاتحاد الأوروبي"], ["gcc", "Gulf Cooperation Council", "مجلس التعاون الخليجي"], ["oic", "Organisation of Islamic Cooperation", "منظمة التعاون الإسلامي"], ["oas", "Organization of American States", "منظمة الدول الأمريكية"], ["ots", "Organization of Turkic States", "منظمة الدول التركية"], ["schengen", "Schengen Area", "منطقة شنغن"], ["sco", "Shanghai Cooperation Organisation", "منظمة شنغهاي للتعاون"]] as [string, string, string][]).map(([id, en, ar]) => org(id, "regional", en, ar, id)),
  ...([["aukus", "AUKUS", "أوكوس"], ["csto", "CSTO", "منظمة معاهدة الأمن الجماعي"], ["fiveeyes", "Five Eyes", "العيون الخمس"], ["icc", "ICC (Rome Statute)", "المحكمة الجنائية الدولية (نظام روما)"], ["nato", "NATO", "الناتو"], ["npt", "NPT (Non-Proliferation Treaty)", "معاهدة عدم الانتشار النووي"], ["osce", "OSCE", "منظمة الأمن والتعاون في أوروبا"], ["quad", "Quad", "الحوار الأمني الرباعي"]] as [string, string, string][]).map(([id, en, ar]) => org(id, "security-orgs", en, ar, id)),
  ...([["brics", "BRICS", "بريكس"], ["eaeu", "Eurasian Economic Union", "الاتحاد الاقتصادي الأوراسي"], ["eurozone", "Eurozone", "منطقة اليورو"], ["g20", "G20", "مجموعة العشرين"], ["g7", "G7", "مجموعة السبع"], ["mercosur", "Mercosur", "ميركوسور"], ["oecd", "OECD", "منظمة التعاون والتنمية"]] as [string, string, string][]).map(([id, en, ar]) => org(id, "economic-orgs", en, ar, id)),
  ...([["commonwealth", "Commonwealth of Nations", "الكومنولث"], ["opec", "OPEC", "أوبك"], ["opecplus", "OPEC+", "أوبك+"]] as [string, string, string][]).map(([id, en, ar]) => org(id, "energy-orgs", en, ar, id)),
  // ───────────── Reference ─────────────
  L("regions", "regions", "UN geoscheme regions", "المناطق الجغرافية للأمم المتحدة", "#3ddcff", "choropleth", "soon"),
  L("seas", "seas", "Seas & waters", "البحار والمياه", "#3ddcff", "points", "soon"),
  L("heritage", "culture", "UNESCO sites", "مواقع اليونسكو", "#ffc247", "points", "soon", { api: "heritage" }),
  L("languages", "culture", "Official languages", "اللغات الرسمية", "#b693ff", "choropleth", "soon"),
];
export const BY_ID = new Map(LAYERS.map((l) => [l.id, l]));
export const isData = (l: LayerDef) => l.status === "live" && l.kind !== "base";
export const statusLabel: Record<Status, { en: string; ar: string }> = { live: { en: "Live", ar: "مباشر" }, soon: { en: "Soon", ar: "قريباً" }, "needs-key": { en: "Needs key", ar: "يحتاج مفتاحاً" }, unavailable: { en: "Unavailable", ar: "غير متاح" } };

/** Shape every data route returns: a FeatureCollection whose features carry these properties. */
export type Feat = { id: string; layer: string; type: string; sub?: string; title: string; t?: number; sev?: number; url?: string; desc?: string; src?: string; iso3?: string; extra?: Record<string, string | number | null> };
