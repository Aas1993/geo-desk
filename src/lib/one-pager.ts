"use client";
import { loadAgreements, allAgreements, has } from "./agreements-client";
import { loadMissions, loadVisits, TYPE_LABEL as MISSION_TYPE } from "./diplomacy-client";
import { loadFlights, liveCount } from "./flights-client";
import { loadInvestment, usd } from "./investment-client";
import { loadOrgs } from "./layers/orgs-client";
import { LAYERS } from "./layers/registry";
import type { Country } from "./types";
import { openHtml } from "@/lib/url";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A one-page, print-ready brief on a country built from every dataset in the app (the AI brief is included only if one was already generated here). */
export async function onePagerHtml(c: Country, lang: "en" | "ar"): Promise<string> {
  const [ag, ms, vs, fl, inv, orgs] = await Promise.all([loadAgreements(), loadMissions(), loadVisits(), loadFlights(), loadInvestment(), loadOrgs()].map((p) => p.catch(() => null))) as [Awaited<ReturnType<typeof loadAgreements>> | null, Awaited<ReturnType<typeof loadMissions>> | null, Awaited<ReturnType<typeof loadVisits>> | null, Awaited<ReturnType<typeof loadFlights>> | null, Awaited<ReturnType<typeof loadInvestment>> | null, Awaited<ReturnType<typeof loadOrgs>> | null];
  const a = ag?.countries[c.iso3]; const rows = a ? allAgreements(a) : []; const missions = ms?.countries[c.iso3] ?? []; const visits = (vs?.items ?? []).filter((x) => x.c.includes(c.iso3)); const f = fl?.countries[c.iso3]; const o = inv?.countries[c.iso3]?.outward;
  const member = orgs ? LAYERS.filter((l) => l.kind === "members" && l.members && orgs.orgs[l.members]?.includes(c.iso3)).map((l) => l.en.split(" · ")[0].replace(/ —.*/, "")) : [];
  let brief: { headline: string; confidence: string; sections: { key: string; bullets: { text: string }[] }[] } | null = null; try { const raw = localStorage.getItem(`gd-brief2:${c.iso3}:${lang}`); if (raw) brief = JSON.parse(raw).brief; } catch { /* none */ }
  const ar = lang === "ar"; const dir = ar ? "rtl" : "ltr"; const name = ar && c.nameAr ? c.nameAr : c.name; const today = new Date().toISOString().slice(0, 10);
  const L = ar ? { brief: "موجز الدولة", profile: "الملف", cap: "العاصمة", pop: "السكان", reg: "المنطقة", cur: "العملة", lang: "اللغات", rel: "العلاقات مع الإمارات", missions: "البعثات الإماراتية", amb: "السفير", cepa: "اتفاقية الشراكة الشاملة", agreements: "اتفاقيات", flights: "رحلات مباشرة", dest: "وجهة", inv: "الاستثمار الإماراتي", visits: "آخر الزيارات واللقاءات", member: "العضويات", ai: "موجز الذكاء الاصطناعي", src: "المصادر", gen: "أُنشئ", none: "لا شيء", note: "مُجمَّع من مصادر رسمية ومفتوحة؛ تحقق قبل الاعتماد عليه." } : { brief: "Country brief", profile: "Profile", cap: "Capital", pop: "Population", reg: "Region", cur: "Currency", lang: "Languages", rel: "Relations with the UAE", missions: "UAE missions", amb: "Ambassador", cepa: "CEPA", agreements: "agreements", flights: "Direct flights", dest: "destinations", inv: "UAE investment", visits: "Latest visits & meetings", member: "Memberships", ai: "AI brief", src: "Sources", gen: "Generated", none: "None", note: "Compiled from official and open sources; verify before relying on it." };
  const li = (xs: string[]) => (xs.length ? `<ul>${xs.map((x) => `<li>${x}</li>`).join("")}</ul>` : `<p class="m">${L.none}</p>`);
  const cepa = a?.cepa ? `${esc(a.cepa.status)}${a.cepa.signed ? `, signed ${esc(a.cepa.signed)}` : ""}${a.cepa.inForce ? `, in force ${esc(a.cepa.inForce)}` : ""}` : L.none; const tax = has(a, "tax"), air = has(a, "air");
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(name)} · ${L.brief}</title><style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:11.5px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0}h1{font-size:22px;margin:0}h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#555;margin:12px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.m{color:#666}.g{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}ul{margin:0;padding-inline-start:16px}li{margin:1px 0}.k b{display:inline-block;min-width:78px;color:#555;font-weight:600}.foot{margin-top:12px;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:4px}</style></head><body>
<div class="top"><h1>${esc(c.flag ?? "")} ${esc(name)}</h1><span class="m">${L.brief} · ${today}</span></div>
<h2>${L.profile}</h2><div class="g"><div class="k"><b>${L.cap}</b>${esc(c.capital ?? "—")}<br><b>${L.pop}</b>${c.population ? Math.round(c.population.v).toLocaleString("en") : "—"}<br><b>${L.reg}</b>${esc(c.region)}</div><div class="k"><b>${L.cur}</b>${esc(c.currencies.join(", ") || "—")}<br><b>${L.lang}</b>${esc(c.languages.join(", ") || "—")}</div></div>
${brief ? `<h2>${L.ai}</h2><p><b>${esc(brief.headline)}</b></p>${li(brief.sections.flatMap((s) => s.bullets.slice(0, 2).map((b) => esc(b.text))).slice(0, 8))}` : ""}
<h2>${L.rel}</h2><div class="g"><div><b>${L.cepa}:</b> ${cepa}<br><b>${rows.length}</b> ${L.agreements}${tax ? " · tax treaty" : ""}${air ? " · air services" : ""}<br><b>${L.flights}:</b> ${f ? `${liveCount(f)} ${L.dest}, ${f.airlines.length} airlines` : L.none}<br><b>${L.inv}:</b> ${o ? `${usd(o.usd)} (${o.year})${o.rank ? ` · #${o.rank}` : ""}` : L.none}</div>
<div><b>${L.missions}:</b>${li(missions.map((m) => `${esc(m.name)}${m.head ? ` — ${esc(m.head.role === "Ambassador" ? L.amb : m.head.role)}: ${esc(m.head.name)}` : ""}${m.phone ? ` · ${esc(m.phone)}` : ""}${m.email ? ` · ${esc(m.email)}` : ""} <span class="m">(${esc(MISSION_TYPE[m.type][lang])})</span>`))}</div></div>
<h2>${L.visits}</h2>${li(visits.slice(0, 8).map((v) => `${esc(v.d)} — ${esc(v.t)}`))}
<h2>${L.member}</h2><p>${member.length ? member.map(esc).join(" · ") : L.none}</p>
<div class="foot">${L.src}: MOFA, UAE Ministry of Foreign Trade, WAM, Wikipedia/Wikidata, IMF, World Bank. ${L.note} ${L.gen} ${today}.</div>
<script>addEventListener("load",()=>setTimeout(()=>print(),300))</script></body></html>`;
}

/** Opens the one-pager in a new tab and prints it (the browser's print dialog also offers "Save as PDF"). */
export async function printOnePager(c: Country, lang: "en" | "ar") { const pre = window.open("", "_blank"); /* opened in the click so the browser does not block it after the fetches below */ try { const html = await onePagerHtml(c, lang); if (!openHtml(html, pre)) alert(lang === "ar" ? "منع المتصفح النافذة المنبثقة." : "The browser blocked the pop-up window."); } catch (e) { pre?.close(); throw e; } }
