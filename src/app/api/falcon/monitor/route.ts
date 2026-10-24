import { readFile } from "node:fs/promises";
import path from "node:path";
import { snapshotOf, type History } from "@/lib/falcon/monitor";
import { worldModel } from "@/lib/falcon/world";

/** The monitoring history (daily snapshots kept by the refresh workflow) and a snapshot of the world model as it is now. Read-only; observed values only. */
export async function GET() {
  try {
    let history: History = { built: "", days: [] }; try { history = JSON.parse(await readFile(path.join(process.cwd(), "public/data/monitor/history.json"), "utf8")) as History; } catch { /* none yet */ }
    const w = await worldModel(); return Response.json({ history, now: snapshotOf(w), asOf: w.asOf, sources: w.sources }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
