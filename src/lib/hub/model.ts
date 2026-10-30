import type { Tone, Clip } from "../clips";
import type { CaseData } from "../case/load";
import type { Visit } from "../diplomacy-client";
import type { AgCountry } from "../agreements-client";
import type { FlightCountry } from "../flights-client";
import type { Alert } from "../alerts";

// THE COUNTRY UPDATES HUB, pure part: everything the hub lists is turned into one item type, so the board can filter, mark, clip and summarise it alike. Items are what the sources say, as found: nothing is invented, nothing is scored. The tone marks are keyword rules shown with the words that triggered them. Items with a date can be placed in a time window; items the sources hold only as a year or as a current state ("on file") are listed apart and never pretend to a date.
export type Angle = "political" | "security" | "economy" | "energy" | "tech" | "logistics" | "society" | "uae" | "diplomacy" | "deals" | "alerts" | "macro" | "onfile";
/** The seven angles of the news route, in the order the platform reads them. */
export const NEWS_ANGLES = ["political", "security", "economy", "energy", "tech", "logistics", "society"] as const;
export const ANGLES: Angle[] = [...NEWS_ANGLES, "uae", "diplomacy", "deals", "alerts", "macro", "onfile"];
export const ANGLE_LABEL: Record<Angle, { en: string; ar: string }> = {
  political: { en: "Political", ar: "سياسي" }, security: { en: "Security", ar: "أمني" }, economy: { en: "Economy and trade", ar: "اقتصاد وتجارة" }, energy: { en: "Energy", ar: "طاقة" }, tech: { en: "Technology and space", ar: "تقنية وفضاء" }, logistics: { en: "Logistics and corridors", ar: "لوجستيات وممرات" }, society: { en: "Society and soft power", ar: "مجتمع وقوة ناعمة" },
  uae: { en: "UAE-linked", ar: "مرتبط بالإمارات" }, diplomacy: { en: "Visits and engagements", ar: "زيارات وتفاعلات" }, deals: { en: "UAE deals", ar: "صفقات إماراتية" }, alerts: { en: "Alerts", ar: "تنبيهات" }, macro: { en: "Macro movers", ar: "تحركات الاقتصاد الكلي" }, onfile: { en: "Agreements and flights (on file)", ar: "اتفاقيات ورحلات (محفوظة)" },
};
export const ANGLE_COLOR: Record<Angle, string> = { political: "#6d4bd8", security: "#d92d4a", economy: "#0a7ea4", energy: "#b8741a", tech: "#2563eb", logistics: "#0e9f6e", society: "#db2777", uae: "#0b2540", diplomacy: "#6d4bd8", deals: "#0a7ea4", alerts: "#d92d4a", macro: "#65a30d", onfile: "#5b6572" };
export type Kind = "news" | "visit" | "deal" | "alert" | "macro" | "agreement" | "flight";
export type HubItem = { id: string; kind: Kind; angles: Angle[]; title: string; source: string; url?: string; ts: number | null; date: string; asOf?: string; tone: Tone; why: string[]; level?: 1 | 2 | 3; meta?: string };
export const isDated = (x: HubItem): x is HubItem & { ts: number } => x.ts != null;
export type NewsRow = { outlet: string; title: string; link: string; ts: number };
const DAY = 86_400_000;
const isoDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const normTitle = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 90);
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const safeUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : undefined);

// ---- tone marks: keyword rules, shown with the matched words; "neutral" is the default and is also what mixed signals give
const RISK_RE = /\b(attacks?|killed|kills?|clash(?:es)?|conflict|sanctions?|crisis|default|inflation|protests?|coup|strikes?|bans?|tariffs?|war|collapse|shortage|deficit|downgrades?|cyber|ransomware|floods?|earthquake|outbreak|arrests?|disputes?|tensions?|threats?|blockade|debt|unrest|missile|drone|hostages?|ceasefire|famine|suspends?|suspended|cancel(?:s|led)?)\b/gi;
const OPP_RE = /\b(agreements?|deals?|invest(?:s|ment|ments)?|partnerships?|cooperation|launch(?:es|ed)?|signs?|signed|boost|growth|expands?|expansion|upgrades?|record|surge|opens?|inaugurat\w*|mou|cepa|talks|summit|funding|pledges?|grants?|breakthrough|recover(?:y|s)?)\b/gi;
const words = (re: RegExp, s: string) => [...new Set([...s.matchAll(re)].map((m) => m[0].toLowerCase()))].slice(0, 4);
/** A keyword mark for a headline: risk words only, opportunity words only, or neutral (none, or both). The `why` lists the words; this is a mark, not an assessment. */
export function toneOf(title: string): { tone: Tone; why: string[] } {
  const r = words(RISK_RE, title); const o = words(OPP_RE, title);
  if (r.length && !o.length) return { tone: "risk", why: r };
  if (o.length && !r.length) return { tone: "opportunity", why: o };
  return { tone: "neutral", why: r.length && o.length ? [...r, ...o] : [] };
}

// ---- builders
/** Merges the news reads (one per angle, the plain read and the UAE-linked read) into items: one item per headline, carrying every angle that returned it. */
export function newsItems(reads: { angle: Angle; items: NewsRow[] }[]): HubItem[] {
  const by = new Map<string, HubItem>();
  for (const r of reads) for (const n of r.items) {
    if (!n.title || !(n.ts > 0)) continue; const k = normTitle(n.title); const ex = by.get(k);
    if (ex) { if (!ex.angles.includes(r.angle)) ex.angles.push(r.angle); continue; }
    const m = toneOf(n.title);
    by.set(k, { id: `news:${hash(k)}`, kind: "news", angles: [r.angle], title: n.title, source: n.outlet || "news", url: safeUrl(n.link), ts: n.ts, date: isoDay(n.ts), tone: m.tone, why: m.why });
  }
  return [...by.values()];
}
const DIR = { in: { en: "incoming", ar: "وارد" }, out: { en: "outgoing", ar: "صادر" } } as const;
export function visitItems(visits: Visit[], iso: string, ar = false): HubItem[] {
  return visits.filter((v) => v.c.includes(iso)).map((v) => { const ts = Date.parse(`${v.d}T12:00:00Z`); const m = toneOf(v.t); return { id: `visit:${v.u}`, kind: "visit" as const, angles: ["diplomacy", "political"] as Angle[], title: v.t, source: "WAM", url: `https://www.wam.ae/en/article/${v.u}`, ts, date: v.d, tone: m.tone, why: m.why, level: v.l, meta: `${v.k}${v.dir ? ` · ${ar ? DIR[v.dir].ar : DIR[v.dir].en}` : ""}` }; }).filter((x) => Number.isFinite(x.ts));
}
export function dealItems(deals: CaseData["deals"]): HubItem[] {
  return (deals ?? []).map((x) => { const ts = Date.parse(`${x.d}T12:00:00Z`); const m = toneOf(x.t); return { id: `deal:${hash(x.u || x.t)}`, kind: "deal" as const, angles: ["deals", "economy"] as Angle[], title: x.t, source: "WAM", url: safeUrl(x.u) ?? (x.u ? `https://www.wam.ae/en/article/${x.u}` : undefined), ts, date: x.d, tone: m.tone, why: m.why, meta: [x.sector, x.by.join(", ")].filter(Boolean).join(" · ") || undefined }; }).filter((x) => Number.isFinite(x.ts));
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Alerts that name the country in their title. The alert feed has no country field, so this is a title mention and is labelled so on the board. */
export function alertItems(alerts: Alert[], names: string[]): HubItem[] {
  const ns = names.map((n) => n.trim()).filter((n) => n.length >= 3); if (!ns.length) return [];
  const re = new RegExp(`(^|[^\\p{L}])(${ns.map(esc).join("|")})($|[^\\p{L}])`, "iu");
  return alerts.filter((a) => re.test(a.title)).map((a) => { const m = toneOf(a.title); return { id: `alert:${hash(a.id)}`, kind: "alert" as const, angles: (a.security ? ["alerts", "security"] : ["alerts"]) as Angle[], title: a.title, source: a.src, url: safeUrl(a.url), ts: a.t, date: isoDay(a.t), tone: a.sev >= 2 && m.tone === "neutral" ? "risk" : m.tone, why: a.sev >= 2 && m.tone === "neutral" ? [`severity ${a.sev}`] : m.why, meta: `severity ${a.sev}` }; });
}
// which way is "better" for a metric: a movement is marked only for these; others stay neutral
const GOOD_UP: Record<string, boolean> = { "Real GDP growth": true, "Inflation, consumer prices": false, "Government gross debt, % of GDP": false, "Unemployment rate": false, "Reserves, months of imports": true, "Total reserves, US$": true, "Exchange rate per US$": false, "Non-performing loans": false, "Current account, % of GDP": true, "FDI net inflows, US$": true };
// metrics whose move is worth listing but whose direction is not a plain good or bad; steadily growing totals (population, nominal GDP, per-capita figures) are left out because they sit far from their own history by construction
const MOVERS_NEUTRAL = new Set(["Military spending, % of GDP", "Oil and gas rents, % of GDP", "Trade openness, % of GDP", "Remittances received, US$", "Total and balance", "UAE goods exports to the partner", "UAE goods imports from the partner", "UAE outward position in the partner", "Private credit, % of GDP"]);
const fmtN = (v: number) => (Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}bn` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}m` : Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1));
/** Macro movers: spine metrics whose latest reading is far from the country's own history (|z| of 1.5 or more). Annual data, so these are "on file", never dated to a day. */
export function macroItems(d: CaseData, ar = false, minZ = 1.5): HubItem[] {
  const out: HubItem[] = [];
  for (const s of d.spine ?? []) {
    const l = s.spine.latest; const z = s.spine.z; if (!s.has || !l || z == null || Math.abs(z) < minZ || !(s.met.name in GOOD_UP || MOVERS_NEUTRAL.has(s.met.name))) continue;
    const good = GOOD_UP[s.met.name]; const up = z > 0; const tone: Tone = good == null ? "neutral" : up === good ? "opportunity" : "risk";
    const ch = s.spine.change5; const dir = up ? (ar ? "أعلى من" : "above") : (ar ? "أدنى من" : "below");
    const title = ar ? `${s.met.name}: ${fmtN(l.v)} (${l.y}) ${dir} مساره التاريخي بمقدار ${Math.abs(z).toFixed(1)} انحرافًا معياريًا${ch != null ? `؛ ${ch >= 0 ? "+" : ""}${fmtN(ch)} خلال 5 سنوات` : ""}` : `${s.met.name}: ${fmtN(l.v)} (${l.y}), ${Math.abs(z).toFixed(1)} s.d. ${dir} its own history${ch != null ? `; ${ch >= 0 ? "+" : ""}${fmtN(ch)} over 5 years` : ""}`;
    out.push({ id: `macro:${s.met.name}:${l.y}`, kind: "macro", angles: ["macro", "economy"], title, source: s.met.src || "held data", ts: null, date: "", asOf: String(l.y), tone, why: good == null ? [] : [ar ? (up ? "ارتفاع" : "انخفاض") : up ? "rise" : "fall"], meta: Math.abs(z).toFixed(1) });
  }
  return out.sort((a, b) => +b.meta! - +a.meta!).slice(0, 10);
}
const AG_ANGLE: Record<string, Angle> = { trade: "economy", investment: "economy", finance: "economy", tax: "economy", cepa: "economy", fta: "economy", energy: "energy", tech: "tech", air: "logistics", transport: "logistics", security: "security", legal: "political", political: "political", visa: "society", labour: "society", education: "society", health: "society", environment: "society" };
/** Agreements the held files date by year (this year and last) and flight routes whose state is a change (future or suspended). The files carry no day dates and no route history, so these are "on file" and a change is only marked when the item is new since the last visit. */
export function onFileItems(ag: AgCountry | null | undefined, fl: FlightCountry | null | undefined, year: number, ar = false): HubItem[] {
  const out: HubItem[] = [];
  for (const a of [...(ag?.mofa ?? []), ...(ag?.moft ?? [])]) {
    const y = a.year ? +a.year : NaN; if (!(y >= year - 1)) continue; const m = toneOf(a.t);
    out.push({ id: `agreement:${hash(a.t + String(a.year))}`, kind: "agreement", angles: ["onfile", AG_ANGLE[a.type] ?? "economy"], title: a.t, source: "UAE MOFA / MoFT", ts: null, date: "", asOf: String(y), tone: m.tone === "opportunity" ? m.tone : "neutral", why: m.tone === "opportunity" ? m.why : [], meta: a.kind === "mou" ? "MoU" : ar ? "اتفاقية" : "agreement" });
  }
  for (const x of fl?.destinations ?? []) {
    if (x.status !== "future" && x.status !== "suspended") continue;
    out.push({ id: `flight:${x.iata}:${x.status}`, kind: "flight", angles: ["onfile", "logistics"], title: ar ? `${x.name} (${x.iata}): ${x.status === "future" ? "مسار مستقبلي" : "مسار معلّق"} من ${x.from.join("، ")}` : `${x.name} (${x.iata}): ${x.status === "future" ? "route announced for the future" : "route suspended"} from ${x.from.join(", ")}`, source: "airline route data (held)", ts: null, date: "", tone: x.status === "future" ? "opportunity" : "risk", why: [x.status], meta: x.status });
  }
  return out;
}
/** Every item for one country from the loaded sources; a source that did not load contributes nothing (the board shows which loaded). */
export function buildItems(o: { news: { angle: Angle; items: NewsRow[] }[]; visits: Visit[]; d: CaseData | null; alerts: Alert[]; names: string[]; ag: AgCountry | null | undefined; fl: FlightCountry | null | undefined; iso: string; year: number; ar?: boolean }): HubItem[] {
  const all = [...newsItems(o.news), ...visitItems(o.visits, o.iso, o.ar), ...(o.d ? dealItems(o.d.deals) : []), ...alertItems(o.alerts, o.names), ...(o.d ? macroItems(o.d, o.ar) : []), ...onFileItems(o.ag, o.fl, o.year, o.ar)];
  const seen = new Set<string>(); return all.filter((x) => !seen.has(x.id) && seen.add(x.id)).sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
}

// ---- filtering and counting
export type Filter = { angles: Angle[]; days: 7 | 30 | 90; outlets: string[]; tone: Tone | "all"; q: string; onlyNew: boolean };
export const DEFAULT_FILTER: Filter = { angles: [], days: 30, outlets: [], tone: "all", q: "", onlyNew: false };
/** Applies the filter. Dated items must fall inside the window; on-file items are not subject to it (they have no date) but follow the other filters. */
export function filterItems(items: HubItem[], f: Filter, now: number, fresh?: Set<string>, skip: "angles" | null = null): HubItem[] {
  const q = f.q.trim().toLowerCase(); const lo = now - f.days * DAY;
  return items.filter((x) => (x.ts == null || (x.ts >= lo && x.ts <= now + DAY)) && (skip === "angles" || !f.angles.length || x.angles.some((a) => f.angles.includes(a))) && (!f.outlets.length || f.outlets.includes(x.source)) && (f.tone === "all" || x.tone === f.tone) && (!q || `${x.title} ${x.source} ${x.meta ?? ""}`.toLowerCase().includes(q)) && (!f.onlyNew || !!fresh?.has(x.id)));
}
/** How many items each angle would show under the other filters (so the chips say what a click would give). */
export function angleCounts(items: HubItem[], f: Filter, now: number): Record<Angle, number> {
  const base = filterItems(items, f, now, undefined, "angles"); const out = Object.fromEntries(ANGLES.map((a) => [a, 0])) as Record<Angle, number>;
  for (const x of base) for (const a of x.angles) out[a]++;
  return out;
}
export function outletCounts(items: HubItem[]): { name: string; n: number }[] {
  const m = new Map<string, number>(); for (const x of items) if (x.kind === "news" || x.kind === "alert" || x.kind === "visit" || x.kind === "deal") m.set(x.source, (m.get(x.source) ?? 0) + 1); // held datasets are not outlets
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
/** Dated items grouped by day, newest first; on-file items are returned separately. */
export function groupByDay(items: HubItem[]): { day: string; items: HubItem[] }[] {
  const g = new Map<string, HubItem[]>(); for (const x of items) if (x.ts != null) { const a = g.get(x.date) ?? []; a.push(x); g.set(x.date, a); }
  return [...g.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, xs]) => ({ day, items: xs }));
}
export const undated = (items: HubItem[]) => items.filter((x) => x.ts == null);

// ---- what changed since the last visit
export type Seen = { at: number; ids: string[] };
export const seenKey = (iso: string) => `gd-hub-seen:${iso}`;
/** Items that are new since the last visit: a dated item newer than the last visit time, an on-file item whose id was not there before. With no earlier visit there is nothing to compare, so nothing is marked. */
export function newSince(items: HubItem[], seen: Seen | null): Set<string> {
  const out = new Set<string>(); if (!seen) return out; const had = new Set(seen.ids);
  for (const x of items) if (x.ts != null ? x.ts > seen.at : !had.has(x.id)) out.add(x.id);
  return out;
}
export const snapshotSeen = (items: HubItem[], now: number): Seen => ({ at: now, ids: items.filter((x) => x.ts == null).map((x) => x.id).slice(0, 300) });
export function readSeen(iso: string): Seen | null { try { const j = JSON.parse(localStorage.getItem(seenKey(iso)) ?? "null") as Seen | null; return j && typeof j.at === "number" && Array.isArray(j.ids) ? { at: j.at, ids: j.ids.filter((x) => typeof x === "string") } : null; } catch { return null; } }
export function writeSeen(iso: string, s: Seen): void { try { localStorage.setItem(seenKey(iso), JSON.stringify(s)); } catch { /* the marker is not kept */ } }

// ---- clips and the summary request
export const itemClip = (x: HubItem, iso: string): Omit<Clip, "at" | "note"> => ({ id: x.id, iso, text: x.title, source: x.source, url: x.url, date: x.date || x.asOf || "", angle: x.angles[0], kind: x.kind, tone: x.tone });
/** The visible items as numbered lines for the writer, capped at `max` items; the writer is told to cite by number. */
export function summaryText(items: HubItem[], max = 40): { text: string; n: number } {
  const xs = items.slice(0, max);
  return { n: xs.length, text: xs.map((x, i) => `[${i + 1}] ${x.date || x.asOf || "undated"} · ${x.angles[0]} · ${x.title} (${x.source}${x.tone !== "neutral" ? `; keyword mark: ${x.tone}` : ""})`).join("\n") };
}
