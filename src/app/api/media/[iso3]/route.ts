import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { articles, Busy, toneSeries } from "@/lib/media/gdelt";
import { thinkTankItems, UAE_TERMS } from "@/lib/media/thinktanks";

export const maxDuration = 120;
const UAE = '"United Arab Emirates"';
const read = async <T,>(f: string) => JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T;

/** Media lookups for one country, one section at a time so the page can fill in as each arrives. dir=in: this country's media about the UAE; dir=out: UAE media about this country. */
export async function GET(req: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); const sp = new URL(req.url).searchParams; const part = sp.get("part") ?? ""; const dir = sp.get("dir") === "out" ? "out" : "in";
  if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const [fips, list] = await Promise.all([read<Record<string, string>>("fips.json"), read<{ iso3: string; name: string }[]>("countries.json")]);
    const country = list.find((c) => c.iso3 === iso3); const code = fips[iso3]; if (!country || !code) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const name = country.name.replace(/,.*$/, ""); const query = dir === "in" ? `${UAE} sourcecountry:${code}` : `"${name}" sourcecountry:AE`; const prefix = dir === "in" ? "M" : "U";
    const h = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };
    if (part === "tone") return NextResponse.json(await toneSeries(query), { headers: h });
    if (part === "neg") return NextResponse.json({ items: await articles(query, "toneasc", 6, prefix + "n") }, { headers: h });
    if (part === "pos") return NextResponse.json({ items: await articles(query, "tonedesc", 6, prefix + "p") }, { headers: h });
    if (part === "tanks") { const [a, b] = await Promise.all([thinkTankItems(UAE_TERMS, "TU"), thinkTankItems([name], "TC")]); return NextResponse.json({ uae: a, country: b, shared: a.filter((x) => b.some((y) => y.url === x.url || y.title === x.title)) }, { headers: h }); }
    return NextResponse.json({ error: "bad_part" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: e instanceof Busy ? "busy" : "upstream", message: e instanceof Error ? e.message : "error" }, { status: e instanceof Busy ? 503 : 502 }); }
}
