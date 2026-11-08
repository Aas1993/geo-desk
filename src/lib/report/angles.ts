// THE FOURTEEN ANGLES of docs/state-of-the-art-reporting-spec.md (B), a copy of the ids and names the comparison page uses so a report and the comparison speak of the same angles without the report reading the comparison's code.
export type AngleDef = { id: string; en: string; ar: string; short: [string, string] };
export const ANGLES: AngleDef[] = [
  { id: "gov", en: "Political and governance", ar: "السياسة والحوكمة", short: ["Governance", "الحوكمة"] }, { id: "friends", en: "Diplomatic standing, friends and blocs", ar: "المكانة الدبلوماسية والأصدقاء والتكتلات", short: ["Friends", "الأصدقاء"] },
  { id: "military", en: "Military and hard power (policy level)", ar: "القوة العسكرية والصلبة (على مستوى السياسات)", short: ["Hard power", "القوة الصلبة"] }, { id: "natsec", en: "National and homeland security", ar: "الأمن الوطني والداخلي", short: ["Security", "الأمن"] },
  { id: "econ", en: "Economic and financial", ar: "الاقتصاد والمال", short: ["Economy", "الاقتصاد"] }, { id: "tradeinv", en: "Trade and investment", ar: "التجارة والاستثمار", short: ["Trade, invest.", "التجارة والاستثمار"] },
  { id: "logistics", en: "Logistics, corridors and maritime", ar: "اللوجستيات والممرات والبحرية", short: ["Corridors", "الممرات"] }, { id: "energy", en: "Energy and resources", ar: "الطاقة والموارد", short: ["Energy", "الطاقة"] },
  { id: "tech", en: "Technology, digital and space", ar: "التقنية والرقمنة والفضاء", short: ["Tech, space", "التقنية والفضاء"] }, { id: "soft", en: "Soft power and society", ar: "القوة الناعمة والمجتمع", short: ["Soft power", "القوة الناعمة"] },
  { id: "influence", en: "Influence ledger against rivals", ar: "سجل النفوذ أمام المنافسين", short: ["Influence", "النفوذ"] }, { id: "legal", en: "Legal and normative", ar: "القانوني والمعياري", short: ["Legal", "القانوني"] },
  { id: "climate", en: "Climate and sustainability", ar: "المناخ والاستدامة", short: ["Climate", "المناخ"] }, { id: "info", en: "Information and narrative", ar: "المعلومات والسردية", short: ["Narrative", "السردية"] },
];
