import type { Profile } from "./profile-core";
// The indicators the datasets can read for a country, as a short reading with its source. Everything else stays "not established" until a country-specific baseline and an approved target exist: the module never fills a gap with a plausible number.
const bn = (v: number | null) => (v == null ? "n/a" : v >= 1e9 ? `US$${(v / 1e9).toFixed(1)}bn` : `US$${Math.round(v / 1e6)}m`);
export type Live = { reading: string; source: string; proxy?: boolean };
export function liveIndicators(p: Profile): Record<string, Live> {
  const f = p.facts; const out: Record<string, Live> = {};
  if (f.tradeUsdM) out.MI04 = { reading: `UAE goods trade ${bn(f.tradeUsdM * 1e6)} in ${f.tradeYear}${f.tradeCagr != null ? `, ${(f.tradeCagr * 100).toFixed(1)}% a year over three years` : ""}; diversification not computed`, source: "IMF IMTS, UAE-reported, includes re-exports" };
  if (f.invOutUsd) out.MI05 = { reading: `UAE outward investment position ${bn(f.invOutUsd)} (mirror data) against ${f.deals365} deal headline${f.deals365 === 1 ? "" : "s"} in 12 months (announcements, not completed transactions)`, source: "IMF direct-investment positions; WAM headlines classified by Geo Desk" };
  if (f.tone && (f.tone.temp != null || f.tone.media != null)) out.MI11 = { reading: `Event tone ${f.tone.temp ?? "n/a"}, media tone ${f.tone.media ?? "n/a"} (machine-coded, aggregate)`, source: "GDELT", proxy: true };
  if (f.debtPct != null) out.MI14 = { reading: `Public debt ${Math.round(f.debtPct)}% of GDP; capacity-to-absorb score ${p.axes.capacity.s}/5`, source: "IMF World Economic Outlook; World Bank WGI", proxy: true };
  if (f.gov) out.MI16 = { reading: `Control of corruption ${Math.round(f.gov.cc)}/100, rule of law ${Math.round(f.gov.rl)}/100`, source: "World Bank WGI (a proxy for institutional transparency, not audit completion)", proxy: true };
  out.MI02 = { reading: `Minister-level engagement and agreements at the ${p.dims.dur.s}/5 durability reading; continuity through a leadership change is not established`, source: "Partnership index inputs", proxy: true };
  out.MI03 = { reading: `Agreements are signed, implementation is not established: ${p.dims.dur.ev.split("Agreements")[1]?.split(",")[0]?.trim() ?? "listed"}`, source: "MOFA agreement list", proxy: true };
  out.MI23 = { reading: p.dims.hard.ev, source: "MOFA agreement list, Wikidata" };
  out.MI13 = { reading: `Share of UAE goods trade ${p.facts.tradeUsdM ? "see the portfolio panel in Global Position" : "none"}`, source: "IMF IMTS" };
  return out;
}
