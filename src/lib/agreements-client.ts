"use client";
import { useEffect, useState } from "react";

export type Ag = { t: string; type: string; kind: "agreement" | "mou"; year?: string | null };
export type Cepa = { iso3: string; partner: string; signed: string | null; inForce: string | null; due: string | null; status: "in-force" | "signed" | "concluded" | "unknown"; url: string; source: string };
export type AgCountry = { name: string; mofa: Ag[]; moft: Ag[]; committees: { since: number | null; meetings: number | null; last: string | null; raw: string }[]; offices: { label: string; email: string | null; phone: string | null }[]; cepa: Cepa | null };
export type AgData = { built: string; sources: Record<string, { name: string; url: string; countries: number; items: number; note: string }>; cepaSummary: { signed: number; inForce: number; negotiating: number; asOf: string; source: string; url: string }; countries: Record<string, AgCountry> };

let cache: Promise<AgData> | null = null;
/** UAE agreements per country (public/data/agreements.json, rebuilt daily by CI from MOFA and the Ministry of Foreign Trade). */
export const loadAgreements = () => (cache ??= fetch("/data/agreements.json").then((r) => r.json() as Promise<AgData>).catch((e) => { cache = null; throw e; }));
export function useAgreements(): AgData | null {
  const [d, setD] = useState<AgData | null>(null);
  useEffect(() => { let dead = false; loadAgreements().then((j) => { if (!dead) setD(j); }).catch(() => {}); return () => { dead = true; }; }, []);
  return d;
}

const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export type Row = Ag & { src: "MOFA" | "MoFT" };
/** MOFA and the Ministry of Foreign Trade overlap, so identical titles are listed once. */
export function allAgreements(c: AgCountry): Row[] {
  const seen = new Set<string>(); const out: Row[] = [];
  for (const [src, list] of [["MOFA", c.mofa], ["MoFT", c.moft]] as const) for (const a of list) { const k = key(a.t); if (seen.has(k)) continue; seen.add(k); out.push({ ...a, src }); }
  return out;
}
export const has = (c: AgCountry | undefined, type: string) => !!c && [...c.mofa, ...c.moft].some((a) => a.type === type);
export const TYPE_ORDER = ["cepa", "fta", "trade", "investment", "tax", "air", "transport", "legal", "security", "visa", "labour", "finance", "energy", "environment", "health", "education", "tech", "political", "other"] as const;
export const TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  cepa: { en: "CEPA", ar: "الشراكة الاقتصادية الشاملة" }, fta: { en: "Free trade", ar: "التجارة الحرة" }, trade: { en: "Trade & economy", ar: "التجارة والاقتصاد" }, investment: { en: "Investment", ar: "الاستثمار" },
  tax: { en: "Double taxation", ar: "الازدواج الضريبي" }, air: { en: "Air services", ar: "النقل الجوي" }, transport: { en: "Transport & maritime", ar: "النقل والملاحة" }, legal: { en: "Legal & judicial", ar: "قانوني وقضائي" },
  security: { en: "Defence & security", ar: "الدفاع والأمن" }, visa: { en: "Visas & consular", ar: "التأشيرات والقنصلية" }, labour: { en: "Labour", ar: "العمل" }, finance: { en: "Finance & aid", ar: "المال والمساعدات" },
  energy: { en: "Energy", ar: "الطاقة" }, environment: { en: "Environment", ar: "البيئة" }, health: { en: "Health & agriculture", ar: "الصحة والزراعة" }, education: { en: "Education, culture & media", ar: "التعليم والثقافة والإعلام" },
  tech: { en: "Technology & space", ar: "التقنية والفضاء" }, political: { en: "Political & cooperation", ar: "سياسي وتعاون" }, other: { en: "Other", ar: "أخرى" },
};
