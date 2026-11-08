// A/B one council sitting on Claude and on a cheaper model, with the same facts, the same prompt and the same budget, under a hard dollar cap. It decides nothing: it measures, and writes both answers
// to files under shuffled labels so the comparison can be read blind (the key to which is which is in the key file).
// Usage:  npx tsx scripts/ab-sitting.ts <product> <iso3> <callId|first> <model alias> [totalCapUsd=1.5]     (add DRY=1 to build the inputs and stop before any model call)
// Needs the alias's key in the environment (GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, HF_TOKEN or DEEPSEEK_API_KEY) and Claude credentials as the app has them. Nothing here changes the app.
import { mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { caseFacts } from "../src/lib/case/facts";
import { loadCase } from "../src/lib/case/load";
import { loadSnapshot } from "../src/lib/deep/snapshot";
import { loadResearch } from "../src/lib/deep/research";
import { renderFacts } from "../src/lib/ask/facts";
import { deskExtraFacts } from "../src/lib/desk/context";
import { cleanDeskOptions, deskBase, citedIds, DEFAULT_COUNTRY_FOCUS, DEFAULT_EMB_FOCUS, DEFAULT_KING_FOCUS, DEFAULT_MOFA_FOCUS, DEFAULT_PRESIDENT_FOCUS, DEFAULT_CHALLENGE_FOCUS, PRODUCTS, type Product } from "../src/lib/desk/core";
import { planFor } from "../src/lib/desk/plan";
import { runModelTask, type RunResult } from "../src/lib/dossier/run";
import { runModelTaskOA } from "../src/lib/llm/oa";
import { runModelTaskGemini } from "../src/lib/llm/gemini";
import { OA_MODELS } from "../src/lib/llm/models";
import { searchBackend } from "../src/lib/llm/web";
import { sourceMix } from "../src/lib/quality/gate";

const [product, iso3raw, callId = "first", alias, capArg] = process.argv.slice(2); const iso3 = (iso3raw ?? "").toUpperCase(); const CAP = Number(capArg ?? 1.5);
if (!(PRODUCTS as string[]).includes(product) || !/^[A-Z]{3}$/.test(iso3) || !OA_MODELS[alias]) { console.error("usage: npx tsx scripts/ab-sitting.ts <product> <iso3> <callId|first> <alias: " + Object.keys(OA_MODELS).join("|") + "> [capUsd]"); process.exit(2); }
const MODEL = process.env.DOSSIER_MODEL || "claude-sonnet-5-5";

async function main() {
  const [c, snap, res] = await Promise.all([loadCase(iso3), loadSnapshot(iso3).catch(() => null), loadResearch(iso3).catch(() => null)]); if (!c) throw new Error("unknown country");
  const gathered = await caseFacts(iso3, c, snap, res?.pubs ?? []); if (!gathered) throw new Error("no facts"); for (const x of deskExtraFacts(c)) gathered.facts.push({ id: `F${gathered.facts.length + 1}`, kind: x.kind, text: x.text, src: x.src });
  const focus = product.startsWith("king") ? DEFAULT_KING_FOCUS : product.startsWith("mofa") ? DEFAULT_MOFA_FOCUS : product === "country-full" ? DEFAULT_COUNTRY_FOCUS : product === "president-brief" ? DEFAULT_PRESIDENT_FOCUS : product === "council-challenge" ? DEFAULT_CHALLENGE_FOCUS : DEFAULT_EMB_FOCUS;
  const o = cleanDeskOptions({}, focus); const plan = planFor(product as Product, o, "");
  const base = deskBase({ facts: renderFacts(gathered.facts, gathered.gaps), asOf: new Date().toISOString(), country: gathered.name, options: o, context: "", contextLabel: plan.contextLabel });
  const x = callId === "first" ? plan.calls.find((k) => k.stage === 0)! : plan.calls.find((k) => k.id === callId); if (!x) throw new Error(`no call ${callId}; calls are ${plan.calls.map((k) => k.id).join(", ")}`);
  console.log(`${product} ${iso3} call ${x.id} (${x.searches} searches, ${x.maxTokens} tokens); facts ${gathered.facts.length}; prompt about ${Math.round((plan.system.length + base.length) / 3.5)} tokens; search backend for the cheap model: ${searchBackend()}`);
  if (process.env.DRY) { console.log("DRY run: inputs built, no model called."); return; }
  const known = new Set(gathered.facts.map((f) => f.id));
  const mk = (signal: AbortSignal) => ({ client: null as never, model: MODEL, system: plan.system, firstText: base, roleText: x.role({}), budget: { maxTokens: x.maxTokens, searches: x.searches, fetches: x.fetches ?? 0, fetchTokens: 8000 }, effort: "low" as const, maxUsd: CAP / 2, signal, send: () => {}, label: `ab-${x.id}` });
  const time = async (f: () => Promise<RunResult>) => { const t0 = Date.now(); const r = await f(); return { r, secs: (Date.now() - t0) / 1000 }; };
  const ac = new AbortController();
  const claude = await time(() => runModelTask({ ...mk(ac.signal), client: new Anthropic() }));
  const cheap = await time(() => (OA_MODELS[alias].engine === "gemini" ? runModelTaskGemini : runModelTaskOA)(mk(ac.signal), OA_MODELS[alias]));
  const describe = (name: string, v: { r: RunResult; secs: number }) => {
    const cites = citedIds(v.r.report); const bad = cites.filter((id) => !known.has(id)); const mix = sourceMix(v.r.sources); const heads = (v.r.report.match(/^#{1,3} .+$/gm) ?? []).length; const words = (v.r.report.match(/\S+/g) ?? []).length;
    return { name, seconds: +v.secs.toFixed(1), usd: +(v.r.usage.usd ?? 0).toFixed(4), searches: v.r.usage.searches, fetches: v.r.usage.fetches, failedResearchSteps: v.r.failedSteps, words, headings: heads, factCitations: cites.length, citationsToUnknownFacts: bad.length, sources: v.r.sources.length, mix: `official ${mix.official} / think-tank ${mix.thinktank} / news ${mix.news} / other ${mix.other}`, stop: v.r.stop, costStopped: v.r.costStopped };
  };
  const rows = [describe(`Claude ${MODEL}`, claude), describe(OA_MODELS[alias].label, cheap)]; console.table(rows);
  const flip = Math.random() < 0.5; const dir = `scratch-ab/${product}-${iso3}-${x.id}-${Date.now()}`; mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/A.md`, (flip ? cheap : claude).r.report); writeFileSync(`${dir}/B.md`, (flip ? claude : cheap).r.report);
  writeFileSync(`${dir}/KEY-do-not-open-until-you-have-chosen.json`, JSON.stringify({ A: flip ? alias : "claude", B: flip ? "claude" : alias, rows }, null, 2));
  console.log(`\nRead ${dir}/A.md and B.md blind, then open the key file. Total spent about $${(rows[0].usd + rows[1].usd).toFixed(3)}.`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
