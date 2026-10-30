import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { cached, getJson } from "@/lib/layers/cache";

/** Internet disruption in a country over the last 24 h, from IODA (Georgia Tech's open Internet Outage Detection and Analysis; keyless). */
export async function GET(_: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: raw } = await params; const iso3 = raw.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso3)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string; iso2: string }[]; const c = list.find((x) => x.iso3 === iso3); if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const r = await cached(`ioda:${c.iso2}`, 900_000, async () => {
      const now = Math.floor(Date.now() / 1000);
      const j = await getJson<{ data?: { event_cnt?: number; scores?: { overall?: number } }[] }>(`https://api.ioda.inetintel.cc.gatech.edu/v2/outages/summary?entityType=country&entityCode=${c.iso2}&from=${now - 86400}&until=${now}`, {}, 20_000);
      const d = j.data?.[0]; return { events: d?.event_cnt ?? 0, score: d?.scores?.overall != null ? Math.round(d.scores.overall) : 0 };
    });
    return NextResponse.json({ iso3, ...r.value, source: "IODA (Georgia Tech)", url: `https://ioda.inetintelligence.cc.gatech.edu/country/${c.iso2}` }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch (e) { return NextResponse.json({ error: "upstream", message: e instanceof Error ? e.message : "error" }, { status: 502 }); }
}
