import type { Lang } from "@/lib/format";
const loc = (l: Lang) => (l === "ar" ? "ar-AE-u-nu-latn" : "en-US");
export const dash = "—";
/** UAE ticks: 0.001 AED under 1 AED, 0.01 above — so show 3 decimals under 1 AED. */
export function price(n: number | null | undefined, l: Lang) { if (n == null) return dash; return new Intl.NumberFormat(loc(l), { minimumFractionDigits: n < 1 ? 3 : 2, maximumFractionDigits: n < 1 ? 3 : 2 }).format(n); }
export function signed(n: number | null | undefined, l: Lang, d = 2, suffix = "") { if (n == null) return dash; return (n > 0 ? "+" : n < 0 ? "−" : "") + new Intl.NumberFormat(loc(l), { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(n)) + suffix; }
/** Percent from a fraction (0.1234 → 12.34%). */
export function frac(n: number | null | undefined, l: Lang, d = 1, sign = false) { if (n == null) return dash; const v = n * 100; return sign ? signed(v, l, d, "%") : new Intl.NumberFormat(loc(l), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) + "%"; }
export function big(n: number | null | undefined, l: Lang, d = 2) { if (n == null) return dash; return new Intl.NumberFormat(loc(l), { notation: "compact", maximumFractionDigits: Math.abs(n) >= 1e6 ? d : 0 }).format(n); }
export function money(n: number | null | undefined, l: Lang, cur = "AED") { return n == null ? dash : `${cur} ${big(n, l)}`; }
export function ratio(n: number | null | undefined, l: Lang, d = 2, suffix = "") { return n == null ? dash : new Intl.NumberFormat(loc(l), { minimumFractionDigits: d, maximumFractionDigits: d }).format(n) + suffix; }
export function intl(n: number | null | undefined, l: Lang) { return n == null ? dash : new Intl.NumberFormat(loc(l), { maximumFractionDigits: 0 }).format(n); }
export function dateShort(s: string | null | undefined, l: Lang) { if (!s) return dash; const d = new Date(s.length === 10 ? s + "T00:00:00Z" : s); return isNaN(+d) ? s : new Intl.DateTimeFormat(loc(l), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d); }
export const dir = (n: number | null | undefined) => (n == null || n === 0 ? "" : n > 0 ? "up" : "down");

/** UAE equity sessions: Mon–Fri, 10:00–15:00 Asia/Dubai. Holidays are not modelled; the vendor's own flag wins when present. */
/** Trading session of the UAE markets (Mon-Fri 10:00-15:00 GST) or, with "QSE", Qatar's (Sun-Thu 09:30-13:15 AST: continuous trading to 13:00, then the closing auction). Approximate: holidays are not modelled. */
export function sessionState(now: Date, market: "UAE" | "QSE" = "UAE"): { open: boolean; label: "open" | "closed"; nextChange: string } {
  const q = market === "QSE";
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: q ? "Asia/Qatar" : "Asia/Dubai", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const wd = p.find((x) => x.type === "weekday")!.value; const mins = +p.find((x) => x.type === "hour")!.value * 60 + +p.find((x) => x.type === "minute")!.value;
  const weekday = !(q ? ["Fri", "Sat"] : ["Sat", "Sun"]).includes(wd); const from = q ? 570 : 600, to = q ? 795 : 900; const open = weekday && mins >= from && mins < to;
  return { open, label: open ? "open" : "closed", nextChange: q ? (open ? "13:15 AST" : "09:30 AST") : open ? "15:00 GST" : "10:00 GST" };
}
