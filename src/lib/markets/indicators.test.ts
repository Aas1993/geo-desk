// Run with: npx tsx src/lib/markets/indicators.test.ts
import assert from "node:assert/strict";
import { sma, ema, rsi, macd, bollinger, atr, periodReturn, ytdReturn, maxDrawdown, volatility, lastOf } from "./indicators";
import type { Bar } from "./types";
const close = (a: number | null, b: number, eps = 1e-6) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} !~ ${b}`);

assert.deepEqual(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
close(ema([1, 2, 3, 4, 5], 3)[4], 4); // seed 2, k=.5 → 3 → 4

// RSI: the classic Wilder worked example — 15 closes, first RSI at index 14
const w = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
close(rsi(w, 14)[14], 70.46, 0.1);
assert.equal(lastOf(rsi(Array.from({ length: 30 }, (_, i) => i + 1))), 100);

const px = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 5) * 5 + i * 0.1);
const m = macd(px); close(m.hist[70], (m.line[70] as number) - (m.signal[70] as number));

const b = bollinger(Array(30).fill(10)); close(b.up[29], 10); close(b.lo[29], 10);

const bars: Bar[] = Array.from({ length: 30 }, (_, k) => ({ t: `2026-01-${String(k + 1).padStart(2, "0")}`, o: 10, h: 11, l: 9, c: 10, v: 100 }));
close(lastOf(atr(bars, 14)), 2);

const s: Bar[] = [100, 110, 90, 99].map((c, k) => ({ t: `2026-01-0${k + 1}`, o: c, h: c, l: c, c, v: 1 }));
close(periodReturn(s, 3), -0.01); close(maxDrawdown(s)!.dd, 90 / 110 - 1);
const ys: Bar[] = [{ t: "2025-12-30", o: 50, h: 50, l: 50, c: 50, v: 1 }, { t: "2026-01-02", o: 55, h: 55, l: 55, c: 55, v: 1 }, { t: "2026-03-02", o: 60, h: 60, l: 60, c: 60, v: 1 }];
close(ytdReturn(ys), 0.2);
assert.equal(volatility(s, 60), null);
console.log("indicators: all assertions passed");
