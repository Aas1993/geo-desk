import { cached } from "@/lib/layers/cache";
import { parseRss } from "@/lib/rss";
import type { Item } from "./types";

// Several big think tanks block bots from their own feeds, so pieces are found the way a reader would: a Google News search restricted to their sites.
export const TANKS: Record<string, string> = {
  "cfr.org": "Council on Foreign Relations", "carnegieendowment.org": "Carnegie Endowment", "chathamhouse.org": "Chatham House", "brookings.edu": "Brookings", "atlanticcouncil.org": "Atlantic Council",
  "mei.edu": "Middle East Institute", "washingtoninstitute.org": "Washington Institute", "csis.org": "CSIS", "rand.org": "RAND", "crisisgroup.org": "Crisis Group", "iiss.org": "IISS", "agsiw.org": "AGSIW",
  "ecfr.eu": "ECFR", "stimson.org": "Stimson Center", "gulfresearchcenter.org": "Gulf Research Center", "trendsresearch.org": "TRENDS Research", "orfonline.org": "ORF", "lowyinstitute.org": "Lowy Institute",
};
const nameOf = (title: string) => { const i = title.lastIndexOf(" - "); return i > 0 ? { title: title.slice(0, i), outlet: title.slice(i + 3) } : { title, outlet: "" }; };

export const UAE_TERMS = ["United Arab Emirates", "UAE", "Emirati", "Emirates", "Abu Dhabi", "Dubai"];
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Recent think-tank pieces whose TITLE names the subject, newest first. A plain search matches the name anywhere on the page (menus, related links), which fills the list with unrelated work, so titles are required to match. */
export const thinkTankItems = (terms: string[], prefix: string) => cached<Item[]>(`tanks:${terms.join("|")}`, 3_600_000, async () => {
  const sites = Object.keys(TANKS).map((d) => `site:${d}`).join(" OR "); const named = terms.map((t) => `intitle:"${t}"`).join(" OR ");
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`(${named}) when:180d (${sites})`)}&hl=en&gl=US&ceid=US:en`;
  const r = await fetch(url, { headers: { "User-Agent": "geo-desk/0.1" }, signal: AbortSignal.timeout(20_000), cache: "no-store" }); if (!r.ok) throw new Error("think-tank search " + r.status);
  const re = new RegExp(`\\b(${terms.map(esc).join("|")})\\b`, "i"); const seen = new Set<string>(); const out: Item[] = [];
  for (const h of parseRss(await r.text(), "", 80).sort((a, b) => b.ts - a.ts)) {
    const { title, outlet } = nameOf(h.title); const k = title.toLowerCase().slice(0, 60); if (seen.has(k) || !re.test(title)) continue; seen.add(k);
    out.push({ id: `${prefix}${out.length + 1}`, title: title.slice(0, 220), url: h.link, outlet: outlet || "Think tank", ts: h.ts, kind: "thinktank" }); if (out.length >= 12) break;
  }
  return out;
}).then((r) => r.value);
