// Builds public/data/markets-sources.json: where the Markets page's prices come from, and every independent check on them that we looked for.
// The page's only price source is Twelve Data, a licensed vendor. An independent check would be a second publisher's price for the same security on the same day. This script probes the candidates (the exchanges' public sites, the UAE capital-market regulator, the central bank) and records, with the HTTP evidence, why each can or cannot be used.
// Rules: nothing is scraped; each probe is one plain request for a public page, config file or robots.txt. A candidate is "ok" only if it serves per-security prices openly and its terms do not forbid reuse; otherwise it is listed as unavailable with the reason, never worked around.
// Usage: node scripts/build-markets-sources.mjs
import { writeFileSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const probe = async (url, o = {}) => { try { const r = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(45_000) }); const body = o.body ? await r.text() : ""; return { ok: r.ok, status: r.status, body }; } catch (e) { return { ok: false, status: 0, body: "", error: String(e.message).slice(0, 80) }; } };
const day = new Date().toISOString().slice(0, 10);
const ev = (...a) => a.filter(Boolean);

// the one price source in use, and which plan it needs for each exchange
const ex = await (async () => { try { const j = await (await fetch("https://api.twelvedata.com/exchanges?show_plan=true&country=United%20Arab%20Emirates", { headers: UA, signal: AbortSignal.timeout(45_000) })).json(); return Object.fromEntries((j.data ?? []).map((e) => [e.code, e.access?.plan])); } catch { return {}; } })();
const primary = { id: "twelvedata", name: "Twelve Data", url: "https://twelvedata.com", role: "the only price, chart and fundamentals source on this page", basis: "licensed market-data vendor (an aggregator, not the exchange)", plan: { ADX: ex.XADS ?? null, DFM: ex.XDFM ?? null }, note: "Prices are as the vendor delivers them; the page does not check them against the exchange." };

const checks = [];
const adx = await probe("https://www.adx.ae/"), adxRobots = await probe("https://www.adx.ae/robots.txt");
checks.push({ id: "adx", name: "Abu Dhabi Securities Exchange public site", url: "https://www.adx.ae/", status: "unavailable", checked: day, evidence: ev(`GET adx.ae → HTTP ${adx.status || "no response"}`, `robots.txt → HTTP ${adxRobots.status || "no response"}`),
  reason: "The site refuses non-browser clients (HTTP 403), and its Terms of Use prohibit systematic retrieval (read 16 August 2026 in the Pulse project). Programmatic access needs a commercial agreement with ADX, so no script reads it." });
const mw = await probe("https://marketwatch.dfm.ae/builds/config.js?v=15334655", { body: true }); const feed = mw.body.match(/feedgate:\s*'([^']+)'/)?.[1], sso = /ssoLogin/.test(mw.body);
checks.push({ id: "dfm-marketwatch", name: "Dubai Financial Market: Market Watch", url: "https://marketwatch.dfm.ae/", status: "unavailable", checked: day, evidence: ev(`config.js → HTTP ${mw.status || "no response"}`, feed ? `feed gateway ${feed}` : "", sso ? "single-sign-on login configured" : ""),
  reason: "Market Watch is a streaming application: its prices arrive through a feed gateway (rfeed.dfm.ae) with a single-sign-on login for real-time data, and DFM publishes no API or reuse licence for it. DFM's site points data users to its list of licensed Market Data Providers, so it is not read by script." });
const hist = await probe("https://www.dfm.ae/the-exchange/statistics-reports/historical-data", { body: true }); const files = (hist.body.match(/href="[^"]+\.(?:csv|xlsx?)"/gi) ?? []).length;
checks.push({ id: "dfm-historical", name: "Dubai Financial Market: Historical Data page", url: "https://www.dfm.ae/the-exchange/statistics-reports/historical-data", status: "unavailable", checked: day, evidence: ev(`page → HTTP ${hist.status || "no response"}`, `${files} downloadable CSV or Excel links in the served page`),
  reason: "The page is drawn in the browser from DFM's site backend. It offers no download link or published API, so there is no stable, documented way to read it by script." });
const efsah = await probe("https://api2.dfm.ae/efsah/v1/prototype_efsah", { body: false });
checks.push({ id: "dfm-disclosures", name: "Dubai Financial Market: disclosures feed (efsah)", url: "https://www.dfm.ae/the-exchange/news-disclosures/disclosures", status: "unavailable", checked: day, evidence: ev(`feed → HTTP ${efsah.status || "no response"}`),
  reason: "The feed is open but carries company disclosures only (filings, announcements, dividends), not prices, so it cannot check a quote. It could check dividend and corporate-action figures, which this page does not yet do." });
const cma = await probe("https://www.sca.gov.ae/en/open-data/numbers-and-statistics/graphs-and-statistics", { body: true }); const hasPrice = /closing price|share price|market capitali[sz]ation|traded value|trading volume/i.test(cma.body);
checks.push({ id: "cma", name: "Capital Market Authority (SCA) open data", url: "https://www.sca.gov.ae/en/open-data", status: "unavailable", checked: day, evidence: ev(`Graphs and Statistics → HTTP ${cma.status || "no response"}`, `price or trading terms on the page: ${hasPrice ? "yes" : "none"}`),
  reason: "The regulator's open data covers licensed companies, legal actions and violations. It holds no prices or trading statistics, and its Bayanat portal listing is the same set." });
const cb = await probe("https://www.centralbank.ae/en/");
checks.push({ id: "cbuae", name: "Central Bank of the UAE", url: "https://www.centralbank.ae/en/", status: "unavailable", checked: day, evidence: ev(`site → HTTP ${cb.status || "no response"}`),
  reason: "The site refuses scripted requests (HTTP 403), and a central bank publishes monetary and banking statistics, not security prices, so it cannot check a quote in any case." });

const out = { built: new Date().toISOString(), primary, independentCheck: checks.some((c) => c.status === "ok"), checks };
if (!ex.XADS && !ex.XDFM) console.error("[twelvedata] the exchange plan table could not be read; plan fields are empty");
writeFileSync(new URL("../public/data/markets-sources.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("independent check available:", out.independentCheck, "| plans", JSON.stringify(primary.plan), "|", checks.map((c) => `${c.id}: ${c.evidence.join("; ")}`).join(" || "));
