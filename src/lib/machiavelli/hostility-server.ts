import { readFile } from "node:fs/promises";
import path from "node:path";
import { assess, listed, type Inputs, type Row, type Tension } from "./hostility";

// Server side of the non-friendly-states watch list: reads the datasets, builds the inputs and runs the pure assessment. No model call, no cost.
const DIR = path.join(process.cwd(), "public/data");
type Obj<T = unknown> = Record<string, T>;
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(DIR, f), "utf8")) as T; } catch { return null; } };
export type Watch = { builtAt: string; sources: Obj<string | null>; n: number; counts: Record<string, number>; rows: Row[]; register: { note: string; entries: Tension[] }; limits: { en: string; ar: string }[] };
export async function getWatch(): Promise<Watch | null> {
  const [countries, regions, temp, part, sanc, outlook, reg] = await Promise.all([
    rd<{ iso3: string; name: string; nameAr?: string | null }[]>("countries.json"), rd<{ countries: Obj<{ region: string }> }>("regions.json"),
    rd<{ built?: string; countries: Obj<{ g: number; conflict: number; n: number; trend?: number | null }> }>("temperature.json"), rd<{ built?: string; countries: Obj<{ c: { trade: number; engagement: number; agreements: number }; raw: { alignment?: number } }> }>("partnership.json"),
    rd<{ built?: string; countries: Obj<{ ofac?: number; un?: number }> }>("sanctions.json"), rd<{ countries: Obj<{ gdp?: Obj<number> }> }>("outlook.json"), rd<{ note: string; entries: Tension[] }>("tension-register.json"),
  ]);
  if (!countries || !part || !temp) return null; const y = new Date().getFullYear();
  const inputs: Inputs[] = countries.filter((c) => c.iso3 !== "ARE" && part.countries[c.iso3]).map((c) => {
    const p = part.countries[c.iso3]; const t = temp.countries[c.iso3]; const s = sanc?.countries[c.iso3]; const g = outlook?.countries[c.iso3]?.gdp; const gdp = g?.[String(y - 1)] ?? g?.[String(y - 2)] ?? null;
    return { iso3: c.iso3, name: c.name, nameAr: c.nameAr ?? null, region: regions?.countries[c.iso3]?.region ?? "Other", tone: t ? { g: t.g, conflict: t.conflict, n: t.n, trend: t.trend ?? null } : null, alignment: typeof p.raw.alignment === "number" ? p.raw.alignment : null, sanc: s ? { ofac: s.ofac ?? 0, un: s.un ?? 0, gdp } : null, c: p.c };
  });
  const entries = (reg?.entries ?? []).filter((e) => countries.some((c) => c.iso3 === e.iso3)); const rows = assess(inputs, entries); const counts: Record<string, number> = {}; for (const r of listed(rows)) counts[r.tier!] = (counts[r.tier!] ?? 0) + 1;
  return { builtAt: new Date().toISOString(), sources: { temperature: temp.built ?? null, partnership: part.built ?? null, sanctions: sanc?.built ?? null }, n: rows.length, counts, rows, register: { note: reg?.note ?? "", entries }, limits: [
    { en: "Bilateral tone and conflict come from machine-coded news events (GDELT) over about 45 days and exist only for countries with enough events: a quiet relationship has no reading, and a noisy one can look worse than it is.", ar: "نبرة العلاقة وحصة الصدام من أحداث إخبارية مرمّزة آليًا (جديلت) خلال نحو 45 يومًا، وهي متاحة فقط للدول ذات الأحداث الكافية: العلاقة الهادئة بلا قراءة، والصاخبة قد تبدو أسوأ مما هي." },
    { en: "UN voting divergence shows a different foreign-policy line, not hostility; sanctions exposure shows the state is under international pressure, which is a risk to the UAE's compliance, not an act against the UAE.", ar: "الابتعاد في التصويت الأممي يدل على خط سياسة خارجية مختلف لا على عداء؛ والتعرض للعقوبات يدل على ضغط دولي على الدولة، وهو مخاطرة امتثال للإمارات لا فعل ضدها." },
    { en: "Countries and territories with no relationship data are not listed: distance is not hostility. Proxy or non-state hostility, covert activity and private intentions are not in any dataset here and are not inferred.", ar: "لا تُدرج الدول والأقاليم التي لا بيانات لعلاقتها: البعد ليس عداءً. والعداء عبر الوكلاء أو الجهات غير الحكومية والنشاط السري والنوايا الخاصة ليست في أي مجموعة بيانات هنا ولا تُستنتج." },
    { en: "A flag is a prompt for analysts to read the sources and decide, never a designation. Use it to plan protective measures, calibrate engagement and watch for escalation; the boundary of the module applies: influence is not control, no covert or coercive action.", ar: "العلامة تدعو المحللين إلى قراءة المصادر والبتّ، وليست تصنيفًا. استخدمها لتخطيط تدابير الحماية ومعايرة التواصل ومراقبة التصعيد؛ وتسري حدود الوحدة: النفوذ ليس سيطرة ولا عمل سري أو قسري." },
  ] };
}
