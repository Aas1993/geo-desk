import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CountryDetail, Leader, Series, Weather } from "@/lib/types";

let known: Set<string> | null = null;
const isos = async () => (known ??= new Set((JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string }[]).map((c) => c.iso3)));

const DAY = 86400;
const UA = { "User-Agent": "geo-desk/0.1 (dev; contact: local)" };
const WB: Record<string, string> = {
  gdp: "NY.GDP.MKTP.CD", gdpGrowth: "NY.GDP.MKTP.KD.ZG", gdpPc: "NY.GDP.PCAP.CD", inflation: "FP.CPI.TOTL.ZG",
  debt: "GC.DOD.TOTL.GD.ZS", unemployment: "SL.UEM.TOTL.ZS", exports: "NE.EXP.GNFS.CD", imports: "NE.IMP.GNFS.CD",
  tradeGdp: "NE.TRD.GNFS.ZS", milSpend: "MS.MIL.XPND.CD", milGdp: "MS.MIL.XPND.GD.ZS", milPers: "MS.MIL.TOTL.P1",
  lifeExp: "SP.DYN.LE00.IN", literacy: "SE.ADT.LITR.ZS", internet: "IT.NET.USER.ZS",
};

async function wbSeries(iso3: string, code: string): Promise<Series> {
  try {
    const r = await fetch(`https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=40&date=2005:2026`, { next: { revalidate: DAY }, signal: AbortSignal.timeout(15_000) });
    const j = await r.json();
    return ((j[1] ?? []) as { date: string; value: number | null }[])
      .filter((x) => x.value != null).map((x) => ({ y: +x.date, v: x.value as number })).sort((a, b) => a.y - b.y);
  } catch { return []; }
}

async function wd(params: Record<string, string>) {
  const u = new URL("https://www.wikidata.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "wbgetentities", format: "json", origin: "*", ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: UA, next: { revalidate: DAY } });
  if (!r.ok) throw new Error("wikidata " + r.status);
  return r.json();
}
type Claim = { mainsnak?: { datavalue?: { value?: { id?: string } } }; qualifiers?: Record<string, unknown>; rank?: string };
const current = (claims: Claim[] = []) => claims.filter((c) => c.rank !== "deprecated" && !c.qualifiers?.P582).map((c) => c.mainsnak?.datavalue?.value?.id).filter((x): x is string => !!x);

async function leaders(qid: string | null): Promise<Leader[] | null> {
  if (!qid || !/^Q\d+$/.test(qid)) return null;
  try {
    const c = (await wd({ ids: qid, props: "claims" })).entities?.[qid]?.claims ?? {};
    const picks: { role: Leader["role"]; id: string }[] = [
      ...current(c.P35).slice(0, 2).map((id) => ({ role: "head_of_state" as const, id })),
      ...current(c.P6).slice(0, 2).map((id) => ({ role: "head_of_government" as const, id })),
    ];
    if (!picks.length) return [];
    const ids = [...new Set(picks.map((p) => p.id))];
    const ents = (await wd({ ids: ids.join("|"), props: "labels|claims", languages: "en" })).entities ?? {};
    const out: Leader[] = []; const seen = new Set<string>();
    for (const p of picks) {
      const e = ents[p.id]; const name = e?.labels?.en?.value; if (!name || seen.has(p.role + p.id)) continue; seen.add(p.role + p.id);
      const file = e?.claims?.P18?.[0]?.mainsnak?.datavalue?.value as string | undefined;
      out.push({ role: p.role, name, qid: p.id, img: file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=96` : null });
    }
    return out;
  } catch { return null; }
}

async function weather(lat: number, lng: number): Promise<Weather | null> {
  try {
    const [w, a] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10_000) }).then((r) => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10_000) }).then((r) => r.json()).catch(() => null),
    ]);
    return { temp: w.current?.temperature_2m ?? null, code: w.current?.weather_code ?? null, isDay: w.current?.is_day === 1, tz: w.timezone ?? null, aqi: a?.current?.us_aqi ?? null };
  } catch { return null; }
}

export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params;
  const iso3 = raw.toUpperCase();
  if (!/^[A-Z]{3}$/.test(iso3) || !(await isos()).has(iso3)) return Response.json({ error: "bad iso3" }, { status: 400 });
  const u = new URL(req.url); const q0 = u.searchParams.get("qid"); const qid = q0 && /^Q\d{1,10}$/.test(q0) ? q0 : null; const lat0 = parseFloat(u.searchParams.get("lat") ?? ""), lng0 = parseFloat(u.searchParams.get("lng") ?? ""); // coordinates are range-checked and rounded to 0.1 degree, so the weather cache cannot be filled with arbitrary points
  const ok = Math.abs(lat0) <= 90 && Math.abs(lng0) <= 180; const lat = ok ? Math.round(lat0 * 10) / 10 : NaN, lng = ok ? Math.round(lng0 * 10) / 10 : NaN;
  const keys = Object.keys(WB);
  const [series, ld, wx] = await Promise.all([
    Promise.all(keys.map((k) => wbSeries(iso3, WB[k]))),
    leaders(qid),
    isFinite(lat) && isFinite(lng) ? weather(lat, lng) : Promise.resolve(null),
  ]);
  const indicators: Record<string, Series> = {}; keys.forEach((k, i) => (indicators[k] = series[i]));
  const body: CountryDetail = { indicators, leaders: ld, weather: wx };
  return Response.json(body, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
