// SMOKE TEST against a running server (npm run dev or npm start): every page in the navigation answers, no page renders an error screen, the address bar's tab links are accepted and the pages that read a country do not fail for a country with data. Run: `npm run smoke` (BASE=http://localhost:3020 by default). It is not part of `npm test` because it needs a server.
import { NAV, PANEL_TABS } from "../src/lib/nav";

const BASE = process.env.BASE ?? "http://localhost:3020"; const BAD = /Application error|Internal Server Error|This page couldn.t load|Unhandled Runtime Error|Cannot read properties/i;
const paths = [...NAV.map((n) => n.href), ...PANEL_TABS.map((t) => `/?sel=JOR&tab=${t}`), "/mofa", "/ambassador", "/case", "/bird", "/api/case/JOR", "/data/countries.json"]; let fails = 0;
async function main() {
  for (const p of [...new Set(paths)]) {
    const t0 = Date.now(); try {
      const r = await fetch(`${BASE}${p}`, { redirect: "follow" }); const body = await r.text(); const ok = r.status === 200 && !BAD.test(body) && body.length > 200; const ms = Date.now() - t0;
      console.log(`${ok ? "ok  " : "FAIL"} ${String(r.status)} ${String(ms).padStart(5)} ms  ${p}${ok ? "" : `  ${BAD.exec(body)?.[0] ?? `length ${body.length}`}`}`); if (!ok) fails++;
    } catch (e) { console.log(`FAIL --- ${p}  ${(e as Error).message}`); fails++; }
  }
  console.log(fails ? `smoke: ${fails} failed` : "smoke: all pages answered"); process.exit(fails ? 1 : 0);
}
void main();
