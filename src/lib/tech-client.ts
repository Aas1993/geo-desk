import type { TechData } from "./tech";
let cache: Promise<TechData> | null = null;
export const loadTech = () => (cache ??= fetch("/data/tech.json").then((r) => r.json() as Promise<TechData>).catch((e) => { cache = null; throw e; }));
