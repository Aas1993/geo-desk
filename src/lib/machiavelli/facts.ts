import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Fact } from "../brief/facts";
import { foresightDossierFacts, type Tile } from "../dossier/facts";
import { scopeFacts } from "../falcon/scope-facts";
import { SCOPE_BY } from "../falcon/scopes";
import { CORRIDORS, DIMS, RADAR_AXES, TIERS, tx } from "./content";
import { getProfiles, profileOf } from "./profile";
import { WEIGHTS, type Profile } from "./profile-core";

// Facts for the strategy products: the shared foresight facts (datasets, graph) plus the module's own evidence (the strategic profile with its rules, the rivals' trade shares, humanitarian funding, corridor membership) and the reference checks already made, so the model starts from the app's numbers and from what was verified rather than re-deriving or contradicting them.
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
export const UAE_CONTEXT = "UAE context checked on 25 October 2026 from press reports (not primary records): the UAE left OPEC and OPEC+ on 1 May 2026 (announced 28 April), planning capacity of 5 million barrels a day by 2027. 38 CEPAs signed by August 2026 (37 concluded and 18 in force at July, about 20 under negotiation); the South Korea CEPA entered into force on 1 May and the Ukraine CEPA on 1 July 2026; Canada's negotiations concluded in July 2026. Non-oil trade with CEPA partners was AED304.3bn in H1 2026 of AED1.937 trillion in total, with China the largest partner. Brand Finance's 2026 soft-power index ranks the UAE 10th (2nd for generosity, 3rd for growth potential, 8th for diplomatic influence). The UAE was the third-largest humanitarian donor in 2025 (US$1.46bn, OCHA FTS). DP World's two Fujairah terminals were reported as an agreement in principle (about US$750m over 24 to 36 months) while Jebel Ali volumes were reported sharply down. Ras El-Hekma (US$35bn, February 2024) was US$24bn for development rights plus US$11bn converted from UAE deposits at Egypt's central bank.";
const dimLine = (p: Profile) => DIMS.map((d) => `${d.en} ${p.dims[d.id].s}/5 (${p.dims[d.id].ev})`).join(". ");
const axisLine = (p: Profile) => RADAR_AXES.map((a) => `${a.en} ${p.axes[a.id].s}/5 (${p.axes[a.id].ev})`).join(". ");
const weakest = (p: Profile) => RADAR_AXES.map((a) => ({ a, s: p.axes[a.id].s })).sort((x, y) => x.s - y.s)[0].a.en;
const profileText = (p: Profile) => `Strategic profile of ${p.name} (Geo Desk, dataset-derived scores 0 to 5 by stated rules, not predictions; a 5 on hard power or durability needs analyst evidence and is never derived; no control score exists). Scorecard dimensions: ${dimLine(p)}. Opportunity-radar axes (weights ${RADAR_AXES.map((a) => `${a.weight}%`).join(" / ")}): ${axisLine(p)}. Weighted composite ${p.composite}; weakest axis: ${weakest(p)}; rule-based tier hint: ${p.tier ? `${p.tier} ${tx(TIERS.find((t) => t.id === p.tier)!.name, "en")}` : "not ranked"}. Data-rule suggestions (legitimate instruments only): ${p.recs.join(" ")}`;
export async function strategyDossierFacts(iso3: string): Promise<{ name: string; nameAr: string | null; facts: Fact[]; gaps: string[]; tiles: Tile[] } | null> {
  const g = await foresightDossierFacts(iso3); if (!g) return null; const facts = [...g.facts]; const add = (kind: string, text: string, src: string) => facts.push({ id: `F${facts.length + 1}`, kind, text, src });
  const p = await profileOf(iso3); if (p) add("strategy-profile", profileText(p), "Geo Desk strategic profile (IMF, World Bank, MOFA, OCHA FTS and Geo Desk datasets; rules in the module)");
  const rv = await rd<{ year: number; countries: Record<string, { uae?: { share: number; rank: number }; of?: number; list?: { c: string; share: number }[] }> }>("rivals.json"); const r = rv?.countries[iso3];
  if (r?.list) add("rivals", `Share of ${g.name}'s merchandise trade in ${rv!.year} (IMF mirror data, approximate): ${r.list.slice(0, 7).map((x) => `${x.c} ${x.share}%`).join(", ")}; the UAE ranks ${r.uae?.rank ?? "n/a"} of ${r.of ?? 14} powers${r.uae ? ` at ${r.uae.share}%` : ""}.`, "IMF IMTS mirror data over World Bank trade totals");
  const aid = await rd<{ countries: Record<string, Record<string, number>> }>("uae-aid.json"); const ar = aid?.countries[iso3];
  if (ar) add("humanitarian", `UAE humanitarian funding reported to OCHA FTS for ${g.name}: ${Object.entries(ar).sort().map(([y, v]) => `${y} US$${(v / 1e6).toFixed(1)}m`).join(", ")} (humanitarian flows only: development finance, loans and unreported aid are not included; the latest year is partial).`, "UN OCHA Financial Tracking Service");
  const cor = CORRIDORS.filter((c) => c.members.some((m) => m.iso3 === iso3)); if (cor.length) add("corridor", `Corridor registry for ${g.name}: ${cor.map((c) => `${c.name} (${c.members.find((m) => m.iso3 === iso3)!.role}; status: ${c.status}; risk: ${c.risk})`).join("; ")}. Statuses are from the specification unless marked checked.`, "Geo Desk corridor registry");
  add("uae-context", UAE_CONTEXT, "Press reports checked 25 October 2026 (WAM, Khaleej Times, Gulf News, Brand Finance, Zawya)");
  return { ...g, facts, gaps: [...g.gaps, "Hard-power substance, leadership-transition survival and counterpart decision processes are not in the datasets: say so rather than infer them."] };
}
/** The same for a scope (world, region, sub-region, bloc or sector): the aggregated scope facts plus a roll-up of the member countries' strategic profiles. */
export async function strategyScopeFacts(id: string): Promise<{ name: string; nameAr: string | null; facts: Fact[]; gaps: string[]; tiles: Tile[] } | null> {
  const g = await scopeFacts(id); if (!g) return null; const sc = SCOPE_BY.get(id); const set = await getProfiles(); const facts = [...g.facts]; const add = (kind: string, text: string, src: string) => facts.push({ id: `F${facts.length + 1}`, kind, text, src });
  if (set && sc) {
    let members = set.profiles;
    if (sc.kind === "region") members = members.filter((p) => p.region === sc.key); else if (sc.kind === "subregion") members = members.filter((p) => p.subregion === sc.key);
    else if (sc.kind === "bloc") { const orgs = await rd<{ orgs: Record<string, string[]> }>("orgs.json"); const m = new Set(orgs?.orgs[sc.key] ?? []); members = members.filter((p) => m.has(p.iso3)); }
    if (members.length) {
      const top = [...members].sort((a, b) => b.composite - a.composite).slice(0, 8); const avg = (f: (p: Profile) => number) => Math.round((members.reduce((a, p) => a + f(p), 0) / members.length) * 10) / 10;
      add("strategy-profile", `Strategic profiles rolled up over ${members.length} countries in ${g.name} (dataset-derived 0 to 5 by stated rules; averages hide the spread): ${DIMS.map((d) => `${d.en} ${avg((p) => p.dims[d.id].s)}`).join("; ")}. Highest opportunity-radar composite (weights ${RADAR_AXES.map((a) => `${a.weight}%`).join(" / ")}): ${top.map((p) => `${p.name} ${p.composite}${p.tier ? ` ${p.tier}` : ""} (weakest axis ${weakest(p)})`).join("; ")}. Tier hints in the scope: ${TIERS.map((t) => `${t.id} ${members.filter((p) => p.tier === t.id).length}`).join(", ")}.`, "Geo Desk strategic profiles");
    }
    if (sc.kind === "global") add("portfolio", `Concentration of the UAE portfolio (MI13, mirror and UAE-reported data): goods trade ${set.portfolio.tradeYear ?? ""} Herfindahl index ${set.portfolio.trade.hhi} of 10,000 across ${set.portfolio.trade.n} partners, the largest partner ${set.portfolio.trade.top[0]?.id} at ${((set.portfolio.trade.top[0]?.share ?? 0) * 100).toFixed(1)}% and the top five ${(set.portfolio.trade.top5 * 100).toFixed(1)}%; outward investment position Herfindahl ${set.portfolio.invest.hhi}, largest ${set.portfolio.invest.top[0]?.id} at ${((set.portfolio.invest.top[0]?.share ?? 0) * 100).toFixed(1)}%. Weights used by the radar: ${JSON.stringify(WEIGHTS)}.`, "IMF IMTS and direct-investment positions, Geo Desk");
  }
  add("uae-context", UAE_CONTEXT, "Press reports checked 25 October 2026 (WAM, Khaleej Times, Gulf News, Brand Finance, Zawya)");
  return { ...g, facts };
}
