"use client";
export function MiniSpark({ data, w = 84, h = 24 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return null; const lo = Math.min(...data), hi = Math.max(...data), up = data[data.length - 1] >= data[0];
  const x = (i: number) => (i / (data.length - 1)) * (w - 2) + 1, y = (v: number) => (hi === lo ? h / 2 : h - 2 - ((v - lo) / (hi - lo)) * (h - 4));
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ direction: "ltr" }}><path d={data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
/** Position of `value` inside [low, high] — used for the 52-week range. */
export function RangeBar({ low, high, value, compact }: { low: number; high: number; value: number; compact?: boolean }) {
  const pos = high === low ? 50 : Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
  return (
    <div className={compact ? "w-[120px]" : "w-full"} style={{ direction: "ltr" }}>
      <div className="relative h-1.5 rounded-full bg-bg3"><div className="absolute inset-y-0 start-0 rounded-full bg-line2" style={{ width: `${pos}%` }} /><i className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg1 bg-accent" style={{ left: `${pos}%` }} /></div>
      {!compact && <div className="num mt-1.5 flex justify-between text-[11px] text-t2"><span>{low.toFixed(low < 1 ? 3 : 2)}</span><span>{high.toFixed(high < 1 ? 3 : 2)}</span></div>}
    </div>
  );
}

// ───────────────────────── Interactive price chart ─────────────────────────
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { bollinger, ema, macd, rsi, sma } from "@/lib/markets/indicators";
import { price as fmtPrice, big, signed } from "@/lib/markets/format";
import type { Bar } from "@/lib/markets/types";
import type { Lang } from "@/lib/format";
import { useT } from "@/lib/store";

type Num = number | null;
const COLORS = { sma20: "#7ea6cc", sma50: "#d6a74f", sma200: "#c77dd6", bb: "#8d8a7e" };

function axisLabel(t: string, interval: string, lang: Lang) {
  const loc = lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB"; const d = new Date(t.includes(" ") ? t.replace(" ", "T") + "Z" : t + "T00:00:00Z"); if (isNaN(+d)) return t;
  if (interval.endsWith("min")) return new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23" }).format(d);
  if (interval === "1week" || interval === "1month") return new Intl.DateTimeFormat(loc, { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
  return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

function ChartChip({ on, set, label, color }: { on: boolean; set: () => void; label: string; color?: string }) {
  return (
    <button onClick={set} aria-pressed={on} className={`flex items-center gap-1.5 rounded-[5px] border px-2 py-1 text-[11.5px] ${on ? "border-line2 bg-bg2 text-t0" : "border-transparent text-t2 hover:text-t1"}`}>{color && <i className="inline-block h-0.5 w-3 rounded" style={{ background: color, opacity: on ? 1 : 0.4 }} />}{label}</button>
  );
}
export function PriceChart({ full, from, interval, lang }: { full: Bar[]; from: number; interval: string; lang: Lang }) {
  const { t } = useT();
  const [type, setType] = useState<"line" | "candles">("line");
  const [ov, setOv] = useState({ sma20: false, sma50: true, sma200: true, ema: false, bb: false });
  const [pn, setPn] = useState({ vol: true, rsi: false, macd: false });
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null); const [w, setW] = useState(900);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.floor(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);

  const closes = useMemo(() => full.map((b) => b.c), [full]);
  const ind = useMemo(() => ({ sma20: sma(closes, 20), sma50: sma(closes, 50), sma200: sma(closes, 200), ema: ema(closes, 21), bb: bollinger(closes), rsi: rsi(closes), macd: macd(closes) }), [closes]);
  const bars = full.slice(from); const n = bars.length; const off = from;
  if (n < 2) return <div className="grid h-[300px] place-items-center text-[13px] text-t2">—</div>;

  const L = 6, R = 58, W = w, iw = W - L - R; const x = (i: number) => L + ((i + 0.5) / n) * iw; const cw = Math.max(1, Math.min(14, (iw / n) * 0.68));
  const H = { main: 320, vol: pn.vol ? 64 : 0, rsi: pn.rsi ? 96 : 0, macd: pn.macd ? 110 : 0 }; const gap = 10, axisH = 22;
  const panelsOn = [pn.vol, pn.rsi, pn.macd].filter(Boolean).length; const totalH = H.main + H.vol + H.rsi + H.macd + gap * panelsOn + axisH;
  const slice = (a: Num[]) => a.slice(off);
  const overlays: { key: string; color: string; data: Num[]; dash?: string }[] = [];
  if (ov.sma20) overlays.push({ key: "SMA 20", color: COLORS.sma20, data: slice(ind.sma20) });
  if (ov.sma50) overlays.push({ key: "SMA 50", color: COLORS.sma50, data: slice(ind.sma50) });
  if (ov.sma200) overlays.push({ key: "SMA 200", color: COLORS.sma200, data: slice(ind.sma200) });
  if (ov.ema) overlays.push({ key: "EMA 21", color: "#3dd6c6", data: slice(ind.ema) });
  if (ov.bb) { overlays.push({ key: "BB up", color: COLORS.bb, data: slice(ind.bb.up), dash: "4 3" }, { key: "BB low", color: COLORS.bb, data: slice(ind.bb.lo), dash: "4 3" }); }

  let hi = Math.max(...bars.map((b) => b.h)), lo = Math.min(...bars.map((b) => b.l));
  for (const o of overlays) for (const v of o.data) if (v != null) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
  const padY = (hi - lo) * 0.06 || hi * 0.02; hi += padY; lo -= padY;
  const yMain = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H.main - 16);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const up = bars[n - 1].c >= bars[0].c; const lineCol = up ? "var(--up)" : "var(--down)";
  const path = (vals: Num[], y: (v: number) => number) => { let d = ""; vals.forEach((v, i) => { if (v == null) return; d += `${d && vals[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; }); return d; };

  let top = H.main + gap; const volTop = top; if (pn.vol) top += H.vol + gap; const rsiTop = top; if (pn.rsi) top += H.rsi + gap; const macdTop = top; const axisTop = totalH - axisH;
  const vmax = Math.max(...bars.map((b) => b.v), 1);
  const rs = slice(ind.rsi); const yR = (v: number) => rsiTop + 6 + (1 - v / 100) * (H.rsi - 12);
  const mm = { line: slice(ind.macd.line), sig: slice(ind.macd.signal), hist: slice(ind.macd.hist) };
  const mAll = [...mm.line, ...mm.sig, ...mm.hist].filter((v): v is number => v != null); const mHi = Math.max(0.0001, ...mAll), mLo = Math.min(-0.0001, ...mAll); const yM = (v: number) => macdTop + 6 + (1 - (v - mLo) / (mHi - mLo)) * (H.macd - 12);

  const tickIdx = Array.from({ length: Math.min(6, n) }, (_, i) => Math.round((i / Math.max(1, Math.min(6, n) - 1)) * (n - 1)));
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.min(n - 1, Math.max(0, Math.floor(((px - L) / iw) * n)))); };
  const hb = hover != null ? bars[hover] : null; const hp = hover != null && hover > 0 ? bars[hover - 1] : null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1">
        <div className="flex rounded-[6px] bg-bg2 p-0.5">{(["line", "candles"] as const).map((k) => <button key={k} onClick={() => setType(k)} aria-pressed={type === k} className={`rounded-[5px] px-2.5 py-1 text-[11.5px] font-medium ${type === k ? "bg-bg1 text-accent" : "text-t1"}`}>{k === "line" ? t("st_line") : t("st_candles")}</button>)}</div>
        <span className="mx-1 h-4 w-px bg-line" />
        <ChartChip on={ov.sma20} set={() => setOv({ ...ov, sma20: !ov.sma20 })} label="SMA 20" color={COLORS.sma20} /><ChartChip on={ov.sma50} set={() => setOv({ ...ov, sma50: !ov.sma50 })} label="SMA 50" color={COLORS.sma50} /><ChartChip on={ov.sma200} set={() => setOv({ ...ov, sma200: !ov.sma200 })} label="SMA 200" color={COLORS.sma200} />
        <ChartChip on={ov.ema} set={() => setOv({ ...ov, ema: !ov.ema })} label="EMA 21" color="#3dd6c6" /><ChartChip on={ov.bb} set={() => setOv({ ...ov, bb: !ov.bb })} label="Bollinger" color={COLORS.bb} />
        <span className="mx-1 h-4 w-px bg-line" />
        <ChartChip on={pn.vol} set={() => setPn({ ...pn, vol: !pn.vol })} label={t("st_volumeL")} /><ChartChip on={pn.rsi} set={() => setPn({ ...pn, rsi: !pn.rsi })} label="RSI" /><ChartChip on={pn.macd} set={() => setPn({ ...pn, macd: !pn.macd })} label="MACD" />
      </div>
      <div ref={box} className="relative" style={{ direction: "ltr" }}>
        <svg width={W} height={totalH} viewBox={`0 0 ${W} ${totalH}`} role="img" aria-label="Price chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y select-none">
          {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={yMain(v)} y2={yMain(v)} stroke="var(--line)" strokeDasharray="2 4" /><text x={W - R + 6} y={yMain(v) + 3.5} fontSize="10" fill="var(--t2)" className="num">{fmtPrice(v, lang)}</text></g>)}
          {type === "line" && <><path d={`${path(bars.map((b) => b.c), yMain)}L${x(n - 1)},${H.main}L${x(0)},${H.main}Z`} fill={lineCol} opacity=".08" /><path d={path(bars.map((b) => b.c), yMain)} fill="none" stroke={lineCol} strokeWidth="1.8" strokeLinejoin="round" /></>}
          {type === "candles" && bars.map((b, i) => { const c = b.c >= b.o ? "var(--up)" : "var(--down)"; return <g key={i}><line x1={x(i)} x2={x(i)} y1={yMain(b.h)} y2={yMain(b.l)} stroke={c} strokeWidth="1" /><rect x={x(i) - cw / 2} width={cw} y={Math.min(yMain(b.o), yMain(b.c))} height={Math.max(1, Math.abs(yMain(b.o) - yMain(b.c)))} fill={c} /></g>; })}
          {overlays.map((o) => <path key={o.key} d={path(o.data, yMain)} fill="none" stroke={o.color} strokeWidth="1.3" strokeDasharray={o.dash} opacity=".95" />)}
          <line x1={L} x2={W - R} y1={yMain(bars[n - 1].c)} y2={yMain(bars[n - 1].c)} stroke={lineCol} strokeDasharray="1 3" opacity=".7" />
          <g><rect x={W - R + 2} y={yMain(bars[n - 1].c) - 9} width={R - 4} height={18} rx="3" fill={lineCol} /><text x={W - R + 6} y={yMain(bars[n - 1].c) + 3.5} fontSize="10" fontWeight="600" fill="#0a0b0d" className="num">{fmtPrice(bars[n - 1].c, lang)}</text></g>
          {pn.vol && <g>{bars.map((b, i) => <rect key={i} x={x(i) - Math.max(0.5, cw / 2)} width={Math.max(1, cw)} y={volTop + H.vol - (b.v / vmax) * (H.vol - 4)} height={(b.v / vmax) * (H.vol - 4)} fill={b.c >= b.o ? "var(--up)" : "var(--down)"} opacity=".55" />)}<text x={W - R + 6} y={volTop + 10} fontSize="10" fill="var(--t2)">{t("st_volumeL")}</text><text x={W - R + 6} y={volTop + 24} fontSize="10" fill="var(--t2)" className="num">{big(vmax, lang, 1)}</text></g>}
          {pn.rsi && <g><rect x={L} y={yR(70)} width={iw} height={yR(30) - yR(70)} fill="var(--accent)" opacity=".06" />{[30, 70].map((v) => <g key={v}><line x1={L} x2={W - R} y1={yR(v)} y2={yR(v)} stroke="var(--line2)" strokeDasharray="3 3" /><text x={W - R + 6} y={yR(v) + 3.5} fontSize="10" fill="var(--t2)" className="num">{v}</text></g>)}<path d={path(rs, yR)} fill="none" stroke="var(--accent)" strokeWidth="1.5" /><text x={L + 4} y={rsiTop + 12} fontSize="10" fill="var(--t1)">RSI 14</text></g>}
          {pn.macd && <g><line x1={L} x2={W - R} y1={yM(0)} y2={yM(0)} stroke="var(--line2)" />{mm.hist.map((v, i) => v == null ? null : <rect key={i} x={x(i) - Math.max(0.5, cw / 2)} width={Math.max(1, cw)} y={Math.min(yM(v), yM(0))} height={Math.abs(yM(v) - yM(0))} fill={v >= 0 ? "var(--up)" : "var(--down)"} opacity=".5" />)}<path d={path(mm.line, yM)} fill="none" stroke="var(--c2)" strokeWidth="1.4" /><path d={path(mm.sig, yM)} fill="none" stroke="var(--accent)" strokeWidth="1.4" /><text x={L + 4} y={macdTop + 12} fontSize="10" fill="var(--t1)">MACD 12·26·9</text></g>}
          {tickIdx.map((i) => <text key={i} x={Math.min(W - R - 18, Math.max(L + 14, x(i)))} y={axisTop + 15} fontSize="10" textAnchor="middle" fill="var(--t2)">{axisLabel(bars[i].t, interval, lang)}</text>)}
          {hover != null && <g pointerEvents="none"><line x1={x(hover)} x2={x(hover)} y1={0} y2={axisTop} stroke="var(--t2)" strokeDasharray="3 3" /><circle cx={x(hover)} cy={yMain(bars[hover].c)} r="3.5" fill="var(--bg-1)" stroke={lineCol} strokeWidth="2" /></g>}
        </svg>
        {hb && (
          <div className="pointer-events-none absolute start-2 top-2 z-10 rounded-[6px] border border-line2 bg-bg1/95 px-3 py-2 text-[11.5px] shadow-lg" style={{ direction: "ltr" }}>
            <div className="mb-1 font-medium text-t0">{hb.t.length > 10 ? hb.t.slice(0, 16) : hb.t}</div>
            <div className="num grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-t1"><span>O</span><span className="text-t0">{fmtPrice(hb.o, lang)}</span><span>H</span><span className="text-t0">{fmtPrice(hb.h, lang)}</span><span>L</span><span className="text-t0">{fmtPrice(hb.l, lang)}</span><span>C</span><span className="text-t0">{fmtPrice(hb.c, lang)}</span><span>Vol</span><span className="text-t0">{big(hb.v, lang, 1)}</span>
              {hp && <><span>Δ</span><span className={hb.c >= hp.c ? "up" : "down"}>{signed(((hb.c / hp.c) - 1) * 100, lang, 2, "%")}</span></>}
              {overlays.filter((o) => !o.key.startsWith("BB") && o.data[hover!] != null).map((o) => <Fragment key={o.key}><span style={{ color: o.color }}>{o.key}</span><span className="text-t0">{fmtPrice(o.data[hover!] as number, lang)}</span></Fragment>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
