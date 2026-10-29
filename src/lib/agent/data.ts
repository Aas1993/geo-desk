import { loadFlights } from "../flights-client";
import { loadAgreements } from "../agreements-client";
import { loadMissions, loadVisits } from "../diplomacy-client";
import { loadTrade } from "../intel-client";
import { loadInvestment } from "../investment-client";
import { buildProfile, profileText } from "../bird/profile";
import type { CaseData } from "../case/load";
import { readHeld } from "../bird/runner";

/** The free Case File data for one country as text for the agents: the datasets are loaded once in the browser, the profile is built by rules, no model is involved. */
export async function profileTextFor(iso: string, lang: "en" | "ar"): Promise<string> {
  try {
    const [dRes, fl, ag, ms, vs, tr, inv, news] = await Promise.all([fetch(`/api/case/${iso}`).then((r) => (r.ok ? (r.json() as Promise<CaseData>) : null)).catch(() => null), loadFlights().catch(() => null), loadAgreements().catch(() => null), loadMissions().catch(() => null), loadVisits().catch(() => null), loadTrade().catch(() => null), loadInvestment().catch(() => null), fetch(`/api/news/${iso}`).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] }))]);
    if (!dRes) return "";
    const p = buildProfile({ d: dRes, lang, flights: fl?.countries[iso] ?? null, ag: ag?.countries[iso] ?? null, missions: ms?.countries[iso] ?? [], visits: (vs?.items ?? []).filter((v) => v.c.includes(iso)), trade: tr, news: ((news as { items?: { outlet: string; title: string; link: string; ts: number }[] }).items ?? []).slice(0, 10), investment: inv?.countries[iso] ?? null, councilReport: readHeld(`gd-case-council:${iso}`)?.report ?? null, architectReport: readHeld(`gd-case-architect:${iso}`)?.report ?? null, now: Date.now() });
    return profileText(p, dRes.name);
  } catch { return ""; }
}
