"use client";
import { useEffect, useState } from "react";

export type Mission = { id: string; type: "embassy" | "consulate-general" | "consulate" | "permanent-mission" | "visa-centre" | "office" | "other"; name: string; city: string | null; head: { role: string; name: string } | null; phone: string | null; fax: string | null; email: string | null; address: string | null; hours: string | null; lat: number | null; lon: number | null; approx?: boolean; website: string | null };
export type MissionsData = { built: string; source: { name: string; url: string; note: string }; totals: Record<string, number>; countries: Record<string, Mission[]> };
export type Visit = { u: string; d: string; t: string; c: string[]; k: "visit" | "meeting" | "call" | "signing" | "message"; l: 1 | 2 | 3; dir: "in" | "out" | null };
export type VisitsData = { built: string; source: { name: string; url: string; note: string }; from: string; items: Visit[] };

const once = <T,>(url: string) => { let p: Promise<T> | null = null; return () => (p ??= fetch(url).then((r) => r.json() as Promise<T>).catch((e) => { p = null; throw e; })); };
export const loadMissions = once<MissionsData>("/data/missions.json");
export const loadVisits = once<VisitsData>("/data/visits.json");
function useLoaded<T>(load: () => Promise<T>): T | null { const [d, setD] = useState<T | null>(null); useEffect(() => { let dead = false; load().then((j) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, [load]); return d; }
export const useMissions = () => useLoaded(loadMissions);
export const useVisits = () => useLoaded(loadVisits);
export const wamUrl = (u: string) => `https://www.wam.ae/en/article/${u}`;
export const TYPE_LABEL: Record<Mission["type"], { en: string; ar: string }> = {
  embassy: { en: "Embassy", ar: "سفارة" }, "consulate-general": { en: "Consulate General", ar: "قنصلية عامة" }, consulate: { en: "Consulate", ar: "قنصلية" }, "permanent-mission": { en: "Permanent mission", ar: "بعثة دائمة" },
  "visa-centre": { en: "Visa centre", ar: "مركز تأشيرات" }, office: { en: "Office", ar: "مكتب" }, other: { en: "Other", ar: "أخرى" },
};
