import type { Series } from "./types";
export type Lang = "en" | "ar";
const loc = (l: Lang) => (l === "ar" ? "ar-AE-u-nu-latn" : "en-US");

export function compact(n: number | null | undefined, l: Lang, digits = 1) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat(loc(l), { notation: "compact", maximumFractionDigits: digits }).format(n);
}
export function usd(n: number | null | undefined, l: Lang) {
  if (n == null) return "—";
  const a = Math.abs(n);
  return "$" + compact(n, l, a >= 1e12 ? 2 : a >= 1e10 ? 0 : 1);
}
export function int(n: number | null | undefined, l: Lang) {
  return n == null ? "—" : new Intl.NumberFormat(loc(l), { maximumFractionDigits: 0 }).format(n);
}
export function pct(n: number | null | undefined, l: Lang, d = 1) {
  return n == null ? "—" : new Intl.NumberFormat(loc(l), { maximumFractionDigits: d, minimumFractionDigits: d }).format(n) + "%";
}
export const last = (s?: Series) => (s && s.length ? s[s.length - 1] : null);
export function ago(ts: number, l: Lang) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  const rtf = new Intl.RelativeTimeFormat(loc(l), { numeric: "auto", style: "narrow" });
  if (m < 60) return rtf.format(-m, "minute");
  if (m < 1440) return rtf.format(-Math.round(m / 60), "hour");
  return rtf.format(-Math.round(m / 1440), "day");
}
export function wmoLabel(code: number | null) {
  if (code == null) return { icon: "·", en: "—", ar: "—" };
  if (code === 0) return { icon: "☀️", en: "Clear", ar: "صافٍ" };
  if (code <= 3) return { icon: "⛅", en: "Partly cloudy", ar: "غائم جزئياً" };
  if (code <= 48) return { icon: "🌫️", en: "Fog", ar: "ضباب" };
  if (code <= 67) return { icon: "🌧️", en: "Rain", ar: "مطر" };
  if (code <= 77) return { icon: "❄️", en: "Snow", ar: "ثلج" };
  if (code <= 82) return { icon: "🌦️", en: "Showers", ar: "زخات" };
  return { icon: "⛈️", en: "Storm", ar: "عاصفة" };
}
