import { readFile } from "node:fs/promises";
import path from "node:path";
import { latestPer, reconcile, fresh, type Crosscheck } from "./crosscheck";

// The trade and investment cross-check as one fact for the evidence base every council reads (server side only: it reads public/data/crosscheck.json), so the agents see every source's figure and where they disagree instead of one IMF series.
let cache: Promise<Crosscheck | null> | null = null;
const load = () => (cache ??= readFile(path.join(process.cwd(), "public/data/crosscheck.json"), "utf8").then((s) => JSON.parse(s) as Crosscheck).catch(() => null));
const usd = (m: number | null | undefined) => (m == null ? "n/a" : Math.abs(m) >= 1000 ? `US$${(m / 1000).toFixed(1)}bn` : `US$${Math.round(m)}m`);
export async function crossFact(iso3: string, name: string): Promise<{ kind: string; text: string; src: string } | null> {
  const c = await load(); if (!c) return null; const y = c.year;
  const t = latestPer(c.trade.countries[iso3]), v = latestPer(c.invest.countries[iso3]).filter((i) => fresh([i], y - 1).length === 1);
  if (!t.length && !v.length) return null; const by = (id: string) => c.sources[id]?.name ?? id;
  const tr = t.length ? `UAE goods trade with ${name}, US$ by source (exports from the UAE / imports into the UAE): ${t.map((i) => `${by(i.s)} (${c.sources[i.s]?.basis}, ${i.y}) ${usd(i.x)} / ${usd(i.m)}`).join("; ")}. Middle of the ${y} figures: exports ${usd(reconcile(t.filter((i) => i.y === y).map((i) => ({ s: i.s, y: i.y, v: i.x }))).median)}, imports ${usd(reconcile(t.filter((i) => i.y === y).map((i) => ({ s: i.s, y: i.y, v: i.m }))).median)}. UAE-reported and partner-reported figures differ legitimately (CIF versus FOB, re-exports credited to other origins, dating); treat a gap as a reason to look, not an error.` : "";
  const inv = v.length ? `UAE direct-investment position with ${name} (year-end stock, US$): ${v.map((i) => `${by(i.s)} (${i.y}) UAE in ${name} ${usd(i.out)}, ${name} in the UAE ${usd(i.in)}`).join("; ")}. Middle of the sources: UAE in ${name} ${usd(reconcile(v.map((i) => ({ s: i.s, y: i.y, v: i.out }))).median)}, ${name} in the UAE ${usd(reconcile(v.map((i) => ({ s: i.s, y: i.y, v: i.in }))).median)}. A zero from the IMF mirror usually means the partner does not report the UAE, not that there is no investment; the IMF's world total (US$${Math.round((c.invest.world.find((w) => w.s === "imf_dip")?.out ?? 0) / 1000)}bn) sits well below UNCTAD's (US$${Math.round((c.invest.world.find((w) => w.s === "unctad_fdi" && w.kind === "stock")?.out ?? 0) / 1000)}bn) because mirror data cover only partners that report.` : "";
  return { kind: "cross-check", text: [tr, inv].filter(Boolean).join(" "), src: "Cross-check of IMF (IMTS, DIP, BOP), UN Comtrade, OECD, Eurostat, UNCTAD, UK ONS, ABS, Statistics Canada, Statistics Norway and the World Bank (Geo Desk crosscheck.json)" };
}
