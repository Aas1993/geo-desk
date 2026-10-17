import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feat } from "../registry";
import { fc, getJson } from "../cache";
type C = { iso3: string; name: string; capital: string | null; lat: number | null; lng: number | null };
const ALIAS: Record<string, string> = { "united states of america": "united states", "viet nam": "vietnam", "türkiye": "turkiye", "turkey": "turkiye", "republic of korea": "korea, rep.", "russian federation": "russian federation", "democratic republic of the congo": "congo, dem. rep.", "congo": "congo, rep.", "occupied palestinian territory": "west bank and gaza", "united kingdom of great britain and northern ireland": "united kingdom", "lao people's democratic republic": "lao pdr", "kingdom of saudi arabia": "saudi arabia", "iran (islamic republic of)": "iran, islamic rep.", "egypt": "egypt, arab rep.", "yemen": "yemen, rep.", "gambia": "gambia, the", "bahamas": "bahamas, the", "syrian arab republic": "syrian arab republic", "bolivia (plurinational state of)": "bolivia", "venezuela (bolivarian republic of)": "venezuela, rb", "united republic of tanzania": "tanzania", "cabo verde": "cabo verde", "cote d'ivoire": "cote d'ivoire", "côte d'ivoire": "cote d'ivoire", "kyrgyzstan": "kyrgyz republic", "slovakia": "slovak republic" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[–—]/g, "-").trim();

/** WHO Disease Outbreak News, last ~40 items, placed at the affected country's capital. */
export async function epidemics(): Promise<GeoJSON.FeatureCollection> {
  const countries = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as C[];
  const byName = new Map(countries.map((c) => [norm(c.name), c]));
  const j = await getJson<{ value: { Title: string; DonId: string; PublicationDateAndTime: string; ItemDefaultUrl: string; Summary: string }[] }>("https://www.who.int/api/news/diseaseoutbreaknews?sf_culture=en&$top=40&$orderby=PublicationDateAndTime%20desc");
  const out: GeoJSON.Feature[] = [];
  for (const d of j.value) {
    const title = d.Title.replace(/\s+/g, " "); const parts = title.split(/\s[-–—]\s/); const place = parts.length > 1 ? parts[parts.length - 1] : ""; // "Cholera - Angola"
    const names = place.split(/,| and /).map((x) => norm(x)).filter(Boolean);
    for (const n of names.slice(0, 3)) {
      const c = byName.get(ALIAS[n] ?? n) ?? byName.get(n.replace(/^the /, "")); if (!c || c.lat == null || c.lng == null) continue;
      const summary = d.Summary?.replace(/<[^>]+>/g, "").trim().slice(0, 240) ?? "";
      out.push({ type: "Feature", geometry: { type: "Point", coordinates: [c.lng, c.lat] }, properties: { id: `who:${d.DonId}:${c.iso3}`, layer: "epidemics", type: "outbreak", title: parts.slice(0, -1).join(" – ") || title, t: Date.parse(d.PublicationDateAndTime), sev: /ebola|marburg|nipah|h5n1|mers|plague|cholera/i.test(title) ? 2 : 1, url: `https://www.who.int${d.ItemDefaultUrl}`, desc: `${c.name} · ${summary}`, src: "WHO Disease Outbreak News", iso3: c.iso3 } satisfies Feat });
    }
  }
  return fc(out);
}
