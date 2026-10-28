"use client";
import { useCallback, useEffect, useState } from "react";
import { architectKey, councilKey, readProduct, type SavedProduct } from "@/lib/case/saved";
import type { Fact } from "./shared";
import type { Directive } from "@/lib/desk/core";

// What this browser holds for the two desks, read live. The desks keep separate saved products; each may read the other's finished work when the person leaves "read what is on file" ticked.
export const deskKey = (p: "king-council" | "emb-intel" | "emb-plan", iso: string) => `gd-desk:${p}:${iso}`;
export const dirKey = (d: "king" | "embassy", iso: string) => `gd-desk-dir:${d}:${iso}`;
export type Filed = { council: SavedProduct | null; architect: SavedProduct | null; king: SavedProduct | null; intel: SavedProduct | null; plan: SavedProduct | null };
const read = (iso: string | null): Filed => (iso ? { council: readProduct(councilKey(iso)), architect: readProduct(architectKey(iso)), king: readProduct(deskKey("king-council", iso)), intel: readProduct(deskKey("emb-intel", iso)), plan: readProduct(deskKey("emb-plan", iso)) } : { council: null, architect: null, king: null, intel: null, plan: null });
export function useFiled(iso: string | null): Filed {
  const [f, set] = useState<Filed>(() => read(null));
  useEffect(() => { const go = () => set(read(iso)); const t0 = setTimeout(go, 0); window.addEventListener("storage", go); window.addEventListener("focus", go); return () => { clearTimeout(t0); window.removeEventListener("storage", go); window.removeEventListener("focus", go); }; }, [iso]);
  return f;
}
/** The facts a saved run cited, kept with it so every [F12] can be opened later. */
export function readFacts(key: string | null): Fact[] { if (!key) return []; try { const j = JSON.parse(localStorage.getItem(key) ?? "null") as { facts?: Fact[] } | null; return Array.isArray(j?.facts) ? j!.facts : []; } catch { return []; } }

/** One answered directive, question or update, kept in this browser. */
export type Answer = { id: string; at: string; mode: "question" | "directive" | "update"; urgency: "routine" | "urgent"; topic: string; agents: string[]; report: string; directive: Directive | null; usd: number | null; searches: number; sources: number; cached: boolean; facts: Fact[]; lang: "en" | "ar" };
export function readAnswers(key: string): Answer[] { try { const j = JSON.parse(localStorage.getItem(key) ?? "[]") as Answer[]; return Array.isArray(j) ? j : []; } catch { return []; } }
export function useAnswers(key: string | null): [Answer[], (a: Answer) => void, (id: string) => void] {
  const [list, setList] = useState<Answer[]>([]);
  useEffect(() => { const t0 = setTimeout(() => setList(key ? readAnswers(key) : []), 0); return () => clearTimeout(t0); }, [key]);
  const add = useCallback((a: Answer) => { if (!key) return; const n = [a, ...readAnswers(key).filter((x) => x.id !== a.id)].slice(0, 25); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* storage full: drop the oldest */ try { localStorage.setItem(key, JSON.stringify(n.slice(0, 8))); } catch { /* give up */ } } setList(n); }, [key]);
  const del = useCallback((id: string) => { if (!key) return; const n = readAnswers(key).filter((x) => x.id !== id); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ } setList(n); }, [key]);
  return [list, add, del];
}
