// Tests for the generic PDF path (every kind with no illustrator of its own) and the Archive's grouping of kinds.
import assert from "node:assert/strict";
import { byPublisher, hostOf, leadOf } from "./generic";
import { pdfHtml, KINDS, GROUP_LABEL, type Source } from "../reportpdf";
import { kingReport } from "./fixtures";

// ---- reading what a brief opens with, and who published its sources
assert.equal(leadOf("# Title\n\n> a quote\n\nShort.\n\nJordan is a monarchy-led, non-oil, aid-dependent corridor state. The UAE's ties are among its closest. [F31]\n"), "Jordan is a monarchy-led, non-oil, aid-dependent corridor state. The UAE's ties are among its closest. [F31]");
assert.equal(leadOf("# Only headings\n\n- a bullet\n"), ""); assert.equal(leadOf(""), ""); assert.ok(!leadOf('# T\n\n<directive>{"answer":"x"}</directive>').includes("answer"), "machine blocks are not a lead");
assert.equal(hostOf("https://www.imf.org/a/b"), "imf.org"); assert.equal(hostOf("not a url"), "");
assert.deepEqual(byPublisher([{ url: "https://www.imf.org/a" }, { url: "https://imf.org/b" }, { url: "https://reuters.com/x" }, { url: "bad" }]), [{ host: "imf.org", n: 2 }, { host: "reuters.com", n: 1 }]);

// ---- a kind with no illustrator gets a real cover, counts, contents and publishers, in both languages
const brief = `# Country brief\n\nNorway is a stable, wealthy partner. The UAE's ties are growing and its exposure is low. [F1][F2]\n\n## Why it matters\n\n- Trade of US$4.1bn in 2025 [F3].\n\n## What to watch\n\nA tender, a currency move.\n\n## Posture\n\nSelective and staged. ${"Filler sentence. ".repeat(20)}\n`;
const src: Source = { kind: "country-brief", iso: "NOR", country: "Norway", report: brief, at: "2026-10-30T10:00:00Z", usd: 0.2, lang: "en", model: "test", sources: [{ url: "https://www.imf.org/a", title: "IMF" }, { url: "https://imf.org/b" }, { url: "https://www.reuters.com/c" }, { url: "https://www.ft.com/d" }] };
const html = pdfHtml(src);
for (const needle of ["Norway is a stable, wealthy partner", "In this report", "Why it matters", "fact ids cited", "Where the evidence comes from", "imf.org", "4 sources from 3 publishers", "Other briefs", "Norway ·"]) assert.ok(html.includes(needle), `the generic PDF carries ${needle}`);
assert.ok(html.includes("<b>3</b>") === false && html.includes(">3<"), "three distinct fact ids are counted");
const ar = pdfHtml({ ...src, lang: "ar", report: brief.replace("Norway is a stable", "النرويج شريك مستقر ومزدهر. علاقات الإمارات بها تنمو والانكشاف منخفض. [F1] Norway is a stable") }); for (const needle of ['dir="rtl"', "في هذا التقرير", "من أين جاءت الأدلة", "معرّفات حقائق مستشهد بها", "موجزات أخرى"]) assert.ok(ar.includes(needle), `the Arabic generic PDF carries ${needle}`);
// a product with one publisher is flagged as narrow; one with no sources draws no publisher chart; a tiny report is still a PDF
const one = pdfHtml({ ...src, sources: Array.from({ length: 7 }, (_, i) => ({ url: `https://www.imf.org/${i}` })) }); assert.ok(one.includes("supplies more than half"), "one publisher dominating is said"); assert.ok(!one.includes("Where the evidence comes from"), "a single publisher draws no chart");
const none = pdfHtml({ ...src, sources: undefined }); assert.ok(!none.includes("Where the evidence comes from") && none.includes("Norway is a stable"));
assert.doesNotThrow(() => pdfHtml({ ...src, report: "x" })); assert.ok(pdfHtml({ ...src, report: "short" }).includes("<html"));
const hostile = pdfHtml({ ...src, report: brief.replace("Norway is", "<img src=x onerror=alert(1)> Norway is") }); assert.ok(!hostile.includes("<img src=x"), "report text is escaped");
// kinds that do have an illustrator keep it (the king's own cover is not replaced)
assert.ok(pdfHtml({ ...src, kind: "king-council", report: kingReport() }).includes("The four courses"));

// ---- every kind belongs to a group the Archive can show
for (const [k, v] of Object.entries(KINDS)) assert.ok(GROUP_LABEL[v.group], `kind ${k} has a labelled group`);
console.log("report archive: all checks passed");
