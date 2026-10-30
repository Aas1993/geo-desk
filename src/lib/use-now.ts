import { useEffect, useState } from "react";
/** The current time in ms, refreshed every `ms`. Zero on the first render so server and client agree. */
export function useNow(ms = 30_000) { const [n, setN] = useState(0); useEffect(() => { const t = setTimeout(() => setN(Date.now()), 0); const i = setInterval(() => setN(Date.now()), ms); return () => { clearTimeout(t); clearInterval(i); }; }, [ms]); return n; }
