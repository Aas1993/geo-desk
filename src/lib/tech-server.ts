import { readFile } from "node:fs/promises";
import path from "node:path";
import { TECH_KEYS, TECH_LABEL, complementarities, type TechData } from "./tech";

// The technology indicators as one fact for the evidence base every council reads (server side only: it reads public/data/tech.json). The agents then start from the World Bank figures instead of searching for what is already held, and know what is NOT held (data-centre capacity, AI-readiness indices).
let cache: Promise<TechData | null> | null = null;
const load = () => (cache ??= readFile(path.join(process.cwd(), "public/data/tech.json"), "utf8").then((s) => JSON.parse(s) as TechData).catch(() => null));
export async function techFact(iso3: string, name: string): Promise<{ kind: string; text: string; src: string } | null> {
  const d = await load(); const c = d?.countries[iso3]; if (!d || !c || !TECH_KEYS.some((k) => c[k])) return null; const u = d.countries.ARE;
  const row = (k: (typeof TECH_KEYS)[number]) => (c[k] ? `${TECH_LABEL[k].en} ${c[k]!.v} ${TECH_LABEL[k].unit} (${c[k]!.y}; ${c[k]!.pct}th percentile among reporting countries${u?.[k] ? `; the UAE ${u[k]!.v}, ${u[k]!.pct}th` : ""})` : null);
  const leads = complementarities(c, u, name).map((x) => x.en).join(" ");
  return { kind: "technology", text: `Technology, connectivity and innovation indicators for ${name} against the UAE (World Bank WDI via ITU, UNESCO UIS and WIPO; held data): ${TECH_KEYS.map(row).filter(Boolean).join("; ")}.${leads ? ` Leads from the gaps and strengths (proposals): ${leads}` : ""} Not held as data: data-centre capacity, AI-readiness indices, national AI strategies, and partnerships; search for them and say "not found" if absent.`, src: `World Bank World Development Indicators, built ${d.built}` };
}
