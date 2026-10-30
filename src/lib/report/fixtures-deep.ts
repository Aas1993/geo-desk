import { parseDirective } from "../desk/core";
import { REVIEWS } from "./fixtures";

// Synthetic, complete products for Deep Intelligence (the analyst team and the research synthesis), the directive answer and the generic kinds, for the synthetic country "FIN" (not NOR: other sessions wipe NOR). Labelled as test data in their text; never written anywhere by the app.
const STANDARD = {
  soWhat: "TEST FIXTURE: staging keeps the UAE's options open while the terms are unknown; a full commitment now would be money at risk on unverified data.",
  angles: [{ id: "econ", status: "covered", note: "Customs and IMF series read" }, { id: "tradeinv", status: "covered" }, { id: "natsec", status: "thin", note: "Compliance and reputation only" }, { id: "energy", status: "thin" }, { id: "gov", status: "covered" }, { id: "tech", status: "notfound", note: "Needs the tech registry" }],
  scenarios: [{ kind: "base", name: "Slow gated progress", likelihood: "likely", summary: "Terms arrive late; tranches stay gated.", tripwires: [{ indicator: "Terms note", threshold: "Not by 31 January", move: "Move to hold" }] }, { kind: "downside", name: "Relapse", likelihood: "roughly even", summary: "Trade pauses.", tripwires: [{ indicator: "New designations", threshold: "Any on a counterparty", move: "Suspend" }] }],
  milestones: { "30d": [{ id: "M1", title: "Request HS-level data", owner: "Desk", start: "2026-11-01", end: "2026-11-30", gate: "Data received", measure: "Table on file" }], "100d": [{ id: "M2", title: "Compliance screening", owner: "Compliance", start: "2026-11-15", end: "2027-02-10", gate: "Screening cleared", measure: "Report", dependsOn: ["M1"] }] },
  coalition: [{ name: "Saudi Arabia", kind: "country", stance: "partner", offer: "Joint financing", ask: "Support at the board" }],
  ledger: [{ instrument: "Ports and logistics", uae: 70, headroom: 20, rivals: { China: 85, "Türkiye": 40 }, note: "Rival rail terms" }],
};
const usage = { searches: 12, usd: 0.5, input: 1, output: 1, cacheRead: 0, cacheWrite: 0 };
const analyst = (role: string, conf: string, extra = "") => `### Analyst: ${role}\n\n**Mandate:** TEST FIXTURE. Read the evidence for ${role}.\n\n**Distinct contribution:** One reading of the shared facts.\n\n**Evidence:**\n- [F1] and [F2]: trade is US$4.1bn.\n\n**Assumptions:** The customs series is complete.\n\n**Conclusion:** Stage the commitment behind a validation step.\n\n**Confidence:** ${conf}\n\n**Contrary evidence:** A rival tender.\n\n**UAE relevance:** Ports and aviation.\n\n**Unresolved questions:** ${extra || "Product mix."}\n`;
export const deepCouncilEn = (): string => `## Decision Summary

**Decision (Proposal):** TEST FIXTURE. Stage the commitment: trace the trade first (A), defer investment by default (C), and move to a limited framework (B) only if a trigger fires.

**Main trade-off:** Trade is growing, US$4.1bn in 2025 [F1], but it is 0.9% of UAE trade [F2] and the product mix is unknown [F3].

**Next trigger:** HS-level customs data and a compliance screen of counterparties.

## Evidence

**Established:**
- Trade, customs basis, including re-exports: exports 2,658 and imports 1,837, US$m [F1].

**Not established:**
- The product mix.

## Perspectives

UAE and international readings differ on pace but agree on sequencing.

## Economic and Market Signals

IMF growth 5.2% (2026) [F5].

## UAE Exposure

Unknown exposure is unknown, not zero [F3].

## Outcome Trees

- **Peace track holds.** Trade continues.
- **Relapse.** Trade pauses.

## Options

| Option | Why positioned | Capability | Window | Cost | Feasibility | Downside | Validation |
|---|---|---|---|---|---|---|---|
| A: trace trade and counterparties | A US$4.1bn link [F1] | Desk, MoFT | About 3 months | Not estimated | High | Finds little | HS-level data |
| B: limited framework | Ports strengths | Existing mission | 6–18 months | Not estimated | Medium to low | Association with conflict-linked supply | Legal review |
| C: defer investment (default) | The link is small [F2] | None | Now | Nil | High | Rivals move first | Review after A |
| D: mineral offtake | Possible hedge | Unknown | Not established | Not estimated | Not established | Compliance | Competitive check |

## Forecasts

Projections, not promises. IMF growth 5.17% (2026) [F5].

## Dissent

- **Changes the option:** B becomes conditional on A.
- **Unresolved:** whether engaging is warranted.

## Follow-through

| Trigger | Threshold | Owner (role) | Review |
|---|---|---|---|
| HS-level data returned | Gold share and re-export share | Trade analyst | Set at 3 months |
| Counterparty screening | Any sanctioned link: stop | Compliance | Before any deal |
| New designations | Any on a counterparty | Compliance | Monthly |

DESK INPUT REQUIRED: the UAE policy line and company exposure.

This is working analysis until a named person reviews it.

# Appendix: Analyst Sections

<!-- group: g-evidence -->
${analyst("Research synthesis analyst", "Low. One source, a podcast note.")}
${analyst("Country and political economy analyst", "Medium for sequencing, low for any outcome.")}
<!-- group: g-economy -->
${analyst("Trade and investment analyst", "High. Customs data are complete.", "DESK INPUT REQUIRED: the agreement list.")}

# Appendix: Challenge
## Dissent

Search note: one search run.

| Judgment | Strongest objection | Evidence or source | Would it change the recommended option? |
|---|---|---|---|
| Trade analyst: Finland trade is a metals channel | The thesis may be wrongly framed; much is routed through third countries. | [SWISSAID](https://example.org/a) says hubs matter. | Partly. Option A widens to third-country routes. |
| National security: the likeliest harm is reputational | The low rating leans on absent data. | [F26] has low confidence. | No. It supports the same sequencing. |
| Policy: option B is feasible in 6–18 months | Nothing shows a verifier exists. | [F22] shows no agreements. | Yes. B is gated behind A. |

## What would make the whole package wrong

A signed rival offtake that closes the window.

# Appendix: Verification
## Claim Audit

Research note: one search.

| # | Claim | Fact id or source | Verdict | Correction |
|---|---|---|---|---|
| 1 | The UAE has no diplomatic presence. | [F24] | Unsupported / stale | A [MoFA item](https://example.org/b) reports an ambassador. |
| 2 | 2025 exports were US$2,658m. | [F1] | Supported | Customs basis. |
| 3 | Exports rose 8.2%. | [F1] | Supported | Correct. |
| 4 | The surplus is about US$0.9bn. | [F1] | Partly supported | Give the period. |
| 5 | The 50% test is sourced. | [F9] | Stale | Re-check. |

## Critical errors

None beyond claim 1.

<deep>${JSON.stringify(STANDARD)}</deep>${REVIEWS()}`;
export const deepCouncilAr = (): string => `## ملخص القرار

**القرار (مقترح):** بيانات اختبارية. التزام على مراحل: تتبّع التجارة أولًا (أ)، وتأجيل الاستثمار افتراضيًا (ج)، والانتقال إلى إطار محدود (ب) إن انطلق محفّز.

**المقايضة الرئيسية:** التجارة تنمو، 4.1 مليار دولار في 2025 [F1]، لكنها 0.9% من تجارة الإمارات [F2] ومزيج المنتجات مجهول [F3].

**المحفّز التالي:** بيانات جمركية على مستوى النظام المنسق وفحص امتثال للأطراف.

## الأدلة

**ثابت:**
- التجارة على أساس الجمارك [F1].

## الإشارات الاقتصادية

نمو الصندوق 5.2% (2026) [F5].

## الانكشاف

الانكشاف المجهول مجهول وليس صفرًا [F3].

## الخيارات

| الخيار | لماذا هو مناسب | القدرة | النافذة | الكلفة | الجدوى | الجانب السلبي | التحقق |
|---|---|---|---|---|---|---|---|
| أ: تتبّع التجارة والأطراف | رابط بقيمة 4.1 مليار [F1] | المكتب | نحو 3 أشهر | غير مقدّرة | مرتفعة | قد لا يجد شيئًا | بيانات النظام المنسق |
| ب: إطار محدود | قدرات الموانئ | البعثة القائمة | 6–18 شهرًا | غير مقدّرة | متوسطة إلى منخفضة | ارتباط بسلاسل مرتبطة بالنزاع | مراجعة قانونية |
| ج: تأجيل الاستثمار | الرابط صغير [F2] | لا شيء | الآن | لا شيء | مرتفعة | المنافسون يتحركون أولًا | مراجعة بعد أ |

## المتابعة

| المحفّز | العتبة | المسؤول | المراجعة |
|---|---|---|---|
| عودة بيانات النظام المنسق | حصة الذهب | محلل التجارة | بعد 3 أشهر |
| فحص الأطراف | أي رابط خاضع للعقوبات: توقف | الامتثال | قبل أي صفقة |

مطلوب من المكتب: خط السياسة الإماراتي وانكشاف الشركات.

# ملحق: أقسام المحللين

### محلل: محلل التجارة والاستثمار

**الولاية:** بيانات اختبارية.

**الإسهام المميز:** قراءة واحدة.

**الأدلة:**
- [F1] التجارة 4.1 مليار.

**الافتراضات:** السلسلة الجمركية كاملة.

**الاستنتاج:** مرحلة الالتزام خلف خطوة تحقق.

**الثقة:** مرتفعة. بيانات الجمارك كاملة.

**الأدلة المضادة:** مناقصة منافسة.

**صلة الإمارات:** الموانئ والطيران.

**أسئلة غير محسومة:** مزيج المنتجات.

# ملحق: التحدي
## الخلاف

| الحكم | أقوى اعتراض | الدليل أو المصدر | هل يغيّر الخيار الموصى به؟ |
|---|---|---|---|
| محلل التجارة: تجارة النرويج قناة معادن | قد يكون الإطار خاطئًا. | [F26] ثقة منخفضة. | جزئيًا. يتسع الخيار أ. |
| الأمن الوطني: الضرر الأرجح سمعي | التقدير المنخفض يستند إلى غياب البيانات. | [F20] مجهول. | لا. يدعم التسلسل نفسه. |

# ملحق: التحقق
## تدقيق الادعاءات

| # | الادعاء | معرّف الحقيقة أو المصدر | الحكم | التصحيح |
|---|---|---|---|---|
| 1 | لا حضور دبلوماسي للإمارات. | [F24] | غير مدعوم | ورد بند يذكر سفيرًا. |
| 2 | صادرات 2025 بلغت 2,658 مليون دولار. | [F1] | مدعوم | على أساس الجمارك. |
| 3 | الفائض نحو 0.9 مليار. | [F1] | مدعوم جزئيًا | اذكر الفترة. |
${REVIEWS()}`;
export const deepResearchEn = (): string => `# Research synthesis

> Working analysis from the research and country analysts, checked by the verifier. There is no chair in this lighter run: it compares and checks the research, it does not decide.

# Appendix: Analyst Sections

<!-- group: g-evidence -->
${analyst("Research synthesis analyst", "Low to medium. Few cards name the country.")}
${analyst("Country and political economy analyst", "Medium. Local evidence is thin.")}

# Appendix: Verification
## Claim Audit

| # | Claim | Fact id or source | Verdict | Correction |
|---|---|---|---|---|
| 1 | Two institutions agree on the outlook. | [F10] | Supported | Both cite the same dataset, so one evidence family. |
| 2 | The paper projects 4% growth. | [F11] | Partly supported | It is a dated projection. |
| 3 | The think tank is UAE-based. | [F12] | Unsupported | It is based in Oslo. |

## Critical errors

None.
${REVIEWS()}`;
export const directiveEn = () => `Answer text in markdown.\n\n## Answer\n\nTEST FIXTURE. Stage the commitment behind dated gates and keep an exit. [F1]\n\n## Recommendation\n\nProposal: trace the trade first.\n\n# Specialist Findings\n\nDetails.\n\n<directive>${JSON.stringify({ answer: "TEST FIXTURE. Stage the commitment behind dated gates and keep an exit; the evidence supports a staged path, not a full commitment now.", recommendation: "Measure the exposure first, make no company-specific approach, and ask only for published rules through the foreign ministry.", confidence: "moderate", options: [{ name: "Monitor and measure (recommended)", pros: ["Cheap and reversible", "Protects reputation"], cons: ["Some lost deal flow"], cost: "not estimated", risk: "Exposure is larger than assumed" }, { name: "Lobby for UAE-linked exemptions", pros: ["Could protect specific firms"], cons: ["Looks like advocacy", "Cuts across the Ebola separation", "Low chance of success"], cost: "not estimated", risk: "Reputational damage" }, { name: "Do nothing", pros: ["No effort"], cons: ["Exposure unmeasured"], cost: "Nil", risk: "Surprise exposure" }], steps: [{ action: "Request HS-level trade table", owner: "Trade desk with Legal", when: "Days 0-30", detail: "Establish the mineral share of trade." }, { action: "Run a voluntary exposure survey", owner: "Trade desk with MoFT", when: "Days 0-45", detail: "Legal basis for data request." }, { action: "Request the quota rules and review calendar", owner: "Political desk", when: "Days 15-60", detail: "Verify office-holders first." }, { action: "File a monthly price watch note", owner: "Political and Trade desks", when: "Monthly", detail: "Include comparisons." }], risks: [{ name: "Another quota change", mitigation: "Measure and limit exposure" }, { name: "Sanctions-list association", mitigation: "Screen counterparties before any step" }], needs: ["MoFT customs data", "Legal reading of the CEPA texts"], follow: ["What would change this recommendation?", "Who owns the first step?"], ...STANDARD })}</directive>`;
export const directiveAr = () => `نص الإجابة.\n\n## الإجابة\n\nبيانات اختبارية. التزام على مراحل خلف بوابات مؤرخة مع الإبقاء على مخرج.\n\n<directive>${JSON.stringify({ answer: "بيانات اختبارية. يدعم الدليل مسارًا متدرجًا لا التزامًا كاملًا الآن.", recommendation: "قِس الانكشاف أولًا ولا تتصل بأي شركة بعينها واطلب القواعد المنشورة عبر وزارة الخارجية.", confidence: "high", options: [{ name: "الرصد والقياس (موصى به)", pros: ["رخيص وقابل للعكس"], cons: ["فقدان بعض الصفقات"], cost: "غير مقدّرة", risk: "الانكشاف أكبر من المفترض" }, { name: "عدم فعل شيء", pros: ["بلا جهد"], cons: ["انكشاف غير مقيس", "لا إنذار مبكر"], cost: "لا شيء", risk: "مفاجأة" }], steps: [{ action: "طلب جدول التجارة على مستوى النظام المنسق", owner: "مكتب التجارة مع الشؤون القانونية", when: "الأيام 0-30", detail: "تحديد حصة المعادن من التجارة." }, { action: "إعداد مذكرة شهرية للأسعار", owner: "المكتب السياسي", when: "شهريًا", detail: "تتضمن المقارنات." }], risks: [{ name: "تغيير آخر في الحصص", mitigation: "قياس الانكشاف وحصره" }], needs: ["بيانات الجمارك من وزارة المالية"], follow: ["ما الذي يغيّر هذه التوصية؟"] })}</directive>`;
const brief = (title: string) => `# ${title}\n\nTEST FIXTURE. Finland is a stable, wealthy partner. The UAE's ties are growing; exposure is low. [F1]\n\n## Why it matters\n\n- Trade of US$4.1bn in 2025 [F1].\n- A sovereign fund is active.\n\n## What to watch\n\nA new tender, a currency move, a sanctions listing.\n\n| Indicator | Threshold |\n|---|---|\n| Reserve cover | Under 3 months |\n\n## Posture\n\nSelective and staged. ${"Filler sentence for length. ".repeat(14)}\n`;
const rev = REVIEWS();
export const STORE: Record<string, unknown> = {
  "gd-deep-council:FIN:full": { report: deepCouncilEn(), sources: [{ url: "https://www.imf.org/x", title: "IMF" }, { url: "https://www.reuters.com/y", title: "Reuters" }, { url: "https://www.imf.org/z", title: "IMF WEO" }, { url: "https://www.swissaid.ch/q", title: "SWISSAID" }], usage, at: "2026-10-30T10:00:00.000Z", model: "test-fixture", name: "Finland", options: { question: "What should the UAE decide?", horizonYears: 3, lang: "en", roles: ["research", "country", "trade"], audience: "analyst", mode: "full", kind: "deepcouncil" }, agents: [{ id: "g-evidence", name: "Research and country analysts", status: "done", usd: 0.13, searches: 2 }, { id: "g-economy", name: "Economic analysts", status: "done", usd: 0.12, searches: 1 }, { id: "challenger", name: "Independent challenger", status: "done", usd: 0.07, searches: 2 }, { id: "verifier", name: "Verifier", status: "done", usd: 0.08, searches: 1 }, { id: "chair", name: "Chair", status: "done", usd: 0.11, searches: 0 }], roles: { policy: { en: "Every package needs options.", ar: "كل حزمة تحتاج خيارات." }, verifier: { en: "All outputs are checked.", ar: "تُفحص كل المخرجات." } }, manifest: "MF-test", cached: false },
  "gd-deep-research:FIN:research": { report: deepResearchEn(), sources: [{ url: "https://www.imf.org/x", title: "IMF" }], usage, at: "2026-10-30T10:05:00.000Z", model: "test-fixture", name: "Finland", options: { question: "What do institutions argue?", horizonYears: 3, lang: "en", roles: ["research", "verifier"], audience: "analyst", mode: "research", kind: "deepcouncil" }, agents: [{ id: "g-evidence", name: "Research and country analysts", status: "done", usd: 0.1, searches: 2 }, { id: "verifier", name: "Verifier", status: "done", usd: 0.05, searches: 1 }], cached: false },
  "gd-desk-dir:embassy:FIN": [{ id: "t1", at: "2026-10-30T10:10:00.000Z", mode: "directive", urgency: "routine", topic: "How should the mission mitigate a quota change and who owns it?", agents: [], report: `${directiveEn()}`, usd: 0.33, searches: 5, sources: 4, cached: false, facts: [{ id: "F1", kind: "TEST", text: "Test fact", src: "fixture" }], lang: "en", directive: parseDirective(directiveEn()) }],
  "gd-brief2:FIN:en": { brief: { headline: "TEST FIXTURE. A stable partner.", sections: [{ title: "Posture", body: "Selective and staged. ".repeat(20) }, { title: "Watch", items: ["A tender", "A currency move", "A listing"] }] }, at: "2026-10-30T10:20:00.000Z", usage, model: "test-fixture", name: "Finland", sources: [{ url: "https://www.imf.org/x", title: "IMF" }, { url: "https://www.reuters.com/y", title: "Reuters" }] },
  "gd-desk:country-full:FIN": { report: `${brief("Country brief")}${rev}`, sources: [{ url: "https://www.imf.org/x", title: "IMF" }, { url: "https://www.imf.org/y", title: "IMF WEO" }, { url: "https://www.reuters.com/y", title: "Reuters" }, { url: "https://www.ft.com/z", title: "FT" }], usage, at: "2026-10-30T10:30:00.000Z", model: "test-fixture", name: "Finland", options: { lang: "en" }, cached: false, product: "country-full" },
  "gd-dossier:FIN": { report: brief("Country dossier"), sources: [{ url: "https://www.imf.org/x", title: "IMF" }], usage, at: "2026-10-30T10:40:00.000Z", model: "test-fixture", name: "Finland", options: { lang: "en" } },
  "gd-cp:FIN": { report: brief("Counterpart briefing"), sources: [], usage, at: "2026-10-30T10:41:00.000Z", model: "test-fixture", name: "Finland", options: { lang: "en" } },
  "gd-lab:FIN": { report: brief("Strategy lab brief"), sources: [{ url: "https://www.imf.org/x" }], usage, at: "2026-10-30T10:42:00.000Z", model: "test-fixture", name: "Finland", options: { lang: "en" } },
  "gd-stance:FIN:en": { stance: { headline: "TEST FIXTURE", outlets: [{ name: "Aftenposten", stance: "Neutral", note: "Balanced coverage of the fund. ".repeat(8) }] }, at: "2026-10-30T10:43:00.000Z", usage, model: "test-fixture", name: "Finland" },
};
