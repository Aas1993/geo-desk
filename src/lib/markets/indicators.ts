import type { Bar } from "./types";
// Pure, dependency-free technical indicator maths. Every function returns an array aligned to its input (null until enough data).
export type Num = number | null;
const pad = (n: number): Num[] => Array(n).fill(null);

export function sma(x: number[], n: number): Num[] {
  const out = pad(x.length); let s = 0;
  for (let i = 0; i < x.length; i++) { s += x[i]; if (i >= n) s -= x[i - n]; if (i >= n - 1) out[i] = s / n; }
  return out;
}
export function ema(x: number[], n: number): Num[] {
  const out = pad(x.length); if (x.length < n) return out; const k = 2 / (n + 1);
  let prev = x.slice(0, n).reduce((a, b) => a + b, 0) / n; out[n - 1] = prev;
  for (let i = n; i < x.length; i++) { prev = x[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
}
/** Wilder's RSI. */
export function rsi(c: number[], n = 14): Num[] {
  const out = pad(c.length); if (c.length <= n) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n; out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}
export function macd(c: number[], fast = 12, slow = 26, sig = 9) {
  const ef = ema(c, fast), es = ema(c, slow);
  const line: Num[] = c.map((_, i) => (ef[i] != null && es[i] != null ? (ef[i] as number) - (es[i] as number) : null));
  const first = line.findIndex((v) => v != null); const signal = pad(c.length);
  if (first >= 0) { const e = ema(line.slice(first) as number[], sig); e.forEach((v, i) => (signal[first + i] = v)); }
  const hist: Num[] = line.map((v, i) => (v != null && signal[i] != null ? v - (signal[i] as number) : null));
  return { line, signal, hist };
}
export function bollinger(c: number[], n = 20, k = 2) {
  const mid = sma(c, n); const up = pad(c.length), lo = pad(c.length);
  for (let i = n - 1; i < c.length; i++) { const m = mid[i] as number; let v = 0; for (let j = i - n + 1; j <= i; j++) v += (c[j] - m) ** 2; const sd = Math.sqrt(v / n); up[i] = m + k * sd; lo[i] = m - k * sd; }
  return { mid, up, lo };
}
/** Wilder's ATR. */
export function atr(b: Bar[], n = 14): Num[] {
  const out = pad(b.length); if (b.length <= n) return out;
  const tr = b.map((x, i) => (i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c))));
  let a = tr.slice(1, n + 1).reduce((p, q) => p + q, 0) / n; out[n] = a;
  for (let i = n + 1; i < b.length; i++) { a = (a * (n - 1) + tr[i]) / n; out[i] = a; }
  return out;
}
export function stochastic(b: Bar[], n = 14, d = 3) {
  const k = pad(b.length);
  for (let i = n - 1; i < b.length; i++) { let hh = -Infinity, ll = Infinity; for (let j = i - n + 1; j <= i; j++) { hh = Math.max(hh, b[j].h); ll = Math.min(ll, b[j].l); } k[i] = hh === ll ? 50 : ((b[i].c - ll) / (hh - ll)) * 100; }
  const first = k.findIndex((v) => v != null); const dd = pad(b.length);
  if (first >= 0) sma(k.slice(first) as number[], d).forEach((v, i) => (dd[first + i] = v));
  return { k, d: dd };
}
export const lastOf = (x: Num[]): Num => { for (let i = x.length - 1; i >= 0; i--) if (x[i] != null) return x[i]; return null; };

/** Simple return over the last `days` bars. */
export function periodReturn(b: Bar[], days: number): Num { if (b.length <= days) return null; const p = b[b.length - 1 - days].c; return p ? b[b.length - 1].c / p - 1 : null; }
export function ytdReturn(b: Bar[]): Num {
  if (!b.length) return null; const y = b[b.length - 1].t.slice(0, 4);
  const prev = [...b].reverse().find((x) => x.t.slice(0, 4) < y); const base = prev?.c ?? b.find((x) => x.t.startsWith(y))?.o;
  return base ? b[b.length - 1].c / base - 1 : null;
}
/** Annualised volatility from daily log returns (252 trading days). */
export function volatility(b: Bar[], days = 60): Num {
  if (b.length < days + 1) return null; const r: number[] = [];
  for (let i = b.length - days; i < b.length; i++) r.push(Math.log(b[i].c / b[i - 1].c));
  const m = r.reduce((a, c) => a + c, 0) / r.length; const v = r.reduce((a, c) => a + (c - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(252);
}
export function maxDrawdown(b: Bar[]): { dd: number; peak: string; trough: string } | null {
  if (b.length < 2) return null; let peak = b[0], worst = 0, pk = b[0].t, tr = b[0].t;
  for (const x of b) { if (x.c > peak.c) peak = x; const dd = x.c / peak.c - 1; if (dd < worst) { worst = dd; pk = peak.t; tr = x.t; } }
  return { dd: worst, peak: pk, trough: tr };
}
export type Reading = { name: string; value: string; signal: "bullish" | "bearish" | "neutral"; note: string };
/** A plain-language read of the standard indicators. Descriptive only — not a recommendation. */
export function technicalReadings(b: Bar[]): { readings: Reading[]; counts: { bullish: number; bearish: number; neutral: number } } {
  const c = b.map((x) => x.c); const last = c[c.length - 1]; const out: Reading[] = [];
  const fmt = (n: number, d = 2) => n.toFixed(d);
  const add = (r: Reading) => out.push(r);
  for (const n of [20, 50, 200]) { const v = lastOf(sma(c, n)); if (v != null) add({ name: `SMA ${n}`, value: fmt(v), signal: last > v ? "bullish" : "bearish", note: last > v ? `Price is above its ${n}-day average` : `Price is below its ${n}-day average` }); }
  const e12 = lastOf(ema(c, 12)), e26 = lastOf(ema(c, 26));
  if (e12 != null && e26 != null) add({ name: "EMA 12/26", value: `${fmt(e12)} / ${fmt(e26)}`, signal: e12 > e26 ? "bullish" : "bearish", note: e12 > e26 ? "Short EMA above long EMA" : "Short EMA below long EMA" });
  const r = lastOf(rsi(c, 14));
  if (r != null) add({ name: "RSI (14)", value: fmt(r, 1), signal: r > 70 ? "bearish" : r < 30 ? "bullish" : "neutral", note: r > 70 ? "Overbought territory (>70)" : r < 30 ? "Oversold territory (<30)" : "Between 30 and 70" });
  const m = macd(c); const ml = lastOf(m.line), ms = lastOf(m.signal);
  if (ml != null && ms != null) add({ name: "MACD (12,26,9)", value: `${fmt(ml, 3)} / ${fmt(ms, 3)}`, signal: ml > ms ? "bullish" : "bearish", note: ml > ms ? "MACD line above signal" : "MACD line below signal" });
  const bb = bollinger(c); const bu = lastOf(bb.up), bl = lastOf(bb.lo);
  if (bu != null && bl != null) add({ name: "Bollinger (20,2)", value: `${fmt(bl)} – ${fmt(bu)}`, signal: last > bu ? "bearish" : last < bl ? "bullish" : "neutral", note: last > bu ? "Price above upper band" : last < bl ? "Price below lower band" : "Price inside the bands" });
  const st = stochastic(b); const k = lastOf(st.k);
  if (k != null) add({ name: "Stochastic %K", value: fmt(k, 1), signal: k > 80 ? "bearish" : k < 20 ? "bullish" : "neutral", note: k > 80 ? "Above 80" : k < 20 ? "Below 20" : "Between 20 and 80" });
  const counts = { bullish: 0, bearish: 0, neutral: 0 }; for (const x of out) counts[x.signal]++;
  return { readings: out, counts };
}
