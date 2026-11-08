import { readFile } from "node:fs/promises";
import path from "node:path";

// Everything the app holds about UAE investment in one country, from the data files the builders write: the IMF position series, every UAE company and fund deal found in WAM headlines, the treaties that protect investment, and the risk context.
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
type Pos = { usd: number; year: number; rank?: number; series?: [number, number][] };
export type InvDeal = { u: string; d: string; t: string; by: string[]; sector: string | null };
export type Flag = { id: string; tone: "warn" | "info" | "ok"; v?: string };
export type InvestPayload = {
  iso3: string; name: string; asOf: string;
  stock: { outward: Pos | null; inward: Pos | null; pctOfTheirGdp: number | null; shareOfUaeAbroad: number | null };
  deals: { items: InvDeal[]; total: number; last90: number; last365: number; byInvestor: { name: string; n: number; last: string }[]; bySector: [string, number][]; byQuarter: [string, number][] };
  protection: { cepa: { status: string; signed: string | null; inForce: string | null } | null; investment: number; tax: number; air: number; total: number; committees: number | null; titles: { t: string; type: string; year: number | null }[] };
  risk: { regulatoryQuality: number | null; ruleOfLaw: number | null; corruption: number | null; stability: number | null; debt: number | null; inflation: number | null; growth: number | null; currentAccount: number | null; sanctions: number | null };
  flags: Flag[]; ids: string[];
};
const ADFD = /^Abu Dhabi Fund for Development$/i; const quarter = (d: string) => `${d.slice(0, 4)}-Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}`;

export async function investFor(iso3: string): Promise<InvestPayload | null> {
  const [cs, inv, deals, ag, outlook, gov, sanc] = await Promise.all([
    rd<{ iso3: string; name: string }[]>("countries.json"), rd<{ world: { usd: number }; countries: Record<string, { outward?: Pos; inward?: Pos }> }>("investment.json"), rd<{ items: (InvDeal & { c: string[] })[] }>("deals.json"),
    rd<{ countries: Record<string, { mofa: { t: string; type: string; year?: number | null }[]; moft: { t: string; type: string; year?: number | null }[]; cepa: { status: string; signed: string | null; inForce: string | null } | null; committees: { meetings: number | null }[] }> }>("agreements.json"),
    rd<{ countries: Record<string, { gdp?: Record<number, number>; growth?: Record<number, number>; debt?: Record<number, number>; inflation?: Record<number, number>; ca?: Record<number, number> }> }>("outlook.json"),
    rd<{ countries: Record<string, Record<string, number>> }>("governance.json"), rd<{ countries: Record<string, { ofac: number; un: number }> }>("sanctions.json"),
  ]);
  const c = cs?.find((x) => x.iso3 === iso3); if (!c || iso3 === "ARE") return null; const now = new Date(); const yr = now.getFullYear(); const cut = (d: number) => new Date(now.getTime() - d * 86400e3).toISOString().slice(0, 10);
  const ip = inv?.countries[iso3]; const outward = ip?.outward ?? null, inward = ip?.inward ?? null; const o = outlook?.countries[iso3]; const gdp = o?.gdp?.[yr - 1] ?? o?.gdp?.[yr - 2] ?? null;
  const items = (deals?.items ?? []).filter((x) => x.c.includes(iso3)).sort((a, b) => (a.d < b.d ? 1 : -1)).map(({ u, d, t, by, sector }) => ({ u, d, t, by: by.map((b) => b.replace(ADFD, "ADFD")), sector }));
  const inv_: Record<string, { n: number; last: string }> = {}; for (const x of items) for (const b of x.by) { const e = (inv_[b] ??= { n: 0, last: "" }); e.n++; if (x.d > e.last) e.last = x.d; }
  const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}));
  const byInvestor = Object.entries(inv_).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1));
  const bySector = tally(items.map((x) => x.sector ?? "other")).sort((a, b) => b[1] - a[1]) as [string, number][]; const byQuarter = tally(items.map((x) => quarter(x.d))).sort((a, b) => (a[0] < b[0] ? -1 : 1)) as [string, number][];
  const a = ag?.countries[iso3]; const all = a ? [...a.mofa, ...a.moft] : []; const cnt = (k: string) => all.filter((x) => x.type === k).length;
  const g = gov?.countries[iso3]; const sn = sanc?.countries[iso3];
  const protection: InvestPayload["protection"] = { cepa: a?.cepa ?? null, investment: cnt("investment"), tax: cnt("tax"), air: cnt("air"), total: all.length, committees: a?.committees[0]?.meetings ?? null, titles: all.filter((x) => x.type === "investment" || x.type === "tax").slice(0, 12).map((x) => ({ t: x.t, type: x.type, year: x.year ?? null })) };
  const risk: InvestPayload["risk"] = { regulatoryQuality: g?.rq ?? null, ruleOfLaw: g?.rl ?? null, corruption: g?.cc ?? null, stability: g?.pv ?? null, debt: o?.debt?.[yr] ?? null, inflation: o?.inflation?.[yr] ?? null, growth: o?.growth?.[yr] ?? null, currentAccount: o?.ca?.[yr] ?? null, sanctions: sn ? sn.ofac + sn.un : null };
  const last90 = items.filter((x) => x.d >= cut(90)).length, last365 = items.filter((x) => x.d >= cut(365)).length;
  const flags: Flag[] = [];
  if (!outward) flags.push({ id: "no_stock", tone: "warn" });
  if (items.length >= 4 && byInvestor[0] && byInvestor[0].n / items.length >= 0.5) flags.push({ id: "concentrated", tone: "info", v: `${byInvestor[0].name} ${Math.round((byInvestor[0].n / items.length) * 100)}%` });
  if (items.length >= 3 && last90 === 0) flags.push({ id: "quiet", tone: "info" }); if (items.length === 0) flags.push({ id: "no_deals", tone: "info" });
  if (protection.investment === 0) flags.push({ id: "no_bit", tone: "warn" }); else flags.push({ id: "has_bit", tone: "ok", v: String(protection.investment) });
  if (protection.tax === 0) flags.push({ id: "no_tax", tone: "info" });
  if (!protection.cepa) flags.push({ id: "no_cepa", tone: "info" }); else flags.push({ id: "cepa", tone: protection.cepa.status === "in-force" ? "ok" : "info", v: protection.cepa.status });
  if (risk.debt != null && risk.debt > 80) flags.push({ id: "debt", tone: "warn", v: `${risk.debt.toFixed(0)}%` }); if (risk.inflation != null && risk.inflation > 15) flags.push({ id: "inflation", tone: "warn", v: `${risk.inflation.toFixed(0)}%` });
  if (risk.regulatoryQuality != null && risk.regulatoryQuality < 40) flags.push({ id: "weak_rq", tone: "warn", v: risk.regulatoryQuality.toFixed(0) });
  if (risk.sanctions != null && risk.sanctions > 20) flags.push({ id: "sanctions", tone: "info", v: String(risk.sanctions) });
  return { iso3, name: c.name, asOf: now.toISOString().slice(0, 10), stock: { outward, inward, pctOfTheirGdp: outward?.usd && gdp ? (outward.usd / (gdp * 1e6)) * 100 : null, shareOfUaeAbroad: outward?.usd && inv?.world.usd ? (outward.usd / inv.world.usd) * 100 : null }, deals: { items, total: items.length, last90, last365, byInvestor, bySector, byQuarter }, protection, risk, flags, ids: items.map((x) => x.u) };
}
