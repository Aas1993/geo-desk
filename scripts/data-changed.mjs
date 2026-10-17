// Exits 0 when any given data file differs from HEAD once the volatile "built" timestamp is ignored, 1 when nothing real changed.
// (A line-based `git diff -I` cannot do this: the data files are a single JSON line.)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const strip = (txt) => { const j = JSON.parse(txt); delete j.built; return JSON.stringify(j); };
let changed = false;
for (const f of process.argv.slice(2)) {
  let head = null; try { head = execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 64 << 20 }); } catch { /* new file */ }
  const same = head !== null && strip(head) === strip(readFileSync(f, "utf8")); console.log(`${same ? "unchanged" : "CHANGED  "} ${f}`); if (!same) changed = true;
}
process.exit(changed ? 0 : 1);
