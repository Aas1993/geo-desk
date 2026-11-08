// NON-FRIENDLY STATES: a criteria-based watch list of the countries whose measured behaviour toward the UAE, or whose documented dispute with it, is unfriendly or adversarial.
// It is an analytic aid for protective planning (what to watch, where to expect friction, whom to engage carefully), not an official designation, and it never proposes covert or coercive action: the Machiavellian boundary applies.
// Two separate things are kept apart on purpose. DISTANCE (no relationship, no data: most micro-states and territories) is NOT hostility and is excluded. FRICTION is measured from active signals, and a DOCUMENTED TENSION is a public dispute, litigation or rupture recorded in a register with its sources.
// A state is flagged only when INDEPENDENT signals agree. Bilateral tone and the conflict share come from the same machine-coded news events, so they count as one signal; the others are UN voting, sanctions exposure and disengagement despite trade; a worsening trend is shown as an aggravator only. One signal is never listed.
export type Sig = { id: "events" | "un" | "sanc" | "trend" | "ties"; en: string; ar: string; pct: number | null; value: string; fires: boolean };
export type Tension = { iso3: string; kind: "territorial" | "litigation" | "rupture" | "hostile-act"; en: string; ar: string; sources: { label: string; url: string }[]; asOf: string; verified: boolean };
export type Tier = "adversarial" | "unfriendly" | "tension" | "watch" | null;
export type Row = { iso3: string; name: string; nameAr: string | null; region: string; tier: Tier; friction: number | null; fired: number; of: number; sigs: Sig[]; tension: Tension | null; trend: number | null; events: number | null; ties: { engagement: number | null; agreements: number | null; trade: number | null }; reasons: { en: string; ar: string }[]; coverage: "full" | "partial" | "thin" };
export type Inputs = { iso3: string; name: string; nameAr: string | null; region: string; tone: { g: number; conflict: number; n: number; trend: number | null } | null; alignment: number | null; sanc: { ofac: number; un: number; gdp: number | null } | null; c: { trade: number; engagement: number; agreements: number } | null };
export const FIRE_AT = 88; // a signal fires when the country is in the worst 12% on that reading
export const MIN_EVENTS = 30;
export const TIER_LABEL: Record<Exclude<Tier, null>, { en: string; ar: string; help: { en: string; ar: string } }> = {
  adversarial: { en: "Adversarial", ar: "عدائية", help: { en: "A documented dispute, litigation or rupture with the UAE and at least one measured friction signal.", ar: "نزاع أو تقاضٍ أو قطيعة موثقة مع الإمارات مع إشارة احتكاك مقيسة واحدة على الأقل." } },
  unfriendly: { en: "Unfriendly", ar: "غير ودّية", help: { en: "Three or more of the four core friction signals fire together (a worsening trend is shown but not counted).", ar: "تتفعّل ثلاث إشارات احتكاك أساسية أو أكثر من أصل أربع معًا (ويُعرض تدهور الاتجاه دون احتسابه)." } },
  tension: { en: "Documented tension", ar: "توتر موثّق", help: { en: "A documented dispute is on record but the measured signals do not (yet) confirm it.", ar: "نزاع موثّق في السجل لكن الإشارات المقيسة لا تؤكده (بعد)." } },
  watch: { en: "Watch", ar: "مراقبة", help: { en: "Two signals fire: not enough to call a country unfriendly. Re-check next refresh.", ar: "تتفعّل إشارتان: لا يكفي لوصف الدولة بغير الودّية. أعد الفحص عند التحديث القادم." } },
};
const pctOf = (m: Map<string, number>) => { const e = [...m.entries()].sort((a, b) => a[1] - b[1]); const n = e.length; const out = new Map<string, number>(); if (n < 8) return out; for (let i = 0; i < n;) { let j = i; while (j + 1 < n && e[j + 1][1] === e[i][1]) j++; const p = Math.round(((i + j) / 2 / (n - 1)) * 100); for (let k = i; k <= j; k++) out.set(e[k][0], p); i = j + 1; } return out; };
/** Friction percentiles are "worse = higher": a low bilateral tone, a high conflict share, low UN agreement and a high sanctions-listing density per US$ billion of GDP all read as high. */
export function assess(inputs: Inputs[], register: Tension[]): Row[] {
  const tone = new Map<string, number>(), conf = new Map<string, number>(), un = new Map<string, number>(), sanc = new Map<string, number>();
  for (const i of inputs) {
    if (i.tone && i.tone.n >= MIN_EVENTS) { tone.set(i.iso3, -i.tone.g); conf.set(i.iso3, i.tone.conflict); }
    if (i.alignment != null && i.alignment > 0) un.set(i.iso3, -i.alignment);
    if (i.sanc && i.sanc.gdp && i.sanc.gdp > 0) sanc.set(i.iso3, Math.log1p((i.sanc.ofac + i.sanc.un) / (i.sanc.gdp / 1000)));
  }
  const pt = pctOf(tone), pc = pctOf(conf), pu = pctOf(un), ps = pctOf(sanc); const reg = new Map(register.map((r) => [r.iso3, r]));
  return inputs.map((i): Row => {
    const mk = (id: Sig["id"], en: string, ar: string, p: number | undefined, value: string, fires = p != null && p >= FIRE_AT): Sig => ({ id, en, ar, pct: p ?? null, value, fires });
    const tp = pt.get(i.iso3), cp = pc.get(i.iso3); const hasEv = i.tone != null && i.tone.n >= MIN_EVENTS; const evPct = tp != null && cp != null ? Math.max(tp, cp) : undefined; const evFires = tp != null && cp != null && Math.max(tp, cp) >= FIRE_AT && Math.min(tp, cp) >= 75;
    const trendBad = hasEv && i.tone!.trend != null && i.tone!.trend! <= -1.5; const tiesWeak = i.c != null && i.c.trade >= 50 && i.c.engagement <= 25;
    const sigs: Sig[] = [
      mk("events", "Bilateral events with the UAE: tone and conflict share (GDELT, machine-coded)", "الأحداث الثنائية مع الإمارات: النبرة وحصة الصدام (جديلت، ترميز آلي)", evPct, hasEv ? `tone ${i.tone!.g.toFixed(2)} (worst ${tp != null ? 100 - tp : "?"}%), ${Math.round(i.tone!.conflict * 100)}% conflictual (worst ${cp != null ? 100 - cp : "?"}%), ${i.tone!.n} events` : "not enough events", evFires),
      mk("un", "Divergence from the UAE in UN General Assembly votes", "الابتعاد عن الإمارات في تصويت الجمعية العامة", pu.get(i.iso3), i.alignment != null ? `${Math.round(i.alignment * 100)}% agreement` : "no vote data"),
      mk("sanc", "Sanctions-list exposure (OFAC and UN) per GDP", "التعرض لقوائم العقوبات (أوفاك والأمم المتحدة) نسبةً إلى الناتج", ps.get(i.iso3), i.sanc ? `${i.sanc.ofac + i.sanc.un} entries` : "no data"),
      mk("trend", "Bilateral tone worsening over the last weeks", "تدهور نبرة العلاقة خلال الأسابيع الأخيرة", undefined, hasEv && i.tone!.trend != null ? `${i.tone!.trend!.toFixed(2)} (fires at -1.5 or worse)` : "no trend", trendBad),
      mk("ties", "Trade with the UAE but little engagement", "تجارة مع الإمارات مع تفاعل ضعيف", undefined, i.c ? `trade ${Math.round(i.c.trade)}th, engagement ${Math.round(i.c.engagement)}th percentile` : "no data", tiesWeak),
    ];
    const have = sigs.filter((s) => s.pct != null || s.id === "trend" && hasEv || s.id === "ties" && i.c != null); const fired = sigs.filter((s) => s.fires && s.id !== "trend").length; // a worsening trend is shown as an aggravator and never counted: it moves with every news cycle
    const t = reg.get(i.iso3) ?? null;
    const pc2 = sigs.filter((s) => s.pct != null); const friction = pc2.length ? Math.round(pc2.reduce((a, s) => a + s.pct!, 0) / pc2.length) : null;
    const coverage: Row["coverage"] = pc2.length >= 3 ? "full" : pc2.length === 2 ? "partial" : "thin";
    let tier: Tier = null; if (t && fired >= 1) tier = "adversarial"; else if (fired >= 3) tier = "unfriendly"; else if (t) tier = "tension"; else if (fired === 2) tier = "watch";
    if (!t && coverage === "thin") tier = null; // two or fewer readings: never flagged without a documented tension
    const reasons: Row["reasons"] = [];
    if (t) reasons.push({ en: `Documented: ${t.en}`, ar: `موثّق: ${t.ar}` });
    for (const s of sigs.filter((x) => x.fires)) reasons.push({ en: `${s.en}: ${s.value}`, ar: `${s.ar}: ${s.value}` });
    return { iso3: i.iso3, name: i.name, nameAr: i.nameAr, region: i.region, tier, friction, fired, of: have.length, sigs, tension: t, trend: i.tone?.trend ?? null, events: i.tone?.n ?? null, ties: { engagement: i.c?.engagement ?? null, agreements: i.c?.agreements ?? null, trade: i.c?.trade ?? null }, reasons, coverage };
  });
}
const RANK: Record<string, number> = { adversarial: 0, unfriendly: 1, tension: 2, watch: 3 };
export const listed = (rows: Row[]) => rows.filter((r) => r.tier).sort((a, b) => RANK[a.tier!] - RANK[b.tier!] || (b.friction ?? 0) - (a.friction ?? 0) || a.name.localeCompare(b.name));
