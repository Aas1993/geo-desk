"use client";
import { useEffect, useState } from "react";
export type Orgs = { built: string; source: Record<string, string>; orgs: Record<string, string[]> };
let cache: Promise<Orgs> | null = null;
/** Member lists per organisation (public/data/orgs.json), fetched once per session. */
export const loadOrgs = () => (cache ??= fetch("/data/orgs.json").then((r) => r.json() as Promise<Orgs>).catch((e) => { cache = null; throw e; }));
export function useOrgs(): Orgs | null {
  const [o, setO] = useState<Orgs | null>(null);
  useEffect(() => { let dead = false; loadOrgs().then((j) => { if (!dead) setO(j); }).catch(() => {}); return () => { dead = true; }; }, []);
  return o;
}
