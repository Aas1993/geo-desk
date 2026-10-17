"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Loads `loader()` whenever `key` changes. Loading/error are derived from the key, so there is no setState in the effect body. */
export function useKeyed<T>(key: string | null, loader: () => Promise<T>) {
  const [s, set] = useState<{ key: string; value: T | undefined; error: boolean } | null>(null);
  const [n, setN] = useState(0); const fn = useRef(loader);
  useEffect(() => { fn.current = loader; });
  useEffect(() => {
    if (!key) return; let dead = false;
    fn.current().then((value) => { if (!dead) set({ key, value, error: false }); }).catch(() => { if (!dead) set({ key, value: undefined, error: true }); });
    return () => { dead = true; };
  }, [key, n]);
  const mine = s && s.key === key ? s : null;
  const retry = useCallback(() => { set(null); setN((x) => x + 1); }, []);
  return { value: mine?.value, loading: key != null && !mine, error: !!mine?.error, retry };
}
