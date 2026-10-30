// Builds public/data/tension-evidence.json: what the open public records say about each entry of the tension register (public/data/tension-register.json).
// Sources read: ICJ docket pages (cases that name the UAE as a party), the UN Digital Library (Security Council and General Assembly documents and voting data, open MARC search),
// International Crisis Group's open RSS feed (its CrisisWatch pages and site sit behind a bot check), and each register source's own URL, tested for the text the entry relies on.
// This is a MACHINE read: it shows that a source exists, answers, and contains the expected words. It does not replace an analyst reading the source, so the register's `verified` stays false until a named person has.
// Rules: only what a source returned is stored; a source that cannot be read is recorded with its status, and an earlier successful read is kept (marked with its date) rather than overwritten by a failure.
// Usage: node scripts/build-tension-evidence.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const UA = { "User-Agent": "geo-desk research (https://github.com/Aas1993/geo-desk)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("../public/data/tension-evidence.json", import.meta.url);
const register = JSON.parse(readFileSync(new URL("../public/data/tension-register.json", import.meta.url), "utf8"));
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { entries: {} };
const today = new Date().toISOString().slice(0, 10);
const get = async (url, tries = 3) => {
  let status = 0;
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(45_000) }); status = r.status; if (r.ok) return { status, body: await r.text() }; if (r.status < 500 && r.status !== 429 && r.status !== 202) break; } catch { status = 0; } await sleep(1200 * (i + 1)); }
  return { status, body: "" };
};
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&(?:rsquo|#8217|#039|apos);/g, "'").replace(/\s+/g, " ");
const re = (p) => { const m = /^\(\?i\)(.*)$/s.exec(p); return new RegExp(m ? m[1] : p, m ? "i" : ""); };
const sources = {}; const unavailable = [];
const src = (id, o) => (sources[id] = { id, status: "failed", rows: 0, ...o });

// 1. Crisis Group RSS, read once and used to check register sources hosted on crisisgroup.org and to list UAE-related items
src("crisisgroup", { name: "International Crisis Group: open RSS feed (commentary, reports, CrisisWatch items)", publisher: "International Crisis Group", url: "https://www.crisisgroup.org/", basis: "Analysis by Crisis Group's own staff; the feed holds only the latest items", note: "The CrisisWatch monthly pages and the site's articles return a bot check (HTTP 403) to non-browser clients, so only the feed is read; a link to an article is for a person to open." });
const cg = await get("https://www.crisisgroup.org/rss.xml"); const cgItems = [];
if (cg.body) for (const m of cg.body.matchAll(/<item>([\s\S]*?)<\/item>/g)) { const t = m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1], l = m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1], d = m[1].match(/datetime="([^"]+)"/)?.[1]; if (t && l) cgItems.push({ title: plain(t), url: l.trim(), date: d?.slice(0, 10) ?? null, text: plain(m[1].match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"') ?? "") }); }
Object.assign(sources.crisisgroup, { status: cgItems.length ? "ok" : "failed", rows: cgItems.length }); if (!cgItems.length) unavailable.push({ name: "Crisis Group RSS", url: "https://www.crisisgroup.org/rss.xml", reason: `Could not be read (HTTP ${cg.status}).` });
const cgUae = cgItems.filter((i) => /\bUAE\b|United Arab Emirates|Emirati/.test(i.title + " " + i.text.slice(0, 4000))).map(({ title, url, date }) => ({ title, url, date }));
unavailable.push({ name: "Crisis Group CrisisWatch monthly bulletins and article pages", url: "https://www.crisisgroup.org/crisiswatch", reason: "A bot check returns HTTP 403 to non-browser clients; only the RSS feed is read." });

// 2. ICJ: every case that names the UAE as a party, with its docket page's latest development
src("icj", { name: "International Court of Justice: cases by country and case pages", publisher: "International Court of Justice", url: "https://www.icj-cij.org/cases-by-country", basis: "The Court's own docket", note: "The status line is the first press release on the case page; read the page for the full record." });
const icj = { cases: [] };
{
  const list = await get("https://www.icj-cij.org/cases-by-country"); const found = new Map();
  for (const m of list.body.matchAll(/<a href="(\/case\/\d+)">([^<]*(?:United Arab Emirates|UAE)[^<]*)<\/a>/g)) found.set(m[1], plain(m[2]).trim());
  for (const [path, title] of found) {
    await sleep(800); const page = await get(`https://www.icj-cij.org${path}`); const t = plain(page.body);
    // the newest press release on the page by date (the page's own order is not reliable for old cases)
    const MON = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const rel = [...t.matchAll(/Press release (\d{4}\/\d+)\s+(\d{1,2}) (\w+) (\d{4})\s+(.{20,330}?)(?= Procedure\(s\)| Available in| Summary |$)/g)].map((m) => ({ release: m[1], iso: `${m[4]}-${String(MON.indexOf(m[3].toLowerCase()) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`, title: m[5] })).filter((x) => !x.iso.includes("-00-")).sort((a, b) => b.iso.localeCompare(a.iso));
    const latest = rel[0] ? [rel[0].release, rel[0].iso, rel[0].title] : null;
    const outcome = /removed from the General List/i.test(t) ? "removed from the General List" : /Judgment of \d{1,2} \w+ \d{4}/.test(t) ? "judgment delivered" : null;
    icj.cases.push({ id: path.split("/").pop(), title, url: `https://www.icj-cij.org${path}`, status: page.status, latest: latest ? { release: latest[0], date: latest[1], title: latest[2] } : null, outcome });
  }
  Object.assign(sources.icj, { status: icj.cases.length ? "ok" : "failed", rows: icj.cases.length }); console.log("ICJ cases naming the UAE:", icj.cases.map((c) => `${c.id} ${c.outcome ?? "see page"}`).join(" | ") || "none");
  if (!icj.cases.length) unavailable.push({ name: "ICJ cases by country", url: "https://www.icj-cij.org/cases-by-country", reason: `Could not be read (HTTP ${list.status}).` });
}

// 3. UN Digital Library: Security Council and General Assembly documents (open MARC search); the same library holds the Security Council and Assembly voting data
src("undl", { name: "UN Digital Library: Security Council and General Assembly documents and voting data", publisher: "United Nations Dag Hammarskjöld Library", url: "https://digitallibrary.un.org/", basis: "Official UN documents with their document symbols", note: "A record shows that the document exists and when it was issued; it is not a summary of its content." });
const marc = (rec, tag, code) => [...rec.matchAll(new RegExp(`<datafield tag="${tag}"[^>]*>([\\s\\S]*?)</datafield>`, "g"))].flatMap((d) => [...d[1].matchAll(new RegExp(`<subfield code="${code}">([^<]*)</subfield>`, "g"))].map((s) => plain(s[1])));
const undl = async (query, titleMatch) => {
  const r = await get(`https://digitallibrary.un.org/search?ln=en&p=${encodeURIComponent(query)}&of=xm&rg=200&sf=year&so=d`); if (!r.body.includes("<collection")) return null;
  const total = Number(r.body.match(/Total-Number-Of-Results: (\d+)/)?.[1] ?? 0); let recs = [...r.body.matchAll(/<record>([\s\S]*?)<\/record>/g)].map((m) => ({ id: m[1].match(/<controlfield tag="001">(\d+)/)?.[1], title: marc(m[1], "245", "a")[0], date: marc(m[1], "269", "a")[0], symbol: marc(m[1], "191", "a")[0] ?? marc(m[1], "791", "a")[0] ?? null })).filter((x) => x.id && x.title);
  if (titleMatch) recs = recs.filter((x) => new RegExp(titleMatch, "i").test(x.title));
  return { total, capped: total >= 200, records: recs.slice(0, 6).map((x) => ({ symbol: x.symbol, title: x.title.slice(0, 220), date: x.date ?? null, url: `https://digitallibrary.un.org/record/${x.id}` })) };
};

// 4. Each register entry: its own sources tested for the expected text, and its UN document query
const entries = {}; let okSources = 0, undlOk = 0;
for (const e of register.entries) {
  const key = `${e.iso3}-${e.kind}`; const old = prev.entries?.[key]; const out = (entries[key] = { checks: [], ...(e.icj?.length ? { icj: e.icj } : {}) });
  for (const s of e.sources) {
    const before = old?.checks?.find((c) => c.url === s.url); let status = 0, found = null, how = s.via ? "feed" : "page";
    if (s.via) { const it = cgItems.find((i) => i.url === s.url); status = it ? 200 : cg.status; found = it ? (s.expect ? re(s.expect).test(it.text) : true) : null; }
    else if (/^https:\/\/digitallibrary\.un\.org\/search\?/.test(s.url)) { const q = new URL(s.url).searchParams.get("p") ?? ""; const hit = q ? await undl(q, null) : null; status = hit ? 200 : 0; found = hit ? hit.total > 0 : null; how = "library search"; }
    else if (/^https:\/\/digitallibrary\.un\.org\/record\//.test(s.url)) { // record pages answer asynchronously (HTTP 202); the search below proves the record exists instead
      const id = s.url.split("/").pop(); const hit = (await undl(id.length ? `recid:${id}` : "", null)); status = hit ? 200 : 0; found = hit ? hit.total > 0 : null; how = "library search"; }
    else { await sleep(700); const r = await get(s.url); status = r.status; found = r.body ? (s.expect ? re(s.expect).test(plain(r.body)) : true) : null; }
    // a source that cannot be read now keeps its last good read, dated
    if (found === null && before?.found === true) out.checks.push({ ...before, note: `Not readable on ${today} (HTTP ${status}); last good read kept.` }); else out.checks.push({ label: s.label, url: s.url, status, found, how, at: today, ...(s.expect ? { expect: s.expect } : {}) });
    if (found === true) okSources++;
  }
  if (e.undl) { const r = await undl(e.undl.query, e.undl.titleMatch); if (r) { entries[key].undl = { query: e.undl.query, note: e.undl.note ?? null, total: e.undl.titleMatch ? r.records.length : r.total, capped: r.capped, records: r.records, at: today }; undlOk++; } else if (old?.undl) entries[key].undl = { ...old.undl, note: `${old.undl.note ?? ""} (Not readable on ${today}; earlier read kept.)` }; }
  console.log(key, entries[key].checks.map((c) => `${c.found === true ? "found" : c.found === false ? "MISSING" : "unread"}(${c.status})`).join(" "), entries[key].undl ? `| UN docs ${entries[key].undl.total}` : "");
}
Object.assign(sources.undl, { status: undlOk ? "ok" : "failed", rows: undlOk });
if (!undlOk) unavailable.push({ name: "UN Digital Library", url: "https://digitallibrary.un.org/", reason: "No search could be read this run." });
unavailable.push({ name: "UN Security Council and General Assembly voting records, beyond the library's documents", url: "https://digitallibrary.un.org/", reason: "The library's voting-data collection lists each resolution's votes, but none of the register's disputes has a recorded UAE-specific vote to cite; it is not searched for votes by country pair." });

// 5. Media tone: GDELT is the one open machine-coded feed. Other news-analytics services are probed once so the UI can say why none is used.
const toneProbes = [["Media Cloud search API", "https://search.mediacloud.org/api/search/count-over-time?q=UAE&start=2026-10-01&end=2026-10-30", "https://www.mediacloud.org/"], ["Event Registry API", "https://eventregistry.org/api/v1/article/getArticles?keyword=UAE", "https://eventregistry.org/"], ["NewsAPI", "https://newsapi.org/v2/everything?q=UAE", "https://newsapi.org/"], ["World News API", "https://api.worldnewsapi.com/search-news?text=UAE", "https://worldnewsapi.com/"]];
const tone = { single: true, source: { name: "GDELT 2.0 Events", url: "https://www.gdeltproject.org/" }, unavailable: [], probedAt: today };
for (const [name, probe, url] of toneProbes) { await sleep(500); const r = await get(probe, 1); const keyed = r.status === 401 || r.status === 403; if (r.status === 200) tone.unavailable.push({ name, url, reason: "Answers without a key, but returns article counts or text, not a tone score; not used as a second tone measure." }); else tone.unavailable.push({ name, url, reason: keyed ? `Needs an API key or licence (HTTP ${r.status}); none is held, so it is not used.` : `Could not be read (HTTP ${r.status}).` }); }
tone.unavailable.push({ name: "A tone score computed by this app from headlines", url: "https://www.gdeltproject.org/", reason: "Not built: a word-list score of RSS headlines would be a second machine-coded figure of our own making, not an independent measure, and would imply a precision it does not have." });
console.log("tone probes:", tone.unavailable.map((u) => u.name + " -> " + u.reason.slice(0, 40)).join(" | "));
const entriesRead = Object.keys(entries).length; if (!entriesRead) { console.error("REFUSING TO WRITE: no entries"); process.exit(1); }
writeFileSync(OUT, JSON.stringify({ v: 1, built: new Date().toISOString(), sources, unavailable, icj, tone, crisisgroup: { uae: cgUae, feedItems: cgItems.length }, entries }));
console.log("entries", entriesRead, "| sources with expected text found", okSources, "| Crisis Group items naming the UAE", cgUae.length);
