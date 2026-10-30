// THE BROWSER'S STORAGE, WATCHED. Every council product is kept in this browser (about 150 KB each), and a browser allows roughly five million characters per site, so a desk that works on many countries will one day fill it and a save will fail. This measures how full it is and lists the large saved products (largest first) so the person can free space on purpose, instead of finding out when a paid run cannot be saved. The PDF Archive is in IndexedDB, a separate store, and is not counted here.
export const QUOTA_CHARS = 5_000_000; export const WARN_AT = 0.7; export const BIG = 20_000;
export type Item = { key: string; chars: number; at: string | null; label: { en: string; ar: string } };
const LABELS: [RegExp, (m: RegExpExecArray) => { en: string; ar: string }][] = [
  [/^gd-desk:(king-council|mofa-council|emb-intel|emb-plan|country-full|president-brief|council-challenge):([A-Z]{3})$/, (m) => ({ en: `${({ "king-council": "THE KING", "mofa-council": "Ministry", "emb-intel": "Embassy intelligence", "emb-plan": "Mission plans", "country-full": "Country brief", "president-brief": "President's brief", "council-challenge": "Council challenge" } as Record<string, string>)[m[1]]} · ${m[2]}`, ar: `${({ "king-council": "القرار النهائي", "mofa-council": "الوزارة", "emb-intel": "استخبارات السفارة", "emb-plan": "خطط البعثة", "country-full": "موجز الدولة", "president-brief": "موجز الرئيس", "council-challenge": "تحدّي المجالس" } as Record<string, string>)[m[1]]} · ${m[2]}` })],
  [/^gd-case-council:([A-Z]{3})$/, (m) => ({ en: `Strategic Council · ${m[1]}`, ar: `المجلس الاستراتيجي · ${m[1]}` })], [/^gd-case-architect:([A-Z]{3})$/, (m) => ({ en: `Architect · ${m[1]}`, ar: `المهندس · ${m[1]}` })],
  [/^gd-council:([A-Z]{3})$/, (m) => ({ en: `Falcon Council · ${m[1]}`, ar: `مجلس الصقر · ${m[1]}` })], [/^gd-scouncil:([A-Z]{3})$/, (m) => ({ en: `Machiavellian council · ${m[1]}`, ar: `المجلس الميكيافيلي · ${m[1]}` })],
  [/^gd-deep-council:([A-Z]{3}):(\w+)$/, (m) => ({ en: `Deep Intelligence · ${m[1]}`, ar: `الاستخبارات المعمّقة · ${m[1]}` })], [/^gd-bird-audit:([A-Z]{3})$/, (m) => ({ en: `Bird's eye audit · ${m[1]}`, ar: `تدقيق نظرة الطائر · ${m[1]}` })],
  [/^gd-desk-dir:(king|embassy|mofa):([A-Z]{3})$/, (m) => ({ en: `Directives (${m[1]}) · ${m[2]}`, ar: `توجيهات (${m[1]}) · ${m[2]}` })],
];
/** Only these are offered for deletion: products that a council can write again. Everything else (decisions, progress, settings, notes) is never listed. */
export const labelOf = (key: string): Item["label"] | null => { for (const [re, f] of LABELS) { const m = re.exec(key); if (m) return f(m); } return null; };
export function measure(store: Pick<Storage, "length" | "key" | "getItem"> = localStorage): { chars: number; share: number; items: Item[] } {
  let chars = 0; const items: Item[] = [];
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (!k) continue; const v = store.getItem(k) ?? ""; chars += k.length + v.length; const label = labelOf(k); if (label && v.length >= BIG) { let at: string | null = null; try { const j = JSON.parse(v) as { at?: unknown } | unknown[]; at = !Array.isArray(j) && typeof j?.at === "string" ? j.at : null; } catch { /* a damaged entry is still listed by size */ } items.push({ key: k, chars: v.length, at, label }); } }
  return { chars, share: chars / QUOTA_CHARS, items: items.sort((a, z) => z.chars - a.chars) };
}
export const fmtChars = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : `${Math.max(1, Math.round(n / 1e3))} K`);
