// DFM's open disclosure ("efsah") feed. Quirks verified in the Pulse project (see StockApp/src/lib/dfm/client.ts):
// BOM-prefixed UTF-8, dates like "Oct 16, 2026 07:17:35 PM" (Asia/Dubai, UTC+4), page size capped at 20,
// and unknown parameters are silently ignored — so we always check that returned rows match the requested symbol.
import type { Filing } from "./types";
const API = "https://api2.dfm.ae/efsah/v1"; const DOCS = "https://feeds.dfm.ae/documents";

async function getJson<T>(url: string): Promise<T> {
  let last = "";
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(25_000), next: { revalidate: 600 } });
      if (r.ok) { const t = new TextDecoder("utf-8").decode(await r.arrayBuffer()).replace(/^﻿/, ""); if (t.trim()) { try { return JSON.parse(t) as T; } catch { last = "truncated body"; } } else last = "empty body"; }
      else if (r.status < 500 && r.status !== 429) throw new Error(`DFM ${r.status}`); else last = `HTTP ${r.status}`;
    } catch (e) { last = (e as Error).message; }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
  throw new Error(`DFM feed failed: ${last}`);
}
export function parseDfmDate(s: string): string {
  const m = s.trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i); if (!m) return s;
  const mo = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[1].toLowerCase()); let h = Number(m[4]) % 12; if (m[7].toUpperCase() === "PM") h += 12;
  return new Date(Date.UTC(+m[3], mo, +m[2], h - 4, +m[5], +m[6])).toISOString();
}
const encPath = (p: string) => p.split("/").map(encodeURIComponent).join("/");
type Raw = { id: string; publication_date: string; headline: string; issuer_symbol: string; announcement_type: string | null; integrated_period: string | null; report_interval: string | null; dividends_payment_date: string | null; resources: { id: string; description: string; r_path: string; language: string | null; type: string | null; category: string | null }[] | null };

export async function filings(feedSymbol: string, skip = 0): Promise<{ total: number; items: Filing[] }> {
  const q = (extra: string) => `${API}/${extra}`;
  const sym = encodeURIComponent(feedSymbol);
  const [count, page] = await Promise.all([
    getJson<{ root?: { count: number }[] }>(q(`efsah_count?lang=en&symbol=${sym}`)),
    getJson<{ root?: Raw[] }>(q(`prototype_efsah?lang=en&symbol=${sym}&take=20&skip=${skip}&cms_resources=true`)),
  ]);
  const items = (page.root ?? []).filter((r) => r.issuer_symbol === feedSymbol).map((r): Filing => ({
    id: r.id, date: parseDfmDate(r.publication_date), headline: r.headline, type: r.announcement_type, period: r.integrated_period ?? r.report_interval, dividendsPaymentDate: r.dividends_payment_date,
    docs: (r.resources ?? []).map((d) => ({ id: d.id, description: d.description, url: `${DOCS}${encPath(d.r_path.startsWith("/") ? d.r_path : "/" + d.r_path)}`, language: d.language, type: d.type, category: d.category })),
  }));
  return { total: count.root?.[0]?.count ?? 0, items };
}
