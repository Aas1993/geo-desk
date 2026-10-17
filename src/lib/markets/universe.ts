import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Listing } from "./types";
let cached: Promise<Listing[]> | null = null;
/** Server-side: the ADX + DFM universe built by scripts/build-markets.mjs. */
export function universe(): Promise<Listing[]> {
  return (cached ??= (async () => {
    const rows = JSON.parse(await readFile(path.join(process.cwd(), "public/data/markets.json"), "utf8")).rows as Listing[];
    // Optional overlay written by scripts/verify-markets.mjs: which vendor ticker actually has data for each listing.
    let map: Record<string, { vendorSymbol?: string; noVendorData?: boolean }> = {};
    try { map = JSON.parse(await readFile(path.join(process.cwd(), "public/data/vendor-map.json"), "utf8")); } catch {}
    return rows.map((l) => ({ ...l, ...(map[`${l.exchange}:${l.symbol}`] ?? {}) }));
  })());
}
export async function findListing(exchange: string, symbol: string): Promise<Listing | undefined> {
  const ex = exchange.toUpperCase(); const sym = decodeURIComponent(symbol).toUpperCase();
  return (await universe()).find((l) => l.exchange === ex && l.symbol.toUpperCase() === sym);
}
