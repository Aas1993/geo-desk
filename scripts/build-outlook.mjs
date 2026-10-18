// Builds public/data/outlook.json: the IMF World Economic Outlook (latest vintage) for every country in the atlas: GDP growth, inflation, current account, debt, unemployment, GDP.
// Years before the current one are estimates/actuals, later years are IMF projections; the file records the vintage so the app can say so.
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)", Accept: "application/json" };
const valid = new Set(JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")).map((c) => c.iso3));
const IND = { NGDP_RPCH: "growth", PCPIPCH: "inflation", BCA_NGDPD: "ca", GGXWDG_NGDP: "debt", LUR: "unemployment", NGDPD: "gdp" };
// The unversioned WEO dataflow is IMF's live database: it is revised between the quarterly vintages, so it is the most recent release. The frozen snapshots (WEO_2026_APR_VINTAGE ...)
// can be several revisions older (for the UAE the live growth figures differ from April's), so the live flow is used and labelled as such rather than claiming a vintage.
const flow = "WEO";
const r = await fetch(`https://api.imf.org/external/sdmx/2.1/data/IMF.RES,${flow}/.${Object.keys(IND).join("+")}.A?startPeriod=2015&format=jsondata`, { headers: UA, signal: AbortSignal.timeout(180_000) }); if (!r.ok) throw new Error(`IMF WEO ${r.status}`);
const j = await r.json(); const dims = j.structure.dimensions.series; const di = (id) => dims.findIndex((d) => d.id === id); const codes = dims[di("COUNTRY")].values.map((v) => v.id), inds = dims[di("INDICATOR")].values.map((v) => v.id), years = j.structure.dimensions.observation[0].values.map((v) => +v.id);
const out = {};
for (const [k, s] of Object.entries(j.dataSets[0].series)) {
  const a = k.split(":").map(Number); const code = codes[a[di("COUNTRY")]]; const key = IND[inds[a[di("INDICATOR")]]]; if (!key || !valid.has(code)) continue;
  const o = (out[code] ??= {}); o[key] = Object.fromEntries(Object.entries(s.observations).map(([t, v]) => [years[+t], key === "gdp" ? Math.round(Number(v[0]) / 1e6) : +Number(v[0]).toFixed(2)]).filter(([, v]) => Number.isFinite(v)));
}
if (Object.keys(out).length < 150) { console.error(`REFUSING TO WRITE: only ${Object.keys(out).length} countries`); process.exit(1); }
writeFileSync(new URL("../public/data/outlook.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), vintage: "latest release (live database)", flow, source: { name: "IMF World Economic Outlook", url: "https://www.imf.org/en/Publications/WEO", note: "The IMF live database, revised between its quarterly vintages. Growth and inflation in %, current account, debt and unemployment in % (of GDP where stated), GDP in US$ millions. Years from the current one onward are IMF projections." }, countries: out }));
const u = out.ARE; console.log("vintage", flow, "| countries", Object.keys(out).length); console.log("UAE growth", JSON.stringify(u.growth)); console.log("UAE inflation 2026/27:", u.inflation[2026], u.inflation[2027], "| GDP 2025 $bn", Math.round(u.gdp[2025] / 1000));
