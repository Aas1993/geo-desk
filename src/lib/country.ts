"use client";
import { useEffect, useRef, useState } from "react";

// ONE COUNTRY FOR THE WHOLE APP. Every page kept its own country choice, so the Ministry, the Ambassador, THE KING, the Bird's eye view, the Case File, the Room and the Lab each had to be told again. The chosen country is now kept once (`gd-country`) and every page follows it: pick Jordan on one page and the others open on Jordan; a page that has never had a country adopts it. Each page still keeps its own tab and settings.
const KEY = "gd-country"; const EVT = "gd-country-change";
const valid = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{3}$/.test(v) && v !== "ARE";
export function readCountry(): string | null { try { const v = localStorage.getItem(KEY); return valid(v) ? v : null; } catch { return null; } }
export function writeCountry(iso: string | null): void { try { if (iso && valid(iso)) localStorage.setItem(KEY, iso); else localStorage.removeItem(KEY); window.dispatchEvent(new Event(EVT)); } catch { /* storage unavailable: pages keep their own choice */ } }
/** The shared country, read after the page has mounted (so the server and the browser draw the same first frame). */
export function useGlobalCountry(): { iso: string | null; loaded: boolean } {
  const [s, set] = useState<{ iso: string | null; loaded: boolean }>({ iso: null, loaded: false });
  useEffect(() => { const on = () => { const iso = readCountry(); set((p) => (p.loaded && p.iso === iso ? p : { iso, loaded: true })); }; const k = setTimeout(on, 0); window.addEventListener(EVT, on); window.addEventListener("storage", on); return () => { clearTimeout(k); window.removeEventListener(EVT, on); window.removeEventListener("storage", on); }; }, []);
  return s;
}
/** Makes a page's own country follow the shared one, and the shared one follow the page when the person picks. `ready` is false until the page has read its own saved choice. */
export function useFollowCountry(iso: string | null, setIso: (i: string | null) => void, ready = true): void {
  const g = useGlobalCountry(); const last = useRef<string | null | undefined>(undefined); const want = useRef<string | null>(null); // want: the shared country the page was just asked to follow, until it has
  /* eslint-disable react-hooks/exhaustive-deps -- the two effects are one rule: the shared value moves the page, a pick on the page moves the shared value; the ref stops the echo */
  useEffect(() => {
    if (!ready || !g.loaded) return;
    if (g.iso && g.iso !== iso) { last.current = g.iso; want.current = g.iso; setIso(g.iso); return; }
    if (!g.iso && valid(iso)) { last.current = iso; writeCountry(iso); return; }
    last.current = iso;
  }, [g.iso, g.loaded, ready]);
  useEffect(() => { if (!ready || !g.loaded || last.current === undefined) return; if (want.current) { if (iso === want.current) want.current = null; return; } /* the page is still moving to the shared country: its old value is not a pick, and writing it back is what made two values chase each other forever */ if (iso !== last.current) { last.current = iso; if (valid(iso)) writeCountry(iso); } }, [iso]);
  /* eslint-enable react-hooks/exhaustive-deps */
}
