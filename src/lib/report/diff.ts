import { blocksOf } from "./standard";

// WHAT CHANGED SINCE THE LAST REPORT, cheaply: when a product is run again, the page keeps the structured data of the version it replaces (a few kilobytes: only the JSON blocks, never the report text, so the browser's storage is not filled) and this compares the two. It lists what is new, what is gone and which single values moved (the course, the confidence, a risk's impact). It reads names, not meaning: two items with different names are one gone and one new.
export type Moved = { section: string; label: string; from: string; to: string };
export type Diff = { added: { section: string; label: string }[]; removed: { section: string; label: string }[]; moved: Moved[]; same: boolean };
const NAME = ["id", "name", "title", "who", "indicator", "vehicle", "gap", "company", "subject", "initiative", "action", "course", "year", "interest", "country", "issue"];
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const scalar = (v: unknown) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v).trim() : "");
const nameOf = (x: unknown): string => { if (typeof x === "string") return x.trim().slice(0, 120); const o = rec(x); for (const k of NAME) { const v = scalar(o[k]); if (v) return v.slice(0, 120); } return ""; };
/** The JSON blocks of a report, as one short string to keep for the next comparison ("" when it carries none). */
export function keepBlocks(report: string): string { const m = report.match(/<([a-z_0-9]+)>\s*\{[\s\S]*?(?:<\/\1>|$)/g); return m ? m.join("\n").slice(0, 60_000) : ""; }
const flat = (b: Record<string, unknown>[]): Record<string, unknown> => Object.assign({}, ...b);
export function diffBlocks(prevBlocks: string, cur: string): Diff {
  const a = flat(blocksOf(prevBlocks)); const z = flat(blocksOf(cur)); const d: Diff = { added: [], removed: [], moved: [], same: true };
  for (const k of new Set([...Object.keys(a), ...Object.keys(z)])) {
    const x = a[k], y = z[k];
    if (Array.isArray(x) || Array.isArray(y)) { const px = new Map(((x as unknown[]) ?? []).map((i) => [nameOf(i).toLowerCase(), nameOf(i)])); const py = new Map(((y as unknown[]) ?? []).map((i) => [nameOf(i).toLowerCase(), nameOf(i)])); if (!Array.isArray(x) || !Array.isArray(y)) continue;
      for (const [key, label] of py) if (key && !px.has(key)) d.added.push({ section: k, label }); for (const [key, label] of px) if (key && !py.has(key)) d.removed.push({ section: k, label });
      for (const [key] of py) { if (!key || !px.has(key)) continue; const ox = rec((x as unknown[]).find((i) => nameOf(i).toLowerCase() === key)); const oy = rec((y as unknown[]).find((i) => nameOf(i).toLowerCase() === key)); for (const f of ["impact", "confidence", "likelihood", "status", "level", "reversibility", "band", "state", "priority", "progress"]) if (scalar(ox[f]) && scalar(oy[f]) && scalar(ox[f]) !== scalar(oy[f])) d.moved.push({ section: k, label: `${py.get(key)} (${f})`, from: scalar(ox[f]), to: scalar(oy[f]) }); } }
    else if (x && y && typeof x === "object" && typeof y === "object") { const ox = rec(x), oy = rec(y); for (const f of Object.keys(oy)) if (scalar(ox[f]) && scalar(oy[f]) && scalar(ox[f]) !== scalar(oy[f]) && ["course", "confidence", "posture", "status", "stance", "verdict", "level"].includes(f)) d.moved.push({ section: k, label: f, from: scalar(ox[f]), to: scalar(oy[f]) }); }
  }
  d.same = !d.added.length && !d.removed.length && !d.moved.length; return d;
}
/** The key the previous version's blocks are kept under. */
export const prevKey = (storeKey: string) => `${storeKey}:prev`;
export type Prev = { at: string; blocks: string };
export function readPrev(storeKey: string): Prev | null { try { const j = JSON.parse(localStorage.getItem(prevKey(storeKey)) ?? "null") as Prev | null; return j && typeof j.blocks === "string" && typeof j.at === "string" ? j : null; } catch { return null; } }
/** Called just before a run's result replaces what is saved under `storeKey`: keeps the old version's blocks. Never throws (storage may be full or blocked). */
export function keepPrevious(storeKey: string): void { try { const old = JSON.parse(localStorage.getItem(storeKey) ?? "null") as { report?: string; at?: string } | null; if (!old?.report || !old.at) return; const blocks = keepBlocks(old.report); if (blocks) localStorage.setItem(prevKey(storeKey), JSON.stringify({ at: old.at, blocks })); } catch { /* storage full or blocked: no comparison next time */ } }
