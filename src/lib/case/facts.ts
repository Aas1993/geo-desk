import type { Fact } from "../brief/facts";
import { strategyDossierFacts } from "../machiavelli/facts";
import { deepFacts } from "../deep/facts";
import type { Pub } from "../deep/research-core";
import type { Snapshot } from "../deep/snapshot";
import { POSITION_ISSUES } from "./core";
import { THRESHOLDS, POSTURE } from "./core";
import type { CaseData } from "./load";
import { techFact } from "../tech-server";

// The shared evidence pack for the Strategic Council: the strategy fact pack (dossier, foresight, graph, strategic profile, rivals, aid, corridors, UAE context), the Deep desk's numeric facts (finance, exposure, screen, research cards)
// and the Case File's own computed layer (lenses, value pillars, posture rule, instruments, neighbours, ten-year trends). One pack, built before any seat speaks (the specification's stage 2), with ids that run on from the strategy pack.
const f1 = (v: number | null | undefined, d = 1) => (v == null || !isFinite(v) ? "n/a" : v.toFixed(d));
export async function caseFacts(iso3: string, c: CaseData, snap: Snapshot | null, pubs: Pub[]): Promise<{ name: string; facts: Fact[]; gaps: string[] } | null> {
  const base = await strategyDossierFacts(iso3); if (!base) return null; const facts = [...base.facts]; const add = (kind: string, text: string, src: string, url?: string) => facts.push({ id: `F${facts.length + 1}`, kind, text, src, url });
  if (snap) { const d = deepFacts(snap, pubs, null, 20); for (const x of d.facts) if (["financial", "exposure", "screen", "investment", "research", "baseline"].includes(x.kind)) add(x.kind, x.text, x.src, x.url); }
  const L = "Geo Desk Case File (computed from held datasets by stated rules)";
  add("lenses", `Six lenses on ${c.name} for the UAE (native scale; position = percentile among countries or position on the scale): ${c.lenses.map((l) => `${l.name.en} ${l.value} (position ${l.pos ?? "n/a"})`).join("; ")}. ${c.divergence.flag ? c.divergence.text.en : "The lenses broadly agree."}`, L);
  add("pillars", `Value of ${c.name} to the UAE by pillar (0 to 100, mean of the parts that exist; confidence in brackets): ${c.pillars.map((p) => `${p.name.en} ${p.score ?? "n/a"} (${p.conf}; ${p.parts.map((x) => `${x.k} ${f1(x.v, 0)}`).join(", ") || "no data"})`).join("; ")}.`, L);
  if (c.posture.posture) add("posture", `Posture rule (proposed thresholds, awaiting owner approval; deepen needs value ${THRESHOLDS.deepenValue}+, ability ${THRESHOLDS.deepenAbility}+, risk ${THRESHOLDS.deepenRisk} or less): value ${c.posture.value}, UAE ability to act ${c.posture.ability}, risk ${c.posture.risk} give "${POSTURE[c.posture.posture].name.en}" (${c.posture.stable ? "stable under a plus or minus 10 point change" : `not stable: alternatives ${c.posture.alternatives.map((a) => POSTURE[a].name.en).join(", ")}`}). This is a rule on three readings, not a verdict.`, L);
  add("position", `Position toward UAE foreign policy, measured: UN General Assembly agreement with the UAE ${f1(c.un.uae, 2)} (with the United States ${f1(c.un.usa, 2)}, China ${f1(c.un.chn, 2)}, Russia ${f1(c.un.rus, 2)}); ${c.measured.filter((m) => m.k !== "un").map((m) => `${m.name.en} ${m.display}`).join("; ")}. Issue-by-issue stances are NOT in the datasets: the seats must state them from dated public statements or say "not stated": ${POSITION_ISSUES.map((x) => x.en).join("; ")}.`, L);
  add("instruments", `UAE footprint and headroom by instrument in ${c.name} (0 to 5 where measured): ${c.instruments.map((i) => `${i.name.en} ${i.footprint == null ? "not measured" : `footprint ${i.footprint}, headroom ${i.headroom}`} (${i.kind})`).join("; ")}.`, L);
  add("power", `Strategic profile of ${c.name} (0 to 5, rule-based): ${c.power.map((p) => `${p.en} ${p.v}`).join("; ")}; radar axes: ${c.axes.map((p) => `${p.en} ${p.v}`).join("; ")}.${c.leverage ? ` Leverage reading: theirs ${c.leverage.theirs}, the UAE's ${c.leverage.ours}, ${c.leverage.quadrant}.` : ""}`, L);
  if (c.leaders) add("decision-makers", `Decision-makers on file (Wikidata): ${c.leaders.head ? `head of state ${c.leaders.head.name}, in office since ${c.leaders.head.start ?? "n/a"} (${c.leaders.head.tenure ?? "n/a"} years), age ${c.leaders.head.age ?? "n/a"}` : "head of state n/a"}${c.leaders.gov ? `; head of government ${c.leaders.gov.name}, since ${c.leaders.gov.start ?? "n/a"}` : ""}.`, "Wikidata (CC0)");
  const nr = (r: CaseData["neighbours"]["ring1"]) => r.map((n) => `${n.name} (UAE partnership ${n.part ?? "n/a"}${n.rank ? `, #${n.rank}` : ""}, tier ${n.tier ?? "none"}, leverage ${n.lev ?? "n/a"})`).join("; ");
  add("neighbours", `Neighbours of ${c.name}. Ring 1 (borders): ${nr(c.neighbours.ring1) || "none"}. Ring 2 (strategic): ${nr(c.neighbours.ring2) || "none"}. UAE partnership index, strategic tier and leverage reading from Geo Desk datasets.`, L);
  add("rivals", `Rival powers in ${c.name}'s merchandise trade (IMF mirror data, approximate): ${c.rivals.map((r) => `${r.iso} ${r.share}%`).join(", ")}${c.uaeRank ? `; the UAE is #${c.uaeRank.rank} of ${c.uaeRank.of} with ${c.uaeRank.share}%` : ""}.`, "IMF direction of trade (mirror)");
  const held = c.spine.filter((s) => s.has && s.spine.latest).map((s) => `${s.met.name} ${s.spine.latest!.v} (${s.spine.latest!.y})${s.spine.change5 != null ? `, ${s.spine.change5 >= 0 ? "+" : ""}${s.spine.change5.toFixed(1)} over 5 years` : ""}${s.region != null ? `, region median ${s.region.toFixed(1)}` : ""}${s.uae != null ? `, UAE ${s.uae.toFixed(1)}` : ""}${s.spine.z != null && Math.abs(s.spine.z) >= 1.5 ? `, unusual (z ${s.spine.z.toFixed(1)})` : ""}`);
  for (let i = 0; i < held.length; i += 10) add("trends", `Ten-year trend spine for ${c.name} (${i / 10 + 1}): ${held.slice(i, i + 10).join("; ")}.`, "IMF WEO, World Bank WDI and WGI, IMF IMTS and direct-investment positions (Geo Desk trend spine)");
  const tf = await techFact(iso3, c.name); if (tf) add(tf.kind, tf.text, tf.src);
  const missing = c.spine.filter((s) => !s.has).map((s) => s.met.name); if (missing.length) add("trend-gaps", `Trend metrics with no data for ${c.name} (not zero): ${missing.join("; ")}.`, L);
  return { name: base.name, facts, gaps: [...base.gaps, ...(snap?.gaps ?? []), "Issue-by-issue stances toward UAE policy, rival investment and defence ties, education and cultural ties and public perception are not in the datasets: say so rather than infer them."] };
}
