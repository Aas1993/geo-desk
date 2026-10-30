import { presidentContext } from "../desk/context";
import { clipsFactFor } from "../clips";
import { DEFAULT_PRESIDENT_FOCUS } from "../desk/core";
import { INFO, readHeld, type Ev } from "./runner";
import { postStream } from "../agent/client";

// THE PRESIDENT'S BRIEF, run from the Bird's eye view: the same desk route and ceilings as every other product, with the President's office's directive carried in `topic`, and the product saved in this browser under its own key so the page and the PDF read it back.
export const presidentKey = (iso: string) => `gd-desk:president-brief:${iso}`;
export const PRESIDENT_EST = 0.7;
export type POutcome = { ok: true; usd: number | null } | { ok: false; error: string; message: string };
export async function runPresident(o: { iso: string; lang: "en" | "ar"; topic: string; refresh: boolean; playbook?: string; signal: AbortSignal; onEvent: (e: Ev) => void }): Promise<POutcome> {
  const r = (id: keyof typeof INFO) => readHeld(INFO[id].key(o.iso))?.report ?? null; const context = presidentContext({ clips: clipsFactFor(o.iso), council: r("council"), kingBrief: r("king"), embIntel: r("intel"), embPlan: r("plan"), mofa: r("mofa"), country: r("country"), playbook: o.playbook ?? null });
  const res = await postStream("/api/desk", { product: "president-brief", iso3: o.iso, lang: o.lang, focus: DEFAULT_PRESIDENT_FOCUS, topic: o.topic, useContext: true, context, refresh: o.refresh }, o.signal, o.onEvent); if (!res.ok) return res;
  const d = res.done; if (typeof d.report !== "string") return { ok: false, error: "ended", message: "The brief was not returned." };
  try { localStorage.setItem(presidentKey(o.iso), JSON.stringify({ ...d, type: undefined, topic: o.topic })); window.dispatchEvent(new Event("storage")); } catch { return { ok: false, error: "storage", message: "The brief could not be saved in this browser (storage is full)." }; }
  const u = d.usage as { usd?: number } | undefined; return { ok: true, usd: typeof u?.usd === "number" ? u.usd : null };
}
