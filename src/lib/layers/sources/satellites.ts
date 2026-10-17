import { getJson } from "../cache";
type Omm = Record<string, string | number>;
// CelesTrak asks for at most one fetch per group every 2 hours; the route caches for that long. Positions are computed in the browser.
const GROUPS: Record<string, string[]> = { stations: ["stations"], nav: ["gps-ops", "galileo", "beidou", "glo-ops"], weather: ["weather"], earth: ["resource"], military: ["military"] };
export async function satellites() {
  const out: Record<string, Omm[]> = {};
  await Promise.all(Object.entries(GROUPS).map(async ([key, groups]) => {
    const parts = await Promise.all(groups.map((g) => getJson<Omm[]>(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`).catch(() => [] as Omm[])));
    out[key] = parts.flat();
  }));
  if (!Object.values(out).some((v) => v.length)) throw new Error("CelesTrak unavailable");
  return { type: "omm", groups: out };
}
