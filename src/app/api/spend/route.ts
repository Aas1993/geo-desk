import { budgetStatus, readSpend } from "@/lib/spend";

// What the paid model calls have cost (the ledger in .cache/spend.jsonl) and what is left under the optional limits. Read-only.
export async function GET() {
  const month = readSpend(30 * 86_400_000); const by = new Map<string, { usd: number; calls: number }>();
  for (const r of month) { const k = r.label.replace(/^(desk-[a-z-]+)-[A-Za-z0-9]+$/, "$1"); const x = by.get(k) ?? { usd: 0, calls: 0 }; x.usd += r.usd; x.calls++; by.set(k, x); }
  return Response.json({ ...budgetStatus(), byProduct: [...by.entries()].map(([label, v]) => ({ label, usd: +v.usd.toFixed(4), calls: v.calls })).sort((a, b) => b.usd - a.usd).slice(0, 20), recent: month.slice(-15).reverse() });
}
