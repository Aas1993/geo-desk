// Builds public/data/missions.json: the UAE's embassies, consulates and permanent missions abroad, from MOFA's official "UAE Missions Abroad" directory.
// Each country's missions render server-side at ?region=<ISO3>, so this reads one page per country (about 100), 1.2 s apart.
// Ambassador names, phone numbers and e-mail addresses are published by MOFA for public use; every row links back to the directory.
import { writeFileSync, readFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; geo-desk research; +https://github.com/Aas1993/geo-desk)" };
const BASE = "https://www.mofa.gov.ae/en/missions/uae-missions-abroad";
const atlas = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(atlas.map((c) => c.iso3)); const capital = new Map(atlas.filter((c) => c.lat != null && c.lng != null).map((c) => [c.iso3, [c.lat, c.lng]]));
const sane = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(45_000) }); if (r.ok) return r.text(); } catch { /* retry */ } await sleep(2_000 * (i + 1)); } throw new Error("failed " + u); };
const clean = (h) => (h ?? "").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();

const PREFIX = /^(?:(?:the\s+)?(?:charg[eé] d['’]affaires(?: a\.?i\.?| ad interim)?|consul general|consul|ambassador|excellency|sheikha?|h\.e\.?|he|dr\.?|mr\.?|mrs\.?|ms\.?|eng\.?|major general|brigadier|hh)(?=[\s.]|$)[\s.]*)+/i;
/** "MOHAMED ISSA ABUSHAHAB" and "Consul General H.E. Amna Almheiri" both become plain Title Case names. */
const person = (raw) => { let n = raw.replace(PREFIX, "").replace(PREFIX, "").trim(); if (n === n.toUpperCase()) n = n.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, a, b) => a + b.toUpperCase()); return n.replace(/\bAl([A-Z])/g, "Al $1").replace(/\bBin\b/g, "bin"); };
const cityOf = (name) => (name.split(/\s[-–—]\s/)[1] ?? name.match(/\bin ([A-Z][\w .'-]+)$/)?.[1] ?? "").trim() || null;
const index = await get(BASE);
const codes = [...new Set([...index.matchAll(/<option>[^<(]*\(([A-Z]{3})\)/g)].map((m) => m[1]))].filter((c) => valid.has(c));
if (codes.length < 80) { console.error(`REFUSING TO WRITE: only ${codes.length} countries in the directory`); process.exit(1); }
const out = {}; let n = 0, noEmail = 0, noHead = 0; // MOFA's own coordinates are sometimes garbled (projected values, zeros, blanks). An embassy is in the capital, so it falls back to the capital marked approximate; anything else is left without a point.
const hav = (a, b) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
// an embassy that MOFA places more than 250 km from the capital (swapped digits, another country's point) is treated like a missing coordinate
const place = (code, type, la, lo) => (sane(la, lo) && !(type === "embassy" && capital.get(code) && hav([la, lo], capital.get(code)) > 250) ? { lat: la, lon: lo } : type === "embassy" && capital.get(code) ? { lat: capital.get(code)[0], lon: capital.get(code)[1], approx: true } : { lat: null, lon: null });
const typeOf = (name) => (/visa (centre|center)/i.test(name) ? "visa-centre" : /permanent|mission to|delegation/i.test(name) ? "permanent-mission" : /consulate general/i.test(name) ? "consulate-general" : /consulate/i.test(name) ? "consulate" : /embassy/i.test(name) ? "embassy" : /office|representative/i.test(name) ? "office" : "other");
for (const code of codes) {
  await sleep(1_200); let html; try { html = await get(`${BASE}?region=${code}`); } catch (e) { console.warn(code, e.message); continue; }
  for (const m of html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").matchAll(/<div class="mission-details[^>]*id="mission-\{([^}]+)\}"[^>]*data-latlng="([^"]*)"[^>]*>([\s\S]*?)(?=<div class="mission-details|<section|<\/main)/g)) {
    const [, id, ll, b] = m; const name = clean(b.match(/<p class="text-lg[^>]*>([\s\S]*?)<\/p>/)?.[1]); if (!name) continue;
    const f = {}; for (const p of b.matchAll(/<p class="text-aeblack-500 mb-0">([\s\S]*?)<\/p>\s*<p class="mb-0"[^>]*>([\s\S]*?)<\/p>/g)) f[clean(p[1]).toLowerCase()] = clean(p[2]);
    const [lat, lon] = ll.split(",").map((x) => parseFloat(x)); const site = b.match(/href="(https?:[^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*Mission Website/i)?.[1] ?? null;
    const headLabel = Object.keys(f).find((k) => /ambassador|consul|chargé|charge|head|representative|permanent/.test(k)); const headName = headLabel ? person(f[headLabel]) : "";
    const email = (f["email address"] ?? f.email ?? "").match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? null; if (!email) noEmail++; if (!headName) noHead++;
    const type = typeOf(name); const where = /\b(Hong Kong)\b/i.test(name) ? "HKG" : /\b(Macao|Macau)\b/i.test(name) ? "MAC" : code; /* the atlas has Hong Kong and Macao as places of their own */ (out[where] ??= []).push({ id, type, name: name.replace(/^UAE\s+/i, ""), city: cityOf(name), head: headName ? { role: type === "embassy" ? "Ambassador" : type === "consulate-general" ? "Consul General" : type === "permanent-mission" ? "Permanent Representative" : headLabel.replace(/^the /, ""), name: headName } : null,
      phone: f.phone || null, fax: f.fax || null, email, address: f.address || null, hours: (f["workin hours"] ?? f["working hours"] ?? "").replace(/^From\s+/i, "") || null, ...place(code, type, lat, lon), website: site });
    n++;
  }
}
const countriesWith = Object.keys(out).length; const pm = prevOf("missions.json", (j) => Object.keys(j.countries).length), pn = prevOf("missions.json", (j) => Object.values(j.countries).flat().length); if (countriesWith < 70 || n < 100 || thin(countriesWith, pm, 0.95) || thin(n, pn, 0.95)) { console.error(`REFUSING TO WRITE: ${countriesWith} countries, ${n} missions`); process.exit(1); }
const total = {}; for (const l of Object.values(out)) for (const x of l) total[x.type] = (total[x.type] ?? 0) + 1;
writeFileSync(new URL("../public/data/missions.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), source: { name: "UAE Ministry of Foreign Affairs · UAE Missions Abroad", url: BASE, note: "Ambassador names and contacts as published by MOFA; they change, so check the mission page." }, totals: total, countries: out }));
console.log(`countries ${countriesWith}, missions ${n}, no email ${noEmail}, no head ${noHead}`, JSON.stringify(total)); console.log("sample IND:", JSON.stringify(out.IND?.[0]));
