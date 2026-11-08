import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

// A ledger of what the paid model calls cost, and an optional spending limit. Every finished call is appended to .cache/spend.jsonl (not committed); a limit is set with SPEND_DAILY_USD (the last 24 hours) and/or SPEND_MONTHLY_USD (the last 30 days).
// With no limit set nothing is ever refused, which is how the app behaved before. With a limit, a new call or product is refused once the money left would not cover it. Calls that run in parallel can overshoot by about one product (under US$1), because each is checked as it starts.
const file = () => path.join(process.cwd(), ".cache", "spend.jsonl");
export type SpendRow = { at: string; label: string; model: string; usd: number; searches: number };
const DAY = 86_400_000;
/** Records one finished call. A zero, negative or non-numeric cost (a free model) is not recorded; a write failure never fails the call. */
export function recordSpend(r: { label: string; model: string; usd: number; searches?: number }): void {
  if (!(r.usd > 0) || !Number.isFinite(r.usd) || process.env.GD_NO_LEDGER === "1") return; // GD_NO_LEDGER=1: tests that run the engine against a mock must not write to the real ledger
  try { mkdirSync(path.dirname(file()), { recursive: true }); appendFileSync(file(), JSON.stringify({ at: new Date().toISOString(), label: r.label, model: r.model, usd: Math.round(r.usd * 1e6) / 1e6, searches: r.searches ?? 0 }) + "\n"); } catch { /* the ledger is a convenience */ }
}
/** The rows no older than `sinceMs` before `now`. A damaged line is skipped. */
export function readSpend(sinceMs: number, now = Date.now()): SpendRow[] {
  try {
    if (!existsSync(file())) return [];
    return readFileSync(file(), "utf8").split("\n").flatMap((l) => { if (!l.trim()) return []; try { const r = JSON.parse(l) as SpendRow; return Number.isFinite(r.usd) && now - Date.parse(r.at) <= sinceMs ? [r] : []; } catch { return []; } });
  } catch { return []; }
}
const pos = (v: string | undefined) => { const n = Number(v); return v && Number.isFinite(n) && n > 0 ? n : null; };
export type Budget = { spentDay: number; spentMonth: number; limitDay: number | null; limitMonth: number | null; leftDay: number | null; leftMonth: number | null; left: number | null };
export function budgetStatus(env: Record<string, string | undefined> = process.env, now = Date.now()): Budget {
  const rows = readSpend(30 * DAY, now); const sum = (r: SpendRow[]) => r.reduce((a, x) => a + x.usd, 0);
  const spentDay = sum(rows.filter((r) => now - Date.parse(r.at) <= DAY)), spentMonth = sum(rows);
  const limitDay = pos(env.SPEND_DAILY_USD), limitMonth = pos(env.SPEND_MONTHLY_USD);
  const leftDay = limitDay == null ? null : Math.max(0, limitDay - spentDay), leftMonth = limitMonth == null ? null : Math.max(0, limitMonth - spentMonth);
  const lefts = [leftDay, leftMonth].filter((x): x is number => x != null);
  return { spentDay, spentMonth, limitDay, limitMonth, leftDay, leftMonth, left: lefts.length ? Math.min(...lefts) : null };
}
export class BudgetError extends Error { constructor(public status: Budget, public need: number) { super(`The spending limit would be passed: about US$${need.toFixed(2)} is needed and US$${(status.left ?? 0).toFixed(2)} is left (SPEND_DAILY_USD / SPEND_MONTHLY_USD).`); } }
/** Throws a BudgetError if a limit is set and the money left is less than the estimate. */
export function assertBudget(estimateUsd: number, env: Record<string, string | undefined> = process.env, now = Date.now()): void {
  const b = budgetStatus(env, now); if (b.left != null && b.left < estimateUsd) throw new BudgetError(b, estimateUsd);
}
