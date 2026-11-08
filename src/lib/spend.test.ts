// Tests for the spend ledger and the optional spending limit.
import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BudgetError, assertBudget, budgetStatus, readSpend, recordSpend } from "./spend";

const tmp = mkdtempSync(path.join(tmpdir(), "gd-spend-")); const cwd0 = process.cwd(); process.chdir(tmp);
const now = Date.now();

// nothing recorded: no spend, no limit, nothing refused
assert.deepEqual(readSpend(1e12), []);
let b = budgetStatus({}, now); assert.equal(b.spentDay, 0); assert.equal(b.left, null); assert.doesNotThrow(() => assertBudget(1000, {}, now), "with no limit set nothing is ever refused");

// recording: a paid call is kept, a free or invalid one is not
recordSpend({ label: "desk-country-full-C1", model: "claude-sonnet-5-5", usd: 0.2, searches: 4 });
recordSpend({ label: "free", model: "gemini-grounded", usd: 0 }); recordSpend({ label: "bad", model: "x", usd: NaN }); recordSpend({ label: "neg", model: "x", usd: -1 });
assert.equal(readSpend(1e12).length, 1); assert.equal(readSpend(1e12)[0].searches, 4);

// windows: a row from two days ago counts for the month but not for the day; a row from 40 days ago for neither; a damaged line is skipped
const row = (ageDays: number, usd: number) => JSON.stringify({ at: new Date(now - ageDays * 86_400_000).toISOString(), label: "old", model: "m", usd, searches: 0 }) + "\n";
appendFileSync(path.join(tmp, ".cache", "spend.jsonl"), row(2, 1) + row(40, 5) + "{broken\n\n");
b = budgetStatus({}, now); assert.ok(Math.abs(b.spentDay - 0.2) < 1e-9, "only the last 24 hours count for the day"); assert.ok(Math.abs(b.spentMonth - 1.2) < 1e-9, "the last 30 days count for the month, not 40 days ago");

// limits: the tighter of the two applies, and it never goes below zero
b = budgetStatus({ SPEND_DAILY_USD: "1", SPEND_MONTHLY_USD: "1.5" }, now); assert.ok(Math.abs(b.leftDay! - 0.8) < 1e-9 && Math.abs(b.leftMonth! - 0.3) < 1e-9 && Math.abs(b.left! - 0.3) < 1e-9);
assert.equal(budgetStatus({ SPEND_DAILY_USD: "0.1" }, now).left, 0);
assert.equal(budgetStatus({ SPEND_DAILY_USD: "abc", SPEND_MONTHLY_USD: "-3" }, now).left, null, "a bad limit is ignored, not treated as zero");

// the guard: refuses what the money left cannot cover, allows what it can
assert.doesNotThrow(() => assertBudget(0.25, { SPEND_MONTHLY_USD: "1.5" }, now));
assert.throws(() => assertBudget(0.35, { SPEND_MONTHLY_USD: "1.5" }, now), BudgetError);
try { assertBudget(0.9, { SPEND_DAILY_USD: "1" }, now); assert.fail("should refuse"); } catch (e) { assert.ok(e instanceof BudgetError); assert.match((e as Error).message, /0\.90 is needed and US\$0\.80 is left/); }

process.chdir(cwd0);
console.log("spend: all assertions passed");
