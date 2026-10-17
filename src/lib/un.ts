"use client";
import type { Series } from "./types";
let ideal: Promise<Record<string, Series>> | null = null;
export function loadIdeal() {
  return (ideal ??= fetch("/data/un/ideal.json").then((r) => r.json() as Promise<Record<string, [number, number][]>>)
    .then((j) => Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.map(([y, v2]) => ({ y, v: v2 }))]))));
}
const agree = new Map<string, Promise<Record<string, number> | null>>();
export function loadAgree(iso3: string) {
  let p = agree.get(iso3);
  if (!p) { p = fetch(`/data/un/agree/${iso3}.json`).then((r) => (r.ok ? (r.json() as Promise<Record<string, number>>) : null)).catch(() => null); agree.set(iso3, p); }
  return p;
}
