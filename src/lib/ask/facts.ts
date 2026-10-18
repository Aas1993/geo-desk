import { readFile } from "node:fs/promises";
import path from "node:path";
import { gatherCountryFacts, type Fact } from "@/lib/brief/facts";
import { buildAlerts } from "@/lib/alerts";
import { cached } from "@/lib/layers/cache";
import { parseRss } from "@/lib/rss";
import { cepaEffect, outlookRank, tradeSummary, usdM, type OutlookData, type PartnershipData, type TradeData } from "@/lib/intel";

type Dict = Record<string, unknown>;
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
const day = (iso?: string | null) => iso ?? "n/a";

/** Facts about one country drawn from every dataset the app holds, each with an id the model must cite. */
export async function countryFacts(iso3: string): Promise<{ name: string; facts: Fact[]; gaps: string[] } | null> {
  const base = await gatherCountryFacts(iso3); if (!base) return null; const facts = [...base.facts]; let n = facts.length; const add = (kind: string, text: string, src: string, url?: string, t?: number) => facts.push({ id: `F${++n}`, kind, text, src, url, t });
  const [ag, ms, vs, fl, inv, rw] = await Promise.all([rd<{ countries: Record<string, Dict> }>("agreements.json"), rd<{ countries: Record<string, Dict[]> }>("missions.json"), rd<{ items: { u: string; d: string; t: string; c: string[]; k: string; l: number }[] }>("visits.json"), rd<{ countries: Record<string, { counts: Record<string, number>; airlines: string[] }> }>("flights.json"), rd<{ world: { usd: number }; countries: Record<string, { outward?: { usd: number; year: number; rank?: number } }> }>("investment.json"), rd<{ countries: Record<string, { n30: number; n90: number; sectors: { name: string }[] }> }>("ransomware.json")]);
  const a = ag?.countries[iso3] as { mofa: { type: string }[]; moft: { type: string }[]; cepa: { status: string; signed: string | null; inForce: string | null } | null; committees: { meetings: number | null }[] } | undefined;
  if (a) { const all = [...a.mofa, ...a.moft]; const t = (k: string) => all.filter((x) => x.type === k).length; add("agreements", `UAE agreements with ${base.country.name} in MOFA and Ministry of Foreign Trade lists: ${all.length} in total (${t("tax")} double-taxation, ${t("air")} air-services, ${t("investment")} investment, ${t("legal")} legal/judicial, ${t("security")} defence/security). CEPA: ${a.cepa ? `${a.cepa.status}, signed ${day(a.cepa.signed)}, in force ${day(a.cepa.inForce)}` : "none documented by the Ministry"}. Joint economic committee meetings: ${a.committees[0]?.meetings ?? "none recorded"}.`, "MOFA / Ministry of Foreign Trade"); }
  const mm = ms?.countries[iso3]; if (mm?.length) add("missions", `UAE missions in ${base.country.name}: ${mm.map((m) => `${m.name} (${(m.head as { role: string; name: string } | null)?.role ?? "head"}: ${(m.head as { name: string } | null)?.name ?? "n/a"})`).join("; ")}.`, "MOFA missions directory");
  const vv = (vs?.items ?? []).filter((x) => x.c.includes(iso3)).slice(0, 8); for (const x of vv) add("engagement", `${x.d} · ${x.k}${x.l === 3 ? " (head of state/government level)" : x.l === 2 ? " (ministerial)" : ""}: ${x.t}`, "WAM headline (auto-classified)", `https://www.wam.ae/en/article/${x.u}`, Date.parse(x.d));
  const f = fl?.countries[iso3]; if (f) add("flights", `Direct flights from UAE airports to ${base.country.name}: ${f.counts.active + f.counts.seasonal} destinations active or seasonal, ${f.counts.suspended} suspended; airlines: ${f.airlines.slice(0, 8).join(", ")}.`, "Wikipedia airport tables via Wikidata");
  const o = inv?.countries[iso3]?.outward; if (o) add("investment", `UAE direct-investment position in ${base.country.name}: US$${(o.usd / 1e9).toFixed(1)}bn (${o.year})${o.rank ? `, #${o.rank} destination` : ""}.`, "IMF Direct Investment Positions (mirror data)");
  const r = rw?.countries[iso3]; if (r) add("cyber", `Ransomware leak-site postings naming organisations in ${base.country.name}: ${r.n30} in the last 30 days, ${r.n90} in 90 days; most affected sectors: ${r.sectors.map((s) => s.name).join(", ")}.`, "ransomware.live");
  // trade, outlook, CEPA effect and the Partnership Index
  const [tr, ol, pi] = await Promise.all([rd<TradeData>("trade.json"), rd<OutlookData>("outlook.json"), rd<PartnershipData>("partnership.json")]);
  const ts = tr ? tradeSummary(tr, iso3) : null;
  if (ts && tr) { const ce = a?.cepa?.inForce ? cepaEffect(tr, iso3, a.cepa.inForce) : null; add("trade", `UAE goods trade with ${base.country.name} in ${ts.year} (UAE customs data via the IMF, includes re-exports): US$${usdM(ts.total).slice(1)} in total, exports ${usdM(ts.x)}, imports ${usdM(ts.m)}, balance ${usdM(ts.balance)}; ${ts.share.toFixed(1)}% of UAE goods trade, #${ts.rank} partner of ${ts.of}${ts.yoy != null ? `; ${ts.yoy >= 0 ? "+" : ""}${ts.yoy.toFixed(1)}% on ${ts.year - 1}` : ""}${ts.ttm ? `; last 12 months ${usdM(ts.ttm.total)} (${ts.ttm.growth >= 0 ? "+" : ""}${ts.ttm.growth.toFixed(1)}% on the 12 before)` : ""}.${ce ? ` Since the CEPA entered into force (${a!.cepa!.inForce}), trade is ${ce.partnerGrowth >= 0 ? "+" : ""}${ce.partnerGrowth.toFixed(0)}% against ${ce.worldGrowth >= 0 ? "+" : ""}${ce.worldGrowth.toFixed(0)}% for UAE trade overall (${ce.effect >= 0 ? "ahead by" : "behind by"} ${Math.abs(ce.effect).toFixed(0)} points; correlation, not proof).` : ""}`, "IMF International Trade in Goods by partner"); }
  const oe = ol?.countries[iso3]; if (oe?.growth) { const g = (y: number) => (oe.growth?.[y] != null ? `${oe.growth[y].toFixed(1)}%` : "n/a"); const rk = ol ? outlookRank(ol, iso3, "growth", 2026) : null; add("outlook", `IMF outlook for ${base.country.name} (live World Economic Outlook database): real GDP growth ${g(2025)} in 2025, ${g(2026)} in 2026F, ${g(2027)} in 2027F${rk ? ` (2026 rank ${rk.rank} of ${rk.of})` : ""}; inflation ${oe.inflation?.[2026] ?? "n/a"}% in 2026F; current account ${oe.ca?.[2026] ?? "n/a"}% of GDP; government debt ${oe.debt?.[2026] ?? "n/a"}% of GDP.`, "IMF World Economic Outlook"); }
  const pr = pi?.countries[iso3]; if (pr) add("index", `UAE Partnership Index for ${base.country.name}: ${pr.score}/100, rank ${pr.rank} of ${pi!.n}. Component scores: trade ${pr.c.trade}, engagement ${pr.c.engagement}, agreements ${pr.c.agreements}, flights and embassy ${pr.c.connectivity}, investment ${pr.c.investment}, UN voting alignment ${pr.c.alignment}${pr.raw.alignment != null ? ` (${Math.round(pr.raw.alignment * 100)}% of votes shared)` : ""}. The index measures ties and activity, not friendship.`, "Geo Desk composite of the datasets above");
  // the newest coverage that links the country and the UAE, so both briefs see the relationship in the news and not only in the datasets
  try {
    const items = (await cached(`brief:uaenews:${iso3}`, 300_000, async () => {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${base.country.name}" (UAE OR Emirates OR Emirati OR "Abu Dhabi" OR Dubai)`)}+when:14d&hl=en&gl=US&ceid=US:en`, { headers: { "User-Agent": "geo-desk/0.1" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (!r.ok) throw new Error("news " + r.status); return parseRss(await r.text(), "", 8);
    })).value;
    const seen = new Set(facts.filter((x) => x.kind === "headline").map((x) => x.text.toLowerCase()));
    for (const h of items) { const i = h.title.lastIndexOf(" - "); const title = i > 0 ? h.title.slice(0, i) : h.title; if (seen.has(title.toLowerCase())) continue; add("uae-news", title, i > 0 ? h.title.slice(i + 3) : "News", h.link, h.ts); }
  } catch { base.gaps.push("UAE-related headline search unavailable."); }
  return { name: base.country.name, facts, gaps: base.gaps };
}

/** World picture: the merged alerts feed plus the latest senior engagements. */
export async function worldFacts(): Promise<{ facts: Fact[] }> {
  const al = (await cached("alerts:all", 120_000, buildAlerts)).value; const vs = await rd<{ items: { u: string; d: string; t: string; c: string[]; k: string; l: number }[] }>("visits.json"); const facts: Fact[] = []; let n = 0;
  for (const a of al.items.filter((x) => x.sev >= 2 || x.uae).slice(0, 24)) facts.push({ id: `F${++n}`, kind: a.kind, text: a.title, src: a.src, url: a.url, t: a.t });
  for (const x of (vs?.items ?? []).filter((v) => v.l >= 2).slice(0, 12)) facts.push({ id: `F${++n}`, kind: "engagement", text: `${x.d} · ${x.k}: ${x.t}`, src: "WAM headline (auto-classified)", url: `https://www.wam.ae/en/article/${x.u}`, t: Date.parse(x.d) });
  return { facts };
}
export const renderFacts = (facts: Fact[], gaps: string[] = []) => facts.map((x) => `[${x.id}] (${x.kind}, ${x.src}${x.t ? ", " + new Date(x.t).toISOString().slice(0, 10) : ""}) ${x.text}`).join("\n") + (gaps.length ? `\nGAPS: ${gaps.join(" ")}` : "");
