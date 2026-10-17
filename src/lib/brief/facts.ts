import { readFile } from "node:fs/promises";
import path from "node:path";
import { cached, getJson } from "@/lib/layers/cache";
import { hazards } from "@/lib/layers/sources/hazards";
import { epidemics } from "@/lib/layers/sources/epidemics";
import { events } from "@/lib/layers/sources/events";
import { parseRss } from "@/lib/rss";
import type { Feat } from "@/lib/layers/registry";

type C = { iso3: string; name: string; capital: string | null; region: string; population: { v: number; y: number } | null; currencies: string[]; languages: string[]; borders: string[] };
export type Fact = { id: string; kind: string; text: string; url?: string; src: string; t?: number };
export type CountryFacts = { country: C; facts: Fact[]; asOf: number; gaps: string[] };

const WB = [["gdpGrowth", "GDP growth (%)", "NY.GDP.MKTP.KD.ZG"], ["inflation", "Inflation (%)", "FP.CPI.TOTL.ZG"], ["milGdp", "Military spending (% of GDP)", "MS.MIL.XPND.GD.ZS"], ["debt", "Government debt (% of GDP)", "GC.DOD.TOTL.GD.ZS"]] as const;
const iso = (f: GeoJSON.Feature) => (f.properties as Feat);
const mentions = (text: string, name: string) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

/** Everything the brief may rely on, each with an id the model must cite. Gathered from the same cached sources as the map; a failing source becomes a stated gap. */
export async function gatherCountryFacts(iso3: string): Promise<CountryFacts | null> {
  const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as C[];
  const country = list.find((c) => c.iso3 === iso3); if (!country) return null;
  const facts: Fact[] = []; const gaps: string[] = []; let n = 0;
  const add = (kind: string, text: string, src: string, extra: Partial<Fact> = {}) => { facts.push({ id: `F${++n}`, kind, text, src, ...extra }); };
  const nameRe = country.name;

  add("profile", `${country.name}: capital ${country.capital ?? "n/a"}; region ${country.region.trim()}; population ${country.population ? `${Math.round(country.population.v).toLocaleString("en")} (${country.population.y})` : "n/a"}; currencies ${country.currencies.join(", ") || "n/a"}; languages ${country.languages.join(", ") || "n/a"}; neighbours (shared land or sea border, per Wikidata) ${country.borders.join(", ") || "none"}.`, "World Bank / Wikidata");

  const [wb, news, hz, who, ev, sanc] = await Promise.allSettled([
    Promise.all(WB.map(async ([, label, code]) => { try { const j = await getJson<[unknown, { date: string; value: number | null }[] | null]>(`https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=1&mrnev=1`, {}, 12_000); const r = j[1]?.[0]; /* skip stale readings: the API returns the latest non-empty year, which can be decades old */ return r?.value != null && +r.date >= new Date().getFullYear() - 3 ? { label, v: r.value, y: r.date } : null; } catch { return null; } })),
    cached(`brief:news:${iso3}`, 600_000, async () => {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent('"' + country.name + '"')}+when:7d&hl=en&gl=US&ceid=US:en`, { headers: { "User-Agent": "geo-desk/0.1" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (!r.ok) throw new Error("news " + r.status); return parseRss(await r.text(), "", 14);
    }).then((r) => r.value),
    cached("layer:hazards:", 600_000, () => hazards()).then((r) => r.value),
    cached("layer:epidemics:", 3_600_000, () => epidemics()).then((r) => r.value),
    cached("layer:events:", 600_000, () => events()).then((r) => r.value),
    readFile(path.join(process.cwd(), "public/data/sanctions.json"), "utf8").then((s) => JSON.parse(s) as { built: string; countries: Record<string, { ofac: number; un: number }> }),
  ]);

  if (wb.status === "fulfilled") { const rows = wb.value.filter((x): x is NonNullable<typeof x> => !!x); if (rows.length) add("economy", rows.map((x) => `${x.label} ${x.v.toFixed(1)} (${x.y})`).join("; "), "World Bank"); else gaps.push("No World Bank economic indicators available."); } else gaps.push("World Bank unavailable.");
  if (news.status === "fulfilled") {
    const items = news.value.map((h) => { const i = h.title.lastIndexOf(" - "); return i > 0 ? { ...h, title: h.title.slice(0, i), outlet: h.title.slice(i + 3) } : h; }).slice(0, 12);
    for (const h of items) add("headline", h.title, h.outlet || "News", { url: h.link, t: h.ts });
    if (!items.length) gaps.push("No headlines in the last 7 days.");
  } else gaps.push("Headline search unavailable.");
  if (ev.status === "fulfilled") {
    const mine = ev.value.features.filter((f) => mentions(iso(f).title, nameRe) && ["conflict", "coercion", "protest"].includes(iso(f).type)).sort((a, b) => (iso(b).sev ?? 0) - (iso(a).sev ?? 0)).slice(0, 6);
    for (const f of mine) { const p = iso(f); add("event", `${p.title}. ${p.desc ?? ""}`, "GDELT (machine-coded)", { url: p.url, t: p.t }); }
  } else gaps.push("GDELT events unavailable.");
  if (hz.status === "fulfilled") for (const f of hz.value.features.filter((f) => mentions(iso(f).title, nameRe)).slice(0, 4)) { const p = iso(f); add("hazard", p.title, p.src ?? "Hazards", { url: p.url, t: p.t }); }
  if (who.status === "fulfilled") for (const f of who.value.features.filter((f) => iso(f).iso3 === iso3).slice(0, 3)) { const p = iso(f); add("health", `${p.title}. ${p.desc ?? ""}`.slice(0, 320), "WHO Disease Outbreak News", { url: p.url, t: p.t }); }
  if (sanc.status === "fulfilled") { const s = sanc.value.countries[iso3]; add("sanctions", s ? `Persons/entities with an address in ${country.name} on sanctions lists: OFAC SDN ${s.ofac}, UN Security Council ${s.un} (built ${sanc.value.built.slice(0, 10)}).` : `No OFAC SDN or UN consolidated-list entries with an address in ${country.name}.`, "OFAC / UN consolidated list"); }
  return { country, facts, asOf: Date.now(), gaps };
}

export const renderFacts = (f: CountryFacts) => f.facts.map((x) => `[${x.id}] (${x.kind}, ${x.src}${x.t ? ", " + new Date(x.t).toISOString().slice(0, 10) : ""}) ${x.text}`).join("\n") + (f.gaps.length ? `\nGAPS: ${f.gaps.join(" ")}` : "");
