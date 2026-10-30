// Second-source checks on leaders and elections (public/data/leaders-xcheck.json, built by scripts/build-leaders-xcheck.mjs), set beside the Wikidata / Wikipedia figures in leaders.json.
// Rules: a source with nothing for a country is simply absent; a source is never filled in from another; an expected date that has already passed is shown but not compared.
export type XSrc = { id: string; name: string; publisher: string; basis: string; url: string; licence?: string; note?: string; kind?: string; status: "ok" | "failed"; rows: number; snapshot?: string | null };
export type IpuItem = { ch: string; next: string; last: string; term: number | null; url: string };
export type IfesItem = { label: string; date: string; mark: "d" | "t"; url: string };
export type XCountry = { ipu?: IpuItem[]; ifes?: IfesItem[]; cia?: { state?: string; gov?: string } };
export type LeadersX = { built: string; sources: Record<string, XSrc>; unavailable: { name: string; url: string; reason: string }[]; countries: Record<string, XCountry> };
export type WikiElection = { label: string; date: string; approx: boolean };

let cache: Promise<LeadersX> | null = null;
export const loadLeadersX = (): Promise<LeadersX> => (cache ??= fetch("/data/leaders-xcheck.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<LeadersX>; }).catch((e) => { cache = null; throw e; }));

export type Office = "legislative" | "presidential" | "other";
/** What an election is for, from its label. Anything not clearly a parliament or a president (governors, mayors, referendums) is "other" and is never compared. */
export function officeOf(label: string): Office {
  if (/president|presiden/i.test(label)) return "presidential";
  if (/federal council|executive council|cabinet|prime minister|chancellor|governing council/i.test(label)) return "other"; // chosen by a parliament, not by voters
  if (/governor|mayor|municipal|local|regional|referend|provincial|state\b|territor|island council/i.test(label)) return "other";
  if (/parliament|legislat|assembl|house|senate|chamber|deputies|congress|council|diet|majlis|knesset|duma|storting|riksdag|folketing|sejm|bundestag|cortes|dail|seanad|lok sabha|national/i.test(label)) return "legislative";
  return "other";
}
const monthsBetween = (a: string, b: string) => Math.abs((+a.slice(0, 4) - +b.slice(0, 4)) * 12 + (+a.slice(5, 7) - +b.slice(5, 7)));

export type Reading = { s: "wiki" | "ipu" | "ifes"; date: string; label: string; url?: string; tentative?: boolean };
export type ElectionVerdict = "none" | "single" | "agree" | "close" | "differ";
export type ElectionCheck = { office: "legislative" | "presidential"; readings: Reading[]; stale: Reading[]; verdict: ElectionVerdict; spreadMonths: number | null };
/** Agreement on the date of the next election of one kind. Same month: agree. Within three months: close. Further apart: differ. Dates are compared by month because the IPU only publishes months. A reading before `today` is stale and listed apart. */
export function compareElections(readings: Reading[], office: "legislative" | "presidential", today: string): ElectionCheck {
  const stale = readings.filter((r) => r.date.slice(0, 10) < today), live = readings.filter((r) => r.date.slice(0, 10) >= today);
  // one reading per source: the earliest upcoming one, so a source never counts twice
  const by = new Map<string, Reading>(); for (const r of [...live].sort((a, b) => a.date.localeCompare(b.date))) if (!by.has(r.s)) by.set(r.s, r);
  const used = [...by.values()]; if (!used.length) return { office, readings: [], stale, verdict: "none", spreadMonths: null };
  if (used.length === 1) return { office, readings: used, stale, verdict: "single", spreadMonths: null };
  const dates = used.map((r) => r.date).sort(); const spread = monthsBetween(dates[0], dates[dates.length - 1]);
  return { office, readings: used, stale, verdict: spread === 0 ? "agree" : spread <= 3 ? "close" : "differ", spreadMonths: spread };
}
/** Every comparison available for one country: legislative and presidential, from the Wikipedia calendar in leaders.json, IPU (legislative only) and IFES. */
export function electionChecks(x: XCountry | undefined, wiki: WikiElection[] | undefined, today: string): ElectionCheck[] {
  const leg: Reading[] = [], pres: Reading[] = [];
  for (const e of wiki ?? []) { const o = officeOf(e.label); const r: Reading = { s: "wiki", date: e.date.endsWith("-00") ? e.date.slice(0, 7) + "-15" : e.date, label: e.label }; if (o === "legislative") leg.push(r); else if (o === "presidential") pres.push(r); }
  // the lower chamber is the one the wiki calendar usually lists; the upper chamber is used only where there is no lower one
  const ipu = x?.ipu ?? []; const lc = ipu.filter((i) => i.ch.startsWith("LC")); for (const i of lc.length ? lc : ipu) leg.push({ s: "ipu", date: i.next, label: `${i.ch.startsWith("LC") ? "Lower or only chamber" : "Upper chamber"}, term ${i.term ?? "?"} years`, url: i.url });
  for (const i of x?.ifes ?? []) { const o = officeOf(i.label); const r: Reading = { s: "ifes", date: i.date, label: i.label, url: i.url, tentative: i.mark === "t" }; if (o === "legislative") leg.push(r); else if (o === "presidential") pres.push(r); }
  return ([["legislative", leg], ["presidential", pres]] as const).map(([o, r]) => compareElections(r, o, today)).filter((c) => c.readings.length || c.stale.length);
}

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z ]/g, " ");
const lev = (a: string, b: string): number => { const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; };
const PARTICLES = new Set(["bin", "ben", "bint", "abu", "abd", "abdel", "abdul", "van", "von", "der", "den", "del", "dos", "das", "the", "of", "al", "el", "de", "da", "di", "jr", "sr", "mr", "dr"]);
/** Does a person's name appear in free text? Any name part of four or more letters that is a particle-free token counts, allowing one slip per five letters for transliteration (Zayed / Zayid). A hit is "the same person, probably", a miss is "different, or spelt very differently": it is a prompt to look, never a finding by itself. */
export function personInText(name: string, text: string): boolean {
  const parts = strip(name).split(/\s+/).filter((t) => t.length >= 4 && !PARTICLES.has(t)); const words = strip(text).split(/\s+/).filter((t) => t.length >= 3);
  return parts.some((p) => words.some((w) => w === p || (Math.abs(w.length - p.length) <= 2 && lev(w, p) <= Math.max(1, Math.floor(p.length / 5)))));
}
export type OfficeVerdict = "match" | "differ" | "none";
/** Wikidata's office-holder against the Factbook snapshot text. "none" when either side holds no figure. */
export const officeCheck = (name: string | undefined, text: string | undefined): OfficeVerdict => (!name || !text ? "none" : personInText(name, text) ? "match" : "differ");
