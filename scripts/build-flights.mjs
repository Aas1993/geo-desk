// Builds public/data/flights.json: which countries UAE airports fly to, and with which airlines.
// Source: the "Airlines and destinations" tables on Wikipedia's UAE airport articles, read through the MediaWiki API (CC BY-SA 4.0, attributed in the app),
// with each destination airport resolved to its country through Wikidata. Wikipedia is community-maintained and can lag the real schedule by weeks;
// the app says so, shows each page's revision date, and separates active routes from suspended, seasonal and future ones (important while Gulf airspace is disrupted).
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "User-Agent": "geo-desk/0.1 (https://github.com/Aas1993/geo-desk; personal research project)" };
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8"));
const iso3ByQid = new Map(countries.filter((c) => c.qid).map((c) => [c.qid, c.iso3]));
const AIRPORTS = [["DXB", "Dubai International Airport"], ["AUH", "Zayed International Airport"], ["SHJ", "Sharjah International Airport"], ["DWC", "Al Maktoum International Airport"], ["RKT", "Ras Al Khaimah International Airport"], ["AAN", "Al Ain International Airport"], ["FJR", "Fujairah International Airport"]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (base, params) => { const u = new URL(base); for (const [k, v] of Object.entries({ format: "json", origin: "*", ...params })) u.searchParams.set(k, v); for (let i = 0; i < 3; i++) { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40_000) }); if (r.ok) return r.json(); await sleep(1500 * (i + 1)); } throw new Error("API failed " + u); };
const WP = "https://en.wikipedia.org/w/api.php", WD = "https://www.wikidata.org/w/api.php";

/** Remove comments, refs and templates (keeping dates), leaving only wiki links and plain text. */
const clean = (w) => { let s = w.replace(/<!--[\s\S]*?-->/g, "").replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "").replace(/\{\{\s*date\s*\|\s*([^}|]+)[^}]*\}\}/gi, "$1").replace(/\{\{\s*(?:nowrap|small)\s*\|([^{}]*)\}\}/gi, "$1"); for (let i = 0; i < 6; i++) s = s.replace(/\{\{[^{}]*\}\}/g, ""); return s; };
const statusOf = (note) => /suspended|ceased|terminated|no longer|cancel|resumes/i.test(note) ? "suspended" : /begins|starts|launch|from \d|will (begin|start)/i.test(note) ? "future" : /seasonal/i.test(note) ? "seasonal" : "active";

const rows = []; const revisions = {}; let ok = 0;
for (const [code, title] of AIRPORTS) {
  await sleep(600);
  const secs = await api(WP, { action: "parse", page: title, prop: "sections", redirects: 1 });
  const sec = secs.parse.sections.find((s) => /^airlines and destinations$/i.test(s.line)) ?? secs.parse.sections.find((s) => /^(passenger|airlines)$/i.test(s.line));
  if (!sec) { console.warn("no destinations section for", title); continue; }
  const wt = (await api(WP, { action: "parse", page: title, prop: "wikitext|revid", section: sec.index, redirects: 1 })).parse; revisions[code] = wt.revid;
  let text = wt.wikitext["*"]; const cargo = text.search(/^=+\s*Cargo\s*=+/im); if (cargo > 0) text = text.slice(0, cargo); // passenger services only
  // pull out each {{Airport destination list ...}} by brace matching, then clean only what is inside it
  const lists = []; for (let at = text.search(/\{\{\s*Airport[ -]dest(?:ination)?[ -]list/i); at >= 0; ) { let depth = 0, k = at; for (; k < text.length - 1; k++) { if (text.startsWith("{{", k)) { depth++; k++; } else if (text.startsWith("}}", k)) { depth--; k++; if (depth === 0) break; } } lists.push(text.slice(at + 2, k - 1)); const nx = text.slice(k + 1).search(/\{\{\s*Airport[ -]dest(?:ination)?[ -]list/i); at = nx < 0 ? -1 : k + 1 + nx; }
  const body = lists.map(clean).join("\n"); let n = 0;
  for (const block of body.split(/\n\|\s*(?=\[\[)/).slice(1)) {
    const airline = block.match(/^\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/)?.[1]?.replace(/\s*\(airline\)/i, "").trim(); if (!airline) continue;
    const rest = block.slice(block.indexOf("]]") + 2).replace(/^\s*\|/, ""); let mode = "";
    const parts = rest.split(/(\[\[[^\]]+\]\])/); // alternating text, link, text, link …
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { const m = parts[i].match(/(seasonal|charter)s?\s*:/i); if (m) mode = m[1].toLowerCase(); continue; }
      const link = parts[i].slice(2, -2); const target = link.split("|")[0].trim(); if (/^(file|image|category):/i.test(target)) continue;
      const note = (parts[i + 1] ?? "").split(",")[0]; // text up to the next comma qualifies this destination
      let status = statusOf(note); if (status === "active" && mode === "seasonal") status = "seasonal"; if (mode === "charter" && status === "active") status = "charter";
      rows.push({ from: code, airline, target, status, note: note.replace(/\s+/g, " ").trim().slice(0, 60) }); n++;
    }
  }
  if (n) ok++; console.log(code, title, "rev", wt.revid, "rows", n);
}
if (ok < 5) { console.error("REFUSING TO WRITE: only", ok, "airport pages parsed"); process.exit(1); }

// resolve link targets → Wikidata items → IATA code + country
const titles = [...new Set(rows.map((r) => r.target))]; const qidOf = new Map(); const canon = new Map();
for (let i = 0; i < titles.length; i += 50) {
  await sleep(400); const batch = titles.slice(i, i + 50);
  const j = await api(WP, { action: "query", prop: "pageprops", ppprop: "wikibase_item", titles: batch.join("|"), redirects: 1 });
  const norm = new Map((j.query.normalized ?? []).map((x) => [x.from, x.to])); const redir = new Map((j.query.redirects ?? []).map((x) => [x.from, x.to]));
  const byTitle = new Map(Object.values(j.query.pages ?? {}).map((p) => [p.title, p.pageprops?.wikibase_item]));
  for (const t of batch) { const a = norm.get(t) ?? t; const b = redir.get(a) ?? a; const q = byTitle.get(b); if (q) { qidOf.set(t, q); canon.set(t, b); } }
}
const info = new Map(); const qids = [...new Set(qidOf.values())];
for (let i = 0; i < qids.length; i += 50) {
  await sleep(400); const j = await api(WD, { action: "wbgetentities", ids: qids.slice(i, i + 50).join("|"), props: "claims|labels", languages: "en" });
  for (const [q, e] of Object.entries(j.entities ?? {})) {
    const cl = e.claims ?? {}; const iata = cl.P238?.[0]?.mainsnak?.datavalue?.value; const cq = cl.P17?.[0]?.mainsnak?.datavalue?.value?.id; const c = cl.P625?.[0]?.mainsnak?.datavalue?.value;
    info.set(q, { iata: iata ?? null, iso3: cq ? iso3ByQid.get(cq) ?? null : null, lat: c?.latitude ?? null, lon: c?.longitude ?? null, label: e.labels?.en?.value ?? null });
  }
}

// aggregate per destination airport, then per country
const dests = new Map(); let dropped = 0;
for (const r of rows) {
  const q = qidOf.get(r.target); const i = q && info.get(q); if (!i?.iata || !i.iso3) { dropped++; continue; } // not an airport, or a country outside the atlas
  const d = dests.get(i.iata) ?? { iata: i.iata, name: canon.get(r.target) ?? i.label, iso3: i.iso3, lat: i.lat, lon: i.lon, from: new Set(), airlines: new Map() }; dests.set(i.iata, d);
  d.from.add(r.from); const a = d.airlines.get(r.airline) ?? { status: r.status, from: new Set() }; a.from.add(r.from);
  const rank = { active: 0, seasonal: 1, charter: 2, future: 3, suspended: 4 }; if (rank[r.status] < rank[a.status]) a.status = r.status; d.airlines.set(r.airline, a);
}
const out = {};
for (const d of dests.values()) {
  const c = (out[d.iso3] ??= { destinations: [], airlines: [], counts: { active: 0, seasonal: 0, charter: 0, future: 0, suspended: 0 } });
  const al = [...d.airlines].map(([name, v]) => ({ name, status: v.status, from: [...v.from].sort() })).sort((a, b) => a.name.localeCompare(b.name));
  const best = al.some((x) => x.status === "active") ? "active" : al.some((x) => x.status === "seasonal") ? "seasonal" : al.some((x) => x.status === "charter") ? "charter" : al.some((x) => x.status === "future") ? "future" : "suspended";
  c.destinations.push({ iata: d.iata, name: d.name, lat: d.lat, lon: d.lon, status: best, from: [...d.from].sort(), airlines: al }); c.counts[best]++;
}
for (const c of Object.values(out)) { c.destinations.sort((a, b) => a.name.localeCompare(b.name)); c.airlines = [...new Set(c.destinations.flatMap((d) => d.airlines.filter((a) => a.status === "active" || a.status === "seasonal").map((a) => a.name)))].sort(); }

const total = Object.values(out).reduce((n, c) => n + c.counts.active + c.counts.seasonal, 0);
if (Object.keys(out).length < 60 || total < 200) { console.error(`REFUSING TO WRITE: ${Object.keys(out).length} countries, ${total} live destinations`); process.exit(1); }
writeFileSync(new URL("../public/data/flights.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), revisions, airports: Object.fromEntries(AIRPORTS), source: { name: "Wikipedia airport articles (CC BY-SA 4.0), destinations resolved via Wikidata", url: "https://en.wikipedia.org/wiki/Dubai_International_Airport#Airlines_and_destinations", note: "Community-maintained; can lag the live schedule." }, countries: out }));
const top = Object.entries(out).map(([k, c]) => [k, c.counts.active + c.counts.seasonal, c.counts.suspended]).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n, s]) => `${k}:${n}${s ? `(+${s} susp)` : ""}`);
console.log(`countries ${Object.keys(out).length}, live destinations ${total}, rows ${rows.length}, dropped (non-airport/outside atlas) ${dropped}`); console.log("top:", top.join(" "));
