// Takes today's monitoring snapshot of the Falcon Eye world model and appends it to public/data/monitor/history.json (90 days kept).
// Usage: npx tsx scripts/snapshot-monitor.ts   (run after the other builders; the refresh workflow does this daily)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendSnapshot, snapshotOf, type History } from "../src/lib/falcon/monitor";
import { worldModel } from "../src/lib/falcon/world";

(async () => {
  const w = await worldModel(); if (w.countries.length < 150) { console.error("world model looks thin: not writing"); process.exit(1); }
  const f = new URL("../public/data/monitor/history.json", import.meta.url); let h: History | null = null; try { h = JSON.parse(readFileSync(f, "utf8")) as History; } catch { /* first snapshot */ }
  const next = appendSnapshot(h, snapshotOf(w)); mkdirSync(new URL("../public/data/monitor/", import.meta.url), { recursive: true }); writeFileSync(f, JSON.stringify(next));
  const last = next.days.at(-1)!; console.log(`snapshot ${last.d}: ${last.n} countries, ${last.w} warnings (${last.sev3} severe), sources ${JSON.stringify(last.src)}; ${next.days.length} day(s) in history`);
})();
