"use client";
import { useEffect, useMemo, useState } from "react";
import type { CaseData } from "@/lib/case/load";
import { scoreCountry, type Extras } from "@/lib/bird/score";
import { baselineMap } from "@/lib/roundtable/consensus";
import { readChallenge, withChallenge, type HeldChallenge } from "@/lib/roundtable/challenge";
import { readAll, readHeld, type SeatReading } from "@/lib/roundtable/read";

// The Round Table's data, live: what every council has saved for the country, the rule-built baseline, and the saved challenge, re-read whenever this browser's storage changes or the window gains focus (a council run on another page shows up at once). The flights, visits and agreements the baseline reads are only loaded on the Bird's eye view; that page leaves them in storage so the other pages' baseline matches it.
const EXTRAS_KEY = (iso: string) => `gd-rt-extras:${iso}`;
const NONE: Extras = { flightsLive: null, visits12: null, agreements: null, cepa: null, hasMission: null };
function storedExtras(iso: string): Extras | null { try { const j = JSON.parse(localStorage.getItem(EXTRAS_KEY(iso)) ?? "null") as Extras | null; return j && typeof j === "object" ? { ...NONE, ...j } : null; } catch { return null; } }
export type RoundTableData = { rs: SeatReading[]; /** The readings as the councils' own words give them, without the challenge's scores put over them (what the digests are built from). */ pure: SeatReading[]; baseline: Record<string, number | null>; scored: ReturnType<typeof scoreCountry> | null; posture: string | null; held: HeldChallenge | null; extrasFrom: "page" | "stored" | "none"; reload: () => void };
export function useRoundTable(iso: string | null, d: CaseData | null, metrics?: Extras | null): RoundTableData {
  const [tick, setTick] = useState(0); const [stored, setStored] = useState<Extras | null>(null); const [snap, setSnap] = useState<{ rs: SeatReading[]; pure: SeatReading[]; held: HeldChallenge | null; at: number }>({ rs: [], pure: [], held: null, at: 0 });
  useEffect(() => { const on = () => setTick((n) => n + 1); window.addEventListener("storage", on); window.addEventListener("focus", on); return () => { window.removeEventListener("storage", on); window.removeEventListener("focus", on); }; }, []);
  useEffect(() => { if (!iso || !metrics) return; try { localStorage.setItem(EXTRAS_KEY(iso), JSON.stringify(metrics)); } catch { /* storage unavailable */ } }, [iso, metrics]);
  useEffect(() => { const k = setTimeout(() => setStored(iso ? storedExtras(iso) : null), 0); return () => clearTimeout(k); }, [iso, tick]);
  const extras = metrics ?? stored ?? NONE; const scored = useMemo(() => (d ? scoreCountry(d, extras) : null), [d, extras]); const baseline = useMemo(() => baselineMap(scored), [scored]);
  useEffect(() => { const k = setTimeout(() => { if (!iso) { setSnap({ rs: [], pure: [], held: null, at: 0 }); return; } const now = Date.now(); const held = readChallenge(iso); const pure = readAll(iso, d, scored, now, readHeld(iso)); setSnap({ rs: withChallenge(pure, held?.challenge ?? null), pure, held, at: now }); }, 0); return () => clearTimeout(k); }, [iso, d, scored, tick]);
  return { rs: snap.rs, pure: snap.pure, baseline, scored, posture: d?.posture.posture ?? null, held: snap.held, extrasFrom: metrics ? "page" : stored ? "stored" : "none", reload: () => setTick((n) => n + 1) };
}
