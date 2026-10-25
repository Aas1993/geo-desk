// The Case File's two paid products as they are kept in this browser, read back for the views and the report builder. Client-side only.
export type SavedProduct = { report: string; at: string; usd: number | null; lang: "en" | "ar" | null; cached: boolean };
export const councilKey = (iso: string) => `gd-case-council:${iso}`;
export const architectKey = (iso: string) => `gd-case-architect:${iso}`;
export function readProduct(key: string): SavedProduct | null {
  try { const s = localStorage.getItem(key); if (!s) return null; const j = JSON.parse(s) as { report?: string; at?: string; usage?: { usd?: number | null }; options?: { lang?: string }; cached?: boolean }; if (!j.report) return null; return { report: j.report, at: j.at ?? "", usd: j.usage?.usd ?? null, lang: j.options?.lang === "ar" ? "ar" : j.options?.lang === "en" ? "en" : null, cached: !!j.cached }; } catch { return null; }
}
export const ambassadorKey = (iso: string) => `gd-case-ambassador:${iso}`;
