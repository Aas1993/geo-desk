import { loadFlights } from "../flights-client";
import { loadAgreements } from "../agreements-client";
import { loadMissions, loadVisits } from "../diplomacy-client";
import { loadTrade } from "../intel-client";
import { loadInvestment } from "../investment-client";
import { buildProfile, profileText, type ProfileInputs } from "../bird/profile";
import type { CaseData } from "../case/load";
import { readHeld } from "../bird/runner";
import { loadTech } from "../tech-client";
import { clipsFactFor } from "../clips";

/** The datasets the free profile is built from for one country (`news: false` skips the headline fetches, which the Compare tab does not use), loaded once in the browser (the Case File from /api/case/[iso3], the rest from the shared dataset loaders); null when the Case File does not know the country. */
export async function profileInputsFor(iso: string, lang: "en" | "ar", o: { news?: boolean } = {}): Promise<ProfileInputs | null> {
  try {
    const [dRes, fl, ag, ms, vs, tr, inv, news, tc] = await Promise.all([fetch(`/api/case/${iso}`).then((r) => (r.ok ? (r.json() as Promise<CaseData>) : null)).catch(() => null), loadFlights().catch(() => null), loadAgreements().catch(() => null), loadMissions().catch(() => null), loadVisits().catch(() => null), loadTrade().catch(() => null), loadInvestment().catch(() => null), Promise.all((o.news === false ? [] : ["", "security", "economy", "energy", "tech", "logistics", "society", "political"]).map((k) => fetch(`/api/news/${iso}${k ? `?topic=${k}` : ""}`).then((r) => (r.ok ? r.json() : { items: [] })).then((j: { items?: { outlet: string; title: string; link: string; ts: number }[] }) => (j.items ?? []).slice(0, k ? 3 : 8).map((x) => ({ ...x, topic: k || undefined }))).catch(() => []))).then((xs) => ({ items: xs.flat().filter((x, i, a) => a.findIndex((y) => y.link === x.link) === i).sort((a, z) => z.ts - a.ts) })), loadTech().catch(() => null)]);
    if (!dRes) return null;
    return { d: dRes, lang, flights: fl?.countries[iso] ?? null, ag: ag?.countries[iso] ?? null, missions: ms?.countries[iso] ?? [], visits: (vs?.items ?? []).filter((v) => v.c.includes(iso)), trade: tr, news: ((news as { items?: { outlet: string; title: string; link: string; ts: number; topic?: string }[] }).items ?? []).slice(0, 30), investment: inv?.countries[iso] ?? null, councilReport: readHeld(`gd-case-council:${iso}`)?.report ?? null, architectReport: readHeld(`gd-case-architect:${iso}`)?.report ?? null, now: Date.now() };
  } catch { return null; }
}

/** The free Case File data for one country as text for the agents: the datasets are loaded once in the browser, the profile is built by rules, no model is involved. */
export async function profileTextFor(iso: string, lang: "en" | "ar"): Promise<string> {
  try { const i = await profileInputsFor(iso, lang); const cl = clipsFactFor(iso); return i ? `${profileText(buildProfile(i), i.d.name)}${cl ? `\n\n## ${cl}` : ""}` : ""; } catch { return ""; }
}
