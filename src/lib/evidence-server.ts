import { readFile } from "node:fs/promises";
import path from "node:path";
import { govReading, socReading, latestPer, position, publishers, WGI_ONLY, type GovData, type SocData, type GovDim, type SocMetric, type Item } from "./evidence";

// The governance and society cross-checks as one fact for the evidence base every council reads (server side only: it reads public/data/governance-sources.json and society-sources.json),
// so the agents see every source's figure for a country and where they disagree instead of one World Bank number, and know which dimensions have no second source.
const load = <T,>(file: string) => { let c: Promise<T | null> | null = null; return () => (c ??= readFile(path.join(process.cwd(), "public/data", file), "utf8").then((s) => JSON.parse(s) as T).catch(() => null)); };
const gov = load<GovData>("governance-sources.json"), soc = load<SocData>("society-sources.json");
const VERDICT = { none: "no source", single: "one source only, not cross-checked", agree: "sources agree", close: "sources are close", differ: "sources differ" } as const;
const SOC_UNIT: Record<SocMetric, string> = { le: " years", lit: "%", net: "%", eys: " years", hdi: "" };

export async function evidenceFact(iso3: string, name: string): Promise<{ kind: string; text: string; src: string } | null> {
  const [g, s] = await Promise.all([gov(), soc()]); const parts: string[] = []; const used: string[] = [];
  const gc = g?.countries[iso3];
  if (g && gc) {
    const lines = (["cc", "va", "rl"] as GovDim[]).filter((d) => gc[d]?.length).map((d) => {
      const items = gc[d] as Item[]; const r = govReading(items);
      const row = (i: Item) => { const p = position(i); const nm = g.sources[i.s]?.name ?? i.s; return `${nm} ${i.s === "wgi" ? `${i.v} (percentile` : `${i.v} (${g.sources[i.s]?.unit ?? ""}${i.r && i.n ? `, rank ${i.r} of ${i.n}` : ""}`}, ${i.y}${i.s !== "wgi" && p != null ? `; stands ${Math.round(p)}/100 among the countries it ranks` : ""})`; };
      used.push(...items.map((i) => i.s));
      return `${g.dims[d].label}: ${items.map(row).join("; ")} => ${VERDICT[r.verdict]}${r.spread != null && r.used.length > 1 ? ` (positions span ${Math.round(r.spread)} points)` : ""}`;
    });
    if (lines.length) parts.push(`Governance of ${name}, each independent source beside the World Bank WGI (scales differ, so sources are compared as positions among the countries each ranks; within 15 points = agree, within 30 = close): ${lines.join(". ")}. Held from the WGI only, with no independent source: ${WGI_ONLY.map((k) => g.dims[k as GovDim]?.label ?? { pv: "political stability", ge: "government effectiveness", rq: "regulatory quality" }[k]).join(", ")}. Not available: ${g.unavailable.map((u) => u.name).join("; ")} (reasons in the dataset). These indices measure perceptions or expert judgement; a gap between them is a reason to look, not an error.`);
  }
  const sc = s?.countries[iso3];
  if (s && sc) {
    const lines = (["le", "lit", "net"] as SocMetric[]).filter((m) => sc[m]?.length).map((m) => {
      const items = latestPer(sc[m] as Item[]); const r = socReading(m, items); used.push(...items.map((i) => i.s));
      return `${s.metrics[m].label}: ${items.map((i) => `${s.sources[i.s]?.name ?? i.s} ${i.v}${SOC_UNIT[m]} (${i.y}${r.older.includes(i.s) ? ", older, not compared" : ""})`).join("; ")} => ${VERDICT[r.verdict]}${r.spread != null && r.used.length > 1 ? ` (spread ${r.spread.toFixed(1)}${SOC_UNIT[m] || ""})` : ""}`;
    });
    const extra = (["eys", "hdi"] as SocMetric[]).filter((m) => sc[m]?.length).map((m) => `${s.metrics[m].label} ${(sc[m] as Item[])[0].v}${SOC_UNIT[m]} (${(sc[m] as Item[])[0].y}, UNDP only)`);
    if (lines.length || extra.length) parts.push(`Society indicators for ${name}, by source: ${lines.join(". ")}${extra.length ? `. Held from one source only: ${extra.join("; ")}` : ""}. Several of these series share an upstream (UN Population Division for life expectancy, UNESCO UIS for literacy, ITU for internet use), so agreement between them is weaker evidence than agreement between independent measurements; each dataset's source notes say which. Not available: ${s.unavailable.map((u) => u.name).join("; ")}.`);
  }
  if (!parts.length) return null; const ids = [...new Set(used)];
  const srcNames = [...ids.map((id) => g?.sources[id]?.name ?? s?.sources[id]?.name).filter(Boolean)];
  return { kind: "evidence", text: parts.join(" "), src: `${[...new Set(srcNames)].join("; ")} (Geo Desk governance-sources.json and society-sources.json; ${publishers(ids, { ...(g?.sources ?? {}), ...(s?.sources ?? {}) })} publishers)` };
}
