// Arabic wording for the indicator readings. The readings are composed in English from fixed patterns, so the Arabic is produced by an ordered set of exact pattern replacements rather than by a model: numbers, years and signs pass through untouched,
// so a figure can never change in translation (the specification asks for zero critical errors in numbers). A reading that matches no pattern is returned unchanged and the test fails, so a new reading cannot ship without its Arabic.
const BAND: Record<string, string> = { low: "منخفض", moderate: "معتدل", high: "مرتفع" };
const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/(\S+)% real growth in (\d{4})/, "$1% نمو حقيقي في $2"], [/(\S+)% inflation in (\d{4})/, "$1% تضخم في $2"], [/(\S+)% unemployment in (\d{4})/, "$1% بطالة في $2"], [/(\S+)% of GDP gross debt in (\d{4})/, "$1% من الناتج دين إجمالي في $2"],
  [/(\S+)% of GDP current account \((\d{4})\)/, "$1% من الناتج الحساب الجاري ($2)"], [/current account n\/a/, "الحساب الجاري غير متاح"], [/(\S+) months of import cover \((\d{4})\)/, "$1 شهرًا من تغطية الواردات ($2)"], [/reserve cover n\/a/, "تغطية الاحتياطيات غير متاحة"],
  [/(\S+)% of GDP private credit in (\d{4})/, "$1% من الناتج ائتمان خاص في $2"], [/(\S+)% non-performing loans \((\d{4})\)/, "$1% قروض متعثرة ($2)"], [/NPL n\/a/, "القروض المتعثرة غير متاحة"], [/(\S+)% capital to assets \((\d{4})\)/, "$1% رأس المال إلى الأصول ($2)"], [/capital n\/a/, "رأس المال غير متاح"],
  [/(\S+) AED per US\$ in (\d{4})/, "$1 درهم لكل دولار في $2"], [/\(([+-]?\S+)% on the year\)/, "($1% على السنة)"],
  [/UAE goods exports US\$(\d+)bn, imports US\$(\d+)bn in (\d{4})/, "صادرات الإمارات السلعية $1 مليار دولار والواردات $2 مليار دولار في $3"], [/; exports ([+-]?\S+)% on the year/, "؛ الصادرات $1% على السنة"],
  [/Partner HHI: exports (\d+) \((\w+)\), imports (\d+) \((\w+)\) in (\d{4})/, (_m, a, ba, c, bc, y) => `مؤشر الشركاء: الصادرات ${a} (${BAND[ba] ?? ba})، الواردات ${c} (${BAND[bc] ?? bc}) في ${y}`], [/imports n\/a in (\d{4})/, "الواردات غير متاحة في $1"],
  [/UAE net outward investment position US\$(\d+)bn in (\d{4})/, "صافي مركز الاستثمار الخارجي للإمارات $1 مليار دولار في $2"], [/ \(([+-]?\S+)% on the year\)/, " ($1% على السنة)"],
  [/Vintage store holds (\d+) snapshot\(s\); a revision needs two/, "يحتفظ مخزن الإصدارات بـ $1 لقطة؛ والمراجعة تحتاج لقطتين"], [/(\d+) revised value\(s\) between (\S+) and (\S+), largest (\S+) pp/, "$1 قيمة مُراجَعة بين $2 و$3، والأكبر $4 نقطة"], [/(\d+) revised value\(s\) between (\S+) and (\S+)/, "$1 قيمة مُراجَعة بين $2 و$3"],
  [/^n\/a$/, "غير متاح"],
];
export const toAr = (en: string): string => { let s = en; for (const [re, to] of RULES) s = s.replace(re, to as string); return s; };
