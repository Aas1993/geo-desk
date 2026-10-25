import { loadCase } from "@/lib/case/load";
import { boardRow, type BoardRow } from "@/lib/case/board";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const maxDuration = 60;
/** Every country's headline readings, from the same buildCase each Case File uses, computed once and cached for five minutes. Free: no model is called. */
export async function GET() {
  try {
    const list = JSON.parse(await readFile(path.join(process.cwd(), "public/data/countries.json"), "utf8")) as { iso3: string }[];
    const cs = await Promise.all(list.filter((c) => c.iso3 !== "ARE").map((c) => loadCase(c.iso3)));
    const rows: BoardRow[] = cs.filter((c): c is NonNullable<typeof c> => !!c).map(boardRow);
    return Response.json({ asOf: new Date().toISOString(), rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return Response.json({ error: "board_failed", message: e instanceof Error ? e.message.slice(0, 120) : "error" }, { status: 500 }); }
}
