"use client";
import { useEffect, useMemo, useState } from "react";
import type { WorldModel } from "@/lib/falcon/world";
import type { AlertsPayload } from "@/lib/alerts";
import type { Country } from "@/lib/types";

const once = <T,>(url: string) => { let p: Promise<T> | null = null; return () => (p ??= fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status))))).catch((e) => { p = null; throw e; })); };
const loadWorld = once<WorldModel>("/api/falcon/world"); const loadList = once<Country[]>("/data/countries.json");
/** The world model (scores, early warnings, source health); "err" if it cannot be loaded. */
export function useWorld(): WorldModel | null | "err" { const [d, set] = useState<WorldModel | null | "err">(null); useEffect(() => { let dead = false; loadWorld().then((x) => { if (!dead) set(x); }).catch(() => { if (!dead) set("err"); }); return () => { dead = true; }; }, []); return d; }
/** Country records (names, flags, coordinates) without the heavy map shapes. */
export function useCountryList() { const [l, set] = useState<Country[]>([]); useEffect(() => { let dead = false; loadList().then((x) => { if (!dead) set(x); }).catch(() => {}); return () => { dead = true; }; }, []); const by = useMemo(() => new Map(l.map((c) => [c.iso3, c])), [l]); return { list: l, by }; }
/** The merged live alert feed, refreshed every five minutes while the page is open. */
export function useAlerts() {
  const [d, set] = useState<{ data: AlertsPayload | null; err: boolean }>({ data: null, err: false });
  useEffect(() => { let dead = false; const run = () => fetch("/api/alerts").then((r) => (r.ok ? r.json() : Promise.reject())).then((j: AlertsPayload) => { if (!dead) set({ data: j, err: false }); }).catch(() => { if (!dead) set((p) => ({ ...p, err: true })); }); run(); const i = setInterval(run, 300_000); return () => { dead = true; clearInterval(i); }; }, []);
  return d;
}
