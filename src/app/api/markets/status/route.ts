import { connection } from "next/server";
import { fixturesOn, keyConfigured } from "@/lib/markets/source";
export async function GET() {
  await connection(); // read env at request time, not build time
  return Response.json({ provider: "twelvedata", keyConfigured: keyConfigured(), fixtures: fixturesOn() }, { headers: { "Cache-Control": "no-store" } });
}
