// Tests for the illustrated bird's eye page (the PDF's HTML): every section is drawn from the brief, nothing is injected, and the page follows the language.
import assert from "node:assert/strict";
import { birdHtml } from "./bird/visual";
import { clipsHtml } from "./clips";
import type { Bird } from "./bird/consolidate";

const F = (tab: string, href: string) => ({ tab, href });
const b: Bird = { iso: "JOR", name: "Jordan",
  stance: { rows: [{ label: { en: "Case File posture (free, from the data)", ar: "ملف" }, value: "staged", detail: "staged", from: F("Case File", "/case") }, { label: { en: "THE KING's decision", ar: "قرار" }, value: "staged", detail: "d", from: F("THE KING", "/king") }, { label: { en: "The Ministry's posture", ar: "وزارة" }, value: "deepen", detail: "d", from: F("The Ministry", "/mofa") }], agreement: "partial", note: { en: "Two of three agree.", ar: "اثنان من ثلاثة" } },
  insights: [{ text: "Proceed <script>alert(1)</script> in stages", from: F("THE KING", "/king") }], interests: [{ rank: 1, title: "Protect people", interest: "citizens", progress: 0.4, evidence: [] }],
  opportunities: [{ kind: { en: "Trade gap", ar: "فجوة" }, text: "Fertiliser", from: F("Ambassador", "/ambassador") }], risks: [{ text: "Rail terms", sub: "Gate funds", level: "high", from: F("THE KING", "/king") }],
  redFlags: [{ flag: "No source", severity: "critical", lens: "reality", product: "x", why: "w", ask: "a", from: F("THE KING", "/king") }],
  triad: [{ label: { en: "National security", ar: "أمن" }, headline: "calm", from: F("THE KING", "/king") }], actions: [{ when: "Next 30 days", what: "Brief", owner: "MoFA", from: F("The Ministry", "/mofa") }, { when: "Next 30 days", what: "Second", owner: "MoFA", from: F("The Ministry", "/mofa") }],
  watch: [{ text: "Financing signed", from: F("THE KING", "/king") }],
  evidence: [{ id: "king", label: { en: "THE KING's Council", ar: "مجلس" }, from: F("THE KING", "/king"), onFile: true, ageDays: 3, usd: 0.8, grade: "B", verdicts: "statecraft: approve; reality: revise", flags: 2 }, { id: "mach", label: { en: "Machiavellian council", ar: "م" }, from: F("Machiavellian", "/machiavelli"), onFile: false, ageDays: null, usd: null, grade: null, verdicts: "", flags: 0 }],
  readiness: { score: 62, checks: [{ ok: true, label: { en: "King decided", ar: "ك" } }, { ok: false, label: { en: "Under 30 days", ar: "ث" } }] }, facts: [{ label: { en: "Partnership index", ar: "مؤشر" }, value: "71" }] };
const opts = { title: "Bird's eye view: Jordan", foot: "Geo Desk", classification: "OFFICIAL", auditHtml: "<h2>Audit</h2>" };
const en = birdHtml(b, "en", opts);
assert.ok(en.includes('dir="ltr"') && en.includes("62%") && en.includes("Staged") && en.includes("Deepen") && en.includes("Council by council") && en.includes("Not run for this country") && en.includes("Next moves") && en.includes("High impact") && en.includes("<h2>Audit</h2>"), "every section is drawn");
assert.ok(!en.includes("<script>alert(1)</script>") && en.includes("&lt;script&gt;"), "text from the brief is escaped");
assert.equal((en.match(/class="e"><b>Next 30 days/g) ?? []).length, 1, "moves with the same time are grouped under one marker");
const ar = birdHtml(b, "ar", opts);
assert.ok(ar.includes('dir="rtl"') && ar.includes("مجلس بمجلس") && ar.includes("تعميق"), "the Arabic page is right to left and uses the Arabic words");
const fld = birdHtml(b, "en", { ...opts, fieldHtml: clipsHtml([{ id: "a", iso: "JOR", text: "Pipeline <attack>", source: "Wire", date: "2026-10-29", angle: "energy", kind: "news", tone: "risk", note: "ask", at: "2026-10-30T00:00:00Z" }], "en") });
assert.ok(fld.includes("Field updates clipped by the desk") && fld.includes("Pipeline &lt;attack&gt;") && fld.indexOf("Field updates") < fld.indexOf("Audit"), "the clipped field updates are in the PDF, labelled, before the audit"); assert.ok(!en.includes("Field updates"), "no clips, no section");
console.log("birdvisual: all checks passed");
