"use client";
import { useEffect, useState } from "react";

export type Status = "active" | "seasonal" | "charter" | "future" | "suspended";
export type FlightAirline = { name: string; status: Status; from: string[] };
export type FlightDest = { iata: string; name: string; lat: number | null; lon: number | null; status: Status; from: string[]; airlines: FlightAirline[] };
export type FlightCountry = { destinations: FlightDest[]; airlines: string[]; counts: Record<Status, number> };
export type FlightData = { built: string; revisions: Record<string, number>; airports: Record<string, string>; source: { name: string; url: string; note: string }; countries: Record<string, FlightCountry> };

let cache: Promise<FlightData> | null = null;
/** Destinations served from UAE airports (public/data/flights.json, rebuilt daily from Wikipedia airport tables via Wikidata). */
export const loadFlights = () => (cache ??= fetch("/data/flights.json").then((r) => r.json() as Promise<FlightData>).catch((e) => { cache = null; throw e; }));
export function useFlights(): FlightData | null {
  const [d, setD] = useState<FlightData | null>(null);
  useEffect(() => { let dead = false; loadFlights().then((j) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, []);
  return d;
}
/** Destinations with flights now or in season; suspended, charter-only and future routes are counted separately. */
export const liveCount = (c?: FlightCountry) => (c ? c.counts.active + c.counts.seasonal : 0);
