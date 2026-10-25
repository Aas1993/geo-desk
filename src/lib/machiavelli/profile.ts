import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { concentration, scoreProfile, type Profile, type Raw } from "./profile-core";

// Server side: builds a strategic profile for every country from the app's datasets. The browser reads the result through /api/machiavelli/profile.
const DIR = path.join(process.cwd(), "public/data");
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(DIR, f), "utf8")) as T; } catch { return null; } };
type Obj<T = unknown> = Record<string, T>;
export type Roll = { region: string; n: number; avg: Record<string, number>; withTier: number };
export type Portfolio = { tradeYear: number | null; trade: ReturnType<typeof concentration>; invest: ReturnType<typeof concentration>; regionShare: { region: string; trade: number; invest: number }[]; built: Obj<string | null> };
export type ProfileSet = { builtAt: string; sources: Obj<string | null>; profiles: Profile[]; portfolio: Portfolio; rolls: Roll[] };
let memo: { at: number; key: string; v: ProfileSet } | null = null;

export async function getProfiles(): Promise<ProfileSet | null> {
  const key = (await Promise.all(["trade.json", "partnership.json", "agreements.json"].map(async (f) => { try { return String((await stat(path.join(DIR, f))).mtimeMs); } catch { return "x"; } }))).join("|");
  if (memo && memo.key === key && Date.now() - memo.at < 3600_000) return memo.v;
  const [countries, regions, trade, inv, part, agr, bases, aid, rivals, gov, outlook, sanc, sc, deals, graph] = await Promise.all([
    rd<{ iso3: string; name: string; nameAr?: string | null }[]>("countries.json"), rd<{ countries: Obj<{ region: string; subregion: string | null }> }>("regions.json"), rd<{ built?: string; countries: Obj<{ a: [number, number, number][] }>; world: { a: [number, number, number][] } }>("trade.json"),
    rd<{ built?: string; countries: Obj<{ outward?: { usd: number; year: number } }> }>("investment.json"), rd<{ built?: string; countries: Obj<{ c: Raw["pct"] }> }>("partnership.json"), rd<{ built?: string; countries: Obj<{ mofa?: { t: string; type: string }[]; cepa?: { status: string; inForce: string | null; signed: string | null } | null }> }>("agreements.json"),
    rd<{ features: { properties: { iso3?: string; desc?: string } }[] }>("layers/bases.geojson"), rd<{ built?: string; countries: Obj<Obj<number>> }>("uae-aid.json"), rd<{ built?: string; countries: Obj<{ uae?: { share: number; rank: number }; of?: number; list?: { c: string; share: number }[] }> }>("rivals.json"),
    rd<{ built?: string; countries: Obj<{ ge: number; rq: number; pv: number; cc: number; rl: number }> }>("governance.json"), rd<{ countries: Obj<{ debt?: Obj<number> }> }>("outlook.json"), rd<{ countries: Obj<{ ofac?: number; un?: number }> }>("sanctions.json"),
    rd<{ countries: Obj<{ dims?: { global?: { score: number }; polfriends?: { parts?: { k: string; v: number }[] } } }> }>("scorecard.json"), rd<{ items: { d: string; c: string[] }[] }>("deals.json"), rd<{ nodes: { id: string; t: string; n: string }[]; edges: { a: string; b: string; r: string }[] }>("graph.json"),
  ]);
  if (!countries || !trade || !part || !agr) return null;
  const ukBase = new Map<string, number>(); for (const f of bases?.features ?? []) { const p = f.properties; if (p.iso3 && p.iso3 !== "ARE" && /operated by (the )?United Arab Emirates/i.test(p.desc ?? "")) ukBase.set(p.iso3, (ukBase.get(p.iso3) ?? 0) + 1); }
  const cut = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10); const dealN = new Map<string, number>(); for (const d of deals?.items ?? []) if (d.d >= cut) for (const c of d.c) dealN.set(c, (dealN.get(c) ?? 0) + 1);
  const choke = new Map<string, string[]>(); if (graph) { const names = new Map(graph.nodes.filter((n) => n.t === "chokepoint").map((n) => [n.id, n.n])); for (const e of graph.edges) if ((e.r === "adjoins" || e.r === "runs_through") && names.has(e.a) && e.b.startsWith("C:")) choke.set(e.b.slice(2), [...(choke.get(e.b.slice(2)) ?? []), names.get(e.a)!]); }
  const profiles: Profile[] = [];
  for (const c of countries) {
    if (c.iso3 === "ARE") continue; const p = part.countries[c.iso3]?.c ?? null; const ag = agr.countries[c.iso3]; const items = ag?.mofa ?? []; const reg = regions?.countries[c.iso3];
    const aidRows = aid?.countries[c.iso3] ?? {}; const aid5 = Object.entries(aidRows).filter(([y]) => +y >= 2022).reduce((a, [, v]) => a + (+v || 0), 0);
    const rv = rivals?.countries[c.iso3]; const sn = sanc?.countries[c.iso3]; const debt = outlook?.countries[c.iso3]?.debt?.["2025"] ?? null;
    const raw: Raw = {
      iso3: c.iso3, name: c.name, nameAr: c.nameAr, region: reg?.region ?? "Other", subregion: reg?.subregion ?? null, trade: trade.countries[c.iso3]?.a ?? null,
      invOut: inv?.countries[c.iso3]?.outward?.usd ?? null, invYear: inv?.countries[c.iso3]?.outward?.year ?? null, pct: p,
      agr: { security: items.filter((x) => x.type === "security").length, defence: items.some((x) => /defen[cs]e|military|armed forces/i.test(x.t)), soft: items.filter((x) => ["education", "health", "tech", "environment"].includes(x.type)).length, total: items.length, cepa: ag?.cepa ? { status: ag.cepa.status, inForce: ag.cepa.inForce, signed: ag.cepa.signed } : null },
      bases: ukBase.get(c.iso3) ?? 0, aid5,
      rivals: rv?.uae ? { rank: rv.uae.rank, of: rv.of ?? 14, uaeShare: rv.uae.share, top: rv.list?.[0] ?? null } : null,
      gov: gov?.countries[c.iso3] ?? null, debt: typeof debt === "number" ? debt : null, sanc: (sn?.ofac ?? 0) + (sn?.un ?? 0), globalScore: sc?.countries[c.iso3]?.dims?.global?.score ?? null, chokepoints: choke.get(c.iso3) ?? [],
      deals365: dealN.get(c.iso3) ?? 0, tone: (() => { const ps = sc?.countries[c.iso3]?.dims?.polfriends?.parts; if (!ps) return null; const f = (k: string) => ps.find((x) => x.k === k)?.v ?? null; return { temp: f("temp"), media: f("tone") }; })(),
    };
    profiles.push(scoreProfile(raw));
  }
  const last = trade.world?.a?.at(-1)?.[0] ?? null;
  const tv = profiles.filter((p) => p.facts.tradeUsdM).map((p) => ({ id: p.iso3, v: p.facts.tradeUsdM! })); const iv = profiles.filter((p) => p.facts.invOutUsd && p.facts.invOutUsd > 0).map((p) => ({ id: p.iso3, v: p.facts.invOutUsd! }));
  const regs = [...new Set(profiles.map((p) => p.region))]; const sum = (xs: { v: number }[]) => xs.reduce((a, x) => a + x.v, 0) || 1;
  const regionShare = regs.map((r) => ({ region: r, trade: tv.filter((x) => profiles.find((p) => p.iso3 === x.id)?.region === r).reduce((a, x) => a + x.v, 0) / sum(tv), invest: iv.filter((x) => profiles.find((p) => p.iso3 === x.id)?.region === r).reduce((a, x) => a + x.v, 0) / sum(iv) }));
  const rolls: Roll[] = regs.map((r) => { const ps = profiles.filter((p) => p.region === r); const avg: Record<string, number> = {}; for (const k of Object.keys(ps[0].dims)) avg[k] = Math.round((ps.reduce((a, p) => a + p.dims[k as keyof typeof p.dims].s, 0) / ps.length) * 10) / 10; avg.composite = Math.round((ps.reduce((a, p) => a + p.composite, 0) / ps.length) * 100) / 100; return { region: r, n: ps.length, avg, withTier: ps.filter((p) => p.tier).length }; });
  const sources: Obj<string | null> = { trade: trade.built ?? null, investment: inv?.built ?? null, partnership: part.built ?? null, agreements: agr.built ?? null, aid: aid?.built ?? null, rivals: rivals?.built ?? null, governance: gov?.built ?? null };
  const v: ProfileSet = { builtAt: new Date().toISOString(), sources, profiles, portfolio: { tradeYear: last, trade: concentration(tv), invest: concentration(iv), regionShare, built: sources }, rolls };
  memo = { at: Date.now(), key, v }; return v;
}
export const profileOf = async (iso3: string) => (await getProfiles())?.profiles.find((p) => p.iso3 === iso3) ?? null;
