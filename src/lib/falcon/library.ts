// The Falcon Eye library: every finished product the desk has generated on this browser, read back from its saved copies, plus a forecast registry that turns key judgments into scored questions.
// Client-side only (localStorage). Nothing here is sent anywhere; it is the desk's own working record.
import { parseForesight } from "../visual";

export type SavedKind = "foresight-brief" | "foresight-report" | "minister" | "desk" | "counterpart" | "investments" | "lab" | "redteam" | "council" | "strategy" | "strategy-enhance" | "scenario" | "interference" | "scouncil";
export type SavedItem = { key: string; iso3: string; kind: SavedKind; at: string; usd: number | null; words: number; report: string; model: string };
const PATTERNS: { re: RegExp; kind: (m: RegExpExecArray) => SavedKind }[] = [
  { re: /^gd-fs:([A-Z]{3}):(brief|report)$/, kind: (m) => (m[2] === "brief" ? "foresight-brief" : "foresight-report") }, { re: /^gd-dossier:([A-Z]{3})$/, kind: () => "minister" }, { re: /^gd-desk:([A-Z]{3})$/, kind: () => "desk" },
  { re: /^gd-cp:([A-Z]{3})$/, kind: () => "counterpart" }, { re: /^gd-inv:([A-Z]{3})$/, kind: () => "investments" }, { re: /^gd-lab:([A-Z]{3})$/, kind: () => "lab" }, { re: /^gd-rt:([A-Z]{3})$/, kind: () => "redteam" }, { re: /^gd-council:([A-Z]{3})$/, kind: () => "council" }, { re: /^gd-strat:([A-Z]{3}):(dossier|enhance)$/, kind: (m) => (m[2] === "enhance" ? "strategy-enhance" : "strategy") }, { re: /^gd-scen:([A-Z]{3})$/, kind: () => "scenario" }, { re: /^gd-interf:([A-Z]{3})$/, kind: () => "interference" }, { re: /^gd-scouncil:([A-Z]{3})$/, kind: () => "scouncil" },
];
export function listSaved(): SavedItem[] {
  const out: SavedItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ""; for (const p of PATTERNS) { const m = p.re.exec(key); if (!m) continue;
        try { const v = JSON.parse(localStorage.getItem(key) ?? "null") as { report?: string; at?: string; model?: string; usage?: { usd?: number | null } } | null; if (v?.report) out.push({ key, iso3: m[1], kind: p.kind(m), at: v.at ?? "", usd: v.usage?.usd ?? null, words: v.report.split(/\s+/).length, report: v.report, model: v.model ?? "" }); } catch { /* unreadable copy */ } }
    }
  } catch { /* storage unavailable */ }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
export function deleteSaved(key: string) { try { localStorage.removeItem(key); localStorage.removeItem(`${key}:prev`); } catch { /* ignore */ } }

export type Outcome = "yes" | "no";
export type Entry = { id: string; iso3: string; kind: SavedKind; text: string; label: string; pct: number; issued: string };
const REG = "gd-fs-registry";
const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim().slice(0, 80);
/** Key judgments with a likelihood band from the saved foresight products, as registry questions: the wording and the band are frozen at the issue date of the saved copy. */
export function registryEntries(items: SavedItem[]): Entry[] {
  const out: Entry[] = []; const seen = new Set<string>();
  for (const it of items.filter((x) => x.kind === "foresight-brief" || x.kind === "foresight-report")) {
    for (const j of parseForesight(it.report).judgments) { if (!j.band || !j.text) continue; const id = `${it.iso3}:${it.kind}:${norm(j.text)}`; if (seen.has(id)) continue; seen.add(id); out.push({ id, iso3: it.iso3, kind: it.kind, text: j.text, label: j.band.label, pct: j.band.pct, issued: it.at.slice(0, 10) }); }
  }
  return out;
}
export function loadResolutions(): Record<string, { outcome: Outcome; at: string }> { try { return JSON.parse(localStorage.getItem(REG) ?? "{}"); } catch { return {}; } }
export function resolve(id: string, outcome: Outcome | null) { const r = loadResolutions(); if (outcome) r[id] = { outcome, at: new Date().toISOString().slice(0, 10) }; else delete r[id]; try { localStorage.setItem(REG, JSON.stringify(r)); window.dispatchEvent(new Event("gd-registry")); } catch { /* ignore */ } }
/** Brier score of the resolved judgments (0 is perfect, 0.25 is what always saying "roughly even" scores) and the skill against that baseline. Band midpoints stand in for probabilities, so this is a coarse calibration check, not a model score. */
export function calibration(entries: Entry[], res: Record<string, { outcome: Outcome }>) {
  const done = entries.filter((e) => res[e.id]); if (!done.length) return { n: 0, brier: null as number | null, skill: null as number | null, hit: null as number | null };
  const b = done.reduce((a, e) => a + Math.pow(e.pct / 100 - (res[e.id].outcome === "yes" ? 1 : 0), 2), 0) / done.length;
  return { n: done.length, brier: Math.round(b * 1000) / 1000, skill: Math.round((1 - b / 0.25) * 100) / 100, hit: done.filter((e) => (e.pct >= 50) === (res[e.id].outcome === "yes")).length / done.length };
}
