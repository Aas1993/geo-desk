import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

// The finished council products kept on disk as well as in memory, so a server restart (or a second server) no longer makes you pay again for a product you already hold. Same time limit as the memory cache, so nothing is served staler than before;
// a request for a fresh run (refresh) skips it. The files are plain JSON under .cache/desk (not committed).
const dir = () => path.join(process.cwd(), ".cache", "desk");
const file = (key: string) => path.join(dir(), createHash("sha1").update(key).digest("hex") + ".json");
const KEEP = 60;
/** A saved product that is no older than `ttlMs`, or null. A damaged or missing file is simply a miss. */
export function diskGet<T extends { at: string }>(key: string, ttlMs: number): T | null {
  try { const f = file(key); if (!existsSync(f)) return null; const v = JSON.parse(readFileSync(f, "utf8")) as { key: string; value: T }; if (v.key !== key || !(Date.now() - Date.parse(v.value.at) < ttlMs)) return null; return v.value; } catch { return null; }
}
/** Saves a product, then keeps only the newest KEEP files. A failure to write never fails the run. */
export function diskSet<T extends { at: string }>(key: string, value: T): void {
  try {
    mkdirSync(dir(), { recursive: true }); writeFileSync(file(key), JSON.stringify({ key, value }));
    const all = readdirSync(dir()).filter((n) => n.endsWith(".json")).map((n) => ({ n, t: statSync(path.join(dir(), n)).mtimeMs })).sort((a, b) => b.t - a.t);
    for (const x of all.slice(KEEP)) unlinkSync(path.join(dir(), x.n));
  } catch { /* the disk is a convenience, not a requirement */ }
}
