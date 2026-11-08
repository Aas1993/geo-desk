// Exit codes: 0 = a file really changed, 1 = nothing real changed, 2 = error (a crash must never read as "no changes").
// Volatile fields that change on every rebuild without meaning anything (build stamps, per-run dates, rolling windows) are ignored, at any depth.
// (A line-based `git diff -I` cannot do this: the data files are a single JSON line.)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const VOLATILE = new Set(["built", "at", "fetchedAt", "engagementSince", "flightsBuilt", "visitsBuilt"]);
const strip = (v) => (Array.isArray(v) ? v.map(strip) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, strip(x)])) : v);
const norm = (txt) => JSON.stringify(strip(JSON.parse(txt)));
try {
  let changed = false;
  for (const f of process.argv.slice(2)) {
    let head = null; try { head = execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 64 << 20 }); } catch { /* new file */ }
    const same = head !== null && norm(head) === norm(readFileSync(f, "utf8")); console.log(`${same ? "unchanged" : "CHANGED  "} ${f}`); if (!same) changed = true;
  }
  process.exit(changed ? 0 : 1);
} catch (e) { console.error("data-changed failed:", e.message); process.exit(2); }
