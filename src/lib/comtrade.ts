// UN Comtrade public preview API: one period per call, tight rate limit, so calls are serialised, retried and cached in memory.
const BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const UAE = 784;
// ISO-numeric → Comtrade (M49-based) codes where they differ.
const FIX: Record<number, number> = { 840: 842, 250: 251, 380: 381, 578: 579, 756: 757, 356: 699 };
export const comtradeCode = (isoNum: number) => FIX[isoNum] ?? isoNum;

type Rec = { flowCode: string; cmdCode: string; primaryValue: number | null };
const cache = new Map<string, { ts: number; v: Rec[] | null }>();
const TTL = 24 * 3600 * 1000;
let chain: Promise<unknown> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function raw(url: string): Promise<Rec[] | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": "geo-desk/0.1" } });
    const text = await r.text();
    if (r.status === 429 || /Rate limit/i.test(text)) { const m = /in (\d+) second/.exec(text); await sleep(((m ? +m[1] : 3) + 1) * 1000); continue; }
    if (!r.ok) return null;
    try { return (JSON.parse(text).data ?? []) as Rec[]; } catch { return null; }
  }
  return null;
}
function query(reporter: number, partner: number, period: number, cmd: string): Promise<Rec[] | null> {
  const url = `${BASE}?reporterCode=${reporter}&partnerCode=${partner}&period=${period}&cmdCode=${cmd}&flowCode=X,M`;
  const hit = cache.get(url); if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.v);
  const run = chain.then(async () => { const v = await raw(url); if (v) cache.set(url, { ts: Date.now(), v }); await sleep(900); return v; });
  chain = run.catch(() => {}); return run;
}

export type Bilateral = {
  year: number; mirror: boolean; exports: number | null; imports: number | null;
  topExports: { code: string; value: number }[]; topImports: { code: string; value: number }[];
};
const sum = (rows: Rec[], flow: string) => { const v = rows.filter((r) => r.flowCode === flow && r.primaryValue != null); return v.length ? v.reduce((a, r) => a + (r.primaryValue as number), 0) : null; };
const orient = (rows: Rec[], mirror: boolean) => rows.map((r) => ({ ...r, flowCode: mirror ? (r.flowCode === "X" ? "M" : r.flowCode === "M" ? "X" : r.flowCode) : r.flowCode })); // UAE's point of view

async function totalFor(partner: number, year: number, mirror: boolean) {
  const rows = await query(mirror ? partner : UAE, mirror ? UAE : partner, year, "TOTAL");
  return rows && rows.length ? orient(rows, mirror) : null;
}
export async function bilateral(isoNum: number): Promise<Bilateral | null> {
  const partner = comtradeCode(isoNum);
  for (const mirror of [false, true]) {
    for (const year of [2024, 2023, 2022]) {
      const tot = await totalFor(partner, year, mirror);
      if (!tot) continue;
      const ag = (await query(mirror ? partner : UAE, mirror ? UAE : partner, year, "AG2")) ?? [];
      const rows = orient(ag.filter((r) => r.cmdCode !== "TOTAL" && /^\d\d$/.test(r.cmdCode) && r.primaryValue), mirror);
      const top = (f: string) => rows.filter((r) => r.flowCode === f).sort((a, b) => (b.primaryValue as number) - (a.primaryValue as number)).slice(0, 6).map((r) => ({ code: r.cmdCode, value: r.primaryValue as number }));
      return { year, mirror, exports: sum(tot, "X"), imports: sum(tot, "M"), topExports: top("X"), topImports: top("M") };
    }
  }
  return null;
}
export async function trend(isoNum: number, year: number, mirror: boolean) {
  const partner = comtradeCode(isoNum); const out: { y: number; exports: number | null; imports: number | null }[] = [];
  for (let y = year - 1; y >= year - 4; y--) { const t = await totalFor(partner, y, mirror); if (t) out.push({ y, exports: sum(t, "X"), imports: sum(t, "M") }); }
  return out.sort((a, b) => a.y - b.y);
}
