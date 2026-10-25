"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/machiavelli/profile-core";
import type { Portfolio, Roll } from "@/lib/machiavelli/profile";

export type Src = { url: string; title: string; kind?: string };
export type Usage = { searches: number; usd: number | null; input: number; output: number; cacheRead: number; cacheWrite: number };
export type Saved = { snap?: import("@/lib/machiavelli/profile-core").Snap; report: string; sources: Src[]; usage: Usage; at: string; model: string; name: string; options?: unknown; cached?: boolean; truncated?: boolean; costStopped?: boolean };
export type Phase = "idle" | "running" | "done" | "error";
/** Runs one AI product through the shared /api/dossier route (same cost ceiling, cache and guard as the other products) and keeps the finished copy in this browser under `storeKey`. */
export type AgentLive = { id: string; name: string; stage: number; status: "wait" | "run" | "done" | "skipped" | "error"; usd?: number; searches: number; note?: string };
export function useRun(iso: string | null, storeKey: string | null, onSaved?: (d: Saved) => void, endpoint?: string) {
  const [agents, setAgents] = useState<AgentLive[]>([]);
  const [phase, setPhase] = useState<Phase>("idle"); const [status, setStatus] = useState(""); const [tail, setTail] = useState(""); const [searches, setSearches] = useState(0); const [sources, setSources] = useState(0);
  const [saved, setSaved] = useState<Saved | null>(null); const [err, setErr] = useState(""); const ac = useRef<AbortController | null>(null);
  useEffect(() => { const t = setTimeout(() => { setSaved(null); setErr(""); setPhase("idle"); if (!storeKey) return; try { const s = localStorage.getItem(storeKey); if (s) { setSaved(JSON.parse(s) as Saved); setPhase("done"); } } catch { /* nothing saved */ } }, 0); return () => clearTimeout(t); }, [storeKey]);
  useEffect(() => () => ac.current?.abort(), []);
  const run = useCallback(async (body: Record<string, unknown>, extra?: Record<string, unknown>) => {
    if (!iso) return; ac.current?.abort(); const a = new AbortController(); ac.current = a; setPhase("running"); setErr(""); setStatus(""); setTail(""); setSearches(0); setSources(0);
    try {
      setAgents([]); const r = await fetch(endpoint ?? `/api/dossier/${iso}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint ? { ...body, iso3: iso } : body), signal: a.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); setErr(j.message ?? j.error ?? "upstream"); setPhase("error"); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ""; let ended = false;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith("data:")) continue; let ev: Record<string, unknown> & { type: string }; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
          if (ev.type === "roster") setAgents((ev.agents as { id: string; name: string; stage: number }[]).map((x) => ({ ...x, status: "wait" as const, searches: 0 })));
          else if (ev.type === "agent") setAgents((l) => l.map((x) => (x.id === ev.id ? { ...x, status: ev.status === "start" ? "run" : (ev.status as AgentLive["status"]), usd: (ev.usd as number | undefined) ?? x.usd, searches: (ev.searches as number | undefined) ?? x.searches, note: ev.message as string | undefined } : x)));
          else if (ev.type === "status") setStatus(String(ev.text ?? "")); else if (ev.type === "tool" && ev.name === "search") setSearches((n) => n + 1); else if (ev.type === "source") setSources((n) => n + 1);
          else if (ev.type === "text") setTail((x) => (x + String(ev.delta)).slice(-320));
          else if (ev.type === "error") { ended = true; setErr(String(ev.message ?? ev.error)); setPhase("error"); }
          else if (ev.type === "done") { ended = true; const d = { ...(ev as unknown as Saved), ...(extra as object) } as Saved; setSaved(d); setPhase("done"); if (storeKey) { try { localStorage.setItem(storeKey, JSON.stringify({ ...d, type: undefined })); window.dispatchEvent(new Event("storage")); } catch { /* storage full */ } } onSaved?.(d); }
        }
      }
      if (!ended) { setErr("The connection ended before the product finished."); setPhase("error"); }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr((e as Error).message); setPhase("error"); } }
  }, [iso, storeKey, onSaved, endpoint]);
  const cancel = useCallback(() => { ac.current?.abort(); setPhase(saved ? "done" : "idle"); }, [saved]);
  const clear = useCallback(() => { if (storeKey) { try { localStorage.removeItem(storeKey); window.dispatchEvent(new Event("storage")); } catch { /* ignore */ } } setSaved(null); setPhase("idle"); }, [storeKey]);
  return { phase, status, tail, searches, sources, saved, err, run, cancel, clear, agents };
}
export type ProfileSet = { builtAt: string; sources: Record<string, string | null>; profiles: Profile[]; portfolio: Portfolio; rolls: Roll[] };
let cache: Promise<ProfileSet> | null = null;
/** The strategic profiles of every country from /api/machiavelli/profile, loaded once per page. */
export function useProfiles(): ProfileSet | null | "err" {
  const [d, set] = useState<ProfileSet | null | "err">(null);
  useEffect(() => { let dead = false; cache ??= fetch("/api/machiavelli/profile").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ProfileSet>; }); cache.then((x) => { if (!dead) set(x); }).catch(() => { cache = null; if (!dead) set("err"); }); return () => { dead = true; }; }, []);
  return d;
}
