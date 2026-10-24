// The Falcon Eye knowledge graph: pure query functions over the graph file built by scripts/build-graph.mjs. They run on the server (facts for the AI products, the API) and in the browser (the explorer),
// so the same question gives the same answer in both. Every edge is typed, weighted 0 to 1, sourced and marked verified or inferred; a hypothetical edge is never stored.
export type Prov = "verified" | "inferred";
export type GNode = { id: string; t: string; n: string; ar?: string; r?: string; sr?: string; p?: number; x?: string };
export type GEdge = { a: string; b: string; r: string; p: Prov; w: number; s: number; v?: string; x?: string };
export type GraphFile = { built: string; note: string; sources: { id: string; name: string; url: string }[]; nodes: GNode[]; edges: GEdge[] };
export type Graph = { file: GraphFile; byId: Map<string, GNode>; adj: Map<string, GEdge[]>; deg: Map<string, number> };
export const REL_LABEL: Record<string, { en: string; ar: string }> = {
  trades_with: { en: "Trades with the UAE", ar: "يتاجر مع الإمارات" }, invests_in: { en: "UAE invests in", ar: "الإمارات تستثمر في" }, has_agreements: { en: "Agreements with the UAE", ar: "اتفاقيات مع الإمارات" }, has_mission: { en: "UAE mission there", ar: "بعثة إماراتية هناك" }, flies_to: { en: "Direct flights", ar: "رحلات مباشرة" }, senior_engagement: { en: "Minister-level contact", ar: "اتصالات على مستوى الوزراء" },
  member_of: { en: "Member of", ar: "عضو في" }, uae_entity: { en: "UAE entity", ar: "كيان إماراتي" }, announced_deals_in: { en: "Announced deals in", ar: "صفقات معلنة في" }, operates_in: { en: "Operates in sector", ar: "يعمل في قطاع" }, trade_weight_in: { en: "Share of the country's trade", ar: "حصة من تجارة الدولة" }, borders: { en: "Borders", ar: "يحاذي" },
  listed_entries: { en: "Sanctions-list entries", ar: "مدخلات في قوائم العقوبات" }, holds_public_role: { en: "Holds public office in", ar: "يشغل منصبًا عامًا في" }, adjoins: { en: "Adjoins (from description)", ar: "يجاور (من الوصف)" }, route_exposure: { en: "UAE route exposure", ar: "انكشاف مسارات الإمارات" }, runs_through: { en: "Runs through", ar: "يمر عبر" }, coalition_overlap: { en: "Coalition overlap with the UAE", ar: "تداخل التحالفات مع الإمارات" },
};
export const TYPE_LABEL: Record<string, { en: string; ar: string; c: string }> = { country: { en: "Country", ar: "دولة", c: "#38bdf8" }, org: { en: "Organisation", ar: "منظمة", c: "#a78bfa" }, entity: { en: "UAE entity", ar: "كيان إماراتي", c: "#34d399" }, sector: { en: "Sector", ar: "قطاع", c: "#f59e0b" }, chokepoint: { en: "Chokepoint", ar: "نقطة اختناق", c: "#f87171" }, pipeline: { en: "Pipeline", ar: "خط أنابيب", c: "#fb923c" }, list: { en: "Sanctions list", ar: "قائمة عقوبات", c: "#94a3b8" }, person: { en: "Public office-holder", ar: "شاغل منصب عام", c: "#f472b6" } };

export function indexGraph(file: GraphFile): Graph {
  const byId = new Map(file.nodes.map((n) => [n.id, n])); const adj = new Map<string, GEdge[]>(); const deg = new Map<string, number>();
  for (const e of file.edges) { (adj.get(e.a) ?? adj.set(e.a, []).get(e.a)!).push(e); (adj.get(e.b) ?? adj.set(e.b, []).get(e.b)!).push(e); deg.set(e.a, (deg.get(e.a) ?? 0) + 1); deg.set(e.b, (deg.get(e.b) ?? 0) + 1); }
  return { file, byId, adj, deg };
}
export const other = (e: GEdge, id: string) => (e.a === id ? e.b : e.a);
export type NeighborOpts = { rels?: string[]; prov?: Prov; minW?: number; limit?: number };
export function neighbors(g: Graph, id: string, o: NeighborOpts = {}): { node: GNode; edge: GEdge }[] {
  return (g.adj.get(id) ?? []).filter((e) => (!o.rels || o.rels.includes(e.r)) && (!o.prov || e.p === o.prov) && e.w >= (o.minW ?? 0)).sort((a, b) => b.w - a.w).slice(0, o.limit ?? 60).map((edge) => ({ node: g.byId.get(other(edge, id))!, edge })).filter((x) => x.node);
}
export type GPath = { nodes: GNode[]; edges: GEdge[]; score: number; verified: number };
/** Paths of up to `maxHops` edges from one node to another (the UAE by default), best first. A path's score is the geometric mean of its edge weights, discounted 15% per extra hop; near-universal hubs (a node with more than 250 edges) are never an intermediate step, because "both belong to the UN" says nothing. */
export function paths(g: Graph, from: string, to = "C:ARE", o: { maxHops?: number; k?: number; prov?: Prov; direct?: boolean } = {}): GPath[] {
  const maxHops = Math.min(4, o.maxHops ?? 3); const out: GPath[] = []; const hub = (id: string) => (g.deg.get(id) ?? 0) > 250 && id !== from && id !== to;
  const dfs = (cur: string, nodes: string[], edges: GEdge[]) => {
    if (cur === to) { if (edges.length && (o.direct !== false || edges.length > 1)) { const ws = edges.map((e) => e.w); const gm = Math.exp(ws.reduce((a, w) => a + Math.log(w), 0) / ws.length); out.push({ nodes: nodes.map((x) => g.byId.get(x)!), edges: [...edges], score: gm * Math.pow(0.85, edges.length - 1), verified: edges.filter((e) => e.p === "verified").length }); } return; }
    if (edges.length >= maxHops) return;
    for (const e of (g.adj.get(cur) ?? [])) { const nx = other(e, cur); if (nodes.includes(nx) || (o.prov && e.p !== o.prov) || (nx !== to && hub(nx)) || e.w < 0.12) continue; dfs(nx, [...nodes, nx], [...edges, e]); }
  };
  if (!g.byId.has(from) || !g.byId.has(to)) return []; dfs(from, [from], []);
  const seen = new Set<string>(); return out.sort((a, b) => b.score - a.score).filter((p) => { const k = p.nodes.map((n) => n.id).join(">"); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, o.k ?? 8);
}
export const METRICS: Record<string, { en: string; ar: string; rels: string[] }> = { trade: { en: "Trade with the UAE", ar: "التجارة مع الإمارات", rels: ["trades_with"] }, invest: { en: "UAE investment stock", ar: "رصيد الاستثمار الإماراتي", rels: ["invests_in"] }, deals: { en: "UAE deal announcements", ar: "إعلانات الصفقات الإماراتية", rels: ["announced_deals_in"] }, agreements: { en: "Agreements", ar: "الاتفاقيات", rels: ["has_agreements"] }, engagement: { en: "Minister-level contact", ar: "الاتصالات الوزارية", rels: ["senior_engagement"] }, coalition: { en: "Coalition overlap", ar: "تداخل التحالفات", rels: ["coalition_overlap"] }, connectivity: { en: "Flights and missions", ar: "الرحلات والبعثات", rels: ["flies_to", "has_mission"] } };
export type RankRow = { node: GNode; score: number; parts: { r: string; w: number; v?: string }[]; entities: string[] };
/** Countries ranked by their ties to the UAE on one measure, optionally within a region, sub-region or bloc and, for deals, within one sector. This answers questions such as which African countries show the most UAE logistics activity. */
export function rankCountries(g: Graph, o: { metric?: string; region?: string; subregion?: string; org?: string; sector?: string; limit?: number }): RankRow[] {
  const m = METRICS[o.metric ?? "deals"] ?? METRICS.deals; const inOrg = o.org ? new Set((g.adj.get(`O:${o.org}`) ?? []).map((e) => other(e, `O:${o.org}`))) : null; const rows: RankRow[] = [];
  for (const n of g.file.nodes) {
    if (n.t !== "country" || n.id === "C:ARE") continue; if (o.region && n.r !== o.region) continue; if (o.subregion && n.sr !== o.subregion) continue; if (inOrg && !inOrg.has(n.id)) continue;
    const es = (g.adj.get(n.id) ?? []).filter((e) => (m.rels.includes(e.r) && (e.a === "C:ARE" || e.b === "C:ARE")) || (m.rels.includes(e.r) && e.r === "announced_deals_in")).filter((e) => !o.sector || e.x === o.sector);
    if (!es.length) continue; const ents = es.filter((e) => e.r === "announced_deals_in").map((e) => g.byId.get(other(e, n.id))?.n ?? ""); rows.push({ node: n, score: Math.round(es.reduce((a, e) => a + e.w, 0) * 100) / 100, parts: es.map((e) => ({ r: e.r, w: e.w, v: e.v })), entities: ents });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, o.limit ?? 15);
}
export function search(g: Graph, q: string, limit = 12): GNode[] { const n = q.trim().toLowerCase(); if (!n) return []; return g.file.nodes.filter((x) => x.n.toLowerCase().includes(n) || (x.ar ?? "").includes(q.trim()) || x.id.toLowerCase() === n || x.id.toLowerCase().endsWith(`:${n}`)).sort((a, b) => (b.t === "country" ? 1 : 0) - (a.t === "country" ? 1 : 0) || a.n.length - b.n.length).slice(0, limit); }
export function stats(g: Graph) { const t: Record<string, number> = {}, r: Record<string, number> = {}, p: Record<string, number> = {}; for (const n of g.file.nodes) t[n.t] = (t[n.t] ?? 0) + 1; for (const e of g.file.edges) { r[e.r] = (r[e.r] ?? 0) + 1; p[e.p] = (p[e.p] ?? 0) + 1; } return { built: g.file.built, nodes: g.file.nodes.length, edges: g.file.edges.length, byType: t, byRel: r, byProv: p }; }
/** A short text of what the graph says about a country's links to the UAE, for the facts the AI products read. Verified links first, inferred ones labelled. */
export function graphText(g: Graph, iso3: string): string | null {
  const id = `C:${iso3}`; const n = g.byId.get(id); if (!n) return null; const es = g.adj.get(id) ?? []; const uae = es.filter((e) => other(e, id) === "C:ARE"); const parts: string[] = [];
  for (const e of uae.sort((a, b) => b.w - a.w)) if (e.v && e.r !== "coalition_overlap") parts.push(`${REL_LABEL[e.r]?.en ?? e.r}: ${e.v}`);
  const co = uae.find((e) => e.r === "coalition_overlap"); if (co?.v) parts.push(`(inferred) ${co.v}`);
  const orgs = es.filter((e) => e.r === "member_of" && e.w >= 0.4).map((e) => g.byId.get(other(e, id))?.n).filter(Boolean); if (orgs.length) parts.push(`Non-universal blocs: ${orgs.slice(0, 10).join(", ")}`);
  const pw = es.filter((e) => e.r === "trade_weight_in" && e.b === id).sort((a, b) => b.w - a.w).slice(0, 5).map((e) => `${g.byId.get(e.a)?.n} ${e.v?.split("%")[0]}%`); if (pw.length) parts.push(`Largest trading powers (share of its trade): ${pw.join(", ")}`);
  const ent = es.filter((e) => e.r === "announced_deals_in").sort((a, b) => b.w - a.w).slice(0, 5).map((e) => `${g.byId.get(e.a)?.n} (${e.v})`); if (ent.length) parts.push(`UAE entities announcing deals: ${ent.join("; ")}`);
  const nb = es.filter((e) => e.r === "borders").map((e) => g.byId.get(other(e, id))).filter(Boolean).map((x) => ({ x: x!, w: (g.adj.get(x!.id) ?? []).find((e) => other(e, x!.id) === "C:ARE" && e.r === "trades_with")?.w ?? 0 })).sort((a, b) => b.w - a.w).slice(0, 4).map((o) => o.x.n); if (nb.length) parts.push(`Neighbours with the strongest UAE trade (indirect channels): ${nb.join(", ")}`);
  const cp = es.filter((e) => e.r === "adjoins" || e.r === "runs_through").map((e) => `${g.byId.get(other(e, id))?.n} (inferred from its description)`); if (cp.length) parts.push(`Chokepoints and pipelines: ${cp.slice(0, 5).join("; ")}`);
  const ind = paths(g, id, "C:ARE", { maxHops: 3, k: 4, direct: false }).filter((p) => p.edges.length > 1).slice(0, 3).map((p) => p.nodes.map((x) => x.n).join(" > ") + ` (${p.verified}/${p.edges.length} links verified)`); if (ind.length) parts.push(`Indirect paths to the UAE: ${ind.join("; ")}`);
  return parts.length ? `Knowledge-graph links of ${n.n} (verified = read from a dataset; inferred = a stated rule): ${parts.join(". ")}.` : null;
}
